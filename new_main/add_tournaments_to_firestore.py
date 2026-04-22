import os
import uuid
import time
import random
import math
try:
    from google.cloud import firestore
except ImportError:
    print("Error: google-cloud-firestore not found. Please install it using: pip install google-cloud-firestore")
    exit(1)

# Configuration
PROJECT_ID = "my-local-firestore"
# Default to emulator if running locally
EMULATOR_HOST = os.environ.get("FIRESTORE_EMULATOR_HOST", "localhost:8080")

# Ensure the emulator host is used
os.environ["FIRESTORE_EMULATOR_HOST"] = EMULATOR_HOST

def get_db():
    try:
        return firestore.Client(project=PROJECT_ID)
    except Exception as e:
        print(f"Error connecting to Firestore: {e}")
        exit(1)

FORMATS = ['swiss', 'arena', 'knockout', 'round_robin']

def generate_funny_name():
    adjectives = ['Majestic', 'Cursed', 'Eternal', 'Rapid', 'Sly', 'Golden', 'Shadow', 'Arcane', 'Furious', 'Elite', 'Radiant', 'Abyssal', 'Cosmic', 'Stealthy']
    nouns = ['Minotaur', 'Triskelion', 'Polygon', 'Labyrinth', 'Goddess', 'Warrior', 'Sage', 'Relic', 'Citadel', 'Oracle', 'Monolith', 'Phantasm', 'Nexus', 'Zenith']
    suffixes = ['Clash', 'Open', 'Championship', 'War', 'Trials', 'Invitational', 'Showdown', 'Masters', 'League', 'Saga', 'Gauntlet', 'Ascension', 'Frenzy', 'Duels']
    return f"{random.choice(adjectives)} {random.choice(nouns)} {random.choice(suffixes)}"

def create_daily_tournaments():
    db = get_db()
    now_ms = int(time.time() * 1000)
    
    print(f"Connecting to Firestore at {EMULATOR_HOST} (Project: {PROJECT_ID})")
    
    for fmt in FORMATS:
        t_id = str(uuid.uuid4())[:12]
        funny_name = generate_funny_name()
        name = f"Daily {fmt.replace('_', ' ').title()} - {funny_name}"
        
        max_p = 20 if fmt == 'round_robin' else 100
        
        # Duration: rounds for swiss/rr/ko, minutes for arena
        if fmt == 'arena':
            duration_value = 30
        elif fmt == 'knockout':
            duration_value = int(math.ceil(math.log2(max_p)))
        else:
            duration_value = min(max_p - 1, 10)

        tournament = {
            'id': t_id,
            'creator_id': 'system',
            'creator_username': 'System',
            'status': 'open',
            'format': fmt,
            'password_hash': None,
            'has_password': 0,
            'max_participants': max_p,
            'current_count': 0,
            'time_control_minutes': 10,
            'time_control_increment': 5,
            'board_id': None,
            'rating_min': 0,
            'rating_max': 5000,
            'duration_value': duration_value,
            'invited_bots': 10,
            'creator_plays': 0,
            'launch_mode': 'both',
            'launch_at': now_ms + (2 * 60 * 60 * 1000), # 2 hours from now
            'created_at': now_ms,
            'started_at': None,
            'completed_at': None,
            'remove_at': now_ms + (6 * 60 * 60 * 1000), # 6 hours from now
            'current_round': 0,
            'name': name,
        }
        
        try:
            db.collection('tournaments').document(t_id).set(tournament)
            print(f" Successfully created {fmt} tournament: {name} ({t_id})")
        except Exception as e:
            print(f" Failed to create {fmt} tournament: {e}")

if __name__ == "__main__":
    create_daily_tournaments()
