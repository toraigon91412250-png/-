import {combatReady,actionClick,skipOrFinishCinema,openGame,reloadGame,testedHTMLSHA256} from './browser-actions.mjs';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
let chromium;try{({chromium}=await import('playwright'));}catch{({chromium}=await import('/opt/codex/cua_node/lib/node_modules/playwright/index.mjs'));}
import {fresh,developerState} from '../web/src/utils/progression.js';
const phase=process.argv[2]||'before',out=`reports/ui-review/${phase}`;fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const records=[],errors=[];
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
let page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const click=async(action,id)=>actionClick(page,action,id);
const nav=id=>click('nav',id);
async function shot(name){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/${name}.png`,fullPage:true});records.push({screen:name,...await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,buttons:document.querySelectorAll('button').length,disabled:document.querySelectorAll('button:disabled').length,images:[...document.images].map(x=>({src:x.currentSrc.startsWith('data:')?'embedded':x.getAttribute('src'),loaded:x.complete&&x.naturalWidth>0,fit:getComputedStyle(x).objectFit})),combat:[...document.querySelectorAll('[data-action="combat"]')].map(x=>({id:x.dataset.id,disabled:x.disabled,text:x.innerText,description:!!x.querySelector('small')}))}))});}
async function retire(){if(await page.locator('[data-action="askRetreat"]').count()){await click('askRetreat');await click('retreat');}if(await page.locator('[data-action="finish"]').count())await click('finish');}
await openGame(page,process.env.GAME_URL||'http://127.0.0.1:4173/irena-play.html');await shot('00-title');await click('begin');await shot('01-home');await nav('battle');await shot('02-battle-lobby');await click('fight','selected');await shot('03-normal-battle');await click('combat','slash');await shot('04-normal-action');await retire();
await nav('upgrade');for(const [tab,name] of [['powers','05-powers'],['marks','06-marks'],['resonance','07-resonance'],['training','08-training'],['summon','09-summon']]){await click('tab',tab);await shot(name);await click('upgradeBack');}
await nav('lab');await shot('10-lab');await click('labstart');await shot('11-lab-battle');await retire();await nav('dev');await shot('12-developer');await click('enabledev');await shot('13-all-unlocked');
await nav('upgrade');await click('tab','marks');await click('equipMark','split');await click('equipMark','wind');await shot('14-equipment');await click('upgradeBack');await click('tab','resonance');await shot('15-resonance-unlocked');await click('upgradeBack');await click('tab','summon');await click('summon','10');await shot('16-summon-result');await click('close');
for(const [mode,name] of [['raid','17-raid'],['god','18-gauntlet'],['ex','19-ex'],['stella','20-stella'],['final','21-final-zero']]){await nav('home');await click('fight',mode);await shot(name);if(mode==='final'){await click('combat','fallen');await click('combat','grasp');await click('combat','fallen');await shot('22-final-fallen-stage1');}await retire();}
await nav('awakening');await shot('23-awakening');await click('awaken');await page.locator('#cinema.active').waitFor({state:'hidden'});await shot('24-awakened');await click('movie');await page.locator('#cinema.active').waitFor({state:'hidden'});
await nav('home');await nav('archive');await shot('25-achievements');await nav('home');const desktop=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',storageState:await context.storageState()});page=await desktop.newPage();await openGame(page,process.env.GAME_URL||'http://127.0.0.1:4173/irena-play.html');await shot('26-home-desktop');
fs.writeFileSync(`${out}/audit.json`,JSON.stringify({phase,records,errors,htmlSHA256:testedHTMLSHA256()},null,2));
await browser.close();console.log(JSON.stringify({phase,screens:records.length,errors,overflow:records.filter(x=>x.scrollWidth>x.viewport).map(x=>x.screen)}));
