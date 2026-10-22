#!/usr/bin/env python3
"""Write offline-only private image intake viewer. No public image copying."""
import csv, json, html
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows=list(csv.DictReader((ROOT/'anatomy-catalog/private-image-intake-review.csv').open(encoding='utf-8')))
for r in rows:
 for prop in ('original_path','preview_path'):
  r[prop]=r[prop].replace('anatomy-intake/private-review/','')
 for prop in ('sha256','width','height','format','original_bytes','filename','member'):
  if prop not in r:r[prop]=''
 entries=json.dumps(rows,ensure_ascii=False).replace('</','<\\/')
page=r'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MedArc · Private image review</title><style>
:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#13243a;background:#f5f7fb}*{box-sizing:border-box}body{margin:0}header{position:sticky;top:0;background:#fff;border-bottom:1px solid #dfe7ef;padding:17px 26px;z-index:10;box-shadow:0 3px 14px #0b29400b}header h1{font-size:22px;margin:0 0 5px}header p{font-size:13px;color:#536575;margin:0}.app{max-width:1440px;margin:auto;padding:24px}.notice{background:#fff6e6;border:1px solid #ead9a9;border-radius:13px;padding:16px 18px;font-size:14px;line-height:1.6;margin-bottom:20px}.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px}.toolbar select,.toolbar input{padding:12px;border:1px solid #cbd6e4;border-radius:11px;min-width:180px;flex:1;background:#fff}.toolbar button,.decision button{background:#fff;border:1px solid #cad8e9;border-radius:10px;padding:10px 13px;font-weight:700;cursor:pointer;color:#173b69}.toolbar .primary{background:#155dc9;border-color:#155dc9;color:white}.summary{font-size:13px;color:#536575;margin:10px 0 14px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:14px}.tile{background:#fff;border:1px solid #dce5ef;border-radius:14px;overflow:hidden;box-shadow:0 5px 13px #0b29400a}.tile img{width:100%;height:198px;object-fit:contain;background:#f4f7f9;display:block}.tile .details{padding:14px}.tile h3{font-size:12px;overflow-wrap:anywhere;line-height:1.45;margin:0 0 8px;min-height:33px}.tile .meta{color:#69798a;font-size:11px;margin-bottom:10px}.decision{display:flex;gap:6px;flex-wrap:wrap}.decision button{font-size:11px;padding:7px 8px}.decision button.current{background:#e5f0ff;border-color:#296ad2;color:#1250a3}.view-original{font-size:12px;color:#145dc7;display:inline-block;margin-top:12px;text-decoration:none}.empty{text-align:center;padding:40px}@media(max-width:600px){header{padding:14px}.app{padding:13px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.tile img{height:130px}.tile .details{padding:9px}.tile h3{font-size:10px}}
</style></head><body><header><h1>MedArc · Private image review</h1><p>Extracted copies from your uploaded archives. Not a publishable anatomy atlas.</p></header><main class="app"><div class="notice"><b>Keep this package private.</b> Most images appear to be exam screenshots, photographed notes, or mixed teaching materials. Sorting them does not establish publication rights or verify anatomical accuracy. The Michigan BlueLink figures were not downloaded. Do not push this folder to public GitHub or deploy it to Vercel.</div><div class="toolbar"><input id="search" type="search" placeholder="Search original filename or source archive"><select id="source"><option value="">Both archives</option><option value="uploaded-images">Images.rar</option><option value="picture-mcqs">PICTURE MCQs.zip</option></select><select id="type"><option value="">All decisions</option><option value="unreviewed">Unreviewed</option><option value="anatomy">Anatomy candidate</option><option value="exam">Question screenshot</option><option value="other">Other / exclude</option></select><button class="primary" id="export">Export review JSON</button></div><div class="summary" id="summary"></div><div class="grid" id="grid"></div></main><script>
const FILES=__FILES__;
const key='medarc:private-image-review:v1';
let labels={};try{labels=JSON.parse(localStorage.getItem(key))||{}}catch{};
const esc=(s)=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=id=>document.getElementById(id);
function setLabel(id,label){labels[id]=label;try{localStorage.setItem(key,JSON.stringify(labels))}catch{};render()}
function render(){const q=$('search').value.toLowerCase(),s=$('source').value,t=$('type').value;
 const data=FILES.filter(x=>(!q||`${x.member} ${x.filename}`.toLowerCase().includes(q))&&(!s||x.archive===s)&&(!t||(labels[x.id]||'unreviewed')===t));
 $('summary').textContent=`${data.length} displayed / ${FILES.length} extracted · ${Object.values(labels).filter(v=>v==='anatomy').length} anatomy candidates · ${Object.values(labels).filter(v=>v==='exam').length} screenshots · ${Object.values(labels).filter(v=>v==='other').length} excluded`;
 $('grid').innerHTML=data.map(x=>`<article class="tile"><img loading="lazy" src="${esc(x.preview_path)}" alt="Private preview of ${esc(x.member)}"><div class="details"><h3>${esc(x.member)}</h3><div class="meta">${esc(x.archive)} · ${x.width}×${x.height} · ${x.format}</div><div class="decision">${[['anatomy','Anatomy candidate'],['exam','Question screenshot'],['other','Exclude']].map(([code,label])=>`<button onclick="setLabel('${x.id}','${code}')" class="${labels[x.id]===code?'current':''}">${label}</button>`).join('')}</div><a class="view-original" href="${esc(x.original_path)}" target="_blank" rel="noopener noreferrer">View original file ↗</a></div></article>`).join('')||'<div class="empty">No images match the filter.</div>';
}
for(const n of ['search','source','type'])$(n).addEventListener('input',render);
$('export').addEventListener('click',()=>{const out={createdAt:new Date().toISOString(),notice:'Private review only. Labels are not permissions.',decisions:FILES.map(x=>({id:x.id,member:x.member,archive:x.archive,sha256:x.sha256,reviewDecision:labels[x.id]||'unreviewed'}))};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));a.download='medarc-private-image-decisions.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)});
render();
</script></body></html>'''.replace('__FILES__',entries)
output=ROOT/'anatomy-intake/private-review/OPEN_IMAGE_REVIEW.html'
output.write_text(page,encoding='utf-8')
print(output)
