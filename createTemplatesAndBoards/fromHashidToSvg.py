#!/home/mat/Bureau/spyder-env/bin/python
# -*- coding: utf-8 -*-
"""
Created on Wed Aug 23 16:27:49 2023

@author: mat
"""

import os
import glob

folder = '/home/mat/Bureau/lobby202511/createTemplatesAndBoards/'
os.chdir(folder)
print('os.getcwd() :', os.getcwd())

from utilsPoly_202405 import printSvgFromDatabase, printPdfFromDatabase, getHashesFromDatabase, printAllPdfFromDatabase, printJsonFromDatabase, printAllSvgFromDatabase, removeHashFromDatabase, cleanDatabase

filepathParquet = folder + 'database/database.parquet'
hash_id = 'e198bbbcec5bb294d5852da565fd42d7'
# folderpathTemplate = folder + 'allTemplates/'
folderpathTemplate = folder + 'newTemplates/'
folderpathSvg = folder + 'randomBoards/'

"""
gs -dSAFER \
-dBATCH \
-dNOPAUSE \
-sDEVICE=pdfwrite  \
-sColorConversionStrategy=CMYK  \
-sOutputFile=fileA_cmyk.pdf fileA.pdf
"""

# removeHashFromDatabase(filepathParquet, 'd2bf5a3bd0c551b53fd11547fce43939')

# print(getHashesFromDatabase(filepathParquet))
# printSvgFromDatabase(filepathParquet, hash_id, folderpathTemplate, folderpathSvg)
# printPdfFromDatabase(filepathParquet, hash_id, folderpathTemplate, folderpathSvg)
# printAllPdfFromDatabase(filepathParquet, folderpathTemplate, folderpathSvg)

# printJsonFromDatabase(filepathParquet, '374a567252729f82388fa2c6b437e638', folderpathTemplate, folderpathSvg)
# printPdfFromDatabase(filepathParquet, '374a567252729f82388fa2c6b437e638', folderpathTemplate, folderpathSvg)
# printPdfFromDatabase(filepathParquet, '31a45e5e5690868132c80f15fb078498', folderpathTemplate, folderpathSvg)
# printPdfFromDatabase(filepathParquet, '6a086566772e9045dc36e4db8cd850d7', folderpathTemplate, folderpathSvg)
# removeHashFromDatabase(filepathParquet, '6a3d9f53fa8cee4d9a9ebdcc56d59466')
# printSvgFromDatabase(filepathParquet, '6a086566772e9045dc36e4db8cd850d7', folderpathTemplate, folderpathSvg)
# printSvgFromDatabase(filepathParquet, '3628fe6cd5be8bb2f077cf7345504c3a', folderpathTemplate, folderpathSvg)

# printAllPdfFromDatabase(filepathParquet, folderpathTemplate, folderpathSvg)
# printAllSvgFromDatabase(filepathParquet, folderpathTemplate, folderpathSvg)

"""
'5e4eae4241b4acd673885a0b5ecc9a5b',
'df49a975d671bdb48e1e7f9dfc57fd89',
'790d6da4edc4e79b274c5cfed8cfe42b',
'f6cd248b3b09ac765f6b3b642f433f00',
'd80faeffe5cfd213b27dea0f2432a9c9',
'c45270fa976e93cd50c1b277d0352291',
'ca7a88044b39f28e1158403ca9db69eb',
'39995180b694fec6e9bffacdff7cd28c',
'd482c792d435560c9558d1e7d8550883',
'074f64fc4fb816268be70ed5e4b6df23'
"""

"""
'6a2a11358ea826361b39e4a1db4aeb8d',
'72b1aa1c71f435e9d7317ed57677dc2d',
'7f3bda4832660cd37892f21574ffb804',
'bf25b2bfd033c6f9cf67a20a372ae2dc',
'6bcf2318aca7e49da4657b0eb721e676',
'33f886a5bef27d49b20a7bc01a8849a3',
'6ad8e01520ff9a894b5ad26fb56ec81e'


"""

# pattern = folderpathTemplate + '*.json'
# [f.split('/')[-1] for f in glob.glob(pattern)]

for h in ['1ba83597049d6da6a4f29d02e9663e5d']:
    # removeHashFromDatabase(filepathParquet, h)
    printJsonFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)
    printSvgFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)
    printPdfFromDatabase(filepathParquet, h, folderpathTemplate, folderpathSvg)


# printSvgFromDatabase(filepathParquet, '6a0c68f9a31f4ee4d2a8771853192cab', folderpathTemplate, folderpathSvg)
# printSvgFromDatabase(filepathParquet, '947cc64b4cc6e4d245b226a541ae317b', folderpathTemplate, folderpathSvg)
# printSvgFromDatabase(filepathParquet, 'bfc60b74ec0d2589e203ca838e00d1dd', folderpathTemplate, folderpathSvg)
# printSvgFromDatabase(filepathParquet, 'da7d6e43b9ab6d14ae37ac517c5eb474', folderpathTemplate, folderpathSvg)
# cleanDatabase(filepathParquet)

# printJsonFromDatabase(filepathParquet, '6a0c68f9a31f4ee4d2a8771853192cab', folderpathTemplate, folderpathSvg)

"""
printJsonFromDatabase(filepathParquet, '36381c47a48ab4a0fa1f01321419ce84', folderpathTemplate, folderpathSvg)
printSvgFromDatabase(filepathParquet, '36381c47a48ab4a0fa1f01321419ce84', folderpathTemplate, folderpathSvg)
printPdfFromDatabase(filepathParquet, 'd482c792d435560c9558d1e7d8550883', folderpathTemplate, folderpathSvg)
"""

"""
hashesDict =  getHashesFromDatabase(filepathParquet)
for h in hashesDict:
    # print(h, 'orange' in hashesDict[h])
    if 'orange' in hashesDict[h]:
        # print(hashesDict[h], len(hashesDict[h]['blue']), len(hashesDict[h]['green']), len(hashesDict[h]['orange']))
        if max(hashesDict[h]['grey'].keys()) + max(hashesDict[h]['blue'].keys()) + max(hashesDict[h]['green'].keys()) + max(hashesDict[h]['orange'].keys()) + min(hashesDict[h]['grey'].keys()) + min(hashesDict[h]['blue'].keys()) + min(hashesDict[h]['green'].keys()) + min(hashesDict[h]['orange'].keys()) == 24:
            print(h, max(hashesDict[h]['grey'].keys()), max(hashesDict[h]['blue'].keys()), max(hashesDict[h]['green'].keys()), max(hashesDict[h]['orange'].keys()), '///', min(hashesDict[h]['grey'].keys()), min(hashesDict[h]['blue'].keys()), min(hashesDict[h]['green'].keys()), min(hashesDict[h]['orange'].keys()))
"""
"""
hashesDict =  getHashesFromDatabase(filepathParquet)
for h in hashesDict:
    if not 'orange' in hashesDict[h]:
        print(h, max(hashesDict[h]['blue'].keys()), max(hashesDict[h]['green'].keys()), '//', min(hashesDict[h]['blue'].keys()), min(hashesDict[h]['green'].keys()))
"""
