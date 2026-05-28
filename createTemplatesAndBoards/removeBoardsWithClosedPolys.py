#!/home/mat/Bureau/spyder-env/bin/python
# -*- coding: utf-8 -*-
"""
Created on Mon Jan 27 09:36:10 2025

@author: mat
"""

"""
this program has to be launched several tims to remove all closed poly
at each run, one poly and its symetry will be opened
"""

import os
import random as ran
import polars as pl
import pandas as pd

folder = '/home/mat/Bureau/lobby202511/createTemplatesAndBoards/'
os.chdir(folder)
print('os.getcwd() :', os.getcwd())

# from utilsPoly_202405 import printSvgFromDatabase, printPdfFromDatabase, getHashesFromDatabase, getHashesFromDatabase2, printAllPdfFromDatabase, printJsonFromDatabase, printAllSvgFromDatabase, removeHashFromDatabase, cleanDatabase
from utilsPoly_202403 import OneDatabaseItem, ast, readTemplate, setPolygonsFromRLE, getSymmetryPolygons, getSymmetryEdges, addEntryToDatabase, printSvgFromDatabase, printPdfFromDatabase, getHashesFromDatabase, getHashesFromDatabase2, printAllPdfFromDatabase, printJsonFromDatabase, printAllSvgFromDatabase, removeHashFromDatabase, cleanDatabase


filepathParquet = folder + 'database/database_nopurple.parquet'
# hash_id = 'e198bbbcec5bb294d5852da565fd42d7'
# folderpathTemplate = folder + 'allTemplates/'
folderpathTemplate = folder + 'newTemplates/'
folderpathSvg = folder + 'randomBoards/'

# ===============================================================================================

database = pl.read_parquet(filepathParquet)
print('A database.shape =', database.shape)

"""
hashes = getHashesFromDatabase(filepathParquet)
# hashes = getHashesFromDatabase2(filepathParquet, '2024-03-15 09:00:00')

tc = []
count_tc = {}
lll = list(hashes.keys())
ran.shuffle(lll)
"""
# h = '160400b20ce1febc36152cace7f034bf'
"""
for myRow in database.rows():
    odi = OneDatabaseItem(myRow[database.columns.index('timestamp')], myRow[database.columns.index('hash_id')], myRow[database.columns.index('template')], myRow[database.columns.index('rle')], myRow[database.columns.index('b64')], myRow[database.columns.index('p')], myRow[database.columns.index('e')], myRow[database.columns.index('y')], myRow[database.columns.index('b')], myRow[database.columns.index('g')], myRow[database.columns.index('o')], myRow[database.columns.index('k')], myRow[database.columns.index('r')], ast.literal_eval(myRow[database.columns.index('stats')]))
    
    # if odi.hash_id == h:
    params, allPolygons, allEdges = readTemplate(folderpathTemplate + '/' + odi.template + '.json')
    allPolygons, allEdges = setPolygonsFromRLE(odi.rle, allPolygons, allEdges)
    
    for p in allPolygons:
        for e in allPolygons[p].neighbours:
            if allEdges[str(min([p, e])) + '_' + str(max([p, e]))].color != 'red':
                allPolygons[p].neighbors.append(e)
        # int(p, len(allPolygons[p].neighbors), len(allPolygons[p].neighbours))
        if len(allPolygons[p].neighbors) == 0:
            print(odi.hash_id)
            printPdfFromDatabase(filepathParquet, odi.hash_id, folderpathTemplate, folderpathSvg)
"""

hashesToRemove = []
for myRow in database.rows():
    odi = OneDatabaseItem(myRow[database.columns.index('timestamp')], myRow[database.columns.index('hash_id')], myRow[database.columns.index('template')], myRow[database.columns.index('rle')], myRow[database.columns.index('b64')], myRow[database.columns.index('p')], myRow[database.columns.index('e')], myRow[database.columns.index('y')], myRow[database.columns.index('b')], myRow[database.columns.index('g')], myRow[database.columns.index('o')], myRow[database.columns.index('k')], myRow[database.columns.index('r')], ast.literal_eval(myRow[database.columns.index('stats')]))
    
    params, allPolygons, allEdges = readTemplate(folderpathTemplate + '/' + odi.template + '.json')
    allPolygons, allEdges = setPolygonsFromRLE(odi.rle, allPolygons, allEdges)
    symmDictPoly = getSymmetryPolygons(allPolygons, params) 
    symmDictEdge = getSymmetryEdges(allEdges, params)
    
    print('=>', myRow[database.columns.index('hash_id')], myRow[database.columns.index('template')])

    hasClosedPoly = False
    listOfPolys = []
    for p in allPolygons:
        allPolygons[p].neighbors = []
        for e in allPolygons[p].neighbours:
            if allEdges[str(min([p, e])) + '_' + str(max([p, e]))].color != 'red':
                allPolygons[p].neighbors.append(e)
        if len(allPolygons[p].neighbors) == 0:
            hasClosedPoly = True
            listOfPolys.append(p)
            print('    ', p, len(allPolygons[p].neighbors), len(allPolygons[p].neighbours))
    
    if hasClosedPoly:
        hashesToRemove.append(odi.hash_id)
        print('====>', odi.hash_id, listOfPolys)
        ran.shuffle(listOfPolys)
        pToChange = allPolygons[listOfPolys[0]]
        listOfCandidate = []
        for e in pToChange.neighbours:
            if allPolygons[e].color != pToChange.color:
                listOfCandidate.append(e)
        ran.shuffle(listOfCandidate)
        if len(listOfCandidate) > 0:
            try:
                e_1 = str(min(pToChange.id, listOfCandidate[0])) + '_' + str(max(pToChange.id, listOfCandidate[0]))
                allEdges[e_1].color = 'black'
                a = symmDictPoly[pToChange.id]
                b = symmDictPoly[listOfCandidate[0]]
                e_2 = symmDictEdge[e_1]
                allEdges[e_2].color = 'black' 
                
                myList = [pToChange.id, listOfCandidate[0], a, b] + [int(z) for z in e_1.split('_')] + [int(z) for z in e_2.split('_')]
                myList = list(set(myList))
                for p0 in myList:
                    allPolygons[p0].neighbors = []
                    for e in allPolygons[p0].neighbours:
                        if allEdges[str(min([p0, e])) + '_' + str(max([p0, e]))].color != 'red':
                            allPolygons[p0].neighbors.append(e)
                        
                addEntryToDatabase(filepathParquet, allPolygons, allEdges, odi.template)
            except:
                print('EXCEPTION')
        else:
            print('NO CANDIDATES')

database = pl.read_parquet(filepathParquet)
print('B database.shape =', database.shape)
database = database.filter(~pl.col('hash_id').is_in(hashesToRemove))
print('C database.shape =', database.shape)

# ===============================================================================================

database.to_pandas().to_parquet(filepathParquet, compression = 'snappy')
with pd.ExcelWriter(filepathParquet.split('.')[0] + '.xlsx', engine='xlsxwriter') as writer:
    database.to_pandas().to_excel(writer, sheet_name = 'data', index = False, startrow = 0 , startcol = 0)
