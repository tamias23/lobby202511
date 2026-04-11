#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Mar 23 10:13:04 2026

@author: mat
"""

import os
import polars as pl
import pandas as pd
import duckdb

inputFolder = '/home/mat/Bureau/lobby202511/new_main/backend/db/'

# ========================================================

"""
dts = pl.read_parquet('/home/mat/Bureau/lobby202511/parquet/swiss01.parquet')
dts.columns
dts.shape

# duckdb.sql('SELECT count(*) from fifa_players').show()

# dts.drop_in_place('moves')

with pd.ExcelWriter('/home/mat/Bureau/lobby202511/parquet/swiss01.xlsx') as writer:  
    dts.sample(50).to_pandas().to_excel(writer, sheet_name='data', index = False)
"""

# ========================================================

con = duckdb.connect(inputFolder + 'games.duckdb')
# con = duckdb.connect('gaming.duckdb', read_only=True)

tables = con.execute("SHOW TABLES").fetchall()
print(tables)

df = con.execute("SELECT * FROM games LIMIT 5").pl()
print(df)
games = con.execute("SELECT * FROM games ").pl()
games.write_parquet('/home/mat/Bureau/lobby202511/parquet/games.parquet')

# 3. To force the "Merge" (Checkpoint)
# This moves all data from the .wal to the .duckdb file immediately
con.execute("CHECKPOINT")

# 4. Close the connection
con.close()

# ========================================================

con = duckdb.connect(inputFolder + 'users.duckdb', read_only=False)

tables = con.execute("SHOW TABLES").fetchall()
print(tables)

df = con.execute("SELECT * FROM profiles LIMIT 5").pl()
print(df)
df = con.execute("SELECT * FROM users LIMIT 5").pl()
print(df)

# con.execute("""
#     UPDATE users 
#     SET username = 'u_' + username
#     WHERE username like 'guest_%'
# """)
# con.commit()

# con.execute("""
#     DELETE from users where role = 'bot'
# """)
# con.commit()

users = con.execute("SELECT * FROM users ").pl()

# 3. To force the "Merge" (Checkpoint)
# This moves all data from the .wal to the .duckdb file immediately
con.execute("CHECKPOINT")

# 4. Close the connection
con.close()

# ========================================================

con = duckdb.connect(inputFolder + 'tournaments.duckdb', read_only=False)

tables = con.execute("SHOW TABLES").fetchall()
print(tables)

df = con.execute("SELECT * FROM profiles LIMIT 5").pl()
print(df)
df = con.execute("SELECT * FROM users LIMIT 5").pl()
print(df)

tournament_games = con.execute("SELECT * FROM tournament_games ").pl()
tournaments = con.execute("SELECT * FROM tournaments ").pl()
tournament_participants = con.execute("SELECT * FROM tournament_participants ").pl()

# 3. To force the "Merge" (Checkpoint)
# This moves all data from the .wal to the .duckdb file immediately
con.execute("CHECKPOINT")

# 4. Close the connection
con.close()

# ========================================================

with pd.ExcelWriter('/home/mat/Bureau/lobby202511/users3.xlsx', engine='xlsxwriter') as writer:
    users.to_pandas().to_excel(writer, sheet_name='data', index=False, startrow=0 , startcol=0)

with pd.ExcelWriter('/home/mat/Bureau/lobby202511/tour.xlsx', engine='xlsxwriter') as writer:
    tournaments.to_pandas().to_excel(writer, sheet_name='tournaments', index=False, startrow=0 , startcol=0)
    tournament_participants.to_pandas().to_excel(writer, sheet_name='tournament_participants', index=False, startrow=0 , startcol=0)
    tournament_games.to_pandas().to_excel(writer, sheet_name='tournament_games', index=False, startrow=0 , startcol=0)

