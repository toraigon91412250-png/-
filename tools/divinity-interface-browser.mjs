import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {divinityDeveloper} from '../web/src/utils/divinitySave.js';
const engine=process.env.DIVINITY_BROWSER||'chromium';
const base=process.env.DIVINITY_INTERFACE_BASE||'http://127.0.0.1:8765/dist/';
const out=process.env.DIVINITY_INTERFACE_REPORT_DIR||'reports/divinity-interface/bundled';
fs.mkdirSync(out,{recursive:true});
const browser=engine==='webkit'?await webkit.launch({headless:true,...(process.env.DIVINITY_WEBKIT_PATH?{executablePath:process.env.DIVINITY_WEBKIT_PATH}:{})}):await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const checks=[],errors=[];
const check=(label,condition)=>{assert.ok(condition,label);checks.push(label);};
async function idle(page){await page.waitForFunction(()=>document.documentElement.dataset.combatBusy!=='true');}
async function commandPage(page,id){
 while(await page.locator('.div-page-prev:enabled').count())await page.locator('.div-page-prev').click();
 while(!await page.locator(`[data-action=divCommand][data-id=${id}]`).count())await page.locator('.div-page-next:enabled').click();
}
async function fit(page,label){
 const result=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,buttons:[...document.querySelectorAll('.div-commands button,.div-combat-footer button,.div-command-tabs button')].map(e=>{const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id:e.dataset.id,bounds:r.toJSON(),clickable:e.disabled||e.contains(hit)};})}));
 check(label+' no document overflow',result.scrollWidth<=result.width&&result.scrollHeight<=result.height+1);
 check(label+' every command and footer control fits with a 44px target',result.buttons.every(({bounds:r})=>r.x>=0&&r.right<=result.width&&r.y>=0&&r.bottom<=result.height&&r.height>=44));
 check(label+' no control is covered or clipped',result.buttons.every(b=>b.clickable));
}
try{
 for(const stage of [0,5]){
  const context=await browser.newContext({viewport:{width:390,height:664},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.evaluate(s=>{localStorage.clear();localStorage.setItem('irena-reborn-v3',JSON.stringify(s));},divinityDeveloper({},stage));await page.reload();
  await page.locator('[data-action=nav][data-id=awakening]:visible').first().click();await page.locator(`[data-action=divTrial][data-id=${stage===5?'infinite':'wing'}]`).click();
  await fit(page,`stage ${stage}, short viewport`);
  const before=await page.evaluate(()=>localStorage.getItem('irena-reborn-v3'));
  await page.locator('.div-status-player').click();check('player status opens complete details',await page.locator('#modal').innerText().then(s=>s.includes('自分')&&s.includes('障壁')&&s.includes('装備権能')));await page.locator('#modal [data-action=close]').click();
  await page.locator('.div-status-enemy').click();check('enemy status opens complete details',await page.locator('#modal').innerText().then(s=>s.includes('敵')&&s.includes('侵食')));await page.locator('#modal [data-action=close]').click();
  await page.locator('[data-action=combatLog]').click();check('combat log remains readable',await page.locator('#modal .log p').count()>0);await page.locator('#modal [data-action=close]').click();
  if(stage===5)await commandPage(page,'apotheosis');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);await fit(page,`stage ${stage}, tall viewport`);
  if(stage===5)check('resize retains the selected command',await page.locator('[data-action=divCommand][data-id=apotheosis]').isVisible());
  check('viewing details, paging and resizing preserve save bytes',before===await page.evaluate(()=>localStorage.getItem('irena-reborn-v3')));
  check('generated surface is embedded and applied',await page.locator('.div-combat').evaluate(el=>getComputedStyle(el).backgroundImage.includes('data:image/webp')));
  if(stage===5){await page.locator('[data-action=divCommand][data-id=apotheosis]').click();await idle(page);check('true awakening stays active after animation',await page.locator('.div-unified').count()===1);await commandPage(page,'convergence');}
  await page.screenshot({path:`${out}/${engine}-stage-${stage}-390.png`});
  await page.setViewportSize({width:320,height:568});await page.waitForTimeout(100);await fit(page,`stage ${stage}, minimum viewport`);
  await page.addStyleTag({content:'.divinity-live .div-combat{padding-bottom:34px!important}'});await fit(page,`stage ${stage}, 34px safe-area simulation`);
  if(stage===5)check('awakening countdown visible on minimum viewport',await page.locator('.div-loadout b').isVisible());
  await page.screenshot({path:`${out}/${engine}-stage-${stage}-320.png`});
  await context.close();
 }
 check('no browser exceptions',errors.length===0);
}finally{await browser.close();fs.writeFileSync(`${out}/${engine}-results.json`,JSON.stringify({engine,base,checks,errors,realIPhoneTested:false},null,2));}
console.log(`${checks.length} bundled interface checks passed (${engine})`);
