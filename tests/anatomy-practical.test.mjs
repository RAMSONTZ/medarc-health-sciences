import test from 'node:test';
import assert from 'node:assert/strict';
import {alphabeticMarker,normalizeMarker,getOptions,markResponse,gradeSummary,validateDraftManifest,closestMarker} from '../src/lib/anatomy-practical.mjs';
test('Markers label A...Z, AA without revealing labels',()=>{
 assert.equal(alphabeticMarker(0),'A');assert.equal(alphabeticMarker(25),'Z');assert.equal(alphabeticMarker(26),'AA');
});
test('Normalize legacy marker positions and text fields',()=>{
 const m=normalizeMarker({x:45,y:32,label:'Reviewed structure'},0);
 assert.equal(m.name,'Reviewed structure');assert.equal(m.letter,'A');assert.equal(m.x,45);assert.equal(m.y,32);assert.equal(m.labelX,56);
});
test('MCQ options use only authored answer key and distractors',()=>{
 const m=normalizeMarker({x:30,y:40,name:'Teacher-approved structure',nameDistractors:['False 1','False 2']},0);
 const choices=getOptions(m,'name');assert.equal(choices.length,3);assert.ok(choices.includes('Teacher-approved structure'));
 assert.equal(markResponse(m,'name','False 1').status,'incorrect');
 assert.equal(markResponse(m,'name','Teacher-approved structure').status,'correct');
});
test('Location question cannot grade without reviewed location',()=>{
 const m=normalizeMarker({x:30,y:40,name:'Structure',nameDistractors:['B','C']},0);
 assert.deepEqual(getOptions(m,'location'),[]);
 assert.equal(markResponse(m,'location','anything').status,'unavailable');
});
test('Written prompt is self assessed, not string-scored',()=>{
 const m=normalizeMarker({x:30,y:40,name:'Structure'},0);
 assert.equal(markResponse(m,'name','structure').status,'self-assessment');
});
test('MCQ choice labels differ from image-target label',()=>{
 const m=normalizeMarker({x:20,y:30,name:'Aorta',nameDistractors:['Pulmonary artery','Vena cava','Esophagus']},0);
 assert.equal(m.letter,'A');assert.equal(getOptions(m,'name').length,4);
});
test('Grade summary counts only checked MCQs',()=>{
 assert.deepEqual(gradeSummary({a:{status:'correct'},b:{status:'incorrect'},c:{status:'self-assessment'}}),{correct:1,answered:2});
});
test('Reject invalid imported coordinate or missing images',()=>{
 assert.equal(validateDraftManifest({images:[{id:'test',markers:[{x:-2,y:40}]}]}).valid,false);
 assert.equal(validateDraftManifest({images:[{id:'test',markers:[{x:50,y:40,name:'Verified label'}]}]}).valid,true);
});

test('Student tapping a nearby anatomical part selects the matching target',()=>{
 const markers=[normalizeMarker({x:23,y:34,name:'A'},0),normalizeMarker({x:75,y:65,name:'B'},1)];
 assert.equal(closestMarker(markers,24,35),0);
 assert.equal(closestMarker(markers,78,63),1);
 assert.equal(closestMarker(markers,50,50),-1);
});
