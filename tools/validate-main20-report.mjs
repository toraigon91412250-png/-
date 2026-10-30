import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=process.argv[2]||'reports/self-improvement-loop-31-40/main20-nightmare-final-5040.json';
const destination=process.argv[3]||'reports/self-improvement-loop-31-40/validated-main20-summary.json';
const report=JSON.parse(fs.readFileSync(source,'utf8')),rows=report.rows;
assert.ok(Array.isArray(rows));assert.equal(rows.length,report.trialCount,'row count must match stated trials');
assert.equal(report.source.testFlag,false,'measurement must use real non-test battles');
const mean=(items,key)=>items.length?items.reduce((sum,row)=>sum+row[key],0)/items.length:0;
const rounded=(value,digits=3)=>Number(value.toFixed(digits));
const same=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<=.001,`${label}: ${actual} != ${expected}`);
for(const row of rows){
 assert.ok(['win','lose','timeout'].includes(row.result),`known result for ${row.build}/${row.floor}/${row.policy}/${row.difficulty}/${row.seed}`);
 assert.equal(row.actions,row.actionLog.length,'action count must come from recorded actions');
 for(const key of ['remainingHP','remainingEnemyHP','damageDealt','damageReceived'])assert.ok(Number.isFinite(row[key]),`${key} must be finite`);
}
const groups=[];
for(const difficulty of report.difficulties)for(const floor of report.floors)for(const policy of report.policies){
 const sample=rows.filter(row=>row.difficulty===difficulty&&row.floor===floor&&row.policy===policy),wins=sample.filter(row=>row.result==='win');
 const group=report.groups.find(x=>x.difficulty===difficulty&&x.floor===floor&&x.policy===policy);assert.ok(group,`group exists ${difficulty}/${floor}/${policy}`);
 assert.equal(group.trials,sample.length);assert.equal(group.builds,new Set(sample.map(x=>x.build)).size);assert.equal(group.seeds,new Set(sample.map(x=>x.seed)).size);
 assert.equal(group.wins,wins.length);assert.equal(group.losses,sample.filter(x=>x.result==='lose').length);assert.equal(group.timeouts,sample.filter(x=>x.result==='timeout').length);
 same(group.meanActions,rounded(mean(sample,'actions')),`${difficulty}/${floor}/${policy} mean actions`);
 same(group.meanWinningActions,wins.length?rounded(mean(wins,'actions')):null,`${difficulty}/${floor}/${policy} mean winning actions`);
 same(group.meanRemainingHP,rounded(mean(sample,'remainingHP'),1),`${difficulty}/${floor}/${policy} remaining HP`);
 groups.push({difficulty,floor,policy,trials:sample.length,wins:wins.length,losses:sample.filter(x=>x.result==='lose').length,timeouts:sample.filter(x=>x.result==='timeout').length,meanActions:rounded(mean(sample,'actions'))});
}
assert.equal(report.groups.length,groups.length,'no missing or duplicate groups');
const totals=report.difficulties.map(difficulty=>{
 const sample=rows.filter(row=>row.difficulty===difficulty),wins=sample.filter(row=>row.result==='win'),saved=report.totals.find(x=>x.difficulty===difficulty);assert.ok(saved);
 assert.equal(saved.trials,sample.length);assert.equal(saved.wins,wins.length);assert.equal(saved.losses,sample.filter(x=>x.result==='lose').length);assert.equal(saved.timeouts,sample.filter(x=>x.result==='timeout').length);
 same(saved.winRate,rounded(wins.length/sample.length,4),`${difficulty} win rate`);same(saved.meanActions,rounded(mean(sample,'actions')),`${difficulty} mean actions`);
 same(saved.meanWinningActions,wins.length?rounded(mean(wins,'actions')):null,`${difficulty} mean winning actions`);
 return {difficulty,trials:sample.length,wins:wins.length,losses:sample.filter(x=>x.result==='lose').length,timeouts:sample.filter(x=>x.result==='timeout').length,winRate:rounded(wins.length/sample.length,4),meanActions:rounded(mean(sample,'actions'))};
});
assert.equal(report.totals.length,totals.length);
const rewards=new Map();
for(const row of rows.filter(x=>x.result==='win')){
 assert.ok(row.reward,'winning settlement must be recorded');const key=[row.build,row.floor,row.policy,row.seed].join('/'),value=JSON.stringify(row.reward);
 if(rewards.has(key))assert.equal(value,rewards.get(key),`difficulty reward parity ${key}`);else rewards.set(key,value);
}
assert.equal(report.rewardParity.matchedWinningComparisons,rewards.size);assert.equal(report.rewardParity.mismatches,0);
const nightmareByFloor=report.floors.map(floor=>{
 const sample=rows.filter(x=>x.difficulty==='NIGHTMARE'&&x.floor===floor),wins=sample.filter(x=>x.result==='win');
 return {floor,trials:sample.length,wins:wins.length,losses:sample.filter(x=>x.result==='lose').length,winRate:rounded(wins.length/sample.length,4),policies:report.policies.map(policy=>{const group=groups.find(x=>x.difficulty==='NIGHTMARE'&&x.floor===floor&&x.policy===policy);return {policy,wins:group.wins,losses:group.losses,meanActions:group.meanActions};})};
});
const summary={source,sourceCommit:report.source.commit,sourceHashes:report.source,trialCount:rows.length,uniqueConditions:report.uniqueConditions,seedsPerCondition:report.seedsPerCondition,groupsValidated:groups.length,matchedRewardKeys:rewards.size,totals,nightmareByFloor};
fs.writeFileSync(destination,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({trials:rows.length,conditions:report.uniqueConditions,seedsPerCondition:report.seedsPerCondition,groupsValidated:groups.length,matchedRewardKeys:rewards.size,totals,report:destination}));
