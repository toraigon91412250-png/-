import React, { useEffect, useState, useRef } from 'react';
import { VisualEffect } from '../types/game';

interface VisualEffectOverlayProps {
  effect: VisualEffect | null;
  speedMultiplier?: number;
}

/* Standalone 神威権能「全神の権能」VFX migrated into the existing battle overlay. */
const ALL_GODS_SWORDS = [
  [0.15,0.12],[0.85,0.14],[0.23,0.18],[0.77,0.20],[0.31,0.24],[0.69,0.26],
  [0.38,0.30],[0.62,0.32],[0.44,0.36],[0.56,0.38],[0.50,0.52]
].map(([x,summon],i)=>({
  x, summon, drop:summon+(i===10?0.12:0.07), duration:i===10?0.13:0.08,
  len:i===10?260:145+(i%4)*12, width:i===10?36:20+(i%3)*2, boss:i===10,
  portalY:i===10?0.12:0.10+((i%2)*0.03)
}));

const ALL_GODS_PARTICLES = Array.from({length:200},(_,i)=>({
  x:((i*73)%997)/997,
  y:((i*151)%991)/991,
  size:1.8+(((i*37)%100)/100)*4.5,
  speed:0.12+(((i*53)%100)/100)*0.40,
  phase:(((i*97)%360)/180)*Math.PI,
  golden:i%7!==0
}));

const drawAllGodsLine=(ctx:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,color:string,width:number)=>{
  ctx.strokeStyle=color; ctx.lineWidth=width; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
};

const drawAllGodsPortal=(ctx:CanvasRenderingContext2D,x:number,y: number,age:number,boss:boolean)=>{
  if(age<0||age>0.70)return;
  const alpha=age<0.06?age/0.06:age>0.55?(0.70-age)/0.15:1;
  const r=(boss?65:34)*(0.8+0.2*Math.min(1,age/0.06));
  ctx.save(); ctx.translate(x,y); ctx.globalAlpha=alpha; ctx.shadowBlur=boss?28:16; ctx.shadowColor='#FFD700';
  [[1,boss?3.5:2.2,'#FFDF00'],[0.88,boss?2.2:1.5,'#FFFFFF'],[0.65,1.2,'#FFB300']].forEach(([mul,lw,c])=>{
    ctx.strokeStyle=c as string; ctx.lineWidth=lw as number; ctx.beginPath(); ctx.arc(0,0,r*(mul as number),0,Math.PI*2); ctx.stroke();
  });
  ctx.rotate(age*(boss?Math.PI:Math.PI*2/3));
  const rays=boss?12:8;
  for(let i=0;i<rays;i++){const a=i*Math.PI*2/rays;drawAllGodsLine(ctx,0,0,Math.cos(a)*r,Math.sin(a)*r*0.45,'#FFF9C4',1.6);}
  ctx.shadowBlur=22; ctx.fillStyle='#FFFFFF'; ctx.beginPath(); ctx.arc(0,0,r*(boss?0.45:0.35),0,Math.PI*2); ctx.fill();
  ctx.restore();
};

