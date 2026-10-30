import fs from 'node:fs';
const root=process.env.GAME_ROOT||new URL('../',import.meta.url).pathname.replace(/\/$/,'');
const {mirrorFixtures,mirrorRng}=await import(root+'/reports/mirror-audit28/simulate.mjs');
const {startMirrorTrial,actMirrorTrial}=await import(root+'/web/src/utils/mirrorTrial.js');
const {available}=await import(root+'/web/src/utils/gameCore.js');
const {observeCombat}=await import(root+'/web/src/utils/combatObservation.js');
const {RECIPES}=await import(root+'/web/src/data/config.js');
const modes=['burst','shatter','counter','switch','wing','abyss','low','adaptive'];
export function select(b,mode){
 const m=b.trial,ready=xs=>xs.find(x=>!available(b,x)),feathers=b.marks.includes('split')?['volley','pierce','feather']:['feather'];
 if(b.statuses.stun)return 'wait';
 if(mode==='burst'||mode==='low')return ready(['ultimate','power',...feathers,'slash']);
 if(mode==='adaptive'&&m.ritual>=2&&m.ritual!==0)return ready(['ultimate','guard']);
 if(mode==='counter'){if(m.ritual>=2||!m.counterReady&&!m.opening)return 'guard';return ready(['power','slash',...feathers]);}
 if(mode==='shatter'){if(m.opening)return ready(['power','slash']);return m.actions%2?'guard':ready(['power',...feathers,'slash']);}
 if(mode==='wing'){if(b.enemy.statuses.campaignArmor)return ready(['power','ultimate','slash']);if(m.wingWindow||b.lastAction==='power'||m.actions===0)return ready([...feathers,'slash']);return ready(['power','slash',...feathers]);}
 if(mode==='abyss'){if(m.ritual>=2)return 'guard';if(m.opening)return ready(['power','slash']);return ready(['power','feather','slash']);}
 if(mode==='switch'){return ready(m.attackFamily==='feather'?['power','slash']:['feather','power','slash']);}
 if(m.opening)return ready(['power','slash']);if(m.counterReady)return ready([...feathers,'slash']);return 'guard';
}
const variants=mirrorFixtures().map(x=>({...x,kind:'existing',level:null}));
const template=mirrorFixtures().find(x=>x.label==='trained-king-abyss').build;
for(const rec of RECIPES)for(let level=1;level<=5;level++){const build=structuredClone(template);build.equipped=[rec.id];build.powers={};build.resonance={[rec.id]:level};build.markEquip=['split','iron','endure'];build.marks=[...new Set([...build.marks,...build.markEquip])];variants.push({label:rec.id+'-L'+level,kind:rec.live?'live':'unavailable',level,build});}
const rows=[];
for(const v of variants)for(const mode of modes)for(const seed of [1,19,46,91,173,997]){
 const b=startMirrorTrial(v.build,{phase:3}),rng=mirrorRng(seed),events=[],steps=[];if(mode==='low')b.hp=b.base.hp*.45;
 while(!b.result&&b.trial.actions<100){const action=select(b,mode),before=b.trial.seals,start=events.length;
 observeCombat(b,e=>events.push(e),()=>actMirrorTrial(b,action,{rng}));
 const breaks=events.slice(start).filter(e=>e.kind==='mirrorSealBreak');
 if(breaks.length>1||breaks.length&&before-b.trial.seals!==1)throw Error('invalid seal event aggregation');
 if(b.result==='win'&&b.trial.seals>0)throw Error('sealed victory');
 if(!Number.isFinite(b.hp+b.enemy.hp))throw Error('nonfinite');
 steps.push({action,from:before,to:b.trial.seals,route:breaks[0]?.route||null});}
 rows.push({label:v.label,kind:v.kind,level:v.level,playerLevel:Number(b.build?.level)||1,mode,seed,result:b.result||'timeout',turns:b.trial.actions,seals:b.trial.seals,steps,doom:events.filter(e=>e.kind==='mirrorDoom').length,responses:events.filter(e=>e.kind==='mirrorDoomResponse').map(e=>({response:e.response,success:e.success})),robeBlocked:events.filter(e=>e.kind==='mirrorRobeBlocked').length});
}
fs.writeFileSync(process.env.SIM_OUT||root+'/reports/mirror-stage2/simulation.json',JSON.stringify({root,seeds:[1,19,46,91,173,997],conditions:variants.length*modes.length,rows}));
for(const mode of modes){const r=rows.filter(x=>x.mode===mode),w=r.filter(x=>x.result==='win'),routes={};for(const x of r)for(const s of x.steps)if(s.route)routes[s.route]=(routes[s.route]||0)+1;console.log(mode,r.length,w.length,'winTurns',w.length?(w.reduce((s,x)=>s+x.turns,0)/w.length).toFixed(2):null,'timeout',r.filter(x=>x.result==='timeout').length,JSON.stringify(routes));}
for(const level of [...new Set(rows.map(x=>x.playerLevel))].sort((a,b)=>a-b)){const r=rows.filter(x=>x.playerLevel===level),w=r.filter(x=>x.result==='win');console.log('playerLevel',level,r.length,w.length,'timeout',r.filter(x=>x.result==='timeout').length);}
