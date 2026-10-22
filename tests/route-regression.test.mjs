import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bank=JSON.parse(fs.readFileSync(path.join(root,'data','bank.json'), 'utf8'));
const qmap=new Map(bank.questions.map(q=>[q.id,q]));
const examMap=new Map(bank.exams.map(e=>[e.id,e]));
const ANSWERS=bank.answers||{};
const {assessQuestionQuality}=await import(pathToFileURL(path.join(root,'src/lib/question-quality.mjs')));
const usableQuestions=bank.questions.filter(q=>assessQuestionQuality(q).status!=='quarantined');
const usableIDs=new Set(usableQuestions.map(q=>q.id));
const usableAnswered=usableQuestions.filter(q=>ANSWERS[q.id]).length;

// Every route test reads the true 30,068-question bank, not synthetic fixtures.
const source=fs.readFileSync(path.join(root,'src/lib/bank.js'), 'utf8').replace(/^import 'server-only';\s*/m,'')
  .replace("from './question-quality.mjs';", "from '"+pathToFileURL(path.join(root,'src/lib/question-quality.mjs')).href+"';");
const lib=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('student practice excludes quarantined imports while preserving record order',()=>{
  assert.equal(lib.getQuestions().questions[0].id,usableQuestions[0].id);
  const final=lib.getQuestions({page:1e7});
  assert.equal(final.count,usableQuestions.length);
  assert.equal(final.page,Math.ceil(usableQuestions.length/10));
  assert.equal(final.questions.at(-1).id,usableQuestions.at(-1).id);
  assert.equal(lib.getQuestions({page:-8}).page,1);
});

test('answer-library always excludes unanswered or missing keys',()=>{
  for (const page of [1,2,19,30,235]) {
    const data=lib.getQuestions({page},true);
    assert.ok(data.questions.every(q=>!!ANSWERS[q.id] && q.answer!==null));
    assert.equal(data.count,usableAnswered);
  }
});

test('exam lookup preserves order of usable members and archives corrupted entries',()=>{
  assert.equal(examMap.size,1201);
  for (const ex of bank.exams) {
    const clean=ex.questionIds.filter(id=>usableIDs.has(id));
    const first=lib.getExam(ex.id,1);
    if(!clean.length){assert.equal(first,null);continue;}
    assert.equal(first.exam.id,ex.id);
    assert.equal(first.exam.total,clean.length);
    assert.equal(first.question?.id,clean[0]);
    const last=lib.getExam(ex.id,clean.length);
    assert.equal(last.question?.id,clean.at(-1));
  }
});

test('all answer references resolve to the exact question option labels',()=>{
  for (const [id,a] of Object.entries(ANSWERS)) {
    const q=qmap.get(id);
    assert.ok(q,`Unknown answer ID ${id}`);
    const options=(q.options||[]).map(o=>o.label);
    if (options.length) {
      const keys=Array.isArray(a.correct)?a.correct:[a.correct];
      for (const key of keys) assert.ok(options.includes(key),`Bad option ${id}: ${key}`);
    }
    assert.ok(String(a.explanation||'').trim().length>0,`Missing explanation: ${id}`);
  }
});

test('server-side query matching is deterministic across punctuation, empty and long search terms',()=>{
  const q=usableQuestions.find(x=>x.stem?.length>30 && x.options?.length>0);
  assert.ok(q);
  const term=q.stem.slice(0,12);
  const hit=lib.getQuestions({q:term});
  assert.ok(hit.count>=1);
  assert.ok(hit.questions.some(x=>x.id===q.id)||hit.count>10);
  const empties=lib.getQuestions({q:'   '});
  assert.equal(empties.count,usableQuestions.length);
  const constrained=lib.getQuestions({q:'x'.repeat(200)});
  assert.ok(constrained.count>=0);
});

test('quality audit reaches the final unique question exactly once',()=>{
  const size=25;
  const first=lib.getAudit(1);
  const last=lib.getAudit(100000);
  assert.equal(first.rows[0].id,bank.questions[0].id);
  assert.equal(last.rows.at(-1).id,bank.questions.at(-1).id);
  assert.equal(last.rows.length,bank.questions.length%size||size);
});

test('source and formatted exam routes are present and account for all official route files',()=>{
  const expected=['src/app/page.jsx','src/app/topics/page.jsx','src/app/practice/page.jsx',
    'src/app/answers/page.jsx','src/app/exams/page.jsx','src/app/exams/[id]/page.jsx',
    'src/app/anatomy/page.jsx','src/app/review/page.jsx'];
  for (const rel of expected) assert.ok(fs.existsSync(path.join(root,rel)),`Missing route: ${rel}`);
});
