// Separate, optional lab journal. The main save key/schema is never read or written here.
export const MIRROR_MEMORY_KEY='irena-mirror-lab-v1';
export const freshMirrorMemory=()=>({version:1,checkpoint:1,clears:0,trueClears:0,complete:0,relic:'none'});
export function validateMirrorMemory(x){
 if(!x||x.version!==1||![1,2,3].includes(x.checkpoint))throw Error('鏡界記録を読み込めません');
 for(const k of ['clears','trueClears','complete'])if(!Number.isSafeInteger(x[k])||x[k]<0)throw Error('鏡界記録が不正です');
 if(!['none','echo','nameless'].includes(x.relic)||x.relic==='echo'&&!x.clears||x.relic==='nameless'&&!x.trueClears)throw Error('鏡界装備が不正です');
 return {...freshMirrorMemory(),checkpoint:x.checkpoint,clears:x.clears,trueClears:x.trueClears,complete:x.complete,relic:x.relic};
}
export function loadMirrorMemory(storage=globalThis.localStorage){try{const raw=storage.getItem(MIRROR_MEMORY_KEY);return {memory:raw?validateMirrorMemory(JSON.parse(raw)):freshMirrorMemory(),error:null};}catch(e){return {memory:freshMirrorMemory(),error:e.message};}}
export function saveMirrorMemory(m,storage=globalThis.localStorage){storage.setItem(MIRROR_MEMORY_KEY,JSON.stringify(validateMirrorMemory(m)));}
export function recordMirrorProgress(memory,b){
 if(!b.test||b.trial?.kind!=='mirror')return memory;
 const m=b.trial,next={...memory};next.checkpoint=Math.max(next.checkpoint,b.enemy.phase);
 if(m.normalCleared&&!m.normalRecorded){next.clears++;m.normalRecorded=true;}
 if(b.result==='win'&&b.enemy.phase===3&&!m.trueRecorded){next.trueClears++;if(m.startedPhase===1)next.complete++;m.trueRecorded=true;}
 return next;
}
