import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import {assessQuestionQuality} from './question-quality.mjs';
import {isClinicalManagementQuestion} from './department-routing.mjs';
import {curateQuestion,duplicateKey} from './question-curation.mjs';
import {prepareLearningBank} from './question-presentation.mjs';

// Learner payloads intentionally omit explanation and reference metadata for this phase.
function learnerAnswer(answer){
  return answer?{correct:answer.correct,answerText:answer.answerText,reviewStatus:answer.reviewStatus}:null;
}
let memo;
export function getBank() {
  if (!memo) {
    const file = path.join(process.cwd(), 'data', 'bank.json');
    memo = JSON.parse(fs.readFileSync(file, 'utf8'));
    memo.sourceQuestionById=new Map(memo.questions.map(q=>[q.id,q]));
    memo.sourceAnswerCount=Object.keys(memo.answers||{}).length;
    Object.assign(memo,prepareLearningBank(memo));
    memo.questionById = new Map(memo.questions.map(q => [q.id, q]));
    memo.examById = new Map(memo.exams.map(x => [x.id, x]));
    memo.departmentById=new Map();
    memo.duplicateOf=new Map();
    const counts={},reasonCounts={},samples={};let moved=0,review=0,anatomyLeaks=0,topicResolved=0;
    for(const q of memo.questions){
      const res=curateQuestion(q);
      memo.departmentById.set(q.id,res);
      counts[res.subject]=(counts[res.subject]||0)+1;
      if(res.topic!=='Topic review required')topicResolved++;
      if(res.reassigned){
        moved++;
        reasonCounts[res.reason]=(reasonCounts[res.reason]||0)+1;
        if(!samples[res.reason])samples[res.reason]=[];
        if(samples[res.reason].length<12)samples[res.reason].push({id:q.id,from:res.sourceSubject,to:res.subject,topic:res.topic});
      }
      if(res.review)review++;
      if(res.subject==='Human Anatomy'&&isClinicalManagementQuestion(q))anatomyLeaks++;
    }
    if(anatomyLeaks)throw new Error('Clinical management question leaked into Anatomy department');
    const canonical=new Map();
    for(const q of memo.questions){
      if(assessQuestionQuality(q).status==='quarantined')continue;
      const d=memo.departmentById.get(q.id),key=duplicateKey(q);
      if(!key)continue;
      const fullKey=d.subject+'|'+key,prev=canonical.get(fullKey);
      if(prev){
        if(!memo.answers?.[prev] && memo.answers?.[q.id]){
          memo.duplicateOf.set(prev,q.id);
          canonical.set(fullKey,q.id);
        }else memo.duplicateOf.set(q.id,prev);
      }else canonical.set(fullKey,q.id);
    }
    memo.departmentReport={total:memo.questions.length,reassigned:moved,
      needsDepartmentReview:review,topicsCategorized:topicResolved,
      topicsAwaitingReview:memo.questions.length-topicResolved,
      exactDuplicateRecords:memo.duplicateOf.size,
      reasonCounts,samples,anatomyManagementLeaks:anatomyLeaks};
    memo.sourceSubjectCounts=Object.entries(memo.questions.reduce((obj,q)=>{
      const label=q.subject||'Unclassified Health Sciences';obj[label]=(obj[label]||0)+1;return obj;
    },{}));
    memo.subjectCounts=Object.entries(counts).sort((x,y)=>y[1]-x[1]);
    memo.subjects=memo.subjectCounts.map(([name])=>name);
    memo.examSubjects = [...new Set(memo.exams.map(e=>e.subject).filter(Boolean))].sort();
    memo.types = [...new Set(memo.questions.map(q=>q.type).filter(Boolean))].sort();
  }
  return memo;
}

/**
 * Source preservation and student-facing quality are intentionally separate.
 * The original 30,068 records, their IDs, answers and memberships are untouched.
 */
export function getQuestionQualityReport() {
  const bank=getBank();
  if(!bank.qualityReport) {
    const excluded=new Set(), flagged=new Set(), categories={}, samples={};
    for(const q of bank.questions) {
      const result=assessQuestionQuality(q);
      if(result.status==='quarantined')excluded.add(q.id);
      if(result.status==='review')flagged.add(q.id);
      for(const reason of result.reasons) {
        categories[reason]=(categories[reason]||0)+1;
        if(!samples[reason])samples[reason]=[];
        if(samples[reason].length<8)samples[reason].push(q.id);
      }
    }
    bank.qualityReport={
      total:bank.questions.length,
      available:bank.questions.length-excluded.size,
      quarantined:excluded.size,
      flaggedForReview:flagged.size,
      excluded,flagged,categories,samples
    };
  }
  return bank.qualityReport;
}
export function getDepartmentReport(){return getBank().departmentReport;}
export function getStats() {
  const b = getBank();
  return { questions: b.questions.length, exams: b.exams.length, answered: Object.keys(b.answers || {}).length };
}
function stringParam(v) { return typeof v === 'string' ? v.trim().slice(0,160) : ''; }
function intParam(v, fallback=1) { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? Math.max(1, Math.min(5000, n)) : fallback; }
// Quarantine obvious document-import payloads from learner-facing question views.
 // Original question IDs remain in bank.json and in the review/audit inventory.
