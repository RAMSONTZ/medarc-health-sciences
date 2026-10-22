'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Icon} from './Icons';
const fallback=['Anatomy','Pharmacology','Internal Medicine','Surgery','Pediatrics','Microbiology'];
export function StudyFocus(){
 const [focus,setFocus]=useState(fallback),[name,setName]=useState('');
 useEffect(()=>{const refresh=()=>{try{const p=JSON.parse(localStorage.getItem('medarc:v2:profile')||'{}');setFocus(p.focus?.length?p.focus:fallback);setName(p.name||'')}catch{}};refresh();window.addEventListener('medarc:profile-updated',refresh);return()=>window.removeEventListener('medarc:profile-updated',refresh)},[]);
 return <section className="focus-band"><div><span className="eyebrow">YOUR STUDY FOCUS</span><h2>{name?`Study priorities for ${name}`:'What are you studying today?'}</h2><p>Go directly to the subjects and concepts that matter most to you.</p></div><div className="focus-list">{focus.slice(0,6).map(x=><Link key={x} href={`/practice?q=${encodeURIComponent(x)}`}>{x} <Icon name="arrow" size={13}/></Link>)}<button onClick={()=>window.dispatchEvent(new Event('medarc:open-profile'))} className="focus-edit">Personalize <Icon name="user" size={13}/></button></div></section>;
}
