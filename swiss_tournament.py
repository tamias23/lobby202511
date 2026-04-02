import argparse
import asyncio
import csv
import random
import re
import sys
import sys
import time
from pathlib import Path
import os
import shutil
import tempfile

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False


parser = argparse.ArgumentParser(description="Swiss Tournament Organizer")
parser.add_argument("--agents", type=str, required=True, help="Path to input CSV with agents (Name,Type,Data)")
parser.add_argument("--rounds", type=int, default=5, help="Number of rounds in the tournament")
parser.add_argument("--parallel", type=int, default=5, help="Number of parallel matches to run")
parser.add_argument("--parquet", type=str, default="games.parquet", help="Path to save the output games .parquet file")
parser.add_argument("--crosstable", type=str, default="crosstable.csv", help="Path to save the crosstable file")
parser.add_argument("--board", type=str, default=None, help="Path to the board JSON. If not provided, a random one is used.")
parser.add_argument("--max_turns", type=int, default=200, help="Maximum turns per game")
parser.add_argument("--mcts_budget", type=int, default=100, help="MCTS budget in ms")
parser.add_argument("--mcts_data_dir", type=str, default="./rust/mcts_temp", help="MCTS data directory")
args = parser.parse_args()

RUST_BIN = Path("rust/target/release/rust")

if not RUST_BIN.exists():
    print(f"Error: {RUST_BIN} not found! Please compile the engine.")
    sys.exit(1)

def weights_to_str(weights):
    return ",".join(map(str, weights))

class Agent:
    def __init__(self, name, agent_type, data):
        self.name = name
        self.type = agent_type # greedy_bob, greedy_jack, mcts
        self.data = data # weights list or model path string
        self.score = 0
        self.buchholz = 0
        self.opponents = [] # list of Agent or None (for bye)
        self.results = [] # list of int (3, 1, 0)
        self.had_bye = False

async def run_match(sem, agent1, agent2, board_path, temp_dir):
    async with sem:
        # Determine who plays white randomly
        white, black = (agent1, agent2) if random.random() > 0.5 else (agent2, agent1)
        
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
            "--store-parquet", temp_dir
        ])

        # Add agent-specific arguments
        for side, agent in [("white", white), ("black", black)]:
            if agent.type == "greedy_bob":
                cmd.extend([f"--greedy-weights-{side}", weights_to_str(agent.data)])
            elif agent.type == "greedy_jack":
                cmd.extend([f"--{side}-model-path", agent.data])
            elif agent.type == "mcts":
                cmd.extend([f"--{side}-model-path", agent.data])
                cmd.extend(["--mcts-budget", str(args.mcts_budget)])
                cmd.extend(["--mcts-data-dir", args.mcts_data_dir])
                cmd.append("--mcts-no-record")
        
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        output = stdout.decode('utf-8')
        
        w_match = re.search(r"White wins\s*:\s*(\d+)", output)
        b_match = re.search(r"Black wins\s*:\s*(\d+)", output)
        d_match = re.search(r"Draws\s*:\s*(\d+)", output)
        
        w_pts = 0
        b_pts = 0
        
        if w_match and b_match and d_match:
            w_win = int(w_match.group(1))
            b_win = int(b_match.group(1))
            draws = int(d_match.group(1))
            
            if w_win > 0:
                w_pts = 3
            elif b_win > 0:
                b_pts = 3
            elif draws > 0:
                w_pts = 1
                b_pts = 1
        else:
            print(f"Failed to parse match output for {white.name} vs {black.name}")
            print(f"Stderr: {stderr.decode('utf-8')}")
            
        return white, black, w_pts, b_pts

def load_agents(filepath):
    agents = []
    with open(filepath, 'r') as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return agents
            
        # Check if header is actually data or header
        if "Name" not in header and "name" not in header[0].lower():
            # If no header, we assume Name,Type,Data format
            line = header
            name = line[0]
            agent_type = line[1]
            if agent_type == "greedy_bob":
                data = [float(x) for x in line[2:]]
            else:
                data = line[2]
            agents.append(Agent(name, agent_type, data))

        for line in reader:
            if not line: continue
            name = line[0]
            agent_type = line[1]
            try:
                if agent_type == "greedy_bob":
                    data = [float(x) for x in line[2:]]
                else:
                    data = line[2]
                agents.append(Agent(name, agent_type, data))
            except (ValueError, IndexError) as e:
                print(f"Skipping line due to parse error: {line} -> {e}")
                
    return agents

