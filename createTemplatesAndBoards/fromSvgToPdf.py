import cairo
import cairosvg
import io
import glob
import os

folder = '/home/mat/Bureau/lobby202511/createTemplatesAndBoards/'
os.chdir(folder)
print('os.getcwd() :', os.getcwd())

pattern = folder + 'newTemplates/*.svg'

for f in glob.glob(pattern):
    cairosvg.svg2pdf(url=f, write_to=f + '.pdf')


