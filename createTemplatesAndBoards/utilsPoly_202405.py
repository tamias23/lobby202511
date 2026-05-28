#!/home/mat/Bureau/spyder-env/bin/python
# -*- coding: utf-8 -*-
"""
Created on Mon Aug 21 09:36:53 2023

@author: mat
"""

import os
import cairo
import math
import random
import jsons
# import numpy as np
import time
import base64
# from collections import Counter
from collections import namedtuple
from heapq import heapify, heappop, heappush
# import xlsxwriter
import pandas as pd
import polars as pl
import hashlib
import datetime
import ast

"""
A2 420 594 
B2 500 707 <=
A1 594 841
B1 707 1000
"""

"""
https://en.wikipedia.org/wiki/Planigon
https://www.wikiwand.com/en/Planigon
http://chequesoto.info/tiling/
https://www.w3schools.com/css/css_colors_rgb.asp
"""

# ==========================================================================================

xmin = None
ymin = None
xmax = None
ymax = None
# colorSet = None
"""
colorSet = []
for p in allPolygons:
    if not allPolygons[p].color in colorSet:
        colorSet.append(allPolygons[p].color)
"""

class Params(object):
    def __init__(self, D, width, height):
        self.D = D
        self.width = width
        self.height = height

# width, height = 1000, 707
# width, height = 841, 594
# width, height = 707, 500

# params = Params(36.5)
# D = params.D

# alpha = D / 4.0 
# beta = math.sqrt(3.0) * alpha 

# cote length = 2 * alpha
# hauteur length = beta

colors = {}
colors['white'] = [255, 255, 255]
colors['black'] = [0, 0, 0]
colors['red'] = [255, 102, 102]
colors['red'] = [255, 51, 51]
colors['red'] = [255, 0, 0]
colors['green'] = [0, 204, 82]
colors['blue'] = [0, 100, 255]
colors['blue'] = [0, 128, 255]
colors['blue'] = [51, 153, 255]
colors['pink'] = [255, 153, 255]
colors['orange'] = [255, 180, 0]
colors['orange'] = [255, 153, 51]
colors['orange'] = [255, 140, 0]
colors['grey'] = [210, 210, 210]
colors['grey'] = [170, 170, 170]
colors['purple'] = [152, 0, 153]
colors['purple'] = [127, 0, 255]
colors['purple'] = [204, 102, 255]
colors['yellow'] = [255, 255, 0]

for c in colors:
    colors[c][0] = colors[c][0] / 255.0
    colors[c][1] = colors[c][1] / 255.0
    colors[c][2] = colors[c][2] / 255.0

class Polygon(object):
    def __init__(self, shape, id):
        self.id = id
        self.shape = shape
        self.points = []
        self.color = 'white'
        self.neighbours = []
        self.neighbors = []
        self.center = ''
        self.name = ''

class Edge(object):
    def __init__(self, id, sharedIds, sharedPoints):
        self.id = id
        self.color = 'white'
        self.sharedIds = sharedIds
        self.sharedPoints = sharedPoints
        self.name = ''

class AllPolyToBeSaved(object):
    def __init__(self, width, height, D : float, allPolygons : dict):
        self.width = width
        self.height = height
        self.D = D
        self.allPolygons = allPolygons.copy()
        
    def serialize(self, filename):
        with open(filename, 'w') as outfile:
            outfile.write(jsons.dumps(self))
    
    def deserialize(self, filename):
        with open(filename, 'r') as infile:
            aptbs2 = jsons.loads(infile.read(), AllPolyToBeSaved)
        self.width = aptbs2.width
        self.height = aptbs2.height
        self.D = aptbs2.D
        self.allPolygons = aptbs2.allPolygons.copy()

class ParamsObjective(object):
    def __init__(self, allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, restore, durationMax, neighbourhoodSize):
        self.allPolygons = allPolygons
        self.allEdges = allEdges
        self.colorSet = colorSet
        self.objectiveColors = objectiveColors
        self.colorsWeightsObjective = colorsWeightsObjective
        self.objectiveSets = objectiveSets
        self.ratioDiss = ratioDiss
        self.symmDictPoly = symmDictPoly
        self.subsets = subsets
        self.restore = restore
        self.durationMax = durationMax
        self.neighbourhoodSize = neighbourhoodSize
        
# ==========================================================================================

def setColorFromString(ctx, clr):
    ctx.set_source_rgb(colors[clr][0], colors[clr][1], colors[clr][2])
    
def drawFirstRectangle(ctx, width, height):
    # setColorFromString(ctx, 'black')
    ctx.set_source_rgb(76.5/255.0, 76.5/255.0, 76.5/255.0)
    ctx.set_line_width(0)
    ctx.rectangle(0, 0, width, height)
    ctx.fill()
    ctx.stroke()
    
def drawLastRectangle(ctx, width, height):
    setColorFromString(ctx, 'black')
    ctx.set_line_width(5)
    ctx.rectangle(0, 0, width, height)
    ctx.stroke()
    
def drawAllEdges(ctx, allPolygons, allEdges):
        # myColors = ['black', 'black', 'black', 'red', 'grey', 'blue']
        # myColors = ['black', 'black', 'black', 'black', 'black', 'black', 'green', 'red', 'red', 'blue']
        ctx.set_line_width(1.5)
        for idEdge in allEdges:
            ctx.move_to(allEdges[idEdge].sharedPoints[0][0], allEdges[idEdge].sharedPoints[0][1])
            ctx.line_to(allEdges[idEdge].sharedPoints[1][0], allEdges[idEdge].sharedPoints[1][1])            
            ctx.close_path()
            setColorFromString(ctx, allEdges[idEdge].color)
            # setColorFromString(ctx, random.choice(myColors))
            ctx.fill_preserve()
            ctx.stroke()
        for idPoly in allPolygons:
            for pt in allPolygons[idPoly].points:
                ctx.arc(pt[0], pt[1], 0.7, 0, 2 * math.pi)
                ctx.close_path()
                setColorFromString(ctx, 'black')
                ctx.fill_preserve()
                ctx.stroke()
    
def drawAndfillAllPolygons(ctx, allPolygons):
    # myColors = ['black', 'black', 'black', 'red', 'grey', 'blue']
    # myColors = ['grey', 'grey', 'grey', 'grey', 'grey', 'grey', 'grey', 'blue', 'blue', 'blue', 'blue', 'green', 'green', 'green' ]
    # ctx.set_line_width(4.0)
    ctx.set_line_width(2.5)
    for idPoly in allPolygons:
        # ctx.tag_begin('h1', 'key1=value1')
        # ctx.tag_begin('myTag', 'myId=attr' + str(idPoly))
        # ctx.tag_end('myTag')
        # ctx.tag_begin('g', 'key1=value2')
        ctx.move_to(allPolygons[idPoly].points[0][0], allPolygons[idPoly].points[0][1])
        for pt in allPolygons[idPoly].points:
            ctx.line_to(pt[0], pt[1])
        ctx.line_to(allPolygons[idPoly].points[0][0], allPolygons[idPoly].points[0][1])
        ctx.close_path()
        setColorFromString(ctx, allPolygons[idPoly].color)
        # setColorFromString(ctx, random.choice(myColors))
        ctx.fill_preserve()
        setColorFromString(ctx, 'black')
        ctx.stroke()
        # ctx.tag_end('g')
        # ctx.tag_end('h1')
    
def printAllIds(ctx, allPolygons):
    ctx.set_line_width(2)
    setColorFromString(ctx, 'black')
    for idPoly in allPolygons:
        a = -7
        b = 3        
        if allPolygons[idPoly].id <= 9:
            a = -3.5
        else:
            a = -7   
        ctx.move_to(allPolygons[idPoly].center[0] + a, allPolygons[idPoly].center[1] + b)
        ctx.show_text(str(allPolygons[idPoly].id))
        ctx.stroke()    
    ctx.close_path()

# ==========================================================================================

def fillColorsrandomly(allPolygons, allEdges, colorSet):
    # 20230807 myColors = ['black', 'black', 'black', 'black', 'black', 'black', 'green', 'red', 'blue']
    myColors = ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black', 'black', 'red']
    for idEdge in allEdges:
        allEdges[idEdge].color = random.choice(myColors)
    # myColors = ['grey', 'grey', 'grey', 'grey', 'grey', 'grey', 'grey', 'blue', 'blue', 'blue', 'blue', 'blue', 'green', 'green', 'green', 'green', 'green', 'orange', 'orange', 'orange']
    # myColors.extend(['grey', 'grey', 'grey', 'grey', 'grey', 'grey', 'grey', 'blue', 'blue', 'blue', 'blue', 'blue', 'green', 'green', 'green', 'green', 'orange', 'orange', 'orange'])
    myColors = []
    for i in range(0, 13):
        myColors.append('grey')
    for i in range(0, 11):
        myColors.append('blue')
    for i in range(0, 9):
        myColors.append('green')
    if 'orange' in colorSet:
        for i in range(0, 6):
            myColors.append('orange')
    if 'purple' in colorSet:
        for i in range(0, 7):
            myColors.append('purple')
    for idPoly in allPolygons:
        myNeighbourColorSet = []
        for n in allPolygons[idPoly].neighbours:
            if allEdges[str(min(idPoly, n)) + '_' + str(max(idPoly, n))].color != 'red':
                myNeighbourColorSet.append(allPolygons[n].color)
                myNeighbourColorSet.append(allPolygons[n].color)
        myNewColors = []
        if len(myNeighbourColorSet) > 0:
            for i in range(100):
                c1 = random.choice(myColors)
                c2 = random.choice(myNeighbourColorSet)
                if c1 != c2:
                    myNewColors.append(c1)
        else:
            myNewColors = myColors
        allPolygons[idPoly].color = random.choice(myNewColors)
        
# ==========================================================================================

