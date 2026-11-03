import {CHIBINA_EVENTS} from '../data/chibinaEvents.js';

const ROOM_PROGRESS_KEY='irena-reborn-chibina-room-events-v1';
const EVENT_NAMES=new Set(['黒翼','断罪','堕天','深淵','堕天王']);
const WING_ART={back:'assets/home-ui/chibina-flight/wing-back.webp',front:'assets/home-ui/chibina-flight/wing-front.webp',body:'assets/home-ui/chibina-flight/body.webp'};
const PROFILE={
 wing:{speed:48,turn:1.35,rest:.08,restMin:1.2,restMax:2.2,initial:[.21,.23],size:136},
 judge:{speed:25,turn:.9,rest:.31,restMin:2.8,restMax:5.2,initial:[.60,.28],size:88},
 fallen:{speed:61,turn:1.75,rest:.09,restMin:.8,restMax:1.8,initial:[.77,.55],size:84},
 abyss:{speed:19,turn:.68,rest:.44,restMin:3.5,restMax:6.5,initial:[.53,.62],size:84},
 king:{speed:36,turn:1.05,rest:.24,restMin:2.2,restMax:4.2,initial:[.28,.77],size:88}
};
const NAME_ID={'黒翼':'wing','断罪':'judge','堕天':'fallen','深淵':'abyss','堕天王':'king'};
const escapeRoomText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const randomBetween=(a,b)=>a+Math.random()*(b-a);
const clampRoom=(v,min,max)=>Math.max(min,Math.min(max,v));

export function validateChibinaEvents(events=CHIBINA_EVENTS){
 if(!Array.isArray(events)||events.length!==220)throw Error('ちびーなイベントは220件必要です');
 const ids=new Set();
 for(const event of events){
  if(!event||typeof event.id!=='string'||ids.has(event.id))throw Error('会話IDが欠落または重複しています');
  ids.add(event.id);
  if(!Array.isArray(event.participants)||event.participants.length<1||event.participants.length>5||event.participants.some(name=>!EVENT_NAMES.has(name)))throw Error(event.id+' 参加者データが不正です');
  const allowedSpeakers=new Set([...event.participants,...(Array.isArray(event.distant_speakers)?event.distant_speakers:[])]);
  if(!Array.isArray(event.dialogue)||event.dialogue.length<1||event.dialogue.some(line=>!EVENT_NAMES.has(line.speaker)||!allowedSpeakers.has(line.speaker)||typeof line.text!=='string'||!line.text.trim()||!(line.cue===null||typeof line.cue==='string')))throw Error(event.id+' 会話データが不正です');
  if(typeof event.trigger_proposal!=='string'||!event.animation_proposal||typeof event.animation_proposal.motion!=='string'||typeof event.animation_proposal.expression!=='string'||typeof event.animation_proposal.afterglow!=='string')throw Error(event.id+' 演出提案が不足しています');
 }
 if(!ids.has('CR-095')||!ids.has('CR-274')||!ids.has('CR-201'))throw Error('重要イベントが不足しています');
 return {count:events.length,ids};
}
validateChibinaEvents();

export function chibinaDialogueLine(event,index){
 const line=event?.dialogue?.[index];
 if(!line)return null;
 return {speaker:line.speaker,cue:line.cue,text:line.text,index,total:event.dialogue.length};
}
export function advanceChibinaDialogue(event,index){
 if(!event||!Array.isArray(event.dialogue)||!Number.isInteger(index)||index<0||index>=event.dialogue.length)throw Error('セリフ位置が範囲外です');
 return index+1;
}
export function chibinaTriggerTags(event){
 const text=event.trigger_proposal||'';const tags=[];
 if(/近く|近づ|近距離|隣|そば|距離|寄り|並走|並ん|同じ方向|一緒/.test(text))tags.push('proximity');
 if(/周囲.{0,25}(?:いない|いません)|ほかの.{0,15}いない|一人になって|誰もいない/.test(text))tags.push('isolation');
 if(/休憩|休ん|眠|静か|止ま|一息|じっと/.test(text))tags.push('rest');
 if(/直後|直前|終了後|前回|続けて|さっき|先ほど|次を/.test(text))tags.push('recency');
 if(/全員|五人|5人|全て|揃|集ま/.test(text))tags.push('group');
 if(/初回|初めて|はじめて/.test(text))tags.push('first');
 if(/飛行|飛ん|方向|速度|回転|羽ばた/.test(text))tags.push('motion');
 return tags.length?tags:['participant'];
}

