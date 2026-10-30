import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {freshMain20} from '../web/src/utils/main20.js';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=await import('playwright'));}catch{({chromium}=await import('/opt/codex/cua_node/lib/node_modules/playwright/index.mjs'));}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const results=[],errors=[];
try{
 for(const width of [1440,320]){
  for(const complete of [false,true]){
   const state=freshMain20();state.started=true;state.floor=20;state.cleared=Array.from({length:complete?20:19},(_,i)=>i+1);state.level=100;
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700});
   await context.addInitScript(value=>{if(!localStorage.getItem('irena-reborn-v3'))localStorage.setItem('irena-reborn-v3',value);},JSON.stringify(state));
   const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(`${width}/${complete}:${e.message}`));
   await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/');
   if(await page.locator('[data-action="begin"]').count())await page.locator('[data-action="begin"]').click();
   await page.locator('[data-action="nav"][data-id="battle"]').filter({visible:true}).first().click();
   const nightmare=page.locator('#difficulty option[value="NIGHTMARE"]');
   const isDisabled=await nightmare.evaluate(x=>x.disabled);
   assert.equal(isDisabled,!complete,`unlock state at ${width}px (complete=${complete}, disabled=${isDisabled})`);
   const lobby=await page.locator('#app').innerText();
   assert.match(lobby,/NIGHTMAREは全20階層クリアで解放/);
   assert.match(lobby,/敵HP10倍・攻撃4\.6倍・速度4\.5倍/);
   results.push({width,complete,disabled:isDisabled});
   if(complete){
    await page.locator('#difficulty').selectOption('NORMAL');
    await page.locator('[data-action="fight"][data-id="selected"]').click();
    await page.locator('[data-action="combat"][data-id="guard"]').click();
    await page.waitForFunction(()=>document.querySelector('.heading')?.textContent.includes('TURN 2'));
    const gaugeBefore=await page.locator('.battle-charge .gold').innerText();assert.equal(gaugeBefore,'18%');
    await page.reload();await page.locator('.home-adventure').waitFor({state:'visible'});await page.locator('.home-adventure').click();
    const resumed=await page.locator('.heading').first().innerText();
    assert.match(resumed,/TURN 2/);assert.equal(await page.locator('.battle-charge .gold').innerText(),'18%');
    results.push({width,checkpointResumed:true,turn:2,gauge:'18%'});
    await page.locator('[data-action="askRetreat"]').filter({visible:true}).first().click();
    await page.locator('[data-action="retreat"]').filter({visible:true}).click();
    await page.locator('.result').waitFor();await page.locator('[data-action="finish"]').click();
    await page.locator('[data-action="about"]').filter({visible:true}).last().click();
    const guide=await page.locator('#modal').innerText();
    assert.match(guide,/進行中の戦闘も自動保存/);assert.match(guide,/鏡像戦・開発者の試験戦・20階層試作は戦闘再開に対応していません/);
    results.push({width,guideAccurate:true});await page.locator('#modal [data-action="close"]').click();
    await page.locator('[data-action="nav"][data-id="battle"]').filter({visible:true}).first().click();
    await page.locator('#difficulty').selectOption('NIGHTMARE');
    await page.locator('[data-action="fight"][data-id="selected"]').click();
    await page.locator('.fighter-enemy .hpnum').waitFor();
    const title=await page.locator('.heading').first().innerText();
    const hp=await page.locator('.fighter-enemy .hpnum').innerText();
    assert.match(title,/NIGHTMARE/);assert.match(hp,/725,000/);
    const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
    assert.ok(widths.scroll<=widths.width,`horizontal overflow at ${width}px`);
    results.push({width,started:true,title,hp,noOverflow:true});
    await page.locator('[data-action="askRetreat"]').filter({visible:true}).first().click();
    await page.locator('[data-action="retreat"]').filter({visible:true}).click();
    await page.locator('.result').waitFor();
    const outcome=await page.locator('.result .tag').innerText();assert.match(outcome,/NIGHTMARE/);
    await page.locator('[data-action="retry"]').filter({visible:true}).click();
    await page.locator('.fighter-enemy .hpnum').waitFor();
    const retryTitle=await page.locator('.heading').first().innerText();
    const retryHp=await page.locator('.fighter-enemy .hpnum').innerText();
    assert.match(retryTitle,/NIGHTMARE/);assert.equal(retryHp,hp);
    results.push({width,retry:true,resultTag:outcome,retryTitle,retryHp});
   }
   await context.close();
  }
 }
 assert.deepEqual(errors,[]);
 const out={browser:'Chromium',viewports:[1440,320],checks:results.length,errors,results};
 fs.writeFileSync(process.env.BROWSER_OUT||'reports/self-improvement-loop-31-40/main20-browser.json',JSON.stringify(out,null,2));
 console.log(JSON.stringify(out));
}finally{await browser.close();}
