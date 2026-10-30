import fs from 'node:fs';
let source=fs.readFileSync('reports/strategy-study/engine-B.mjs','utf8');
const original='campaignLanded(b);const couldAttack=b.hp>0&&b.enemy.hp>0&&!b.enemyStop&&!b.enemy.statuses.stun;enemyTurn(b,guard,rng);';
const replacement=`campaignLanded(b);const couldAttack=b.hp>0&&b.enemy.hp>0&&!b.enemyStop&&!b.enemy.statuses.stun;
 const guardProbe=guard&&couldAttack?clone(b):null,rolls=[];
 enemyTurn(b,guard,()=>{const value=rng();rolls.push(value);return value;});
 if(guardProbe&&!b.log.at(-1)?.startsWith('速度優位：')){
  let index=0;enemyTurn(guardProbe,false,()=>{if(index>=rolls.length)throw Error('Counterfactual RNG mismatch');return rolls[index++];});
  const readDamage=x=>Number(x.log.findLast(row=>/^敵の(重撃|反撃) →/.test(row))?.match(/→ ([\\d,]+)/)?.[1].replaceAll(',','')||0);
  const without=readDamage(guardProbe),withGuard=readDamage(b);
  studyGuardTotals.offeredWithout+=without;studyGuardTotals.offeredWith+=withGuard;studyGuardTotals.prevented+=without-withGuard;studyGuardTotals.attacks++;
 }
`;
if(!source.includes(original))throw Error('Metric hook no longer matches selected candidate');source=source.replace(original,replacement);
source+=`\nlet studyGuardTotals={offeredWithout:0,offeredWith:0,prevented:0,attacks:0};\nexport function measurementReset(){studyGuardTotals={offeredWithout:0,offeredWith:0,prevented:0,attacks:0};}\nexport function measurementSummary(){return {...studyGuardTotals};}\n`;
fs.writeFileSync('reports/strategy-study/engine-metrics.mjs',source);
