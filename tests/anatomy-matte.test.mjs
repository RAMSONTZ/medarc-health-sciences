import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('Background removal remains a private reviewed operation',()=>{
 const s=fs.readFileSync(new URL('../scripts/prepare-transparent-anatomy.py',import.meta.url),'utf8');
 assert.match(s,/PREVIEW_ONLY_MANUAL_QA_REQUIRED/);
 assert.match(s,/--authorized/);
 assert.match(s,/pixels\[exterior,3\]=0/);
});
