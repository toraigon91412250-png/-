import {freshMain20,loadMain20,validateMain20} from './main20.js';
import {divinityState,hasDivinity,migrateDivinity} from './divinityProgress.js';
import {SAVE_KEY} from './storage.js';
export function freshDivinity(){const s=freshMain20();s.powers={};s.equipped=[];s.powerHistory=[];s.divinity=divinityState();return s;}
export function validateDivinitySave(input){return migrateDivinity(validateMain20(input));}
export function loadDivinity(storage=globalThis.localStorage){
 try{
 const result=loadMain20(storage);if(result.error)return result;if(!result.key)return {...result,state:freshDivinity()};
 if(!hasDivinity(result.state)){const raw=storage.getItem(result.key);const key='irena-before-divinity-v1';if(!storage.getItem(key))storage.setItem(key,raw);migrateDivinity(result.state);}
 return result;
 }catch(error){return {state:null,key:SAVE_KEY,error:'移行前バックアップを保存できません。元のセーブは変更していません。'+error.message};}
}
export function divinityDeveloper(s,stage=0){
 if(!Number.isInteger(stage)||stage<0||stage>5)throw Error('神格段階は0〜5です');
 const d=freshDivinity();d.started=true;d.awakening=stage;d.p=99999;d.sp=999;d.resShards=9999;
 d.floor=stage?Math.min(20,stage*5):2;d.cleared=Array.from({length:d.floor===20?20:d.floor-1},(_,i)=>i+1);d.level=stage?1+d.floor*3:4;
 d.divinity.reclaimed=stage?['wing','abyss','fallen','judge','king']:[];d.divinity.order=[...d.divinity.reclaimed];d.divinity.truth=stage===5;
 for(const id of Object.keys(d.fragments)){d.fragments[id]=999; if(stage)d.powers[id]=5;}
 d.powerHistory=[...d.divinity.reclaimed];d.maxHistory=[...d.divinity.reclaimed];d.equipped=stage?['wing','judge']:[];
 if(d.cleared.includes(20))d.flags={...d.flags,lv100:true,reward100:true,warp:true,stella:true,ex:true,final:true};
 return d;
}
