import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {freshMain20,validateMain20,startMainBattle,actMainBattle,settleMainBattle,main20NightmareUnlocked} from '../web/src/utils/main20.js';
import {startBattle} from '../web/src/utils/gameCore.js';
import {RECIPES} from '../web/src/data/config.js';
import {fresh} from '../web/src/utils/progression.js';
import {exportSave} from '../web/src/utils/storage.js';
import {choose,seeded} from '../reports/overnight-lab/measure-main.mjs';

const endgameProfiles=JSON.parse(fs.readFileSync('reports/endgame-pressure-nightmare-loop20.json','utf8')).profiles;
function makeNightmareProfile(profile){
 const s=freshMain20();s.started=true;s.floor=20;s.cleared=Array.from({length:20},(_,i)=>i+1);s.level=100;s.talent=20;s.skills={feather:10,destruction:10,ultimate:10};
 s.stats={hp:0,atk:0,def:0,spd:0,...profile.stats};const allocation=profile.final||{};s.finalBuild={points:Math.max(0,150-Object.values(allocation).reduce((sum,n)=>sum+n,0)),hp:0,atk:0,def:0,spd:0,...allocation};
 s.equipped=[...profile.gear];s.markEquip=[...profile.marks];s.marks=[...profile.marks];for(const key of Object.keys(s.powers))s.powers[key]=0;s.resonance={};
 const recipe=profile.fusion?RECIPES.find(item=>item.id===profile.fusion):null;assert.ok(!profile.fusion||recipe,`known fusion for ${profile.id}`);
 for(const id of profile.gear){if(recipe&&id===profile.fusion)s.resonance[id]=5;else s.powers[id]=5;}if(recipe)s.recipes=[...new Set([...s.recipes,recipe.id])];
 s.flags={...s.flags,lv100:true,reward100:true};return s;
}

test('main20 NIGHTMARE scales only the enemy and preserves B1 shell rules',()=>{
 const s=freshMain20();s.started=true;s.floor=20;s.cleared=Array.from({length:20},(_,i)=>i+1);s.level=61;
 const before=JSON.stringify(s),normal=startMainBattle(s,{floor:20,difficulty:'NORMAL'}),nightmare=startMainBattle(s,{floor:20,difficulty:'NIGHTMARE'});
 assert.equal(nightmare.difficulty,'NIGHTMARE');
 assert.equal(nightmare.enemy.base.hp,normal.enemy.base.hp*10);
 assert.equal(nightmare.enemy.base.atk,normal.enemy.base.atk*4.6);
 assert.equal(nightmare.enemy.base.spd,normal.enemy.base.spd*4.5);
 assert.equal(nightmare.enemy.base.def,normal.enemy.base.def);
 assert.equal(nightmare.enemy.hp,nightmare.enemy.base.hp);
 assert.equal(nightmare.enemy.buffs.find(x=>x.id==='campaignArmor')?.mul.def,4);
 assert.deepEqual(nightmare.base,normal.base);
 assert.equal(JSON.stringify(s),before);
});

test('difficulty multipliers remain exact at all twenty floors and never remove B1 shells',()=>{
 const s=freshMain20();s.started=true;s.floor=20;s.level=61;s.cleared=Array.from({length:20},(_,i)=>i+1);const shells=new Set([5,9,14,17,20]);
 for(let floor=1;floor<=20;floor++){
  const normal=startMainBattle(s,{floor,difficulty:'NORMAL'}),expert=startMainBattle(s,{floor,difficulty:'EXPERT'}),nightmare=startMainBattle(s,{floor,difficulty:'NIGHTMARE'});
  for(const [tier,battle,mul]of [['EXPERT',expert,{hp:1.3,atk:1.2,spd:1.1}],['NIGHTMARE',nightmare,{hp:10,atk:4.6,spd:4.5}]]){
   assert.equal(battle.difficulty,tier);for(const key of ['hp','atk','spd'])assert.equal(battle.enemy.base[key],normal.enemy.base[key]*mul[key],`${tier} ${key} floor ${floor}`);
   assert.equal(battle.enemy.base.def,normal.enemy.base.def);assert.deepEqual(battle.base,normal.base);
   assert.equal(!!battle.enemy.statuses.campaignArmor,shells.has(floor));
  }
 }
});

