import argparse
import asyncio
import os
import random
import time
import glob
import subprocess
import shutil
import signal
from pathlib import Path
import json
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("self_play.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Parse CLI arguments
parser = argparse.ArgumentParser(description="AlphaZero-style Self-Play Training Loop for MCTS")
parser.add_argument("--duration", type=int, default=65000, help="Total duration to run the loop in seconds (default: 30mn)")
parser.add_argument("--games_per_batch", type=int, default=240, help="Total number of games to play per training step")
parser.add_argument("--max_concurrency", type=int, default=6, help="Maximum number of parallel games at once")
parser.add_argument("--turns_per_game", type=int, default=300, help="Maximum turns per self-play game")
parser.add_argument("--mcts_budget", type=int, default=30, help="MCTS time budget in ms per move")
parser.add_argument("--train_epochs", type=int, default=3, help="Number of training epochs per batch")
parser.add_argument("--train_batch_size", type=int, default=32, help="Batch size for training the GAT model")
parser.add_argument("--max_data_files", type=int, default=720, help="Maximum number of game JSON files to keep in mcts_temp")
args = parser.parse_args()

RUST_BIN = Path("rust/target/release/rust")

async def run_self_play_games(sem, board_path, n_games):
    async with sem:
        # Run multiple games in one process to reduce model loading overhead
        cmd = [
            str(RUST_BIN),
            board_path,
            "--batch", str(n_games),
            "--max-turns", str(args.turns_per_game),
            "--white", "mcts",
            "--black", "mcts",
            "--mcts-budget", str(args.mcts_budget),
            "--mcts-data-dir", "./rust/mcts_temp"
        ]
        
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        stdout_str = stdout.decode(errors='ignore')
        
        # Parse all GAMEOVER telemetry lines
        batch_stats = []
        for line in stdout_str.splitlines():
            if "GAMEOVER: " in line:
                try:
                    start_idx = line.find("GAMEOVER: ") + 10
                    stats_json = line[start_idx:].strip()
                    game_stats = json.loads(stats_json)
                    batch_stats.append(game_stats)
                except Exception as e:
                    logger.error(f"  Failed to parse GAMEOVER: {e} | Line: {line}")
        
        if not batch_stats:
            # Report failure if no telemetry was found
            exit_code = await proc.wait()
            stderr_str = stderr.decode(errors='ignore')
            logger.error(f"  Games failed (exit {exit_code}). No GAMEOVER telemetry found.")
            if stderr_str:
                panic_msg = "\n".join(stderr_str.strip().splitlines()[-5:])
                logger.error(f"  Panic/Error trace:\n{panic_msg}")
            
        return batch_stats

def cleanup_stale_data(data_dir, max_files):
    files = sorted(glob.glob(os.path.join(data_dir, "*.json")), key=os.path.getmtime)
    if len(files) > max_files:
        to_delete = files[:-max_files]
        for f in to_delete:
            try:
                os.remove(f)
            except:
                pass
        logger.info(f"  Cleaned up {len(to_delete)} old data files.")

async def main():
    if not RUST_BIN.exists():
        logger.error(f"Error: {RUST_BIN} not found! Run 'cd rust && cargo build --release'")
        return

    data_dir = "./rust/mcts_temp"
    os.makedirs(data_dir, exist_ok=True)
    
    board_files = glob.glob("games/data/*board.json")
    if not board_files:
        logger.error("Error: No boards found in games/data/")
        return

    start_time = time.time()
    iteration = 1
    
    logger.info(f"Starting self-play training loop for {args.duration/60:.1f} minutes...")
    
    try:
        while time.time() - start_time < args.duration:
            elapsed = time.time() - start_time
            remaining = args.duration - elapsed
            logger.info(f"\n--- Iteration {iteration} | Remaining: {remaining/60:.1f}m ---")
            
            # 1. Parallel Self-Play
            games_per_proc = max(1, args.games_per_batch // args.max_concurrency)
            num_procs = (args.games_per_batch + games_per_proc - 1) // games_per_proc
            
            logger.info(f"  Generating {args.games_per_batch} games using {num_procs} processes ({games_per_proc} games per proc)...")
            sem = asyncio.Semaphore(args.max_concurrency)
            tasks = []
            
            remaining_games = args.games_per_batch
            for _ in range(num_procs):
                games_to_run = min(remaining_games, games_per_proc)
                if games_to_run <= 0: break
                
                board = random.choice(board_files)
                tasks.append(run_self_play_games(sem, board, games_to_run))
                remaining_games -= games_to_run
            
            results_lists = await asyncio.gather(*tasks)
            # Flatten results
            results = [stats for sublist in results_lists for stats in sublist]
            
            # Aggregate stats
            valid_stats = [r for r in results if r]
            if valid_stats:
                avg_turns = sum(s['turns'] for s in valid_stats) / len(valid_stats)
                white_wins = sum(1 for s in valid_stats if s['winner'] == 'white')
                black_wins = sum(1 for s in valid_stats if s['winner'] == 'black')
                draws = sum(1 for s in valid_stats if s['winner'] == 'draw' or s['winner'] == 'none')
                
                logger.info(f"  Batch stats: {len(valid_stats)} games | Avg Turns: {avg_turns:.1f}")
                logger.info(f"  Wins: White {white_wins}, Black {black_wins}, Draws {draws}")
            
            # 2. Cleanup old data (Maintain sliding window/replay buffer)
            cleanup_stale_data(data_dir, args.max_data_files)
            
            # 3. Trigger Training
            num_data = len(glob.glob(os.path.join(data_dir, "*.json")))
            logger.info(f"Iteration {iteration}: Training GAT model on {num_data} available JSON samples...")
            try:
                python_bin = ".venv/bin/python" if os.path.exists(".venv") else "python3"
                cmd = [
                    python_bin, "train_mcts.py", 
                    "--epochs", str(args.train_epochs),
                    "--batch-size", str(args.train_batch_size)
                ]
                subprocess.run(cmd, check=True)
            except Exception as e:
                logger.error(f"  Training failed: {e}")
            
            iteration += 1

    except asyncio.CancelledError:
        logger.info("\nShutdown requested by user (Ctrl+C). Cleaning up...")
    except Exception as e:
        logger.error(f"\nAn error occurred: {e}")
    finally:
        logger.info("Training session complete!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
