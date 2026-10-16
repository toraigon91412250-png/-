import React, { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Crown, Gift, LockKeyhole, Sparkles } from 'lucide-react';
import {
  ACHIEVEMENTS,
  ABSOLUTE_AUTHORITY_DESCRIPTION,
  ABSOLUTE_AUTHORITY_NAME,
  type AchievementCategory,
  type AchievementId,
} from '../data/achievements';
import {
  claimAchievementReward,
  getAchievementMetrics,
  loadAchievementProgress,
  syncAchievementProgress,
} from '../utils/storage';
import './AchievementSection.css';

interface AchievementSectionProps {
  onRewardsChanged: () => void;
}

const CATEGORY_ORDER: readonly AchievementCategory[] = [
  '戦闘', '進行', '権能', '召喚', '刻印', 'レイド', '育成',
];

function formatReward(reward: (typeof ACHIEVEMENTS)[number]['reward']): string[] {
  const labels: string[] = [];
  if (reward.statPoints) labels.push(`ステ振り +${reward.statPoints}P`);
  if (reward.recruitmentTickets) labels.push(`召喚券 +${reward.recruitmentTickets}`);
  if (reward.imprintTickets) labels.push(`刻印券 +${reward.imprintTickets}`);
  if (reward.skillShards) labels.push(`技の欠片 +${reward.skillShards}`);
  if (reward.abilityShardsEach) labels.push(`各権能の欠片 +${reward.abilityShardsEach}`);
  return labels;
}

