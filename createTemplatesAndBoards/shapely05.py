#!/home/mat/Bureau/spyder-env/bin/python
# -*- coding: utf-8 -*-
"""
Created on Wed Mar 20 09:25:40 2024

@author: mat
"""

import sys
import shapely
from shapely import Point, Polygon, GeometryCollection
import numpy as np
import math
import cmath
import random as ran
import jsons
import datetime

"""
A2 : 42 x 59,4 // 1,4142
"""

"""
myWidth = 707
myHeight = 500
"""

"""
myWidth = 520
myHeight = 500
"""

myWidth = 410
myHeight = 410

if len(sys.argv) > 1:
    myWidth = int(sys.argv[1])
    myHeight = int(sys.argv[2])

# https://en.wikipedia.org/wiki/Planigon

pi = math.pi
# e = math.e

alpha = 1.0 # size of vertice
beta = math.sqrt(3.0) * alpha 
sigma = 2 * alpha / (beta * (2.0 / 3.0))

allCenterModifiers = {}
listOfIdsToChooseFrom = []

# ==========================================================================================

class Params(object):
    def __init__(self, k, width, height):
        self.k = k
        self.width = width
        self.height = height
        self.omega = [self.width / 2.0, self.height / 2.0]

# params = Params(10.5, 707, 500)
params = Params(10.8, myWidth, myHeight)

# board = Polygon([(0, 0), (myWidth, 0), (myWidth, myHeight), (0, myHeight)])
myMargin = 5
board = Polygon([(myMargin, myMargin), (myWidth-myMargin, myMargin), (myWidth-myMargin, myHeight-myMargin), (myMargin, myHeight-myMargin)])

# ==========================================================================================

colors = {}
colors['white'] = [255/255.0, 255/255.0, 255/255.0]
colors['black'] = [0/255.0, 0/255.0, 0/255.0]
colors['red'] = [255/255.0, 0/255.0, 0/255.0]
colors['green'] = [0/255.0, 204/255.0, 82/255.0]
colors['blue'] = [0/255.0, 100/255.0, 255/255.0]
colors['pink'] = [255/255.0, 165/255.0, 255/255.0]
colors['orange'] = [255/255.0, 180/255.0, 0/255.0]
colors['grey'] = [210/255.0, 210/255.0, 210/255.0]
colors['purple'] = [152/255.0, 0/255.0, 153/255.0]

# ==========================================================================================

shapes = ['hexagon', 'square', 'pentagon1', 'pentagon2']
shapes = ['hexagon', 'hexagon', 'hexagon', 'square', 'pentagon1', 'pentagon1', 'pentagon2']
# shapes = ['hexagon', 'pentagon1', 'pentagon2']

myColors = ['white', 'green', 'blue', 'grey', 'orange']

# ==========================================================================================

allCenterModifiers['hexagon'] = []
allCenterModifiers['hexagon'].append([beta, alpha])
allCenterModifiers['hexagon'].append([0, 2 * alpha])
allCenterModifiers['hexagon'].append([-beta, alpha])
allCenterModifiers['hexagon'].append([-beta, -alpha])
allCenterModifiers['hexagon'].append([0, -2 * alpha])
allCenterModifiers['hexagon'].append([beta,-alpha])

allCenterModifiers['square'] = []
allCenterModifiers['square'].append([sigma * alpha, sigma * alpha])
allCenterModifiers['square'].append([sigma * alpha, -sigma * alpha])
allCenterModifiers['square'].append([-sigma * alpha, -sigma * alpha])
allCenterModifiers['square'].append([-sigma * alpha, sigma * alpha])

va = cmath.rect(sigma * beta * (2.0 / 3.0), math.pi * (0 - 90) / 180.0)
vb = cmath.rect(sigma * alpha * math.sqrt(2.0), math.pi * (75 - 90) / 180.0)
vc = cmath.rect(sigma * beta * (2.0 / 3.0), math.pi * (150 - 90) / 180.0)
vd = cmath.rect(sigma * beta * (2.0 / 3.0), math.pi * (-150 - 90) / 180.0)
ve = cmath.rect(sigma * alpha * math.sqrt(2.0), math.pi * (-75 - 90) / 180.0)

