from pathlib import Path
import shutil
root=Path('.').resolve();asset=root/'assets/raid';asset.mkdir(exist_ok=True)
for name,target in [('黒炎を纏う熔岩竜の咆哮.png','dragon-roar.png'),('黒炎を纏う熾烈な魔竜.png','dragon-embers.png')]:shutil.copy2(root.parent/'supplied-raid'/name,asset/target)
p=Path('web/src/components/App.js');s=p.read_text();s="import {startGuardBreakTrial,actGuardBreakTrial,retryGuardBreakTrial} from '../utils/guardBreakTrial.js';\n"+s
s=s.replace("const ENEMIES=", "const RAID_ART={portrait:'assets/raid/dragon-roar.png',trial:'assets/raid/dragon-embers.png'};\nconst ENEMIES=")
s=s.replace("page==='raid'?raidView(a):", "page==='raid'?raidView(a):page==='finale'?finaleView(a):")
s=s.replace("title:'ステラ最終決戦をクリアする'", "title:'ステラでEXカイザーの境界を越える'")
s=s.replace("title:'いれーな最終決戦をクリアする'", "title:'専用いれーなでEXカイザーと決着する'")
old="""{title:'ステラ最終決戦',desc:'不滅と再誕。星を越える戦い',icon:'star',action:'fight',id:'stella',tone:'blue',art:HOME_ART.stella,unlocked:a.flags.stella,condition:'Lv.100撃破後、境界を越える'},
 {title:'EX カイザー',desc:'三形態の終焉。最強の敵に挑む',icon:'crown',action:'fight',id:'ex',tone:'rose',art:HOME_ART.kaiser,unlocked:a.flags.stella,condition:'ステラ解放後に挑戦可能'}"""
