import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicDir=path.join(root,'public');

function walk(dir){
 if(!fs.existsSync(dir)) return [];
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
   const target=path.join(dir,entry.name);
   return entry.isDirectory()?walk(target):[target];
 });
}

test('never serve the full standalone bank from /public',()=>{
  const publicFiles=walk(publicDir);
  assert.ok(!publicFiles.some(file=>/Previous_Studio\.html$/i.test(file)), 'Legacy HTML must not be publicly accessible');
  assert.ok(!publicFiles.some(file=>/bank\.json$/i.test(file)), 'Bank JSON must not be served statically');
  assert.ok(publicFiles.every(file=>{
    const size=fs.statSync(file).size;
    if(size<1_000_000)return true;
    // Only the two newly generated student-group PNG hero images may exceed 1 MB.
    // Keep every other large public file disallowed to prevent exposing the bank.
    if(!/[/\\\\]public[/\\\\]medarc[/\\\\]hero-(standing|discussion)-group\\.png$/i.test(file)||size>5_000_000)return false;
    const bytes=fs.readFileSync(file).subarray(0,8);
    return bytes.equals(Buffer.from([137,80,78,71,13,10,26,10]));
  }), 'Unexpected large public asset might contain full bank');
  assert.ok(fs.existsSync(path.join(root,'data','bank.json')), 'Private bank missing');
  assert.ok(!fs.existsSync(path.join(root,'offline-archive')), 'Legacy archive must not be shipped with the public repository');
});

test('all server routes remain disallowed for indexing by default',()=>{
  const layout=fs.readFileSync(path.join(root,'src/app/layout.jsx'),'utf8');
  assert.match(layout,/robots\s*:\s*\{\s*index\s*:\s*false\s*,\s*follow\s*:\s*false/);
});

test('serverless build must trace the private bank into Next.js output',()=>{
  const config=fs.readFileSync(path.join(root,'next.config.mjs'),'utf8');
  assert.match(config,/outputFileTracingIncludes/);
  assert.match(config,/data\/bank\.json/);
});

test('public topic index contains no question or answer keys',()=>{
  const file=path.join(publicDir,'topic-index.json');
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  const s=JSON.stringify(data);
  assert.ok(s.length<200_000, 'Index unexpectedly too large');
  assert.ok(!s.includes('q-569217b9d9cf'), 'Question IDs must not appear in public index');
  assert.ok(!s.includes('answerText'), 'Answer keys must not appear in public index');
});
