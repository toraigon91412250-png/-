import {createHash} from 'node:crypto';
const loadedBuildHashes=new Set();
const captureConfigured=new WeakSet(),capturedRequests=new WeakMap();
// Capture the exact HTTP document bytes before handing them unchanged to the browser.
// Large standalone HTML can exceed Chromium's inspector response cache.
export async function configureCapture(page){
 if(captureConfigured.has(page))return;
 await page.route('**/*.html',async route=>{
  if(route.request().resourceType()!=='document'){await route.continue();return;}
  const response=await route.fetch(),body=await response.body();
  capturedRequests.set(route.request(),createHash('sha256').update(body).digest('hex'));
  await route.fulfill({response,body});
 });captureConfigured.add(page);
}
async function captureBuild(response){
 if(!response)throw Error('Game document response missing');
 const hash=capturedRequests.get(response.request())||createHash('sha256').update(await response.body()).digest('hex');
 loadedBuildHashes.add(hash);
 if(loadedBuildHashes.size!==1)throw Error('Game build changed during browser validation; repeat on one stable artifact');
}
export async function openGame(page,url,{source=false}={}){await configureCapture(page);const response=await page.goto(url);if(!source)await captureBuild(response);return response;}
export async function reloadGame(page){const response=await page.reload();await captureBuild(response);return response;}
export function testedHTMLSHA256(){if(loadedBuildHashes.size!==1)throw Error('No single tested game build');return [...loadedBuildHashes][0];}
// Wait for observable UI readiness rather than guessing animation durations.
export async function combatReady(page){
 await page.waitForFunction(()=>!document.querySelector('#cinema.active')&&document.documentElement.dataset.combatBusy!=='true');
}
export async function actionClick(page,action,id,{touch=false,waitForCombat=true}={}){
 await combatReady(page);
 if(action==='fight'&&['ex','stella','final','raid'].includes(id)&&!(await page.locator(`[data-action="fight"][data-id="${id}"]`).filter({visible:true}).count())){
  const hub=page.locator(`[data-action="nav"][data-id="${id==='raid'?'raid':'finale'}"]`).filter({visible:true}).first();await hub[touch?'tap':'click']();
 }
 const target=page.locator(`[data-action="${action}"]${id!==undefined?`[data-id="${id}"]`:''}`).filter({visible:true}).first();
 await target[touch?'tap':'click']();
 if(action==='combat'&&waitForCombat)await combatReady(page);
}
export async function skipOrFinishCinema(page){
 // Reduced motion can finish between the title assertion and the skip click.
 // Resolve a visible skip synchronously; otherwise wait for the already-running completion.
 await page.evaluate(()=>document.querySelector('#cinema.active #skipCinema')?.click());
 await combatReady(page);
}
