import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {freshDivinity,divinityDeveloper} from '../web/src/utils/divinitySave.js';
import {freshMain20} from '../web/src/utils/main20.js';
const engine=process.env.DIVINITY_BROWSER||'chromium';
const checks=[],errors=[];const out=(process.env.DIVINITY_REPORT_DIR||'reports/divinity-rebuild')+'/'+engine;fs.mkdirSync(out,{recursive:true});const base=process.env.DIVINITY_TEST_BASE||'http://127.0.0.1:8765';
const browser=engine==='webkit'?await webkit.launch({headless:true,...(process.env.DIVINITY_WEBKIT_PATH?{executablePath:process.env.DIVINITY_WEBKIT_PATH}:{})}):await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
async function click(page,action,id){await page.waitForFunction(()=>document.documentElement.dataset.combatBusy!=='true');if(action==='divPage'){while(Number(await page.locator('.div-combat').getAttribute('data-page'))!==Number(id)){const current=Number(await page.locator('.div-combat').getAttribute('data-page'));await page.locator(current<Number(id)?'.div-page-next':'.div-page-prev').click();}return;}const q=`[data-action="${action}"]${id!==undefined?`[data-id="${id}"]`:''}:visible`;await page.locator(q).first().click();await page.waitForFunction(()=>document.documentElement.dataset.combatBusy!=='true');}
async function ready(page){await page.waitForFunction(()=>!document.querySelector('.div-awakening-moment'));}
async function seed(page,state,url='/'){await page.goto(base+url);await page.evaluate(s=>{localStorage.clear();localStorage.setItem('irena-reborn-v3',JSON.stringify(s));},state);await page.reload();}
async function fit(page,label){
 const rect=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,commands:[...document.querySelectorAll('.div-commands button')].map(x=>{const r=x.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width};}),height:innerHeight,footer:document.querySelector('.div-combat-footer')?.getBoundingClientRect().bottom,player:getComputedStyle(document.querySelector('.div-hp-player .div-hp-track i')||document.body).backgroundImage,enemy:getComputedStyle(document.querySelector('.div-hp-enemy .div-hp-track i')||document.body).backgroundImage}));
 check(label+' no horizontal overflow',rect.scroll<=rect.width);
 if(rect.commands.length){
  check(label+' commands visible without scroll',rect.commands.every(r=>r.top>=0&&r.bottom<=rect.height&&r.left>=0&&r.right<=rect.width));
  check(label+' no vertical combat overflow',rect.scrollHeight<=rect.height+1);
  check(label+' commands have at least 44px touch targets',rect.commands.every(r=>r.height>=44&&r.width>=44));
  check(label+' utility buttons remain visible',rect.footer<=rect.height);
  check(label+' player and enemy HP use different colors',rect.player!==rect.enemy);
 }
}
async function choose(page,priority){
 const pages=Number(await page.locator('.div-combat').getAttribute('data-pages'));
 for(const action of priority)for(let index=0;index<pages;index++){
  await click(page,'divPage',String(index));const command=page.locator(`[data-action="divCommand"][data-id="${action}"]:enabled`);
  if(await command.count()){await click(page,'divCommand',action);return;}
 }
 throw Error('No requested command is available');
}

