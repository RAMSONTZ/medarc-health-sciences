import assert from 'node:assert/strict';
import {test} from 'node:test';
import {evaluateAnswer,optionFeedback} from '../src/lib/scoring.js';

test('single-response answers match or differ from a prepared draft key',()=>{
  assert.deepEqual(evaluateAnswer({correct:'B'},'B'),{status:'matches_prepared_key',matches:true});
  assert.deepEqual(evaluateAnswer({correct:'B'},'D'),{status:'differs_from_prepared_key',matches:false});
});
test('unanswered questions are never graded',()=>{
  assert.deepEqual(evaluateAnswer(null,'A'),{status:'unscored',matches:null});
  assert.deepEqual(evaluateAnswer({},'A'),{status:'unscored',matches:null});
});
test('multiple-response order cannot change the outcome',()=>{
  const a={correct:['A','C']};
  assert.equal(evaluateAnswer(a,['C','A'],{multiple:true}).matches,true);
  assert.equal(evaluateAnswer(a,['A'],{multiple:true}).matches,false);
  assert.equal(evaluateAnswer(a,['A','B'],{multiple:true}).matches,false);
  assert.equal(evaluateAnswer(a,['A','A','C'],{multiple:true}).matches,false);
});
test('multi-response questions without a multi-response key are unscored',()=>{
  assert.equal(evaluateAnswer({correct:'A'},['A'],{multiple:true}).status,'unscored');
});
test('written questions are self-assessed and not auto-graded',()=>{
  assert.deepEqual(evaluateAnswer({answerText:'Mitral valve'},'Mitral valve',{written:true}),{status:'self_assess',matches:null});
});

test('single-response feedback colors the key green and a selected wrong choice red',()=>{
  const a={correct:'B'};
  assert.equal(optionFeedback(a,'B','A',{checked:true}),'option-correct');
  assert.equal(optionFeedback(a,'A','A',{checked:true}),'option-incorrect');
  assert.equal(optionFeedback(a,'C','A',{checked:true}),'');
  assert.equal(optionFeedback(a,'B','B',{checked:false}),'');
  assert.equal(optionFeedback(null,'A','A',{checked:true}),'');
});
test('multi-response feedback waits for submission and marks every expected choice',()=>{
  const a={correct:['A','C']};
  for(const label of ['A','C'])assert.equal(optionFeedback(a,label,['A','B'],{checked:true,multiple:true}),'option-correct');
  assert.equal(optionFeedback(a,'B',['A','B'],{checked:true,multiple:true}),'option-incorrect');
  assert.equal(optionFeedback(a,'A',['A'],{checked:false,multiple:true}),'');
  assert.equal(optionFeedback({correct:'A'},'A',['A'],{checked:true,multiple:true}),'');
});
