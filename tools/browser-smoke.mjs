import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/irena-play.html');await page.locator('[data-action="begin"]').click();await page.screenshot({path:'reports/home-desktop.png',fullPage:true});
console.log(JSON.stringify({errors,title:await page.title(),body:(await page.locator('body').innerText()).slice(0,150)}));await browser.close();
