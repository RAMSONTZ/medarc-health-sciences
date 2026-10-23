import fs from 'node:fs';
import path from 'node:path';
import {assessQuestionQuality} from '../src/lib/question-quality.mjs';
import {curateQuestion,duplicateKey} from '../src/lib/question-curation.mjs';
import {prepareLearningBank,prepareLearningQuestion} from '../src/lib/question-presentation.mjs';
import {getReviewedEdit} from '../src/lib/reviewed-edits.mjs';
import {isClinicalManagementQuestion} from '../src/lib/department-routing.mjs';
const root=path.resolve(import.meta.dirname,'..');
const original=JSON.parse(fs.readFileSync(path.join(root,'data/bank.json'),'utf8'));
const bank={...original,...prepareLearningBank(original)};
const originalById=new Map(original.questions.map(q=>[q.id,q]));
const rows=[],canon=new Map(),bySubject={},byTopic={},reasons={},reviewReasons={};
const csv=s=>'"'+String(s??'').replaceAll('"','""')+'"';
let reviewed=0,moved=0,topicCategorized=0,quarantined=0,dupes=0,anatomyLeaks=0;
for(const q of bank.questions){
 const dep=curateQuestion(q),quality=assessQuestionQuality(q);
 const prepared=prepareLearningQuestion(originalById.get(q.id)),edit=getReviewedEdit(originalById.get(q.id));
 const key=duplicateKey(q);let duplicateOf='';
 if(key && quality.status!=='quarantined'){
  const fp=dep.subject+'|'+key;
  if(canon.has(fp)){
    const prev=canon.get(fp);
    if(!bank.answers?.[prev] && bank.answers?.[q.id]){
      const old=rows.find(x=>x.id===prev);
      if(old && !old.duplicateOf){old.duplicateOf=q.id;duplicateOf='';}
      canon.set(fp,q.id);
    }else duplicateOf=prev;
  }else canon.set(fp,q.id);
 }
 if(quality.status==='quarantined')quarantined++;
 if(dep.reassigned)moved++;
 if(dep.topic!=='Topic review required')topicCategorized++;
 if(dep.review)reviewed++;
 if(dep.subject==='Human Anatomy'&&isClinicalManagementQuestion(q))anatomyLeaks++;
 reasons[dep.reason]=(reasons[dep.reason]||0)+1;
 if(dep.review){const key=dep.topicReason==='unresolved_topic'?'missing_topic':dep.reason;reviewReasons[key]=(reviewReasons[key]||0)+1;}
 bySubject[dep.subject]=(bySubject[dep.subject]||0)+1;
 byTopic[dep.subject+' / '+dep.topic]=(byTopic[dep.subject+' / '+dep.topic]||0)+1;
 rows.push({id:q.id,sourceSubject:q.subject||'',curatedSubject:dep.subject,sourceTopic:q.topic||'',curatedTopic:dep.topic,
  confidence:dep.confidence,quality:quality.status,departmentChanged:dep.reassigned,reviewRequired:dep.review,
  departmentReason:dep.reason,topicReason:dep.topicReason,duplicateOf,hasProvisionalAnswer:!!bank.answers?.[q.id],
  classificationMethod:edit?.subject?'individual_editorial_review':'automated_rules_or_preserved_source',
  presentationChanges:prepared.changes.join(';'),blockedReasons:prepared.blocked.join(';'),
  sourceCheckedAnswer:!!edit?.answer,answerStatus:bank.answers?.[q.id]?.reviewStatus|| (bank.answers?.[q.id]?'prior_provisional_answer':'answer_pending'),
  originalStem:originalById.get(q.id).stem,cleanedStem:q.stem});
}
dupes=rows.filter(x=>x.duplicateOf).length;
const unresolvedSample={};
for(const q of bank.questions){
 const dep=curateQuestion(q);
 if(dep.topic!=='Topic review required'||assessQuestionQuality(q).status==='quarantined')continue;
 const sub=dep.subject;
 if(!['Pharmacology','ENT','Human Anatomy','Internal Medicine','Human Physiology','Embryology','Pediatrics and Child Health','General Surgery','Neurology','Unclassified Health Sciences'].includes(sub))continue;
 if(!unresolvedSample[sub])unresolvedSample[sub]=[];
 if(unresolvedSample[sub].length<14)unresolvedSample[sub].push({id:q.id,stem:String(q.stem||'').slice(0,225)});
}
// Samples remain available in the ledger; keep console output concise.
const summary={
 auditVersion:'2026-10-23-question-cleanup-and-editorial-review',
 completionStatus:'incomplete_individual_editorial_review',
 methodology:'Every record passed deterministic checks; only explicitly marked records were individually source-checked. An automated department assignment is not medical validation.',
 original:{questions:bank.questions.length,examSets:bank.exams.length,provisionalAnswers:Object.keys(original.answers||{}).length},
 counts:{analyzed:rows.length,departmentReassigned:moved,topicCategorized,topicNeedsReview:rows.length-topicCategorized,
  reviewRequired:reviewed,quarantined,strictDuplicateRecords:dupes,anatomyManagementLeaks:anatomyLeaks},
 editorial:{individuallyReviewed:original.questions.filter(q=>getReviewedEdit(q)).length,sourceCheckedAnswersAdded:rows.filter(x=>x.sourceCheckedAnswer).length,
   changedPresentations:rows.filter(x=>x.presentationChanges).length,questionsWithAnswerMaterialSeparated:rows.filter(x=>/answer|solution|explanation|correctness|keyed_choice/.test(x.presentationChanges)).length,
   questionsWithChoicesRecovered:rows.filter(x=>/inline_choices_separated|starred_choice_restored/.test(x.presentationChanges)).length,
   effectiveAnswerRecords:Object.keys(bank.answers).length,unanswered:bank.questions.length-Object.keys(bank.answers).length,clinicianSignedOff:0},
 bySubject:Object.entries(bySubject).sort((a,b)=>b[1]-a[1]),
 topics:Object.entries(byTopic).sort((a,b)=>b[1]-a[1]),
 routingReasons:Object.entries(reasons).sort((a,b)=>b[1]-a[1]),
 reviewReasons:Object.entries(reviewReasons).sort((a,b)=>b[1]-a[1]),
 sampleReviewIds:rows.filter(x=>x.reviewRequired).slice(0,60).map(x=>({id:x.id,subject:x.curatedSubject,topic:x.curatedTopic,why:x.departmentReason})),
 sampleDuplicateIds:rows.filter(x=>x.duplicateOf).slice(0,30).map(x=>({id:x.id,duplicateOf:x.duplicateOf}))
};
fs.mkdirSync(path.join(root,'reports'),{recursive:true});
const cols=Object.keys(rows[0]);
fs.writeFileSync(path.join(root,'reports','question-curation-ledger.csv'),
 cols.join(',')+'\n'+rows.map(row=>cols.map(key=>csv(row[key])).join(',')).join('\n'));
fs.writeFileSync(path.join(root,'reports','question-curation-summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({counts:summary.counts,editorial:summary.editorial,completionStatus:summary.completionStatus},null,2));
if(anatomyLeaks||rows.length!==30068||!topicCategorized||!Object.keys(bySubject).length)process.exitCode=1;
