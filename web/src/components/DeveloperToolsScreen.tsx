import React, { useState } from 'react';
import { AbilityId, AbilityProgress, BATTLE_CHALLENGE_LEVELS, BattleChallengeLevel, BattleSetupConfig, ImprintProgress, OverallStats, RaidRewardProgress, RecruitmentProgress, IrenaSkillProgress } from '../types/game';
import { ABILITY_DEFINITIONS } from '../data/abilities';
import { IMPRINT_DEFINITIONS } from '../data/imprints';
import { ACHIEVEMENTS, ABSOLUTE_AUTHORITY_NAME } from '../data/achievements';
import type { AchievementProgress } from '../utils/storage';

interface DeveloperToolsScreenProps {
  abilityProgress: AbilityProgress;
  recruitmentProgress: RecruitmentProgress;
  imprintProgress: ImprintProgress;
  raidRewardProgress: RaidRewardProgress;
  skillProgress: IrenaSkillProgress;
  overallStats: OverallStats;
  battleSetup: BattleSetupConfig;
  onBack: () => void;
  onRefresh: () => void;
  onSetAbility: (id: AbilityId, level: number, shards?: number) => void;
  onSetAllAbilities: (level: number, shards: number) => void;
  onAddAbilityShards: (id: AbilityId, amount: number) => void;
  onSetTickets: (tickets: number) => void;
  onAddTickets: (amount: number) => void;
  onSetImprintTickets: (tickets: number) => void;
  onAddImprintTickets: (amount: number) => void;
  onUnlockAllImprints: () => void;
  onSetSkillProgress: (featherLevel: number, ruinLevel: number, shards: number) => void;
  onUnlockSuperFallenShot: () => void;
  onOpenRecruitment: () => void;
  onOpenBattleSetup: (config?: BattleSetupConfig) => void;
  onOpenExKaiserChallenge: () => void;
  onUnlockAllGameFeatures: () => boolean;
  achievementProgress: AchievementProgress;
  onUnlockAllAchievements: () => boolean;
  onClaimAllAchievementRewards: () => { claimedCount: number; persisted: boolean };
  onReset: () => void;
}


const makeConfig = (level: BattleChallengeLevel, abilityProgress: AbilityProgress, ids: AbilityId[]): BattleSetupConfig => ({
  kaiserLevel: level,
  abilities: ids.slice(0, 2).map(id => ({ id, level: Math.max(1, abilityProgress.levels[id]) })),
});

