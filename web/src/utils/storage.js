import {validateDivinityField} from './divinityProgress.js';
import {markBattleCheckpoint,restoreMarkBattle} from './battleCheckpoint.js';
import {fresh,clamp,achievements} from './progression.js';
import {POWERS,RECIPES,MARKS,ACHIEVEMENTS} from '../data/config.js';
export const SAVE_KEY='irena-reborn-v3';
export function validateSave(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('セーブデータ形式が不正です');
 const a=Object.hasOwn(input,'state')?input.state:input;
 if(!a||typeof a!=='object'||Array.isArray(a))throw Error('セーブデータ形式が不正です');
 if(input.version>5)throw Error('新しいバージョンのセーブです。対応版を使用してください');
 if(!('level'in a)&&!('floor'in a))throw Error('いれーなのセーブデータではありません');if(a.version>5)throw Error('新しいバージョンのセーブです。対応版を使用してください');
 const s=fresh(),num=(v,d,max=1e9)=>typeof v==='number'&&Number.isFinite(v)?Math.floor(clamp(v,0,max)):d;
 for(const k of ['level','floor','p','summonPoints','sp','resShards','talent','awakening','godMaterials','medals'])s[k]=num(a[k],s[k]);s.level=clamp(s.level,1,150);s.floor=clamp(s.floor,1,100);s.talent=clamp(s.talent,1,20);s.awakening=clamp(s.awakening,0,5);s.started=!!a.started;if(a.route20!=null){if(a.route20!==1)throw Error('未対応の攻略ルートです');s.route20=1;s.version=5;s.floor=clamp(s.floor,1,20);s.legacyCleared=Array.isArray(a.legacyCleared)?[...new Set(a.legacyCleared.filter(x=>Number.isInteger(x)&&x>=1&&x<=100))]:[];}
 const list=(v,allowed)=>Array.isArray(v)?[...new Set(v.filter(x=>allowed.includes(x)))]:[];
 s.cleared=list(a.cleared,Array.from({length:s.route20===1?20:100},(_,i)=>i+1));
 for(const [key,allowed] of [['equipped',[...POWERS.map(x=>x.id),...RECIPES.map(x=>x.id)]],['powerHistory',POWERS.map(x=>x.id)],['maxHistory',POWERS.slice(0,5).map(x=>x.id)],['recipes',RECIPES.map(x=>x.id)],['marks',MARKS.map(x=>x.id)],['markEquip',MARKS.map(x=>x.id)],['markUsed',MARKS.map(x=>x.id)],['achieved',ACHIEVEMENTS.map(x=>x.id)],['claimed',ACHIEVEMENTS.map(x=>x.id)]])s[key]=list(a[key],allowed);
 for(const k of ['powers','resonance']){s[k]={};for(const id of (k==='powers'?POWERS:RECIPES).map(x=>x.id))if(a[k]?.[id])s[k][id]=clamp(num(a[k][id],1),1,5);}
 for(const id of POWERS.slice(0,5).map(x=>x.id)){s.fragments[id]=num(a.fragments?.[id],0);if(s.powers[id]&&!s.powerHistory.includes(id))s.powerHistory.push(id);if(s.powers[id]===5&&!s.maxHistory.includes(id))s.maxHistory.push(id);}
 for(const k of Object.keys(s.skills))s.skills[k]=clamp(num(a.skills?.[k],1),1,10);
 s.combatRebuildRefunded=a.combatRebuildRefunded===true;s.legacyCombatTrainingMaxed=a.legacyCombatTrainingMaxed===true;
 for(const k of Object.keys(s.stats))s.stats[k]=num(a.stats?.[k],0,100000);
 for(const k of Object.keys(s.counts))s.counts[k]=num(a.counts?.[k],0);
 for(const k of Object.keys(s.records))s.records[k]=a.records?.[k]===true;
 for(const k of Object.keys(s.flags))s.flags[k]=a.flags?.[k]===true;
 // Recover only unambiguous old fields. Unknown restoration schemas cannot be guessed.
 if(a.kaiserDefeated===100&&!s.cleared.includes(100))s.cleared.push(100);
 if(s.cleared.includes(s.route20===1?20:100))s.flags.lv100=true;
 if(s.flags.lv100&&!s.flags.reward100){s.sp+=50;s.flags.reward100=true;}
 if(s.flags.stella)s.flags.warp=true;
 if(s.flags.stellaClear)s.flags.final=true;
 if(!s.flags.lv100){s.flags.stella=false;s.flags.warp=false;s.flags.ex=false;s.flags.stellaClear=false;s.flags.final=false;s.flags.finalClear=false;}
 s.equipped=s.equipped.filter(x=>s.powers[x]||s.resonance[x]).slice(0,2);s.markEquip=s.markEquip.filter(x=>s.marks.includes(x)).slice(0,3);s.claimed=s.claimed.filter(x=>s.achieved.includes(x));
 s.badge=['A','B','C'].includes(a.badge)?a.badge:null;
 s.finalBuild.points=num(a.finalBuild?.points,150,150);for(const k of ['hp','atk','def','spd'])s.finalBuild[k]=num(a.finalBuild?.[k],0,150);if(Object.values(s.finalBuild).reduce((x,y)=>x+y,0)>150)s.finalBuild={points:150,hp:0,atk:0,def:0,spd:0};
 s.godUnique=Array.from({length:5},(_,i)=>num(a.godUnique?.[i],0));
 if(a.gauntlet&&typeof a.gauntlet==='object')s.gauntlet={index:clamp(num(a.gauntlet.index,0),0,4),materials:num(a.gauntlet.materials,0),unique:Array.from({length:5},(_,i)=>num(a.gauntlet.unique?.[i],0))};
 s.savedAt=typeof a.savedAt==='string'?a.savedAt:null;
 if(Object.hasOwn(a,'divinity'))s.divinity=validateDivinityField(a.divinity,s);
 achievements(s);if(a.markBattle!=null)s.markBattle=markBattleCheckpoint(restoreMarkBattle(a.markBattle,validateSave));return s;
}
export function save(s,storage=globalThis.localStorage){const output={...s,dev:null,savedAt:new Date().toISOString()};const json=JSON.stringify(output);storage.setItem(SAVE_KEY,json);s.savedAt=output.savedAt;return json;}
export function load(storage=globalThis.localStorage){for(const key of [SAVE_KEY,'irena-reborn-v2','irena-reborn-v1']){const raw=storage.getItem(key);if(raw){try{return {state:validateSave(JSON.parse(raw)),key,error:null};}catch(e){return {state:null,key,error:e.message};}}}return {state:fresh(),key:null,error:null};}
export function exportSave(s){return JSON.stringify({game:'irena-reborn',version:s.route20===1?5:4,state:{...s,dev:null}},null,2);}
