import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fresh,developerState} from '../web/src/utils/progression.js';
import {validateSave} from '../web/src/utils/storage.js';
import {actionClick,combatReady,skipOrFinishCinema} from './browser-actions.mjs';
let pw;try{pw=await import('playwright');}catch{pw=await import('/opt/codex/cua_node/lib/node_modules/playwright/index.mjs');}
const engine=process.argv[2]||'chromium',url=process.env.GAME_URL||'http://127.0.0.1:4181/irena-play.html',baselineURL=process.env.BASELINE_URL;
const out=`reports/home-ui/${engine}`;fs.mkdirSync(out,{recursive:true});
const browser=await pw[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox'],headless:true}:{headless:true});
const checks=[],errors=[],comparisons=[],unverified=['iPhone Safari実機は未確認','file://直接起動は未確認'];
const ok=(name,value)=>{assert.ok(value,name);checks.push(name);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const click=(p,a,id)=>actionClick(p,a,id,{touch:false});
async function scene(width,state=null,height=844,source=false,location=url){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce'});
 await ctx.addInitScript(state=>{Math.random=()=>.99;if(state&&!sessionStorage.getItem('fixtureLoaded')){localStorage.setItem('irena-reborn-v3',JSON.stringify(state));sessionStorage.setItem('fixtureLoaded','1');}},state);
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});const response=await p.goto(source?location.replace('irena-play.html','index.html'):location);
 if(!source&&location===url)ok('tested final HTML',sha(await response.body())===sha(fs.readFileSync('irena-play.html')));
 if(!state?.started)await click(p,'begin');return {p,ctx};
}
async function fit(p,label){ok(label+' no overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
async function center(p,selector){await p.locator(selector).first().evaluate(x=>x.scrollIntoView({block:'center',behavior:'instant'}));}
async function shot(p,name){await p.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:88,animations:'disabled'});}
async function images(p){await p.locator('.home-card-art').evaluateAll(xs=>{xs.forEach(x=>x.loading='eager');return Promise.all(xs.map(x=>x.decode()));});await p.locator('.home-hero-art').evaluate(x=>x.decode());}
async function retreat(p){await click(p,'askRetreat');await click(p,'retreat');await click(p,'finish');}
try{
 for(const [width,height]of [[320,568],[375,812],[390,664],[430,932],[768,1024],[1440,900]]){
  const {p,ctx}=await scene(width,null,height);await images(p);await fit(p,width+' home');
  ok('real initial P',await p.locator('[data-home-value="p"]').innerText()==='180');ok('real shards',await p.locator('[data-home-value="shards"]').innerText()==='0');
  ok('real initial goal',await p.locator('[data-home-value="goal"]').innerText()==='0 / 5');
  ok('real achievements',await p.locator('[data-home-value="achievements"]').innerText()==='0 / 36');
  ok('six main cards',await p.locator('.home-modes>.home-card').count()===6);
  ok('hero original aspect',await p.locator('.home-hero-art').evaluate(x=>x.naturalWidth===1264&&x.naturalHeight===843&&getComputedStyle(x).objectFit==='cover'));
  const art=await p.locator('.home-card-art').evaluateAll(xs=>xs.map(x=>({name:x.alt,w:x.naturalWidth,h:x.naturalHeight})));
  ok('specified Stella and Kaiser art loaded',art.length===2&&art[0].w===1362&&art[1].w===1470);
  ok('sealed main cards remain disabled',await p.locator('.home-modes .home-card-link:disabled').count()===3);
  ok('all card destinations named',await p.locator('.home-card-link').evaluateAll(xs=>xs.every(x=>x.getAttribute('aria-label')?.length>3)));
  await shot(p,width+'-home');await center(p,'.home-modes');await shot(p,width+'-cards');
  const save=await p.evaluate(()=>localStorage.getItem('irena-reborn-v3'));
  for(const [id,tab]of [['powers','権能'],['summon','黒翼召喚'],['marks','刻印']]){
   await center(p,`.home-card [data-id="${id}"]`);await click(p,'openupgrade',id);ok(id+' existing upgrade destination',id==='powers'?(await p.locator('.upgrade-powers-header h2').innerText())==='権能一覧':(await p.locator('.upgrade-subtitle').innerText())===tab);await click(p,'nav','home');
  }
  ok('navigation alone preserves JSON',await p.evaluate(()=>localStorage.getItem('irena-reborn-v3'))===save);
  await center(p,'.home-archive');await click(p,'nav','archive');ok('archive still has36',await p.locator('.achievement').count()===36);await click(p,'nav','home');
  await p.locator('.home-more summary').click();ok('extra content retained',await p.locator('.home-more .home-card').count()===3);ok('final gate retained',await p.locator('.home-more [data-id="final"]').isDisabled());ok('god gate retained',await p.locator('.home-more [data-id="god"]').isDisabled());
  await center(p,'.home-more [data-id="awakening"]');await click(p,'nav','awakening');ok('awakening route retained',(await p.locator('h1').innerText()).includes('神格'));await click(p,'nav','home');
  await center(p,'.home-character');await p.locator('.home-character summary').click();ok('two authority slots retained',await p.locator('.home-character .equip').count()===2);
  for(const id of ['lab','dev']){await center(p,`.utility-nav [data-id="${id}"]`);await click(p,'nav',id);ok(id+' retained',await p.locator('h1').count()===1);await click(p,'nav','home');}
  await p.locator('.home-guide-shortcut').click();ok('guide icon functional',await p.locator('#modal[open]').count()===1);await click(p,'close');
  if(width<700){ok(width+' touch targets',await p.locator('.home-shell button,.home-nav button').evaluateAll(xs=>xs.filter(x=>x.getClientRects().length).every(x=>{const r=x.getBoundingClientRect();return r.height>=44&&r.width>=44;})));await center(p,'.home-save-actions');await shot(p,width+'-bottom');ok('last utility above nav after scrolling',await p.evaluate(()=>{scrollTo(0,document.documentElement.scrollHeight);const foot=document.querySelector('.utility-nav').getBoundingClientRect(),nav=document.querySelector('.mobile-nav').getBoundingClientRect();return foot.bottom<=nav.top;}));}
  await p.reload();ok('reload keeps real P',await p.locator('[data-home-value="p"]').innerText()==='180');ok('reload keeps JSON',await p.evaluate(()=>localStorage.getItem('irena-reborn-v3'))===save);await ctx.close();
 }
 // Real saved numbers and flags, with no invented currencies or rewards.
 const fixture=developerState(fresh());fixture.p=38240;fixture.resShards=12450;fixture.level=137;fixture.flags.finalClear=true;fixture.awakening=3;
 const unlocked=await scene(390,fixture);await images(unlocked.p);ok('dynamic level137',(await unlocked.p.locator('.home-profile').innerText()).includes('137'));ok('dynamic P38240',await unlocked.p.locator('[data-home-value="p"]').innerText()==='38,240');ok('dynamic shards12450',await unlocked.p.locator('[data-home-value="shards"]').innerText()==='12,450');ok('dynamic awaken goal',await unlocked.p.locator('[data-home-value="goal"]').innerText()==='3 / 5');await shot(unlocked.p,'390-unlocked-home');
 for(const mode of ['raid','stella','ex','final','god']){
  if(['final','god'].includes(mode)&&!await unlocked.p.locator('.home-more').getAttribute('open'))await unlocked.p.locator('.home-more summary').click();
  await center(unlocked.p,`.home-card [data-action="fight"][data-id="${mode}"]`);await click(unlocked.p,'fight',mode);await fit(unlocked.p,mode+' existing screen');ok(mode+' battle reached',await unlocked.p.locator('.battle-stage').count()===1);await retreat(unlocked.p);
 }
 await unlocked.ctx.close();
 const warp=developerState(fresh());warp.flags={...fresh().flags,lv100:true,reward100:true};const w=await scene(390,warp);ok('warp CTA visible',await w.p.locator('.challenge-button[data-action="warp"]').count()===1);ok('prewarp EX still locked',await w.p.locator('.home-modes [data-id="ex"]').isDisabled());await click(w.p,'warp');await skipOrFinishCinema(w.p);ok('warp unlocks both cards',await w.p.locator('.home-modes [data-id="ex"]').isEnabled()&&await w.p.locator('.home-modes [data-id="stella"]').isEnabled());const warped=await w.p.evaluate(()=>JSON.parse(localStorage.getItem('irena-reborn-v3')));ok('no EX clear manufactured',warped.flags.stella&&!warped.flags.ex);await w.ctx.close();
 // Compare original and new builds: the entire non-home <main>, header, navigation and computed styles must match.
 if(baselineURL){for(const width of [320,390,768,1440]){
  const pairs=await Promise.all([scene(width,developerState(fresh()),844,false,baselineURL),scene(width,developerState(fresh()))]);
  for(const id of ['upgrade','battle','raid','archive','lab','awakening','dev']){
   for(const x of pairs){await click(x.p,'nav','home');if(id==='awakening')await x.p.locator('.home-more').count().then(async count=>{if(count)await x.p.locator('.home-more summary').click();});if(id==='raid'){/* The original desktop has no visible raid-intro link. Exercise its existing mobile-nav event for presentation comparison only. */await x.p.locator('.mobile-nav [data-id="raid"]').evaluate(el=>el.click());}else await click(x.p,'nav',id);}
   for(const x of pairs){await x.p.mouse.move(0,0);await x.p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
   const snapshots=await Promise.all(pairs.map(async x=>x.p.evaluate(()=>{const styles=el=>[...el.querySelectorAll('*')].map(n=>{const s=getComputedStyle(n);return [n.tagName,s.font,s.color,s.background,s.padding,s.margin,s.display,s.gridTemplateColumns,s.minHeight,s.border,s.position,s.width,s.height];});return {main:document.querySelector('main').innerHTML,header:document.querySelector('.topbar').outerHTML,style:styles(document.querySelector('main')),headerStyle:styles(document.querySelector('.topbar')),nav:[...document.querySelector('.mobile-nav').children].map(n=>n.outerHTML)};})));
   for(const key of Object.keys(snapshots[0]))assert.equal(sha(JSON.stringify(snapshots[1][key])),sha(JSON.stringify(snapshots[0][key])),width+' '+id+' unchanged '+key);checks.push(width+' '+id+' non-home DOM/styles unchanged');comparisons.push({width,page:id,identical:true});
  }
  for(const x of pairs)await x.ctx.close();
 }}else unverified.push('baseline build URL not provided; non-home browser comparison skipped');
 ok('no browser errors',errors.length===0);const result={engine,pass:checks.length,fail:0,checks,errors,comparisons,unverified,htmlSHA256:sha(fs.readFileSync('irena-play.html'))};fs.writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({engine,pass:checks.length,fail:0,errors}));
}catch(e){fs.writeFileSync(`${out}/failure.json`,JSON.stringify({checks,errors,error:e.stack},null,2));throw e;}finally{await browser.close();}
