import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {freshMain20,startMainBattle,actMainBattle,settleMainBattle} from '../web/src/utils/main20.js';
import {RECIPES} from '../web/src/data/config.js';
import {choose,seeded} from '../reports/overnight-lab/measure-main.mjs';

const profileSource=JSON.parse(fs.readFileSync('reports/endgame-pressure-nightmare-loop20.json','utf8'));
const difficulties=['NORMAL','EXPERT','NIGHTMARE'];
const policies=['feather','mixed','guard'];
const floors=Array.from({length:20},(_,i)=>i+1);
const seeds=[1,19,46,91];
const actionLimit=200;
function makeBuild(profile){
 const s=freshMain20();s.started=true;s.floor=20;s.cleared=[...floors];s.level=100;s.talent=20;s.skills={feather:10,destruction:10,ultimate:10};
 s.stats={hp:0,atk:0,def:0,spd:0,...profile.stats};
 const allocation=profile.final||{};const spent=Object.values(allocation).reduce((sum,n)=>sum+n,0);
 s.finalBuild={points:Math.max(0,150-spent),hp:0,atk:0,def:0,spd:0,...allocation};
 s.equipped=[...profile.gear];s.markEquip=[...profile.marks];s.marks=[...profile.marks];
 for(const key of Object.keys(s.powers))s.powers[key]=0;
 s.resonance={};
 const recipe=profile.fusion?RECIPES.find(item=>item.id===profile.fusion):null;
 assert.ok(!profile.fusion||recipe,`known fusion for ${profile.id}`);
 for(const id of profile.gear){if(recipe&&id===profile.fusion)s.resonance[id]=5;else s.powers[id]=5;}
 if(recipe)s.recipes=[...new Set([...s.recipes,recipe.id])];
 s.flags={...s.flags,lv100:true,reward100:true};
 return s;
}
function mean(rows,key){return rows.length?rows.reduce((sum,row)=>sum+row[key],0)/rows.length:0;}

const rows=[];
for(const profile of profileSource.profiles)for(const floor of floors)for(const policy of policies)for(const difficulty of difficulties)for(const seed of seeds){
 const state=makeBuild(profile),battle=startMainBattle(state,{floor,difficulty});
 assert.equal(battle.test,false);assert.equal(battle.main20,true);assert.equal(battle.difficulty,difficulty);
 const rng=seeded(seed),actions=[];let dealt=0,received=0;
 while(!battle.result&&actions.length<actionLimit){
  const action=choose(battle,policy);actMainBattle(battle,action,{rng});
  actions.push({action,playerDamage:battle.lastDamage,incomingDamage:battle.enemyDamage});
  dealt+=battle.lastDamage;received+=battle.enemyDamage;
  for(const value of [battle.hp,battle.enemy.hp,battle.lastDamage,battle.enemyDamage])assert.ok(Number.isFinite(value),`finite state: ${profile.id}/${floor}/${difficulty}/${policy}/${seed}`);
 }
 const result=battle.result||'timeout';
 const reward=settleMainBattle(state,battle);
 rows.push({build:profile.id,floor,policy,difficulty,seed,result,actions:actions.length,remainingHP:Math.round(battle.hp),remainingEnemyHP:Math.round(battle.enemy.hp),damageDealt:Math.round(dealt),damageReceived:Math.round(received),actionLog:actions,reward:reward?{p:reward.p,sp:reward.sp,levels:reward.levels,resShards:reward.resShards,fragments:reward.fragments,bonusP:reward.bonusP}:null});
}

const rewardComparisons=new Map();
for(const row of rows.filter(item=>item.result==='win')){
 const key=[row.build,row.floor,row.policy,row.seed].join('/'),serialized=JSON.stringify(row.reward);
 const prior=rewardComparisons.get(key);if(prior)assert.equal(serialized,prior,`reward parity for ${key}`);else rewardComparisons.set(key,serialized);
}
const groups=[];
for(const difficulty of difficulties)for(const floor of floors)for(const policy of policies){
 const sample=rows.filter(row=>row.difficulty===difficulty&&row.floor===floor&&row.policy===policy);
 const winners=sample.filter(row=>row.result==='win');
 groups.push({difficulty,floor,policy,builds:new Set(sample.map(row=>row.build)).size,seeds:new Set(sample.map(row=>row.seed)).size,trials:sample.length,wins:winners.length,losses:sample.filter(row=>row.result==='lose').length,timeouts:sample.filter(row=>row.result==='timeout').length,meanActions:Number(mean(sample,'actions').toFixed(3)),meanWinningActions:winners.length?Number(mean(winners,'actions').toFixed(3)):null,meanRemainingHP:Number(mean(sample,'remainingHP').toFixed(1))});
}
const totals=difficulties.map(difficulty=>{const sample=rows.filter(row=>row.difficulty===difficulty),wins=sample.filter(row=>row.result==='win');return {difficulty,trials:sample.length,wins:wins.length,losses:sample.filter(row=>row.result==='lose').length,timeouts:sample.filter(row=>row.result==='timeout').length,winRate:Number((wins.length/sample.length).toFixed(4)),meanActions:Number(mean(sample,'actions').toFixed(3)),meanWinningActions:wins.length?Number(mean(wins,'actions').toFixed(3)):null};});
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const output={generatedAt:new Date().toISOString(),source:{commit:process.env.SOURCE_COMMIT||null,main20SHA256:hash('web/src/utils/main20.js'),AppSHA256:hash('web/src/components/App.js'),runner:'production startMainBattle / actMainBattle / settleMainBattle',testFlag:false},trialCount:rows.length,uniqueConditions:profileSource.profiles.length*floors.length*policies.length*difficulties.length,seedsPerCondition:seeds.length,profiles:profileSource.profiles.map(({id,gear,stats,marks,final,fusion})=>({id,gear,stats,marks,final,fusion})),floors,policies,difficulties,seeds,actionLimit,totals,rewardParity:{matchedWinningComparisons:rewardComparisons.size,mismatches:0},groups,rows};
const destination=process.env.SIM_OUT||'reports/self-improvement-loop-21-30/large-simulation.json';
fs.writeFileSync(destination,JSON.stringify(output,null,2));
console.log(JSON.stringify({trials:output.trialCount,uniqueConditions:output.uniqueConditions,seedsPerCondition:output.seedsPerCondition,totals,rewardParity:output.rewardParity,report:destination}));
