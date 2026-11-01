import {DIV_IDS,DIV_NAMES,DIV_TRIALS,DIV_SKILLS} from '../data/divinity.js';
import {hasDivinity,divinityTrialReason} from './divinityProgress.js';
import {startBattle,act,damage,dealPlayer,playerStats,enemyStats,log,heal,baseStats} from './gameCore.js';
import {divBattleState,syncDivinityLives,divinityTrialFloor} from './divinityCombat.js';
import {cooperationEnabled,cooperationTier,cooperationTrialReason,grantCooperationTrial} from './divinityCooperation.js';
export const divTrial=b=>b?.trial?.kind==='divinity';
export function startDivinityTrial(s,id,{combatV2=false}={}){
 if(cooperationEnabled(s)&&DIV_IDS.includes(id))return startCooperationTrial(s,id,{combatV2});
 const reason=divinityTrialReason(s,id);if(reason)throw Error(reason);
 const b=startBattle(s,{mode:'normal',floor:1,test:true,combatV2});b.test=false;b.mode='divinity';
 const late=['truth','infinite'].includes(id);
 b.trial={kind:'divinity',id,awakened:late,used:false,guards:0,proof:0,lastAttack:null,returnReady:false,heavyGuarded:false,incomingCorrosion:false,seen:[],seals:id==='infinite'?3:0,brokenTurn:0};
 b.enemy.name=DIV_TRIALS[id].enemy;b.enemy.base=late?{hp:id==='infinite'?1800000:160000,atk:1800,def:800,spd:12}:{hp:id==='wing'?1900:4800,atk:id==='wing'?72:115,def:id==='wing'?12:25,spd:12};
 b.enemy.hp=b.enemy.base.hp;b.log=[DIV_TRIALS[id].condition,'覚醒はこの試練限り。勝利すると正式に奪還。'];return b;
}
export function divinityIntent(b){
 if(!divTrial(b))return b.turn%4===0?'敵の重撃：防御で軽減':'敵の反撃';
 const t=b.trial;
 if(t.id==='abyss')return b.turn%3===1?'侵食波：防御→次の攻撃で逆用':'深淵の脈動';
 if(t.id==='fallen'&&!t.awakened)return '試しの一撃：HPを45%にする（致死なし）';
 if(['king','truth','infinite'].includes(t.id))return b.turn%3===1?'王の重撃：防御・羽衣・受け流しで対応':'王冠の反響';
 return b.turn%3===1?'封印の重撃：防御で受け止める':'封印の斬撃';
}
function divineTrialEnemy(b,guard){
 const t=b.trial;if(b.enemy.hp<=0||b.hp<=0)return;
 if(t.id==='fallen'&&!t.awakened){b.hp=Math.min(b.hp,b.base.hp*.45);log(b,'試しの一撃：倒れずに、力を選べ');return;}
 const heavy=b.turn%3===1;
 if(t.id==='abyss'&&heavy){t.incomingCorrosion=true;if(guard)t.returnReady=true;else{b.statuses.pressure=3;log(b,'侵食波：防御して逆用する隙がある');}}
 if(heavy&&guard){t.heavyGuarded=true;t.returnReady=true;log(b,'予告を見切った。次の攻撃で反撃できる');}
 const p=playerStats(b),late=['truth','infinite'].includes(t.id);
 let raw=late?p.hp*(heavy?(t.id==='infinite'?1.65:.8):(t.id==='infinite'?.16:.08)):damage(b.enemy.base.atk,p.def,{mult:heavy?1.6:1});
 if(guard)raw*=.2;
 b.enemyDamage=dealPlayer(b,Math.round(raw));log(b,`${heavy?'予告重撃':'反撃'} → ${Math.round(b.enemyDamage)}`);
 if(guard&&b.hp>0)heal(b,.08);
 if(b.turn>=36&&late){b.hp=0;log(b,'選択の刻限：36行動で決着が必要');}
}
function divineTrialGate(b,amount){
 const floor=b.enemy.base.hp*divinityTrialFloor(b);
 return Math.min(amount,Math.max(0,b.enemy.hp-floor));
}
export function actDivinityTrial(b,action,options={}){
 if(b.trial?.cooperation)return actCooperationTrial(b,action,options);
 if(!divTrial(b))throw Error('神格試練ではありません');
 const t=b.trial,wasAwake=t.awakened,guard=action==='guard'||DIV_SKILLS[action]?.guard;
 const before={ratio:b.hp/b.base.hp,returnReady:t.returnReady};t.returnReady=false;
 act(b,action,{...options,rng:()=>.5,enemyAction:divineTrialEnemy,damageGate:divineTrialGate});
 if(b.hp<=0)return b;
 if(guard)t.guards++;
 const attacked=b.events.some(e=>e.type==='hit'&&e.landed);
 if(attacked&&t.lastAttack!==action)t.proof=Math.min(2,t.proof+1);
 if(attacked)t.lastAttack=action;
 const signature=DIV_SKILLS[action]?.power;
 if(signature&&!t.seen.includes(signature))t.seen.push(signature);
 if(!t.awakened){
  const ready=t.id==='wing'?t.guards>=2:t.id==='abyss'?before.returnReady&&attacked:t.id==='fallen'?before.ratio<=.5&&attacked:t.id==='judge'?t.proof>=2&&guard:before.returnReady&&attacked;
  if(ready){t.awakened=true;b.build.powers[t.id]=Math.max(1,b.build.powers[t.id]||0);if(!b.powers.includes(t.id))b.powers.push(t.id);syncDivinityLives(b);
   b.base=baseStats({...b.build,equipped:b.powers,...(b.combatV2?{markEquip:[]}: {})});b.hp=Math.min(b.base.hp,Math.max(b.hp,b.base.hp*.65));b.gauge=100;
   log(b,`封印解除 — ${DIV_NAMES[t.id]}が目覚めた！ 新しい技で突破せよ`);b.events.push({type:'authorityAwakening',power:t.id});
  }
 }
 if(wasAwake&&signature===t.id){t.used=true;if(t.id==='king')t.royalReady=true;}
 if(t.id==='infinite'&&t.seals>0&&signature&&signature!==t.previousPower&&t.heavyGuarded&&t.brokenTurn!==b.turn){t.seals--;t.heavyGuarded=false;t.brokenTurn=b.turn;log(b,`神座の封印を破砕：残り${t.seals}枚`);}
 if(signature)t.previousPower=signature;
 // Passive erosion cannot bypass ritual gates. Actions are deterministic in trials.
 if(b.result==='win'&&((DIV_IDS.includes(t.id)&&(!t.awakened||!t.used))||(t.id==='truth'&&(!t.heavyGuarded||t.seen.length<3))||(t.id==='infinite'&&t.seals))){b.result=null;b.enemy.hp=Math.max(1,b.enemy.base.hp*.1);}
 return b;
}
export function settleDivinityTrial(s,b){
 if(!divTrial(b)||!b.result||b.settled)return null;
 if(!hasDivinity(s)||divinityTrialReason(s,b.trial.id))throw Error('試練と進行が一致しません');
 b.settled=true;const r={p:0,fragments:0,sp:0,levels:0,resShards:0,achievements:[],unlocks:[]};if(b.result!=='win')return r;
 const id=b.trial.id;
 if(b.trial.cooperation){
  if(!b.trial.proven)throw Error('協力試練の条件を満たしていません');
  grantCooperationTrial(s,id,b.trial.tier);
  r.p=b.trial.tier===1?120:180;s.p+=r.p;
  r.fragments=b.trial.tier===1?16:24;s.fragments[id]+=r.fragments;
  r.unlocks.push(`${DIV_NAMES[id]} 協力上限突破`);
  return r;
 }
 if(DIV_IDS.includes(id)){
  if(!b.trial.awakened||!b.trial.used)throw Error('覚醒した権能で試練を突破してください');
  const first=!s.divinity.reclaimed.includes(id);if(first){s.divinity.reclaimed.push(id);s.divinity.order.push(id);s.powers[id]=Math.max(1,s.powers[id]||0);if(!s.powerHistory.includes(id))s.powerHistory.push(id);if(s.equipped.length<2)s.equipped.push(id);r.unlocks.push(id);r.p=120;r.fragments=16;s.p+=120;s.fragments[id]+=16;}else{r.p=40;r.fragments=4;s.p+=40;s.fragments[id]+=4;}
 }else if(id==='truth'){s.divinity.truth=true;r.unlocks.push('真・神格解放');}
 else{s.divinity.infiniteWins++;s.resShards+=40;r.resShards=40;}
 return r;
}

