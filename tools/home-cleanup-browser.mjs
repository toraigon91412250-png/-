import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {ACHIEVEMENTS,MARKS} from '../web/src/data/config.js';
import {freshDivinity,validateDivinitySave} from '../web/src/utils/divinitySave.js';
import {activateCooperation} from '../web/src/utils/divinityCooperation.js';
import {SAVE_KEY} from '../web/src/utils/storage.js';
const base=process.env.GAME_ORIGIN||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const checks=[],ok=(name,value)=>{assert.ok(value,name);checks.push(name);};
async function doubleTap(page){const mascot=page.locator('.home-mascot');for(let i=0;i<2;i++){const r=await mascot.boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);if(!i)await page.waitForTimeout(80);}await page.locator('.home-mascot-guide').waitFor();}
try{
 for(const [build,path] of [['standalone','irena-play.html'],['hosted','dist/index.html']]){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const s=activateCooperation(freshDivinity());s.started=true;s.p=1000;s.achieved=ACHIEVEMENTS.slice(0,3).map(row=>row.id);s.claimed=[s.achieved[0]];const seed=validateDivinitySave(s);seed.claimed=seed.achieved.slice(0,-2);
  await context.addInitScript(([key,state])=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},[SAVE_KEY,seed]);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/${path}`);await page.locator('.home-mascot').waitFor();
  for(const width of [320,390,430,1440]){
   await page.setViewportSize({width,height:844});const metrics=await page.locator('.home-goal').evaluate(el=>({height:el.getBoundingClientRect().height,lines:getComputedStyle(el.querySelector('p')).whiteSpace,overflow:document.documentElement.scrollWidth>innerWidth,text:el.innerText}));
   ok(`${build} ${width}px one-line goal and no overflow`,metrics.height<=60&&metrics.lines==='nowrap'&&!metrics.overflow&&metrics.text.includes('第1階層へ進む'));
  }
  await page.setViewportSize({width:390,height:844});await doubleTap(page);ok(`${build} compact goal and mascot recommend same floor`,(await page.locator('.home-mascot-guide p').innerText()).includes('第1階層'));await page.locator('[data-action=mascotGuideClose]').click();
  await page.locator('.home-archive [data-action=nav][data-id=archive]').tap();
  const all=page.locator('[data-action=claimAll]');ok(`${build} exactly two earned rewards available`,await page.locator('[data-pending-rewards]').innerText()==='2'&&await all.isEnabled());
  ok(`${build} gold-red gradient and readable tap target`,await all.evaluate(el=>getComputedStyle(el).backgroundImage.includes('linear-gradient')&&getComputedStyle(el).color==='rgb(41, 16, 24)'&&el.getBoundingClientRect().height>=44));
  if(build==='hosted')await page.screenshot({path:'/tmp/irena-claim-all-390.png'});
  await all.tap();let after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  ok(`${build} batch pays exactly 120P without changing other currencies`,after.p===1120&&after.claimed.length===seed.achieved.length&&after.summonPoints===seed.summonPoints&&after.resShards===seed.resShards);
  ok(`${build} no rewards left disables button`,await all.isDisabled()&&await page.locator('[data-pending-rewards]').innerText()==='0');
  await all.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));
  ok(`${build} fast repeat cannot collect again`,await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).p,SAVE_KEY)===1120);
  await page.reload();await page.locator('.home-mascot').waitFor();await page.locator('.home-archive [data-action=nav][data-id=archive]').tap();ok(`${build} reload preserves all claimed rewards`,await all.isDisabled()&&await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).p,SAVE_KEY)===1120);
  await page.locator('.mobile-nav [data-id=upgrade]').tap();await page.locator('[data-action=tab][data-id=marks]').tap();
  ok(`${build} marks explain resting combat effects and achievement role`,(await page.locator('.upgrade-subpage .notice').innerText()).includes('戦闘効果は休止中')&&(await page.locator('.upgrade-subpage .notice').innerText()).includes('実績条件'));
  ok(`${build} all ten marks retain collection access`,await page.locator('[data-mark]').count()===10);
  const mark=MARKS[0];await page.locator(`[data-action=buyMark][data-id=${mark.id}]`).tap();await page.locator(`[data-action=equipMark][data-id=${mark.id}]`).tap();
  after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  ok(`${build} collection and record equipment still save`,after.p===1120-mark.cost&&after.marks.includes(mark.id)&&after.markEquip.includes(mark.id));
  ok(`${build} recorded mark is identified without promising combat effects`,(await page.locator(`[data-mark=${mark.id}]`).innerText()).includes('記録用装備中'));
  await page.locator('.mobile-nav [data-id=home]').tap();if(build==='hosted')await page.locator('.home-goal').screenshot({path:'/tmp/irena-compact-home-390.png'});
  await doubleTap(page);await page.locator('[data-action=mascotGuideGo]').tap();await page.locator('.combat-page').waitFor();ok(`${build} guidance still opens the recommended first-floor battle`,!(await page.locator('.home-mascot').count())&&await page.locator('[data-action=divCommand]').count()>0);
  await page.reload();await page.locator('.home-mascot').waitFor();ok(`${build} saved active battle becomes shared home objective`,(await page.locator('[data-home-value=goal]').innerText())==='進行中の戦闘に戻る');await doubleTap(page);ok(`${build} mascot also recommends resuming saved battle`,(await page.locator('.home-mascot-guide p').innerText()).includes('戦いの途中'));ok(`${build} no uncaught browser errors`,errors.length===0);
  await context.close();
 }
 console.log(JSON.stringify({checks:checks.length,pass:checks.length,fail:0,viewports:[320,390,430,1440],dpr:3,realIPhoneTested:false},null,2));
}finally{await browser.close();}
