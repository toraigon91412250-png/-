import {RESONANCE_BY_ID} from '../data/resonanceV3.js';
import {DIV_IDS,DIV_BRANCHES,DIV_STAGES} from '../data/divinity.js';
import {RECIPES} from '../data/config.js';
import {cooperationEnabled,cooperationTrialReason,normalizeCooperation} from './divinityCooperation.js';
export const hasDivinity=s=>s?.divinity?.schema===1;
export function divinityState(){return {schema:1,reclaimed:[],branches:{},truth:false,infiniteWins:0,order:[],migrated:false,notice:''};}
export function validateDivinityField(value,s){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.schema!==1)throw Error('神格データの形式に対応していません。元のJSONを保持してください');
 const d=divinityState();const ids=x=>Array.isArray(x)?[...new Set(x.filter(v=>DIV_IDS.includes(v)))]:[];
 d.reclaimed=ids(value.reclaimed);d.order=ids(value.order);d.truth=value.truth===true;d.infiniteWins=Number.isSafeInteger(value.infiniteWins)?Math.max(0,value.infiniteWins):0;d.migrated=value.migrated===true;
 for(const id of DIV_IDS){if(s.powers[id]&&!d.reclaimed.includes(id))d.reclaimed.push(id);if(DIV_BRANCHES[id].some(([v])=>value.branches?.[id]===v))d.branches[id]=value.branches[id];}
 d.notice=typeof value.notice==='string'?value.notice.slice(0,400):'';
 if(value.resonanceV3!==undefined){
  const v=value.resonanceV3;
  if(!v||typeof v!=='object'||Array.isArray(v)||!v.levels||typeof v.levels!=='object'||Array.isArray(v.levels)||!Array.isArray(v.cleared)||!Number.isInteger(v.floor)||v.floor<1||v.floor>20)throw Error('新共鳴の保存形式が不正です');
  const levels={};
  for(const [id,level] of Object.entries(v.levels)){
   if(!RESONANCE_BY_ID[id]||!Number.isInteger(level)||level<1||level>5)throw Error('新共鳴のレベルが不正です');
   levels[id]=level;
  }
  if(v.cleared.some(n=>!Number.isInteger(n)||n<1||n>20))throw Error('新試練の進行が不正です');
  d.resonanceV3={levels,cleared:[...new Set(v.cleared)].sort((a,b)=>a-b),floor:v.floor};
 }

 if(value.cooperation!==undefined){
  if(!value.cooperation||typeof value.cooperation!=='object'||Array.isArray(value.cooperation)||!value.cooperationTrials||typeof value.cooperationTrials!=='object'||Array.isArray(value.cooperationTrials))throw Error('協力率データの保存形式が不正です');
  d.cooperation={...value.cooperation};d.cooperationTrials={...value.cooperationTrials};normalizeCooperation({...s,divinity:d});
 }
 return d;
}
export function migrateDivinity(s){
 if(hasDivinity(s))return s;
 const d=divinityState();d.migrated=true;d.reclaimed=DIV_IDS.filter(id=>s.powers[id]||s.powerHistory.includes(id));
 for(const r of RECIPES)if(s.resonance[r.id])for(const id of r.parts){if(!d.reclaimed.includes(id))d.reclaimed.push(id);s.powers[id]=Math.max(5,s.powers[id]||0);}
 for(const id of d.reclaimed){if(!s.powers[id])s.powers[id]=s.maxHistory.includes(id)?5:1;}
 d.order=[...d.reclaimed];d.truth=s.awakening===5;
 d.notice='旧セーブの育成・権能・共鳴・素材を引き継ぎました。進行中の旧戦闘は出発前の状態に戻ります。神格画面から新しい試練へ挑めます。';
 delete s.markBattle;s.divinity=d;return s;
}
export function divinityTrialReason(s,id){
 if(!hasDivinity(s))return '神格の記録が必要です';
 if(cooperationEnabled(s)&&DIV_IDS.includes(id))return cooperationTrialReason(s,id);
 if(id==='wing')return s.cleared.includes(1)?null:'本編第1階「境界の入口」を突破';
 if(DIV_IDS.includes(id))return s.divinity.reclaimed.includes('wing')?null:'最初に黒翼を奪還';
 if(id==='truth')return s.cleared.includes(20)&&s.awakening>=4&&DIV_IDS.every(x=>s.powers[x]===5)?null:'本編20階・神格4・全5権能Lv.5';
 if(id==='infinite')return s.awakening===5?null:'真・神格解放に到達';
 return '存在しない試練です';
}
export function divinityAwakenReason(s){
 if(!hasDivinity(s))return '神格の記録が必要です';const stage=s.awakening+1,n=s.divinity.reclaimed.length;
 if(stage>5)return '神格は完全に解放されています';
 if(stage===1)return s.divinity.reclaimed.includes('wing')?null:'黒翼を奪還';
 if(stage===5)return s.divinity.truth?null:'封印の真相を突破';
 const floor=(stage-1)*5,required=stage===4?5:stage;
 return s.cleared.includes(floor)&&n>=required?null:`本編第${floor}階突破・権能${required}種を奪還（現在${n}種）`;
}
export function awakenDivinity(s){const reason=divinityAwakenReason(s);if(reason)throw Error(reason);s.awakening++;return s.awakening;}
export function chooseDivinityBranch(s,id,branch){if(!hasDivinity(s)||!(s.powers[id]>=3)||!DIV_BRANCHES[id]?.some(([k])=>k===branch))throw Error('権能Lv.3で成長方向を選べます');s.divinity.branches[id]=branch;}
export function divinityMilestones(s){return [[1,'黒翼の手がかり'],[5,'神格第2段階'],[10,'神格第3段階・共鳴'],[15,'神格第4段階'],[20,'封印の真相へ']];}
export function divinityNext(s){if(cooperationEnabled(s))return '五権能と協力し、戦闘と専用試練で力を引き出そう';if(!s.cleared.includes(1))return '第1階を突破し、黒翼の手がかりを探す';if(!s.divinity.reclaimed.includes('wing'))return '黒翼の試練で最初の力を取り戻す';if(!divinityAwakenReason(s))return `${DIV_STAGES[s.awakening+1].name}へ覚醒できる`;if(s.divinity.reclaimed.length<5)return '残る4つの試練から、取り戻す権能を選ぶ';return divinityAwakenReason(s)||'神格を覚醒する';}
