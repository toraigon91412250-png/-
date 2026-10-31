// Free in-game summons. No cash purchases, no direct authority unlocks.
export const SUMMON_COST_SINGLE=100;
export const SUMMON_COST_TEN=900;
export const SUMMON_WIN_REWARD=250;
export const SUMMON_RATES={SSR:.03,SR:.17,R:.8};
export const SUMMON_AUTHORITIES=['wing','king','abyss','fallen','judge'];

function randomUnit(rng){
 const n=rng();
 if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>=1)throw Error('召喚抽選が不正です');
 return n;
}
export function summonBalance(s){return Number.isSafeInteger(s.summonPoints)&&s.summonPoints>=0?s.summonPoints:0;}
export function addSummonWinReward(s,b){
 if(!b||b.result!=='win'||b.test||b.trial||b.experiment||b.lab20||(b.campaign&&!b.main20))return 0;
 if(!['normal','ex','stella','final','god','main20'].includes(b.mode))return 0;
 // Rewards are granted only from the existing settlement path, which sets b.settled.
 s.summonPoints=summonBalance(s)+SUMMON_WIN_REWARD;
 return SUMMON_WIN_REWARD;
}
function draw(rng){
 const value=randomUnit(rng);
 const rarity=value<SUMMON_RATES.SSR?'SSR':value<SUMMON_RATES.SSR+SUMMON_RATES.SR?'SR':'R';
 if(rarity==='SSR')return {rarity,kind:'resShards',amount:160};
 if(rarity==='SR')return {rarity,kind:'resShards',amount:45};
 const kind=randomUnit(rng)<.7?'resShards':'fragment';
 return kind==='resShards'?{rarity,kind,amount:12}:{rarity,kind,amount:8,authority:SUMMON_AUTHORITIES[Math.floor(randomUnit(rng)*SUMMON_AUTHORITIES.length)]};
}
export function summon(s,count=1,rng=Math.random){
 if(![1,10].includes(count))throw Error('召喚回数が不正です');
 const price=count===10?SUMMON_COST_TEN:SUMMON_COST_SINGLE;
 if(summonBalance(s)<price)throw Error('召喚ポイントが足りません');
 // Construct all results before mutating the state (invalid RNG cannot consume currency).
 const prizes=Array.from({length:count},()=>draw(rng));
 if(count===10&&!prizes.some(p=>p.rarity!=='R'))prizes[9]={rarity:'SR',kind:'resShards',amount:45};
 const totals={resShards:0,fragments:{}};
 for(const p of prizes){
  if(p.kind==='resShards')totals.resShards+=p.amount;
  else totals.fragments[p.authority]=(totals.fragments[p.authority]||0)+p.amount;
 }
 s.summonPoints=summonBalance(s)-price;
 s.resShards=(s.resShards||0)+totals.resShards;
 s.fragments ||= {};
 for(const [id,n] of Object.entries(totals.fragments))s.fragments[id]=(s.fragments[id]||0)+n;
 return {count,price,prizes,totals,balance:s.summonPoints};
}