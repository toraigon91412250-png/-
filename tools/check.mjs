import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
const files=[...walk('web'),...walk('tools'),...walk('tests')].filter(x=>/\.(js|mjs)$/.test(x));
for(const f of files)execFileSync(process.execPath,['--check',f]);
console.log('Syntax OK: '+files.length+' files');
