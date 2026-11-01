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
 {id:'wing',name:'黒翼',asset:'optimized/chibi-wing.webp',reaction:'chibina-wing-react',duration:'600ms'},
 {id:'judge',name:'断罪',asset:'optimized/chibi-judge.webp',reaction:'chibina-judge-react',duration:'500ms'},
 {id:'fallen',name:'堕天',asset:'optimized/chibi-fallen.webp',reaction:'chibina-fallen-react',duration:'650ms'},
 {id:'king',name:'堕天王',asset:'optimized/chibi-king.webp',reaction:'chibina-king-react',duration:'600ms'},
 {id:'abyss',name:'深淵',asset:'optimized/chibi-abyss.webp',reaction:'chibina-abyss-react',duration:'700ms'}
];
const state=activateCooperation(freshDivinity());state.started=true;
const validState=validateDivinitySave(state);
const checks=[];
const ok=(name,value)=>{assert.ok(value,name);checks.push(name);};
async function seededPage(context,url,preferredPersona=null){
 const page=await context.newPage();
 await page.addInitScript(({saveKey,gameSave,prefKey,persona})=>{if(localStorage.getItem(saveKey)===null)localStorage.setItem(saveKey,JSON.stringify(gameSave));if(persona&&localStorage.getItem(prefKey)===null)localStorage.setItem(prefKey,persona);},{saveKey:SAVE_KEY,gameSave:validState,prefKey:preferenceKey,persona:preferredPersona});
 const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 await page.goto(url);await page.locator('.home-mascot').waitFor();
 return {page,pageErrors};
}
async function assertWidths(url){
 for(const [index,width] of [320,375,390,430,1440].entries()){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,isMobile:width<700,hasTouch:width<700});
  const initial=personas[index];
  const {page,pageErrors}=await seededPage(context,url,initial.id);
  ok(`${width}px home has one mascot`,await page.locator('.home-mascot').count()===1);
  const entry=page.locator('.chibina-room-entry'),finale=page.locator('.home-card-route-finale');
  const card=await entry.boundingBox(),fight=await finale.boundingBox();
  ok(`${width}px entry matches final card frame`,!!card&&!!fight&&Math.abs(card.y-fight.y)<2&&Math.abs(card.height-fight.height)<2&&card.x>fight.x);
  ok(`${width}px banner art stays intact over a filled backdrop`,await page.locator('.chibina-room-entry-art').evaluate(img=>img.complete&&img.naturalWidth===1672&&getComputedStyle(img).objectFit==='contain'&&getComputedStyle(img).clipPath.startsWith('inset('))&&await page.locator('.chibina-room-entry-backdrop').evaluate(el=>{const s=getComputedStyle(el);return s.backgroundImage!=='none'&&s.backgroundSize==='auto 190%'})&&!(await entry.innerText()).trim());
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  ok(`${width}px home has no horizontal overflow`,!overflow);
  await entry.click();await page.locator('.chibina-room-grid').waitFor();
  ok(`${width}px room shows all five characters in order`,JSON.stringify(await page.locator('.chibina-card h2').allTextContents())===JSON.stringify(personas.map(x=>x.name)));
  const geometry=await page.locator('.chibina-card').evaluateAll(cards=>cards.map(c=>{const r=c.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
  ok(`${width}px room has a centered 3+2 layout`,geometry.length===5&&Math.abs(geometry[0].y-geometry[1].y)<30&&Math.abs(geometry[1].y-geometry[2].y)<30&&geometry[3].y>geometry[0].y&&geometry[3].x>geometry[0].x&&geometry[4].x<geometry[2].x);
  ok(`${width}px room cards do not overlap`,geometry.every((a,i)=>geometry.slice(i+1).every(b=>a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y)));
  await page.waitForFunction(()=>{const images=[...document.querySelectorAll('.chibina-character-art')];return images.length===5&&images.every(img=>img.complete&&img.naturalWidth>0);});
  ok(`${width}px all optimized character images decode at 435px`,await page.locator('.chibina-character-art').evaluateAll(images=>images.length===5&&images.every(img=>img.complete&&img.naturalWidth===435)));
  ok(`${width}px character transparency and full-image framing are preserved`,await page.locator('.chibina-character-art').evaluateAll(images=>images.every(img=>{const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let transparent=0,visible=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]===0)transparent++;if(pixels[i]>0)visible++;}return transparent>0&&visible>0&&getComputedStyle(img).objectFit==='contain'&&img.getBoundingClientRect().width<=160;})));
  if(width===390)await page.screenshot({path:'/tmp/chibina-room-390-dpr1.png',fullPage:true});
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
  ok(`${width}px tapping never changes the home selection`,await page.locator('.chibina-card.is-home-mascot').getAttribute('data-persona')===initial.id&&await page.evaluate(key=>localStorage.getItem(key),preferenceKey)===initial.id);
  const chosen=personas[(index+1)%personas.length];
  const setButton=page.locator(`.chibina-card[data-persona="${chosen.id}"] [data-action="chibinaSet"]`);
  await setButton.scrollIntoViewIfNeeded();
  ok(`${width}px ${chosen.name} setting action is enabled from ${initial.name}`,!await setButton.isDisabled()&&initial.id!==chosen.id);
  if(width<700){const safe=await page.evaluate(button=>({button:button.getBoundingClientRect(),nav:document.querySelector('.mobile-nav').getBoundingClientRect()}),await setButton.elementHandle());ok(`${width}px persona-setting action clears the fixed navigation`,safe.button.bottom<=safe.nav.top);}
  await setButton.click({timeout:5000});
  ok(`${width}px explicit selection marks ${chosen.name} as current`,await page.locator('.chibina-card.is-home-mascot').getAttribute('data-persona')===chosen.id);
  const after=await page.evaluate(([saveKey,prefKey])=>[localStorage.getItem(saveKey),localStorage.getItem(prefKey)],[SAVE_KEY,preferenceKey]);
  ok(`${width}px preference saves separately from game save`,after[0]===before&&after[1]===chosen.id);
  await page.locator(`${width<700?'.mobile-nav':'.sidebar'} [data-action="nav"][data-id="home"]`).click();
  ok(`${width}px home uses the chosen ${chosen.name} mascot`,await page.locator('.home-mascot').count()===1&&await page.locator('.home-mascot').getAttribute('data-persona')===chosen.id&&await page.locator('.home-mascot img').getAttribute('src').then(src=>src.includes(chosen.asset)));
  await page.reload();
  ok(`${width}px ${chosen.name} mascot survives reload`,await page.locator('.home-mascot').getAttribute('data-persona')===chosen.id);
  await page.locator(`${width<700?'.mobile-nav':'.sidebar'} [data-action="nav"][data-id="battle"]`).click();
  ok(`${width}px battle navigation never displays the room mascot`,await page.locator('.home-mascot').count()===0&&await page.locator('.chibina-room-grid').count()===0);
  ok(`${width}px no uncaught browser errors`,pageErrors.length===0);
  await context.close();
 }
}
try{
 await assertWidths(base);
 const retina=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const {page:retinaPage,pageErrors:retinaErrors}=await seededPage(retina,base,'wing');
 const homeResolution=await retinaPage.locator('.home-mascot img').evaluate(img=>({natural:img.naturalWidth,rendered:img.getBoundingClientRect().width}));
 ok('390px high-DPR home mascot has at least three source pixels per screen pixel',homeResolution.natural>=homeResolution.rendered*3);
 await retinaPage.locator('.chibina-room-entry').click();await retinaPage.locator('.chibina-room-grid').waitFor();
 const retinaResolution=await retinaPage.locator('.chibina-character-art').evaluateAll(images=>images.length===5&&images.every(img=>img.naturalWidth===435&&img.naturalWidth>=img.getBoundingClientRect().width*3&&img.complete&&img.naturalHeight>0));
 ok('390px high-DPR room retains sharp source density and complete art',retinaResolution);
 await retinaPage.screenshot({path:'/tmp/chibina-room-390-dpr3.png',fullPage:true});
 ok('high-DPR room has no browser errors',retinaErrors.length===0);
 await retina.close();
 const standalone=base.includes('/dist/')?base.replace('/dist/index.html','/irena-play.html'):base;
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const {page,pageErrors}=await seededPage(context,standalone);
 await page.locator('.chibina-room-entry').click();
 ok('standalone HTML loads entry and all five embedded 435px images',await page.locator('.chibina-character-art').evaluateAll(images=>images.length===5&&images.every(img=>img.complete&&img.naturalWidth===435)));
 await page.locator('[data-action="chibinaSet"][data-id="abyss"]').click();await page.locator('.mobile-nav [data-action="nav"][data-id="home"]').click();
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
