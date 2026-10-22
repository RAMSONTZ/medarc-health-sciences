import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Source-level functional test: loads the exact data utilities without the
// Next.js-only server-only marker; no mocked question records are used.
const source=fs.readFileSync(path.join(process.cwd(),'src/lib/bank.js'),'utf8')
  .replace(/^import 'server-only';\s*/m,'')
  .replace("from './question-quality.mjs';", "from '"+pathToFileURL(path.join(process.cwd(),'src/lib/question-quality.mjs')).href+"';")
  .replace("from './department-routing.mjs';", "from '"+pathToFileURL(path.join(process.cwd(),'src/lib/department-routing.mjs')).href+"';")
  .replace("from './question-curation.mjs';", "from '"+pathToFileURL(path.join(process.cwd(),'src/lib/question-curation.mjs')).href+"';");
const lib=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const bank=lib.getBank();
const expected=lib.getStats();
assert.deepEqual(expected,{questions:30068,exams:1201,answered:2325});
assert.equal(bank.questionById.size,expected.questions);
assert.equal(bank.examById.size,expected.exams);
assert.ok(bank.types.includes('Single Best Answer MCQ'));
assert.ok(bank.types.includes('Short Answer'));

const report=lib.getQuestionQualityReport();
assert.ok(report.quarantined>=0 && report.quarantined<expected.questions);
assert.equal(report.total,expected.questions);
assert.equal(report.available+report.quarantined,expected.questions);
const initial=lib.getQuestions();
assert.equal(initial.count,report.available-bank.duplicateOf.size);
assert.equal(initial.questions.length,10);
assert.equal(initial.page,1);
assert.equal(initial.pages,Math.ceil(initial.count/10));
const final=lib.getQuestions({page:'999999'});
assert.equal(final.page,Math.ceil(initial.count/10));
assert.equal(final.questions.length,initial.count%10||10);
const answered=lib.getQuestions({},true);
assert.ok(answered.count<=expected.answered);
assert.equal(answered.questions.length,10);
assert.ok(answered.questions.every(q=>q.answer));
const unanswered=lib.getQuestions({status:'unanswered'});
assert.equal(unanswered.count,initial.count-answered.count);
assert.ok(unanswered.questions.every(q=>!q.answer));
const selected=bank.questions.find(q=>!report.excluded.has(q.id)&&!bank.duplicateOf.has(q.id));
const found=lib.getQuestions({q:selected.id}); // search excludes IDs by design
assert.equal(typeof found.count,'number');
const selectedSubject=lib.getQuestions({subject:bank.departmentById.get(selected.id).subject});
assert.ok(selectedSubject.count>0);
assert.ok(selectedSubject.questions.every(q=>q.subject===bank.departmentById.get(selected.id).subject));
const selectedTopic=lib.getQuestions({subject:bank.departmentById.get(selected.id).subject,topic:bank.departmentById.get(selected.id).topic});
assert.ok(selectedTopic.count>0);
assert.ok(selectedTopic.questions.every(q=>q.subject===bank.departmentById.get(selected.id).subject&&q.topic===bank.departmentById.get(selected.id).topic));
assert.ok(selectedTopic.topics.includes(bank.departmentById.get(selected.id).topic));
const baseExams=lib.getExams();
assert.ok(baseExams.count<=1201&&baseExams.count>0);
assert.equal(baseExams.exams.length,16);
const firstSummary=baseExams.exams.find(e=>e.count>1);
assert.ok(firstSummary);
const firstExam=bank.examById.get(firstSummary.id);
const opened=lib.getExam(firstSummary.id,1);
assert.equal(opened.exam.id,firstSummary.id);
assert.equal(opened.exam.total,firstSummary.count);
assert.ok(firstExam.questionIds.includes(opened.question.id));
assert.equal(opened.exam.archivedTotal,firstExam.questionIds.length);
const openedNext=lib.getExam(firstSummary.id,2);
assert.ok(firstExam.questionIds.includes(openedNext.question.id));
assert.equal(lib.getExam('no-such-exam'),null);
const auditFirst=lib.getAudit();
assert.equal(auditFirst.count,expected.questions);
assert.equal(auditFirst.rows.length,25);
const auditLast=lib.getAudit(99999);
assert.equal(auditLast.rows.length,18);
const groups=lib.getTopicGroups();
const groupedSubjects=[...groups.basic,...groups.clinical,...groups.other].map(x=>x.name);
assert.ok(new Set(groupedSubjects).size>20&&new Set(groupedSubjects).size<=bank.subjects.length);
console.log(JSON.stringify({passed:true,routes:['overview','topics','practice','answers','exams','exam detail','anatomy','quality audit'],checks:25,counts:expected,lastQuestionPage:final.page,lastAuditPage:auditLast.page,subjectGroups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))},null,2));
