import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';
import {actionClick} from '../../tools/browser-actions.mjs';
const before=process.argv.includes('--before'),checks=[];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const p=await browser.newPage({viewport:{width:390,height:664},reducedMotion:'reduce'});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4181/irena-play.html');
 const click=(a,id)=>actionClick(p,a,id);
 const snapshot=async()=>({turn:await p.locator('.heading .tag').innerText(),hp:await p.locator('.hpnum').allTextContents(),gauge:await p.locator('.gaugebar').evaluate(x=>x.previousElementSibling.innerText),save:await p.evaluate(()=>localStorage.getItem('irena-reborn-v3'))});
 await click('begin');await click('fight','normal');await click('combat','guard');const state=await snapshot();await click('nav','home');
 if(before){await p.locator('.challenge-button').click();assert.match(await p.locator('#toast').innerText(),/進行中の戦闘があります/);checks.push('original collision reproduced');}
 else{
  assert.match(await p.locator('.challenge-button').innerText(),/戦闘に戻る/);checks.push('active battle shows resume');
  assert.equal(await p.locator('.challenge-button').getAttribute('data-action'),'nav');await p.locator('.challenge-button').click();
  assert.deepEqual(await snapshot(),state);checks.push('resume preserves turn HP gauge and save');
  await click('combat','guard');assert.notEqual((await snapshot()).turn,state.turn);checks.push('resumed battle remains playable');
  await click('askRetreat');await click('retreat');await click('nav','home');
  assert.match(await p.locator('.challenge-button').innerText(),/冒険を続ける/);assert.equal(await p.locator('.challenge-button').getAttribute('data-action'),'fight');checks.push('finished battle restores normal adventure');
  await p.locator('.challenge-button').click();assert.match(await p.locator('.heading .tag').innerText(),/TURN 1$/);checks.push('next battle starts normally');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`reports/home-resume-fix/${before?'before':'after'}.json`,JSON.stringify({pass:checks.length,fail:0,checks,errors},null,2));console.log(checks);
}finally{await browser.close();}