def setPolygonsFromRLE(rle, allPolygons, allEdges):
    translateColors = {}
    translateColors['y'] = 'grey'
    translateColors['b'] = 'blue'
    translateColors['g'] = 'green'
    translateColors['o'] = 'orange'
    translateColors['p'] = 'purple'
    translateColors['z'] = 'black'
    translateColors['r'] = 'red'
    
    allColorsInRle = []
        
    s = rle
    i = 0
    while i + 2 < len(s):
        if s[i + 2].isdigit():
            # print(s[i + 2], s[i], s[i+1:i+3], s[i + 3])
            char = s[i]
            if i + 3 < len(s) and s[i + 3].isdigit():
                n = int(s[i+1:i+4])
                i = i + 4
            else:
                n = int(s[i+1:i+3])
                i = i + 3
            # print(char, n)
            for j in range(0, n):
                allColorsInRle.append(char)
        else:
            char = s[i]
            n = int(s[i+1])
            i = i + 2
            for j in range(0, n):
                allColorsInRle.append(char)
            # print(char, n)
    if i < len(s):
        char = s[i]
        n = int(s[i+1])
        for j in range(0, n):
            allColorsInRle.append(char)


    class MyItem(object):
        def __init__(self, id, center):
            self.id = id
            # self.center = center
            self.x = int(str(center[0]).split('.')[0])
            self.y = int(str(center[1   ]).split('.')[0])
    
    allColorsInRle.reverse()
    
    myListToBeSorted = []
    for p in allPolygons:
        myListToBeSorted.append(MyItem(p, allPolygons[p].center))
        
    myListToBeSorted.sort(key = lambda o: o.y, reverse = False)
    myListToBeSorted.sort(key = lambda o: o.x, reverse = False)
    
    for item in myListToBeSorted:
        # print('[', allPolygons[item.id].color)
        allPolygons[item.id].color = translateColors[allColorsInRle.pop()]
        # print('', allPolygons[item.id].color,']')
           
    myListToBeSorted = []
    for e in allEdges:
        myListToBeSorted.append(MyItem(e, [(allEdges[e].sharedPoints[0][0] + allEdges[e].sharedPoints[1][0])/2, (allEdges[e].sharedPoints[0][1] + allEdges[e].sharedPoints[1][1])/2]))
        
    myListToBeSorted.sort(key = lambda o: o.y, reverse = False)
    myListToBeSorted.sort(key = lambda o: o.x, reverse = False)
    
    for item in myListToBeSorted:
        # print('[', allEdges[item.id].color)
        allEdges[item.id].color = translateColors[allColorsInRle.pop()]
        # print('', allEdges[item.id].color,']')
        
    return allPolygons, allEdges
    
    
def getRLEstring(allPolygons, allEdges):
    # sort allPolygons by center
    # sort allEdges by center
    # construct string and hash it
    
    translateColors = {}
    translateColors['grey'] = 'y'
    translateColors['blue'] = 'b'
    translateColors['green'] = 'g'
    translateColors['orange'] = 'o'
    translateColors['purple'] = 'p'
    translateColors['black'] = 'z'
    translateColors['red'] = 'r'
    
    stringToBeHashed = ''
    
    class MyItem(object):
        def __init__(self, id, center):
            self.id = id
            # self.center = center
            self.x = int(str(center[0]).split('.')[0])
            self.y = int(str(center[1   ]).split('.')[0])
    
    myListToBeSorted = []
    for p in allPolygons:
        myListToBeSorted.append(MyItem(p, allPolygons[p].center))
        
    myListToBeSorted.sort(key = lambda o: o.y, reverse = False)
    myListToBeSorted.sort(key = lambda o: o.x, reverse = False)
    
    for item in myListToBeSorted:
        stringToBeHashed = stringToBeHashed + translateColors[allPolygons[item.id].color]
    
    myListToBeSorted = []
    for e in allEdges:
        myListToBeSorted.append(MyItem(e, [(allEdges[e].sharedPoints[0][0] + allEdges[e].sharedPoints[1][0])/2, (allEdges[e].sharedPoints[0][1] + allEdges[e].sharedPoints[1][1])/2]))
        
    myListToBeSorted.sort(key = lambda o: o.y, reverse = False)
    myListToBeSorted.sort(key = lambda o: o.x, reverse = False)
    
    for item in myListToBeSorted:
        stringToBeHashed = stringToBeHashed + translateColors[allEdges[item.id].color]
    
    # h = hashlib.md5(('shortcut' + stringToBeHashed).encode('utf-8')).hexdigest()
    
    stringRLE = ''
    previous_c = ''
    compteur = 0
    for c in stringToBeHashed:
        if compteur == 0:
            previous_c = c
        elif previous_c == c:
            pass
        else:
            stringRLE = stringRLE + previous_c + str(compteur)
            previous_c = c
            compteur = 0
        compteur = compteur + 1
    if compteur == 0:
        previous_c = c
    else:
        stringRLE = stringRLE + c + str(compteur)
        previous_c = c
        compteur = 0
        
    # print(stringToBeHashed)
    # print(stringRLE)
    # print(h)
    
    return stringRLE

def getBase64FromRLE(rle):
    
    table = {
        '2': '000',
        'y': '001',
        'r': '010',
        'z': '011',
        '0': '1000000',
        '9': '1000001',
        '8': '1000010',
        '6': '1000011',
        '3': '10001',
        'g': '1001',
        'b': '1010',
        '4': '101100',
        '7': '1011010',
        '5': '1011011',
        'o': '10111',
        '1': '11'
     }
    
    def encode(s, table):
        t = [table[letter] for letter in s]
        return ''.join(t)
    rle = encode(rle, table)
    rle = int('1' + rle, 2)
    rle = rle.to_bytes((rle.bit_length() + 7) // 8, 'big')

    return base64.b64encode(rle).decode()

def getRLEfromBase64(b64):
    node = namedtuple('node', ['proba', 'char', 'left', 'right'])
    
    myProbabilities = {
        '1': 0.3394745029438871,
        'z': 0.09569051714185642,
        'r': 0.09406154670987107,
        'y': 0.08927247147589613,
        '2': 0.08751631416333534,
        'b': 0.08110316030047411,
        'g': 0.07537192378962115,
        'o': 0.04869300804799446,
        '3': 0.029140471061071226,
        '4': 0.014520828319235157,
        '5': 0.010451826501441126,
        '7': 0.009437266538697097,
        '6': 0.007350423336640192,
        '8': 0.006601977462484762,
        '9': 0.006207698132700921,
        '0': 0.0051060640747937125
    } 

    nodes = []
    for c in myProbabilities:
        nodes.append(node(myProbabilities[c], c, None, None))
    
    heap = nodes.copy()
    heapify(heap)
    
    root = None
    def make_tree(heap):
        while len(heap) > 1:
            left = heappop(heap)
            right = heappop(heap)
            # print(left.proba, right.proba)
            proba = left.proba + right.proba
            n = node(proba, None, left, right)
            heappush(heap, n)
        
        return heap.pop()
    
    root = make_tree(heap)
    
    def decodeString(root, s):
        res = ''
        curr = root
        n = len(s)
        for i in range(n):
            if s[i] == '0':
                curr = curr.left
            else:
                curr = curr.right
     
            # reached leaf node
            if curr.left is None and curr.right is None:
                res = res + curr.char
                curr = root
        return res  
    
    b64 = base64.b64decode(b64)
    b64 = int.from_bytes(b64, byteorder='big')
    b64 = bin(b64)[2:]
    
    return decodeString(root, b64[1:])

# ==========================================================================================

def saveOnlySvg(params, allEdges, allPolygons, name, onlyPdf = False):
    # width, height = aptbs.width, aptbs.height
    # params = Params(aptbs.D)    
    
    print('saving ', name)
    
    if onlyPdf == False:
        with cairo.SVGSurface(name + '.svg', params.width, params.height) as surface:
            ctx = cairo.Context(surface)    
            drawFirstRectangle(ctx, params.width, params.height)
            drawAndfillAllPolygons(ctx, allPolygons)
            drawAllEdges(ctx, allPolygons, allEdges)
            
            # printAllIds(ctx)
            
            drawLastRectangle(ctx, params.width, params.height)
            
            # surface.write_to_png(name + '_pic.png')
    else:
        with cairo.PDFSurface(name + '.pdf', params.width, params.height) as surface:
            ctx = cairo.Context(surface)    
            drawFirstRectangle(ctx, params.width, params.height)
            drawAndfillAllPolygons(ctx, allPolygons)
            drawAllEdges(ctx, allPolygons, allEdges)
            
            # printAllIds(ctx)
            
            drawLastRectangle(ctx, params.width, params.height)
        
def saveSvg(params, allEdges, allPolygons, name):
    # width, height = aptbs.width, aptbs.height
    # params = Params(aptbs.D)    
    
    print('saving ', name)
    
    with cairo.SVGSurface(name + '.svg', params.width, params.height) as surface:
        ctx = cairo.Context(surface)    
        drawFirstRectangle(ctx, params.width, params.height)
        drawAndfillAllPolygons(ctx, allPolygons)
        drawAllEdges(ctx, allPolygons, allEdges)
        
        # printAllIds(ctx)
        
        drawLastRectangle(ctx, params.width, params.height)
        
        # surface.write_to_png(name + '_pic.png')
        
        aptbs = AllPolyToBeSaved(params.width, params.height, params.D, allPolygons)
        aptbs.serialize(name + '_poly.json')

        aptbs = AllPolyToBeSaved(params.width, params.height, params.D, allEdges)
        aptbs.serialize(name + '_edges.json')

def simpleReadFiles(metaFilePath):
    aptbs = AllPolyToBeSaved(-1, -1, -1, {})
    # aptbs.deserialize(folderpath + filename_wo_ext + '_edges.json')
    aptbs.deserialize(metaFilePath + '_edges.json')
    allEdges = {}
    for k in aptbs.allPolygons.keys():
        tempEdge = Edge(aptbs.allPolygons[k]['id'], None, None)
        tempEdge.color = aptbs.allPolygons[k]['color']
        tempEdge.sharedIds = aptbs.allPolygons[k]['sharedIds'].copy()
        tempEdge.sharedPoints = aptbs.allPolygons[k]['sharedPoints'].copy()
        allEdges[tempEdge.id] = tempEdge
    
    aptbs = AllPolyToBeSaved(-1, -1, -1, {})
    # aptbs.deserialize(folderpath + filename_wo_ext + '_poly.json')
    aptbs.deserialize(metaFilePath + '_poly.json')
    allPolygons = {}
    for k in aptbs.allPolygons.keys():
        tempPoly = Polygon(aptbs.allPolygons[k]['shape'], int(k))
        tempPoly.center = aptbs.allPolygons[k]['center']
        tempPoly.color = aptbs.allPolygons[k]['color']
        # tempPoly.points = aptbs.allPolygons[k]['points'].copy()
        tempPoly.neighbours = aptbs.allPolygons[k]['neighbours'].copy()
        allPolygons[int(k)] = tempPoly
    
    return allPolygons, allEdges

def readTemplate(filePath):
    aptbs = AllPolyToBeSaved(-1, -1, -1, {})
    aptbs.deserialize(filePath)
    
    params = Params(aptbs.D, aptbs.width, aptbs.height)
    
    allPolygons = {}
    for k in aptbs.allPolygons.keys():
        # allPolygons[int(k)] = aptbs.allPolygons[k]
        tempPoly = Polygon(aptbs.allPolygons[k]['shape'], int(k))
        tempPoly.center = aptbs.allPolygons[k]['center']
        tempPoly.color = aptbs.allPolygons[k]['color']
        tempPoly.points = aptbs.allPolygons[k]['points'].copy()
        allPolygons[int(k)] = tempPoly
    
    # matrixIsNeighbour = np.full((len(allPolygons), len(allPolygons)), False)
    for i in allPolygons.keys():
        for j in allPolygons.keys():
            if i < j:
                howManySharedPoints = 0
                for p1 in allPolygons[i].points:
                    for p2 in allPolygons[j].points:
                        if isTheSamePoint(p1, p2):
                            howManySharedPoints = howManySharedPoints + 1
                if howManySharedPoints == 2:
                    # matrixIsNeighbour[i, j] = True
                    # matrixIsNeighbour[j, i] = True
                    allPolygons[i].neighbours.append(j)
                    allPolygons[j].neighbours.append(i)
    
    allEdges = {}
    for i in allPolygons.keys():
        for j in allPolygons.keys():
            if i < j:
                howManySharedPoints = 0
                sharedIds = []
                sharedPoints = []
                for p1 in allPolygons[i].points:
                    for p2 in allPolygons[j].points:
                        if isTheSamePoint(p1, p2):
                            howManySharedPoints = howManySharedPoints + 1
                            sharedPoints.append(p1)
                            sharedIds.append(i)
                            sharedIds.append(j)
                if howManySharedPoints == 2:
                    e = Edge(str(i) + '_' + str(j), list(set(sharedIds)), sharedPoints)
                    allEdges[e.id] = e
                    
    return params, allPolygons, allEdges

# ==========================================================================================

def isTheSamePoint(a, b):
    """
    isTheSame = False
    if math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])) < 0.01:
        isTheSame = True
    return isTheSame
    """
    return math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])) < 0.01

