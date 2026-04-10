import argparse
import asyncio
import csv
import glob
import random
import re
import sys
import time
from pathlib import Path
import json
import os
import shutil
import tempfile

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
parser = argparse.ArgumentParser(description="Swiss Tournament Organizer")
parser.add_argument("--agents",      type=str, required=True,
                    help="Path to CSV with agents (Name,Type,Data,MctsBudget,MctsThreads)")
parser.add_argument("--rounds",      type=int, default=5,
                    help="Number of rounds in the tournament")
parser.add_argument("--parallel",    type=int, default=5,
                    help="Number of parallel matches to run")
parser.add_argument("--parquet",     type=str, default="games.parquet",
                    help="Path to save the output games .parquet file")
parser.add_argument("--crosstable",  type=str, default="crosstable.csv",
                    help="Path to save the crosstable file")
parser.add_argument("--board",       type=str, default=None,
                    help="Path to the board JSON. If not provided, a random one is used.")
parser.add_argument("--max_turns",   type=int, default=200,
                    help="Maximum turns per game")
parser.add_argument("--mcts_budget", type=int, default=100,
                    help="Default MCTS budget in ms (per-agent column overrides this)")
parser.add_argument("--mcts_threads", type=int, default=1,
                    help="Default MCTS search threads (per-agent column overrides this)")
args = parser.parse_args()

RUST_BIN = Path("rust/target/release/rust")

if not RUST_BIN.exists():
    print(f"Error: {RUST_BIN} not found! Please compile the engine.")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Agent class
# ---------------------------------------------------------------------------
class Agent:
    def __init__(self, name, agent_type, data, mcts_budget=None, mcts_threads=None, diego_mcts_budget=None):
        self.name = name
        self.type = agent_type       # greedy_bob | greedy_jack | mcts
        self.data = data             # list[float] for greedy_bob, str path for others
        # Per-agent MCTS tuning — None means "fall back to global default"
        self.mcts_budget  = int(mcts_budget)  if mcts_budget  else None
        self.mcts_threads = int(mcts_threads) if mcts_threads else None
        self.diego_mcts_budget = int(diego_mcts_budget) if diego_mcts_budget else 100
        # Tournament state
        self.score     = 0
        self.buchholz  = 0
        self.opponents = []   # list[Agent | None]
        self.results   = []   # list[int]  (3 / 1 / 0)
        self.had_bye   = False

    def effective_budget(self):
        return self.mcts_budget  if self.mcts_budget  is not None else args.mcts_budget

    def effective_threads(self):
        return self.mcts_threads if self.mcts_threads is not None else args.mcts_threads


# ---------------------------------------------------------------------------
# CSV loader
# ---------------------------------------------------------------------------
# Expected CSV format:
#   Name,Type,Data,MctsBudget,MctsThreads
#
# For mcts / greedy_jack agents:
#   - Data       = path to model file (string)
#   - MctsBudget = optional int (ms); empty → global --mcts_budget
#   - MctsThreads= optional int;      empty → global --mcts_threads
#
# For greedy_bob agents:
#   - Data       = quoted comma-separated weight string, e.g. "1.0,-2.5,3.1,..."
#   - MctsBudget/MctsThreads are ignored (leave empty)
#
# For quick_diego agents:
#   - Data       = quoted comma-separated weight string (33 params)
#   - MctsBudget = MCTS color look-ahead budget in ms (default: 100)
#   - MctsThreads is ignored (leave empty)

def load_agents(filepath):
    agents = []
    with open(filepath, 'r') as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return agents

        # Skip header row if it contains recognisable header words
        has_header = any(h.strip().lower() in ("name", "type", "data") for h in header[:2])
        rows = list(reader)
        if not has_header:
            rows = [header] + rows   # first row is actually data

        for line in rows:
            if not line or not line[0].strip():
                continue
            try:
                name        = line[0].strip()
                agent_type  = line[1].strip()
                raw_data    = line[2].strip() if len(line) > 2 else ""
                mcts_budget  = line[3].strip() if len(line) > 3 else ""
                mcts_threads = line[4].strip() if len(line) > 4 else ""

                diego_mcts_budget_val = None
                if agent_type == "greedy_bob":
                    # Data column is a quoted comma-separated weight string
                    data = [float(x) for x in raw_data.split(',') if x.strip()]
                elif agent_type == "quick_diego":
                    # MctsBudget column is reused as diego MCTS color look-ahead budget
                    diego_mcts_budget_val = mcts_budget or None
                    mcts_budget = ""  # not used for MCTS search
                    if raw_data.endswith('.json'):
                        # Data column is a path to a JSON file with {"weights": [...]}
                        with open(raw_data, 'r') as wf:
                            data = json.loads(wf.read())["weights"]
                    else:
                        # Data column is inline comma-separated floats
                        data = [float(x) for x in raw_data.split(',') if x.strip()]
                else:
                    data = raw_data

                agents.append(Agent(name, agent_type, data,
                                    mcts_budget  or None,
                                    mcts_threads or None,
                                    diego_mcts_budget_val))
            except (ValueError, IndexError) as e:
                print(f"Skipping line due to parse error: {line} -> {e}")

    return agents


