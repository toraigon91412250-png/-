import {authorityStrikeCommand} from '../web/src/components/authorityStrikeVisuals.js';
import {guardFocusCommand} from '../web/src/components/combatReadability.js';
import {featherAuthorityNote} from '../web/src/components/sanctuaryPolish.js';
import {auditRead} from './audit-baseline.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fresh,developerState} from '../web/src/utils/progression.js';
import {startBattle,act,available} from '../web/src/utils/gameCore.js';
const app=fs.readFileSync('web/src/components/App.js','utf8');
const context=vm.createContext({featherAuthorityNote,guardFocusCommand,authorityStrikeCommand});vm.runInContext(app.slice(app.indexOf('function irenaCommands('),app.indexOf('function battleView(')),context);
const commands=b=>JSON.parse(JSON.stringify(context.irenaCommands(b)));
test('normal commands switch exclusively on equipped split mark without mutating battle',()=>{
 const b=startBattle(fresh()),before=JSON.stringify(b);assert.deepEqual(commands(b).map(x=>x[0]),['slash','feather','power','ultimate','guard']);assert.equal(JSON.stringify(b),before);
 b.marks.push('split');const marked=JSON.stringify(b);assert.deepEqual(commands(b).map(x=>x[0]),['slash','pierce','volley','power','ultimate','guard']);assert.equal(JSON.stringify(b),marked);
 b.marks=[];assert.ok(commands(b).some(x=>x[0]==='feather'));
});
test('shown feather variants keep the original 39 gauge and independent cooldowns',()=>{
 for(const id of ['feather','pierce','volley']){const a=developerState(fresh());a.markEquip=['split'];a.equipped=['king'];const b=startBattle(a,{mode:'ex',test:true});
  assert.equal(available(b,id),null);act(b,id,{rng:()=>.99});assert.equal(b.gauge,39);assert.equal(b.cd[id],id==='pierce'?2:1);for(const other of ['feather','pierce','volley'].filter(x=>x!==id))assert.equal(b.cd[other]||0,0);assert.equal(b.used.special,1);
 }
});
test('guard description explicitly states incoming damage reduction and gauge gain',()=>{
 const b=startBattle(fresh());assert.match(commands(b).find(x=>x[0]==='guard')[2],/被ダメージ70%軽減.*ゲージ＋18/);act(b,'guard',{rng:()=>.99});assert.equal(b.gauge,18);
});
test('every battle, progression, save, config and asset file stays byte-identical to latest input',()=>{
 const files=JSON.parse(fs.readFileSync('reports/battle-ui/protected-baseline.json'));
 for(const [file,hash]of Object.entries(files))assert.equal(createHash('sha256').update(auditRead(file)).digest('hex'),hash,file);
});
