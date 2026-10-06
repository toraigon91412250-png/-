import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Award, Crown, Feather, Gift, Sparkles, Ticket, Zap } from 'lucide-react';
import {
  RECRUITMENT_REWARDS,
  RecruitmentDraw,
  RecruitmentRewardDef,
} from '../data/recruitment';
import { AbilityId, AbilityProgress, RecruitmentProgress } from '../types/game';
import { ABILITY_DEFINITIONS } from '../data/abilities';

interface Props {
  progress: RecruitmentProgress;
  abilityProgress: AbilityProgress;
  onRecruit: (count: 1 | 10) => RecruitmentDraw[] | null;
  onUpgradeAbility: (abilityId: AbilityId) => void;
  onBack: () => void;
}

type SummonPhase = 'IDLE' | 'SUMMONING' | 'RESULT';
type SummonStep = 'BLACKOUT' | 'GATE' | 'GATE_OPEN' | 'PRESENCE' | 'OMEN' | 'WINGS_FLASH' | 'REVEAL';

const RECRUITMENT_ASSETS = {
  gate: `${import.meta.env.BASE_URL}assets/recruitment/開く直前の門.jpg`,
  redEyes: `${import.meta.env.BASE_URL}assets/recruitment/1791110297970.jpg`,
  wingFrame: `${import.meta.env.BASE_URL}assets/recruitment/1791110298431.jpg`,
  irena: `${import.meta.env.BASE_URL}assets/recruitment/1791110298566.jpg`,
  wingedOmen: `${import.meta.env.BASE_URL}assets/recruitment/1791110298323.jpg`,
} as const;

const getRewardKindLabel = (reward: RecruitmentRewardDef): string => {
  if (reward.kind === 'SKILL_SHARD') return '技強化の欠片';
  if (reward.kind === 'ABILITY_SHARD') return '権能の欠片';
  if (reward.kind === 'ABILITY_CORE') return '権能本体';
  return '特殊技';
};

const getShardLabel = (reward: RecruitmentRewardDef): string => {
  if (reward.kind === 'SKILL_SHARD') return '技強化の欠片';
  if (reward.kind === 'SPECIAL_SKILL') return '技強化の欠片';
  const abilityNames: Record<string, string> = {
    ABYSS: '深淵',
    FALLEN: '堕天',
    BLACK_WING: '黒翼',
    FALLEN_KING: '堕天王',
    JUDGMENT: '断罪',
  };
  return reward.abilityId ? `${abilityNames[reward.abilityId] ?? '権能'}の欠片` : '欠片';
};

const rarityMeta: Record<RecruitmentRewardDef['rarity'], {
  label: string;
  icon: React.ReactNode;
  border: string;
  glow: string;
  accent: string;
}> = {
  R: {
    label: '技強化の欠片',
    icon: <Feather size={21} />,
    border: 'rgba(144,202,249,.62)',
    glow: 'rgba(66,165,245,.23)',
    accent: '#90CAF9',
  },
  SR: {
    label: '権能の欠片',
    icon: <Sparkles size={22} />,
    border: 'rgba(206,147,216,.72)',
    glow: 'rgba(171,71,188,.30)',
    accent: '#CE93D8',
  },
  SSR: {
    label: '権能本体',
    icon: <Crown size={24} />,
    border: 'rgba(255,213,79,.86)',
    glow: 'rgba(255,193,7,.34)',
    accent: '#FFD54F',
  },
  UR: {
    label: 'UR・特殊技',
    icon: <Zap size={26} />,
    border: 'rgba(224,242,241,.95)',
    glow: 'rgba(38,166,154,.38)',
    accent: '#E0F2F1',
  },
};