export function chibinaEventPickerView(button,escape=escapeRoomText){
 return `<section class="card chibina-event-picker"><h2>ちびーな会話の個別再生</h2><p>採用済み220本をIDで直接選びます。テスト再生は進行データに記録しません。</p><label for="chibina-event-id">イベント</label><select id="chibina-event-id">${CHIBINA_EVENTS.map(event=>`<option value="${escape(event.id)}">${escape(event.id)} · ${escape(event.title)}</option>`).join('')}</select><div class="row">${button('選択イベントを再生','chibinaEventTest','','ghost')}</div><small>CR-095を含む全イベントを指定可能。rarity=nullは通常抽選ではなく、初回の優先再生で確認できます。</small></section>`;
}

export function chibinaRoomView(personas,selectedId='wing',initialEventId=''){
 const selected=personas.find(p=>p.id===selectedId)||personas[0];
 const flyers=personas.map(persona=>{
  const profile=PROFILE[persona.id];
  const art=persona.id==='wing'
   ? `<span class="chibina-wing-art" aria-hidden="true"><img class="chibina-wing-layer chibina-wing-back" src="${WING_ART.back}" alt="" draggable="false"><img class="chibina-wing-layer chibina-wing-front" src="${WING_ART.front}" alt="" draggable="false"><img class="chibina-wing-layer chibina-wing-body" src="${WING_ART.body}" alt="" draggable="false"></span>`
   : `<img class="chibina-room-art" src="${escapeRoomText(persona.art)}" alt="" width="${persona.width}" height="${persona.height}" draggable="false" decoding="async">`;
  return `<div class="chibina-flyer ${persona.id==='wing'?'is-wing':''} ${persona.id===selected.id?'is-home-persona is-selected':''}" data-persona="${persona.id}" data-facing="right" style="--flyer-size:${profile.size}px;left:0;top:0"><button type="button" class="chibina-flyer-tap" data-chibina-select="${persona.id}" aria-label="${escapeRoomText(persona.name)}を選択して反応を見る"><span class="chibina-flyer-orient"><span class="chibina-reaction-layer">${art}</span></span></button><span class="chibina-nameplate">${escapeRoomText(persona.name)}</span></div>`;
 }).join('');
 return `<section class="chibina-room chibina-room-live" data-chibina-room data-home-id="${escapeRoomText(selected.id)}" data-initial-event="${escapeRoomText(initialEventId)}" aria-label="ちびーなルーム"><header class="chibina-room-header"><div class="chibina-room-title"><span class="tag">FIVE PERSONAS / ROOM</span><h1>ちびーなルーム</h1><small>タップで反応。会話は「次へ」で一行ずつ読めます。</small></div><button type="button" class="chibina-room-close" data-action="nav" data-id="home" aria-label="ちびーなルームを閉じてホームへ戻る">‹ ホーム</button></header><div class="chibina-flight-area" data-flight-area aria-label="5人が飛び回る部屋"><div class="chibina-room-glow" aria-hidden="true"></div><div class="chibina-room-floor" aria-hidden="true"></div>${flyers}<div class="chibina-bubble-layer" data-bubble-layer aria-live="polite" aria-atomic="true"></div></div><footer class="chibina-room-footer"><div class="chibina-room-status" data-room-status role="status" aria-live="polite">五人が、それぞれの速さで飛んでいる。</div><div class="chibina-room-home"><div><small>ホームに表示するキャラ</small><strong data-room-home-name>${escapeRoomText(selected.name)}</strong></div><button type="button" class="chibina-home-set" data-room-home-set ${selected.id===personas[0].id?'disabled':''}>この子をホームに設定</button></div></footer></section>`;
}
export const renderChibinaRoomView=chibinaRoomView;

