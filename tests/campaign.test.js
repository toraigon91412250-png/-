import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ACHIEVEMENTS} from '../web/src/data/config.js';
const ACHIEVEMENT_IDS=ACHIEVEMENTS.map(x=>x.id);
import {fresh,warp,train,upgradePower,buyMark,equip,claim,allocate,summon,fuse,achievements,startGauntlet,awaken} from '../web/src/utils/progression.js';
import {startBattle,act,available,settle,playerStats} from '../web/src/utils/gameCore.js';
import {validateSave,exportSave} from '../web/src/utils/storage.js';
const rng=()=>.7;
function fight(s,mode='normal',strategy,options={}){const b=startBattle(s,{mode,...options});while(!b.result&&b.turn<150){let a=strategy?.(b);if(!a){if(b.statuses.stun)a='wait';else if(b.character==='stella')a=b.hp/b.base.hp<.3&&b.rebirths<3?'rebirth':!b.meteor?'meteor':b.cd.immortal===undefined&&b.enemy.phase===3?'immortal':'slash';else if(b.gauge>=100)a='ultimate';else if(!available(b,'feather'))a='feather';else a='slash';}if(available(b,a))a='guard';act(b,a,{rng});}if(!b.result)throw Error('Stalled battle');settle(s,b);return b;}
function growth(s){for(const id of ['wing','abyss','king','fallen','judge'])if(s.powers[id])while(s.powers[id]<5&&s.fragments[id]>=s.powers[id]*8)upgradePower(s,id);while(s.talent<20&&s.p>=s.talent*30+300)train(s,'talent');for(const id of ['feather','ultimate','destruction'])while(s.skills[id]<10&&s.p>=s.skills[id]*35+400)train(s,id);for(const id of s.achieved)if(!s.claimed.includes(id))claim(s,id);}
let campaign;
test('REAL campaign: new game, ordinary100 floors without dev flags or forced wins',()=>{let s=fresh();s.started=true;const summaries=[];for(let floor=1;floor<=100;floor++){growth(s);const b=fight(s);summaries.push({floor,turn:b.turn,result:b.result,hp:Math.round(playerStats(b).current)});assert.equal(b.result,'win',`floor ${floor}: ${b.log.slice(-6).join(';')}`);assert.ok(s.cleared.includes(floor));s=validateSave(JSON.parse(exportSave(s)));}assert.equal(s.cleared.length,100);assert.equal(s.sp,50);assert.ok(s.flags.lv100);assert.equal(s.flags.stella,false);campaign=s;fs.writeFileSync('reports/pre-warp-save.json',exportSave(s));console.log('Campaign: 100 wins, max rounds '+Math.max(...summaries.map(x=>x.turn))+'; final '+JSON.stringify(summaries.at(-1)));});
test('REAL campaign: warp before EX, Stella boss and dedicated final victory',()=>{const s=campaign;assert.ok(s);warp(s);growth(s);for(let i=0;i<50;i++)allocate(s,'atk');const ex=fight(s,'ex');assert.equal(ex.result,'win',ex.log.join('\n'));assert.ok(s.flags.ex);const stella=fight(s,'stella');assert.equal(stella.result,'win',stella.log.join('\n'));assert.ok(s.flags.final);for(let i=0;i<150;i++)allocate(s,'atk',true);const final=fight(s,'final',b=>{if(b.statuses.stun)return 'wait';if(!b.buffs.some(x=>x.id==='grasp'))return b.balance<0?'grasp':'fallen';if(b.balance<30)return 'divine';if(!b.buffs.some(x=>x.id==='godspeed')&&!available(b,'godspeed'))return 'godspeed';if(!available(b,'annihilate'))return 'annihilate';return 'slash';});assert.equal(final.result,'win',final.log.join('\n'));assert.ok(s.flags.finalClear);console.log(`Bosses: EX ${ex.turn}T, Stella ${stella.turn}T, final ${final.turn}T`);});
test('REAL campaign: raid10, summon50, all marks collected and equipped',()=>{const s=campaign;s.equipped=['wing','abyss'];growth(s);for(let i=0;i<10;i++)assert.equal(fight(s,'raid').result,'win');for(let i=0;i<5;i++)summon(s,10,()=>.5);const ids=['split','starfall','endure','abyssmark','wind','iron','fire','moon','crown','life'];for(const id of ids)if(!s.marks.includes(id))buyMark(s,id);// The redesigned marks must meet their real conditions; equipping alone no longer counts.
const use=(powers,marks,strategy,options={})=>{s.equipped=powers;s.markEquip=[];for(const id of marks)equip(s,id,'mark');const b=fight(s,'normal',strategy,{floor:100,...options});return b;};
let b=use(['wing','abyss'],['abyssmark','wind','iron'],b=>b.turn<=2?'guard':!available(b,'feather')?'feather':'slash');for(const id of ['abyssmark','wind','iron'])assert.ok(b.used.marks.includes(id),id);
b=use(['judge','king'],['moon','life','split'],()=> 'slash');for(const id of ['moon','life'])assert.ok(b.used.marks.includes(id),id);
b=use(['fallen','wing'],['fire'],b=>b.hp/b.base.hp>.5?'guard':!available(b,'feather')?'feather':'slash');assert.ok(b.used.marks.includes('fire'));
b=use(['king','wing'],['crown'],b=>!b.markState?.kingUsed?'guard':!available(b,'feather')?'feather':'slash',{difficulty:'EXPERT'});assert.ok(b.used.marks.includes('crown'));
use(['wing','abyss'],['split','starfall','endure'],b=>!available(b,'pierce')?'pierce':'slash');
assert.equal(s.collection.length,6);assert.equal(s.counts.raid,10);assert.equal(s.marks.length,10);assert.ok(s.markUsed.includes('life'));assert.ok(s.achieved.includes('C10'));});
test('REAL campaign: five-god sequence clears and awakens manually',()=>{const s=campaign;growth(s);startGauntlet(s);for(let i=0;i<5;i++){const b=fight(s,'god');assert.equal(b.result,'win',`${i}: ${b.log.join('\n')}`);}assert.equal(s.gauntlet,null);assert.ok(s.godMaterials>=30);assert.equal(awaken(s),1);assert.equal(s.awakening,1);});

