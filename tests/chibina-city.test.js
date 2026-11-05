import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderChibinaCityView} from '../web/src/components/chibinaCity.js';

const html=renderChibinaCityView('king');

test('city screen has all six original islands, five animated actors and working navigation hooks',()=>{
 for(const id of ['plaza','flight','royal','rest','judgment','fallen'])assert.match(html,new RegExp(`data-island="${id}"`));
 for(const id of ['kuro','daten','judgment','king','abyss'])assert.match(html,new RegExp(`data-id="${id}"`));
 for(const action of ['overview','zoomIn','zoomOut','pause','followOff','setCityHome'])assert.match(html,new RegExp(`id="${action}"`));
 assert.match(html,/data-action="nav" data-id="chibina-room"/);
 assert.match(html,/data-action="nav" data-id="home"/);
 assert.match(html,/堕天王/);
});

test('city image references are local WebP assets, retained in both build targets and compact',()=>{
 const source=fs.readFileSync('web/src/components/chibinaCity.js','utf8');
 const paths=[...new Set(source.match(/assets\/home-ui\/chibina-city\/[\w/-]+\.webp/g)||[])];
 assert.equal(paths.length,15);
 let total=0;
 for(const path of paths){const bytes=fs.readFileSync(path);assert.equal(bytes.toString('ascii',8,12),'WEBP',path);total+=bytes.length;}
 assert.ok(total<3_500_000,`city art ${total} bytes`);
 const build=fs.readFileSync('tools/build.mjs','utf8');
 for(const path of paths)assert.ok(build.includes(path.split('/').at(-1)),path+' must be present in build inputs');
 assert.match(build,/externalAssets=.*chibina-city/s);
});

test('city runtime preserves drag, pinch, reduced-motion and teardown behavior',()=>{
 const source=fs.readFileSync('web/src/components/chibinaCity.js','utf8');
 for(const token of ['pointerdown','pointermove','pointerup','pointercancel','setZoomAt','prefers-reduced-motion','visibilitychange','removeEventListener','cancelAnimationFrame'])assert.ok(source.includes(token),token);
 const css=fs.readFileSync('web/src/components/chibinaCity.css','utf8');
 assert.match(css,/\.chibina-city \.island\.plaza/);
 assert.match(css,/\.chibina-city \.actor\.daten/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/(^|})body\{|(^|})\.app\{/);
});