# 353.5 and 250.0 are the coordinates of the center of the svg
def howManySymmetricalPoints(lista, listb, params):
    howMany = 0
    for a in lista:
        for b in listb:
            z1 = (a[0] + b[0])/2 - params.width / 2.0
            z2 = (a[1] + b[1])/2 - params.height / 2.0
            if (math.sqrt(z1 * z1)  < 0.01) and (math.sqrt(z2 * z2)  < 0.01):
                howMany = howMany + 1
    return howMany

def getSymmetryEdges(allEdges, params):
    symmDictEdge  ={}
    for id1 in allEdges:
        for id2 in allEdges:
            if id1 < id2:
                if howManySymmetricalPoints(allEdges[id1].sharedPoints, allEdges[id2].sharedPoints, params) == 2:
                    # print(id1, id2)
                    symmDictEdge[id1] = id2
                    symmDictEdge[id2] = id1
    return symmDictEdge

def getSymmetryPolygons(allPolygons, params):
    symmDictPoly  ={}
    for id1 in allPolygons:
        for id2 in allPolygons:
            if id1 < id2:
                if len(allPolygons[id1].points) == len(allPolygons[id2].points):
                    if howManySymmetricalPoints(allPolygons[id1].points, allPolygons[id2].points, params) == len(allPolygons[id1].points):
                        # print(id1, id2)
                        symmDictPoly[id1] = id2
                        symmDictPoly[id2] = id1
            
    # print([p for p in allPolygons if p not in symmDictPoly])
    for p in [p for p in allPolygons if p not in symmDictPoly]:
        symmDictPoly[p] = p
    
    return symmDictPoly

def getSymmetries(allPolygons, allEdges, params):
    symmDictEdge = getSymmetryEdges(allEdges, params)
    symmDictPoly = getSymmetryPolygons(allPolygons, params)
    
    return symmDictEdge, symmDictPoly

def enforceSymmetryEdges(allEdges, params):
    nbReds = 0
    maxReds = 17 + random.choice([0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 5, 6])
    
    shuffledList = list(allEdges.keys())
    random.shuffle(shuffledList)
    
    for id1 in shuffledList:
        for id2 in shuffledList:
            if id1 < id2:
                if howManySymmetricalPoints(allEdges[id1].sharedPoints, allEdges[id2].sharedPoints, params) == 2:
                    # print(id1, id2)
                    if allEdges[id1].color != allEdges[id2].color:
                        colorChosen = 'black'
                        if nbReds < maxReds:
                            colorChosen = random.choice([allEdges[id1].color, allEdges[id2].color, 'red'])
                            if colorChosen == 'red':
                                nbReds = nbReds + 1
                        allEdges[id1].color = colorChosen
                        allEdges[id2].color = colorChosen
                    elif allEdges[id1].color == 'red':
                        nbReds = nbReds + 1
    # print('nbReds =', nbReds)

def enforceSymmetryPolygons(allPolygons, params):
    for id1 in allPolygons:
        for id2 in allPolygons:
            if id1 < id2:
                if len(allPolygons[id1].points) == len(allPolygons[id2].points):
                    if howManySymmetricalPoints(allPolygons[id1].points, allPolygons[id2].points, params) == len(allPolygons[id1].points):
                        # print(id1, id2)
                        if allPolygons[id1].color != allPolygons[id2].color:
                            c = random.choice([allPolygons[id1].color, allPolygons[id2].color])
                            allPolygons[id1].color = c
                            allPolygons[id2].color = c
                            
# ==========================================================================================

def gatherStatistics(allPolygons, allEdges):
    stats = {}
    stats['size'] = 'p' + str(len(allPolygons)) + '_e' + str(len(allEdges))
    stats['grey'] = 0
    stats['blue'] = 0
    stats['green'] = 0
    stats['orange'] = 0
    stats['purple'] = 0
    stats['black'] = 0
    stats['red'] = 0
    for p in allPolygons:
        stats[allPolygons[p].color] = stats[allPolygons[p].color] + 1
    for e in allEdges:
        stats[allEdges[e].color] = stats[allEdges[e].color] + 1
    
    if stats['orange'] > 0:
        stats['string'] = stats['size'] + '_y' + str(stats['grey']) + 'b' + str(stats['blue']) + 'g' + str(stats['green']) + 'o' + str(stats['orange']) + 'p' + str(stats['purple']) + '_k' + str(stats['black']) + 'r' + str(stats['red'])
    else:
        stats['string'] = stats['size'] + '_y' + str(stats['grey']) + 'b' + str(stats['blue']) + 'g' + str(stats['green']) + '_k' + str(stats['black']) + 'r' + str(stats['red'])
    
    return stats

"""
def computeStatsEdges(allEdges):
    matrix = np.full((len(allEdges), len(allEdges)), 0)
    from_int_to_id = {}
    from_id_to_int = {}
    
    compteur = 0
    for e1 in allEdges:
        if allEdges[e1].color == 'red':
            matrix[compteur, compteur] = 1
        from_int_to_id[compteur] = allEdges[e1].id
        from_id_to_int[allEdges[e1].id] = compteur
        compteur = compteur + 1
    
    for e1 in allEdges:
        for e2 in allEdges:
            if allEdges[e1].id < allEdges[e2].id and allEdges[e1].color == 'red' and allEdges[e2].color == 'red':
                a = isTheSamePoint(allEdges[e1].sharedPoints[0], allEdges[e2].sharedPoints[0])
                b = isTheSamePoint(allEdges[e1].sharedPoints[0], allEdges[e2].sharedPoints[1])
                c = isTheSamePoint(allEdges[e1].sharedPoints[1], allEdges[e2].sharedPoints[0])
                d = isTheSamePoint(allEdges[e1].sharedPoints[1], allEdges[e2].sharedPoints[1])
                if a or b or c or d:
                    matrix[from_id_to_int[allEdges[e1].id], from_id_to_int[allEdges[e2].id]] = 1
                    matrix[from_id_to_int[allEdges[e2].id], from_id_to_int[allEdges[e1].id]] = 1
    
    idConnexSet = 0
    allSets = {}
    from_id_to_connectId = {}
    visited = {}
    for e1 in allEdges:
        visited[e1] = False
    
    def dfs(e2):
        from_id_to_connectId[e2] = idConnexSet
        allSets[idConnexSet].append(e2)
        visited[e2] = True
        i = from_id_to_int[e2]
        for j in range(0, len(allEdges)):
            if i != j and matrix[i, j] == 1 and visited[from_int_to_id[j]] == False:
                dfs(from_int_to_id[j])
            
    for e1 in allEdges:
        if allEdges[e1].color == 'red' and visited[e1] == False:
            allSets[idConnexSet] = []
            dfs(e1)
            idConnexSet = idConnexSet + 1
    
    myDict = {}
    for e in allSets:
        length = len(allSets[e])
        if length in myDict:
            myDict[length] = myDict[length] + 1
        else:
            myDict[length] = 1
    myKeys = list(myDict.keys())
    myKeys.sort()
    myDict = {i: myDict[i] for i in myKeys}
    return myDict
"""

"""
def computeStatsPoly(allPolygons, allEdges):
    alreadyAssigned = set()
    from_p_to_idConnect = {}
    idConnexSet = 0
    allSets = {}
    
    def checkNeighbours(p):
        added = []
        global idConnexSet
        if p in alreadyAssigned:
            for n in allPolygons[p].neighbours:
                if not n in alreadyAssigned and allPolygons[n].color == allPolygons[p].color and allEdges[str(min(p, n)) + '_' + str(max(p, n))].color != 'red':
                    alreadyAssigned.add(n)
                    from_p_to_idConnect[n] = from_p_to_idConnect[p]
                    allSets[from_p_to_idConnect[n]].add(n)
                    added.append(n)
        return added

    for i in allPolygons:
        if not i in alreadyAssigned:
            # find first unassigned poly
            alreadyAssigned.add(i)
            from_p_to_idConnect[i] = idConnexSet
            allSets[idConnexSet] = set()
            allSets[idConnexSet].add(i)
            # idConnexSet = idConnexSet + 1
            # expand set
            continu = True
            while continu:
                continu = False
                for p in allPolygons:
                    # print('p =', p)
                    if p in alreadyAssigned and from_p_to_idConnect[p] == idConnexSet:
                        added = [p]
                        while len(added) > 0:
                            # print('len(added) =', len(added))
                            addedNew = []
                            for i in added:
                                addedNew.extend(checkNeighbours(i))
                            added = list(set(addedNew))
                            if len(added) > 0:
                                continu = True
            idConnexSet = idConnexSet + 1
    
    # myDict = {'blue' : {}, 'green' : {}, 'grey' : {}, 'orange' : {}}
    myDict = {}
    for id in allSets:
        if not allPolygons[list(allSets[id])[0]].color in myDict:
            myDict[allPolygons[list(allSets[id])[0]].color] = {}
        if len(allSets[id]) in myDict[allPolygons[list(allSets[id])[0]].color]:
            myDict[allPolygons[list(allSets[id])[0]].color][len(allSets[id])] = myDict[allPolygons[list(allSets[id])[0]].color][len(allSets[id])] + 1
        else:
            myDict[allPolygons[list(allSets[id])[0]].color][len(allSets[id])] = 1
    for c in myDict:
        myKeys = list(myDict[c].keys())
        myKeys.sort()
        myDict[c] = {i: myDict[c][i] for i in myKeys}
    
    return myDict
"""

def setRectangleAreas(allPolygons, allEdges):
    global xmin
    global ymin
    global xmax
    global ymax
    
    xmin = 100000000
    ymin = 100000000
    xmax = -100000000
    ymax = -100000000
    for p in allPolygons:
        # print(p, allPolygons[p].color, allPolygons[p].center)
        for g in allPolygons[p].points:
            if xmin > g[0]:
                xmin = g[0]
            if xmax < g[0]:
                xmax = g[0]
            if ymin > g[1]:
                ymin = g[1]
            if ymax < g[1]:
                ymax = g[1]
    # print(xmin, xmax, '||', ymin, ymax)
    xmax = xmax - xmin
    ymax = ymax - ymin

