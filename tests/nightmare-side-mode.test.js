import test from 'node:test';
import assert from 'node:assert/strict';
import {freshMain20} from '../web/src/utils/main20.js';
import {startBattle,act,settle} from '../web/src/utils/gameCore.js';
import {startGauntlet} from '../web/src/utils/progression.js';

test('NIGHTMARE losses across the five side modes grant no progression rewards',()=>{
 for(const mode of ['ex','stella','final','raid','god']){
  const state=freshMain20();state.level=100;state.floor=20;state.cleared=Array.from({length:10},(_,i)=>i+1);
  state.flags={...state.flags,stella:true,ex:true,final:true};if(mode==='god')startGauntlet(state);
  state.p=1234;state.sp=57;state.resShards=19;state.counts.streak=4;state.counts.raid=3;
  state.fragments={...state.fragments,abyss:17,wing:23};
  const before={p:state.p,sp:state.sp,resShards:state.resShards,floor:state.floor,cleared:[...state.cleared],fragments:{...state.fragments},wins:state.counts.wins,raid:state.counts.raid,godMaterials:state.godMaterials,godUnique:[...state.godUnique],medals:state.medals};
  const battle=startBattle(state,{mode,floor:100,difficulty:'NIGHTMARE'});battle.hp=1;
  act(battle,'guard',{rng:()=>0.99});assert.equal(battle.result,'lose',`${mode} must resolve as a defeat`);
  const reward=settle(state,battle);assert.equal(reward.p,0,mode);assert.equal(reward.fragments,0,mode);assert.equal(reward.resShards,0,mode);
  assert.deepEqual({p:state.p,sp:state.sp,resShards:state.resShards,floor:state.floor,cleared:state.cleared,fragments:state.fragments,wins:state.counts.wins,raid:state.counts.raid,godMaterials:state.godMaterials,godUnique:state.godUnique,medals:state.medals},before,mode);
  assert.equal(state.counts.streak,0,mode);if(mode==='god')assert.equal(state.gauntlet,null,'a failed gauntlet run returns to the hub');
 }
});
