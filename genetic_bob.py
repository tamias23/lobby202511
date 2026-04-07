import argparse
import asyncio
import csv
import json
import random
import re
import subprocess
import string
import sys
import time
from pathlib import Path

# Parse CLI arguments
parser = argparse.ArgumentParser(description="Greedy Bob Genetic Algorithm Evolution")
parser.add_argument("--duration", type=int, default=3600, help="Duration to run the evolution in seconds (default: 3600)")
parser.add_argument("--rounds", type=int, default=20, help="Number of rounds per generation before culling (default: 20)")
parser.add_argument("--agents", type=int, default=100, help="Total population size of agents (default: 100)")
parser.add_argument("--parallel", type=int, default=5, help="Number of parallel matches to run (default: 5)")
parser.add_argument("--board", type=str, default=None, help="Path to the board JSON. If not set, a random board is chosen per generation.")
parser.add_argument("--max_turns", type=int, default=200, help="Maximum turns per game")
args = parser.parse_args()

RUST_BIN = Path("rust/target/release/rust")

if not RUST_BIN.exists():
    print(f"Error: {RUST_BIN} not found! Please compile with 'cd rust && cargo build --release'")
    sys.exit(1)

def generate_random_weights():
    # 26 parameters initialized dynamically with random bounds 
    return [round(random.uniform(-20.0, 20.0), 3) for _ in range(26)]

def derive_agent_weights(base_weights):
    new_weights = list(base_weights)
    num_mutations = random.randint(2, 5)
    indices_to_mutate = random.sample(range(26), num_mutations)
    for idx in indices_to_mutate:
        new_weights[idx] = round(random.uniform(-20.0, 20.0), 3)
    return new_weights

def weights_to_str(weights):
    return ",".join(map(str, weights))

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

async def run_match(sem, agent1, agent2, board_path):
    async with sem:
        # Determine who plays white randomly to avoid color bias metrics shifting evaluating accuracy uniformly
        white, black = (agent1, agent2) if random.random() > 0.5 else (agent2, agent1)
        
        cmd = [
            str(RUST_BIN),
            board_path,
            "--batch", "1",
            "--max-turns", str(args.max_turns),
            "--white", "greedy_bob",
            "--black", "greedy_bob",
            "--greedy-weights-white", weights_to_str(white.weights),
            "--greedy-weights-black", weights_to_str(black.weights)
        ]
        
        # Run subprocess asynchronously
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        output = stdout.decode('utf-8')
        
        stats = None
        for line in output.splitlines():
            if "BATCH_STATS: " in line:
                try:
                    stats = json.loads(line.split("BATCH_STATS: ", 1)[1])
                    break
                except:
                    pass
        
        if stats:
            w_win = stats.get("white_wins", 0)
            b_win = stats.get("black_wins", 0)
            draws = stats.get("draws", 0)
            
            # Distribute standard competitive scoring format points dynamically
            if w_win > 0:
                white.score += 3
            elif b_win > 0:
                black.score += 3
            elif draws > 0:
                white.score += 1
                black.score += 1
        else:
            print(f"Failed to parse match output for Agents: {white.id} vs {black.id}")
            print(f"RAW OUTPUT:\n{output}")

async def run_generation(agents, sem, start_time, board_path):
    # Wipe scores completely mapping across generations freshly
    for a in agents:
        a.score = 0
        
    matches_played = 0
    for r in range(args.rounds):
        # Shuffle agents for random pairing combinations securely traversing local minimas
        pool = list(agents)
        random.shuffle(pool)
        
        # Deploy parallel pair combinations sequentially limited by max throughput boundaries natively mapped inside asyncio bounds
        tasks = []
        for i in range(0, len(pool), 2):
            if i + 1 < len(pool):
                tasks.append(run_match(sem, pool[i], pool[i+1], board_path))
                matches_played += 1
                
        # Async execution block targeting completion wait limits globally across iteration bounds mapping loop rounds directly
        await asyncio.gather(*tasks)
        
        elapsed_gen = time.time() - start_time
        remaining_gen = max(0, args.duration - elapsed_gen)
        print(f"  Round {r+1:02d}/{args.rounds} completed | Time Remaining: {remaining_gen/60:.1f} minutes")
        
    return matches_played

