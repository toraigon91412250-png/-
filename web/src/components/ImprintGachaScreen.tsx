import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Gem, LockKeyhole, Sparkles } from 'lucide-react';
import type { ImprintProgress, RaidRewardProgress } from '../types/game';
import { IMPRINT_DEFINITIONS } from '../data/imprints';
import type { ImprintDefinition } from '../data/imprints';
import type { ImprintGachaDrawResult } from '../utils/storage';

interface ImprintGachaScreenProps {
  progress: ImprintProgress;
  raidRewardProgress: RaidRewardProgress;
  message: string | null;
  onDraw: () => ImprintGachaDrawResult;
  onBack: () => void;
}

export const ImprintGachaScreen: React.FC<ImprintGachaScreenProps> = ({
  progress,
  raidRewardProgress,
  message,
  onDraw,
  onBack,
}) => {
  const [lastDrawn, setLastDrawn] = useState<ImprintDefinition | null>(null);
  const ownedCount = IMPRINT_DEFINITIONS.filter(item => progress.unlockedIds.includes(item.id)).length;
  const allCollected = ownedCount >= IMPRINT_DEFINITIONS.length;

  const handleDraw = () => {
    const result = onDraw();
    setLastDrawn(result.status === 'DRAWN' ? result.imprint : null);
  };

  return (
    <main style={{
      width: '100%', height: '100%', boxSizing: 'border-box', overflowY: 'auto',
      padding: '18px 14px 30px', color: '#F3F8FF',
      background: 'radial-gradient(ellipse at top, #25183F 0%, #0A0D16 64%)',
    }}>
      <div style={{ maxWidth: '720px', width: '100%', margin: '0 auto' }}>
        <button type="button" onClick={onBack} aria-label="本編に戻る" style={{
          minHeight: '40px', padding: '8px 12px', marginBottom: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '10px',
          border: '1px solid #374151', background: 'rgba(17, 24, 39, 0.92)',
          color: '#D1D5DB', fontWeight: 800, cursor: 'pointer',
        }}><ArrowLeft size={17} /> 戻る</button>

        <header style={{
          padding: '18px', marginBottom: '14px', borderRadius: '16px',
          border: '1px solid rgba(179,157,219,0.55)',
          background: 'linear-gradient(135deg, rgba(41,24,69,0.98), rgba(20,25,49,0.98))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D4C5FF', fontSize: '10px', fontWeight: 900, letterSpacing: '0.18em' }}>
            <Sparkles size={16} /> ABYSS IMPRINT SUMMON
          </div>
          <h1 style={{ margin: '5px 0', fontSize: '27px', fontWeight: 950 }}>刻印ガチャ</h1>
          <p style={{ margin: 0, color: '#C1BCD7', fontSize: '12px', lineHeight: 1.7 }}>
            レイド勝利で手に入る専用チケットを1枚使い、未所持の刻印を1つ獲得します。所持済みの刻印は抽選されません。
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginTop: '15px' }}>
            <div style={{ padding: '11px', borderRadius: '11px', background: 'rgba(8,10,22,0.55)', border: '1px solid rgba(179,157,219,0.22)' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#ABA6C8' }}>刻印ガチャチケット</div>
              <div aria-label={`刻印ガチャチケットの所持数 ${raidRewardProgress.imprintTickets}`} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '3px', fontSize: '25px', fontWeight: 950, color: '#E8DFFF' }}>
                <Gem size={20} /> {raidRewardProgress.imprintTickets}
              </div>
            </div>
            <div style={{ padding: '11px', borderRadius: '11px', background: 'rgba(8,10,22,0.55)', border: '1px solid rgba(179,157,219,0.22)' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#ABA6C8' }}>刻印の収集状況</div>
              <div style={{ marginTop: '3px', fontSize: '25px', fontWeight: 950, color: '#FFFFFF' }}>{ownedCount}<span style={{ fontSize: '13px', color: '#ABA6C8' }}> / {IMPRINT_DEFINITIONS.length}</span></div>
            </div>
          </div>
        </header>

        {message && <p role="status" aria-live="polite" style={{
          margin: '0 0 12px', padding: '10px 12px', borderRadius: '10px',
          border: '1px solid rgba(179,157,219,0.32)', background: 'rgba(126,87,194,0.12)',
          color: '#E5DCFF', fontSize: '12px', lineHeight: 1.6,
        }}>{message}</p>}

        {lastDrawn && (
          <section aria-label="今回獲得した刻印" style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '15px',
            marginBottom: '14px', borderRadius: '14px', border: '1px solid rgba(129,230,223,0.65)',
            background: 'linear-gradient(135deg, rgba(12,50,55,0.96), rgba(19,28,45,0.98))',
          }}>
            <div style={{ width: '52px', height: '52px', display: 'grid', placeItems: 'center', borderRadius: '12px', background: 'rgba(129,230,223,0.12)', fontSize: '27px' }}>{lastDrawn.symbol}</div>
            <div>
              <div style={{ color: '#9FE9DF', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em' }}>NEW IMPRINT ACQUIRED</div>
              <h2 style={{ margin: '3px 0', fontSize: '22px', fontWeight: 950 }}>{lastDrawn.name}</h2>
              <p style={{ margin: 0, color: '#C6D5E3', fontSize: '12px', lineHeight: 1.5 }}>{lastDrawn.description}</p>
            </div>
          </section>
        )}

        <button
          type="button"
          aria-label="刻印を1回引く"
          disabled={raidRewardProgress.imprintTickets < 1 || allCollected}
          onClick={handleDraw}
          style={{
            width: '100%', minHeight: '54px', marginBottom: '15px', borderRadius: '12px',
            border: '1px solid rgba(220,202,255,0.7)',
            background: raidRewardProgress.imprintTickets > 0 && !allCollected ? 'linear-gradient(90deg, #673AB7, #3949AB)' : 'rgba(37,39,54,0.8)',
            color: raidRewardProgress.imprintTickets > 0 && !allCollected ? '#FFFFFF' : '#8B90A4',
            fontSize: '15px', fontWeight: 950,
            cursor: raidRewardProgress.imprintTickets > 0 && !allCollected ? 'pointer' : 'not-allowed',
          }}
        >
          {allCollected ? 'すべての刻印を獲得済み' : raidRewardProgress.imprintTickets > 0 ? '刻印を1回引く（チケット1枚）' : 'チケットがありません'}
        </button>

        <section aria-label="刻印ガチャの対象一覧" style={{ display: 'grid', gap: '9px' }}>
          {IMPRINT_DEFINITIONS.map(imprint => {
            const owned = progress.unlockedIds.includes(imprint.id);
            return (
              <article key={imprint.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '11px', padding: '12px',
                borderRadius: '12px', border: owned ? '1px solid rgba(129,230,223,0.25)' : '1px solid rgba(179,157,219,0.28)',
                background: owned ? 'rgba(13,34,38,0.7)' : 'rgba(19,20,37,0.82)',
                opacity: owned ? 0.72 : 1,
              }}>
                <div style={{ width: '40px', height: '40px', flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: '10px', background: 'rgba(126,87,194,0.14)', fontSize: '22px' }}>
                  {owned ? <CheckCircle size={21} color="#9FE9DF" /> : imprint.symbol}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'baseline' }}>
                    <strong style={{ fontSize: '15px', fontWeight: 950 }}>{imprint.name}</strong>
                    <span style={{ color: '#9AA6BC', fontSize: '10px' }}>{imprint.category}</span>
                  </div>
                  <p style={{ margin: '4px 0 0', color: '#BFCBDD', fontSize: '11px', lineHeight: 1.55 }}>{imprint.description}</p>
                </div>
                <span style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: '4px', color: owned ? '#9FE9DF' : '#C9BAFF', fontSize: '10px', fontWeight: 900 }}>
                  {owned ? <><CheckCircle size={12} /> 入手済み</> : <><LockKeyhole size={12} /> 抽選対象</>}
                </span>
              </article>
            );
          })}
        </section>

        <p style={{ marginTop: '13px', color: '#918CA8', fontSize: '10px', lineHeight: 1.6 }}>
          ※ 刻印ガチャチケットは通常の黒翼召喚チケットとは別管理です。全種類を獲得すると抽選は終了します。
        </p>
      </div>
    </main>
  );
};

export default ImprintGachaScreen;
