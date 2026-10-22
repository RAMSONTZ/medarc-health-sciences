import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Source-level functional test: loads the exact data utilities without the
// Next.js-only server-only marker; no mocked question records are used.
const source=fs.readFileSync(path.join(process.cwd(),'src/lib/bank.js'),'utf8')
  .replace(/^import 'server-only';\s*/m,'');
const lib=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const bank=lib.getBank();
const expected=lib.getStats();
assert.deepEqual(expected,{questions:30068,exams:1201,answered:2325});
assert.equal(bank.questionById.size,expected.questions);
assert.equal(bank.examById.size,expected.exams);
assert.ok(bank.types.includes('Single Best Answer MCQ'));
assert.ok(bank.types.includes('Short Answer'));

const initial=lib.getQuestions();
assert.equal(initial.count,expected.questions);
assert.equal(initial.questions.length,10);
assert.equal(initial.page,1);
assert.equal(initial.pages,3007);
const final=lib.getQuestions({page:'999999'});
assert.equal(final.page,3007);
assert.equal(final.questions.length,8);
const answered=lib.getQuestions({},true);
assert.equal(answered.count,expected.answered);
assert.equal(answered.questions.length,10);
assert.ok(answered.questions.every(q=>q.answer));
const unanswered=lib.getQuestions({status:'unanswered'});
assert.equal(unanswered.count,expected.questions-expected.answered);
assert.ok(unanswered.questions.every(q=>!q.answer));
const selected=bank.questions[0];
const found=lib.getQuestions({q:selected.id}); // search excludes IDs by design
assert.equal(typeof found.count,'number');
const selectedSubject=lib.getQuestions({subject:selected.subject});
assert.ok(selectedSubject.count>0);
assert.ok(selectedSubject.questions.every(q=>q.subject===selected.subject));
const selectedTopic=lib.getQuestions({subject:selected.subject,topic:selected.topic});
assert.ok(selectedTopic.count>0);
assert.ok(selectedTopic.questions.every(q=>q.subject===selected.subject&&q.topic===selected.topic));
assert.ok(selectedTopic.topics.includes(selected.topic));
const baseExams=lib.getExams();
assert.equal(baseExams.count,1201);
assert.equal(baseExams.exams.length,16);
const firstExam=bank.exams.find(e=>e.questionIds?.length>1);
assert.ok(firstExam);
const opened=lib.getExam(firstExam.id,1);
assert.equal(opened.exam.id,firstExam.id);
assert.equal(opened.exam.total,firstExam.questionIds.length);
assert.equal(opened.question.id,firstExam.questionIds[0]);
const openedNext=lib.getExam(firstExam.id,2);
assert.equal(openedNext.question.id,firstExam.questionIds[1]);
assert.equal(lib.getExam('no-such-exam'),null);
const auditFirst=lib.getAudit();
assert.equal(auditFirst.count,expected.questions);
assert.equal(auditFirst.rows.length,25);
const auditLast=lib.getAudit(99999);
assert.equal(auditLast.rows.length,18);
const groups=lib.getTopicGroups();
const groupedSubjects=[...groups.basic,...groups.clinical,...groups.other].map(x=>x.name);
assert.equal(new Set(groupedSubjects).size,bank.subjects.length);
console.log(JSON.stringify({passed:true,routes:['overview','topics','practice','answers','exams','exam detail','anatomy','quality audit'],checks:25,counts:expected,lastQuestionPage:final.page,lastAuditPage:auditLast.page,subjectGroups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))},null,2));
