// Ephemeral display only: no battle/save references or combat timers.
export const SORTIE_ART='assets/sortie/sortie-normal-final.png';
export const SORTIE_MS=1400;
export const SPECIAL_SORTIE_ART={ex:'assets/sortie/sortie-ex-kaiser.png',stella:'assets/sortie/sortie-stella.png',final:'assets/sortie/sortie-final-irena.png'};
export function specialSortieOptions(b){if(!b||b.lab20||b.experiment||b.trial||!Object.hasOwn(SPECIAL_SORTIE_ART,b.mode))return null;return {art:SPECIAL_SORTIE_ART[b.mode],duration:1500,label:{ex:'EXカイザー戦へ出撃',stella:'ステラでEXカイザー戦へ出撃',final:'専用いれーなでEXカイザー最終決戦へ出撃'}[b.mode],variant:'portrait'};}

export function shouldPlaySortie(b){return !!b?.main20&&b.mode==='normal'&&!b.test&&!b.lab20&&!b.experiment&&![5,9,14,17,20].includes(b.floor);}
export function hpPercent(hp,max){return max>0?Math.max(0,Math.min(100,hp/max*100)):0;}
const hpAnimations=new WeakMap();
export function resetHealthAfterimages(root){for(const bar of root?.querySelectorAll('.health')||[]){hpAnimations.get(bar)?.cancel();hpAnimations.delete(bar);}}
export function updateHealthBar(bar,percent,{reduced=false}={}){
 if(!bar)return;const current=bar.querySelector('.hp-current'),trail=bar.querySelector('.hp-afterimage');if(!current||!trail)return;
 const next=Math.max(0,Math.min(100,percent)),old=parseFloat(current.style.width)||0;
 const width=bar.getBoundingClientRect().width,painted=width?trail.getBoundingClientRect().width/width*100:old;
 hpAnimations.get(bar)?.cancel();hpAnimations.delete(bar);current.style.width=next+'%';trail.style.transform='scaleX('+next/100+')';
 if(next<old&&!reduced&&trail.animate){const animation=trail.animate([{transform:'scaleX('+Math.max(next,painted)/100+')'},{transform:'scaleX('+next/100+')'}],{delay:100,duration:300,easing:'cubic-bezier(.2,.6,.3,1)',fill:'backwards'});hpAnimations.set(bar,animation);animation.finished.catch(()=>{}).finally(()=>{if(hpAnimations.get(bar)===animation)hpAnimations.delete(bar);});}
}
let activeSortie=null;
export function cancelSortie(){activeSortie?.();}
export function preloadSortie(){for(const art of [SORTIE_ART,...Object.values(SPECIAL_SORTIE_ART)]){const im=new Image();im.src=art;im.decode?.().catch(()=>{});}}
export function playSortie({reduced=false,onFinish=()=>{},art=SORTIE_ART,duration=SORTIE_MS,label='出撃',variant=''}={}){
 cancelSortie();const layer=document.createElement('div');layer.className='sortie-overlay'+(variant?' sortie-'+variant:'');layer.style.visibility='hidden';layer.style.setProperty('--sortie-duration',duration+'ms');layer.setAttribute('role','status');layer.setAttribute('aria-label',label);
 if(variant==='portrait'){const backdrop=new Image();backdrop.className='sortie-portrait-backdrop';backdrop.alt='';backdrop.setAttribute('aria-hidden','true');backdrop.src=art;layer.append(backdrop);}
 if(!variant){const atmosphere=document.createElement('div');atmosphere.className='sortie-atmosphere';atmosphere.setAttribute('aria-hidden','true');const backdrop=new Image();backdrop.src=art;backdrop.alt='';backdrop.className='sortie-backdrop';atmosphere.append(backdrop);for(const kind of ['mist','mist','ray','ray','ray',...Array(18).fill('particle'),...Array(9).fill('feather')]){const el=document.createElement('i');el.className='sortie-'+kind;const n=atmosphere.children.length;el.style.setProperty('--n',n);el.style.setProperty('--x',((n*37)%100)+'%');el.style.setProperty('--y',((n*23)%100)+'%');el.style.setProperty('--r',((n*47)%150-75)+'deg');atmosphere.append(el);}layer.append(atmosphere);}
 const frame=document.createElement('div');frame.className='sortie-frame';const im=new Image();im.alt=label;im.dataset.fallback='1';frame.append(im);const sheen=document.createElement('span');sheen.className='sortie-sheen';sheen.setAttribute('aria-hidden','true');frame.append(sheen);layer.append(frame);if(variant==='finale'){const title=document.createElement('div');title.className='sortie-finale-title';title.textContent=label;layer.append(title);}document.body.append(layer);
 let progressFrame=0,progressStart=null;
 if(variant==='portrait'){
 const stella=art===SPECIAL_SORTIE_ART.stella,final=art===SPECIAL_SORTIE_ART.final;
 const [x,y,w,h]=stella?[184,1479,572,26]:final?[125,1470,692,26]:[110,1494,720,31];
 const colors=stella?['#b87821','#ffe091','#fff9dc']:final?['#a90939','#ff427a','#ffcfdf']:['#5d48ef','#b477ff','#ffb7ec'];
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('sortie-progress');svg.setAttribute('viewBox','0 0 941 '+(final?1671:1672));svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.setAttribute('aria-hidden','true');
 svg.innerHTML=`<defs><linearGradient id="sortie-fill"><stop stop-color="${colors[0]}"/><stop offset=".7" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient><clipPath id="sortie-bar-clip"><path d="M${x+12} ${y}H${x+w-12}L${x+w} ${y+h/2}L${x+w-12} ${y+h}H${x+12}L${x} ${y+h/2}Z"/></clipPath></defs><g clip-path="url(#sortie-bar-clip)"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#100d19"/><rect class="sortie-progress-fill" x="${x}" y="${y}" width="0" height="${h}" fill="url(#sortie-fill)"/><rect x="${x}" y="${y+2}" width="${w}" height="2" fill="#fff" opacity=".35"/></g>`;
 frame.append(svg);const fill=svg.querySelector('.sortie-progress-fill');svg.dataset.progress='0';
 const tick=now=>{if(progressStart===null){progressFrame=requestAnimationFrame(tick);return;}const t=Math.max(0,Math.min(1,(now-progressStart-100)/(duration-350)));fill.setAttribute('width',String(w*t));svg.dataset.progress=String(Math.round(t*100));if(t<1)progressFrame=requestAnimationFrame(tick);};progressFrame=requestAnimationFrame(tick);
 }
 const animations=[];let timer,done=false;const finish=()=>{if(done)return;done=true;cancelAnimationFrame(progressFrame);clearTimeout(timer);for(const a of animations)a.cancel();layer.remove();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',finish);if(activeSortie===finish)activeSortie=null;onFinish();};const hidden=()=>{if(document.hidden)finish();};activeSortie=finish;
 document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',finish,{once:true});im.onerror=finish;
 const ready=()=>{if(done)return;clearTimeout(timer);progressStart=performance.now();layer.style.visibility='visible';

 if(layer.animate){animations.push(layer.animate([{opacity:0},{opacity:1,offset:120/duration},{opacity:1,offset:(duration-180)/duration},{opacity:0}],{duration,fill:'both'}));if(!reduced&&variant!=='portrait'){animations.push(im.animate([{transform:'scale(1)'},{transform:'scale(1.015)'}],{duration,fill:'both'}));animations.push(sheen.animate([{transform:'translateX(-160%)',opacity:0},{opacity:.55,offset:.2},{transform:'translateX(600%)',opacity:0}],{delay:120,duration:480,fill:'both'}));}}
 timer=setTimeout(finish,duration);};
 timer=setTimeout(finish,4000);
 if(im.decode){im.src=art;im.decode().then(ready,finish);}else{im.onload=ready;im.src=art;}
 return {cancel:finish};
}
