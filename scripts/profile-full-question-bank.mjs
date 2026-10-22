import fs from 'node:fs';
import path from 'node:path';
import {assessQuestionQuality} from '../src/lib/question-quality.mjs';
import {resolveQuestionDepartment} from '../src/lib/department-routing.mjs';
const root=path.resolve(import.meta.dirname,'..');
const b=JSON.parse(fs.readFileSync(path.join(root,'data/bank.json'),'utf8'));
const norm=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/\s+/g,' ').replace(/^\s*(?:q(?:uestion)?\s*)?\d+[\s).:-]*/i,'').trim();
const subj={},topicCounts={},unassigned={},questionKinds={},examples=[],dupMap=new Map(),duplicates=[];
let bad=0,anatomyWrong=0,weak=0,sourceUnassigned=0,missingTopics=0,missingOptions=0;
for(const q of b.questions){
 const sub=q.subject||'Unclassified Health Sciences';const top=q.topic||'(missing)';
 subj[sub]=(subj[sub]||0)+1;
 if(!topicCounts[sub])topicCounts[sub]={};
 topicCounts[sub][top]=(topicCounts[sub][top]||0)+1;
 questionKinds[q.type||'unknown']=(questionKinds[q.type||'unknown']||0)+1;
 if(/unassigned|unknown|general|miscellaneous/i.test(top)||top==='(missing)')missingTopics++;
 if(/unclassified|clinical medicine/i.test(sub))sourceUnassigned++;
 if(q.options?.length<2)missingOptions++;
 if(assessQuestionQuality(q).status==='quarantined')bad++;
 const dep=resolveQuestionDepartment(q);
 if(sub==='Human Anatomy'&&dep.subject!==sub)anatomyWrong++;
 const key=norm(q.stem);if(key.length>30){
   const prev=dupMap.get(key);
   if(prev){duplicates.push({id:q.id,prior:prev.id,subjects:[prev.subject,sub],topics:[prev.topic,top],text:key.slice(0,170)})}
   else dupMap.set(key,{id:q.id,subject:sub,topic:top});
 }
 if(examples.length<70&&/Unclassified Health Sciences/.test(sub)&&q.options?.length>=2){
  examples.push({id:q.id,stem:String(q.stem).slice(0,190),topic:top,type:q.type});
 }
}
const countBy={};const cross=[];
for(const d of duplicates){const key=d.subjects.join(' > ');countBy[key]=(countBy[key]||0)+1;}
const report={source:{questionCount:b.questions.length,examSets:b.exams.length,answers:Object.keys(b.answers||{}).length},counts:{bad,missingTopics,sourceUnassigned,missingOptions,anatomyWrong,duplicates:duplicates.length},subjects:Object.entries(subj).sort((a,b)=>b[1]-a[1]),subjectTopics:Object.fromEntries(Object.entries(topicCounts).map(([s,obj])=>[s,Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,24)])),types:questionKinds,duplicateSubjects:Object.entries(countBy).sort((a,b)=>b[1]-a[1]).slice(0,25),duplicateExamples:duplicates.slice(0,55),unclassifiedExamples:examples.slice(0,60)};
fs.mkdirSync(path.join(root,'reports'),{recursive:true});
fs.writeFileSync(path.join(root,'reports/full-bank-baseline.json'),JSON.stringify(report,null,2));
console.log('CURATION_BASELINE='+JSON.stringify(report));
