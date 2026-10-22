'use client';
import {useEffect,useState} from 'react';
export function FocusToggle(){
 const [active,setActive]=useState(false);
 useEffect(()=>()=>{delete document.documentElement.dataset.practiceFocus},[]);
 const toggle=()=>{const next=!active;setActive(next);if(next)document.documentElement.dataset.practiceFocus='true';else delete document.documentElement.dataset.practiceFocus;};
 return <button type="button" className="medarc-focus-toggle" aria-pressed={active} aria-label={active?'Exit question focus mode':'Enter distraction-free question focus mode'} onClick={toggle}>{active?'← Exit focus mode':'⤢ Focus on questions'}</button>;
}
