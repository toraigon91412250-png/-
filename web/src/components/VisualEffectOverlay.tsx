import React, { useEffect, useState, useRef } from 'react';
import { VisualEffect } from '../types/game';
import { CHARACTERS } from '../data/characters';
import { SuperFallenShotVfx } from './SuperFallenShotVfx';

interface SingleVisualEffectOverlayProps {
  effect: VisualEffect;
  speedMultiplier?: number;
}

// Floating feather layout for the special cut-in (x%, y%, delay ratio, size px, rotation deg)
const CUTIN_FEATHERS = [
  [8, 20, 0.0, 26, -30], [22, 78, 0.12, 20, 20], [38, 12, 0.2, 18, 60],
  [55, 85, 0.05, 24, -60], [70, 18, 0.18, 22, 15], [86, 70, 0.08, 28, -15],
  [94, 30, 0.25, 16, 45], [3, 60, 0.3, 18, 80],
];

const SpecialCutIn: React.FC<{ imageSrc: string; skillName: string; actorName: string; isEnemy: boolean; durationMs: number }> = ({
  imageSrc,
  skillName,
  actorName,
  isEnemy,
  durationMs,
}) => {
  const d = `${durationMs}ms`;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      <style>{`
        @keyframes cutinBand {
          0% { transform: translateX(-110%) skewY(-8deg); opacity: 0; }
          14% { transform: translateX(0) skewY(-8deg); opacity: 1; }
          70% { transform: translateX(0) skewY(-8deg); opacity: 1; }
          100% { transform: translateX(110%) skewY(-8deg); opacity: 0; }
        }
        @keyframes cutinImage {
          0% { transform: scale(1.25) translateX(-6%); }
          100% { transform: scale(1.05) translateX(4%); }
        }
        @keyframes cutinText {
          0%, 12% { transform: translateX(60px); opacity: 0; letter-spacing: 12px; }
          28% { transform: translateX(0); opacity: 1; letter-spacing: 3px; }
          72% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes cutinFeather {
          0% { transform: translate(0, 0) rotate(var(--r)) scale(0.4); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translate(90px, -70px) rotate(calc(var(--r) + 140deg)) scale(1.1); opacity: 0; }
        }
        @keyframes cutinFlash {
          0% { opacity: 0.55; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Brief white flash */}
      <div style={{ position: 'absolute', inset: 0, background: '#E0F7FA', animation: `cutinFlash calc(${d} * 0.25) ease-out forwards` }} />

      {/* Diagonal band with the cut-in art */}
      <div
        style={{
          position: 'absolute',
          left: '-5%',
          right: '-5%',
          top: '34%',
          height: '30%',
          minHeight: '150px',
          overflow: 'hidden',
          borderTop: '3px solid #B2EBF2',
          borderBottom: '3px solid #E1BEE7',
          boxShadow: '0 0 30px rgba(128, 222, 234, 0.7)',
          background: '#1a2233',
          animation: `cutinBand ${d} cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transform: isEnemy ? 'scaleX(-1)' : undefined }}>
          <img
            src={imageSrc}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 40%',
              display: 'block',
              animation: `cutinImage ${d} linear forwards`,
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(10,13,22,0) 40%, rgba(10,13,22,0.75) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '6%',
            top: '50%',
            marginTop: '-34px',
            textAlign: 'right',
            animation: `cutinText ${d} ease-out forwards`,
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#B2EBF2', textShadow: '0 1px 4px #000' }}>
            {actorName} ─ SPECIAL SKILL
          </div>
          <div style={{ fontSize: '38px', fontWeight: 900, color: '#FFFFFF', textShadow: '0 0 12px #00E5FF, 0 2px 6px #000' }}>
            『{skillName}』
          </div>
        </div>
      </div>

      {/* Drifting feathers */}
      {CUTIN_FEATHERS.map(([x, y, delay, size, rot], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            fontSize: `${size}px`,
            opacity: 0,
            filter: 'drop-shadow(0 0 6px #80DEEA)',
            ['--r' as string]: `${rot}deg`,
            animation: `cutinFeather calc(${d} * 0.8) ease-out calc(${d} * ${delay}) forwards`,
          } as React.CSSProperties}
        >
          🪶
        </div>
      ))}
    </div>
  );
};

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


const RUIN_SEQUENCE_DURATION_MS = 5600;