def computeStatsArea(allPolygons, allEdges, colorSet):
    global xmin
    global ymin
    global xmax
    global ymax
    
    myDict = {}
    myDict['a'] = {}
    myDict['b'] = {}
    myDict['c'] = {}
    myDict['d'] = {}
    myDict['e'] = {}
    
    for i in myDict:
        for c in colorSet:
            myDict[i][c] = 0
    
    for p in allPolygons:
        x = allPolygons[p].center[0] - xmin
        y = allPolygons[p].center[1] - ymin
        
        areas = []
        if x < 0.6 * xmax and y < 0.6 * ymax:
            areas.append('a')
        if x > 0.4 * xmax and y < 0.6 * ymax:
            areas.append('b')
        if x > 0.4 * xmax and y > 0.4 * ymax:
            areas.append('c')
        if x < 0.6 * xmax and y > 0.4 * ymax:
            areas.append('d')
        if x > 0.2 * xmax and x < 0.8 * xmax and y > 0.2 * ymax and y < 0.8 * ymax:
            areas.append('e')
        
        for i in areas:
            myDict[i][allPolygons[p].color] = myDict[i][allPolygons[p].color] + 1
    
    return myDict

# compute a score on dissimilarities between areas
def computeDissimilarityScore(myDict, colorSet):
    mySum = 0
    # [h for h in colorSet if h != 'grey']
    for color in colorSet:
        for i in myDict:
            for j in myDict:
                if i < j:
                    mySum = mySum + (myDict[i][color] - myDict[j][color]) * (myDict[i][color] - myDict[j][color])
    # mySum = math.sqrt(mySum)
    return mySum

# compute a score on connectivity, for each color
def computeDisconnectivityScore(myDict, colorSet, power):
    mySum = 0
    # for c in [c for c in myDict if c!= 'grey']:
    for c in colorSet:
        for i in myDict[c]:
            k = 1
            for z in range(0, power):
                k = k * (5 - min(5, i))
            # print(k, (5 - min(5, i)) * (5 - min(5, i)) * (5 - min(5, i)))
            mySum = mySum +k * myDict[c][i]
    return mySum

# ==========================================================================================

class Move1(object):
    def __init__(self, p, color, score):
        self.p = p
        self.color = color
        self.score = score

class Move2(object):
    def __init__(self, p, color, score):
        self.p = p
        self.color = color
        self.score = score

def switchColors(allPolygons, colorSet):
    if 'orange' in colorSet:
        nbObjColor = {}
        nbObjColor['grey'] = 0
        nbObjColor['blue'] = 0
        nbObjColor['green'] = 0
        nbObjColor['orange'] = 0
        nbObjColor['purple'] = 0
        # nbObjColor['orange'] = 0
        for p in allPolygons:
            # if allPolygons[p].color in ['blue', 'green']:
            nbObjColor[allPolygons[p].color] = nbObjColor[allPolygons[p].color] + 1
        invertDict = []
        for c in nbObjColor.keys():
            nb = str(nbObjColor[c])
            while len(nb) < 3:
                nb = '0' + nb
            invertDict.append(nb + '_' + c)
        invertDict = sorted(invertDict)
        # print('invertDict =', invertDict)
        for p in allPolygons:
            if allPolygons[p].color == invertDict[4].split('_')[1]:
                allPolygons[p].color = 'shouldBeGrey'
            elif allPolygons[p].color == invertDict[3].split('_')[1]:
                allPolygons[p].color = 'shouldBeBlue'
            elif allPolygons[p].color == invertDict[2].split('_')[1]:
                allPolygons[p].color = 'shouldBeGreen'
            elif allPolygons[p].color == invertDict[1].split('_')[1]:
                allPolygons[p].color = 'shouldBeOrange'
            elif allPolygons[p].color == invertDict[0].split('_')[1]:
                allPolygons[p].color = 'shouldBePurple'
        for p in allPolygons:
            if allPolygons[p].color == 'shouldBeGrey':
                allPolygons[p].color = 'grey'
            elif allPolygons[p].color == 'shouldBeBlue':
                allPolygons[p].color = 'blue'
            elif allPolygons[p].color == 'shouldBeGreen':
                allPolygons[p].color = 'green'
            elif allPolygons[p].color == 'shouldBeOrange':
                allPolygons[p].color = 'orange'
            elif allPolygons[p].color == 'shouldBePurple':
                allPolygons[p].color = 'purple'
    else:
        nbObjColor = {}
        nbObjColor['grey'] = 0
        nbObjColor['blue'] = 0
        nbObjColor['green'] = 0
        # nbObjColor['orange'] = 0
        for p in allPolygons:
            # if allPolygons[p].color in ['blue', 'green']:
            nbObjColor[allPolygons[p].color] = nbObjColor[allPolygons[p].color] + 1
        invertDict = []
        for c in nbObjColor.keys():
            nb = str(nbObjColor[c])
            while len(nb) < 3:
                nb = '0' + nb
            invertDict.append(nb + '_' + c)
        invertDict = sorted(invertDict)
        # print('invertDict =', invertDict)
        for p in allPolygons:
            if allPolygons[p].color == invertDict[2].split('_')[1]:
                allPolygons[p].color = 'shouldBeGrey'
            elif allPolygons[p].color == invertDict[1].split('_')[1]:
                allPolygons[p].color = 'shouldBeBlue'
            elif allPolygons[p].color == invertDict[0].split('_')[1]:
                allPolygons[p].color = 'shouldBeGreen'
        for p in allPolygons:
            if allPolygons[p].color == 'shouldBeGrey':
                allPolygons[p].color = 'grey'
            elif allPolygons[p].color == 'shouldBeBlue':
                allPolygons[p].color = 'blue'
            elif allPolygons[p].color == 'shouldBeGreen':
                allPolygons[p].color = 'green'
            
def saveColors(dts):
    savedColors = {}
    for p in dts:
        savedColors[p] = dts[p].color
    return savedColors

def restoreColors(dts, savedColors):
    for p in dts:
        dts[p].color = savedColors[p]


def computeSubsets(allPolygons):
    global xmin
    global ymin
    global xmax
    global ymax
    
    subsets = {}
    
    for i in range(1, 50):
        subsets['a'+str(i)] = []
    
    for p in allPolygons:
        x = allPolygons[p].center[0] - xmin
        y = allPolygons[p].center[1] - ymin
                    
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            subsets['a1'].append(p)
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            subsets['a2'].append(p)
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            subsets['a3'].append(p)
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            subsets['a4'].append(p)
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            subsets['a5'].append(p)
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            subsets['a6'].append(p)
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            subsets['a7'].append(p)
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            subsets['a8'].append(p)
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            subsets['a9'].append(p)
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            subsets['a10'].append(p)
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            subsets['a11'].append(p)
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            subsets['a12'].append(p)
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            subsets['a13'].append(p)
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            subsets['a14'].append(p)
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            subsets['a15'].append(p)
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            subsets['a16'].append(p)
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            subsets['a17'].append(p)
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            subsets['a18'].append(p)
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            subsets['a19'].append(p)
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            subsets['a20'].append(p)
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            subsets['a21'].append(p)
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            subsets['a22'].append(p)
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            subsets['a23'].append(p)
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            subsets['a24'].append(p)
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            subsets['a25'].append(p)
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            subsets['a26'].append(p)
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            subsets['a27'].append(p)
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            subsets['a28'].append(p)
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            subsets['a29'].append(p)
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            subsets['a30'].append(p)
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            subsets['a31'].append(p)
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            subsets['a32'].append(p)
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            subsets['a33'].append(p)
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            subsets['a34'].append(p)
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            subsets['a35'].append(p)
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            subsets['a36'].append(p)
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            subsets['a37'].append(p)
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            subsets['a38'].append(p)
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            subsets['a39'].append(p)
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            subsets['a40'].append(p)
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            subsets['a41'].append(p)
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            subsets['a42'].append(p)
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            subsets['a43'].append(p)
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            subsets['a44'].append(p)
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            subsets['a45'].append(p)
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            subsets['a46'].append(p)
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            subsets['a47'].append(p)
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            subsets['a48'].append(p)
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            subsets['a49'].append(p)
    
    return subsets
            
def computeDissimilarityScoreH(po :ParamsObjective):
    global xmin
    global ymin
    global xmax
    global ymax
    
    myDict = {}
    for i in range(1, 50):
        myDict['a'+str(i)] = {}
    
    for i in myDict:
        for c in po.colorSet:
            myDict[i][c] = 0
    
    for p in po.allPolygons:
        x = po.allPolygons[p].center[0] - xmin
        y = po.allPolygons[p].center[1] - ymin
        
        areas = []
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            areas.append('a1')
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            areas.append('a2')
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            areas.append('a3')
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            areas.append('a4')
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            areas.append('a5')
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            areas.append('a6')
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.0 * ymax < y and y < 0.4 * ymax:
            areas.append('a7')
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            areas.append('a8')
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            areas.append('a9')
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            areas.append('a10')
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            areas.append('a11')
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            areas.append('a12')
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            areas.append('a13')
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.1 * ymax < y and y < 0.5 * ymax:
            areas.append('a14')
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            areas.append('a15')
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            areas.append('a16')
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            areas.append('a17')
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            areas.append('a18')
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            areas.append('a19')
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            areas.append('a20')
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.2 * ymax < y and y < 0.6 * ymax:
            areas.append('a21')
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            areas.append('a22')
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            areas.append('a23')
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            areas.append('a24')
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            areas.append('a25')
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            areas.append('a26')
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            areas.append('a27')
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.3 * ymax < y and y < 0.7 * ymax:
            areas.append('a28')
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            areas.append('a29')
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            areas.append('a30')
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            areas.append('a31')
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            areas.append('a32')
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            areas.append('a33')
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            areas.append('a34')
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.4 * ymax < y and y < 0.8 * ymax:
            areas.append('a35')
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            areas.append('a36')
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            areas.append('a37')
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            areas.append('a38')
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            areas.append('a39')
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            areas.append('a40')
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            areas.append('a41')
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.5 * ymax < y and y < 0.9 * ymax:
            areas.append('a42')
        if 0.0 * xmax < x and x < 0.4 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            areas.append('a43')
        if 0.1 * xmax < x and x < 0.5 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            areas.append('a44')
        if 0.2 * xmax < x and x < 0.6 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            areas.append('a45')
        if 0.3 * xmax < x and x < 0.7 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            areas.append('a46')
        if 0.4 * xmax < x and x < 0.8 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            areas.append('a47')
        if 0.5 * xmax < x and x < 0.9 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            areas.append('a48')
        if 0.6 * xmax < x and x < 1.0 * xmax and 0.6 * ymax < y and y < 1.0 * ymax:
            areas.append('a49')
        
        for i in areas:
            myDict[i][po.allPolygons[p].color] = myDict[i][po.allPolygons[p].color] + 1
            
    mySum = 0
    # [h for h in colorSet if h != 'grey']
    for color in po.colorSet:
        for i in myDict:
            for j in myDict:
                if i < j:
                    mySum = mySum + (myDict[i][color] - myDict[j][color]) * (myDict[i][color] - myDict[j][color])
    # mySum = math.sqrt(mySum)
    return mySum

