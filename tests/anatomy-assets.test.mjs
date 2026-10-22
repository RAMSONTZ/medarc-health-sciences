import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const collection=JSON.parse(fs.readFileSync(path.join(root,'data/anatomy-images.json'),'utf8'));

test('Only rights-reviewed local originals appear in the anatomy manifest',()=>{
 assert.equal(collection.schemaVersion,1);
 assert.ok(Array.isArray(collection.images));
 for(const asset of collection.images){
  assert.match(asset.src,/^\/anatomy\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/);
  const local=path.join(root,'public',asset.src.replace(/^\//,''));
  assert.ok(fs.existsSync(local),`Missing approved asset ${asset.src}`);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(local)).digest('hex'),asset.sha256);
  assert.ok(asset.credit && asset.license && asset.title && asset.alt);
  for(const m of asset.markers || []){
   assert.ok(m.x>=0&&m.x<=100&&m.y>=0&&m.y<=100);
   assert.ok(m.label);
  }
 }
});

test('No BlueLink originals are extracted into public anatomy directory',()=>{
 const imgs=fs.readdirSync(path.join(root,'public/anatomy')).filter(x=>/\.(jpg|jpeg|png|webp)$/i.test(x));
 assert.deepEqual(imgs.sort(), collection.images.map(a=>path.basename(a.src)).sort());
});
