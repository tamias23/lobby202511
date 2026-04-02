import argparse
import asyncio
import os
import random
import time
import glob
import subprocess
import shutil
import json
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("mcts_against_jack.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Parse CLI arguments
parser = argparse.ArgumentParser(description="AlphaZero-style training: MCTS against GreedyJack population")
parser.add_argument("--duration", type=int, default=80000, help="Total duration in seconds")
parser.add_argument("--games_per_batch", type=int, default=120, help="Games per training loop")
parser.add_argument("--max_concurrency", type=int, default=6, help="Max parallel games")
parser.add_argument("--turns_per_game", type=int, default=300, help="Max turns per game")
parser.add_argument("--mcts_budget", type=int, default=30, help="MCTS ms per move")
parser.add_argument("--train_epochs", type=int, default=1, help="GNN training epochs")
parser.add_argument("--train_batch_size", type=int, default=64, help="GNN training batch size")
parser.add_argument("--max_data_files", type=int, default=840, help="Max data JSONs to keep")
args = parser.parse_args()

RUST_BIN = Path("rust/target/release/rust")
JACK_NETS_DIR = Path("./results/jack_nets")
DATA_DIR = Path("./rust/mcts_temp")
MODEL_ONNX = Path("./rust/model.onnx")

async def run_game(sem, board_path, jack_net_path, mcts_side):
    async with sem:
        # Determine roles
        if mcts_side == "white":
            white_agent, black_agent = "mcts", "greedy_jack"
            white_model, black_model = str(MODEL_ONNX), str(jack_net_path)
        else:
            white_agent, black_agent = "greedy_jack", "mcts"
            white_model, black_model = str(jack_net_path), str(MODEL_ONNX)
        
        cmd = [
            str(RUST_BIN),
            board_path,
            "--batch", "1",
            "--max-turns", str(args.turns_per_game),
            "--white", white_agent,
            "--black", black_agent,
            "--white-model-path", white_model,
            "--black-model-path", black_model,
            "--mcts-budget", str(args.mcts_budget),
            "--mcts-data-dir", str(DATA_DIR)
        ]
        
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        stdout_str = stdout.decode(errors='ignore')
        
        # Parse GAMEOVER telemetry — attach mcts_side so we can compute win rate
        for line in stdout_str.splitlines():
            if "GAMEOVER: " in line:
                try:
                    start_idx = line.find("GAMEOVER: ") + 10
                    result = json.loads(line[start_idx:].strip())
                    result["mcts_side"] = mcts_side
                    return result
                except Exception as e:
                    logger.error(f"  Failed to parse GAMEOVER: {e}")
        
        # Diagnostics on failure
        stderr_str = stderr.decode(errors='ignore')
        logger.error(f"  Game failed. Last error: {stderr_str.strip().splitlines()[-1] if stderr_str.strip() else 'none'}")
        return None

def cleanup_stale_data(data_dir, max_files):
    files = sorted(glob.glob(os.path.join(data_dir, "*.json")), key=os.path.getmtime)
    if len(files) > max_files:
        to_delete = files[:-max_files]
        for f in to_delete:
            try:
                os.remove(f)
            except Exception:
                pass
        logger.info(f"  Cleaned up {len(to_delete)} old data files.")

def compute_mcts_stats(results):
    """Compute MCTS win/loss/draw from results, each tagged with mcts_side."""
    wins = losses = draws = 0
    for r in results:
        winner = r.get("winner", "none")
        mcts_side = r.get("mcts_side", "white")
        if winner == mcts_side:
            wins += 1
        elif winner in ("draw", "none"):
            draws += 1
        else:
            losses += 1
    total = wins + losses + draws
    win_rate = wins / total if total > 0 else 0.0
    return wins, losses, draws, win_rate

def render_trend(win_rate_history):
    """Print an ASCII sparkline of MCTS win rate across iterations."""
    if len(win_rate_history) < 2:
        return
    bars = " ▁▂▃▄▅▆▇█"
    sparkline = "".join(bars[min(int(wr * 8), 8)] for wr in win_rate_history)
    delta = win_rate_history[-1] - win_rate_history[-2]
    direction = "📈 improving" if delta > 0.01 else ("📉 declining" if delta < -0.01 else "➡  stable")
    logger.info(
        f"  Win-rate history [{sparkline}]  "
        f"{win_rate_history[0]*100:.1f}% → {win_rate_history[-1]*100:.1f}%  {direction}"
    )

async def main():
    if not RUST_BIN.exists():
        logger.error(f"Error: {RUST_BIN} not found!")
        return
    
    os.makedirs(DATA_DIR, exist_ok=True)
    
    board_files = glob.glob("games/data/*board.json")
    if not board_files:
        logger.error("No boards found in games/data/!")
        return

    start_time = time.time()
    iteration = 1
    win_rate_history = []   # MCTS win rate per iteration — used to track learning
    
    logger.info(f"Starting MCTS-vs-GreedyJack training for {args.duration/3600:.1f}h "
                f"({args.games_per_batch} games/batch, concurrency={args.max_concurrency})")
    
    try:
        while time.time() - start_time < args.duration:
            jack_nets = list(JACK_NETS_DIR.glob("*.json"))
            if not jack_nets:
                logger.error(f"No jack nets found in {JACK_NETS_DIR}! Run genetic_jack.py first.")
                await asyncio.sleep(10)
                continue
                
            elapsed = time.time() - start_time
            remaining = args.duration - elapsed
            logger.info(
                f"\n--- Iteration {iteration} | Elapsed: {elapsed/60:.1f}m | "
                f"Remaining: {remaining/60:.1f}m | Population: {len(jack_nets)} nets ---"
            )
            
            # === DATA COLLECTION PHASE ===
            logger.info(f"  Launching {args.games_per_batch} games vs random GreedyJack opponents...")
            sem = asyncio.Semaphore(args.max_concurrency)
            tasks = [
                run_game(
                    sem,
                    random.choice(board_files),
                    random.choice(jack_nets),
                    random.choice(["white", "black"])
                )
                for _ in range(args.games_per_batch)
            ]
                
            results = await asyncio.gather(*tasks)
            valid = [r for r in results if r]
            
            if valid:
                avg_turns = sum(r["turns"] for r in valid) / len(valid)
                wins, losses, draws, win_rate = compute_mcts_stats(valid)
                win_rate_history.append(win_rate)

                logger.info(
                    f"  Results ({len(valid)}/{args.games_per_batch} completed) | Avg turns: {avg_turns:.1f}"
                )
                logger.info(
                    f"  MCTS  ›  Wins: {wins}  Losses: {losses}  Draws: {draws}  "
                    f"Win rate: {win_rate*100:.1f}%"
                )
                render_trend(win_rate_history)
            else:
                logger.warning("  No valid game results this iteration — check Rust binary logs.")

            # === TRAINING PHASE ===
            cleanup_stale_data(DATA_DIR, args.max_data_files)
            num_data = len(list(DATA_DIR.glob("*.json")))
            logger.info(f"  Training GNN on {num_data} JSON samples "
                        f"(epochs={args.train_epochs}, batch={args.train_batch_size})...")
            try:
                python_bin = ".venv/bin/python" if os.path.exists(".venv") else "python3"
                subprocess.run(
                    [python_bin, "train_mcts.py",
                     "--epochs", str(args.train_epochs),
                     "--batch-size", str(args.train_batch_size)],
                    check=True
                )
                logger.info("  Training complete ✓")
            except Exception as e:
                logger.error(f"  Training failed: {e}")
                
            iteration += 1

    except asyncio.CancelledError:
        logger.info("\nShutdown requested (Ctrl+C).")
    except Exception as e:
        logger.error(f"\nUnexpected error: {e}", exc_info=True)
    finally:
        # Full win-rate history on exit
        if win_rate_history:
            logger.info("\n=== MCTS Learning Progress ===")
            for i, wr in enumerate(win_rate_history, 1):
                bar = "█" * int(wr * 20)
                logger.info(f"  Iter {i:3d}: {wr*100:5.1f}%  |{bar:<20}|")
            overall = sum(win_rate_history) / len(win_rate_history)
            logger.info(f"  Overall avg win rate: {overall*100:.1f}%")
            render_trend(win_rate_history)
        logger.info("Session complete.")

if __name__ == "__main__":
    try: asyncio.run(main())
    except KeyboardInterrupt: pass
