import fs from 'node:fs';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {studyConfig,runRoute,summarize} from './policies.mjs';
const engineId=process.argv[2]||'raw',samples=Number(process.argv[3]||32),startSeed=Number(process.argv[4]||21001),label=process.argv[5]||`${engineId}-${samples}-${startSeed}`;
const E=await import(engineId==='runtime'?new URL('../../web/src/utils/campaign20.js',import.meta.url):new URL(`./engine-${engineId}.mjs`,import.meta.url));
const out=new URL(`./${label}`,import.meta.url);fs.mkdirSync(out,{recursive:true});const fd=fs.openSync(new URL('routes.jsonl',out.href+'/'),'w'),groups=[],started=Date.now();let totalRoutes=0,battles=0;
for(const profile of Object.keys(studyConfig.profiles))for(const mark of studyConfig.marks)for(const tier of studyConfig.tiers)for(const strategy of studyConfig.strategies){
 const routes=[];for(let i=0;i<samples;i++){const scenario={profile,mark,tier,strategy,seed:startSeed+i};const route=runRoute(scenario,E);routes.push(route);fs.writeSync(fd,JSON.stringify(route)+'\n');totalRoutes++;battles+=route.fights.length;}
 groups.push({profile,mark,tier,strategy,...summarize(routes)});
}
fs.closeSync(fd);const result={engine:engineId,samples,startSeed,endSeed:startSeed+samples-1,totalRoutes,battles,elapsedMs:Date.now()-started,configSHA256:createHash('sha256').update(fs.readFileSync(new URL('./study-config.json',import.meta.url))).digest('hex'),groups};fs.writeFileSync(new URL('summary.json',out.href+'/'),JSON.stringify(result,null,2));
const cols=['profile','mark','tier','strategy','n','normalWins','normalAttempts','defeats','timeouts','reached20','clear20','reachedStella','stella','reachedEX','ex','normalMean','normalMedian','normalMax','completedNormalMeanTotal','meanReceived','maxReceived','meanHPLossFraction','meanInvestment','meanTrainingP','meanMarkP','meanUnusedP','guardHeal','focusHits'];fs.writeFileSync(new URL('summary.csv',out.href+'/'),[cols.join(','),...groups.map(x=>cols.map(c=>x[c]??'').join(','))].join('\n'));
console.log(JSON.stringify({engine:engineId,samples,totalRoutes,battles,elapsedMs:result.elapsedMs,clear20:groups.reduce((a,x)=>a+x.clear20,0),ex:groups.reduce((a,x)=>a+x.ex,0),timeouts:groups.reduce((a,x)=>a+x.timeouts,0),output:out.pathname}));
