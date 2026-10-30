import test from 'node:test';import assert from 'node:assert/strict';
import {startMirrorTrial,actMirrorTrial} from '../web/src/utils/mirrorTrial.js';import {mirrorClue} from '../web/src/components/mirrorView.js';import {mirrorFixtures} from '../reports/mirror-audit28/simulate.mjs';import {loadMirrorMemory} from '../web/src/utils/mirrorMemory.js';
const fixture=()=>mirrorFixtures().find(x=>x.label==='trained-king-abyss').build,rng=()=>.8;
test('same family invokes learned defense; changing family clears it',()=>{const b=startMirrorTrial(fixture());actMirrorTrial(b,'slash',{rng});actMirrorTrial(b,'slash',{rng});assert.equal(b.enemy.buffs.find(x=>x.id==='mirrorWard').mul.def,4);actMirrorTrial(b,'power',{rng});assert.ok(!b.enemy.buffs.some(x=>x.id==='mirrorWard'));});
// Stage 2: ultimate seal-breaking requires preparation; its damage is unchanged.
test('third phase starts sealed; prepared ultimate actually breaks a seal',()=>{const b=startMirrorTrial(fixture(),{phase:3});assert.equal(b.trial.seals,3);actMirrorTrial(b,'guard',{rng});actMirrorTrial(b,'ultimate',{rng});assert.ok(b.trial.seals<3);assert.ok(b.lastDamage>0);});
test('broken seals stay broken instead of creating a reseal loop',()=>{const b=startMirrorTrial(fixture(),{phase:3});b.trial.seals=1;actMirrorTrial(b,'guard',{rng});actMirrorTrial(b,'ultimate',{rng});assert.equal(b.trial.seals,0);for(let i=0;i<3;i++)actMirrorTrial(b,'guard',{rng});assert.equal(b.trial.seals,0);});
test('hint identifies missing achievements, not future enemy actions',()=>{assert.match(mirrorClue({shatters:0,guards:0,families:[]}),/二度/);assert.equal(mirrorClue({shatters:2,guards:2,families:['slash','power','ultimate']}),'');});
test('audit28 third checkpoint and relic are retained unchanged',()=>{const m={version:1,checkpoint:3,clears:2,trueClears:1,complete:1,relic:'nameless'};assert.deepEqual(loadMirrorMemory({getItem:()=>JSON.stringify(m)}).memory,m);});

test('third phase cannot be defeated by raw damage until all seals break',()=>{
 const b=startMirrorTrial(fixture(),{phase:3});
 b.trial.trait='neutral';b.enemy.hp=1;actMirrorTrial(b,'slash',{rng});
 assert.equal(b.enemy.hp,1);assert.equal(b.result,null);assert.equal(b.trial.seals,3);
 b.trial.seals=0;b.trial.trait='neutral';b.enemy.hp=1;actMirrorTrial(b,'slash',{rng});
 assert.equal(b.enemy.hp,0);assert.equal(b.result,'win');
});