export const RecruitmentScreen: React.FC<Props> = ({ progress, abilityProgress, onRecruit, onUpgradeAbility, onBack }) => {
  const [phase, setPhase] = useState<SummonPhase>('IDLE');
  const [summonStep, setSummonStep] = useState<SummonStep>('BLACKOUT');
  const [lastResults, setLastResults] = useState<RecruitmentDraw[]>([]);
  const lastResult = lastResults[lastResults.length - 1] ?? null;
  const timersRef = useRef<number[]>([]);

  const collectedCount = progress.collectedIds.filter(id =>
    RECRUITMENT_REWARDS.some(reward => reward.id === id),
  ).length;
  const collectionComplete = collectedCount >= RECRUITMENT_REWARDS.length;
  const selectedMeta = lastResult ? rarityMeta[lastResult.reward.rarity] : null;

  const collectionItems = useMemo(
    () => RECRUITMENT_REWARDS.map(reward => ({
      reward,
      collected: progress.collectedIds.includes(reward.id),
    })),
    [progress.collectedIds],
  );

  useEffect(() => () => {
    timersRef.current.forEach(timer => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const handleRecruit = (count: 1 | 10) => {
    if (phase !== 'IDLE' || progress.tickets < count) return;

    timersRef.current.forEach(timer => window.clearTimeout(timer));
    timersRef.current = [];
    setLastResults([]);
    setSummonStep('BLACKOUT');
    setPhase('SUMMONING');

    const schedule = (delay: number, callback: () => void) => {
      const timer = window.setTimeout(callback, delay);
      timersRef.current.push(timer);
    };

    schedule(180, () => setSummonStep('GATE'));
    schedule(820, () => setSummonStep('GATE_OPEN'));
    schedule(1280, () => setSummonStep('PRESENCE'));
    schedule(1880, () => setSummonStep('OMEN'));
    schedule(2380, () => setSummonStep('WINGS_FLASH'));
    schedule(2660, () => setSummonStep('REVEAL'));
    schedule(3320, () => {
      const outcomes = onRecruit(count);
      if (outcomes && outcomes.length > 0) {
        setLastResults(outcomes);
        schedule(950, () => {
          setPhase('RESULT');
          timersRef.current = [];
        });
      } else {
        setPhase('IDLE');
        setSummonStep('BLACKOUT');
      }
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        background:
          'radial-gradient(circle at 50% 16%, rgba(93,57,125,.15), transparent 28%), linear-gradient(180deg,#040509 0%,#080A11 52%,#030407 100%)',
        color: '#FFF',
      }}
    >
      <style>{`
        @keyframes gateReveal {
          0% { transform:scale(1.035); opacity:0; filter:brightness(.08) saturate(.5) blur(9px); }
          45% { opacity:.72; }
          100% { transform:scale(1); opacity:1; filter:brightness(.9) saturate(1) blur(0); }
        }
        @keyframes gateOpenLeft {
          0% { transform:translateX(0); filter:brightness(.92) saturate(1); }
          62% { transform:translateX(-7%); filter:brightness(1.02) saturate(1.08); }
          100% { transform:translateX(-15%); filter:brightness(.7) saturate(.9); opacity:.88; }
        }
        @keyframes gateOpenRight {
          0% { transform:translateX(0); filter:brightness(.92) saturate(1); }
          62% { transform:translateX(7%); filter:brightness(1.02) saturate(1.08); }
          100% { transform:translateX(15%); filter:brightness(.7) saturate(.9); opacity:.88; }
        }
        @keyframes gateVoid {
          0% { opacity:.25; transform:scale(.94); }
          55% { opacity:.75; transform:scale(1.02); }
          100% { opacity:1; transform:scale(1.05); }
        }
        @keyframes redPresence {
          0% { transform: scale(1.10); opacity:0; filter:brightness(.12) saturate(.55) blur(10px); }
          45% { opacity:.88; }
          100% { transform: scale(1); opacity:.92; filter:brightness(.82) saturate(1) blur(0); }
        }
        @keyframes omenRise {
          0% { transform:scale(1.12); opacity:0; filter:brightness(.18) contrast(1.15) blur(8px); }
          55% { opacity:.92; }
          100% { transform:scale(1); opacity:.82; filter:brightness(.68) contrast(1.08) blur(0); }
        }
        @keyframes wingFlash {
          0% { transform:scale(.92); opacity:0; }
          18% { opacity:.98; }
          68% { opacity:.95; }
          100% { transform:scale(1.025); opacity:0; }
        }
        @keyframes whiteBurst {
          0% { opacity:0; transform:scale(.9); }
          12% { opacity:.72; transform:scale(1); }
          45% { opacity:.18; }
          100% { opacity:0; transform:scale(1.08); }
        }
        @keyframes irenaReveal {
          0% { transform:translate(-50%, 7%) scale(1.035); opacity:0; filter:brightness(.16) contrast(1.35) saturate(.55) blur(11px); }
          38% { opacity:.7; }
          72% { opacity:.98; }
          100% { transform:translate(-50%, 0) scale(1); opacity:1; filter:brightness(1) contrast(1.06) saturate(1) blur(0); }
        }
        @keyframes sceneBreath {
          0%,100% { transform:scale(1); }
          50% { transform:scale(1.018); }
        }
        @keyframes revealText {
          0% { transform:translateY(14px); opacity:0; }
          100% { transform:translateY(0); opacity:1; }
        }
        @keyframes resultGlow {
          0%,100% { opacity:.35; transform:scale(.96); }
          50% { opacity:.72; transform:scale(1.04); }
        }
        @keyframes urPulse {
          0%,100% { filter:brightness(.92) saturate(1); transform:scale(.985); }
          35% { filter:brightness(1.22) saturate(1.15); transform:scale(1.012); }
          70% { filter:brightness(1.05) saturate(1.02); transform:scale(1); }
        }
      `}</style>

      <div style={{ width:'100%', maxWidth:'860px', margin:'0 auto', padding:'16px 14px 34px', boxSizing:'border-box' }}>
        <header style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <button
            type="button"
            onClick={onBack}
            aria-label="戻る"
            style={{
              width:42, height:42, borderRadius:12, border:'1px solid #30384A',
              background:'rgba(3,5,9,.88)', color:'#FFF', display:'grid', placeItems:'center', cursor:'pointer',
            }}
          >
            <ArrowLeft size={19} />
          </button>

          <div style={{ flex:1 }}>
            <div style={{ color:'#A98CC4', fontSize:10, fontWeight:900, letterSpacing:'.28em' }}>BLACK WING</div>
            <div style={{ marginTop:3, fontSize:27, lineHeight:1, fontWeight:950 }}>黒翼召喚</div>
          </div>

          <div style={{
            display:'flex', alignItems:'center', gap:8, padding:'8px 11px', borderRadius:12,
            border:'1px solid rgba(255,224,130,.42)', background:'rgba(23,19,10,.92)',
          }}>
            <Ticket size={17} color="#FFE082" />
            <div>
              <div style={{ fontSize:8, color:'#A8A294', fontWeight:800 }}>召喚札</div>
              <div style={{ color:'#FFE082', fontSize:19, lineHeight:1, fontWeight:950 }}>{progress.tickets}</div>
            </div>
          </div>
        </header>

        <section style={{
          position:'relative',
          minHeight:340,
          height:'min(70vw, 520px)',
          overflow:'hidden',
          borderRadius:24,
          border:'1px solid rgba(134,93,161,.48)',
          background:'#010204',
          boxShadow:'0 20px 80px rgba(0,0,0,.64), inset 0 0 110px rgba(68,30,90,.12)',
        }}>
          <div style={{
            position:'absolute',
            inset:0,
            background:'radial-gradient(circle at 50% 52%,rgba(96,40,62,.16),transparent 34%),linear-gradient(180deg,#010204 0%,#05050A 55%,#010103 100%)',
          }} />

          {(phase === 'SUMMONING' && (summonStep === 'GATE' || summonStep === 'GATE_OPEN')) && (
            <div
              style={{
                position:'absolute',
                inset:0,
                zIndex:2,
                overflow:'hidden',
                background:'radial-gradient(circle at 50% 50%,rgba(153,34,84,.24),rgba(27,8,36,.14) 35%,rgba(0,0,0,.72) 78%,#000 100%)',
              }}
            >
              <div
                style={{
                  position:'absolute',
                  inset:'-7%',
                  background:'radial-gradient(circle at 50% 52%,rgba(217,39,100,.25),transparent 30%),radial-gradient(circle at 50% 50%,rgba(108,53,157,.28),transparent 48%),#020104',
                  animation:summonStep === 'GATE_OPEN' ? 'gateVoid .7s cubic-bezier(.18,.86,.22,1) both' : undefined,
                }}
              />
              {summonStep === 'GATE' && (
                <img
                  src={RECRUITMENT_ASSETS.gate}
                  alt=""
                  aria-hidden="true"
                  style={{
                    position:'absolute',
                    inset:'-6%',
                    width:'112%',
                    height:'112%',
                    objectFit:'cover',
                    objectPosition:'center',
                    animation:'gateReveal .82s cubic-bezier(.18,.84,.22,1) both',
                    pointerEvents:'none',
                  }}
                />
              )}
              {summonStep === 'GATE_OPEN' && (
                <>
                  <div style={{
                    position:'absolute',
                    left:'-1%',
                    top:0,
                    width:'51%',
                    height:'100%',
                    backgroundImage:`url("${RECRUITMENT_ASSETS.gate}")`,
                    backgroundSize:'200% 100%',
                    backgroundPosition:'left center',
                    backgroundRepeat:'no-repeat',
                    animation:'gateOpenLeft .7s cubic-bezier(.16,.86,.22,1) both',
                    transformOrigin:'right center',
                  }} />
                  <div style={{
                    position:'absolute',
                    right:'-1%',
                    top:0,
                    width:'51%',
                    height:'100%',
                    backgroundImage:`url("${RECRUITMENT_ASSETS.gate}")`,
                    backgroundSize:'200% 100%',
                    backgroundPosition:'right center',
                    backgroundRepeat:'no-repeat',
                    animation:'gateOpenRight .7s cubic-bezier(.16,.86,.22,1) both',
                    transformOrigin:'left center',
                  }} />
                </>
              )}
            </div>
          )}

          <img
            src={RECRUITMENT_ASSETS.redEyes}
            alt=""
            aria-hidden="true"
            style={{
              position:'absolute',
              inset:'-7%',
              width:'114%',
              height:'114%',
              objectFit:'cover',
              objectPosition:'center',
              opacity: phase === 'SUMMONING'
                ? (summonStep === 'PRESENCE' ? .92 : summonStep === 'BLACKOUT' ? 0 : .46)
                : .08,
              mixBlendMode:'screen',
              animation: phase === 'SUMMONING' && summonStep === 'PRESENCE' ? 'redPresence 1.1s ease-out both' : undefined,
              pointerEvents:'none',
            }}
          />

          <img
            src={RECRUITMENT_ASSETS.wingedOmen}
            alt=""
            aria-hidden="true"
            style={{
              position:'absolute',
              inset:'-8%',
              width:'116%',
              height:'116%',
              objectFit:'cover',
              objectPosition:'center',
              opacity: phase === 'SUMMONING'
                ? (summonStep === 'OMEN' ? .9 : summonStep === 'WINGS_FLASH' || summonStep === 'REVEAL' ? .55 : 0)
                : .12,
              mixBlendMode:'screen',
              animation: phase === 'SUMMONING' && summonStep === 'OMEN' ? 'omenRise 1.05s cubic-bezier(.16,.84,.22,1) both' : undefined,
              pointerEvents:'none',
            }}
          />

          {phase === 'SUMMONING' && summonStep === 'WINGS_FLASH' && (
            <>
              <img
                src={RECRUITMENT_ASSETS.wingFrame}
                alt=""
                aria-hidden="true"
                style={{
                  position:'absolute',
                  inset:0,
                  width:'100%',
                  height:'100%',
                  objectFit:'cover',
                  objectPosition:'center',
                  opacity:1,
                  mixBlendMode:'multiply',
                  animation:'wingFlash .55s cubic-bezier(.2,.8,.2,1) both',
                  pointerEvents:'none',
                }}
              />
              <div style={{
                position:'absolute',
                inset:0,
                background:'rgba(255,255,255,.82)',
                animation:'whiteBurst .55s ease-out both',
                pointerEvents:'none',
              }} />
            </>
          )}

          <div style={{
            position:'absolute',
            inset:0,
            background:'radial-gradient(circle at 50% 52%,transparent 18%,rgba(0,0,0,.16) 42%,rgba(0,0,0,.72) 100%)',
            pointerEvents:'none',
          }} />

          {phase === 'SUMMONING' && summonStep === 'BLACKOUT' && (
            <div style={{
              position:'absolute',
              inset:0,
              background:'#000',
              zIndex:5,
              pointerEvents:'none',
            }} />
          )}

          {(phase === 'SUMMONING' && summonStep === 'REVEAL') || phase === 'RESULT' ? (
            <img
              src={RECRUITMENT_ASSETS.irena}
              alt=""
              aria-hidden="true"
              style={{
                position:'absolute',
                left:'50%',
                top:0,
                width:'100%',
                height:'100%',
                objectFit:'cover',
                objectPosition:'center 46%',
                opacity:1,
                zIndex:4,
                animation: phase === 'SUMMONING' && summonStep === 'REVEAL' ? 'irenaReveal 1.15s cubic-bezier(.16,.86,.22,1) both' : undefined,
                pointerEvents:'none',
              }}
            />
          ) : null}

          {phase === 'SUMMONING' && summonStep === 'REVEAL' && (
            <>
              <div style={{
                position:'absolute',
                inset:0,
                background:'radial-gradient(circle at 50% 46%,rgba(255,220,170,.12),transparent 34%),linear-gradient(180deg,rgba(0,0,0,.14),rgba(0,0,0,.64))',
                zIndex:5,
                pointerEvents:'none',
              }} />
              <div style={{
                position:'absolute',
                left:'50%',
                bottom:22,
                transform:'translateX(-50%)',
                width:'min(92%,520px)',
                textAlign:'center',
                zIndex:6,
                animation:'revealText .42s ease-out .58s both',
                textShadow:'0 2px 22px rgba(0,0,0,.88)',
              }}>
                <div style={{ color:'#E5C1E9', fontSize:10, fontWeight:950, letterSpacing:'.34em' }}>BLACK WING DESCENDS</div>
                <div style={{ marginTop:7, fontSize:'clamp(30px,7vw,48px)', fontWeight:950, letterSpacing:'.08em' }}>いれーな、顕現</div>
              </div>
            </>
          )}

          {phase === 'SUMMONING' && (
            <div style={{
              position:'absolute',
              left:'50%',
              top:18,
              transform:'translateX(-50%)',
              width:'calc(100% - 32px)',
              display:'flex',
              justifyContent:'center',
              zIndex:7,
              pointerEvents:'none',
            }}>
              <div style={{
                padding:'6px 10px',
                borderRadius:999,
                border:'1px solid rgba(216,178,228,.22)',
                background:'rgba(4,3,7,.45)',
                backdropFilter:'blur(8px)',
                color:'#C9AECF',
                fontSize:8,
                fontWeight:950,
                letterSpacing:'.26em',
              }}>
                {summonStep === 'BLACKOUT' && 'BLACK WING / SILENCE'}
                {summonStep === 'GATE' && 'BLACK WING / GATE'}
                {summonStep === 'GATE_OPEN' && 'BLACK WING / GATE OPEN'}
                {summonStep === 'PRESENCE' && 'BLACK WING / PRESENCE'}
                {summonStep === 'OMEN' && 'BLACK WING / OMEN'}
                {summonStep === 'WINGS_FLASH' && 'BLACK WING / AWAKEN'}
                {summonStep === 'REVEAL' && 'BLACK WING / DESCEND'}
              </div>
            </div>
          )}

          {phase !== 'SUMMONING' && (
            <div style={{
              position:'absolute',
              inset:0,
              zIndex:7,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              textAlign:'center',
              padding:24,
              pointerEvents:'none',
            }}>
              {lastResult ? (
                <>
                  <div style={{
                    position:'absolute',
                    left:'50%',
                    top:'48%',
                    width:240,
                    height:240,
                    borderRadius:'50%',
                    background:'radial-gradient(circle,rgba(255,190,130,.18),transparent 64%)',
                    transform:'translate(-50%,-50%)',
                    animation:'resultGlow 3.4s ease-in-out infinite',
                  }} />
                  <div style={{
                    position:'relative',
                    maxWidth:560,
                    marginTop:'48%',
                    transform:'translateY(-38%)',
                    textShadow:'0 2px 24px rgba(0,0,0,.88)',
                  }}>
                    <div style={{ color:'#E5C1E9', fontSize:9, fontWeight:950, letterSpacing:'.28em' }}>SUMMON COMPLETE</div>
                    <div style={{ marginTop:6, fontSize:'clamp(27px,6vw,42px)', fontWeight:950 }}>
                    {lastResults.length === 1 ? lastResult.reward.name : '10連召喚完了'}
                  </div>
                  {lastResults.length > 1 && (
                    <div style={{ marginTop:8, color:'#B7AFBC', fontSize:10 }}>
                      権能本体・権能の欠片をまとめて獲得
                    </div>
                  )}
                  </div>
                </>
              ) : (
                <div style={{
                  position:'relative',
                  maxWidth:560,
                  textShadow:'0 2px 22px rgba(0,0,0,.95)',
                }}>
                  <div style={{ color:'#BFA6CB', fontSize:10, fontWeight:900, letterSpacing:'.32em' }}>SUMMONING GROUND</div>
                  <div style={{ marginTop:9, fontSize:'clamp(28px,7vw,44px)', fontWeight:950 }}>黒翼を呼ぶ</div>
                  <div style={{ marginTop:7, color:'#B7AFBC', fontSize:11 }}>何が現れるかは、召喚した瞬間に決まる</div>
                </div>
              )}
            </div>
          )}
        </section>

        <section style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{
            padding:'12px 13px', borderRadius:14, background:'rgba(9,11,17,.9)',
            border:'1px solid #252B39',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, color:'#B7AFC0', fontSize:9, fontWeight:900 }}>
              <Award size={14} /> 収集
            </div>
            <div style={{ marginTop:4, fontSize:19, fontWeight:950 }}>{collectedCount}<span style={{ color:'#666B76', fontSize:12 }}> / {RECRUITMENT_REWARDS.length}</span></div>
            <div style={{ marginTop:7, height:4, borderRadius:99, background:'#181B23', overflow:'hidden' }}>
              <div style={{ width:`${(collectedCount / RECRUITMENT_REWARDS.length) * 100}%`, height:'100%', background:'#8C6A9F' }} />
            </div>
          </div>

          <div style={{
            padding:'12px 13px', borderRadius:14, background:'rgba(9,11,17,.9)',
            border:'1px solid #252B39',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, color:'#B7AFC0', fontSize:9, fontWeight:900 }}>
              <Zap size={14} /> 召喚の意味
            </div>
            <div style={{ marginTop:4, color:'#FFF', fontSize:13, fontWeight:900 }}>欠片 → 強化 / 本体 → 解放 / UR → 技追加</div>
            <div style={{ marginTop:4, color:'#7F8490', fontSize:9, lineHeight:1.5 }}>Rは技強化、SRは権能強化、SSRは権能本体、URは超堕天撃を解放。重複URは技強化の欠片に変換。</div>
          </div>
        </section>

        {phase === 'RESULT' && lastResult && selectedMeta && (
          <section style={{
            marginTop:12, padding:'18px 16px', borderRadius:18,
            border:`1px solid ${selectedMeta.border}`,
            background:`radial-gradient(circle at 50% 0%, ${selectedMeta.glow}, rgba(7,9,14,.97) 58%)`,
            boxShadow:`0 10px 42px ${selectedMeta.glow}`,
            animation:lastResult.reward.rarity === 'UR' ? 'urPulse .9s ease-in-out both' : 'revealCard .34s ease-out both',
            textAlign:'center',
          }}>
            <div style={{
              position:'relative', width:88, height:88, margin:'0 auto', borderRadius:'50%',
              border:`1px solid ${selectedMeta.border}`, background:'rgba(2,4,7,.64)',
              display:'grid', placeItems:'center', color:selectedMeta.accent,
            }}>
              <div style={{ position:'absolute', left:'50%', top:'50%', width:50, height:50, borderRadius:'50%', border:`1px solid ${selectedMeta.border}`, animation:'flash 1.1s ease-out both' }} />
              {selectedMeta.icon}
            </div>

            <div style={{ marginTop:12, color:selectedMeta.accent, fontSize:10, fontWeight:950, letterSpacing:'.18em' }}>
              {lastResult.isNew ? 'NEW REWARD' : 'DUPLICATE CONVERTED'}
            </div>
            <div style={{ marginTop:4, fontSize:25, fontWeight:950 }}>{lastResult.reward.name}</div>

            <div style={{ marginTop:12, display:'flex', justifyContent:'center', gap:7, flexWrap:'wrap' }}>
              {lastResult.shardGain > 0 && (
                <span style={pillStyle}>+{lastResult.shardGain} {getShardLabel(lastResult.reward)}</span>
              )}
            </div>

            {lastResult.collectionCompleted && (
              <div style={{
                margin:'14px auto 0', maxWidth:420, padding:'10px 12px', borderRadius:12,
                border:'1px solid rgba(255,213,79,.42)', background:'rgba(65,49,12,.25)', color:'#FFE082',
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:11, fontWeight:950 }}>
                  <Gift size={14} /> 報酬コレクション COMPLETE
                </div>
                <div style={{ marginTop:4, fontSize:10, color:'#D2BE7A' }}>
                  技強化・権能・UR特殊技の全報酬を記録しました。
                </div>
              </div>
            )}

            {lastResults.length > 1 && (
              <div style={{
                marginTop:14, display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:6,
                textAlign:'left',
              }}>
                {lastResults.map((draw, index) => (
                  <div key={`${draw.reward.id}-${index}`} style={{
                    padding:'8px 9px', borderRadius:10,
                    border:`1px solid ${rarityMeta[draw.reward.rarity].border}`,
                    background:'rgba(3,5,9,.55)',
                  }}>
                    <div style={{ fontSize:8, color:rarityMeta[draw.reward.rarity].accent, fontWeight:950 }}>
                      {draw.reward.rarity} ・ {getRewardKindLabel(draw.reward)}
                    </div>
                    <div style={{ marginTop:3, fontSize:10, color:'#FFF', fontWeight:900 }}>
                      {draw.reward.name}
                    </div>
                    {draw.shardGain > 0 && (
                      <div style={{ marginTop:2, fontSize:8, color:'#FFE082' }}>
                        +{draw.shardGain} {draw.reward.kind === 'ABILITY_SHARD' && draw.reward.abilityId && abilityProgress.levels[draw.reward.abilityId] >= 5
                          ? '技強化の欠片（MAX交換）'
                          : getShardLabel(draw.reward)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => { setLastResults([]); setPhase('IDLE'); }}
              style={{
                marginTop:15, minWidth:150, height:42, borderRadius:11,
                border:'1px solid #62506B', background:'rgba(20,14,26,.92)',
                color:'#FFF', fontSize:12, fontWeight:950, cursor:'pointer',
              }}
            >
              次の召喚
            </button>
          </section>
        )}

        {phase === 'IDLE' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginTop:12 }}>
            {[{ count:1 as const, label:'1回召喚', need:1 }, { count:10 as const, label:'10連召喚', need:10 }].map(option => {
              const available = progress.tickets >= option.need;
              return (
                <button
                  key={option.count}
                  type="button"
                  disabled={!available}
                  onClick={() => handleRecruit(option.count)}
                  style={{
                    width:'100%', minHeight:68, borderRadius:16,
                    border:'1px solid rgba(202,165,73,.66)',
                    background: available
                      ? 'linear-gradient(135deg,rgba(45,28,48,.98),rgba(12,11,16,.99) 56%,rgba(45,35,15,.98))'
                      : 'linear-gradient(135deg,#15161B,#0D0E12)',
                    color:'#FFF', cursor: available ? 'pointer' : 'not-allowed',
                    opacity: available ? 1 : .46,
                  }}
                >
                  <span style={{ display:'block', color:'#FFE082', fontSize:9, fontWeight:950, letterSpacing:'.16em' }}>
                    {option.count === 10 ? '10 PULL' : '1 PULL'}
                  </span>
                  <span style={{ display:'block', marginTop:5, fontSize:18, fontWeight:950 }}>
                    {available ? option.label : '召喚札不足'}
                  </span>
                  <span style={{ display:'block', marginTop:3, color:'#8F8A94', fontSize:9 }}>
                    召喚札 {option.need}枚
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <section style={{
          marginTop:14, padding:'14px 13px', borderRadius:16,
          border:'1px solid #3A3046', background:'rgba(12,9,18,.84)',
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
            <div>
              <div style={{ color:'#B39DDB', fontSize:9, fontWeight:950, letterSpacing:'.18em' }}>POWER GROWTH</div>
              <div style={{ marginTop:3, color:'#FFF', fontSize:15, fontWeight:950 }}>権能育成</div>
            </div>
            <div style={{ color:'#8F849B', fontSize:9 }}>最大Lv.5</div>
          </div>
          <div style={{ display:'grid', gap:7, marginTop:10 }}>
            {ABILITY_DEFINITIONS.map(ability => {
              const level = abilityProgress.levels[ability.id];
              const shards = abilityProgress.shards[ability.id];
              const cost = level >= 5 ? null : 40 + Math.max(0, level - 1) * 40;
              const canUpgrade = level > 0 && cost !== null && shards >= cost;
              return (
                <div key={ability.id} style={{
                  display:'flex', alignItems:'center', gap:9, padding:'9px',
                  borderRadius:11, border:'1px solid #27202F', background:'rgba(24,18,31,.76)',
                }}>
                  <div style={{ width:35, height:35, borderRadius:9, display:'grid', placeItems:'center', background:'rgba(179,157,219,.08)', fontSize:18 }}>
                    {ability.symbol}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:950, color:'#FFF' }}>
                      {ability.name} <span style={{ color:'#FFE082' }}>Lv.{level > 0 ? level : '—'}</span>
                    </div>
                    <div style={{ marginTop:3, fontSize:9, color:'#85808A' }}>
                      {level > 0 ? `欠片 ${shards}${cost !== null ? ` / ${cost}` : ' / MAX'}` : '未解放'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canUpgrade}
                    onClick={() => onUpgradeAbility(ability.id)}
                    style={{
                      minWidth:72, height:32, borderRadius:8,
                      border:'1px solid rgba(179,157,219,.35)',
                      background:canUpgrade ? '#4A235F' : '#17141C',
                      color:canUpgrade ? '#FFF' : '#5F5A64',
                      fontSize:9, fontWeight:950, cursor:canUpgrade ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {level >= 5 ? 'MAX' : 'Lv.UP'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{
          marginTop:18, padding:'13px 13px 14px', borderRadius:16,
          border:'1px solid #232936', background:'rgba(6,8,12,.76)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, color:'#C0B5C8', fontSize:11, fontWeight:900 }}>
            <Feather size={14} /> 黒翼の仕組み
          </div>
          <div style={{ marginTop:7, color:'#8D919B', fontSize:10, lineHeight:1.7 }}>
            召喚すると、その場で報酬が抽選されます。新規報酬は収集に登録され、重複した報酬は追加の黒羽の欠片へ変換されます。
            Rは技強化の欠片、SRは権能の欠片、SSRは権能本体、URは特殊技。10連は権能本体1個以上を保証します。
          </div>
        </section>

        <section style={{ marginTop:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, color:'#BFB5C5', fontSize:11, fontWeight:900 }}>
              <Award size={14} /> 黒翼の記録
            </div>
            {collectionComplete && <span style={{ color:'#FFE082', fontSize:9, fontWeight:900 }}>COMPLETE</span>}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:7 }}>
            {collectionItems.map(({ reward, collected }) => {
              const meta = rarityMeta[reward.rarity];
              return (
                <div
                  key={reward.id}
                  style={{
                    minHeight:52, padding:'8px 9px', borderRadius:11,
                    border:`1px solid ${collected ? meta.border : '#20242D'}`,
                    background: collected ? `linear-gradient(135deg,${meta.glow},rgba(8,10,14,.95))` : 'rgba(8,10,14,.74)',
                    opacity: collected ? 1 : .58,
                  }}
                >
                  <div style={{ color:collected ? meta.accent : '#676C76', fontSize:8, fontWeight:950, letterSpacing:'.12em' }}>
                    {meta.label}
                  </div>
                  <div style={{ marginTop:3, fontSize:10, fontWeight:900, color:collected ? '#FFF' : '#888D97' }}>
                    {collected ? reward.name : '？？？？？？'}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

const pillStyle: React.CSSProperties = {
  display:'inline-flex', alignItems:'center', minHeight:28, padding:'0 10px', borderRadius:999,
  background:'rgba(255,224,130,.08)', border:'1px solid rgba(255,224,130,.23)',
  color:'#FFE082', fontSize:10, fontWeight:950,
};

