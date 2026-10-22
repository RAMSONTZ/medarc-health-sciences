import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

let memo;
export function getBank() {
  if (!memo) {
    const file = path.join(process.cwd(), 'data', 'bank.json');
    memo = JSON.parse(fs.readFileSync(file, 'utf8'));
    memo.questionById = new Map(memo.questions.map(q => [q.id, q]));
    memo.examById = new Map(memo.exams.map(x => [x.id, x]));
    memo.subjectCounts = Object.entries(memo.questions.reduce((a,q) => {
      a[q.subject || 'Unclassified'] = (a[q.subject || 'Unclassified'] || 0) + 1;
      return a;
    }, {})).sort((a,b)=>b[1]-a[1]);
    memo.subjects = memo.subjectCounts.map(([name]) => name);
    memo.examSubjects = [...new Set(memo.exams.map(e=>e.subject).filter(Boolean))].sort();
    memo.types = [...new Set(memo.questions.map(q=>q.type).filter(Boolean))].sort();
  }
  return memo;
}

export function getStats() {
  const b = getBank();
  return { questions: b.questions.length, exams: b.exams.length, answered: Object.keys(b.answers || {}).length };
}
// Imported XML/Office fragments and encoding failures are source-data defects,
// not questions. Hide them from learner views without deleting original IDs.
export function isStudyableQuestion(q){
 if(!q || typeof q.stem!=='string' || !q.stem.trim())return false;
 const stem=q.stem.trim();
 const corpus=[stem,...(Array.isArray(q.options)?q.options.map(o=>String(o?.text||'')):[])].join(' ');
 if(/<\?xml\b|<\/?(?:w:document|office:|v:|a:clrMap)|schemas\.openxmlformats\.org|schemas-microsoft-com:office|mso-(?:style|fareast)/i.test(corpus))return false;
 if(/(?:Ã.|Â.|â€|ðŸ|�){3,}/.test(corpus))return false;
 if(/[\u0000-\u0008\u000e-\u001f]/.test(corpus))return false;
 return true;
}
function stringParam(v) { return typeof v === 'string' ? v.trim().slice(0,160) : ''; }
function intParam(v, fallback=1) { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? Math.max(1, Math.min(5000, n)) : fallback; }
export function getQuestions(params = {}, answeredOnly = false, subjectLock = '') {
  const b=getBank();
  const subject = subjectLock || stringParam(params.subject);
  const topic = stringParam(params.topic);
  const type = stringParam(params.type);
  const search = stringParam(params.q).toLowerCase();
  const status = stringParam(params.status);
  const page = intParam(params.page);
  const limit = 10;
  const matched=[];
  for (const q of b.questions) {
    const hasAnswer=Boolean(b.answers[q.id]);
    if (answeredOnly && !hasAnswer) continue;
    if (subject && q.subject !== subject) continue;
    if (topic && q.topic !== topic) continue;
    if (type && q.type !== type) continue;
    if (status==='answered' && !hasAnswer) continue;
    if (status==='unanswered' && hasAnswer) continue;
    if (status==='needs-review' && !['review_required','quarantine'].includes(q.answerAuditStatus || q.status)) continue;
    if (search && !`${q.stem||''} ${q.subject||''} ${q.topic||''} ${q.subtopic||''} ${(q.options||[]).map(o=>o.text).join(' ')}`.toLowerCase().includes(search)) continue;
    matched.push(q);
  }
  const count=matched.length;
  const pages=Math.max(1,Math.ceil(count/limit));
  const safePage=Math.min(page,pages);
  const questions=matched.slice((safePage-1)*limit,safePage*limit).map(q=>({
    id:q.id,
    stem:isStudyableQuestion(q)?q.stem:'Source text needs review — this imported record cannot be displayed safely as a medical learning question.',
    sourceUnreadable:!isStudyableQuestion(q),
    subject:q.subject, topic:q.topic, type:q.type,
    options:isStudyableQuestion(q)?(q.options||[]):[], status:q.answerAuditStatus||q.status,
    priority:q.priority, answer:b.answers[q.id]||null
  }));
  let topics=[];
  if(subject) topics=[...new Set(b.questions.filter(q=>q.subject===subject).map(q=>q.topic).filter(Boolean))].sort().slice(0,300);
  return {questions,count,page:safePage,pages,topics,limit,params:{subject,topic,type,search,status}};
}
export function getExams(params={}) {
  const b=getBank(); const q=stringParam(params.q).toLowerCase(); const subject=stringParam(params.subject); const page=intParam(params.page); const limit=16;
  const found=b.exams.filter(x=>(!subject||x.subject===subject)&&(!q||`${x.title||''} ${x.subject||''}`.toLowerCase().includes(q)));
  const pages=Math.max(1,Math.ceil(found.length/limit)); const safePage=Math.min(page,pages);
  return {exams:found.slice((safePage-1)*limit,safePage*limit).map(e=>({id:e.id,title:e.title,subject:e.subject,count:e.questionIds?.length||0})),count:found.length,page:safePage,pages};
}
export function getExam(id,position=1) {
  const b=getBank(); const exam=b.examById.get(id); if(!exam)return null;
  const pos=Math.min(intParam(position),exam.questionIds.length||1);
  const source=b.questionById.get(exam.questionIds[pos-1]);
  const q=source?{id:source.id,stem:isStudyableQuestion(source)?source.stem:'Source text needs review — this imported record cannot be displayed safely as a medical learning question.',sourceUnreadable:!isStudyableQuestion(source),subject:source.subject,topic:source.topic,type:source.type,options:isStudyableQuestion(source)?(source.options||[]):[],status:source.answerAuditStatus||source.status,answer:b.answers[source.id]||null}:null;
  return {exam:{id:exam.id,title:exam.title,subject:exam.subject,total:exam.questionIds.length},question:q,pos};
}
export function getAudit(pageRaw=1) {
  const b=getBank();const page=intParam(pageRaw);const limit=25;const pages=Math.ceil(b.questions.length/limit);
  return {count:b.questions.length,page:Math.min(page,pages),pages,rows:b.questions.slice((Math.min(page,pages)-1)*limit,Math.min(page,pages)*limit).map(q=>({id:q.id,subject:q.subject,topic:q.topic,status:q.answerAuditStatus||q.status,answered:!!b.answers[q.id],flags:q.auditFlags||[]}))};
}
export function getTopicGroups(){
  const b=getBank();
  const basicHints=['anatomy','physiology','biochemistry','parasitology','microbiology','pharmacology','pathology','hematology','histology','embryology','immunology','medical genetics','nutrition','biostatistics','epidemiology','community','development'];
  const clinicalHints=['medicine','surgery','obstetrics','gynecology','pediatrics','neurology','psychiatry','dermatology','orthopedics','ophthalmology','ent','radiography','anesthesiology','emergency','clinical','nursing'];
  const groups={basic:[],clinical:[],other:[]};
  for(const [name,count] of b.subjectCounts){const low=name.toLowerCase();if(basicHints.some(x=>low.includes(x)))groups.basic.push({name,count});else if(clinicalHints.some(x=>low.includes(x)))groups.clinical.push({name,count});else groups.other.push({name,count});}
  return groups;
}
