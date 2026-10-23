import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareLearningQuestion,prepareLearningBank} from '../src/lib/question-presentation.mjs';
import {getReviewedEdit} from '../src/lib/reviewed-edits.mjs';
import {REVIEWED_EDITS} from '../src/lib/reviewed-question-edits.mjs';
import {curateQuestion} from '../src/lib/question-curation.mjs';
import {assessQuestionQuality} from '../src/lib/question-quality.mjs';
const bank=JSON.parse(fs.readFileSync(new URL('../data/bank.json',import.meta.url)));
const source=id=>bank.questions.find(q=>q.id===id);
const prepare=id=>prepareLearningQuestion(source(id));
test('embedded web answer is removed and all four original choices are preserved',()=>{
 const p=prepare('q-90192bb1c75d');
 assert.equal(p.question.stem,'Which of the following disease is associated with joints?');
 assert.deepEqual(p.question.options.map(o=>o.text),['Gout','Osteoporosis','Arthritis','Tetany']);
 assert.equal(p.answer,null,'An imported answer must not become a verified key');
 assert.match(p.extracted[0].text,/Arthritis/);
});
test('a marked correct choice inside the stem becomes an ordinary unmarked option',()=>{
 const p=prepare('q-c058f0f392ed');
 assert.ok(!p.question.stem.includes('Gangrene'));
 assert.deepEqual(p.question.options.map(o=>o.label),['A','B','C','D','E']);
 assert.equal(p.question.options[0].text,'Gangrene');
 assert.equal(p.answer,null);
 assert.equal(curateQuestion(p.question).subject,'General Pathology');
});
test('a solution appended to choices does not become duplicate choices',()=>{
 const p=prepare('q-b03d462fcf9e');
 assert.equal(p.question.options.length,5);
 assert.equal(p.question.options.at(-1).text,'It causes rectal compression.');
 assert.ok(p.extracted.some(x=>/SOLUTION/.test(x.text)));
 assert.ok(!p.question.options.some(o=>/Explanation|SOLUTION/.test(o.text)));
});
test('formatted imported answer is hidden and a complete MCQ is reconstructed',()=>{
 const p=prepare('q-8b175e0ca244');
 assert.equal(p.question.type,'Single Best Answer MCQ');
 assert.equal(p.question.stem,'What role does nutrition play in the immune system?');
 assert.equal(p.question.options.at(-1).text,'Minor role');
 assert.equal(p.answer,null);
});
test('interleaved subquestions and answers cannot be silently truncated into a quiz',()=>{
 const p=prepare('q-53a12a81878c');
 assert.ok(p.blocked.includes('interleaved_questions_and_answers'));
 assert.equal(assessQuestionQuality(p.question).status,'quarantined');
 assert.match(p.question.stem,/How are you going to treat/);
});
test('every reviewed correction is bound to its exact source and has usable references and explanation',()=>{
 for(const [id,edit] of Object.entries(REVIEWED_EDITS)){
  assert.ok(getReviewedEdit(source(id)),id+' source fingerprint failed');
  assert.equal(getReviewedEdit({...source(id),stem:source(id).stem+' changed'}),null);
  const p=prepare(id);
  if(edit.answer){
   assert.equal(p.blocked.length,0,id+' blocked after review');
   assert.ok(p.answer.explanation.trim());assert.ok(p.answer.references.every(x=>/^https:\/\//.test(x.url)));
   assert.equal(p.answer.clinicianSignOff,false);
   assert.equal(curateQuestion(p.question).subject,edit.subject);
   if(p.question.options.length){
    const keys=Array.isArray(p.answer.correct)?p.answer.correct:[p.answer.correct];
    assert.ok(keys.every(k=>p.question.options.some(o=>o.label===k)),id+' invalid answer label');
    assert.ok(p.question.options.every(o=>p.answer.optionReasons[o.label]));
   }
  }else assert.equal(assessQuestionQuality(p.question).status,'quarantined');
 }
});
test('source bank, all IDs and exam memberships remain untouched by presentation cleanup',()=>{
 const before=JSON.stringify(bank);
 bank.questions.forEach(prepareLearningQuestion);
 assert.equal(JSON.stringify(bank),before);
 assert.equal(bank.questions.length,30068);assert.equal(bank.exams.length,1201);
 assert.equal(bank.exams.flatMap(e=>e.questionIds).length,54926);
});
test('no recognized explicit answer markers reach a usable learner stem or choice',()=>{
 const active=prepareLearningBank(bank);
 for(const q of active.questions){
  if(assessQuestionQuality(q).status==='quarantined')continue;
  for(const field of [q.stem,...q.options.map(o=>o.text)]){
   assert.doesNotMatch(field,/\b(?:the correct answer is|the answer is\s+[a-e]\b|view answer|explanation\s*:|answer\s*:\s*[a-e]\b)|[✓✔☑]/i,q.id);
  }
 }
});