try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);await click(p,'begin');await click(p,'fight','normal');check('initial commands attack + guard',await p.locator('.div-commands button').count()===2);
 for(let i=0;i<30&&await p.locator('.div-commands').count();i++)await click(p,'divCommand',i%3===0?'guard':'slash');
 check('first floor victory',await p.locator('.result h2').innerText()==='VICTORY');await click(p,'finish');await click(p,'nav','awakening');await click(p,'divTrial','wing');await click(p,'divCommand','guard');await click(p,'divCommand','guard');await ready(p);check('awakening unlocks plume mid-battle',await p.locator('[data-action=divCommand][data-id=plume]').isVisible());
 await p.screenshot({path:out+'/wing-awakened-390.png'});await fit(p,'wing awakened');
 for(let i=0;i<30&&!await p.locator('.div-result').count();i++){
 await choose(p,['plume','feather','power','slash','guard']);await ready(p);
 }
 check('wing victory',await p.locator('.div-result h2').innerText()==='VICTORY');await click(p,'divFinish');check('four free trials unlocked',(await p.locator('[data-action=divTrial]:not([disabled])').count())===5);
 await click(p,'divAwaken');await ready(p);check('stage1 image',await p.locator('.div-hero img').getAttribute('src')==='assets/divinity/stage-1.webp');await p.reload();check('reclaim persisted',await p.evaluate(()=>JSON.parse(localStorage.getItem('irena-reborn-v3')).divinity.reclaimed.includes('wing')));
 await context.close();
 for(const [width,height] of [[320,568],[375,667],[390,664],[390,844],[430,740],[768,1024],[1440,900]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce'});const page=await c.newPage();page.on('pageerror',e=>errors.push(`${width}: ${e.message}`));
  for(const stage of [0,1,2,3,4,5]){
   const s=divinityDeveloper({},stage);await seed(page,s);await click(page,'nav','awakening');await fit(page,`${width} stage${stage} hub`);if(width===390&&[0,3,5].includes(stage))await page.screenshot({path:`${out}/stage-${stage}-390.png`,fullPage:true});
   await click(page,'divTrial',stage===5?'infinite':'wing');await fit(page,`${width} stage${stage} battle`);
   const tabs=Number(await page.locator('.div-combat').getAttribute('data-pages'));for(let tab=0;tab<tabs;tab++){await click(page,'divPage',String(tab));await fit(page,`${width} stage${stage} commands${tab}`);}
   if(stage===5){await page.screenshot({path:`${out}/combat-${width}-${height}.png`});
    for(let tab=0;tab<tabs;tab++){await click(page,'divPage',String(tab));if(await page.locator('[data-action=divCommand][data-id=apotheosis]').isVisible())break;}
    await click(page,'divCommand','apotheosis');await ready(page);check(`${width} final awakening active`,await page.locator('.div-unified').count()===1);
    const expanded=Number(await page.locator('.div-combat').getAttribute('data-pages'));for(let tab=0;tab<expanded;tab++){await click(page,'divPage',String(tab));await fit(page,`${width} unified commands${tab}`);}
   }
  }
  await c.close();
 }
 // Developer presets, independent controls and loadout are exercised through UI.
 const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));await seed(page,freshDivinity());await click(page,'begin');await click(page,'nav','dev');await click(page,'divDev','3');await click(page,'nav','dev');await page.locator('#div-dev-stage').selectOption('1');await click(page,'divDevStage');await page.locator('#div-dev-power').selectOption('judge');await page.locator('#div-dev-level').selectOption('2');await click(page,'divDevLevel');const dev=await page.evaluate(()=>JSON.parse(localStorage.getItem('irena-reborn-lab-v4')));check('developer independent stage and power',dev.awakening===1&&dev.powers.judge===2);await c.close();
 // Built hosted and standalone formats must boot and execute a real action.
 for(const url of ['/dist/','/irena-play.html']){const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await c.newPage();page.on('pageerror',e=>errors.push(`${url}: ${e.message}`));await page.goto(base+url);await click(page,'begin');await click(page,'fight','normal');await click(page,'divCommand','slash');check(url+' bundled combat works',(await page.locator('.div-battle-head strong').innerText()).includes('TURN 2'));await fit(page,url);await c.close();}
 check('no page exceptions',errors.length===0);
 const old=freshMain20();old.p=12345;old.awakening=3;const raw=JSON.stringify(old);
 for(const failBackup of [false,true]){
  const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));
  if(failBackup)await c.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='irena-before-divinity-v1')throw new DOMException('Full','QuotaExceededError');return set.call(this,k,v);};});
  await seed(page,old);await click(page,'begin');
  if(failBackup){check('backup failure blocks replacement',await page.locator('#modal [data-action=newAfterError]').isVisible());check('backup failure preserves raw save',await page.evaluate(()=>localStorage.getItem('irena-reborn-v3'))===raw);}
  else{const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('irena-reborn-v3')));check('legacy progress migrated through UI',migrated.p===12345&&migrated.awakening===3&&migrated.divinity.migrated);check('legacy raw backup preserved through UI',await page.evaluate(()=>localStorage.getItem('irena-before-divinity-v1'))===raw);}
  await c.close();
 }
 check('no migration page exceptions',errors.length===0);
}finally{await browser.close();fs.writeFileSync(out+'/browser-results.json',JSON.stringify({engine,checks,errors,realIPhoneTested:false},null,2));}
console.log(`${checks.length} browser checks passed`);
