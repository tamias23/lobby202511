#!/home/mat/Bureau/spyder-env/bin/python
# -*- coding: utf-8 -*-
"""
Created on Sat Feb 22 09:22:25 2025

@author: mat
"""

import os
import random
import polars as pl
import glob
import numpy as np
import time
import jsons

folder = '/home/mat/Bureau/lobby202511/createTemplatesAndBoards/'
os.chdir(folder)
print('os.getcwd() :', os.getcwd())

# from utilsPoly_202405 import fillColorsrandomly, enforceSymmetryEdges, enforceSymmetryPolygons, gatherStatistics, readTemplate, launchHeuristic, addEntryToDatabase, cleanDatabase, saveOnlySvg
from utilsPoly_202403 import fillColorsrandomly, enforceSymmetryEdges, enforceSymmetryPolygons, gatherStatistics, readTemplate, launchHeuristic, addEntryToDatabase, cleanDatabase, saveOnlySvg

# filepathParquet = folder + 'database/database_nopurple.parquet'
folderpathTemplate = folder + 'newTemplates/'

# ===============================================================================================

pattern = folder + 'newTemplates/*.json'
files = glob.glob(pattern)
# allNames = [f.split('/')[-1].split('.')[0] for f in glob.glob(pattern) if int(f.split('/')[-1].split('.')[0].split('_')[-1]) > 979]
allNames = [f.split('/')[-1].split('.')[0] for f in glob.glob(pattern)]

allShapePrint = {}

compteur = 0
for textFileName in allNames:
    compteur = compteur + 1
    print(compteur)
    params, allPolygons, allEdges = readTemplate(folder + 'newTemplates/' + textFileName + '.json')
    
    allShapesCount = {
        'pentagon1' : 0,
        'hexagon' : 0,
        'pentagon2' : 0,
        'square' : 0
        }
    for p in allPolygons:
        allShapesCount[allPolygons[p].shape] = allShapesCount[allPolygons[p].shape] + 1
    shapePrint = str(allShapesCount['square']) + '_' + str(allShapesCount['hexagon']) + '_' + str(allShapesCount['pentagon1']) + '_' + str(allShapesCount['pentagon2'])
    if shapePrint in allShapePrint:
        allShapePrint[shapePrint].append(textFileName)
    else:
        allShapePrint[shapePrint] = [textFileName]

allLenghts = []
for e in allShapePrint:
    allLenghts.append(len(allShapePrint[e]))

temp = pl.DataFrame({'l' : allLenghts})
temp.group_by('l').agg(pl.len().alias('ct')).sort('ct', descending = True)

for e in allShapePrint:
    if len(allShapePrint[e]) == 5:
        print(len(allShapePrint[e]), e, allShapePrint[e])