def gatherDetailedStats(allPolygons, allEdges):
    alreadyAssigned = set()
    from_p_to_idConnect = {}
    idConnexSet = 0
    allSets = {}
    
    def checkNeighboursH(p):
        added = []
        global idConnexSet
        if p in alreadyAssigned:
            for n in allPolygons[p].neighbours:
                if not n in alreadyAssigned and allPolygons[n].color == allPolygons[p].color and allEdges[str(min(p, n)) + '_' + str(max(p, n))].color != 'red':
                    alreadyAssigned.add(n)
                    from_p_to_idConnect[n] = from_p_to_idConnect[p]
                    allSets[from_p_to_idConnect[n]].add(n)
                    added.append(n)
        return added

    for i in allPolygons:
        if not i in alreadyAssigned:
            # find first unassigned poly
            alreadyAssigned.add(i)
            from_p_to_idConnect[i] = idConnexSet
            allSets[idConnexSet] = set()
            allSets[idConnexSet].add(i)
            # idConnexSet = idConnexSet + 1
            # expand set
            continu = True
            while continu:
                continu = False
                for p in allPolygons:
                    # print('p =', p)
                    if p in alreadyAssigned and from_p_to_idConnect[p] == idConnexSet:
                        added = [p]
                        while len(added) > 0:
                            # print('len(added) =', len(added))
                            addedNew = []
                            for i in added:
                                addedNew.extend(checkNeighboursH(i))
                            added = list(set(addedNew))
                            if len(added) > 0:
                                continu = True
            idConnexSet = idConnexSet + 1
    
    # myDict = {'blue' : {}, 'green' : {}, 'grey' : {}, 'orange' : {}}
    myDict = {}
    for id in allSets:
        if not allPolygons[list(allSets[id])[0]].color in myDict:
            myDict[allPolygons[list(allSets[id])[0]].color] = {}
        if len(allSets[id]) in myDict[allPolygons[list(allSets[id])[0]].color]:
            myDict[allPolygons[list(allSets[id])[0]].color][len(allSets[id])] = myDict[allPolygons[list(allSets[id])[0]].color][len(allSets[id])] + 1
        else:
            myDict[allPolygons[list(allSets[id])[0]].color][len(allSets[id])] = 1
    for c in myDict:
        myKeys = list(myDict[c].keys())
        myKeys.sort()
        myDict[c] = {i: myDict[c][i] for i in myKeys}
    return myDict

# compute a score on connectivity, for each color
# def computeDisconnectivityScoreH(allPolygons, allEdges, colorSet, objective, maxConnectSize, power):
def computeDisconnectivityScoreH(po : ParamsObjective):
    alreadyAssigned = set()
    from_p_to_idConnect = {}
    idConnexSet = 0
    allSets = {}
    
    def checkNeighboursH(p):
        added = []
        global idConnexSet
        if p in alreadyAssigned:
            for n in po.allPolygons[p].neighbours:
                if not n in alreadyAssigned and po.allPolygons[n].color == po.allPolygons[p].color and po.allEdges[str(min(p, n)) + '_' + str(max(p, n))].color != 'red':
                    alreadyAssigned.add(n)
                    from_p_to_idConnect[n] = from_p_to_idConnect[p]
                    allSets[from_p_to_idConnect[n]].add(n)
                    added.append(n)
        return added

    for i in po.allPolygons:
        if not i in alreadyAssigned:
            # find first unassigned poly
            alreadyAssigned.add(i)
            from_p_to_idConnect[i] = idConnexSet
            allSets[idConnexSet] = set()
            allSets[idConnexSet].add(i)
            # idConnexSet = idConnexSet + 1
            # expand set
            continu = True
            while continu:
                continu = False
                for p in po.allPolygons:
                    # print('p =', p)
                    if p in alreadyAssigned and from_p_to_idConnect[p] == idConnexSet:
                        added = [p]
                        while len(added) > 0:
                            # print('len(added) =', len(added))
                            addedNew = []
                            for i in added:
                                addedNew.extend(checkNeighboursH(i))
                            added = list(set(addedNew))
                            if len(added) > 0:
                                continu = True
            idConnexSet = idConnexSet + 1
    
    # myDict = {'blue' : {}, 'green' : {}, 'grey' : {}, 'orange' : {}}
    myDict = {}
    for id in allSets:
        if not po.allPolygons[list(allSets[id])[0]].color in myDict:
            myDict[po.allPolygons[list(allSets[id])[0]].color] = {}
        if len(allSets[id]) in myDict[po.allPolygons[list(allSets[id])[0]].color]:
            myDict[po.allPolygons[list(allSets[id])[0]].color][len(allSets[id])] = myDict[po.allPolygons[list(allSets[id])[0]].color][len(allSets[id])] + 1
        else:
            myDict[po.allPolygons[list(allSets[id])[0]].color][len(allSets[id])] = 1
    for c in myDict:
        myKeys = list(myDict[c].keys())
        myKeys.sort()
        myDict[c] = {i: myDict[c][i] for i in myKeys}
    
    """
    if 'orange' in colorSet and 'orange' not in myDict:
        print(colorSet)
        print(myDict.keys())
    """
    
    # print(myDict)
    
    mySum = 0
    
    if 'orange' in po.colorSet:            
        for c in po.colorSet:
            for i in myDict[c]:
                if i > 5:
                    mySum = mySum + myDict[c][i] * (25 + i * math.sqrt(i)) * po.colorsWeightsObjective[c]
                else:
                    mySum = mySum + myDict[c][i] * po.objectiveSets[i] * po.colorsWeightsObjective[c]
    else:
        for c in po.colorSet:
            if c != 'grey':
                for i in myDict[c]:
                    if i > 5:
                        mySum = mySum + myDict[c][i] * (25 + i * math.sqrt(i)) * po.colorsWeightsObjective[c]
                    else:
                        mySum = mySum + myDict[c][i] * po.objectiveSets[i] * po.colorsWeightsObjective[c]
    
    mySum = mySum * 2.5
    
    stats = {}
    for c in po.colorSet:
        stats[c] = 0
    for c in myDict:
        for i in myDict[c]:
            stats[c] = stats[c] + i * myDict[c][i]
    
    if 'orange' in po.colorSet:
        mySum = mySum + (1.1 * math.fabs(stats['grey'] - po.objectiveColors['grey']) + 0.98 * math.fabs(stats['blue'] - po.objectiveColors['blue']) + 0.95 * math.fabs(stats['green'] - po.objectiveColors['green']) + 0.95 * math.fabs(stats['purple'] - po.objectiveColors['purple']) + 0.92 * math.fabs(stats['orange'] - po.objectiveColors['orange'])) * 6
    else:
        mySum = mySum + (1.1 * math.fabs(stats['grey'] - po.objectiveColors['grey']) + 0.70 * math.fabs(stats['blue'] - po.objectiveColors['blue']) + 0.95 * math.fabs(stats['green'] - po.objectiveColors['green'])) * 6
    # print('@@@', (1.1 * math.fabs(stats['grey'] - 94) + 0.9 * math.fabs(stats['blue'] - 75) + 0.8 * math.fabs(stats['green'] - 61)) * 3)
    
    return mySum

# def score(allPolygons, allEdges, colorSet, objective, maxConnectSize, ratioDiss):
def score(po : ParamsObjective):
    return computeDisconnectivityScoreH(po) + computeDissimilarityScoreH(po) * po.ratioDiss

def neighbourhood1(po : ParamsObjective):
    global veryBestScore
    global veryBestColors
    
    # objective = [random.choice([i for i in range(88, 105)]), random.choice([i for i in range(65, 80)]), random.choice([i for i in range(60, 70)])]
    # symmDictEdge = getSymmetryEdges(allEdges)
    # symmDictPoly = getSymmetryPolygons(allPolygons)
    
    # neighbourhoodSize = random.choice(neighbourhoodSize)
    print('start neighbourhood1', po.restore, po.durationMax, po.neighbourhoodSize)
    
    start_time = time.time()
    duration = time.time() - start_time
    print_time = time.time()
    while duration < po.durationMax:
        moves = []
        savedColors = saveColors(po.allPolygons)
        for i in range(0, po.neighbourhoodSize):
            pChoice = random.choice(list(po.allPolygons.keys()))
            colorChoice = random.choice([c for c in po.colorSet if c != po.allPolygons[pChoice].color])
            po.allPolygons[pChoice].color = colorChoice
            po.allPolygons[po.symmDictPoly[pChoice]].color = colorChoice
            moves.append(Move1(pChoice, colorChoice, score(po)))
            restoreColors(po.allPolygons, savedColors)
            # print('after', computeDisconnectivityScoreH(3), computeDissimilarityScoreH())
        bestMove = None
        bestScore = 10000000000000000000
        for m in moves:
            if m.score < bestScore:
                bestScore = m.score
                bestMove = m
        po.allPolygons[bestMove.p].color = bestMove.color
        po.allPolygons[po.symmDictPoly[bestMove.p]].color = bestMove.color
        s = score(po)
        if s < veryBestScore:
            switchColors(po.allPolygons, po.colorSet)
            veryBestScore = s
            veryBestColors = saveColors(po.allPolygons)
            # saveSvg(aptbs, allEdges, allPolygons, '/home/mat/Bureau/svg/python/202307/allBoards/no_orange/out')
        duration = time.time() - start_time
        if time.time() - print_time > 1:
            print_time = time.time()
            print(str(duration).split('.')[0] + 's', bestMove.score, veryBestScore)
        # print('*', computeDisconnectivityScoreH(3), computeDissimilarityScoreH() * 5)
    if po.restore:
        restoreColors(po.allPolygons, veryBestColors)
    switchColors(po.allPolygons, po.colorSet)


