#!/home/mat/Bureau/spyder-env/bin/python
# -*- coding: utf-8 -*-
"""
Created on Tue Apr 23 14:07:55 2024

@author: mat
"""

"""
import xml.etree.ElementTree as ET

def change_rect_colors(svg_file):
  tree = ET.parse(svg_file)
  root = tree.getroot()

  for rect in root.findall('.//rect'):
    rect.set('fill', 'white')

  tree.write('/home/mat/Bureau/lobby202511/createTemplatesAndBoards/temp/' + filename + '.svg', encoding = 'utf-8', xml_declaration = True)

filename = 'nt_403271756_235_988'

change_rect_colors('/home/mat/Bureau/lobby202511/createTemplatesAndBoards/newTemplates/' + filename + '.svg')
"""

import os
import random
import polars as pl
import glob
import numpy as np
import time
from shapely import Polygon

folder = '/home/mat/Bureau/lobby202511/createTemplatesAndBoards/'
os.chdir(folder)
print('os.getcwd() :', os.getcwd())

from utilsPoly_202403 import readTemplate

def myFormat(myString, fillColor, strokeColor = 'black', myStrokeWidth = 1.0, myOpacity = 1.0):
    myString = myString.replace('fill="#66cc99"', 'fill="' + fillColor + '"')
    myString = myString.replace('stroke="#555555"', 'stroke="' + strokeColor + '"')
    myString = myString.replace('stroke-width="2.0"', 'stroke-width="' + str(myStrokeWidth) + '"')
    myString = myString.replace('stroke-width="1.0"', 'stroke-width="' + str(myStrokeWidth) + '"')
    myString = myString.replace('opacity="0.6"', 'opacity="' + str(myOpacity) + '"')
    
    return myString

shapeToColor = {
    'hexagon':'lime',
    'pentagon1':'deepskyblue',
    'pentagon2':'orangered',
    'square':'yellow',
    'hexagon_flat':'lime',
    'pentagon':'deepskyblue',
    'lastShape':'orangered',
    'bigSquare' : 'yellow',
    'hexagon_sharp':'lime'
    }

# textFileName = 'nt_403271756_235_988'

pattern = folder + 'newTemplates/*.json'
files = glob.glob(pattern)
allNames = [f.split('/')[-1].split('.')[0] for f in glob.glob(pattern) if int(f.split('/')[-1].split('.')[0].split('_')[-1]) > 979]

for textFileName in allNames:    
    file_path = '/home/mat/Bureau/lobby202511/createTemplatesAndBoards/temp/' + textFileName + '.svg'
    if not os.path.exists(file_path):
        params, allPolygons, allEdges = readTemplate(folder + 'newTemplates/' + textFileName + '.json')
        with open(file_path, 'w') as f:
            f.write('<?xml version="1.0" encoding="UTF-8"?>')
            f.write('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + str(params.width) + 'pt" height="' + str(params.height) + 'pt" viewBox="0 0 ' + str(params.width) + ' ' + str(params.height) + '" version="1.1">')
            f.write('<rect x="0" y="0" width="' + str(params.width) + '" height="' + str(params.height) + '" style="fill:rgb(00%,00%,00%);fill-opacity:0.9;stroke:none;"/>')
            # -----------------------------------------------
            for p in allPolygons:
                # print(allPolygons[p].shape)
                f.write(myFormat(Polygon(allPolygons[p].points).svg(), shapeToColor[allPolygons[p].shape], myStrokeWidth = 3.0))
            # -----------------------------------------------
            f.write('</svg>')
