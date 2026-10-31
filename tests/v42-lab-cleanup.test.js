import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fresh,developerState} from '../web/src/utils/progression.js';
import {startBattle} from '../web/src/utils/gameCore.js';
import {startThreePhase} from '../web/src/utils/threePhase.js';
import {startGuardBreakTrial} from '../web/src/utils/guardBreakTrial.js';
import {startMirrorTrial} from '../web/src/utils/mirrorTrial.js';
import {startMainBattle,freshMain20} from '../web/src/utils/main20.js';

const app=fs.readFileSync(new URL('../web/src/components/App.js',import.meta.url),'utf8');
const labSource=app.slice(app.indexOf('function lab(a){'),app.indexOf('function dev(a){'));

test('laboratory renders exactly the four retained dropdown modes and the mirror trial',()=>{
 const lab=vm.runInNewContext(labSource+'\nlab',{mirrorGate:()=>'<div data-mirror="enabled"></div>',sandbox:null,mirrorMemory:{},button:()=>'<button></button>',heading:()=>'<header></header>'});
 const html=lab({level:20});
 assert.match(html,/data-mirror="enabled"/);
 const select=html.match(/<select id="labmode">([\s\S]*?)<\/select>/);
 assert.ok(select);
 const modes=[...select[1].matchAll(/<option value="([^"]+)">/g)].map(x=>x[1]);
 assert.deepEqual(modes,['normal','three-phase','guard-break','final']);
 assert.doesNotMatch(html,/<option value="ex">|<option value="stella">|lab20Open|campaignOpen/);
});

test('retired standalone modes and all old 20-floor action routes are rejected',()=>{
 assert.match(app,/if\(!\['normal','three-phase','guard-break','final'\]\.includes\(mode\)\)throw Error\('この実験モードは廃止されました'\)/);
 const block=app.slice(app.indexOf('async function handle(action,id)'),app.indexOf('async function handle(action,id)')+400);
 const pattern=block.match(/if\((\/\^\(\?:lab20.*?\)\$\/)\.test\(action\)\)throw Error/);
 assert.ok(pattern,'all retired prototype actions must be blocked before branching');
 const re=vm.runInNewContext(pattern[1]);
 for(const name of ['lab20Open','lab20Fight','lab20Lobby','lab20Edit','lab20AskReset','lab20Reset','campaignOpen','campaignLobby','campaignFight','campaignTrain','campaignPower','campaignUpgrade','campaignMark','campaignBuyMark','campaignAskReset','campaignReset'])assert.equal(re.test(name),true,name);
 for(const name of ['labstart','mirrorStart','fight','divCommand','campaignMain20','lab'])assert.equal(re.test(name),false,name);
 assert.match(app,/if\(page==='lab20'\|\|page==='campaign'\)page='lab'/);
});

test('five retained battle variants still initialize without affecting source state',()=>{
 const source=developerState(fresh()),before=JSON.stringify(source);
 const normal=startBattle(source,{mode:'normal',floor:20,test:true});
 const three=startThreePhase(source);
 const dragon=startGuardBreakTrial(source);
 const final=startBattle(source,{mode:'final',floor:20,test:true});
 const mirror=startMirrorTrial(source);
 assert.equal(normal.mode,'normal');
 assert.equal(three.trial.kind,'three-phase');
 assert.equal(dragon.trial.kind,'guard-break');
 assert.equal(final.character,'final');
 assert.equal(mirror.trial.kind,'mirror');
 assert.ok([normal,three,dragon,final,mirror].every(b=>b.test));
 assert.equal(JSON.stringify(source),before);
});

test('main twentieth-floor battle and all existing EX and Stella modes remain intact',()=>{
 const source=developerState(freshMain20());source.floor=20;const before=JSON.stringify(source);
 const main=startMainBattle(source,{floor:20});
 const ex=startBattle(source,{mode:'ex',floor:20,test:true});
 const stella=startBattle(source,{mode:'stella',floor:20,test:true});
 assert.equal(main.main20,true);
 assert.equal(ex.mode,'ex');
 assert.equal(stella.character,'stella');
 assert.equal(JSON.stringify(source),before);
});