def neighbourhood2(po : ParamsObjective):
    global veryBestScore
    global veryBestColors
    
    # neighbourhoodSize = random.choice(neighbourhoodSize)
    print('start neighbourhood2', po.restore, po.durationMax, po.neighbourhoodSize)
    
    start_time = time.time()
    duration = time.time() - start_time
    print_time = time.time()
    while duration < po.durationMax:
        moves = []
        savedColors = saveColors(po.allPolygons)
        for i in range(0, po.neighbourhoodSize):
            mySubset = po.subsets[random.choice(list(po.subsets.keys()))]
            pChoice1 = random.choice(mySubset)
            colorChoice1 = random.choice([c for c in po.colorSet if c != po.allPolygons[pChoice1].color])
            po.allPolygons[pChoice1].color = colorChoice1
            po.allPolygons[po.symmDictPoly[pChoice1]].color = colorChoice1
            pChoice2 = random.choice([pc for pc in mySubset if pc not in [pChoice1, po.symmDictPoly[pChoice1]]])
            colorChoice2 = random.choice([c for c in po.colorSet if c != po.allPolygons[pChoice2].color])
            po.allPolygons[pChoice2].color = colorChoice2
            po.allPolygons[po.symmDictPoly[pChoice2]].color = colorChoice2
            moves.append(Move2([pChoice1, pChoice2], [colorChoice1, colorChoice2], score(po)))
            restoreColors(po.allPolygons, savedColors)
            # print('after', computeDisconnectivityScoreH(3), computeDissimilarityScoreH())
        bestMove = None
        bestScore = 10000000000000000000
        for m in moves:
            if m.score < bestScore:
                bestScore = m.score
                bestMove = m
        po.allPolygons[bestMove.p[0]].color = bestMove.color[0]
        po.allPolygons[po.symmDictPoly[bestMove.p[0]]].color = bestMove.color[0]
        po.allPolygons[bestMove.p[1]].color = bestMove.color[1]
        po.allPolygons[po.symmDictPoly[bestMove.p[1]]].color = bestMove.color[1]
        s = score(po)
        if s < veryBestScore:
            switchColors(po.allPolygons, po.colorSet)
            veryBestScore = s
            veryBestColors = saveColors(po.allPolygons)
            # saveSvg(aptbs, allEdges, allPolygons, '/home/mat/Bureau/svg/python/202307/allBoards/no_orange/out')
        duration = time.time() - start_time
        if time.time() - print_time > 1:
            print_time = time.time()
            print(str(duration).split('.')[0] + 's', bestMove.score, veryBestScore)
        # print('*', computeDisconnectivityScoreH(3), computeDissimilarityScoreH() * 5)
    if po.restore:
        restoreColors(po.allPolygons, veryBestColors)
    switchColors(po.allPolygons, po.colorSet)

# test88888888
def launchHeuristic(allPolygons, allEdges, objectiveColors, colorsWeightsObjective, objectiveSets, params):
    global xmin
    global ymin
    global xmax
    global ymax
    
    xmin = 100000000
    ymin = 100000000
    xmax = -100000000
    ymax = -100000000
    for p in allPolygons:
        # print(p, allPolygons[p].color, allPolygons[p].center)
        for g in allPolygons[p].points:
            if xmin > g[0]:
                xmin = g[0]
            if xmax < g[0]:
                xmax = g[0]
            if ymin > g[1]:
                ymin = g[1]
            if ymax < g[1]:
                ymax = g[1]
    # print(xmin, xmax, '||', ymin, ymax)
    xmax = xmax - xmin
    ymax = ymax - ymin
    
    # neighbourhoodSize = random.choice([40, 200])
    
    # symmDictEdge = getSymmetryEdges(allEdges)
    symmDictPoly = getSymmetryPolygons(allPolygons, params) 
    
    colorSet = []
    for p in allPolygons:
        if not allPolygons[p].color in colorSet:
            colorSet.append(allPolygons[p].color)
    print('colorSet =', colorSet)
    
    subsets = computeSubsets(allPolygons)
    
    # -------------------------------------------------------
    ratioDiss = 0.005
    po_temp = ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 10, 3)
    
    print('computeDisconnectivityScoreH = ', computeDisconnectivityScoreH(po_temp))
    print('computeDissimilarityScoreH = ', computeDissimilarityScoreH(po_temp))
    # ratioDiss = 0.2 * computeDisconnectivityScoreH(po_temp) /  (1.0 * computeDissimilarityScoreH(po_temp))
    print('ratioDiss = ', 0.2 * computeDisconnectivityScoreH(po_temp) /  (1.0 * computeDissimilarityScoreH(po_temp)))
    del po_temp
        
    global veryBestScore
    global veryBestColors
    veryBestColors = saveColors(allPolygons)
    veryBestScore = score(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 10, 3))
    
    """
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, False, 20, 3))
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 20, 5))
    neighbourhood2(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 10, 100))
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 20, 20))
    neighbourhood2(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 10, 200))
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 20, 100))
    
    neighbourhood2(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, False, 10, 200)) 
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, False, 10, 200))
    neighbourhood2(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, False, 10, 300)) 
    
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, False, 20, 300))
    neighbourhood2(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, False, 10, 400)) 
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 10, 300))
    neighbourhood2(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 5, 400)) 
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 5, 300))
    """
    
    k = 2
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, False, 8 * k, 3))
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, False, 4 * k, 5))
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 6 * k, 20))
    neighbourhood2(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 5 * k, 400))
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 5 * k, 80))
    neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 5 * k, 120))
    neighbourhood2(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 2 * k, 600))
    
    """if 'orange' in colorSet:
        neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, False, 8 * k, 3))
        neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, False, 4 * k, 5))
        neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 6 * k, 20))
        neighbourhood2(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 5 * k, 400))
        neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 5 * k, 80))
        neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 5 * k, 120))
        neighbourhood2(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 2 * k, 600))
    else:
        neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, False, 8 * k, 3))
        neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, False, 4 * k, 5))
        neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 3 * k, 20))
        neighbourhood2(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 2 * k, 300))
        neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 3 * k, 80))
        neighbourhood1(ParamsObjective(allPolygons, allEdges, colorSet, objectiveColors, colorsWeightsObjective, objectiveSets, ratioDiss, symmDictPoly, subsets, True, 3 * k, 120))"""

class OneDatabaseItem:
    def __init__(self, theDate, hash_id, template, rle, b64, p, e, y, b, g, o, pu, k, r, detailedStats):
        self.timestamp = theDate
        self.hash_id = hash_id
        self.template = template
        self.rle = rle
        self.b64 = b64
        self.p = p
        self.e = e
        self.y = y
        self.b = b
        self.g = g
        self.o = o
        self.pu = pu
        self.k = k
        self.r = r
        self.filename = self.template.replace('_', '') + '_' + self.hash_id + '_y' + str(self.y) + '_b' + str(self.b) + '_g' + str(self.g) + '_o' + str(self.o) + '_p' + str(self.pu) + '_k' + str(self.k) + '_r' + str(self.r)
        self.stats = detailedStats
    def getRowPolars(self):
        myRow = pl.DataFrame({
            'filename' : [self.filename],
            'timestamp' : [self.timestamp],
            'hash_id' : [self.hash_id],
            'template' : [self.template],
            'rle' : [self.rle],
            'b64' : [self.b64],
            'p' : [self.p],
            'e' : [self.e],
            'y' : [self.y],
            'b' : [self.b],
            'g' : [self.g],
            'o' : [self.o],
            'u' : [self.pu],
            'k' : [self.k],
            'r' : [self.r],
            'stats' : [self.stats]
            })
        return myRow

def countShapeDisoriginality(allPolygons, allEdges):
    compteur = 0
    for e in allEdges:
        e1 = int(e.split('_')[0])
        e2 = int(e.split('_')[1])
        if allPolygons[e1].shape == allPolygons[e2].shape:
            compteur = compteur + 1
    return round(compteur / len(allEdges), 4)

def addEntryToDatabase(filepathParquet, allPolygons, allEdges, templateName):
    stats = gatherStatistics(allPolygons, allEdges)
    print(stats)
    
    detailedStats = gatherDetailedStats(allPolygons, allEdges)
    print(detailedStats)
    
    theDate = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    rle = getRLEstring(allPolygons, allEdges)
    # b64 = getBase64FromRLE(rle)
    b64 = 'no b64'
    hash_id = hashlib.md5(('shortcut@mushrooms_' + str(rle)).encode('utf-8')).hexdigest()
    
    odi = OneDatabaseItem(theDate, hash_id, templateName, rle, b64, len(allPolygons), len(allEdges), stats['grey'], stats['blue'], stats['green'], stats['orange'], stats['purple'], stats['black'], stats['red'], str(detailedStats))
    myRow = odi.getRowPolars()
    if not os.path.isfile(filepathParquet):
        print('does not exist :', filepathParquet)
        
        myRow.to_pandas().to_parquet(filepathParquet, compression = 'snappy')
        with pd.ExcelWriter(filepathParquet.split('.')[0] + '.xlsx', engine='xlsxwriter') as writer:
            myRow.to_pandas().to_excel(writer, sheet_name = 'data', index = False, startrow = 0 , startcol = 0)
    else:
        database = pl.read_parquet(filepathParquet)
        database = pl.concat([database, myRow])
        database.to_pandas().to_parquet(filepathParquet, compression = 'snappy')
        with pd.ExcelWriter(filepathParquet.split('.')[0] + '.xlsx', engine='xlsxwriter') as writer:
            database.to_pandas().to_excel(writer, sheet_name = 'data', index = False, startrow = 0 , startcol = 0)
    print('database saved', filepathParquet)

"""def printJsonFromDatabase(filepathParquet, hash_id, folderpathTemplate, folderpathSvg):
    database = pl.read_parquet(filepathParquet)
    
    myRow = database.filter(pl.col('hash_id') == hash_id)
    odi = OneDatabaseItem(myRow['timestamp'][0], myRow['hash_id'][0], myRow['template'][0], myRow['rle'][0], myRow['b64'][0], myRow['p'][0], myRow['e'][0], myRow['y'][0], myRow['b'][0], myRow['g'][0], myRow['o'][0], myRow['k'][0], myRow['r'][0], myRow['stats'][0])
    
    # params, allPolygons, allEdges = readTemplate(folderpathTemplate + odi.template + '/' + odi.template + '.json')
    params, allPolygons, allEdges = readTemplate(folderpathTemplate + odi.template + '.json')
    allPolygons, allEdges = setPolygonsFromRLE(odi.rle, allPolygons, allEdges)
    
    saveSvg(params, allEdges, allPolygons, folderpathSvg + odi.filename)"""
    
def printSvgFromDatabase(filepathParquet, hash_id, folderpathTemplate, folderpathSvg):
    database = pl.read_parquet(filepathParquet)
    
    myRow = database.filter(pl.col('hash_id') == hash_id)
    odi = OneDatabaseItem(myRow['timestamp'][0], myRow['hash_id'][0], myRow['template'][0], myRow['rle'][0], myRow['b64'][0], myRow['p'][0], myRow['e'][0], myRow['y'][0], myRow['b'][0], myRow['g'][0], myRow['o'][0], myRow['u'][0], myRow['k'][0], myRow['r'][0], myRow['stats'][0])
    
    # params, allPolygons, allEdges = readTemplate(folderpathTemplate + odi.template + '/' + odi.template + '.json')
    params, allPolygons, allEdges = readTemplate(folderpathTemplate + odi.template + '.json')
    allPolygons, allEdges = setPolygonsFromRLE(odi.rle, allPolygons, allEdges)
    
    saveOnlySvg(params, allEdges, allPolygons, folderpathSvg + odi.filename, False)
    # saveOnlySvgWithCoordinates(params, allEdges, allPolygons, folderpathSvg + odi.filename, False)

