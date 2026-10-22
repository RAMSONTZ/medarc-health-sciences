'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Icon} from './Icons';
let cached=null;
export function SmartSearch({onNavigate}){
 const router=useRouter();const [query,setQuery]=useState('');const [items,setItems]=useState([]);const [focused,setFocused]=useState(false);
 useEffect(()=>{if(!focused||cached)return;fetch('/topic-index.json').then(r=>r.json()).then(data=>{cached=data;setItems(data)}).catch(()=>{})},[focused]);
 const list=(cached||items).filter(x=>query.length>=2 && x.name.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>{
 const ax=a.name.toLowerCase().startsWith(query.toLowerCase())?0:1, bx=b.name.toLowerCase().startsWith(query.toLowerCase())?0:1;
 return ax-bx||b.count-a.count;
 }).slice(0,6);
 function go(term){setFocused(false);onNavigate?.();router.push(`/practice?q=${encodeURIComponent(term)}`)}
 return <form className="global-search smart-search" role="search" onSubmit={e=>{e.preventDefault();if(query.trim())go(query.trim())}}>
 <Icon name="search" size={19}/><input type="search" value={query} aria-label="Search MedArc questions" aria-autocomplete="list" aria-expanded={focused&&list.length>0} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),130)} onChange={e=>setQuery(e.target.value)} placeholder="Search conditions, topics, questions..."/><kbd>↵</kbd>
 {focused&&query.trim().length>=2&&list.length>0&&<div className="search-suggestions" role="listbox" aria-label="Suggested medical topics">{list.map(x=><button type="button" key={x.name} role="option" aria-selected={false} onMouseDown={e=>e.preventDefault()} onClick={()=>go(x.name)}><Icon name="search" size={15}/><span>{x.name}</span><small>{x.kind}</small><Icon name="arrow" size={13}/></button>)}</div>}
 </form>;
}
