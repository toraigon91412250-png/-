import {RESONANCES,resonanceLevel} from '../data/resonanceV3.js';
import {DIV_IDS,DIV_NAMES,DIV_ART,DIV_STAGES,DIV_BRANCHES,DIV_SKILLS,DIV_TRIALS} from '../data/divinity.js';
import {POWERS,RECIPES} from '../data/config.js';
import {divinityTrialReason,divinityAwakenReason,divinityNext} from '../utils/divinityProgress.js';
import {divBattleState,divHasPower,divPowerLevel} from '../utils/divinityCombat.js';
import {divTrial,divinityIntent} from '../utils/divinityTrials.js';
import {playerStats,enemyStats,available} from '../utils/gameCore.js';
import {cooperationEnabled,cooperationCap,cooperationTier,cooperationTrialReason,canZeroRelease,COOP_STYLES} from '../utils/divinityCooperation.js';
const divEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const divNum=x=>Math.floor(x).toLocaleString('ja-JP');
export function divinityHome(s,button){return `<section class="div-home card"><img src="${DIV_ART[s.awakening]}" alt="${DIV_STAGES[s.awakening].name}"><div><small>失われた神格 · ${s.awakening}/5</small><h2>${DIV_STAGES[s.awakening].name}</h2><p>${divinityNext(s)}</p>${button(cooperationEnabled(s)?'五権能との協力を深める →':'神格と権能を取り戻す →','nav','awakening','primary')}</div></section>`;}
export function divinityPowersView(s,button){if(cooperationEnabled(s))return cooperationPowersView(s,button);return `<div class="div-power-grid">${DIV_IDS.map(id=>{
 const level=s.powers[id]||0,owned=s.divinity.reclaimed.includes(id),reason=divinityTrialReason(s,id),cost=level*8;
 return `<article class="card div-power ${owned?'reclaimed':''}" data-power="${id}"><div class="row between"><h3>${DIV_NAMES[id]}</h3><span class="tag">${level?'Lv.'+level+' / 5':'封印中'}</span></div><p>${DIV_TRIALS[id].condition}</p><details><summary>権能の能力・成長</summary><p>${POWERS.find(p=>p.id===id).effect}</p><ol><li>基本技を取り戻す</li><li>${id==='wing'?'防御で羽を2枚蓄積':id==='abyss'?'専用技の侵食＋3%':id==='fallen'?'誓約で必殺ゲージ＋15':id==='king'?'受け流しの障壁が35%に上昇':'防御後の異なる攻撃で証を2つ蓄積'}</li><li>成長方向を選択${id==='wing'?'・羽衣を解放':''}</li><li>異系統の専用技で連携（神格2未満でも＋20%）</li><li>${Object.values(DIV_SKILLS).filter(k=>k.power===id&&k.level===5).map(k=>k.name).join('')||'翼嵐と羽衣の完成・共鳴への接続'}</li></ol></details><div class="div-actions">${owned?button(s.equipped.includes(id)?'装備中：解除':'装備する','equipPower',id,'ghost'):''}${button(owned?'試練を再訪':reason||'奪還試練へ','divTrial',id,owned?'ghost':'primary',!!reason)}${level?button(level===5?'権能Lv.5':`育成 ${cost}欠片（所持${s.fragments[id]}）`,'upgradePower',id,'',level===5||s.fragments[id]<cost):''}</div>${level>=3?`<fieldset class="div-branches"><legend>成長方向 · 戦闘外で自由に変更</legend>${DIV_BRANCHES[id].map(([key,label,text])=>`<button data-action="divBranch" data-id="${id}:${key}" aria-pressed="${s.divinity.branches[id]===key}"><strong>${label}</strong><small>${text}</small></button>`).join('')}</fieldset>`:''}<div class="div-skill-preview">${Object.values(DIV_SKILLS).filter(x=>x.power===id).map(x=>`<span class="${level>=x.level?'learned':''}">Lv.${x.level} ${x.name}</span>`).join('')}</div></article>`;
 }).join('')}</div>${s.powers.star?`<section class="card"><h3>天星覇権 Lv.5</h3><p>${POWERS.find(x=>x.id==='star').effect}</p>${button(s.equipped.includes('star')?'装備解除':'装備する','equipPower','star','primary')}</section>`:''}`;}
