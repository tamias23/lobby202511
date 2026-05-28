#!/home/mat/Bureau/spyder-env/bin/python
# -*- coding: utf-8 -*-
"""
Created on Wed Sep 18 08:28:55 2024

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

toBeDeleted = []

for textFileName in allNames:
    params, allPolygons, allEdges = readTemplate(folder + 'newTemplates/' + textFileName + '.json')
    
    countSquares = 0
    countIsolated = 0
    for p in allPolygons:
        # print(jsons.dumps(allPolygons[p]))
        # print(len(allPolygons[p].neighbours), allPolygons[p].shape)
        if len(allPolygons[p].neighbours) == 1:
            countIsolated = countIsolated + 1
        if allPolygons[p].shape == 'square':
            countSquares = countSquares + 1
    if (countIsolated + countSquares)  > 0:
        print('=====', int(textFileName.split('/')[-1].split('.')[0].split('_')[-1]), textFileName, '#squares', countSquares, '#isolated', countIsolated)
    if countIsolated > 0:
        toBeDeleted.append(textFileName)
    else:
        topEdgepolys = []
        bottomEdgepolys = []
        for k in allPolygons:
          if (len(allPolygons[k].points) > len(allPolygons[k].neighbours) and (allPolygons[k].center[1] < 63)):
            if ((allPolygons[k].center[0] > 1) and (allPolygons[k].center[0] < (params.width - 1))):
              topEdgepolys.append(k);
          if (len(allPolygons[k].points) > len(allPolygons[k].neighbours) and (allPolygons[k].center[1] > (params.height - 63))):
            if ((allPolygons[k].center[0] > 1) and (allPolygons[k].center[0] < (params.width - 1))):
              bottomEdgepolys.append(k);
        if len(topEdgepolys) <= 7:
            toBeDeleted.append(textFileName)
        elif len(bottomEdgepolys) <= 7:
            toBeDeleted.append(textFileName)
    
for e in toBeDeleted:
    os.remove(folderpathTemplate + e + '.json')
    os.remove(folderpathTemplate + e + '.svg')

