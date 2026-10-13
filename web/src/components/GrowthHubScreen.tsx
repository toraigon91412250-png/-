import React, { useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Crown,
  Gem,
  Shield,
  Sparkles,
  Target,
  Ticket,
  Zap,
} from 'lucide-react';
import type {
  AbilityId,
  AbilityProgress,
  IrenaSkillId,
  IrenaSkillProgress,
  ImprintProgress,
  RaidRewardProgress,
  FeatherSkillPath,
  RuinSkillPath,
} from '../types/game';
import { getIrenaWithSkillProgress } from '../data/characters';
import { getAvailableIrenaTalentPoints, getIrenaLevelProgress } from '../utils/irenaTalentSystem';
import type { IrenaTalentProgress } from '../utils/irenaTalentSystem';
import SkillUpgradeModal from './SkillUpgradeModal';
import AbilityUpgradePanel from './AbilityUpgradePanel';
import './GrowthHubScreen.css';

interface GrowthHubScreenProps {
  availableStatPoints: number;
  skillProgress: IrenaSkillProgress;
  irenaTalentProgress: IrenaTalentProgress;
  abilityProgress: AbilityProgress;
  imprintProgress: ImprintProgress;
  raidRewardProgress: RaidRewardProgress;
  raidItemMessage: string | null;
  onOpenBattleSetup: () => void;
  onOpenTalentBoard: () => void;
  onUpgradeSkill: (skillId: IrenaSkillId) => void;
  onChooseSkillPath: (skillId: IrenaSkillId, path: FeatherSkillPath | RuinSkillPath) => void;
  onUpgradeAbility: (abilityId: AbilityId) => void;
  onOpenRecruitment: () => void;
  onOpenImprints: () => void;
  onUseRaidCoreFragment: () => void;
}