export function divinityView(s,button){if(cooperationEnabled(s))return cooperationView(s,button);const reason=divinityAwakenReason(s);return `<div class="div-heading"><small>THE SEALED DIVINITY</small><h1>失われた神格</h1><p>封印したのは、私自身。取り戻す理由を、この旅で見つける。</p></div>${s.divinity.notice?`<div class="notice">${divEsc(s.divinity.notice)}${button('確認した','divNotice','','ghost small')}</div>`:''}<section class="div-hero"><img src="${DIV_ART[s.awakening]}" alt="神格第${s.awakening}段階・${DIV_STAGES[s.awakening].name}"><div class="div-hero-copy"><small>神格 ${s.awakening} / 5</small><h2>${DIV_STAGES[s.awakening].name}</h2><p>${DIV_STAGES[s.awakening].effect}</p><div class="div-stage-track">${DIV_STAGES.slice(1).map((x,i)=>`<span class="${s.awakening>i?'active':''}">${i+1}</span>`).join('')}</div>${button(s.awakening===5?'真の神格に到達':reason||'次の神格へ覚醒','divAwaken','','primary',!!reason)}<p class="small">神格は本編と奪還の進行、権能は欠片で個別に育成します。</p></div></section><section class="card div-memory"><h3>取り戻した記憶</h3><p>「${DIV_STAGES[s.awakening].memory}」</p><details><summary>旅の記憶を読み返す</summary>${DIV_STAGES.slice(0,s.awakening+1).map(x=>`<p><b>${x.name}</b><br>${x.memory}</p>`).join('')}${s.divinity.order.map(id=>`<p><b>${DIV_NAMES[id]}</b><br>${DIV_TRIALS[id].memory}</p>`).join('')}</details></section><div class="section-head"><h2>封じられた五つの権能</h2><span>${s.divinity.reclaimed.length} / 5 奪還</span></div><p>最初に黒翼。その後の4試練は同時に開かれ、どの順番でも挑めます。試練中の覚醒を勝利で確かな力に。</p>${divinityPowersView(s,button)}<section class="card div-final-gates"><h2>封印の先へ</h2><p>神格4・本編20階・全権能Lv.5で、最後の記憶が開く。</p>${['truth','infinite'].map(id=>{const why=divinityTrialReason(s,id);return `<div><h3>${DIV_TRIALS[id].name}</h3><p>${id==='infinite'?'真の神格に応える高難度戦。予告を読み、異系統の力で3枚の封印を破砕する。突破 '+s.divinity.infiniteWins+'回。':'かつての自分が残した試練。防御と3系統の権能を使い、自ら封じた理由を知る。'}</p>${button(why||'試練に挑む','divTrial',id,'primary',!!why)}</div>`;}).join('')}${button('共鳴を組み合わせる','openupgrade','resonance','ghost')}${button('本編の続きを進める','nav','battle','ghost')}${button('神域五神連戦','fight','god','ghost',!s.flags.ex)}</section>`;}
export function divinityCommands(b){
 if(b.statuses.stun)return [['wait','復帰','反動から復帰する']];
 const out=[['slash','斬撃','通常攻撃・ゲージ＋26'],['guard','防御',divTrial(b)?'予告対処・80%軽減・HP8%回復':b.main20?'70%軽減・HP12%回復・蓄勢':'70%軽減・反撃準備']];
 if(divHasPower(b,'wing'))out.push(['feather','羽弾','黒翼の力を込めた羽弾']);
 if(b.powers.length)out.push(['power','破壊の権能','1枠目の固有効果・CT3']);
 if(divHasPower(b,'fallen')||b.build.awakening>=2)out.push(['ultimate','超堕天撃','ゲージ100%で発動']);
 if(b.marks.includes('split')&&divHasPower(b,'wing'))out.push(['pierce','穿羽','防壁を貫く羽撃ち'],['volley','連羽','2連撃・交互使用で連携']);
 for(const [id,row] of Object.entries(DIV_SKILLS))if(row.power?divHasPower(b,row.power)&&divPowerLevel(b,row.power)>=row.level:
  (cooperationEnabled(b.build)&&row.attune?(!b.powers.includes(row.attune)&&b.build.divinity.reclaimed.includes(row.attune)):
   b.build.awakening>=row.stage&&(!row.attune||b.build.divinity.reclaimed.includes(row.attune))))
  out.push([id,cooperationEnabled(b.build)&&row.attune?`交代：${DIV_NAMES[row.attune]}`:row.name,cooperationEnabled(b.build)&&row.attune?'1ターン消費・敵も行動する':row.text]);
 for(const row of RESONANCES){
  const learned=resonanceLevel(b.build,row.id);
  const temp=b.trial?.kind==='resonance20'&&b.trial.tempId===row.id&&b.trial.proven;
  if(row.parts.every(p=>b.powers.includes(p))&&(learned||temp))
   out.push(['res_'+row.id,row.name, '共鳴Lv.'+(learned||1)+' / 必殺ゲージ100・共通CT2']);
 }
 return out;
}
// Presentation-only helpers: battle actions and their effects remain in the combat engine.
const DIV_COMBAT_SURFACE='assets/divinity/combat-obsidian.webp';
const divStatusNames={pressure:'重圧',stun:'行動不能',seal:'封印',slow:'速度低下',fragile:'防御低下',divinityWeaken:'侵食弱体',campaignArmor:'黒晶殻',campaignSever:'再生封じ',researchExposed:'防御露出',invulnerable:'無敵'};
export function divinityStatusText(statuses){return Object.entries(statuses||{}).map(([key,value])=>`${divStatusNames[key]||'特殊状態'} ${value>99?'継続':value+'T'}`).join('・')||'異常なし';}
export function divinityPageSize(height=844){return height<700?2:4;}
function divIcon(kind){const paths={
 sigil:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/><circle cx="12" cy="12" r="5"/>',
 slash:'<path d="m8 16 10-13 3-1-1 4L9 18M4 14l6 6M3 21l4-4M2 22l2-2"/>',
 guard:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="M12 6v11M7 9l5-3 5 3"/>',
 feather:'<path d="M4 20 19 3C8 1 2 8 4 20c12 1 17-7 15-17M4 20l-2 2M9 14h6M12 10h5"/>',
 proof:'<path d="m12 2 7 10-7 10-7-10ZM12 2v20M5 12h14"/>',
 counter:'<path d="M5 8a8 8 0 1 1-1 8M2 3v7h7"/>',
 book:'<path d="M12 5C8 2 4 2 2 3v17c3-1 6-1 10 1 4-2 7-2 10-1V3c-2-1-6-1-10 2ZM12 5v16"/>',
 state:'<rect x="5" y="3" width="14" height="19" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
 exit:'<path d="M9 4H3v16h6M8 12h14M16 6l6 6-6 6"/>',
 lock:'<rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3"/>',
};return `<svg class="div-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]||paths.sigil}</svg>`;}
export function divinityBattleView(s,b,button,enemySrc,commandPage=0,mirrorText='',pageSize=4){
 const p=playerStats(b),e=enemyStats(b),d=divBattleState(b),skills=divinityCommands(b),pages=Math.max(1,Math.ceil(skills.length/pageSize)),page=Math.max(0,Math.min(commandPage,pages-1)),cmds=skills.slice(page*pageSize,page*pageSize+pageSize),trial=divTrial(b)?b.trial:null;
 const intent=divinityIntent(b).split('：'),intentName=intent[0].replace(/^敵の/,''),intentHint=intent.slice(1).join('：');
 const equipped=b.powers.map(id=>DIV_NAMES[id]||RECIPES.find(r=>r.id===id)?.name||POWERS.find(r=>r.id===id)?.name||id).join('・')||'未解放';
 const stateCard=(side,title,status,extra)=>{const entries=divinityStatusText(status).split('・');return `<button class="div-status-card div-status-${side}" data-action="divInfo" data-id="" aria-label="${title}：${divEsc(entries.join('・'))}、${extra}。詳細を開く"><span class="div-status-label">${divIcon(side==='player'?'guard':'counter')}${title}<em>${entries.length>1?'＋'+(entries.length-1):'›'}</em></span><strong>${divEsc(entries[0])}</strong><small>${extra}</small></button>`;};
 const hp=(side,name,current,max,ratio)=>`<div class="div-hp div-hp-${side}"><strong>${divEsc(name)}</strong><span class="div-hp-value">${divNum(current)} <small>/ ${divNum(max)}</small></span><meter aria-label="${side==='player'?'自分':'敵'}HP" min="0" max="1" value="${Math.max(0,Math.min(1,ratio))}"></meter><div class="div-hp-track" aria-hidden="true"><i style="width:${Math.max(0,Math.min(1,ratio))*100}%"></i></div></div>`;
 const objective=trial?(trial.cooperation?(trial.proven?'協力条件達成！ 勝利して試練を突破しよう。':`条件：${COOP_STYLES[trial.id]}。現在、条件未達。`):['truth','infinite'].includes(trial.id)?DIV_TRIALS[trial.id].condition+'（使用系統 '+trial.seen.length+'）':trial.awakened?(trial.used?'権能を使った。勝利して持ち帰れ！':'封印解除！ 新しい権能の技を選ぼう。'):DIV_TRIALS[trial.id].condition+`（防御 ${trial.guards} / 証 ${trial.proof}）`):'';
 return `<section class="div-combat ${d.unified?'div-unified':''}" aria-label="神格戦闘" data-pages="${pages}" data-page="${page}" data-page-size="${pageSize}" style="--div-surface:url('${DIV_COMBAT_SURFACE}')">
 <header class="div-battle-head"><div class="div-title">${divIcon('sigil')}<div><h1>失われた神格</h1><small>${divEsc(trial?DIV_TRIALS[trial.id].name:b.main20?'再誕の物語 · 第'+b.floor+'階層':b.enemy.name)}</small></div></div><div class="div-battle-meta"><strong class="div-turn">TURN ${b.turn}</strong><span class="div-stage-badge">神格 <b>${b.build.awakening}</b></span></div></header>
 <div class="div-arena battle-stage"><img class="div-player" src="${DIV_ART[b.build.awakening]}" alt="いれーな・${DIV_STAGES[b.build.awakening].name}"><img class="div-enemy ${trial?'div-trial-shadow':''}" src="${trial?DIV_ART[['truth','infinite'].includes(trial.id)?5:2]:enemySrc||DIV_ART[5]}" alt="${divEsc(b.enemy.name)}">${cooperationEnabled(b.build)&&d.line?`<div class="cooperation-banter ${d.line.kind==='release'?'cooperation-banter-release':''}" aria-label="${divEsc(d.line.lines.map(x=>x.speaker+'：'+x.text).join('。'))}" style="--banter-duration:${d.line.lines.length*1.45+.25}s">${d.line.lines.map((x,i)=>`<div class="cooperation-banter-line" style="animation-delay:${(i*1.45).toFixed(2)}s"><b>${divEsc(x.speaker)}</b><span>${divEsc(x.text)}</span></div>`).join('')}</div>`:''}<div class="div-arena-divider" aria-hidden="true">${divIcon('sigil')}</div><div class="div-vfx-target div-vfx-player" aria-hidden="true"></div><div class="div-vfx-target div-vfx-enemy" aria-hidden="true"></div>${hp('player','いれーな',p.current,p.hp,p.ratio)}${hp('enemy',b.enemy.name,b.enemy.hp,e.hp,b.enemy.hp/e.hp)}${b.lastDamage?`<div class="div-damage" aria-label="与ダメージ${Math.floor(b.lastDamage)}">${divNum(b.lastDamage)}</div>`:''}</div>
 ${b.result?`<section class="div-result"><h2>${b.result==='win'?'VICTORY':'DEFEAT'}</h2><p>${trial&&b.result==='win'?DIV_TRIALS[trial.id].memory:b.result==='win'?'新しい記憶へ、一歩。':'取り戻した権能・育成はそのまま。戦術を変えて再挑戦。'}</p>${trial&&b.reward?.unlocks?.length?`<strong>${b.reward.unlocks.map(x=>DIV_NAMES[x]||x).join('・')} を正式解放</strong>`:''}<p>獲得 ${b.reward?.p||0}P / 権能欠片 ${b.reward?.fragments||0} / 共鳴片 ${b.reward?.resShards||0}</p>${button('神格へ','divFinish','','primary')}${button('聖域へ','finish','','ghost')}${button(!trial&&b.main20&&b.result==='win'&&b.floor<20?'次の階層へ':'再挑戦','retry','','ghost')}</section>`:`
 <div class="div-telegraph" aria-label="敵の次の行動">${divIcon('counter')}<b>敵の予告</b><div><strong>${divEsc(intentName)}</strong>${intentHint?`<small>${divEsc(intentHint)}</small>`:''}</div>${b.mode==='ex'&&b.enemy.phase===3?`<span>終末まで ${Math.max(0,9-b.phaseTurns)}T</span>`:''}${trial?.seals?`<span>封印 ${trial.seals}枚</span>`:''}</div>
 <div class="div-battle-state">${stateCard('player','自分の状態',b.statuses,'障壁 '+divNum(d.shield))}${stateCard('enemy','敵の状態',b.enemy.statuses,'侵食 '+Math.round(b.erosion*100)+'%')}</div>
 <div class="div-resource-grid" aria-label="権能の蓄積">${[['feather','羽',d.feathers,5],['proof','証',d.proof,2],['counter','反撃',d.counter,2],['sigil','必殺',b.gauge,100]].map(([icon,label,value,max])=>`<div class="div-resource ${value>=max?'is-ready':''}" aria-label="${label} ${value}${max===100?'%':' / '+max}"><span>${divIcon(icon)}${label}</span><strong>${value}<small>${max===100?'%':' / '+max}</small></strong><i style="--fill:${Math.max(0,Math.min(100,value/max*100))}%" aria-hidden="true"></i></div>`).join('')}</div>
 <div class="div-loadout">${divIcon(b.powers.length?'sigil':'lock')}<span>装備：${divEsc(equipped)}</span>${d.unified?`<b>神格解放 · 残り${d.unified}行動</b>`:''}</div>
 ${objective?`<button class="div-objective" data-action="divInfo" data-id=""><span>${divEsc(objective)}</span><b>詳細 ›</b></button>`:''}${mirrorText?`<button class="div-objective" data-action="divInfo" data-id=""><span>${divEsc(mirrorText)}</span><b>詳細 ›</b></button>`:''}
 <div class="div-command-dock"><div class="div-command-tabs ${pages===1?'single-page':''}" aria-label="コマンドページ">${pages>1?button('‹ 前へ','divPage',String(page-1),'div-page-prev',page===0):''}<span><b>${page===0?'基本コマンド':'権能・神格'}</b>${pages>1?`<small>${page+1} / ${pages}</small>`:''}</span>${pages>1?button('次へ ›','divPage',String(page+1),'div-page-next',page===pages-1):''}</div><div class="div-commands ${cmds.length<=2?'div-commands-pair':''}" aria-label="戦闘コマンド">${cmds.map(([id,title,text])=>{const reason=available(b,id),icon=id==='slash'?'slash':id==='guard'||DIV_SKILLS[id]?.guard?'guard':id==='feather'||id==='plume'||id==='volley'||id==='pierce'?'feather':'sigil';return `<button data-action="divCommand" data-id="${id}" ${reason?'disabled':''} class="div-command-${icon} ${id==='apotheosis'||id==='convergence'?'div-command-god':''}" title="${divEsc(reason||text)}">${divIcon(icon)}<strong>${divEsc(title)}</strong><small>${divEsc(reason||text)}</small></button>`;}).join('')}</div></div>
 <footer class="div-combat-footer"><span class="div-last-log" aria-live="polite">${divEsc(b.log.at(-1))}</span>${button(divIcon('state')+'状態','divInfo','','ghost')}${button(divIcon('book')+'記録','combatLog','','ghost')}${button(divIcon('exit')+'撤退','askRetreat','','ghost')}</footer>`}</section>`;
}
export function divinityDevView(button){return `<section class="card"><h2>神格の検証</h2><p>独立した試験セーブを作成。段階0は黒翼未解放・第1階突破、段階1〜5は全権能Lv.5と素材を準備。権能Lvと神格段階は別々に変更できます。</p><div class="div-actions">${Array.from({length:6},(_,i)=>button('神格 '+i,'divDev',String(i),'ghost')).join('')}</div><label>神格段階 <select id="div-dev-stage">${Array.from({length:6},(_,i)=>`<option>${i}</option>`).join('')}</select></label>${button('段階のみ変更','divDevStage','','ghost')}<label>権能 <select id="div-dev-power">${DIV_IDS.map(id=>`<option value="${id}">${DIV_NAMES[id]}</option>`).join('')}</select></label><label>Lv <select id="div-dev-level">${[1,2,3,4,5].map(i=>`<option>${i}</option>`).join('')}</select></label>${button('権能Lvのみ変更','divDevLevel','','ghost')}</section>`;}
export function playDivinityMoment(title,text,art){
 return new Promise(resolve=>{const el=document.createElement('div');el.className='div-awakening-moment';el.setAttribute('role','status');el.innerHTML=`<img src="${art}" alt=""><div><small>SEAL RELEASE</small><h2>${divEsc(title)}</h2><p>${divEsc(text)}</p><button>進む</button></div>`;document.body.append(el);let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);el.remove();resolve();};const timer=setTimeout(finish,matchMedia('(prefers-reduced-motion: reduce)').matches?400:1500);el.querySelector('button').onclick=finish;});
}


