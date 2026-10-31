import {tacticalBaselineRead,finaleBaselineRead} from './audit-baseline.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createHash} from 'node:crypto';
import {fresh,powerGrowth,powerUpgradeInfo} from '../web/src/utils/progression.js';import {POWERS,ACHIEVEMENTS} from '../web/src/data/config.js';
const sha=x=>createHash('sha256').update(x).digest('hex');const app=fs.readFileSync('web/src/components/App.js','utf8');
const art=vm.runInNewContext('('+app.match(/const UPGRADE_ART=(.*?);/)[1]+')');const images=JSON.parse(fs.readFileSync('reports/authority-art-audit2/images.json'));
const edits=JSON.parse(fs.readFileSync('reports/authority-art-audit2/presentation-changes.json'));
test('all five supplied images map to the exact intended ID and retain original PNG bytes',()=>{
 const intended={fallen:'堕天',king:'堕天王',judge:'断罪',abyss:'深淵',wing:'黒翼'};
 for(const [id,name]of Object.entries(intended)){const row=images.find(x=>x.id===id);assert.equal(row.name,name);assert.equal(row.original,'../assets-to-integrate/authority-unlock/'+name+'.png');assert.equal(art[id],row.runtime);const bytes=fs.readFileSync(art[id]);assert.deepEqual(bytes,fs.readFileSync(row.original));assert.equal(sha(bytes),row.sha256);assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),1672);assert.equal(bytes.readUInt32BE(20),941);}
});
test('image-only App changes and CSS are exactly limited to the five artwork substitutions and contain display',()=>{
 let expected=edits['web/src/components/App.js'].before;
 for(const id of ['fallen','king','judge','abyss','wing'])expected=expected.replace(`${id}:'assets/upgrade-ui/${id}-power.webp'`,`${id}:'assets/upgrade-ui/authority-unlock/${id}.png'`);
 expected=expected.replace('<img src="${UPGRADE_ART[p.id]}" alt=""><div><strong>${p.name}', '<img ${p.id!==\'star\'?`data-authority-art="${p.id}"`: \'\'} src="${UPGRADE_ART[p.id]}" alt=""><div><strong>${p.name}');
 expected=expected.replace('<img class="upgrade-power-art" src="${UPGRADE_ART[p.id]}"','<img class="upgrade-power-art" ${p.id!==\'star\'?`data-authority-art="${p.id}"`: \'\'} src="${UPGRADE_ART[p.id]}"');
 assert.equal(tacticalBaselineRead('web/src/components/App.js','utf8'),expected);
 const css=finaleBaselineRead('web/src/components/game.css','utf8'),before=edits['web/src/components/game.css'].before;assert.ok(css.startsWith(before));assert.equal(css.slice(before.length),'\n/* audit2: Preserve the full supplied landscape artwork inside existing icon frames. */\n.upgrade-power-card .upgrade-power-art[data-authority-art],\n.power-detail-heading img[data-authority-art]{object-fit:contain;object-position:center}\n');
});
test('all authority states render the same supplied artwork in list and detail without state mutation',()=>{
 const functions=app.slice(app.indexOf('function powerStatus('),app.indexOf('function marksView('));
 const api=vm.runInNewContext(functions+';({powersView,powerDetails})',{powerUpgradeInfo,powerGrowth,POWERS,ACHIEVEMENTS,UPGRADE_ART:art,esc:String,n:String,uiIcon:()=>'',button:(text,action,id)=>`<button data-action="${action}" data-id="${id}">${text}</button>`,powerSort:'default'});
 for(const row of images)for(const state of ['unowned','equipped','ready','max']){const a=fresh();delete a.powers[row.id];a.equipped=[];if(state!=='unowned'){a.powers[row.id]=state==='max'?5:1;a.fragments[row.id]=100;if(state==='equipped')a.equipped=[row.id];}const before=JSON.stringify(a);for(const html of [api.powersView(a),api.powerDetails(a,POWERS.find(p=>p.id===row.id))]){assert.ok(html.includes(`data-authority-art="${row.id}"`));assert.ok(html.includes(`src="${row.runtime}"`));}assert.equal(JSON.stringify(a),before);}
});
test('star artwork and every non-presentation baseline source and asset remain exact',()=>{
 assert.equal(art.star,'assets/upgrade-ui/star-power.webp');const map=JSON.parse(fs.readFileSync('reports/authority-art-audit2/baseline-files.json'));
 for(const [file,hash]of Object.entries(map)){if(['web/src/components/App.js','web/src/components/game.css','tests/audit-baseline.js','tools/browser-e2e.mjs'].includes(file))continue;assert.equal(sha(tacticalBaselineRead(file)),hash,file);}
 const qa=JSON.parse(fs.readFileSync('reports/upgrade-ui/qa-patches.json'))['tools/browser-e2e.mjs'];let current=fs.readFileSync('tools/browser-e2e.mjs','utf8');assert.equal(sha(current),qa.afterSHA256,'current browser QA snapshot');for(const patch of qa.patches.slice().reverse()){assert.equal(current.split(patch.new).length-1,1,'exact browser QA change');current=current.replace(patch.new,patch.old);}assert.equal(sha(current),qa.beforeSHA256,'browser QA restores to recorded pre-update source');
});
