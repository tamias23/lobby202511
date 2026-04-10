"""
Learning MCTS Swiss Tournament
===============================
A training loop that runs repeated Swiss tournaments between a mixed population
of agents (greedy_bob, greedy_jack, quick_diego, mcts) and periodically trains
the MCTS GNN model from the accumulated search data.

The MCTS agent records its search trees during games.  After each tournament,
the script invokes ``train_mcts.py`` to update the ONNX model so subsequent
tournaments benefit from the improved network.

Usage example:
    python learning_mcts_swiss_tournament.py \
        --agents agents_mixed.txt \
        --rounds 3 \
        --parallel 5 \
        --max_turns 300 \
        --train_epochs 3 \
        --max_data_files 800 \
        --duration 3600
"""

import argparse
import asyncio
import csv
import glob
import json
import logging
import os
import random
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("learning_mcts_swiss.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
parser = argparse.ArgumentParser(
    description="Learning MCTS Swiss Tournament — run repeated Swiss tournaments "
                "while training the MCTS model between rounds."
)
parser.add_argument("--agents", type=str, required=True,
                    help="Path to CSV with agents (Name,Type,Data,MctsBudget,MctsThreads)")
parser.add_argument("--rounds", type=int, default=3,
                    help="Number of rounds per Swiss tournament (default: 3)")
parser.add_argument("--parallel", type=int, default=5,
                    help="Number of parallel matches to run (default: 5)")
parser.add_argument("--board", type=str, default=None,
                    help="Path to the board JSON. If not provided, a random one is used per tournament.")
parser.add_argument("--max_turns", type=int, default=200,
                    help="Maximum turns per game (default: 200)")
parser.add_argument("--mcts_budget", type=int, default=100,
                    help="Default MCTS budget in ms (per-agent column overrides this)")
parser.add_argument("--mcts_threads", type=int, default=1,
                    help="Default MCTS search threads (per-agent column overrides this)")
parser.add_argument("--duration", type=int, default=3600,
                    help="Total duration to run in seconds (default: 3600)")
parser.add_argument("--train_epochs", type=int, default=3,
                    help="Number of GNN training epochs after each tournament (default: 3)")
parser.add_argument("--train_batch_size", type=int, default=64,
                    help="Batch size for GNN training (default: 64)")
parser.add_argument("--max_data_files", type=int, default=800,
                    help="Maximum MCTS data files to keep in the replay buffer (default: 800)")
parser.add_argument("--mcts_data_dir", type=str, default="./rust/mcts_temp",
                    help="Directory for MCTS search data (default: ./rust/mcts_temp)")
parser.add_argument("--parquet_dir", type=str, default=None,
                    help="Directory to store game parquet files (optional)")
args = parser.parse_args()

RUST_BIN = Path("rust/target/release/rust")

if not RUST_BIN.exists():
    print(f"Error: {RUST_BIN} not found! Please compile with 'cd rust && cargo build --release'")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Agent class
# ---------------------------------------------------------------------------
class Agent:
    """Represents one participant in the tournament.

    MCTS agents are special: there can only be ONE unique MCTS agent instance
    (model), but it may appear as several *entries* in the tournament table
    (to get more games / experience).  All MCTS entries share the same model
    path and data directory.
    """

    def __init__(self, name, agent_type, data, mcts_budget=None,
                 mcts_threads=None, diego_mcts_budget=None):
        self.name = name
        self.type = agent_type
        self.data = data
        self.mcts_budget = int(mcts_budget) if mcts_budget else None
        self.mcts_threads = int(mcts_threads) if mcts_threads else None
        self.diego_mcts_budget = int(diego_mcts_budget) if diego_mcts_budget else 100
        # Tournament state (reset each tournament)
        self.score = 0
        self.buchholz = 0
        self.opponents = []
        self.results = []
        self.had_bye = False

    def effective_budget(self):
        return self.mcts_budget if self.mcts_budget is not None else args.mcts_budget

    def effective_threads(self):
        return self.mcts_threads if self.mcts_threads is not None else args.mcts_threads

    def reset_tournament_state(self):
        self.score = 0
        self.buchholz = 0
        self.opponents = []
        self.results = []
        self.had_bye = False


# ---------------------------------------------------------------------------
# CSV loader
# ---------------------------------------------------------------------------
# Expected CSV format (same as swiss_tournament.py):
#   Name,Type,Data,MctsBudget,MctsThreads
#
# For mcts agents:
#   - Data       = path to ONNX model file
#   - MctsBudget = optional int (ms); empty → global --mcts_budget
#   - MctsThreads= optional int;      empty → global --mcts_threads
#
# For greedy_jack agents:
#   - Data       = path to JSON weight file
#
# For greedy_bob agents:
#   - Data       = quoted comma-separated weight string, e.g. "1.0,-2.5,3.1,..."
#
# For quick_diego agents:
#   - Data       = quoted comma-separated weight string (33 params)
#   - MctsBudget = MCTS color look-ahead budget in ms (default: 100)

def load_agents(filepath):
    agents = []
    with open(filepath, "r") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return agents

        has_header = any(
            h.strip().lower() in ("name", "type", "data") for h in header[:2]
        )
        rows = list(reader)
        if not has_header:
            rows = [header] + rows

        for line in rows:
            if not line or not line[0].strip():
                continue
            try:
                name = line[0].strip()
                agent_type = line[1].strip()
                raw_data = line[2].strip() if len(line) > 2 else ""
                mcts_budget = line[3].strip() if len(line) > 3 else ""
                mcts_threads = line[4].strip() if len(line) > 4 else ""

                diego_mcts_budget_val = None
                if agent_type in ("greedy_bob", "quick_diego"):
                    data = [float(x) for x in raw_data.split(",") if x.strip()]
                    if agent_type == "quick_diego":
                        diego_mcts_budget_val = mcts_budget or None
                        mcts_budget = ""
                else:
                    data = raw_data

                agents.append(
                    Agent(name, agent_type, data,
                          mcts_budget or None,
                          mcts_threads or None,
                          diego_mcts_budget_val)
                )
            except (ValueError, IndexError) as e:
                print(f"Skipping line due to parse error: {line} -> {e}")

    return agents


def validate_mcts_agents(agents):
    """Ensure that all MCTS entries refer to the same underlying model.

    Returns the common model path (string) or exits with an error.
    """
    mcts_entries = [a for a in agents if a.type == "mcts"]
    if not mcts_entries:
        return None

    # All MCTS entries must point to the same ONNX file
    model_paths = set(a.data for a in mcts_entries)
    if len(model_paths) > 1:
        logger.error(
            f"ERROR: Multiple distinct MCTS models found in --agents: {model_paths}\n"
            "Only ONE MCTS model can be listed (it may appear multiple times)."
        )
        sys.exit(1)

    return mcts_entries[0].data


# ---------------------------------------------------------------------------
# Match runner
# ---------------------------------------------------------------------------
def weights_to_str(weights):
    return ",".join(map(str, weights))


async def run_match(sem, agent1, agent2, board_path, mcts_data_dir, temp_dir):
    async with sem:
        white, black = (
            (agent1, agent2) if random.random() > 0.5 else (agent2, agent1)
        )

        cmd = [str(RUST_BIN)]
        if board_path:
            cmd.append(board_path)

        cmd.extend([
            "--batch", "1",
            "--max-turns", str(args.max_turns),
            "--white", white.type,
            "--black", black.type,
            "--white-name", white.name,
            "--black-name", black.name,
        ])

        if temp_dir:
            cmd.extend(["--store-parquet", temp_dir])

        # Agent-specific arguments
        has_mcts = False
        has_diego = False
        diego_budget = 100
        for side, agent in [("white", white), ("black", black)]:
            if agent.type == "greedy_bob":
                cmd.extend([f"--greedy-weights-{side}", weights_to_str(agent.data)])
            elif agent.type == "quick_diego":
                has_diego = True
                cmd.extend([f"--greedy-weights-{side}", weights_to_str(agent.data)])
                diego_budget = agent.diego_mcts_budget
            elif agent.type == "greedy_jack":
                cmd.extend([f"--{side}-model-path", agent.data])
            elif agent.type == "mcts":
                has_mcts = True
                cmd.extend([f"--{side}-model-path", agent.data])
                cmd.extend([f"--mcts-budget-{side}", str(agent.effective_budget())])
                cmd.extend([f"--mcts-threads-{side}", str(agent.effective_threads())])

        # MCTS data recording — ENABLED (this is the point: collect training data)
        if has_mcts:
            cmd.extend(["--mcts-data-dir", mcts_data_dir])
            # DO NOT add --mcts-no-record: we want training data

        if has_diego:
            cmd.extend(["--diego-mcts-budget", str(diego_budget)])

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        output = stdout.decode("utf-8")

        stats = None
        for line in output.splitlines():
            if "BATCH_STATS: " in line:
                try:
                    stats = json.loads(line.split("BATCH_STATS: ", 1)[1])
                    break
                except Exception:
                    pass

        w_pts = b_pts = 0
        mcts_won = None  # track MCTS outcomes
        if stats:
            w_win = stats.get("white_wins", 0)
            b_win = stats.get("black_wins", 0)
            draws = stats.get("draws", 0)
            if w_win > 0:
                w_pts = 3
            elif b_win > 0:
                b_pts = 3
            elif draws > 0:
                w_pts = b_pts = 1

            # Track MCTS outcomes for reporting
            if white.type == "mcts" or black.type == "mcts":
                mcts_side = "white" if white.type == "mcts" else "black"
                if w_win > 0 and mcts_side == "white":
                    mcts_won = True
                elif b_win > 0 and mcts_side == "black":
                    mcts_won = True
                elif draws > 0:
                    mcts_won = None  # draw
                else:
                    mcts_won = False
        else:
            logger.warning(f"Failed to parse match output for {white.name} vs {black.name}")

        return white, black, w_pts, b_pts, mcts_won


# ---------------------------------------------------------------------------
# Round runner
# ---------------------------------------------------------------------------
async def run_round(r, agents, sem, board_path, mcts_data_dir, temp_dir):
    logger.info(f"  Round {r + 1}/{args.rounds}")

    for a in agents:
        a.buchholz = sum(opp.score for opp in a.opponents if opp is not None)

    pool = list(agents)
    random.shuffle(pool)
    pool.sort(key=lambda a: (a.score, a.buchholz), reverse=True)

    unpaired = list(pool)
    pairings = []
    bye_agent = None

    if len(unpaired) % 2 != 0:
        for i in range(len(unpaired) - 1, -1, -1):
            if not unpaired[i].had_bye:
                bye_agent = unpaired.pop(i)
                break
        if bye_agent is None and unpaired:
            bye_agent = unpaired.pop(-1)
        if bye_agent:
            bye_agent.had_bye = True
            bye_agent.score += 3
            bye_agent.opponents.append(None)
            bye_agent.results.append(3)

    while len(unpaired) >= 2:
        p1 = unpaired.pop(0)
        opponent_idx = next(
            (i for i, p2 in enumerate(unpaired) if p2 not in p1.opponents), 0
        )
        p2 = unpaired.pop(opponent_idx)
        pairings.append((p1, p2))

    tasks = [
        run_match(sem, p1, p2, board_path, mcts_data_dir, temp_dir)
        for p1, p2 in pairings
    ]
    results = await asyncio.gather(*tasks)

    mcts_wins = 0
    mcts_losses = 0
    mcts_draws = 0
    mcts_games = 0

    for white, black, w_pts, b_pts, mcts_won in results:
        white.score += w_pts
        white.opponents.append(black)
        white.results.append(w_pts)

        black.score += b_pts
        black.opponents.append(white)
        black.results.append(b_pts)

        if mcts_won is True:
            mcts_wins += 1
            mcts_games += 1
        elif mcts_won is False:
            mcts_losses += 1
            mcts_games += 1
        elif mcts_won is None and (white.type == "mcts" or black.type == "mcts"):
            mcts_draws += 1
            mcts_games += 1

    return mcts_wins, mcts_losses, mcts_draws, mcts_games


# ---------------------------------------------------------------------------
# Training helpers
# ---------------------------------------------------------------------------
def cleanup_stale_data(data_dir, max_files):
    files = sorted(glob.glob(os.path.join(data_dir, "*.json")), key=os.path.getmtime)
    if len(files) > max_files:
        to_delete = files[:-max_files]
        for f in to_delete:
            try:
                os.remove(f)
            except Exception:
                pass
        logger.info(f"    Cleaned up {len(to_delete)} old data files.")


def run_training(train_epochs, train_batch_size):
    """Invoke train_mcts.py to update the ONNX model from accumulated data."""
    python_bin = ".venv/bin/python" if os.path.exists(".venv") else "python3"
    cmd = [
        python_bin,
        "train_mcts.py",
        "--epochs", str(train_epochs),
        "--batch-size", str(train_batch_size),
    ]
    subprocess.run(cmd, check=True)


def render_trend(win_rate_history):
    """Print an ASCII sparkline of MCTS win rate across tournaments."""
    if len(win_rate_history) < 2:
        return
    bars = " ▁▂▃▄▅▆▇█"
    sparkline = "".join(bars[min(int(wr * 8), 8)] for wr in win_rate_history)
    delta = win_rate_history[-1] - win_rate_history[-2]
    direction = (
        "📈 improving" if delta > 0.01
        else ("📉 declining" if delta < -0.01 else "➡  stable")
    )
    logger.info(
        f"    Win-rate trend [{sparkline}]  "
        f"{win_rate_history[0]*100:.1f}% → {win_rate_history[-1]*100:.1f}%  {direction}"
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main():
    agents = load_agents(args.agents)
    logger.info(f"Loaded {len(agents)} agent entries from {args.agents}.")
    for a in agents:
        extra = ""
        if a.type == "mcts":
            extra = f"  [budget={a.effective_budget()}ms, threads={a.effective_threads()}]"
        elif a.type == "quick_diego":
            extra = f"  [diego_mcts={a.diego_mcts_budget}ms]"
        logger.info(f"  {a.name:20s} ({a.type}){extra}")

    if len(agents) < 2:
        logger.error("Need at least 2 agents to run a tournament.")
        return

    # Validate: only one unique MCTS model allowed
    mcts_model_path = validate_mcts_agents(agents)
    mcts_count = sum(1 for a in agents if a.type == "mcts")
    if mcts_model_path:
        logger.info(
            f"MCTS agent: {mcts_count} entries, model={mcts_model_path}"
        )
    else:
        logger.warning("No MCTS agents found — no training will occur.")

    board_files = []
    if not args.board:
        board_files = glob.glob("games/data/*board.json")
        if not board_files:
            logger.error("No board files found in games/data/!")
            sys.exit(1)

    os.makedirs(args.mcts_data_dir, exist_ok=True)

    temp_dir = None
    if args.parquet_dir:
        os.makedirs(args.parquet_dir, exist_ok=True)
        temp_dir = args.parquet_dir

    sem = asyncio.Semaphore(args.parallel)
    start_time = time.time()
    tournament_num = 0
    win_rate_history = []

    logger.info(
        f"\nStarting Learning MCTS Swiss Tournament for {args.duration/60:.1f} minutes\n"
        f"  Rounds per tournament: {args.rounds}\n"
        f"  Parallel matches: {args.parallel}\n"
        f"  Training epochs: {args.train_epochs}\n"
        f"  Data buffer: {args.max_data_files} files\n"
    )

    try:
        while time.time() - start_time < args.duration:
            tournament_num += 1
            elapsed = time.time() - start_time
            remaining = args.duration - elapsed

            logger.info(
                f"\n{'='*60}\n"
                f"  TOURNAMENT {tournament_num} | "
                f"Elapsed: {elapsed/60:.1f}m | Remaining: {remaining/60:.1f}m\n"
                f"{'='*60}"
            )

            # Reset tournament state for all agents
            for a in agents:
                a.reset_tournament_state()

            current_board = args.board or random.choice(board_files)
            if not args.board:
                logger.info(f"  Board: {current_board}")

            # === RUN SWISS TOURNAMENT ===
            total_mcts_wins = 0
            total_mcts_losses = 0
            total_mcts_draws = 0
            total_mcts_games = 0

            for r in range(args.rounds):
                mw, ml, md, mg = await run_round(
                    r, agents, sem, current_board, args.mcts_data_dir, temp_dir
                )
                total_mcts_wins += mw
                total_mcts_losses += ml
                total_mcts_draws += md
                total_mcts_games += mg

            # Final standings
            for a in agents:
                a.buchholz = sum(
                    opp.score for opp in a.opponents if opp is not None
                )
            agents.sort(key=lambda a: (a.score, a.buchholz), reverse=True)

            logger.info("\n  Standings:")
            for i, a in enumerate(agents[:15]):
                logger.info(
                    f"    {i+1:2d}. {a.name:20s} | Score: {a.score:3d} | "
                    f"Buchholz: {a.buchholz:3d}"
                )
            if len(agents) > 15:
                logger.info(f"    ... and {len(agents) - 15} more.")

            # MCTS performance
            if total_mcts_games > 0:
                wr = total_mcts_wins / total_mcts_games
                win_rate_history.append(wr)
                logger.info(
                    f"\n  MCTS performance: "
                    f"W:{total_mcts_wins} L:{total_mcts_losses} D:{total_mcts_draws} "
                    f"({total_mcts_games} games) — Win rate: {wr*100:.1f}%"
                )
                render_trend(win_rate_history)

            # === TRAINING PHASE ===
            if mcts_model_path:
                cleanup_stale_data(args.mcts_data_dir, args.max_data_files)
                num_data = len(glob.glob(os.path.join(args.mcts_data_dir, "*.json")))
                logger.info(
                    f"\n  Training GNN on {num_data} data files "
                    f"(epochs={args.train_epochs}, batch={args.train_batch_size})..."
                )
                try:
                    run_training(args.train_epochs, args.train_batch_size)
                    logger.info("  Training complete ✓")

                    # Copy the freshly trained model back to the agent's
                    # ONNX path so the next tournament uses the improved model.
                    trained_onnx = Path("./rust/model.onnx")
                    agent_onnx = Path(mcts_model_path)
                    if trained_onnx.exists() and trained_onnx.resolve() != agent_onnx.resolve():
                        shutil.copy2(str(trained_onnx), str(agent_onnx))
                        logger.info(
                            f"  Copied trained model → {agent_onnx}"
                        )
                except Exception as e:
                    logger.error(f"  Training failed: {e}")

    except asyncio.CancelledError:
        logger.info("\nShutdown requested (Ctrl+C).")
    except Exception as e:
        logger.error(f"\nUnexpected error: {e}", exc_info=True)
    finally:
        elapsed = time.time() - start_time
        logger.info(f"\n{'='*60}")
        logger.info(f"  SESSION COMPLETE — {tournament_num} tournaments in {elapsed/60:.1f}m")

        if win_rate_history:
            logger.info("\n  MCTS Learning Progress:")
            for i, wr in enumerate(win_rate_history, 1):
                bar = "█" * int(wr * 20)
                logger.info(f"    Tournament {i:3d}: {wr*100:5.1f}%  |{bar:<20}|")
            overall = sum(win_rate_history) / len(win_rate_history)
            logger.info(f"    Overall avg win rate: {overall*100:.1f}%")
            render_trend(win_rate_history)

        logger.info(f"{'='*60}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
