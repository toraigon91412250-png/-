import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {freshMain20} from '../web/src/utils/main20.js';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=await import('playwright'));}catch{({chromium}=await import('/opt/codex/cua_node/lib/node_modules/playwright/index.mjs'));}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const errors=[],results=[];
try{
 const state=freshMain20();state.started=true;state.level=100;state.floor=20;state.cleared=Array.from({length:20},(_,i)=>i+1);
 state.flags={...state.flags,lv100:true,reward100:true,warp:true,stella:true,ex:true,exReward:true,stellaClear:true,final:true};
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(value=>{if(!localStorage.getItem('irena-reborn-v3'))localStorage.setItem('irena-reborn-v3',value);},JSON.stringify(state));
 const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/');
 const launch=async({label,selector,button,expectedHP})=>{
  await page.locator(selector).selectOption('NIGHTMARE');
  await page.locator(button).filter({visible:true}).first().click();
  const heading=await page.locator('.heading').first().innerText();assert.match(heading,/NIGHTMARE/,`${label} displays selected difficulty`);
  const hpText=await page.locator('.fighter-enemy .hpnum').innerText(),hp=Number(hpText.split('/')[0].replaceAll(',','').trim());
  assert.equal(hp,expectedHP,`${label} uses the standard Nightmare HP scale`);
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dimensions.scroll<=dimensions.width,`${label} fits mobile width`);
  results.push({label,heading:heading.split('\n').slice(0,3).join(' / '),enemyHP:hp,viewport:dimensions.width});
  await page.locator('[data-action="askRetreat"]').filter({visible:true}).first().click();
  await page.locator('[data-action="retreat"]').filter({visible:true}).first().click();
  await page.locator('.result').waitFor();await page.locator('[data-action="finish"]').click();
 };
 await page.locator('[data-action="nav"][data-id="raid"]').filter({visible:true}).first().click();
 await launch({label:'raid',selector:'#raidDifficulty',button:'[data-action="fight"][data-id="raid"]',expectedHP:220236});
 await page.locator('.home-more summary').click();
 await launch({label:'god',selector:'#godDifficulty',button:'.home-card-route-god [data-action="fight"]',expectedHP:72000});
 await page.locator('.home-card-route-finale [data-action="nav"]').click();
 await launch({label:'EX',selector:'#finaleDifficulty',button:'[data-final-chapter="ex"] [data-action="fight"]',expectedHP:314624});
 await page.locator('.home-card-route-finale [data-action="nav"]').click();
 await launch({label:'Stella',selector:'#finaleDifficulty',button:'[data-final-chapter="stella"] [data-action="fight"]',expectedHP:48000});
 await page.locator('.home-card-route-finale [data-action="nav"]').click();
 await launch({label:'final Irena',selector:'#finaleDifficulty',button:'[data-final-chapter="final"] [data-action="fight"]',expectedHP:136000});
 assert.deepEqual(errors,[]);const report={browser:'Chromium',viewport:390,checks:results.length*3,errors,results};
 fs.writeFileSync(process.env.BROWSER_OUT||'reports/self-improvement-loop-31-40/challenge-hubs-browser.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();}
