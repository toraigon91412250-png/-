import {auditRead} from './audit-baseline.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fresh,developerState} from '../web/src/utils/progression.js';
import {AWAKENINGS} from '../web/src/data/config.js';
const baseline=JSON.parse(fs.readFileSync(new URL('./home-ui-baseline.json',import.meta.url)));
const root=new URL('../',import.meta.url),read=file=>auditRead(new URL(file,root));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
let app=read('web/src/components/App.js').toString();
// Undo only the declared upgrade UI hunks before checking earlier home/battle contracts.
for(const patch of JSON.parse(read('reports/upgrade-ui/app-patches.json')).reverse()){assert.equal(app.split(patch.new).length-1,1,'exact upgrade UI patch');app=app.replace(patch.new,patch.old);}
for(const patch of JSON.parse(read('reports/polish/app-patches.json')).reverse()){assert.equal(app.split(patch.new).length-1,1,'exact summon presentation patch');app=app.replace(patch.new,patch.old);}
// Reverse only exact campaign integration patches; retain all historical function hashes.
for(const patch of JSON.parse(read('reports/overnight-lab/app-patches.json')).reverse()){assert.equal(app.split(patch.new).length-1,1,'exact authorized insertion');app=app.replace(patch.new,patch.old);}
const declarations=[...app.matchAll(/^(?:export )?function (\w+)\(/gm)];
const funcs=Object.fromEntries(declarations.map((m,i)=>[m[1],app.slice(m.index,declarations[i+1]?.index??app.length).trim()]));
const context=vm.createContext({AWAKENINGS});vm.runInContext(funcs.homeGoal,context);const goal=a=>context.homeGoal(a);
test('home-only update preserves every original asset, battle/config/progression/storage byte',()=>{
 for(const [file,hash]of Object.entries(baseline.files))assert.equal(sha(read(file)),hash,file);
});
test('all functions outside the authorized home and battle views, including save handlers, remain unchanged',()=>{
 for(const [name,hash]of Object.entries(baseline.functions).filter(([name])=>name!=='battleView'))assert.equal(sha(funcs[name]||''),hash,name);
});
test('home and Irena battle styles remain scoped and append to the intact original stylesheet',()=>{
 const css=read('web/src/components/game.css');assert.equal(sha(css.subarray(0,baseline.originalCSSBytes)),baseline.originalCSSSHA256);
 const polish=JSON.parse(read('reports/polish/css-baseline.json'));const upgradeCSS=JSON.parse(read('reports/upgrade-ui/css-baseline.json'));const powerPolish=JSON.parse(read('reports/upgrade-ui/power-polish-css.json'));assert.equal(sha(css.subarray(0,upgradeCSS.previousBytes)),upgradeCSS.previousSHA256);assert.equal(sha(css.subarray(upgradeCSS.previousBytes,powerPolish.previousBytes)),upgradeCSS.addedSHA256);assert.equal(sha(css.subarray(0,powerPolish.previousBytes)),powerPolish.previousSHA256);assert.equal(sha(css.subarray(powerPolish.previousBytes)),powerPolish.addedSHA256);assert.equal(upgradeCSS.previousSHA256,polish.currentSHA256);assert.equal(sha(css.subarray(0,polish.previousBytes)),polish.previousSHA256);const additions=css.subarray(baseline.originalCSSBytes,polish.previousBytes).toString();
 for(const block of additions.matchAll(/([^{}]+)\{/g)){
  const selector=block[1].replace(/\/\*[\s\S]*?\*\//g,'').trim();
  if(selector.startsWith('@'))continue;
  for(const item of selector.split(','))assert.match(item.trim(),/^(?:\.home-|\.standard-(?:combat|shell)(?:[ .:#>]|$))/,item);
 }
});
test('home goals use defeated floors, never character level or mock currency',()=>{
 const a=fresh();a.level=150;assert.equal(goal(a).total,5);assert.equal(goal(a).value,0);
 for(const [floor,target,reward]of [[5,10,'堕天王'],[10,20,'断罪'],[20,50,'共鳴'],[50,100,'境界']]){
  a.cleared=Array.from({length:floor},(_,i)=>i+1);const g=goal(a);assert.equal(g.total,target);assert.equal(g.value,floor);assert.ok(g.reward.includes(reward));
 }
});
test('post-100 goals follow actual flags without unlocking or modifying the save',()=>{
 const a=developerState(fresh());a.flags.warp=false;const before=JSON.stringify(a);assert.match(goal(a).title,/ステラを解放/);assert.equal(JSON.stringify(a),before);
 a.flags.warp=true;a.flags.ex=false;assert.match(goal(a).title,/EXカイザー/);
 a.flags.ex=true;a.flags.stellaClear=false;assert.match(goal(a).title,/ステラ最終決戦/);
 a.flags.stellaClear=true;assert.match(goal(a).title,/いれーな最終決戦/);
 a.flags.finalClear=true;a.awakening=4;assert.equal(goal(a).value,4);assert.equal(goal(a).total,5);
 a.awakening=5;a.achieved=['A1'];assert.equal(goal(a).value,1);assert.equal(goal(a).total,36);
});

test('provided home originals are preserved and the design mock is not the runtime screen',()=>{
 for(const [file,hash]of Object.entries(baseline.providedHomeImages))assert.equal(sha(read(file)),hash,file);
 assert.doesNotMatch(app,/home-design-approved\.png|approved-reference\.png/);
});
