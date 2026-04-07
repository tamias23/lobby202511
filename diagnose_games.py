import subprocess
import time
import sys
import os
from pathlib import Path

# Paths
RUST_BIN = Path("rust/target/release/rust")
BOARD_PATH = "games/data/board.json"
MODEL_PATH = "rust/model.onnx"
RESULTS_FILE = "diagnostic_results.txt"

def run_game(game_idx):
    # We use --batch 1 to run a single game per process.
    # This identifies if the hang is internal to a single game development.
    cmd = [
        str(RUST_BIN),
        BOARD_PATH,
        "--batch", "1",
        "--max-turns", "300",
        "--white", "mcts",
        "--black", "mcts",
        "--mcts-budget", "30",
        "--white-model-path", MODEL_PATH,
        "--black-model-path", MODEL_PATH,
        "--verbose", "3",
        "--mcts-no-record" # First test: internal engine stability without I/O bloat
    ]
    
    start_time = time.time()
    try:
        print(f"[Game {game_idx:03}] Starting...")
        # Use Popen to stream stdout in real-time
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
        
        # Monitor the process with a 30s timeout
        while True:
            elapsed = time.time() - start_time
            if elapsed > 30:
                process.terminate()
                print(f" !!! HANGED (> 30s). Terminating.")
                with open(RESULTS_FILE, "a") as f:
                    f.write(f"Game {game_idx}: HANGED after 30s. TERMINATING SCRIPT.\n")
                return None, 30
            
            # Try to read a line from stdout
            line = process.stdout.readline()
            if line:
                print(f"  [Rust] {line.strip()}")
            
            # Check if process has finished
            retcode = process.poll()
            if retcode is not None:
                duration = time.time() - start_time
                if retcode != 0:
                    stderr = process.stderr.read()
                    print(f" FAILED (Exit Code {retcode})")
                    print(stderr)
                    with open(RESULTS_FILE, "a") as f:
                        f.write(f"Game {game_idx}: FAILED in {duration:.2f}s. Stderr: {stderr[-200:]}\n")
                    return False, duration
                
                print(f" Finished in {duration:.2f}s")
                with open(RESULTS_FILE, "a") as f:
                    f.write(f"Game {game_idx}: SUCCESS in {duration:.2f}s\n")
                return True, duration
            
            time.sleep(0.1)
        
    except subprocess.TimeoutExpired:
        print(f" !!! HANGED (> 30s). Terminating.")
        with open(RESULTS_FILE, "a") as f:
            f.write(f"Game {game_idx}: HANGED after 30s. TERMINATING SCRIPT.\n")
        return None, 30

def main():
    print(f"--- Diagnostic Stress Test: 100 games vs self ---")
    print(f"Model: {MODEL_PATH}")
    print(f"Timeout: 30s per game")
    print(f"Log: {RESULTS_FILE}")
    
    if os.path.exists(RESULTS_FILE):
        os.remove(RESULTS_FILE)
        
    total_time = 0
    start_all = time.time()
    
    for i in range(1, 101):
        success, duration = run_game(i)
        
        if success is None:
            # Timed out!
            print(f" Game {i:03} TIMED OUT. Moving to next...")
            total_time += 30 # Assume 30s for the failed game
            continue
            
        if not success:
            print(f" Game {i:03} CRASHED. Moving to next...")
            total_time += duration
            continue
            
        total_time += duration
        
    total_duration = time.time() - start_all
    print(f"\n--- Test Completed ---")
    print(f"Finished 100 games in {total_duration/60:.2f} minutes.")
    print(f"Total time summed: {total_time:.2f}s")
    print(f"Average time per game: {total_time/100:.2f}s")

if __name__ == "__main__":
    main()