allCenterModifiers['pentagon1'] = []
allCenterModifiers['pentagon1'].append([va.real, va.imag])
allCenterModifiers['pentagon1'].append([vb.real, vb.imag])
allCenterModifiers['pentagon1'].append([vc.real, vc.imag])
allCenterModifiers['pentagon1'].append([vd.real, vd.imag])
allCenterModifiers['pentagon1'].append([ve.real, ve.imag])

va = cmath.rect(sigma * alpha * math.sqrt(2.0), math.pi * (-45 - 90) / 180.0)
vb = cmath.rect(sigma * alpha * math.sqrt(2.0), math.pi * (45 - 90) / 180.0)
vc = cmath.rect(sigma * beta * (2.0 / 3.0), math.pi * (120 - 90) / 180.0)
vd = cmath.rect(sigma * beta * (2.0 / 3.0), math.pi * (180 - 90) / 180.0)
ve = cmath.rect(sigma * beta * (2.0 / 3.0), math.pi * (-120 - 90) / 180.0)

# lastShape is a pentagon
allCenterModifiers['pentagon2'] = []
allCenterModifiers['pentagon2'].append([va.real, va.imag])
allCenterModifiers['pentagon2'].append([vb.real, vb.imag])
allCenterModifiers['pentagon2'].append([vc.real, vc.imag])
allCenterModifiers['pentagon2'].append([vd.real, vd.imag])
allCenterModifiers['pentagon2'].append([ve.real, ve.imag])

# ==========================================================================================

