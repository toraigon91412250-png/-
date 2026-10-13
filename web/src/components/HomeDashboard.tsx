import React from 'react';
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Crown,
  Gem,
  Shield,
  Swords,
  Target,
  Ticket,
  Trophy,
  Zap,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type {
  AbilityProgress,
  BattleChallengeLevel,
  IrenaSkillProgress,
  OverallStats,
  RaidRewardProgress,
  RecruitmentProgress,
} from '../types/game';
import { getIrenaWithSkillProgress } from '../data/characters';
import './HomeDashboard.css';

interface HomeDashboardProps {
  overallStats: OverallStats;
  onStartBattle: () => void;
  onOpenGrowth: () => void;
  onOpenGacha: () => void;
  onOpenRaid: () => void;
  unlockedKaiserLevel: BattleChallengeLevel;
  availableStatPoints: number;
  skillProgress: IrenaSkillProgress;
  raidRewardProgress: RaidRewardProgress;
  recruitmentProgress: RecruitmentProgress;
  abilityProgress: AbilityProgress;
  onOpenDeveloperTools: () => void;
  stellaUnlockAvailable: boolean;
  stellaModeUnlocked: boolean;
  stellaRewardSaveError: boolean;
  onRevealStella: () => void;
  onOpenStellaMode: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  overallStats,
  onStartBattle,
  onOpenGrowth,
  onOpenGacha,
  onOpenRaid,
  unlockedKaiserLevel,
  availableStatPoints,
  skillProgress,
  raidRewardProgress,
  recruitmentProgress,
  abilityProgress,
  onOpenDeveloperTools,
  stellaUnlockAvailable,
  stellaModeUnlocked,
  stellaRewardSaveError,
  onRevealStella,
  onOpenStellaMode,
}) => {
  const playerChar = getIrenaWithSkillProgress(skillProgress);
  const winRate = overallStats.totalBattles > 0
    ? Math.round((overallStats.wins / overallStats.totalBattles) * 100)
    : 0;
  const unlockedAbilities = Object.values(abilityProgress.levels).filter(level => level > 0).length;
  const challengeProgress = Math.max(0, Math.min(100, unlockedKaiserLevel));

  return (
    <main className="home-dashboard">
      <div className="home-dashboard__inner">
        <header className="home-dashboard__header">
          <div className="home-dashboard__brand">
            <span className="home-dashboard__brand-mark" aria-hidden="true"><Swords size={21} /></span>
            <div className="home-dashboard__brand-copy">
              <h1 className="home-dashboard__brand-title">バトルアリーナデュエル</h1>
              <p className="home-dashboard__brand-subtitle">TACTICAL 1 VS 1 · TURN-BASED</p>
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
            <p className="home-dashboard__eyebrow"><Crown size={14} aria-hidden="true" /> MAIN CHALLENGE <span>メインコンテンツ</span></p>
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
              {stellaUnlockAvailable
                ? '最終試練の先に、まだ知られていない領域が現れた。'
                : unlockedKaiserLevel >= 100
                  ? '最終段階が解放済み。ビルドを仕上げ、Lv.100の試練へ。'
                  : '勝利で次のレベルが解放。育成と編成を整え、次の強敵へ。'}
            </p>
            <div className="home-dashboard__hero-actions">
              <button
                className={'home-dashboard__primary-action' + (stellaUnlockAvailable ? ' home-dashboard__primary-action--mystery' : '')}
                type="button"
                aria-label={stellaUnlockAvailable ? '？？？？？、隠された領域へ進む' : '挑戦の準備、カイザー Lv.' + unlockedKaiserLevel + ' に挑戦'}
                onClick={stellaUnlockAvailable ? onRevealStella : onStartBattle}
              >
                {stellaUnlockAvailable
                  ? <Sparkles size={19} aria-hidden="true" />
                  : <Swords size={19} aria-hidden="true" />}
                <span className="home-dashboard__primary-copy">
                  <strong>{stellaUnlockAvailable ? '？？？？？' : '挑戦の準備'}</strong>
                  <small>{stellaUnlockAvailable ? 'その先へ進む' : `カイザー Lv.${unlockedKaiserLevel} に挑戦`}</small>
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </button>
              {stellaUnlockAvailable && (
                <span className="home-dashboard__stella-reward" role="status">
                  Lv.100撃破報酬：ステータスポイント +50P 獲得
                </span>
              )}
              {stellaRewardSaveError && (
                <span className="home-dashboard__stella-save-error" role="alert">
                  Lv.100報酬を保存できませんでした。保存領域を確認して、もう一度Lv.100に勝利してください。
                </span>
              )}
            </div>
          </div>
          <div className="home-dashboard__hero-foot">
            <span><Shield size={13} aria-hidden="true" /> 1対1 ターン制バトル</span>
            <span><Zap size={13} aria-hidden="true" /> 勝利で次のレベル解放</span>
          </div>
        </section>

        <section className="home-dashboard__growth-entry" aria-labelledby="home-growth-entry-title">
          <span className="home-dashboard__growth-entry-icon" aria-hidden="true"><Target size={22} /></span>
          <div className="home-dashboard__growth-entry-copy">
            <p className="home-dashboard__section-kicker">YOUR NEXT STEP <span>育成・編成</span></p>
            <h2 id="home-growth-entry-title">強化メニューをひとつに集約</h2>
            <p>ステータス・才能盤・技・権能・刻印の管理はこちらから。</p>
          </div>
          <button type="button" className="home-dashboard__growth-entry-action" onClick={onOpenGrowth}>
            強化を開く <ArrowUpRight size={18} aria-hidden="true" />
          </button>
        </section>

        <section className="home-dashboard__section home-dashboard__section--modes" aria-labelledby="home-modes-title">
          <div className="home-dashboard__section-heading">
            <div>
              <p className="home-dashboard__section-kicker">EXPLORE THE ARENA</p>
              <h2 id="home-modes-title">コンテンツ</h2>
            </div>
            <span className="home-dashboard__section-note">行き先を選ぶ</span>
          </div>
          <div className="home-dashboard__mode-grid">
            <button className="home-dashboard__mode-card home-dashboard__mode-card--summon" type="button" onClick={onOpenGacha} aria-label="黒翼召喚を開く">
              <span className="home-dashboard__mode-art" aria-hidden="true"><Crown size={28} /></span>
              <span className="home-dashboard__mode-copy">
                <small>POWER UP</small>
                <strong>黒翼召喚</strong>
                <span>新たな権能と強化用の欠片を集める。</span>
              </span>
              <span className="home-dashboard__mode-meta"><span><Ticket size={14} /> チケット {recruitmentProgress.tickets} 枚</span><ChevronRight size={18} /></span>
            </button>
            <button className="home-dashboard__mode-card home-dashboard__mode-card--raid" type="button" onClick={onOpenRaid} aria-label="深淵レイドを開く">
              <span className="home-dashboard__mode-art" aria-hidden="true"><Gem size={28} /></span>
              <span className="home-dashboard__mode-copy">
                <small>HIGH-LEVEL CONTENT</small>
                <strong>深淵レイド</strong>
                <span>勝利報酬で刻印チケットや核片を獲得。</span>
              </span>
              <span className="home-dashboard__mode-meta"><span><Gem size={14} /> 核片 {raidRewardProgress.coreFragments} 個</span><ChevronRight size={18} /></span>
            </button>
            {stellaModeUnlocked && (
              <button
                className="home-dashboard__mode-card home-dashboard__mode-card--stella"
                type="button"
                onClick={onOpenStellaMode}
                aria-label="ステラモードを開く"
              >
                <span className="home-dashboard__mode-art" aria-hidden="true"><Sparkles size={28} /></span>
                <span className="home-dashboard__mode-copy">
                  <small>HIDDEN CHARACTER UNLOCKED</small>
                  <strong>ステラモード</strong>
                  <span>星の力を操る、もうひとつの戦いへ。</span>
                </span>
                <span className="home-dashboard__mode-meta"><span>解放済み</span><ChevronRight size={18} /></span>
              </button>
            )}
          </div>
        </section>

        <section className="home-dashboard__section home-dashboard__section--resources" aria-labelledby="home-resource-title">
          <div className="home-dashboard__section-heading">
            <div>
              <p className="home-dashboard__section-kicker">素材・チケット</p>
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

        <section className="home-dashboard__record" aria-label="通算戦績">
          <div className="home-dashboard__record-title"><Trophy size={18} aria-hidden="true" /><span>通算戦績</span></div>
          <div className="home-dashboard__record-stat"><strong>{overallStats.totalBattles}</strong><small>戦</small></div>
          <div className="home-dashboard__record-stat"><strong>{overallStats.wins}</strong><small>勝利</small></div>
          <div className="home-dashboard__record-stat"><strong>{overallStats.losses}</strong><small>敗北</small></div>
          <div className="home-dashboard__record-rate"><strong>{winRate}%</strong><small>勝率</small></div>
        </section>

        <footer className="home-dashboard__footer">
          <span className="home-dashboard__footer-note"><BookOpen size={15} aria-hidden="true" /> 育成・編成は強化メニューから確認できます。</span>
          <span className="home-dashboard__footer-unlocks">{unlockedAbilities}/5 権能解放</span>
          <button className="home-dashboard__developer-link" type="button" aria-label="開発者ツール" onClick={onOpenDeveloperTools}>
            <Wrench size={13} aria-hidden="true" /> 開発者ツール
          </button>
        </footer>
      </div>

    </main>
  );
};

export default HomeDashboard;