def printPdfFromDatabase(filepathParquet, hash_id, folderpathTemplate, folderpathSvg):
    database = pl.read_parquet(filepathParquet)
    
    myRow = database.filter(pl.col('hash_id') == hash_id)
    odi = OneDatabaseItem(myRow['timestamp'][0], myRow['hash_id'][0], myRow['template'][0], myRow['rle'][0], myRow['b64'][0], myRow['p'][0], myRow['e'][0], myRow['y'][0], myRow['b'][0], myRow['g'][0], myRow['o'][0], myRow['u'][0], myRow['k'][0], myRow['r'][0], myRow['stats'][0])
    
    # params, allPolygons, allEdges = readTemplate(folderpathTemplate + odi.template + '/' + odi.template + '.json')
    params, allPolygons, allEdges = readTemplate(folderpathTemplate + odi.template + '.json')
    allPolygons, allEdges = setPolygonsFromRLE(odi.rle, allPolygons, allEdges)
    
    saveOnlySvg(params, allEdges, allPolygons, folderpathSvg + odi.filename, True)
    # saveOnlySvgWithCoordinates(params, allEdges, allPolygons, folderpathSvg + odi.filename, True)

def getHashesFromDatabase(filepathParquet):
    database = pl.read_parquet(filepathParquet)
    
    l1 = database['hash_id'].to_list()
    l2 = database['stats'].to_list()
    
    returnedDict = {}
    for i in range(0, len(l1)):
        returnedDict[l1[i]] = ast.literal_eval(l2[i])
    
    return returnedDict

def getHashesFromDatabase2(filepathParquet, earliestTimestamp):
    database = pl.read_parquet(filepathParquet)
    database = database.filter(pl.col('timestamp') > earliestTimestamp)
    
    l1 = database['hash_id'].to_list()
    l2 = database['stats'].to_list()
    
    returnedDict = {}
    for i in range(0, len(l1)):
        returnedDict[l1[i]] = ast.literal_eval(l2[i])
    
    return returnedDict


def printAllPdfFromDatabase(filepathParquet, folderpathTemplate, folderpathSvg):
    database = pl.read_parquet(filepathParquet)
    
    for myRow in database.rows():
        odi = OneDatabaseItem(myRow[database.columns.index('timestamp')], myRow[database.columns.index('hash_id')], myRow[database.columns.index('template')], myRow[database.columns.index('rle')], myRow[database.columns.index('b64')], myRow[database.columns.index('p')], myRow[database.columns.index('e')], myRow[database.columns.index('y')], myRow[database.columns.index('b')], myRow[database.columns.index('g')], myRow[database.columns.index('o')], myRow[database.columns.index('k')], myRow[database.columns.index('r')], ast.literal_eval(myRow[database.columns.index('stats')]))
                     
        params, allPolygons, allEdges = readTemplate(folderpathTemplate + odi.template + '/' + odi.template + '.json')
        allPolygons, allEdges = setPolygonsFromRLE(odi.rle, allPolygons, allEdges)
        
        saveOnlySvg(params, allEdges, allPolygons, folderpathSvg + odi.filename, True)

def printAllSvgFromDatabase(filepathParquet, folderpathTemplate, folderpathSvg):
    database = pl.read_parquet(filepathParquet)
    
    for myRow in database.rows():
        odi = OneDatabaseItem(myRow[database.columns.index('timestamp')], myRow[database.columns.index('hash_id')], myRow[database.columns.index('template')], myRow[database.columns.index('rle')], myRow[database.columns.index('b64')], myRow[database.columns.index('p')], myRow[database.columns.index('e')], myRow[database.columns.index('y')], myRow[database.columns.index('b')], myRow[database.columns.index('g')], myRow[database.columns.index('o')], myRow[database.columns.index('k')], myRow[database.columns.index('r')], ast.literal_eval(myRow[database.columns.index('stats')]))
                     
        params, allPolygons, allEdges = readTemplate(folderpathTemplate + odi.template + '/' + odi.template + '.json')
        allPolygons, allEdges = setPolygonsFromRLE(odi.rle, allPolygons, allEdges)
        
        saveOnlySvg(params, allEdges, allPolygons, folderpathSvg + odi.filename, False)

def removeHashFromDatabase(filepathParquet, hash_id):
    database = pl.read_parquet(filepathParquet)
    
    database = database.filter(pl.col('hash_id') != hash_id)
    
    database.to_pandas().to_parquet(filepathParquet, compression = 'snappy')
    with pd.ExcelWriter(filepathParquet.split('.')[0] + '.xlsx', engine='xlsxwriter') as writer:
        database.to_pandas().to_excel(writer, sheet_name = 'data', index = False, startrow = 0 , startcol = 0)

def cleanDatabase(filepathParquet):
    database = pl.read_parquet(filepathParquet)
    
    l1 = database['hash_id'].to_list()
    l2 = database['stats'].to_list()
    
    hashesDict = {}
    for i in range(0, len(l1)):
        hashesDict[l1[i]] = ast.literal_eval(l2[i])
        
    # remove not 1
    """for hash_id in hashesDict:
        # print(hash_id, 'orange' in hashesDict[h])
        if not 'orange' in hashesDict[hash_id]:
            # print(hashesDict[hash_id]['blue'], hashesDict[hash_id]['green'])
            # print(hashesDict[hash_id], len(hashesDict[hash_id]['blue']), len(hashesDict[hash_id]['green']))
            if len(hashesDict[hash_id]['blue']) > 1 or len(hashesDict[hash_id]['green']) > 1:
                if len(hashesDict[hash_id]['blue']) == 1 and len(hashesDict[hash_id]['green']) == 2:
                    if 3 in hashesDict[hash_id]['green'] and 4 in hashesDict[hash_id]['green'] and hashesDict[hash_id]['green'][4] <= 3:
                        pass
                    else:
                        database = database.filter(pl.col('hash_id') != hash_id)
                        print(hash_id, 'orange' in hashesDict[hash_id])
                elif len(hashesDict[hash_id]['blue']) == 2 and len(hashesDict[hash_id]['green']) == 1:
                    if 3 in hashesDict[hash_id]['blue'] and 4 in hashesDict[hash_id]['blue'] and hashesDict[hash_id]['blue'][4] <= 3:
                        pass
                    else:
                        database = database.filter(pl.col('hash_id') != hash_id)
                        print(hash_id, 'orange' in hashesDict[hash_id])
                else:
                    database = database.filter(pl.col('hash_id') != hash_id)
                    print(hash_id, 'orange' in hashesDict[hash_id])"""
    
    # remove orange
    for hash_id in hashesDict:
        # print(hash_id, 'orange' in hashesDict[h])
        if 'orange' in hashesDict[hash_id]:
            # print(hashesDict[hash_id], len(hashesDict[hash_id]['blue']), len(hashesDict[hash_id]['green']), len(hashesDict[hash_id]['orange']))
            # print(hash_id, max(hashesDict[hash_id]['grey'].keys()), max(hashesDict[hash_id]['blue'].keys()), max(hashesDict[hash_id]['green'].keys()), max(hashesDict[hash_id]['orange'].keys()), '///', min(hashesDict[hash_id]['grey'].keys()), min(hashesDict[hash_id]['blue'].keys()), min(hashesDict[hash_id]['green'].keys()), min(hashesDict[hash_id]['orange'].keys()))
            # if min(hashesDict[hash_id]['grey'].keys()) == 1 or min(hashesDict[hash_id]['blue'].keys()) == 1 or min(hashesDict[hash_id]['green'].keys()) == 1 or min(hashesDict[hash_id]['orange'].keys()) == 1:
                # database = database.filter(pl.col('hash_id') != hash_id)
                # print(hash_id, 'orange' in hashesDict[hash_id])
            if max(hashesDict[hash_id]['grey'].keys()) > 4 or max(hashesDict[hash_id]['blue'].keys()) > 4 or max(hashesDict[hash_id]['green'].keys()) > 4 or max(hashesDict[hash_id]['orange'].keys()) > 4 or max(hashesDict[hash_id]['purple'].keys()) > 4:
                database = database.filter(pl.col('hash_id') != hash_id)
                print(hash_id, 'orange' in hashesDict[hash_id])
    
    database.to_pandas().to_parquet(filepathParquet, compression = 'snappy')
    with pd.ExcelWriter(filepathParquet.split('.')[0] + '.xlsx', engine='xlsxwriter') as writer:
        database.to_pandas().to_excel(writer, sheet_name = 'data', index = False, startrow = 0 , startcol = 0)

class ShapeWithCoord(object):
    def __init__(self, poly : Polygon):
        self.poly = poly
        self.groupName = ''
        self.polyName = ''

def getSortedIndices(allPolygons):
    myList = []
    for idPoly in allPolygons:
        myList.append(allPolygons[idPoly].center[1] * 1000000 + allPolygons[idPoly].center[0])
    sort_index = [i for i, x in sorted(enumerate(myList), key=lambda x: x[1])]
    return sort_index

def fillShapeWithCoord(allPolygons, allEdges):
    allSwc = {}
    
    sort_index = getSortedIndices(allPolygons)
    
    for idPoly in allPolygons:
        allSwc[idPoly] = ShapeWithCoord(allPolygons[idPoly])
    
    myDictUseful = {}
    myDictUseful['green'] = 'g'
    myDictUseful['blue'] = 'b'
    myDictUseful['orange'] = 'o'
    myDictUseful['purple'] = 'p'
    myDictUseful['grey'] = 'y'
    
    myDictOfColors = {}
    myDictOfColors['g'] = 'A'
    myDictOfColors['b'] = 'A'
    myDictOfColors['o'] = 'A'
    myDictOfColors['p'] = 'A'
    myDictOfColors['y'] = 'A'
    
    for idPoly in sort_index:
        # print(idPoly)
        swc = allSwc[idPoly]
        if swc.groupName == '':
            swc.groupName = myDictUseful[swc.poly.color] # = 'g'
            swc.groupName = swc.groupName + myDictOfColors[swc.groupName] # = 'g' + 'A'
            # if myDictUseful[swc.poly.color] == 'y':
                # print(myDictOfColors[myDictUseful[swc.poly.color]], ord(myDictOfColors[myDictUseful[swc.poly.color]]), chr(ord(myDictOfColors[myDictUseful[swc.poly.color]]) + 1))
            myDictOfColors[myDictUseful[swc.poly.color]] = chr(ord(myDictOfColors[myDictUseful[swc.poly.color]]) + 1)
            while myDictOfColors[myDictUseful[swc.poly.color]] in ['_', '[', ']', '^', '[', '`', '\\']:
                myDictOfColors[myDictUseful[swc.poly.color]] = chr(ord(myDictOfColors[myDictUseful[swc.poly.color]]) + 1)
            swc.polyName = '1'
            polyNameNumber = 2
            nbModif = 1
            while nbModif > 0:
                nbModif = 0
                for p_id in sort_index:
                    if allSwc[p_id].groupName == swc.groupName:
                        for q_id in allSwc[p_id].poly.neighbours:
                            if allSwc[q_id].poly.color == allSwc[p_id].poly.color and allEdges[str(min(q_id, p_id)) + '_' + str(max(q_id, p_id))].color != 'red':
                                if allSwc[q_id].groupName == '':
                                    nbModif = nbModif + 1
                                    allSwc[q_id].groupName = swc.groupName
                                    allSwc[q_id].polyName = str(polyNameNumber)
                                    polyNameNumber = polyNameNumber + 1
    for idPoly in allPolygons:
        allPolygons[idPoly].name = allSwc[idPoly].groupName + allSwc[idPoly].polyName
    for idEdge in allEdges:
        a, b = idEdge.split('_')
        allEdges[idEdge].name = allPolygons[int(a)].name + '_' + allPolygons[int(b)].name
        
    return allSwc

