#!/usr/bin/env python3
"""Inventory user-saved body-region BlueLink viewers using metadata only.
Never downloads, modifies, copies, or AI-analyzes licensed atlas images.
"""
from pathlib import Path
from bs4 import BeautifulSoup
import hashlib,json,re,csv
root=Path(__file__).resolve().parents[1]
files=sorted(Path('/mnt/data').glob('Labeled *.html'))

def group(name):
 n=name.lower()
 if any(s in n for s in ('cranial','brain','deep back','spinal cord')):return 'Neuroanatomy & spine'
 if any(s in n for s in ('lower limb','lumbar','hip','knee','wrist','hand','foot')):return 'Limbs & joints'
 if any(s in n for s in ('upper limb','brachial plexus','shoulder')):return 'Upper limb & plexuses'
 if any(s in n for s in ('heart','lung','mediastinum','ventilation')):return 'Thorax'
 if any(s in n for s in ('abdominal','intestines','stomach','liver','spleen','kidney','urinary')):return 'Abdomen & urinary'
 if any(s in n for s in ('pelvic','perineum')):return 'Pelvis & perineum'
 if any(s in n for s in ('neck','face','mastication','nasal','sinus','ear','oral','orbit','parotid','infratemporal','pterygopalatine')):return 'Head & neck'
 return 'General anatomy'

entries=[]; all_counts=[]
for p in files:
 soup=BeautifulSoup(p.read_text('utf-8',errors='replace'),'html.parser')
 source=soup.find('meta',itemprop='url')
 url=source.get('content','') if source else ''
 ids=[]
 for img in soup.find_all('img'):
  src=img.get('src','')
  if src: ids.append(hashlib.sha256(src.encode()).hexdigest())
 raw=len(ids); unique=len(set(ids))
 title=p.stem.removeprefix('Labeled ').removesuffix(' Images')
 slug=re.sub(r'[^a-z0-9]+','-',title.lower()).strip('-')
 g=group(title)
 entries.append({'id':slug,'title':title,'bodyRegion':g,'viewerUrl':url,
  'sourceDocument':p.name,'remoteImageElements':raw,
  'uniqueImageReferences':unique,'localOriginalCount':0,
  'licenseStatus':'permission_required','publicStatus':'not_published',
  'assetRequirement':'Supply original JPG/PNG/WebP files and evidence of web/AI-assisted reuse rights'})
 all_counts.extend(ids)

output={'schemaVersion':1,'status':'source_viewers_only_original_images_not_embedded',
 'counts':{'collections':len(entries),'remoteImageElements':sum(x['remoteImageElements'] for x in entries),
  'uniqueWithinEachCollection':sum(x['uniqueImageReferences'] for x in entries),
  'uniqueAcrossCollections':len(set(all_counts))}, 'collections':entries}
(root/'data/anatomy-collections.json').write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

regions=sorted({x['bodyRegion'] for x in entries})
intake_root=root/'anatomy-intake/body-regions'
for region in regions:
 slug=re.sub(r'[^a-z0-9]+','-',region.lower()).strip('-')
 folder=intake_root/slug
 folder.mkdir(parents=True,exist_ok=True)
 (folder/'README.txt').write_text(f'Body region: {region}\n\nPut only original, authorized JPEG/PNG/WebP medical anatomy assets here, preserving exact source names.\nNo BlueLink images were downloaded.\nProof of rights is required before public publishing or AI-assisted editing.\n',encoding='utf-8')
print(json.dumps(output['counts'],indent=2));print('Regions:',', '.join(regions))
