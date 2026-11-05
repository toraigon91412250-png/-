const CITY_OVERVIEW_ART='assets/home-ui/chibina-city/city-overview.webp';
const CHIBINA_CITY_ISLANDS=[
 {id:'flight',name:'飛行島',sub:'黒翼'},
 {id:'royal',name:'王宮島',sub:'堕天王'},
 {id:'plaza',name:'天空広場',sub:'集合'},
 {id:'rest',name:'休息島',sub:'深淵'},
 {id:'judgment',name:'静寂島',sub:'断罪'},
 {id:'fallen',name:'堕天遺跡',sub:'堕天'}
];

const CHIBINA_CITY_ART={'island-central-plaza':'assets/home-ui/chibina-city/island-central-plaza.webp','island-flight':'assets/home-ui/chibina-city/island-flight.webp','island-royal-palace':'assets/home-ui/chibina-city/island-royal-palace.webp','island-rest':'assets/home-ui/chibina-city/island-rest.webp','island-judgment':'assets/home-ui/chibina-city/island-judgment.webp','island-fallen':'assets/home-ui/chibina-city/island-fallen.webp'};
const CHIBINA_CITY_CHARACTER_ART={
 kuroBack:'assets/home-ui/chibina-city/characters/kuro-0.webp',kuroFront:'assets/home-ui/chibina-city/characters/kuro-1.webp',kuroBody:'assets/home-ui/chibina-city/characters/kuro-2.webp',
 datenBack:'assets/home-ui/chibina-city/characters/daten-0.webp',datenFront:'assets/home-ui/chibina-city/characters/daten-1.webp',datenBody:'assets/home-ui/chibina-city/characters/daten-2.webp',
 judgmentCrest:'assets/home-ui/chibina-city/characters/cross.webp',judgmentBody:'assets/home-ui/chibina-city/characters/body.webp',
 king:'assets/home-ui/chibina-flight/throne.webp',abyss:'assets/home-ui/chibina-flight/shinen-cushion.webp'
};
export function renderChibinaCityView(selectedId='wing'){
 const actors=[
  ['kuro','黒翼','wing',`<div class="facing"><div class="sprite"><img class="wing back" src="${CHIBINA_CITY_CHARACTER_ART.kuroBack}" alt=""><img class="wing front" src="${CHIBINA_CITY_CHARACTER_ART.kuroFront}" alt=""><img class="body" src="${CHIBINA_CITY_CHARACTER_ART.kuroBody}" alt=""></div></div>`],
  ['daten','堕天','fallen',`<div class="facing"><div class="sprite"><img class="wing left" src="${CHIBINA_CITY_CHARACTER_ART.datenBack}" alt=""><img class="wing right" src="${CHIBINA_CITY_CHARACTER_ART.datenFront}" alt=""><img class="body" src="${CHIBINA_CITY_CHARACTER_ART.datenBody}" alt=""></div></div>`],
  ['judgment','断罪','judge',`<div class="sprite"><img class="cross" src="${CHIBINA_CITY_CHARACTER_ART.judgmentCrest}" alt=""><img class="body" src="${CHIBINA_CITY_CHARACTER_ART.judgmentBody}" alt=""></div>`],
  ['king','堕天王','king',`<div class="sprite"><img src="${CHIBINA_CITY_CHARACTER_ART.king}" alt=""></div>`],
  ['abyss','深淵','abyss',`<div class="sprite"><img src="${CHIBINA_CITY_CHARACTER_ART.abyss}" alt=""></div>`]
 ];
 const islands=[
  ['plaza','天空広場','island-central-plaza'],['flight','飛行島','island-flight'],['royal','王宮島','island-royal-palace'],
  ['rest','休息島','island-rest'],['judgment','静寂島','island-judgment'],['fallen','堕天遺跡','island-fallen']
 ];
 return `<section class="chibina-city" style="--city-bg:url(${CITY_OVERVIEW_ART})" data-chibina-city data-home-id="${selectedId}" aria-label="ちびーな空中都市">
  <header class="head"><div class="head-title"><span class="eyebrow">CHIBINA SKY CITY / EXPERIMENT 01</span><h1>ちびーな空中都市</h1></div><div class="top-actions"><button type="button" id="overview" class="control accent" title="都市全体を表示">✧ <span>全体図</span></button><button type="button" class="control" data-action="nav" data-id="chibina-room" aria-label="元の5人ルームへ">元ルーム</button><button type="button" class="control home" data-action="nav" data-id="home">ホーム</button></div></header>
  <section class="scene" id="scene" aria-label="6つの浮島と5人のちびキャラが飛行する都市。ドラッグで移動、ピンチで拡大縮小。">
   <div class="starfield" aria-hidden="true"></div><div class="aurora" aria-hidden="true"></div><div class="world" id="world" aria-label="ちびーな空中都市マップ">
    <svg class="sky-routes" viewBox="0 0 1900 1740" aria-hidden="true" preserveAspectRatio="none"><defs><linearGradient id="line-glow" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#83b0ff"/><stop offset=".5" stop-color="#dfadff"/><stop offset="1" stop-color="#eebd79"/></linearGradient></defs><path d="M880 765 Q635 540 455 455 M985 755 Q1165 525 1415 445 M900 825 Q650 950 465 1120 M985 830 Q1230 955 1445 1125 M950 865 Q985 1165 995 1435" /></svg>
    ${islands.map(([id,name,art])=>`<div class="island ${id}" data-island="${id}" tabindex="0" role="button" aria-label="${name}へ移動"><img src="${CHIBINA_CITY_ART[art]}" draggable="false" alt=""><span class="island-name">${id==='plaza'?'✧ ':''}${name}</span></div>`).join('')}
    ${actors.map(([id,name,home,art])=>`<div class="actor ${id}" data-id="${id}" tabindex="0" role="button" aria-label="${name}の飛行を追跡">${art}<span class="name">${name}</span></div>`).join('')}
   </div>
   <div class="hud-top"><div class="location" id="location" aria-live="polite"><span class="light">✦</span><span id="location-title">天空広場</span><small id="location-hint">5人が暮らす、空のまんなか</small></div><div class="zoom-controls"><button id="zoomIn" title="拡大" aria-label="拡大">＋</button><button id="zoomOut" title="縮小" aria-label="縮小">−</button></div></div>
   <div class="minimap" id="minimap" aria-label="ミニマップ。島をタップして移動"><div class="mini-surface"><button data-mini="flight" class="mini-pin" style="--x:20%;--y:22%" aria-label="飛行島">◉</button><button data-mini="royal" class="mini-pin" style="--x:78%;--y:20%" aria-label="王宮島">◉</button><button data-mini="plaza" class="mini-pin" style="--x:49%;--y:46%" aria-label="天空広場">✦</button><button data-mini="rest" class="mini-pin" style="--x:20%;--y:68%" aria-label="休息島">◉</button><button data-mini="judgment" class="mini-pin" style="--x:80%;--y:68%" aria-label="静寂島">◉</button><button data-mini="fallen" class="mini-pin" style="--x:52%;--y:85%" aria-label="堕天遺跡">◉</button><span id="camera-dot" aria-hidden="true"></span></div><small>MAP</small></div>
   <div class="scene-hint" id="sceneHint">島をタップで接近 · ドラッグで街を探索</div>
  </section>
  <footer class="dock"><div class="dock-head"><span class="dock-label">GO TO ISLAND</span><div class="dock-buttons"><button type="button" id="followOff" class="small-chip" hidden>追跡解除</button><button type="button" id="pause" class="small-chip" aria-pressed="false">⏸ 一時停止</button></div></div><nav class="island-nav" aria-label="浮島を選択">${CHIBINA_CITY_ISLANDS.map(island=>`<button data-jump="${island.id}" type="button" class="${island.id==='plaza'?'active':''}">${island.name}<small>${island.sub}</small></button>`).join('')}</nav><p class="footnote" id="footnote">5人は自動で行き来する。黒翼と堕天は活発、断罪は観察、深淵は休憩、堕天王は時々急加速。</p><div class="city-home-setting"><span><small>ホームに表示</small><strong id="city-home-name" data-city-home-name>${selectedId==='wing'?'黒翼':selectedId==='fallen'?'堕天':selectedId==='judge'?'断罪':selectedId==='king'?'堕天王':'深淵'}</strong></span><button type="button" class="small-chip" id="setCityHome">この子をホームに設定</button></div></footer>
 </section>`;
}



