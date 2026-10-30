import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../web/src/components/App.js',import.meta.url),'utf8');
const visuals=source.slice(source.indexOf('// The alignment pause delays'),source.indexOf('function beginFight('));
const portrait=source.slice(source.indexOf('function battlePortrait('),source.indexOf('const MEDIA='));

function scene(){
 let time=0,sequence=0,commits=[],slashed=[],pending=new Map();
 const cinema={className:'',innerHTML:'',attributes:{},classList:{add(x){cinema.className+=' '+x;}},setAttribute(key,val){cinema.attributes[key]=val;}};
 const skip={onclick:null};
 const stage={append(node){slashed.push(node);}};
 const env={
   battle:{balance:0},combatAnimating:false,alignmentRevealTimer:null,cinemaTimer:null,
   SCENES:{fallenCrest:'assets/runtime/crest-fallen.webp',divineCrest:'assets/runtime/crest-divine.webp'},
   PORTRAITS:{normal:'normal',fallen:'fallen',divine:'divine',neutral:'neutral',stella:'stella'},
   available:()=>null,
   doCombat:(id)=>commits.push({id,at:time}),
   $:(selector)=>selector==='#cinema'?cinema:selector==='#skipCinema'?skip:stage,
   matchMedia:()=>({matches:false}),
   setTimeout:(fn,delay)=>{const key=++sequence;pending.set(key,{fn,at:time+delay});return key;},
   clearTimeout:key=>pending.delete(key),
   document:{createElement(){return {className:'',attributes:{},innerHTML:'',setAttribute(k,v){this.attributes[k]=v;},remove(){this.removed=true;}};}}
 };
 const api=vm.runInNewContext(`${portrait}\n${visuals}\n({alignmentShift,showBladeStrike,battlePortrait})`,env);
 function advance(ms){const end=time+ms;while(true){const due=[...pending].filter(([_,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;pending.delete(due[0]);time=due[1].at;due[1].fn();}time=end;}
 return {env,api,cinema,skip,commits,slashed,advance};
}

test('final battle portrait changes from neutral at the first ±15 visual alignment, without changing numerical stages',()=>{
 const s=scene();assert.equal(s.api.battlePortrait({character:'final',balance:0}),'neutral');
 assert.equal(s.api.battlePortrait({character:'final',balance:-15}),'fallen');
 assert.equal(s.api.battlePortrait({character:'final',balance:15}),'divine');
 assert.equal(s.api.battlePortrait({character:'stella'}),'stella');
});

test('fallen waits 200ms before resolving enemy turn, then reveals user crest and portrait',()=>{
 const s=scene();s.api.alignmentShift('fallen');
 assert.match(s.cinema.className,/alignment-fallen/);
 assert.match(s.cinema.innerHTML,/crest-fallen.webp/);
 assert.match(s.cinema.innerHTML,/fallen/);
 s.advance(199);assert.equal(s.commits.length,0);
 s.advance(1);assert.deepEqual(s.commits.map(x=>x.id),['fallen']);assert.equal(s.commits[0].at,200);
 assert.match(s.cinema.className,/revealed/);
 s.advance(650);assert.equal(s.commits.length,1);assert.equal(s.env.combatAnimating,false);assert.equal(s.cinema.attributes['aria-hidden'],'true');
});

test('divine shows opposite crest with no skip UI and commits exactly once on natural completion',()=>{
 const s=scene();s.api.alignmentShift('divine');
 assert.match(s.cinema.className,/alignment-divine/);assert.match(s.cinema.innerHTML,/crest-divine.webp/);
 assert.doesNotMatch(s.cinema.innerHTML,/skipCinema|スキップ/);assert.equal(s.skip.onclick,null);
 s.advance(199);assert.equal(s.commits.length,0);s.advance(1);assert.deepEqual(s.commits.map(x=>x.id),['divine']);
 s.advance(1000);assert.equal(s.commits.length,1);assert.equal(s.env.combatAnimating,false);
});

test('double inputs during cinematic cannot trigger multiple turns',()=>{
 const s=scene();s.api.alignmentShift('fallen');s.api.alignmentShift('fallen');s.advance(900);
 assert.equal(s.commits.length,1);
});

test('white strike renders only on attacking actions and cleans up automatically',()=>{
 const s=scene();s.api.showBladeStrike('guard');assert.equal(s.slashed.length,0);
 s.api.showBladeStrike('slash');assert.equal(s.slashed.length,1);
 assert.match(s.slashed[0].innerHTML,/blade-core/);
 assert.equal(s.slashed[0].attributes['aria-hidden'],'true');
 s.advance(650);assert.equal(s.slashed[0].removed,true);
});
