import fs from 'node:fs';
import {mirrorFixtures,mirrorRun} from './simulate.mjs';
const rows=[];
for(const f of mirrorFixtures())for(const policy of ['burst','tactical'])for(const seed of [19,173,997]){
 const raw=JSON.stringify(f.build),r=mirrorRun(f.build,policy,seed,{phase:3});delete r.history;
 if(JSON.stringify(f.build)!==raw)throw Error('Main build mutated');
 rows.push({build:f.label,policy,seed,...r});
}
const keys=Object.keys(rows[0]);fs.writeFileSync(new URL('checkpoint-simulation.csv',import.meta.url),keys.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]).join(',')).join('\n'));
fs.writeFileSync(new URL('checkpoint-simulation.json',import.meta.url),JSON.stringify(rows,null,2));
console.log(JSON.stringify({battles:rows.length,wins:rows.filter(r=>r.result==='win').length,timeouts:rows.filter(r=>r.result==='timeout').length,maxTurns:Math.max(...rows.map(r=>r.turns))}));
