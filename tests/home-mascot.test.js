import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const asset='assets/home-ui/blackwing-chibi.png';
const app=fs.readFileSync('web/src/components/App.js','utf8');
const css=fs.readFileSync('web/src/components/game.css','utf8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('black-wing mascot uses the supplied transparent PNG bytes unchanged',()=>{
 const bytes=fs.readFileSync(asset);
 assert.equal(sha(bytes),'3bf724dc793224f5b032e32dca5e83633a582b4aa11958ae7ae47d38281e8bd4');
 assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
 assert.equal(bytes.readUInt32BE(16),1217);
 assert.equal(bytes.readUInt32BE(20),1293);
 assert.equal(bytes[25],6,'RGBA image retains alpha channel');
});

test('mascot markup exists only in the home view and keeps an accessible tap target',()=>{
 const home=app.slice(app.indexOf('function home(a){'),app.indexOf('function selectFinaleDifficulty('));
 assert.match(home,/class="home-mascot" aria-label="黒翼ちびキャラをタップしてジャンプ"/);
 assert.match(home,/src="\$\{HOME_MASCOT_ART\}" alt="" width="1217" height="1293"/);
 assert.equal((app.match(/class="home-mascot"/g)||[]).length,1);
 assert.match(app,/const HOME_MASCOT_ART='assets\/home-ui\/blackwing-chibi\.png'/);
});

test('float and jump timings, safe-area spacing and mobile-navigation priority are explicit',()=>{
 const rule=css.match(/\.home-mascot\{[^}]+\}/)?.[0]||'';
 assert.ok(rule.includes('position:fixed')&&rule.includes('right:max(10px,env(safe-area-inset-right))')&&rule.includes('width:min(25vw,120px)')&&rule.includes('z-index:19'));
 assert.ok(rule.includes('animation:home-mascot-float 3s ease-in-out infinite'));
 assert.ok(css.includes('@keyframes home-mascot-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}'));
 assert.ok(css.includes('.home-mascot.jumping img{animation:home-mascot-jump 600ms ease-out both}'));
 assert.ok(css.includes('@keyframes home-mascot-jump{0%{transform:translateY(0)}42%{transform:translateY(-12px)}100%{transform:translateY(0)}}'));
 assert.ok(css.includes('@media(max-width:800px){.home-mascot{bottom:calc(80px + env(safe-area-inset-bottom))}}'));
});

test('jump listener ignores repeat taps until its 600ms animation finishes',()=>{
 assert.match(app,/document\.addEventListener\('click',event=>\{const mascot=event\.target\.closest\('\.home-mascot'\);if\(!mascot\|\|mascot\.classList\.contains\('jumping'\)\)return;mascot\.classList\.add\('jumping'\);window\.setTimeout\(\(\)=>mascot\.classList\.remove\('jumping'\),600\);\}\)/);
});
