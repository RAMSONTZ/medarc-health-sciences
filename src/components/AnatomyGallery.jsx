"use client";
import {useState} from 'react';

/** Only images admitted by the rights-checked import script appear here. */
export function AnatomyGallery({images=[]}) {
 const [focus,setFocus]=useState(null);
 const [shown,setShown]=useState({});
 const toggle=(imageId,n)=>setShown(p=>({...p,[`${imageId}:${n}`]:!p[`${imageId}:${n}`]}));
 return <section className="anatomy-gallery" aria-label="Licensed anatomy gallery">
  <div className="anatomy-gallery-head"><div><span className="eyebrow">ORIGINAL IMAGE COLLECTION</span><h2>Anatomy image library</h2><p>Unaltered, rights-cleared original images only. Select an image to explore its labels.</p></div><span className="anatomy-image-count">{images.length} approved images</span></div>
  {images.length===0?<div className="anatomy-image-empty" role="status"><h3>Awaiting permission-cleared source images</h3><p>MedArc displays anatomical images only when their distribution rights and educational annotations have been reviewed. You can still practice using a private local image in the anatomy studio.</p></div>:
  <div className="anatomy-gallery-grid">{images.map(item=><button key={item.id} type="button" className="anatomy-gallery-tile" onClick={()=>{setFocus(item);setShown({});}}><img src={item.src} alt={item.alt||item.title} loading="lazy"/><div><strong>{item.title}</strong><small>{item.topic} · {item.credit}</small></div></button>)}</div>}
  {focus&&<div className="anatomy-image-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setFocus(null)}}><section className="anatomy-image-dialog" role="dialog" aria-modal="true" aria-label={`Anatomy image: ${focus.title}`}><div className="anatomy-image-dialog-head"><div><h3>{focus.title}</h3><small>{focus.credit} · {focus.license}</small></div><button onClick={()=>setFocus(null)} aria-label="Close image">Close ×</button></div><div className="anatomy-image-stage"><img src={focus.src} alt={focus.alt||focus.title}/>{(focus.markers||[]).map((m,i)=><button key={i} className="anatomy-label-marker" style={{left:`${m.x}%`,top:`${m.y}%`}} onClick={()=>toggle(focus.id,i)} title={shown[`${focus.id}:${i}`]?m.label:`Identify structure ${i+1}`} aria-label={shown[`${focus.id}:${i}`]?m.label:`Reveal label ${i+1}`}>{shown[`${focus.id}:${i}`]?m.label:i+1}</button>)}</div><p className="anatomy-image-caption">{focus.caption||'Click a numbered marker to reveal its verified label.'}</p></section></div>}
 </section>;
}