const drawAllGodsSword=(ctx:CanvasRenderingContext2D,s:any,t:number,w:number,h:number)=>{
  if(t<s.summon)return;
  const px=s.x*w, py=s.portalY*h, gy=0.76*h;
  drawAllGodsPortal(ctx,px,py,t-s.summon,s.boss);
  if(t<s.drop)return;
  const p=Math.min(1,Math.max(0,(t-s.drop)/s.duration));
  const ease=p*p*p;
  const tipY=py+(gy-py)*ease;
  ctx.save(); ctx.translate(px,tipY); ctx.rotate((90-Math.atan2(gy-py,0)*180/Math.PI)*Math.PI/180);
  if(p<1){
    const trail=ctx.createLinearGradient(0,0,0,-s.len*2.5);
    trail.addColorStop(0,'rgba(255,255,255,.98)'); trail.addColorStop(.38,'rgba(255,223,0,.80)');
    trail.addColorStop(.72,'rgba(255,179,0,.30)'); trail.addColorStop(1,'rgba(255,179,0,0)');
    ctx.fillStyle=trail; ctx.beginPath(); ctx.moveTo(-s.width*.5,0); ctx.lineTo(s.width*.5,0);
    ctx.lineTo(s.width*2.2,-s.len*2.5); ctx.lineTo(-s.width*2.2,-s.len*2.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.95)'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.ellipse(0,-s.len*.18,s.width*1.8,s.width*.55,0,0,Math.PI*2); ctx.stroke();
  }
  ctx.shadowBlur=s.boss?30:18; ctx.shadowColor=s.boss?'rgba(255,245,157,.95)':'rgba(255,223,0,.55)';
  drawAllGodsLine(ctx,0,0,0,-s.len,s.boss?'rgba(255,245,157,.93)':'rgba(255,223,0,.60)',s.width*2.2);
  ctx.shadowBlur=0;
  const g=ctx.createLinearGradient(-s.width*.5,0,s.width*.5,0); g.addColorStop(0,'#FFFFFF'); g.addColorStop(.55,'#FFF9C4'); g.addColorStop(1,s.boss?'#FFDF00':'#FFC107');
  ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-s.width*.5,-s.len*.15); ctx.lineTo(-s.width*.5,-s.len); ctx.lineTo(0,-s.len); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#FFDF00'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(s.width*.5,-s.len*.15); ctx.lineTo(s.width*.5,-s.len); ctx.lineTo(0,-s.len); ctx.closePath(); ctx.fill();
  drawAllGodsLine(ctx,0,0,0,-s.len,'#FFFFFF',2);
  const guard=-s.len, guardW=s.width*(s.boss?3.6:2.8), guardH=s.width*.35;
  const gg=ctx.createLinearGradient(-guardW/2,0,guardW/2,0); gg.addColorStop(0,'#FFB300'); gg.addColorStop(.5,'#FFFFFF'); gg.addColorStop(1,'#FFB300');
  ctx.fillStyle=gg; ctx.fillRect(-guardW/2,guard-guardH/2,guardW,guardH);
  ctx.fillStyle=s.boss?'#FFD700':'#00E5FF'; ctx.beginPath(); ctx.arc(0,guard,s.width*(s.boss?.55:.42)*.7,0,Math.PI*2); ctx.fill();
  drawAllGodsLine(ctx,0,guard,0,guard-s.len*.28,'#FFC107',s.width*.28);
  ctx.fillStyle='#FFFFFF'; ctx.beginPath(); ctx.arc(0,guard-s.len*.28,s.width*.35,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#FFD54F'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,guard-s.len*.28,s.width*.55,0,Math.PI*2); ctx.stroke();
  ctx.restore();

  if(p<1)return;
  const post=t-s.drop-s.duration, pillar=s.boss?.95:.45;
  if(post<pillar){
    const q=post/pillar,a=(1-q)*(s.boss?1:.85),pw=(s.boss?130:48)*(1-q*.25), lg=ctx.createLinearGradient(px,0,px,gy);
    lg.addColorStop(0,'rgba(255,255,255,0)'); lg.addColorStop(.55,'rgba(255,255,255,'+(a*.95)+')');
    lg.addColorStop(.8,'rgba(255,223,0,'+a+')'); lg.addColorStop(1,'rgba(255,179,0,'+a+')');
    ctx.fillStyle=lg; ctx.fillRect(px-pw/2,0,pw,gy); ctx.fillStyle='rgba(255,255,255,'+a+')'; ctx.beginPath(); ctx.arc(px,gy,pw*.75,0,Math.PI*2); ctx.fill();
  }
  const shock=s.boss?.65:.35;
  if(post<shock){
    const q=post/shock,r=(s.boss?w*.45:w*.22)*q,a=(1-q)*.95;
    ctx.strokeStyle='rgba(255,255,255,'+a+')'; ctx.lineWidth=Math.max(1.5,6*(1-q)); ctx.beginPath(); ctx.arc(px,gy,r,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle='rgba(255,223,0,'+(a*.75)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(px,gy,r*.88,0,Math.PI*2); ctx.stroke();
  }
  if(post<.85){
    const a=(1-post/.85)*.85, n=s.boss?8:4, len=(s.boss?80:40)*Math.min(1,post/.12);
    for(let i=0;i<n;i++){const ang=(i*360/n+s.id*33)*Math.PI/180;drawAllGodsLine(ctx,px,gy,px+Math.cos(ang)*len,gy+Math.sin(ang)*len*.42,'rgba(255,241,118,'+a+')',2.5);}
  }
};

const drawAllGodsVfx=(ctx:CanvasRenderingContext2D,w:number,h:number,t:number)=>{
  ctx.save();
  const bg=ctx.createLinearGradient(0,0,0,h); bg.addColorStop(0,'#0C101E'); bg.addColorStop(.52,'#261D07'); bg.addColorStop(1,'#020408');
  ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);

  const cx=w*.5, cy=h*.38, rr=w*.44;
  if(t>=.08){
    const a=t<.25?(t-.08)/.17:t<.85?1:Math.max(0,1-(t-.85)/.15);
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*Math.PI*.55); ctx.globalAlpha=a; ctx.shadowBlur=16; ctx.shadowColor='#FFD700';
    ctx.strokeStyle='rgba(255,223,0,.80)'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(0,0,rr,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.65)'; ctx.lineWidth=1.8; ctx.beginPath(); ctx.arc(0,0,rr*.94,0,Math.PI*2); ctx.stroke();
    for(let i=0;i<12;i++){const ang=i*Math.PI/6;drawAllGodsLine(ctx,Math.cos(ang)*rr*.65,Math.sin(ang)*rr*.65,Math.cos(ang)*rr*.94,Math.sin(ang)*rr*.94,'rgba(255,245,157,.75)',1.6);}
    ctx.restore();
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(-t*Math.PI*.8); ctx.globalAlpha=a*.78; ctx.strokeStyle='#FFCA28'; ctx.lineWidth=1.8; ctx.beginPath(); ctx.arc(0,0,rr*.62,0,Math.PI*2); ctx.stroke();
    for(let k=0;k<2;k++){const off=k*Math.PI/3;ctx.beginPath();for(let i=0;i<=3;i++){const ang=off+i*Math.PI*2/3,px2=Math.cos(ang)*rr*.62,py2=Math.sin(ang)*rr*.62;if(i===0)ctx.moveTo(px2,py2);else ctx.lineTo(px2,py2);}ctx.closePath();ctx.strokeStyle='rgba(255,249,196,.60)';ctx.lineWidth=1.5;ctx.stroke();}ctx.restore();
  }

  const hy=h*.65; ctx.strokeStyle='rgba(255,223,0,.20)'; ctx.lineWidth=1.5;
  for(let i=1;i<=7;i++){const q=(i/7)**2,y=hy+(h-hy)*q;ctx.globalAlpha=q;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  for(let k=-4;k<=4;k++){ctx.globalAlpha=.75;ctx.beginPath();ctx.moveTo(cx,hy);ctx.lineTo(cx+k*w*.16,h);ctx.stroke();}ctx.globalAlpha=1;

  if(t>.18){const a=Math.min(1,(t-.18)/.30)*.45,g=ctx.createRadialGradient(cx,h*.75,0,cx,h*.75,w*.75);g.addColorStop(0,'rgba(255,223,0,'+a+')');g.addColorStop(.3,'rgba(255,160,0,'+(a*.3)+')');g.addColorStop(1,'rgba(255,160,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,h*.75,w*.75,0,Math.PI*2);ctx.fill();}
  if(t>.20){const a=t<.45?(t-.20)/.25:t<.85?1:Math.max(0,1-(t-.85)/.15),fy=h*.76;ctx.save();ctx.translate(cx,fy);ctx.rotate(t*Math.PI*1.2);ctx.globalAlpha=a;ctx.strokeStyle='rgba(255,223,0,.85)';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,w*.40,w*.14,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.60)';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(0,0,w*.352,w*.123,0,0,Math.PI*2);ctx.stroke();ctx.restore();}

  for(const p of ALL_GODS_PARTICLES){if(t<.06)continue;const tt=t-.06,x=p.x*w+Math.sin(tt*6+p.phase)*p.speed*w*.10,y=((((p.y-tt*p.speed)%1)+1)%1)*h,tw=(Math.sin(tt*12+p.phase)+1)*.5,a=(.35+tw*.65);ctx.fillStyle=p.golden?'rgba(255,234,117,'+a+')':'rgba(255,255,255,'+a+')';ctx.beginPath();ctx.arc(x,y,p.size*(.7+tw*.6),0,Math.PI*2);ctx.fill();if(p.size>3.5){ctx.fillStyle='rgba(255,215,0,'+(a*.45)+')';ctx.beginPath();ctx.arc(x,y,p.size*2.5,0,Math.PI*2);ctx.fill();}}

  /* 26 white divine feathers, with the same staged fall range as the Android source. */
  for(let i=0;i<26;i++){const u=(i*17)%100/100,v=(i*29)%100/100,spawn=.06+((i*13)%100)/100*.35;if(t<spawn)continue;const life=(t-spawn)/(.60+((i*7)%100)/100*.35);if(life>1)continue;const fade=life<.08?life/.08:life>.8?(1-life)/.2:1,len=i<4?280+((i*11)%100)/100*60:i<14?200+((i*11)%100)/100*60:140+((i*11)%100)/100*40,px=(.12+u*.76)*w+Math.sin(life*(1.3+((i*5)%100)/100*1.1)*Math.PI*2+i)* (80+((i*7)%100)/100*150),py=(-.08+v*.35)*h+life*h*.8*(.5+((i*3)%100)/100*.4),rot=((i*37)%100-50)*.5;ctx.save();ctx.translate(px,py);ctx.rotate(rot*Math.PI/180);ctx.shadowBlur=len*.045;ctx.shadowColor='rgba(255,223,0,.35)';ctx.fillStyle='rgba(255,255,255,'+(fade*.97)+')';const mw=len*.26,lw=mw*.35,tw=mw*.65;ctx.beginPath();ctx.moveTo(0,len*.38);ctx.bezierCurveTo(-tw*.6,len*.30,-tw,len*.02,-tw,-len*.15);ctx.bezierCurveTo(-tw*.85,-len*.32,-tw*.25,-len*.44,0,-len*.52);ctx.bezierCurveTo(lw*.3,-len*.44,lw*.95,-len*.22,lw,.02*len);ctx.bezierCurveTo(lw*.7,len*.22,lw*.3,len*.36,0,len*.38);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(237,231,246,'+(fade*.65)+')';ctx.lineWidth=1.6;ctx.stroke();drawAllGodsLine(ctx,0,len*.38,0,-len*.52,'rgba(255,249,196,'+(fade*.95)+')',Math.max(2.5,Math.min(5,len*.024)));ctx.restore();}

  const impacted=[]; for(const s of ALL_GODS_SWORDS){if(t>=s.drop+s.duration)impacted.push({x:s.x*w,y:h*.76});drawAllGodsSword(ctx,s,t,w,h);}
  if(impacted.length>=4){const a=Math.min(1,Math.max(0,(t-.40)/.20))*.75;for(let i=0;i<impacted.length-1;i++){drawAllGodsLine(ctx,impacted[i].x,impacted[i].y,impacted[i+1].x,impacted[i+1].y,'rgba(255,223,0,'+a+')',1.6);drawAllGodsLine(ctx,impacted[i].x,impacted[i].y,impacted[i+1].x,impacted[i+1].y,'rgba(255,255,255,'+(a*.7)+')',.8);}}

  const boss=ALL_GODS_SWORDS[10],bi=t-(boss.drop+boss.duration);
  if(bi>0&&bi<=.90){const q=bi/.90,ease=1-(1-q)*(1-q),a=Math.max(0,1-q*.9),bx=boss.x*w,by=h*.76,r=Math.max(10,w*.85*ease);if(q<.1){ctx.fillStyle='rgba(255,255,255,'+((1-q/.1)*.95)+')';ctx.fillRect(0,0,w,h);}const g=ctx.createRadialGradient(bx,by,0,bx,by,r);g.addColorStop(0,'rgba(255,255,255,'+a+')');g.addColorStop(.25,'rgba(255,249,196,'+(a*.95)+')');g.addColorStop(.60,'rgba(255,223,0,'+(a*.85)+')');g.addColorStop(.82,'rgba(255,160,0,'+(a*.50)+')');g.addColorStop(1,'rgba(255,160,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(bx,by,r,0,Math.PI*2);ctx.fill();for(let i=0;i<24;i++){const ang=(i*15+q*45)*Math.PI/180;drawAllGodsLine(ctx,bx,by,bx+Math.cos(ang)*r*1.25,by+Math.sin(ang)*r*1.25,'rgba(255,249,196,'+(a*.80)+')',Math.max(1.5,6*(1-q)));}}
  ctx.restore();
};

export const VisualEffectOverlay: React.FC<VisualEffectOverlayProps> = ({ effect }) => {
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastUiUpdateRef = useRef(0);

  useEffect(() => {
    if (!effect) {
      setProgress(0);
      lastUiUpdateRef.current = 0;
      return;
    }

    setProgress(0);
    lastUiUpdateRef.current = 0;
    const isAllGods = effect.isUltimate && effect.skillName === '全神の権能';
    const duration = isAllGods ? 1300 : effect.isUltimate ? 700 : 450;
    const startTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // Keep the animation clock at 60fps, but update React-driven visuals at about 30fps.
      // CSS cut-in animation remains smooth while reducing per-frame React/canvas work.
      if (t >= 1 || now - lastUiUpdateRef.current >= 33) {
        lastUiUpdateRef.current = now;
        setProgress(t);
      }

      if (t < 1) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [effect?.effectId]);

  // Canvas drawing for slashes, bursts, projectiles, shockwaves
  useEffect(() => {
    if (!effect || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const w = canvas.width || 800;
      const h = canvas.height || 800;
      ctx.clearRect(0, 0, w, h);

      const targetCenter = effect.targetIsPlayer ? { x: w * 0.5, y: h * 0.70 } : { x: w * 0.5, y: h * 0.28 };
      const actorCenter = effect.targetIsPlayer ? { x: w * 0.5, y: h * 0.28 } : { x: w * 0.5, y: h * 0.70 };
      const t = progress;
      const isAllGods = effect.isUltimate && effect.skillName === '全神の権能';

      ctx.save();

      // 1. Buff Aura
      if (effect.isBuff) {
        const radius = Math.max(1, t * 110);
        const alpha = Math.max(0, 1 - t);
        const grad = ctx.createRadialGradient(targetCenter.x, targetCenter.y, 0, targetCenter.x, targetCenter.y, radius);
        grad.addColorStop(0, 'rgba(255, 213, 79, 0.8)');
        grad.addColorStop(0.6, 'rgba(255, 143, 0, 0.5)');
        grad.addColorStop(1, 'rgba(255, 143, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Energy rings
        ctx.strokeStyle = `rgba(255, 224, 130, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, Math.max(1, radius * 0.85), 0, Math.PI * 2);
        ctx.stroke();

        // Sparks
        for (let i = -3; i <= 3; i++) {
          const sx = targetCenter.x + i * 22;
          const sy = targetCenter.y + 40 - t * 90;
          ctx.strokeStyle = `rgba(255, 213, 79, ${alpha})`;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy - 28);
          ctx.stroke();
        }
      }

      // 2. Evade Dodge Speedlines
      else if (effect.isEvade) {
        const alpha = Math.max(0, 1 - t);
        const len = 140 * t;
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.85})`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
          const oy = targetCenter.y + i * 24;
          ctx.beginPath();
          ctx.moveTo(targetCenter.x - len + i * 15, oy);
          ctx.lineTo(targetCenter.x + len + i * 15, oy);
          ctx.stroke();
        }
        ctx.strokeStyle = `rgba(100, 255, 218, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, Math.max(1, 60 * t), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Migrated 技一・全神の権能 VFX
      else if (isAllGods) {
        drawAllGodsVfx(ctx, w, h, t);
      }

      // 4. Ultimate Nova Blast
      else if (effect.isUltimate) {
        const radius = Math.max(1, t * w * 0.65);
        const alpha = Math.max(0, 1 - t);
        const grad = ctx.createRadialGradient(targetCenter.x, targetCenter.y, 0, targetCenter.x, targetCenter.y, radius);
        grad.addColorStop(0, 'rgba(255, 249, 196, 0.95)');
        grad.addColorStop(0.3, 'rgba(255, 111, 0, 0.8)');
        grad.addColorStop(0.7, 'rgba(216, 67, 21, 0.5)');
        grad.addColorStop(1, 'rgba(216, 67, 21, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.strokeStyle = `rgba(255, 213, 79, ${alpha * 0.8})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, Math.max(1, radius * 0.9), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Irena Feather Projectiles & Burst (羽弾)
      else if (effect.effectType === 'SPECIAL_FEATHER') {
        if (t < 0.45) {
          const projT = t / 0.45;
          const cx = actorCenter.x + (targetCenter.x - actorCenter.x) * projT;
          const cy = actorCenter.y + (targetCenter.y - actorCenter.y) * projT;
          for (let i = -2; i <= 2; i++) {
            const px = cx + i * 16;
            const py = cy - i * 12;
            ctx.fillStyle = 'rgba(100, 255, 218, 0.9)';
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(224, 64, 251, 1)';
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          const impactT = (t - 0.45) / 0.55;
          const radius = Math.max(1, impactT * 120);
          const alpha = Math.max(0, 1 - impactT);
          const grad = ctx.createRadialGradient(targetCenter.x, targetCenter.y, 0, targetCenter.x, targetCenter.y, radius);
          grad.addColorStop(0, `rgba(224, 64, 251, ${alpha})`);
          grad.addColorStop(0.6, `rgba(0, 229, 255, ${alpha * 0.7})`);
          grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(targetCenter.x, targetCenter.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Kaiser Seismic Smash (重撃)
      else if (effect.effectType === 'SPECIAL_SMASH') {
        const radius = Math.max(1, t * 140);
        const alpha = Math.max(0, 1 - t);
        ctx.strokeStyle = `rgba(255, 143, 0, ${alpha * 0.9})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 61, 0, ${alpha * 0.8})`;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, Math.max(1, radius * 0.65), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 6. Critical Hit (Dual Golden Slash + Spark Burst)
      else if (effect.isCritical) {
        const slashLen = 160 * t;
        const alpha = Math.max(0, 1 - t * 0.8);
        ctx.strokeStyle = `rgba(255, 213, 79, ${alpha})`;
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(targetCenter.x - slashLen, targetCenter.y - slashLen * 0.7);
        ctx.lineTo(targetCenter.x + slashLen, targetCenter.y + slashLen * 0.7);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 111, 0, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(targetCenter.x - slashLen, targetCenter.y + slashLen * 0.7);
        ctx.lineTo(targetCenter.x + slashLen, targetCenter.y + slashLen * 0.7);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 249, 196, ${alpha})`;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, Math.max(1, 35 * t), 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Normal Hit (Full-Screen Slash + Particle Burst)
      else if (effect.effectType === 'NORMAL_HIT') {
        const screenScale = Math.max(w, h) / 800;
        const slashLen = Math.max(w, h) * 0.34 * Math.min(1.25, 0.8 + t);
        const slashRise = Math.max(w, h) * 0.14;
        const alpha = Math.max(0, 1 - t);
        const impactRadius = Math.max(1, Math.max(w, h) * 0.035 * t);

        // Main slash: scales with the actual viewport instead of a fixed pixel size.
        ctx.save();
        ctx.translate(targetCenter.x, targetCenter.y);
        ctx.rotate(-0.28);

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(5, 9 * screenScale);
        ctx.beginPath();
        ctx.moveTo(-slashLen, -slashRise);
        ctx.lineTo(slashLen, slashRise);
        ctx.stroke();

        // Bright cutting core.
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, alpha * 1.2)})`;
        ctx.lineWidth = Math.max(2, 3.5 * screenScale);
        ctx.beginPath();
        ctx.moveTo(-slashLen * 0.96, -slashRise * 0.96);
        ctx.lineTo(slashLen * 0.96, slashRise * 0.96);
        ctx.stroke();

        // Secondary slash for a layered impact.
        ctx.strokeStyle = `rgba(210, 230, 255, ${alpha * 0.75})`;
        ctx.lineWidth = Math.max(2, 4 * screenScale);
        ctx.beginPath();
        ctx.moveTo(-slashLen * 0.78, -slashRise * 0.78 + 18 * screenScale);
        ctx.lineTo(slashLen * 0.78, slashRise * 0.78 + 18 * screenScale);
        ctx.stroke();
        ctx.restore();

        // Central impact flash.
        const grad = ctx.createRadialGradient(
          targetCenter.x,
          targetCenter.y,
          0,
          targetCenter.x,
          targetCenter.y,
          impactRadius * 3.5
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(0.45, `rgba(224, 242, 255, ${alpha * 0.7})`);
        grad.addColorStop(1, 'rgba(224, 242, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, impactRadius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Deterministic particles radiating from the hit point.
        for (let i = 0; i < 36; i++) {
          const seed = (effect.effectId * 97 + i * 53) % 360;
          const angle = (seed * Math.PI) / 180;
          const speed = Math.max(w, h) * (0.00055 + (i % 6) * 0.00016);
          const distance = speed * t * 900;
          const px = targetCenter.x + Math.cos(angle) * distance;
          const py = targetCenter.y + Math.sin(angle) * distance;
          const particleSize = Math.max(2, screenScale * (2.5 + (i % 4)));
          const particleAlpha = alpha * (0.55 + (i % 5) * 0.08);

          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, particleAlpha)})`;
          ctx.beginPath();
          ctx.arc(px, py, particleSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    } catch {
      // safely handle any canvas rendering failure
    }
  }, [effect, progress]);

  if (!effect) return null;

  const t = progress;

  // Ultimate Screen Dim: Only active during 0.05 < t < 0.75 of ULTIMATE skill
  // Strictly guaranteed to be 0 otherwise, so it can never remain on screen!
  const ultimateDimAlpha = effect.isUltimate && t >= 0.05 && t <= 0.75
    ? (t < 0.25 ? ((t - 0.05) / 0.2) * 0.55 : ((0.75 - t) / 0.5) * 0.55)
    : 0;

  const ultimateFlashAlpha = effect.isUltimate && t >= 0.15 && t <= 0.35
    ? (1 - Math.abs(t - 0.25) / 0.1) * 0.4
    : 0;

  const critFlashAlpha = effect.isCritical && t >= 0.08 && t <= 0.24
    ? (1 - Math.abs(t - 0.16) / 0.08) * 0.25
    : 0;

  // Damage Number Scale & Offset
  const popScale = t < 0.2 ? (t / 0.2) * 1.3 : t < 0.4 ? 1.3 - (t - 0.2) * 0.8 : 1.0;
  const popAlpha = t > 0.75 ? (1 - t) / 0.25 : 1;
  const yOffset = -30 - t * 45;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* Dim Overlay - strictly conditional and zero when animation finishes */}
      {ultimateDimAlpha > 0.01 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(0, 0, 0, ${ultimateDimAlpha})`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Screen Flash */}
      {ultimateFlashAlpha > 0.01 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(255, 255, 255, ${ultimateFlashAlpha})`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Critical Flash */}
      {critFlashAlpha > 0.01 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(255, 213, 79, ${critFlashAlpha})`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        width={typeof window !== 'undefined' ? window.innerWidth || 800 : 800}
        height={typeof window !== 'undefined' ? window.innerHeight || 800 : 800}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Special Skill Cut-In (e.g. いれーな『羽弾』) */}

      {/* Grand Ultimate Cut-In Banner */}
      {effect.isUltimate && t >= 0.05 && t <= 0.85 && (
        <div
          style={{
            position: 'absolute',
            top: '32%',
            transform: `translateY(-50px) scale(${t < 0.25 ? 0.85 + t * 0.6 : 1.0})`,
            opacity: t > 0.65 ? (0.85 - t) / 0.2 : 1,
            backgroundColor: '#1E0E08',
            border: '2px solid #FFD54F',
            borderRadius: '14px',
            padding: '12px 28px',
            boxShadow: '0 0 24px rgba(255, 213, 79, 0.6)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 900,
              color: '#FFD54F',
              letterSpacing: '2px',
              marginBottom: '4px',
            }}
          >
            🌟 ULTIMATE SKILL 🌟
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#FFFFFF',
              textShadow: '0 0 10px #FF6F00',
            }}
          >
            必殺技『{effect.skillName}』
          </div>
        </div>
      )}

      {/* Evade "MISS!" Badge */}
      {effect.isEvade && (
        <div
          style={{
            position: 'absolute',
            top: effect.targetIsPlayer ? '68%' : '28%',
            transform: `translateY(-30px) scale(${t < 0.2 ? (t / 0.2) * 1.2 : 1.0})`,
            opacity: t > 0.7 ? (1 - t) / 0.3 : 1,
            backgroundColor: 'rgba(0, 56, 71, 0.95)',
            border: '2px solid #00E5FF',
            borderRadius: '10px',
            padding: '8px 18px',
            textAlign: 'center',
            boxShadow: '0 0 16px rgba(0, 229, 255, 0.5)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#80D8FF' }}>
            💨 MISS!! 回避成功！
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#E0F7FA' }}>
            ダメージ無効＆必殺技ゲージ+1
          </div>
        </div>
      )}

      {/* Buff "POWER UP!" Badge */}
      {effect.isBuff && (
        <div
          style={{
            position: 'absolute',
            top: effect.targetIsPlayer ? '68%' : '28%',
            transform: `translateY(-30px) scale(${t < 0.2 ? (t / 0.2) * 1.2 : 1.0})`,
            opacity: t > 0.7 ? (1 - t) / 0.3 : 1,
            backgroundColor: 'rgba(62, 30, 5, 0.95)',
            border: '2px solid #FFB300',
            borderRadius: '10px',
            padding: '8px 18px',
            textAlign: 'center',
            boxShadow: '0 0 16px rgba(255, 179, 0, 0.5)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#FFD54F' }}>
            ⚡ POWER UP!! 強化完了！
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#FFF9C4' }}>
            次の攻撃行動のダメージ +50
          </div>
        </div>
      )}

      {/* Floating Damage Numbers */}
      {effect.damage > 0 && (
        <div
          style={{
            position: 'absolute',
            top: effect.targetIsPlayer ? '68%' : '28%',
            transform: `translateY(${yOffset}px) scale(${popScale})`,
            opacity: Math.max(0, Math.min(1, popAlpha)),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {effect.isCritical && (
            <div
              style={{
                backgroundColor: '#D84315',
                border: '1.5px solid #FFD54F',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '12px',
                fontWeight: 900,
                color: '#FFF9C4',
                marginBottom: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              ⚡ CRITICAL HIT! ⚡
            </div>
          )}

          {effect.statusAilmentName && (
            <div
              style={{
                backgroundColor: effect.statusAilmentName === '出血' ? '#B71C1C' : '#4A148C',
                border: `1.5px solid ${effect.statusAilmentName === '出血' ? '#FF8A80' : '#E1BEE7'}`,
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#FFFFFF',
                marginBottom: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              {effect.statusAilmentName === '出血' ? '🩸 出血付与！ (毎T -50)' : '🌀 重圧付与！ (速度/攻撃-25)'}
            </div>
          )}

          <div
            style={{
              backgroundColor: effect.isUltimate
                ? 'rgba(62, 18, 5, 0.95)'
                : effect.isCritical
                ? 'rgba(56, 18, 6, 0.95)'
                : 'rgba(30, 36, 51, 0.95)',
              border: `2px solid ${
                effect.isUltimate
                  ? '#FFD54F'
                  : effect.isCritical
                  ? '#FF9800'
                  : '#64B5F6'
              }`,
              borderRadius: '10px',
              padding: '4px 16px',
              fontSize: effect.isUltimate ? '32px' : effect.isCritical ? '28px' : '22px',
              fontWeight: 900,
              color: effect.isUltimate ? '#FFEB3B' : effect.isCritical ? '#FFD54F' : '#FFFFFF',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            -{effect.damage} DMG
          </div>
        </div>
      )}
    </div>
  );
};