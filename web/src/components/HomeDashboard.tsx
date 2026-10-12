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
  Wrench,
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
  onOpenDeveloperTools: () => void;
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
  onOpenDeveloperTools,
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
  const imprintLabel = imprintProgress.unlockedIds.length + '/' + IMPRINT_DEFINITIONS.length;

  const recommendation = availableTalentPoints > 0
    ? {
        eyebrow: '育成ポイントが使えます',
        title: '才能盤を強化する',
        description: '未使用の才能ポイント ' + availableTalentPoints + 'P。育成を進めて次の挑戦に備えよう。',
        buttonLabel: '才能盤を開く',
        onClick: onOpenTalentBoard,
        icon: <Sparkles size={21} />,
        tone: 'talent',
      }
    : skillProgress.shards > 0
      ? {
          eyebrow: '強化素材を所持',
          title: '技を強化する',
          description: '技の欠片 ' + skillProgress.shards + '個。羽弾や破壊の権能を強化できます。',
          buttonLabel: '技の強化を開く',
          onClick: () => setUpgradeOpen(true),
          icon: <Zap size={21} />,
          tone: 'skill',
        }
      : recruitmentProgress.tickets > 0
        ? {
            eyebrow: '召喚チケットを所持',
            title: '新しい権能を召喚する',
            description: '黒翼召喚チケット ' + recruitmentProgress.tickets + '枚。召喚ハブで所持数を確認できます。',
            buttonLabel: '召喚ハブへ',
            onClick: onOpenGacha,
            icon: <Crown size={21} />,
            tone: 'summon',
          }
        : raidRewardProgress.imprintTickets > 0
          ? {
              eyebrow: '刻印チケットを所持',
              title: '新しい刻印を確認する',
              description: '刻印チケット ' + raidRewardProgress.imprintTickets + '枚。召喚ハブから刻印召喚へ進めます。',
              buttonLabel: '召喚ハブへ',
              onClick: onOpenGacha,
              icon: <Gem size={21} />,
              tone: 'imprint',
            }
          : imprintProgress.unlockedIds.length > equippedCount
            ? {
                eyebrow: '装備を見直せます',
                title: '刻印を編成する',
                description: '所持している刻印を最大3つまで装備できます。今の戦い方に合わせて組み替えよう。',
                buttonLabel: '刻印管理を開く',
                onClick: onOpenImprints,
                icon: <Shield size={21} />,
                tone: 'imprint',
              }
            : null;

  return (
    <main className="home-dashboard">
      <div className="home-dashboard__inner">
        <header className="home-dashboard__header">
          <div className="home-dashboard__brand">
            <span className="home-dashboard__brand-mark" aria-hidden="true"><Swords size={21} /></span>
            <div className="home-dashboard__brand-copy">
              <h1 className="home-dashboard__brand-title">バトルアリーナデュエル</h1>
              <p className="home-dashboard__brand-subtitle">DARKWING · BATTLE & GROWTH</p>
            </div>
          </div>
          <div className="home-dashboard__challenge-chip" aria-label={'挑戦可能レベル Lv.' + unlockedKaiserLevel}>
            <span className="home-dashboard__live-dot" aria-hidden="true" />
            <span>挑戦 Lv.<strong>{unlockedKaiserLevel}</strong></span>
          </div>
        </header>

        <section className="home-dashboard__hero" aria-labelledby="home-dashboard-title">
          <div className="home-dashboard__hero-art" aria-hidden="true">
            <div className="home-dashboard__hero-orbit" />
            <img src={playerChar.selectImageSrc ?? playerChar.imageSrc} alt="" />
          </div>
          <div className="home-dashboard__hero-copy">
            <p className="home-dashboard__eyebrow"><Crown size={13} aria-hidden="true" /> CURRENT CHALLENGE</p>
            <h2 id="home-dashboard-title">カイザー最終試練</h2>
            <p className="home-dashboard__hero-level">
              <span>挑戦可能レベル</span>
              <strong>Lv.{unlockedKaiserLevel}</strong>
              <span className="home-dashboard__hero-level-total">/ 100</span>
            </p>
            <div
              className="home-dashboard__hero-progress"
              role="progressbar"
              aria-label="カイザー最終試練の解放レベル"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={challengeProgress}
            >
              <span style={{ width: challengeProgress + '%' }} />
            </div>
            <p className="home-dashboard__hero-description">
              {unlockedKaiserLevel >= 100
                ? 'Lv.100に挑戦できます。ステータス・権能・刻印を整えて、最終試練へ。'
                : '勝利すると次のレベルが解放されます。育成を整えて、次の強敵へ。'}
            </p>
            <div className="home-dashboard__hero-actions">
              <button
                className="home-dashboard__primary-action"
                type="button"
                aria-label={'バトル開始、カイザー Lv.' + unlockedKaiserLevel + ' に挑戦'}
                onClick={onStartBattle}
              >
                <Swords size={19} aria-hidden="true" />
                <span className="home-dashboard__primary-copy">
                  <strong>バトル開始</strong>
                  <small>カイザー Lv.{unlockedKaiserLevel} に挑戦</small>
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="home-dashboard__hero-foot">
            <span><Shield size={13} aria-hidden="true" /> 1対1 ターン制バトル</span>
            <span><Zap size={13} aria-hidden="true" /> 勝利で次のレベル解放</span>
          </div>
        </section>

        {recommendation ? (
          <section className={'home-dashboard__recommendation home-dashboard__recommendation--' + recommendation.tone} aria-labelledby="home-recommendation-title">
            <div className="home-dashboard__recommendation-symbol" aria-hidden="true">{recommendation.icon}</div>
            <div className="home-dashboard__recommendation-copy">
              <p className="home-dashboard__section-kicker">{recommendation.eyebrow}</p>
              <h2 id="home-recommendation-title">{recommendation.title}</h2>
              <p>{recommendation.description}</p>
            </div>
            <button type="button" className="home-dashboard__recommendation-action" onClick={recommendation.onClick}>
              {recommendation.buttonLabel} <ChevronRight size={17} aria-hidden="true" />
            </button>
          </section>
        ) : (
          <p className="home-dashboard__ready-note">
            <Trophy size={17} aria-hidden="true" />
            <span><strong>育成素材の確認は完了。</strong> 次はカイザーへの挑戦で報酬を集めよう。</span>
          </p>
        )}

        <section className="home-dashboard__section home-dashboard__section--resources" aria-labelledby="home-resource-title">
          <div className="home-dashboard__section-heading">
            <div>
              <p className="home-dashboard__section-kicker">YOUR INVENTORY</p>
              <h2 id="home-resource-title">所持リソース</h2>
            </div>
            <span className="home-dashboard__section-note">現在の所持数</span>
          </div>
          <div className="home-dashboard__resources">
            <div className="home-dashboard__resource">
              <span className="home-dashboard__resource-icon home-dashboard__resource-icon--gold"><Target size={17} aria-hidden="true" /></span>
              <span className="home-dashboard__resource-copy"><small>ステ振り上限</small><strong>{availableStatPoints.toLocaleString('ja-JP')}<em>P</em></strong></span>
            </div>
            <div className="home-dashboard__resource">
              <span className="home-dashboard__resource-icon home-dashboard__resource-icon--purple"><Zap size={17} aria-hidden="true" /></span>
              <span className="home-dashboard__resource-copy"><small>技の欠片</small><strong>{skillProgress.shards.toLocaleString('ja-JP')}<em>個</em></strong></span>
            </div>
            <div className="home-dashboard__resource">
              <span className="home-dashboard__resource-icon home-dashboard__resource-icon--gold"><Ticket size={17} aria-hidden="true" /></span>
              <span className="home-dashboard__resource-copy"><small>召喚チケット</small><strong>{recruitmentProgress.tickets.toLocaleString('ja-JP')}<em>枚</em></strong></span>
            </div>
            <div className="home-dashboard__resource">
              <span className="home-dashboard__resource-icon home-dashboard__resource-icon--cyan"><Gem size={17} aria-hidden="true" /></span>
              <span className="home-dashboard__resource-copy"><small>刻印チケット</small><strong>{raidRewardProgress.imprintTickets.toLocaleString('ja-JP')}<em>枚</em></strong></span>
            </div>
          </div>
        </section>

        <section className="home-dashboard__section" aria-labelledby="home-growth-title">
          <div className="home-dashboard__section-heading">
            <div>
              <p className="home-dashboard__section-kicker">GROWTH & BUILD</p>
              <h2 id="home-growth-title">育成・編成</h2>
            </div>
            <span className="home-dashboard__section-note">準備してから挑戦</span>
          </div>
          <div className="home-dashboard__growth-grid">
            <button className="home-dashboard__action-card home-dashboard__action-card--stats" type="button" aria-label="ステータスを配分する" onClick={onStartBattle}>
              <span className="home-dashboard__action-icon"><Target size={20} aria-hidden="true" /></span>
              <span className="home-dashboard__action-copy">
                <strong>ステータス配分</strong>
                <small>上限 {availableStatPoints.toLocaleString('ja-JP')}P の範囲で振り分け</small>
              </span>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
            <button className="home-dashboard__action-card home-dashboard__action-card--talent" type="button" aria-label="堕天の才能盤を開く" onClick={onOpenTalentBoard}>
              <span className="home-dashboard__action-icon"><Sparkles size={20} aria-hidden="true" /></span>
              <span className="home-dashboard__action-copy">
                <strong>堕天の才能盤</strong>
                <small>Lv.{talentLevelProgress.level} / 20 ・ {availableTalentPoints > 0 ? '未使用 ' + availableTalentPoints + 'P' : '戦闘で経験値を獲得'}</small>
              </span>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
            <button className="home-dashboard__action-card home-dashboard__action-card--skills" type="button" aria-label="技の強化を開く" onClick={() => setUpgradeOpen(true)}>
              <span className="home-dashboard__action-icon"><Zap size={20} aria-hidden="true" /></span>
              <span className="home-dashboard__action-copy">
                <strong>技の強化</strong>
                <small>羽弾 Lv.{skillProgress.featherLevel} ・ 破壊の権能 Lv.{skillProgress.ruinLevel}</small>
              </span>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="home-dashboard__section" aria-labelledby="home-content-title">
          <div className="home-dashboard__section-heading">
            <div>
              <p className="home-dashboard__section-kicker">GAME CONTENTS</p>
              <h2 id="home-content-title">召喚・刻印・レイド</h2>
            </div>
            <span className="home-dashboard__section-note">各コンテンツへ直接移動</span>
          </div>
          <div className="home-dashboard__content-grid">
            <button className="home-dashboard__content-card home-dashboard__content-card--summon" type="button" aria-label="召喚コンテンツを開く" onClick={onOpenGacha}>
              <span className="home-dashboard__content-icon"><Crown size={21} aria-hidden="true" /></span>
              <span className="home-dashboard__content-text">
                <strong>黒翼召喚</strong>
                <small>権能を獲得・強化する</small>
              </span>
              <span className="home-dashboard__content-value">{recruitmentProgress.tickets} 枚</span>
              <ArrowUpRight size={17} className="home-dashboard__content-arrow" aria-hidden="true" />
            </button>
            <button className="home-dashboard__content-card home-dashboard__content-card--imprints" type="button" aria-label="刻印を管理" onClick={onOpenImprints}>
              <span className="home-dashboard__content-icon"><Shield size={21} aria-hidden="true" /></span>
              <span className="home-dashboard__content-text">
                <strong>刻印管理</strong>
                <small>{equippedCount}/{MAX_EQUIPPED_IMPRINTS} 装備中 ・ {imprintLabel} 種類を解放</small>
              </span>
              <ArrowUpRight size={17} className="home-dashboard__content-arrow" aria-hidden="true" />
            </button>
            <button className="home-dashboard__content-card home-dashboard__content-card--raid" type="button" aria-label="深淵レイドを開く" onClick={onOpenRaid}>
              <span className="home-dashboard__content-icon"><Gem size={21} aria-hidden="true" /></span>
              <span className="home-dashboard__content-text">
                <strong>深淵レイド</strong>
                <small>勝利報酬で刻印チケット・核片を獲得</small>
              </span>
              <span className="home-dashboard__content-value">{raidRewardProgress.coreFragments} 核片</span>
              <ArrowUpRight size={17} className="home-dashboard__content-arrow" aria-hidden="true" />
            </button>
          </div>
        </section>

        <details className="home-dashboard__core-details">
          <summary>
            <span><Gem size={17} aria-hidden="true" /> 深淵核片・アイテム</span>
            <span>所持 {raidRewardProgress.coreFragments} 個 <ChevronDown size={15} aria-hidden="true" /></span>
          </summary>
          <div className="home-dashboard__core-details-body">
            <div className="home-dashboard__core-summary">
              <span className="home-dashboard__reward-mark"><Gem size={21} aria-hidden="true" /></span>
              <div>
                <p className="home-dashboard__section-kicker">RAID EXCLUSIVE ITEM</p>
                <h3>深淵核片</h3>
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

        <section className="home-dashboard__record" aria-label="通算戦績">
          <div className="home-dashboard__record-title"><Trophy size={18} aria-hidden="true" /><span>通算戦績</span></div>
          <div className="home-dashboard__record-stat"><strong>{overallStats.totalBattles}</strong><small>戦</small></div>
          <div className="home-dashboard__record-stat"><strong>{overallStats.wins}</strong><small>勝利</small></div>
          <div className="home-dashboard__record-stat"><strong>{overallStats.losses}</strong><small>敗北</small></div>
          <div className="home-dashboard__record-rate"><strong>{winRate}%</strong><small>勝率</small></div>
        </section>

        <footer className="home-dashboard__footer">
          <span className="home-dashboard__footer-note"><BookOpen size={15} aria-hidden="true" /> 迷ったら育成・編成を確認してから挑戦。</span>
          <span className="home-dashboard__footer-unlocks">{unlockedAbilities}/5 権能解放</span>
          <button className="home-dashboard__developer-link" type="button" aria-label="開発者ツール" onClick={onOpenDeveloperTools}>
            <Wrench size={13} aria-hidden="true" /> 開発者ツール
          </button>
        </footer>
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
