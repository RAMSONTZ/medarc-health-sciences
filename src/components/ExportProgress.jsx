'use client';
import {Icon} from './Icons';
export function ExportProgress(){
 function save(){
  const keys=['medarc:v2:attempts:v3','medarc:v2:attempts','medarc:v2:profile','medarc:ux-refresh:attempts:v1','medarc:bulk:attempts:v7'];
  const values={exportedAt:new Date().toISOString(),version:'MedArc V2',data:{}};
  for(const key of keys){try{const item=localStorage.getItem(key);if(item)values.data[key]=JSON.parse(item)}catch{}}
  const blob=new Blob([JSON.stringify(values,null,2)],{type:'application/json'});
  const uri=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=uri;link.download='medarc-study-progress.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(uri),1000);
 }
 return <button className="button button-outline" onClick={save}><Icon name="clipboard" size={17}/> Export your progress</button>;
}