def validate_agent_files(agents):
    """Check that all file-based agents have valid, existing model/weight files.

    Exits with an error message if any file is missing.
    """
    errors = []
    for a in agents:
        if a.type in ("mcts", "greedy_jack"):
            # data is a file path string
            if not os.path.isfile(a.data):
                errors.append(f"  {a.name} ({a.type}): file not found: {a.data}")
        elif a.type == "quick_diego" and isinstance(a.data, list):
            # Weights were already loaded (either from JSON file or inline)
            if len(a.data) == 0:
                errors.append(f"  {a.name} ({a.type}): empty weight vector")
        elif a.type == "greedy_bob" and isinstance(a.data, list):
            if len(a.data) == 0:
                errors.append(f"  {a.name} ({a.type}): empty weight vector")

    if errors:
        print(f"\nERROR: {len(errors)} agent(s) failed validation:")
        for e in errors:
            print(e)
        sys.exit(1)
    print(f"✓ All {len(agents)} agents validated successfully.")


# ---------------------------------------------------------------------------
# Match runner
# ---------------------------------------------------------------------------
def weights_to_str(weights):
    return ",".join(map(str, weights))

async def run_match(sem, agent1, agent2, board_path, temp_dir):
    async with sem:
        white, black = (agent1, agent2) if random.random() > 0.5 else (agent2, agent1)

        cmd = [str(RUST_BIN)]
        if board_path:
            cmd.append(board_path)

        cmd.extend([
            "--batch",     "1",
            "--max-turns", str(args.max_turns),
            "--white",     white.type,
            "--black",     black.type,
            "--white-name", white.name,
            "--black-name", black.name,
            "--store-parquet", temp_dir,
        ])

        # Agent-specific arguments (weights / model path / MCTS tuning)
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
                cmd.extend([f"--{side}-model-path",   agent.data])
                cmd.extend([f"--mcts-budget-{side}",  str(agent.effective_budget())])
                cmd.extend([f"--mcts-threads-{side}", str(agent.effective_threads())])

        # Suppress MCTS training data recording for tournament matches
        if has_mcts:
            cmd.append("--mcts-no-record")

        # QuickDiego MCTS color look-ahead budget
        if has_diego:
            cmd.extend(["--diego-mcts-budget", str(diego_budget)])

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        output = stdout.decode('utf-8')

        stats = None
        for line in output.splitlines():
            if "BATCH_STATS: " in line:
                try:
                    stats = json.loads(line.split("BATCH_STATS: ", 1)[1])
                    break
                except:
                    pass

        w_pts = b_pts = 0
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
        else:
            print(f"Failed to parse match output for {white.name} vs {black.name}")
            print(f"STDOUT SNIPPET:\n{output[:500]}")
            print(f"Stderr: {stderr.decode('utf-8')}")

        return white, black, w_pts, b_pts


