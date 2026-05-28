import os
import polars as pl
import pandas as pd
import glob

folder = '/home/mat/Bureau/lobby202511/createTemplatesAndBoards/'
os.chdir(folder)
print('os.getcwd() :', os.getcwd())

filepathParquet = folder + 'database/database_nopurple.parquet'

pattern = folder + 'database/database_nopurple_*.parquet'
files = glob.glob(pattern)

database = pl.read_parquet(filepathParquet)

dts = []
for f in files:
	dts.append(pl.read_parquet(f))

for d in dts:
	print(d.shape[0])

res = pl.concat([database] + dts)

res.to_pandas().to_parquet(filepathParquet, compression = 'snappy')
with pd.ExcelWriter(filepathParquet.split('.')[0] + '.xlsx', engine='xlsxwriter') as writer:
	res.to_pandas().to_excel(writer, sheet_name = 'data', index = False, startrow = 0 , startcol = 0)

