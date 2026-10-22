#!/usr/bin/env python3
"""Optional, conservative background-matting preview for authorized specimen photos.

Original pixels are never overwritten. Removes only a contiguous, nearly uniform
outer background matching the chosen border color. This is NOT safe for arbitrary
radiology, screenshots, histology slides, or specimens that touch the outer edge.
Review the resulting alpha image pixel by pixel before using it in teaching.
"""
import argparse
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps

def make_preview(source:Path, output:Path, background='white', tolerance=34):
 with Image.open(source) as original:
  im=ImageOps.exif_transpose(original).convert('RGBA')
  width,height=im.size
  if width*height>16_000_000:raise ValueError('Image too large (>16 megapixels) for safe local preview')
  pixels=np.array(im)
 rgb=pixels[:,:,:3].astype(np.int16)
 target=np.array([255,255,255] if background=='white' else [0,0,0],dtype=np.int16)
 mask=(np.max(np.abs(rgb-target),axis=2)<=tolerance)
 h,w=mask.shape
 if mask.mean()<.12:raise ValueError('Image does not have enough matching studio background to matte safely')
 visited=np.zeros((h,w),dtype=np.uint8)
 # Floodfill only exterior-connected, background-colored pixels; internal tissues remain untouched.
 # OpenCV floodFill works quickly on large user images.
 try:
  import cv2
  count,labels=cv2.connectedComponents(mask.astype(np.uint8),connectivity=4)
  edge=set(np.concatenate([labels[0,:],labels[-1,:],labels[:,0],labels[:,-1]]).tolist())
  edge.discard(0)
  exterior=np.isin(labels,list(edge))
 except ImportError:
  queue=deque([(y,x) for y,x in list(zip(*np.where(mask[0:1,:])))])
  queue=deque()
  for x in range(w):
   if mask[0,x]:queue.append((0,x))
   if mask[h-1,x]:queue.append((h-1,x))
  for y in range(h):
   if mask[y,0]:queue.append((y,0))
   if mask[y,w-1]:queue.append((y,w-1))
  while queue:
   y,x=queue.popleft()
   if visited[y,x] or not mask[y,x]:continue
   visited[y,x]=1
   for ny,nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
    if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not visited[ny,nx]:queue.append((ny,nx))
  exterior=visited.astype(bool)
 removed=float(exterior.mean())
 if removed<.02 or removed>.96:raise ValueError(f'Unsafe removed-area fraction: {removed:.1%}; manual editing required')
 pixels[exterior,3]=0
 output.parent.mkdir(parents=True,exist_ok=True)
 Image.fromarray(pixels,'RGBA').save(output,'PNG')
 return {'source':str(source),'preview':str(output),'width':width,'height':height,'removed_fraction':round(removed,4),'status':'PREVIEW_ONLY_MANUAL_QA_REQUIRED'}

if __name__=='__main__':
 import json
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('source',type=Path,help='An original authorized specimen photograph')
 p.add_argument('output',type=Path,help='Private PNG preview destination (never /public/)')
 p.add_argument('--background',choices=['white','black'],default='white')
 p.add_argument('--tolerance',type=int,default=34)
 p.add_argument('--authorized',action='store_true',help='Confirms rights for modifying this specimen')
 a=p.parse_args()
 if not a.authorized: p.error('Explicit --authorized is required; do not alter third-party atlases without permission.')
 if a.output.resolve()==a.source.resolve():p.error('Source and preview must be different paths')
 if not 5<=a.tolerance<=50:p.error('Tolerance must be between 5 and 50')
 print(json.dumps(make_preview(a.source,a.output,a.background,a.tolerance),indent=2))