function readRoomProgress(){
 try{
  const value=JSON.parse(localStorage.getItem(ROOM_PROGRESS_KEY)||'null');
  if(value&&typeof value==='object')return {introSeen:value.introSeen===true,recent:Array.isArray(value.recent)?value.recent.filter(id=>CHIBINA_EVENTS.some(e=>e.id===id)).slice(-16):[],lastId:typeof value.lastId==='string'?value.lastId:'',played:Number.isInteger(value.played)?value.played:0};
 }catch{}
 return {introSeen:false,recent:[],lastId:'',played:0};
}
function writeRoomProgress(progress){try{localStorage.setItem(ROOM_PROGRESS_KEY,JSON.stringify(progress));}catch{/* Session-local room still works if storage is blocked. */}}
function triggerScore(event,context){
 const tags=chibinaTriggerTags(event);let score=0;
 if(tags.includes('proximity')&&!tags.includes('isolation')&&context.nearPairs.has(event.id))score+=3;
 if(tags.includes('isolation')&&context.isolatedParticipants?.some(name=>event.participants.includes(name)))score+=3;
 if(tags.includes('rest')&&context.restingParticipants.some(name=>event.participants.includes(name)))score+=2;
 if(tags.includes('recency')&&context.lastParticipants.some(name=>event.participants.includes(name)))score+=3;
 if(tags.includes('group')&&event.participants.length>=3)score+=1;
 if(tags.includes('motion')&&context.motionParticipants.some(name=>event.participants.includes(name)))score+=1;
 return score;
}
function contextReady(event,context){
 const known=context&&context.nearPairs instanceof Set&&Array.isArray(context.restingParticipants)&&Array.isArray(context.lastParticipants)&&Array.isArray(context.motionParticipants);
 if(!known)return true;
 const tags=chibinaTriggerTags(event),gates=[];
 if(tags.includes('isolation'))gates.push(!!context.isolatedParticipants?.some(name=>event.participants.includes(name)));
 if(tags.includes('proximity')&&!tags.includes('isolation'))gates.push(context.nearPairs.has(event.id));
 if(tags.includes('rest'))gates.push(context.restingParticipants.some(name=>event.participants.includes(name)));
 if(tags.includes('recency'))gates.push(context.lastParticipants.some(name=>event.participants.includes(name)));
 if(tags.includes('motion'))gates.push(context.motionParticipants.some(name=>event.participants.includes(name)));
 return !gates.length||gates.some(Boolean);
}
export function chooseChibinaEvent(events,{recent=[],lastId='',random=Math.random,context={}}={}){
 let pool=events.filter(event=>event.id!=='CR-095'&&event.id!=='CR-201'&&event.id!=='CR-274'&&['日常','珍しい','超レア'].includes(event.rarity)&&!recent.includes(event.id));
 if(!pool.length)pool=events.filter(event=>event.id!=='CR-095'&&event.id!=='CR-201'&&event.id!=='CR-274'&&['日常','珍しい','超レア'].includes(event.rarity));
 if(context&&context.nearPairs instanceof Set&&Array.isArray(context.restingParticipants)&&Array.isArray(context.lastParticipants)&&Array.isArray(context.motionParticipants))pool=pool.filter(event=>contextReady(event,context));
 if(!pool.length)return null;
 const buckets=[['日常',70],['珍しい',25],['超レア',5]],total=buckets.reduce((n,[rarity,weight])=>n+(pool.some(e=>e.rarity===rarity)?weight:0),0);let roll=random()*total;let rarity=buckets.at(-1)[0];
 for(const [candidate,weight] of buckets){if(!pool.some(e=>e.rarity===candidate))continue;roll-=weight;if(roll<0){rarity=candidate;break;}}
 let candidates=pool.filter(event=>event.rarity===rarity);
 if(context&&context.nearPairs instanceof Set&&context.restingParticipants&&context.lastParticipants){const max=Math.max(...candidates.map(e=>triggerScore(e,context)));if(max>0)candidates=candidates.filter(e=>triggerScore(e,context)===max);}
 const candidate=candidates[Math.floor(random()*candidates.length)];return candidate||pool[0];
}