# ---------------------------------------------------------------------------
# Round runner
# ---------------------------------------------------------------------------
async def run_round(r, agents, sem, board_path, temp_dir):
    print(f"\n--- Round {r+1}/{args.rounds} ---")

    for a in agents:
        a.buchholz = sum(opp.score for opp in a.opponents if opp is not None)

    pool = list(agents)
    random.shuffle(pool)
    pool.sort(key=lambda a: (a.score, a.buchholz), reverse=True)

    unpaired = list(pool)
    pairings  = []
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
            print(f"Agent {bye_agent.name} receives a BYE (3 pts).")

    while len(unpaired) >= 2:
        p1 = unpaired.pop(0)
        opponent_idx = next(
            (i for i, p2 in enumerate(unpaired) if p2 not in p1.opponents),
            0
        )
        p2 = unpaired.pop(opponent_idx)
        pairings.append((p1, p2))

    tasks   = [run_match(sem, p1, p2, board_path, temp_dir) for p1, p2 in pairings]
    results = await asyncio.gather(*tasks)

    round_games = []
    for white, black, w_pts, b_pts in results:
        white.score += w_pts
        white.opponents.append(black)
        white.results.append(w_pts)

        black.score += b_pts
        black.opponents.append(white)
        black.results.append(b_pts)

        winner = "White" if w_pts == 3 else ("Black" if b_pts == 3 else "Draw")
        round_games.append({
            "Round":      r + 1,
            "White":      white.name,
            "Black":      black.name,
            "WhiteScore": w_pts,
            "BlackScore": b_pts,
            "Winner":     winner,
        })

    if bye_agent:
        round_games.append({
            "Round":      r + 1,
            "White":      bye_agent.name,
            "Black":      "BYE",
            "WhiteScore": 3,
            "BlackScore": 0,
            "Winner":     "White",
        })

    return round_games


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main():
    agents = load_agents(args.agents)
    print(f"Loaded {len(agents)} agents from {args.agents}.")
    validate_agent_files(agents)
    for a in agents:
        extra = ""
        if a.type == "mcts":
            extra = f"  [budget={a.effective_budget()}ms, threads={a.effective_threads()}]"
        print(f"  {a.name:20s} ({a.type}){extra}")

    if len(agents) < 2:
        print("Need at least 2 agents to run a tournament.")
        return

    board_files = []
    if not args.board:
        board_files = glob.glob("games/data/*board.json")
        if not board_files:
            print("Error: No board files found in games/data/!")
            sys.exit(1)

    sem      = asyncio.Semaphore(args.parallel)
    temp_dir = tempfile.mkdtemp(prefix="swiss_games_")
    print(f"Using temporary directory for parquet games: {temp_dir}")

    all_games  = []
    start_time = time.time()

    for r in range(args.rounds):
        current_board = args.board or random.choice(board_files)
        if not args.board:
            print(f"Selected random board for round {r+1}: {current_board}")
        games = await run_round(r, agents, sem, current_board, temp_dir)
        all_games.extend(games)
        elapsed = time.time() - start_time
        print(f"Completed round {r+1}. Time elapsed: {elapsed:.1f}s")

    # Final Buchholz
    for a in agents:
        a.buchholz = sum(opp.score for opp in a.opponents if opp is not None)
    agents.sort(key=lambda a: (a.score, a.buchholz), reverse=True)

    rank_map = {a.name: rank + 1 for rank, a in enumerate(agents)}
    crosstable_rows = []
    for i, a in enumerate(agents):
        history = " | ".join(
            "BYE (3)" if opp is None else f"{rank_map[opp.name]} ({res})"
            for opp, res in zip(a.opponents, a.results)
        )
        crosstable_rows.append({
            "Rank":     i + 1,
            "Name":     a.name,
            "Score":    a.score,
            "Buchholz": a.buchholz,
            "History":  history,
        })

    print("\n=== FINAL STANDINGS ===")
    for row in crosstable_rows[:20]:
        print(f" {row['Rank']:2d}. {row['Name']:20s} | Score: {row['Score']:3d} | Buchholz: {row['Buchholz']:3d} | {row['History']}")
    if len(crosstable_rows) > 20:
        print(f"   ... and {len(crosstable_rows) - 20} more.")

    # Save crosstable
    if PANDAS_AVAILABLE:
        ct_df = pd.DataFrame(crosstable_rows)
        out = args.crosstable if args.crosstable.endswith('.csv') else args.crosstable + '.csv'
        ct_df.to_csv(out, index=False)
    else:
        out = args.crosstable if args.crosstable.endswith('.csv') else args.crosstable + '.csv'
        with open(out, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=crosstable_rows[0].keys())
            writer.writeheader()
            writer.writerows(crosstable_rows)
    print(f"\n✅ Saved crosstable to {out}")

    # Save game summaries and merged parquet
    summary_csv = args.parquet.replace('.parquet', '_summary.csv')
    if PANDAS_AVAILABLE:
        pd.DataFrame(all_games).to_csv(summary_csv, index=False)
        print(f"✅ Saved game match summaries to {summary_csv}")

        parquet_files = glob.glob(os.path.join(temp_dir, "*.parquet"))
        if parquet_files:
            print(f"Merging {len(parquet_files)} game records into {args.parquet}...")
            merged_df = pd.concat([pd.read_parquet(f) for f in parquet_files], ignore_index=True)
            merged_df.to_parquet(args.parquet, index=False)
            print(f"✅ Saved full game replays to {args.parquet}")
        else:
            print("WARNING: No parquet files found in temp_dir. Rust engine might have failed.")
    else:
        print("WARNING: pandas not available. Saving game summaries as CSV only.")
        with open(summary_csv, 'w', newline='') as f:
            if all_games:
                writer = csv.DictWriter(f, fieldnames=all_games[0].keys())
                writer.writeheader()
                writer.writerows(all_games)
        print(f"✅ Saved game match summaries to {summary_csv}")

    try:
        shutil.rmtree(temp_dir)
    except Exception as e:
        print(f"Failed to cleanup temp dir: {e}")


if __name__ == "__main__":
    asyncio.run(main())
