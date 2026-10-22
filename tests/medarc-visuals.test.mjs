import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {LEARNING_VISUALS} from '../src/lib/learningVisuals.js';

test('All 20 MedArc illustrated learning scenes have real WebP assets',()=>{
 assert.equal(LEARNING_VISUALS.length,20);
 assert.equal(new Set(LEARNING_VISUALS.map(x=>x.id)).size,20);
 for(const item of LEARNING_VISUALS){
  assert.match(item.src,/^\/medarc\/visuals\/\d{2}_[a-z0-9_]+\.webp$/);
  assert.ok(item.title&&item.alt&&item.href);
  const full=path.join('public',item.src);
  assert.ok(existsSync(full),'Missing: '+item.src);
  const buf=readFileSync(full);
  assert.ok(buf.length>2000,'Too small: '+item.src);
  assert.equal(buf.toString('ascii',0,4),'RIFF','Invalid WebP header: '+item.src);
  assert.equal(buf.toString('ascii',8,12),'WEBP','Invalid WebP signature: '+item.src);
 }
 const files=readdirSync('public/medarc/visuals').filter(x=>x.endsWith('.webp'));
 assert.equal(files.length,20);
});

test('The two Tanzanian/African medical student hero portraits are PNG files',()=>{
 for(const name of ['hero-standing-group.png','hero-discussion-group.png']){
  const p=path.join('public','medarc',name);
  assert.ok(existsSync(p),'Missing hero portrait: '+name);
  assert.deepEqual([...readFileSync(p).subarray(0,8)],[137,80,78,71,13,10,26,10]);
 }
});

test('Student imagery is linked without overriding provisional answer grading safeguards',()=>{
 const question=readFileSync('src/components/QuestionCard.jsx','utf8');
 assert.ok(question.includes("evaluateAnswer(answer,choice"));
 assert.ok(question.includes("Response saved — not graded"));
 assert.ok(question.includes("Different from the prepared answer"));
 assert.ok(question.includes("feedbackImage"));
 const home=readFileSync('src/app/page.jsx','utf8');
 assert.ok(home.includes('hero-standing-group.png'));
 assert.ok(home.includes('hero-discussion-group.png'));
 const gallery=readFileSync('src/app/visual-learning/page.jsx','utf8');
 assert.ok(gallery.includes('LEARNING_VISUALS.map'));
});
