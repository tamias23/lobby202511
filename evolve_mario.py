#!/home/mat/Bureau/spyder-env/bin/python
import os
import csv
import random
import subprocess
import json
import time
import asyncio
import glob
from pathlib import Path

# Configuration
POPULATION_SIZE = 100
NUM_PARAMS = 33
GENERATIONS = 500
ROUNDS_PER_GEN = 9
PARALLEL_MATCHES = 10
MUTATION_RATE = 0.12
MUTATION_STRENGTH = 0.25
ELITISM_COUNT = 15

# Klaus weights (known-good baseline for sparring — never mutated)
# Layout: [0..3] color, [4..11] capture, [12..19] siren, [20..21] generic, [22] dist, [23] safety
KLAUS_WEIGHTS = [
    2.0, 3.0, 5.0, 4.0,   # color features
    8.0, -2.0, 7.0, -1.0, # mage/heroe captures
    6.0, -1.0, 4.0, -1.0, # witch/siren captures
    5.0, 3.0, 4.0, 3.0,   # siren vs mage/heroe
    3.0, 2.0, 2.0, 1.0,   # siren vs witch/siren
    3.0, -3.0,             # generic capture
    4.0, 3.0,              # distance, safety
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,  # spare [24..32]
]
NUM_SPARRING_PARTNERS = 5  # Fixed Klaus agents added to each generation's pool

RUST_BIN = Path("rust/target/release/rust")
BOARDS_DIR = Path("games/data")
OUTPUT_DIR = Path("mario_evolution")

os.makedirs(OUTPUT_DIR, exist_ok=True)

class MarioIndividual:
    def __init__(self, weights=None):
        if weights is None:
            # Initialise with small positive values biased toward captures
            self.weights = [random.gauss(0, 0.5) for _ in range(NUM_PARAMS)]
            # Bias capture weights positive to start from a sensible place
            for i in [4, 6, 8, 10, 20]:  # capture weights
                self.weights[i] = abs(self.weights[i]) + 1.0
        else:
            self.weights = list(weights)
        self.score = 0
        self.games_played = 0
        self.agent_type = 'better_mario'
        self.id = "".join(random.choices("abcdefghijklmnopqrstuvwxyz", k=8))
        self.is_sparring = False  # sparring agents don't breed

    def to_csv_row(self):
        w_str = ",".join(map(str, self.weights))
        return [f"mario_{self.id}", "better_mario", w_str, "", ""]


class KlausSparringAgent:
    """Fixed Klaus agent used as a sparring partner. Never mutated or saved."""
    def __init__(self, idx):
        self.weights = list(KLAUS_WEIGHTS)
        self.score = 0
        self.games_played = 0
        self.agent_type = 'imprudent_klaus'
        self.id = f"sparring_klaus_{idx}"
        self.is_sparring = True