def drawCoordinates(ctx, allPolygons, allSwc):
    ctx.set_font_size(5)
    ctx.select_font_face('DejaVuSans', cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    
    for idPoly in allPolygons:
        ctx.move_to(allPolygons[idPoly].center[0] - 5, allPolygons[idPoly].center[1] + 2)
        # ctx.show_text('o' + str(idPoly))
        ctx.show_text(allSwc[idPoly].groupName + allSwc[idPoly].polyName)
        # if idPoly == 0:
        #     print(len(allPolygons[idPoly].neighbours))

def getHash(allPolygons, allEdges):
    rle = getRLEstring(allPolygons, allEdges)
    hash_id = hashlib.md5(('shortcut@mushrooms_' + str(rle)).encode('utf-8')).hexdigest()
    return hash_id

def saveOnlySvgWithCoordinates(params, allEdges, allPolygons, name, onlyPdf = False):
    # width, height = aptbs.width, aptbs.height
    # params = Params(aptbs.D)    
    
    print('saving ', name)
    hash_id = getHash(allPolygons, allEdges)
    
    if onlyPdf == False:
        with cairo.SVGSurface(name + '.svg', params.width, params.height) as surface:
            ctx = cairo.Context(surface)    
            drawFirstRectangle(ctx, params.width, params.height)
            drawAndfillAllPolygons(ctx, allPolygons)
            drawAllEdges(ctx, allPolygons, allEdges)
            
            # printAllIds(ctx)
            
            drawLastRectangle(ctx, params.width, params.height)
            
            setColorFromString(ctx, 'white')
            # Courier Purisa Arial DejaVuSans DejaVuSans-ExtraLight "fc-list" FONT_WEIGHT_BOLD
            ctx.select_font_face('DejaVuSans-ExtraLight', cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
            ctx.set_font_size(8.5)
            ctx.move_to(params.width - 220, params.height - 5)
            ctx.show_text(hash_id)
            
            allSwc = fillShapeWithCoord(allPolygons, allEdges)
            
            # drawCoordinates(ctx, allPolygons, allSwc)
            
            # surface.write_to_png(name + '_pic.png')
    else:
        with cairo.PDFSurface(name + '.pdf', params.width, params.height) as surface:
            ctx = cairo.Context(surface)    
            drawFirstRectangle(ctx, params.width, params.height)
            drawAndfillAllPolygons(ctx, allPolygons)
            drawAllEdges(ctx, allPolygons, allEdges)
            
            # printAllIds(ctx)
            
            drawLastRectangle(ctx, params.width, params.height)
            
            setColorFromString(ctx, 'white')
            # Courier Purisa Arial DejaVuSans DejaVuSans-ExtraLight "fc-list" FONT_WEIGHT_BOLD
            ctx.select_font_face('DejaVuSans-ExtraLight', cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
            ctx.set_font_size(8.5)
            ctx.move_to(params.width - 220, params.height - 5)
            ctx.show_text(hash_id)
            
            allSwc = fillShapeWithCoord(allPolygons, allEdges)
            
            drawCoordinates(ctx, allPolygons, allSwc)

def boardToJson(params, allEdges, allPolygons, name):
    allSwc = fillShapeWithCoord(allPolygons, allEdges)
    """
    with open(name + '.json', 'w') as outfile:
        outfile.write(jsons.dumps(allPolygons) + '\n')
        outfile.write(jsons.dumps(allEdges))
    """
    
    numberToId = {}
    
    newAllPolygons = {}
    for id in allPolygons:
        newAllPolygons[allPolygons[id].name] = allPolygons[id]
        numberToId[id] = allPolygons[id].name
    
    for key in newAllPolygons:
        newNeighbours = []
        for e in newAllPolygons[key].neighbours:
            newNeighbours.append(numberToId[e])
        newAllPolygons[key].neighbours = newNeighbours
        
    newAllEdges = {}
    for id in allEdges:
        tab = allEdges[id].name.split('_')
        newAllEdges[min(tab) + '_' + max(tab)] = allEdges[id]
    
    for key in newAllPolygons:
        newAllPolygons[key].neighbors = []
        for e in newAllPolygons[key].neighbours:
            if newAllEdges[min([key, e]) + '_' + max([key, e])].color != 'red':
                newAllPolygons[key].neighbors.append(e)
        
    arr = name.split('_')
    with open(arr[0] + '_' + arr[1] + '_polys.json', 'w') as outfile:
        outfile.write(jsons.dumps(newAllPolygons) + '\n')
    with open(arr[0] + '_' + arr[1] + '_edges.json', 'w') as outfile:
        outfile.write(jsons.dumps(newAllEdges))

def printJsonFromDatabase(filepathParquet, hash_id, folderpathTemplate, folderpathSvg):
    database = pl.read_parquet(filepathParquet)
    
    myRow = database.filter(pl.col('hash_id') == hash_id)
    odi = OneDatabaseItem(myRow['timestamp'][0], myRow['hash_id'][0], myRow['template'][0], myRow['rle'][0], myRow['b64'][0], myRow['p'][0], myRow['e'][0], myRow['y'][0], myRow['b'][0], myRow['g'][0], myRow['o'][0], myRow['u'][0], myRow['k'][0], myRow['r'][0], myRow['stats'][0])
    
    # params, allPolygons, allEdges = readTemplate(folderpathTemplate + odi.template + '/' + odi.template + '.json')
    params, allPolygons, allEdges = readTemplate(folderpathTemplate + odi.template + '.json')
    allPolygons, allEdges = setPolygonsFromRLE(odi.rle, allPolygons, allEdges)
    
    # boardToJson(params, allEdges, allPolygons, folderpathSvg + odi.filename)
    boardToJson2(params, allEdges, allPolygons, folderpathSvg + odi.filename)

class Piece(object):
    def __init__(self, id, type, color, position):
        self.id = id
        self.type = type
        self.color = color
        self.position = position

class Board(object):
    def __init__(self, width, height, numberToId, idToNumber, allPolygons, allEdges, dist_matrix):
        # self.D = D
        self.width = width
        self.height = height
        self.numberToName = numberToId
        self.nameToNumber = idToNumber
        self.allPolygons = allPolygons
        self.allEdges = allEdges
        self.distMatrix = dist_matrix
        self.allPieces = self.initAllpieces()
    def initAllpieces(self):
        myDict = {}
        for i in range(0, 20):
            p = Piece('yellow_soldier_' + str(i), 'soldier', 'yellow', 'returned')
            myDict[p.id] = p
            p = Piece('white_soldier_' + str(i), 'soldier', 'white', 'returned')
            myDict[p.id] = p
        for i in range(0, 3):
            p = Piece('yellow_bishop_' + str(i), 'bishop', 'yellow', 'returned')
            myDict[p.id] = p
            p = Piece('white_bishop_' + str(i), 'bishop', 'white', 'returned')
            myDict[p.id] = p
        for i in range(0, 2):
            p = Piece('yellow_king_' + str(i), 'king', 'yellow', 'returned')
            myDict[p.id] = p
            p = Piece('white_king_' + str(i), 'king', 'white', 'returned')
            myDict[p.id] = p
        for i in range(0, 3):
            p = Piece('yellow_mage_' + str(i), 'mage', 'yellow', 'returned')
            myDict[p.id] = p
            p = Piece('white_mage_' + str(i), 'mage', 'white', 'returned')
            myDict[p.id] = p
        for i in range(0, 1):
            p = Piece('yellow_siren_' + str(i), 'siren', 'yellow', 'returned')
            myDict[p.id] = p
            p = Piece('white_siren_' + str(i), 'siren', 'white', 'returned')
            myDict[p.id] = p
        for i in range(0, 5):
            p = Piece('yellow_ghoul_' + str(i), 'ghoul', 'yellow', 'returned')
            myDict[p.id] = p
            p = Piece('white_ghoul_' + str(i), 'ghoul', 'white', 'returned')
            myDict[p.id] = p
        return myDict
        
def boardToJson2(params, allEdges, allPolygons, name):
    allSwc = fillShapeWithCoord(allPolygons, allEdges)
    
    # -----------------------------------------------------------
    
    import numpy as np
    from scipy.sparse import csr_matrix
    from scipy.sparse.csgraph import floyd_warshall
    
    myArray = np.ones((len(allPolygons), len(allPolygons))) * 100000
    myMatrix = csr_matrix(myArray)
    
    for k in allPolygons:
        myMatrix[k, k] = 0
        for n in allPolygons[k].neighbours:
            # print(k, n)
            myMatrix[k, n] = 1
            myMatrix[n, k] = 1
            
    dist_matrix = floyd_warshall(csgraph = myMatrix, directed = False, return_predecessors = False)
            
    # -----------------------------------------------------------
    
    numberToId = {}
    idToNumber = {}
    
    newAllPolygons = {}
    for id in allPolygons:
        newAllPolygons[allPolygons[id].name] = allPolygons[id]
        numberToId[id] = allPolygons[id].name
        idToNumber[allPolygons[id].name] = id
    
    for key in newAllPolygons:
        newNeighbours = []
        for e in newAllPolygons[key].neighbours:
            newNeighbours.append(numberToId[e])
        newAllPolygons[key].neighbours = newNeighbours
        
    newAllEdges = {}
    for id in allEdges:
        tab = allEdges[id].name.split('_')
        newAllEdges[min(tab) + '_' + max(tab)] = allEdges[id]
    
    for key in newAllPolygons:
        newAllPolygons[key].neighbors = []
        for e in newAllPolygons[key].neighbours:
            if newAllEdges[min([key, e]) + '_' + max([key, e])].color != 'red':
                newAllPolygons[key].neighbors.append(e)
    
    myBoard = Board(params.width, params.height, numberToId, idToNumber, newAllPolygons, newAllEdges, dist_matrix)
    
    arr = name.split('_')
    with open(arr[0] + '_' + arr[1] + '_board.json', 'w') as outfile:
        outfile.write(jsons.dumps(myBoard) + '\n')   























