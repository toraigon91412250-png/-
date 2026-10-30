import fs from 'node:fs';
import {fresh} from '../web/src/utils/progression.js';
import {available,playerStats} from '../web/src/utils/gameCore.js';
import {startThreePhase,actThreePhase} from '../web/src/utils/threePhase.js';
export function seeded(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export const strategies={
 featherSlash:b=>!available(b,'feather')?'feather':'slash',
 featherGuard:b=>!available(b,'feather')?'feather':'guard',
 mixed:b=>!available(b,'ultimate')?'ultimate':b.enemy.statuses.trialCrystal&&!available(b,'power')?'power':!available(b,'feather')?'feather':'slash',
 defensive:b=>b.buffs.some(x=>x.id==='trialFocus')&&!available(b,'power')?'power':(b.statuses.pressure||playerStats(b).ratio<.5)&&!b.buffs.some(x=>x.id==='trialFocus')?'guard':!available(b,'ultimate')?'ultimate':b.enemy.statuses.trialCrystal&&!available(b,'power')?'power':!available(b,'feather')?'feather':'slash',
 reserveUltimate:b=>b.enemy.phase===3&&!available(b,'ultimate')?'ultimate':b.enemy.statuses.trialCrystal&&!available(b,'power')?'power':!available(b,'feather')?'feather':'slash'
};
export function runStrategy(strategy,seed,scale={}){
 const b=startThreePhase(fresh(),scale),rng=seeded(seed),actions={},rounds=[];
 while(!b.result&&b.turn<=80){let action=strategy(b);if(available(b,action))action='slash';const phase=b.enemy.phase;actThreePhase(b,action,{rng});actions[action]=(actions[action]||0)+1;rounds.push({turn:b.turn,phase,hp:Math.round(b.hp),enemyHP:Math.round(b.enemy.hp),action});}
 return {result:b.result,turns:Object.values(actions).reduce((a,n)=>a+n,0),phase:b.enemy.phase,phaseHistory:b.trial.phaseHistory,remainingHP:Math.round(b.hp),actions,deadline:b.log.some(x=>x.includes('終末判定：')),rounds};
}
if(process.argv[1]?.endsWith('three-phase-sim.mjs')){
 const report={experimental:true,seeds:200,conditions:'同じ黒翼＋堕天王固定ビルド、同じ倍率、同じseed群。CT中は明示した斬撃/防御で進行。予測情報を戦略に使用しない。',strategies:{}};
 for(const [name,strategy]of Object.entries(strategies)){
  const runs=Array.from({length:200},(_,i)=>runStrategy(strategy,i+1));
  report.strategies[name]={wins:runs.filter(x=>x.result==='win').length,losses:runs.filter(x=>x.result==='lose').length,meanRemainingHP:runs.reduce((a,x)=>a+x.remainingHP,0)/runs.length,meanTurns:runs.reduce((a,x)=>a+x.turns,0)/runs.length,deadlineLosses:runs.filter(x=>x.deadline).length,sample:runs[0]};
 }
 fs.mkdirSync('reports/three-phase',{recursive:true});fs.writeFileSync('reports/three-phase/strategy-comparison.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(Object.fromEntries(Object.entries(report.strategies).map(([k,v])=>[k,{...v,sample:undefined}]))));
}
