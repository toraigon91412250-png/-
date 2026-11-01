import test from 'node:test';
import assert from 'node:assert/strict';
import {ACHIEVEMENTS,MARKS} from '../web/src/data/config.js';
import {claim,claimAll,achievements,buyMark,equip} from '../web/src/utils/progression.js';
import {freshDivinity,validateDivinitySave} from '../web/src/utils/divinitySave.js';
import {activateCooperation} from '../web/src/utils/divinityCooperation.js';
import {nextHomeGoal} from '../web/src/components/sanctuaryPolish.js';
const fresh=()=>activateCooperation(freshDivinity());

test('batch claim pays only achieved, unclaimed rewards and preserves every other field',()=>{
 const s=fresh();s.achieved=ACHIEVEMENTS.slice(0,4).map(row=>row.id);claim(s,s.achieved[1]);
 const before=structuredClone(s),expected=structuredClone(s);expected.p+=180;expected.claimed.push(...s.achieved.filter(id=>!s.claimed.includes(id)));
 assert.equal(claimAll(s),3);assert.deepEqual(s,expected);
 assert.equal(s.summonPoints,before.summonPoints);assert.equal(s.resShards,before.resShards);
 assert.equal(claimAll(s),0);assert.deepEqual(s,expected,'stale repeat cannot pay again');
});
test('empty and all-32 batch claims retain exact 60P-per-achievement and survive save validation',()=>{
 const s=fresh(),before=structuredClone(s);assert.equal(claimAll(s),0);assert.deepEqual(s,before);
 s.achieved=ACHIEVEMENTS.map(row=>row.id);const initial=s.p;
 assert.equal(claimAll(s),32);assert.equal(s.p-initial,1920);assert.equal(new Set(s.claimed).size,32);
 const loaded=validateDivinitySave(JSON.parse(JSON.stringify(s)));assert.equal(loaded.p,s.p);assert.deepEqual(loaded.claimed,s.claimed);assert.equal(claimAll(loaded),0);assert.equal(loaded.p,s.p);
});
test('batch claim never repeats duplicate IDs or pays unknown or unachieved records',()=>{
 const s=fresh();s.achieved=[ACHIEVEMENTS[0].id,ACHIEVEMENTS[0].id,'unknown'];const initial=s.p;
 assert.equal(claimAll(s),1);assert.equal(s.p,initial+60);assert.deepEqual(s.claimed,[ACHIEVEMENTS[0].id]);
});
test('home and mascot destination facts select the next floor without mutating progress',()=>{
 const s=fresh();s.floor=7;s.cleared=[1,2,3,4,5,6];const before=structuredClone(s);
 assert.deepEqual(nextHomeGoal(s),{kind:'floor',action:'fight',id:'normal',floor:7,label:'第7階層へ進む'});assert.deepEqual(s,before);
 const battle={result:null,mode:'ex'};assert.equal(nextHomeGoal(s,battle).kind,'resume');assert.equal(nextHomeGoal(s,battle).id,'battle');
 for(const result of ['win','lose'])assert.equal(nextHomeGoal(s,{result}).floor,7);
});
test('cleared final floor leads through warp, finale, awakening and archive without repeating the floor',()=>{
 const s=fresh();s.floor=20;s.cleared=Array.from({length:20},(_,i)=>i+1);s.flags.lv100=true;
 assert.equal(nextHomeGoal(s).action,'warp');s.flags.warp=true;
 for(const field of ['ex','stellaClear','finalClear']){assert.equal(nextHomeGoal(s).id,'finale');s.flags[field]=true;}
 assert.equal(nextHomeGoal(s).id,'awakening');s.awakening=5;assert.equal(nextHomeGoal(s).id,'archive');
 s.achieved=ACHIEVEMENTS.map(row=>row.id);assert.equal(nextHomeGoal(s),null);
 assert.equal(nextHomeGoal(s,{result:null}).id,'battle','unfinished battle has priority even after completion');
});
test('resting marks retain collection and three-slot record achievements needed for the final reward',()=>{
 const s=fresh();s.p=10000;
 for(const row of MARKS)buyMark(s,row.id);
 for(const row of MARKS.slice(0,3))equip(s,row.id,'mark');
 achievements(s);
 const expected=['B11','C7','C8','C9'];
 assert.ok(expected.length>=3);for(const id of expected)assert.ok(s.achieved.includes(id),id+' remains attainable');
 const loaded=validateDivinitySave(JSON.parse(JSON.stringify(s)));assert.deepEqual(loaded.marks,s.marks);assert.deepEqual(loaded.markEquip,s.markEquip);
});
