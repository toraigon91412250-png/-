import React, { useState } from 'react';
import { ArrowLeft, Award, Crown, Feather, Gift, Sparkles, Ticket, Zap } from 'lucide-react';
import { IRENA } from '../data/characters';
import {
  RECRUITMENT_REWARD_SEQUENCE,
  RecruitmentDraw,
  RecruitmentRewardDef,
} from '../data/recruitment';
import { RecruitmentProgress } from '../types/game';

interface Props {
  progress: RecruitmentProgress;
  onRecruit: () => RecruitmentDraw | null;
  onBack: () => void;
}

const rarityMeta: Record<RecruitmentRewardDef['rarity'], {
  label: string;
  icon: React.ReactNode;
  glow: string;
  border: string;
  bg: string;
}> = {
  R: {
    label: 'RARE',
    icon: <Feather size={17} />,
    glow: 'rgba(100,181,246,0.42)',
    border: '#64B5F6',
    bg: 'rgba(25,66,104,0.78)',
  },
  SR: {
    label: 'SUPER RARE',
    icon: <Sparkles size={18} />,
    glow: 'rgba(206,147,216,0.50)',
    border: '#CE93D8',
    bg: 'rgba(74,33,91,0.82)',
  },
  SSR: {
    label: 'ULTRA RARE',
    icon: <Crown size={19} />,
    glow: 'rgba(255,213,79,0.68)',
    border: '#FFD54F',
    bg: 'rgba(91,62,12,0.88)',
  },
};

