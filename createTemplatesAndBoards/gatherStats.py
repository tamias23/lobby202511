#!/home/mat/Bureau/spyder-env/bin/python
# -*- coding: utf-8 -*-
"""
Created on Mon Jan 27 14:11:18 2025

@author: mat
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

for myRow in database.rows():
    odi = OneDatabaseItem(myRow[database.columns.index('timestamp')], myRow[database.columns.index('hash_id')], myRow[database.columns.index('template')], myRow[database.columns.index('rle')], myRow[database.columns.index('b64')], myRow[database.columns.index('p')], myRow[database.columns.index('e')], myRow[database.columns.index('y')], myRow[database.columns.index('b')], myRow[database.columns.index('g')], myRow[database.columns.index('o')], myRow[database.columns.index('k')], myRow[database.columns.index('r')], ast.literal_eval(myRow[database.columns.index('stats')]))
    
    params, allPolygons, allEdges = readTemplate(folderpathTemplate + '/' + odi.template + '.json')
    allPolygons, allEdges = setPolygonsFromRLE(odi.rle, allPolygons, allEdges)
    
    countPerShape = {'square' : 0,'pentagon1' : 0, 'pentagon2' : 0, 'hexagon' : 0}
    nbN1 = 0.0
    nbN2 = 0.0
    for p in allPolygons:
        allPolygons[p].neighbors = []
        for e in allPolygons[p].neighbours:
            if allEdges[str(min([p, e])) + '_' + str(max([p, e]))].color != 'red':
                allPolygons[p].neighbors.append(e)
        nbN1 = nbN1 + len(allPolygons[p].neighbors)
        nbN2 = nbN2 + len(allPolygons[p].neighbours)
        countPerShape[allPolygons[p].shape] = countPerShape[allPolygons[p].shape] + 1
    
    print(odi.template, odi.hash_id, len(allPolygons), len(allEdges), countPerShape, str(nbN1/len(allPolygons))[:3], str(nbN2/len(allPolygons))[:3])

"""
printPdfFromDatabase(filepathParquet, '9a41510647e36ee446df0f88a98bc55c', folderpathTemplate, folderpathSvg)
printPdfFromDatabase(filepathParquet, 'e51b4f82caeb4063ecae0aad634715d5', folderpathTemplate, folderpathSvg)
printPdfFromDatabase(filepathParquet, '66560c33963a01a9558114fbd47d7383', folderpathTemplate, folderpathSvg)

printPdfFromDatabase(filepathParquet, '4977557d8b68c8bd990e0256f7835cd0', folderpathTemplate, folderpathSvg)
printPdfFromDatabase(filepathParquet, '9a41510647e36ee446df0f88a98bc55c', folderpathTemplate, folderpathSvg)

printPdfFromDatabase(filepathParquet, '5364fb58aa733d8779931d158e7c20c2', folderpathTemplate, folderpathSvg)
printPdfFromDatabase(filepathParquet, '3941d02c8038b0370af563a4647a7369', folderpathTemplate, folderpathSvg)
"""












