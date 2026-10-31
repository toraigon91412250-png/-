import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fresh,developerState} from '../web/src/utils/progression.js';
import {startBattle} from '../web/src/utils/gameCore.js';
import {startThreePhase} from '../web/src/utils/threePhase.js';
import {startMirrorTrial} from '../web/src/utils/mirrorTrial.js';
import {startMainBattle,freshMain20} from '../web/src/utils/main20.js';

const app=fs.readFileSync(new URL('../web/src/components/App.js',import.meta.url),'utf8');
const labSource=app.slice(app.indexOf('function lab(a){'),app.indexOf('function dev(a){'));

test('laboratory renders exactly the two retained dropdown modes and the mirror trial',()=>{
 const lab=vm.runInNewContext(labSource+'\nlab',{mirrorGate:()=>'<div data-mirror="enabled"></div>',sandbox:null,mirrorMemory:{},button:()=>'<button></button>',heading:()=>'<header></header>'});
 const html=lab({level:20});
 assert.match(html,/data-mirror="enabled"/);
 const select=html.match(/<select id="labmode">([\s\S]*?)<\/select>/);
 assert.ok(select);
 const modes=[...select[1].matchAll(/<option value="([^"]+)">/g)].map(x=>x[1]);
 assert.deepEqual(modes,['normal','three-phase']);
 assert.doesNotMatch(html,/<option value="ex">|<option value="stella">|lab20Open|campaignOpen/);
});

test('retired standalone modes and all old 20-floor action routes are rejected',()=>{
 assert.match(app,/if\(!\['normal','three-phase'\]\.includes\(mode\)\)throw Error\('この実験モードは廃止されました'\)/);
 const block=app.slice(app.indexOf('async function handle(action,id)'),app.indexOf('async function handle(action,id)')+400);
 const pattern=block.match(/if\((\/\^\(\?:lab20.*?\)\$\/)\.test\(action\)\)throw Error/);
 assert.ok(pattern,'all retired prototype actions must be blocked before branching');
 const re=vm.runInNewContext(pattern[1]);
 for(const name of ['lab20Open','lab20Fight','lab20Lobby','lab20Edit','lab20AskReset','lab20Reset','campaignOpen','campaignLobby','campaignFight','campaignTrain','campaignPower','campaignUpgrade','campaignMark','campaignBuyMark','campaignAskReset','campaignReset'])assert.equal(re.test(name),true,name);
 for(const name of ['labstart','mirrorStart','fight','divCommand','campaignMain20','lab'])assert.equal(re.test(name),false,name);
 assert.match(app,/if\(page==='lab20'\|\|page==='campaign'\)page='lab'/);
});

test('three retained laboratory variants still initialize without affecting source state',()=>{
 const source=developerState(fresh()),before=JSON.stringify(source);
 const normal=startBattle(source,{mode:'normal',floor:20,test:true});
 const three=startThreePhase(source);
 const mirror=startMirrorTrial(source);
 assert.equal(normal.mode,'normal');
 assert.equal(three.trial.kind,'three-phase');
 assert.equal(mirror.trial.kind,'mirror');
 assert.ok([normal,three,mirror].every(b=>b.test));
 assert.equal(JSON.stringify(source),before);
});

test('main twentieth-floor battle and EX, Stella, final modes remain intact',()=>{
 const source=developerState(freshMain20());source.floor=20;const before=JSON.stringify(source);
 const main=startMainBattle(source,{floor:20});
 const ex=startBattle(source,{mode:'ex',floor:20,test:true});
 const stella=startBattle(source,{mode:'stella',floor:20,test:true});
 const final=startBattle(source,{mode:'final',floor:20,test:true});
 assert.equal(main.main20,true);
 assert.equal(ex.mode,'ex');
 assert.equal(stella.character,'stella');
 assert.equal(final.character,'final');
 assert.equal(JSON.stringify(source),before);
});

test('retired dragon trial cannot start even through a forged old lab selection',()=>{
 const start=app.indexOf("case 'labstart':{");
 const end=app.indexOf("case 'enabledev':",start);
 assert.ok(start>0&&end>start);
 const snippet=app.slice(start,end);
 const run=vm.runInNewContext(`(mode)=>{
  const $=selector=>({value:selector==='#labmode'?mode:'1'});
  let battle=null,page='lab',called='';
  const s={};const developerState=x=>x;const render=()=>{};
  const startBattle=()=>{called='normal-or-final';return {base:{atk:10,hp:10}}};
  const startThreePhase=()=>{called='three-phase';return {base:{atk:10,hp:10}}};
  switch('labstart'){${snippet}}
  return {called,page};
 }`);
 assert.throws(()=>run('guard-break'),/廃止/);
 assert.throws(()=>run('ex'),/廃止/);
 assert.throws(()=>run('stella'),/廃止/);
 assert.throws(()=>run('final'),/廃止/);
 for(const mode of ['normal','three-phase']){
  const result=run(mode);
  assert.equal(result.page,'battle',mode);
  assert.equal(result.called,mode==='three-phase'?'three-phase':'normal-or-final',mode);
 }
});
