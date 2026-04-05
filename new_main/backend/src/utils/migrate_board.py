import json
import sys
import os

# Updated mapping based on user feedback
TYPE_MAPPING = {
    "king": "goddess",
    "mage": "heroe",
    "soldier": "soldier", # Kept as soldier per user request
    "siren": "siren",
    "bishop": "bishop",
    "ghoul": "ghoul"
}

def migrate_file(filepath):
    if not filepath.lower().endswith(".json"):
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            print(f"  [X] Error: {filepath} is not a valid JSON file.")
            return False

    if "allPieces" not in data:
        return False

    is_old = False
    new_pieces = {}
    
    for old_id, piece in data["allPieces"].items():
        old_type = piece.get("type", "")
        
        # Identification Logic
        if old_type in ["king", "mage"] or "_king_" in old_id or "_mage_" in old_id:
            is_old = True

        new_type = TYPE_MAPPING.get(old_type, old_type)
        
        # ID Transformation
        new_id = old_id.replace("_king_", "_goddess_").replace("_mage_", "_heroe_")
        
        updated_piece = piece.copy()
        updated_piece["type"] = new_type
        updated_piece["id"] = new_id
        
        new_pieces[new_id] = updated_piece

    if is_old:
        print(f"  [+] Migrating {os.path.basename(filepath)}...")
        data["allPieces"] = new_pieces
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
        print(f"Batch complete. {count} files migrated.")
    else:
        print(f"Error: {target} is not a valid file or directory.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 migrate_board.py <file_or_directory>")
    else:
        process_path(sys.argv[1])
