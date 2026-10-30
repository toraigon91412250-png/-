import {FINAL_SKILLS,BALANCE} from '../data/config.js';
import {stage} from '../utils/gameCore.js';
import {CAMPAIGN_RULES} from '../utils/campaign20.js';
import {GUARD_BREAK_TRIAL} from '../utils/guardBreakTrial.js';
import {THREE_PHASE} from '../utils/threePhase.js';
// Unlock visibility is independent of temporary usability. The engine still authorizes every action.
export function finalCommandVisible(b,id){
 if(['slash','guard','wait','divine','fallen'].includes(id))return true;
 if(id==='genesis'||id==='ending')return b.balance===(id==='genesis'?100:-100);
 const skill=FINAL_SKILLS[id];return !!skill&&(!skill.side||(Math.sign(b.balance)===skill.side&&stage(b.balance)>=(skill.stage||0)));
}
export function finalCommandLabel(b,id,reason){
 if(!reason)return '';
 const remaining=b.buffs.find(x=>x.id==='transcend')?.remaining;
 if(remaining>0&&(!!FINAL_SKILLS[id]||['genesis','ending'].includes(id)))return '封鎖中・残り'+remaining+'T';
 return reason;
}
export function guardFocusInfo(b){
 if(b.character!=='irena')return null;
 if(b.campaign)return {multiplier:CAMPAIGN_RULES.focus,turns:3,id:'campaignFocus'};
 if(b.trial?.kind==='guard-break')return {multiplier:GUARD_BREAK_TRIAL.focus,turns:3,id:'guardBreakFocus',onAttempt:true};
 if(b.trial?.kind==='three-phase')return {multiplier:THREE_PHASE.focusAttack,turns:THREE_PHASE.focusDuration,id:'trialFocus'};
 return null;
}
export function guardFocusCommand(b){const f=guardFocusInfo(b);return f?'蓄勢：斬撃/破壊 攻×'+f.multiplier+'・'+f.turns+'T':null;}
export function guardRulesText(b){const f=guardFocusInfo(b);return f?'防御：被ダメージ70%軽減・ゲージ＋18・HP12%回復。蓄勢：斬撃／破壊の権能の攻撃力×'+f.multiplier+'。'+f.turns+'ターン保持し、'+(f.onAttempt?'斬撃／破壊を実行すると消費。':'ダメージを与えると消費。')+'羽弾・穿羽・連羽・必殺には適用されません。重複しません。':null;}
export function deadlineRemaining(b){return !b.result&&b.enemy.phase===3&&['ex','final'].includes(b.mode)?Math.max(0,BALANCE.exLimit-b.phaseTurns):null;}
