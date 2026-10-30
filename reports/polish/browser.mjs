import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {fresh} from '../../web/src/utils/progression.js';
import {SUMMONS} from '../../web/src/data/config.js';
let pw;try{pw=await import('playwright')}catch{pw=await import('/opt/codex/cua_node/lib/node_modules/playwright/index.mjs')}
const engine=process.argv[2]||'chromium',browser=await pw[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{headless:true});
const out=`reports/polish/${engine}`;fs.mkdirSync(out,{recursive:true});const checks=[],errors=[];const ok=(name,val)=>{assert.ok(val,name);checks.push(name)};
const click=(p,a,id)=>p.locator(`[data-action="${a}"]${id===undefined?'':`[data-id="${id}"]`}`).first().click();
const state=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('irena-reborn-v3')));
async function scene(width,rng,reducedMotion='no-preference',collection=[]){const ctx=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion});const initial=fresh();initial.started=true;initial.p=500;initial.collection=collection;await ctx.addInitScript(({initial,rng})=>{if(!localStorage.getItem('irena-reborn-v3'))localStorage.setItem('irena-reborn-v3',JSON.stringify(initial));Math.random=()=>rng;},{initial,rng});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4185/irena-play.html',{waitUntil:'domcontentloaded',timeout:90000});await click(p,'openupgrade','summon');return {p,ctx};}
async function layout(p,name){const m=await p.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,modal:document.querySelector('#modal').getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('#modal[open] button')].map(x=>x.getBoundingClientRect().height)}));ok(name+' no overflow',m.scroll<=m.w);if(m.modal.width){ok(name+' modal in viewport',m.modal.x>=0&&m.modal.right<=m.w);ok(name+' buttons44',m.buttons.every(h=>h>=44));}}
try{
for(const [width,tier,rng] of [[320,'R',0],[390,'SR',.4],[430,'SSR',.99]]){
 const {p,ctx}=await scene(width,rng);await layout(p,`${width} summon`);await p.screenshot({path:`${out}/summon-${width}.jpg`,fullPage:true});
 await click(p,'summon','1');ok(tier+' full screen',(await p.locator('#cinema').getAttribute('class')).includes('rarity-'+tier));const rect=await p.locator('#cinema').boundingBox();ok(tier+' covers viewport',rect.width>=width&&rect.height>=844);
 await p.evaluate(()=>{const b=document.querySelector('[data-action="summon"][data-id="1"]');b.click();b.click()});ok(tier+' repeated charge prevented',(await state(p)).summons===1&&(await state(p)).p===475);
 await p.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#cinema h2')).opacity)>.95);await p.screenshot({path:`${out}/cinema-${tier}.jpg`});await p.evaluate(()=>document.querySelector('#skipCinema')?.click());await p.locator('#modal[open]').waitFor();ok(tier+' starts sealed',await p.locator('.sealed').count()===1);await click(p,'summonReveal');ok(tier+' card tier',await p.locator('.summon-result.rarity-'+tier).count()===1);await layout(p,tier+' result');await p.screenshot({path:`${out}/result-${tier}.jpg`,fullPage:true});
 ok(tier+' no extra reward from revealing',(await state(p)).summons===1);await click(p,'close');ok(tier+' controls restored',await p.locator('[data-action="summon"][data-id="1"]').isEnabled());await p.reload();ok(tier+' save survives reload',(await state(p)).summons===1);await ctx.close();
}
{
 const {p,ctx}=await scene(390,.99);await click(p,'summon','10');await p.evaluate(()=>document.querySelector('#skipCinema')?.click());await p.locator('#modal[open]').waitFor();const after=await state(p);ok('ten costs250 once',after.p===250&&after.summons===10);ok('missing first preserved',after.collection.length===6);ok('duplicate compensation20',after.resShards===20);ok('all rewards before reveal',await p.locator('.sealed').count()===10);
 await click(p,'summonReveal');ok('one card reveals',await p.locator('.sealed').count()===9);await click(p,'summonAll');ok('all ten revealed',await p.locator('.sealed').count()===0&&await p.locator('.summon-result').count()===10);ok('six new four duplicate',await p.locator('.discovery').count()===6&&await p.locator('.duplicate').count()===4);ok('presentation never changes save',JSON.stringify(await state(p))===JSON.stringify(after));await layout(p,'ten results');await p.waitForFunction(()=>[...document.querySelectorAll('.summon-result')].every(x=>Number(getComputedStyle(x).opacity)>.95));await p.screenshot({path:`${out}/ten-results.jpg`});await p.keyboard.press('Escape');ok('escape closes',await p.locator('#modal[open]').count()===0);await ctx.close();
}
{
 const {p,ctx}=await scene(390,0,'reduce',SUMMONS);await click(p,'summon','1');await p.locator('#modal[open]').waitFor();ok('reduced motion reaches results',await p.locator('#cinema.active').count()===0);await click(p,'summonAll');ok('owned reward classified R',await p.locator('.summon-result.rarity-R.duplicate').count()===1);ok('duplicate reward5',(await state(p)).resShards===5);await ctx.close();
}
{
 const {p,ctx}=await scene(390,.99);await click(p,'summon','1');await p.reload();ok('reload during cinema keeps reward',(await state(p)).summons===1&&(await state(p)).p===475);ok('reload no stuck cinema',await p.locator('#cinema.active').count()===0);await click(p,'openupgrade','summon');await click(p,'summon','1');await p.locator('#modal[open]').waitFor();ok('automatic finish works',await p.locator('#cinema.active').count()===0);await click(p,'close');await click(p,'summon','1');await p.evaluate(()=>document.querySelector('#skipCinema')?.click());await click(p,'close');ok('closing unopened keeps reward',(await state(p)).summons===3);await ctx.close();
}
{
 const {p,ctx}=await scene(390,.99);
 const skipped=await p.evaluate(()=>{document.querySelector('[data-action="summon"][data-id="1"]').click();const skip=document.querySelector('#skipCinema');if(!skip)return false;skip.click();skip.click();return true;});
 ok('explicit immediate double skip',skipped);await p.locator('#modal[open]').waitFor();ok('double skip settles once',(await state(p)).summons===1&&(await state(p)).p===475);await ctx.close();
}
ok('no page errors',errors.length===0);const result={engine,pass:checks.length,fail:0,checks,errors,htmlSHA256:createHash('sha256').update(fs.readFileSync('irena-play.html')).digest('hex'),realIPhone:false};fs.writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close()}
