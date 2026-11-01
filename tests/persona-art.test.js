import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DIV_IDS,DIV_NAMES,DIV_PERSONA_ART} from '../web/src/data/divinity.js';
import {divinityView} from '../web/src/components/divinityView.js';
import {freshDivinity} from '../web/src/utils/divinitySave.js';
import {activateCooperation} from '../web/src/utils/divinityCooperation.js';

const root=path.resolve('.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('five approved persona portraits map one-to-one to the existing cooperation cards',()=>{
 assert.deepEqual(Object.keys(DIV_PERSONA_ART).sort(),[...DIV_IDS].sort());
 const state=freshDivinity();activateCooperation(state);
 const html=divinityView(state,()=>'<button></button>');
 for(const id of DIV_IDS){
  const asset=DIV_PERSONA_ART[id];
  assert.ok(fs.existsSync(path.join(root,asset)),`${id} optimized image exists`);
  assert.match(html,new RegExp(`<img src="${asset.replaceAll('.','\\.')}" alt="${DIV_NAMES[id]}の完成立ち絵" loading="lazy" decoding="async">`));
 }
});

test('originals and optimized WebP assets match the supplied handoff checksums',()=>{
 const lines=fs.readFileSync('assets/divinity/personas/SHA256SUMS.txt','utf8').trim().split(/\r?\n/);
 assert.equal(lines.length,10);
 for(const line of lines){
  const [,expected,relative]=line.match(/^([a-f0-9]{64})  (.+)$/)||[];
  assert.ok(expected&&relative,`valid checksum line: ${line}`);
  assert.equal(hash(fs.readFileSync(path.join(root,relative))),expected,relative);
 }
});

test('standalone build stores each unique image payload once',()=>{
 const html=fs.readFileSync('irena-play.html','utf8');
 const payloads=[...html.matchAll(/data:image\/(?:svg\+xml|png|jpe?g|webp);base64,([^"\]]+)/g)].map(x=>x[1]);
 assert.equal(payloads.length,77);
 assert.equal(new Set(payloads).size,payloads.length);
});

test('high-quality shared WebP compression matches the recorded sizes and exact outputs',()=>{
 const report=JSON.parse(fs.readFileSync('reports/standalone-image-optimization/summary.json','utf8'));
 for(const [asset,row]of Object.entries(report.images)){
  const bytes=fs.readFileSync(asset);
  assert.equal(bytes.length,row.afterBytes,asset+' optimized size');
  assert.equal(hash(bytes),row.afterSHA256,asset+' approved WebP bytes');
  assert.ok(row.afterBytes<row.beforeBytes*.6,asset+' meaningful size reduction');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
 assert.equal(report.standalone.bytesSaved,9666757);
});

test('unused non-archival images use strong compression while retaining file formats',()=>{
 const report=JSON.parse(fs.readFileSync('reports/standalone-image-optimization/summary.json','utf8'));
 for(const [asset,row]of Object.entries(report.unusedImages)){
  const bytes=fs.readFileSync(asset);
  assert.equal(bytes.length,row.afterBytes,asset+' compressed size');
  assert.equal(hash(bytes),row.afterSHA256,asset+' approved compressed bytes');
  assert.ok(row.afterBytes<row.beforeBytes*.6,asset+' strong compression');
  if(row.codec==='WebP')assert.equal(bytes.toString('ascii',8,12),'WEBP');
  if(row.codec==='PNG')assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
 }
});
