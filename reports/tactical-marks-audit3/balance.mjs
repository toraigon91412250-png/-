import fs from 'node:fs';import assert from 'node:assert/strict';
import {fresh,developerState} from '../../web/src/utils/progression.js';
import {startBattle,act,available,playerStats} from '../../web/src/utils/gameCore.js';
const out=new URL('./',import.meta.url),rand=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const build=(powers,marks)=>{const s=developerState(fresh());s.level=100;s.talent=10;s.skills={feather:7,destruction:7,ultimate:7};s.stats={hp:20,atk:30,def:0,spd:0};s.equipped=powers;s.markEquip=marks;return s;};
function choose(b,policy){if(b.statuses.stun)return 'wait';if(policy==='feather')return !available(b,'feather')?'feather':'guard';if(policy==='guard'&&b.turn%2===1)return 'guard';return ['ultimate','feather','power','slash'].find(id=>!available(b,id));}
const rows=[];
for(const [profile,powers,marks]of [['旧3種',['wing','king'],['split','starfall','endure']],['羽弾・反攻',['wing','king'],['wind','iron','life']],['断罪・侵食',['judge','abyss'],['moon','abyssmark','life']],['瀕死・耐久',['fallen','king'],['fire','crown','iron']]])for(const mode of ['normal','ex'])for(const policy of ['feather','mixed','guard'])for(let seed=1;seed<=3;seed++){
 const b=startBattle(build(powers,marks),{mode,floor:100,test:true}),rng=rand(seed);let peak=0;
 while(!b.result&&b.turn<=200){act(b,choose(b,policy),{rng});peak=Math.max(peak,b.lastDamage);assert.ok(Number.isFinite(b.hp)&&Number.isFinite(b.enemy.hp)&&Number.isFinite(b.lastDamage));for(const n of Object.values(playerStats(b)))assert.ok(Number.isFinite(n));}
 assert.ok(b.result,profile+mode+policy+' completes');rows.push({profile,mode,policy,seed,result:b.result,turns:b.turn,peak,used:b.used.marks});
}
const summaries=[];for(const {profile,mode,policy}of rows){if(summaries.some(x=>x.profile===profile&&x.mode===mode&&x.policy===policy))continue;const same=rows.filter(x=>x.profile===profile&&x.mode===mode&&x.policy===policy);summaries.push({profile,mode,policy,wins:same.filter(x=>x.result==='win').length,total:same.length,meanTurns:Math.round(same.reduce((s,x)=>s+x.turns,0)/same.length*10)/10,peak:Math.max(...same.map(x=>x.peak))});}
// Differential regression against the original engine: no marks and the preserved three.
const before=JSON.parse(fs.readFileSync(new URL('authorized-changes.json',out)))['web/src/utils/gameCore.js'].before;
const original=before.replace("'../data/config.js'",JSON.stringify(new URL('../../web/src/data/config.js',out).href)).replace("'./progression.js'",JSON.stringify(new URL('../../web/src/utils/progression.js',out).href));
const old=await import('data:text/javascript;base64,'+Buffer.from(original).toString('base64'));let compared=0;
for(const mode of ['normal','ex'])for(const marks of [[],['split','starfall','endure']])for(let seed=1;seed<=3;seed++){
 const s=build(['wing','king'],marks),a=old.startBattle(s,{mode,floor:100,test:true}),b=startBattle(s,{mode,floor:100,test:true}),ra=rand(seed),rb=rand(seed);
 while(!a.result&&a.turn<=200){const action=choose(a,'mixed');old.act(a,action,{rng:ra});act(b,action,{rng:rb});for(const key of ['base','hp','gauge','cd','lives','markLife','result','lastDamage','enemyDamage','used','turn','log'])assert.deepEqual(b[key],a[key],mode+' '+key);assert.equal(a.enemy.hp,b.enemy.hp);compared++;}
}
const result={battles:rows.length,regressionBattles:12,comparedTurns:compared,nonfinite:0,unfinished:0,build:'Lv100/才能10/技7/通常権能Lv5/HP20P・攻30P/覚醒0・徽章なし/seed1〜3',summaries,rows};fs.writeFileSync(new URL('balance.json',out),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,rows:undefined},null,2));
