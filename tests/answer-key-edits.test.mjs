import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {KEY_ONLY_EDITS} from '../src/lib/answer-key-edits.mjs';
import {getReviewedEdit} from '../src/lib/reviewed-edits.mjs';
import {prepareLearningQuestion} from '../src/lib/question-presentation.mjs';
import {curateQuestion} from '../src/lib/question-curation.mjs';
import {assessQuestionQuality} from '../src/lib/question-quality.mjs';
const bank=JSON.parse(fs.readFileSync(new URL('../data/bank.json',import.meta.url)));
const sources=new Map(bank.questions.map(q=>[q.id,q]));
test('answer-only edits apply only to unchanged source stems and choices',()=>{
  assert.equal(Object.keys(KEY_ONLY_EDITS).length,22);
  for(const [id,edit] of Object.entries(KEY_ONLY_EDITS)){
    const q=sources.get(id);
    assert.equal(getReviewedEdit(q),edit);
    assert.equal(getReviewedEdit({...q,stem:q.stem+' changed'}),null);
    assert.equal(getReviewedEdit({...q,options:q.options.slice(1)}),null);
    const p=prepareLearningQuestion(q),d=curateQuestion(p.question);
    assert.equal(p.blocked.length,0,id);
    assert.notEqual(assessQuestionQuality(p.question).status,'quarantined',id);
    assert.equal(d.subject,edit.subject,id);assert.equal(d.topic,edit.topic,id);
    assert.equal(p.answer.reviewStatus,'answer_key_checked');
    assert.equal(p.answer.explanationsDeferred,true);
    assert.equal(p.answer.explanation,undefined);
    assert.equal(p.answer.references,undefined);
    assert.equal(p.question.options.find(o=>o.label===p.answer.correct).text,p.answer.answerText);
    for(const s of [p.question.stem,...p.question.options.map(o=>o.text)]){
      assert.doesNotMatch(s,/QUESTIONS|ANSWERS|THORAX:|ABDOMEN:|[✓✔☑]/);
    }
  }
});