class myPolygon(object):
    def __init__(self, shape, id):
        self.id = id
        self.shape = shape
        self.edges = []
        self.center = None
        self.edges_C = []
        self.center_C = None
        self.color = 'white'
        self.neighbours = []
        self.polygon = None
        self.twin = None
        self.isTwin = False
    
    def setPointsFromCenter(self, center):
        self.center = center
        for pair in allCenterModifiers[self.shape]:
            self.edges.append((self.center[0] + pair[0], self.center[1] + pair[1]))
        self.edges_C = [complex(a, b) for (a, b) in self.edges]
        self.center_C = complex(self.center[0], self.center[1])
        self.polygon = Polygon(self.edges)
        self.scale(params.k)
    
    def setComplex(self):
        self.edges_C = [complex(a, b) for (a, b) in self.edges]
        self.center_C = complex(self.center[0], self.center[1])
        # self.edges = [(x.real, x.imag) for x in self.edges_C]
        # self.center = (self.center_C.real, self.center_C.imag)
        self.polygon = Polygon(self.edges)
    
    def setCartesian(self):
        self.edges = [(x.real, x.imag) for x in self.edges_C]
        self.center = (self.center_C.real, self.center_C.imag)
        self.polygon = Polygon(self.edges)
        # self.edges_C = [complex(a, b) for (a, b) in self.edges]
        # self.center_C = complex(self.center[0], self.center[1])
    
    def setPolygon(self):
        self.polygon = Polygon(self.edges)
    
    def scale(self, k):
        self.edges_C = [x * k for x in self.edges_C]
        self.center_C = self.center_C * k
        self.edges = [(x.real, x.imag) for x in self.edges_C]
        self.center = (self.center_C.real, self.center_C.imag)
        self.polygon = Polygon(self.edges)
    
    def translate(self, z):
        self.edges_C = [x + z for x in self.edges_C]
        self.center_C = self.center_C + z
        self.edges = [(x.real, x.imag) for x in self.edges_C]
        self.center = (self.center_C.real, self.center_C.imag)
        self.polygon = Polygon(self.edges)
    
    def rotate(self, z, theta):
        self.edges_C = [cmath.rect(1, theta) * (x - z) + z for x in self.edges_C]
        self.center_C = cmath.rect(1, theta) * (self.center_C - z) + z
        self.edges = [(x.real, x.imag) for x in self.edges_C]
        self.center = (self.center_C.real, self.center_C.imag)
        self.polygon = Polygon(self.edges)
    
    def clone(self):
        newPolygon = myPolygon(self.shape, -1)
        # newPolygon.edges_C = [x for x in self.edges_C]
        newPolygon.edges_C = [complex(x.real, x.imag) for x in self.edges_C]
        newPolygon.center_C = complex(self.center_C.real, self.center_C.imag)
        newPolygon.color = 'white'
        newPolygon.setCartesian()
        # newPolygon.twin = self.twin
        # newPolygon.setPolygon()
        return newPolygon
    """
    def toTwin(self):
        self.edges_C = [cmath.rect(1, theta) * (x - z) + z for x in self.edges_C]
        self.center_C = cmath.rect(1, theta) * (self.center_C - z) + z
        self.edges = [(x.real, x.imag) for x in self.edges_C]
        self.center = (self.center_C.real, self.center_C.imag)
        self.polygon = Polygon(self.edges)
    """
    def getTranslationXY(self, direction, targetShape):
        v = [0, 0]
        direction = direction - 90.0
        if self.shape == 'hexagon':
            if targetShape == 'hexagon':
                v = cmath.rect(beta + beta, math.pi * direction / 180.0)
            elif targetShape == 'pentagon1':
                v = cmath.rect(beta + alpha * sigma, math.pi * direction / 180.0)
            elif targetShape == 'pentagon2':
                v = cmath.rect(beta +  alpha * sigma, math.pi * direction / 180.0)
            elif targetShape == 'square':
                v = cmath.rect(beta +  alpha * sigma, math.pi * direction / 180.0)
        elif self.shape == 'pentagon1':
            if targetShape == 'hexagon':
                v = cmath.rect(alpha * sigma + beta, math.pi * direction / 180.0)
            elif targetShape == 'pentagon1':
                v = cmath.rect(alpha * sigma +  alpha * sigma, math.pi * direction / 180.0)
            elif targetShape == 'pentagon2':
                v = cmath.rect(alpha * sigma +  alpha * sigma, math.pi * direction / 180.0)
            elif targetShape == 'square':
                v = cmath.rect(alpha * sigma +  alpha * sigma, math.pi * direction / 180.0)
        elif self.shape == 'pentagon2':
            if targetShape == 'square':
                v = cmath.rect(alpha * sigma + alpha * sigma, math.pi * direction / 180.0)
            elif targetShape == 'hexagon':
                v = cmath.rect(alpha * sigma + alpha * sigma, math.pi * direction / 180.0)
            elif targetShape == 'pentagon1':
                v = cmath.rect(alpha * sigma + alpha * sigma, math.pi * direction / 180.0)
            elif targetShape == 'pentagon2':
                v = cmath.rect(alpha * sigma + alpha * sigma, math.pi * direction / 180.0)
        elif self.shape == 'square':
            if targetShape == 'square':
                v = cmath.rect(alpha * sigma + alpha * sigma, math.pi * direction / 180.0)
            elif targetShape == 'hexagon':
                v = cmath.rect(alpha * sigma + alpha * sigma, math.pi * direction / 180.0)
            elif targetShape == 'pentagon1':
                v = cmath.rect(alpha * sigma + alpha * sigma, math.pi * direction / 180.0)
            elif targetShape == 'pentagon2':
                v = cmath.rect(alpha * sigma + alpha * sigma, math.pi * direction / 180.0)
        # return (v.real + self.center[0], v.imag + self.center[1])
        return (v.real, v.imag)
    
"""
def createRegularPolygon(nEdges):
    # interiorAngle = (nEdges - 2) * pi / nEdges
    firstPoint = cmath.rect(alpha, pi / nEdges)
    points = []
    for n in range(nEdges):
        # angle = pi / nEdges + n * interiorAngle
        theta = n * 2 * pi / nEdges
        z = firstPoint * cmath.rect(1, theta)
        points.append(z)
    p = myPolygon('p_' + str(nEdges), 0)
    p.center_C = complex(0, 0)
    p.edges_C = points
    p.setCartesian()
    p.setPolygon()
    allPolygons.append(p)
    return p

# myPolygon02 = createRegularPolygon(3)
# myPolygon02 = createRegularPolygon(4)
# myPolygon02 = createRegularPolygon(5)
# myPolygon02 = createRegularPolygon(6)
# myPolygon02 = createRegularPolygon(8)
"""