test('Main20 endgame challenge preserves lower tiers and separates build outcomes in NIGHTMARE',()=>{
 const profiles=['wing_abyss','res_abyssjudge'].map(id=>endgameProfiles.find(profile=>profile.id===id));
 assert.ok(profiles.every(Boolean));const policies=['feather','mixed','guard'],seeds=[1,19,46,91],nightmare={},nightmareActions={},tacticWins={feather:0,mixed:0,guard:0};
 for(const profile of profiles){nightmare[profile.id]={wins:0,losses:0};nightmareActions[profile.id]=[];for(const difficulty of ['NORMAL','EXPERT','NIGHTMARE'])for(const policy of policies)for(const seed of seeds){
  const battle=startMainBattle(makeNightmareProfile(profile),{floor:20,difficulty}),rng=seeded(seed);let actions=0;
  while(!battle.result&&actions<200){actMainBattle(battle,choose(battle,policy),{rng});actions++;}
  assert.ok(battle.result,`${profile.id}/${difficulty}/${policy}/${seed} must resolve`);
  if(difficulty==='NIGHTMARE'){nightmare[profile.id][battle.result==='win'?'wins':'losses']++;nightmareActions[profile.id].push({policy,actions});if(profile.id==='res_abyssjudge'&&battle.result==='win')tacticWins[policy]++;}
  else assert.equal(battle.result,'win',`${profile.id}/${difficulty}/${policy}/${seed} must remain completable`);
 }}
 assert.deepEqual(nightmare.wing_abyss,{wins:0,losses:12});
 assert.deepEqual(nightmare.res_abyssjudge,{wins:7,losses:5});
 assert.deepEqual(tacticWins,{feather:0,mixed:3,guard:4},'defense-weighted tactics should outperform feather-spam on the Nightmare final floor');
 assert.ok(new Set(nightmareActions.res_abyssjudge.map(x=>x.actions)).size>=2,'a successful endgame build should show tactic-dependent action counts');
});

test('a legal high-investment build clears the real twenty-floor route before NIGHTMARE unlocks',()=>{
 const profile=endgameProfiles.find(item=>item.id==='res_abyssjudge'),s=makeNightmareProfile(profile);
 s.floor=1;s.cleared=[];s.flags={...s.flags,lv100:false,reward100:false};assert.equal(main20NightmareUnlocked(s),false);
 const rng=seeded(311);
 for(let floor=1;floor<=20;floor++){
  assert.equal(s.floor,floor);assert.equal(main20NightmareUnlocked(s),false,`locked before floor ${floor} clear`);
  const b=startMainBattle(s,{floor,difficulty:'NORMAL'});let actions=0;
  while(!b.result&&actions<200){actMainBattle(b,choose(b,'mixed'),{rng});actions++;}
  assert.equal(b.result,'win',`normal floor ${floor} clears`);settleMainBattle(s,b);
  if(floor<20)assert.equal(main20NightmareUnlocked(s),false,`remains locked after floor ${floor}`);
 }
 assert.equal(s.cleared.length,20);assert.equal(s.floor,20);assert.equal(main20NightmareUnlocked(s),true);
 assert.equal(startMainBattle(s,{floor:20,difficulty:'NIGHTMARE'}).difficulty,'NIGHTMARE');
});

test('main20 difficulty rejects unsupported tiers and NIGHTMARE cannot leak into legacy route',()=>{
 const s=freshMain20();s.started=true;s.floor=20;
 for(const difficulty of ['unknown','HELL'])assert.throws(()=>startMainBattle(s,{floor:20,difficulty}));
 assert.equal(startMainBattle(s,{floor:20,difficulty:null}).difficulty,'NORMAL');
 assert.throws(()=>startMainBattle(s,{floor:20,difficulty:'NIGHTMARE'}),/全20階層クリア後/);
 s.cleared=[20];assert.equal(main20NightmareUnlocked(s),false);assert.throws(()=>startMainBattle(s,{floor:1,difficulty:'NIGHTMARE'}),/全20階層クリア後/);
 s.cleared=Array.from({length:20},(_,i)=>i+1);assert.equal(main20NightmareUnlocked(s),true);assert.equal(startMainBattle(s,{floor:20,difficulty:'NIGHTMARE'}).difficulty,'NIGHTMARE');
 const legacy={...s};delete legacy.route20;
 assert.throws(()=>startMainBattle(legacy,{floor:20,difficulty:'NIGHTMARE'}),/戦闘設定/);
});

