import fs from 'node:fs';import {createHash} from 'node:crypto';
const original=fs.readFileSync(new URL('./baseline-campaign20.txt',import.meta.url),'utf8');
let fixed=original.replace("campaignLanded(b);const index=b.log.length;enemyTurn(b,guard,rng);", "campaignLanded(b);const couldAttack=b.hp>0&&b.enemy.hp>0&&!b.enemyStop&&!b.enemy.statuses.stun;enemyTurn(b,guard,rng);");
fixed=fixed.replace("!b.log.slice(index).some(x=>/^敵の(重撃|反撃)/.test(x))", "(!couldAttack||b.log.at(-1)?.startsWith('速度優位：')||!b.log.slice(-3).some(x=>/^敵の(重撃|反撃)/.test(x)))");
for(const [at,id]of [[8,'split'],[12,'starfall'],[16,'endure']])fixed=fixed.replace(`run.build.marks.push('${id}');unlocked.push('${id}');`,`if(!run.build.marks.includes('${id}')){run.build.marks.push('${id}');unlocked.push('${id}');}`);
const sources={raw:original,A:fixed,B:fixed.replace('focus:2,renewal:.025','focus:3,renewal:.025'),C:fixed.replace('focus:2,renewal:.025','focus:2,renewal:.01')};
const manifest={};for(const [id,source]of Object.entries(sources)){const code=source.replace("from './progression.js'","from '../../web/src/utils/progression.js'").replace("from './gameCore.js'","from '../../web/src/utils/gameCore.js'");fs.writeFileSync(`reports/strategy-study/engine-${id}.mjs`,code);manifest[id]={sourceSHA256:createHash('sha256').update(source).digest('hex'),description:{raw:'納品時の現状そのまま',A:'ログ上限後の敵効果判定と重複刻印入手のみ修正・数値維持',B:'A＋試作の蓄勢攻撃2→3倍',C:'A＋試作の再生2.5→1%'}[id]};}
fs.writeFileSync('reports/strategy-study/candidates.json',JSON.stringify(manifest,null,2));
