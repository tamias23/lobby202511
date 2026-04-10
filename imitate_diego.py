#!/usr/bin/env python3
"""
imitate_diego.py
================
Train an MCTS neural network to imitate quick_diego via behavioural cloning.

Strategy (Phase 1)
------------------
Run quick_diego vs quick_diego on random boards.  The Rust engine records
every decision as a training sample:

    x           — graph node features for the current game state
    edge_index  — adjacency edges
    legal_moves — graph-encoded legal moves (STOCK→polygon or polygon→polygon)
    pi          — ONE-HOT on the move quick_diego chose
    z           — game outcome (+1 current player won, -1 lost, 0 draw)

This data is written to ``--mcts_data_dir`` in the same JSON format that MCTS
self-play uses, so ``train_mcts.py`` consumes it without modification.

After every ``--games_per_train`` games the accumulated corpus is fed to
``train_mcts.py`` to update ``rust/model.onnx``.

Transition to Phase 2
---------------------
Once this script shows policy-loss plateau (convergence), simply stop it and
run ``self_play_train.py``.  The checkpoint at ``rust/model.onnx`` carries
over automatically — MCTS starts from a sane initialisation rather than
random weights.

Usage example
-------------
    python imitate_diego.py \\
        --diego_model ./new_main/bot-server/models/quick_diego/wJSZwHhM71.json \\
        --games_per_train 100 \\
        --max_concurrency 6 \\
        --max_turns 300 \\
        --train_epochs 5 \\
        --train_batch_size 64 \\
        --max_data_files 2000 \\
        --duration 86400

    # Optional: evaluate MCTS against diego every N cycles
        --eval_every 5 --eval_games 20
"""

