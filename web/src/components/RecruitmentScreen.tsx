import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Award, Crown, Feather, Gift, Sparkles, Ticket, Zap } from 'lucide-react';
import {
  RECRUITMENT_REWARDS,
  RecruitmentDraw,
  RecruitmentRewardDef,
} from '../data/recruitment';
import { RecruitmentProgress } from '../types/game';

interface Props {
  progress: RecruitmentProgress;
  onRecruit: () => RecruitmentDraw | null;
  onBack: () => void;
}

type SummonPhase = 'IDLE' | 'SUMMONING' | 'RESULT';

const rarityMeta: Record<RecruitmentRewardDef['rarity'], {
  label: string;
  icon: React.ReactNode;
  border: string;
  glow: string;
  accent: string;
}> = {
  R: {
    label: '権能',
    icon: <Feather size={21} />,
    border: 'rgba(144,202,249,.62)',
    glow: 'rgba(66,165,245,.23)',
    accent: '#90CAF9',
  },
  SR: {
    label: '深層権能',
    icon: <Sparkles size={22} />,
    border: 'rgba(206,147,216,.72)',
    glow: 'rgba(171,71,188,.30)',
    accent: '#CE93D8',
  },
  SSR: {
    label: '権能顕現',
    icon: <Crown size={24} />,
    border: 'rgba(255,213,79,.86)',
    glow: 'rgba(255,193,7,.34)',
    accent: '#FFD54F',
  },
};

const FEATHERS = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 43) % 102 - 1,
  top: (i * 29) % 92 + 2,
  delay: (i % 8) * 0.11,
  duration: 1.5 + (i % 5) * 0.17,
  rotate: -35 + (i % 7) * 12,
  size: 11 + (i % 4) * 4,
}));

