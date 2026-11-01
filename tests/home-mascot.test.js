import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const asset='assets/home-ui/blackwing-chibi.png';
const app=fs.readFileSync('web/src/components/App.js','utf8');
const css=fs.readFileSync('web/src/components/game.css','utf8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('original black-wing PNG stays unchanged and mascot uses the 435px lossless WebP',()=>{
 const bytes=fs.readFileSync(asset);
 assert.equal(sha(bytes),'3bf724dc793224f5b032e32dca5e83633a582b4aa11958ae7ae47d38281e8bd4');
 assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
 assert.equal(bytes.readUInt32BE(16),1217);
 assert.equal(bytes.readUInt32BE(20),1293);
 assert.equal(bytes[25],6,'RGBA image retains alpha channel');
 const optimized=fs.readFileSync('assets/home-ui/optimized/chibi-wing.webp');
 assert.equal(optimized.toString('ascii',0,4),'RIFF');
 assert.equal(optimized.toString('ascii',8,12),'WEBP');
 assert.equal(optimized.toString('ascii',12,16),'VP8L','lossless WebP image data');
 assert.ok(optimized.length<300000);
});

test('mascot markup exists only in the home view and keeps an accessible tap target',()=>{
 const home=app.slice(app.indexOf('function home(a){'),app.indexOf('function selectFinaleDifficulty('));
 assert.match(home,/class="home-mascot" data-persona="\$\{selectedChibina\.id\}" aria-label="\$\{selectedChibina\.name\}ちびキャラ。1回タップで反応、2回タップで次の目標を案内"/);
 assert.match(home,/src="\$\{selectedChibina\.art\}" alt="" width="\$\{selectedChibina\.width\}" height="\$\{selectedChibina\.height\}"/);
 assert.equal((app.match(/class="home-mascot"/g)||[]).length,1);
 assert.match(app,/const HOME_MASCOT_ART='assets\/home-ui\/optimized\/chibi-wing\.webp'/);
 assert.match(app,/id:'wing',name:'黒翼'.*?art:HOME_MASCOT_ART/);
});

test('float and jump timings, safe-area spacing and mobile-navigation priority are explicit',()=>{
 const rule=css.match(/\.home-mascot\{[^}]+\}/)?.[0]||'';
 assert.ok(rule.includes('position:fixed')&&rule.includes('right:max(10px,env(safe-area-inset-right))')&&rule.includes('width:min(31.25vw,150px)')&&rule.includes('z-index:19'));
 assert.ok(css.includes('.home-mascot-guide{position:fixed')&&css.includes('z-index:21'));
 assert.match(app,/doubleTap=now-lastMascotTapAt<=360/);
 assert.match(app,/if\(doubleTap\)\{mascotGuideOpen=true;render\(\);\}/);
 assert.match(app,/case 'mascotGuideGo':\{const target=mascotGuideTarget\(a\);if\(!target\)throw Error/);
 assert.match(app,/次は第\$\{floor\}階層へ行こうよ。案内するね！/);
 assert.match(app,/次に裁くのは第\$\{floor\}階層だ。/);
 assert.match(app,/次の目標は第\$\{floor\}階層。早くいけ。/);
 assert.match(app,/次なる戦場、第\$\{floor\}階層へ参ろう。案内して差し上げる。/);
 assert.match(app,/……次は、第\$\{floor\}階層。行くなら、触れて。/);
 assert.equal((app.match(/const CHIBINA_PREFERENCE_KEY=/g)||[]).length,1,'guide preference remains separate from saves');
 assert.ok(app.includes('function mascotGuideTarget(a){return nextHomeGoal(a,battle);}'));
 assert.ok(rule.includes('touch-action:manipulation'));

 assert.ok(rule.includes('animation:home-mascot-float 3s ease-in-out infinite'));
 assert.ok(css.includes('@keyframes home-mascot-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}'));
 assert.ok(css.includes('.home-mascot.jumping img{animation:home-mascot-jump 600ms ease-out both}'));
 assert.ok(css.includes('@keyframes home-mascot-jump{0%{transform:translateY(0)}42%{transform:translateY(-12px)}100%{transform:translateY(0)}}'));
 assert.ok(css.includes('@media(max-width:800px){.home-mascot{bottom:calc(80px + env(safe-area-inset-bottom))}}'));
});

test('single tap keeps the existing jump and double tap opens guidance without navigation',()=>{
 assert.match(app,/doubleTap=now-lastMascotTapAt<=360/);
 assert.match(app,/if\(!mascot\.classList\.contains\('jumping'\)\)\{mascot\.classList\.add\('jumping'\);window\.setTimeout\(\(\)=>mascot\.classList\.remove\('jumping'\),chibinaPersona\(mascot\.dataset\.persona\)\.reactionMs\);\}if\(doubleTap\)\{mascotGuideOpen=true;render\(\);\}return;/);
 assert.match(app,/case 'mascotGuideGo':\{const target=mascotGuideTarget\(a\);if\(!target\)throw Error\('今は案内できる目標がありません'\);mascotGuideOpen=false;await handle\(target\.action,target\.id\);break;\}/);
});