def save_population(population, filename):
    with open(filename, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Name", "Type", "Data", "MctsBudget", "MctsThreads"])
        for ind in population:
            writer.writerow(ind.to_csv_row())

async def run_match(sem, p1, p2, board):
    async with sem:
        # Randomize sides
        white, black = (p1, p2) if random.random() > 0.5 else (p2, p1)

        # Both may be mario OR one may be a Klaus sparring agent
        white_type = white.agent_type if hasattr(white, 'agent_type') else 'better_mario'
        black_type = black.agent_type if hasattr(black, 'agent_type') else 'better_mario'

        cmd = [
            str(RUST_BIN), str(board),
            "--batch", "1",
            "--max-turns", "200",
            "--white", white_type,
            "--black", black_type,
            "--greedy-weights-white", ",".join(map(str, white.weights)),
            "--greedy-weights-black", ",".join(map(str, black.weights)),
        ]
        
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        output = stdout.decode()
        
        winner = None
        for line in output.splitlines():
            if "BATCH_STATS" in line:
                stats = json.loads(line.split("BATCH_STATS: ")[1])
                if stats["white_wins"] > 0: winner = white
                elif stats["black_wins"] > 0: winner = black
                break
        
        return winner, p1, p2

async def evaluate_population(population, boards):
    # Reset mario scores (sparring agents reset each gen too for fairness)
    for ind in population:
        ind.score = 0

    # Add Klaus sparring partners — they participate in pairing but don't breed
    sparring = [KlausSparringAgent(i) for i in range(NUM_SPARRING_PARTNERS)]
    full_pool = population + sparring

    sem = asyncio.Semaphore(PARALLEL_MATCHES)

    for r in range(ROUNDS_PER_GEN):
        print(f"  Round {r+1}/{ROUNDS_PER_GEN}...")
        pairings = list(full_pool)
        random.shuffle(pairings)

        tasks = []
        for i in range(0, len(pairings) - 1, 2):
            board = random.choice(boards)
            tasks.append(run_match(sem, pairings[i], pairings[i+1], board))

        results = await asyncio.gather(*tasks)
        for winner, p1, p2 in results:
            if winner:
                winner.score += 3
            else:
                p1.score += 1
                p2.score += 1

def evolve(population):
    # Only breed from non-sparring mario agents
    mario_pop = [x for x in population if not x.is_sparring]
    mario_pop.sort(key=lambda x: x.score, reverse=True)

    new_population = []
    # Elitism: carry top mario agents forward
    for i in range(min(ELITISM_COUNT, len(mario_pop))):
        elite = MarioIndividual(mario_pop[i].weights)
        elite.id = mario_pop[i].id  # keep id for tracking
        new_population.append(elite)

    # Tournament selection pool: top 20% of mario agents
    pool_size = max(4, len(mario_pop) // 5)
    gene_pool = mario_pop[:pool_size]

    # Fill rest with crossover + mutation
    while len(new_population) < POPULATION_SIZE:
        parent1 = random.choice(gene_pool)
        parent2 = random.choice(gene_pool)

        # Uniform crossover
        child_weights = [
            w1 if random.random() > 0.5 else w2
            for w1, w2 in zip(parent1.weights, parent2.weights)
        ]
        # Gaussian mutation
        for i in range(NUM_PARAMS):
            if random.random() < MUTATION_RATE:
                child_weights[i] += random.gauss(0, MUTATION_STRENGTH)

        new_population.append(MarioIndividual(child_weights))

    return new_population

async def main():
    if not RUST_BIN.exists():
        print("Error: Rust binary not found. Build with 'cargo build --release'")
        return

    boards = glob.glob(str(BOARDS_DIR / "*board.json"))
    if not boards:
        print("Error: No boards found in games/data/")
        return

    print("Checking for existing agents in mario_evolution/...")
    existing_files = glob.glob(str(OUTPUT_DIR / "*.json"))
    initial_weights = []
    
    if existing_files:
        parsed_files = []
        for f in existing_files:
            try:
                with open(f, "r") as jf:
                    data = json.load(jf)
                    # Extract generation and score for sorting
                    # Filename format could be best_gen_X.json or gen_X_rank_Y.json
                    gen = data.get("gen", 0)
                    score = data.get("score", 0)
                    parsed_files.append((gen, score, data["weights"]))
            except Exception as e:
                print(f"  Warning: could not load {f}: {e}")
        
        # Sort by Gen (desc) then Score (desc)
        parsed_files.sort(key=lambda x: (x[0], x[1]), reverse=True)
        print(f"  Found {len(parsed_files)} existing agents. Loading top {min(len(parsed_files), POPULATION_SIZE)}...")
        for i in range(min(len(parsed_files), POPULATION_SIZE)):
            initial_weights.append(parsed_files[i][2])

    print(f"Initializing population of {POPULATION_SIZE} Mario agents...")
    population = []
    for w in initial_weights:
        population.append(MarioIndividual(w))
    while len(population) < POPULATION_SIZE:
        population.append(MarioIndividual())
    
    for gen in range(1, GENERATIONS + 1):
        start_time = time.time()
        print(f"\n--- Generation {gen}/{GENERATIONS} ---")
        
        await evaluate_population(population, boards)
        
        population.sort(key=lambda x: x.score, reverse=True)
        
        # Save top 10 agents
        print(f"  Saving top 10 agents...")
        for rank in range(min(10, len(population))):
            ind = population[rank]
            save_data = {
                "gen": gen,
                "rank": rank + 1,
                "score": ind.score,
                "weights": ind.weights,
                "id": ind.id
            }
            # Format: gen_1_rank_1.json
            out_path = OUTPUT_DIR / f"gen_{gen}_rank_{rank+1}.json"
            with open(out_path, "w") as f:
                json.dump(save_data, f)
        
        best = population[0]
        print(f"  Best score: {best.score} | Best weights (first 5): {best.weights[:5]}")
            
        population = evolve(population)
        
        duration = time.time() - start_time
        print(f"  Generation took {duration:.1f}s")

if __name__ == "__main__":
    asyncio.run(main())
