import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=await import('playwright'));}catch{({chromium}=await import('/opt/codex/cua_node/lib/node_modules/playwright/index.mjs'));}

const base=process.env.GAME_ORIGIN||'http://127.0.0.1:4173';
const builds=[['standalone',`${base}/irena-play.html`],['hosted',`${base}/dist/index.html`]];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(process.platform==='linux'&&'/usr/bin/chromium'),headless:true,args:['--no-sandbox']});
const results=[];
async function tapCenter(page,element){const box=await element.boundingBox();assert.ok(box,'mascot has a visible touch target');await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
try{
 for(const [build,url]of builds){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url);if(await page.locator('[data-action="begin"]').count())await page.locator('[data-action="begin"]').click();
  await page.getByRole('heading',{name:'帰還の聖域'}).waitFor();
  const mascot=page.locator('.home-mascot'),image=mascot.locator('img');assert.equal(await mascot.count(),1,build+' home visibility');
  for(const width of [390,320,1440]){
   await page.setViewportSize({width,height:844});
   const metrics=await page.evaluate(()=>{const m=document.querySelector('.home-mascot'),r=m.getBoundingClientRect(),img=m.querySelector('img'),nav=document.querySelector('.mobile-nav'),n=nav.getBoundingClientRect();return {width:r.width,bottom:r.bottom,navTop:n.top,navDisplay:getComputedStyle(nav).display,animation:getComputedStyle(m).animationName,duration:getComputedStyle(m).animationDuration,imageLoaded:img.complete&&img.naturalWidth===1217&&img.naturalHeight===1293,imageType:img.currentSrc.slice(0,22),scrollWidth:document.documentElement.scrollWidth,innerWidth};});
   assert.ok(Math.abs(metrics.width-Math.min(120,width*.25))<1,`${build} ${width}px width: ${metrics.width}`);
   assert.ok(metrics.imageLoaded&&metrics.imageType==='data:image/png;base64,',build+' preserves and loads PNG');
   assert.equal(metrics.animation,'home-mascot-float',build+' float animation');assert.ok(metrics.scrollWidth<=metrics.innerWidth,build+' no horizontal overflow');
   if(metrics.navDisplay!=='none')assert.ok(metrics.bottom<=metrics.navTop+1,build+' mascot stays clear of bottom navigation');
   if(width===390){
    assert.equal(metrics.duration,'3s',build+' three-second float cycle');
    await tapCenter(page,mascot);await page.waitForFunction(()=>document.querySelector('.home-mascot')?.classList.contains('jumping'));
    assert.equal(await image.evaluate(el=>getComputedStyle(el).animationDuration),'0.6s');
    await page.waitForFunction(()=>document.querySelector('.home-mascot img')?.getAnimations()[0]?.startTime!==null);
    const start=await image.evaluate(el=>el.getAnimations()[0]?.startTime);await tapCenter(page,mascot);const afterRepeat=await image.evaluate(el=>el.getAnimations()[0]?.startTime);assert.equal(afterRepeat,start,build+' rapid tap does not restart jump');
    await page.waitForFunction(()=>!document.querySelector('.home-mascot')?.classList.contains('jumping'),{timeout:1200});
    assert.equal(await image.evaluate(el=>getComputedStyle(el).animationName),'none',build+' returns to floating animation');
   }
   results.push({build,width,...metrics});
  }
  await page.setViewportSize({width:390,height:844});await page.locator('.mobile-nav [data-id="upgrade"]').click();assert.equal(await mascot.count(),0,build+' hides mascot off home');assert.deepEqual(errors,[],build+' browser errors');
  await context.close();
 }
 console.log(JSON.stringify({pass:results.length,fail:0,results},null,2));
}finally{await browser.close();}
