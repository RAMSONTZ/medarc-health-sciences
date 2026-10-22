import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {resolveQuestionDepartment,isClinicalManagementQuestion} from '../src/lib/department-routing.mjs';

const root=path.resolve(import.meta.dirname,'..');
const original=JSON.parse(fs.readFileSync(path.join(root,'data/bank.json'),'utf8'));
const byId=new Map(original.questions.map(q=>[q.id,q]));
const q=(stem,subject='Human Anatomy',topic='Head and Neck')=>({stem,subject,topic,options:[]});
test('anatomy retains structure, innervation, vascular and anatomical clinical questions',()=>{
 for(const stem of [
  'Which nerve supplies the deltoid muscle?',
  'What are the anatomical relations of the thyroid gland?',
  'A patient fractured the humerus. Which nerve runs in the radial groove?',
  'What is the course and branches of the brachial artery?'
 ]){
   const r=resolveQuestionDepartment(q(stem));
   assert.equal(r.subject,'Human Anatomy',stem);
   assert.equal(r.topic,'Head and Neck');
 }
});
test('therapeutic and prescribing questions NEVER appear under Human Anatomy',()=>{
 for(const stem of [
  'What is the initial treatment of hypertension?',
  'Which drug should be prescribed to treat hypertension?',
  'What is the most appropriate next step in management of acute kidney injury?',
  'Which of the following drugs causes osteomalacia when used chronically?',
  'Treatment of pelvic inflammatory disease includes the following EXCEPT',
  'What is the ideal management for a patient with lymphoma?'
 ]){
  const r=resolveQuestionDepartment(q(stem));
  assert.notEqual(r.subject,'Human Anatomy',stem);
 }
});
test('verified real import errors route into appropriate study departments',()=>{
 const cases=[
  ['q-cb21b25c20e2','Pharmacology'],
  ['q-3bb8983e177e','Internal Medicine'],
  ['q-cb1fc011bf3a','Obstetrics and Gynecology'],
  ['q-97b754f4f5c4','Obstetrics and Gynecology'],
  ['q-1670038183c2','Hematology']
 ];
 for(const [id,subject] of cases) {
  const source=byId.get(id);
  assert.ok(source,'Source question missing '+id);
  const routed=resolveQuestionDepartment(source);
  assert.equal(routed.subject,subject,JSON.stringify({id,stem:source.stem,routed}));
  assert.equal(routed.sourceSubject,source.subject);
  assert.notEqual(routed.topic,'Head and Neck');
 }
});
test('all 30,068 preserved records have a deterministic department and zero therapeutic questions in Anatomy',()=>{
 assert.equal(original.questions.length,30068);
 const valid=new Set([
  'Pharmacology','Unclassified Health Sciences','Human Anatomy','Parasitology','ENT','General Pathology','Hematology',
  'Internal Medicine','General Surgery','Community Health and Public Health','Microbiology','Obstetrics and Gynecology',
  'Pediatrics and Child Health','Human Physiology','Medical Biochemistry','Embryology','Neurology','Community Medicine',
  'Histology','Immunology','Nutrition and Dietetics','Biostatistics and Research','Anesthesiology','Ophthalmology',
  'Psychiatry','Emergency Medicine','Medical Genetics','Epidemiology','Radiography and Medical Imaging','Clinical Medicine',
  'Dermatology','Medical Laboratory Sciences','Public Health and Research','Medical Ethics and Law','Development Studies',
  'Orthopedics','Nursing'
 ]);
 let reassigned=0,anatomy=0,unresolved=0;
 for(const source of original.questions){
   const r=resolveQuestionDepartment(source);
   assert.ok(valid.has(r.subject),source.id+': invalid subject '+r.subject);
   if(r.reassigned)reassigned++;
   if(r.review)unresolved++;
   if(r.subject==='Human Anatomy'){
     anatomy++;
     assert.equal(isClinicalManagementQuestion(source),false,source.id+' should not be an anatomy treatment question');
   }
 }
 assert.ok(reassigned>10);
 assert.ok(anatomy>500);
 assert.ok(unresolved<3000);
});
