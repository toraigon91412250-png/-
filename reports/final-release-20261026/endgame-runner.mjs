import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {freshMain20} from '../../web/src/utils/main20.js';
import {startBattle,act,available,settle} from '../../web/src/utils/gameCore.js';
import {observeCombat} from '../../web/src/utils/combatObservation.js';
import {startGauntlet} from '../../web/src/utils/progression.js';
import {RECIPES} from '../../web/src/data/config.js';
import {seeded} from '../overnight-lab/measure-main.mjs';

const profiles=JSON.parse(fs.readFileSync(new URL('../endgame-pressure-nightmare-loop20.json',import.meta.url))).profiles;
const modes=['ex','stella','final','raid','god'],difficulties=['NORMAL','EXPERT','NIGHTMARE'],tactics=['burst','mixed','guard'];
const seeds=[1,19,46,91,173,311,517,997],limit=500;
function build(profile){
 const s=freshMain20();s.started=true;s.level=100;s.talent=20;s.floor=20;s.cleared=Array.from({length:20},(_,i)=>i+1);
 s.skills={feather:10,destruction:10,ultimate:10};s.stats={hp:0,atk:0,def:0,spd:0,...profile.stats};s.sp=0;
 const f=profile.final||{};s.finalBuild={hp:0,atk:0,def:0,spd:0,...f,points:150-Object.values(f).reduce((a,b)=>a+b,0)};
 s.powers=Object.fromEntries(Object.keys(s.powers).map(k=>[k,0]));s.resonance={};s.equipped=[...profile.gear];s.marks=[...new Set([...s.marks,...profile.marks])];s.markEquip=[...profile.marks];
 for(const id of profile.gear){const recipe=RECIPES.find(x=>x.id===id);if(recipe){assert.ok(recipe.live,'only obtainable resonance in endgame fixtures');s.resonance[id]=5;s.recipes=[...new Set([...s.recipes,id])];}else s.powers[id]=5;}
 s.flags={...s.flags,lv100:true,reward100:true,warp:true,stella:true,ex:true,exReward:true,stellaClear:true,final:true};return s;
}
function choose(b,tactic){
 if(b.statuses.stun)return 'wait';
 const ready=xs=>xs.find(x=>!available(b,x));
 if(b.character==='stella'){
  if(b.hp/b.base.hp<.3&&!available(b,'rebirth'))return 'rebirth';
  if(!available(b,'meteor'))return 'meteor';
  if(b.enemy.phase===3&&!available(b,'immortal'))return 'immortal';
  if(tactic==='guard'&&b.turn%4===0)return 'guard';
  return 'slash';
 }
 if(b.character==='final'){
  if(!b.buffs.some(x=>x.id==='grasp'))return ready(b.balance<0?['grasp','fallen','slash']:['fallen','slash']);
  if(tactic==='guard'&&b.turn%4===0&&b.hp/b.base.hp<.65)return 'guard';
  if(b.balance<30)return ready(['divine','slash']);
  if(!b.buffs.some(x=>x.id==='godspeed')&&!available(b,'godspeed'))return 'godspeed';
  return ready(['annihilate','slash']);
 }
 if(tactic==='guard'&&b.turn%4===0)return 'guard';
 const feathers=b.marks.includes('split')?['volley','pierce','feather']:['feather'];
 if(tactic==='mixed'&&b.turn%3===0)return ready(['ultimate','power',...feathers,'slash']);
 return ready(['ultimate',...feathers,'power','slash']);
}
function fight(state,mode,difficulty,tactic,rng){
 const battle=startBattle(state,{mode,floor:100,difficulty});assert.equal(battle.test,false);
 const actions=[];let dealt=0,received=0,deadline=0,phaseChanges=0,hitEvents=0;
 while(!battle.result&&actions.length<limit){
  const action=choose(battle,tactic),events=[];assert.equal(available(battle,action),null);
  observeCombat(battle,e=>events.push(e),()=>act(battle,action,{rng}));
  const hits=events.filter(e=>e.kind==='hit'),incoming=events.filter(e=>e.kind==='incomingHit');
  const hitTotal=hits.reduce((n,e)=>n+e.damage,0),incomingTotal=incoming.reduce((n,e)=>n+e.damage,0);
  assert.equal(hitTotal,battle.lastDamage,'all direct attack damage must be observed');
  assert.equal(incomingTotal,battle.enemyDamage,'all incoming hit damage must be observed');
  const finalFrame=events.at(-1)?.frame;assert.ok(finalFrame);assert.equal(finalFrame.enemy.hp,battle.enemy.hp);
  for(const value of [battle.hp,battle.enemy.hp,hitTotal,incomingTotal])assert.ok(Number.isFinite(value));
  dealt+=hitTotal;received+=incomingTotal;hitEvents+=hits.length;deadline+=events.filter(e=>e.kind==='deadline').length;phaseChanges+=events.filter(e=>e.kind==='phaseChange').length;
  actions.push({action,damage:hitTotal,incoming:incomingTotal,enemyHP:battle.enemy.hp,playerHP:battle.hp,phase:battle.enemy.phase});
 }
 assert.ok(battle.result,'battle must finish within the action limit');
 assert.equal(battle.result==='win',battle.enemy.hp<=0&&battle.hp>0);
 const reward=settle(state,battle);assert.ok(reward);assert.equal(settle(state,battle),null,'settlement is idempotent');
 return {result:battle.result,operations:actions.length,damageEventTotal:dealt,incomingEventTotal:received,hitEvents,phaseChanges,deadline,enemyHP:battle.enemy.hp,playerHP:battle.hp,reward:{p:reward.p,sp:reward.sp,levels:reward.levels,fragments:reward.fragments,resShards:reward.resShards,bonusP:reward.bonusP},actions};
}
const series=[],rows=[],rewardKeys=new Map();let rewardComparisons=0;
for(const profile of profiles)for(const mode of modes)for(const difficulty of difficulties)for(const tactic of tactics)for(const seed of seeds){
 const state=build(profile),rng=seeded(seed),battles=[];
 if(mode==='god')startGauntlet(state);
 for(let index=0;index<(mode==='god'?5:1);index++){
  const outcome=fight(state,mode,difficulty,tactic,rng),row={profile:profile.id,mode,difficulty,tactic,seed,index,...outcome};battles.push(row);rows.push(row);
  if(outcome.result==='win'){const key=[profile.id,mode,tactic,seed,index].join('/'),value=JSON.stringify(outcome.reward);if(rewardKeys.has(key)){assert.equal(value,rewardKeys.get(key),'reward parity across difficulties');rewardComparisons++;}else rewardKeys.set(key,value);}
  if(outcome.result!=='win')break;
 }
 series.push({profile:profile.id,mode,difficulty,tactic,seed,result:battles.length===(mode==='god'?5:1)&&battles.every(x=>x.result==='win')?'win':'lose',battles:battles.length,operations:battles.reduce((n,b)=>n+b.operations,0)});
}
const summary=[];
for(const mode of modes)for(const difficulty of difficulties){const xs=series.filter(r=>r.mode===mode&&r.difficulty===difficulty),battles=rows.filter(r=>r.mode===mode&&r.difficulty===difficulty);summary.push({mode,difficulty,series:xs.length,completed:xs.filter(r=>r.result==='win').length,battles:battles.length,wins:battles.filter(r=>r.result==='win').length,losses:battles.filter(r=>r.result==='lose').length,meanBattleActions:+(battles.reduce((n,r)=>n+r.operations,0)/battles.length).toFixed(3),deadlineLosses:battles.filter(r=>r.deadline).length});}
const hash=file=>createHash('sha256').update(fs.readFileSync(new URL(file,import.meta.url))).digest('hex');
const report={generatedAt:new Date().toISOString(),source:{description:'Synthetic unlocked level-100 fixtures using obtainable gear and live production startBattle/act/settle; no developer or test flag. Eight seeded RNG streams per condition, continuing across each five-god sequence.',coreSHA256:hash('../../web/src/utils/gameCore.js'),configSHA256:hash('../../web/src/data/config.js')},coverage:{profiles:7,modes,difficulties,tactics,seeds,independentSeriesConditions:profiles.length*modes.length*difficulties.length*tactics.length,seedsPerCondition:seeds.length,seriesCount:series.length,battleCount:rows.length,actionLimit:limit},validation:{timeouts:0,nonfinite:0,damageEventMismatches:0,sealedVictory:'covered separately by mirror runner',rewardComparisons,rewardMismatches:0},summary,series,rows};
fs.writeFileSync(new URL('endgame.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({coverage:report.coverage,validation:report.validation,summary}));
