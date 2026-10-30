import fs from 'node:fs';import assert from 'node:assert/strict';
import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';
import {fresh,developerState} from '../../web/src/utils/progression.js';import {validateSave} from '../../web/src/utils/storage.js';
import {openGame,reloadGame,actionClick,testedHTMLSHA256} from '../../tools/browser-actions.mjs';
const out=new URL('./',import.meta.url),checks=[],errors=[];const ok=(name,value)=>{assert.ok(value,name);checks.push(name);};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
for(const width of [320,390]){
 const s=validateSave(developerState(fresh()));s.markEquip=['iron','moon','crown'];s.equipped=['king','judge'];s.talent=1;s.skills={feather:1,destruction:1,ultimate:1};
 const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.addInitScript(s=>{if(!localStorage.getItem('irena-reborn-v3'))localStorage.setItem('irena-reborn-v3',JSON.stringify(s));},s);
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await openGame(p,'http://127.0.0.1:4190/irena-play.html');const tap=(a,id)=>actionClick(p,a,id,{touch:true});
 await tap('openupgrade','marks');ok(width+' all 10 cards',await p.locator('[data-mark]').count()===10);
 for(const title of ['堕天の刻印','堕天王の刻印','断罪の刻印','深淵の刻印','黒翼の刻印','反攻の刻印','終幕の刻印'])ok(width+' '+title,await p.getByRole('heading',{name:title,exact:true}).count()===1);
 ok(width+' no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 ok(width+' mark buttons >=44px',await p.locator('[data-mark] button').evaluateAll(xs=>xs.every(x=>x.getBoundingClientRect().height>=44)));
 await p.screenshot({path:new URL('marks-'+width+'.jpg',out).pathname,fullPage:true});
 await tap('equipMark','moon');await tap('equipMark','moon');ok(width+' equip retained',await p.locator('[data-mark="moon"] small').innerText().then(t=>t.includes('装備中')));
 await tap('nav','home');await tap('fight','ex');await tap('combat','guard');
 const hp=await p.locator('.hpnum').allTextContents(),saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('irena-reborn-v3')));
 ok(width+' checkpoint saved after guard',saved.markBattle?.turns.length===1&&saved.markBattle.turns[0].action==='guard');
 await reloadGame(p);ok(width+' resume link',await p.getByRole('button',{name:/戦闘に戻る/}).count()===1);await p.getByRole('button',{name:/戦闘に戻る/}).tap();
 assert.deepEqual(await p.locator('.hpnum').allTextContents(),hp);checks.push(width+' exact HP restored');
 await tap('combat','slash');const after=await p.evaluate(()=>JSON.parse(localStorage.getItem('irena-reborn-v3')));ok(width+' resumed attack appends once',after.markBattle.turns.length===2&&after.markBattle.turns[1].action==='slash');
 await tap('askRetreat');await tap('retreat');ok(width+' retreat clears checkpoint',!(await p.evaluate(()=>JSON.parse(localStorage.getItem('irena-reborn-v3')))).markBattle);await context.close();
}
ok('zero page errors',errors.length===0);const r={passed:checks.length,failed:0,checks,errors,htmlSHA256:testedHTMLSHA256(),engine:'Chromium',widths:[320,390],iPhoneHardware:false};fs.writeFileSync(new URL('browser.json',out),JSON.stringify(r,null,2));console.log(JSON.stringify(r));
}finally{await browser.close();}
