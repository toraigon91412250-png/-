import React, { useState } from 'react';
import { ArrowLeft, Check, LockKeyhole, X } from 'lucide-react';
import type { AbilityProgress, ResonanceAbilityId, ResonanceProgress } from '../types/game';
import { CRAFTABLE_RESONANCE_ABILITY_IDS, getResonanceCraftEligibility, getResonanceSourceConsumer, RESONANCE_DEFINITIONS, type ResonanceCraftEligibility } from '../data/resonanceAbilities';
import { ABILITY_DEFINITIONS } from '../data/abilities';

interface ResonanceScreenProps {
  abilityProgress: AbilityProgress;
  resonanceProgress: ResonanceProgress;
  message: string | null;
  onCombine: (id: ResonanceAbilityId) => void;
  onUpgrade: (id: ResonanceAbilityId) => void;
  onBack: () => void;
}

export const ResonanceScreen: React.FC<ResonanceScreenProps> = ({
  abilityProgress,
  resonanceProgress,
  message,
  onCombine,
  onUpgrade,
  onBack,
}) => {
  const [pendingRecipe, setPendingRecipe] = useState<ResonanceAbilityId | null>(null);
  const pending = RESONANCE_DEFINITIONS.find(definition => definition.id === pendingRecipe) ?? null;
  const sourceName = (id: string) => ABILITY_DEFINITIONS.find(ability => ability.id === id)?.name ?? id;
  const getCraftButtonLabel = (eligibility: ResonanceCraftEligibility): string => {
    if (eligibility.canCombine) return '合成を確認';
    switch (eligibility.reason) {
      case 'UNKNOWN_RECIPE': return '不明なレシピ';
      case 'NOT_CRAFTABLE': return '合成対象外';
      case 'SYSTEM_LOCKED': return '未解放';
      case 'RECIPE_ALREADY_CREATED': return '作成済み';
      case 'ALREADY_OWNED': return '所持済み';
      case 'SOURCE_MISSING': return '元権能を未所持';
      case 'SOURCE_LEVEL_REQUIRED': return '素材のLv.5が必要';
      case 'SOURCE_CONSUMED': {
        const source = sourceName(eligibility.sourceAbilityId ?? '');
        const consumer = RESONANCE_DEFINITIONS.find(definition => definition.id === eligibility.consumedBy);
        return consumer ? `${source}は${consumer.name}で消費済み` : '素材消費済み';
      }
    }
  };

  return (
    <main style={{ minHeight: '100%', height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '20px 14px 36px', background: 'radial-gradient(ellipse at top, #202044 0%, #0b0d18 48%, #080a12 100%)', color: '#f8fafc' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 12px', marginBottom: 16, borderRadius: 10, border: '1px solid #39415b', background: '#151a2a', color: '#e2e8f0', fontWeight: 800 }}>
          <ArrowLeft size={17} /> 強化へ戻る
        </button>
        <header style={{ padding: 18, borderRadius: 18, border: '1px solid rgba(167,139,250,.5)', background: 'linear-gradient(135deg, rgba(43,32,78,.94), rgba(15,20,38,.96))' }}>
          <p style={{ margin: 0, color: '#c4b5fd', fontSize: 10, letterSpacing: '.22em', fontWeight: 900 }}>AUTHORITY RESONANCE</p>
          <h1 style={{ margin: '5px 0 7px', fontSize: 28, fontWeight: 950 }}>権能共鳴</h1>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 }}>
            通常合成の対象は5種。Lv.5の元権能2つを合成し、専用能力を持つ共鳴権能を獲得する。残る5種も全機能開放・開発者テストでは使用できる。
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            <span style={{ padding: '8px 11px', borderRadius: 10, background: '#14172a', border: '1px solid #45436a', fontSize: 12, fontWeight: 850 }}>
              共鳴片：{resonanceProgress.shards.toLocaleString('ja-JP')} 個
            </span>
            <span style={{ padding: '8px 11px', borderRadius: 10, background: '#14172a', border: '1px solid #45436a', fontSize: 12, fontWeight: 850 }}>
              作成済み：{CRAFTABLE_RESONANCE_ABILITY_IDS.filter(id => resonanceProgress.craftedRecipes.includes(id)).length}/5
            </span>
            <span style={{ padding: '8px 11px', borderRadius: 10, background: '#14172a', border: '1px solid #45436a', fontSize: 12, fontWeight: 850 }}>
              解放状態：{resonanceProgress.unlocked ? '解放済み' : '未解放'}
            </span>
          </div>
        </header>

        <section role="note" style={{ marginTop: 14, padding: 14, borderRadius: 14, background: 'rgba(120,53,15,.20)', border: '1px solid rgba(251,191,36,.35)' }}>
          <strong style={{ color: '#fde68a', fontSize: 13 }}>合成は不可逆の選択</strong>
          <p style={{ margin: '7px 0 0', color: '#e2e8f0', fontSize: 12, lineHeight: 1.7 }}>
            素材の元権能2種は消費され、未使用の元権能の欠片は共鳴片へ変換されます。消費した元権能を使う別レシピも、通常プレイでは素材を取り戻せないため合成できなくなります。
          </p>
          <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: 11, lineHeight: 1.65 }}>
            5種は選択肢であり、全部を一度に作る設計ではありません。現在のレシピ構成では、素材が重ならない組み合わせを選んで最大2種まで作れます。
          </p>
        </section>

        {!resonanceProgress.unlocked && (
          <section role="status" style={{ marginTop: 14, padding: 15, borderRadius: 14, background: 'rgba(120,53,15,.24)', border: '1px solid rgba(251,191,36,.42)' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LockKeyhole size={18} /> 解放条件：通常カイザー Lv.50 に勝利</strong>
            <p style={{ margin: '7px 0 0', color: '#fde68a', fontSize: 12, lineHeight: 1.6 }}>Lv.50戦を開始しただけでは解放されない。EXカイザーや別モードでの勝利も対象外。</p>
          </section>
        )}

        {message && <p role="status" aria-live="polite" style={{ padding: 12, borderRadius: 10, background: '#121a2b', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13 }}>{message}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: 12, marginTop: 16 }}>
          {RESONANCE_DEFINITIONS.map(definition => {
            const level = resonanceProgress.levels[definition.id] ?? 0;
            const created = resonanceProgress.craftedRecipes.includes(definition.id);
            const eligibility = getResonanceCraftEligibility(definition.id, abilityProgress, resonanceProgress);
            const available = eligibility.canCombine;
            const ingredients = definition.ingredients;
            const nextCost = level >= 5 ? null : level * 40;
            return (
              <article key={definition.id} style={{ padding: 15, borderRadius: 16, border: created ? '1px solid #6d5bd0' : '1px solid #30394f', background: created ? 'linear-gradient(145deg, rgba(54,43,97,.55), rgba(15,20,34,.96))' : 'rgba(14,19,32,.95)' }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: 10 }}>
                  <span aria-hidden="true" style={{ width: 42, height: 42, flex: '0 0 42px', display: 'grid', placeItems: 'center', borderRadius: 12, background: '#292447', color: '#ddd6fe', fontSize: 24 }}>{definition.symbol}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>{definition.name}</h2>
                      {created && <span style={{ fontSize: 10, fontWeight: 900, color: '#c4b5fd', border: '1px solid #6d5bd0', borderRadius: 99, padding: '3px 7px' }}>作成済み</span>}
                    </div>
                    <p style={{ margin: '4px 0 0', color: '#a5b4fc', fontSize: 11 }}>{sourceName(ingredients[0])} ＋ {sourceName(ingredients[1])}</p>
                  </div>
                </div>
                <p style={{ margin: '12px 0', minHeight: 40, color: '#cbd5e1', fontSize: 12, lineHeight: 1.65 }}>{definition.shortDescription}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ingredients.map(ingredient => {
                    const sourceLevel = abilityProgress.levels[ingredient] ?? 0;
                    const consumedBy = level <= 0 && sourceLevel <= 0
                      ? getResonanceSourceConsumer(ingredient, resonanceProgress, definition.id)
                      : null;
                    return (
                      <div key={ingredient} style={{ padding: 9, borderRadius: 9, background: '#0a0f1d', border: '1px solid #263146' }}>
                        <small style={{ display: 'block', color: '#94a3b8', fontSize: 10 }}>{sourceName(ingredient)}</small>
                        <strong style={{ display: 'block', fontSize: 13 }}>{consumedBy ? '消費済み' : `Lv.${sourceLevel}/5`}</strong>
                        {consumedBy && <small style={{ display: 'block', marginTop: 3, color: '#fca5a5', fontSize: 9, lineHeight: 1.4 }}>「{consumedBy.name}」の合成で消費</small>}
                        {!consumedBy && sourceLevel <= 0 && <small style={{ display: 'block', marginTop: 3, color: '#94a3b8', fontSize: 9 }}>未所持</small>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: '#0a0f1d' }}>
                  <strong style={{ fontSize: 13 }}>共鳴Lv.{level > 0 ? level : '—'} {level >= 5 ? '· MAX' : ''}</strong>
                  {level > 0 && <p style={{ margin: '5px 0 0', color: '#cbd5e1', fontSize: 11 }}>次の育成：共鳴片 {nextCost} 個（所持 {resonanceProgress.shards} 個）</p>}
                  {level > 0 && <p style={{ margin: '7px 0 0', fontSize: 11, lineHeight: 1.6, color: '#e2e8f0' }}>{definition.levelDescriptions[level - 1]}</p>}
                  <details style={{ marginTop: 8, color: '#cbd5e1' }}>
                    <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 800, color: '#c4b5fd' }}>Lv.1〜Lv.5の効果一覧</summary>
                    <ol style={{ margin: '8px 0 0', paddingLeft: 19, fontSize: 10, lineHeight: 1.65 }}>
                      {definition.levelDescriptions.map((description, index) => (
                        <li key={index} style={{ marginBottom: 5 }}><strong>Lv.{index + 1}：</strong>{description}</li>
                      ))}
                    </ol>
                  </details>
                </div>
                {level > 0 ? (
                  <button type="button" disabled={level >= 5 || resonanceProgress.shards < (nextCost ?? Infinity)} onClick={() => onUpgrade(definition.id)} style={{ width: '100%', marginTop: 10, minHeight: 40, borderRadius: 10, border: 0, background: level >= 5 || resonanceProgress.shards < (nextCost ?? Infinity) ? '#273044' : 'linear-gradient(90deg,#6d5bd0,#9333ea)', color: level >= 5 || resonanceProgress.shards < (nextCost ?? Infinity) ? '#94a3b8' : '#fff', fontWeight: 900 }}>
                    {level >= 5 ? 'MAX' : resonanceProgress.shards < (nextCost ?? Infinity) ? `共鳴片不足（必要 ${nextCost}）` : `Lv.UP · 共鳴片 ${nextCost}`}
                  </button>
                ) : (
                  <button type="button" disabled={!available} onClick={() => setPendingRecipe(definition.id)} style={{ width: '100%', marginTop: 10, minHeight: 40, borderRadius: 10, border: '1px solid #6656b6', background: available ? 'linear-gradient(90deg,#6d5bd0,#9333ea)' : '#20283a', color: available ? '#fff' : '#94a3b8', fontWeight: 900 }}>
                    {getCraftButtonLabel(eligibility)}
                  </button>
                )}
              </article>
            );
          })}
        </div>

        {pending && (
          <div role="dialog" aria-modal="true" aria-labelledby="resonance-confirm-title" style={{ position: 'fixed', zIndex: 1000, inset: 0, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(2,6,23,.82)' }}>
            <section style={{ width: '100%', maxWidth: 520, maxHeight: '90%', overflowY: 'auto', padding: 18, borderRadius: 18, border: '1px solid #8174d2', background: '#101527', boxShadow: '0 20px 80px rgba(0,0,0,.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <h2 id="resonance-confirm-title" style={{ margin: 0, fontSize: 21 }}>合成の最終確認</h2>
                <button type="button" onClick={() => setPendingRecipe(null)} aria-label="キャンセル" style={{ border: 0, background: 'transparent', color: '#cbd5e1' }}><X size={21} /></button>
              </div>
              <p style={{ color: '#ddd6fe', fontWeight: 900, fontSize: 18 }}>{pending.name} {pending.symbol}</p>
              <div style={{ padding: 12, background: '#090e1b', borderRadius: 12, lineHeight: 1.8, fontSize: 13 }}>
                <p style={{ margin: 0 }}>消費：{sourceName(pending.ingredients[0])} Lv.5、{sourceName(pending.ingredients[1])} Lv.5</p>
                <p style={{ margin: 0 }}>獲得：{pending.name} Lv.1</p>
                <p style={{ margin: 0 }}>共鳴片に変換：{pending.ingredients.reduce((sum, id) => sum + abilityProgress.shards[id], 0)} 個（未使用欠片を1:1）</p>
                <p style={{ margin: 0 }}>合成コスト：追加の共鳴片は不要</p>
              </div>
              <p style={{ color: '#fca5a5', fontSize: 12, lineHeight: 1.7 }}>確定すると元権能2種類は消費され、元権能の欠片は共鳴片に変換されます。消費した元権能を使う別レシピも合成できなくなり、同じレシピも再合成できません。通常プレイでは取り消せません。キャンセルすれば所持状態は変わりません。</p>
              <p style={{ color: '#e2e8f0', fontSize: 12, lineHeight: 1.7 }}>能力：{pending.shortDescription}</p>
              <p style={{ color: '#cbd5e1', fontSize: 11, lineHeight: 1.7 }}>Lv.1：{pending.levelDescriptions[0]}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button type="button" onClick={() => setPendingRecipe(null)} style={{ flex: 1, minHeight: 42, borderRadius: 10, border: '1px solid #45516a', background: '#192135', color: '#e2e8f0', fontWeight: 850 }}>キャンセル</button>
                <button type="button" onClick={() => { onCombine(pending.id); setPendingRecipe(null); }} style={{ flex: 1, minHeight: 42, borderRadius: 10, border: 0, background: 'linear-gradient(90deg,#6d5bd0,#9333ea)', color: '#fff', fontWeight: 950 }}><Check size={15} style={{ display: 'inline', marginRight: 5 }} />合成を確定</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export default ResonanceScreen;
