// Cooperative abilities (Ver.3): all final-tier values are the approved level-5 values.
export const RESONANCE_COSTS=[40,80,120,160];
export const RESONANCE_THRESHOLDS=[20,40,60,80,100];
export const RESONANCES=[
 {id:'wingjudge',name:'黒き翼の裁き',parts:['wing','judge'],floor:1,kind:'barrage',
  levels:[
   {hits:6,mult:30,ignore:.2,extraMaxHp:.02},
   {hits:8,mult:44,ignore:.35,extraMaxHp:.03},
   {hits:10,mult:60,ignore:.45,extraMaxHp:.04},
   {hits:11,mult:77,ignore:.6,extraMaxHp:.05},
   {hits:12,mult:96,ignore:.7,extraMaxHp:.06}
  ]},
 {id:'fallenabyss',name:'深淵狂喜',parts:['fallen','abyss'],floor:3,kind:'sacrifice',
  levels:[
   {mult:15,erosion:.04,extraMaxHp:.02,healLow:.02,healHigh:.06},
   {mult:22.5,erosion:.08,extraMaxHp:.04,healLow:.04,healHigh:.12},
   {mult:30,erosion:.12,extraMaxHp:.06,healLow:.06,healHigh:.18},
   {mult:37.5,erosion:.16,extraMaxHp:.08,healLow:.08,healHigh:.24},
   {mult:45,erosion:.20,extraMaxHp:.1,healLow:.10,healHigh:.30}
  ]},
 {id:'wingfallen',name:'反逆の黒翼',parts:['wing','fallen'],floor:5,kind:'lowBarrage',
  levels:[
   {hits:[10,12,14,16],mult:[40,48,56,64]},
   {hits:[15,18,21,24],mult:[60,72,84,96]},
   {hits:[20,24,28,32],mult:[80,96,112,128]},
   {hits:[25,30,35,40],mult:[100,120,140,160]},
   {hits:[30,35,40,45],mult:[120,140,160,180]}
  ]},
 {id:'wingking',name:'王翼の加護',parts:['wing','king'],floor:7,kind:'guard',
  levels:[
   {shield:.20,reduction:.40,enemyActions:1,counters:1,counterMult:4},
   {shield:.275,reduction:.50,enemyActions:2,counters:1,counterMult:6},
   {shield:.35,reduction:.60,enemyActions:2,counters:2,counterMult:8},
   {shield:.425,reduction:.70,enemyActions:3,counters:2,counterMult:10},
   {shield:.50,reduction:.80,enemyActions:3,counters:3,counterMult:12}
  ]},
 {id:'wingabyss',name:'蝕翼の嵐',parts:['wing','abyss'],floor:9,kind:'corrosionBarrage',
  levels:[
   {hits:4,bonusHits:2,hitMult:5,erosion:.01},
   {hits:6,bonusHits:4,hitMult:5,erosion:.015},
   {hits:8,bonusHits:6,hitMult:5,erosion:.02},
   {hits:9,bonusHits:8,hitMult:5,erosion:.025},
   {hits:10,bonusHits:10,hitMult:5,erosion:.03}
  ]},
 {id:'fallenjudge',name:'堕天の審判',parts:['fallen','judge'],floor:11,kind:'lowJudgment',
  levels:[
   {mult:10,ignore:.30,currentHp:[.05,.10],proofExtra:.15},
   {mult:14,ignore:.45,currentHp:[.08,.16],proofExtra:.22},
   {mult:18,ignore:.60,currentHp:[.12,.22],proofExtra:.30},
   {mult:22,ignore:.75,currentHp:[.16,.29],proofExtra:.38},
   {mult:25,ignore:.90,currentHp:[.20,.35],proofExtra:.45}
  ]},
 {id:'kingjudge',name:'王の判決',parts:['king','judge'],floor:13,kind:'royalJudgment',
  levels:[
   {shield:.10,counterMult:10,ignore:.50,extraMaxHp:.02},
   {shield:.15,counterMult:15,ignore:.65,extraMaxHp:.04},
   {shield:.20,counterMult:20,ignore:.75,extraMaxHp:.06},
   {shield:.25,counterMult:25,ignore:.90,extraMaxHp:.08},
   {shield:.30,counterMult:30,ignore:1,extraMaxHp:.10}
  ]},
 {id:'kingabyss',name:'不滅の奈落',parts:['king','abyss'],floor:15,kind:'abyssBarrier',
  levels:[
   {turns:2,reduction:.55,heal:.10,erosion:.04,storedMult:2},
   {turns:3,reduction:.65,heal:.20,erosion:.08,storedMult:4},
   {turns:3,reduction:.75,heal:.30,erosion:.12,storedMult:6},
   {turns:4,reduction:.85,heal:.40,erosion:.16,storedMult:8},
   {turns:5,reduction:.95,heal:.50,erosion:.20,storedMult:10}
  ]},
 {id:'kingfallen',name:'不屈の反逆',parts:['king','fallen'],floor:17,kind:'survival',
  levels:[
   {enemyActions:1,counterMult:10,lowCounterMult:20,heal:.05},
   {enemyActions:1,counterMult:20,lowCounterMult:40,heal:.08},
   {enemyActions:2,counterMult:30,lowCounterMult:60,heal:.12},
   {enemyActions:2,counterMult:40,lowCounterMult:80,heal:.16},
   {enemyActions:3,counterMult:50,lowCounterMult:100,heal:.20}
  ]},
 {id:'abyssjudge',name:'静寂の宣告',parts:['abyss','judge'],floor:19,kind:'silence',
  levels:[
   {debuff:.10,sealTurns:1,ignore:.2,proofMult:5},
   {debuff:.15,sealTurns:1,ignore:.4,proofMult:10},
   {debuff:.20,sealTurns:2,ignore:.6,proofMult:15},
   {debuff:.25,sealTurns:2,ignore:.8,proofMult:20},
   {debuff:.30,sealTurns:3,ignore:1,proofMult:25}
  ]}
];
export const RESONANCE_BY_ID=Object.fromEntries(RESONANCES.map(x=>[x.id,x]));
export function resonanceState(s){
 if(!s?.divinity)throw Error('五権能が必要です');
 return s.divinity.resonanceV3 ||= {levels:{},cleared:[],floor:1};
}
export function resonanceLevel(s,id){return resonanceState(s).levels[id]||0;}
export function resonanceMaxLevel(s,id){
 const row=RESONANCE_BY_ID[id];
 if(!row)return 0;
 const cooperation=s.divinity?.cooperation||{};
 const rate=Math.min(...row.parts.map(p=>cooperation[p]||0));
 let max=0;for(const required of RESONANCE_THRESHOLDS)if(rate>=required)max++;
 return max;
}
export function resonanceCanUse(s,id){
 const row=RESONANCE_BY_ID[id];return !!row&&resonanceLevel(s,id)>0&&resonanceMaxLevel(s,id)>=1;
}
export function learnResonance(s,id){
 const row=RESONANCE_BY_ID[id];if(!row)throw Error('共鳴権能が不明です');
 const d=resonanceState(s);
 if(d.levels[id])return false;
 // A story breakthrough can raise each participant to the entry threshold,
 // but never exceed its already earned cooperation ceiling.
 for(const power of row.parts){
  s.divinity.cooperation[power]=Math.max(20,s.divinity.cooperation[power]||0);
 }
 d.levels[id]=1;
 return true;
}
export function upgradeResonance(s,id){
 const row=RESONANCE_BY_ID[id],lv=resonanceLevel(s,id);
 if(!row||lv===0||lv>=5)throw Error('強化できない共鳴権能です');
 if(resonanceMaxLevel(s,id)<=lv)throw Error('2人の協力率が足りません');
 const cost=RESONANCE_COSTS[lv-1];
 if(s.resShards<cost)throw Error('共鳴片が足りません');
 s.resShards-=cost;resonanceState(s).levels[id]=lv+1;
 return lv+1;
}