async def main():
    print(f"Initializing {args.agents} random Greedy Bob agents...")
    population = [Agent(i+1, generation_num=1) for i in range(args.agents)]
    sem = asyncio.Semaphore(args.parallel)
    
    start_time = time.time()
    generation = 1
    total_matches = 0
    
    import glob
    board_files = glob.glob("games/data/*board.json")

    while True:
        print(f"\n--- Starting Generation {generation} ---")
        
        current_board = args.board
        if current_board is None:
            if not board_files:
                print("Error: No board files found in games/data/!")
                sys.exit(1)
            current_board = random.choice(board_files)
            print(f"Selected random board for this generation: {current_board}")
            
        matches_this_gen = await run_generation(population, sem, start_time, current_board)
        total_matches += matches_this_gen
        
        # Sort population array bounds mathematically shifting score counts dynamically sequentially
        population.sort(key=lambda a: a.score, reverse=True)
        
        print("\nTop 5 Agents this Generation:")
        for i in range(5):
            print(f"  Rank {i+1}: Agent {population[i].id} '{population[i].name}' | Score: {population[i].score}")
            print(f"  Weights: {weights_to_str(population[i].weights)}")
            
        elapsed = time.time() - start_time
        remaining = max(0, args.duration - elapsed)
        
        # Calculate statistics
        cutoff = args.agents // 2
        top_half = population[:cutoff]
        nonzero_scores = [a.score for a in top_half if a.score > 0]
        avg_score = sum(nonzero_scores) / len(nonzero_scores) if nonzero_scores else 0
        
        print("\n=== Generation Statistics ===")
        print(f"Total Matches Played So Far: {total_matches}")
        print(f"Average Top {cutoff} Score: {avg_score:.2f} Pts")
        print(f"Time Elapsed: {elapsed:.2f}s | Time Remaining: {remaining:.2f}s")
        print("=============================")
        
        if elapsed >= args.duration:
            print("\nTime allocated has expired. Ending evolution.")
            break
        
        # Isolate exactly half bounds executing hard culling cuts securely wiping non-competitive branches immediately
        survivors = population[:cutoff]
        removed = population[cutoff:]
        
        # Determine amount of derived agents (half of replaced agents, rounded up)
        num_derived = (len(removed) + 1) // 2
        top_performers = survivors[:5]
        
        # Generate random array iterations sequentially mapping dead identifiers exactly per the user's constraints
        new_agents = []
        for i, dead_agent in enumerate(removed):
            if i < num_derived and top_performers:
                base_agent = random.choice(top_performers)
                derived_weights = derive_agent_weights(base_agent.weights)
                new_agents.append(Agent(dead_agent.id, weights=derived_weights, generation_num=generation + 1))
            else:
                new_agents.append(Agent(dead_agent.id, generation_num=generation + 1))
            
        population = survivors + new_agents
        generation += 1
        
    print("\n==================================")
    print("=== EVOLUTION SEARCH COMPLETE ===")
    print("==================================")
    
    elapsed = time.time() - start_time
    print(f"\nExecution Summary:")
    print(f"  Total Time Run: {elapsed:.2f} seconds")
    print(f"  Total Generations: {generation}")
    print(f"  Total Matches Played: {total_matches}")
    print(f"  Total Agent Evaluators Processed: {generation * args.agents}")
    print(f"  Match Processing Speed: {total_matches / elapsed:.2f} matches/sec")
    
    # Secure maximum bounds extraction natively globally ensuring the master combination iteration survives!
    population.sort(key=lambda a: a.score, reverse=True)
    
    print("\n--- FINAL AGENT CONFIGURATIONS ---")
    
    csv_filename = "greedy_bob_results.csv"
    with open(csv_filename, 'w', newline='') as csvfile:
        csvwriter = csv.writer(csvfile)
        
        # Write CSV Header natively matching 26 parameter blocks
        header = ["Rank", "AgentID", "Name", "Score"] + [f"Weight_{i}" for i in range(26)]
        csvwriter.writerow(header)
        
        for i in range(len(population)):
            agent = population[i]
            print(f"Rank {i+1} [Agent {agent.id} '{agent.name}'] - Score: {agent.score}")
            print(f"Weights: {weights_to_str(agent.weights)}\n")
            
            # Write row to CSV natively explicitly matching float bindings
            row = [i+1, agent.id, agent.name, agent.score] + agent.weights
            csvwriter.writerow(row)
            
    print(f"✅ Successfully exported all {len(population)} genetic configurations to {csv_filename}!")

if __name__ == "__main__":
    asyncio.run(main())
