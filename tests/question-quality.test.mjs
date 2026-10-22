import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessQuestionQuality,isStudentReady} from '../src/lib/question-quality.mjs';
const q=(stem,options=[],type='Short Answer')=>({id:'test',stem,options:options.map((text,i)=>({label:String.fromCharCode(65+i),text})),type});
test('retains medically meaningful authored questions, including unanswered short answers',()=>{
 assert.equal(isStudentReady(q('What are the mechanisms of heart failure?')),true);
 assert.equal(isStudentReady(q('Describe the anatomical features of the thyroid gland.')),true);
 assert.equal(isStudentReady(q('Which antibiotic is most appropriate?', ['Amoxicillin','Gentamicin','Ceftriaxone'], 'Single Best Answer MCQ')),true);
});
test('quarantines Word imported image fields and XML garbage',()=>{
 assert.equal(assessQuestionQuality(q("HYPERLINK \"javascript:WPShow('WPComment1')\" INCLUDEPICTURE \"bad.gif\" MERGEFORMAT")).status,'quarantined');
 assert.equal(assessQuestionQuality(q('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).status,'quarantined');
 assert.equal(assessQuestionQuality(q('Which of the following is true?', ['Normal answer','xmlns:a=http://schemas.openxmlformats.org/drawingml/2006/main'],'Single Best Answer MCQ')).status,'quarantined');
});
test('quarantines nonquestion text, mojibake and unusable choice sets',()=>{
 assert.equal(isStudentReady(q('Ã7wjc1TMUX Ylb}}?')),false);
 assert.equal(isStudentReady(q('3')),false);
 assert.equal(isStudentReady(q('Which diagnosis is correct?', [], 'Single Best Answer MCQ')),false);
 assert.equal(isStudentReady(q('Which diagnosis is correct?', ['Same','same'], 'Single Best Answer MCQ')),false);
});
test('flags suspicious lengthy cases for review without automatic loss',()=>{
 const s='Discuss the differential diagnosis and investigation of a clinical case. '.repeat(40);
 const result=assessQuestionQuality(q(s));
 assert.equal(result.status,'review');
 assert.equal(isStudentReady(q(s)),true);
});
