import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDivinity,divinityDeveloper} from '../web/src/utils/divinitySave.js';
import {startBattle,act,available,playerStats,enemyStats,dealPlayer} from '../web/src/utils/gameCore.js';
import {divBattleState,syncDivinityLives,passivePowerIds} from '../web/src/utils/divinityCombat.js';

const noEnemy=()=>{};
function battle(powers=['wing','judge']){
 const s=divinityDeveloper(freshDivinity(),5);
 s.equipped=powers;
 const b=startBattle(s,{mode:'ex',test:true,combatV2:true});
 b.enemy.base={hp:1e10,atk:1200,def:10,spd:1};
 b.enemy.hp=b.enemy.base.hp;
 return b;
}
test('fallen HP stages are stable without changing maximum HP',()=>{
 const b=battle(['fallen']);
 const stages=[[.9,.6,.7],[.7,.8,.85],[.4,1,1],[.2,1.8,1.1],[.12,2.7,1.15],[.08,3.8,1.25]];
 for(const [ratio,attack,def] of stages){
  b.hp=b.base.hp*ratio;
  const p=playerStats(b);
  assert.equal(p.hp,b.base.hp);
  assert.ok(Math.abs(p.atk/b.base.atk-attack)<1e-10,ratio);
  assert.ok(Math.abs(p.spd/b.base.spd-attack)<1e-10,ratio);
  assert.ok(Math.abs(p.def/b.base.def-def)<1e-10,ratio);
 }
 b.hp=b.base.hp*.15;
 assert.match(available(b,'guard'),/防御不可/);
 assert.equal(available(b,'slash'),null);
});
test('abyss erosion accelerates and boss stat caps stay independent',()=>{
 const b=battle(['abyss']);
 act(b,'guard',{rng:()=>.99,enemyAction:noEnemy});
 assert.ok(Math.abs(b.erosion-.06)<1e-10);
 act(b,'guard',{rng:()=>.99,enemyAction:noEnemy});
 assert.ok(Math.abs(b.erosion-.15)<1e-10);
 act(b,'guard',{rng:()=>.99,enemyAction:noEnemy});
 assert.ok(Math.abs(b.erosion-.27)<1e-10);
 b.erosion=.95;b.enemy.base.spd=100;
 const p=enemyStats(b);
 assert.ok(Math.abs(p.hp/b.enemy.base.hp-.6)<1e-10);
 assert.ok(Math.abs(p.atk/b.enemy.base.atk-.7)<1e-10);
 assert.ok(Math.abs(p.def/b.enemy.base.def-.3)<1e-10);
 assert.ok(Math.abs(p.spd/b.enemy.base.spd-.3)<1e-10);
 b.enemy.hp=b.enemy.base.hp;
 b.cd={};
 act(b,'abyssTide',{rng:()=>.99,enemyAction:noEnemy});
 assert.ok(b.enemy.hp<=enemyStats(b).hp);
});
test('wing extra hits use original hit damage and terminate after safety cap',()=>{
 const b=battle(['wing']);
 act(b,'plume',{rng:()=>.99,enemyAction:noEnemy});
 const hits=b.events.filter(x=>x.type==='hit');
 assert.equal(hits.length,2);
 assert.equal(hits[1].damage,Math.floor(hits[0].damage*.3));
 const x=battle(['wing']);
 act(x,'plume',{rng:()=>0,enemyAction:noEnemy});
 assert.equal(x.events.filter(e=>e.type==='hit').length,13);
 assert.ok(x.lastDamage>0);
});
test('judge proof no longer doubles hidden stacks and is refunded only after verdict',()=>{
 const b=battle(['judge']);
 act(b,'slash',{rng:()=>.99,enemyAction:noEnemy});
 act(b,'slash',{rng:()=>.99,enemyAction:noEnemy});
 assert.equal(divBattleState(b).proof,2);
 assert.equal(b.stacks.judge,undefined);
 act(b,'verdict',{rng:()=>.99,enemyAction:noEnemy});
 assert.equal(divBattleState(b).proof,1);
 assert.ok(b.lastDamage>0);
});
test('fallen oath lowers to 25% and uses shortened shared cooldown',()=>{
 const b=battle(['fallen']);
 act(b,'fallenOath',{rng:()=>.99,enemyAction:noEnemy});
 assert.ok(b.hp/b.base.hp>=.25 && b.hp/b.base.hp<=.33+1e-10,'oath sacrifice is followed by at most 8% lifesteal');
 assert.equal(b.cd.authorityShared,2);
});
test('fallen finisher is automatic above 1 HP, but never triggers at 1 HP',()=>{
 const b=battle(['fallen']);
 b.hp=b.base.hp*.04;
 act(b,'slash',{rng:()=>.99,enemyAction:noEnemy});
 assert.ok(b.events.some(e=>e.type==='fallenFinisher'));
 assert.equal(divBattleState(b).finisherUsed,true);
 const other=battle(['fallen']);
 other.hp=other.base.hp/playerStats(other).hp;
 act(other,'slash',{rng:()=>.99,enemyAction:noEnemy});
 assert.ok(!other.events.some(e=>e.type==='fallenFinisher'));
});
test('fallen can survive one lethal blow at HP1 without a finisher',()=>{
 const b=battle(['fallen']);
 divBattleState(b).revived=true;
 dealPlayer(b,1e12);
 assert.equal(divBattleState(b).fallenEndured,true);
 assert.equal(divBattleState(b).fallenEmpowered,true);
 assert.ok(Math.abs(playerStats(b).current-1)<1e-6);
 act(b,'slash',{rng:()=>.99,enemyAction:noEnemy});
 assert.equal(divBattleState(b).finisherUsed,undefined);
});
test('king counter records prevented damage but not an empty guard',()=>{
 const b=battle(['king']);
 act(b,'royalGuard',{rng:()=>.99,enemyAction:noEnemy});
 assert.equal(divBattleState(b).counter||0,0);
 b.cd={};
 act(b,'royalGuard',{rng:()=>.99,enemyAction:(state)=>dealPlayer(state,1000)});
 assert.equal(divBattleState(b).counter,1);
 assert.ok(divBattleState(b).counterStored>0);
 b.cd={};
 act(b,'royalReturn',{rng:()=>.99,enemyAction:noEnemy});
 assert.equal(divBattleState(b).counterStored,0);
 assert.ok(b.lastDamage>0);
});
test('zero release grants skills but not unselected passive king lives',()=>{
 const b=battle(['wing','judge']);
 const d=divBattleState(b);
 d.savedPowers=['wing','judge'];d.unified=2;
 b.powers=['wing','judge','king','fallen','abyss'];
 syncDivinityLives(b);
 assert.deepEqual(passivePowerIds(b),['wing','judge']);
 assert.equal(b.lives,0);
 b.hp=b.base.hp*.9;
 assert.equal(playerStats(b).atk,b.base.atk);
});