// Cooperation trials reuse the established deterministic combat and boss
// telegraphs, but test trust rather than granting an authority a second time.
function startCooperationTrial(s,id,{combatV2=false}={}){
 const reason=cooperationTrialReason(s,id);if(reason)throw Error(reason);
 const tier=cooperationTier(s,id)+1;
 const b=startBattle(s,{mode:'normal',floor:1,test:true,combatV2});b.test=false;b.mode='divinity';
 b.trial={kind:'divinity',cooperation:true,id,tier,awakened:true,used:false,
   guards:0,proof:0,lastAttack:null,heavyGuarded:false,incomingCorrosion:false,
   returnReady:false,proven:false};
 b.powers=[id,...s.equipped.filter(x=>x!==id)].slice(0,2);
 b.build.equipped=[...b.powers];b.base=baseStats({...b.build,equipped:b.powers,...(b.combatV2?{markEquip:[]}: {})});b.hp=b.base.hp;
 b.enemy.name=`${DIV_NAMES[id]}・協力の試練 ${tier}`;
 b.enemy.base=tier===1?{hp:8000,atk:145,def:40,spd:12}:{hp:100000,atk:1150,def:500,spd:18};
 b.enemy.hp=b.enemy.base.hp;b.log=[`${DIV_NAMES[id]}の第${tier}協力試練。条件を達成して勝利せよ。`];
 return b;
}
function actCooperationTrial(b,action,options){
 const t=b.trial,priorRatio=b.hp/b.base.hp,priorProof=t.proof;
 const guard=action==='guard'||DIV_SKILLS[action]?.guard;
 act(b,action,{...options,rng:()=>.5,enemyAction:divineTrialEnemy,damageGate:divineTrialGate});
 if(guard)t.guards++;
 const attacked=b.events.some(e=>e.type==='hit'&&e.landed&&e.damage>=0);
 if(attacked&&t.lastAttack!==action)t.proof=Math.min(2,t.proof+1);
 if(attacked)t.lastAttack=action;
 const own=DIV_SKILLS[action]?.power===t.id || t.id==='wing'&&['feather','pierce','volley'].includes(action);
 if(own)t.used=true;
 const verified={
  wing:t.guards>=1&&t.used,
  king:t.heavyGuarded&&t.used&&attacked,
  fallen:priorRatio<=.5&&t.used&&attacked,
  judge:priorProof>=2&&['verdict','judgment'].includes(action)&&attacked,
  abyss:t.heavyGuarded&&t.used&&attacked
 };
 if(verified[t.id]&&!t.proven){t.proven=true;log(b,'協力試練の条件達成。最後まで戦い抜け！');b.events.push({type:'authorityAwakening',power:t.id});}
 if(b.result==='win'&&!t.proven){b.result=null;b.enemy.hp=Math.max(1,b.enemy.base.hp*.1);}
 return b;
}
