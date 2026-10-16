import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, LockKeyhole, Sparkles, Trophy } from 'lucide-react';
import type { AchievementBoardItem, AchievementCategory } from '../utils/achievementSystem';

interface AchievementScreenProps {
  items: AchievementBoardItem[];
  completedCount: number;
  claimedCount: number;
  astralDominionUnlocked: boolean;
  message: string | null;
  onClaimReward: (id: string) => void;
  onBack: () => void;
}

const CATEGORIES: ReadonlyArray<{ id: AchievementCategory | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'すべて' },
  { id: 'BATTLE', label: '戦闘・戦術' },
  { id: 'KAISER', label: '高難度' },
  { id: 'MASTERY', label: '育成・権能' },
  { id: 'COLLECTION', label: '収集' },
];

const CATEGORY_NAMES: Record<AchievementCategory, string> = {
  BATTLE: '戦闘・戦術',
  KAISER: '高難度',
  MASTERY: '育成・権能',
  COLLECTION: '収集',
};

export const AchievementScreen: React.FC<AchievementScreenProps> = ({
  items,
  completedCount,
  claimedCount,
  astralDominionUnlocked,
  message,
  onClaimReward,
  onBack,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'ALL'>('ALL');
  const visibleItems = selectedCategory === 'ALL'
    ? items
    : items.filter(item => item.category === selectedCategory);

  return (
    <main style={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      boxSizing: 'border-box',
      padding: '18px 13px 34px',
      color: '#F5F2FF',
      background: 'radial-gradient(ellipse at 15% 0%, #292044 0%, #10111D 45%, #090D17 100%)',
    }}>
      <div style={{ maxWidth: 820, width: '100%', margin: '0 auto' }}>
        <button type="button" className="mobile-bottom-return" onClick={onBack} aria-label="ホームに戻る" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 42, padding: '8px 12px',
          border: '1px solid #3C4057', borderRadius: 10, background: 'rgba(20,22,37,.92)',
          color: '#E4E0F7', fontSize: 12, fontWeight: 850, cursor: 'pointer',
        }}><ArrowLeft size={17} /> ホームへ戻る</button>

        <header style={{
          marginTop: 13, padding: '21px 18px', borderRadius: 17,
          border: '1px solid rgba(194,168,255,.33)',
          background: 'radial-gradient(ellipse at 90% 5%, rgba(145,103,219,.19), transparent 50%), linear-gradient(135deg, rgba(31,26,54,.98), rgba(13,18,34,.98))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#CDB7FF', fontSize: 10, fontWeight: 950, letterSpacing: '.17em' }}>
            <Trophy size={16} /> ACHIEVEMENT ARCHIVE
          </div>
          <h1 style={{ margin: '7px 0 4px', fontSize: 'clamp(25px, 5vw, 34px)', fontWeight: 1000 }}>実績記録</h1>
          <p style={{ margin: 0, color: '#BBB8D0', fontSize: 12, lineHeight: 1.65 }}>
            戦闘の腕前、高難度の突破、育成、収集を記録。実績報酬はそれぞれ一度だけ受け取れます。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginTop: 16 }}>
            {[
              { label: '達成', value: completedCount + ' / ' + items.length },
              { label: '報酬受取', value: String(claimedCount) },
              { label: '未達成', value: String(Math.max(0, items.length - completedCount)) },
            ].map(stat => (
              <div key={stat.label} style={{ padding: '10px 8px', borderRadius: 10, background: 'rgba(5,8,18,.45)', border: '1px solid rgba(205,190,245,.12)' }}>
                <div style={{ color: '#AAA5C5', fontSize: 9, fontWeight: 850 }}>{stat.label}</div>
                <strong style={{ display: 'block', marginTop: 4, fontSize: 19, fontWeight: 1000 }}>{stat.value}</strong>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, height: 6, overflow: 'hidden', borderRadius: 99, background: 'rgba(200,187,255,.12)' }} role="progressbar" aria-label="全実績の達成率" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={completedCount}>
            <span style={{ display: 'block', width: (items.length ? completedCount / items.length * 100 : 0) + '%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#8D73D8,#E5C8FF)', transition: 'width .25s ease' }} />
          </div>
        </header>

        <section aria-label="最終報酬" style={{
          display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, padding: 14,
          borderRadius: 14, border: '1px solid rgba(226,195,255,.31)',
          background: astralDominionUnlocked ? 'rgba(66,46,84,.35)' : 'rgba(19,19,35,.78)',
        }}>
          <div style={{ flex: '0 0 auto', width: 43, height: 43, display: 'grid', placeItems: 'center', borderRadius: 12, background: 'rgba(178,139,255,.14)', color: '#E9D8FF' }}>
            {astralDominionUnlocked ? <CheckCircle2 size={24} /> : <LockKeyhole size={23} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#CDB7FF', fontSize: 9, fontWeight: 950, letterSpacing: '.13em' }}>ULTIMATE COMPLETION REWARD</div>
            <strong style={{ display: 'block', marginTop: 3, fontSize: 17, fontWeight: 1000 }}>天星覇権</strong>
            <p style={{ margin: '4px 0 0', color: '#B6B0CC', fontSize: 11, lineHeight: 1.6 }}>
              {astralDominionUnlocked
                ? '全実績達成済み。最強の権能が解放されています。強化メニューから性能を確認できます。'
                : '全実績を埋めると解放。いれーなの全ステータスを大きく伸ばし、特殊技と必殺技も強化する最終報酬。'}
            </p>
          </div>
          <Sparkles size={19} color={astralDominionUnlocked ? '#E1C4FF' : '#70658A'} />
        </section>

        {message && <p role="status" aria-live="polite" style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: 10, border: '1px solid #4B4263', background: 'rgba(42,34,61,.8)', color: '#E4D9FF', fontSize: 11 }}>{message}</p>}

        <nav aria-label="実績カテゴリ" style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '14px 0 10px' }}>
          {CATEGORIES.map(category => {
            const selected = selectedCategory === category.id;
            return (
              <button key={category.id} type="button" aria-pressed={selected} onClick={() => setSelectedCategory(category.id)} style={{
                flex: '0 0 auto', minHeight: 36, padding: '7px 11px', borderRadius: 9,
                border: selected ? '1px solid rgba(218,199,255,.7)' : '1px solid rgba(158,153,190,.18)',
                background: selected ? 'rgba(128,96,185,.32)' : 'rgba(16,19,32,.86)',
                color: selected ? '#F5EBFF' : '#A6A4BE', fontSize: 10, fontWeight: 900, cursor: 'pointer',
              }}>{category.label}</button>
            );
          })}
        </nav>

        <section aria-label="実績一覧" style={{ display: 'grid', gap: 9 }}>
          {visibleItems.map(item => {
            const hidden = Boolean(item.secret && !item.complete);
            const percent = Math.max(0, Math.min(100, item.current / Math.max(1, item.target) * 100));
            return (
              <article key={item.id} data-achievement-id={item.id} style={{
                padding: '13px 13px 12px', borderRadius: 13,
                border: item.complete ? '1px solid rgba(156,218,197,.35)' : '1px solid rgba(151,151,183,.16)',
                background: item.complete ? 'linear-gradient(120deg,rgba(22,48,48,.75),rgba(15,22,34,.92))' : 'rgba(15,19,32,.9)',
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flex: '0 0 auto', width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 10, color: item.complete ? '#BFF7DF' : '#9793B4', background: item.complete ? 'rgba(74,173,133,.14)' : 'rgba(118,116,160,.1)' }}>
                    {item.complete ? <CheckCircle2 size={19} /> : hidden ? <LockKeyhole size={18} /> : <Trophy size={18} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: 13, fontWeight: 950, color: item.complete ? '#E4FFF4' : '#F1EEFC' }}>{hidden ? '？？？' : item.name}</strong>
                      <span style={{ color: '#9C91BC', fontSize: 9, fontWeight: 800 }}>{CATEGORY_NAMES[item.category]}</span>
                      {item.secret && <span style={{ color: '#CEADFF', fontSize: 8, fontWeight: 900 }}>HIDDEN</span>}
                    </div>
                    <p style={{ margin: '4px 0 0', color: hidden ? '#87839A' : '#B2B0C7', fontSize: 10, lineHeight: 1.6 }}>
                      {hidden ? '隠し実績。特別な条件を満たすと内容が明らかになる。' : item.description}
                    </p>
                  </div>
                  <span style={{ flex: '0 0 auto', color: item.claimed ? '#8FE0B8' : item.complete ? '#E6C9FF' : '#9290A7', fontSize: 9, fontWeight: 950 }}>
                    {item.claimed ? '受取済' : item.complete ? '達成' : '挑戦中'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 }}>
                  <span style={{ color: '#AAA5C2', fontSize: 9 }}>進捗 {item.progressLabel}</span>
                  <span style={{ color: '#D5C9F0', fontSize: 10, fontWeight: 900 }}>{hidden ? '？？？' : item.rewardLabel}</span>
                </div>
                <div style={{ height: 4, marginTop: 5, overflow: 'hidden', borderRadius: 99, background: 'rgba(179,166,220,.11)' }}>
                  <span style={{ display: 'block', width: (item.complete ? 100 : percent) + '%', height: '100%', background: item.complete ? '#8FD9B8' : '#9980D5' }} />
                </div>
                <button type="button" disabled={!item.complete || item.claimed || hidden} onClick={() => onClaimReward(item.id)} style={{
                  display: 'block', width: '100%', minHeight: 38, marginTop: 10, borderRadius: 9,
                  border: item.complete && !item.claimed && !hidden ? '1px solid rgba(222,193,255,.45)' : '1px solid rgba(130,130,156,.13)',
                  background: item.complete && !item.claimed && !hidden ? 'linear-gradient(110deg,rgba(111,77,166,.75),rgba(76,62,125,.8))' : 'rgba(18,20,31,.75)',
                  color: item.complete && !item.claimed && !hidden ? '#F9F0FF' : '#77788D',
                  fontSize: 10, fontWeight: 950, cursor: item.complete && !item.claimed && !hidden ? 'pointer' : 'not-allowed',
                }}>{item.claimed ? '報酬受取済み' : hidden ? '条件未公開' : item.complete ? '報酬を受け取る' : '実績を達成して報酬を解放'}</button>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
};

export default AchievementScreen;
