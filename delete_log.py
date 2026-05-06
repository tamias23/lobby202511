#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sat Apr 18 10:46:01 2026
Updated: migrated from Firestore to PostgreSQL.

@author: mat
"""

import json
import os
import pandas as pd
import psycopg2

# Configuration
PG_HOST = os.environ.get("PG_HOST", "localhost")
PG_PORT = int(os.environ.get("PG_PORT", 5432))
PG_DATABASE = os.environ.get("PG_DATABASE", "dedalthegame01")
PG_USER = os.environ.get("PG_USER", "tamias23")
PG_PASSWORD = os.environ.get("PG_PASSWORD", "TY-rre__U@345")

TABLES = ['users', 'profiles', 'games', 'tournaments', 'tournament_participants',
          'cron_jobs', 'jobs', 'subscriptions', 'leaderboards']

conn = psycopg2.connect(
    host=PG_HOST, port=PG_PORT,
    dbname=PG_DATABASE, user=PG_USER, password=PG_PASSWORD
    )
cur = conn.cursor()

print(f"Connected to PostgreSQL at {PG_HOST}:{PG_PORT}/{PG_DATABASE}")

for table in TABLES:
    print(f"Exporting table: {table}...")
    try:
        cur.execute(f"SELECT count(*) FROM {table}")
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
    except Exception as e:
        print(f" - Failed to read table {table}: {e}")
        conn.rollback()
        continue

    if not rows:
        print(f" - Table {table} is empty. Skipping.")
        continue

    df = pd.DataFrame(rows, columns=columns)
    print(df)

try:
    cur.execute(f"delete from jobs")
    # cur.execute(f"delete from tournaments")
    conn.commit()
except Exception as e:
    print(f" - Failed to read table {table}: {e}")
    conn.rollback()

cur.close()
conn.close()
