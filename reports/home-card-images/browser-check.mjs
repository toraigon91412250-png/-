import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fresh} from '../../web/src/utils/progression.js';
import {actionClick} from '../../tools/browser-actions.mjs';
let pw;try{pw=await import('playwright');}catch{pw=await import('/opt/codex/cua_node/lib/node_modules/playwright/index.mjs');}
const engine=process.argv[2]||'chromium',browser=await pw[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{headless:true});
const out=`reports/home-card-images/${engine}`;fs.mkdirSync(out,{recursive:true});const checks=[],errors=[];
const hashes=JSON.parse(fs.readFileSync('reports/home-card-images/provided-image-hashes.json'));
const mapping={summon:'01_blackwing_summon.jpg',marks:'02_engraving_equipment.jpg',raid:'03_abyss_raid.jpg',powers:'04_upgrade_equipment.jpg'};
const ok=(name,value)=>{assert.ok(value,name);checks.push(name);};
const sha=b=>createHash('sha256').update(b).digest('hex');
const click=(p,a,id)=>actionClick(p,a,id);
async function center(p,selector){await p.locator(selector).evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));}
try{
 for(const width of [320,390,768,1440]){
  const ctx=await browser.newContext({viewport:{width,height:844},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce'});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const response=await p.goto('http://127.0.0.1:4181/irena-play.html');ok('tested final HTML',sha(await response.body())===sha(fs.readFileSync('irena-play.html')));await click(p,'begin');
  await p.locator('.home-card img').evaluateAll(xs=>{xs.forEach(x=>x.loading='eager');return Promise.all(xs.map(x=>x.decode()));});
  const save=await p.evaluate(()=>localStorage.getItem('irena-reborn-v3'));
  for(const [id,file]of Object.entries(mapping)){
   const card=p.locator('.home-card-route-'+id),img=card.locator('.home-card-background'),src=await img.getAttribute('src');
   ok(width+' '+id+' exact supplied image',sha(Buffer.from(src.split(',')[1],'base64'))===hashes[file]);
   ok(id+' aspect-preserving cover',await img.evaluate(x=>x.complete&&x.naturalWidth===1536&&getComputedStyle(x).objectFit==='cover'));
   ok(id+' no portrait classification',!(await card.getAttribute('class')).includes('home-card-illustrated'));
   const bounds=await card.evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll('h3,p')].every(x=>{const b=x.getBoundingClientRect();return b.left>=r.left&&b.right<=r.right&&b.top>=r.top&&b.bottom<=r.bottom;});});ok(id+' copy stays inside card',bounds);
  }
  ok(width+' exactly four new backgrounds',await p.locator('.home-card-background').count()===4);ok('existing portrait cards retained',await p.locator('.home-card-art').count()===2);
  ok(width+' no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await center(p,'.home-modes');await p.screenshot({path:`${out}/${width}-cards.jpg`,animations:'disabled',type:'jpeg',quality:88});
  ok('raid still gated',await p.locator('.home-card-route-raid button').isDisabled());
  for(const [id,tab]of [['powers','権能'],['marks','刻印'],['summon','黒翼召喚']]){
   await center(p,'.home-card-route-'+id);await click(p,'openupgrade',id);ok(id+' original route works',await p.locator('.tabs .active').innerText()===tab);await click(p,'nav','home');
  }
  ok('images and navigation do not change save',await p.evaluate(()=>localStorage.getItem('irena-reborn-v3'))===save);await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:390,height:664},reducedMotion:'reduce'}),state=fresh();state.started=true;state.level=50;state.floor=51;state.cleared=Array.from({length:50},(_,i)=>i+1);
 await ctx.addInitScript(state=>localStorage.setItem('irena-reborn-v3',JSON.stringify(state)),state);const p=await ctx.newPage();await p.goto('http://127.0.0.1:4181/irena-play.html');await center(p,'.home-card-route-raid');await click(p,'fight','raid');ok('unlocked raid image card still starts raid',(await p.locator('.heading p').innerText()).includes('深淵レイド'));await ctx.close();
 ok('no browser errors',errors.length===0);fs.writeFileSync(`${out}/results.json`,JSON.stringify({engine,pass:checks.length,fail:0,errors,checks,htmlSHA256:sha(fs.readFileSync('irena-play.html')),realIPhoneTested:false},null,2));console.log(JSON.stringify({engine,pass:checks.length,fail:0,errors}));
}catch(e){fs.writeFileSync(`${out}/failure.json`,JSON.stringify({checks,errors,error:e.stack},null,2));throw e;}finally{await browser.close();}
