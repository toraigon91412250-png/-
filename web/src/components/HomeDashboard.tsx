import React, { useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Crown,
  Gem,
  Shield,
  Sparkles,
  Swords,
  Target,
  Ticket,
  Trophy,
  Zap,
} from 'lucide-react';
import type {
  AbilityProgress,
  BattleChallengeLevel,
  ImprintProgress,
  IrenaSkillId,
  IrenaSkillProgress,
  OverallStats,
  RaidRewardProgress,
  RecruitmentProgress,
  FeatherSkillPath,
  RuinSkillPath,
} from '../types/game';
import { getIrenaWithSkillProgress } from '../data/characters';
import { IMPRINT_DEFINITIONS, MAX_EQUIPPED_IMPRINTS } from '../data/imprints';
import { applyIrenaTalentModifiers, getAvailableIrenaTalentPoints, getIrenaLevelProgress } from '../utils/irenaTalentSystem';
import type { IrenaTalentProgress } from '../utils/irenaTalentSystem';
import SkillUpgradeModal from './SkillUpgradeModal';
import './HomeDashboard.css';

interface HomeDashboardProps {
  overallStats: OverallStats;
  onStartBattle: () => void;
  skillProgress: IrenaSkillProgress;
  raidRewardProgress: RaidRewardProgress;
  raidItemMessage: string | null;
  onUseRaidCoreFragment: () => void;
  onUpgradeSkill: (skillId: IrenaSkillId) => void;
  onChooseSkillPath: (skillId: IrenaSkillId, path: FeatherSkillPath | RuinSkillPath) => void;
  irenaTalentProgress: IrenaTalentProgress;
  onOpenTalentBoard: () => void;
  onOpenGacha: () => void;
  onOpenImprints: () => void;
  onOpenRaid: () => void;
  unlockedKaiserLevel: BattleChallengeLevel;
  availableStatPoints: number;
  abilityProgress: AbilityProgress;
  imprintProgress: ImprintProgress;
  recruitmentProgress: RecruitmentProgress;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  overallStats,
  onStartBattle,
  skillProgress,
  raidRewardProgress,
  raidItemMessage,
  onUseRaidCoreFragment,
  onUpgradeSkill,
  onChooseSkillPath,
  irenaTalentProgress,
  onOpenTalentBoard,
  onOpenGacha,
  onOpenImprints,
  onOpenRaid,
  unlockedKaiserLevel,
  availableStatPoints,
  abilityProgress,
  imprintProgress,
  recruitmentProgress,
}) => {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const playerChar = applyIrenaTalentModifiers(getIrenaWithSkillProgress(skillProgress), irenaTalentProgress);
  const talentLevelProgress = getIrenaLevelProgress(irenaTalentProgress.experience);
  const availableTalentPoints = getAvailableIrenaTalentPoints(irenaTalentProgress);
  const winRate = overallStats.totalBattles > 0
    ? Math.round((overallStats.wins / overallStats.totalBattles) * 100)
    : 0;
  const unlockedAbilities = Object.values(abilityProgress.levels).filter(level => level > 0).length;
  const challengeProgress = Math.max(0, Math.min(100, unlockedKaiserLevel));
  const equippedCount = imprintProgress.equippedIds.length;
  const equippedLabel = equippedCount + '/' + MAX_EQUIPPED_IMPRINTS;
  const imprintLabel = imprintProgress.unlockedIds.length + '/' + IMPRINT_DEFINITIONS.length;

  return (
    <main className="home-dashboard">
      <div className="home-dashboard__inner">
        <header className="home-dashboard__header">
          <div className="home-dashboard__brand">
            <span className="home-dashboard__brand-mark"><Swords size={20} /></span>
            <div>
              <h1 className="home-dashboard__brand-title">バトルアリーナデュエル</h1>
              <div className="home-dashboard__brand-subtitle">DARKWING · BATTLE & GROWTH</div>
            </div>
          </div>
          <div className="home-dashboard__challenge-chip">
            <span className="home-dashboard__live-dot" />
            挑戦 Lv.{unlockedKaiserLevel}
          </div>
        </header>

        <section className="home-dashboard__hero" aria-labelledby="home-dashboard-title">
          <div className="home-dashboard__hero-art" aria-hidden="true">
            <div className="home-dashboard__hero-orbit" />
            <img src={playerChar.selectImageSrc ?? playerChar.imageSrc} alt="" />
          </div>
          <div className="home-dashboard__hero-copy">
            <div className="home-dashboard__eyebrow"><Crown size={13} /> CURRENT MISSION</div>
            <h2 id="home-dashboard-title">カイザー最終試練</h2>
            <p className="home-dashboard__hero-level">CHALLENGE <strong>Lv.{unlockedKaiserLevel}</strong><span> / 100</span></p>
            <p className="home-dashboard__hero-description">
              今の挑戦を突破して、次の強敵を解放しよう。ステータス・権能・刻印を整えてから出撃。
            </p>
            <div className="home-dashboard__hero-progress" aria-label={'最終試練の進行 ' + challengeProgress + 'パーセント'}>
              <span style={{ width: challengeProgress + '%' }} />
            </div>
            <div className="home-dashboard__hero-actions">
              <button className="home-dashboard__primary-action" type="button" onClick={onStartBattle}>
                <Swords size={18} /> バトル開始 <ArrowUpRight size={16} />
              </button>
              <button className="home-dashboard__secondary-action" type="button" onClick={onOpenTalentBoard}>
                才能を確認 <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="home-dashboard__hero-foot">
            <span><Shield size={13} /> 1対1 ターン制バトル</span>
            <span><Zap size={13} /> 勝利で次のレベル解放</span>
          </div>
        </section>

        <section className="home-dashboard__resources" aria-label="所持リソース">
          <div className="home-dashboard__resource">
            <span className="home-dashboard__resource-icon home-dashboard__resource-icon--gold"><Target size={16} /></span>
            <span className="home-dashboard__resource-copy"><small>ステ振りポイント</small><strong>{availableStatPoints.toLocaleString('ja-JP')} <em>P</em></strong></span>
          </div>
          <div className="home-dashboard__resource">
            <span className="home-dashboard__resource-icon home-dashboard__resource-icon--purple"><Sparkles size={16} /></span>
            <span className="home-dashboard__resource-copy"><small>技の欠片</small><strong>{skillProgress.shards.toLocaleString('ja-JP')}</strong></span>
          </div>
          <button className="home-dashboard__resource home-dashboard__resource--button" type="button" onClick={onOpenGacha}>
            <span className="home-dashboard__resource-icon home-dashboard__resource-icon--gold"><Ticket size={16} /></span>
            <span className="home-dashboard__resource-copy"><small>召喚チケット</small><strong>{recruitmentProgress.tickets.toLocaleString('ja-JP')}</strong></span>
            <ChevronRight size={15} />
          </button>
          <button className="home-dashboard__resource home-dashboard__resource--button" type="button" onClick={onOpenGacha}>
            <span className="home-dashboard__resource-icon home-dashboard__resource-icon--cyan"><Gem size={16} /></span>
            <span className="home-dashboard__resource-copy"><small>刻印チケット</small><strong>{raidRewardProgress.imprintTickets.toLocaleString('ja-JP')}</strong></span>
            <ChevronRight size={15} />
          </button>
        </section>

        <section className="home-dashboard__section" aria-labelledby="home-growth-title">
          <div className="home-dashboard__section-heading">
            <div>
              <span className="home-dashboard__section-kicker">POWER UP</span>
              <h2 id="home-growth-title">育成・編成</h2>
            </div>
            <span className="home-dashboard__section-note">強化できる場所をひとまとめ</span>
          </div>
          <div className="home-dashboard__growth-grid">
            <button className="home-dashboard__growth-card home-dashboard__growth-card--talent" type="button" aria-label="堕天の才能盤を開く" onClick={onOpenTalentBoard}>
              <span className="home-dashboard__growth-icon"><Sparkles size={20} /></span>
              <span className="home-dashboard__growth-title">才能盤</span>
              <span className="home-dashboard__growth-value">Lv.{talentLevelProgress.level}<small> / 20</small></span>
              <span className="home-dashboard__mini-progress"><span style={{ width: talentLevelProgress.progressPercent + '%' }} /></span>
              <span className="home-dashboard__growth-description">{availableTalentPoints > 0 ? '未使用ポイント ' + availableTalentPoints + 'P' : '戦闘で経験値を獲得'}</span>
              <span className="home-dashboard__card-arrow"><ChevronRight size={16} /></span>
            </button>
            <button className="home-dashboard__growth-card home-dashboard__growth-card--skills" type="button" onClick={() => setUpgradeOpen(true)}>
              <span className="home-dashboard__growth-icon"><Zap size={20} /></span>
              <span className="home-dashboard__growth-title">技の強化</span>
              <span className="home-dashboard__growth-value">羽弾 Lv.{skillProgress.featherLevel}</span>
              <span className="home-dashboard__growth-description">破壊の権能 Lv.{skillProgress.ruinLevel}{skillProgress.superFallenShotUnlocked ? ' · 超堕天撃解放済み' : ''}</span>
              <span className="home-dashboard__growth-tag">{skillProgress.shards > 0 ? '欠片 ' + skillProgress.shards + ' 個' : '強化素材を集めよう'}</span>
              <span className="home-dashboard__card-arrow"><ChevronRight size={16} /></span>
            </button>
            <button className="home-dashboard__growth-card home-dashboard__growth-card--imprints" type="button" onClick={onOpenImprints}>
              <span className="home-dashboard__growth-icon"><Shield size={20} /></span>
              <span className="home-dashboard__growth-title">刻印管理</span>
              <span className="home-dashboard__growth-value">{equippedLabel}<small> 装備中</small></span>
              <span className="home-dashboard__mini-progress"><span style={{ width: (equippedCount / MAX_EQUIPPED_IMPRINTS * 100) + '%' }} /></span>
              <span className="home-dashboard__growth-description">{imprintLabel} 解放済み・組み合わせを調整</span>
              <span className="home-dashboard__card-arrow"><ChevronRight size={16} /></span>
            </button>
          </div>
        </section>

        <section className="home-dashboard__section" aria-labelledby="home-content-title">
          <div className="home-dashboard__section-heading">
            <div>
              <span className="home-dashboard__section-kicker">EXPLORE</span>
              <h2 id="home-content-title">コンテンツ</h2>
            </div>
            <span className="home-dashboard__section-note">強化素材と新しい挑戦</span>
          </div>
          <div className="home-dashboard__content-grid">
            <button className="home-dashboard__content-card home-dashboard__content-card--summon" type="button" onClick={onOpenGacha}>
              <span className="home-dashboard__content-icon"><Crown size={21} /></span>
              <span className="home-dashboard__content-text"><strong>召喚・ガチャ</strong><small>権能と刻印を獲得して戦術を広げる</small></span>
              <span className="home-dashboard__content-count">{recruitmentProgress.tickets} 枚</span>
              <ArrowUpRight size={17} className="home-dashboard__content-arrow" />
            </button>
            <button className="home-dashboard__content-card home-dashboard__content-card--raid" type="button" onClick={onOpenRaid}>
              <span className="home-dashboard__content-icon"><Gem size={21} /></span>
              <span className="home-dashboard__content-text"><strong>深淵レイド</strong><small>勝利報酬で刻印チケット・核片を獲得</small></span>
              <span className="home-dashboard__content-count">{raidRewardProgress.coreFragments} 核片</span>
              <ArrowUpRight size={17} className="home-dashboard__content-arrow" />
            </button>
          </div>
        </section>

        <details className="home-dashboard__core-details" aria-label="レイド限定アイテム">
          <summary>
            <span><Gem size={17} /> 深淵核片・アイテム</span>
            <span>所持 {raidRewardProgress.coreFragments} 個 <ChevronDown size={15} /></span>
          </summary>
          <div className="home-dashboard__core-details-body">
            <div className="home-dashboard__core-summary">
              <span className="home-dashboard__reward-mark"><Gem size={21} /></span>
              <div>
                <span className="home-dashboard__section-kicker">RAID EXCLUSIVE ITEM</span>
                <h2>深淵核片</h2>
                <p>レイド勝利で入手。1個使うとステータス配分上限が永続的に +2P。</p>
              </div>
              <div className="home-dashboard__core-count"><small>累計ボーナス</small><strong>+{raidRewardProgress.bonusStatPoints}P</strong></div>
            </div>
            <button
              type="button"
              className="home-dashboard__core-use"
              onClick={onUseRaidCoreFragment}
              disabled={raidRewardProgress.coreFragments <= 0}
            >
              {raidRewardProgress.coreFragments > 0 ? '深淵核片を使用する（+2P・永続）' : 'レイドをクリアすると入手できます'}
            </button>
            {raidItemMessage && <p className="home-dashboard__core-message" role="status" aria-live="polite">{raidItemMessage}</p>}
          </div>
        </details>
        {raidItemMessage && <p className="home-dashboard__inline-message" role="status" aria-live="polite">{raidItemMessage}</p>}

        <section className="home-dashboard__record" aria-label="通算戦績">
          <div className="home-dashboard__record-title"><Trophy size={18} /><span>通算戦績</span></div>
          <div className="home-dashboard__record-stat"><strong>{overallStats.totalBattles}</strong><small>戦</small></div>
          <div className="home-dashboard__record-stat"><strong>{overallStats.wins}</strong><small>勝利</small></div>
          <div className="home-dashboard__record-stat"><strong>{overallStats.losses}</strong><small>敗北</small></div>
          <div className="home-dashboard__record-rate"><strong>{winRate}%</strong><small>勝率</small></div>
        </section>

        <section className="home-dashboard__footer-note">
          <BookOpen size={15} />
          <span>迷ったら「育成・編成」で準備し、「挑戦の準備をする」からバトルへ。</span>
          <span className="home-dashboard__footer-unlocks">{unlockedAbilities}/5 権能解放</span>
        </section>
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

export default HomeDashboard;
