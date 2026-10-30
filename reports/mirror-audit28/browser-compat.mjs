import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
import {actionClick,combatReady} from '../../tools/browser-actions.mjs';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),c=await browser.newContext({viewport:{width:390,height:664},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),p=await c.newPage(),checks=[],errors=[],unverified=[];
const ok=(name,x)=>{assert.ok(x,name);checks.push(name);console.log('PASS',name)};p.on('pageerror',e=>errors.push(e.message));
try{
 unverified.push('file:// blocked by browser environment policy in the preceding attempt');await p.goto('http://127.0.0.1:4248/irena-play.html');await actionClick(p,'begin');ok('standalone HTML opens and begins',await p.getByRole('heading',{name:'帰還の聖域'}).count()===1);
 await actionClick(p,'fight','normal');await actionClick(p,'combat','guard');
 const hp=await p.locator('.hpnum').allTextContents(),gauge=await p.locator('.battle-charge').innerText(),raw=await p.evaluate(()=>JSON.parse(localStorage.getItem('irena-reborn-v3')));ok('normal checkpoint written',!!raw.markBattle);
 await p.reload();await p.getByRole('button',{name:/戦闘に戻る/}).first().click();await combatReady(p);
 assert.deepEqual(await p.locator('.hpnum').allTextContents(),hp);assert.equal(await p.locator('.battle-charge').innerText(),gauge);checks.push('main HP and gauge restored exactly');
 await p.screenshot({path:'reports/mirror-audit28/main-resume.png'});
 await actionClick(p,'askRetreat');await actionClick(p,'retreat');ok('retreat clears checkpoint',!await p.evaluate(()=>JSON.parse(localStorage.getItem('irena-reborn-v3')).markBattle));
 await actionClick(p,'nav','home');await actionClick(p,'nav','dev');await actionClick(p,'enabledev');
 for(const [mode,act]of [['ex','guard'],['stella','guard'],['final','divine']]){
  await actionClick(p,'nav','home');await actionClick(p,'nav','dev');await actionClick(p,'fight',mode);await actionClick(p,'combat',act);ok(mode+' UI and action work',await p.locator('.battle-stage').count()===1);await actionClick(p,'askRetreat');await actionClick(p,'retreat');
 }
 ok('zero JavaScript errors',errors.length===0);
}finally{fs.writeFileSync('reports/mirror-audit28/compat-browser.json',JSON.stringify({checks,errors,unverified},null,2));await browser.close();}
