import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {freshDivinity,validateDivinitySave} from '../web/src/utils/divinitySave.js';
import {activateCooperation} from '../web/src/utils/divinityCooperation.js';
import {SAVE_KEY} from '../web/src/utils/storage.js';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=await import('playwright'));}catch{({chromium}=await import('/opt/codex/cua_node/lib/node_modules/playwright/index.mjs'));}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const base=process.env.GAME_URL||'http://127.0.0.1:4173/dist/index.html';
const preferenceKey='irena-reborn-chibina-room-v1';
const personas=[
 {id:'wing',name:'黒翼',asset:'blackwing-chibi.png',reaction:'chibina-wing-react',duration:'600ms'},
 {id:'judge',name:'断罪',asset:'chibi-danzai.png',reaction:'chibina-judge-react',duration:'500ms'},
 {id:'fallen',name:'堕天',asset:'chibi-daten.png',reaction:'chibina-fallen-react',duration:'650ms'},
 {id:'king',name:'堕天王',asset:'chibi-datenou.png',reaction:'chibina-king-react',duration:'600ms'},
 {id:'abyss',name:'深淵',asset:'chibi-shinen.png',reaction:'chibina-abyss-react',duration:'700ms'}
];
const state=activateCooperation(freshDivinity());state.started=true;
const validState=validateDivinitySave(state);
const checks=[];
const ok=(name,value)=>{assert.ok(value,name);checks.push(name);};
async function seededPage(context,url){
 const page=await context.newPage();
 await page.addInitScript(({saveKey,gameSave})=>localStorage.setItem(saveKey,JSON.stringify(gameSave)),{saveKey:SAVE_KEY,gameSave:validState});
 const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 await page.goto(url);await page.locator('.home-mascot').waitFor();
 return {page,pageErrors};
}
async function assertWidths(url){
 for(const width of [320,375,390,430,1440]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,isMobile:width<700,hasTouch:width<700});
  const {page,pageErrors}=await seededPage(context,url);
  ok(`${width}px home has one mascot`,await page.locator('.home-mascot').count()===1);
  const entry=page.locator('.chibina-room-entry'),finale=page.locator('.home-card-route-finale');
  const card=await entry.boundingBox(),fight=await finale.boundingBox();
  ok(`${width}px entry follows final card`,!!card&&!!fight&&Math.abs(card.y-fight.y)<2&&card.x>fight.x);
  ok(`${width}px banner fits without duplicate overlay`,await page.locator('.chibina-room-entry img').evaluate(img=>img.complete&&img.naturalWidth===1672&&getComputedStyle(img).objectFit==='contain')&&!(await entry.innerText()).trim());
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  ok(`${width}px home has no horizontal overflow`,!overflow);
  await entry.click();await page.locator('.chibina-room-grid').waitFor();
  ok(`${width}px room shows all five characters in order`,JSON.stringify(await page.locator('.chibina-card h2').allTextContents())===JSON.stringify(personas.map(x=>x.name)));
  const geometry=await page.locator('.chibina-card').evaluateAll(cards=>cards.map(c=>{const r=c.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
  ok(`${width}px room has a centered 3+2 layout`,geometry.length===5&&Math.abs(geometry[0].y-geometry[1].y)<30&&Math.abs(geometry[1].y-geometry[2].y)<30&&geometry[3].y>geometry[0].y&&geometry[3].x>geometry[0].x&&geometry[4].x<geometry[2].x);
  ok(`${width}px room cards do not overlap`,geometry.every((a,i)=>geometry.slice(i+1).every(b=>a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y)));
  ok(`${width}px all supplied character images decoded`,await page.locator('.chibina-character-art').evaluateAll(images=>images.length===5&&images.every(img=>img.complete&&img.naturalWidth>0)));
  ok(`${width}px room has no mascot or horizontal overflow`,await page.locator('.home-mascot').count()===0&&!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  const before=await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY);
  for(const persona of personas){
   const tap=page.locator(`.chibina-card[data-persona="${persona.id}"] .chibina-character-tap`);
   await tap.click();
   const image=tap.locator('img');
   await page.waitForFunction(el=>el.classList.contains('reacting'),await tap.elementHandle());
   const animation=await image.evaluate(img=>{const raw=getComputedStyle(img).animationDuration,value=parseFloat(raw);return {name:getComputedStyle(img).animationName,durationMs:raw.endsWith('ms')?value:value*1000,count:img.getAnimations().length};});
   ok(`${width}px ${persona.name} tap runs its single personality animation`,animation.name===persona.reaction&&animation.durationMs===parseFloat(persona.duration)&&animation.count===1);
   await tap.click();
   ok(`${width}px repeated ${persona.name} taps do not stack animations`,await image.evaluate(img=>img.getAnimations().length<=1));
   await page.waitForFunction(el=>!el.classList.contains('reacting'),await tap.elementHandle(),{timeout:1600});
   ok(`${width}px ${persona.name} returns from reaction`,await tap.evaluate(el=>!el.classList.contains('reacting')));
  }
  ok(`${width}px tapping never changes the home selection`,await page.locator('.chibina-card.is-home-mascot').getAttribute('data-persona')==='wing'&&await page.evaluate(key=>localStorage.getItem(key),preferenceKey)===null);
  await page.locator('[data-action="chibinaSelect"][data-id="fallen"]').click();
  ok(`${width}px candidate choice is not yet committed`,await page.locator('.chibina-home-choice').innerText().then(x=>x.includes('設定する人格：堕天'))&&await page.evaluate(key=>localStorage.getItem(key),preferenceKey)===null);
  if(width<700){await page.locator('[data-action="chibinaApply"]').evaluate(el=>el.scrollIntoView({block:'center'}));const safe=await page.evaluate(()=>({button:document.querySelector('[data-action="chibinaApply"]').getBoundingClientRect(),nav:document.querySelector('.mobile-nav').getBoundingClientRect()}));ok(`${width}px home-setting button clears the fixed navigation`,safe.button.bottom<=safe.nav.top);}
  await page.locator('[data-action="chibinaApply"]').click();
  ok(`${width}px explicit selection marks Fallen as current`,await page.locator('.chibina-card.is-home-mascot').getAttribute('data-persona')==='fallen');
  const after=await page.evaluate(([saveKey,prefKey])=>[localStorage.getItem(saveKey),localStorage.getItem(prefKey)],[SAVE_KEY,preferenceKey]);
  ok(`${width}px preference saves separately from game save`,after[0]===before&&after[1]==='fallen');
  await page.locator(`${width<700?'.mobile-nav':'.sidebar'} [data-action="nav"][data-id="home"]`).click();
  ok(`${width}px home uses one selected mascot`,await page.locator('.home-mascot').count()===1&&await page.locator('.home-mascot').getAttribute('data-persona')==='fallen'&&await page.locator('.home-mascot img').getAttribute('src').then(src=>src.includes('chibi-daten.png')));
  await page.reload();
  ok(`${width}px selected mascot survives reload`,await page.locator('.home-mascot').getAttribute('data-persona')==='fallen');
  await page.locator(`${width<700?'.mobile-nav':'.sidebar'} [data-action="nav"][data-id="battle"]`).click();
  ok(`${width}px battle navigation never displays the room mascot`,await page.locator('.home-mascot').count()===0&&await page.locator('.chibina-room-grid').count()===0);
  ok(`${width}px no uncaught browser errors`,pageErrors.length===0);
  if(width===390)await page.screenshot({path:'/tmp/chibina-room-390.png',fullPage:true});
  await context.close();
 }
}
try{
 await assertWidths(base);
 const standalone=base.includes('/dist/')?base.replace('/dist/index.html','/irena-play.html'):base;
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const {page,pageErrors}=await seededPage(context,standalone);
 await page.locator('.chibina-room-entry').click();
 ok('standalone HTML loads entry and all five embedded images',await page.locator('.chibina-character-art').evaluateAll(images=>images.length===5&&images.every(img=>img.complete&&img.naturalWidth>0)));
 await page.locator('[data-action="chibinaSelect"][data-id="abyss"]').click();await page.locator('[data-action="chibinaApply"]').click();await page.locator('.mobile-nav [data-action="nav"][data-id="home"]').click();
 ok('standalone HTML persists home selection',await page.locator('.home-mascot').getAttribute('data-persona')==='abyss'&&pageErrors.length===0);
 await context.close();
 const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const {page:rp}=await seededPage(reduced,base);await rp.locator('.chibina-room-entry').click();
 ok('reduced-motion setting disables floating animations',await rp.locator('.chibina-character-art').first().evaluate(img=>getComputedStyle(img).animationName==='none'));
 await reduced.close();
 const invalid=await browser.newContext({viewport:{width:390,height:844}});
 await invalid.addInitScript(key=>localStorage.setItem(key,'not-a-persona'),preferenceKey);
 const {page:ip}=await seededPage(invalid,base);
 ok('unknown saved persona safely falls back to black wing',await ip.locator('.home-mascot').getAttribute('data-persona')==='wing');
 await invalid.close();
 console.log(JSON.stringify({passed:checks.length,failed:0,checks}));
}catch(error){console.error(JSON.stringify({passed:checks.length,failed:1,error:error.stack,checks}));process.exitCode=1;}
finally{await browser.close();}
