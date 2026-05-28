#!/home/mat/Bureau/spyder-env/bin/python
# -*- coding: utf-8 -*-
"""
Created on Thu Apr 11 20:18:49 2024

@author: mat
"""

import os
import polars as pl
import pandas as pd
import glob

folder = '/home/mat/Bureau/lobby202511/createTemplatesAndBoards/'
os.chdir(folder)
print('os.getcwd() :', os.getcwd())

filepathParquet = folder + 'database/database_nopurple.parquet'
folderpathTemplate = folder + 'newTemplates/'
folderpathSvg = folder + 'randomBoards/'

# ===============================================================================================

# pattern = folder + 'newTemplates/*.json'
pattern = folder + 'newTemplates/*.svg'
files = glob.glob(pattern)
allNames = [f.split('/')[-1].split('.')[0] for f in glob.glob(pattern) if int(f.split('/')[-1].split('.')[0].split('_')[-1]) > 979]

database = pl.read_parquet(filepathParquet)

toBeDeleted = [x for x in database['template'].unique().to_list() if x not in allNames]
print('len(toBeDeleted) =', len(toBeDeleted))

for e in toBeDeleted:
    try:
        os.remove(folderpathTemplate + e + '.json')
    except:
        print('error', e)

print('database.shape =', database.shape)
database = database.filter(pl.col('template').is_in(allNames))
print('database.shape =', database.shape)

# ===============================================================================================

database.to_pandas().to_parquet(filepathParquet, compression = 'snappy')
with pd.ExcelWriter(filepathParquet.split('.')[0] + '.xlsx', engine='xlsxwriter') as writer:
    database.to_pandas().to_excel(writer, sheet_name = 'data', index = False, startrow = 0 , startcol = 0)

# ===============================================================================================

pattern = folder + 'newTemplates/*.json'
files = glob.glob(pattern)
allNamesJson = [f.split('/')[-1].split('.')[0] for f in glob.glob(pattern)]

toBeDeleted = [x for x in allNamesJson if x not in allNames]
print('len(toBeDeleted) =', len(toBeDeleted))

for e in toBeDeleted:
    os.remove(folderpathTemplate + e + '.json')

# ===============================================================================================