export const RecruitmentScreen: React.FC<Props> = ({ progress, onRecruit, onBack }) => {
  const [revealing, setRevealing] = useState(false);
  const [lastResult, setLastResult] = useState<RecruitmentDraw | null>(null);

  const collectedCount = progress.collectedIds.length;
  const maxCollection = RECRUITMENT_REWARD_SEQUENCE.length;
  const nextPull = progress.totalPulls + 1;
  const isMilestone = nextPull % 10 === 0;

  const handleRecruit = () => {
    if (revealing || progress.tickets < 1) return;
    setRevealing(true);
    setLastResult(null);

    window.setTimeout(() => {
      const outcome = onRecruit();
      if (outcome) setLastResult(outcome);
      setRevealing(false);
    }, 650);
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      background: 'radial-gradient(circle at 76% 15%, rgba(126,87,194,0.19), transparent 27%), linear-gradient(180deg,#070910 0%,#111527 55%,#070A11 100%)',
      color: '#FFFFFF',
    }}>
      <style>{`
        @keyframes summonPulse {
          0%,100% { transform: scale(.96); opacity:.42; }
          50% { transform: scale(1.04); opacity:.9; }
        }
        @keyframes summonSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes candidateIn {
          0% { transform: translateY(16px) scale(.92); opacity:0; filter:brightness(1.8); }
          65% { transform: translateY(-3px) scale(1.02); opacity:1; }
          100% { transform: translateY(0) scale(1); opacity:1; filter:brightness(1); }
        }
        @keyframes revealFlash {
          0% { opacity:0; transform:scale(.55); }
          45% { opacity:1; transform:scale(1.12); }
          100% { opacity:.8; transform:scale(1); }
        }
        @keyframes shineSweep {
          0% { transform:translateX(-150%) skewX(-18deg); }
          100% { transform:translateX(260%) skewX(-18deg); }
        }
      `}</style>

      <div style={{ position:'relative', width:'100%', maxWidth:'820px', margin:'0 auto', padding:'18px 14px 34px', boxSizing:'border-box' }}>
        <header style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
          <button type="button" onClick={onBack} style={{
            width:'42px', height:'42px', borderRadius:'12px', border:'1px solid #34415E',
            background:'rgba(8,12,20,.88)', color:'#FFF', display:'grid', placeItems:'center', cursor:'pointer',
          }}>
            <ArrowLeft size={19} />
          </button>

          <div style={{ flex:1 }}>
            <div style={{ color:'#B39DDB', fontSize:'10px', fontWeight:900, letterSpacing:'.24em' }}>BLACK WING SUMMON</div>
            <div style={{ marginTop:'3px', fontSize:'26px', lineHeight:1, fontWeight:950 }}>黒翼召喚</div>
          </div>

          <div style={{
            display:'flex', alignItems:'center', gap:'7px', padding:'8px 11px', borderRadius:'12px',
            border:'1px solid rgba(255,224,130,.48)', background:'rgba(31,25,14,.92)',
          }}>
            <Ticket size={17} color="#FFE082" />
            <div>
              <div style={{ fontSize:'8px', color:'#BDB7AB', fontWeight:800 }}>召喚札</div>
              <div style={{ color:'#FFE082', fontSize:'19px', lineHeight:1, fontWeight:950 }}>{progress.tickets}</div>
            </div>
          </div>
        </header>

        <section style={{
          position:'relative', minHeight:'250px', overflow:'hidden', borderRadius:'22px',
          border:'1px solid rgba(179,157,219,.38)',
          background:'linear-gradient(115deg,rgba(9,12,21,.98),rgba(28,20,49,.95) 48%,rgba(10,15,27,.98))',
          boxShadow:'0 18px 55px rgba(0,0,0,.48), inset 0 0 55px rgba(126,87,194,.08)',
        }}>
          <img src={IRENA.selectImageSrc ?? IRENA.imageSrc} alt="" style={{
            position:'absolute', right:'-2%', bottom:'-44px', width:'49%', maxWidth:'370px', opacity:.28,
            objectFit:'contain', pointerEvents:'none',
            maskImage:'linear-gradient(to left,black 55%,transparent 100%)',
            WebkitMaskImage:'linear-gradient(to left,black 55%,transparent 100%)',
          }} />

          <div style={{
            position:'absolute', width:'215px', height:'215px', right:'9%', top:'17px', borderRadius:'50%',
            border:'1px solid rgba(179,157,219,.23)', boxShadow:'0 0 80px rgba(126,87,194,.16)',
            animation:'summonPulse 4.2s ease-in-out infinite',
          }} />
          <div style={{
            position:'absolute', width:'145px', height:'145px', right:'13%', top:'52px', borderRadius:'50%',
            border:'1px dashed rgba(255,224,130,.22)', animation:'summonSpin 16s linear infinite',
          }} />

          <div style={{ position:'relative', zIndex:2, width:'65%', minWidth:'280px', padding:'22px 18px' }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:'6px', padding:'5px 8px', borderRadius:'999px',
              background:'rgba(126,87,194,.16)', border:'1px solid rgba(179,157,219,.25)',
              color:'#D1C4E9', fontSize:'9px', fontWeight:900, letterSpacing:'.12em',
            }}>
              <Zap size={12} /> REVEAL YOUR REWARD
            </div>

            <h1 style={{ margin:'14px 0 6px', fontSize:'30px', fontWeight:950 }}>黒翼が報酬を呼び寄せる</h1>
            <p style={{ margin:0, maxWidth:'465px', color:'#AAB6C8', fontSize:'11px', lineHeight:1.7 }}>
              召喚札1枚を使うと報酬が自動で確定し、その結果だけが表示されます。
              重複報酬は黒羽の欠片へ変換されます。
            </p>

            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'14px' }}>
              <div style={miniStatStyle}><Award size={14} color="#B39DDB" /><span>収集 {collectedCount}/{maxCollection}</span></div>
              <div style={miniStatStyle}><Sparkles size={14} color="#FFE082" /><span>{isMilestone ? '今回：SSR候補あり' : '10回目はSSR候補が出現'}</span></div>
            </div>
          </div>
        </section>

        <section style={{ marginTop:'12px', padding:'12px', borderRadius:'15px', border:'1px solid #293653', background:'rgba(12,17,29,.9)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px' }}>
            <div>
              <div style={{ color:'#8EA0BB', fontSize:'9px', fontWeight:800 }}>NEXT SUMMON</div>
              <div style={{ marginTop:'3px', fontSize:'14px', fontWeight:900 }}>
                {isMilestone ? '10回目：特別報酬を確定' : '召喚すると報酬が自動で確定'}
              </div>
            </div>
            <div style={{ color:'#FFE082', fontSize:'10px', fontWeight:900 }}>残り {progress.tickets} 札</div>
          </div>
        </section>

        <section style={{ marginTop:'12px' }}>
          {revealing ? (
            <div style={{
              minHeight:'220px', borderRadius:'18px', border:'1px solid rgba(206,147,216,.36)',
              background:'radial-gradient(circle,rgba(126,87,194,.18),rgba(7,10,17,.98) 62%)',
              display:'grid', placeItems:'center', position:'relative', overflow:'hidden',
            }}>
              <div style={{
                position:'absolute', width:'100px', height:'100px', borderRadius:'50%',
                border:'1px solid rgba(255,224,130,.45)', boxShadow:'0 0 65px rgba(255,224,130,.16)',
                animation:'summonPulse 1s ease-in-out infinite',
              }} />
              <div style={{ position:'relative', textAlign:'center' }}>
                <div style={{ fontSize:'10px', color:'#FFE082', fontWeight:900, letterSpacing:'.2em' }}>SUMMONING</div>
                <div style={{ marginTop:'6px', fontSize:'28px', fontWeight:950 }}>黒翼展開</div>
              </div>
            </div>
          ) : lastResult ? (
            <section style={{
              minHeight:'220px', borderRadius:'18px', display:'grid', placeItems:'center',
              border:`1px solid ${rarityMeta[lastResult.reward.rarity].border}`,
              background:`linear-gradient(145deg,${rarityMeta[lastResult.reward.rarity].bg},rgba(7,10,17,.96))`,
              boxShadow:`0 10px 40px ${rarityMeta[lastResult.reward.rarity].glow}`,
              position:'relative', overflow:'hidden',
            }}>
              <div style={{ position:'absolute', width:'190px', height:'190px', borderRadius:'50%', border:`1px solid ${rarityMeta[lastResult.reward.rarity].border}`, opacity:.35, animation:'revealFlash 700ms ease-out both' }} />
              <div style={{ position:'relative', textAlign:'center', padding:'22px' }}>
                <div style={{ color:rarityMeta[lastResult.reward.rarity].border, fontSize:'12px', fontWeight:950, letterSpacing:'.16em' }}>
                  {rarityMeta[lastResult.reward.rarity].label}
                </div>
                <div style={{ margin:'14px auto 10px', width:'72px', height:'72px', borderRadius:'50%', border:`1px solid ${rarityMeta[lastResult.reward.rarity].border}`, background:'rgba(4,7,13,.5)', display:'grid', placeItems:'center', color:rarityMeta[lastResult.reward.rarity].border }}>
                  {rarityMeta[lastResult.reward.rarity].icon}
                </div>
                <div style={{ fontSize:'24px', fontWeight:950 }}>{lastResult.reward.name}</div>
                <div style={{ marginTop:'6px', color:'#AEB9CB', fontSize:'11px' }}>{lastResult.isNew ? 'NEW — コレクション登録' : 'DUPLICATE — 重複変換'}</div>
                <div style={{ marginTop:'12px', display:'inline-flex', padding:'6px 10px', borderRadius:'9px', background:'rgba(4,7,13,.46)', color:'#FFE082', fontSize:'11px', fontWeight:900 }}>
                  +{lastResult.shardGain} 黒羽の欠片
                </div>
                <button
                  type="button"
                  onClick={() => setLastResult(null)}
                  style={{
                    display:'block', margin:'14px auto 0', height:'40px', padding:'0 18px',
                    borderRadius:'10px', border:'1px solid #7E6AA3',
                    background:'rgba(20,15,33,.88)', color:'#FFFFFF',
                    fontSize:'11px', fontWeight:900, cursor:'pointer',
                  }}
                >
                  次の召喚へ
                </button>
              </div>
            </section>
          ) : (
            <div style={{
              minHeight:'220px', borderRadius:'18px',
              border:'1px solid rgba(179,157,219,.34)',
              background:'linear-gradient(145deg,rgba(18,15,31,.92),rgba(7,10,17,.98))',
              display:'grid', placeItems:'center', padding:'18px',
            }}>
              <button
                type="button"
                disabled={progress.tickets < 1}
                onClick={handleRecruit}
                style={{
                  width:'min(100%,430px)', minHeight:'112px', borderRadius:'18px',
                  border:'1px solid rgba(255,213,79,.58)',
                  background:'radial-gradient(circle at 50% 35%,rgba(126,87,194,.26),rgba(10,12,20,.98) 67%)',
                  color:'#FFFFFF', cursor:progress.tickets < 1 ? 'not-allowed' : 'pointer',
                  opacity:progress.tickets < 1 ? .46 : 1,
                  boxShadow:'0 0 45px rgba(126,87,194,.16), inset 0 0 35px rgba(255,255,255,.025)',
                  position:'relative', overflow:'hidden',
                }}
              >
                <span style={{ position:'relative', zIndex:1, display:'block', color:'#FFE082', fontSize:'10px', fontWeight:950, letterSpacing:'.18em' }}>
                  {progress.tickets < 1 ? '召喚札がありません' : 'BLACK WING SUMMON'}
                </span>
                <span style={{ position:'relative', zIndex:1, display:'block', marginTop:'8px', fontSize:'24px', fontWeight:950 }}>
                  {progress.tickets < 1 ? '戦闘で召喚札を獲得' : '召喚する'}
                </span>
                <span style={{ position:'relative', zIndex:1, display:'block', marginTop:'6px', color:'#9FAABE', fontSize:'10px' }}>
                  引いた時点で報酬が自動確定
                </span>
              </button>
            </div>
          )}
        </section>

        <section style={{ marginTop:'18px', padding:'12px', borderRadius:'15px', border:'1px solid #293653', background:'rgba(8,12,21,.78)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'7px', color:'#D1C4E9', fontSize:'11px', fontWeight:900 }}>
            <Gift size={14} /> 召喚のルール
          </div>
          <div style={{ marginTop:'7px', color:'#9EABBF', fontSize:'10px', lineHeight:1.7 }}>
            召喚は無料のゲーム内札のみを使用します。プレイヤーが報酬を選ぶのではなく、召喚時に報酬が自動確定して結果を表示します。
            10回目にはSSR報酬を確定します。戦闘終了時に召喚札を1枚獲得します。
          </div>
        </section>
      </div>
    </div>
  );
};

const miniStatStyle: React.CSSProperties = {
  display:'inline-flex', alignItems:'center', gap:'6px', padding:'6px 8px',
  borderRadius:'9px', background:'rgba(9,13,22,.72)', border:'1px solid rgba(179,157,219,.18)',
  color:'#B6C0D1', fontSize:'9px', fontWeight:850,
};

