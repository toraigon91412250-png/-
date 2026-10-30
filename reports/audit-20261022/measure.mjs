import fs from 'node:fs';import {createHash} from 'node:crypto';
import {fresh,developerState,clone,upgradePower,train} from '../../web/src/utils/progression.js';
import {startBattle,act,available,settle,playerStats} from '../../web/src/utils/gameCore.js';
import * as E from '../../web/src/utils/campaign20.js';
import {runRoute,summarize,studyConfig} from '../strategy-study/policies.mjs';
import {seeded,choose,grow,fightMeasured} from '../overnight-lab/measure-main.mjs';
const out={sourceHashes:{},conditions:'Current runtime; deterministic seeds 21001..21032; no forced victories. Developer build ONLY for explicit fixed-build EX comparisons. Timeouts count as failures.',main:{},ex:[],campaign:[],resonance:[]};
for(const f of ['config.js','../utils/gameCore.js','../utils/progression.js','../utils/campaign20.js']){const p=new URL('../../web/src/data/'+f,import.meta.url);out.sourceHashes[f]=createHash('sha256').update(fs.readFileSync(p)).digest('hex');}
const route=fresh();let wins=0,max=0;for(let floor=1;floor<=100;floor++){grow(route);const b=startBattle(route),r=fightMeasured(b,'feather',seeded(10000+floor));if(!r.win)break;wins++;max=Math.max(max,r.turns);settle(route,b);}out.main={wins,maxTurns:max,endingLevel:route.level};
for(const pair of [['wing','abyss'],['wing','king'],['judge','abyss'],['wing','fallen'],['abyss','king']])for(const split of [false,true]){
 const runs=[];for(let seed=21001;seed<=21032;seed++){const s=developerState(fresh());s.equipped=pair;s.markEquip=split?['split']:[];runs.push(fightMeasured(startBattle(s,{mode:'ex'}),'mixed',seeded(seed)));}
 out.ex.push({pair,split,samples:runs.length,wins:runs.filter(x=>x.win).length,meanTurns:runs.reduce((n,x)=>n+x.turns,0)/runs.length});
}
let battles=320+100;const floorRows={16:{attempts:0,wins:0},19:{attempts:0,wins:0}};
for(const profile of Object.keys(studyConfig.profiles))for(const mark of ['none','split'])for(const tier of ['low','standard','high'])for(const strategy of ['feather','mixed','guard','slash','adaptive']){
 const runs=Array.from({length:32},(_,i)=>runRoute({profile,mark,tier,strategy,seed:21001+i},E));battles+=runs.reduce((n,r)=>n+r.fights.length,0);
 for(const r of runs)for(const f of r.fights)if(f.mode==='normal'&&floorRows[f.floor]){floorRows[f.floor].attempts++;if(f.win)floorRows[f.floor].wins++;}
 const s=summarize(runs);out.campaign.push({profile,mark,tier,strategy,samples:32,clear20:s.clear20,ex:s.ex,timeouts:s.timeouts,normalMean:s.normalMean});
}
out.campaignFloors=floorRows;out.totalSimulatedBattles=battles;
for(const id of ['god','fallenwing','abyssking','judgewing','abyssjudge'])for(const lv of [1,5]){const s=developerState(fresh());s.equipped=[id];s.resonance[id]=lv;s.markEquip=['split'];const runs=Array.from({length:32},(_,i)=>fightMeasured(startBattle(s,{mode:'ex'}),'mixed',seeded(21001+i)));out.resonance.push({id,lv,upgradeShards:lv===5?400:0,wins:runs.filter(x=>x.win).length,samples:32,meanTurns:runs.reduce((n,x)=>n+x.turns,0)/32});}
out.totalSimulatedBattles+=out.resonance.reduce((n,r)=>n+r.samples,0);
out.summon={singleP:25,tenP:250,guaranteedUniqueUntilCollectionComplete:true,fragmentPerDraw:8,duplicateResShards:5,fixedTargetGuaranteed:false};
fs.writeFileSync(new URL('balance-current.json',import.meta.url),JSON.stringify(out,null,2));console.log(JSON.stringify({totalSimulatedBattles:battles,campaign:out.campaign.length,main:out.main,floors:floorRows,ex:out.ex,resonance:out.resonance}));
