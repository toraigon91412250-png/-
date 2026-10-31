import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ACHIEVEMENTS,RECIPES,GODS} from '../web/src/data/config.js';
import * as progression from '../web/src/utils/progression.js';
import {canStart,startBattle,settle} from '../web/src/utils/gameCore.js';
import {startMainBattle} from '../web/src/utils/main20.js';
import {exportSave,validateSave} from '../web/src/utils/storage.js';
import {markBattleCheckpoint} from '../web/src/utils/battleCheckpoint.js';

const app=fs.readFileSync(new URL('../web/src/components/App.js',import.meta.url),'utf8');
const config=fs.readFileSync(new URL('../web/src/data/config.js',import.meta.url),'utf8');

test('retired summoning has no API, rarity pool or navigation, and progression stays usable',()=>{
 assert.equal('summon' in progression,false);
 assert.doesNotMatch(config,/export const SUMMONS|summonCost/);
 assert.doesNotMatch(app,/function summonRates\(|case 'summon':|case 'summonReveal':|黒翼召喚/);
 assert.match(app,/function summonView\(/,'The newly authorized material-only resonance summon has its own UI');
 assert.match(app,/resonanceSummon/,'The new summon action is distinct from the retired black-wing lottery');
 assert.doesNotMatch(app,/\['summon','黒翼召喚'/);
 assert.equal(typeof progression.upgradePower,'function');
 assert.equal(typeof progression.buyMark,'function');
});

test('raid cannot be launched or revisited and its normal reward is retired',()=>{
 const s=progression.developerState(progression.fresh());
 assert.equal(canStart(s,'raid',50),false);
 assert.throws(()=>startBattle(s,{mode:'raid'}),/解放条件/);
 assert.throws(()=>startMainBattle(s,{mode:'raid'}),/解放条件/);
 assert.doesNotMatch(app,/function raidView\(|function startRaidFight\(|case 'raid':|深淵レイド/);
 assert.equal(s.resShards,99999);
});

test('laboratory guard-break still uses the previous battle template with no persistent reward',()=>{
 const s=progression.developerState(progression.fresh());
 const b=startBattle(s,{mode:'raid',test:true});
 assert.equal(b.mode,'raid');assert.equal(b.test,true);
 b.result='win';const before=JSON.stringify(s);
 assert.deepEqual(settle(s,b),{test:true,p:0,fragments:0,bonusP:0,sp:0,levels:0,resShards:0,achievements:[],unlocks:[]});
 assert.equal(JSON.stringify(s),before);
});

test('four only-retired achievements are absent, 32 remain, star unlock threshold adjusts',()=>{
 assert.equal(ACHIEVEMENTS.length,32);
 for(const id of ['C4','C5','C6','C10'])assert.equal(ACHIEVEMENTS.some(a=>a.id===id),false);
 const s=progression.fresh();
 s.achieved=ACHIEVEMENTS.slice(0,31).map(x=>x.id);
 progression.achievements(s);assert.equal(s.powers.star,undefined);
 s.achieved.push(ACHIEVEMENTS[31].id);
 progression.achievements(s);assert.equal(s.powers.star,5);
 assert.deepEqual(RECIPES.length,10);
 assert.deepEqual(GODS.length,5);
});

test('autosaves remain usable; summoning history is no longer a validated game mechanic',()=>{
 const s=progression.fresh(),loaded=validateSave(JSON.parse(exportSave(s)));
 assert.equal(loaded.p,s.p);assert.equal(loaded.level,s.level);
 assert.deepEqual(loaded.equipped,s.equipped);assert.deepEqual(loaded.achieved,s.achieved);
 assert.equal(typeof progression.startGauntlet,'function');
});

test('deleted raid has no live checkpoint, but existing normal battle still does',()=>{
 const s=progression.developerState(progression.fresh());
 const b=startBattle(s,{mode:'raid',test:true});
 assert.equal(markBattleCheckpoint(b),null);
 const normal=startBattle(s,{mode:'normal',floor:1});
 assert.ok(markBattleCheckpoint(normal));
});