function malformedLearningRecord(q) {
 const stem=String(q.stem||'').trim();
 const sample=stem.slice(0,350);
 const corrupted=/^<\?xml\b|^<\/?(?:w:|a:|v:|o:|xml)|^\{\\rtf|<w:document|xmlns[:=]|schemas\.openxmlformats|schemas-microsoft-com|mso-|\[Content_Types\]\.xml/i;
 if (corrupted.test(sample)) return true;
 const choices=(q.options||[]).map(o=>String(o.text||''));
 return choices.filter(c=>corrupted.test(c.slice(0,350))).length>=2;
}
export function getQuestions(params = {}, answeredOnly = false, subjectLock = '') {
  const b=getBank();
  const excluded=getQuestionQualityReport().excluded;
  const subject = subjectLock || stringParam(params.subject);
  const topic = stringParam(params.topic);
  const type = stringParam(params.type);
  const search = stringParam(params.q).toLowerCase();
  const status = stringParam(params.status);
  const departmentById=b.departmentById;
  const page = intParam(params.page);
  const limit = 10;
  const matched=[];
  for (const q of b.questions) {
    if(excluded.has(q.id)||b.duplicateOf.has(q.id))continue;
    const hasAnswer=Boolean(b.answers[q.id]);
    if (malformedLearningRecord(q)) continue;
    if (answeredOnly && !hasAnswer) continue;
    const department=departmentById.get(q.id);
    if (subject && department.subject !== subject) continue;
    if (topic && department.topic !== topic) continue;
    if (type && q.type !== type) continue;
    if (status==='answered' && !hasAnswer) continue;
    if (status==='unanswered' && hasAnswer) continue;
    if (status==='needs-review' && !department.review && !['review_required','quarantine'].includes(q.answerAuditStatus || q.status)) continue;
    if (search && !`${q.stem||''} ${department.subject} ${department.topic} ${q.subtopic||''} ${(q.options||[]).map(o=>o.text).join(' ')}`.toLowerCase().includes(search)) continue;
    matched.push(q);
  }
  const count=matched.length;
  const pages=Math.max(1,Math.ceil(count/limit));
  const safePage=Math.min(page,pages);
  const questions=matched.slice((safePage-1)*limit,safePage*limit).map(q=>{
    const department=departmentById.get(q.id);
    return {
      id:q.id,stem:q.stem,subject:department.subject,topic:department.topic,type:q.type,
      sourceSubject:department.sourceSubject,departmentReview:department.review,
      options:q.options||[],status:q.answerAuditStatus||q.status,
      priority:q.priority,answer:learnerAnswer(b.answers[q.id])
    };
  });
  let topics=[];
  if(subject) topics=[...new Set(b.questions.filter(q=>
    !excluded.has(q.id)&&!b.duplicateOf.has(q.id)&&departmentById.get(q.id).subject===subject
  ).map(q=>departmentById.get(q.id).topic).filter(Boolean))].sort().slice(0,300);
  return {questions,count,page:safePage,pages,topics,limit,params:{subject,topic,type,search,status}};
}
function examMemberships(exam,bank) {
  const excluded=getQuestionQualityReport().excluded;
  // The archived exam keeps every original member; the student-facing
  // version admits only questions genuinely belonging to its stated subject.
  // Mixed/unknown collection labels remain intact until editorial review.
  const lockedSubject=bank.subjects.includes(exam.subject)?exam.subject:'';
  return (exam.questionIds||[]).filter(id=>
    bank.questionById.has(id) &&
    !excluded.has(id) &&
    !bank.duplicateOf.has(id) &&
    !malformedLearningRecord(bank.questionById.get(id)) &&
    (!lockedSubject || bank.departmentById.get(id).subject===lockedSubject)
  );
}
export function getExams(params={}) {
  const b=getBank(); const q=stringParam(params.q).toLowerCase(); const subject=stringParam(params.subject); const page=intParam(params.page); const limit=16;
  const found=b.exams.filter(x=>examMemberships(x,b).length>0&&(!subject||x.subject===subject)&&(!q||`${x.title||''} ${x.subject||''}`.toLowerCase().includes(q)));
  const pages=Math.max(1,Math.ceil(found.length/limit)); const safePage=Math.min(page,pages);
  return {exams:found.slice((safePage-1)*limit,safePage*limit).map(e=>({id:e.id,title:e.title,subject:e.subject,count:examMemberships(e,b).length})),count:found.length,page:safePage,pages};
}
export function getExam(id,position=1) {
  const b=getBank(); const exam=b.examById.get(id); if(!exam)return null;
  const visibleIds=examMemberships(exam,b);
  if(!visibleIds.length)return null;
  const pos=Math.min(intParam(position),visibleIds.length);
  const source=b.questionById.get(visibleIds[pos-1]);
  const dep=source?b.departmentById.get(source.id):null;
  const q=source?{id:source.id,stem:source.stem,subject:dep.subject,topic:dep.topic,sourceSubject:dep.sourceSubject,departmentReview:dep.review,type:source.type,options:source.options||[],status:source.answerAuditStatus||source.status,answer:learnerAnswer(b.answers[source.id])}:null;
  return {exam:{id:exam.id,title:exam.title,subject:exam.subject,total:visibleIds.length,archivedTotal:exam.questionIds.length},question:q,pos};
}
export function getAudit(pageRaw=1) {
  const b=getBank();const page=intParam(pageRaw);const limit=25;const pages=Math.ceil(b.questions.length/limit);
  return {count:b.questions.length,page:Math.min(page,pages),pages,rows:b.questions.slice((Math.min(page,pages)-1)*limit,Math.min(page,pages)*limit).map(q=>({id:q.id,subject:b.departmentById.get(q.id).subject,sourceSubject:q.subject,topic:b.departmentById.get(q.id).topic,departmentReason:b.departmentById.get(q.id).reason,departmentReview:b.departmentById.get(q.id).review,duplicateOf:b.duplicateOf.get(q.id)||null,topicReason:b.departmentById.get(q.id).topicReason,status:q.answerAuditStatus||q.status,answered:!!b.answers[q.id],quality:assessQuestionQuality(q).status,qualityReasons:assessQuestionQuality(q).reasons,flags:q.auditFlags||[]}))};
}
/** Curated subject → topic listings, excluding quarantined and repeated records. */
export function getSubjectTopics(subject){
  const b=getBank(),target=stringParam(subject);
  if(!b.subjects.includes(target))return null;
  const excluded=getQuestionQualityReport().excluded,topics=new Map();
  let count=0,review=0;
  for(const q of b.questions){
    if(excluded.has(q.id)||b.duplicateOf.has(q.id))continue;
    const d=b.departmentById.get(q.id);
    if(d.subject!==target)continue;
    count++;if(d.review)review++;
    if(!topics.has(d.topic))topics.set(d.topic,{name:d.topic,count:0,review:0});
    const x=topics.get(d.topic);x.count++;if(d.review)x.review++;
  }
  return {subject:target,count,review,
    topics:[...topics.values()].sort((a,b)=>a.name==='Topic review required'?1:b.name==='Topic review required'?-1:b.count-a.count||a.name.localeCompare(b.name))};
}
export function getTopicGroups(){
  const b=getBank();
  const basicHints=['anatomy','physiology','biochemistry','parasitology','microbiology','pharmacology','pathology','hematology','histology','embryology','immunology','medical genetics','nutrition','biostatistics','epidemiology','community','development'];
  const clinicalHints=['medicine','surgery','obstetrics','gynecology','pediatrics','neurology','psychiatry','dermatology','orthopedics','ophthalmology','ent','radiography','anesthesiology','emergency','clinical','nursing'];
  const groups={basic:[],clinical:[],other:[]};
  const counts=new Map(),excluded=getQuestionQualityReport().excluded;
  for(const q of b.questions){
    if(excluded.has(q.id)||b.duplicateOf.has(q.id))continue;
    const subject=b.departmentById.get(q.id).subject;
    counts.set(subject,(counts.get(subject)||0)+1);
  }
  for(const [name,count] of [...counts].sort((a,b)=>b[1]-a[1])){if(typeof name!=='string'||!name.trim())continue;const low=name.toLowerCase();if(basicHints.some(x=>low.includes(x)))groups.basic.push({name,count});else if(clinicalHints.some(x=>low.includes(x)))groups.clinical.push({name,count});else groups.other.push({name,count});}
  return groups;
}