def nbCommonVertices(tab1, tab2):
  common_vertices = 0
  for a in tab1:
      for b in tab2:
          if math.dist(a, b) < 0.00001:
              common_vertices += 1
  return common_vertices

# ==========================================================================================

def chooseNextShapeA(polygonId):
    polygonSource = allPolygons[polygonId]
    
    proposedShape = ran.choice(shapes)
    newPolygon = myPolygon(proposedShape, len(allPolygons))
    newPolygon.setPointsFromCenter((0, 0))
    newPolygon.color = ran.choice(list(colors.keys()))
    # newPolygon.translate(complex(params.omega[0], params.omega[1]))
    newPolygon.translate(polygonSource.center_C)
    
    
    positionFound = False
    iChosen = -1
    jChosen = -1
    maxNbCommonVertices = 1
    for i in range(0, 12):
        for j in range(0, 12):
            tra = polygonSource.getTranslationXY(j * 30.0, proposedShape)
            myPolygonTemp = newPolygon.clone()
            myPolygonTemp.translate(complex(tra[0] * params.k, tra[1] * params.k))
            myPolygonTemp.rotate(myPolygonTemp.center_C, i * pi/6)
            
            if myPolygonTemp.polygon.within(board):
                
                intersect = False
                for z in allPolygons:
                    if not intersect:
                        if myPolygonTemp.polygon.intersects(z.polygon):
                            if myPolygonTemp.polygon.intersection(z.polygon).area > 0.001:
                                intersect = True
                                # print('intersect with', z.id)
                
                if not intersect:
                    nbCV_total = 0
                    for z in allPolygons:
                        nbCV_total = nbCV_total + nbCommonVertices(myPolygonTemp.edges, z.edges)
                    if nbCV_total > maxNbCommonVertices:
                        maxNbCommonVertices = nbCV_total
                        positionFound = True
                        iChosen = i
                        jChosen = j
        # print('\t ==> intersect =',intersect)
    return positionFound, proposedShape, iChosen, jChosen

def chooseNextShapeB(polygonId):
    polygonSource = allPolygons[polygonId]
    
    positionFound = False
    iChosen = -1
    jChosen = -1
    maxNbCommonVertices = 1
    bestProposedShape = None

    # shapeSample = ran.sample(shapes, len(shapes) - 2)    
    ran.shuffle(shapes)
    for proposedShape in shapes:
        newPolygon = myPolygon(proposedShape, len(allPolygons))
        newPolygon.setPointsFromCenter((0, 0))
        newPolygon.color = ran.choice(list(colors.keys()))
        # newPolygon.translate(complex(params.omega[0], params.omega[1]))
        newPolygon.translate(polygonSource.center_C)
        
        for i in range(0, 12):
            for j in range(0, 12):
                tra = polygonSource.getTranslationXY(j * 30.0, proposedShape)
                myPolygonTemp = newPolygon.clone()
                myPolygonTemp.translate(complex(tra[0] * params.k, tra[1] * params.k))
                myPolygonTemp.rotate(myPolygonTemp.center_C, i * pi/6)
                
                if myPolygonTemp.polygon.within(board):
                    
                    intersect = False
                    for z in allPolygons:
                        if not intersect:
                            if myPolygonTemp.polygon.intersects(z.polygon):
                                if myPolygonTemp.polygon.intersection(z.polygon).area > 0.001:
                                    intersect = True
                                    # print('intersect with', z.id)
                    
                    if not intersect:
                        nbCV_total = 0
                        for z in allPolygons:
                            nbCV_total = nbCV_total + nbCommonVertices(myPolygonTemp.edges, z.edges)
                        if nbCV_total > maxNbCommonVertices:
                            maxNbCommonVertices = nbCV_total
                            positionFound = True
                            iChosen = i
                            jChosen = j
                            bestProposedShape = proposedShape
            # print('\t ==> intersect =',intersect)
    return positionFound, bestProposedShape, iChosen, jChosen

