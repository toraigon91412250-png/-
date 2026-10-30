import test from 'node:test';
import assert from 'node:assert/strict';
import {startMirrorTrial,actMirrorTrial,mirrorStateText,mirrorStateDetails} from '../web/src/utils/mirrorTrial.js';
import {mirrorFixtures} from '../reports/mirror-audit28/simulate.mjs';
import {startBattle,act} from '../web/src/utils/gameCore.js';
import {clone} from '../web/src/utils/progression.js';
const source=()=>mirrorFixtures().find(x=>x.label==='trained-king-abyss').build;
const rng=()=>.8;
function trial(){const b=startMirrorTrial(source(),{phase:3});b.trial.trait='neutral';b.enemy.base.atk=1;return b;}
test('enormous hits respect each seal HP floor and never emit victory',()=>{
 for(const seals of [3,2,1]){const b=trial();b.trial.seals=seals;b.base.atk*=1e9;b.ignoreDefense=99;
 actMirrorTrial(b,'slash',{rng});assert.ok(b.enemy.hp>=b.enemy.base.hp*.75*[0,.1,.4,.7][seals]);assert.equal(b.result,null);assert.equal(b.trial.seals,seals);assert.ok(!b.log.some(x=>x.startsWith('VICTORY')));assert.equal(b.trial.sealCharge,1);}
});
test('ultimate plus opening breaks at most one seal per action',()=>{const b=trial();b.trial.opening=true;b.base.atk*=1e9;actMirrorTrial(b,'ultimate',{rng});assert.equal(b.trial.seals,2);assert.equal(b.result,null);});
test('guard counter and charged family switch both provide legal seal routes',()=>{
 const b=trial();actMirrorTrial(b,'guard',{rng});actMirrorTrial(b,'feather',{rng});assert.equal(b.trial.seals,2);
 b.base.atk*=1e9;actMirrorTrial(b,'slash',{rng});assert.equal(b.trial.seals,1);assert.equal(b.result,null);
});
test('doom has a visible warning and guard resolves its actual attack',()=>{const b=trial();for(let i=0;i<3;i++)actMirrorTrial(b,'guard',{rng});assert.match(mirrorStateText(b),/終焉予兆/);actMirrorTrial(b,'guard',{rng});assert.ok(b.log.some(x=>x.includes('神域崩落')));assert.ok(b.hp>0);});
test('mirror detail facts stay compact while exposing actionable conditions',()=>{const b=trial();b.enemy.phase=3;b.trial.seals=2;b.trial.sealCharge=.5;b.trial.ritual=2;b.buffs.push({id:'mirrorFullRelease',remaining:9999});const rows=mirrorStateDetails(b);assert.ok(rows.some(x=>x.includes('封印：2枚')));assert.ok(rows.some(x=>x.includes('終焉予兆')));assert.ok(rows.some(x=>x.includes('鏡界・完全解放')));assert.ok(!rows.some(x=>x.includes('mirrorFullRelease')));});
test('unsealed huge hit wins; ordinary attack remains identical with optional gate absent',()=>{
 const b=trial();b.trial.seals=0;b.base.atk*=1e9;actMirrorTrial(b,'slash',{rng});assert.equal(b.result,'win');
 const a=startBattle(source(),{test:true}),c=clone(a);act(a,'slash',{rng});act(c,'slash',{rng,damageGate:(_b,d)=>d});assert.deepEqual(c,a);
});
