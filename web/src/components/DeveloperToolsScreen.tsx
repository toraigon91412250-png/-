import React, { useState } from 'react';
import { AbilityId, AbilityProgress, BATTLE_CHALLENGE_LEVELS, BattleChallengeLevel, BattleSetupConfig, OverallStats, RecruitmentProgress, IrenaSkillProgress } from '../types/game';
import { ABILITY_DEFINITIONS } from '../data/abilities';

interface DeveloperToolsScreenProps {
  abilityProgress: AbilityProgress;
  recruitmentProgress: RecruitmentProgress;
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
  onSetSkillProgress: (featherLevel: number, ruinLevel: number, shards: number) => void;
  onOpenRecruitment: () => void;
  onOpenBattleSetup: (config?: BattleSetupConfig) => void;
  onReset: () => void;
}

const ABILITY_LABELS: Record<AbilityId, string> = {
  ABYSS: '深淵',
  FALLEN: '堕天',
  BLACK_WING: '黒翼',
  FALLEN_KING: '堕天王',
  JUDGMENT: '断罪',
};

const makeConfig = (level: BattleChallengeLevel, abilityProgress: AbilityProgress, ids: AbilityId[]): BattleSetupConfig => ({
  kaiserLevel: level,
  abilities: ids.slice(0, 2).map(id => ({ id, level: Math.max(1, abilityProgress.levels[id]) })),
});

export const DeveloperToolsScreen: React.FC<DeveloperToolsScreenProps> = ({
  abilityProgress,
  recruitmentProgress,
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
  onSetSkillProgress,
  onOpenRecruitment,
  onOpenBattleSetup,
  onReset,
}) => {
  const [battleLevel, setBattleLevel] = useState<BattleChallengeLevel>(battleSetup.kaiserLevel);
  const [selectedIds, setSelectedIds] = useState<AbilityId[]>(
    battleSetup.abilities.map(ability => ability.id).slice(0, 2),
  );
  const [confirmReset, setConfirmReset] = useState(false);

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
    <div style={{
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
          <button type="button" onClick={onBack} style={{
            minHeight:40, padding:'0 13px', borderRadius:10, border:'1px solid #384154',
            background:'#171C27', color:'#FFF', fontWeight:850, cursor:'pointer',
          }}>閉じる</button>
        </header>

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
          marginTop:12, padding:14, borderRadius:16, border:'1px solid #4C4055',
          background:'rgba(22,17,28,.95)',
        }}>
          <div style={{ fontSize:11, fontWeight:950, color:'#D1C4E9' }}>🪽 権能テスト</div>
          <div style={{ marginTop:4, color:'#8F8798', fontSize:9 }}>各権能のLv・欠片を好きな状態へ。</div>
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