def chooseNextShapeC(polygonIds):
    positionFound = False
    iChosen = -1
    jChosen = -1
    maxNbCommonVertices = 1
    bestProposedShape = None
    chosenPolygonId = -1
    
    for polygonId in polygonIds:
        polygonSource = allPolygons[polygonId]

        # shapeSample = ran.sample(shapes, len(shapes) - 2)    
        ran.shuffle(shapes)
        for proposedShape in shapes:
            newPolygon = myPolygon(proposedShape, len(allPolygons))
            newPolygon.setPointsFromCenter((0, 0))
            newPolygon.color = ran.choice(list(colors.keys()))
            # newPolygon.translate(complex(params.omega[0], params.omega[1]))
            newPolygon.translate(polygonSource.center_C)
            
            for i in range(0, 12):
                for j in range(0, 12):
                    tra = polygonSource.getTranslationXY(j * 30.0, proposedShape)
                    myPolygonTemp = newPolygon.clone()
                    myPolygonTemp.translate(complex(tra[0] * params.k, tra[1] * params.k))
                    myPolygonTemp.rotate(myPolygonTemp.center_C, i * pi/6)
                    
                    if myPolygonTemp.polygon.within(board):
                        
                        intersect = False
                        for z in allPolygons:
                            if not intersect:
                                if myPolygonTemp.polygon.intersects(z.polygon):
                                    if myPolygonTemp.polygon.intersection(z.polygon).area > 0.001:
                                        intersect = True
                                        # print('intersect with', z.id)
                        
                        if not intersect:
                            nbCV_total = 0
                            for z in allPolygons:
                                nbCV_total = nbCV_total + nbCommonVertices(myPolygonTemp.edges, z.edges)
                            if nbCV_total > maxNbCommonVertices:
                                maxNbCommonVertices = nbCV_total
                                positionFound = True
                                iChosen = i
                                jChosen = j
                                bestProposedShape = proposedShape
                                chosenPolygonId = polygonId
                # print('\t ==> intersect =',intersect)
    return chosenPolygonId, positionFound, bestProposedShape, iChosen, jChosen

def constructTwin(polygonId):    
    polygonSource = allPolygons[polygonId]
    newPolygon = polygonSource.clone()
    newPolygon.color = ran.choice(myColors)
    newPolygon.rotate(complex(params.omega[0], params.omega[1]), pi)
    newPolygon.isTwin = True
    
    return newPolygon

# ==========================================================================================

