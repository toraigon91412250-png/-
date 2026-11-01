import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const app=fs.readFileSync('web/src/components/App.js','utf8');
const css=fs.readFileSync('web/src/components/game.css','utf8');
const build=fs.readFileSync('tools/build.mjs','utf8');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const assets={
 'assets/home-ui/blackwing-chibi.png':['3bf724dc793224f5b032e32dca5e83633a582b4aa11958ae7ae47d38281e8bd4',1217,1293],
 'assets/home-ui/chibi-danzai.png':['10c393bfe4d78eb1a5aaf498bebea0f91aeace1a8107c4e2a70d851907120bc5',1254,1254],
 'assets/home-ui/chibi-daten.png':['3be0ebd8349f1e09fe2c188b48d42a4c9a28e7cb1a7274d13f63c8dc002fe9e3',1312,1199],
 'assets/home-ui/chibi-datenou.png':['c9a7a7238cdc839e23432bdd5b28a1994feeec2b017b5df73f7c1538904521ee',1199,1312],
 'assets/home-ui/chibi-shinen.png':['cdae2ff342c6a82b956b48e38e086c603eb3026f1d1973c447b7c3c550a3dc25',1199,1312],
 'assets/home-ui/chibina-room-banner.png':['c246d9256bdd0cd50ccda9dfaab954c8fe180a8c2f927c277694b142286a9624',1672,941]
};

test('room artwork retains all six approved source files byte-for-byte',()=>{
 for(const [asset,[expected,width,height]] of Object.entries(assets)){
  const bytes=fs.readFileSync(asset);
  assert.equal(hash(bytes),expected,asset+' checksum');
  assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a',asset+' PNG signature');
  assert.equal(bytes.readUInt32BE(16),width,asset+' width');
  assert.equal(bytes.readUInt32BE(20),height,asset+' height');
  if(asset!=='assets/home-ui/chibina-room-banner.png')assert.equal(bytes[25],6,asset+' retains transparency');
 }
});

test('room entry is the right-hand image card beside the final battle card',()=>{
 const home=app.slice(app.indexOf('function home(a){'),app.indexOf('function selectFinaleDifficulty('));
 assert.match(home,/id:'finale'/);
 assert.match(home,/class="chibina-room-entry" data-action="nav" data-id="chibina" aria-label="ちびーなルームを開く"><img src="\$\{CHIBINA_ROOM_BANNER\}" alt=""/);
 assert.match(app,/const CHIBINA_ROOM_BANNER='assets\/home-ui\/chibina-room-banner\.png'/);
 assert.match(css,/\.chibina-room-entry\{[^}]*aspect-ratio:1672\/941/);
 assert.match(css,/\.chibina-room-entry img\{[^}]*object-fit:contain/);
});

test('the room maps all five personas and keeps image reactions separate from home selection',()=>{
 const rows=[
  ['wing','黒翼','assets/home-ui/blackwing-chibi.png','600ms'],
  ['judge','断罪','assets/home-ui/chibi-danzai.png','500ms'],
  ['fallen','堕天','assets/home-ui/chibi-daten.png','650ms'],
  ['king','堕天王','assets/home-ui/chibi-datenou.png','600ms'],
  ['abyss','深淵','assets/home-ui/chibi-shinen.png','700ms']
 ];
 for(const [id,name,asset,duration] of rows){
  assert.ok(app.includes(`id:'${id}',name:'${name}'`));
  if(id!=='wing')assert.ok(app.includes(`art:'${asset}'`));
  assert.ok(css.includes(`chibina-${id}-react ${duration}`),id+' room reaction');
 }
 const view=app.slice(app.indexOf('function chibinaRoomView()'),app.indexOf('function homeCard('));
 assert.match(view,/data-chibina-react="\$\{persona.id\}"/);
 assert.match(view,/data-action="chibinaSelect"/);
 assert.match(view,/chibinaApply/);
 const select=app.slice(app.indexOf("case 'chibinaSelect':"),app.indexOf("case 'nav':"));
 assert.match(select,/chibinaPendingId=id/);
 assert.match(select,/localStorage\.setItem\(CHIBINA_PREFERENCE_KEY,persona\.id\)/);
 assert.doesNotMatch(select,/persist\(\)/,'persona preference stays separate from the game save');
});

test('persona idle movement differs, reacts once, and respects reduced motion',()=>{
 for(const [id,duration,keyframe] of [
  ['wing','3s','chibina-wing-float'],['judge','4.2s','chibina-judge-float'],['fallen','2.4s','chibina-fallen-float'],['king','5s','chibina-king-float'],['abyss','6s','chibina-abyss-float']
 ]){
  assert.ok(css.includes(`data-persona="${id}"] .chibina-character-art{animation-name:${keyframe};animation-duration:${duration}}`),id+' idle animation');
 }
 assert.match(app,/character\.classList\.contains\('reacting'\)/,'repeated taps are ignored during a reaction');
 assert.match(app,/setTimeout\(\(\)=>character\.classList\.remove\('reacting'\),chibinaPersona\(character\.dataset\.chibinaReact\)\.reactionMs\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[^}]*\.chibina-character-art\{animation:none!important/);
});

test('home preference is independently stored and the room is routed outside home and battle',()=>{
 assert.equal((app.match(/class="home-mascot"/g)||[]).length,1);
 assert.match(app,/const CHIBINA_PREFERENCE_KEY='irena-reborn-chibina-room-v1'/);
 assert.match(app,/function readChibinaHome\(\).*?return 'wing'/);
 assert.match(app,/data-persona="\$\{selectedChibina\.id\}"/);
 assert.match(app,/page==='chibina'\?chibinaRoomView\(\)/);
 assert.match(app,/page==='chibina'\?'chibina-page'/);
 assert.ok(build.includes("'assets/home-ui/blackwing-chibi.png'"));
 for(const asset of Object.keys(assets))assert.ok(build.includes(`'${asset}'`),asset+' is externalized for Pages');
});
