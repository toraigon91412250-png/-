import {DIV_SKILLS} from '../data/divinity.js';
import {specialBattleActions} from './battleHistory.js';
import {authorityStrikeCurrent,legacyAuthorityStrike} from './authorityStrike.js';
import {startBattle,act} from './gameCore.js';
import {startMainBattle,actMainBattle} from './main20.js';
import {clone} from './progression.js';
// Optional v4 extension. Replay only legal main-game actions, never trust imported HP/charges.
// Old saves without this field continue to load unchanged. Lab saves remain isolated.
export function markBattleCheckpoint(b){
 if(!b||b.test||b.result||b.lab20||b.trial||b.experiment||b.campaign&&!b.main20)return null;
 const legacyEligible=b.build.divinity?.schema!==1&&b.character==='irena'&&b.marks.some(id=>['abyssmark','wind','iron','fire','moon','crown','life'].includes(id));
 const build={...b.build};delete build.markBattle;
 return {schema:legacyEligible?(b.main20Rules==='B1'?2:1):3,...(b.main20Rules==='B1'?{rules:'B1'}:{}),...(authorityStrikeCurrent(b)?{authorityStrike:'A1'}:{}),mode:b.mode,floor:b.floor,difficulty:b.difficulty,build:clone(build),turns:clone(b.character==='irena'?(b.replay||[]):specialBattleActions(b))};
}
export function restoreMarkBattle(record,validateBuild){
 if(record==null)return null;
 const fail=()=>{throw Error('刻印戦闘の保存データが不正です。元のJSONを保持してください');};
 if(![1,2,3].includes(record.schema)||!(record.schema===3?['normal','ex','god','stella','final']:['normal','ex','god']).includes(record.mode)||!Array.isArray(record.turns)||!record.build||typeof record.build!=='object'||Object.hasOwn(record.build,'state'))return fail();
 if(record.authorityStrike!==undefined&&record.authorityStrike!=='A1')return fail();
 const build={...record.build};delete build.markBattle;const s=validateBuild(build);
 if((record.schema===2||record.rules==='B1')&&(record.rules!=='B1'||s.route20!==1||record.mode!=='normal'))return fail();
 const b=startMainBattle(s,{mode:record.mode,floor:record.floor,difficulty:record.difficulty,rules:record.schema===2||record.rules==='B1'?'B1':'classic'});
 if(record.authorityStrike!=='A1')legacyAuthorityStrike(b);
 if(!markBattleCheckpoint(b))return fail();
 for(const row of record.turns){
  if(!row||!(record.schema===3?[...Object.keys(DIV_SKILLS),'slash','feather','pierce','volley','power','ultimate','guard','wait','divine','fallen','immortal','rebirth','meteor','godspeed','omnipotent','dominion','annihilate','transcend','grasp','erosion','release','sovereignty','genesis','ending']:['slash','feather','pierce','volley','power','ultimate','guard','wait']).includes(row.action)||row.route!==undefined&&!['A','B','C'].includes(row.route)||!Array.isArray(row.rolls)||row.rolls.length>4||row.rolls.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>=1))return fail();
  let i=0;actMainBattle(b,row.action,{route:row.route||'A',rng:()=>{if(i>=row.rolls.length)return fail();return row.rolls[i++];}});
  if(i!==row.rolls.length||b.result)return fail();
 }
 return b;
}
