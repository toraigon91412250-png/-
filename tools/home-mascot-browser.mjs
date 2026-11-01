import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=await import('playwright'));}catch{({chromium}=await import('/opt/codex/cua_node/lib/node_modules/playwright/index.mjs'));}

const base=process.env.GAME_ORIGIN||'http://127.0.0.1:4173';
const builds=[['standalone',`${base}/irena-play.html`],['hosted',`${base}/dist/index.html`]];
const preferenceKey='irena-reborn-chibina-room-v1';
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
   const metrics=await page.evaluate(()=>{const m=document.querySelector('.home-mascot'),r=m.getBoundingClientRect(),img=m.querySelector('img'),nav=document.querySelector('.mobile-nav'),n=nav.getBoundingClientRect();return {width:parseFloat(getComputedStyle(m).width),bottom:r.bottom,navTop:n.top,navDisplay:getComputedStyle(nav).display,animation:getComputedStyle(m).animationName,duration:getComputedStyle(m).animationDuration,imageLoaded:img.complete&&img.naturalWidth===435&&img.naturalHeight===462,webpSource:img.currentSrc.startsWith('data:image/webp;base64,')||img.currentSrc.endsWith('/optimized/chibi-wing.webp'),scrollWidth:document.documentElement.scrollWidth,innerWidth};});
   assert.ok(Math.abs(metrics.width-Math.min(150,metrics.innerWidth*.3125))<1,`${build} ${width}px width: ${metrics.width}`);
   assert.ok(metrics.imageLoaded&&metrics.webpSource,build+' loads optimized transparent WebP');
   assert.equal(metrics.animation,'chibina-wing-float',build+' float animation');assert.ok(metrics.scrollWidth<=metrics.innerWidth,build+' no horizontal overflow');
   if(metrics.navDisplay!=='none')assert.ok(metrics.bottom<=metrics.navTop+1,build+' mascot stays clear of bottom navigation');
   if(width===390){
    assert.equal(metrics.duration,'3s',build+' three-second float cycle');
    await tapCenter(page,mascot);await page.waitForFunction(()=>document.querySelector('.home-mascot')?.classList.contains('jumping'));
    assert.equal(await image.evaluate(el=>getComputedStyle(el).animationDuration),'0.6s');
    assert.equal(await image.evaluate(el=>getComputedStyle(el).animationName),'chibina-wing-react');
    await page.waitForFunction(()=>!document.querySelector('.home-mascot')?.classList.contains('jumping'),{timeout:1200});
    assert.equal(await page.locator('.home-mascot').evaluate(el=>getComputedStyle(el).animationName),'chibina-wing-float',build+' returns to personality-specific floating animation');
   }
   results.push({build,width,...metrics});
  }
  await page.setViewportSize({width:390,height:844});await page.locator('.mobile-nav [data-id="upgrade"]').click();assert.equal(await mascot.count(),0,build+' hides mascot off home');
  await page.locator('.mobile-nav [data-id="home"]').click();await mascot.waitFor();
  await tapCenter(page,mascot);await page.waitForTimeout(80);await tapCenter(page,mascot);
  await page.locator('.home-mascot-guide').waitFor();
  assert.match(await page.locator('.home-mascot-guide p').innerText(),/次は第1階層へ行こうよ。案内するね！/,build+' double tap uses selected persona voice and next floor');
  assert.equal(await page.locator('.heading').count(),0,build+' double tap does not navigate');
  await page.locator('.home-mascot-guide [data-action="mascotGuideClose"]').click();assert.equal(await page.locator('.home-mascot-guide').count(),0,build+' guide dismisses');
  const voices={wing:'次は第1階層へ行こうよ。案内するね！',judge:'次に裁くのは第1階層だ。',fallen:'次の目標は第1階層。早くいけ。',king:'次なる戦場、第1階層へ参ろう。案内して差し上げる。',abyss:'……次は、第1階層。行くなら、触れて。'};
  for(const [id,voice] of Object.entries(voices)){
   await page.evaluate(([key,persona])=>localStorage.setItem(key,persona),[preferenceKey,id]);await page.reload();await mascot.waitFor();
   await tapCenter(page,mascot);await page.waitForTimeout(80);await tapCenter(page,mascot);await page.locator('.home-mascot-guide').waitFor();
   assert.equal(await page.locator('.home-mascot-guide p').innerText(),voice,build+' '+id+' persona voice');
   await page.locator('.home-mascot-guide [data-action="mascotGuideClose"]').click();
  }
  await tapCenter(page,mascot);await page.waitForTimeout(80);await tapCenter(page,mascot);await page.locator('.home-mascot-guide').waitFor();
  await page.locator('.home-mascot-guide [data-action="mascotGuideGo"]').click();await page.locator('.combat-page').waitFor();
  assert.ok(await page.locator('[data-action=divCommand]').count()>0,build+' guide opens an active first-floor battle');assert.equal(await page.locator('.home-mascot').count(),0,build+' mascot hides off home');
  assert.deepEqual(errors,[],build+' browser errors');
  await context.close();
 }
 console.log(JSON.stringify({pass:results.length,fail:0,results},null,2));
}finally{await browser.close();}
