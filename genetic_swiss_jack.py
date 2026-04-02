import argparse
import asyncio
import csv
import glob
import random
import re
import string
import sys
import time
from pathlib import Path

# Parse CLI arguments
parser = argparse.ArgumentParser(description="Greedy Jack Genetic Algorithm Evolution (Swiss Tournament)")
parser.add_argument("--duration", type=int, default=3600, help="Duration to run the evolution in seconds (default: 3600)")
parser.add_argument("--rounds", type=int, default=20, help="Number of Swiss rounds per generation (default: 20)")
parser.add_argument("--agents", type=int, default=100, help="Total population size (default: 100)")
parser.add_argument("--parallel", type=int, default=5, help="Number of parallel matches (default: 5)")
parser.add_argument("--board", type=str, default=None, help="Path to board JSON. If not set, random board per generation.")
parser.add_argument("--max_turns", type=int, default=200, help="Maximum turns per game")
parser.add_argument("--mutation_rate", type=float, default=0.08, help="Fraction of weights to mutate per generation (default: 0.08)")
parser.add_argument("--mutation_sigma", type=float, default=0.3, help="Std-dev of Gaussian noise for mutations (default: 0.3)")
args = parser.parse_args()

RUST_BIN = Path("rust/target/release/rust")
NUM_WEIGHTS = 5025  # Must match agents::greedy_jack::NUM_PARAMS

if not RUST_BIN.exists():
    print(f"Error: {RUST_BIN} not found! Please compile with 'cd rust && cargo build --release'")
    sys.exit(1)

def generate_random_weights():
    """Initialize weights with uniform(-1.0, 1.0) — standard for neural networks."""
    return [round(random.uniform(-1.0, 1.0), 6) for _ in range(NUM_WEIGHTS)]

def derive_agent_weights(base_weights):
    """Mutate ~8% of weights by adding Gaussian noise N(0, sigma)."""
    new_weights = list(base_weights)
    num_mutations = max(1, int(len(new_weights) * args.mutation_rate))
    indices_to_mutate = random.sample(range(len(new_weights)), num_mutations)
    for idx in indices_to_mutate:
        new_weights[idx] = round(new_weights[idx] + random.gauss(0, args.mutation_sigma), 6)
        # Clip to prevent explosion
        new_weights[idx] = max(-5.0, min(5.0, new_weights[idx]))
    return new_weights

def crossover_weights(w1, w2):
    """Uniform crossover: each weight is randomly taken from one parent."""
    return [w1[i] if random.random() < 0.5 else w2[i] for i in range(len(w1))]

def weights_to_str(weights):
    return ",".join(str(w) for w in weights)

def generate_random_name(generation_num):
    letters = random.choices(string.ascii_letters, k=8)
    digits = f"{generation_num % 100:02d}"
    return "".join(letters) + digits

class Agent:
    def __init__(self, agent_id, weights=None, name=None, generation_num=1):
        self.id = agent_id
        self.name = name if name else generate_random_name(generation_num)
        self.weights = weights if weights else generate_random_weights()
        self.score = 0
        self.opponents = []

async def run_match(sem, agent1, agent2, board_path):
    async with sem:
        white, black = (agent1, agent2) if random.random() > 0.5 else (agent2, agent1)
        
        cmd = [
            str(RUST_BIN),
            board_path,
            "--batch", "1",
            "--max-turns", str(args.max_turns),
            "--white", "greedy_jack",
            "--black", "greedy_jack",
            "--greedy-weights-white", weights_to_str(white.weights),
            "--greedy-weights-black", weights_to_str(black.weights),
        ]
        
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        output = stdout.decode("utf-8")
        
        w_match = re.search(r"White wins\s*:\s*(\d+)", output)
        b_match = re.search(r"Black wins\s*:\s*(\d+)", output)
        d_match = re.search(r"Draws\s*:\s*(\d+)", output)
        
        if w_match and b_match and d_match:
            w_win = int(w_match.group(1))
            b_win = int(b_match.group(1))
            draws = int(d_match.group(1))
            
            if w_win > 0:
                white.score += 3
            elif b_win > 0:
                black.score += 3
            elif draws > 0:
                white.score += 1
                black.score += 1
        else:
            print(f"Failed to parse match output for Agents: {white.id} vs {black.id}")
            print(f"RAW OUTPUT:\n{output[:500]}")

async def run_generation(agents, sem, start_time, board_path):
    for a in agents:
        a.score = 0
        a.opponents = []
    
    matches_played = 0
    for r in range(args.rounds):
        pool = list(agents)
        random.shuffle(pool)
        pool.sort(key=lambda a: (a.score, sum(opp.score for opp in a.opponents)), reverse=True)
        
        unpaired = list(pool)
        pairings = []
        
        while len(unpaired) >= 2:
            p1 = unpaired.pop(0)
            opponent_idx = -1
            for i, p2 in enumerate(unpaired):
                if p2 not in p1.opponents:
                    opponent_idx = i
                    break
            if opponent_idx == -1:
                opponent_idx = 0
            
            p2 = unpaired.pop(opponent_idx)
            pairings.append((p1, p2))
            p1.opponents.append(p2)
            p2.opponents.append(p1)
        
        tasks = [run_match(sem, p1, p2, board_path) for p1, p2 in pairings]
        matches_played += len(tasks)
        await asyncio.gather(*tasks)
        
        elapsed = time.time() - start_time
        remaining = max(0, args.duration - elapsed)
        print(f"  Round {r+1:02d}/{args.rounds} completed | Time Remaining: {remaining/60:.1f} minutes")
    
    return matches_played

