import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync(new URL('../web/src/components/App.js',import.meta.url),'utf8');
const feedback=app.slice(app.indexOf('function showCombatFeedback('),app.indexOf('function beginFight('));
assert.ok(feedback.startsWith('function showCombatFeedback('),'combat feedback function exists');
function setup(){
 const timers=[],nodes=[];
 function fighter(){
  const classes=new Set();
  return {classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)},children:[],append(v){this.children.push(v);}};
 }
 const enemy=fighter(),player=fighter();
 const arena={querySelector:k=>k==='.fighter-enemy'?enemy:k==='.fighter-player'?player:null};
 const doc={createElement:()=>{const node={className:'',textContent:'',removed:false,setAttribute(k,v){this[k]=v;},remove(){this.removed=true;}};nodes.push(node);return node;}};
 const env={$:k=>k==='.battle-stage'?arena:null,document:doc,n:x=>Math.floor(x).toLocaleString('ja-JP'),setTimeout:(fn,time)=>{timers.push({fn,time});}};
 const show=vm.runInNewContext(`${feedback}; showCombatFeedback`,env);
 return {show,enemy,player,nodes,timers,finish:()=>timers.forEach(t=>t.fn())};
}
test('simultaneous dealt and received damage create separate feedback, then clean up',()=>{
 const t=setup();t.show({lastDamage:1234,enemyDamage:56,events:[{type:'hit',damage:1234}]});
 assert.equal(t.enemy.children.length,1);assert.equal(t.player.children.length,1);
 assert.equal(t.enemy.children[0].textContent,'1,234');assert.equal(t.player.children[0].textContent,'−56');
 assert.match(t.enemy.children[0].className,/damage-dealt/);assert.match(t.player.children[0].className,/damage-taken/);
 assert.equal(t.enemy.classList.contains('impact-foe'),true);assert.equal(t.player.classList.contains('impact-player'),true);
 assert.ok(t.timers.some(t=>t.time===920));t.finish();
 assert.ok(t.nodes.every(x=>x.removed));assert.equal(t.enemy.classList.contains('impact-foe'),false);assert.equal(t.player.classList.contains('impact-player'),false);
});
test('miss shows MISS but no false damage or hit recoil',()=>{
 const t=setup();t.show({lastDamage:0,enemyDamage:0,events:[{type:'hit',damage:0}]});
 assert.equal(t.enemy.children[0].textContent,'MISS');assert.equal(t.enemy.classList.contains('impact-foe'),false);
 assert.equal(t.player.children.length,0);
});
test('defense-only turn and zero damage do not manufacture offensive feedback',()=>{
 const t=setup();t.show({lastDamage:0,enemyDamage:140,events:[]});
 assert.equal(t.enemy.children.length,0);assert.equal(t.player.children[0].textContent,'−140');
 const q=setup();q.show({lastDamage:0,enemyDamage:0,events:[]});assert.equal(q.nodes.length,0);
});
test('battle feedback is presentation-only and attack prediction is absent',()=>{
 assert.match(app,/showCombatFeedback\(b\)/);
 assert.doesNotMatch(app,/重撃の予兆|battle-warning|b\.turn%4===0&&b\.mode!==/);
 assert.doesNotMatch(feedback,/\b(?:act|settle|damage|playerStats|enemyStats)\s*\(/);
});
