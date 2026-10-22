import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=path.join(root,'src');
const allowed=new Set(['.jsx','.js','.css','.mjs']);
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('student-facing MedArc UI has no external university brand or direct source viewer links',()=>{
 for (const file of files(src)){
  if (!allowed.has(path.extname(file))) continue;
  const t=fs.readFileSync(file,'utf8');
  assert.doesNotMatch(t,/university of michigan|bluelink|sites\.google\.com\/a\/umich\.edu/ig, `Unexpected reference in ${file}`);
 }
});
test('third-party anatomy photographs are not embedded in public assets',()=>{
 const images=JSON.parse(fs.readFileSync(path.join(root,'data','anatomy-images.json'),'utf8'));
 assert.equal(images.images.length,0);
 const publicMedia=path.join(root,'public','anatomy');
 const media=fs.readdirSync(publicMedia).filter(n=>!n.startsWith('.'));
 assert.deepEqual(media,[]);
});