def mergeClosePointsB(radius):
    allTwinPoint = []
    twinPoint = {}
    
    # [p.id for p in allPolygons][:10]
    
    allPoints = []
    for p in allPolygons:
        allPoints.extend(p.edges)
        if p.twin is not None:
            allTwinPoint.extend(p.twin.edges)
        else:
            allTwinPoint.extend(p.edges)
    
    # z = complex(params.omega[0], params.omega[1])
    for i in range(0, len(allPoints)):
        twinPoint[allPoints[i]] = allTwinPoint[i]
        twinPoint[allTwinPoint[i]] = allPoints[i]
        # za = complex(allPoints[i][0], allPoints[i][1])
        # zb = complex(twinPoint[allPoints[i]][0], twinPoint[allPoints[i]][1])
        # zc = cmath.rect(1, pi) * (za - z) + z
        # print(math.dist((zb.real, zb.imag), (zc.real, zc.imag)), zb, zc)
    
    countAllPoints = {}
    for e in allPoints:
        if e in countAllPoints:
            countAllPoints[e] = countAllPoints[e] + 1
        else:
            countAllPoints[e] = 1
        
    allPoints = list(set(allPoints))
    
    # sorted_items = sorted(countAllPoints.items(), key=lambda x: x[1], reverse=True)
    # sorted_keys = [x[0] for x in sorted_items]
    # sorted_items[:10]
    
    myDict = {}
    idAlreadyPicked = []
    for ia in range(0, len(allPoints)):
        if ia not in idAlreadyPicked:
            minDistance = radius
            ibChosen = -1
            for ib in range(0, len(allPoints)):
                if ib not in idAlreadyPicked:
                    if ia < ib:
                        d = math.dist(allPoints[ia], allPoints[ib])
                        if d > 0.1 and d < minDistance:
                            minDistance = d
                            ibChosen = ib
            if ibChosen != -1:
                if countAllPoints[allPoints[ia]] == countAllPoints[allPoints[ibChosen]]:
                    center = ((allPoints[ia][0] + allPoints[ibChosen][0]) / 2, (allPoints[ia][1] + allPoints[ibChosen][1]) / 2)
                elif countAllPoints[allPoints[ia]] > countAllPoints[allPoints[ibChosen]]:
                    center = allPoints[ia]
                else:
                    center = allPoints[ibChosen]
                myDict[allPoints[ia]] = center
                myDict[allPoints[ibChosen]] = center
                idAlreadyPicked.append(ia)
                idAlreadyPicked.append(ibChosen)
                
                da = twinPoint[allPoints[ia]]
                db = twinPoint[allPoints[ibChosen]]
                if countAllPoints[da] == countAllPoints[db]:
                    center = ((da[0] + db[0]) / 2, (da[1] + db[1]) / 2)
                elif countAllPoints[da] > countAllPoints[db]:
                    center = da
                else:
                    center = db
                myDict[da] = center
                myDict[db] = center
                idAlreadyPicked.append(allPoints.index(da))
                idAlreadyPicked.append(allPoints.index(db))
                
            
    print('merging ' + str(len(myDict)) + ' points')
    
    for p in allPolygons:
        reComputeEdge = False
        for a, b in myDict:
            if (a, b) in p.edges:
                # print((a, b), p.id, myDict[(a, b)])
                reComputeEdge = True
        if reComputeEdge:
            p.edges = [myDict.get(x, x) for x in p.edges]
            p.setComplex()
    
    for p in allPolygons:
        p.edges = [(round(a, 5), round(b, 5)) for (a, b) in p.edges]
        p.setComplex()
        
    return len(myDict)

def mergeClosePointsC(radius):
    allPoints = []
    for p in allPolygons:
        allPoints.extend(p.edges)
        
    countAllPoints = {}
    for e in allPoints:
        if e in countAllPoints:
            countAllPoints[e] = countAllPoints[e] + 1
        else:
            countAllPoints[e] = 1
        
    allPoints = list(set(allPoints))
        
    myDict = {}
    idAlreadyPicked = []
    for ia in range(0, len(allPoints)):
        if ia not in idAlreadyPicked:
            minDistance = radius
            ibChosen = -1
            for ib in range(0, len(allPoints)):
                if ib not in idAlreadyPicked:
                    if ia < ib:
                        d = math.dist(allPoints[ia], allPoints[ib])
                        if d > 0.1 and d < minDistance:
                            minDistance = d
                            ibChosen = ib
            if ibChosen != -1:
                if countAllPoints[allPoints[ia]] == countAllPoints[allPoints[ibChosen]]:
                    center = ((allPoints[ia][0] + allPoints[ibChosen][0]) / 2, (allPoints[ia][1] + allPoints[ibChosen][1]) / 2)
                elif countAllPoints[allPoints[ia]] > countAllPoints[allPoints[ibChosen]]:
                    center = allPoints[ia]
                else:
                    center = allPoints[ibChosen]
                myDict[allPoints[ia]] = center
                myDict[allPoints[ibChosen]] = center
                idAlreadyPicked.append(ia)
                idAlreadyPicked.append(ibChosen)
            
    print('merging ' + str(len(myDict)) + ' points')
    
    for p in allPolygons:
        reComputeEdge = False
        for a, b in myDict:
            if (a, b) in p.edges:
                reComputeEdge = True
        if reComputeEdge:
            p.edges = [myDict.get(x, x) for x in p.edges]
    
    for p in allPolygons:
        p.edges = [(round(a, 5), round(b, 5)) for (a, b) in p.edges]
        
    return len(myDict)

# ==========================================================================================

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
        