export function mountChibinaCity(root,{selectedId='wing',onHomeSelect=()=>{}}={}) {
  const scene = root.querySelector('#scene');
  const world = root.querySelector('#world');
  const byId = id => root.querySelector('#'+id);
  const WORLD = { w: 1900, h: 1740 };
  const ISLANDS = {
    plaza:    { x:945, y:790,  title:'天空広場', hint:'5人が集まる都市の中心', rest:7 },
    flight:   { x:380, y:380,  title:'飛行島', hint:'黒翼の飛行訓練場', rest:7 },
    royal:    { x:1480,y:365,  title:'王宮島', hint:'堕天王の玉座が待つ場所', rest:9 },
    rest:     { x:380, y:1190, title:'休息島', hint:'深淵お気に入りの休憩地', rest:14 },
    judgment: { x:1530,y:1190, title:'静寂島', hint:'断罪が遠くの黒翼を見つめる場所', rest:13 },
    fallen:   { x:995, y:1495, title:'堕天遺跡', hint:'堕天の力が残る浮島', rest:8 }
  };
  const motionMedia = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motionMedia.matches, userMotionChoice = false;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const random = (a,b) => a + Math.random() * (b-a);
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const chars = [
    { id:'kuro',     name:'黒翼', home:'flight',    speed:195, dwell:[2.5,5.5], z:1.02, focus:0.9 },
    { id:'daten',    name:'堕天', home:'fallen',   speed:178, dwell:[4,8],     z:1.02, focus:0.9 },
    { id:'judgment', name:'断罪', home:'judgment', speed:67,  dwell:[20,36],   z:.99, focus:1 },
    { id:'king',     name:'堕天王',home:'royal',   speed:96,  dwell:[12,21],   z:1, focus:1 },
    { id:'abyss',    name:'深淵', home:'rest',     speed:30,  dwell:[30,52],   z:1, focus:1 }
  ];
  const flyers = new Map();
  function anchor(island,id,side = 0) {
    const p = ISLANDS[island];
    const spread = island === 'plaza' ? 100 : 82;
    const offset = { kuro:-60, daten:75, judgment:25, king:90, abyss:-85 }[id] || 0;
    return {x:p.x+offset+side*spread*.35+random(-29,29),y:p.y-85+random(-35,30)};
  }
  for (const cfg of chars) {
    const el = root.querySelector(`.actor[data-id="${cfg.id}"]`);
    const initialIsland=(cfg.id==='kuro'||cfg.id==='daten')?'plaza':cfg.home;
    const pos = anchor(initialIsland,cfg.id);
    const state = { cfg, el, x:pos.x, y:pos.y, vx:0, vy:0, target:pos, island:initialIsland, goal:initialIsland,
      dwell:random(...cfg.dwell), drifting:0, dash:false, nextDash:cfg.id==='king'?32:Infinity, dashUntil:0,
      facing:1, sin:random(0,10), speed:cfg.speed, totalTrips:0 };
    flyers.set(cfg.id,state);
    el.style.setProperty('--flap',cfg.id==='kuro'?'2.8s':cfg.id==='daten'?'2.8s':'5s');
  }

  const cam = {x:ISLANDS.plaza.x,y:ISLANDS.plaza.y,zoom:1};
  const target = {...cam};
  let viewMode='island', selected='plaza', followId=null, elapsed=0, previous=0, anim=0, hasMoved=false, homeActor=({wing:'kuro',fallen:'daten',judge:'judgment',king:'king',abyss:'abyss'})[selectedId]||'kuro';
  const buttons = [...root.querySelectorAll('[data-jump]')];
  const islandEls = [...root.querySelectorAll('.island')];
  function viewport(){return {w:scene.clientWidth,h:scene.clientHeight};}
  function fitZoom(){const {w,h}=viewport();return Math.max(.05,Math.min((w-18)/WORLD.w,(h-18)/WORLD.h)*.95);}
  function focusZoom(){const {w,h}=viewport();return clamp(Math.min((w/590)*1.02,(h/570)*1.05),.37,1.2);}
  function limitZoom(z){return clamp(z, fitZoom()*.83, 1.6);}
  function constrainCamera(pos){const {w,h}=viewport();const halfW=Math.min(WORLD.w*.5,w/(2*pos.zoom)),halfH=Math.min(WORLD.h*.5,h/(2*pos.zoom));pos.x=clamp(pos.x,halfW,WORLD.w-halfW);pos.y=clamp(pos.y,halfH,WORLD.h-halfH);}
  function applyCamera(){const {w,h}=viewport();constrainCamera(cam);world.style.transform=`translate3d(${(w*.5-cam.x*cam.zoom).toFixed(2)}px,${(h*.5-cam.y*cam.zoom).toFixed(2)}px,0) scale(${cam.zoom.toFixed(4)})`;
    byId('camera-dot').style.left=(cam.x/WORLD.w*100).toFixed(1)+'%';
    byId('camera-dot').style.top=(cam.y/WORLD.h*100).toFixed(1)+'%';
  }
  function setInfo(title,hint){byId('location-title').textContent=title;byId('location-hint').textContent=hint;}
  function activeIsland(id){selected=id;for(const el of islandEls)el.classList.toggle('selected',el.dataset.island===id);for(const b of buttons)b.classList.toggle('active',b.dataset.jump===id);for(const b of root.querySelectorAll('[data-mini]'))b.classList.toggle('active',b.dataset.mini===id);}
  function setFree(){if(viewMode==='follow'){followId=null;byId('followOff').hidden=true;}viewMode='free';}
  function goIsland(id){if(!ISLANDS[id])return;followId=null;viewMode='island';byId('followOff').hidden=true;for(const s of flyers.values())s.el.classList.remove('selected');activeIsland(id);
    target.x=ISLANDS[id].x;target.y=ISLANDS[id].y;target.zoom=focusZoom();setInfo(ISLANDS[id].title,ISLANDS[id].hint);}
  function overview(){followId=null;viewMode='overview';byId('followOff').hidden=true;activeIsland('');target.x=WORLD.w/2;target.y=WORLD.h/2;target.zoom=fitZoom();setInfo('空中都市 全体図','6つの島が空路でつながる');}
  function follow(id){const ch=flyers.get(id);if(!ch)return;homeActor=id;const homePersona=({kuro:'wing',daten:'fallen',judgment:'judge',king:'king',abyss:'abyss'})[id];const homeNames={wing:'黒翼',fallen:'堕天',judge:'断罪',king:'堕天王',abyss:'深淵'};root.dataset.homeId=homePersona;byId('city-home-name').textContent=homeNames[homePersona];byId('setCityHome').disabled=homePersona===selectedId;viewMode='follow';followId=id;target.zoom=Math.max(focusZoom()*.86,.60);target.x=ch.x;target.y=ch.y;byId('followOff').hidden=false;
    for(const s of flyers.values())s.el.classList.toggle('selected',s.cfg.id===id);
    setInfo(ch.cfg.name+'を追跡','タップしたキャラの飛行を追いかける');}
  function updateCamera(dt){if(viewMode==='follow'&&followId){const ch=flyers.get(followId);if(ch){target.x=ch.x;target.y=ch.y;}}
    constrainCamera(target);const k=1-Math.exp(-dt*5.3);cam.x+=(target.x-cam.x)*k;cam.y+=(target.y-cam.y)*k;cam.zoom+=(target.zoom-cam.zoom)*k;applyCamera();}
  function startTravel(ch,next){const same=next===ch.island;ch.goal=next;ch.target=anchor(next,ch.cfg.id,random(-1,1));ch.dwell=0;if(!same)ch.totalTrips++;}
  function chooseTrip(ch){const id=ch.cfg.id,home=ch.cfg.home;
    if(id==='kuro'){
      const choices=ch.island==='flight'?['plaza','plaza','royal','judgment','rest']:['flight','plaza','royal','judgment','rest','fallen'];
      startTravel(ch,choices[Math.floor(random(0,choices.length))]);
    } else if(id==='daten'){
      const choices=ch.island==='fallen'?['plaza','plaza','flight']:['fallen','plaza','flight','rest'];
      startTravel(ch,choices[Math.floor(random(0,choices.length))]);
    } else if(id==='judgment'){
      const kuro=flyers.get('kuro');
      // Mostly stays near the quiet island; occasionally watches 黒翼 from plaza or flight.
      let next=home;
      if(ch.island!==home&&Math.random()<.72)next=home;
      else if(kuro&&(kuro.goal==='plaza'||kuro.island==='plaza')&&Math.random()<.55)next='plaza';
      else if(kuro&&(kuro.goal==='flight'||kuro.island==='flight')&&Math.random()<.16)next='flight';
      startTravel(ch,next);
    } else if(id==='abyss'){
      // Lazy by design. Most transitions are tiny drift within the resting island.
      startTravel(ch,Math.random()<.91?'rest':(ch.island==='plaza'?'rest':'plaza'));
    } else if(id==='king'){
      startTravel(ch,ch.island==='royal'?'plaza':'royal');
    }
  }
  function tickFlyers(dt){
    for(const ch of flyers.values()){
      const id=ch.cfg.id;
      if(id==='king'&&elapsed>=ch.nextDash){if(ch.dwell>0)startTravel(ch,ch.island==='royal'?'plaza':'royal');ch.dashUntil=elapsed+1.65;ch.nextDash+=43;}
      ch.dash=id==='king'&&elapsed<ch.dashUntil;
      ch.el.classList.toggle('dashing',ch.dash);
      if(ch.dwell>0){ch.dwell-=dt;
        ch.vx*=Math.exp(-dt*2.1);ch.vy*=Math.exp(-dt*2.1);
        if(ch.dwell<=0)chooseTrip(ch);
      } else {
        const dx=ch.target.x-ch.x,dy=ch.target.y-ch.y,dist=Math.hypot(dx,dy);
        if(dist<30){ch.x=ch.target.x;ch.y=ch.target.y;ch.vx=0;ch.vy=0;ch.island=ch.goal;
          ch.dwell=random(...ch.cfg.dwell)*(id==='abyss'?1.35:1);
        } else {
          const speed=ch.cfg.speed*(ch.dash?4.2:1);
          const maxSpeed= Math.min(speed,dist*2.1+25);
          const dxv=dx/dist*maxSpeed,dyv=dy/dist*maxSpeed;
          const ease=1-Math.exp(-dt*(ch.dash?6:2.4));
          ch.vx+=(dxv-ch.vx)*ease;ch.vy+=(dyv-ch.vy)*ease;
          ch.x+=ch.vx*dt;ch.y+=ch.vy*dt;
          if(Math.abs(ch.vx)>8)ch.facing=ch.vx>=0?1:-1;
        }
      }
      const wave = id==='abyss'?Math.sin(elapsed*.55+ch.sin)*8:Math.sin(elapsed*1.35+ch.sin)*9;
      const depth=clamp(.88+ch.y/WORLD.h*.24,.84,1.18)*ch.cfg.z;
      ch.el.style.transform=`translate3d(${(ch.x).toFixed(1)}px,${(ch.y+wave).toFixed(1)}px,0) translate(-50%,-50%) scale(${depth.toFixed(3)})`;
      ch.el.style.zIndex=String(20+Math.round(ch.y/25));
      if(id==='kuro'||id==='daten')ch.el.style.setProperty('--face',String(ch.facing));
      const travelSpeed=Math.hypot(ch.vx,ch.vy);ch.el.style.setProperty('--trail-opacity',String(clamp((travelSpeed-40)/420,0,.68)));
      ch.el.style.setProperty('--trail-angle',ch.facing>0?'0deg':'180deg');
      if(id==='judgment'){ch.el.style.setProperty('--float','5.7s');const kuro=flyers.get('kuro');ch.el.style.setProperty('--watch-x',Math.round(clamp((kuro.x-ch.x)/400,-1,1)*4)+'px');}
    }
  }
  function frame(now){if(!previous)previous=now;const dt=clamp((now-previous)/1000,0,.050);previous=now;
    if(!paused){elapsed+=dt;tickFlyers(dt);}
    updateCamera(dt||.016);anim=requestAnimationFrame(frame);
  }
  function updatePausedUI(){const b=byId('pause');b.textContent=paused?'▶ 再生':'⏸ 一時停止';b.setAttribute('aria-pressed',String(paused));
    root.classList.toggle('paused',paused);byId('footnote').textContent=paused?'停止中。再生で5人の生活を再開。':'5人が性格に合わせて島を巡回中。キャラをタップすると追跡できる。';}
  const pointer = new Map();let initialGesture=null, dragged=false, downTarget=null, mouseDown=null;
  function worldAt(screenX,screenY){const bounds=scene.getBoundingClientRect();return {x:cam.x+(screenX-bounds.left-bounds.width*.5)/cam.zoom,y:cam.y+(screenY-bounds.top-bounds.height*.5)/cam.zoom};}
  function setZoomAt(newZoom,centerX,centerY){setFree();const z=limitZoom(newZoom);const bounds=scene.getBoundingClientRect(),ref={x:target.x+(centerX-bounds.left-bounds.width*.5)/target.zoom,y:target.y+(centerY-bounds.top-bounds.height*.5)/target.zoom};target.zoom=z;target.x=ref.x-(centerX-bounds.left-bounds.width*.5)/z;target.y=ref.y-(centerY-bounds.top-bounds.height*.5)/z;constrainCamera(target);}
  scene.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.pointerType!=='touch')return;
    pointer.set(e.pointerId,{x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY});
    if(pointer.size===1){downTarget=e.target.closest('.island,.actor');dragged=false;mouseDown={x:e.clientX,y:e.clientY};initialGesture=null;}
    if(pointer.size===2){const arr=[...pointer.values()];initialGesture={d:Math.hypot(arr[0].x-arr[1].x,arr[0].y-arr[1].y),z:target.zoom};dragged=true;}
    scene.setPointerCapture?.(e.pointerId);
  });
  scene.addEventListener('pointermove',e=>{
    if(!pointer.has(e.pointerId))return;const p=pointer.get(e.pointerId);let dx=e.clientX-p.lastX,dy=e.clientY-p.lastY;p.x=e.clientX;p.y=e.clientY;p.lastX=p.x;p.lastY=p.y;
    if(pointer.size===2&&initialGesture){const arr=[...pointer.values()];const dist=Math.hypot(arr[0].x-arr[1].x,arr[0].y-arr[1].y);const midX=(arr[0].x+arr[1].x)/2,midY=(arr[0].y+arr[1].y)/2;
      setZoomAt(initialGesture.z*(dist/Math.max(initialGesture.d,10)),midX,midY);dragged=true;return;
    }
    if(mouseDown&&Math.hypot(e.clientX-mouseDown.x,e.clientY-mouseDown.y)>7)dragged=true;
    if(dragged){setFree();target.x-=dx/target.zoom;target.y-=dy/target.zoom;constrainCamera(target);}
  });
  function pointerEnd(e){if(!pointer.has(e.pointerId))return;pointer.delete(e.pointerId);
    if(pointer.size===0){if(!dragged&&downTarget){if(downTarget.classList.contains('island'))goIsland(downTarget.dataset.island);else if(downTarget.classList.contains('actor')){const id=downTarget.dataset.id;follow(id);downTarget.classList.remove('ping');void downTarget.offsetWidth;downTarget.classList.add('ping');setTimeout(()=>downTarget.classList.remove('ping'),700);}}
      downTarget=null;initialGesture=null;mouseDown=null;dragged=false;
    }else{downTarget=null;dragged=true;initialGesture=null;}
  }
  scene.addEventListener('pointerup',pointerEnd);scene.addEventListener('pointercancel',pointerEnd);
  for(const el of [...islandEls,...root.querySelectorAll('.actor')])el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(el.classList.contains('island'))goIsland(el.dataset.island);else follow(el.dataset.id);}});
  scene.addEventListener('wheel',e=>{e.preventDefault();setZoomAt(target.zoom*(e.deltaY<0?1.11:.90),e.clientX,e.clientY);},{passive:false});
  for(const btn of buttons)btn.addEventListener('click',()=>goIsland(btn.dataset.jump));
  for(const btn of root.querySelectorAll('[data-mini]'))btn.addEventListener('click',()=>goIsland(btn.dataset.mini));
  byId('overview').addEventListener('click',overview);
  byId('zoomIn').addEventListener('click',()=>{const r=scene.getBoundingClientRect();setZoomAt(target.zoom*1.25,r.left+r.width*.5,r.top+r.height*.5)});
  byId('zoomOut').addEventListener('click',()=>{const r=scene.getBoundingClientRect();setZoomAt(target.zoom*.8,r.left+r.width*.5,r.top+r.height*.5)});
  byId('pause').addEventListener('click',()=>{paused=!paused;userMotionChoice=true;updatePausedUI()});
  byId('followOff').addEventListener('click',()=>goIsland(selected||'plaza'));
  const motionChange=e=>{if(!userMotionChoice){paused=e.matches;updatePausedUI()}};motionMedia.addEventListener?.('change',motionChange);
  const resizeHandler=()=>{if(viewMode==='overview')target.zoom=fitZoom();else if(viewMode==='island')target.zoom=focusZoom();constrainCamera(target);applyCamera()};window.addEventListener('resize',resizeHandler,{passive:true});
  const visibilityHandler=()=>{previous=0};document.addEventListener('visibilitychange',visibilityHandler);
  byId('setCityHome').disabled=true;
  byId('setCityHome').addEventListener('click',()=>onHomeSelect(root.dataset.homeId||'wing'));
  cam.zoom=target.zoom=focusZoom();
  activeIsland('plaza');setInfo(ISLANDS.plaza.title,ISLANDS.plaza.hint);
  updatePausedUI();tickFlyers(0);applyCamera();anim=requestAnimationFrame(frame);
  return {destroy(){cancelAnimationFrame(anim);window.removeEventListener('resize',resizeHandler);document.removeEventListener('visibilitychange',visibilityHandler);motionMedia.removeEventListener?.('change',motionChange);}};
}

