import {act,available,startBattle,enemyTurn,buff,log,heal} from './gameCore.js';
import {developerState,clone} from './progression.js';

// Experimental values only. No persistent fields or main-campaign rules use this table.
export const THREE_PHASE={playerHP:1.8,enemyAttack:.65,armorDefense:12,focusAttack:2,focusDuration:3,healFraction:.015,guardRecovery:.12};
export function startThreePhase(source,{atk=1,hp=1}={}){
 if(!Number.isFinite(atk)||!Number.isFinite(hp)||atk<.1||atk>20||hp<.1||hp>20)throw Error('倍率は0.1〜20で入力してください');
 const build=developerState(source);build.equipped=['wing','king'];
 const b=startBattle(build,{mode:'ex',floor:100,test:true});
 b.base.atk*=atk;b.base.hp*=THREE_PHASE.playerHP*hp;b.hp=b.base.hp;
 b.enemy.base.atk*=THREE_PHASE.enemyAttack;b.enemy.name='EXカイザー・三相決戦';
 b.experiment={atk,hp,kind:'three-phase'};
 b.trial={kind:'three-phase',phase:1,applied:false,phaseHistory:[1]};
 log(b,'実験場限定：三相決戦。試作ルール／本編報酬なし');return b;
}
function crystal(b){
 b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='trialCrystal');
 b.enemy.buffs.push({id:'trialCrystal',mul:{def:THREE_PHASE.armorDefense},remaining:9999});
 b.enemy.statuses.trialCrystal=9999;log(b,'黒晶殻が形成された：敵の防御力が上昇');
}
function clearCrystal(b){
 const had=b.enemy.buffs.some(x=>x.id==='trialCrystal');
 b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='trialCrystal');delete b.enemy.statuses.trialCrystal;
 if(had)log(b,'黒晶殻を破壊した');return had;
}
function phaseState(b){
 if(b.enemy.phase<=b.trial.phase)return;
 b.trial.phase=b.enemy.phase;b.trial.phaseHistory.push(b.enemy.phase);
 if(b.enemy.phase===3){crystal(b);log(b,'第三相・終極：終末判定の計測開始');}
 else log(b,'第二相・変転：カイザーの権能が顕現');
}
function landedEffect(b){
 if(b.trial.applied||b.lastDamage<=0)return;
 b.trial.applied=true;
 if(b.lastAction==='power'||b.lastAction==='ultimate')clearCrystal(b);
 if(b.lastAction==='ultimate'&&b.enemy.hp>0){b.enemyStop=Math.max(b.enemyStop,1);log(b,'超堕天撃の衝撃：敵の通常行動を一回停止');}
}
function threePhaseEnemy(b,guard,rng){
 phaseState(b);landedEffect(b);
 const stopped=b.enemyStop>0||!!b.enemy.statuses.stun;
 enemyTurn(b,guard,rng);
 // log() shifts old entries at the 100-line cap. Inspect the current response,
 // explicitly excluding evasion/stops so old attack lines cannot trigger effects.
 const attacked=!stopped&&!b.log.at(-1)?.startsWith('速度優位：')&&b.log.slice(-3).some(x=>/^敵の(重撃|反撃)/.test(x));
 if(!attacked||b.hp<=0||b.enemy.hp<=0||b.enemy.phase<2)return;
 const effect=Math.min(2,Math.floor(rng()*3));
 if(effect===0)crystal(b);
 else if(effect===1){b.statuses.pressure=3;log(b,'圧壊の残響：重圧が付与された');}
 else{
  const cap=b.enemy.base.hp*(b.enemy.phase===2?.67:.33),before=b.enemy.hp;
  b.enemy.hp=Math.max(before,Math.min(cap,before+b.enemy.base.hp*THREE_PHASE.healFraction));
  log(b,`生命還流：敵HPが${Math.floor(b.enemy.hp-before).toLocaleString()}回復`);
 }
}
export function actThreePhase(b,action,options={}){
 if(!b.test||b.mode!=='ex'||b.trial?.kind!=='three-phase')throw Error('三相決戦専用の処理です');
 const reason=available(b,action,options.route);if(reason)throw Error(reason);
 b.trial.applied=false;
 const focused=b.buffs.some(x=>x.id==='trialFocus')&&['slash','power'].includes(action);
 if(focused)buff(b,'trialFocusAttack',1,{atk:THREE_PHASE.focusAttack});
 act(b,action,{...options,enemyAction:threePhaseEnemy});
 phaseState(b);landedEffect(b);
 if(focused&&b.lastDamage>0){b.buffs=b.buffs.filter(x=>x.id!=='trialFocus');log(b,'蓄勢を解放した');}
 if(action==='guard'&&!b.result){delete b.statuses.pressure;buff(b,'trialFocus',THREE_PHASE.focusDuration,{});const before=b.hp;heal(b,THREE_PHASE.guardRecovery);log(b,`防御で重圧を解除し、蓄勢を得た。HP ${Math.round(b.hp-before).toLocaleString()} 回復`);}
 // All trial state stays on the temporary battle, never on the save/build object.
 return b;
}
export function retryThreePhase(b){return startThreePhase(clone(b.build),b.experiment);}
