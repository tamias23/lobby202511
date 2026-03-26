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
parser.add_argument("--duration", type=int, default=1800, help="Total duration to run the loop in seconds (default: 30mn)")
parser.add_argument("--games_per_batch", type=int, default=50, help="Total number of games to play per training step")
parser.add_argument("--max_concurrency", type=int, default=8, help="Maximum number of parallel games at once")
parser.add_argument("--turns_per_game", type=int, default=600, help="Maximum turns per self-play game")
parser.add_argument("--mcts_budget", type=int, default=10, help="MCTS time budget in ms per move")
parser.add_argument("--train_epochs", type=int, default=5, help="Number of training epochs per batch")
parser.add_argument("--max_data_files", type=int, default=80, help="Maximum number of game JSON files to keep in mcts_temp")
args = parser.parse_args()

RUST_BIN = Path("rust/target/release/rust")

def archive_data(data_dir, archive_dir, iteration):
    """Compresses the data in data_dir and moves it to archive_dir/it_XXXX."""
    if not os.path.exists(archive_dir):
        os.makedirs(archive_dir)
        
    files = glob.glob(os.path.join(data_dir, "*.json"))
    if not files:
        return

    archive_name = os.path.join(archive_dir, f"iteration_{iteration:04d}")
    logger.info(f"  Archiving {len(files)} files to {archive_name}.tar.gz...")
    
    # Create the archive
    shutil.make_archive(archive_name, 'gztar', data_dir)
    
    # Remove original files
    for f in files:
        try:
            os.remove(f)
        except:
            pass

async def run_self_play_game(sem, board_path):
    async with sem:
        # Run a single game (batch 1) and generate data
        cmd = [
            str(RUST_BIN),
            board_path,
            "--batch", "1",
            "--max-turns", str(args.turns_per_game),
            "--white", "mcts",
            "--black", "mcts",
            "--mcts-budget", str(args.mcts_budget)
        ]
        
        # Note: In a real AlphaZero, you would pass the current model path.
        # Currently, our MCTS agent in Rust is hardcoded to look forrust/model.onnx
        
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        # Data is automatically saved to rust/mcts_temp by the binary

        # Parse GAMEOVER telemetry
        game_stats = None
        for line in stdout.decode().splitlines():
            if line.startswith("GAMEOVER: "):
                try:
                    game_stats = json.loads(line[10:])
                except:
                    pass
        return game_stats

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
    archive_dir = "./rust/mcts_old"
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(archive_dir, exist_ok=True)
    
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
            logger.info(f"  Generating {args.games_per_batch} games (max {args.max_concurrency} at once)...")
            sem = asyncio.Semaphore(args.max_concurrency)
            tasks = []
            for _ in range(args.games_per_batch):
                board = random.choice(board_files)
                tasks.append(run_self_play_game(sem, board))
            
            results = await asyncio.gather(*tasks)
            
            # Aggregate stats
            valid_stats = [r for r in results if r]
            if valid_stats:
                avg_turns = sum(s['turns'] for s in valid_stats) / len(valid_stats)
                white_wins = sum(1 for s in valid_stats if s['winner'] == 'white')
                black_wins = sum(1 for s in valid_stats if s['winner'] == 'black')
                draws = sum(1 for s in valid_stats if s['winner'] == 'draw' or s['winner'] == 'none')
                
                logger.info(f"  Batch stats: {len(valid_stats)} games | Avg Turns: {avg_turns:.1f}")
                logger.info(f"  Wins: White {white_wins}, Black {black_wins}, Draws {draws}")
            
            # 2. Cleanup (now redundant with archive, but keep as safety)
            cleanup_stale_data(data_dir, args.max_data_files)
            
            # 3. Trigger Training
            logger.info("  Training GAT model on collected data...")
            try:
                python_bin = ".venv/bin/python" if os.path.exists(".venv") else "python3"
                subprocess.run([python_bin, "train_mcts.py", "--epochs", str(args.train_epochs)], check=True)
            except Exception as e:
                logger.error(f"  Training failed: {e}")
            
            # 4. ARCHIVE used data
            archive_data(data_dir, archive_dir, iteration)
                
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
