import {MIRROR_ART,playMirrorMoment} from './mirrorView.js';
import {actualHealLabel,actualErosionLabel} from './combatEffectFacts.js';
import {AUTHORITY_STRIKE_ART,authorityStrikeVisual} from './authorityStrikeVisuals.js';
// Audit11: a presentation queue consumes facts; it never calls act/settle or writes battle state.
export const COMBAT_VFX={feather:'assets/combat-vfx/flow-v2/feather-lance.webp',break:'assets/combat-vfx/crystal-break.webp',cutin:'assets/combat-vfx/flow-v2/irena-cutin.webp',crest:'assets/runtime/crest-fallen.webp',ultimateHero:'assets/combat-vfx/ultimate-v1/hero.webp',ultimateEclipse:'assets/combat-vfx/ultimate-v1/eclipse.webp',ultimateImpact:'assets/combat-vfx/ultimate-v1/impact.webp'};
export const COMBAT_TIMING={slash:{duration:320,hits:[120]},feather:{duration:860,hits:[650]},pierce:{duration:1320,hits:[1120]},volley:{duration:1450,hits:[900,1240]},power:{duration:1320,hits:[1080],breakAt:1020},ultimate:{duration:3000,hits:[2420],breakAt:2340},guard:{duration:240,hits:[]}};
export function mirrorShatterLabel(event,healLabel){return (event.target||'player')==='player'&&event.text==='破鏡・生命回帰'&&healLabel?`破鏡 ${healLabel}`:event.text||'破鏡・生命回帰';}
export function planCombatPresentation(events,action,{reduced=false}={}){
 const frames=[];let end=0,start=0,last=0,actor=null,mirrorMove=null,enemyHit=0;const spec=COMBAT_TIMING[action]||COMBAT_TIMING.slash;
 for(const e of events){let at=last;
  if(e.kind==='playerAction'){start=end+(actor?60:0);actor='player';end=start+(reduced?(action==='volley'?300:action==='ultimate'?420:action==='power'?500:180):spec.duration);at=start;}
  else if(e.kind==='enemyAction'){start=end+(actor?60:0);actor='enemy';mirrorMove=e.mirror?e.move:null;enemyHit=0;end=start+(mirrorMove?(reduced?400:mirrorMove==='ultimate'?1800:mirrorMove==='volley'?1050:760):(reduced?180:320));at=start;}
  else if(e.kind==='hit')at=start+(action.startsWith('res_')?80+(e.hitIndex||0)*(reduced?18:55):reduced?(action==='ultimate'?220:action==='power'?320:80+(e.hitIndex||0)*120):(spec.hits[e.hitIndex||0]??spec.hits[0]??120));
  else if(e.kind==='incomingHit'||e.kind==='enemyMiss'||e.kind==='enemyStopped')at=start+(mirrorMove?(reduced?120+enemyHit++*100:(mirrorMove==='ultimate'?1350:480)+enemyHit++*200):(reduced?80:140));
  else if(e.kind==='armorBreak')at=start+(reduced?(action==='ultimate'?160:action==='power'?260:50):spec.breakAt??180);
  else if(e.kind==='heal')at=actor==='enemy'?start+(reduced?120:240):last;
  else if(e.kind==='armorForm')at=start+(reduced?140:260);
  else if(e.kind==='phaseChange'){at=Math.max(last,end);end=at+(reduced?120:280);}
  else if(['mirrorAwaken','mirrorBeyond','mirrorRelease'].includes(e.kind)){at=Math.max(last,end);end=at+(reduced?380:e.kind==='mirrorBeyond'?2230:1780);}
  else if(e.kind==='mirrorShatter'||e.kind==='mirrorOpen'||e.kind==='mirrorState')at=Math.max(last,end);
  else if(e.kind==='turnEnd'||e.kind==='deadline')at=Math.max(last,end);
  at=Math.max(last,at);last=at;frames.push({at,event:e});
 }
 return {frames,duration:Math.max(end,last)+ (reduced?120:320)};
}
export function preloadCombatVfx(){return Promise.all([...Object.values(COMBAT_VFX),...Object.values(AUTHORITY_STRIKE_ART)].map(src=>new Promise(resolve=>{const img=new Image();const timer=setTimeout(resolve,500);img.onload=async()=>{try{await img.decode();}catch{}clearTimeout(timer);resolve();};img.onerror=()=>{clearTimeout(timer);resolve();};img.src=src;})));}
export function playCombatPresentation({arena,events,action,authority,before,onFrame,onSound,reduced=false,signal,divinity=null}){
 const strike=authorityStrikeVisual(authority),plan=planCombatPresentation(events,action,{reduced}),animations=new Set(),nodes=new Set(),timers=new Set(),mirrorMoments=new Set();let closed=false,resolveDone,previousFrame=before,pendingMirrorHeal=null;
 const done=new Promise(resolve=>{resolveDone=resolve;});
 const clean=()=>{if(closed)return;closed=true;for(const moment of mirrorMoments)moment.cancel();for(const t of timers)clearTimeout(t);for(const a of animations)a.cancel();for(const n of nodes)n.remove();arena?.classList.remove('vfx-guarding','vfx-playing','vfx-ultimate-casting','vfx-hit-stopped');signal?.removeEventListener('abort',clean);document.removeEventListener('visibilitychange',visibility);resolveDone();};
 const visibility=()=>{if(document.hidden)clean();};
 const animate=(node,keyframes,options)=>{if(!node?.animate)return;const a=node.animate(keyframes,options);animations.add(a);a.finished.catch(()=>{}).finally(()=>{animations.delete(a);node.remove();nodes.delete(node);});};
 const add=(cls,target=arena,text='')=>{if(!target)return null;const el=document.createElement('span');el.className='vfx '+cls;el.setAttribute('aria-hidden','true');el.textContent=text;target.append(el);nodes.add(el);return el;};
 const texture=(src,cls,target=arena)=>{const wrap=add(cls,target);if(!wrap)return null;const im=document.createElement('img');im.src=src;im.alt='';im.draggable=false;im.onerror=()=>{wrap.classList.add('vfx-fallback');im.remove();};wrap.append(im);return wrap;};
 const figure=side=>arena?.querySelector('.fighter-'+(side==='enemy'?'enemy':'player')+' .portrait-frame')||arena?.querySelector('.div-vfx-'+(side==='enemy'?'enemy':'player'));
 const pulse=(side,big=false)=>{const target=figure(side);if(!target||reduced)return;const a=target.animate([{transform:'translateX(0)'},{transform:`translateX(${big?4:2}px)`,offset:.12},{transform:`translateX(${big?4:2}px)`,offset:.34},{transform:'translateX(0)'}],{duration:big?210:140});animations.add(a);a.finished.catch(()=>{}).finally(()=>animations.delete(a));};
 const number=(side,value,kind)=>{const isUltimate=kind.includes('vfx-ultimate-number'),isFact=kind.includes('vfx-fact-label'),el=add('vfx-number '+kind,isUltimate||isFact?arena:figure(side),value);if(el){if(isUltimate||isFact){const a=arena.getBoundingClientRect(),t=figure(side)?.getBoundingClientRect();const x=t?t.left-a.left+t.width*.5:a.width*.5,w=Math.min(192,a.width-16);if(isFact)el.style.width=w+'px';el.style.left=(isFact?Math.max(w/2+8,Math.min(a.width-w/2-8,x)):x)+'px';el.style.top=((t?t.top-a.top+t.height*.5:a.height*.4))+'px';}animate(el,[{opacity:0,transform:'translate(-50%,8px)'},{opacity:1,offset:.18,transform:'translate(-50%,-4px)'},{opacity:1,offset:.7},{opacity:0,transform:'translate(-50%,-27px)'}],{duration:reduced?180:isUltimate?600:isFact?500:300,fill:'both'});}};
 const fire=(duration=130,variant='',index=0)=>{if(reduced)return;const feather=texture(COMBAT_VFX.feather,'vfx-projectile'+(variant?' vfx-projectile-'+variant:''));if(!feather)return;const stage=arena.getBoundingClientRect(),target=figure('enemy')?.getBoundingClientRect();const y=target?target.top-stage.top+target.height*.45:stage.height*.25;feather.style.top=(y-feather.offsetHeight*.5+(variant==='volley'?(index?12:-12):0))+'px';const start=-feather.offsetWidth*1.1,end=target?target.left-stage.left+target.width*.5-feather.offsetWidth*.85:stage.width*.6;animate(feather,[{opacity:0,transform:`translateX(${start}px) scaleX(.75)`},{opacity:1,offset:.2},{opacity:1,offset:.85},{opacity:0,transform:`translateX(${end}px) scaleX(1.1)`}],{duration,fill:'both'});};
 const pierceCharge=()=>{if(reduced)return;const el=add('vfx-pierce-charge');if(el)animate(el,[{opacity:0,transform:'scale(1.4)'},{opacity:1,offset:.5,transform:'scale(.65)'},{opacity:0,transform:'scale(.18)'}],{duration:300,fill:'both'});};
 const cutin=(label,duration=480,variant='')=>{if(reduced||arena?.clientHeight<96)return;const shade=add('vfx-shade');if(shade)animate(shade,[{opacity:0},{opacity:.65,offset:.12},{opacity:.65,offset:.8},{opacity:0}],{duration:duration+120,fill:'both'});const el=texture(COMBAT_VFX.cutin,'vfx-cutin'+(variant?' vfx-cutin-'+variant:''));if(!el)return;const title=document.createElement('b');title.textContent=label;el.append(title);animate(el,[{opacity:1,transform:'translateX(-110%)'},{opacity:1,transform:'translateX(-3%)',offset:.27},{opacity:1,transform:'translateX(3%)',offset:.73},{opacity:0,transform:'translateX(115%)'}],{duration,fill:'both'});};
 const ultimateTarget=()=>{const a=arena.getBoundingClientRect(),t=figure('enemy')?.getBoundingClientRect();return {x:t?t.left-a.left+t.width*.5:a.width*.5,y:t?t.top-a.top+t.height*.45:a.height*.35,h:a.height};};
 const ultimateStart=()=>{
  const ultimateName=divinity?.skillName||'超堕天撃';
  if(reduced){const title=add('vfx-apocalypse-reduced',arena,ultimateName);if(title)animate(title,[{opacity:0},{opacity:1,offset:.2},{opacity:0}],{duration:300,fill:'both'});return;}
  onSound?.('ultimateCharge');
  const veil=add('vfx-apocalypse-veil');if(veil)animate(veil,[{opacity:0},{opacity:.88,offset:.08},{opacity:.88,offset:.78},{opacity:0}],{duration:3000,fill:'both'});
  const halo=add('vfx-apocalypse-halo');if(halo)animate(halo,[{opacity:0,transform:'translate(-50%,-50%) scale(.3) rotate(-20deg)'},{opacity:.9,offset:.35},{opacity:0,transform:'translate(-50%,-50%) scale(1.2) rotate(18deg)'}],{duration:650,fill:'both'});
  later(200,()=>{const hero=texture(COMBAT_VFX.ultimateHero,'vfx-apocalypse-hero');if(!hero)return;const title=document.createElement('strong');title.className='vfx-apocalypse-title';title.textContent=ultimateName;hero.append(title);const sub=document.createElement('small');sub.textContent='THE FALLEN STAR';title.prepend(sub);animate(hero,[{opacity:0,transform:'translateX(-105%)'},{opacity:1,offset:.18,transform:'translateX(-1%)'},{opacity:1,offset:.8,transform:'translateX(1%)'},{opacity:0,transform:'translateX(105%)'}],{duration:1500,fill:'both'});const portrait=hero.querySelector('img');if(portrait?.animate){const zoom=portrait.animate([{transform:'scale(1)'},{transform:'scale(1.08)'}],{duration:1500,fill:'both'});animations.add(zoom);zoom.finished.catch(()=>{}).finally(()=>animations.delete(zoom));}});
  later(1620,()=>{const orb=texture(COMBAT_VFX.ultimateEclipse,'vfx-apocalypse-eclipse');if(orb)animate(orb,[{opacity:0,transform:'translate(-50%,-50%) scale(.4) rotate(-14deg)'},{opacity:1,offset:.25,transform:'translate(-50%,-50%) scale(1)'},{opacity:1,offset:.65,transform:'translate(-50%,-50%) scale(1.08)'},{opacity:0,transform:'translate(-50%,-50%) scale(.12) rotate(12deg)'}],{duration:760,fill:'both'});});
  later(2180,()=>{onSound?.('ultimateRelease');const t=ultimateTarget(),ray=add('vfx-apocalypse-descent');if(ray){ray.style.left=t.x+'px';ray.style.height=Math.max(20,t.y)+'px';animate(ray,[{opacity:0,transform:'translateX(-50%) scaleY(.05)'},{opacity:1,offset:.4},{opacity:1,offset:.85,transform:'translateX(-50%) scaleY(1)'},{opacity:0}],{duration:240,fill:'both'});}});
 };
 const ultimateImpact=()=>{if(reduced)return;const t=ultimateTarget(),burst=texture(COMBAT_VFX.ultimateImpact,'vfx-apocalypse-impact');if(burst){const h=Math.max(260,t.h*1.35);burst.style.height=h+'px';burst.style.width=(h*2/3)+'px';burst.style.left=t.x+'px';burst.style.top=(t.y-h*.86)+'px';animate(burst,[{opacity:1,transform:'translateX(-50%) scale(.85)'},{opacity:1,offset:.18,transform:'translateX(-50%) scale(1)'},{opacity:1,offset:.35,transform:'translateX(-50%) scale(1)'},{opacity:0,transform:'translateX(-50%) scale(1.12)'}],{duration:580,fill:'both'});}const ring=add('vfx-apocalypse-shock');if(ring){ring.style.left=t.x+'px';ring.style.top=t.y+'px';animate(ring,[{opacity:.9,transform:'translate(-50%,-50%) scale(.2)'},{opacity:0,transform:'translate(-50%,-50%) scale(1.35)'}],{duration:550,fill:'both'});}const target=figure('enemy');if(target?.animate){const recoil=target.animate([{transform:'translateX(0)'},{transform:'translateX(7px)',offset:.12},{transform:'translateX(7px)',offset:.38},{transform:'translateX(-3px)',offset:.6},{transform:'translateX(0)'}],{duration:320});animations.add(recoil);recoil.finished.catch(()=>{}).finally(()=>animations.delete(recoil));}};

 const authorityNode=(cls,target=arena)=>{const node=add('vfx-authority-'+cls+' vfx-authority-'+strike.motif,target);if(node){node.style.setProperty('--authority-color',strike.color);node.dataset.authority=strike.id;}return node;};
 const authorityBegin=()=>{
  const veil=authorityNode('veil');if(veil)animate(veil,[{opacity:0},{opacity:.88,offset:.16},{opacity:.88,offset:.7},{opacity:0}],{duration:reduced?360:1040,fill:'both'});
  const card=authorityNode('cutin');if(!card)return;
  if(strike.art){const img=document.createElement('img');img.src=strike.art;img.alt='';img.draggable=false;img.onerror=()=>{img.remove();card.classList.add('vfx-fallback');};card.append(img);}else{const img=document.createElement('img');img.src=COMBAT_VFX.crest;img.alt='';card.append(img);}
  const title=document.createElement('strong');title.className='vfx-authority-title';title.textContent=divinity?.skillName||strike.name+'の権能';const tag=document.createElement('small');tag.textContent=divinity?.skillName?'DIVINITY TECHNIQUE':'FIRST AUTHORITY';title.prepend(tag);card.append(title);
  const caption=document.createElement('em');caption.className='vfx-authority-caption';caption.textContent=divinity?.skillName?strike.name+' — '+strike.subtitle:strike.subtitle;card.append(caption);
  animate(card,reduced?[{opacity:1,transform:'translate(0,-50%)'},{opacity:1,offset:.85},{opacity:0}]:[{opacity:0,transform:'translate(-110%,-50%)'},{opacity:1,transform:'translate(-2%,-50%)',offset:.22},{opacity:1,transform:'translate(2%,-50%)',offset:.76},{opacity:0,transform:'translate(110%,-50%)'}],{duration:reduced?300:920,fill:'both'});
  if(!reduced)later(940,()=>{const focus=authorityNode('focus',figure('enemy'));if(focus)animate(focus,[{opacity:0,transform:'translate(-50%,-50%) scale(1.25)'},{opacity:.9,offset:.6},{opacity:0,transform:'translate(-50%,-50%) scale(.2)'}],{duration:140,fill:'both'});});
 };
 const authorityImpact=()=>{
  const target=figure('enemy');if(!target)return;
  const impact=authorityNode('impact',target);if(impact)animate(impact,[{opacity:1,transform:'translate(-50%,-50%) scale(.4)'},{opacity:1,offset:.24,transform:'translate(-50%,-50%) scale(1)'},{opacity:0,transform:'translate(-50%,-50%) scale(1.25)'}],{duration:reduced?140:400,fill:'both'});
  if(reduced)return;
  const count={feathers:7,judgment:3,vortex:3,rupture:5,crown:5,resonance:3}[strike.motif];
  for(let i=0;i<count;i++){const piece=authorityNode('piece',target);if(!piece)continue;piece.style.setProperty('--piece',i);piece.style.setProperty('--pieces',count);const angle=(i-(count-1)/2)*({feathers:12,judgment:22,vortex:40,rupture:36,crown:26,resonance:40}[strike.motif]);piece.style.setProperty('--angle',angle+'deg');animate(piece,[{opacity:0,transform:'translate(-50%,-50%) rotate('+angle+'deg) scale(.15)'},{opacity:1,offset:.2,transform:'translate(-50%,-50%) rotate('+angle+'deg) scale(1)'},{opacity:0,transform:'translate(-50%,-50%) rotate('+(angle+(strike.motif==='vortex'?90:0))+'deg) scale(1.3)'}],{duration:440+i*14,fill:'both'});}
 };
 const later=(ms,fn)=>{const t=setTimeout(()=>{timers.delete(t);if(!closed){try{fn();}catch(error){console.error('Combat effect failed',error);clean();}}},ms);timers.add(t);};
 const hitStop=()=>{if(reduced)return 0;const active=[...animations];for(const animation of active)animation.pause();arena?.classList.add('vfx-hit-stopped');later(48,()=>{for(const animation of active)animation.play();arena?.classList.remove('vfx-hit-stopped');});return 48;};
 const screenShake=(big=false)=>{if(reduced||!arena?.animate)return;const distance=big?7:4;const a=arena.animate([{transform:'translate3d(0,0,0)'},{transform:`translate3d(${distance}px,-1px,0)`,offset:.2},{transform:`translate3d(-${distance}px,1px,0)`,offset:.4},{transform:`translate3d(${distance*.45}px,0,0)`,offset:.62},{transform:'translate3d(0,0,0)'}],{duration:big?280:170,easing:'ease-out'});animations.add(a);a.finished.catch(()=>{}).finally(()=>animations.delete(a));};
 const bladeSlash=()=>{const el=document.createElement('div');el.className='blade-strike';el.setAttribute('aria-hidden','true');el.innerHTML='<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path class="blade-halo" d="M 6 84 Q 48 45 94 18"/><path class="blade-core" d="M 6 84 Q 48 45 94 18"/><path class="blade-second" d="M 21 92 Q 66 57 88 12"/></svg>';arena?.append(el);if(!el.isConnected)return;nodes.add(el);later(650,()=>{el.remove();nodes.delete(el);});};
 arena?.classList.add('vfx-playing');
  // Defense is declared before either actor moves; enemy-first hits still meet the shield.
  if(action==='guard'&&arena?.classList.contains('div-arena')){arena.classList.add('vfx-guarding');add('vfx-shield',figure('player'));}
 const playNext=(index=0,delayExtra=0)=>{const {at,event:e}=plan.frames[index];later((index?at-plan.frames[index-1].at:at)+delayExtra,()=>{
  if(e.kind==='enemyAction'&&e.mirror){
   const label=add('vfx-mirror-name',arena,e.label);if(label)animate(label,[{opacity:0,transform:'translateY(6px)'},{opacity:1,offset:.18},{opacity:1,offset:.75},{opacity:0,transform:'translateY(-6px)'}],{duration:reduced?250:e.move==='ultimate'?1650:700,fill:'both'});
   if(!reduced){const cut=texture(e.frame?.mirror?.unsealed?MIRROR_ART.phase3:e.awake?MIRROR_ART.phase2Cutin:MIRROR_ART.cutin,'vfx-mirror-cut'+(e.move==='ultimate'?' vfx-mirror-finisher':''));if(cut)animate(cut,[{opacity:0,transform:'translateX(110%)'},{opacity:1,offset:.2,transform:'translateX(2%)'},{opacity:1,offset:.7,transform:'translateX(-2%)'},{opacity:0,transform:'translateX(-110%)'}],{duration:e.move==='ultimate'?1300:460,fill:'both'});}
   if(e.move==='ultimate')onSound?.('ultimateCharge');
  }
  if(['mirrorAwaken','mirrorBeyond','mirrorRelease'].includes(e.kind)){const moment=playMirrorMoment(e.kind==='mirrorBeyond'?'beyond':e.kind==='mirrorRelease'?'release':'awaken',{reduced,signal});mirrorMoments.add(moment);moment.done.then(()=>mirrorMoments.delete(moment));onSound?.('break');}
  if(e.kind==='mirrorShatter'){number(e.target||'player',mirrorShatterLabel(e,pendingMirrorHeal),'vfx-heal vfx-fact-label');pendingMirrorHeal=null;onSound?.('break');}
  if(e.kind==='mirrorOpen')number('enemy','鏡裂','vfx-label');
  if(e.kind==='playerAction'){
   if(action==='guard'){arena?.classList.add('vfx-guarding');if(!arena?.classList.contains('div-arena'))add('vfx-shield',figure('player'));}if(action==='ultimate'){arena?.classList.add('vfx-ultimate-casting');ultimateStart();}
   if(divinity?.authoritySkill&&action!=='ultimate')authorityBegin();
   if(action==='feather'){if(!divinity?.authoritySkill)later(80,()=>cutin(divinity?.skillName||'黒翼・羽弾'));later(520,()=>fire());}
   if(action==='pierce'){later(80,()=>cutin('穿羽',760,'pierce'));later(580,pierceCharge);later(880,()=>fire(240,'pierce'));}
   if(action==='volley'){if(!divinity?.authoritySkill)later(40,()=>cutin(divinity?.skillName||'連羽',680,'volley'));for(const e of events.filter(e=>e.kind==='hit'&&e.landed!==false))later(reduced?0:700+(e.hitIndex||0)*340,()=>fire(200,'volley',e.hitIndex||0));}
   if(action==='power'&&!divinity?.authoritySkill)authorityBegin();
  }
  if(e.kind==='hit'){
   if(e.damage>0&&action==='ultimate'){ultimateImpact();if(divinity?.authoritySkill)authorityImpact();if(divinity){bladeSlash();screenShake(true);}number('enemy',Math.floor(e.damage).toLocaleString('ja-JP'),'vfx-out vfx-shot-'+(e.hitIndex||0)+' vfx-ultimate-number');arena?.classList.remove('vfx-ultimate-casting');onSound?.('ultimate');}
   else if(e.damage>0&&action==='power'){authorityImpact();if(divinity){bladeSlash();screenShake(true);}number('enemy',Math.floor(e.damage).toLocaleString('ja-JP'),'vfx-out');pulse('enemy',true);onSound?.('hit');}
   else if(e.damage>0){if(divinity?.authoritySkill)authorityImpact();if(action==='pierce'&&!reduced){const trail=add('vfx-pierce-trail',figure('enemy'));if(trail)animate(trail,[{opacity:1,transform:'scaleX(.2)'},{opacity:1,offset:.35,transform:'scaleX(1)'},{opacity:0,transform:'scaleX(1.15)'}],{duration:320,fill:'both'});}const ring=add('vfx-impact'+(action==='ultimate'?' vfx-impact-ultimate':''),figure('enemy'));if(ring)animate(ring,[{opacity:1,transform:'translate(-50%,-50%) scale(.25)'},{opacity:1,offset:.25},{opacity:0,transform:'translate(-50%,-50%) scale(1.5)'}],{duration:reduced?120:240,fill:'both'});number('enemy',Math.floor(e.damage).toLocaleString('ja-JP'),'vfx-out vfx-shot-'+(e.hitIndex||0));pulse('enemy',['pierce','ultimate'].includes(action));if(divinity){bladeSlash();screenShake(divinity.authoritySkill||['pierce','ultimate'].includes(action));}const slash=add('vfx-strike'+(action==='ultimate'?' vfx-finisher':''),figure('enemy'));arena?.classList.remove('vfx-ultimate-casting');if(slash)animate(slash,[{opacity:0,transform:'rotate(-25deg) scaleX(.1)'},{opacity:1,offset:.25},{opacity:0,transform:'rotate(-25deg) scaleX(1.2)'}],{duration:reduced?100:180});onSound?.(action==='ultimate'?'ultimate':'hit');}
   else number('enemy',e.landed===false?'MISS':'0','vfx-zero vfx-shot-'+(e.hitIndex||0));
  }
  if(e.kind==='incomingHit'){if(action==='guard'&&arena?.classList.contains('div-arena')){const flash=add('vfx-shield-impact',figure('player'));if(flash)animate(flash,[{opacity:0,transform:'scale(.7)'},{opacity:1,offset:.25,transform:'scale(1)'},{opacity:0,transform:'scale(1.18)'}],{duration:reduced?100:260,fill:'both'});if(!reduced)screenShake(false);}number('player',e.damage>0?'−'+Math.floor(e.damage).toLocaleString('ja-JP'):'0','vfx-in');if(e.damage>0){pulse('player');onSound?.(action==='guard'?'guard':'incoming');}}
  if(e.kind==='kingEndure'){const hex=add('vfx-king-hex',figure('player'));if(hex)animate(hex,[{opacity:0,transform:'scale(.75)'},{opacity:1,offset:.18,transform:'scale(1.02)'},{opacity:1,offset:.5,transform:'scale(1)'},{opacity:0,transform:'scale(1.3)'}],{duration:reduced?140:560,fill:'both'});if(!reduced){screenShake(true);onSound?.('guard');}}
   if(e.kind==='enemyMiss')number('player','回避','vfx-zero');
  if(e.kind==='enemyStopped')number('enemy','行動停止','vfx-zero');
  if(e.kind==='armorBreak'){const el=texture(COMBAT_VFX.break,'vfx-crystal',figure('enemy'));if(el)animate(el,[{opacity:1,transform:'scale(.88)'},{opacity:0,transform:'scale(1.12)'}],{duration:reduced?120:220,fill:'both'});number('enemy',e.frame.mirror?'羽衣崩壊':'殻解除','vfx-label');onSound?.('break');}
  if(e.kind==='armorForm')number('enemy',e.frame.mirror?'反照羽衣':'殻形成','vfx-label');
  if(e.kind==='phaseChange')number('enemy','第'+e.frame.phase+'形態','vfx-label');
  if(e.kind==='authorityEffect'&&e.authority!=='abyss')number(e.authority==='wing'?'player':'enemy',e.text,'vfx-label vfx-fact-label');
  if(e.kind==='heal'){const label=actualHealLabel(e,previousFrame),next=events[index+1];if((e.target||'player')==='player'&&next?.kind==='mirrorShatter'&&(next.target||'player')==='player'&&next.text==='破鏡・生命回帰')pendingMirrorHeal=label;else number(e.target||'player',label,'vfx-heal vfx-fact-label');}
  if(e.kind==='erosion')number('enemy',actualErosionLabel(e),'vfx-label vfx-erosion-label vfx-fact-label');
  if(e.kind==='deadline')number('player','終末判定','vfx-in');
  const paused=divinity&&e.kind==='hit'&&e.damage>0?hitStop():0;
  if(paused)later(paused,()=>onFrame?.(e.frame,e));else onFrame?.(e.frame,e);previousFrame=e.frame||previousFrame;
  if(!closed){if(index+1<plan.frames.length)playNext(index+1,paused);else later(plan.duration-at+paused,clean);}
 });};
 signal?.addEventListener('abort',clean,{once:true});document.addEventListener('visibilitychange',visibility);if(signal?.aborted||document.hidden||!plan.frames.length)clean();else playNext();
 return {done,cancel:clean,plan};
}
