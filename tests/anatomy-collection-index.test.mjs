import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/anatomy-collections.json',import.meta.url),'utf-8'));
test('all 28 anatomical syllabus sections are available without publishing restricted source metadata',()=>{
 assert.equal(catalog.schemaVersion,2);
 assert.equal(catalog.collections.length,28);
 assert.ok(catalog.collections.some(c=>c.title.includes('Brain')));
 for (const c of catalog.collections){
  assert.equal(c.status,'awaiting-reviewed-media');
  assert.ok(c.id && c.bodyRegion && c.title);
  assert.equal(Object.hasOwn(c,'viewerUrl'),false);
  assert.equal(Object.hasOwn(c,'sourceDocument'),false);
  assert.equal(Object.hasOwn(c,'uniqueImageReferences'),false);
 }
});
