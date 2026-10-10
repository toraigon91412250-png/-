import React from 'react';
import { ArrowLeft, Eye, LockKeyhole, Plus, X } from 'lucide-react';
import type { ImprintId, ImprintProgress } from '../types/game';
import { IMPRINT_DEFINITIONS, MAX_EQUIPPED_IMPRINTS } from '../data/imprints';

interface ImprintScreenProps {
  progress: ImprintProgress;
  message: string | null;
  onEquip: (id: ImprintId) => void;
  onUnequip: (id: ImprintId) => void;
  onBack: () => void;
}

export const ImprintScreen: React.FC<ImprintScreenProps> = ({ progress, message, onEquip, onUnequip, onBack }) => {
  const equippedCount = progress.equippedIds.length;
  return (
    <main style={{
      width: '100%', height: '100%', boxSizing: 'border-box', overflowY: 'auto',
      padding: '18px 14px 30px', color: '#F3F8FF',
      background: 'radial-gradient(ellipse at top, #172D42 0%, #0A0D16 62%)',
    }}>
      <div style={{ maxWidth: '720px', width: '100%', margin: '0 auto' }}>
        <button type="button" onClick={onBack} aria-label="本編に戻る" style={{
          minHeight: '40px', padding: '8px 12px', marginBottom: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '10px',
          border: '1px solid #374151', background: 'rgba(17, 24, 39, 0.92)',
          color: '#D1D5DB', fontWeight: 800, cursor: 'pointer',
        }}><ArrowLeft size={17} /> 戻る</button>

        <header style={{
          padding: '17px', marginBottom: '14px', borderRadius: '16px',
          border: '1px solid rgba(75,168,180,0.55)',
          background: 'linear-gradient(135deg, rgba(13,35,49,0.97), rgba(18,22,43,0.97))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9FE9DF', fontSize: '10px', fontWeight: 900, letterSpacing: '0.18em' }}>
            <Eye size={16} /> IMPRINT LOADOUT
          </div>
          <h1 style={{ margin: '5px 0', fontSize: '27px', fontWeight: 950 }}>刻印管理</h1>
          <p style={{ margin: 0, color: '#A9BBCB', fontSize: '12px', lineHeight: 1.6 }}>
            権能とは別枠の戦闘パッシブ。最大3つまで装備できます。
          </p>

          <div aria-label="刻印装備状況" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '7px', marginTop: '14px' }}>
            {Array.from({ length: MAX_EQUIPPED_IMPRINTS }, (_, index) => {
              const id = progress.equippedIds[index];
              const imprint = id ? IMPRINT_DEFINITIONS.find(item => item.id === id) : undefined;
              return (
                <div key={index} aria-label={`刻印枠${index + 1}：${imprint?.name ?? '空き'}`} style={{
                  minHeight: '66px', boxSizing: 'border-box', padding: '8px 5px', borderRadius: '10px',
                  border: imprint ? '1px solid rgba(129,230,223,0.7)' : '1px dashed #3B4A5E',
                  background: imprint ? 'rgba(38,166,154,0.12)' : 'rgba(9,13,22,0.52)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '3px',
                }}>
                  <span style={{ fontSize: '9px', color: '#7F98AC', fontWeight: 900 }}>SLOT {index + 1}</span>
                  <strong style={{ fontSize: '11px', color: imprint ? '#C5FFF4' : '#728198' }}>
                    {imprint ? `${imprint.symbol} ${imprint.name}` : '空き'}
                  </strong>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '7px', textAlign: 'right', fontSize: '10px', color: '#9FE9DF', fontWeight: 900 }}>
            {equippedCount}/{MAX_EQUIPPED_IMPRINTS} 装備中
          </div>
        </header>

        {message && <p role="status" aria-live="polite" style={{
          margin: '0 0 12px', padding: '9px 11px', borderRadius: '9px',
          border: '1px solid rgba(129,230,223,0.28)', background: 'rgba(38,166,154,0.08)',
          color: '#B9F5E8', fontSize: '11px',
        }}>{message}</p>}

        <section aria-label="刻印一覧" style={{ display: 'grid', gap: '10px' }}>
          {IMPRINT_DEFINITIONS.map(imprint => {
            const unlocked = progress.unlockedIds.includes(imprint.id);
            const equipped = progress.equippedIds.includes(imprint.id);
            const atCapacity = equippedCount >= MAX_EQUIPPED_IMPRINTS && !equipped;
            return (
              <article key={imprint.id} style={{
                padding: '14px', borderRadius: '14px',
                border: equipped ? '1px solid rgba(129,230,223,0.7)' : '1px solid #2D3B52',
                background: equipped ? 'linear-gradient(135deg, rgba(15,48,54,0.95), rgba(15,21,35,0.98))' : 'rgba(16,22,35,0.94)',
                boxShadow: equipped ? '0 0 20px rgba(38,166,154,0.08)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ width: '42px', height: '42px', flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: '11px', background: 'rgba(38,166,154,0.14)', border: '1px solid rgba(129,230,223,0.26)' }}>
                      <Eye size={21} color="#9FE9DF" />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#8AA5BA', fontWeight: 900, letterSpacing: '0.12em' }}>{imprint.category}</div>
                      <h2 style={{ margin: '3px 0 0', fontSize: '19px', fontWeight: 950 }}>{imprint.symbol} {imprint.name}</h2>
                    </div>
                  </div>
                  <span style={{
                    flex: '0 0 auto', padding: '5px 7px', borderRadius: '7px',
                    background: equipped ? 'rgba(38,166,154,0.15)' : 'rgba(120,144,156,0.1)',
                    color: equipped ? '#9FE9DF' : '#9BA8B9', fontSize: '9px', fontWeight: 900,
                  }}>{equipped ? '装備中' : unlocked ? '解放済み' : '未解放'}</span>
                </div>
                <p style={{ margin: '10px 0 6px', color: '#CAD5E3', fontSize: '12px', lineHeight: 1.6 }}>{imprint.description}</p>
                <div style={{ padding: '9px 10px', marginTop: '8px', borderRadius: '9px', background: 'rgba(5,10,19,0.55)' }}>
                  <div style={{ color: '#9FE9DF', fontSize: '10px', fontWeight: 900 }}>発動条件</div>
                  <div style={{ marginTop: '3px', color: '#CFD9E7', fontSize: '11px', lineHeight: 1.5 }}>{imprint.trigger}</div>
                  <div style={{ marginTop: '8px', color: '#9FE9DF', fontSize: '10px', fontWeight: 900 }}>効果</div>
                  <div style={{ marginTop: '3px', color: '#CFD9E7', fontSize: '11px', lineHeight: 1.5 }}>{imprint.effect}</div>
                  <div style={{ marginTop: '7px', color: '#8498AC', fontSize: '10px', lineHeight: 1.4 }}>{imprint.usageLimit}</div>
                </div>
                {equipped ? (
                  <button type="button" aria-label={`${imprint.name}を解除`} onClick={() => onUnequip(imprint.id)} style={{
                    width: '100%', minHeight: '40px', marginTop: '10px', borderRadius: '9px',
                    border: '1px solid #516073', background: 'rgba(35,45,62,0.8)', color: '#DAE4EF',
                    fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '7px',
                  }}><X size={15} /> 解除</button>
                ) : unlocked ? (
                  <button type="button" aria-label={`${imprint.name}を装備`} disabled={atCapacity} onClick={() => onEquip(imprint.id)} style={{
                    width: '100%', minHeight: '40px', marginTop: '10px', borderRadius: '9px',
                    border: '1px solid rgba(129,230,223,0.68)',
                    background: atCapacity ? 'rgba(31,47,57,0.72)' : 'linear-gradient(90deg, #145566, #187A83)',
                    color: atCapacity ? '#738A96' : '#F1FFFF', fontSize: '12px', fontWeight: 950,
                    cursor: atCapacity ? 'not-allowed' : 'pointer',
                  }}><Plus size={15} style={{ verticalAlign: 'middle', marginRight: '5px' }} />装備</button>
                ) : (
                  <button type="button" disabled style={{
                    width: '100%', minHeight: '40px', marginTop: '10px', borderRadius: '9px',
                    border: '1px solid #343D4D', background: 'rgba(31,37,48,0.72)', color: '#758094',
                    fontSize: '12px', fontWeight: 900, cursor: 'not-allowed',
                  }}><LockKeyhole size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} />未解放</button>
                )}
              </article>
            );
          })}
        </section>
        <div style={{ marginTop: '13px', color: '#7F91A6', fontSize: '10px', lineHeight: 1.5 }}>
          ※ 刻印は権能の装備枠とは別管理です。入手経路と召喚は別段階で実装します。
        </div>
      </div>
    </main>
  );
};

export default ImprintScreen;
