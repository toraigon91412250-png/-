import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {startMirrorTrial,actMirrorTrial} from '../../web/src/utils/mirrorTrial.js';import {available} from '../../web/src/utils/gameCore.js';import {freshMain20,validateMain20} from '../../web/src/utils/main20.js';import {clone,equip,buyMark,fuse,buyPower} from '../../web/src/utils/progression.js';
const budgets=JSON.parse(fs.readFileSync(new URL('../authority-tactics-audit21/legal-builds.json',import.meta.url)));
export function mirrorFixtures(){const out=[];for(const tier of ['arrival','trained'])for(const [label,pair,marks] of [
 ['wing-judge',['wing','judge'],['split','starfall','endure']],['wing-king',['wing','king'],['split','iron','crown']],['fallen-judge',['fallen','judge'],['fire','moon','endure']],['king-abyss',['king','abyss'],['crown','abyssmark','iron']],['judge-wing',['judge','wing'],['split','moon','life']],['abyss-wing',['abyss','wing'],['split','abyssmark','wind']],['bare',[],[]],['fallen-wing',['fallen','wing'],['split','fire','iron']],['king-judge',['king','judge'],['crown','moon','iron']]]){
 const s=clone(budgets[tier]);for(const p of [...s.equipped])equip(s,p,'power');for(const p of pair)equip(s,p,'power');for(const m of [...s.markEquip])equip(s,m,'mark');for(const m of marks){if(!s.marks.includes(m)){if(s.p<2000&&tier==='arrival')continue;buyMark(s,m);}equip(s,m,'mark');}
 out.push({label:tier+'-'+label,build:validateMain20(s)});
 }for(const id of ['god','fallenwing','abyssking','judgewing','abyssjudge']){const s=clone(budgets.trained);fuse(s,id);s.equipped=[];equip(s,id,'power');out.push({label:'fused-'+id,build:validateMain20(s)});}out.push({label:'fresh',build:freshMain20()});return out;}
export function mirrorPolicy(b,policy){
 const ready=ids=>ids.find(x=>!available(b,x));const feathers=b.marks.includes('split')?['volley','pierce']:['feather'];
 if(policy==='feather')return ready([...feathers,'slash']);
 if(policy==='burst')return ready(['ultimate','power',...feathers,'slash']);
 if(policy==='counter'){
 if(b.trial.judgeHits>=2||b.lastAction==='ultimate')return 'guard';
 if(b.trial.opening&&b.hp/b.base.hp<.5)return ready(['ultimate','power','slash']);
 if(b.enemy.statuses.campaignArmor)return ready(['ultimate','power',...feathers,'slash']);
 return ready(['ultimate',...feathers,'power','slash']);
 }
 if(policy==='duel'){
 if(b.lastAction==='ultimate'||b.lastAction==='power'&&b.hp/b.base.hp<.6)return 'guard';
 if(b.trial.opening&&b.hp/b.base.hp<.7)return ready(['ultimate','power','slash']);
 if(b.enemy.statuses.campaignArmor)return ready(['ultimate','power','guard']);
 return ready(['ultimate',...feathers,'power','slash']);
 }
 // Policy observes only already executed player actions and current state, no hidden AI or future damage.
 if(['ultimate','power'].includes(b.lastAction))return 'guard';
 if(b.trial.opening)return ready(['ultimate','power','slash']);
 return ready(['ultimate','power',...feathers,'slash']);
}
export const mirrorRng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
export function mirrorRun(build,policy,seed,options={}){const b=startMirrorTrial(build,options),rng=mirrorRng(seed),count={slash:0,feather:0,pierce:0,volley:0,power:0,ultimate:0,guard:0};while(!b.result&&b.trial.actions<100){const a=mirrorPolicy(b,policy);count[a]++;actMirrorTrial(b,a,{rng});if(!Number.isFinite(b.hp+b.enemy.hp))throw Error('nonfinite');}return {result:b.result||'timeout',turns:b.trial.actions,awake:b.trial.awake,finalPhase:b.enemy.phase,normalClear:b.trial.normalCleared,deepClear:b.result==='win'&&b.enemy.phase===3,damage:b.trial.damage,taken:b.trial.taken,shatters:b.trial.shatters,hp:b.hp/b.base.hp,...count,history:b.trial.history};}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const rows=[],traces=[];for(const f of mirrorFixtures())for(const policy of ['feather','burst','tactical','duel','counter'])for(const seed of [1,19,46,91,173,997]){const r=mirrorRun(f.build,policy,seed);traces.push({build:f.label,policy,seed,history:r.history});delete r.history;rows.push({build:f.label,policy,seed,...r});}
 const dir=new URL('./',import.meta.url);fs.writeFileSync(new URL('simulation.json',dir),JSON.stringify(rows,null,2));fs.writeFileSync(new URL('traces.json',dir),JSON.stringify(traces));const keys=Object.keys(rows[0]);fs.writeFileSync(new URL('simulation.csv',dir),keys.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]).join(',')).join('\n'));
 for(const f of mirrorFixtures()){const parts=['feather','burst','tactical','duel','counter'].map(p=>{const a=rows.filter(r=>r.build===f.label&&r.policy===p);return p+':'+a.filter(r=>r.result==='win').length+'/'+a.length+'('+Math.round(a.reduce((n,r)=>n+r.turns,0)/a.length)+'T)';});console.log(f.label,parts.join(' '));}console.log('battles',rows.length,'timeouts',rows.filter(r=>r.result==='timeout').length);
}
