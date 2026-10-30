import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {SUMMONS} from '../web/src/data/config.js';
import {createCampaign,startCampaignBattle,actCampaign} from '../web/src/utils/campaign20.js';
const app=fs.readFileSync('web/src/components/App.js','utf8');
const display=app.slice(app.indexOf('const SUMMON_RARITY='),app.indexOf('function summonCinema()'));
function rates(collection){const ctx=vm.createContext({SUMMONS,collection});return vm.runInContext(display+';summonRates({collection})',ctx);}
test('rarity rates reflect the real missing-first pool without implying fixed odds',()=>{
 const initial=rates([]);assert.match(initial,/R<\/b> 50.00%/);assert.match(initial,/SR<\/b> 33.33%/);assert.match(initial,/SSR<\/b> 16.67%/);
 const last=rates(SUMMONS.slice(0,5));assert.match(last,/SSR<\/b> 100.00%/);assert.match(last,/黒翼の欠片：0.00%/);
 assert.equal(rates(SUMMONS),initial);assert.match(initial,/1枚ごとに未所持優先で再計算/);
});
test('trial renewal heals exactly2% of enemy base and a landed power suppresses it',()=>{
 const run=createCampaign();run.floor=8;
 const make=()=>{const b=startCampaignBattle(run);b.powers=[];b.base.hp=100000;b.hp=100000;b.enemy.hp=b.enemy.base.hp/2;return b};
 const b=make();actCampaign(b,'slash',{rng:()=>.99});assert.ok(b.log.includes(`再生：敵HPが${Math.floor(b.enemy.base.hp*.02)}回復`));
 const p=make();p.powers=['wing'];p.base.spd=1000;actCampaign(p,'power',{rng:()=>.99});assert.ok(!p.log.some(x=>x.startsWith('再生：')));assert.ok(p.enemy.statuses.campaignSever>0);
});
