"use client";
import {useMemo,useState} from 'react';

/** Original MedArc syllabus index; public catalog intentionally excludes third-party source links and images. */
export function AnatomySourceExplorer({collections=[]}){
 const regions=useMemo(()=>[...new Set(collections.map(c=>c.bodyRegion))].sort(),[collections]);
 const [active,setActive]=useState('All regions');
 const [query,setQuery]=useState('');
 const filtered=collections.filter(c=>(active==='All regions'||c.bodyRegion===active)&&`${c.title} ${c.bodyRegion}`.toLowerCase().includes(query.toLowerCase()));
 return <section className="anatomy-collections" aria-label="MedArc anatomy syllabus">
  <div className="anatomy-collections-heading"><div><span className="eyebrow">ANATOMICAL STUDY INDEX</span><h2>Explore the human body</h2><p>Choose a region to browse its learning topics. Browse these anatomical regions, then open your photo collection in the image gallery below.</p></div><span className="anatomy-image-count">{collections.length} topics</span></div>
  <div className="anatomy-collections-controls"><label htmlFor="anatomy-region-search" className="sr-only">Search anatomical topics</label><input id="anatomy-region-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find brain, heart, upper limb, kidneys…" />
   <div className="anatomy-region-chips">{['All regions',...regions].map(r=><button key={r} type="button" className={active===r?'current':''} onClick={()=>setActive(r)}>{r}</button>)}</div></div>
  {filtered.length===0?<div className="anatomy-image-empty">No matching topics. Try another body region.</div>:
  <div className="anatomy-source-grid">{filtered.map(c=><article className="anatomy-source-card" key={c.id}><div className="anatomy-source-card-top"><span className="anatomy-source-region">{c.bodyRegion}</span><span className="anatomy-awaiting">Study topic</span></div><h3>{c.title}</h3><p>Explore this region and select a specimen photo to practice naming structures and anatomical locations.</p><div className="anatomy-source-actions"><a href="#anatomy-private-library">Browse anatomy images ↗</a><span>Lettered-marker practice</span></div></article>)}</div>}
 </section>;
}
