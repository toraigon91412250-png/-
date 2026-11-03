import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const ids=['wing','abyss','fallen','judge','king'];
const manifest=JSON.parse(fs.readFileSync('reports/command-card-art/authorized-changes.json','utf8'));
const css=fs.readFileSync('web/src/components/game.css','utf8');
const view=fs.readFileSync('web/src/components/divinityView.js','utf8');
const builder=fs.readFileSync('tools/build.mjs','utf8');

test('all five authority card images are compact, valid WebP assets with exact audit hashes',()=>{
 let total=0;
 for(const id of ids){
  const file=`assets/divinity/command-cards/${id}-bg.webp`,bytes=fs.readFileSync(file),record=manifest.assets[file];
  assert.ok(record,`${id} is recorded in the authorized asset manifest`);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(bytes.length,record.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);
  assert.ok(bytes.length<20_000,`${id} remains below 20 KB`);
  total+=bytes.length;
  assert.ok(css.includes(`button[data-power="${id}"]`),`${id} has a scoped card style`);
  assert.ok(css.includes(`assets/divinity/command-cards/${id}-bg.webp`),`${id} source art is referenced`);
 }
 assert.ok(total<75_000,`combined artwork is ${total} bytes`);
 assert.match(view,/data-power="\$\{DIV_SKILLS\[id\]\?\.power\|\|''\}"/);
});

test('standalone builder embeds all command-card images instead of requiring sidecar downloads',()=>{
 for(const id of ids){
  assert.ok(builder.includes(`'${id}'`),`${id} is in the standalone asset inliner`);
  assert.ok(builder.includes(`'assets/divinity/command-cards/'+id+'-bg.webp'`));
 }
});
