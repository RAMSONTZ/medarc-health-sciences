import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {curateQuestion,duplicateKey} from '../src/lib/question-curation.mjs';
import {isClinicalManagementQuestion} from '../src/lib/department-routing.mjs';
const bank=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,'..','data','bank.json'),'utf8'));
const q=(subject,stem,topic='Unassigned topic',options=[])=>({id:'test',subject,stem,topic,options:options.map((x,i)=>({label:'ABCDE'[i],text:x}))});
test('all 30,068 original IDs receive explicit subject, topic, source and review decision',()=>{
 assert.equal(bank.questions.length,30068);
 const ids=new Set();
 let categories=0,wrong=0;
 for(const question of bank.questions){
  assert.ok(!ids.has(question.id),'Duplicate source ID '+question.id);ids.add(question.id);
  const d=curateQuestion(question);
  assert.ok(d.subject&&d.topic&&d.sourceSubject!==undefined,'Missing classification '+question.id+': '+JSON.stringify({source:question.subject,originalTopic:question.topic,curated:d}));
  assert.equal(d.sourceSubject,question.subject||'Unclassified Health Sciences');
  if(d.topic!=='Topic review required')categories++;
  if(d.subject==='Human Anatomy'&&isClinicalManagementQuestion(question))wrong++;
 }
 assert.equal(wrong,0);
 assert.ok(categories>8000,'Topic classification unexpectedly collapsed');
});
test('structural Anatomy is retained but hypertension treatment is separated',()=>{
 const normal=curateQuestion(q('Human Anatomy','Which nerve supplies the deltoid muscle?','Upper Limb'));
 assert.equal(normal.subject,'Human Anatomy');
 assert.equal(normal.topic,'Upper Limb');
 const treatment=curateQuestion(q('Human Anatomy','What is the most appropriate treatment of hypertension?','Head and Neck'));
 assert.notEqual(treatment.subject,'Human Anatomy');
 assert.notEqual(treatment.topic,'Head and Neck');
});
test('drug mechanism question is Pharmacology, not Biochemistry/Anatomy',()=>{
 const drug=curateQuestion(q('Human Anatomy','Which drug is a beta receptor antagonist?'));
 assert.equal(drug.subject,'Pharmacology');
 assert.ok(drug.topic!=='Head and Neck');
});
test('unassigned topics trigger review and cannot masquerade as approved',()=>{
 const d=curateQuestion(q('Unclassified Health Sciences','Which disease is most common in adults?'));
 assert.equal(d.review,true);
 assert.equal(d.topic,'Topic review required');
});
test('strict duplicate keys respect option content and do not merge different MCQs',()=>{
 const first=q('Human Anatomy','What is the arterial supply of the hand?','Upper Limb',['Ulnar artery','Axillary artery']);
 const same=q('Human Anatomy','  What   is the arterial supply of the hand?','Upper Limb',['Ulnar artery','Axillary artery']);
 const different=q('Human Anatomy','What is the arterial supply of the hand?','Upper Limb',['Radial artery','Axillary artery']);
 assert.equal(duplicateKey(first),duplicateKey(same));
 assert.notEqual(duplicateKey(first),duplicateKey(different));
});
