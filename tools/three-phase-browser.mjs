import {openGame,testedHTMLSHA256} from './browser-actions.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
let pw;try{pw=await import('playwright');}catch{pw=await import('/opt/codex/cua_node/lib/node_modules/playwright/index.mjs');}
const engine=process.argv[2]||'chromium',url=process.env.GAME_URL||'http://127.0.0.1:4180/irena-play.html';
const browser=await pw[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}:{headless:true});
const out=`reports/three-phase/${engine}`;fs.mkdirSync(out,{recursive:true});const checks=[],errors=[],screens=[];
const ok=(name,value=true)=>{assert.ok(value,name);checks.push(name);};
const ready=p=>p.waitForFunction(()=>!document.querySelector('#cinema.active')&&document.documentElement.dataset.combatBusy!=='true');
const loc=(p,a,id)=>p.locator(`[data-action="${a}"]${id?`[data-id="${id}"]`:''}`).filter({visible:true}).first();
async function press(p,a,id){await ready(p);await loc(p,a,id).click();}
async function shot(p,name){await p.screenshot({path:`${out}/${name}.jpg`,fullPage:!name.includes('相・'),type:'jpeg',quality:80});screens.push(name);ok(name+' no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
async function resolve(p,width,seen){
 const consume=async()=>{const rows=await p.evaluate(()=>window.__phaseReveals||[]);for(const row of rows){if(seen.has(row.title))continue;seen.add(row.title);ok(row.title+' uses EX art',row.artMatches);await shot(p,width+'-'+row.title);const unchanged=await p.evaluate(()=>{const snapshot=()=>[document.querySelector('.heading .tag')?.textContent,document.querySelector('.fighter-enemy .hpnum')?.textContent,document.querySelector('.fighter .hpnum')?.textContent,localStorage.getItem('irena-reborn-v3')].join('|');const before=snapshot();window.__phaseSkip?.();window.__phaseSkip?.();return snapshot()===before;});ok('phase skip preserves HP and saved progress',unchanged);}};
 const end=Date.now()+6000;
 while(Date.now()<end){
  const snap=await p.evaluate(()=>{const el=document.querySelector('#cinema.active');return el?{phase:el.classList.contains('phase-transition')}:null;});
  if(snap&&!snap.phase)await p.evaluate(()=>document.querySelector('#cinema.active #skipCinema')?.click());
  await consume();
  if(await p.evaluate(()=>document.documentElement.dataset.combatBusy==='false'&&!document.querySelector('#cinema.active'))){await p.waitForTimeout(25);if(await p.evaluate(()=>document.documentElement.dataset.combatBusy==='false'&&!document.querySelector('#cinema.active'))){await consume();return;}}
  await p.waitForTimeout(15);
 }
 throw Error('combat animation did not return control');
}
try{
for(const width of [320,390,768]){
 const ctx=await browser.newContext({viewport:{width,height:width===320?568:width===390?664:900},isMobile:width<700,hasTouch:width<700,reducedMotion:'no-preference'});
 const p=await ctx.newPage();await p.addInitScript(()=>Math.random=()=>.99);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await openGame(p,url);await p.evaluate(()=>{window.__phaseReveals=[];new MutationObserver(()=>{const el=document.querySelector('#cinema.active.phase-transition'),title=el?.querySelector('h2')?.textContent;if(title&&!window.__phaseReveals.some(x=>x.title===title)){window.__phaseSkip=el.querySelector('#skipCinema')?.onclick;window.__phaseReveals.push({title,artMatches:el.querySelector('img')?.src===document.querySelector('.fighter-enemy img')?.src});}}).observe(document.querySelector('#cinema'),{childList:true,subtree:true,attributes:true});});const sha=testedHTMLSHA256();ok('loaded final HTML',sha===createHash('sha256').update(fs.readFileSync('irena-play.html')).digest('hex'));
 await press(p,'begin');await press(p,'nav','lab');await p.locator('#labmode').selectOption('three-phase');const before=await p.evaluate(()=>localStorage.getItem('irena-reborn-v3'));await press(p,'labstart');
 ok(width+' prototype name',await p.locator('.fighter-enemy h3').innerText()==='EXカイザー・三相決戦');
 ok(width+' six skills with split replacing feather',await p.locator('[data-action="combat"]').count()===6);
 await shot(p,width+'-start');const seen=new Set();let actions=0;
 while(!await p.locator('.result').count()&&actions<40){
  const enabled=async id=>await loc(p,'combat',id).isEnabled();const state=await p.locator('.actual-enemy-state').innerText();
  const id=await enabled('ultimate')?'ultimate':state.includes('黒晶殻')&&await enabled('power')?'power':await enabled('volley')?'volley':await enabled('pierce')?'pierce':'slash';
  await press(p,'combat',id);await resolve(p,width,seen);actions++;
  ok('no attack prediction UI',!(await p.locator('main').innerText()).match(/予兆|攻撃予測|行動予告|ダメージ予測|行動順予測/));
 }
 ok(width+' playable victory',await p.locator('.result h2').innerText()==='VICTORY');ok(width+' both phase reveals',seen.has('第二相・変転')&&seen.has('第三相・終極'));await shot(p,width+'-victory');
 ok('win main JSON unchanged',await p.evaluate(()=>localStorage.getItem('irena-reborn-v3'))===before);ok('trial shows no reward cards',await p.locator('[data-reward]').count()===0);
 await press(p,'retry');ok('retry preserves trial',await p.locator('.fighter-enemy h3').innerText()==='EXカイザー・三相決戦');ok('retry returns phase1',(await p.locator('.fighter-enemy .info').innerText()).includes('第1形態'));ok('retry clears crystal',await p.locator('.actual-enemy-state').innerText()==='');
 await press(p,'combat','guard');await resolve(p,width,new Set());ok('guard focus visible',await p.locator('.statuslist').innerText().then(x=>x.includes('蓄勢')));await shot(p,width+'-guard');
 await press(p,'askRetreat');await press(p,'retreat');await press(p,'finish');ok('defeat and retry main JSON unchanged',await p.evaluate(()=>localStorage.getItem('irena-reborn-v3'))===before);
 await press(p,'nav','lab');await p.locator('#labmode').selectOption('ex');await press(p,'labstart');ok('ordinary experimental EX unchanged name',await p.locator('.fighter-enemy h3').innerText()==='EX カイザー');ok('ordinary EX has no trial state',await p.locator('.actual-enemy-state').count()===0);await ctx.close();
}
ok('zero browser errors',errors.length===0);const report={engine,pass:checks.length,fail:0,errors,screens,checks,htmlSHA256:createHash('sha256').update(fs.readFileSync('irena-play.html')).digest('hex'),realIPhoneTested:false};fs.writeFileSync(`${out}/results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({engine,pass:checks.length,fail:0,screens:screens.length,errors}));
}catch(e){fs.writeFileSync(`${out}/failure.json`,JSON.stringify({checks,errors,error:e.stack},null,2));throw e;}finally{await browser.close();}