async def run_round(r, agents, sem, board_path, temp_dir):
    print(f"\n--- Round {r+1}/{args.rounds} ---")
    
    # Update Buchholz before pairing
    for a in agents:
        a.buchholz = sum(opp.score for opp in a.opponents if opp is not None)
    
    # Shuffle first to randomize ties, then sort by Score, then Buchholz
    pool = list(agents)
    random.shuffle(pool)
    pool.sort(key=lambda a: (a.score, a.buchholz), reverse=True)
    
    unpaired = list(pool)
    pairings = []
    bye_agent = None
    
    if len(unpaired) % 2 != 0:
        # Give bye to lowest ranked player who hasn't had a bye
        for i in range(len(unpaired)-1, -1, -1):
            if not unpaired[i].had_bye:
                bye_agent = unpaired.pop(i)
                bye_agent.had_bye = True
                bye_agent.score += 3
                bye_agent.opponents.append(None)
                bye_agent.results.append(3)
                print(f"Agent {bye_agent.name} receives a BYE (3 pts).")
                break
        
        # If all miraculously had a bye, forcefully give to the very last
        if bye_agent is None and unpaired:
            bye_agent = unpaired.pop(-1)
            bye_agent.had_bye = True
            bye_agent.score += 3
            bye_agent.opponents.append(None)
            bye_agent.results.append(3)
            print(f"Agent {bye_agent.name} receives a duplicate BYE.")
    
    while len(unpaired) >= 2:
        p1 = unpaired.pop(0)
        
        # Find opponent p1 hasn't played
        opponent_idx = -1
        for i, p2 in enumerate(unpaired):
            if p2 not in p1.opponents:
                opponent_idx = i
                break
        
        if opponent_idx == -1:
            # Fallback if no valid opponent
            opponent_idx = 0
            
        p2 = unpaired.pop(opponent_idx)
        pairings.append((p1, p2))

    tasks = []
    for p1, p2 in pairings:
        tasks.append(run_match(sem, p1, p2, board_path, temp_dir))
        
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
            "Round": r + 1,
            "White": white.name,
            "Black": black.name,
            "WhiteScore": w_pts,
            "BlackScore": b_pts,
            "Winner": winner
        })
        
    if bye_agent:
        round_games.append({
            "Round": r + 1,
            "White": bye_agent.name,
            "Black": "BYE",
            "WhiteScore": 3,
            "BlackScore": 0,
            "Winner": "White"
        })
        
    return round_games

async def main():
    agents = load_agents(args.agents)
    print(f"Loaded {len(agents)} agents from {args.agents}.")
    if len(agents) < 2:
        print("Need at least 2 agents to run a tournament.")
        return

    board_files = []
    if not args.board:
        import glob
        board_files = glob.glob("games/data/*board.json")
        if not board_files:
            print("Error: No board files found in games/data/!")
            sys.exit(1)
            
    sem = asyncio.Semaphore(args.parallel)
    temp_dir = tempfile.mkdtemp(prefix="swiss_games_")
    print(f"Using temporary directory for parquet games: {temp_dir}")
    
    all_games = []
    start_time = time.time()
    
    for r in range(args.rounds):
        current_board = args.board
        if not current_board:
            current_board = random.choice(board_files)
            print(f"Selected random board for round {r+1}: {current_board}")
            
        games = await run_round(r, agents, sem, current_board, temp_dir)
        all_games.extend(games)
        elapsed = time.time() - start_time
        print(f"Completed round {r+1}. Time elapsed: {elapsed:.1f}s")
        
    # Calculate final Buchholz
    for a in agents:
        a.buchholz = sum(opp.score for opp in a.opponents if opp is not None)
    
    # Sort for final standings
    agents.sort(key=lambda a: (a.score, a.buchholz), reverse=True)
    
    # Map for getting opponent rank
    rank_map = {a.name: rank + 1 for rank, a in enumerate(agents)}
    
    crosstable_rows = []
    for i, a in enumerate(agents):
        rank = i + 1
        history_strings = []
        for opp, res in zip(a.opponents, a.results):
            if opp is None:
                history_strings.append("BYE (3)")
            else:
                opp_rank = rank_map[opp.name]
                history_strings.append(f"{opp_rank} ({res})")
                
        row = {
            "Rank": rank,
            "Name": a.name,
            "Score": a.score,
            "Buchholz": a.buchholz,
            "History": " | ".join(history_strings)
        }
        crosstable_rows.append(row)
        
    print("\n=== FINAL STANDINGS ===")
    for row in crosstable_rows[:20]: # Print top 20
        print(f" {row['Rank']:2d}. {row['Name']:12s} | Score: {row['Score']:2d} | Buchholz: {row['Buchholz']:2d} | Path: {row['History']}")
    
    if len(crosstable_rows) > 20:
        print(f"   ... and {len(crosstable_rows) - 20} more.")
    
    # Save Crosstable
    if PANDAS_AVAILABLE:
        ct_df = pd.DataFrame(crosstable_rows)
        if args.crosstable.endswith('.csv'):
            ct_df.to_csv(args.crosstable, index=False)
        elif args.crosstable.endswith('.parquet'):
            ct_df.to_parquet(args.crosstable, index=False)
        else:
            ct_df.to_csv(args.crosstable + '.csv', index=False)
    else:
        import csv
        filename = args.crosstable if args.crosstable.endswith('.csv') else args.crosstable + '.csv'
        with open(filename, 'w', newline='') as f:
            if crosstable_rows:
                writer = csv.DictWriter(f, fieldnames=crosstable_rows[0].keys())
                writer.writeheader()
                writer.writerows(crosstable_rows)
    print(f"\n✅ Saved crosstable to {args.crosstable}")
    
    # Save Games
    if PANDAS_AVAILABLE:
        summary_csv = args.parquet.replace('.parquet', '_summary.csv')
        games_df = pd.DataFrame(all_games)
        games_df.to_csv(summary_csv, index=False)
        print(f"✅ Saved game match summaries to {summary_csv}")
        
        parquet_files = glob.glob(os.path.join(temp_dir, "*.parquet"))
        if parquet_files:
            print(f"Merging {len(parquet_files)} game records into {args.parquet}...")
            dfs = [pd.read_parquet(f) for f in parquet_files]
            merged_df = pd.concat(dfs, ignore_index=True)
            merged_df.to_parquet(args.parquet, index=False)
            print(f"✅ Saved full game replays to {args.parquet}")
        else:
            print("WARNING: No parquet files found in temp_dir. Rust engine might have failed to record games.")
            
    else:
        print("WARNING: pandas is not installed. Saving games as CSV instead of Parquet.")
        import csv
        summary_csv = args.parquet.replace('.parquet', '_summary.csv')
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