export const GrowthHubScreen: React.FC<GrowthHubScreenProps> = ({
  availableStatPoints,
  skillProgress,
  irenaTalentProgress,
  abilityProgress,
  imprintProgress,
  raidRewardProgress,
  raidItemMessage,
  onOpenBattleSetup,
  onOpenTalentBoard,
  onUpgradeSkill,
  onChooseSkillPath,
  onUpgradeAbility,
  onOpenRecruitment,
  onOpenImprints,
  onUseRaidCoreFragment,
}) => {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const playerChar = getIrenaWithSkillProgress(skillProgress);
  const talentLevelProgress = getIrenaLevelProgress(irenaTalentProgress.experience);
  const availableTalentPoints = getAvailableIrenaTalentPoints(irenaTalentProgress);
  const unlockedAbilities = Object.values(abilityProgress.levels).filter(level => level > 0).length;
  const equippedCount = imprintProgress.equippedIds.length;

  return (
    <main className="growth-hub">
      <div className="growth-hub__inner">
        <header className="growth-hub__header">
          <span className="growth-hub__brand-mark" aria-hidden="true"><Sparkles size={22} /></span>
          <div className="growth-hub__header-copy">
            <p className="growth-hub__eyebrow">CHARACTER DEVELOPMENT</p>
            <h1>強化</h1>
            <p>育成状況を確認し、次の戦いに向けてビルドを整えよう。</p>
            <div className="growth-hub__header-badges">
              <span><Target size={14} aria-hidden="true" /> 配分上限 {availableStatPoints.toLocaleString('ja-JP')}P</span>
              <span><Sparkles size={14} aria-hidden="true" /> 才能 Lv.{talentLevelProgress.level}</span>
              <span><Crown size={14} aria-hidden="true" /> 権能 {unlockedAbilities}/5</span>
            </div>
          </div>
          <div className="growth-hub__hero-art" aria-hidden="true">
            <span className="growth-hub__hero-rune" />
            <span className="growth-hub__hero-glow" />
            <img src={playerChar.selectImageSrc ?? playerChar.imageSrc} alt="" />
            <span className="growth-hub__hero-character-label">BATTLE BUILD <strong>01</strong></span>
          </div>
        </header>

        <section className="growth-hub__resources" aria-label="育成リソース">
          <div className="growth-hub__resource">
            <span className="growth-hub__resource-icon growth-hub__resource-icon--gold"><Target size={18} /></span>
            <span><small>ステ振り上限</small><strong>{availableStatPoints.toLocaleString('ja-JP')}<em>P</em></strong></span>
          </div>
          <div className="growth-hub__resource">
            <span className="growth-hub__resource-icon growth-hub__resource-icon--purple"><Zap size={18} /></span>
            <span><small>技の欠片</small><strong>{skillProgress.shards.toLocaleString('ja-JP')}<em>個</em></strong></span>
          </div>
          <div className="growth-hub__resource">
            <span className="growth-hub__resource-icon growth-hub__resource-icon--violet"><Crown size={18} /></span>
            <span><small>解放済み権能</small><strong>{unlockedAbilities}<em>/5</em></strong></span>
          </div>
        </section>

        <section className="growth-hub__section" aria-labelledby="growth-character-title">
          <div className="growth-hub__section-heading">
            <div>
              <p className="growth-hub__eyebrow">CHARACTER</p>
              <h2 id="growth-character-title">キャラクター育成</h2>
            </div>
            <span>戦力の土台を整える</span>
          </div>

          <div className="growth-hub__card-list">
            <button className="growth-hub__action growth-hub__action--stats" type="button" onClick={onOpenBattleSetup} aria-label="ステータス配分を開く">
              <span className="growth-hub__action-icon"><Target size={21} /></span>
              <span className="growth-hub__action-copy">
                <strong>ステータス配分</strong>
                <small>HP・攻撃・防御などを振り分け。挑戦レベルと編成も調整。</small>
                <em>配分上限 {availableStatPoints.toLocaleString('ja-JP')}P</em>
              </span>
              <ChevronRight size={19} aria-hidden="true" />
            </button>

            <button className="growth-hub__action growth-hub__action--talent" type="button" onClick={onOpenTalentBoard} aria-label="堕天の才能盤を開く">
              <span className="growth-hub__action-icon"><Sparkles size={21} /></span>
              <span className="growth-hub__action-copy">
                <strong>堕天の才能盤</strong>
                <small>戦闘経験でレベルを上げ、育成ポイントを能力に割り振る。</small>
                <em>Lv.{talentLevelProgress.level}/20 · {availableTalentPoints > 0 ? `未使用 ${availableTalentPoints}P` : '経験値を獲得して成長'}</em>
              </span>
              <ChevronRight size={19} aria-hidden="true" />
            </button>

            <button className="growth-hub__action growth-hub__action--skill" type="button" onClick={() => setUpgradeOpen(true)} aria-label="技の強化を開く">
              <span className="growth-hub__action-icon"><Zap size={21} /></span>
              <span className="growth-hub__action-copy">
                <strong>技の強化</strong>
                <small>羽弾・破壊の権能を強化し、専用ルートを選択する。</small>
                <em>羽弾 Lv.{skillProgress.featherLevel} · 破壊の権能 Lv.{skillProgress.ruinLevel}</em>
              </span>
              <ChevronRight size={19} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="growth-hub__section" aria-labelledby="growth-ability-title">
          <div className="growth-hub__section-heading">
            <div>
              <p className="growth-hub__eyebrow">COMBAT BUILD</p>
              <h2 id="growth-ability-title">権能・戦闘ビルド</h2>
            </div>
            <span>欠片でレベルアップ</span>
          </div>
          <AbilityUpgradePanel progress={abilityProgress} onUpgrade={onUpgradeAbility} />
          <button className="growth-hub__secondary-action" type="button" onClick={onOpenRecruitment}>
            <span><Crown size={18} /> 黒翼召喚で権能・欠片を集める</span>
            <ArrowUpRight size={18} />
          </button>
        </section>

        <section className="growth-hub__section" aria-labelledby="growth-imprint-title">
          <div className="growth-hub__section-heading">
            <div>
              <p className="growth-hub__eyebrow">LOADOUT</p>
              <h2 id="growth-imprint-title">刻印編成</h2>
            </div>
            <span>最大3つまで装備</span>
          </div>
          <div className="growth-hub__imprint-card">
            <span className="growth-hub__imprint-icon"><Shield size={23} /></span>
            <div className="growth-hub__imprint-copy">
              <strong>刻印管理</strong>
              <p>所持している刻印を装備・解除。効果を組み合わせて戦い方を調整します。</p>
              <small>現在 {equippedCount}/3 装備中 · {imprintProgress.unlockedIds.length} 種類を解放</small>
            </div>
            <button type="button" onClick={onOpenImprints}>管理する <ChevronRight size={16} /></button>
          </div>
        </section>

        <section className="growth-hub__section" aria-labelledby="growth-core-title">
          <div className="growth-hub__section-heading">
            <div>
              <p className="growth-hub__eyebrow">RAID REWARD</p>
              <h2 id="growth-core-title">深淵核片</h2>
            </div>
            <span>レイド報酬</span>
          </div>
          <div className="growth-hub__core-card">
            <span className="growth-hub__core-icon"><Gem size={22} /></span>
            <div className="growth-hub__core-copy">
              <strong>ステータス上限を永続強化</strong>
              <p>深淵核片を1個使うと、ステータス配分上限が永続的に+2P。</p>
              <small>所持 {raidRewardProgress.coreFragments} 個 · 累計ボーナス +{raidRewardProgress.bonusStatPoints}P</small>
            </div>
            <button
              type="button"
              onClick={onUseRaidCoreFragment}
              disabled={raidRewardProgress.coreFragments <= 0}
            >
              {raidRewardProgress.coreFragments > 0 ? '1個使う' : '素材不足'}
            </button>
            {raidItemMessage && <p className="growth-hub__core-message" role="status" aria-live="polite">{raidItemMessage}</p>}
          </div>
        </section>

        <aside className="growth-hub__tip">
          <BookOpen size={17} aria-hidden="true" />
          <p><strong>育成の流れ</strong><span>ポイントや欠片を使って強化し、刻印を編成したら「戦闘」から効果を試そう。素材が足りないときはレイドや召喚で集められます。</span></p>
          <span className="growth-hub__tip-resource"><Ticket size={14} aria-hidden="true" /> 素材は各画面で確認</span>
        </aside>
      </div>

      {upgradeOpen && (
        <SkillUpgradeModal
          progress={skillProgress}
          onUpgrade={onUpgradeSkill}
          onChoosePath={onChooseSkillPath}
          onClose={() => setUpgradeOpen(false)}
        />
      )}
    </main>
  );
};

export default GrowthHubScreen;
