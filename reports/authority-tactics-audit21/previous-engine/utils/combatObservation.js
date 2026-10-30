import {playerStats,enemyStats} from './gameCore.js';
// Presentation-only synchronous observer. Nothing is stored on a battle/save or RNG.
const combatObservers=new WeakMap();
export function combatFrame(b){const p=playerStats(b),e=enemyStats(b);return {player:{hp:p.current,max:p.hp},enemy:{hp:b.enemy.hp,max:e.hp},tactical:!!(b.tacticalB||b.lab20?.variant==='B'),armor:!!b.enemy.statuses.campaignArmor,exposed:b.enemy.statuses.researchExposed||0,phase:b.enemy.phase,gauge:b.gauge};}
export function combatNotice(b,kind,detail={}){const observer=combatObservers.get(b);if(!observer)return;try{observer({kind,...detail,frame:combatFrame(b)});}catch{/* A renderer cannot change combat resolution. */}}
export function observeCombat(b,observer,resolve){const previous=combatObservers.get(b);combatObservers.set(b,observer);try{return resolve();}finally{if(previous)combatObservers.set(b,previous);else combatObservers.delete(b);}}
