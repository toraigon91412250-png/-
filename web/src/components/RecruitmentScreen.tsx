import React, { useState } from 'react';
import { ArrowLeft, Award, Check, Crown, Feather, Gift, Sparkles, Ticket, Zap } from 'lucide-react';
import { IRENA } from '../data/characters';
import {
  RECRUITMENT_REWARD_SEQUENCE,
  RecruitmentDraw,
  RecruitmentRewardDef,
  getRecruitmentCandidates,
} from '../data/recruitment';
import { RecruitmentProgress } from '../types/game';

interface Props {
  progress: RecruitmentProgress;
  onRecruit: (rewardId: string) => RecruitmentDraw | null;
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

  const candidates = getRecruitmentCandidates(progress.totalPulls + 1);
  const collectedCount = progress.collectedIds.length;
  const maxCollection = RECRUITMENT_REWARD_SEQUENCE.length;
  const isMilestone = (progress.totalPulls + 1) % 10 === 0;

  const handleChoose = (rewardId: string) => {
    if (revealing || progress.tickets < 1) return;
    setRevealing(true);
    setLastResult(null);

    window.setTimeout(() => {
      const outcome = onRecruit(rewardId);
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
              <Zap size={12} /> CHOOSE YOUR REWARD
            </div>

            <h1 style={{ margin:'14px 0 6px', fontSize:'30px', fontWeight:950 }}>黒翼が3つの道を示す</h1>
            <p style={{ margin:0, maxWidth:'465px', color:'#AAB6C8', fontSize:'11px', lineHeight:1.7 }}>
              召喚札1枚につき3つの候補から1つを選択。選んだ報酬だけがコレクションに登録されます。
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
              <div style={{ color:'#8EA0BB', fontSize:'9px', fontWeight:800 }}>NEXT CHOICE</div>
              <div style={{ marginTop:'3px', fontSize:'14px', fontWeight:900 }}>
                {isMilestone ? '10回目：SSR候補から選択できます' : '3つの候補から、好きな1つを選択'}
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
              </div>
            </section>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'10px' }}>
              {candidates.map((candidate, index) => (
                <CandidateCard
                  key={candidate.id}
                  reward={candidate}
                  index={index}
                  disabled={progress.tickets < 1}
                  onChoose={handleChoose}
                />
              ))}
            </div>
          )}
        </section>

        <section style={{ marginTop:'18px', padding:'12px', borderRadius:'15px', border:'1px solid #293653', background:'rgba(8,12,21,.78)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'7px', color:'#D1C4E9', fontSize:'11px', fontWeight:900 }}>
            <Gift size={14} /> 召喚のルール
          </div>
          <div style={{ marginTop:'7px', color:'#9EABBF', fontSize:'10px', lineHeight:1.7 }}>
            召喚は無料のゲーム内札のみを使用します。抽選確率はなく、毎回3候補から1つを選択します。
            10回目にはSSR候補が必ず1つ含まれます。戦闘終了時に召喚札を1枚獲得します。
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

const CandidateCard: React.FC<{
  reward: RecruitmentRewardDef;
  index: number;
  disabled: boolean;
  onChoose: (rewardId: string) => void;
}> = ({ reward, index, disabled, onChoose }) => {
  const meta = rarityMeta[reward.rarity];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChoose(reward.id)}
      style={{
        position:'relative', minHeight:'278px', padding:'14px 10px', overflow:'hidden',
        borderRadius:'17px', border:`1px solid ${meta.border}`,
        background:`linear-gradient(145deg,${meta.bg},rgba(8,12,20,.97))`,
        color:'#FFF', cursor:disabled ? 'not-allowed' : 'pointer',
        opacity:disabled ? .48 : 1,
        boxShadow:`0 9px 30px ${meta.glow}, inset 0 0 28px rgba(255,255,255,.025)`,
        animation:'candidateIn 430ms cubic-bezier(.18,.82,.27,1) both',
        animationDelay:`${index * 85}ms`,
        textAlign:'center',
      }}
    >
      <div style={{ position:'absolute', top:0, left:'-30%', width:'27%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent)', animation:'shineSweep 900ms ease-out 120ms both', pointerEvents:'none' }} />
      <div style={{ color:meta.border, fontSize:'9px', fontWeight:950, letterSpacing:'.1em' }}>{meta.label}</div>
      <div style={{ margin:'16px auto 12px', width:'72px', height:'72px', borderRadius:'50%', border:`1px solid ${meta.border}`, background:'rgba(4,7,13,.52)', boxShadow:`0 0 30px ${meta.glow}`, display:'grid', placeItems:'center', color:meta.border }}>
        {meta.icon}
      </div>
      <div style={{ fontSize:'17px', fontWeight:950, lineHeight:1.2 }}>{reward.name}</div>
      <div style={{ marginTop:'7px', minHeight:'52px', color:'#AEB9CB', fontSize:'9px', lineHeight:1.55 }}>{reward.description}</div>
      <div style={{ marginTop:'11px', display:'inline-flex', padding:'5px 8px', borderRadius:'8px', background:'rgba(4,7,13,.46)', color:'#FFE082', fontSize:'9px', fontWeight:900 }}>
        選択で +{reward.shards} 欠片
      </div>
      <div style={{ marginTop:'9px', fontSize:'9px', color:'#D1C4E9', fontWeight:850 }}>この報酬を選ぶ</div>
    </button>
  );
};
