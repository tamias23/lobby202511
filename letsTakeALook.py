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

dts = pl.read_parquet('/home/mat/Bureau/lobby202511/parquet/batch_1774272458017.parquet')
dts.columns
dts.shape

# duckdb.sql('SELECT count(*) from fifa_players').show()

# dts.drop_in_place('moves')

with pd.ExcelWriter('/home/mat/Bureau/lobby202511/parquet/batch_1774272458017.xlsx') as writer:  
    dts.sample(50).to_pandas().to_excel(writer, sheet_name='data', index = False)