const RUIN_ASSETS = {
  "feather": "https://raw.githubusercontent.com/toraigon91412250-png/-/main/Firefly_一本の巨大な黒い羽根、堕天使を連想させる不吉で神秘的な雰...毛、鋭く美...細な羽毛の質感、わずかな赤い光の反射、ダークファンタジー、ゲームの必殺技演 142180.png",
  "cloud": "https://raw.githubusercontent.com/toraigon91412250-png/-/main/Firefly_漆黒の巨大な黒雲、重く渦巻く暗い雲、雲の内部に無数の細か...っている、...かな赤い光が見える、不吉で神秘的な雰囲気、堕天使を思わせるダークファンタジ 142180.png",
  "intro": "https://raw.githubusercontent.com/toraigon91412250-png/-/b3e223fdbfa4c66e95bc47b6df0f07322795c36f/irena_ruin_intro.jpg",
  "hand": "https://raw.githubusercontent.com/toraigon91412250-png/-/main/1790944467835.jpg",
  "cracks": "https://raw.githubusercontent.com/toraigon91412250-png/-/main/Firefly_現実の空間がガラスのように大きくひび割れ、中央部分から崩...ダークフ...ァ表現。_画面中央に大きな不規則な亀裂、その周囲にも細かな亀裂が広がっている 142180.png"
};

const ruinPhaseAlpha = (t: number, start: number, end: number, fade = 0.08) => {
  if (t <= start || t >= end) return 0;
  const fadeIn = Math.min(1, (t - start) / Math.max(0.0001, fade));
  const fadeOut = Math.min(1, (end - t) / Math.max(0.0001, fade));
  return Math.min(fadeIn, fadeOut, 1);
};

