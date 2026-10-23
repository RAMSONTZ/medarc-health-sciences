import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'public','medarc','visuals');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('all 20 user-provided transparent study visuals are local valid WebP files',()=>{
  const files=fs.readdirSync(dir).filter(name=>name.endsWith('.webp') && /^[0-9][0-9]_/.test(name));
  assert.equal(files.length,20,'Expected exactly 20 individual transparent assets');
  for(const name of files){
    const bytes=fs.readFileSync(path.join(dir,name));
    assert.ok(bytes.length>3000,'Suspiciously small visual '+name);
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
  }
});
test('the full 20-image gallery links every visual to meaningful learning',()=>{
  const visuals=read('src/lib/learningVisuals.js');
  const references=[...visuals.matchAll(/"src": "\/medarc\/visuals\/([^"]+)"/g)].map(x=>x[1]);
  assert.equal(references.length,20);
  assert.equal(new Set(references).size,20);
  references.forEach(name=>assert.ok(fs.existsSync(path.join(dir,name)),'Missing image '+name));
  const page=read('src/app/visual-learning/page.jsx');
  assert.match(page,/LEARNING_VISUALS\.map/);
  assert.match(page,/href=\{visual\.href\}/);
});
test('home and subject pages use accessible visual learning links',()=>{
  const home=read('src/app/page.jsx');
  const topics=read('src/app/topics/page.jsx');
  assert.match(home,/medarc-home-visual-links/);
  assert.match(home,/medarc-scene-scroll/);
  assert.match(home,/LEARNING_VISUALS/);
  assert.match(home,/alt=\{item\.alt\}/);
  assert.match(topics,/02_collaborative_study\.webp/);
});
test('question feedback shows contextual encouragement without implying medically reviewed marking',()=>{
  const question=read('src/components/QuestionCard.jsx');
  assert.match(question,/16_positive_feedback_good_work\.webp/);
  assert.match(question,/18_motivation_dont_give_up\.webp/);
  assert.match(question,/20_motivation_you_can_do_it\.webp/);
  assert.match(question,/Correct/);
  assert.match(question,/Education only/);
});
