import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {activateCooperation} from '../web/src/utils/divinityCooperation.js';
import {freshDivinity} from '../web/src/utils/divinitySave.js';
import {SAVE_KEY} from '../web/src/utils/storage.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const server=createServer(async(req,res)=>{
 try{
  const route=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=path.resolve(root,'.'+(route==='/'?'/index.html':route));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const content=await readFile(file);
  const type=file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'application/octet-stream';
  res.writeHead(200,{'Content-Type':type});res.end(content);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
let page;
try{
 page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);
 const s=activateCooperation(freshDivinity());
 s.started=true;s.floor=20;s.cleared=Array.from({length:20},(_,i)=>i+1);
 s.divinity.infiniteWins=1;s.summonPoints=1000;s.p=1000;
 await page.evaluate(([key,raw])=>localStorage.setItem(key,raw),[SAVE_KEY,JSON.stringify(s)]);
 await page.reload();
 await page.waitForTimeout(250);
 if(await page.locator('button.navbtn[data-id=upgrade]').count()===0){
  const body=(await page.locator('body').textContent()||'').slice(0,800);
  const stored=await page.evaluate(key=>localStorage.getItem(key)?.slice(0,180),SAVE_KEY);
  throw Error('No navigation rendered; body='+body+'; saved='+stored+'; errors='+errors.join('; '));
 }
 await page.locator('button.navbtn[data-id=upgrade]').click();
 await page.locator('button.upgrade-category[data-id=summon]').click();
 await page.locator('button[data-action=resonanceSummon][data-id="10"]').click();
 const modal=page.locator('dialog[open]');
 await modal.waitFor();
 if(!(await modal.textContent()).includes('共鳴召喚 10回'))throw Error('Ten-pull result missing');
 const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
 if(stored.summonPoints!==100)throw Error('Ten-pull points not persisted');
 await modal.locator('button[data-action=close]').click();
 await page.locator('button.navbtn[data-id=home]').click();
 const trial=page.locator('button[data-action=resTrialStart]');
 await trial.waitFor();
 await trial.click();
 await page.getByText('黒翼を狩る白騎士').first().waitFor();
 if(errors.length)throw Error('Browser errors: '+errors.join('; '));
 console.log('Resonance browser smoke: summon, save, trial entrance SUCCESS');
}finally{await page?.close();await browser.close();await new Promise(ok=>server.close(ok));}