class oldPolygon(object):
    def __init__(self, shape, id):
        self.id = id
        self.shape = shape
        self.points = []
        self.center = None
        self.color = 'white'
        self.neighbours = []

def myFormat(myString, fillColor, strokeColor = 'black', myStrokeWidth = 1.0, myOpacity = 1.0):
    myString = myString.replace('fill="#66cc99"', 'fill="' + fillColor + '"')
    myString = myString.replace('stroke="#555555"', 'stroke="' + strokeColor + '"')
    myString = myString.replace('stroke-width="2.0"', 'stroke-width="' + str(myStrokeWidth) + '"')
    myString = myString.replace('stroke-width="1.0"', 'stroke-width="' + str(myStrokeWidth) + '"')
    myString = myString.replace('opacity="0.6"', 'opacity="' + str(myOpacity) + '"')
    
    return myString

# ==========================================================================================

for tryAndCreateTemplate in range(0, 1000): # 167
    
    shapes = ran.choice([
        ['hexagon', 'hexagon', 'hexagon', 'square', 'pentagon1', 'pentagon1', 'pentagon1', 'pentagon2'],
        ['hexagon', 'hexagon', 'hexagon', 'square', 'pentagon1', 'pentagon1', 'pentagon2'],
        ['hexagon', 'pentagon1', 'pentagon2'],
        ['hexagon', 'pentagon1', 'pentagon1', 'pentagon2', 'pentagon2'],
        ])
    
    allPolygons = []
    
    shapeFirstPolygon = ran.choice(['hexagon', 'hexagon', 'hexagon', 'square', 'square', 'square', 'square'])
    firstPolygon = myPolygon(shapeFirstPolygon, len(allPolygons))
    firstPolygon.setPointsFromCenter((0, 0))
    firstPolygon.color = ran.choice(myColors)
    
    print('shapeFirstPolygon =', shapeFirstPolygon)
    
    if shapeFirstPolygon == 'hexagon':
        if ran.random() > 0.5:
            firstPolygon.rotate(firstPolygon.center_C, pi/6)
            print('rotate pi/6')
    else:
        if ran.random() > 0.66:
            firstPolygon.rotate(firstPolygon.center_C, pi/6)
            print('rotate pi/6')
        elif ran.random() > 0.5:
            firstPolygon.rotate(firstPolygon.center_C, pi/3)
            print('rotate pi/3')
    
    firstPolygon.translate(complex(params.omega[0], params.omega[1]))
    # firstPolygon.rotate(firstPolygon.center_C, pi/6)
    
    allPolygons.append(firstPolygon)
    listOfIdsToChooseFrom = [0 for x in range(0, 7)]
    
    for i in range(0, 500):
        # idPolygonSource = ran.choice(range(0, len(allPolygons)))
        if len(listOfIdsToChooseFrom) > 1:
            # idPolygonSource = listOfIdsToChooseFrom.pop()
            # positionFound, proposedShape, iChosen, jChosen = chooseNextShapeB(idPolygonSource)
            
            ids = ran.sample(listOfIdsToChooseFrom, min(len(listOfIdsToChooseFrom), 5))
            idPolygonSource, positionFound, proposedShape, iChosen, jChosen = chooseNextShapeC(ids)
        
            if positionFound:
                listOfIdsToChooseFrom.remove(idPolygonSource)
                
                # listOfIdsToChooseFrom.append(idPolygonSource)
                # listOfIdsToChooseFrom.extend([idPolygonSource])
                
                polygonSource = allPolygons[idPolygonSource]
                
                newPolygon = myPolygon(proposedShape, len(allPolygons))
                newPolygon.setPointsFromCenter((0, 0))
                newPolygon.color = ran.choice(myColors)
                newPolygon.translate(polygonSource.center_C)
                
                tra = polygonSource.getTranslationXY(jChosen * 30.0, proposedShape)
                newPolygon.translate(complex(tra[0] * params.k, tra[1] * params.k))
                newPolygon.rotate(newPolygon.center_C, iChosen * pi/6)
                
                allPolygons.append(newPolygon)
                listOfIdsToChooseFrom.extend([newPolygon.id for x in range(0, ran.choice([1, 1, 2]))])
                # listOfIdsToChooseFrom.extend([newPolygon.id])
                
                twinPolygon = constructTwin(newPolygon.id)
                twinPolygon.id = len(allPolygons)
                allPolygons.append(twinPolygon)
                listOfIdsToChooseFrom.extend([twinPolygon.id for x in range(0, ran.choice([1, 1, 2]))])
                # listOfIdsToChooseFrom.extend([twinPolygon.id])
                
                twinPolygon.twin = newPolygon
                newPolygon.twin = twinPolygon
                
                ran.shuffle(listOfIdsToChooseFrom)
            else:
                for x in ids:
                    listOfIdsToChooseFrom.remove(x)
            
            # print(i, 'idPolygonSource =', idPolygonSource, positionFound, 'len(allPolygons) =', len(allPolygons), len(listOfIdsToChooseFrom))
    
    # -----------------------------------------------------------------------------------------
    
    d = 12
    sizeDict = mergeClosePointsC(d)
    while sizeDict > 0:
        sizeDict = mergeClosePointsC(d)
            
    for p in allPolygons:
        p.edges = [(round(a, 5), round(b, 5)) for (a, b) in p.edges]
        p.setComplex()
        if p.twin is not None:
            p.twin.color = p.color
    
    """for p in allPolygons:
        allPolygons[p].points = [[e[0], e[1]] for e in allPolygons[p].edges]
        allPolygons[p].edges = None"""

    # -----------------------------------------------------------------------------------------
    if len(allPolygons) > 90:
        compteur = 0
        anotherCompteur = 0
        for xa in range(40, params.width - 40):
            # print('xa =', xa)
            for xb in range(40, params.height - 40):
                anotherCompteur = anotherCompteur + 1.0
                point1 = shapely.geometry.Point(xa, xb)
                pointIsIn = False
                for p in allPolygons:
                    if not pointIsIn:
                        pointIsIn = p.polygon.contains(point1)
                if pointIsIn:
                    compteur = compteur + 1
        print(100 * compteur / anotherCompteur)
        ratio = (str(compteur / anotherCompteur) + '000000000'). split('.')[1]
        
        if ratio[:3] == '000':
            ratio = '999'

        if (compteur > (anotherCompteur - 2)) or (int(ratio[:3]) > 994):
            newAllPolygons = {}
            for p in allPolygons:
                newP = oldPolygon(p.shape, p.id)
                newP.points = p.edges
                newP.center = p.center
                newP.color = p.color
                newAllPolygons[newP.id] = newP
            
            print('A', len(newAllPolygons), len(allPolygons))
            
            idFileName = str(datetime.datetime.today())[:16][3:].replace('.', '').replace('-', '').replace(' ', '').replace(':', '') + '_' + str(len(allPolygons)) + '_' + ratio[:3]
            aptbs = AllPolyToBeSaved(params.width, params.height, params.k, newAllPolygons)
            aptbs.serialize('/home/mat/Bureau/lobby202511/createTemplatesAndBoards/newTemplates/nt_' + idFileName + '.json')
            
            print('B', len(newAllPolygons), len(allPolygons))
            
            with open('/home/mat/Bureau/lobby202511/createTemplatesAndBoards/newTemplates/nt_' + idFileName + '.svg', 'w') as f:
                f.write('<?xml version="1.0" encoding="UTF-8"?>')
                f.write('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + str(params.width) + 'pt" height="' + str(params.height) + 'pt" viewBox="0 0 ' + str(params.width) + ' ' + str(params.height) + '" version="1.1">')
                f.write('<rect x="0" y="0" width="' + str(params.width) + '" height="' + str(params.height) + '" style="fill:rgb(00%,00%,00%);fill-opacity:0.9;stroke:none;"/>')
                # -----------------------------------------------
                for p in allPolygons:
                    f.write(myFormat(p.polygon.svg(), p.color, myStrokeWidth = 3.0))
                # -----------------------------------------------
                f.write('</svg>')
        
    print('C', len(allPolygons))


