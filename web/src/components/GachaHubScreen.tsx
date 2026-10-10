import React from 'react';
import { ArrowUpRight, Eye, Sparkles, Ticket, WandSparkles } from 'lucide-react';
import { IMPRINT_DEFINITIONS } from '../data/imprints';

interface GachaHubScreenProps {
  imprintTickets: number;
  unlockedImprints: number;
  onOpenRecruitment: () => void;
  onOpenImprintGacha: () => void;
  onOpenImprints: () => void;
}

export const GachaHubScreen: React.FC<GachaHubScreenProps> = ({
  imprintTickets,
  unlockedImprints,
  onOpenRecruitment,
  onOpenImprintGacha,
  onOpenImprints,
}) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(42,34,69,0.56), transparent 58%), #0B0E18',
      color: '#FFFFFF',
      padding: '24px 16px 112px',
      boxSizing: 'border-box',
    }}>
      <main style={{ width: '100%', maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ color: '#B39DDB', fontSize: '10px', fontWeight: 950, letterSpacing: '0.22em' }}>SUMMONS & IMPRINTS</div>
        <h1 style={{ margin: '5px 0 6px', fontSize: '28px', fontWeight: 950 }}>ガチャ</h1>
        <p style={{ margin: 0, color: '#9DA8BE', fontSize: '12px', lineHeight: 1.65 }}>
          権能の獲得・強化と、戦闘中に効果を発揮する刻印をここから管理できます。
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: '12px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onOpenRecruitment}
            aria-label="権能ガチャを開く"
            style={{
              minWidth: 0,
              minHeight: '190px',
              padding: '17px',
              borderRadius: '16px',
              border: '1px solid rgba(179,157,219,0.68)',
              background: 'linear-gradient(145deg, rgba(49,35,77,0.98), rgba(20,20,39,0.98) 68%, rgba(48,36,20,0.95))',
              color: '#FFFFFF',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 10px 26px rgba(0,0,0,0.24)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: '44px', height: '44px', display: 'grid', placeItems: 'center', borderRadius: '12px', border: '1px solid rgba(211,195,255,0.32)', background: 'rgba(179,157,219,0.15)' }}>
                <WandSparkles size={24} color="#D9C7FF" />
              </div>
              <ArrowUpRight size={20} color="#B39DDB" />
            </div>
            <div style={{ marginTop: '18px', fontSize: '18px', fontWeight: 950 }}>黒翼召喚</div>
            <div style={{ marginTop: '6px', color: '#C9C2D8', fontSize: '12px', lineHeight: 1.6 }}>権能本体や強化用の欠片を獲得して、戦闘ビルドを育成。</div>
            <div style={{ marginTop: '12px', color: '#FFE082', fontSize: '10px', fontWeight: 900, letterSpacing: '0.06em' }}>権能・育成素材</div>
          </button>

          <button
            type="button"
            onClick={onOpenImprintGacha}
            aria-label="刻印ガチャを開く"
            style={{
              minWidth: 0,
              minHeight: '190px',
              padding: '17px',
              borderRadius: '16px',
              border: '1px solid rgba(102,210,215,0.58)',
              background: 'linear-gradient(145deg, rgba(15,55,65,0.98), rgba(17,25,43,0.98) 68%, rgba(35,27,57,0.95))',
              color: '#FFFFFF',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 10px 26px rgba(0,0,0,0.24)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: '44px', height: '44px', display: 'grid', placeItems: 'center', borderRadius: '12px', border: '1px solid rgba(132,239,231,0.3)', background: 'rgba(70,190,195,0.13)' }}>
                <Sparkles size={24} color="#9FE9DF" />
              </div>
              <ArrowUpRight size={20} color="#81E6DF" />
            </div>
            <div style={{ marginTop: '18px', fontSize: '18px', fontWeight: 950 }}>刻印ガチャ</div>
            <div style={{ marginTop: '6px', color: '#B8D7DF', fontSize: '12px', lineHeight: 1.6 }}>レイドで手に入るチケットを使って、新しい刻印を獲得。</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '12px', color: '#AFFFF4', fontSize: '10px', fontWeight: 900 }}>
              <Ticket size={14} /> チケット {imprintTickets} 枚
              <span style={{ marginLeft: 'auto', color: '#C4D5E0' }}>{unlockedImprints}/{IMPRINT_DEFINITIONS.length} 解放</span>
            </div>
          </button>
        </div>

        <section style={{ marginTop: '14px', padding: '14px', borderRadius: '14px', border: '1px solid #303A51', background: 'rgba(17,23,37,0.92)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: 'rgba(70,190,195,0.1)', border: '1px solid rgba(102,210,215,0.28)' }}>
              <Eye size={20} color="#9FE9DF" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 900 }}>刻印管理</div>
              <div style={{ marginTop: '3px', fontSize: '11px', color: '#9DA8BE', lineHeight: 1.5 }}>所持している刻印を3枠に装備・解除できます。</div>
            </div>
            <button
              type="button"
              onClick={onOpenImprints}
              aria-label="刻印を管理"
              style={{ minHeight: '38px', padding: '8px 10px', borderRadius: '9px', border: '1px solid #4BA8B4', background: 'rgba(16,44,60,0.92)', color: '#DFFFFB', fontSize: '11px', fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer' }}
            >
              管理する
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