export const DeveloperToolsScreen: React.FC<DeveloperToolsScreenProps> = ({
  abilityProgress,
  recruitmentProgress,
  imprintProgress,
  raidRewardProgress,
  skillProgress,
  overallStats,
  battleSetup,
  onBack,
  onRefresh,
  onSetAbility,
  onSetAllAbilities,
  onAddAbilityShards,
  onSetTickets,
  onAddTickets,
  onSetImprintTickets,
  onAddImprintTickets,
  onUnlockAllImprints,
  onSetSkillProgress,
  onUnlockSuperFallenShot,
  onOpenRecruitment,
  onOpenBattleSetup,
  onOpenExKaiserChallenge,
  onUnlockAllGameFeatures,
  achievementProgress,
  onUnlockAllAchievements,
  onClaimAllAchievementRewards,
  onReset,
}) => {
  const [battleLevel, setBattleLevel] = useState<BattleChallengeLevel>(battleSetup.kaiserLevel);
  const [selectedIds, setSelectedIds] = useState<AbilityId[]>(
    battleSetup.abilities.map(ability => ability.id).slice(0, 2),
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [fullUnlockResult, setFullUnlockResult] = useState<'success' | 'failure' | null>(null);
  const [achievementToolMessage, setAchievementToolMessage] = useState<string | null>(null);
  const ownedImprintCount = IMPRINT_DEFINITIONS.filter(imprint =>
    imprintProgress.unlockedIds.includes(imprint.id),
  ).length;

  const toggleAbility = (id: AbilityId) => {
    setSelectedIds(current => {
      if (current.includes(id)) return current.filter(value => value !== id);
      if (current.length >= 2) return current;
      return [...current, id];
    });
  };

  const startConfiguredBattle = () => {
    if (selectedIds.length !== 2) return;
    onOpenBattleSetup(makeConfig(battleLevel, abilityProgress, selectedIds));
  };

  return (
    <div className="developer-tools-screen" style={{
      width:'100%', height:'100%', overflowY:'auto', boxSizing:'border-box',
      padding:'18px 14px 40px', background:'linear-gradient(180deg,#080A10 0%,#11121A 100%)',
      color:'#FFF',
    }}>
      <div style={{ width:'100%', maxWidth:920, margin:'0 auto' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:14 }}>
          <div>
            <div style={{ fontSize:9, fontWeight:950, letterSpacing:'.22em', color:'#FFB74D' }}>DEVELOPER MODE</div>
            <h1 style={{ margin:'4px 0 0', fontSize:28, fontWeight:950 }}>開発者ツール</h1>
            <div style={{ marginTop:4, color:'#8B93A5', fontSize:10 }}>試作テスト用。設定を即時反映できます。</div>
          </div>
          <button type="button" className="mobile-bottom-return" onClick={onBack} style={{
            minHeight:40, padding:'0 13px', borderRadius:10, border:'1px solid #384154',
            background:'#171C27', color:'#FFF', fontWeight:850, cursor:'pointer',
          }}>閉じる</button>
        </header>

        <button type="button" onClick={() => setFullUnlockResult(onUnlockAllGameFeatures() ? 'success' : 'failure')} aria-label="このゲームの全機能を開放" style={{
          width:'100%', minHeight:56, marginBottom:fullUnlockResult ? 8 : 12, borderRadius:12,
          border:'1px solid #7DD3FC', background:'linear-gradient(135deg,#164E63,#10253D)',
          color:'#E0F2FE', fontSize:16, fontWeight:950, cursor:'pointer',
          boxShadow:'0 0 18px rgba(56,189,248,.18)',
        }}>全機能開放</button>
        {fullUnlockResult === 'success' ? (
          <div role="status" style={{ marginBottom:12, padding:'10px 12px', borderRadius:10, border:'1px solid #256D63', background:'#102823', color:'#A7F3D0', fontSize:11, lineHeight:1.6 }}>
            全機能を開放しました。閉じてホームに戻り、通常の戦闘開始からいれーなで出撃できます。
          </div>
        ) : fullUnlockResult === 'failure' ? (
          <div role="alert" style={{ marginBottom:12, padding:'10px 12px', borderRadius:10, border:'1px solid #7F3542', background:'#2A151B', color:'#FECACA', fontSize:11, lineHeight:1.6 }}>
            保存に失敗しました。ブラウザの保存設定を確認して、もう一度試してください。
          </div>
        ) : null}
        <section style={{
          marginBottom:12, padding:14, borderRadius:16, border:'1px solid rgba(196,181,253,.4)',
          background:'linear-gradient(145deg,rgba(38,27,70,.92),rgba(15,20,35,.96))',
        }}>
          <div style={{ fontSize:11, fontWeight:950, color:'#D8C9FF' }}>🏆 実績・最上位権能テスト</div>
          <div style={{ marginTop:5, color:'#AAB5CC', fontSize:10, lineHeight:1.6 }}>
            達成条件の同期、報酬の一度きり受取、全達成報酬の検証に使用します。通常プレイの実績報酬を自動では回収しません。
          </div>
          <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:8 }}>
            <span style={{ padding:'6px 9px', borderRadius:8, border:'1px solid #514677', background:'#191a31', color:'#E1D6FF', fontSize:10 }}>
              達成 {achievementProgress.unlockedIds.length}/{ACHIEVEMENTS.length}
            </span>
            <span style={{ padding:'6px 9px', borderRadius:8, border:'1px solid #514677', background:'#191a31', color:achievementProgress.absoluteAuthorityUnlocked ? '#FFE4A5' : '#AAB5CC', fontSize:10 }}>
              {ABSOLUTE_AUTHORITY_NAME}: {achievementProgress.absoluteAuthorityUnlocked ? '解放済み' : '未解放'}
            </span>
            <span style={{ padding:'6px 9px', borderRadius:8, border:'1px solid #514677', background:'#191a31', color:'#B6EBD6', fontSize:10 }}>
              報酬受取 {achievementProgress.claimedIds.length}/{ACHIEVEMENTS.length}
            </span>
          </div>
          <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:8 }}>
            <button type="button" onClick={() => {
              const success = onUnlockAllAchievements();
              setAchievementToolMessage(success
                ? '全実績を達成済みにし、全理支配を解放しました。報酬通貨はまだ付与していません。'
                : '実績状態の保存に失敗しました。');
              onRefresh();
            }} style={{
              minHeight:42, padding:'8px 10px', borderRadius:9, border:'1px solid #8B78D8',
              background:'#28234A', color:'#F1EAFE', fontWeight:900, fontSize:11, cursor:'pointer',
            }}>実績を全達成・全理支配を解放</button>
            <button type="button" onClick={() => {
              const result = onClaimAllAchievementRewards();
              setAchievementToolMessage(result.persisted
                ? `未受取の実績報酬を${result.claimedCount}件回収しました。`
                : `一部保存に失敗しました。今回回収できたのは${result.claimedCount}件です。`);
              onRefresh();
            }} style={{
              minHeight:42, padding:'8px 10px', borderRadius:9, border:'1px solid #568D78',
              background:'#16352E', color:'#C9F7E4', fontWeight:900, fontSize:11, cursor:'pointer',
            }}>達成済みの実績報酬を全回収</button>
            <button type="button" onClick={() => {
              onRefresh();
              setAchievementToolMessage('保存済みの実績条件を再計算しました。');
            }} style={{
              minHeight:42, padding:'8px 10px', borderRadius:9, border:'1px solid #394A66',
              background:'#172234', color:'#D3E2FF', fontWeight:900, fontSize:11, cursor:'pointer',
            }}>実績状態を再計算</button>
          </div>
          {achievementToolMessage && (
            <div role="status" style={{ marginTop:10, padding:'9px 10px', borderRadius:8, background:'rgba(7,10,20,.68)', color:'#D8DDED', fontSize:10, lineHeight:1.6 }}>
              {achievementToolMessage}
            </div>
          )}
        </section>
        <section style={{
          padding:14, borderRadius:16, border:'1px solid #3B455A',
          background:'rgba(19,24,35,.95)',
        }}>
          <div style={{ fontSize:11, fontWeight:950, color:'#FFD180' }}>⚔️ 対戦テスト</div>
          <div style={{ marginTop:4, color:'#8E97A8', fontSize:9 }}>カイザーLvと権能2つを決めて、そのままバトル準備へ。</div>

          <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'repeat(5,minmax(0,1fr))', gap:7 }}>
            {BATTLE_CHALLENGE_LEVELS.map(level => (
              <button key={level} type="button" onClick={() => setBattleLevel(level)} style={{
                minHeight:44, borderRadius:9,
                border:battleLevel===level ? '1.5px solid #FFD54F' : '1px solid #39445A',
                background:battleLevel===level ? '#3A2D12' : '#181E2A',
                color:battleLevel===level ? '#FFF3C4' : '#CCD2DE',
                fontWeight:900, fontSize:12, cursor:'pointer',
              }}>Lv.{level}</button>
            ))}
          </div>

          <div style={{ marginTop:12, display:'grid', gap:7 }}>
            {ABILITY_DEFINITIONS.map(ability => {
              const id=ability.id;
              const selected=selectedIds.includes(id);
              return (
                <button key={id} type="button" onClick={() => toggleAbility(id)} style={{
                  width:'100%', minHeight:58, borderRadius:10, padding:'8px 10px',
                  border:selected ? '1.5px solid #CE93D8' : '1px solid #333A4A',
                  background:selected ? 'linear-gradient(135deg,#32203E,#1D1724)' : '#151A24',
                  color:'#FFF', display:'flex', alignItems:'center', gap:9, textAlign:'left',
                  cursor:'pointer', opacity:(!selected && selectedIds.length>=2) ? .42 : 1,
                }}>
                  <span style={{ fontSize:21 }}>{ability.symbol}</span>
                  <span style={{ flex:1 }}>
                    <span style={{ display:'block', fontWeight:950, fontSize:13 }}>
                      {ability.name} <span style={{ color:'#FFD54F', fontSize:9 }}>Lv.{abilityProgress.levels[id]}</span>
                    </span>
                    <span style={{ display:'block', marginTop:2, color:'#8C95A5', fontSize:9 }}>{ability.shortDescription}</span>
                  </span>
                  <span style={{
                    minWidth:42, textAlign:'center', padding:'5px 7px', borderRadius:7,
                    background:selected ? '#6A1B7A' : '#202631', color:selected ? '#FFF' : '#788293',
                    fontWeight:950, fontSize:9,
                  }}>{selected ? '選択' : '未選択'}</span>
                </button>
              );
            })}
          </div>

          <button type="button" disabled={selectedIds.length!==2} onClick={startConfiguredBattle} style={{
            width:'100%', minHeight:52, marginTop:11, borderRadius:11,
            border:selectedIds.length===2 ? '1px solid #FFB74D' : '1px solid #333A4A',
            background:selectedIds.length===2 ? 'linear-gradient(135deg,#E65100,#A62D00)' : '#161B24',
            color:selectedIds.length===2 ? '#FFF' : '#666F7E',
            fontSize:15, fontWeight:950, cursor:selectedIds.length===2 ? 'pointer' : 'not-allowed',
          }}>この設定でバトル準備へ</button>
          <div style={{ marginTop:10, color:'#9BA6B8', fontSize:9, lineHeight:1.5 }}>
            通常の解放条件を確認せず、EXカイザー専用のLv.100戦闘準備を直接開く。
          </div>
          <button type="button" onClick={onOpenExKaiserChallenge} style={{
            width:'100%', minHeight:48, marginTop:6, borderRadius:11,
            border:'1px solid #B85D75', background:'linear-gradient(135deg,#551B37,#2C1424)',
            color:'#FFDCE7', fontSize:13, fontWeight:950, cursor:'pointer',
          }}>EXカイザーに挑む（開発用）</button>
        </section>

        <section style={{
          marginTop:12, padding:14, borderRadius:16, border:'1px solid #473D2D',
          background:'rgba(25,22,16,.95)',
        }}>
          <div style={{ fontSize:11, fontWeight:950, color:'#FFE082' }}>🎰 召喚テスト</div>
          <div style={{ marginTop:4, color:'#8F8C84', fontSize:9 }}>召喚札を増やして、通常の召喚画面から演出と排出を確認。</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7, marginTop:10 }}>
            {[10,100,999].map(amount => (
              <button key={amount} type="button" onClick={() => { onAddTickets(amount); onRefresh(); }} style={{
                minHeight:40, borderRadius:9, border:'1px solid #5B4A2C', background:'#231E14',
                color:'#FFE082', fontSize:10, fontWeight:950, cursor:'pointer',
              }}>札 +{amount}</button>
            ))}
            <button type="button" onClick={() => { onSetTickets(9999); onRefresh(); }} style={{
              minHeight:40, borderRadius:9, border:'1px solid #7A5E28', background:'#332613',
              color:'#FFF0B5', fontSize:10, fontWeight:950, cursor:'pointer',
            }}>札 9999</button>
          </div>
          <button type="button" onClick={onOpenRecruitment} style={{
            width:'100%', minHeight:44, marginTop:8, borderRadius:9, border:'1px solid #7B5A28',
            background:'#2B2111', color:'#FFE082', fontWeight:950, cursor:'pointer',
          }}>召喚画面を開く（今の札 {recruitmentProgress.tickets}）</button>
        </section>

        <section style={{
          marginTop:12, padding:14, borderRadius:16, border:'1px solid #51416F',
          background:'rgba(25,18,39,.96)',
        }}>
          <div style={{ fontSize:11, fontWeight:950, color:'#DCCBFF' }}>✦ 刻印テスト</div>
          <div style={{ marginTop:4, color:'#A59AB9', fontSize:9 }}>
            刻印ガチャ専用チケットの追加と、現在登録済みの刻印7種の一括解放。
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
            <div style={{ padding:10, borderRadius:9, border:'1px solid #3B3150', background:'#171221' }}>
              <div style={{ color:'#A99CC4', fontSize:9, fontWeight:850 }}>刻印ガチャチケット</div>
              <div aria-label={`刻印ガチャチケットの所持数 ${raidRewardProgress.imprintTickets}`} style={{ marginTop:3, color:'#F1E9FF', fontSize:23, fontWeight:950 }}>
                {raidRewardProgress.imprintTickets}
              </div>
            </div>
            <div style={{ padding:10, borderRadius:9, border:'1px solid #3B3150', background:'#171221' }}>
              <div style={{ color:'#A99CC4', fontSize:9, fontWeight:850 }}>刻印の解放状況</div>
              <div aria-label={`解放済み刻印 ${ownedImprintCount} / ${IMPRINT_DEFINITIONS.length}`} style={{ marginTop:3, color:'#F1E9FF', fontSize:23, fontWeight:950 }}>
                {ownedImprintCount}<span style={{ color:'#A99CC4', fontSize:12 }}> / {IMPRINT_DEFINITIONS.length}</span>
              </div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:7, marginTop:9 }}>
            {[1,10,100,999].map(amount => (
              <button key={amount} type="button" aria-label={`刻印ガチャチケットを${amount}枚追加`} onClick={() => { onAddImprintTickets(amount); onRefresh(); }} style={{
                minHeight:40, borderRadius:9, border:'1px solid #625080', background:'#211832',
                color:'#E2D5FF', fontSize:10, fontWeight:950, cursor:'pointer',
              }}>券 +{amount}</button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginTop:7 }}>
            <button type="button" aria-label="刻印ガチャチケットを9999枚に設定" onClick={() => { onSetImprintTickets(9999); onRefresh(); }} style={{
              minHeight:42, borderRadius:9, border:'1px solid #8565A8', background:'#2A1D3C',
              color:'#F0E5FF', fontSize:10, fontWeight:950, cursor:'pointer',
            }}>券 9999</button>
            <button type="button" aria-label="登録済みの刻印をすべて解放" onClick={() => { onUnlockAllImprints(); onRefresh(); }} style={{
              minHeight:42, borderRadius:9, border:'1px solid #5A8F8A', background:'#142B2C',
              color:'#C1FFF3', fontSize:10, fontWeight:950, cursor:'pointer',
            }}>刻印 全解放（{IMPRINT_DEFINITIONS.length}種）</button>
          </div>
        </section>

        <section style={{
          marginTop:12, padding:14, borderRadius:16, border:'1px solid #4C4055',
          background:'rgba(22,17,28,.95)',
        }}>
          <div style={{ fontSize:11, fontWeight:950, color:'#D1C4E9' }}>🪽 権能テスト</div>
          <div style={{ marginTop:4, color:'#8F8798', fontSize:9 }}>
            各権能のLv・欠片を好きな状態へ。既存スキル: 羽弾Lv.{skillProgress.featherLevel} / 必殺Lv.{skillProgress.ruinLevel}
          </div>
          <div style={{ display:'grid', gap:8, marginTop:10 }}>
            {ABILITY_DEFINITIONS.map(ability => {
              const level=abilityProgress.levels[ability.id];
              const shards=abilityProgress.shards[ability.id];
              return (
                <div key={ability.id} style={{
                  display:'grid', gridTemplateColumns:'1fr auto', gap:8, alignItems:'center',
                  padding:'9px', borderRadius:10, background:'#17121E', border:'1px solid #2F2637',
                }}>
                  <div>
                    <div style={{ fontWeight:950, fontSize:12 }}>{ability.symbol} {ability.name} <span style={{ color:'#FFE082' }}>Lv.{level}</span></div>
                    <div style={{ marginTop:3, color:'#8F8798', fontSize:8 }}>欠片 {shards}</div>
                  </div>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'flex-end' }}>
                    {[0,1,2,3,4,5].map(nextLevel => (
                      <button key={nextLevel} type="button" onClick={() => { onSetAbility(ability.id,nextLevel); onRefresh(); }} style={{
                        width:28, height:28, borderRadius:7,
                        border:level===nextLevel ? '1px solid #FFE082' : '1px solid #37313E',
                        background:level===nextLevel ? '#514019' : '#1C1821',
                        color:level===nextLevel ? '#FFF0B2' : '#7E7885',
                        fontSize:9, fontWeight:950, cursor:'pointer',
                      }}>L{nextLevel}</button>
                    ))}
                    <button type="button" onClick={() => { onAddAbilityShards(ability.id,1000); onRefresh(); }} style={{
                      height:28, padding:'0 7px', borderRadius:7, border:'1px solid #4A3C54',
                      background:'#241B2C', color:'#D1C4E9', fontSize:8, fontWeight:950, cursor:'pointer',
                    }}>+1000</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7, marginTop:10 }}>
            <button type="button" onClick={() => { onSetAllAbilities(5,0); onRefresh(); }} style={{
              minHeight:40, borderRadius:9, border:'1px solid #6A4D73', background:'#2A1A31',
              color:'#E8D4ED', fontWeight:950, fontSize:9, cursor:'pointer',
            }}>全権能 Lv5</button>
            <button type="button" onClick={() => { onSetAllAbilities(5,9999); onRefresh(); }} style={{
              minHeight:40, borderRadius:9, border:'1px solid #8C6A2B', background:'#342914',
              color:'#FFE9A8', fontWeight:950, fontSize:9, cursor:'pointer',
            }}>全権能 Lv5 + 欠片9999</button>
            <button type="button" onClick={() => { onSetAllAbilities(0,9999); onRefresh(); }} style={{
              minHeight:40, borderRadius:9, border:'1px solid #4D4653', background:'#1C1920',
              color:'#C1BAC8', fontWeight:950, fontSize:9, cursor:'pointer',
            }}>全権能 未解放</button>
          </div>
        </section>

        <section style={{
          marginTop:12, padding:14, borderRadius:16, border:'1px solid #394C5A',
          background:'rgba(16,24,31,.95)',
        }}>
          <div style={{ fontSize:11, fontWeight:950, color:'#B3E5FC' }}>📈 既存スキル・戦績テスト</div>
          <div style={{ marginTop:4, color:'#84929B', fontSize:9 }}>権能とは別の既存育成も一瞬で変更。</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7, marginTop:10 }}>
            <button type="button" onClick={() => { onSetSkillProgress(1,1,0); onRefresh(); }} style={{ minHeight:40, borderRadius:9, border:'1px solid #32424D', background:'#152027', color:'#A8D5E7', fontSize:9, fontWeight:900, cursor:'pointer' }}>スキル初期</button>
            <button type="button" onClick={() => { onSetSkillProgress(5,5,9999); onRefresh(); }} style={{ minHeight:40, borderRadius:9, border:'1px solid #426071', background:'#1B2D36', color:'#B8E7F7', fontSize:9, fontWeight:900, cursor:'pointer' }}>両スキルLv5</button>
            <button type="button" onClick={() => { onSetSkillProgress(10,10,9999); onRefresh(); }} style={{ minHeight:40, borderRadius:9, border:'1px solid #587688', background:'#21333C', color:'#D8F3FF', fontSize:9, fontWeight:900, cursor:'pointer' }}>両スキルMAX</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', gap:8, marginTop:10, padding:'9px 10px', borderRadius:9, background:'#0E151A', border:'1px solid #293740' }}>
            <div>
              <div style={{ color:'#CBEAFF', fontSize:11, fontWeight:950 }}>超堕天撃</div>
              <div style={{ marginTop:3, color:'#7C8A93', fontSize:9 }}>解放状態: {skillProgress.superFallenShotUnlocked ? '解放済み' : '未解放'}</div>
            </div>
            <button type="button" disabled={Boolean(skillProgress.superFallenShotUnlocked)} onClick={() => { onUnlockSuperFallenShot(); onRefresh(); }} style={{
              minHeight:38, padding:'0 12px', borderRadius:8,
              border:skillProgress.superFallenShotUnlocked ? '1px solid #42655E' : '1px solid #4B8EB5',
              background:skillProgress.superFallenShotUnlocked ? '#172824' : '#102A3A',
              color:skillProgress.superFallenShotUnlocked ? '#8FC3B5' : '#C7EEFF',
              fontSize:10, fontWeight:950, cursor:skillProgress.superFallenShotUnlocked ? 'default' : 'pointer',
            }}>{skillProgress.superFallenShotUnlocked ? '解放済み' : '超堕天撃を解放'}</button>
          </div>
          <div style={{ marginTop:10, padding:'9px 10px', borderRadius:9, background:'#0E151A', border:'1px solid #293740', color:'#7C8A93', fontSize:9 }}>
            戦績: {overallStats.totalBattles}戦 / {overallStats.wins}勝 / {overallStats.losses}敗
          </div>
        </section>

        <section style={{
          marginTop:12, padding:14, borderRadius:16, border:'1px solid #512F36',
          background:'rgba(28,15,19,.96)',
        }}>
          <div style={{ fontSize:11, fontWeight:950, color:'#FFAB91' }}>🧨 データリセット</div>
          <div style={{ marginTop:4, color:'#9A7C80', fontSize:9 }}>召喚・権能・既存スキル・戦績を試作初期値へ戻す。</div>
          {!confirmReset ? (
            <button type="button" onClick={() => setConfirmReset(true)} style={{
              width:'100%', minHeight:42, marginTop:9, borderRadius:9,
              border:'1px solid #68353C', background:'#271419', color:'#FFAB91',
              fontWeight:950, cursor:'pointer',
            }}>リセットする</button>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginTop:9 }}>
              <button type="button" onClick={() => { onReset(); setConfirmReset(false); onRefresh(); }} style={{
                minHeight:42, borderRadius:9, border:'1px solid #A94452', background:'#3A141D', color:'#FFCDD2', fontWeight:950, cursor:'pointer',
              }}>本当にリセット</button>
              <button type="button" onClick={() => setConfirmReset(false)} style={{
                minHeight:42, borderRadius:9, border:'1px solid #37404D', background:'#171C25', color:'#C9D0DB', fontWeight:950, cursor:'pointer',
              }}>キャンセル</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
