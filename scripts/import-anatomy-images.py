#!/usr/bin/env python3
"""Rights-gated, byte-preserving import of user-supplied anatomy photos into MedArc.

This does not download or process images from BlueLink or any external atlas.
"""
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path
from PIL import Image, UnidentifiedImageError

EXTENSIONS={'.jpg':('JPEG',),'.jpeg':('JPEG',),'.png':('PNG',),'.webp':('WEBP',)}

def require(ok,msg):
    if not ok: raise ValueError(msg)

def validate_record(r,root):
    assert isinstance(r,dict)
    id_=str(r.get('id',''))
    require(bool(re.fullmatch(r'[a-z0-9][a-z0-9-]{2,70}',id_)),f'Unsafe id: {id_!r}')
    filename=r.get('filename','')
    require(Path(filename).name==filename and filename not in {'','.','..'},f'{id_}: filename must be a basename')
    suffix=Path(filename).suffix.lower()
    require(suffix in EXTENSIONS,f'{id_}: Unsupported image format')
    original=root/'images'/filename
    require(original.is_file(),f'{id_}: Missing original image {filename}')
    require(not original.is_symlink(),f'{id_}: Symlinked originals are not accepted')
    require(original.stat().st_size <= 20*1024*1024,f'{id_}: Original exceeds 20 MB')
    with Image.open(original) as im:
        im.verify()
    with Image.open(original) as im:
        require(im.format in EXTENSIONS[suffix], f'{id_}: Image extension does not match its actual format')
        require(im.width>=180 and im.height>=180,f'{id_}: Image resolution too low')
        require(im.width*im.height<100_000_000,f'{id_}: Image dimensions are too large')
    rights=r.get('rights') or {}
    require(rights.get('publication_authorized') is True,f'{id_}: Explicit web publication permission required')
    require(rights.get('ai_processing_authorized') is True,f'{id_}: Permission for AI-assisted preparation required')
    require(rights.get('copyright_owner_or_agent_confirmed') is True,f'{id_}: Copyright ownership/authorization not confirmed')
    require(rights.get('attribution_confirmed') is True,f'{id_}: Attribution requirements not confirmed')
    require(rights.get('patient_privacy_cleared') is True,f'{id_}: Consent/privacy clearance must be confirmed')
    evidence=rights.get('evidence_file','')
    require(Path(evidence).name==evidence and evidence!='',f'{id_}: Evidence filename is required')
    proof=root/'permission-evidence'/evidence
    require(proof.is_file() and proof.stat().st_size>0,f'{id_}: Evidence document missing or empty')
    for field in ['title','topic','credit','alt','license']:
        require(isinstance(r.get(field),str) and len(r[field].strip())>1,f'{id_}: Missing {field}')
    markers=r.get('markers') or []
    require(isinstance(markers,list) and len(markers)<=100,f'{id_}: Invalid marker list')
    for m in markers:
        require(all(k in m for k in ('x','y')) and ('label' in m or 'name' in m),f'{id_}: Marker missing fields')
        require(isinstance(m['x'],(int,float)) and 0<=m['x']<=100 and isinstance(m['y'],(int,float)) and 0<=m['y']<=100 and bool(str(m.get('name') or m.get('label') or '').strip()),f'{id_}: Invalid marker')
        for key in ('labelX','labelY'):
            require(key not in m or isinstance(m[key],(int,float)) and 0<=m[key]<=100, f'{id_}: Invalid arrow label position')
        for field in ('nameDistractors','locationDistractors'):
            items=m.get(field,[])
            require(isinstance(items,list) and len(items)<=8 and all(isinstance(v,str) and v.strip() for v in items),f'{id_}: Invalid {field}')
            answer=str(m.get('name') or m.get('label') or '') if field=='nameDistractors' else str(m.get('location') or '')
            require(answer.casefold() not in {v.strip().casefold() for v in items},f'{id_}: Correct answer duplicated in distractors')
            require(len({v.strip().casefold() for v in items})==len(items),f'{id_}: Duplicate distractors')
            if items:
                require(len(items)>=2, f'{id_}: At least two distractors needed for MCQ')
                require(m.get('content_reviewed') is True and bool(m.get('reviewer_name')),f'{id_}: Reviewed MCQ key and reviewer name are required before publishing')
        if m.get('locationDistractors'):require(bool(str(m.get('location','')).strip()),f'{id_}: Location MCQ requires an anatomical location')
    return original, suffix

def main():
    cli=argparse.ArgumentParser()
    cli.add_argument('--intake',required=True,help='Directory containing images/, permission-evidence/, and manifest.json')
    cli.add_argument('--project',default=str(Path(__file__).resolve().parents[1]))
    cli.add_argument('--dry-run',action='store_true')
    a=cli.parse_args()
    root=Path(a.intake).resolve(); project=Path(a.project).resolve()
    data=json.loads((root/'manifest.json').read_text('utf-8'))
    records=data.get('images')
    require(isinstance(records,list),'manifest.json must contain images array')
    prior=json.loads((project/'data/anatomy-images.json').read_text('utf-8'))
    outputs=[]; ids=set(); checks=[]
    for r in records:
        src,ext=validate_record(r,root)
        require(r['id'] not in ids,f'Duplicate asset ID: {r["id"]}')
        ids.add(r['id'])
        dst=project/'public/anatomy'/f'{r["id"]}{ext}'
        digest=hashlib.sha256(src.read_bytes()).hexdigest()
        entry={k:r[k] for k in ['id','title','topic','alt','caption','credit','license'] if k in r}
        entry.update({'src':f'/anatomy/{r["id"]}{ext}', 'sha256':digest,'markers':r.get('markers') or []})
        outputs.append((src,dst,entry));checks.append((r['id'],digest))
    combined={x['id']:x for x in prior.get('images',[])}
    for _,_,entry in outputs:
        combined[entry['id']]=entry
    if not a.dry_run:
        for src,dst,entry in outputs:
            dst.parent.mkdir(exist_ok=True,parents=True)
            shutil.copyfile(src,dst)  # Exact original bytes, no generation, editing, or conversion
            require(hashlib.sha256(dst.read_bytes()).hexdigest()==entry['sha256'],f'Copy mismatch: {entry["id"]}')
        (project/'data/anatomy-images.json').write_text(json.dumps({'schemaVersion':1,'images':list(combined.values())},indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps({'validated':len(checks),'previously_imported':len(prior.get('images',[])),'resulting_images':len(combined),'dry_run':a.dry_run},indent=2))

if __name__=='__main__':
    main()
