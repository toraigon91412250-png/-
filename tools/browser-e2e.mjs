import {combatReady,actionClick,skipOrFinishCinema,openGame,reloadGame,testedHTMLSHA256} from './browser-actions.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
// Keep regression flows aligned with the current 32-achievement, five-authority, resonance V3 UI.
import {freshDivinity,validateDivinitySave} from '../web/src/utils/divinitySave.js';
import {activateCooperation} from '../web/src/utils/divinityCooperation.js';
import {learnResonance} from '../web/src/data/resonanceV3.js';
import {SAVE_KEY} from '../web/src/utils/storage.js';
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=await import('playwright'));}catch{({chromium}=await import('/opt/codex/cua_node/lib/node_modules/playwright/index.mjs'));}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const checks=[],errors=[],unverified=[];const url=process.env.GAME_URL||(process.env.GAME_URL||'http://127.0.0.1:4173/irena-play.html');
const ok=(name,value=true)=>{assert.ok(value,name);checks.push(name);};
const click=async(p,act,id)=>actionClick(p,act,id,{waitForCombat:!['feather','ultimate','meteor','annihilate','genesis','ending'].includes(id)});
const nav=async(p,id)=>click(p,'nav',id);
async function noOverflow(p,label){const d=await p.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));ok(label+' fits viewport',d.scroll<=d.width);}
async function skip(p){await skipOrFinishCinema(p);}
async function importSave(p,file){const chooser=p.waitForEvent('filechooser');await click(p,'import');await (await chooser).setFiles(file);await p.locator('#modal[open]').waitFor();await click(p,'confirmImport');await p.locator('#modal[open]').waitFor({state:'hidden'});}
try{
for(const width of [1440,768,390,320]){
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce'});const p=await context.newPage();p.on('pageerror',e=>errors.push(`${width}: ${e.message}`));p.on('console',m=>{if(m.type()==='error')errors.push(`${width} console: ${m.text()}`);});await openGame(p,url);ok(`${width} title starts`,await p.locator('h1').innerText()==='いれーな');await click(p,'begin');ok(`${width} home renders`,await p.locator('h1').innerText()==='帰還の聖域');await noOverflow(p,`${width} home`);
 for(const id of ['upgrade','battle','lab','dev']){await nav(p,id);await noOverflow(p,`${width} ${id}`);ok(`${width} navigation ${id}`,!!(await p.locator('h1').innerText()));}
 await nav(p,'upgrade');ok(`${width} five upgrade categories`,await p.locator('.upgrade-category').count()===5);for(const id of ['powers','marks','resonance','training','summon']){await click(p,'tab',id);await noOverflow(p,`${width} tab ${id}`);ok(`${width} fixed back button`,await p.locator('.upgrade-fixed-back button').isVisible());await click(p,'upgradeBack');}
 await nav(p,'home');await click(p,'nav','archive');await noOverflow(p,`${width} achievements`);ok(`${width} 32 current achievement cards`,await p.locator('.achievement').count()===32);
 await nav(p,'home');await click(p,'fight','normal');await noOverflow(p,`${width} fight`);ok(`${width} divinity commands enabled`,await p.locator('[data-action="divCommand"][data-id="slash"]').isEnabled());await click(p,'divCommand','feather');await combatReady(p);if(!(await p.locator('.result h2').count())){await click(p,'divCommand','slash');await combatReady(p);}ok(`${width} ordinary divinity battle win`,await p.locator('.result h2').innerText()==='VICTORY');await click(p,'retry');ok(`${width} advances to current floor-2 opponent`,await p.locator('.div-hp-enemy strong').innerText()==='翼の記憶');await click(p,'askRetreat');await click(p,'retreat');await click(p,'finish');
 await nav(p,'home');await reloadGame(p);ok(`${width} reload retains progression`,(await p.locator('.hero button[data-action="fight"]').innerText()).includes('Lv.2'));
 if(width===390)await p.screenshot({path:'reports/home-mobile.png',fullPage:true});
 if(width===1440){
  await p.screenshot({path:'reports/home-desktop.png',fullPage:true});
  const download=p.waitForEvent('download');await click(p,'export');const dl=await download;await dl.saveAs('reports/browser-export.json');const exported=JSON.parse(fs.readFileSync('reports/browser-export.json'));ok('JSON download contains real progression',exported.state.cleared.includes(1));
  await importSave(p,'reports/pre-warp-save.json');ok('import replaces state only on confirmation',await p.locator('[data-action="warp"]').count()>0);
  await click(p,'warp');await p.locator('#cinema.active').waitFor({state:'hidden'});const state=await p.evaluate(()=>JSON.parse(localStorage.getItem('irena-reborn-v3')));ok('warp unlocks Stella and enables EX without recording an EX win',state.flags.stella&&!state.flags.ex);await nav(p,'finale');ok('EX challenge opens with the Stella route',await p.locator('[data-action="fight"][data-id="ex"]').isEnabled());await nav(p,'home');
  const resonanceFixture=activateCooperation(freshDivinity());resonanceFixture.started=true;resonanceFixture.resShards=40;resonanceFixture.divinity.cooperationTrials={wing:2,king:2,fallen:2,abyss:2,judge:2};for(const id of Object.keys(resonanceFixture.divinity.cooperation))resonanceFixture.divinity.cooperation[id]=100;learnResonance(resonanceFixture,'wingjudge');
  const validResonanceFixture=validateDivinitySave(resonanceFixture);await p.evaluate(([key,value])=>localStorage.setItem(key,JSON.stringify(value)),[SAVE_KEY,validResonanceFixture]);await reloadGame(p);await nav(p,'upgrade');await click(p,'tab','resonance');ok('all 10 resonance skills render',await p.locator('.upgrade-subpage .grid>section.card').count()===10);await click(p,'upgradeResonance','wingjudge');let after=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);ok('UI resonance upgrade spends exactly 40 shards',after.divinity.resonanceV3.levels.wingjudge===2&&after.resShards===0);await reloadGame(p);after=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);ok('resonance upgrade survives reload',after.divinity.resonanceV3.levels.wingjudge===2&&after.resShards===0);
  await importSave(p,'reports/campaign-save.json');await nav(p,'battle');await click(p,'fight','ex');ok('EX distinct mode',await p.locator('.div-hp-enemy strong').innerText()==='EX カイザー');await click(p,'askRetreat');await click(p,'retreat');await click(p,'retry');ok('EX retry stays EX',await p.locator('.div-hp-enemy strong').innerText()==='EX カイザー');await click(p,'askRetreat');await click(p,'retreat');await click(p,'finish');
  await nav(p,'archive');ok('all32 attainable fixture visible',await p.locator('.achievement:not(.locked)').count()===32);await nav(p,'upgrade');await click(p,'tab','powers');ok('all five authority progress cards render',await p.locator('.cooperation-card').count()===5);
  await nav(p,'dev');await click(p,'enabledev');ok('developer independent realm banner',await p.locator('.test-banner').isVisible());await click(p,'fight','final');await noOverflow(p,'final controls desktop');
  for(let i=0;i<7;i++){const stun=p.locator('[data-action="combat"][data-id="wait"]');if(await stun.count())await click(p,'combat','wait');await click(p,'combat','divine');}
  ok('final signed gauge100 unlocks genesis',await p.locator('[data-action="combat"][data-id="genesis"]').isEnabled());const turn=(await p.locator('.heading .tag').innerText());await click(p,'combat','genesis');await click(p,'route','genesis:B');await p.locator('#cinema.active').waitFor({state:'hidden'});ok('route resolves and returns to battle',(await p.locator('.heading .tag').innerText())!==turn);await p.screenshot({path:'reports/final-battle-desktop.png',fullPage:true});
  await click(p,'askRetreat');await click(p,'retreat');await click(p,'finish');await click(p,'exitdev');ok('test battles preserve main achievements',(await p.locator('.archive .number').innerText()).includes('32'));
 }
 if(width===320||width===390){
  await nav(p,'dev');await click(p,'enabledev');await noOverflow(p,`${width} developer large resources`);await click(p,'fight','final');await click(p,'combat','fallen');await click(p,'combat','grasp');for(let i=0;i<3;i++)await click(p,'combat','divine');await click(p,'combat','godspeed');await noOverflow(p,`${width} final speed999x1000 stats`);
  if(width===390)await p.screenshot({path:'reports/final-battle-mobile.png',fullPage:true});
 }
 await context.close();
}
const file=await browser.newPage({viewport:{width:390,height:844}});file.on('pageerror',e=>errors.push('file:'+e.message));try{await file.goto('file://'+process.cwd()+'/irena-play.html');await click(file,'begin');ok('standalone file:// works without HTTP server',await file.locator('h1').innerText()==='帰還の聖域');}catch(e){if(!e.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR'))throw e;unverified.push('file:// navigation blocked by managed browser policy; not verified');}await file.close();
const source=await browser.newPage();source.on('pageerror',e=>errors.push('source:'+e.message));await source.goto(url.replace('irena-play.html','index.html'));await click(source,'begin');ok('editable ES module source entry works',await source.locator('h1').innerText()==='帰還の聖域');await source.close();
const blocked=await browser.newContext();await blocked.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError');};});const p=await blocked.newPage();await openGame(p,url);await click(p,'begin');ok('save failure displayed visibly',(await p.locator('.notice').innerText()).includes('自動保存失敗'));await blocked.close();
const invalid=await browser.newContext();await invalid.addInitScript(()=>{localStorage.setItem('irena-reborn-v3','broken json');});const ip=await invalid.newPage();await ip.goto(url);await click(ip,'begin');ok('corrupt existing save asks before overwrite',await ip.locator('#modal[open]').count()===1);ok('corrupt existing save preserved',await ip.evaluate(()=>localStorage.getItem('irena-reborn-v3'))==='broken json');await invalid.close();
ok('zero uncaught browser errors',errors.length===0);
fs.writeFileSync('reports/browser-results.json',JSON.stringify({browser:'system Chromium',htmlSHA256:testedHTMLSHA256(),viewports:[1440,768,390,320],checks:checks.length,pass:checks.length,fail:0,errors,unverified,results:checks,realIPhoneTested:false},null,2));console.log(JSON.stringify({pass:checks.length,fail:0,errors,unverified}));
}catch(error){fs.writeFileSync('reports/browser-failure.json',JSON.stringify({passed:checks,errors,error:error.stack},null,2));throw error;}finally{await browser.close();}
