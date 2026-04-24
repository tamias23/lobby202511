#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Wed Apr 22 11:28:11 2026
Updated: migrated from Firestore to PostgreSQL.

@author: mat
"""

import os
import psycopg2

# Configuration
PG_HOST = os.environ.get("PG_HOST", "localhost")
PG_PORT = int(os.environ.get("PG_PORT", 5432))
PG_DATABASE = os.environ.get("PG_DATABASE", "dedalthegame01")
PG_USER = os.environ.get("PG_USER", "tamias23")
PG_PASSWORD = os.environ.get("PG_PASSWORD", "TY-rre__U@345")

def make_user_admin(username_to_promote):
    conn = psycopg2.connect(
        host=PG_HOST, port=PG_PORT,
        dbname=PG_DATABASE, user=PG_USER, password=PG_PASSWORD
    )
    cur = conn.cursor()

    print(f"Searching for user '{username_to_promote}'...")

    cur.execute("SELECT id FROM users WHERE username = %s LIMIT 1", (username_to_promote,))
    row = cur.fetchone()

    if row:
        user_id = row[0]
        cur.execute(
            "UPDATE users SET role = 'admin', is_admin = 1 WHERE id = %s",
            # "UPDATE users SET role = 'subscriber', is_subscriber = 1 WHERE id = %s",
            (user_id,)
        )
        conn.commit()
        print(f"Success! '{username_to_promote}' (ID: {user_id}) is now an ...")
    else:
        print(f"Error: Could not find any user with the username '{username_to_promote}'.")

    cur.close()
    conn.close()

# Example usage:
make_user_admin("tamias23")