test('an imported save with only floor 20 recorded remains locked until the full route is recorded',()=>{
 const partial=freshMain20();partial.started=true;partial.floor=20;partial.cleared=[20];
 const imported=validateMain20(JSON.parse(exportSave(partial)));
 assert.deepEqual(imported.cleared,[20]);assert.equal(main20NightmareUnlocked(imported),false);
 assert.throws(()=>startMainBattle(imported,{floor:1,difficulty:'NIGHTMARE'}),/全20階層クリア後/);
});

test('NIGHTMARE unlock requires every numeric floor and does not mutate imported clear records',()=>{
 const complete=Array.from({length:20},(_,i)=>i+1),state=freshMain20();state.route20=1;
 for(let missing=1;missing<=20;missing++){
  state.cleared=complete.filter(floor=>floor!==missing);
  const before=JSON.stringify(state.cleared);assert.equal(main20NightmareUnlocked(state),false,`missing floor ${missing}`);assert.equal(JSON.stringify(state.cleared),before);
 }
 for(const malformed of [null,{},'1,2,3',Array.from({length:19},(_,i)=>String(i+1)),[...complete.slice(0,19),21],complete.slice(0,19)]){
  state.cleared=malformed;assert.equal(main20NightmareUnlocked(state),false,`malformed clear record ${JSON.stringify(malformed)}`);
 }
 state.cleared=[...complete.slice(0,10),...complete.slice(0,10),...complete.slice(10)];
 assert.equal(main20NightmareUnlocked(state),true,'duplicate records retain backward-compatible completion');
 state.cleared=complete;state.route20=undefined;assert.equal(main20NightmareUnlocked(state),false);
 state.route20=0;assert.equal(main20NightmareUnlocked(state),false);
 state.route20=1;assert.equal(main20NightmareUnlocked(state),true);
});

test('legacy campaign migration preserves a completed Nightmare unlock but keeps incomplete histories locked',()=>{
 const full=fresh();full.started=true;full.floor=100;full.cleared=Array.from({length:100},(_,i)=>i+1);full.flags.lv100=true;
 const migratedFull=validateMain20(JSON.parse(exportSave(full)));
 assert.equal(migratedFull.route20,1);assert.equal(migratedFull.cleared.length,20);assert.equal(main20NightmareUnlocked(migratedFull),true);
 assert.equal(startMainBattle(migratedFull,{floor:20,difficulty:'NIGHTMARE'}).difficulty,'NIGHTMARE');
 const partial=fresh();partial.started=true;partial.floor=100;partial.cleared=Array.from({length:99},(_,i)=>i+1);
 const migratedPartial=validateMain20(JSON.parse(exportSave(partial)));
 assert.equal(migratedPartial.route20,1);assert.equal(migratedPartial.cleared.length,19);assert.equal(main20NightmareUnlocked(migratedPartial),false);
 assert.throws(()=>startMainBattle(migratedPartial,{floor:20,difficulty:'NIGHTMARE'}),/全20階層クリア後/);
});

test('Main20 NIGHTMARE scaling stays separate from the other endgame modes',()=>{
 const s=freshMain20();s.started=true;s.floor=20;s.cleared=Array.from({length:20},(_,i)=>i+1);
 for(const mode of ['ex','stella','final','raid','god']){
  const common=startBattle(s,{mode,floor:100,difficulty:'NORMAL',test:true});
  const expected=startBattle(s,{mode,floor:100,difficulty:'NIGHTMARE',test:true});
  const throughMain20=startMainBattle(s,{mode,floor:100,difficulty:'NIGHTMARE',test:true});
  assert.equal(throughMain20.main20,undefined,`${mode} must stay on the standard engine`);
  for(const key of ['hp','atk','spd']){
   assert.equal(expected.enemy.base[key],common.enemy.base[key]*({hp:1.6,atk:1.4,spd:1.2})[key]);
   assert.equal(throughMain20.enemy.base[key],expected.enemy.base[key]);
  }
  assert.equal(throughMain20.enemy.base.def,common.enemy.base.def);
 }
});

