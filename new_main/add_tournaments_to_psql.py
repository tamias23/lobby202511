import uuid
import time
import random
import math

try:
    import psycopg2
except ImportError:
    print("Error: psycopg2 not found. Please install it using: pip install psycopg2-binary")
    exit(1)

# Configuration
PG_HOST = "localhost"
PG_PORT = 5432
PG_DATABASE = "dedalthegame01"
PG_USER = "tamias23"
PG_PASSWORD = "TY-rre__U@345"

FORMATS = ['swiss', 'arena', 'knockout', 'round_robin']

def generate_funny_name():
    adjectives = ['Majestic', 'Cursed', 'Eternal', 'Rapid', 'Sly', 'Golden', 'Shadow', 'Arcane', 'Furious', 'Elite', 'Radiant', 'Abyssal', 'Cosmic', 'Stealthy']
    nouns = ['Minotaur', 'Triskelion', 'Polygon', 'Labyrinth', 'Goddess', 'Warrior', 'Sage', 'Relic', 'Citadel', 'Oracle', 'Monolith', 'Phantasm', 'Nexus', 'Zenith']
    suffixes = ['Clash', 'Open', 'Championship', 'War', 'Trials', 'Invitational', 'Showdown', 'Masters', 'League', 'Saga', 'Gauntlet', 'Ascension', 'Frenzy', 'Duels']
    return f"{random.choice(adjectives)} {random.choice(nouns)} {random.choice(suffixes)}"

def create_daily_tournaments():
    try:
        conn = psycopg2.connect(
            host=PG_HOST, port=PG_PORT,
            dbname=PG_DATABASE, user=PG_USER, password=PG_PASSWORD
        )
    except Exception as e:
        print(f"Error connecting to PostgreSQL: {e}")
        exit(1)

    cur = conn.cursor()
    now_ms = int(time.time() * 1000)

    print(f"Connected to PostgreSQL at {PG_HOST}:{PG_PORT}/{PG_DATABASE}")

    for fmt in FORMATS:
        t_id = str(uuid.uuid4())[:12]
        funny_name = generate_funny_name()
        name = f"Daily {fmt.replace('_', ' ').title()} - {funny_name}"

        max_p = 20 if fmt == 'round_robin' else 100

        if fmt == 'arena':
            duration_value = 30
        elif fmt == 'knockout':
            duration_value = int(math.ceil(math.log2(max_p)))
        else:
            duration_value = min(max_p - 1, 10)

        try:
            cur.execute("""
                INSERT INTO tournaments (
                    id, name, creator_id, creator_username, status, format,
                    has_password, max_participants, current_count,
                    time_control_minutes, time_control_increment,
                    rating_min, rating_max, duration_value, invited_bots,
                    creator_plays, launch_mode, launch_at, created_at, current_round
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                t_id, name, 'system', 'System', 'open', fmt,
                0, max_p, 0,
                10, 5,
                0, 5000, duration_value, 10,
                0, 'both',
                now_ms + (2 * 60 * 60 * 1000),  # 2 hours from now
                now_ms, 0,
            ))
            conn.commit()
            print(f"  Successfully created {fmt} tournament: {name} ({t_id})")
        except Exception as e:
            conn.rollback()
            print(f"  Failed to create {fmt} tournament: {e}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    create_daily_tournaments()
