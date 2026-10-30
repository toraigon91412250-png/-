import fs from 'node:fs';
import {fresh,clone,train,upgradePower} from '../../web/src/utils/progression.js';
import {act,available,startBattle,settle,playerStats} from '../../web/src/utils/gameCore.js';
export function seeded(seed){let value=seed>>>0;return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}
export function choose(b,strategy){
 if(b.statuses.stun)return 'wait';
 if(b.character==='stella')return b.hp/b.base.hp<.5&&!available(b,'rebirth')?'rebirth':!available(b,'meteor')?'meteor':!available(b,'immortal')?'immortal':'slash';
 const feathers=b.marks.includes('split')?['volley','pierce']:['feather'];
 const ready=ids=>ids.find(id=>!available(b,id));
 if(strategy==='slash')return 'slash';
 if(strategy==='guard'&&b.hp/b.base.hp<.8&&b.turn%3===0)return 'guard';
 if(strategy!=='feather'&&!available(b,'ultimate'))return 'ultimate';
 if(['mixed','guard'].includes(strategy)&&b.enemy.statuses.campaignArmor&&!available(b,'power'))return 'power';
 if(['mixed','guard'].includes(strategy)&&b.turn%3===0&&!available(b,'power'))return 'power';
 return ready([...feathers,'slash']);
}
export function fightMeasured(b,strategy,rng,actFn=act){const uses={};let received=0,dealt=0;while(!b.result&&b.turn<201){const id=choose(b,strategy);uses[id]=(uses[id]||0)+1;actFn(b,id,{rng});received+=b.enemyDamage;dealt+=b.lastDamage;}return {win:b.result==='win',result:b.result||'timeout',turns:b.turn,uses,received,dealt,hp:Math.round(playerStats(b).current)};}
export function grow(s){for(const id of Object.keys(s.powers))while(s.powers[id]<5&&s.fragments[id]>=s.powers[id]*8)upgradePower(s,id);for(const id of ['talent','feather','destruction','ultimate']){const level=id==='talent'?s.talent:s.skills[id];if(level<(id==='talent'?20:10)&&s.p>level*(id==='talent'?30:35)+100)train(s,id);}}
export function measureMain(){const checkpoints=[1,2,5,10,15,20,25,50,100],snapshots={};const route=fresh();route.started=true;const routeLog=[];
 for(let floor=1;floor<=100;floor++){grow(route);if(checkpoints.includes(floor))snapshots[floor]=clone(route);const b=startBattle(route);const m=fightMeasured(b,'feather',seeded(10000+floor));routeLog.push({floor,...m});if(!m.win)break;settle(route,b);}
 const rows=[];for(const floor of checkpoints){if(!snapshots[floor])continue;for(const strategy of ['feather','slash','mixed','guard']){const runs=Array.from({length:32},(_,i)=>fightMeasured(startBattle(clone(snapshots[floor])),strategy,seeded(21001+i)));rows.push({floor,strategy,samples:32,wins:runs.filter(x=>x.win).length,meanTurns:runs.reduce((n,x)=>n+x.turns,0)/32,maxTurns:Math.max(...runs.map(x=>x.turns)),meanReceived:runs.reduce((n,x)=>n+x.received,0)/32,uses:runs.reduce((out,x)=>{for(const [id,n]of Object.entries(x.uses))out[id]=(out[id]||0)+n;return out;},{}),level:snapshots[floor].level,talent:snapshots[floor].talent,skills:snapshots[floor].skills,investedP:180+routeLog.filter(x=>x.floor<floor).reduce((n,x)=>n+35+x.floor*5,0)-snapshots[floor].p,reward:35+floor*5});}}
 const sample=fresh();sample.level=2;const workDamage={};for(const id of ['slash','power','feather']){const b=startBattle(sample,{floor:2,test:true});act(b,id,{rng:()=>.7});workDamage[id]=b.lastDamage;}
 const oneShots=[1,3,4,5].map(floor=>{const a=fresh();a.level=floor;const b=startBattle(a,{floor,test:true});act(b,'feather',{rng:()=>.7});return {floor,damage:b.lastDamage,result:b.result};});
 const result={conditions:'Reference route: fresh main save, wing+abyss, automatic affordable authority upgrade + one talent/feather/destruction/ultimate training per floor; no claims or marks. Each strategy receives identical checkpoint snapshot. Seeds 21001..21032, 200-round cap. Training investment excludes fragments.',rows,workReference:{sameLevel2Fresh:workDamage,oneShots},route:routeLog};fs.writeFileSync('reports/overnight-lab/main-balance.json',JSON.stringify(result,null,2));return result;}
if(process.argv[1]?.endsWith('measure-main.mjs')){const r=measureMain();console.log(JSON.stringify({battles:r.rows.length*32,rows:r.rows.length,reference:r.workReference,routeWins:r.route.filter(x=>x.win).length}));}
