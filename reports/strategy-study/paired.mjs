import fs from 'node:fs';import {createHash} from 'node:crypto';
import {clone} from '../../web/src/utils/progression.js';
import {studyConfig,runRoute,measureBattle} from './policies.mjs';
const engines={A:await import('./engine-A.mjs'),B:await import('./engine-B.mjs'),C:await import('./engine-C.mjs')},samples=Number(process.argv[2]||32),fd=fs.openSync('reports/strategy-study/paired.jsonl','w'),groups={};let snapshots=0,battles=0;
for(const profile of Object.keys(studyConfig.profiles))for(const mark of studyConfig.marks)for(const tier of studyConfig.tiers)for(const strategy of studyConfig.strategies)for(let sample=0;sample<samples;sample++){
 runRoute({profile,mark,tier,strategy,seed:21001+sample},engines.A,{snapshotObserver:({scenario,run,mode,at})=>{
  const hash=createHash('sha256').update(JSON.stringify(run)).digest('hex'),results={};
  for(const [id,E]of Object.entries(engines)){const state=clone(run),b=E.startCampaignBattle(state);results[id]=measureBattle(b,strategy,E,{focusCounterfactual:true});battles++;}
  snapshots++;fs.writeSync(fd,JSON.stringify({scenario,mode,at,initialStateSHA256:hash,results})+'\n');
  const key=[profile,mark,tier,strategy,at].join('/');const g=groups[key] ||= {profile,mark,tier,strategy,at,n:0,A:{wins:0,rounds:0,received:0},B:{wins:0,rounds:0,received:0},C:{wins:0,rounds:0,received:0}};g.n++;
  for(const id of Object.keys(engines)){g[id].wins+=results[id].win?1:0;g[id].rounds+=results[id].steps;g[id].received+=results[id].received;}
 }});
}
fs.closeSync(fd);fs.writeFileSync('reports/strategy-study/paired-summary.json',JSON.stringify({samples,reference:'Actual reachable A routes. Every candidate receives an identical cloned pre-battle campaign state with same RNG seed, gear, growth, P, fragments and mode. Unreachable checkpoints are not manufactured. No settlement of counterfactuals.',snapshots,battles,groups:Object.values(groups)},null,2));console.log(JSON.stringify({samples,snapshots,battles}));
