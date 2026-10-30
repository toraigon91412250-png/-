import fs from 'node:fs';import {startBattle,act,available,settle} from '../web/src/utils/gameCore.js';import {validateSave} from '../web/src/utils/storage.js';import {ACHIEVEMENTS} from '../web/src/data/config.js';
const s=validateSave(JSON.parse(fs.readFileSync('reports/campaign-save.json')));const rng=()=>.7;
function play(opts,choose){const b=startBattle(s,opts);while(!b.result&&b.turn<400){let a=choose(b);if(available(b,a))a='guard';act(b,a,{rng});}if(b.result)settle(s,b);console.log('play',opts,b.result,b.turn,b.used,b.hp,b.lives,b.markLife);return b;}
s.equipped=[];s.markEquip=[];play({floor:1},()=> 'slash');play({floor:1,difficulty:'EXPERT'},()=> 'slash');
s.equipped=['wing','king'];s.markEquip=['split','starfall','endure'];play({floor:100},b=>b.turn===1?'feather':b.gauge>=100?'ultimate':'guard');
s.equipped=['wing'];s.markEquip=['wind','starfall','endure'];play({floor:100,difficulty:'EXPERT'},b=>b.turn===1?'feather':b.used.endure?'ultimate':'guard');
console.log('remaining',ACHIEVEMENTS.filter(x=>!s.achieved.includes(x.id)).map(x=>[x.id,x.name]));
