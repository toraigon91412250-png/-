import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {freshDivinity} from '../web/src/utils/divinitySave.js';
import {activateCooperation,cooperationDialogue} from '../web/src/utils/divinityCooperation.js';
import {DIV_IDS,DIV_NAMES} from '../web/src/data/divinity.js';
import {startBattle,act} from '../web/src/utils/gameCore.js';
import {divBattleState} from '../web/src/utils/divinityCombat.js';
import {divinityBattleView} from '../web/src/components/divinityView.js';

const battleCss=fs.readFileSync('web/src/components/game.css','utf8');
const cssRule=selector=>{const start=battleCss.indexOf(selector+'{');assert.notEqual(start,-1,selector);return battleCss.slice(start,battleCss.indexOf('}',start)+1);};
const make=(a='wing',b='king')=>{
 const s=activateCooperation(freshDivinity());s.equipped=[a,b];
 const battle=startBattle(s,{mode:'normal',floor:1,test:true});divBattleState(battle);
 battle.enemy.base={...battle.enemy.base,hp:1e8,atk:1,def:0,spd:1};battle.enemy.hp=1e8;
 return {s,battle};
};
const step=(b,action='guard')=>act(b,action,{rng:()=>.5,enemyAction:()=>{}});

test('all ten distinct pairs have two or more exchanges, independently of equipment order',()=>{
 for(let i=0;i<DIV_IDS.length;i++)for(let j=i+1;j<DIV_IDS.length;j++){
  for(const [first,second] of [[DIV_IDS[i],DIV_IDS[j]],[DIV_IDS[j],DIV_IDS[i]]]){
   const {battle}=make(first,second);battle.turn=3;
   const line=cooperationDialogue(battle);
   assert.ok(line,first+':'+second);
   assert.ok(line.lines.length>=2,first+':'+second);
   assert.equal(line.kind,'normal');
   for(const entry of line.lines){assert.ok(entry.text);assert.ok(Object.values(DIV_NAMES).includes(entry.speaker));}
  }
 }
});

test('banter cadence is every three actions; ordinary text does not pause or change combat',()=>{
 const {battle}=make('wing','judge');
 step(battle,'guard');assert.equal(battle.divine.line,null);
 step(battle,'guard');assert.equal(battle.divine.line,null);
 step(battle,'guard');assert.equal(battle.divine.line.kind,'normal');
 assert.ok(battle.divine.line.lines.some(x=>x.speaker==='断罪'));
 step(battle,'guard');assert.equal(battle.divine.line,null);
 assert.equal(battle.turn,5);
});

test('fallen openly courts abyss, while abyss remains oblivious',()=>{
 const {battle}=make('fallen','abyss');battle.turn=6;
 const line=cooperationDialogue(battle);
 assert.ok(line.lines.some(x=>x.speaker==='堕天'));
 assert.ok(line.lines.some(x=>x.speaker==='深淵'));
 assert.match(line.lines.map(x=>x.text).join(''),/深淵|見て|敵のHP|何だ/);
});

test('the critical-HP line appears once per battle, while X summons all five authorities',()=>{
 const {battle}=make('wing','king');battle.turn=2;
 battle.hp=battle.base.hp*.2;
 const low=cooperationDialogue(battle);
 assert.equal(low.kind,'low');assert.ok(battle.divine.banterLowSeen);
 assert.equal(cooperationDialogue(battle),null);
 battle.hp=battle.base.hp;
 battle.turn=3;battle.lastAction='apotheosis';battle.divine.unified=2;
 const release=cooperationDialogue(battle);
 assert.equal(release.kind,'release');
 assert.deepEqual(release.lines.map(x=>x.speaker),['黒翼','堕天王','堕天','深淵','断罪']);
});

test('special dialogue triggers on power exchange, judgment, low-HP strike, and boss cue',()=>{
 const {battle}=make('fallen','abyss');battle.turn=3;
 battle.lastAction='attune_king';assert.equal(cooperationDialogue(battle).kind,'swap');
 battle.lastAction='fallenEnd';assert.equal(cooperationDialogue(battle).kind,'fallen');
 battle.turn=6;battle.mode='ex';assert.equal(cooperationDialogue(battle).kind,'boss');
 const other=make('wing','judge').battle;other.turn=3;other.lastAction='judgment';
 assert.equal(cooperationDialogue(other).kind,'judge');
});

test('battle art shows through the glass header and HP panels while preserving safe areas',()=>{
 assert.match(cssRule('.div-battle-head'),/position:absolute/);
 assert.match(cssRule('.div-battle-head'),/rgba\(/);
 assert.match(cssRule('.div-arena>img'),/height:100%/);
 assert.match(cssRule('.div-hp'),/rgba\(/);
 assert.match(battleCss,/safe-area-inset-bottom/);
});

test('banter stays in the arena while the persistent enemy forecast is absent',()=>{
 const {s,battle}=make('wing','judge');battle.turn=3;
 battle.divine.line=cooperationDialogue(battle);
 const html=divinityBattleView(s,battle,()=>'',null);
 const start=html.indexOf('class="div-arena battle-stage"');
 const target=html.indexOf('class="cooperation-banter ');
 assert.ok(start>=0&&target>start);
 assert.doesNotMatch(html,/div-telegraph|敵の予告|敵の次の行動/);
 assert.match(html,/class="div-hp div-hp-player"/);
 assert.match(html,/class="div-hp div-hp-enemy"/);
 assert.match(html,/class="div-command-dock"/);
 assert.match(html,/class="div-combat-footer"/);
 assert.match(html,/animation-delay:1\.45s/);
 assert.match(html,/aria-label="黒翼：/);
 assert.equal((html.match(/class="cooperation-banter /g)||[]).length,1);
});