const RuinAuthorityVfx: React.FC<{ progress: number; effectDamage: number }> = ({ progress, effectDamage }) => {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (Object.entries(RUIN_ASSETS) as Array<[string, string]>).forEach(([key, src]) => {
      const image = new Image();
      image.onload = () => {
        if (!cancelled) setLoaded(prev => ({ ...prev, [key]: true }));
      };
      image.onerror = () => {
        if (!cancelled) setLoaded(prev => ({ ...prev, [key]: false }));
      };
      image.src = src;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const t = progress;
  const featherA = ruinPhaseAlpha(t, 0.08, 0.25, 0.08);
  const cloudA = ruinPhaseAlpha(t, 0.20, 0.39, 0.10);
  const introA = ruinPhaseAlpha(t, 0.29, 0.54, 0.06);
  const handA = ruinPhaseAlpha(t, 0.52, 0.82, 0.06);
  const crackA = ruinPhaseAlpha(t, 0.76, 0.94, 0.06);

  const featherP = Math.min(1, Math.max(0, (t - 0.08) / 0.17));
  const cloudP = Math.min(1, Math.max(0, (t - 0.20) / 0.19));
  const introP = Math.min(1, Math.max(0, (t - 0.29) / 0.25));
  const handP = Math.min(1, Math.max(0, (t - 0.52) / 0.30));
  const crackP = Math.min(1, Math.max(0, (t - 0.76) / 0.18));

  const collapseP = Math.min(1, Math.max(0, (t - 0.90) / 0.10));
  const collapseEase = collapseP * collapseP * (3 - 2 * collapseP);
  const endBlack = Math.min(1, Math.max(0, (t - 0.96) / 0.04));

  return (
    <div
      className="battle-vfx-root"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        overflow: 'hidden',
        background: '#000000',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes ruinParticleDrift {
          0% { transform: translate3d(0, 20px, 0) scale(0.6); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translate3d(30px, -160px, 0) scale(1.15); opacity: 0; }
        }
        @keyframes ruinDarkPulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.42; }
        }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, background: '#000000', opacity: 0.96 }} />

      {loaded.feather && featherA > 0 && (
        <img
          src={RUIN_ASSETS.feather}
          alt=""
          style={{
            position: 'absolute',
            left: '50%',
            top: '48%',
            width: 'min(72vw, 720px)',
            height: 'min(86vh, 860px)',
            objectFit: 'contain',
            transform: `translate(-50%, -50%) rotate(${-8 + featherP * 12}deg) scale(${0.62 + featherP * 0.45})`,
            opacity: featherA * 0.98,
            filter: 'drop-shadow(0 0 26px rgba(130,0,0,0.72)) contrast(1.12)',
          }}
        />
      )}

      {loaded.cloud && cloudA > 0 && (
        <img
          src={RUIN_ASSETS.cloud}
          alt=""
          style={{
            position: 'absolute',
            left: '50%',
            top: '40%',
            width: '130%',
            height: '78%',
            objectFit: 'cover',
            transform: `translate(-50%, -50%) scale(${1.06 + cloudP * 0.12}) translateX(${(cloudP - 0.5) * 2.5}%)`,
            opacity: cloudA * 0.76,
            filter: 'contrast(1.2) brightness(0.62) saturate(0.65)',
          }}
        />
      )}

      {cloudA > 0 && Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${8 + ((i * 37) % 84)}%`,
            top: `${48 + ((i * 53) % 42)}%`,
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            borderRadius: '50%',
            background: i % 4 === 0 ? '#8b0000' : '#2a2a2a',
            boxShadow: i % 4 === 0 ? '0 0 10px rgba(180,0,0,0.8)' : '0 0 8px rgba(0,0,0,0.9)',
            animation: `ruinParticleDrift 1.3s ease-out ${(i * 0.05).toFixed(2)}s infinite`,
            opacity: cloudA * 0.62,
          }}
        />
      ))}

      {loaded.intro && introA > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 42%, rgba(130,0,0,0.08), rgba(0,0,0,0.42) 58%, rgba(0,0,0,0.78) 100%)',
            opacity: introA,
          }}
        >
          <img
            src={RUIN_ASSETS.intro}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              transform: `scale(${1.18 - introP * 0.06}) translate3d(${(0.5 - introP) * 1.5}%, 0, 0)`,
              filter: 'contrast(1.08) saturate(0.88)',
            }}
          />
        </div>
      )}

      {loaded.hand && handA > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 52% 40%, rgba(160,0,0,0.07), rgba(0,0,0,0.40) 60%, rgba(0,0,0,0.76) 100%)',
            opacity: handA,
          }}
        >
          <img
            src={RUIN_ASSETS.hand}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              transform: `scale(${1.14 + handP * 0.07}) translate3d(0, ${-handP * 1.5}%, 0)`,
              filter: 'contrast(1.08) saturate(0.86)',
            }}
          />
        </div>
      )}

      {loaded.cracks && crackA > 0 && (
        <img
          src={RUIN_ASSETS.cracks}
          alt=""
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '112%',
            height: '112%',
            objectFit: 'cover',
            transform: `translate(-50%, -50%) scale(${0.92 + crackP * 0.14})`,
            opacity: crackA * 0.96,
            filter: 'contrast(1.35) brightness(1.08)',
          }}
        />
      )}

      {crackA > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(255,0,0,0.10), rgba(0,0,0,0.74) 52%, rgba(0,0,0,0.96) 100%)',
            opacity: crackA,
            animation: 'ruinDarkPulse 0.55s ease-in-out infinite',
          }}
        />
      )}

      {collapseP > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: `${10 + collapseEase * 120}vw`,
            height: `${10 + collapseEase * 120}vh`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: '#000000',
            boxShadow: '0 0 80px rgba(0,0,0,0.98), 0 0 0 3px rgba(80,0,0,0.72)',
            opacity: 0.94 + collapseEase * 0.06,
          }}
        />
      )}


      {effectDamage > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '13%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            color: '#FFFFFF',
            fontSize: 'clamp(28px, 6vw, 64px)',
            fontWeight: 950,
            letterSpacing: '0.04em',
            textShadow: '0 3px 0 #000, 0 0 14px rgba(255,40,40,0.95), 0 0 28px rgba(0,0,0,0.95)',
            whiteSpace: 'nowrap',
            opacity: Math.min(1, 0.25 + progress * 5),
          }}
        >
          −{effectDamage} DMG
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: '#000000', opacity: endBlack }} />
    </div>
  );
};

const SingleVisualEffectOverlay: React.FC<SingleVisualEffectOverlayProps> = ({ effect, speedMultiplier = 1 }) => {
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
    const isRuin = effect.isUltimate && effect.skillName === '破壊の権能';
    const isSuperFallenCharge = effect.effectType === 'SUPER_FALLEN_CHARGE';
    const isSuperFallenShot = effect.effectType === 'SUPER_FALLEN_SHOT';
    const duration = effect.effectType === 'BLEED_TICK'
      ? 850
      : isSuperFallenCharge
        ? 760 / Math.max(0.1, speedMultiplier)
        : isSuperFallenShot
          ? 980 / Math.max(0.1, speedMultiplier)
          : isAllGods
            ? 1300
            : isRuin
              ? RUIN_SEQUENCE_DURATION_MS / Math.max(0.1, speedMultiplier)
              : effect.isUltimate
                ? 700
                : 450;
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
      const isRuin = effect.isUltimate && effect.skillName === '破壊の権能';

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

      // 3. 超堕天撃専用VFXはCSS/画像レイヤーで描画します。

      // 4. Migrated 技一・全神の権能 VFX
      else if (isAllGods) {
        drawAllGodsVfx(ctx, w, h, t);
      }

      // 5. 破壊の権能は専用のレイヤー演出で描画する。
      else if (isRuin) {
        // Legacy ULTIMATE canvas effect is intentionally suppressed for this variant.
      }

      // 6. Generic ultimate impact: layered shockwaves for normal variants.
      else if (isGenericUltimate) {
        const size = Math.max(w, h);
        const alpha = Math.max(0, 1 - t);
        const center = targetCenter;
        const radius = size * (0.08 + 0.32 * t);

        const grad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
        grad.addColorStop(0, 'rgba(255,255,255,' + (alpha * 0.95) + ')');
        grad.addColorStop(0.28, 'rgba(255,224,130,' + (alpha * 0.72) + ')');
        grad.addColorStop(1, 'rgba(255,193,7,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 4; i += 1) {
          const ringProgress = Math.max(0, t - i * 0.08);
          const ring = size * (0.10 + ringProgress * (0.16 + i * 0.03));
          ctx.strokeStyle = 'rgba(255,224,130,' + (alpha * (0.78 - i * 0.12)) + ')';
          ctx.lineWidth = Math.max(2, size * (0.004 - i * 0.00035));
          ctx.beginPath();
          ctx.arc(center.x, center.y, ring, 0, Math.PI * 2);
          ctx.stroke();
        }

        for (let i = 0; i < 16; i += 1) {
          const angle = (i / 16) * Math.PI * 2 + effect.effectId * 0.09;
          const inner = size * 0.07;
          const outer = size * (0.20 + 0.25 * t) * (0.78 + (i % 5) * 0.06);
          ctx.strokeStyle = 'rgba(255,249,196,' + (alpha * (0.35 + (i % 4) * 0.10)) + ')';
          ctx.lineWidth = Math.max(1.5, size * 0.0022);
          ctx.beginPath();
          ctx.moveTo(center.x + Math.cos(angle) * inner, center.y + Math.sin(angle) * inner);
          ctx.lineTo(center.x + Math.cos(angle) * outer, center.y + Math.sin(angle) * outer);
          ctx.stroke();
        }
      }

      // 7. Irena Feather Projectiles & Burst (羽弾)
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

      // 6. Kaiser Seismic Smash (重撃)
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

      // 7. Critical Hit (Dual Golden Slash + Spark Burst)
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

      // 8. Normal Hit (Full-Screen Slash + Particle Burst)
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
  const isAllGods = effect.isUltimate && effect.skillName === '全神の権能';
  const isRuin = effect.isUltimate && effect.skillName === '破壊の権能';
  const isSuperFallenCharge = effect.effectType === 'SUPER_FALLEN_CHARGE';
  const isSuperFallenShot = effect.effectType === 'SUPER_FALLEN_SHOT';
  const isGenericUltimate = effect.isUltimate && !isAllGods && !isRuin && effect.effectType === 'ULTIMATE_BLAST';

  const critFlashAlpha = effect.isCritical && t >= 0.08 && t <= 0.24
    ? (1 - Math.abs(t - 0.16) / 0.08) * 0.25
    : 0;

  // Damage Number Scale & Offset
  const popScale = t < 0.2 ? (t / 0.2) * 1.3 : t < 0.4 ? 1.3 - (t - 0.2) * 0.8 : 1.0;
  const popAlpha = t > 0.75 ? (1 - t) / 0.25 : 1;
  const yOffset = -30 - t * 45;

  const cutInSrc = effect.effectType === 'SPECIAL_FEATHER'
    ? CHARACTERS.find(c => c.name === effect.actorName)?.specialCutInSrc
    : undefined;
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
        animation: isSuperFallenShot
          ? 'superFallenImpactShake 560ms cubic-bezier(0.2, 0.8, 0.2, 1)'
          : isGenericUltimate
            ? 'ultimateImpactShake 680ms cubic-bezier(0.2, 0.8, 0.2, 1)'
            : undefined,
      }}
    >
      <style>{[
        '@keyframes superFallenImpactShake {',
        '  0%, 100% { transform: translate3d(0,0,0); }',
        '  18% { transform: translate3d(-7px,2px,0) scale(1.01); }',
        '  34% { transform: translate3d(8px,-3px,0) scale(1.015); }',
        '  52% { transform: translate3d(-5px,2px,0); }',
        '  70% { transform: translate3d(3px,-1px,0); }',
        '}',
        '@keyframes ultimateImpactShake {',
        '  0%, 100% { transform: translate3d(0,0,0); }',
        '  16% { transform: translate3d(-5px,1px,0) scale(1.008); }',
        '  30% { transform: translate3d(6px,-2px,0) scale(1.012); }',
        '  48% { transform: translate3d(-4px,2px,0); }',
        '  68% { transform: translate3d(2px,-1px,0); }',
        '}',
        '@media (prefers-reduced-motion: reduce) {',
        '  .battle-vfx-root { animation: none !important; }',
        '}',
      ].join('\n')}</style>
      {/* Dedicated special / ultimate impact flashes */}
      {isSuperFallenShot && t > 0.04 && t < 0.42 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 48%, rgba(255,255,255,0.82) 0%, rgba(224,64,251,0.24) 30%, rgba(224,64,251,0) 72%)',
            opacity: Math.max(0, 1 - Math.abs(t - 0.16) / 0.26),
          }}
        />
      )}
      {isGenericUltimate && t > 0.08 && t < 0.56 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 38%, rgba(255,255,255,0.76) 0%, rgba(255,213,79,0.20) 34%, rgba(255,193,7,0) 75%)',
            opacity: Math.max(0, 1 - Math.abs(t - 0.24) / 0.32),
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
      {isRuin && <RuinAuthorityVfx key={effect.effectId} progress={t} effectDamage={effect.damage} />}
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

      {/* Dedicated 超堕天撃 VFX */}
      {isSuperFallenCharge && (
        <SuperFallenShotVfx
          key={`super-fallen-charge-${effect.effectId}`}
          mode="CHARGE"
          progress={t}
          durationMs={760 / Math.max(0.1, speedMultiplier)}
        />
      )}
      {isSuperFallenShot && (
        <SuperFallenShotVfx
          key={`super-fallen-shot-${effect.effectId}`}
          mode="SHOT"
          progress={t}
          durationMs={980 / Math.max(0.1, speedMultiplier)}
          damage={effect.damage}
          isEvade={effect.isEvade}
        />
      )}

      {/* Special Skill Cut-In (e.g. いれーな『羽弾』) */}
      {cutInSrc && !isSuperFallenCharge && !isSuperFallenShot && (
        <SpecialCutIn
          key={effect.effectId}
          imageSrc={cutInSrc}
          skillName={effect.skillName}
          actorName={effect.actorName}
          isEnemy={effect.targetIsPlayer}
          durationMs={Math.round(820 / Math.max(0.1, speedMultiplier))}
        />
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
            次の攻撃行動のダメージ +125
          </div>
        </div>
      )}

      {/* Floating Damage Numbers */}
      {effect.damage > 0 && !isRuin && !isSuperFallenCharge && !isSuperFallenShot && (
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

          {effect.statusAilmentName && effect.effectType !== 'BLEED_TICK' && (
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
              {effect.statusAilmentName === '出血' ? '🩸 出血付与！ (3T / 速度-20 / 防御-20)' : '🌀 重圧付与！ (速度/攻撃-25)'}
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

interface VisualEffectOverlayProps {
  effects: VisualEffect[];
  speedMultiplier?: number;
}

export const VisualEffectOverlay: React.FC<VisualEffectOverlayProps> = ({
  effects,
  speedMultiplier = 1,
}) => (
  <>
    {effects.map(effect => (
      <SingleVisualEffectOverlay
        key={effect.effectId}
        effect={effect}
        speedMultiplier={speedMultiplier}
      />
    ))}
  </>
);
