import test from 'node:test';import assert from 'node:assert/strict';
import {performResonanceAction,resonanceReason,afterResonanceTurn,adjustResonanceIncoming} from '../web/src/utils/resonanceCombat.js';
import {RESONANCES} from '../web/src/data/resonanceV3.js';
const make=(id='wingjudge',lvl=5)=>({character:'irena',powers:['wing','judge'],build:{divinity:{cooperation:{wing:100,judge:100,fallen:100,abyss:100,king:100},resonanceV3:{levels:{[id]:lvl},cleared:[],floor:1}}},base:{hp:1000,atk:100,def:10,spd:50},hp:1000,enemy:{base:{hp:100000,atk:100,def:200,spd:30},hp:100000,buffs:[],statuses:{}},gauge:100,cd:{},divine:{feathers:0,proof:0,shield:0},events:[],used:{special:0},log:[],lastDamage:0,turn:1});
const env={playerStats:b=>({hp:b.base.hp,current:b.hp,atk:b.base.atk}),enemyStats:b=>({def:b.enemy.base.def}),damage:(a,d,{mult,ignore=0})=>Math.max(1,Math.floor(a*mult-d*(1-ignore))),heal:(b,f)=>b.hp=Math.min(b.base.hp,b.hp+b.base.hp*f),log:(b,s)=>b.log.push(s)};
for(const row of RESONANCES)for(let level=1;level<=5;level++)test(`${row.name} Lv.${level} resolves with one shared special and valid state`,()=>{
 const b=make(row.id,level);b.powers=[...row.parts];
 if(['fallenjudge','kingfallen'].includes(row.id))b.hp=500;
 performResonanceAction(b,'res_'+row.id,env);
 assert.equal(b.gauge,0);assert.equal(b.cd.resonanceShared,3);assert.equal(b.used.special,1);
 assert.equal(b.events.filter(e=>e.type==='resonance').length,1);
 assert.ok(Number.isFinite(b.hp)&&b.hp>=1);assert.ok(Number.isFinite(b.enemy.hp)&&b.enemy.hp>=0);
});
test('wing/judge twelve strikes, 70% penetration, one final HP bonus',()=>{
 const b=make();performResonanceAction(b,'res_wingjudge',env);
 assert.equal(b.events.filter(x=>x.type==='hit').length,13);
 assert.equal(b.gauge,0);assert.equal(b.cd.resonanceShared,3);assert.equal(b.used.special,1);
 assert.equal(resonanceReason(b,'res_wingjudge'),'共通CT 3');
});
test('fallen/wing level5 low-health action performs forty-five individually indexed hits',()=>{
 const b=make('wingfallen');b.powers=['wing','fallen'];b.hp=100;b.enemy.base.def=0;const visible=[];
 const observed={...env,combatNotice:(_b,kind,event)=>{if(kind==='hit')visible.push(event);}};
 const started=performance.now();performResonanceAction(b,'res_wingfallen',observed);const elapsed=performance.now()-started;
 assert.equal(visible.length,45);assert.deepEqual(visible.map(x=>x.hitIndex),Array.from({length:45},(_,i)=>i));
 assert.equal(b.hp,90);assert.equal(b.lastDamage,18000);assert.ok(elapsed<100,'45-hit engine resolution exceeded 100ms: '+elapsed.toFixed(2)+'ms');
});
test('abyss joy spends current HP before threshold and never pierces',()=>{
 const b=make('fallenabyss');b.powers=['fallen','abyss'];b.hp=500;
 performResonanceAction(b,'res_fallenabyss',env);
 assert.ok(b.hp>=250);assert.ok(b.enemy.resonanceCorrosion>.19);
});
test('survival absorbs one lethal attack ahead of king lives',()=>{
 const b=make('kingfallen');b.powers=['king','fallen'];b.hp=450;
 performResonanceAction(b,'res_kingfallen',env);b.hp=100;b.turn=2;
 const incoming=adjustResonanceIncoming(b,300,env);assert.equal(incoming,99);
 b.divine.resonance.lastIncoming=300; // the outer defense pipeline records the enemy hit before shields
 afterResonanceTurn(b,'guard',env);assert.equal(b.divine.resonance.survival,null);
 assert.ok(b.lastDamage>0);
});
test('barrier reduction stores mitigated damage with cap',()=>{
 const b=make('kingabyss');b.powers=['king','abyss'];
 performResonanceAction(b,'res_kingabyss',env);
 const v=adjustResonanceIncoming(b,1000,env);
 assert.ok(Math.abs(v-50)<.01);
 assert.equal(b.divine.resonance.abyssBarrier.prevented,950);
});

test('wing barrier lasts for actual incoming hits, counters even with shield absorbing HP damage',()=>{
 const b=make('wingking');b.powers=['wing','king'];
 performResonanceAction(b,'res_wingking',env);
 assert.equal(b.divine.resonance.wingGuard.left,3);
 afterResonanceTurn(b,'slash',env); // enemy did not attack
 assert.equal(b.divine.resonance.wingGuard.left,3);
 b.divine.resonance.lastIncoming=100; // intercepted by a barrier, 0 HP damage
 b.enemyDamage=0;
 afterResonanceTurn(b,'guard',env);
 assert.equal(b.divine.resonance.wingGuard.left,2);
 assert.equal(b.divine.resonance.wingGuard.counters,2);
 assert.ok(b.lastDamage>0);
});