async def main():
    print(f"Initializing {args.agents} random Greedy Jack agents ({NUM_WEIGHTS} params each)...")
    population = [Agent(i + 1, generation_num=1) for i in range(args.agents)]
    sem = asyncio.Semaphore(args.parallel)
    
    start_time = time.time()
    generation = 1
    total_matches = 0
    
    board_files = glob.glob("games/data/*board.json")
    
    while True:
        print(f"\n--- Starting Generation {generation} ---")
        
        current_board = args.board
        if current_board is None:
            if not board_files:
                print("Error: No board files found in games/data/!")
                sys.exit(1)
            current_board = random.choice(board_files)
            print(f"Selected random board: {current_board}")
        
        matches_this_gen = await run_generation(population, sem, start_time, current_board)
        total_matches += matches_this_gen
        
        population.sort(key=lambda a: (a.score, sum(opp.score for opp in a.opponents)), reverse=True)
        
        print("\nTop 10 Agents this Generation:")
        for i in range(min(10, len(population))):
            buchholz = sum(opp.score for opp in population[i].opponents)
            print(f"  Rank {i+1}: Agent {population[i].id} '{population[i].name}' | Score: {population[i].score} | Buchholz: {buchholz}")
        
        elapsed = time.time() - start_time
        remaining = max(0, args.duration - elapsed)
        
        cutoff = args.agents // 2
        top_half = population[:cutoff]
        nonzero_scores = [a.score for a in top_half if a.score > 0]
        avg_score = sum(nonzero_scores) / len(nonzero_scores) if nonzero_scores else 0
        
        print(f"\n=== Generation {generation} Statistics ===")
        print(f"Total Matches: {total_matches} | Avg Top-{cutoff} Score: {avg_score:.2f}")
        print(f"Time: {elapsed:.0f}s / {args.duration}s | Remaining: {remaining:.0f}s")
        
        if elapsed >= args.duration:
            print("\nTime expired. Ending evolution.")
            break
        
        # Selection + reproduction
        survivors = population[:cutoff]
        removed = population[cutoff:]
        
        num_derived = (len(removed) + 1) // 2
        top_performers = survivors[:5]
        
        new_agents = []
        for i, dead_agent in enumerate(removed):
            if i < num_derived and len(top_performers) >= 2:
                # 50% mutation from top performer, 50% crossover of two top performers
                if random.random() < 0.5:
                    base = random.choice(top_performers)
                    new_weights = derive_agent_weights(base.weights)
                else:
                    p1, p2 = random.sample(top_performers, 2)
                    new_weights = crossover_weights(p1.weights, p2.weights)
                    new_weights = derive_agent_weights(new_weights)  # light mutation after crossover
                new_agents.append(Agent(dead_agent.id, weights=new_weights, generation_num=generation + 1))
            else:
                new_agents.append(Agent(dead_agent.id, generation_num=generation + 1))
        
        population = survivors + new_agents
        generation += 1
    
    # Final output
    print("\n==================================")
    print("=== EVOLUTION SEARCH COMPLETE ===")
    print("==================================")
    
    elapsed = time.time() - start_time
    print(f"\nExecution Summary:")
    print(f"  Total Time: {elapsed:.0f}s | Generations: {generation} | Matches: {total_matches}")
    print(f"  Speed: {total_matches / elapsed:.2f} matches/sec")
    
    population.sort(key=lambda a: (a.score, sum(opp.score for opp in a.opponents)), reverse=True)
    
    # Save individual weight files
    import json
    nets_dir = Path("./results/jack_nets")
    nets_dir.mkdir(parents=True, exist_ok=True)
    
    for i, agent in enumerate(population):
        buchholz = sum(opp.score for opp in agent.opponents)
        data = {
            "rank": i + 1,
            "agent_id": agent.id,
            "name": agent.name,
            "score": agent.score,
            "buchholz": buchholz,
            "generation": generation,
            "num_params": NUM_WEIGHTS,
            "weights": agent.weights,
        }
        filename = nets_dir / f"rank_{i+1:03d}_{agent.name}.json"
        with open(filename, "w") as f:
            json.dump(data, f)
        if i < 5:
            print(f"Rank {i+1} [Agent {agent.id} '{agent.name}'] - Score: {agent.score} | Buchholz: {buchholz}")
            print(f"  → Saved to {filename}")
    
    print(f"\n✅ Saved {len(population)} agent weight files to {nets_dir}/")

    # Also save CSV summary
    csv_filename = "greedy_jack_results_swiss.csv"
    with open(csv_filename, "w", newline="") as csvfile:
        csvwriter = csv.writer(csvfile)
        header = ["Rank", "AgentID", "Name", "Score", "Buchholz"]
        csvwriter.writerow(header)
        for i, agent in enumerate(population):
            buchholz = sum(opp.score for opp in agent.opponents)
            row = [i + 1, agent.id, agent.name, agent.score, buchholz]
            csvwriter.writerow(row)
    print(f"✅ Exported CSV summary to {csv_filename}")

if __name__ == "__main__":
    asyncio.run(main())