export const AchievementSection: React.FC<AchievementSectionProps> = ({ onRewardsChanged }) => {
  const [progress, setProgress] = useState(() => loadAchievementProgress());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setProgress(syncAchievementProgress());
  }, []);

  const metrics = getAchievementMetrics();
  const unlockedIds = useMemo(() => new Set(progress.unlockedIds), [progress.unlockedIds]);
  const claimedIds = useMemo(() => new Set(progress.claimedIds), [progress.claimedIds]);
  const completionCount = progress.unlockedIds.length;
  const availableRewards = ACHIEVEMENTS.filter(item => unlockedIds.has(item.id) && !claimedIds.has(item.id)).length;
  const completionPercent = Math.round((completionCount / ACHIEVEMENTS.length) * 100);

  const handleClaim = (id: AchievementId) => {
    const result = claimAchievementReward(id);
    setProgress(result.progress);
    if (!result.persisted) {
      setMessage('報酬を保存できませんでした。保存領域を確認して再試行してください。');
      return;
    }
    if (!result.claimed) {
      setMessage('この実績は受取済み、または達成条件を満たしていません。');
      return;
    }
    setMessage('実績報酬を獲得しました。');
    onRewardsChanged();
    setProgress(syncAchievementProgress());
  };

  return (
    <section className="achievement-section" aria-labelledby="achievement-section-title">
      <div className="achievement-section__heading">
        <div className="achievement-section__heading-copy">
          <span className="achievement-section__eyebrow">MILESTONES / ACHIEVEMENTS</span>
          <h2 id="achievement-section-title"><Award size={20} aria-hidden="true" /> 実績と報酬</h2>
          <p>戦闘・育成・収集・高難度の挑戦を記録。達成報酬は一度だけ受け取れます。</p>
        </div>
        <div className="achievement-section__counter" aria-label={`実績 ${completionCount} / ${ACHIEVEMENTS.length} 達成`}>
          <strong>{completionCount}<small> / {ACHIEVEMENTS.length}</small></strong>
          <span>達成済み</span>
        </div>
      </div>

      <div className="achievement-section__progress" role="progressbar" aria-label="実績達成率" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercent}>
        <span style={{ width: completionPercent + '%' }} />
      </div>

      <div className="achievement-section__summary">
        <span><CheckCircle2 size={14} aria-hidden="true" /> {completionPercent}% 完了</span>
        <span><Gift size={14} aria-hidden="true" /> 未受取報酬 {availableRewards} 件</span>
      </div>

      {progress.absoluteAuthorityUnlocked ? (
        <div className="achievement-section__ultimate" role="status">
          <div className="achievement-section__ultimate-icon"><Crown size={24} aria-hidden="true" /></div>
          <div>
            <span>ULTIMATE AUTHORITY UNLOCKED</span>
            <strong>{ABSOLUTE_AUTHORITY_NAME}</strong>
            <p>{ABSOLUTE_AUTHORITY_DESCRIPTION}</p>
            <small>次回の通常戦闘から自動で適用されます。</small>
          </div>
        </div>
      ) : (
        <div className="achievement-section__ultimate-locked">
          <LockKeyhole size={17} aria-hidden="true" />
          <span>全実績を達成すると最上位権能「{ABSOLUTE_AUTHORITY_NAME}」が解放される。</span>
          <Sparkles size={17} aria-hidden="true" />
        </div>
      )}

      {message && <p className="achievement-section__message" role="status">{message}</p>}

      <div className="achievement-section__groups">
        {CATEGORY_ORDER.map(category => {
          const items = ACHIEVEMENTS.filter(item => item.category === category);
          if (items.length === 0) return null;
          return (
            <div className="achievement-section__group" key={category}>
              <div className="achievement-section__group-heading">
                <span>{category}</span>
                <small>{items.filter(item => unlockedIds.has(item.id)).length} / {items.length}</small>
              </div>
              <div className="achievement-section__grid">
                {items.map(item => {
                  const unlocked = unlockedIds.has(item.id);
                  const claimed = claimedIds.has(item.id);
                  const value = Math.min(item.target, Math.max(0, metrics[item.metric]));
                  const percent = Math.round((value / Math.max(1, item.target)) * 100);
                  const rewardLabels = formatReward(item.reward);
                  const hidden = Boolean(item.hiddenUntilUnlocked && !unlocked);
                  return (
                    <article
                      className={'achievement-card'
                        + (unlocked ? ' achievement-card--unlocked' : '')
                        + (claimed ? ' achievement-card--claimed' : '')}
                      key={item.id}
                    >
                      <div className="achievement-card__top">
                        <span className="achievement-card__icon" aria-hidden="true">
                          {claimed ? <CheckCircle2 size={19} /> : unlocked ? <Award size={19} /> : <LockKeyhole size={18} />}
                        </span>
                        <span className={'achievement-card__status'
                          + (claimed ? ' achievement-card__status--claimed' : unlocked ? ' achievement-card__status--ready' : '')}>
                          {claimed ? '受取済み' : unlocked ? '達成' : hidden ? '隠し実績' : '挑戦中'}
                        </span>
                      </div>
                      <h3>{hidden ? '？？？' : item.title}</h3>
                      <p className="achievement-card__description">
                        {hidden ? '条件不明の隠し実績。挑戦を続けると内容が判明する。' : item.description}
                      </p>
                      <div className="achievement-card__progress-copy">
                        <span>{unlocked ? '達成済み' : hidden ? '？？？' : '進捗'}</span>
                        <strong>{unlocked ? '完了' : hidden ? '？？？' : `${value.toLocaleString('ja-JP')} / ${item.target.toLocaleString('ja-JP')}`}</strong>
                      </div>
                      <div className="achievement-card__progress" aria-hidden="true">
                        <span style={{ width: (unlocked ? 100 : hidden ? 0 : percent) + '%' }} />
                      </div>
                      <div className="achievement-card__reward">
                        <small>報酬</small>
                        <span>{hidden ? '達成時に公開' : rewardLabels.join(' ・ ')}</span>
                      </div>
                      {unlocked && !claimed ? (
                        <button type="button" className="achievement-card__claim" onClick={() => handleClaim(item.id)}>
                          <Gift size={15} aria-hidden="true" /> 報酬を受け取る
                        </button>
                      ) : (
                        <div className="achievement-card__footer">
                          {claimed ? '報酬獲得済み' : hidden ? '条件を解明しよう' : '達成すると報酬を受取可能'}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AchievementSection;