assert old in s;s=s.replace(old,"{title:'最終決戦',desc:'EXカイザーとの決戦。いれーなとステラの戦いへ',icon:'crown',action:'nav',id:'finale',tone:'rose',art:HOME_ART.kaiser}")
old="${homeCard({title:'いれーな最終決戦',desc:'神化か、堕天か。新たな力の選択',icon:'star',action:'fight',id:'final',tone:'rose',unlocked:a.flags.final,condition:'ステラ最終決戦クリアで解放'})}"
assert old in s;s=s.replace(old,'')
pos=s.index('function homeHubCard(')
s=s[:pos]+'''const FINAL_CHAPTERS=[
 {id:'ex',title:'EXカイザー戦',detail:'いれーなで挑む三形態の決戦。',gate:'stella',clear:'ex',condition:'通常Lv.100撃破後、「？？？？？」から境界を越える'},
 {id:'stella',title:'ステラ戦 ― 星の境界',detail:'不滅と再誕でEXカイザーに挑む。クリアで専用いれーなが解放。',gate:'stella',clear:'stellaClear',condition:'通常Lv.100撃破後、「？？？？？」から境界を越える'},
 {id:'final',title:'専用いれーな最終決戦',detail:'神化・堕天の力で、EXカイザーとの決着へ。',gate:'final',clear:'finalClear',condition:'ステラ戦クリアで専用いれーなを解放'}
];
function finaleView(a){return `${heading('最終決戦','この戦いの中心に立つのは、EXカイザー。','FINAL BATTLE / EX KAISER')}<section class="card finale-intro"><img src="${ENEMIES.ex}" alt="最終決戦の敵 EXカイザー"><div><span class="tag">EX KAISER</span><h2>境界を越えた、その先へ</h2><p>いれーな、ステラ、そして失われた力を取り戻したいれーな。<br>それぞれの戦いを選び、EXカイザーに挑む。</p><p class="small">EXカイザー戦とステラ戦は、境界を越えると同時に解放。ステラ戦のクリアで専用いれーな最終決戦へ進めます。</p>${a.flags.lv100&&!a.flags.warp?button('？？？？？ ― 境界を越える','warp','','primary'):''}</div></section><div class="grid triple finale-chapters">${FINAL_CHAPTERS.map(c=>`<section class="card modecard" data-final-chapter="${c.id}"><span class="tag">${a.flags[c.clear]?'CLEAR':a.flags[c.gate]?'UNLOCKED':'SEALED'}</span><h2>${c.title}</h2><p>${a.flags[c.gate]?c.detail:c.condition}</p>${button(a.flags[c.gate]?'挑戦する →':'未解放','fight',c.id,'primary',!a.flags[c.gate])}</section>`).join('')}</div><div class="row">${button('聖域に戻る','nav','home','ghost')}${button('通常カイザーへ','nav','battle','ghost')}</div>`;}
function enemyLabel(b){return !b.trial&&!b.campaign&&['ex','stella','final'].includes(b.mode)?'EXカイザー':b.enemy.name;}
function enemyImage(b){return b.mode==='raid'?RAID_ART[b.trial?.kind==='guard-break'?'trial':'portrait']:['ex','stella','final'].includes(b.mode)?ENEMIES.ex:ENEMIES[b.mode];}
''' +s[pos:]
s=s.replace("'階層の進行から離れ、深淵の守護者に挑む。'", "'階層の進行から離れ、竜の姿をした深淵の守護者に挑む。'")
s=s.replace('<section class="card raid-intro"><span', '<section class="card raid-intro"><img class="raid-boss-keyart" src="${RAID_ART.portrait}" alt="深淵の守護者：提供された魔竜の立ち絵"><span')
old="${modeCard('♛','EX カイザー','全基礎能力2倍の三形態','ex',a.flags.stella,'ステラ解放後')}${modeCard('✧','ステラ最終決戦','終焉のカイザー HP30,000','stella',a.flags.stella,'ステラ解放後')}${modeCard('✺','いれーな最終決戦','神化・堕天の選択','final',a.flags.final,'ステラ最終決戦クリア')}"
new='<section class="card modecard"><span class="tag">FINAL BATTLE</span><h3>最終決戦</h3><p>EXカイザー戦・ステラ戦・専用いれーな最終決戦</p>${button(\'最終決戦を開く →\',\'nav\',\'finale\',\'ghost\')}</section>'
assert old in s;s=s.replace(old,new)
s=s.replace('const src=ENEMIES[b.mode];if(src)return', 'const src=enemyImage(b);if(src)return')
s=s.replace("alt=\"${b.mode==='ex'?'EXカイザー':'通常カイザー'}のユーザー提供立ち絵\"", 'alt="${esc(enemyLabel(b))}のユーザー提供立ち絵"')
s=s.replace("stella:'ステラ最終決戦',final:'いれーな最終決戦'", "stella:'最終決戦・ステラ戦 / EXカイザー',final:'最終決戦・専用いれーな / EXカイザー'")
s=s.replace('<h3>${b.enemy.name}</h3>', '<h3>${esc(enemyLabel(b))}</h3>')
s=s.replace("${ENEMIES[b.mode]?'supplied-enemy':''}", "${b.mode==='raid'?'raid-enemy':enemyImage(b)?'supplied-enemy':''}")
s=s.replace("${b.trial?`<small class=\"actual-enemy-state\">", "${b.trial?.kind==='guard-break'?`<small class=\"actual-enemy-state\">${b.enemy.statuses.guardBreakArmor?'熾炎の鎧':''}</small>`:''}${b.trial?.kind==='three-phase'?`<small class=\"actual-enemy-state\">")
s=s.replace("trialFocus:'蓄勢',campaignFocus:'蓄勢'", "trialFocus:'蓄勢',guardBreakFocus:'蓄勢',campaignFocus:'蓄勢'")
s=s.replace('<option value="three-phase">EXカイザー・三相決戦【試作】</option>', '<option value="three-phase">EXカイザー・三相決戦【試作】</option><option value="guard-break">熾竜・崩鎧試練【試作】</option>')
s=s.replace('数値は実験用です。</p>', '崩鎧試練は固定育成・刻印なしで開始。破壊の権能／必殺の命中で竜の鎧を解除、防御でHP8%回復と次の斬撃／権能の攻撃力3倍を獲得。鎧は実際の被弾3回で再形成されます。羽弾だけでは鎧を崩せません。数値は実験用です。</p>')
s=s.replace("else if(b.trial)actThreePhase", "else if(b.trial?.kind==='guard-break')actGuardBreakTrial(b,id,{route});else if(b.trial)actThreePhase")
s=s.replace("if(b.trial&&!b.result&&b.enemy.phase>previousPhase)", "if(b.trial?.kind==='three-phase'&&!b.result&&b.enemy.phase>previousPhase)")
s=s.replace("if(old.trial){battle=retryThreePhase(old)","if(old.trial){battle=old.trial.kind==='guard-break'?retryGuardBreakTrial(old):retryThreePhase(old)")
s=s.replace("if(mode==='three-phase')battle=", "if(mode==='guard-break')battle=startGuardBreakTrial(s,{atk,hp});else if(mode==='three-phase')battle=")
s=s.replace("button('すべて開く','summonAll','','ghost')", "button('スキップ','summonAll','','ghost summon-skip-result')")
s=s.replace('<button id="skipCinema" type="button">スキップ</button>`;', '${type===\'summon\'?\'<button id="skipCinema" type="button">スキップ</button>\':\'\'}`;',1)
s=s.replace(" $('#skipCinema').onclick=finish;$('#skipCinema').focus({preventScroll:true});", " if(type==='summon'){$('#skipCinema').onclick=finish;$('#skipCinema').focus({preventScroll:true});}",1)
s=s.replace('// Skip commits once immediately. None of these animations change combat calculations.', '// Natural completion commits exactly once. These animations never change combat calculations.')
s=s.replace('<div class="alignment-title">${title}</div><button id="skipCinema" type="button">スキップ</button>', '<div class="alignment-title">${title}</div>')
s=s.replace(" $('#skipCinema').onclick=finish;$('#skipCinema').focus?.({preventScroll:true});\n",'')
s=s.replace('...Object.values(ENEMIES),', '...Object.values(ENEMIES),...Object.values(RAID_ART),')
p.write_text(s)
p=Path('web/src/components/game.css');s=p.read_text();s=s.replace('#cinema.alignment #skipCinema{z-index:5;bottom:7%}\n','');s=s.replace('#cinema.summon-cinema #skipCinema{z-index:4;min-height:48px;min-width:110px;bottom:calc(24px + env(safe-area-inset-bottom))}', '#cinema.summon-cinema #skipCinema{position:fixed;z-index:4;top:calc(14px + env(safe-area-inset-top));right:calc(14px + env(safe-area-inset-right));bottom:auto;left:auto;min-height:48px;min-width:110px;font-family:var(--serif);font-size:16px;letter-spacing:.1em;border:1px solid #b99b6a99;background:#15111fe8;color:#efdab4;border-radius:8px;box-shadow:0 3px 16px #0008}')
s+='''
/* audit4: scoped final-battle hub, raid artwork, and summon-only skip control. */
.finale-intro{display:grid;grid-template-columns:minmax(100px,220px) minmax(0,1fr);gap:20px;align-items:center;margin-bottom:20px}
.finale-intro>img{width:100%;height:260px;object-fit:contain;border-radius:10px;background:#16111f}
.finale-intro h2{margin:8px 0}.finale-intro p{margin:12px 0}.finale-chapters h2{font-size:21px}.finale-chapters{margin-bottom:20px}.finale-chapters p{font-size:14px}
.raid-boss-keyart{display:block;width:100%;max-height:320px;object-fit:contain;object-position:center;margin-bottom:18px}
.raid-enemy .enemy-portrait{object-fit:contain;object-position:center;mix-blend-mode:normal;filter:drop-shadow(0 0 12px #ce38344d)}
.summon-dialog{position:relative}.summon-dialog #modal-title{padding-right:118px;min-height:48px;font-size:20px}
.summon-dialog .summon-skip-result{position:absolute;top:16px;right:16px;min-width:104px;min-height:48px;font-family:var(--serif);font-size:16px;letter-spacing:.08em;color:#efdab4;background:#15111ff2;border-color:#b99b6a99}
@media(max-width:600px){.finale-intro{grid-template-columns:1fr;gap:12px}.finale-intro>img{height:220px}.finale-chapters{grid-template-columns:minmax(0,1fr)}.finale-intro p{font-size:14px}.raid-boss-keyart{max-height:230px}}
''';p.write_text(s)
p=Path('tools/build.mjs');s=p.read_text().replace("'web/src/utils/threePhase.js',", "'web/src/utils/threePhase.js','web/src/utils/guardBreakTrial.js',");p.write_text(s)