export const RecruitmentScreen: React.FC<Props> = ({ progress, onRecruit, onBack }) => {
  const [phase, setPhase] = useState<SummonPhase>('IDLE');
  const [lastResult, setLastResult] = useState<RecruitmentDraw | null>(null);
  const timerRef = useRef<number | null>(null);

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
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const handleRecruit = () => {
    if (phase !== 'IDLE' || progress.tickets < 1) return;

    setLastResult(null);
    setPhase('SUMMONING');

    timerRef.current = window.setTimeout(() => {
      const outcome = onRecruit();
      if (outcome) {
        setLastResult(outcome);
        setPhase('RESULT');
      } else {
        setPhase('IDLE');
      }
    }, 1250);
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
        @keyframes wingPulse {
          0%,100% { transform: translate(-50%,-50%) scale(.92); opacity:.35; }
          50% { transform: translate(-50%,-50%) scale(1.06); opacity:.72; }
        }
        @keyframes wingOpenLeft {
          0% { transform: rotate(-7deg) scaleX(.38); opacity:.08; }
          55% { opacity:.9; }
          100% { transform: rotate(-17deg) scaleX(1); opacity:.96; }
        }
        @keyframes wingOpenRight {
          0% { transform: rotate(7deg) scaleX(.38); opacity:.08; }
          55% { opacity:.9; }
          100% { transform: rotate(17deg) scaleX(1); opacity:.96; }
        }
        @keyframes featherFall {
          0% { transform: translate3d(0,-18px,0) rotate(0deg); opacity:0; }
          18% { opacity:.76; }
          100% { transform: translate3d(0,150px,0) rotate(160deg); opacity:0; }
        }
        @keyframes summonCore {
          0% { transform: translate(-50%,-50%) scale(.2); opacity:0; }
          30% { transform: translate(-50%,-50%) scale(.72); opacity:.56; }
          62% { transform: translate(-50%,-50%) scale(1.18); opacity:1; }
          100% { transform: translate(-50%,-50%) scale(1); opacity:.76; }
        }
        @keyframes blackout {
          0%,100% { opacity:.03; }
          45%,70% { opacity:.94; }
        }
        @keyframes revealCard {
          0% { transform: translateY(20px) scale(.93); opacity:0; filter:blur(5px); }
          100% { transform: translateY(0) scale(1); opacity:1; filter:blur(0); }
        }
        @keyframes flash {
          0% { transform: translate(-50%,-50%) scale(.2); opacity:0; }
          45% { transform: translate(-50%,-50%) scale(1.15); opacity:.92; }
          100% { transform: translate(-50%,-50%) scale(1.8); opacity:0; }
        }
        @keyframes drift {
          0% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
          100% { transform: translateY(0); }
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
          position:'relative', minHeight:300, overflow:'hidden', borderRadius:24,
          border:'1px solid rgba(134,93,161,.42)',
          background:'radial-gradient(circle at 50% 50%, rgba(65,40,82,.25), transparent 34%), linear-gradient(180deg,rgba(7,8,12,.98),rgba(2,3,6,.99))',
          boxShadow:'0 18px 65px rgba(0,0,0,.52), inset 0 0 75px rgba(100,53,120,.09)',
        }}>
          <div style={{
            position:'absolute', left:'50%', top:'52%', width:220, height:220, borderRadius:'50%',
            border:'1px solid rgba(197,154,220,.22)', animation:'wingPulse 3.2s ease-in-out infinite',
          }} />

          <div style={{
            position:'absolute', left:'50%', top:'52%', width:145, height:145, borderRadius:'50%',
            border:'1px dashed rgba(255,224,130,.22)', transform:'translate(-50%,-50%)', opacity:.7,
          }} />

          <div style={{
            position:'absolute', left:'50%', top:'52%', width:250, height:70, borderRadius:'50%',
            background:'radial-gradient(ellipse, rgba(111,55,132,.22), transparent 68%)',
            transform:'translate(-50%,-50%)', filter:'blur(6px)',
          }} />

          <div style={{
            position:'absolute', left:'50%', top:'50%', width:170, height:88, transform:'translate(-100%,-50%) rotate(-12deg)',
            borderRadius:'100% 0 0 100%', borderLeft:'18px solid rgba(15,12,19,.95)',
            borderTop:'12px solid rgba(35,29,42,.92)', borderBottom:'7px solid rgba(22,18,27,.96)',
            boxShadow:'-18px 2px 55px rgba(0,0,0,.84)', animation: phase === 'SUMMONING' ? 'wingOpenLeft 1.15s cubic-bezier(.18,.86,.28,1) both' : 'drift 4.2s ease-in-out infinite',
          }} />
          <div style={{
            position:'absolute', left:'50%', top:'50%', width:170, height:88, transform:'translate(0,-50%) rotate(12deg)',
            borderRadius:'0 100% 100% 0', borderRight:'18px solid rgba(15,12,19,.95)',
            borderTop:'12px solid rgba(35,29,42,.92)', borderBottom:'7px solid rgba(22,18,27,.96)',
            boxShadow:'18px 2px 55px rgba(0,0,0,.84)', animation: phase === 'SUMMONING' ? 'wingOpenRight 1.15s cubic-bezier(.18,.86,.28,1) both' : 'drift 4.2s ease-in-out infinite',
          }} />

          {FEATHERS.map((feather, i) => (
            <div
              key={i}
              style={{
                position:'absolute', left:`${feather.left}%`, top:`${feather.top}%`,
                width:feather.size, height:feather.size * 2.25,
                borderRadius:'65% 20% 65% 20%', background:'linear-gradient(145deg,rgba(24,22,30,.1),rgba(5,5,8,.98))',
                border:'1px solid rgba(117,97,131,.16)', transform:`rotate(${feather.rotate}deg)`,
                opacity: phase === 'SUMMONING' ? .95 : .15,
                animation: phase === 'SUMMONING'
                  ? `featherFall ${feather.duration}s ease-in ${feather.delay}s both`
                  : undefined,
              }}
            />
          ))}

          <div style={{
            position:'absolute', left:'50%', top:'52%', width:72, height:72, borderRadius:'50%',
            background:'radial-gradient(circle,rgba(255,210,100,.96) 0%,rgba(255,72,72,.68) 15%,rgba(93,43,111,.16) 55%,transparent 72%)',
            filter:'blur(1px)', animation: phase === 'SUMMONING' ? 'summonCore 1.15s ease-out both' : 'wingPulse 2.7s ease-in-out infinite',
            transform:'translate(-50%,-50%)',
          }} />

          {phase === 'SUMMONING' && (
            <div style={{
              position:'absolute', inset:0, background:'#000', animation:'blackout 1.25s ease-in-out both', pointerEvents:'none',
            }} />
          )}

          <div style={{ position:'relative', zIndex:3, minHeight:300, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:24 }}>
            {phase === 'SUMMONING' ? (
              <>
                <div style={{ color:'#BFA6CB', fontSize:10, fontWeight:900, letterSpacing:'.32em' }}>THE BLACK WING ANSWERS</div>
                <div style={{ marginTop:10, fontSize:'clamp(28px,7vw,44px)', fontWeight:950, letterSpacing:'.08em', textShadow:'0 0 24px rgba(173,112,197,.36)' }}>
                  黒翼、顕現
                </div>
                <div style={{ marginTop:8, color:'#8D8993', fontSize:11 }}>何が現れるかは、召喚した瞬間に決まる</div>
              </>
            ) : lastResult ? (
              <>
                <div style={{ color:selectedMeta?.accent, fontSize:11, fontWeight:950, letterSpacing:'.23em' }}>
                  {selectedMeta?.label}
                </div>
                <div style={{ marginTop:8, fontSize:34, fontWeight:950 }}>{lastResult.reward.name}</div>
                <div style={{ marginTop:7, color:'#AFAAB6', fontSize:11, maxWidth:520, lineHeight:1.65 }}>
                  {lastResult.reward.description}
                </div>
              </>
            ) : (
              <>
                <div style={{ color:'#8C8293', fontSize:10, fontWeight:900, letterSpacing:'.28em' }}>SUMMONING GROUND</div>
                <div style={{ marginTop:9, fontSize:'clamp(27px,7vw,43px)', fontWeight:950 }}>黒翼を呼ぶ</div>
                <div style={{ marginTop:7, color:'#8D8993', fontSize:11 }}>召喚札を1枚使って、黒翼からひとつを引き出す</div>
              </>
            )}
          </div>
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
            <div style={{ marginTop:4, color:'#FFF', fontSize:13, fontWeight:900 }}>引いた報酬 → 育成へ</div>
            <div style={{ marginTop:4, color:'#7F8490', fontSize:9, lineHeight:1.5 }}>すべての報酬が黒羽の欠片として、いれーなの成長に変わる</div>
          </div>
        </section>

        {phase === 'RESULT' && lastResult && selectedMeta && (
          <section style={{
            marginTop:12, padding:'18px 16px', borderRadius:18,
            border:`1px solid ${selectedMeta.border}`,
            background:`radial-gradient(circle at 50% 0%, ${selectedMeta.glow}, rgba(7,9,14,.97) 58%)`,
            boxShadow:`0 10px 42px ${selectedMeta.glow}`,
            animation:'revealCard .34s ease-out both',
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
              <span style={pillStyle}>+{lastResult.shardGain} 黒羽の欠片</span>
              {lastResult.ticketBonus > 0 && <span style={ticketPillStyle}>+{lastResult.ticketBonus} 召喚札</span>}
            </div>

            {lastResult.collectionCompleted && (
              <div style={{
                margin:'14px auto 0', maxWidth:420, padding:'10px 12px', borderRadius:12,
                border:'1px solid rgba(255,213,79,.42)', background:'rgba(65,49,12,.25)', color:'#FFE082',
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:11, fontWeight:950 }}>
                  <Gift size={14} /> 黒翼コレクション COMPLETE
                </div>
                <div style={{ marginTop:4, fontSize:10, color:'#D2BE7A' }}>
                  収集達成ボーナス +{lastResult.collectionBonusShards} 黒羽の欠片
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setLastResult(null); setPhase('IDLE'); }}
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
          <button
            type="button"
            disabled={progress.tickets < 1}
            onClick={handleRecruit}
            style={{
              width:'100%', minHeight:68, marginTop:12, borderRadius:16,
              border:'1px solid rgba(202,165,73,.66)',
              background: progress.tickets > 0
                ? 'linear-gradient(135deg,rgba(45,28,48,.98),rgba(12,11,16,.99) 56%,rgba(45,35,15,.98))'
                : 'linear-gradient(135deg,#15161B,#0D0E12)',
              color:'#FFF', cursor: progress.tickets > 0 ? 'pointer' : 'not-allowed',
              opacity: progress.tickets > 0 ? 1 : .46,
              boxShadow: progress.tickets > 0 ? '0 8px 30px rgba(87,60,102,.18)' : 'none',
            }}
          >
            <span style={{ display:'block', color:'#FFE082', fontSize:10, fontWeight:950, letterSpacing:'.2em' }}>
              {progress.tickets > 0 ? 'BLACK WING SUMMON' : 'NO TICKETS'}
            </span>
            <span style={{ display:'block', marginTop:5, fontSize:22, fontWeight:950 }}>
              {progress.tickets > 0 ? '召喚する' : '戦闘で召喚札を獲得'}
            </span>
          </button>
        )}

        <section style={{
          marginTop:18, padding:'13px 13px 14px', borderRadius:16,
          border:'1px solid #232936', background:'rgba(6,8,12,.76)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, color:'#C0B5C8', fontSize:11, fontWeight:900 }}>
            <Feather size={14} /> 黒翼の仕組み
          </div>
          <div style={{ marginTop:7, color:'#8D919B', fontSize:10, lineHeight:1.7 }}>
            召喚すると、その場で報酬が抽選されます。新規報酬は収集に登録され、重複した報酬は追加の黒羽の欠片へ変換されます。
            一部の深い権能は、召喚札そのものも返します。収集を完成させると追加ボーナスを獲得できます。
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

const ticketPillStyle: React.CSSProperties = {
  ...pillStyle,
  background:'rgba(144,202,249,.08)',
  border:'1px solid rgba(144,202,249,.23)',
  color:'#90CAF9',
};
