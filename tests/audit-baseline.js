// Historical integrity contracts remain exact after reversing explicitly approved edits.
// New runtime behavior is tested directly in audit-regression.test.js (no normalization).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(fs.readFileSync(new URL('../reports/audit-20261022/authorized-changes.json',import.meta.url),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
// V45 is an explicitly authorized gameplay expansion, not a presentation-only edit.
// Verify the exact new bytes, then reverse to main so every earlier immutable audit
// continues to verify the original historical source without changing its contracts.
const resonanceV45=JSON.parse(fs.readFileSync(new URL('../reports/resonance-v45/authorized-changes.json',import.meta.url),'utf8'));
const battleHud=JSON.parse(fs.readFileSync(new URL('../reports/battle-hud-20261031/authorized-changes.json',import.meta.url),'utf8'));
const battleArtFraming=JSON.parse(fs.readFileSync(new URL('../reports/battle-art-framing/authorized-changes.json',import.meta.url),'utf8'));
const battleArtOffset=JSON.parse(fs.readFileSync(new URL('../reports/battle-art-offset/authorized-changes.json',import.meta.url),'utf8'));
const battleArtLower=JSON.parse(fs.readFileSync(new URL('../reports/battle-art-lower/authorized-changes.json',import.meta.url),'utf8'));
const gitBlobSha=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
export function presentationBaselineRead(file,encoding){
 const key=path.relative(root,file instanceof URL?fileURLToPath(file):path.resolve(file));let bytes=fs.readFileSync(file);
 const personaArt=JSON.parse(fs.readFileSync(new URL('../reports/five-personas-art/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(personaArt){assert.equal(sha(bytes),personaArt.afterSHA256,key+' approved five-persona portrait display');assert.equal(sha(personaArt.before),personaArt.beforeSHA256,key+' preserved pre-portrait source');bytes=Buffer.from(personaArt.before);}
 const lowerEdit=battleArtLower[key];
 if(lowerEdit){assert.equal(sha(bytes),lowerEdit.afterSHA256,key+' exact approved full portrait offset');const restored=bytes.toString('utf8').replace(lowerEdit.after,lowerEdit.before);assert.notEqual(restored,bytes.toString('utf8'),key+' full portrait offset present');assert.equal(sha(restored),lowerEdit.beforeSHA256,key+' exact pre-offset source');bytes=Buffer.from(restored);}
 const offsetEdit=battleArtOffset[key];
 if(offsetEdit){assert.equal(sha(bytes),offsetEdit.afterSHA256,key+' exact approved mobile portrait offset');const restored=bytes.toString('utf8').replace(offsetEdit.after,offsetEdit.before);assert.notEqual(restored,bytes.toString('utf8'),key+' mobile portrait offset present');assert.equal(sha(restored),offsetEdit.beforeSHA256,key+' exact pre-offset source');bytes=Buffer.from(restored);}
 const framingEdit=battleArtFraming[key];
 if(framingEdit){assert.equal(sha(bytes),framingEdit.afterSHA256,key+' exact approved portrait framing');const restored=bytes.toString('utf8').replace(framingEdit.after,framingEdit.before);assert.notEqual(restored,bytes.toString('utf8'),key+' portrait framing edit present');assert.equal(sha(restored),framingEdit.beforeSHA256,key+' exact pre-framing source');bytes=Buffer.from(restored);}
 const hudEdit=battleHud[key];
 if(hudEdit){assert.equal(sha(bytes),hudEdit.afterSHA256,key+' exact approved battle HUD update');assert.equal(sha(hudEdit.before),hudEdit.beforeSHA256,key+' preserved pre-HUD source');bytes=Buffer.from(hudEdit.before);}
 const expansion=resonanceV45[key];
 if(expansion){
  assert.equal(gitBlobSha(bytes),expansion.afterGitSha,key+' exact authorized resonance-v45 source');
  const original=Buffer.from(expansion.before,'utf8');
  assert.equal(gitBlobSha(original),expansion.beforeGitSha,key+' intact pre-v45 source');
  bytes=original;
 }

 const finalLabRetirement=JSON.parse(fs.readFileSync(new URL('../reports/v44-retire-final-lab/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(finalLabRetirement){assert.equal(sha(bytes),finalLabRetirement.afterSHA256,key+' approved final-only lab removal');assert.equal(sha(finalLabRetirement.before),finalLabRetirement.beforeSHA256,key+' exact v43 baseline');bytes=Buffer.from(finalLabRetirement.before);}
 const retiredDragon=JSON.parse(fs.readFileSync(new URL('../reports/v43-retire-dragon/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(retiredDragon){assert.equal(sha(bytes),retiredDragon.afterSHA256,key+' approved retirement of dragon trial UI');assert.equal(sha(retiredDragon.before),retiredDragon.beforeSHA256,key+' exact v42 baseline');bytes=Buffer.from(retiredDragon.before);}
 const labCleanup=JSON.parse(fs.readFileSync(new URL('../reports/v42-lab-cleanup/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(labCleanup){assert.equal(sha(bytes),labCleanup.afterSHA256,key+' exact approved lab-only v42 edits');assert.equal(sha(labCleanup.before),labCleanup.beforeSHA256,key+' preserved v41 source');bytes=Buffer.from(labCleanup.before);}
 const removal=JSON.parse(fs.readFileSync(new URL('../reports/v41-removal/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(removal){assert.equal(sha(bytes),removal.afterSHA256,key+' approved v41 feature retirement');assert.equal(sha(removal.before),removal.beforeSHA256,key+' preserved v40 source');bytes=Buffer.from(removal.before);}
 const v40Core=JSON.parse(fs.readFileSync(new URL('../reports/github-v40-cooperation/core-authorized.json',import.meta.url),'utf8'))[key];
 if(v40Core){assert.equal(sha(bytes),v40Core.afterSHA256,key+' verified v40 core');assert.equal(sha(v40Core.before),v40Core.beforeSHA256,key+' preserved v38 core');bytes=Buffer.from(v40Core.before);}
 const v40UI=JSON.parse(fs.readFileSync(new URL('../reports/github-v40-cooperation/ui-authorized.json',import.meta.url),'utf8'))[key];
 if(v40UI){assert.equal(sha(bytes),v40UI.afterSHA256,key+' verified v40 UI');assert.equal(sha(v40UI.before),v40UI.beforeSHA256,key+' preserved v38 UI');bytes=Buffer.from(v40UI.before);}
 const interfaceEdit=JSON.parse(fs.readFileSync(new URL('../reports/divinity-interface/authorized-changes.json',import.meta.url),'utf8'))[key];if(interfaceEdit){assert.equal(sha(bytes),interfaceEdit.afterSHA256,key+' approved divinity interface');assert.equal(sha(interfaceEdit.before),interfaceEdit.beforeSHA256,key+' preserved version 37 source');bytes=Buffer.from(interfaceEdit.before);}
 const recovery=JSON.parse(fs.readFileSync(new URL('../reports/combat-effects-recovery/authorized-changes.json',import.meta.url),'utf8'))[key];if(recovery){assert.equal(sha(bytes),recovery.afterSHA256,key+' approved combat presentation recovery');assert.equal(sha(recovery.before),recovery.beforeSHA256,key+' preserved pre-recovery source');bytes=Buffer.from(recovery.before);}
 const divinity=JSON.parse(fs.readFileSync(new URL('../reports/divinity-rebuild/authorized-changes.json',import.meta.url),'utf8'))[key];if(divinity){assert.equal(sha(bytes),divinity.afterSHA256,key+' requested divinity reconstruction');assert.equal(sha(divinity.before),divinity.beforeSHA256);bytes=Buffer.from(divinity.before);}
 const loop21=JSON.parse(fs.readFileSync(new URL('../reports/self-improvement-loop-21-30/authorized-changes.json',import.meta.url),'utf8'))[key];if(loop21){assert.equal(sha(bytes),loop21.afterSHA256,key+' self-improvement loops21-30');assert.equal(sha(loop21.before),loop21.beforeSHA256);bytes=Buffer.from(loop21.before);}
 const finaleExpert=JSON.parse(fs.readFileSync(new URL('../reports/finale-expert/authorized-changes.json',import.meta.url),'utf8'))[key];if(finaleExpert){assert.equal(sha(bytes),finaleExpert.afterSHA256,key+' Expert finale extension');assert.equal(sha(finaleExpert.before),finaleExpert.beforeSHA256,key+' preserved pre-extension source');bytes=Buffer.from(finaleExpert.before);}
 const stage2=JSON.parse(fs.readFileSync(new URL('../reports/mirror-stage2/authorized-changes.json',import.meta.url),'utf8'))[key];if(stage2){assert.equal(sha(bytes),stage2.afterSHA256,key+' stage2');assert.equal(sha(stage2.before),stage2.beforeSHA256);bytes=Buffer.from(stage2.before);}
 const preserved=JSON.parse(fs.readFileSync(new URL('../reports/mirror-stage2/preserved-live-changes.json',import.meta.url),'utf8'))[key];if(preserved){assert.equal(sha(bytes),preserved.afterSHA256,key+' preserved live additions');assert.equal(sha(preserved.before),preserved.beforeSHA256);bytes=Buffer.from(preserved.before);}
 const dev=JSON.parse(fs.readFileSync(new URL('../reports/mirror-dev-audit30/authorized-changes.json',import.meta.url),'utf8'))[key];if(dev){assert.equal(sha(bytes),dev.afterSHA256,key+' audit30 approved developer mirror access');assert.equal(sha(dev.before),dev.beforeSHA256);bytes=Buffer.from(dev.before);}
 const finale=JSON.parse(fs.readFileSync(new URL('../reports/mirror-audit29/authorized-changes.json',import.meta.url),'utf8'))[key];if(finale){assert.equal(sha(bytes),finale.afterSHA256,key+' audit29 approved');assert.equal(sha(finale.before),finale.beforeSHA256);bytes=Buffer.from(finale.before);}
 const mirror=JSON.parse(fs.readFileSync(new URL('../reports/mirror-audit28/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(mirror){assert.equal(sha(bytes),mirror.afterSHA256,key+' approved isolated mirror trial');assert.equal(sha(mirror.before),mirror.beforeSHA256,key+' preserved audit27');bytes=Buffer.from(mirror.before);}
 const resume=JSON.parse(fs.readFileSync(new URL('../reports/battle-resume-audit27/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(resume){assert.equal(sha(bytes),resume.afterSHA256,key+' approved universal battle checkpoints');assert.equal(sha(resume.before),resume.beforeSHA256,key+' preserved audit26');bytes=Buffer.from(resume.before);}
 const ready=JSON.parse(fs.readFileSync(new URL('../reports/sortie-ready-audit26/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(ready){assert.equal(sha(bytes),ready.afterSHA256,key+' approved decode before animation');assert.equal(sha(ready.before),ready.beforeSHA256,key+' preserved audit25');bytes=Buffer.from(ready.before);}
 const bar=JSON.parse(fs.readFileSync(new URL('../reports/loading-bar-audit25/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(bar){assert.equal(sha(bytes),bar.afterSHA256,key+' approved animated sortie bar');assert.equal(sha(bar.before),bar.beforeSHA256,key+' preserved audit24');bytes=Buffer.from(bar.before);}
 const sortieFix=JSON.parse(fs.readFileSync(new URL('../reports/special-sortie-fix-audit24/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(sortieFix){assert.equal(sha(bytes),sortieFix.afterSHA256,key+' approved developer sortie fix');assert.equal(sha(sortieFix.before),sortieFix.beforeSHA256,key+' preserved audit23');bytes=Buffer.from(sortieFix.before);}
 const portrait=JSON.parse(fs.readFileSync(new URL('../reports/special-sortie-audit23/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(portrait){assert.equal(sha(bytes),portrait.afterSHA256,key+' approved special sortie portraits');assert.equal(sha(portrait.before),portrait.beforeSHA256,key+' preserved audit22');bytes=Buffer.from(portrait.before);}
 const sortie=JSON.parse(fs.readFileSync(new URL('../reports/sortie-audit22/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(sortie){assert.equal(sha(bytes),sortie.afterSHA256,key+' approved 1400ms sortie atmosphere');assert.equal(sha(sortie.before),sortie.beforeSHA256,key+' preserved audit21');bytes=Buffer.from(sortie.before);}
 const tactics=JSON.parse(fs.readFileSync(new URL('../reports/authority-tactics-audit21/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(tactics){assert.equal(sha(bytes),tactics.afterSHA256,key+' approved authority order and actual effect labels');assert.equal(sha(tactics.before),tactics.beforeSHA256,key+' preserved audit20');bytes=Buffer.from(tactics.before);}
 const active=JSON.parse(fs.readFileSync(new URL('../reports/authority-effects-audit20/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(active){assert.equal(sha(bytes),active.afterSHA256,key+' approved first-slot active effects');assert.equal(sha(active.before),active.beforeSHA256,key+' preserved audit19');bytes=Buffer.from(active.before);}
 const strike=JSON.parse(fs.readFileSync(new URL('../reports/authority-strike-audit19/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(strike){assert.equal(sha(bytes),strike.afterSHA256,key+' approved first-slot authority strike');assert.equal(sha(strike.before),strike.beforeSHA256,key+' preserved audit18');bytes=Buffer.from(strike.before);}
 const clarity=JSON.parse(fs.readFileSync(new URL('../reports/combat-clarity-audit18/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(clarity){assert.equal(sha(bytes),clarity.afterSHA256,key+' approved command clarity');assert.equal(sha(clarity.before),clarity.beforeSHA256,key+' preserved audit17');bytes=Buffer.from(clarity.before);}
 const sanctuary=JSON.parse(fs.readFileSync(new URL('../reports/sanctuary-audit17/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(sanctuary){assert.equal(sha(bytes),sanctuary.afterSHA256,key+' approved sanctuary polish');assert.equal(sha(sanctuary.before),sanctuary.beforeSHA256,key+' preserved audit16');bytes=Buffer.from(sanctuary.before);}
 const hpSortie=JSON.parse(fs.readFileSync(new URL('../reports/hp-sortie-audit16/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(hpSortie){assert.equal(sha(bytes),hpSortie.afterSHA256,key+' approved HP/sortie display');assert.equal(sha(hpSortie.before),hpSortie.beforeSHA256,key+' preserved audit15');bytes=Buffer.from(hpSortie.before);}
 const ultimate=JSON.parse(fs.readFileSync(new URL('../reports/ultimate-audit15/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(ultimate){assert.equal(sha(bytes),ultimate.afterSHA256,key+' dedicated ultimate presentation');assert.equal(sha(ultimate.before),ultimate.beforeSHA256,key+' preserved audit14');bytes=Buffer.from(ultimate.before);}
 const contrast=JSON.parse(fs.readFileSync(new URL('../reports/skill-contrast-audit14/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(contrast){assert.equal(sha(bytes),contrast.afterSHA256,key+' approved skill contrast effects');assert.equal(sha(contrast.before),contrast.beforeSHA256,key+' preserved audit13');bytes=Buffer.from(contrast.before);}
 const cleanup=JSON.parse(fs.readFileSync(new URL('../reports/lab-cleanup-audit13/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(cleanup){assert.equal(sha(bytes),cleanup.afterSHA256,key+' approved redundant lab entry removal');assert.equal(sha(cleanup.before),cleanup.beforeSHA256,key+' preserved audit12');bytes=Buffer.from(cleanup.before);}
 const flow=JSON.parse(fs.readFileSync(new URL('../reports/flow-cutin-audit12/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(flow){assert.equal(sha(bytes),flow.afterSHA256,key+' exact approved flow edits');assert.equal(sha(flow.before),flow.beforeSHA256,key+' preserved audit11');bytes=Buffer.from(flow.before);}
 const record=JSON.parse(fs.readFileSync(new URL('../reports/combat-direction-audit11/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(record){assert.equal(sha(bytes),record.afterSHA256,key+' exact authorized presentation edits');assert.equal(sha(record.before),record.beforeSHA256,key+' preserved audit10');bytes=Buffer.from(record.before);}
 return encoding?bytes.toString(encoding):bytes;
}
export function mainBBaselineRead(file,encoding){
 const key=path.relative(root,file instanceof URL?fileURLToPath(file):path.resolve(file));let bytes=presentationBaselineRead(file);
 const record=JSON.parse(fs.readFileSync(new URL('../reports/main-b-audit10/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(record){assert.equal(sha(bytes),record.afterSHA256,key+' exact B adoption changes');assert.equal(sha(record.before),record.beforeSHA256,key+' preserved audit9');bytes=Buffer.from(record.before);}
 return encoding?bytes.toString(encoding):bytes;
}
export function compactUiBaselineRead(file,encoding){
 const key=path.relative(root,file instanceof URL?fileURLToPath(file):path.resolve(file));let bytes=mainBBaselineRead(file);
 const record=JSON.parse(fs.readFileSync(new URL('../reports/compact-ui-audit9/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(record){assert.equal(sha(bytes),record.afterSHA256,key+' exact compact UI changes');assert.equal(sha(record.before),record.beforeSHA256,key+' preserved audit8');bytes=Buffer.from(record.before);}
 return encoding?bytes.toString(encoding):bytes;
}
export function labBBaselineRead(file,encoding){
 const key=path.relative(root,file instanceof URL?fileURLToPath(file):path.resolve(file));let bytes=compactUiBaselineRead(file);
 const record=JSON.parse(fs.readFileSync(new URL('../reports/lab-b-audit8/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(record){assert.equal(sha(bytes),record.afterSHA256,key+' exact isolated lab B changes');assert.equal(sha(record.before),record.beforeSHA256,key+' immutable audit7 bytes');bytes=Buffer.from(record.before);}
 return encoding?bytes.toString(encoding):bytes;
}
export function integrationBaselineRead(file,encoding){
 const key=path.relative(root,file instanceof URL?fileURLToPath(file):path.resolve(file));let bytes=labBBaselineRead(file);
 const record=JSON.parse(fs.readFileSync(new URL('../reports/integration-audit7/authorized-ui-fix.json',import.meta.url),'utf8'))[key];
 if(record){assert.equal(sha(bytes),record.afterSHA256,key+' exact audit7 right-column fix');assert.equal(sha(record.before),record.beforeSHA256,key+' original supplied audit6 CSS');bytes=Buffer.from(record.before);}
 return encoding?bytes.toString(encoding):bytes;
}
export function combatUiBaselineRead(file,encoding){
 const key=path.relative(root,file instanceof URL?fileURLToPath(file):path.resolve(file));
 let bytes=integrationBaselineRead(file);
 const record=JSON.parse(fs.readFileSync(new URL('../reports/combat-ui-audit6/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(record){assert.equal(sha(bytes),record.afterSHA256,key+' approved combat UI');assert.equal(sha(record.before),record.beforeSHA256,key+' immutable audit5 baseline');bytes=Buffer.from(record.before);}
 return encoding?bytes.toString(encoding):bytes;
}
export function main20BaselineRead(file,encoding){
 const key=path.relative(root,file instanceof URL?fileURLToPath(file):path.resolve(file));
 let bytes=combatUiBaselineRead(file);const change=JSON.parse(fs.readFileSync(new URL('../reports/main20-audit5/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(change){assert.equal(sha(bytes),change.afterSHA256,key+' exact approved main20 edit');assert.equal(sha(change.before),change.beforeSHA256,key+' audit4 baseline');bytes=Buffer.from(change.before);}
 return encoding?bytes.toString(encoding):bytes;
}
export function finaleBaselineRead(file,encoding){
 const key=path.relative(root,file instanceof URL?fileURLToPath(file):path.resolve(file));
 let bytes=main20BaselineRead(file);const change=JSON.parse(fs.readFileSync(new URL('../reports/finale-audit4/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(change){assert.equal(sha(bytes),change.afterSHA256,key+' exact finale edit');assert.equal(sha(change.before),change.beforeSHA256,key+' audit3 baseline');bytes=Buffer.from(change.before);}
 return encoding?bytes.toString(encoding):bytes;
}
export function tacticalBaselineRead(file,encoding){
 const key=path.relative(root,file instanceof URL?fileURLToPath(file):path.resolve(file));
 let bytes=finaleBaselineRead(file);const change=JSON.parse(fs.readFileSync(new URL('../reports/tactical-marks-audit3/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(change){assert.equal(sha(bytes),change.afterSHA256,key+' exact tactical mark change');assert.equal(sha(change.before),change.beforeSHA256,key+' audit2 baseline');bytes=Buffer.from(change.before);}
 const packageFix=JSON.parse(fs.readFileSync(new URL('../reports/package-fix/authorized-changes.json',import.meta.url),'utf8'))[key];
 if(packageFix){assert.equal(sha(bytes),packageFix.afterSHA256,key+' approved package integrity fix');assert.equal(sha(packageFix.before),packageFix.beforeSHA256,key+' preserved package baseline');bytes=Buffer.from(packageFix.before);}
 return encoding?bytes.toString(encoding):bytes;
}
export function auditRead(file,encoding){
 const key=path.relative(root,file instanceof URL?fileURLToPath(file):path.resolve(file));
 let bytes=tacticalBaselineRead(file);const imageEdits=JSON.parse(fs.readFileSync(new URL('../reports/authority-art-audit2/presentation-changes.json',import.meta.url),'utf8')),imageEdit=imageEdits[key];
 if(imageEdit){assert.equal(sha(bytes),imageEdit.afterSHA256,key+' exact authority image-only edit');assert.equal(sha(imageEdit.before),imageEdit.beforeSHA256,key+' original audit1 bytes');bytes=Buffer.from(imageEdit.before);}
 const record=manifest[key];
 if(!record)return encoding?bytes.toString(encoding):bytes;
 assert.equal(sha(bytes),record.afterSHA256,key+' exact audit-approved source');
 assert.equal(sha(record.before),record.beforeSHA256,key+' unchanged historical baseline');
 return encoding?record.before:Buffer.from(record.before);
}
