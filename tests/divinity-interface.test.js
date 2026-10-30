import test from 'node:test';
import assert from 'node:assert/strict';
import {divinityDeveloper} from '../web/src/utils/divinitySave.js';
import {startDivinityTrial,actDivinityTrial} from '../web/src/utils/divinityTrials.js';
import {divBattleState} from '../web/src/utils/divinityCombat.js';
import {divinityBattleView,divinityCommands,divinityPageSize,divinityStatusText} from '../web/src/components/divinityView.js';
const button=(text,action,id='',cls='',disabled=false)=>`<button data-action="${action}" data-id="${id}" class="${cls}" ${disabled?'disabled':''}>${text}</button>`;
const commands=html=>[...html.matchAll(/data-action="divCommand" data-id="([^"]+)"/g)].map(m=>m[1]);

test('both viewport page sizes expose every available command once without changing combat state',()=>{
 for(const stage of [0,1,2,3,4,5])for(const height of [568,667,700,844]){
  const save=divinityDeveloper({},stage),battle=startDivinityTrial(save,stage===5?'infinite':'wing');
  divBattleState(battle);const before=structuredClone(battle),size=divinityPageSize(height),all=divinityCommands(battle).map(c=>c[0]),found=[];
  for(let page=0;page<Math.ceil(all.length/size);page++){
   const html=divinityBattleView(save,battle,button,'',page,'',size),ids=commands(html);
   assert.ok(ids.length<=size);found.push(...ids);
  }
  assert.deepEqual(found,all);assert.deepEqual(battle,before);
 }
});

test('mid-trial awakening and true divinity commands remain reachable through pagination',()=>{
 const save=divinityDeveloper({},0),b=startDivinityTrial(save,'wing');
 actDivinityTrial(b,'guard');actDivinityTrial(b,'guard');
 for(const size of [2,4]){
  const at=divinityCommands(b).findIndex(c=>c[0]==='plume');assert.ok(at>=0);
  assert.ok(commands(divinityBattleView(save,b,button,'',Math.floor(at/size),'',size)).includes('plume'));
 }
 const end=divinityDeveloper({},5),final=startDivinityTrial(end,'infinite');
 actDivinityTrial(final,'apotheosis');
 const all=divinityCommands(final).map(c=>c[0]);assert.ok(all.includes('convergence'));
 const html=Array.from({length:Math.ceil(all.length/2)},(_,i)=>divinityBattleView(end,final,button,'',i,'',2)).join('');
 assert.deepEqual(commands(html),all);assert.match(html,/神格解放 · 残り/);
});

test('stun and out-of-range pages keep the recovery command accessible',()=>{
 const s=divinityDeveloper({},5),b=startDivinityTrial(s,'infinite');b.statuses.stun=1;
 for(const page of [-20,99])assert.deepEqual(commands(divinityBattleView(s,b,button,'',page)),['wait']);
});

test('state labels distinguish friendly and enemy effects and retain all duration details',()=>{
 assert.equal(divinityStatusText({}),'異常なし');
 assert.equal(divinityStatusText({pressure:3,seal:2,invulnerable:100}),'重圧 3T・封印 2T・無敵 継続');
 const s=divinityDeveloper({},3),b=startDivinityTrial(s,'wing');b.statuses={pressure:3,seal:2};b.enemy.statuses={divinityWeaken:2};
 const html=divinityBattleView(s,b,button,'');assert.match(html,/自分の状態：重圧 3T・封印 2T/);assert.match(html,/敵の状態：侵食弱体 2T/);
 assert.match(html,/aria-label="自分HP"/);assert.match(html,/aria-label="敵HP"/);
});

test('battle labels and mirror hints remain escaped in the presentation',()=>{
 const s=divinityDeveloper({},3),b=startDivinityTrial(s,'wing');b.enemy.name='<img src=x onerror=alert(1)>';
 const html=divinityBattleView(s,b,button,'',0,'<script>bad</script>');
 assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('<script>bad'));
 assert.match(html,/&lt;script&gt;bad/);assert.match(html,/&lt;img src=x/);
});