test('REAL campaign: remaining challenges complete all36 and unlock starLv5',()=>{
 const s=campaign;s.equipped=[];s.markEquip=[];assert.equal(fight(s,'normal',()=> 'slash',{floor:1}).result,'win');assert.equal(fight(s,'normal',()=> 'slash',{floor:1,difficulty:'EXPERT'}).result,'win');
 s.equipped=['wing','king'];s.markEquip=['split','starfall','endure'];
 for(let i=0;i<10;i++){const b=fight(s,'normal',b=>b.turn===1?'feather':b.gauge>=100?'ultimate':'guard',{floor:100});assert.equal(b.result,'win');assert.equal(b.lastAction,'ultimate');}
 s.equipped=['wing'];s.markEquip=['wind','starfall','endure'];const endurance=fight(s,'normal',b=>b.turn===1?'feather':b.used.endure?'feather':'guard',{floor:100,difficulty:'EXPERT'});assert.equal(endurance.result,'win',endurance.log.join('\n'));assert.equal(endurance.used.endure,true);assert.equal(endurance.used.low,true);
 assert.equal(s.achieved.length,36,'Missing: '+ACHIEVEMENTS.filter(x=>!s.achieved.includes(x.id)).map(x=>x.name).join(','));assert.equal(s.powers.star,5);
 fs.writeFileSync('reports/campaign-save.json',exportSave(s));console.log('All36 achievements attained through actual battles; endurance '+endurance.turn+'T.');
});
