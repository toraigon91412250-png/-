import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {divinityDeveloper,freshDivinity} from '../web/src/utils/divinitySave.js';

const engine=process.env.COMBAT_EFFECTS_BROWSER||'chromium',base=process.env.COMBAT_EFFECTS_BASE||'http://127.0.0.1:8765',out=process.env.COMBAT_EFFECTS_REPORT_DIR||'reports/combat-effects-recovery';
fs.mkdirSync(out,{recursive:true});
let browser;
try{browser=engine==='webkit'?await webkit.launch({headless:true,...(process.env.DIVINITY_WEBKIT_PATH?{executablePath:process.env.DIVINITY_WEBKIT_PATH}:{})}):await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});}
catch(error){fs.writeFileSync(out+'/browser-results-'+engine+'.json',JSON.stringify({engine,status:'blocked before test execution',reason:error.message,checks:[],errors:[error.message]},null,2));throw error;}
const checks=[],errors=[];
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);};
async function seed(page,state){await page.goto(base+'/');await page.evaluate(s=>{localStorage.clear();localStorage.setItem('irena-reborn-v3',JSON.stringify(s));},state);await page.reload();}
async function click(page,action,id){await page.locator(`[data-action="${action}"][data-id="${id}"]:visible`).first().click();}
async function fit(page,label){const r=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,buttons:[...document.querySelectorAll('.div-commands button')].map(x=>{const r=x.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;})}));check(label+' no horizontal scroll',r.sw<=r.w);check(label+' no vertical scroll',r.sh<=r.h+1);check(label+' all commands visible',r.buttons.length>0&&r.buttons.every(Boolean));}
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await seed(page,divinityDeveloper({},0));await click(page,'nav','awakening');await click(page,'divTrial','wing');await fit(page,'iPhone-width trial');
 for(let i=0;i<2;i++)await click(page,'divCommand','guard');
 await page.locator('.div-awakening-moment').waitFor({state:'visible',timeout:12000});
 check('combat awakening uses the existing stage illustration',await page.locator('.div-awakening-moment img').getAttribute('src')==='assets/divinity/stage-1.webp');
 await page.screenshot({path:out+'/awakening-'+engine+'-390.png'});await page.locator('.div-awakening-moment button').click();await page.waitForTimeout(50);
 await page.evaluate(()=>{
  window.__effects={hitStop:false,slash:false,number:false,authority:false,shake:false};
  const arena=document.querySelector('.div-arena');
  new MutationObserver(records=>{for(const r of records){if(r.type==='attributes'&&arena.classList.contains('vfx-hit-stopped'))window.__effects.hitStop=true;for(const node of r.addedNodes){if(!(node instanceof HTMLElement))continue;if(node.classList.contains('blade-strike'))window.__effects.slash=true;if(node.classList.contains('vfx-authority-cutin')){window.__effects.authority=true;window.__effects.authorityId=node.dataset.authority;}if(node.matches('.vfx-number.vfx-out'))window.__effects.number=node.textContent;}}}).observe(arena,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  window.__shakePoll=setInterval(()=>{if(arena.getAnimations().some(a=>(a.effect?.getKeyframes?.()||[]).some(f=>String(f.transform||'').includes('translate3d('))))window.__effects.shake=true;},5);
 });
 check('plume command unlocked during the trial',await page.locator('[data-action="divCommand"][data-id="plume"]').isVisible());
 await click(page,'divCommand','plume');await page.waitForFunction(()=>window.__effects?.authority&&window.__effects?.slash&&window.__effects?.number&&window.__effects?.hitStop&&window.__effects?.shake,{timeout:10000}).catch(()=>{});
 const effects=await page.evaluate(()=>window.__effects);check('existing authority-specific cut-in is reused',effects.authority&&effects.authorityId==='wing');check('large damage number appears on the enemy side',typeof effects.number==='string'&&effects.number.length>0);check('wide slash appears in the compact arena',effects.slash);check('hit-stop and screen shake play on impact',effects.hitStop&&effects.shake);
 await page.screenshot({path:out+'/combat-effects-'+engine+'-390.png'});await fit(page,'iPhone-width during combat');
 await page.waitForFunction(()=>!document.querySelector('.div-arena')?.classList.contains('vfx-playing'),{timeout:10000});
 await page.waitForFunction(()=>document.documentElement.dataset.combatBusy!=='true');
 if(await page.locator('.div-page-prev:enabled').count())await page.locator('.div-page-prev').click();
 check('combat returns to usable commands',await page.locator('.div-commands button:enabled').count()>0);check('no page exceptions',errors.length===0);
 await context.close();
}finally{
 await browser.close();
 fs.writeFileSync(out+'/browser-results-'+engine+'.json',JSON.stringify({engine,viewport:{width:390,height:844},reducedMotion:'no-preference',checks,errors},null,2));
}
console.log(`${checks.length} combat-effects browser checks passed`);
