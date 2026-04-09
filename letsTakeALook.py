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

inputFolder = '/home/mat/Bureau/lobby202511/new_main/backend/db/'

# ========================================================

con = duckdb.connect(inputFolder + 'games.duckdb')
# con = duckdb.connect('gaming.duckdb', read_only=True)

tables = con.execute("SHOW TABLES").fetchall()
print(tables)

df = con.execute("SELECT * FROM games LIMIT 5").pl()
print(df)

# 3. To force the "Merge" (Checkpoint)
# This moves all data from the .wal to the .duckdb file immediately
con.execute("CHECKPOINT")

# 4. Close the connection
con.close()

# ========================================================

con = duckdb.connect(inputFolder + 'users.duckdb')

tables = con.execute("SHOW TABLES").fetchall()
print(tables)

df = con.execute("SELECT * FROM profiles LIMIT 5").pl()
print(df)
df = con.execute("SELECT * FROM users LIMIT 5").pl()
print(df)

users = con.execute("SELECT * FROM users ").pl()

# 3. To force the "Merge" (Checkpoint)
# This moves all data from the .wal to the .duckdb file immediately
con.execute("CHECKPOINT")

# 4. Close the connection
con.close()

# ========================================================

with pd.ExcelWriter('/home/mat/Bureau/lobby202511/users.xlsx', engine='xlsxwriter') as writer:
    users.to_pandas().to_excel(writer, sheet_name='data', index=False, startrow=0 , startcol=0)