function cooperationPowersView(s,button){
 return `<div class="cooperation-grid">${['wing','king','fallen','judge','abyss'].map(id=>{
  const rate=s.divinity.cooperation[id],cap=cooperationCap(s,id),tier=cooperationTier(s,id),why=cooperationTrialReason(s,id);
  const level=s.powers[id]||1,cost=level*8;
  return `<article class="card cooperation-card"><div class="row between"><h3>${DIV_NAMES[id]}</h3><b>${rate.toFixed(1)}% <small>/ ${cap}%</small></b></div>
   <progress max="100" value="${rate}" aria-label="${DIV_NAMES[id]}の協力率"></progress><p class="small">${COOP_STYLES[id]}</p>
   <p class="small">協力試練 ${tier}/2 · 権能 Lv.${level}/5 · 成長上限 ${cap}%</p>
   <div class="div-actions">${button(s.equipped.includes(id)?'装備解除':'装備する','equipPower',id,'ghost')}
   ${tier<2?button(why||`第${tier+1}協力試練へ`,'divTrial',id,'primary',!!why):'<span class="tag">試練制覇</span>'}
   ${button(level===5?'権能Lv.MAX':`権能育成 ${cost}片`,'upgradePower',id,'ghost',level===5||s.fragments[id]<cost)}</div>
   ${level>=3?`<fieldset class="div-branches"><legend>成長方向</legend>${DIV_BRANCHES[id].map(([key,label,text])=>`<button data-action="divBranch" data-id="${id}:${key}" aria-pressed="${s.divinity.branches[id]===key}"><strong>${label}</strong><small>${text}</small></button>`).join('')}</fieldset>`:''}
  </article>`;}).join('')}</div>`;
}
function cooperationView(s,button){
 const reason=divinityAwakenReason(s),canX=canZeroRelease(s);
 return `<div class="div-heading"><small>FIVE AUTHORITIES / COOPERATION</small><h1>失われた神格</h1><p>封印されていたのは、五人の存在ではなく、貸し出される力。戦いと試練を重ねて協力を深める。</p></div>
  ${s.divinity.notice?`<div class="notice">${divEsc(s.divinity.notice)}${button('確認した','divNotice','','ghost small')}</div>`:''}
  <section class="card cooperation-rules"><h2>五権能との契約</h2><p>五人は最初から存在し、全員の基本権能を使用可能。戦闘に連れていけるのは2人まで。控えとの交代は1ターンを消費し、敵も行動する。</p>
   <p>装備して技を使い勝利すると協力率が上昇。第5階層・第15階層で専用試練を突破すると上限が広がる。好き嫌いと協力率は別物。</p>
   <h3>${canX?'全権委任X':'？？？？？'}</h3><p><strong>零域全解放</strong>：全5人が51%以上で使用可能。1戦闘1回、発動後の2行動のみ全能力3倍・5権能同時使用。協力率は消費しない。</p>
   <p class="small">${canX?'全権能が同調可能。戦闘中の発動条件を満たしている。':'協力率が50%を超えていない仲間がいるため、まだ発動できない。'}</p></section>
  <div class="section-head"><h2>五つの人格と協力率</h2><span>${DIV_IDS.filter(id=>s.divinity.cooperation[id]>50).length} / 5 同調</span></div>
  ${cooperationPowersView(s,button)}
  ${s.powers.star?`<section class="card"><h3>天星覇権 Lv.${s.powers.star}</h3><p>${POWERS.find(x=>x.id==='star').effect}</p>${button(s.equipped.includes('star')?'装備解除':'装備する','equipPower','star','primary')}</section>`:''}
  <section class="card div-final-gates"><h2>いれーなの神格</h2><p>神格 ${s.awakening}/5：${DIV_STAGES[s.awakening].name}</p><p>${DIV_STAGES[s.awakening].memory}</p>${button(s.awakening===5?'最終段階に到達':reason||'次の神格へ覚醒','divAwaken','','primary',!!reason)}
  ${['truth','infinite'].map(id=>{const why=divinityTrialReason(s,id);return `<div><h3>${DIV_TRIALS[id].name}</h3><p>${DIV_TRIALS[id].condition}</p>${button(why||'挑戦する','divTrial',id,'ghost',!!why)}</div>`;}).join('')}${button('共鳴を組み合わせる','openupgrade','resonance','ghost')}${button('本編の続きを進める','nav','battle','ghost')}${button('神域五神連戦','fight','god','ghost',!s.flags.ex)}</section>`;
}
