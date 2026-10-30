import {startBattle,act} from './gameCore.js';
import {startMainBattle,actMainBattle} from './main20.js';
import {clone} from './progression.js';
// Optional v4 extension. Replay only legal main-game actions, never trust imported HP/charges.
// Old saves without this field continue to load unchanged. Lab saves remain isolated.
export function markBattleCheckpoint(b){
 if(!b||b.test||b.result||b.character!=='irena'||!b.marks.some(id=>['abyssmark','wind','iron','fire','moon','crown','life'].includes(id)))return null;
 const build={...b.build};delete build.markBattle;
 return {schema:1,mode:b.mode,floor:b.floor,difficulty:b.difficulty,build:clone(build),turns:clone(b.replay||[])};
}
export function restoreMarkBattle(record,validateBuild){
 if(record==null)return null;
 const fail=()=>{throw Error('刻印戦闘の保存データが不正です。元のJSONを保持してください');};
 if(record.schema!==1||!['normal','ex','raid','god'].includes(record.mode)||!Array.isArray(record.turns)||!record.build||typeof record.build!=='object'||Object.hasOwn(record.build,'state'))return fail();
 const build={...record.build};delete build.markBattle;const s=validateBuild(build);
 const b=startMainBattle(s,{mode:record.mode,floor:record.floor,difficulty:record.difficulty});
 if(!markBattleCheckpoint(b))return fail();
 for(const row of record.turns){
  if(!row||!['slash','feather','pierce','volley','power','ultimate','guard','wait'].includes(row.action)||!Array.isArray(row.rolls)||row.rolls.length>4||row.rolls.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>=1))return fail();
  let i=0;actMainBattle(b,row.action,{rng:()=>{if(i>=row.rolls.length)return fail();return row.rolls[i++];}});
  if(i!==row.rolls.length||b.result)return fail();
 }
 return b;
}
