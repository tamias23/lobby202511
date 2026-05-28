#!/home/mat/Bureau/spyder-env/bin/python
# -*- coding: utf-8 -*-
"""
Created on Wed Aug 23 16:27:49 2023

@author: mat
"""

import os
import random as ran
import polars as pl

folder = '/home/mat/Bureau/lobby202511/createTemplatesAndBoards/'
os.chdir(folder)
print('os.getcwd() :', os.getcwd())

# from utilsPoly_202405 import printSvgFromDatabase, printPdfFromDatabase, getHashesFromDatabase, getHashesFromDatabase2, printAllPdfFromDatabase, printJsonFromDatabase, printAllSvgFromDatabase, removeHashFromDatabase, cleanDatabase
from utilsPoly_202403 import printSvgFromDatabase, printPdfFromDatabase, getHashesFromDatabase, getHashesFromDatabase2, printAllPdfFromDatabase, printJsonFromDatabase, printAllSvgFromDatabase, removeHashFromDatabase, cleanDatabase


filepathParquet = folder + 'database/database_nopurple.parquet'
hash_id = 'e198bbbcec5bb294d5852da565fd42d7'
# folderpathTemplate = folder + 'allTemplates/'
folderpathTemplate = folder + 'newTemplates/'
folderpathSvg = folder + 'randomBoards/'

# ===============================================================================================

database = pl.read_parquet(filepathParquet)

hashes = getHashesFromDatabase(filepathParquet)
# hashes = getHashesFromDatabase2(filepathParquet, '2024-03-15 09:00:00')

tc = []
count_tc = {}
lll = list(hashes.keys())
ran.shuffle(lll)

for h in lll: # hashes:
    if 'orange' in hashes[h]:
        # max connected shape is 4 : no 5 shape
        if max([max(hashes[h][x].keys()) for x in  ['green', 'grey', 'blue', 'orange']]) > 3:
            print('passing...')
            pass
        # min connected shape is 2 : no singleton
        # elif min([min(hashes[h][x].keys()) for x in  ['green', 'grey', 'blue', 'orange']]) < 2:
            # pass
        # if there is shapes size 2 : no more than 2 per color
        # elif max([0] + [hashes[h][x][2] for x in  ['green', 'grey', 'blue', 'orange'] if 2 in hashes[h][x].keys()]) > 2:
            # pass
        # if there is shapes size 4 : no more than 2 per color
        # elif max([0] + [hashes[h][x][4] for x in  ['green', 'grey', 'blue', 'orange'] if 4 in hashes[h][x].keys()]) > 2:
            # pass
        else:
            print(h)
            if ran.random() > 0.0:
                if int(database.filter(pl.col('hash_id') == h)['template'][0].split('_')[-1]) > 904:
                    template = database.filter(pl.col('hash_id') == h)['template'][0]
                    if template in count_tc:
                        count_tc[template] = count_tc[template] + 1 
                        if count_tc[template] <= 0:
                            tc.append(database.filter(pl.col('hash_id') == h)['template'][0])
                            print(h, hashes[h])
                            printJsonFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)
                            # printSvgFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)
                            printPdfFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)
                    else:
                        count_tc[template] = 1
                        tc.append(database.filter(pl.col('hash_id') == h)['template'][0])
                        print(h, hashes[h])
                        printJsonFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)
                        # printSvgFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)
                        printPdfFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)

"""
h = '5e6bcb24cb4937a9767c35dfc9dc9952'
h = '69e3bcedf15e5224be386035c1e0863f'
printJsonFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)
printPdfFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)
removeHashFromDatabase(filepathParquet, '69e3bcedf15e5224be386035c1e0863f')


printPdfFromDatabase(filepathParquet, '2a383bfba80650bae47e6b1b25236a2d', folderpathTemplate, folderpathSvg)

printJsonFromDatabase(filepathParquet, '82623e3c4d3db1ff623569e72693bab0', folderpathTemplate, folderpathSvg)
printPdfFromDatabase(filepathParquet, '82623e3c4d3db1ff623569e72693bab0', folderpathTemplate, folderpathSvg)

"""

"""
selectHashes = []

for h in hashes:
    if 'orange' in hashes[h]:
        if any([(2 in hashes[h][x]) for x in  ['green', 'grey', 'blue', 'orange']]):
            pass
        else:
            if 4 in hashes[h]['orange'] and hashes[h]['orange'][4] > 1:
                pass
            elif max([max(hashes[h][x].keys()) for x in  ['green', 'grey', 'blue', 'orange']]) <= 4:
                # print(h, hashes[h]['orange'])
                print(h, [max(hashes[h][x].keys()) for x in  ['green', 'grey', 'blue', 'orange']], hashes[h])
                selectHashes.append(h)
                
for h in selectHashes:
    print(h)
    printJsonFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)
    printSvgFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)
    # printPdfFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)
"""
    
"""
h = '074f64fc4fb816268be70ed5e4b6df23'
h = '7e246c745301397ee4d7a0b538b41410'
h = '4dfd72611e8cf6fed6eaf55bbce5995b'
hashes[h]['orange']
max(hashes[h]['orange'].keys())
hashes[h]

[hashes[h][x].keys() for x in  ['green', 'grey', 'blue', 'orange']]
[hashes[h][x][2] for x in  ['green', 'grey', 'blue', 'orange'] if 2 in hashes[h][x].keys()]

max([0] + [hashes[h][x][4] for x in  ['green', 'grey', 'blue', 'orange'] if 4 in hashes[h][x].keys()])
"""
