import json
import sys
import os

def migrate_file(filepath):
    if not filepath.lower().endswith(".json"):
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            print(f"  [X] Error: {filepath} is not a valid JSON file.")
            return False

    if "allPieces" in data:
        print(f"  [+] Stripping allPieces from {os.path.basename(filepath)}...")
        del data["allPieces"]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        return True
        
    return False

def process_path(target):
    if os.path.isfile(target):
        migrate_file(target)
    elif os.path.isdir(target):
        print(f"Processing directory: {target}")
        count = 0
        for filename in os.listdir(target):
            if migrate_file(os.path.join(target, filename)):
                count += 1
        print(f"Batch complete. {count} files were cleaned (allPieces removed).")
    else:
        print(f"Error: {target} is not a valid file or directory.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 migrate_board.py <file_or_directory>")
    else:
        process_path(sys.argv[1])
