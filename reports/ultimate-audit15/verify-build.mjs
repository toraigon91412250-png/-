import fs from 'node:fs';import assert from 'node:assert/strict';
import {COMBAT_VFX} from '../../web/src/components/combatPresentation.js';
const html=fs.readFileSync('irena-play.html','utf8');assert.equal(html,fs.readFileSync('dist/index.html','utf8'));
const a=JSON.parse(html.match(/const __IRENA_EMBEDDED_ASSETS__=(\[.*?\]);/s)[1]);assert.equal(a.length,new Set(a).size);
for(const path of Object.values(COMBAT_VFX)){const data='data:image/webp;base64,'+fs.readFileSync(path).toString('base64');assert.ok(a.includes(data),path);}
assert.ok(Buffer.byteLength(html)<25*1024*1024,'Sites static file limit');
assert.ok(!/['"]assets\/[^'"\n]+\.(?:png|webp|svg)['"]/.test(html),'standalone image references embedded');
console.log(JSON.stringify({uniqueEmbeddedImages:a.length,standaloneEqualsHosted:true,textureBytePreservation:true,bytes:Buffer.byteLength(html),underSitesLimit:true}));
