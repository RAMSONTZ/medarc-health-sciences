"use client";
import {useEffect,useMemo,useRef,useState} from 'react';

// Secure local-only teaching library. The images and password never leave the browser.
const DB_NAME='medarc-private-anatomy-v2';
const storeName='vault';
const decoder=new TextDecoder();
const encoder=new TextEncoder();
const fmt=(bytes)=>Math.round(bytes/1048576*10)/10;
function startDB(){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in window))return reject(Error('Encrypted browser storage is unavailable.'));
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(storeName))request.result.createObjectStore(storeName)};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('Unable to open local storage'));
 });
}
async function vaultGet(key){
 const db=await startDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(storeName,'readonly');const r=tx.objectStore(storeName).get(key);
  r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);
  tx.oncomplete=()=>db.close();
 });
}
async function vaultWrite(entries){
 const db=await startDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(storeName,'readwrite'),store=tx.objectStore(storeName);
  for(const [name,val] of entries)store.put(val,name);
  tx.oncomplete=()=>{db.close();resolve()};
  tx.onerror=()=>reject(tx.error||Error('Browser storage failed'));
 });
}
async function vaultClear(){const db=await startDB();return new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readwrite');tx.objectStore(storeName).clear();tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}
async function cryptoKey(passphrase,salt){
 const material=await crypto.subtle.importKey('raw',encoder.encode(passphrase),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:200000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function sealArchive(bytes,passphrase){
 if(passphrase.length<10)throw Error('Use a private passphrase containing at least 10 characters.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await cryptoKey(passphrase,salt);
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes);
 return {ciphertext,salt:Array.from(salt),iv:Array.from(iv),version:1};
}
async function unsealArchive(record,passphrase){
 try{
  const key=await cryptoKey(passphrase,new Uint8Array(record.salt));
  return await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(record.iv)},key,record.ciphertext);
 }catch{throw Error('Unlock failed. Check the passphrase; MedArc cannot recover a forgotten passphrase.')}
}
function readableCollection(name){
 return String(name||'Anatomy').replace(/[_-]+/g,' ').replace(/^QL\s+(D\d+\s+S\d+|M\d+\s+S\d+|M\d+)\s+/i,'').replace(/\s+(16|20 21|2020|NR18)$/i,'').replace(/\s+/g,' ').trim();
}
function groupOf(path){
 const parts=path.split('/').filter(Boolean);return readableCollection(parts.length>1?parts[parts.length-2]:'Anatomy');
}
const isPicture=path=>/\.(jpe?g|png|webp)$/i.test(path);
const mime=path=>/\.png$/i.test(path)?'image/png':/\.webp$/i.test(path)?'image/webp':'image/jpeg';
async function extractBytes(archive,item){
 const part=new Uint8Array(archive.raw,item.start,item.compressed);
 let content;
 if(item.method===0)content=new Uint8Array(part);
 else{
  if(typeof DecompressionStream==='undefined')throw Error('This browser cannot decompress ZIP files. Use the latest Chrome or Edge.');
  const stream=new Blob([part]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  content=new Uint8Array(await new Response(stream).arrayBuffer());
 }
 if(content.byteLength!==item.size||content.byteLength>25*1048576)throw Error('An anatomy image did not pass size validation.');
 return content;
}
async function fileFromEntry(archive,item){
 return new File([await extractBytes(archive,item)],item.name,{type:mime(item.name)});
}
async function indexArchive(fileOrBuffer){
 const raw=fileOrBuffer instanceof ArrayBuffer?fileOrBuffer:await fileOrBuffer.arrayBuffer();
 if(raw.byteLength>250*1048576)throw Error('Select a ZIP smaller than 250 MB.');
 const view=new DataView(raw);let end=-1;
 for(let p=raw.byteLength-22;p>=Math.max(0,raw.byteLength-65557);p--)if(view.getUint32(p,true)===0x06054b50){end=p;break}
 if(end<0)throw Error('Not a valid ZIP archive.');
 const count=view.getUint16(end+10,true);
 if(count>3000)throw Error('Too many files in archive.');
 let p=view.getUint32(end+16,true);
 const entries=[];
 for(let i=0;i<count;i++){
  if(view.getUint32(p,true)!==0x02014b50)throw Error('The ZIP directory is damaged.');
  const method=view.getUint16(p+10,true),compressed=view.getUint32(p+20,true),size=view.getUint32(p+24,true);
  const nameLen=view.getUint16(p+28,true),extra=view.getUint16(p+30,true),comment=view.getUint16(p+32,true),offset=view.getUint32(p+42,true);
  const path=decoder.decode(new Uint8Array(raw,p+46,nameLen));p+=46+nameLen+extra+comment;
  if((!isPicture(path)&&path!=='catalog.json')||path.includes('../')||path.startsWith('/')||size>25*1048576||compressed>25*1048576||![0,8].includes(method))continue;
  if(offset+30>raw.byteLength||view.getUint32(offset,true)!==0x04034b50)continue;
  const start=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);
  if(start+compressed>raw.byteLength)continue;
  entries.push({id:'private-'+i,path,name:path.split('/').pop(),group:groupOf(path),start,compressed,size,method});
 }
 const catalogEntry=entries.find(e=>e.path==='catalog.json');
 let catalog=null;
 if(catalogEntry)try{catalog=JSON.parse(decoder.decode(await extractBytes({raw},catalogEntry)))}catch{}
 const imageMeta=new Map((catalog?.images||[]).map(x=>[x.specimen_path,x]));
 const preferred=entries.some(x=>x.path.startsWith('specimens/'))?'specimens/':entries.some(x=>x.path.startsWith('preview/'))?'preview/':null;
 const chosen=entries.filter(x=>isPicture(x.path)&&(!preferred||x.path.startsWith(preferred)));
 if(!chosen.length)throw Error('No JPG, PNG, or WebP pictures found. First extract the supplied PDF files.');
 const byPath=new Map(entries.map(e=>[e.path,e]));
 const images=chosen.map(x=>{
  const info=imageMeta.get(x.path)||{};
  return {...x,region:info.region||'Anatomy',group:readableCollection(info.collection||x.group),display:info.name||x.name,source:info.source_pdf||'User anatomy source',page:info.page||null,thumbEntry:byPath.get(info.thumbnail_path)||null,labeledEntry:byPath.get(info.labeled_path)||null};
 });
 return {raw,images,imagesByPath:byPath,sourceCount:catalog?.totalPictures||images.length};
}
export function PrivateAnatomyLibrary(){
 const [archive,setArchive]=useState(null),[images,setImages]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [region,setRegion]=useState('All regions'),[topic,setTopic]=useState('All topics'),[search,setSearch]=useState(''),[page,setPage]=useState(0),[surface,setSurface]=useState('auto');
 const [thumbs,setThumbs]=useState({}),[selected,setSelected]=useState(null),[showLabels,setShowLabels]=useState(false),[viewUrl,setViewUrl]=useState(null),[referenceUrl,setReferenceUrl]=useState(null);
 const [vaultInfo,setVaultInfo]=useState(null),[password,setPassword]=useState(''),[unlockPassword,setUnlockPassword]=useState(''),[saving,setSaving]=useState(false);
 const urls=useRef(new Map()),previewUrls=useRef([]),zipPicker=useRef(null),folderPicker=useRef(null);
 useEffect(()=>{vaultGet('metadata').then(setVaultInfo).catch(()=>{});return()=>{urls.current.forEach(u=>URL.revokeObjectURL(u));previewUrls.current.forEach(u=>URL.revokeObjectURL(u));}},[]);
 const regions=useMemo(()=>[...new Set(images.map(x=>x.region))].sort(),[images]);
 const filteredByRegion=useMemo(()=>images.filter(x=>region==='All regions'||x.region===region),[images,region]);
 const topics=useMemo(()=>[...new Set(filteredByRegion.map(x=>x.group))].sort(),[filteredByRegion]);
 const matching=useMemo(()=>filteredByRegion.filter(x=>(topic==='All topics'||x.group===topic)&&(x.display+' '+x.group+' '+x.region).toLowerCase().includes(search.toLowerCase())),[filteredByRegion,topic,search]);
 const shown=matching.slice(page*24,(page+1)*24);
 useEffect(()=>{let open=true;(async()=>{
  for(const item of shown)if(!urls.current.has(item.id))try{
   const f=archive?await fileFromEntry(archive,item.thumbEntry||item):item.file;
   const u=URL.createObjectURL(f);urls.current.set(item.id,u);
   if(open)setThumbs(prev=>({...prev,[item.id]:u}));
  }catch(err){if(open)setMessage(err.message)}
 })();return()=>{open=false}},[archive,images,region,topic,search,page]);
 function reset(){urls.current.forEach(u=>URL.revokeObjectURL(u));urls.current.clear();previewUrls.current.forEach(u=>URL.revokeObjectURL(u));previewUrls.current=[];setThumbs({});setViewUrl(null);setReferenceUrl(null);setSelected(null);setRegion('All regions');setTopic('All topics');setSearch('');setPage(0);}
 async function readZip(fileOrArray){const a=await indexArchive(fileOrArray);reset();setArchive(a);setImages(a.images);setMessage(a.images.length+' anatomy specimens ready. Private images remain on this device.');return a}
 async function zipSelected(file){if(!file)return;setBusy(true);setMessage('Reading your anatomy images…');try{await readZip(file)}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 function folderSelected(files){
  const entries=[...files].filter(f=>/^image\/(jpeg|png|webp)$/.test(f.type)&&f.size<25*1048576).slice(0,2500).map((f,i)=>({id:'folder-'+i,name:f.name,display:f.name,path:f.webkitRelativePath||f.name,region:'Anatomy',group:groupOf(f.webkitRelativePath||f.name),file:f}));
  if(!entries.length){setMessage('No JPG, PNG or WebP images in the folder.');return;}
  reset();setArchive(null);setImages(entries);setMessage(entries.length+' images loaded for this session only. For encrypted persistence, import the ZIP package.');
 }
 async function choose(item){setBusy(true);try{
  previewUrls.current.forEach(u=>URL.revokeObjectURL(u));previewUrls.current=[];
  const file=archive?await fileFromEntry(archive,item):item.file;
  const url=URL.createObjectURL(file);previewUrls.current.push(url);setViewUrl(url);setReferenceUrl(null);setSelected(item);setShowLabels(false);
  if(archive&&item.labeledEntry){const label=await fileFromEntry(archive,item.labeledEntry);const labelURL=URL.createObjectURL(label);previewUrls.current.push(labelURL);setReferenceUrl(labelURL)}
  setMessage(item.group+' / image '+(item.page||item.name)+' opened.');document.getElementById('medarc-private-picture')?.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){setMessage(e.message)}finally{setBusy(false)}}
 async function practice(){if(!selected)return;setBusy(true);try{
  const file=archive?await fileFromEntry(archive,selected):selected.file;
  const host=document.getElementById('anatomy-practical');if(host?.tagName==='DETAILS')host.open=true;
  window.dispatchEvent(new CustomEvent('medarc:anatomy-open-file',{detail:file}));
  host?.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){setMessage(e.message)}finally{setBusy(false)}}
 async function save(){if(!archive)return;setSaving(true);try{
  const sealed=await sealArchive(archive.raw,password);
  await vaultWrite([['archive',sealed],['metadata',{count:images.length,bytes:archive.raw.byteLength,savedAt:new Date().toISOString()}]]);
  setVaultInfo({count:images.length,bytes:archive.raw.byteLength,savedAt:new Date().toISOString()});setPassword('');setMessage('Encrypted anatomy library saved on this device. Unlock it with your passphrase on future visits.');
 }catch(e){setMessage(e.message)}finally{setSaving(false)}}
 async function unlock(){setBusy(true);try{
  const record=await vaultGet('archive');if(!record)throw Error('No locally saved anatomy library found.');
  const data=await unsealArchive(record,unlockPassword);await readZip(data);setUnlockPassword('');setMessage('Private anatomy library unlocked. Pictures are ready without importing a ZIP again.');
 }catch(e){setMessage(e.message)}finally{setBusy(false)}}
 async function erase(){setBusy(true);try{await vaultClear();setVaultInfo(null);setMessage('Saved encrypted copy deleted from this browser. The current session remains open.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 return <section id="anatomy-private-library" className="anatomy-device-library anatomy-private-workspace" aria-label="Private anatomy picture library">
  <div className="anatomy-device-header"><div><span className="eyebrow">PRIVATE ANATOMY STUDY</span><h2>Your 445-image anatomy collection</h2><p>Open the individual specimen ZIP once and save an encrypted copy on this device. Then choose a region, topic and picture—complete with labeled reference and A/B/C identification practice.</p></div><strong>{images.length?images.length+' specimens':vaultInfo?vaultInfo.count+' saved':'Image library'}</strong></div>
  <div className="anatomy-device-load">
   <button type="button" className="ap-btn ap-primary" disabled={busy} onClick={()=>zipPicker.current?.click()}>Open anatomy ZIP</button>
   <button type="button" className="ap-btn ap-outline" disabled={busy} onClick={()=>folderPicker.current?.click()}>Select image folder</button>
   <input hidden type="file" ref={zipPicker} accept=".zip,application/zip" onChange={e=>zipSelected(e.target.files?.[0])}/>
   <input hidden type="file" ref={folderPicker} multiple webkitdirectory="" onChange={e=>folderSelected(e.target.files||[])}/>
  </div>
  {vaultInfo&&!archive&&<div className="anatomy-private-vault"><div><b>Encrypted library saved on this browser</b><small>{vaultInfo.count} pictures · {fmt(vaultInfo.bytes)} MB · Password required to unlock</small></div><input type="password" placeholder="Your private passphrase" aria-label="Unlock private anatomy library" value={unlockPassword} onChange={e=>setUnlockPassword(e.target.value)}/><button disabled={!unlockPassword||busy} onClick={unlock}>Unlock pictures</button><button className="anatomy-private-delete" onClick={erase}>Delete saved copy</button></div>}
  {archive&&<div className="anatomy-private-vault"><div><b>{vaultInfo?'Update encrypted saved copy':'Keep pictures for future visits'}</b><small>Saved only in encrypted browser storage, not on MedArc servers. A forgotten passphrase cannot be recovered.</small></div><input type="password" autoComplete="new-password" placeholder="Create a passphrase (10+ characters)" aria-label="Encrypt with passphrase" value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={password.length<10||saving||busy} onClick={save}>{saving?'Encrypting…':'Save encrypted on this device'}</button>{vaultInfo&&<button className="anatomy-private-delete" onClick={erase}>Delete saved copy</button>}</div>}
  <p className="anatomy-device-note">For privacy, the ZIP and its contents never leave this browser. This is device-local encrypted storage, not a shared online student account. If you use another device or clear browser data, you will need the ZIP again.</p>
  {message&&<p role="status" className="anatomy-device-notice">{message}</p>}
  {images.length>0&&<>
   <div className="anatomy-device-filters">
    <select aria-label="Body region" value={region} onChange={e=>{setRegion(e.target.value);setTopic('All topics');setPage(0)}}><option>All regions</option>{regions.map(r=><option key={r}>{r}</option>)}</select>
    <select aria-label="Anatomy topic" value={topic} onChange={e=>{setTopic(e.target.value);setPage(0)}}><option>All topics</option>{topics.map(t=><option key={t}>{t}</option>)}</select>
    <input aria-label="Search anatomy pictures" placeholder="Find a specimen or topic…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}}/>
    <select aria-label="Image viewing background" value={surface} onChange={e=>setSurface(e.target.value)}><option value="auto">Follow theme</option><option value="light">Light</option><option value="dark">Dark</option></select>
   </div>
   {selected&&<div id="medarc-private-picture" className="anatomy-private-detail"><div className={'anatomy-private-full anatomy-device-'+surface}>{(showLabels?referenceUrl:viewUrl)&&<img alt={'Anatomy '+(showLabels?'labeled reference':'isolated specimen')} src={showLabels&&referenceUrl?referenceUrl:viewUrl}/>}</div><div className="anatomy-private-detail-panel"><span className="eyebrow">SELECTED SPECIMEN</span><h3>{selected.group}</h3><p>{selected.region} · Source page {selected.page||'unavailable'}</p><div className="anatomy-private-toolbar"><button onClick={()=>setShowLabels(false)} className={!showLabels?'active':''}>Specimen</button><button disabled={!referenceUrl} onClick={()=>setShowLabels(true)} className={showLabels?'active':''}>Original labeled slide</button></div><button className="ap-btn ap-primary" disabled={busy} onClick={practice}>Practice A/B/C identification →</button><small>Answers and arrows require lecturer verification. Source and copyright marks remain in the labeled reference.</small></div></div>}
   <div className={'anatomy-device-grid anatomy-device-'+surface}>{shown.map(item=><button key={item.id} className="anatomy-device-tile" type="button" disabled={busy} onClick={()=>choose(item)}><div className="anatomy-device-photo">{thumbs[item.id]?<img alt={'Anatomy '+item.group+' specimen'} src={thumbs[item.id]} loading="lazy"/>:<span>Preparing image…</span>}</div><div className="anatomy-device-caption"><strong>{item.group}</strong><small>Specimen {item.page||item.name}</small></div></button>)}</div>
   <div className="anatomy-device-pages"><button disabled={!page||busy} onClick={()=>setPage(v=>v-1)}>← Previous</button><span>Page {page+1} of {Math.max(1,Math.ceil(matching.length/24))} · {matching.length} pictures</span><button disabled={(page+1)*24>=matching.length||busy} onClick={()=>setPage(v=>v+1)}>Next →</button></div>
  </>}
 </section>
}
