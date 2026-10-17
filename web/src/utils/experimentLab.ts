import type { BattleChallengeLevel, CpuDifficulty } from '../types/game';
export type BattleReturnDestination = 'SELECT'|'GROWTH_HUB'|'DEV_TOOLS'|'EXPERIMENT_LAB';
export interface ExperimentTrial { id:'CALIBRATION'|'RESONANCE_STRESS'|'LIMIT_BREAK'; eyebrow:string; title:string; kaiserLevel:BattleChallengeLevel; difficulty:CpuDifficulty; objective:string; description:string; recommendedFor:string; }
export const EXPERIMENT_TRIALS:readonly ExperimentTrial[]=[
 {id:'CALIBRATION',eyebrow:'CALIBRATION / 01',title:'基礎校正',kaiserLevel:10,difficulty:'NORMAL',objective:'火力と操作感の基準を取る',description:'権能の動き、連携、操作テンポを落ち着いて確認する。',recommendedFor:'新しい編成を試すとき'},
 {id:'RESONANCE_STRESS',eyebrow:'RESONANCE / 02',title:'共鳴ストレス試験',kaiserLevel:50,difficulty:'EXPERT',objective:'高火力と対策を検証する',description:'強敵相手に共鳴権能の噛み合い、耐久力、切り返しを試す。',recommendedFor:'共鳴権能・高難度編成'},
 {id:'LIMIT_BREAK',eyebrow:'LIMIT BREAK / 03',title:'限界突破試験',kaiserLevel:100,difficulty:'EXPERT',objective:'火力と生存力の限界を測る',description:'最終レベルの圧力下で必殺のタイミングと耐久の限界を探る。',recommendedFor:'仕上げた編成の最終確認'}
];
export type ExperimentGrade='S'|'A'|'B'|'C'|'D';
function clampRatio(v:number):number{return Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;}
export function getExperimentGrade(won:boolean,playerHpRatio:number,enemyHpRatio:number):ExperimentGrade{
 const p=clampRatio(playerHpRatio),e=clampRatio(enemyHpRatio);
 if(won){if(p>=.65)return'S';if(p>=.35)return'A';return'B';}
 if(e<=.2)return'B';if(e<=.5)return'C';return'D';
}
export function shouldPersistBattleResult(suppressProgressionRewards:boolean):boolean{return !suppressProgressionRewards;}
export function shouldRecordBattleProgress(destination:BattleReturnDestination):boolean{return destination!=='EXPERIMENT_LAB';}
