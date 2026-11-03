import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {CHIBINA_EVENTS} from '../web/src/data/chibinaEvents.js';
import {advanceChibinaDialogue,chooseChibinaEvent,chibinaDialogueLine,chibinaEventPickerView,chibinaRoomView,chibinaTriggerTags,validateChibinaEvents} from '../web/src/components/chibinaRoom.js';

const app=fs.readFileSync('web/src/components/App.js','utf8');
const css=fs.readFileSync('web/src/components/game.css','utf8');
const build=fs.readFileSync('tools/build.mjs','utf8');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const originalEvents=JSON.parse(fs.readFileSync('assets/chibina-room/events_220.json','utf8'));
const eventById=new Map(CHIBINA_EVENTS.map(event=>[event.id,event]));
const personas=[
 {id:'wing',name:'黒翼',character:'明るい',art:'wing.webp',width:435,height:462},
 {id:'judge',name:'断罪',character:'静か',art:'judge.webp',width:435,height:435},
 {id:'fallen',name:'堕天',character:'強気',art:'fallen.webp',width:435,height:398},
 {id:'abyss',name:'深淵',character:'寡黙',art:'abyss.webp',width:435,height:476},
 {id:'king',name:'堕天王',character:'穏やか',art:'king.webp',width:435,height:476}
];

test('採用済みの220イベントを原本どおり読み込む',()=>{
 assert.deepEqual(CHIBINA_EVENTS,originalEvents);
 const result=validateChibinaEvents();
 assert.equal(result.count,220);
 assert.equal(result.ids.size,220);
 assert.equal(new Set(CHIBINA_EVENTS.map(event=>event.id)).size,220);
 assert.deepEqual(CHIBINA_EVENTS.map(event=>event.id),originalEvents.map(event=>event.id));
 assert.equal(eventById.get('CR-095').rarity,null);
 assert.equal(eventById.get('CR-201').id,'CR-201');
 assert.equal(eventById.get('CR-274').id,'CR-274');
 assert.equal(CHIBINA_EVENTS.reduce((sum,event)=>sum+event.dialogue.length,0),1579);
});

test('speaker, text, cue and event proposals stay unchanged and dialogue advances one line at a time',()=>{
 for(const source of originalEvents){
  const event=eventById.get(source.id);
  assert.deepEqual(event,source,source.id+' exact source fields');
  for(let index=0;index<event.dialogue.length;index++){
   assert.deepEqual(chibinaDialogueLine(event,index),{...event.dialogue[index],index,total:event.dialogue.length});
   assert.equal(advanceChibinaDialogue(event,index),index+1);
  }
  assert.equal(chibinaDialogueLine(event,event.dialogue.length),null);
 }
 assert.throws(()=>advanceChibinaDialogue(eventById.get('CR-001'),-1),/範囲外/);
 assert.equal(CHIBINA_EVENTS.flatMap(event=>event.dialogue).filter(line=>line.cue!==null).length,38);
});

test('natural event selection excludes reserved events and uses 70/25/5 rarity bands',()=>{
 const byRarity=rarity=>CHIBINA_EVENTS.find(event=>event.rarity===rarity);
 for(const [roll,rarity] of [[.1,'日常'],[.8,'珍しい'],[.95,'超レア']]){
  const values=[roll,0];
  const event=chooseChibinaEvent(CHIBINA_EVENTS,{random:()=>values.shift()});
  assert.equal(event.rarity,rarity);
  assert.notEqual(event.id,'CR-095');
  assert.notEqual(event.id,'CR-201');
  assert.notEqual(event.id,'CR-274');
 }
 assert.equal(chooseChibinaEvent([eventById.get('CR-095')]),null);
 assert.ok(byRarity('日常'));
});

test('context tags favor an eligible event matching proximity, rest and recency',()=>{
 const base=eventById.get('CR-001');
 const near={...base,id:'TEST-NEAR',trigger_proposal:'二人が近くを並んで飛ぶ'};
 const unrelated={...base,id:'TEST-OTHER',trigger_proposal:'二人が空を飛ぶ'};
 assert.deepEqual(chibinaTriggerTags(near),['proximity']);
 const selected=chooseChibinaEvent([unrelated,near],{random:()=>0,context:{nearPairs:new Set([near.id]),restingParticipants:[],lastParticipants:[],motionParticipants:[]}});
 assert.equal(selected.id,near.id);
 const resting={...base,id:'TEST-REST',trigger_proposal:'一息ついて静かに休む'};
 assert.deepEqual(chibinaTriggerTags(resting),['rest']);
 const recent={...base,id:'TEST-RECENT',trigger_proposal:'前回の会話の直後に続けて話す'};
 assert.deepEqual(chibinaTriggerTags(recent),['recency']);
});

