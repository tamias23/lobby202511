#!/home/mat/Bureau/spyder-env/bin/python
# -*- coding: utf-8 -*-
"""
Created on Sun Mar 31 10:58:46 2024

@author: mat
"""

import os
import random
import polars as pl
import glob
import numpy as np
import time

folder = '/home/mat/Bureau/lobby202511/createTemplatesAndBoards/'
os.chdir(folder)
print('os.getcwd() :', os.getcwd())

# from utilsPoly_202405 import fillColorsrandomly, enforceSymmetryEdges, enforceSymmetryPolygons, gatherStatistics, readTemplate, launchHeuristic, addEntryToDatabase, cleanDatabase, saveOnlySvg
from utilsPoly_202403 import fillColorsrandomly, enforceSymmetryEdges, enforceSymmetryPolygons, gatherStatistics, readTemplate, launchHeuristic, addEntryToDatabase, cleanDatabase, saveOnlySvg

filepathParquet = folder + 'database/database_nopurple.parquet'
# hash_id = 'e198bbbcec5bb294d5852da565fd42d7'
# folderpathTemplate = folder + 'allTemplates/'
folderpathTemplate = folder + 'newTemplates/'
folderpathSvg = folder + 'randomBoards/'

# ===============================================================================================

pattern = folder + 'newTemplates/*.json'
files = glob.glob(pattern)
allNames = [f.split('/')[-1].split('.')[0] for f in glob.glob(pattern) if int(f.split('/')[-1].split('.')[0].split('_')[-1]) > 979]
"""
database = pl.read_parquet(filepathParquet)

gb = database.group_by('template').agg(
    pl.len().alias('ct')
    )
myDict = dict(gb.iter_rows())

allNamesCounted = {}
for (k, v) in [(n, myDict[n]) if n in myDict else (n, 0) for n in allNames]:
    allNamesCounted[k] = v

# ===============================================================================================

dts = pl.from_dict({
    'names' : allNamesCounted.keys(),
    'ct' : allNamesCounted.values()
    })

allCount = dts.group_by('ct').agg(
    pl.len().alias('nbOccur')
    ).sort('nbOccur')

print('allCount =', allCount)
print('len(allNames) =',len(allNames))
print('database[template].unique().shape =', database['template'].unique().shape)

# ===============================================================================================

allBoardTemplateNames = []
myMean = gb['ct'].mean()

for t in allNamesCounted.keys():
    if allNamesCounted[t] < myMean:
        for i in range(0, round(0.5 + myMean - allNamesCounted[t])):
            allBoardTemplateNames.append(t)

print('len(allBoardTemplateNames) =', len(allBoardTemplateNames))

random.shuffle(allBoardTemplateNames)
# random.sample(allBoardTemplateNames, allBoardTemplateNames/10)

# ===============================================================================================
"""

# colorSet = ['grey', 'blue', 'green', 'orange', 'purple']
colorSet = ['grey', 'blue', 'green', 'orange']
compteur = 0

# for textFileName in random.sample(allBoardTemplateNames, int(len(allBoardTemplateNames)/2)):
# for textFileName in random.sample(allBoardTemplateNames, max(allCount.filter(pl.col('ct') < 2).sum()['nbOccur'][0], 5)):
# for textFileName in random.sample(allBoardTemplateNames, 100):
# for textFileName in random.sample(allBoardTemplateNames, 1):
# for textFileName in allBoardTemplateNames:
# for textFileName in ['nt_406280124_155_994']:
allNames = allNames + allNames + allNames + allNames + allNames
random.shuffle(allNames)
for textFileName in allNames:
    # colorSet = random.choice([['grey', 'blue', 'green', 'orange', 'purple'], ['grey', 'blue', 'green', 'orange']])
    print('============================', compteur)
    compteur = compteur + 1
    params, allPolygons, allEdges = readTemplate(folder + 'newTemplates/' + textFileName + '.json')
    
    fillColorsrandomly(allPolygons, allEdges, colorSet)
    enforceSymmetryEdges(allEdges, params)
    enforceSymmetryPolygons(allPolygons, params)
    
    stats = gatherStatistics(allPolygons, allEdges)
    print(textFileName, stats)
    
    objectiveColors = {}
    """objectiveColors['grey'] = random.choice([i for i in range(42, 48)])
    objectiveColors['blue'] = random.choice([i for i in range(40, 44)])
    objectiveColors['green'] = random.choice([i for i in range(38, 40)])
    # objectiveColors['purple'] = random.choice([i for i in range(35, 38)])
    objectiveColors['orange'] = random.choice([i for i in range(36, 40)])"""
    objectiveColors['grey'] = random.choice([i for i in range(22, 28)])
    objectiveColors['blue'] = random.choice([i for i in range(20, 24)])
    objectiveColors['green'] = random.choice([i for i in range(18, 20)])
    objectiveColors['orange'] = random.choice([i for i in range(16, 20)])
    
    colorsWeightsObjective = {
        'grey' : 0.971,
        'blue' : 0.962,
        'green' : 0.963,
        # 'purple' : 0.955,
        'orange' : 0.958
        }
    
    objectiveSet = [0.5, 1.0, 1.5, 3.0, 8.0, 15.0, 40, 50, 70, 90, 100, 100, 100]
    
    launchHeuristic(allPolygons, allEdges, objectiveColors, colorsWeightsObjective, objectiveSet, params)
    
    # saveOnlySvg(params, allEdges, allPolygons, folderpathSvg + textFileName + '.svg', False)
    
    try:
        addEntryToDatabase(filepathParquet, allPolygons, allEdges, textFileName)
    except:
        print('error addEntryToDatabase A')
        time.sleep(3)
        try:
            addEntryToDatabase(filepathParquet, allPolygons, allEdges, textFileName)
        except:
            print('error addEntryToDatabase B')
            time.sleep(5)
            try:
                addEntryToDatabase(filepathParquet, allPolygons, allEdges, textFileName)
            except:
                print('error addEntryToDatabase C')
                time.sleep(7)

# cleanDatabase('database/database.parquet')

