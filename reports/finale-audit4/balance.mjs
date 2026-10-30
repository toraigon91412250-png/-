import fs from 'node:fs';import assert from 'node:assert/strict';
import {fresh} from '../../web/src/utils/progression.js';import {available,playerStats,settle} from '../../web/src/utils/gameCore.js';import {startGuardBreakTrial,actGuardBreakTrial,GUARD_BREAK_TRIAL} from '../../web/src/utils/guardBreakTrial.js';
export function pickTrial(b,strategy){
 if(b.statuses.stun)return 'wait';
 if(strategy==='feather')return !available(b,'feather')?'feather':'slash';
 const armor=!!b.enemy.statuses.guardBreakArmor;
 if(strategy==='guard'&&(b.hp/b.base.hp<.5||(armor&&!b.buffs.some(x=>x.id==='guardBreakFocus'))))return 'guard';
 return ['ultimate',...(armor?['power']:['feather']),'power','slash'].find(id=>!available(b,id));
}
const rows=[];
for(const strategy of ['feather','mixed','guard'])for(let seed=1;seed<=3;seed++){
 const s=fresh(),before=JSON.stringify(s),b=startGuardBreakTrial(s);let n=seed,peak=0,guards=0,breaks=0;const rng=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 while(!b.result&&b.turn<=100){const action=pickTrial(b,strategy),count=b.log.filter(x=>x==='熾炎の鎧を破壊した').length;actGuardBreakTrial(b,action,{rng});peak=Math.max(peak,b.lastDamage);if(action==='guard')guards++;if(b.log.filter(x=>x==='熾炎の鎧を破壊した').length>count)breaks++;for(const v of Object.values(playerStats(b)))assert.ok(Number.isFinite(v));assert.ok(Number.isFinite(b.enemy.hp));}
 assert.ok(b.result,strategy+' terminates');if(strategy==='guard')assert.equal(b.result,'win');if(strategy==='feather')assert.equal(b.result,'lose');settle(s,b);assert.equal(JSON.stringify(s),before);
 rows.push({strategy,seed,result:b.result,turns:b.turn,peak,guards,breaks});
}
const result={settings:GUARD_BREAK_TRIAL,battles:rows.length,nonfinite:0,unfinished:0,mainSaveChanges:0,rows};fs.writeFileSync(new URL('balance.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