test('condition-tagged events wait for a matching proximity, rest, recency, motion or isolation context',()=>{
 const base=eventById.get('CR-001');
 const isolated={...base,id:'TEST-ISOLATED',participants:['深淵'],trigger_proposal:'深淵が一人になって、周囲にほかの4人がいない'};
 const readyContext={nearPairs:new Set(),restingParticipants:[],lastParticipants:[],motionParticipants:[],isolatedParticipants:[]};
 assert.ok(chibinaTriggerTags(isolated).includes('isolation'));
 assert.equal(chooseChibinaEvent([isolated],{random:()=>0,context:readyContext}),null);
 assert.equal(chooseChibinaEvent([isolated],{random:()=>0,context:{...readyContext,isolatedParticipants:['深淵']}}).id,isolated.id);
});

test('room view uses official Blackwing layers, existing portraits, and manual bubble controls',()=>{
 const html=chibinaRoomView(personas,'wing','CR-201');
 for(const asset of ['wing-back.webp','wing-front.webp','body.webp'])assert.ok(html.includes(asset),asset+' layer');
 for(const id of personas.map(persona=>persona.id))assert.ok(html.includes(`data-persona="${id}"`),id+' flyer');
 assert.match(html,/data-initial-event="CR-201"/);
 assert.match(fs.readFileSync('web/src/components/chibinaRoom.js','utf8'),/next\.dataset\.roomNext=''/); // next button is created for each displayed line
 assert.match(html,/data-room-home-set/);
 assert.match(html,/data-bubble-layer/);
 assert.doesNotMatch(html,/data-chibina-react/);
 const picker=chibinaEventPickerView((label,action,id)=>`<button data-action="${action}" data-id="${id}">${label}</button>`);
 assert.equal((picker.match(/<option /g)||[]).length,220);
 assert.match(picker,/CR-095/);
 assert.match(picker,/CR-274/);
});

test('Blackwing flight assets stay compact and the CSS separates movement and flap transforms',()=>{
 const layers={
  'assets/home-ui/chibina-flight/wing-back.webp':51114,
  'assets/home-ui/chibina-flight/wing-front.webp':73794,
  'assets/home-ui/chibina-flight/body.webp':184562
 };
 for(const [asset,size] of Object.entries(layers)){
  const bytes=fs.readFileSync(asset);
  assert.equal(bytes.length,size,asset+' expected optimized bytes');
  assert.equal(bytes.toString('ascii',0,4),'RIFF',asset+' WebP');
  assert.equal(bytes.toString('ascii',8,12),'WEBP',asset+' WebP');
 }
 assert.match(css,/\.chibina-flyer\{[^}]*will-change:transform/);
 assert.match(css,/\.chibina-wing-back[^}]*animation:chibina-wing-strokes/);
 assert.match(css,/\.chibina-wing-front[^}]*animation:chibina-wing-strokes/);
 assert.match(css,/@keyframes chibina-wing-strokes\{0%,20%,40%,60%/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.chibina-room-live/);
 assert.match(css,/\.chibina-bubble-text\{[^}]*font-size:16px/);
 assert.match(css,/\.chibina-room-close\{[^}]*min-height:44px/);
 assert.match(css,/\.chibina-room-home \.chibina-home-set\{[^}]*width:auto/);
 assert.match(fs.readFileSync('web/src/components/chibinaRoom.js','utf8'),/5:\[\[\.22,\.45\],\[\.52,\.45\],\[\.82,\.45\]/);
});

test('room routes from home, mounts and destroys one runtime, and the build includes its data and assets',()=>{
 assert.match(app,/class="chibina-room-entry" data-action="nav" data-id="chibina"/);
 assert.match(app,/page==='chibina'\?buildChibinaRoomMarkup\(\)/);
 assert.match(app,/chibinaRoomRuntime\.destroy\(\)/);
 assert.match(app,/mountChibinaRoom\(\$\('#app \[data-chibina-room\]'\)/);
 assert.match(app,/case 'chibinaEventTest'/);
 assert.match(app,/localStorage\.setItem\(CHIBINA_PREFERENCE_KEY,id\)/);
 assert.match(build,/web\/src\/data\/chibinaEvents\.js/);
 assert.match(build,/web\/src\/components\/chibinaRoom\.js/);
 for(const asset of ['wing-back.webp','wing-front.webp','body.webp'])assert.ok(build.includes(asset),asset+' is externalized for hosted build');
 assert.match(build,/Buffer\.byteLength\(html\)>=50\*1000\*1000/);
});