import argparse
import asyncio
import glob
import json
import logging
import os
import random
import shutil
import subprocess
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("imitate_diego.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
parser = argparse.ArgumentParser(
    description="Train MCTS to imitate quick_diego via behavioural cloning."
)
parser.add_argument(
    "--diego_model",
    type=str,
    default="./new_main/bot-server/models/quick_diego/wJSZwHhM71.json",
    help="Path to quick_diego JSON weight file",
)
parser.add_argument(
    "--mcts_model",
    type=str,
    default="./rust/model.onnx",
    help="Path to MCTS ONNX model (created/updated during training)",
)
parser.add_argument(
    "--games_per_train",
    type=int,
    default=100,
    help="Number of diego-vs-diego games before each training step (default: 100)",
)
parser.add_argument(
    "--max_concurrency",
    type=int,
    default=6,
    help="Maximum parallel games (default: 6)",
)
parser.add_argument(
    "--diego_mcts_budget",
    type=int,
    default=100,
    help="quick_diego internal color look-ahead budget in ms (default: 100)",
)
parser.add_argument(
    "--max_turns",
    type=int,
    default=300,
    help="Maximum turns per game before draw (default: 300)",
)
parser.add_argument(
    "--train_epochs",
    type=int,
    default=5,
    help="GNN training epochs per training step (default: 5)",
)
parser.add_argument(
    "--train_batch_size",
    type=int,
    default=64,
    help="Batch size for GNN training (default: 64)",
)
parser.add_argument(
    "--max_data_files",
    type=int,
    default=2000,
    help="Maximum JSON data files in the replay buffer (default: 2000)",
)
parser.add_argument(
    "--mcts_data_dir",
    type=str,
    default="./rust/mcts_temp",
    help="Directory for imitation JSON data (default: ./rust/mcts_temp)",
)
parser.add_argument(
    "--duration",
    type=int,
    default=86400,
    help="Total duration in seconds (default: 86400 = 24 h)",
)
parser.add_argument(
    "--eval_every",
    type=int,
    default=0,
    help="Evaluate MCTS vs diego every N training cycles (0 = disabled)",
)
parser.add_argument(
    "--eval_games",
    type=int,
    default=20,
    help="Number of games per evaluation run (default: 20)",
)
parser.add_argument(
    "--mcts_budget",
    type=int,
    default=200,
    help="MCTS time budget per move in ms for evaluation games (default: 200)",
)
parser.add_argument(
    "--verbose",
    type=int,
    default=0,
    help="Verbosity level for Rust engine 0-3 (default: 0)",
)
args = parser.parse_args()

RUST_BIN = Path("rust/target/release/rust")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_diego_weights(json_path: str) -> str:
    with open(json_path, "r") as f:
        data = json.load(f)
    return ",".join(str(w) for w in data["weights"])


def cleanup_stale_data(data_dir: str, max_files: int):
    files = sorted(glob.glob(os.path.join(data_dir, "*.json")), key=os.path.getmtime)
    if len(files) > max_files:
        to_delete = files[:-max_files]
        for f in to_delete:
            try:
                os.remove(f)
            except OSError:
                pass
        logger.info(f"  Cleaned up {len(to_delete)} old data files.")


def run_training(epochs: int, batch_size: int) -> tuple[float, float]:
    """
    Invoke train_mcts.py and parse the final epoch's loss from its stdout.
    Returns (value_loss, policy_loss) of the last epoch, or (-1, -1) on failure.
    """
    python_bin = ".venv/bin/python" if os.path.exists(".venv") else "python3"

    # Set up environment to ensure unbuffered output for real-time streaming
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"

    process = subprocess.Popen(
        [python_bin, "train_mcts.py", "--epochs", str(epochs), "--batch-size", str(batch_size)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,  # Merge stderr (tqdm) into stdout
        text=True,
        env=env,
        bufsize=1,
    )

    captured_lines = []
    # Read output line-by-line in real-time
    while True:
        # readline() works better with tqdm's \r than iter(property.stdout.readline, "") 
        # in some environments, as it avoids some buffering issues.
        line = process.stdout.readline()
        if not line and process.poll() is not None:
            break
        if line:
            sys.stdout.write(line)
            sys.stdout.flush()
            captured_lines.append(line)

    process.wait()
    if process.returncode != 0:
        raise subprocess.CalledProcessError(process.returncode, "train_mcts.py")

    # Parse last "Epoch N/N | Loss: X.XXXX (V: X.XXXX, P: X.XXXX)" line
    v_loss, p_loss = -1.0, -1.0
    for line in captured_lines:
        if "Loss:" in line and "(V:" in line and "P:" in line:
            try:
                after_v = line.split("V:")[1].split(",")[0].strip()
                after_p = line.split("P:")[1].split(")")[0].strip()
                v_loss = float(after_v)
                p_loss = float(after_p)
            except (IndexError, ValueError):
                pass
    return v_loss, p_loss


def copy_trained_model(mcts_model_path: str):
    trained = Path("./rust/model.onnx")
    target = Path(mcts_model_path)
    if trained.exists() and trained.resolve() != target.resolve():
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(trained), str(target))
        logger.info(f"  Copied trained model → {target}")


def render_trend(label: str, history: list):
    if len(history) < 2:
        return
    lo, hi = min(history), max(history)
    span = max(hi - lo, 1e-9)
    bars = " ▁▂▃▄▅▆▇█"
    sparkline = "".join(bars[min(int((v - lo) / span * 8), 8)] for v in history)
    delta = history[-1] - history[-2]
    direction = (
        "📉 decreasing" if delta < -1e-4
        else ("📈 increasing" if delta > 1e-4 else "➡  stable")
    )
    logger.info(
        f"  {label} trend [{sparkline}]  "
        f"{history[0]:.4f} → {history[-1]:.4f}  {direction}"
    )


# ---------------------------------------------------------------------------
# Game runners
# ---------------------------------------------------------------------------
async def run_diego_game(sem, board_path: str, diego_weights: str,
                         data_dir: str) -> dict | None:
    """Run one diego-vs-diego game with imitation recording enabled."""
    async with sem:
        cmd = [
            str(RUST_BIN), board_path,
            "--batch", "1",
            "--max-turns", str(args.max_turns),
            "--white", "quick_diego",
            "--black", "quick_diego",
            "--greedy-weights-white", diego_weights,
            "--greedy-weights-black", diego_weights,
            "--diego-mcts-budget", str(args.diego_mcts_budget),
            "--diego-imitate-dir", data_dir,
            "--verbose", str(args.verbose),
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        output = stdout.decode("utf-8", errors="ignore")

        for line in output.splitlines():
            if "BATCH_STATS: " in line:
                try:
                    return json.loads(line.split("BATCH_STATS: ", 1)[1])
                except Exception as e:
                    logger.error(f"  BATCH_STATS parse error: {e}")
                    return None

        err = stderr.decode("utf-8", errors="ignore")
        if err:
            tail = "\n".join(err.strip().splitlines()[-5:])
            logger.error(f"  Game failed (no BATCH_STATS). Stderr:\n{tail}")
        return None


async def run_eval_game(sem, board_path: str, diego_weights: str,
                        mcts_model_path: str) -> dict | None:
    """Run one MCTS-vs-diego evaluation game (no recording, sides randomised)."""
    async with sem:
        mcts_is_white = random.random() > 0.5
        white_type = "mcts" if mcts_is_white else "quick_diego"
        black_type = "quick_diego" if mcts_is_white else "mcts"

        cmd = [
            str(RUST_BIN), board_path,
            "--batch", "1",
            "--max-turns", str(args.max_turns),
            "--white", white_type,
            "--black", black_type,
            "--greedy-weights-white", diego_weights,
            "--greedy-weights-black", diego_weights,
            "--diego-mcts-budget", str(args.diego_mcts_budget),
            "--mcts-budget", str(args.mcts_budget),
            "--mcts-no-record",          # evaluation only; do not pollute the training buffer
            "--verbose", "0",
        ]
        if os.path.exists(mcts_model_path):
            if mcts_is_white:
                cmd.extend(["--white-model-path", mcts_model_path])
            else:
                cmd.extend(["--black-model-path", mcts_model_path])

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        output = stdout.decode("utf-8", errors="ignore")

        for line in output.splitlines():
            if "BATCH_STATS: " in line:
                try:
                    stats = json.loads(line.split("BATCH_STATS: ", 1)[1])
                    return {"stats": stats, "mcts_is_white": mcts_is_white}
                except Exception:
                    return None
        return None


# ---------------------------------------------------------------------------
# Main training loop
# ---------------------------------------------------------------------------
async def main():
    if not RUST_BIN.exists():
        logger.error(f"Rust binary not found at {RUST_BIN}. Run 'cd rust && cargo build --release'.")
        return
    if not os.path.exists(args.diego_model):
        logger.error(f"quick_diego model not found: {args.diego_model}")
        return

    board_files = glob.glob("games/data/*board.json")
    if not board_files:
        logger.error("No board files found in games/data/. Cannot proceed.")
        return

    diego_weights = load_diego_weights(args.diego_model)
    logger.info(f"quick_diego model    : {args.diego_model} ({len(diego_weights.split(','))} weights)")
    logger.info(f"MCTS model           : {args.mcts_model}")
    logger.info(f"MCTS model exists    : {'YES (resuming)' if os.path.exists(args.mcts_model) else 'NO (random init)'}")
    logger.info(f"Games per train cycle: {args.games_per_train}")
    logger.info(f"Max concurrency      : {args.max_concurrency}")
    logger.info(f"Duration             : {args.duration / 3600:.1f} h")
    if args.eval_every:
        logger.info(f"Evaluation           : every {args.eval_every} cycles, {args.eval_games} games each")

    os.makedirs(args.mcts_data_dir, exist_ok=True)

    sem = asyncio.Semaphore(args.max_concurrency)
    start_time = time.time()
    cycle = 0

    v_loss_history: list[float] = []
    p_loss_history: list[float] = []
    eval_wr_history: list[float] = []
    total_games = 0

    logger.info(
        f"\n{'='*60}\n"
        f"  Phase 1: Behavioural Cloning — MCTS learns quick_diego\n"
        f"  When done, run self_play_train.py for Phase 2 (RL fine-tuning)\n"
        f"{'='*60}\n"
    )

    try:
        while time.time() - start_time < args.duration:
            cycle += 1
            elapsed = time.time() - start_time
            remaining = args.duration - elapsed

            logger.info(
                f"\n{'─'*60}\n"
                f"  Cycle {cycle} | Elapsed: {elapsed/60:.1f}m | Remaining: {remaining/60:.1f}m\n"
                f"{'─'*60}"
            )

            # ----------------------------------------------------------------
            # 1.  Play diego-vs-diego games with imitation recording
            # ----------------------------------------------------------------
            logger.info(
                f"  Playing {args.games_per_train} diego-vs-diego games "
                f"(concurrency={args.max_concurrency})..."
            )
            tasks = [
                run_diego_game(sem, random.choice(board_files), diego_weights, args.mcts_data_dir)
                for _ in range(args.games_per_train)
            ]
            results = await asyncio.gather(*tasks)

            valid = sum(1 for r in results if r is not None)
            failed = args.games_per_train - valid
            total_games += valid

            white_wins = sum(r.get("white_wins", 0) for r in results if r)
            black_wins = sum(r.get("black_wins", 0) for r in results if r)
            draws = sum(r.get("draws", 0) for r in results if r)
            logger.info(
                f"  Cycle {cycle}: {valid} valid games ({failed} failed)\n"
                f"    White wins: {white_wins}  Black wins: {black_wins}  Draws: {draws}\n"
                f"    Total data games so far: {total_games}"
            )

            # ----------------------------------------------------------------
            # 2.  Clean replay buffer
            # ----------------------------------------------------------------
            cleanup_stale_data(args.mcts_data_dir, args.max_data_files)

            # ----------------------------------------------------------------
            # 3.  Train GNN
            # ----------------------------------------------------------------
            num_data = len(glob.glob(os.path.join(args.mcts_data_dir, "*.json")))
            logger.info(
                f"  Training GNN on {num_data} data files "
                f"(epochs={args.train_epochs}, batch={args.train_batch_size})..."
            )
            try:
                v_loss, p_loss = run_training(args.train_epochs, args.train_batch_size)
                copy_trained_model(args.mcts_model)
                logger.info(
                    f"  Training complete ✓  "
                    f"value_loss={v_loss:.4f}  policy_loss={p_loss:.4f}"
                )
                if v_loss >= 0:
                    v_loss_history.append(v_loss)
                    p_loss_history.append(p_loss)
                    render_trend("Value loss ", v_loss_history)
                    render_trend("Policy loss", p_loss_history)
            except subprocess.CalledProcessError as e:
                logger.error(f"  Training failed: {e}")

            # ----------------------------------------------------------------
            # 4.  Optional evaluation: MCTS vs diego
            # ----------------------------------------------------------------
            if args.eval_every and cycle % args.eval_every == 0:
                logger.info(
                    f"  Evaluation: running {args.eval_games} MCTS-vs-diego games..."
                )
                eval_tasks = [
                    run_eval_game(sem, random.choice(board_files), diego_weights, args.mcts_model)
                    for _ in range(args.eval_games)
                ]
                eval_results = await asyncio.gather(*eval_tasks)

                mcts_wins = mcts_losses = eval_draws = 0
                for r in eval_results:
                    if r is None:
                        continue
                    stats = r["stats"]
                    mcts_is_white = r["mcts_is_white"]
                    w_win = stats.get("white_wins", 0)
                    b_win = stats.get("black_wins", 0)
                    d = stats.get("draws", 0)
                    if d > 0:
                        eval_draws += 1
                    elif (w_win > 0 and mcts_is_white) or (b_win > 0 and not mcts_is_white):
                        mcts_wins += 1
                    else:
                        mcts_losses += 1

                total_eval = mcts_wins + mcts_losses + eval_draws
                wr = mcts_wins / total_eval if total_eval > 0 else 0.0
                eval_wr_history.append(wr)
                logger.info(
                    f"  Eval result: W:{mcts_wins} L:{mcts_losses} D:{eval_draws} "
                    f"→ MCTS win-rate {wr*100:.1f}%"
                )
                render_trend("MCTS win-rt", eval_wr_history)

    except asyncio.CancelledError:
        logger.info("\nShutdown requested (Ctrl+C).")
    except Exception as e:
        logger.error(f"\nUnexpected error: {e}", exc_info=True)
    finally:
        elapsed = time.time() - start_time
        logger.info(f"\n{'='*60}")
        logger.info(f"  SESSION COMPLETE — {cycle} cycles in {elapsed/60:.1f}m")
        logger.info(f"  Total games played: {total_games}")

        if v_loss_history:
            logger.info("\n  Training Loss Progress:")
            for i, (vl, pl) in enumerate(zip(v_loss_history, p_loss_history), 1):
                bar_v = "█" * max(1, int((1 - vl) * 20))
                logger.info(f"    Cycle {i:4d}: V={vl:.4f} P={pl:.4f}  |{bar_v:<20}|")

        if eval_wr_history:
            logger.info("\n  MCTS Win-rate vs quick_diego:")
            for i, wr in enumerate(eval_wr_history, 1):
                bar = "█" * int(wr * 30)
                logger.info(f"    Eval  {i:4d}: {wr*100:5.1f}%  |{bar:<30}|")

        logger.info(
            "\n  ➜ To start Phase 2 (RL self-play), run:\n"
            "      python self_play_train.py --mcts_budget 100 --games_per_batch 240"
        )
        logger.info(f"{'='*60}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
