// New five-personality cooperative combat, isolated from legacy fused-authority passives.
import {RESONANCE_BY_ID,resonanceLevel,resonanceCanUse} from '../data/resonanceV3.js';

export const isResonanceAction=action=>typeof action==='string'&&action.startsWith('res_');
export const resonanceId=action=>isResonanceAction(action)?action.slice(4):null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const soul=b=>b.divine.resonance ||= {};
const hpRatio=b=>b.hp/Math.max(1,b.base.hp);
const tierFromHp=ratio=>ratio<=.1?3:ratio<=.25?2:ratio<=.5?1:0;
function tempReady(b,id){return b.trial?.kind==='resonance20'&&b.trial.tempId===id&&b.trial.proven;}
export function resonanceReason(b,action){
 const id=resonanceId(action);if(!id)return undefined;
 const row=RESONANCE_BY_ID[id];
 if(!row)return '未知の共鳴権能';
 if(!row.parts.every(p=>b.powers.includes(p)))return '対応する2権能が必要です';
 if(!tempReady(b,id)&&!resonanceCanUse(b.build,id))return '共鳴権能を習得していません';
 if(b.cd.resonanceShared>0)return '共通CT '+b.cd.resonanceShared;
 if(b.gauge<100&&!tempReady(b,id))return '必殺ゲージ100%必要';
 if(['fallenjudge','kingfallen'].includes(id)&&hpRatio(b)>.5)return 'HP50%以下で発動';
 return null;
}
export function resonanceGuard(b,action){return ['res_wingking','res_kingjudge','res_kingabyss'].includes(action);}
const baseDamage=(b,mult,ignore,env)=>{
 const p=env.playerStats(b),e=env.enemyStats(b);
 return env.damage(p.atk,e.def,{mult,ignore});
};
function impact(b,n,env,ignore=0){
 let raw=baseDamage(b,n,ignore,env);
 if(env.damageGate)raw=env.damageGate(b,raw,{action:b.lastAction,landed:true});
 const actual=clamp(Math.floor(raw),0,b.enemy.hp);
 b.enemy.hp=Math.max(0,b.enemy.hp-actual);
 b.lastDamage+=actual;
 b.events.push({type:'hit',damage:actual,landed:true});
 return actual;
}
function fixedDamage(b,amount,env){
 let raw=Math.max(0,Math.floor(amount));
 if(env.damageGate)raw=env.damageGate(b,raw,{action:b.lastAction,landed:true});
 const actual=clamp(Math.floor(raw),0,b.enemy.hp);
 b.enemy.hp=Math.max(0,b.enemy.hp-actual);b.lastDamage+=actual;
 b.events.push({type:'hit',damage:actual,landed:true});return actual;
}
function multiHit(b,hits,total,ignore,env){
 let sum=0;
 for(let i=0;i<hits&&b.enemy.hp>0;i++)sum+=impact(b,total/hits,env,ignore);
 return sum;
}
function corrode(b,ratio){b.enemy.resonanceCorrosion=clamp((b.enemy.resonanceCorrosion||0)+ratio,0,.95);}
function addSeal(b,turns){const s=soul(b);s.sealTurns=Math.max(s.sealTurns||0,turns);}
function activate(b,id,env){
 const row=RESONANCE_BY_ID[id],level=tempReady(b,id)?Math.max(resonanceLevel(b.build,id),1):resonanceLevel(b.build,id);
 const v=row.levels[level-1],d=b.divine,rs=soul(b),before=b.enemy.hp,enemyMax=b.enemy.base.hp;
 switch(row.kind){
  case 'barrage':{
   const featherBonus=1+Math.min(d.feathers||0,5)*.1;
   multiHit(b,v.hits,v.mult*featherBonus,v.ignore,env);
   const judgeFeathers=v.hits;
   if(judgeFeathers>0&&b.enemy.hp>0)fixedDamage(b,Math.min(enemyMax*v.extraMaxHp,enemyMax*(judgeFeathers/v.hits)*v.extraMaxHp),env);
   break;
  }
  case 'sacrifice':{
   b.hp=Math.max(1,b.hp*.5);
   const tier=tierFromHp(hpRatio(b)),mult=v.mult*[1,1.5,2,3][tier];
   const actual=multiHit(b,1,mult,0,env);
   corrode(b,v.erosion);
   if(b.enemy.hp>0)fixedDamage(b,enemyMax*Math.min(v.extraMaxHp,(b.enemy.resonanceCorrosion||0)*v.extraMaxHp/.95),env);
   const rate=v.healLow+(v.healHigh-v.healLow)*tier/3;
   env.heal(b,actual/Math.max(1,env.playerStats(b).hp)*rate);
   break;
  }
  case 'lowBarrage':{
   b.hp=Math.max(1,b.hp*.9);
   const tier=tierFromHp(hpRatio(b));
   const bonus=1+Math.min(d.feathers||0,5)*.1;
   multiHit(b,v.hits[tier],v.mult[tier]*bonus,0,env);
   break;
  }
  case 'guard':{
   d.shield=Math.max(d.shield||0,env.playerStats(b).hp*v.shield);
   rs.wingGuard={left:v.enemyActions,reduction:v.reduction,counters:v.counters,counterMult:v.counterMult};
   break;
  }
  case 'corrosionBarrage':{
   const spend=Math.min(d.feathers||0,Math.ceil(v.bonusHits/2));
   const bonus=Math.min(v.bonusHits,spend*2);
   d.feathers=Math.max(0,(d.feathers||0)-spend);
   for(let i=0;i<v.hits+bonus;i++){
    if(b.enemy.hp>0)impact(b,v.hitMult,env,0);
    corrode(b,v.erosion);
   }
   break;
  }
  case 'lowJudgment':{
   const ratio=hpRatio(b),isLow=ratio<=.25;
   const hadProof=(d.proof||0)>=2;
   impact(b,v.mult,env,v.ignore);
   const pct=hadProof?v.proofExtra:v.currentHp[isLow?1:0];
   if(b.enemy.hp>0)fixedDamage(b,b.enemy.hp*pct,env);
   if(hadProof)d.proof=0;
   rs.breakNextDefense=true;
   break;
  }
  case 'royalJudgment':{
   d.shield=Math.max(d.shield||0,env.playerStats(b).hp*v.shield);
   rs.royalJudgment={counterMult:v.counterMult,ignore:v.ignore,extraMaxHp:v.extraMaxHp,armed:true};
   break;
  }
  case 'abyssBarrier':{
   rs.abyssBarrier={remaining:v.turns,reduction:v.reduction,heal:v.heal,erosion:v.erosion,
     storedMult:v.storedMult,prevented:0};
   // First recovery takes place at the end of the casting round.
   break;
  }
  case 'survival':{
   rs.survival={left:v.enemyActions,counterMult:v.counterMult,lowCounterMult:v.lowCounterMult,heal:v.heal,triggered:false};
   break;
  }
  case 'silence':{
   corrode(b,v.debuff);addSeal(b,v.sealTurns);
   rs.silence={ignore:v.ignore,proofMult:v.proofMult};
   break;
  }
  default:throw Error('共鳴権能の種類が不正です');
 }
 b.gauge=0;
 b.used.special++;
 b.cd.resonanceShared=3; // tick at end of activation leaves 2 subsequent full player actions on cooldown.
 env.log(b,row.name+' Lv.'+level+' 発動');
 b.events.push({type:'resonance',id,level,damage:before-b.enemy.hp});
 return true;
}
export function performResonanceAction(b,action,env){
 const id=resonanceId(action);if(!id)return false;
 const reason=resonanceReason(b,action);if(reason)throw Error(reason);
 if(tempReady(b,id))b.gauge=100;
 return activate(b,id,env);
}
export function adjustResonanceIncoming(b,raw,env){
 const rs=soul(b);
 let amount=raw;
 if(rs.wingGuard?.left>0)amount*=1-rs.wingGuard.reduction;
 if(rs.abyssBarrier?.remaining>0){
  const after=amount*(1-rs.abyssBarrier.reduction);
  rs.abyssBarrier.prevented=Math.min(b.enemy.base.hp*.1,rs.abyssBarrier.prevented+amount-after);
  amount=after;
 }
 // Dedicated survival is resolved before normal king lives in dealPlayer.
 if(rs.survival?.left>0&&!rs.survival.triggered&&amount>=env.playerStats(b).current){
  rs.survival.triggered=true;
  amount=Math.max(0,env.playerStats(b).current-1);
 }
 rs.lastIncoming=raw;
 return amount;
}
export function afterResonanceTurn(b,action,env){
 if(!b.divine)return;
 const rs=soul(b);
 // A successful guarded enemy attack opens an immediate counterattack.
 if(rs.royalJudgment?.armed&&action==='guard'&&b.turn%4===0&&b.enemyDamage>=0){
  const v=rs.royalJudgment;v.armed=false;
  impact(b,v.counterMult,env,v.ignore);
  if((rs.lastIncoming||0)>=env.playerStats(b).hp*.2&&b.enemy.hp>0)fixedDamage(b,b.enemy.base.hp*v.extraMaxHp,env);
  rs.royalJudgment=null;
 }
 if(rs.wingGuard?.left>0&&action!=='res_wingking'){
  if(rs.wingGuard.counters>0&&b.enemyDamage>0&&b.enemy.hp>0){
   impact(b,rs.wingGuard.counterMult*(1+Math.min(b.divine.feathers||0,5)*.1),env,0);
   rs.wingGuard.counters--;
  }
  rs.wingGuard.left--;
  if(rs.wingGuard.left<=0)rs.wingGuard=null;
 }
 if(rs.survival?.left>0&&action!=='res_kingfallen'){
  const v=rs.survival;
  if(v.triggered){
   if(b.enemy.hp>0)impact(b,hpRatio(b)<=.25?v.lowCounterMult:v.counterMult,env,0);
   env.heal(b,v.heal);rs.survival=null;
  }else if(--v.left<=0)rs.survival=null;
 }
 if(rs.abyssBarrier?.remaining>0){
  const v=rs.abyssBarrier;
  env.heal(b,v.heal);corrode(b,v.erosion);
  if(action!=='res_kingabyss'){
   v.remaining--;
   if(v.remaining<=0){
    if(b.enemy.hp>0)fixedDamage(b,v.prevented*v.storedMult,env);
    rs.abyssBarrier=null;
   }
  }
 }
 if(rs.sealTurns>0){if(action!=='res_abyssjudge')rs.sealTurns--;}
 if(rs.breakNextDefense&&b.enemy.buffs.length){b.enemy.buffs=b.enemy.buffs.filter(x=>!x.mul?.def);rs.breakNextDefense=false;}
 if(b.enemy.hp<=0&&b.hp>0)b.result='win';
}
export function resonanceBattleEffects(b){
 const rs=b.divine?.resonance;
 if(!rs)return null;
 return {corrosion:b.enemy.resonanceCorrosion||0,sealTurns:rs.sealTurns||0,
  wingGuard:rs.wingGuard?.left||0,abyssBarrier:rs.abyssBarrier?.remaining||0,
  survival:rs.survival?.left||0};
}