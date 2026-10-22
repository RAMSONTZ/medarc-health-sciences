"use client";
import {useEffect,useMemo,useRef,useState} from 'react';

// Private on-device image gallery. No archive or photograph is transferred to a server.
function groupOf(path){const bits=path.split('/').filter(Boolean);const folder=bits.length>=3&&/^(preview|original|images)$/i.test(bits[0])?bits[1]:bits.length>1?bits[bits.length-2]:'Anatomy';return folder.replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
const isPicture=p=>/\.(jpe?g|png|webp)$/i.test(p);
const mime=p=>/\.png$/i.test(p)?'image/png':/\.webp$/i.test(p)?'image/webp':'image/jpeg';
async function indexArchive(file){
 if(file.size>250*1024*1024)throw Error('Select a ZIP smaller than 250 MB.');
 const raw=await file.arrayBuffer(),view=new DataView(raw);let eocd=-1;
 for(let p=raw.byteLength-22;p>=Math.max(0,raw.byteLength-65557);p--)if(view.getUint32(p,true)===0x06054b50){eocd=p;break;}
 if(eocd<0)throw Error('Not a valid ZIP archive.');
 const count=view.getUint16(eocd+10,true);if(count>2500)throw Error('Too many files in ZIP.');
 let p=view.getUint32(eocd+16,true);const entries=[];
 for(let i=0;i<count;i++){
  if(view.getUint32(p,true)!==0x02014b50)throw Error('Archive index is damaged.');
  const method=view.getUint16(p+10,true),compressed=view.getUint32(p+20,true),size=view.getUint32(p+24,true),nameLen=view.getUint16(p+28,true),extra=view.getUint16(p+30,true),comment=view.getUint16(p+32,true),offset=view.getUint32(p+42,true);
  const path=new TextDecoder().decode(new Uint8Array(raw,p+46,nameLen));p+=46+nameLen+extra+comment;
  if(!isPicture(path)||path.includes('../')||path.startsWith('__MACOSX/')||size>22*1024*1024||compressed>22*1024*1024||![0,8].includes(method))continue;
  if(offset+30>raw.byteLength||view.getUint32(offset,true)!==0x04034b50)continue;
  const start=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);
  if(start+compressed>raw.byteLength)continue;
  entries.push({id:'image-'+i,path,name:path.split('/').pop(),group:groupOf(path),start,compressed,size,method});
 }
 if(!entries.length)throw Error('No image files were found. If this ZIP contains PDFs, use the converted anatomy browser ZIP.');
 return {raw,entries:entries.some(x=>x.path.startsWith('preview/'))?entries.filter(x=>x.path.startsWith('preview/')):entries};
}
async function extract(archive,item){
 const part=new Uint8Array(archive.raw,item.start,item.compressed);
 let content;
 if(item.method===0)content=new Uint8Array(part);
 else{
  if(!('DecompressionStream' in window))throw Error('Your browser cannot unzip images. Extract the folder first.');
  content=new Uint8Array(await new Response(new Blob([part]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
 }
 if(content.byteLength!==item.size||content.byteLength>22*1024*1024)throw Error('Image validation failed.');
 return new File([content],item.name,{type:mime(item.name)});
}
export function PrivateAnatomyLibrary(){
 const [archive,setArchive]=useState(null),[images,setImages]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [group,setGroup]=useState('All collections'),[search,setSearch]=useState(''),[page,setPage]=useState(0),[surface,setSurface]=useState('auto'),[thumbs,setThumbs]=useState({});
 const urls=useRef(new Map()),zipPicker=useRef(null),folderPicker=useRef(null);
 useEffect(()=>()=>{urls.current.forEach(u=>URL.revokeObjectURL(u));urls.current.clear()},[]);
 const collections=useMemo(()=>[...new Set(images.map(x=>x.group))].sort(),[images]);
 const matching=useMemo(()=>images.filter(x=>(group==='All collections'||x.group===group)&&((x.name+' '+x.group).toLowerCase().includes(search.toLowerCase()))),[images,group,search]);
 const shown=matching.slice(page*20,(page+1)*20);
 useEffect(()=>{let open=true;(async()=>{
  for(const item of shown)if(!urls.current.has(item.id))try{
   const f=archive?await extract(archive,item):item.file;
   const u=URL.createObjectURL(f);urls.current.set(item.id,u);
   if(open)setThumbs(prev=>({...prev,[item.id]:u}));
  }catch(err){if(open)setMessage(err.message)}
 })();return()=>{open=false}},[images,archive,page,group,search]);
 function reset(){urls.current.forEach(u=>URL.revokeObjectURL(u));urls.current.clear();setThumbs({});setGroup('All collections');setSearch('');setPage(0);}
 async function zipSelected(file){if(!file)return;setBusy(true);setMessage('Opening the anatomy collection…');try{
  const parsed=await indexArchive(file);reset();setArchive(parsed);setImages(parsed.entries);setMessage(parsed.entries.length+' images ready for anatomical identification. Files remain on this device.');
 }catch(e){setMessage(e.message)}finally{setBusy(false)}}
 function folderSelected(files){const entries=[...files].filter(f=>/^image\/(jpeg|png|webp)$/.test(f.type)&&f.size<22*1024*1024).slice(0,2500).map((f,i)=>({id:'folder-'+i,name:f.name,path:f.webkitRelativePath||f.name,group:groupOf(f.webkitRelativePath||f.name),file:f}));
 if(!entries.length){setMessage('No JPG, PNG or WebP files in that folder.');return;}reset();setArchive(null);setImages(entries);setMessage(entries.length+' images loaded privately from your device.');}
 async function choose(item){setBusy(true);try{
  const file=archive?await extract(archive,item):item.file;
  window.dispatchEvent(new CustomEvent('medarc:anatomy-open-file',{detail:file}));
  setMessage(item.group+' / '+item.name+' opened in the practical below.');
  document.getElementById('anatomy-practical')?.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){setMessage(e.message)}finally{setBusy(false)}}
 return <section id="anatomy-private-library" className="anatomy-device-library" aria-label="Anatomy image browser">
  <div className="anatomy-device-header"><div><span className="eyebrow">ANATOMY IMAGES</span><h2>Explore real anatomical images</h2><p>Browse the anatomy photographs supplied for your studies. Choose an image, then identify its structures using lettered arrows, anatomical location questions and answer feedback.</p></div><strong>{images.length?images.length+' images':'Image library'}</strong></div>
  <div className="anatomy-device-load"><button type="button" className="ap-btn ap-primary" disabled={busy} onClick={()=>zipPicker.current?.click()}>Open anatomy ZIP</button><button type="button" className="ap-btn ap-outline" disabled={busy} onClick={()=>folderPicker.current?.click()}>Select image folder</button><input hidden type="file" ref={zipPicker} accept=".zip,application/zip" onChange={e=>zipSelected(e.target.files?.[0])}/><input hidden type="file" ref={folderPicker} multiple webkitdirectory="" onChange={e=>folderSelected(e.target.files||[])}/><small>Images open in your browser, not on the MedArc server.</small></div>
  {message&&<p role="status" className="anatomy-device-notice">{message}</p>}
  {images.length>0&&<><div className="anatomy-device-filters"><input aria-label="Search anatomy images" placeholder="Search collection or image…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}}/><select aria-label="Choose anatomy collection" value={group} onChange={e=>{setGroup(e.target.value);setPage(0)}}><option>All collections</option>{collections.map(c=><option key={c}>{c}</option>)}</select><select aria-label="Image background" value={surface} onChange={e=>setSurface(e.target.value)}><option value="auto">Follow theme</option><option value="light">Light background</option><option value="dark">Dark background</option></select></div><div className={'anatomy-device-grid anatomy-device-'+surface}>{shown.map(item=><button key={item.id} className="anatomy-device-tile" type="button" disabled={busy} onClick={()=>choose(item)}><div className="anatomy-device-photo">{thumbs[item.id]?<img alt={'Anatomy study image '+item.name} src={thumbs[item.id]} loading="lazy"/>:<span>Loading picture…</span>}</div><div className="anatomy-device-caption"><strong>{item.name}</strong><small>{item.group}</small></div></button>)}</div><div className="anatomy-device-pages"><button disabled={!page||busy} onClick={()=>setPage(v=>v-1)}>← Previous</button><span>Page {page+1} of {Math.max(1,Math.ceil(matching.length/20))} · {matching.length} images</span><button disabled={(page+1)*20>=matching.length||busy} onClick={()=>setPage(v=>v+1)}>Next →</button></div></>}
  <p className="anatomy-device-note">Original source marks are preserved. This local collection stays on your device, with no public publication of third-party photos. Light/dark viewing surfaces do not distort anatomical structures.</p>
 </section>
}
