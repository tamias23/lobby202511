#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
extract_from_valkey.py
======================
Extracts Valkey runtime data (currently: IP-based bot-game rate-limit counters)
into Excel and Parquet files, mirroring the style of extract_from_PSQL.py.

Usage:
    python extract_from_valkey.py

Environment variables (all optional, with defaults matching docker-compose):
    VALKEY_HOST      default: localhost
    VALKEY_PORT      default: 6379
    VALKEY_PASSWORD  default: (empty)

Output directory: /home/mat/Bureau/lobby202511/parquet/temp/

@author: mat
"""

import os
import datetime
import pandas as pd
import redis  # pip install redis

# ── Configuration ─────────────────────────────────────────────────────────────

VALKEY_HOST     = os.environ.get("VALKEY_HOST",     "localhost")
VALKEY_PORT     = int(os.environ.get("VALKEY_PORT", "6379"))
VALKEY_PASSWORD = os.environ.get("VALKEY_PASSWORD", None) or None

OUT_DIR = '/home/mat/Bureau/lobby202511/parquet/temp'
os.makedirs(OUT_DIR, exist_ok=True)
os.chdir(OUT_DIR)

# ── Key namespaces to extract ─────────────────────────────────────────────────

# Each entry: (label, key_pattern, parse_fn)
# parse_fn(key, value, ttl) -> dict of columns

BOT_IP_PREFIX = 'nd6:bot_ip:'


def parse_bot_ip(key: str, value: bytes | None, ttl: int) -> dict:
    ip = key[len(BOT_IP_PREFIX):]
    count = int(value or 0)
    expires_at = None
    if ttl > 0:
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=ttl)
    return {
        'ip':         ip,
        'count_24h':  count,
        'ttl_s':      ttl,
        'expires_at': expires_at,
        'extracted_at': datetime.datetime.utcnow(),
    }


DATASETS = [
    {
        'name':    'bot_ip_limits',
        'pattern': f'{BOT_IP_PREFIX}*',
        'parse':   parse_bot_ip,
    },
    # Add future nd6:* key families here
]


# ── Core extraction ───────────────────────────────────────────────────────────

def extract_all():
    r = redis.Redis(
        host=VALKEY_HOST,
        port=VALKEY_PORT,
        password=VALKEY_PASSWORD,
        decode_responses=False,   # raw bytes, we decode manually
    )

    # Quick connectivity check
    try:
        r.ping()
    except redis.exceptions.ConnectionError as e:
        print(f"ERROR: Cannot connect to Valkey at {VALKEY_HOST}:{VALKEY_PORT} — {e}")
        return

    print(f"Connected to Valkey at {VALKEY_HOST}:{VALKEY_PORT}")

    for dataset in DATASETS:
        name    = dataset['name']
        pattern = dataset['pattern']
        parse   = dataset['parse']

        print(f"\nScanning pattern: {pattern} …")

        rows = []
        cursor = 0
        while True:
            cursor, keys = r.scan(cursor=cursor, match=pattern, count=200)
            for key in keys:
                key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                value   = r.get(key)
                ttl     = r.ttl(key)
                rows.append(parse(key_str, value, ttl))
            if cursor == 0:
                break

        if not rows:
            print(f"  — No keys found for pattern '{pattern}'. Skipping.")
            continue

        df = pd.DataFrame(rows)

        # Serialize any remaining complex types
        for col in df.columns:
            if df[col].apply(lambda x: isinstance(x, (dict, list))).any():
                import json
                df[col] = df[col].apply(lambda x: json.dumps(x) if isinstance(x, (dict, list)) else x)

        filename = name
        try:
            df.to_parquet(filename + '.parquet', engine='pyarrow', index=False)
            with pd.ExcelWriter(filename + '.xlsx', engine='xlsxwriter') as writer:
                df.to_excel(writer, sheet_name='data', index=False, startrow=0, startcol=0)
            print(f"  ✓ {len(rows)} row(s) → {filename}.parquet + {filename}.xlsx")
        except Exception as e:
            print(f"  ✗ Failed to write {filename}: {e}")

    r.close()
    print("\nDone.")


if __name__ == '__main__':
    extract_all()
