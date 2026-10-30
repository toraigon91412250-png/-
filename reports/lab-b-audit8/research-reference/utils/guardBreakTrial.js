import {startBattle,act,available,enemyTurn,buff,heal,log} from './gameCore.js';
import {developerState,clone} from './progression.js';
// Experimental lab-only settings; never used by the main raid or EX battle.
export const GUARD_BREAK_TRIAL={hp:100000,atk:1400,def:900,spd:150,armor:8,reformHits:3,focus:3,guardHeal:.12};
function forgeTrialArmor(b){
 b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='guardBreakArmor');
 b.enemy.buffs.push({id:'guardBreakArmor',mul:{def:GUARD_BREAK_TRIAL.armor},remaining:9999});
 b.enemy.statuses.guardBreakArmor=9999;b.trial.responses=0;log(b,'熾炎の鎧が形成された：防御力が上昇');
}
export function startGuardBreakTrial(source,{atk=1,hp=1}={}){
 if(!Number.isFinite(atk)||!Number.isFinite(hp)||atk<.1||atk>20||hp<.1||hp>20)throw Error('倍率は0.1〜20で入力してください');
 const s=developerState(source);s.level=75;s.talent=10;s.awakening=0;s.stats={hp:0,atk:0,def:0,spd:0};s.equipped=['wing','king'];s.powers.wing=s.powers.king=3;s.markEquip=[];s.badge=null;s.skills={feather:5,destruction:5,ultimate:5};
 const b=startBattle(s,{mode:'raid',floor:100,test:true});b.base.atk*=atk;b.base.hp*=hp;b.hp=b.base.hp;
 b.enemy.base={hp:GUARD_BREAK_TRIAL.hp,atk:GUARD_BREAK_TRIAL.atk,def:GUARD_BREAK_TRIAL.def,spd:GUARD_BREAK_TRIAL.spd};b.enemy.hp=b.enemy.base.hp;b.enemy.name='熾竜・崩鎧試練';
 b.trial={kind:'guard-break',responses:0,brokenThisTurn:false};b.experiment={kind:'guard-break',atk,hp};
 forgeTrialArmor(b);log(b,'実験場限定：破壊の権能・必殺の命中で鎧を崩す。防御は回復と蓄勢を得る。');return b;
}
function breakTrialArmor(b){
 if(b.trial.brokenThisTurn||b.lastDamage<=0||!['power','ultimate'].includes(b.lastAction))return;
 b.trial.brokenThisTurn=true;
 if(b.enemy.statuses.guardBreakArmor){delete b.enemy.statuses.guardBreakArmor;b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='guardBreakArmor');b.trial.responses=0;log(b,'熾炎の鎧を破壊した');}
}
function guardBreakResponse(b,guard,rng){
 breakTrialArmor(b);const stopped=b.enemyStop>0||!!b.enemy.statuses.stun;enemyTurn(b,guard,rng);
 // Count actual incoming hits only, never old log entries or predictions.
 if(!stopped&&b.enemyDamage>0&&b.hp>0&&b.enemy.hp>0&&!b.enemy.statuses.guardBreakArmor){b.trial.responses++;if(b.trial.responses>=GUARD_BREAK_TRIAL.reformHits)forgeTrialArmor(b);}
}
export function actGuardBreakTrial(b,action,options={}){
 if(!b.test||b.mode!=='raid'||b.trial?.kind!=='guard-break')throw Error('崩鎧試練専用の処理です');
 const reason=available(b,action,options.route);if(reason)throw Error(reason);
 const focused=b.buffs.some(x=>x.id==='guardBreakFocus')&&['slash','power'].includes(action);
 b.trial.brokenThisTurn=false;if(focused)buff(b,'guardBreakStrike',1,{atk:GUARD_BREAK_TRIAL.focus});
 act(b,action,{...options,enemyAction:guardBreakResponse});breakTrialArmor(b);
 if(focused){b.buffs=b.buffs.filter(x=>x.id!=='guardBreakFocus');log(b,'蓄勢を解放した');}
 if(action==='guard'&&b.hp>0&&!b.result){heal(b,GUARD_BREAK_TRIAL.guardHeal);buff(b,'guardBreakFocus',9999,{});log(b,'防御：HP12%回復・斬撃／破壊の権能へ蓄勢');}
 return b;
}
export function retryGuardBreakTrial(b){return startGuardBreakTrial(clone(b.build),b.experiment);}
