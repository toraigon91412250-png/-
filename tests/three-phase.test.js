import {auditRead} from './audit-baseline.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fresh,developerState} from '../web/src/utils/progression.js';
import {startBattle,act,enemyTurn,settle,playerStats,available} from '../web/src/utils/gameCore.js';
import {startThreePhase,actThreePhase,retryThreePhase,THREE_PHASE} from '../web/src/utils/threePhase.js';
import {runStrategy,strategies,seeded} from '../tools/three-phase-sim.mjs';
const rng=()=>.99;
function phaseTwo(){const b=startThreePhase(fresh());b.enemy.phase=2;b.trial.phase=2;b.enemy.hp=b.enemy.base.hp*.6;return b;}

test('trial starts EX-based, test-only, three empty temporary phases; source JSON unchanged',()=>{
 const s=fresh(),json=JSON.stringify(s),b=startThreePhase(s);assert.equal(JSON.stringify(s),json);
 assert.equal(b.mode,'ex');assert.equal(b.test,true);assert.equal(b.character,'irena');assert.equal(b.enemy.phase,1);assert.equal(b.phaseTurns,0);
 assert.deepEqual(b.powers,['wing','king']);assert.deepEqual(b.trial.phaseHistory,[1]);assert.equal(b.enemy.base.hp,196640);
 assert.equal(b.enemy.base.atk,2460*THREE_PHASE.enemyAttack);
});
test('main EX cannot enter experimental turn processing',()=>{
 const s=developerState(fresh()),b=startBattle(s,{mode:'ex'}),copy=JSON.stringify(b);
 assert.throws(()=>actThreePhase(b,'slash'));assert.equal(JSON.stringify(b),copy);assert.equal(b.trial,undefined);
});
test('core default and explicit original callback resolve main EX identically over many rounds',()=>{
 const s=developerState(fresh()),a=startBattle(s,{mode:'ex'}),b=structuredClone(a),r1=seeded(19),r2=seeded(19);
 for(let i=0;i<30&&!a.result;i++){const id=!available(a,'feather')?'feather':'guard';act(a,id,{rng:r1});act(b,id,{rng:r2,enemyAction:enemyTurn});assert.deepEqual(a,b);}
});
test('second phase crystal is an occurred enemy effect, raises defense once without stacking',()=>{
 const b=phaseTwo();actThreePhase(b,'guard',{rng:()=>.2});assert.ok(b.enemy.statuses.trialCrystal);assert.equal(b.enemy.buffs.filter(x=>x.id==='trialCrystal').length,1);
 actThreePhase(b,'guard',{rng:()=>.2});assert.equal(b.enemy.buffs.filter(x=>x.id==='trialCrystal').length,1);
});
test('power shatters existing crystal only on actual landed damage',()=>{
 const b=phaseTwo();actThreePhase(b,'guard',{rng:()=>.2});b.enemy.base.spd=1;actThreePhase(b,'power',{rng});assert.equal(b.enemy.statuses.trialCrystal,undefined);assert.ok(b.lastDamage>0);
});
test('missed power cannot shatter crystal',()=>{
 const b=phaseTwo();actThreePhase(b,'guard',{rng:()=>.2});b.enemyStop=1;actThreePhase(b,'power',{rng:()=>0});assert.equal(b.lastDamage,0);assert.ok(b.enemy.statuses.trialCrystal);
});
test('guard cleans occurred pressure, heals max12%, creates a single nonstacking focus',()=>{
 const b=phaseTwo();b.hp=b.base.hp*.3;b.statuses.pressure=2;b.enemyStop=1;const before=b.hp;
 actThreePhase(b,'guard',{rng});assert.equal(b.statuses.pressure,undefined);assert.equal(b.hp,before+b.base.hp*.12);assert.equal(b.buffs.filter(x=>x.id==='trialFocus').length,1);
 b.enemyStop=1;actThreePhase(b,'guard',{rng});assert.equal(b.buffs.filter(x=>x.id==='trialFocus').length,1);
});
test('guard recovery caps at max HP and does not change original gauge18',()=>{
 const b=startThreePhase(fresh());b.enemyStop=1;actThreePhase(b,'guard',{rng});assert.equal(b.hp,b.base.hp);assert.equal(b.gauge,18);
});
test('focus improves power, is consumed on hit, and never changes feather multiplier',()=>{
 const b=startThreePhase(fresh());b.enemyStop=1;actThreePhase(b,'guard',{rng});const a=structuredClone(b),plain=structuredClone(b);plain.buffs=[];
 a.enemyStop=1;plain.enemyStop=1;actThreePhase(a,'power',{rng});actThreePhase(plain,'power',{rng});assert.ok(a.lastDamage>plain.lastDamage);assert.ok(!a.buffs.some(x=>x.id==='trialFocus'));
 const f=structuredClone(b),g=structuredClone(b);g.buffs=[];f.enemyStop=1;g.enemyStop=1;actThreePhase(f,'feather',{rng});actThreePhase(g,'feather',{rng});assert.equal(f.lastDamage,g.lastDamage);
});
test('ultimate consumes gauge normally and stops one enemy action, never the phase deadline',()=>{
 const b=startThreePhase(fresh());b.gauge=100;b.enemy.base.spd=1;actThreePhase(b,'ultimate',{rng});assert.equal(b.gauge,0);assert.equal(b.enemyDamage,0);assert.equal(b.enemyStop,0);
 const c=startThreePhase(fresh());c.enemy.phase=3;c.trial.phase=3;c.enemy.hp=c.enemy.base.hp*.3;c.phaseTurns=8;c.gauge=100;c.enemyStop=10;actThreePhase(c,'ultimate',{rng});assert.equal(c.result,'lose');assert.equal(c.phaseTurns,9);
});
test('third phase does not heal on entry and stays within nine complete rounds',()=>{
 const b=startThreePhase(fresh());b.enemy.base.spd=1;b.enemy.hp=b.enemy.base.hp*.34;b.enemyStop=20;const old=b.enemy.hp;actThreePhase(b,'feather',{rng});assert.equal(b.enemy.phase,3);assert.ok(b.enemy.hp<old);assert.ok(b.enemy.statuses.trialCrystal);assert.equal(b.phaseTurns,1);
 for(let i=0;i<8&&!b.result;i++)actThreePhase(b,'guard',{rng});assert.equal(b.result,'lose');assert.equal(b.phaseTurns,9);
});
test('life return never heals through a previous phase threshold',()=>{
 const b=phaseTwo();b.enemy.hp=b.enemy.base.hp*.669;actThreePhase(b,'guard',{rng});assert.ok(b.enemy.hp<=b.enemy.base.hp*.67);assert.equal(b.enemy.phase,2);
});
test('win, defeat, retry and settlement cannot alter main save or grant rewards',()=>{
 const s=fresh(),original=JSON.stringify(s),b=startThreePhase(s,{atk:1.2,hp:1.4});b.enemy.hp=1;b.base.spd=1e9;actThreePhase(b,'slash',{rng});assert.equal(b.result,'win');assert.equal(settle(s,b).p,0);assert.equal(JSON.stringify(s),original);
 const next=retryThreePhase(b);assert.deepEqual(next.experiment,b.experiment);assert.equal(next.enemy.phase,1);assert.equal(next.phaseTurns,0);assert.equal(next.hp,next.base.hp);assert.equal(next.result,null);assert.deepEqual(next.trial.phaseHistory,[1]);
 next.result='lose';settle(s,next);assert.equal(JSON.stringify(s),original);
});
test('invalid action is atomic and trial multipliers are finite and bounded',()=>{
 const b=startThreePhase(fresh()),copy=JSON.stringify(b);assert.throws(()=>actThreePhase(b,'ultimate'));assert.equal(JSON.stringify(b),copy);
 for(const n of [NaN,Infinity,-1,0,21])assert.throws(()=>startThreePhase(fresh(),{atk:n}));
});
test('three independent existing-technique strategies win actual default trial across fixed seeds',()=>{
 for(const kind of ['mixed','defensive','reserveUltimate'])for(let seed=1;seed<=20;seed++){const r=runStrategy(strategies[kind],seed);assert.equal(r.result,'win',kind+seed);assert.equal(r.phase,3);assert.ok(r.phaseHistory.includes(2));}
});
test('predictive warning is removed; trial UI adds no action buttons or prediction panel',()=>{
 const app=fs.readFileSync('web/src/components/App.js','utf8');assert.doesNotMatch(app,/重撃の予兆|battle-warning|enemyIntent|damagePrediction/);assert.match(app,/value="three-phase"/);
});

test('main engine, classification, progression and save format retain exact authoritative contents',()=>{
 const hash=s=>createHash('sha256').update(s).digest('hex');
 const core=auditRead('web/src/utils/gameCore.js','utf8').replace('export function enemyTurn(','function enemyTurn(').replace('rng=Math.random,enemyAction=enemyTurn','rng=Math.random').replaceAll("enemyAction(b,action==='guard',rng)","enemyTurn(b,action==='guard',rng)");
 assert.equal(hash(core),'b54f4693a6fa66fc5198c7f8e047de987eba640a3b71b2a468f2bf362f57e971');
 for(const [file,expected]of Object.entries({'web/src/data/config.js':'c2257de7871e2be8c4a0bd10746c11ec36242c9a2dc1813c1ab16da020c0ee26','web/src/utils/storage.js':'e7c2006c1e2901aeb9f30ba0c5906826a97e0f926c1e90e13d1b95b34665dc86','web/src/utils/progression.js':'8ad7032fe4358d8fbb715fdd7f39989069161f243b6823ec15ce162b8f930d21'}))assert.equal(hash(auditRead(file)),expected,file);
});