export function mountChibinaRoom(root,{personas,selectedId='wing',initialEventId='',onHomeSelect=()=>{}}={}){
 if(!root)return {destroy(){}};
 const area=root.querySelector('[data-flight-area]'),bubbleLayer=root.querySelector('[data-bubble-layer]'),status=root.querySelector('[data-room-status]');
 const flyers=new Map([...root.querySelectorAll('.chibina-flyer')].map(el=>[el.dataset.persona,el]));
 const progress=readRoomProgress(),eventMap=new Map(CHIBINA_EVENTS.map(event=>[event.id,event]));
 const initial=eventMap.get(initialEventId)||null,debugMode=!!initial;
 const bounds=area.getBoundingClientRect(),rect={width:bounds.width,height:bounds.height};
 const state={phase:'idle',event:null,cursor:0,pendingId:initial?.id||(!progress.introSeen?'CR-095':''),afterglow:0,idle:0,nextDraw:debugMode?0:10,lockedUntil:0,elapsed:0,lastEventParticipants:[],fallenRejections:0,fallenApart:0,selectedId,homeId:selectedId,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,debugMode};
 const oldBodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 const profiles=personas.map(persona=>({persona,profile:PROFILE[persona.id]}));
 let frame=0,lastFrame=0,resizeObserver=null,destroyed=false,bubble=null,currentBubbleLine=null;
 for(const {persona,profile} of profiles){const el=flyers.get(persona.id);if(!el)continue;const [x,y]=profile.initial;el._flight={x:rect.width*x,y:rect.height*y,vx:persona.id==='wing'?14:persona.id==='judge'?5:persona.id==='fallen'?18:persona.id==='abyss'?2:8,vy:0,targetX:rect.width*x,targetY:rect.height*y,rest:randomBetween(.6,2.5),resting:false,restFor:0,randFor:randomBetween(1,3),width:profile.size,height:persona.id==='wing'?profile.size*.5:profile.size*1.08};el.style.setProperty('--flyer-size',profile.size+'px');}
 const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
 function updateRect(){const previous={...rect},r=area.getBoundingClientRect();rect.width=r.width;rect.height=r.height;if(previous.width&&previous.height){const scaleX=rect.width/previous.width,scaleY=rect.height/previous.height;for(const el of flyers.values()){const p=el._flight;if(!p)continue;p.x*=scaleX;p.y*=scaleY;p.targetX*=scaleX;p.targetY*=scaleY;}}for(const [id,el] of flyers){const p=el._flight;if(!p)continue;if(id==='wing'){const size=window.innerWidth<=350?118:136;if(p.width!==size){p.width=size;p.height=size*.5;el.style.setProperty('--flyer-size',size+'px');}}place(el);}if(currentBubbleLine)positionBubble();}
 function place(el){const p=el._flight;if(!p)return;const w=rect.width,h=rect.height,hw=p.width/2,hh=p.height/2;p.x=clampRoom(p.x,hw+4,w-hw-4);p.y=clampRoom(p.y,hh+24,h-hh-18);el.style.transform=`translate3d(${p.x}px,${p.y}px,0) translate(-50%,-50%)`;el.style.zIndex=String(Math.round(p.y));}
 function chooseTarget(el,partnerBias=.25){
  const p=el._flight,persona=el.dataset.persona,profile=PROFILE[persona];if(!p)return;
  const w=rect.width||390,h=rect.height||560;
  if(Math.random()<partnerBias&&(persona==='wing'||persona==='judge'||persona==='fallen'||persona==='abyss')){
   const pair=flyers.get(persona==='wing'?'judge':persona==='judge'?'wing':persona==='fallen'?'abyss':'fallen'),q=pair?._flight;
   if(q){const angle=randomBetween(0,Math.PI*2),distance=randomBetween(92,142);p.targetX=clampRoom(q.x+Math.cos(angle)*distance,p.width*.6,w-p.width*.6);p.targetY=clampRoom(q.y+Math.sin(angle)*distance,p.height*.7,h-p.height*.7);p.randFor=randomBetween(2.5,5);return;}
  }
  const angle=randomBetween(0,Math.PI*2),distance=randomBetween(w*.12,w*.33);
  p.targetX=clampRoom(p.x+Math.cos(angle)*distance,p.width*.58,w-p.width*.58);p.targetY=clampRoom(p.y+Math.sin(angle)*distance*.72,p.height*.72,h-p.height*.72);p.randFor=randomBetween(2,5.2);
  p.resting=Math.random()<profile.rest;p.restFor=p.resting?randomBetween(profile.restMin,profile.restMax):0;
  if(p.resting){p.targetX=p.x;p.targetY=p.y;}
 }
 function pairDistance(a,b){const pa=flyers.get(a)?._flight,pb=flyers.get(b)?._flight;return pa&&pb?Math.hypot(pa.x-pb.x,pa.y-pb.y):Infinity;}
 function contextFor(events){
  const nearPairs=new Set(),restingParticipants=[],motionParticipants=[],isolatedParticipants=[];
  for(const event of events){
   const name=event.participants[0];
   const paired=event.participants.length>1&&event.participants.some((participant,i)=>event.participants.slice(i+1).some(other=>pairDistance(NAME_ID[participant],NAME_ID[other])<150));
   const soloNear=event.participants.length===1&&personas.some(persona=>persona.name!==name&&pairDistance(NAME_ID[name],persona.id)<150);
   if(paired||soloNear)nearPairs.add(event.id);
   if(event.participants.length===1&&personas.filter(persona=>persona.name!==name).every(persona=>pairDistance(NAME_ID[name],persona.id)>=150))isolatedParticipants.push(name);
  }
  for(const [id,el] of flyers){const name=personas.find(p=>p.id===id)?.name;if(el._flight?.resting)restingParticipants.push(name);if(Math.hypot(el._flight?.vx||0,el._flight?.vy||0)>20)motionParticipants.push(name);}
  return {nearPairs,restingParticipants,lastParticipants:state.lastEventParticipants,motionParticipants,isolatedParticipants};
 }
 function allParticipantsStillClose(event){
  return event.participants.every((name,i)=>event.participants.slice(i+1).every(other=>pairDistance(NAME_ID[name],NAME_ID[other])<180));
 }
 function special274Ready(){
  const w=rect.width||390;const wing=flyers.get('wing')._flight,judge=flyers.get('judge')._flight,fallen=flyers.get('fallen')._flight,abyss=flyers.get('abyss')._flight,king=flyers.get('king')._flight;
  const pairA=Math.hypot(wing.x-judge.x,wing.y-judge.y)<w*.39,pairB=Math.hypot(fallen.x-abyss.x,fallen.y-abyss.y)<w*.34;
  const parallel=Math.abs(wing.vx-judge.vx)<46&&Math.abs(wing.vy-judge.vy)<35,slow=Math.hypot(fallen.vx,fallen.vy)<45&&Math.hypot(abyss.vx,abyss.vy)<40;
  const midpointX=(fallen.x+abyss.x)/2,midpointY=(fallen.y+abyss.y)/2,kingApart=Math.hypot(king.x-midpointX,king.y-midpointY)>w*.22;
  return pairA&&pairB&&parallel&&slow&&kingApart;
 }

 function naturalEvent(){
  if(!progress.introSeen&&!state.debugMode)return eventMap.get('CR-095');
  if(!state.debugMode&&state.fallenRejections>=1&&state.fallenApart>=4&&!progress.recent.includes('CR-201'))return eventMap.get('CR-201');
  if(!state.debugMode&&special274Ready()&&!progress.recent.includes('CR-274')&&Math.random()<.035)return eventMap.get('CR-274');
  const candidates=CHIBINA_EVENTS.filter(event=>event.participants.every(name=>NAME_ID[name]));
  const context=contextFor(candidates);
  return chooseChibinaEvent(candidates,{recent:progress.recent,lastId:progress.lastId,context});
 }
 function gatherTargets(event){
  const specials=event.id==='CR-274'?{wing:[.22,.42],judge:[.49,.42],fallen:[.62,.66],abyss:[.85,.66],king:[.47,.91]}:null;
  if(specials){for(const [id,[x,y]] of Object.entries(specials)){const p=flyers.get(id)?._flight;if(p){p.targetX=clampRoom(rect.width*x,p.width*.6,rect.width-p.width*.6);p.targetY=clampRoom(rect.height*y,p.height*.7,rect.height-p.height*.7);p.resting=false;p.restFor=0;p.vx=0;p.vy=0;}}return;}
  const names=event.participants,layouts={1:[[.5,.58]],2:[[.32,.54],[.68,.54]],3:[[.18,.49],[.5,.47],[.82,.49]],4:[[.3,.44],[.7,.44],[.3,.72],[.7,.72]],5:[[.22,.45],[.52,.45],[.82,.45],[.36,.72],[.68,.72]]};
  const positions=layouts[names.length]||layouts[5];
  names.forEach((name,index)=>{const [x,y]=positions[index],p=flyers.get(NAME_ID[name])?._flight;if(!p)return;p.targetX=clampRoom(rect.width*x,p.width*.6,rect.width-p.width*.6);p.targetY=clampRoom(rect.height*y,p.height*.7,rect.height-p.height*.7);p.resting=false;p.restFor=0;p.vx=0;p.vy=0;});
  for(const [id,el] of flyers){if(names.includes(personas.find(persona=>persona.id===id)?.name))continue;const p=el._flight,centerX=rect.width*.5,centerY=rect.height*.52,dx=p.x-centerX,dy=p.y-centerY,length=Math.max(1,Math.hypot(dx,dy));p.targetX=clampRoom(centerX+dx/length*rect.width*.35,p.width*.6,rect.width-p.width*.6);p.targetY=clampRoom(Math.max(centerY+dy/length*rect.height*.34,rect.height*.4),p.height*.7,rect.height-p.height*.7);}
 }
 function beginGather(event,isDebug=false){
  if(!event||destroyed)return;state.event=event;state.phase='gather';state.elapsed=0;state.cursor=0;state.debugMode=state.debugMode||isDebug;state.pendingId='';root.dataset.eventId=event.id;root.dataset.phase='gather';root.classList.add('is-gathering');bubbleLayer.replaceChildren();bubble=null;currentBubbleLine=null;status.textContent=`${event.title} · みんなが近づいている。`;
  for(const [id,flyer] of flyers){const name=personas.find(persona=>persona.id===id)?.name;flyer.classList.toggle('is-participant',event.participants.includes(name));flyer.classList.remove('is-speaking','has-cue');}
  gatherTargets(event);
 }
 function eventContextNote(event){
  if(event.id==='CR-201')return '堕天は深淵の誘いを断られ、離れたまま少し待っていた。';
  if(event.id==='CR-274')return '黒翼と断罪、堕天と深淵がそれぞれ近くを飛び、堕天王は少し離れている。';
  const tags=chibinaTriggerTags(event);if(tags.includes('rest'))return '休憩や静かな間をきっかけに、みんなが集まってきた。';if(tags.includes('recency'))return 'さっきの出来事の余韻から、次の会話が始まる。';if(tags.includes('proximity'))return '近くを飛んでいた仲間が、自然に声をかけた。';return '';
 }
 function cueKind(cue){if(!cue)return '';if(/小声|声をほんの少し|心の声/.test(cue))return 'whisper';if(/飛び出|加速|大きく羽ばた|勢い/.test(cue))return 'burst';if(/止ま|目を閉|少し離れ/.test(cue))return 'still';if(/回転|半回転|旋回/.test(cue))return 'turn';return 'soft';}
 function displayLine(index){
  const line=chibinaDialogueLine(state.event,index);if(!line)return;
  state.cursor=index;root.dataset.phase='dialogue';root.dataset.line=String(index+1);state.phase='dialogue';
  for(const [id,flyer] of flyers){flyer.classList.toggle('is-speaking',NAME_ID[line.speaker]===id);flyer.classList.remove('has-cue','cue-whisper','cue-burst','cue-still','cue-turn','cue-soft');}
  const speakerId=NAME_ID[line.speaker],speaker=flyers.get(speakerId);if(speaker&&line.cue){speaker.classList.add('has-cue','cue-'+cueKind(line.cue));}
  bubbleLayer.replaceChildren();bubble=document.createElement('aside');bubble.className='chibina-dialogue-bubble';bubble.dataset.tail='down';bubble.setAttribute('role','group');bubble.setAttribute('aria-label',line.speaker+'の会話');
  const title=document.createElement('strong');title.className='chibina-bubble-speaker';title.textContent=line.speaker;
  const cue=document.createElement('small');cue.className='chibina-bubble-cue';cue.textContent=line.cue?`演出 · ${line.cue}`:'';cue.hidden=!line.cue;
  const text=document.createElement('p');text.className='chibina-bubble-text';text.textContent=line.text;
  const next=document.createElement('button');next.type='button';next.className='chibina-bubble-next';next.dataset.roomNext='';next.setAttribute('aria-label',line.speaker+'のセリフを読んだ。次へ進む');next.innerHTML='次へ <span aria-hidden="true">›</span>';
  bubble.append(title,cue,text,next);bubbleLayer.append(bubble);currentBubbleLine=line;status.textContent=`${state.event.title} · ${line.index+1} / ${line.total}`;positionBubble();
 }
 function positionBubble(){
  if(!bubble||!currentBubbleLine)return;const speaker=flyers.get(NAME_ID[currentBubbleLine.speaker]),areaBox=area.getBoundingClientRect();if(!speaker)return;
  const person=speaker.getBoundingClientRect(),width=bubble.offsetWidth,height=bubble.offsetHeight,safe=10,maxLeft=Math.max(safe,areaBox.width-width-safe),maxTop=Math.max(safe,areaBox.height-height-safe);
  const centerLeft=clampRoom(areaBox.width/2-width/2,safe,maxLeft),speakerLeft=clampRoom(person.left+person.width/2-areaBox.left-width/2,safe,maxLeft);
  const above=person.top-areaBox.top-height-12,below=person.bottom-areaBox.top+12;
  const candidates=[
   {left:centerLeft,top:safe},
   {left:speakerLeft,top:above},
   {left:speakerLeft,top:below},
   {left:centerLeft,top:maxTop}
  ];
  const boxes=[...flyers.values()].map(el=>el.getBoundingClientRect());
  let best=null;
  for(const candidate of candidates){candidate.left=clampRoom(candidate.left,safe,maxLeft);candidate.top=clampRoom(candidate.top,safe,maxTop);let overlap=0;
   for(const box of boxes){const w=Math.max(0,Math.min(areaBox.left+candidate.left+width,box.right+6)-Math.max(areaBox.left+candidate.left,box.left-6));const h=Math.max(0,Math.min(areaBox.top+candidate.top+height,box.bottom+6)-Math.max(areaBox.top+candidate.top,box.top-6));overlap+=w*h;}
   const distance=Math.hypot(areaBox.left+candidate.left+width/2-(person.left+person.width/2),areaBox.top+candidate.top+height/2-(person.top+person.height/2));candidate.score=overlap*100+distance;
   if(!best||candidate.score<best.score)best=candidate;
  }
  const bubbleBottom=areaBox.top+best.top+height,tail=bubbleBottom<=person.top?'down':areaBox.top+best.top>=person.bottom?'up':best.top<person.top-areaBox.top?'down':'up';
  bubble.style.left=best.left+'px';bubble.style.top=best.top+'px';bubble.style.setProperty('--bubble-tail-x',clampRoom(person.left+person.width/2-areaBox.left-best.left,16,width-16)+'px');bubble.dataset.tail=tail;
 }
 function finishEvent(){
  const event=state.event;if(!event)return;
  state.lastEventParticipants=event.participants.slice();state.phase='afterglow';state.afterglow=event.id==='CR-274'?randomBetween(5,8):4.5;root.dataset.phase='afterglow';root.classList.remove('is-gathering');root.classList.add('is-afterglow');bubbleLayer.replaceChildren();bubble=null;currentBubbleLine=null;
  if(!state.debugMode){progress.recent=[...progress.recent.filter(id=>id!==event.id),event.id].slice(-16);progress.lastId=event.id;progress.played++;if(event.id==='CR-095')progress.introSeen=true;if(event.id==='CR-060')state.fallenRejections++;writeRoomProgress(progress);}
  const note=eventContextNote(event);status.textContent=(note?note+' ':'')+(event.animation_proposal.afterglow||'会話の余韻を残し、自由飛行へ戻る。');
  for(const flyer of flyers.values())flyer.classList.remove('is-speaking','is-participant','has-cue','cue-whisper','cue-burst','cue-still','cue-turn','cue-soft');
  state.event=null;state.phase='afterglow';state.idle=0;
 }
 function advanceLine(){
  if(state.phase!=='dialogue'||performance.now()<state.lockedUntil)return;state.lockedUntil=performance.now()+260;
  const next=advanceChibinaDialogue(state.event,state.cursor);if(next>=state.event.dialogue.length)finishEvent();else displayLine(next);
 }
 function selectCharacter(id){
  if(!flyers.has(id))return;state.selectedId=id;root.dataset.selectedId=id;
  const persona=personas.find(p=>p.id===id);root.querySelector('[data-room-home-name]').textContent=persona.name;
  for(const [key,flyer] of flyers)flyer.classList.toggle('is-selected',key===id);
  const homeButton=root.querySelector('[data-room-home-set]');homeButton.disabled=id===state.homeId;homeButton.textContent=homeButton.disabled?'ホーム設定中':'この子をホームに設定';
  const p=flyers.get(id)._flight;if(p){p.targetX=clampRoom(p.x+randomBetween(-30,30),p.width*.6,rect.width-p.width*.6);p.targetY=clampRoom(p.y-randomBetween(15,35),p.height*.7,rect.height-p.height*.7);p.resting=false;}
 }
 function setHome(){
  const id=state.selectedId;if(!id)return;const persona=personas.find(p=>p.id===id);if(!persona)return;
  try{localStorage.setItem('irena-reborn-chibina-room-v1',id);}catch{}
  state.homeId=id;onHomeSelect(id);for(const [key,flyer] of flyers)flyer.classList.toggle('is-home-persona',key===id);status.textContent=`${persona.name}をホームに設定した。`;
  const btn=root.querySelector('[data-room-home-set]');btn.disabled=true;btn.textContent='ホーム設定中';
 }
 function clickHandler(event){
  const next=event.target.closest('[data-room-next]');if(next){advanceLine();return;}
  const select=event.target.closest('[data-chibina-select]');if(select){selectCharacter(select.dataset.chibinaSelect);const flyer=select.closest('.chibina-flyer');flyer?.classList.remove('is-reacting');void flyer?.offsetWidth;flyer?.classList.add('is-reacting');return;}
  if(event.target.closest('[data-room-home-set]'))setHome();
 }
 function startDialogue(){
  if(!state.event)return;state.phase='dialogue';state.elapsed=0;root.classList.remove('is-gathering');root.classList.remove('is-afterglow');for(const [id,flyer] of flyers){const name=personas.find(persona=>persona.id===id)?.name;if(state.event.participants.includes(name)){const p=flyer._flight;p.targetX=p.x;p.targetY=p.y;p.vx=0;p.vy=0;}}displayLine(0);
 }
 function updatePhysics(dt){
  if(!rect.width||!rect.height)return;const reduced=state.reduced;const gathering=state.phase==='gather';
  for(const [id,el] of flyers){const p=el._flight,profile=PROFILE[id];if(!p)continue;
   if(state.phase==='idle'&&!state.event){p.randFor-=dt;if(p.resting){p.restFor-=dt;if(p.restFor<=0){p.resting=false;chooseTarget(el,id==='wing'||id==='judge'||id==='fallen'||id==='abyss'?.38:.12);}}else if(p.randFor<=0)chooseTarget(el,id==='wing'||id==='judge'||id==='fallen'||id==='abyss'?.38:.12);}
   if(reduced&&!gathering){p.vx*=Math.max(0,1-dt*1.8);p.vy*=Math.max(0,1-dt*1.8);place(el);continue;}
   const dx=(p.targetX-p.x),dy=(p.targetY-p.y),distance=Math.hypot(dx,dy);let desiredX=0,desiredY=0;
   const name=personas.find(persona=>persona.id===id)?.name,dialogueParticipant=state.phase==='dialogue'&&state.event?.participants.includes(name),speedScale=gathering?1.4:dialogueParticipant?.24:state.phase==='dialogue'?.48:state.phase==='afterglow'?.38:1;if(distance>3){desiredX=dx/distance*profile.speed*speedScale;desiredY=dy/distance*profile.speed*speedScale;}const steer=Math.min(1,dt*profile.turn*(gathering?3:1));p.vx+=(desiredX-p.vx)*steer;p.vy+=(desiredY-p.vy)*steer;p.x+=p.vx*dt;p.y+=p.vy*dt;
   const marginX=p.width*.52,marginY=p.height*.55;if(p.x<marginX){p.x=marginX;p.targetX=Math.max(marginX+26,p.targetX);}if(p.x>rect.width-marginX){p.x=rect.width-marginX;p.targetX=Math.min(rect.width-marginX-26,p.targetX);}if(p.y<marginY+16){p.y=marginY+16;p.targetY=Math.max(marginY+34,p.targetY);}if(p.y>rect.height-marginY-8){p.y=rect.height-marginY-8;p.targetY=Math.min(rect.height-marginY-30,p.targetY);}
   if(Math.abs(p.vx)>4){el.dataset.facing=p.vx<0?'left':'right';}
  }
  const rows=state.phase==='gather'||state.phase==='dialogue'?[]:[...flyers.values()];for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
   const a=rows[i]._flight,b=rows[j]._flight,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=(Math.max(a.width,a.height)+Math.max(b.width,b.height))*.27;
   if(d>0&&d<min){const force=(min-d)*Math.min(1,dt*2.4),nx=dx/d,ny=dy/d;a.vx-=nx*force*2.5;a.vy-=ny*force*2.5;b.vx+=nx*force*2.5;b.vy+=ny*force*2.5;a.x-=nx*force*.5;a.y-=ny*force*.5;b.x+=nx*force*.5;b.y+=ny*force*.5;}
  }
  for(const flyer of flyers.values())place(flyer);
 }
 function update(dt){
  if(destroyed)return;state.elapsed+=dt;updatePhysics(dt);
  if(!state.event&&state.fallenRejections&&pairDistance('fallen','abyss')>(rect.width||390)*.31)state.fallenApart+=dt;else if(pairDistance('fallen','abyss')<=(rect.width||390)*.31)state.fallenApart=0;
  if(state.phase==='idle'){
   state.idle+=dt;
   if(state.pendingId){const event=eventMap.get(state.pendingId);state.pendingId='';beginGather(event,state.debugMode);return;}
   if(state.idle>=state.nextDraw){const event=naturalEvent();if(event){beginGather(event);return;}state.nextDraw=state.idle+12;}
  }else if(state.phase==='gather'){
   const arrived=state.event.participants.every(name=>{const p=flyers.get(NAME_ID[name])?._flight;return p&&Math.hypot(p.targetX-p.x,p.targetY-p.y)<22&&Math.hypot(p.vx,p.vy)<42;});
   if((arrived&&state.elapsed>.75)||state.elapsed>7.5||state.reduced)startDialogue();
  }else if(state.phase==='afterglow'){
   state.afterglow-=dt;
   if(state.afterglow<=0){root.classList.remove('is-afterglow');root.dataset.phase='idle';status.textContent='五人が、それぞれの速さで飛んでいる。';state.phase='idle';state.idle=0;state.nextDraw=randomBetween(14,24);state.debugMode=false;}
  }
 }
 function loop(now){
  if(destroyed||document.hidden){frame=0;lastFrame=0;return;}if(lastFrame){const dt=clampRoom((now-lastFrame)/1000,0,.05);update(dt);}lastFrame=now;frame=requestAnimationFrame(loop);
 }
 function onVisibility(){if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=0;}else if(!frame&&!destroyed){lastFrame=0;frame=requestAnimationFrame(loop);}}
 function onMotion(){state.reduced=motionQuery.matches;root.dataset.reducedMotion=String(state.reduced);}
 function onResize(){updateRect();}
 function init(){updateRect();root.dataset.phase='idle';root.dataset.reducedMotion=String(state.reduced);root.querySelector('[data-room-home-set]').addEventListener('click',clickHandler);area.addEventListener('click',clickHandler);document.addEventListener('visibilitychange',onVisibility);window.addEventListener('resize',onResize,{passive:true});motionQuery.addEventListener?.('change',onMotion);resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(onResize):null;resizeObserver?.observe(area);frame=requestAnimationFrame(loop);}
 init();
 return {destroy(){if(destroyed)return;destroyed=true;if(frame)cancelAnimationFrame(frame);resizeObserver?.disconnect();area.removeEventListener('click',clickHandler);root.querySelector('[data-room-home-set]').removeEventListener('click',clickHandler);document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('resize',onResize);motionQuery.removeEventListener?.('change',onMotion);document.body.style.overflow=oldBodyOverflow;bubbleLayer.replaceChildren();}};
}
