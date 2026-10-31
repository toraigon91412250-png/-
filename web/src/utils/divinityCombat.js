import {isResonanceAction,resonanceReason,resonanceGuard,performResonanceAction,adjustResonanceIncoming,afterResonanceTurn} from './resonanceCombat.js';
import {DIV_IDS,DIV_SKILLS} from '../data/divinity.js';
import {RECIPES} from '../data/config.js';
import {cooperationEnabled,canZeroRelease,cooperationStrikeMultiplier,registerCooperationAction,cooperationDialogue} from './divinityCooperation.js';
import {hasDivinity} from './divinityProgress.js';
import {attack,buff,heal,log,playerStats,enemyStats,damage,baseStats} from './gameCore.js';
import {combatNotice} from './combatObservation.js';
export const isDivinityBattle=b=>b?.character==='irena'&&hasDivinity(b.build);
const DIV_LIVES={king:5,god:4,kingwing:7,kingjudge:6,abyssking:6};
export function divBattleState(b){return b.divine ||= {lifePools:{...DIV_LIVES},feathers:0,proof:0,lastAttack:null,lastPower:null,guarded:false,counter:0,shield:0,revived:false,unified:0,links:0};}
export function syncDivinityLives(b){if(!isDivinityBattle(b))return;const d=divBattleState(b);b.lives=b.powers.reduce((n,id)=>n+(d.lifePools[id]||0),0);}
export function spendDivinityLife(b){if(!isDivinityBattle(b))return;const d=divBattleState(b),id=b.powers.find(x=>d.lifePools[x]>0);if(id)d.lifePools[id]--;}
export function divHasPower(b,id){return b.powers.includes(id)||b.powers.some(x=>RECIPES.find(r=>r.id===x)?.parts.includes(id));}
export function divPowerLevel(b,id){return b.build.powers[id]|| (divHasPower(b,id)?5:0);}
export function divinityAvailable(b,action){
 if(!isDivinityBattle(b))return undefined;
 if(isResonanceAction(action))return resonanceReason(b,action);
 if(['slash','guard','wait'].includes(action))return undefined;
 const row=DIV_SKILLS[action],d=divBattleState(b);
 if(row){
  if(row.attune){if(!b.build.divinity.reclaimed.includes(row.attune))return '未奪還の権能です';if(d.unified)return '統合中は全権能を使用できます';if(b.powers.includes(row.attune))return '既に装備しています';}
  if(action==='apotheosis'&&cooperationEnabled(b.build)){
   if(d.unifiedUsed)return '零域全解放は1戦闘1回';
   if(!canZeroRelease(b.build))return '全5権能の協力率51%以上が必要';
  }
  if(row.stage&&b.build.awakening<row.stage&&!(cooperationEnabled(b.build)&&row.attune))return `神格第${row.stage}段階で解放`;
  if(row.power&&(!divHasPower(b,row.power)||divPowerLevel(b,row.power)<row.level))return `${row.power}権能を装備・Lv.${row.level}で解放`;
  if(action==='fallenEnd'&&b.hp/b.base.hp>.25)return 'HP25%以下で使用可能';
  if(action==='judgment'&&d.proof<2)return '異なる攻撃で証を2つ蓄積';
  if(action==='convergence'&&!d.unified)return '真・神格解放中に使用可能';
  return null;
 }
 if(['feather','pierce','volley'].includes(action)&&!divHasPower(b,'wing'))return '黒翼を取り戻し装備してください';
 if(action==='power'&&!b.powers.length)return '権能を取り戻してください';
 if(action==='ultimate'&&!divHasPower(b,'fallen')&&b.build.awakening<2)return '堕天を装備、または神格第2段階で解放';
 return undefined;
}
export const divinityIsGuard=(b,action)=>isDivinityBattle(b)&&(!!DIV_SKILLS[action]?.guard||resonanceGuard(b,action));
export function divinityTrialFloor(b){
 const t=b.trial;if(t?.kind!=='divinity')return 0;
 if(t.cooperation)return t.proven?0:.1;
 if(t.id==='truth')return !t.heavyGuarded||t.seen.length<3?.15:0;
 if(t.id==='infinite')return [0,.15,.45,.75][t.seals];
 return !t.awakened?.45:!t.used?.1:0;
}
export const divinityErosionCap=b=>Math.min(.95,1-divinityTrialFloor(b));
export function divinityIncoming(b,amount,unmitigatedAttack=amount){
 if(!isDivinityBattle(b)||b.statuses.invulnerable||amount<=0)return amount;const d=divBattleState(b),incomingRaw=amount;
 if(b.enemy.statuses.divinityWeaken)amount*=.7;
 if(d.nextReduction){amount*=.5;d.nextReduction=false;}
 const absorbed=Math.min(amount,d.shield);d.shield-=absorbed;amount-=absorbed;
 amount=adjustResonanceIncoming(b,amount,{playerStats});
 if(d.resonance){d.resonance.lastIncoming=incomingRaw;d.resonance.lastIncomingPower=unmitigatedAttack;}
 if(absorbed>0){log(b,`障壁が${Math.round(absorbed)}を受け止めた`);b.events.push({type:'divinityShield',amount:absorbed});}
 if(amount>=playerStats(b).current&&b.build.awakening>=4&&!d.revived){d.revived=true;heal(b,.4);amount=Math.min(amount,Math.max(0,playerStats(b).current-playerStats(b).hp*.4));log(b,'神域の再臨：一度だけ、HP40%で再起');b.events.push({type:'divinityRevive'});}
 return amount;
}
export function divinityBefore(b,action){
 if(!isDivinityBattle(b))return;const d=divBattleState(b);d.guardAction=action==='guard'||divinityIsGuard(b,action);d.freshUnified=false;
 if(d.resonance){d.resonance.lastIncoming=0;d.resonance.lastIncomingPower=0;}
 if(action==='royalGuard'||action==='mantle')d.shield=Math.max(d.shield,playerStats(b).hp*(action==='royalGuard'&&divPowerLevel(b,'king')>=2?.35:.25));
 if(d.guardAction&&b.build.divinity.branches.king==='bastion'&&divHasPower(b,'king'))d.shield=Math.max(d.shield,playerStats(b).hp*.15);
 if(action==='fallenOath'){b.hp=Math.min(b.hp,b.base.hp*.45);if(divPowerLevel(b,'fallen')>=2)b.gauge=Math.min(100,b.gauge+15);}
}
export function divinityStrikeProfile(b,action){
 if(!isDivinityBattle(b))return {mult:1,ignore:0};const d=divBattleState(b),row=DIV_SKILLS[b.lastAction],branch=b.build.divinity.branches;let mult=1,ignore=0;
 d.attackWasGuarded=d.guarded;
 if(d.guarded&&b.build.awakening>=1){mult*=1.35;d.guarded=false;log(b,'神性の反撃：次の攻撃＋35%');}
 if(row?.power&&d.lastPower&&d.lastPower!==row.power&&(b.build.awakening>=2||divPowerLevel(b,row.power)>=4)){mult*=b.build.awakening>=2?1.35:1.2;d.links++;log(b,'権能連携：異なる記憶が重なった');b.events.push({type:'divinityLink',from:d.lastPower,to:row.power});}
 if(row?.power){d.lastPower=row.power;mult*=cooperationStrikeMultiplier(b.build,row.power);}
 if(['feather','pierce','volley'].includes(action)&&branch.wing==='assault')mult*=1.3;
 if(['plume','thousandWings'].includes(b.lastAction)){mult*=1+d.feathers*(b.lastAction==='thousandWings'?.4:.25);d.feathers=0;}
 if(b.lastAction==='abyssEnd')mult*=2+b.erosion*5;
 if(row?.power==='fallen'&&branch.fallen==='risk'&&b.hp/b.base.hp<=.25)mult*=1.6;
 if(b.lastAction==='fallenEnd')mult*=2;
 if(row?.power==='judge'){
  if(d.resonance?.silence){ignore=Math.max(ignore,d.resonance.silence.ignore);if(d.proof>=2){mult*=d.resonance.silence.proofMult;d.proof=0;}d.resonance.silence=null;}
  if(branch.judge==='sentence')mult*=1.35;
  if(d.proof>=2){mult*=b.lastAction==='judgment'?3:2;ignore=1;d.proof=0;log(b,'断罪の証：防御を貫き、執行');}
  if(branch.judge==='insight'){b.enemy.buffs=[];d.nextReduction=true;}
 }
 if(d.counter&&row?.power==='king'){mult*=1+d.counter*(branch.king==='revenge'?2:1);d.counter=0;}
 if(b.lastAction==='convergence'){mult*=4;ignore=1;}
 return {mult,ignore};
}
export function performDivinityAction(b,action,rng,damageGate){
 if(!isDivinityBattle(b))return false;
 if(isResonanceAction(action))return performResonanceAction(b,action,{damage,playerStats,enemyStats,heal,log,damageGate,combatNotice});
 if(!DIV_SKILLS[action])return false;
 const row=DIV_SKILLS[action],d=divBattleState(b);
 if(row.attune){const ratio=b.hp/b.base.hp;b.powers=cooperationEnabled(b.build)?[...b.powers.slice(-1),row.attune]:b.powers.length?[b.powers[0],row.attune]:[row.attune];b.base=baseStats({...b.build,equipped:b.powers});b.hp=b.base.hp*ratio;syncDivinityLives(b);log(b,row.name+'：2枠目を切り替えた');}
 else if(action==='purify'){b.statuses={};heal(b,.25);log(b,'神威・浄化：異常解除・HP25%回復');}
 else if(action==='apotheosis'){
  d.unified=cooperationEnabled(b.build)?2:4;d.freshUnified=true;d.unifiedUsed=cooperationEnabled(b.build)||d.unifiedUsed;d.savedPowers=[...b.powers];b.powers=[...new Set([...b.powers,...DIV_IDS])];syncDivinityLives(b);buff(b,'divineUnified',5,{hp:3,atk:3,def:3,spd:3});b.gauge=100;log(b,cooperationEnabled(b.build)?'全権委任X — 零域全解放、五つの力が同調する':'真・神格解放 — 五つの力を、私の意思で');b.events.push({type:'apotheosis'});
 }else if(row.guard){b.gauge=Math.min(100,b.gauge+18);log(b,row.name+'：受け流す');}
 else {
  if(row.power==='abyss'){
   const extra=(b.build.divinity.branches.abyss==='dominate'?.06:0)+(divPowerLevel(b,'abyss')>=2?.03:0);
   b.erosion=Math.min(divinityErosionCap(b),b.erosion+.12+extra);b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='divinityEnemyWard');b.enemy.statuses.divinityWeaken=3;
   if(b.trial?.incomingCorrosion){b.trial.incomingCorrosion=false;heal(b,.15);log(b,'侵食を逆流させ、HP15%を取り戻した');}
   if(b.build.divinity.branches.abyss==='drain')heal(b,.15);
  }
  const baseCooldown=b.cd[row.base],gaugeBefore=b.gauge;
  attack(b,row.base,rng,damageGate);
  if(baseCooldown===undefined)delete b.cd[row.base];else b.cd[row.base]=baseCooldown;
  if(row.base==='ultimate')b.gauge=gaugeBefore;
  if(row.power==='fallen'&&b.build.divinity.branches.fallen==='resolve')d.shield=Math.max(d.shield,playerStats(b).hp*.12);
  if(action==='royalReturn')heal(b,.2);
  log(b,row.name+' 発動');
 }
 b.cd[action]=row.ct+1;return true;
}
export function divinityAfter(b,action){
 if(!isDivinityBattle(b)||b.hp<=0)return;const d=divBattleState(b),guard=d.guardAction;
 registerCooperationAction(b,action);d.line=cooperationDialogue(b);
 if(guard){
  d.guarded=true;if(divHasPower(b,'wing'))d.feathers=Math.min(5,d.feathers+(divPowerLevel(b,'wing')>=2?2:1)+(action==='mantle'?1:0));
  if(divHasPower(b,'king'))d.counter=Math.min(2,d.counter+1);
  if(divHasPower(b,'wing')&&b.build.divinity.branches.wing==='shelter'){heal(b,.12);d.feathers=Math.min(5,d.feathers+1);}
 }else if(b.lastDamage>0){
  if(divHasPower(b,'wing')&&!['plume','thousandWings'].includes(action))d.feathers=Math.min(5,d.feathers+1);
  if(divHasPower(b,'judge')&&action!==d.lastAttack&&!['verdict','judgment'].includes(action))d.proof=Math.min(2,d.proof+(divPowerLevel(b,'judge')>=2&&d.attackWasGuarded?2:1));
  d.lastAttack=action;
 }
 if(d.unified&&!d.freshUnified){d.unified--;if(!d.unified){b.powers=d.savedPowers;syncDivinityLives(b);b.buffs=b.buffs.filter(x=>x.id!=='divineUnified');delete d.savedPowers;log(b,'神格解放が静まる。取り戻した記憶は残る。');}}
 afterResonanceTurn(b,action,{playerStats,enemyStats,damage,heal,log,combatNotice});
}
