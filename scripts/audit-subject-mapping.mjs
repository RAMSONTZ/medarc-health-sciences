import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const bank=JSON.parse(fs.readFileSync(path.join(root,'data/bank.json'),'utf8'));
const n={};
const cases=[];
const routeRx=/\b(?:treat(?:ment|ed|ing)?|manag(?:e|ement|ing)|prescrib(?:e|ing)|dose|dosage|medicat(?:ion|ions)|drug(?:s)?|antibiotic(?:s)?|therap(?:y|ies)|first.line therapy|regimen|surgical intervention|what should be done next|best next step|which is the best initial step)\b/i;
const anatomyRx=/\b(?:artery|vein|innervat|branch|nerve|bone|muscle|ligament|joint|structure|origin|insertion|course|supply|location|anatomical|anatomy|foramen|vascularisation|lymph|drainage|relations?|surface landmarks?)\b/i;
for(const q of bank.questions){
 const sub=q.subject||'UNKNOWN'; n[sub]=(n[sub]||0)+1;
 const stem=String(q.stem||'');
 const treatment=routeRx.test(stem);
 const anatomy=anatomyRx.test(stem);
 const category=(/anatomy|histology|embryology/i.test(sub) ? 'ANATOMY'
 :/pharmacology/i.test(sub) ? 'PHARMACOLOGY' :'OTHER');
 if((category==='ANATOMY'&&treatment)||(category==='PHARMACOLOGY'&&!treatment&&anatomy)||(treatment&&(/physiology|biochem|parasitology|pathology/i.test(sub)))){
  if(cases.length<90)cases.push({id:q.id,subject:sub,topic:q.topic,stem:stem.slice(0,330),treatment,anatomy});
 }
}
const subjects=Object.entries(n).sort((a,b)=>b[1]-a[1]);
const anatomySubjects=subjects.filter(([s])=>/anatomy/i.test(s));
const examples=[];
for(const q of bank.questions.filter(x=>/anatomy/i.test(x.subject||'')&&routeRx.test(String(x.stem||''))).slice(0,90)){
 examples.push({id:q.id,stem:String(q.stem).slice(0,330),topic:q.topic});
}
console.log('SUBJECT_INTEGRITY_AUDIT='+JSON.stringify({total:bank.questions.length,subjectCount:subjects.length,subjects,anatomySubjects,anatomyTreatmentSuspects:examples.length,examples:examples.slice(0,65),mixedSamples:cases.slice(0,35)}));