test('main20 difficulty changes do not change victory rewards; harder wins record EXPERT completion',()=>{
 const rewards=[];
 for(const difficulty of ['NORMAL','EXPERT','NIGHTMARE']){
  const s=freshMain20();s.started=true;s.floor=20;s.cleared=Array.from({length:20},(_,i)=>i+1);s.level=100;s.stats.atk=50;s.finalBuild.atk=150;s.powers.wing=s.powers.abyss=5;s.markEquip=['wind','split','abyssmark'];s.marks=[...s.markEquip];
  const b=startMainBattle(s,{floor:5,difficulty}),rng=seeded(8451);while(!b.result&&b.turn<201)actMainBattle(b,choose(b,'mixed'),{rng});
  assert.equal(b.result,'win',`${difficulty} should clear with the same developed profile`);rewards.push(settleMainBattle(s,b));
  assert.equal(s.records.expert,difficulty!=='NORMAL');
 }
 for(const key of ['p','sp','levels','resShards','fragments','bonusP'])assert.deepEqual(rewards[0][key],rewards[1][key],key);
 for(const key of ['p','sp','levels','resShards','fragments','bonusP'])assert.deepEqual(rewards[0][key],rewards[2][key],key);
});

test('a NIGHTMARE loss grants no progression rewards and keeps campaign progress intact',()=>{
 const profile=endgameProfiles.find(item=>item.id==='wing_abyss'),s=makeNightmareProfile(profile);
 s.p=1000;s.sp=23;s.resShards=9;
 const before={floor:s.floor,cleared:[...s.cleared],p:s.p,sp:s.sp,resShards:s.resShards,fragments:{...s.fragments}};
 const b=startMainBattle(s,{floor:20,difficulty:'NIGHTMARE'}),rng=seeded(1);
 while(!b.result&&b.turn<201)actMainBattle(b,choose(b,'feather'),{rng});
 assert.equal(b.result,'lose');const reward=settleMainBattle(s,b);
 assert.equal(reward.p,0);assert.equal(reward.fragments,0);assert.equal(reward.resShards,0);
 assert.deepEqual({floor:s.floor,cleared:s.cleared,p:s.p,sp:s.sp,resShards:s.resShards,fragments:s.fragments},before);
});

test('main20 lobby offers the measured Nightmare tier and explains enemy-only scaling',()=>{
 const app=fs.readFileSync('web/src/components/App.js','utf8');
 const lobby=app.slice(app.indexOf('function battleView('),app.indexOf(' const b=battle'));
 assert.match(lobby,/id="difficulty" aria-label="通常20階層の難易度"/);
 assert.match(lobby,/value="NIGHTMARE" \$\{difficulty==='NIGHTMARE'\?'selected':''\} \$\{main20NightmareUnlocked\(a\)\?'':'disabled'\}>NIGHTMARE/);
 assert.match(lobby,/全20階層クリアで解放/);
 assert.match(lobby,/NIGHTMAREは全20階層クリアで解放。敵HP10倍・攻撃4\.6倍・速度4\.5倍/);
 assert.match(lobby,/難易度で報酬量は変わりません/);
 assert.match(app,/difficulty=\$\('#difficulty'\)\.value/);
 assert.match(app,/beginFight\(old\.mode,\{floor:next,test,difficulty:old\.difficulty\}\)/);
});

test('battle results retain the selected high-difficulty tier for later review',()=>{
 const app=fs.readFileSync('web/src/components/App.js','utf8');
 const result=app.slice(app.indexOf('function resultView('),app.indexOf('function archive('));
 assert.match(result,/BATTLE RESULT'\}\$\{b\.difficulty!=='NORMAL'\?` · \$\{esc\(b\.difficulty\)\}`:''\}/);
});
