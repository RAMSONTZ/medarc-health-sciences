#!/usr/bin/env python3
"""Extract user-supplied image assets into a PRIVATE review directory.
Only ZIP / RAR archives supplied in the current conversation are processed.
No Michigan BlueLink assets are downloaded. This is not a public publisher.
"""
import ctypes as ct
import ctypes.util
from io import BytesIO
from pathlib import Path
import zipfile
from PIL import Image
import hashlib, json, csv, sys

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'anatomy-intake'/'private-review'
ALLOWED={'.png','.jpg','.jpeg','.webp','.tif','.tiff','.bmp'}
BATCHES=[('picture-mcqs',Path('/mnt/data/PICTURE MCQs.zip'),'zip'),('uploaded-images',Path('/mnt/data/Images.rar'),'rar')]
MAX_BYTES=20_000_000
MAX_PX=90_000_000

def safe_name(s):
 return ''.join(c if c.isascii() and (c.isalnum() or c in '-_') else '-' for c in s)[:125].strip('-')

def record(src_label, member, data, n):
 ext=Path(member).suffix.lower();
 if ext not in ALLOWED or len(data)>MAX_BYTES: return None
 try:
  with Image.open(BytesIO(data)) as im:
   w,h=im.size; mode=im.mode; fmt=im.format
   if w*h>MAX_PX:return None
   im.verify()
  with Image.open(BytesIO(data)) as im:
   rgb=im.convert('RGB');rgb.thumbnail((480,360))
   thumb=rgb.copy()
 except Exception as e:
  print('SKIP corrupt image',member,str(e)[:100],file=sys.stderr);return None
 sha=hashlib.sha256(data).hexdigest()
 filename=f'{src_label}-{n:04d}-{sha[:10]}{ext}'
 out=OUT/src_label/'originals'/filename
 out.parent.mkdir(parents=True,exist_ok=True)
 if not out.exists():out.write_bytes(data)
 t=OUT/src_label/'previews'/f'{Path(filename).stem}.webp'
 t.parent.mkdir(parents=True,exist_ok=True)
 if not t.exists():thumb.save(t,'WEBP',quality=82,method=4)
 return dict(id=Path(filename).stem,archive=src_label,member=member,filename=filename,original_path=out.relative_to(ROOT).as_posix(),preview_path=t.relative_to(ROOT).as_posix(),sha256=sha,width=w,height=h,format=fmt,original_bytes=len(data),source_rights='unknown - review required',anatomy_region='unclassified',type='unclassified: could be screenshot/diagram/photo',publication_authorized=False,ai_processing_authorized=False,review_status='private_review')

def rar_entries(path):
 lib=ct.CDLL(ct.util.find_library('archive'))
 lib.archive_read_new.restype=ct.c_void_p
 lib.archive_read_support_format_all.argtypes=[ct.c_void_p]
 lib.archive_read_support_filter_all.argtypes=[ct.c_void_p]
 lib.archive_read_open_filename.argtypes=[ct.c_void_p,ct.c_char_p,ct.c_size_t]
 lib.archive_read_next_header.argtypes=[ct.c_void_p,ct.POINTER(ct.c_void_p)]
 lib.archive_entry_pathname.argtypes=[ct.c_void_p];lib.archive_entry_pathname.restype=ct.c_char_p
 lib.archive_entry_size.argtypes=[ct.c_void_p];lib.archive_entry_size.restype=ct.c_int64
 lib.archive_read_data.argtypes=[ct.c_void_p,ct.c_void_p,ct.c_size_t];lib.archive_read_data.restype=ct.c_ssize_t
 lib.archive_read_data_skip.argtypes=[ct.c_void_p]
 lib.archive_read_free.argtypes=[ct.c_void_p]
 lib.archive_error_string.argtypes=[ct.c_void_p];lib.archive_error_string.restype=ct.c_char_p
 ar=lib.archive_read_new()
 lib.archive_read_support_format_all(ar);lib.archive_read_support_filter_all(ar)
 rc=lib.archive_read_open_filename(ar,str(path).encode(),10240)
 if rc!=0:raise RuntimeError(f'Cannot open RAR {lib.archive_error_string(ar)}')
 try:
  entry=ct.c_void_p()
  while True:
   rc=lib.archive_read_next_header(ar,ct.byref(entry))
   if rc==1:break
   if rc!=0:raise RuntimeError(f'RAR read error: {lib.archive_error_string(ar)}')
   name=lib.archive_entry_pathname(entry).decode('utf-8','replace')
   size=lib.archive_entry_size(entry)
   if Path(name).suffix.lower() not in ALLOWED or size>MAX_BYTES:
    lib.archive_read_data_skip(ar);continue
   buf=ct.create_string_buffer(65536)
   chunks=[];collected=0
   while True:
    n=lib.archive_read_data(ar,buf,65536)
    if n==0:break
    if n<0:raise RuntimeError('RAR archive contains unsupported compression or malformed member: '+name)
    chunks.append(buf.raw[:n]);collected+=n
   yield name,b''.join(chunks)
 finally:lib.archive_read_free(ar)

def main():
 results=[]
 for source,path,kind in BATCHES:
  if not path.exists():
   print('Not found:',path);continue
  print('READ',path.name,flush=True)
  if kind=='zip':
   with zipfile.ZipFile(path) as z:
    imgs=[i for i in z.infolist() if not i.is_dir() and Path(i.filename).suffix.lower() in ALLOWED and i.file_size<=MAX_BYTES]
    for n,i in enumerate(imgs,1):
     r=record(source,i.filename,z.read(i),n)
     if r:results.append(r)
  else:
   for n,(name,data) in enumerate(rar_entries(path),1):
    r=record(source,name,data,n)
    if r:results.append(r)
  print('EXTRACTED',source,sum(r['archive']==source for r in results),flush=True)
 # duplicate audit
 by_hash={}
 for r in results:
  by_hash.setdefault(r['sha256'],[]).append(r['id'])
  r['duplicate_asset_ids']=';'.join(by_hash[r['sha256']][:-1]) if len(by_hash[r['sha256']])>1 else ''
 manifest=ROOT/'anatomy-catalog'/'private-image-intake-review.csv'
 manifest.parent.mkdir(parents=True,exist_ok=True)
 with manifest.open('w',newline='',encoding='utf-8') as f:
  writer=csv.DictWriter(f,fieldnames=results[0].keys());writer.writeheader();writer.writerows(results)
 summary={'imported':len(results),'by_archive':{a:sum(r['archive']==a for r in results) for a,_,_ in BATCHES},'unique_sha256':len(by_hash),'duplicate_files':len(results)-len(by_hash),'rights':'review-required; no images published or promoted into app automatically'}
 (ROOT/'anatomy-catalog'/'private-image-intake-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
 print('SUMMARY',json.dumps(summary),flush=True)

if __name__=='__main__':main()
