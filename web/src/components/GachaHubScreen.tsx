import React from 'react';
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Crown,
  Eye,
  Gem,
  Layers,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { IMPRINT_DEFINITIONS } from '../data/imprints';
import './GachaHubScreen.css';

interface GachaHubScreenProps {
  imprintTickets: number;
  recruitmentTickets: number;
  unlockedImprints: number;
  equippedImprints: number;
  onOpenRecruitment: () => void;
  onOpenImprintGacha: () => void;
  onOpenImprints: () => void;
}

export const GachaHubScreen: React.FC<GachaHubScreenProps> = ({
  imprintTickets,
  recruitmentTickets,
  unlockedImprints,
  equippedImprints,
  onOpenRecruitment,
  onOpenImprintGacha,
  onOpenImprints,
}) => {
  const imprintCompletion = Math.round((unlockedImprints / IMPRINT_DEFINITIONS.length) * 100);

  return (
    <main className="gacha-hub">
      <div className="gacha-hub__inner">
        <header className="gacha-hub__header">
          <span className="gacha-hub__brand-mark"><Sparkles size={20} /></span>
          <div>
            <p className="gacha-hub__eyebrow">SUMMONS & LOADOUT</p>
            <h1>ガチャ</h1>
            <p className="gacha-hub__lead">戦い方を増やす力を集めて、自分のビルドに組み込もう。</p>
          </div>
        </header>

        <section className="gacha-hub__inventory" aria-label="召喚リソース">
          <div>
            <span className="gacha-hub__inventory-label"><Ticket size={14} /> 黒翼召喚チケット</span>
            <strong>{recruitmentTickets.toLocaleString('ja-JP')} <small>枚</small></strong>
          </div>
          <div>
            <span className="gacha-hub__inventory-label"><Gem size={14} /> 刻印チケット</span>
            <strong>{imprintTickets.toLocaleString('ja-JP')} <small>枚</small></strong>
          </div>
          <div>
            <span className="gacha-hub__inventory-label"><Layers size={14} /> 刻印コレクション</span>
            <strong>{unlockedImprints}<small> / {IMPRINT_DEFINITIONS.length}</small></strong>
          </div>
        </section>

        <section className="gacha-hub__section" aria-labelledby="gacha-hub-pick-title">
          <div className="gacha-hub__section-heading">
            <div>
              <p className="gacha-hub__eyebrow">CHOOSE YOUR REWARD</p>
              <h2 id="gacha-hub-pick-title">何を強化する？</h2>
            </div>
            <span>獲得先を選ぶ</span>
          </div>

          <div className="gacha-hub__summon-grid">
            <button className="gacha-hub__summon-card gacha-hub__summon-card--ability" type="button" onClick={onOpenRecruitment} aria-label="権能ガチャを開く">
              <span className="gacha-hub__summon-glow" />
              <span className="gacha-hub__summon-top">
                <span className="gacha-hub__summon-icon"><Crown size={24} /></span>
                <span className="gacha-hub__summon-open"><ArrowUpRight size={19} /></span>
              </span>
              <span className="gacha-hub__summon-kicker">ABILITY RECRUITMENT</span>
              <strong className="gacha-hub__summon-title">黒翼召喚</strong>
              <span className="gacha-hub__summon-description">権能本体や強化用の欠片を獲得。権能を解放して、戦闘の選択肢を増やす。</span>
              <span className="gacha-hub__summon-bottom">
                <span><Ticket size={14} /> チケット {recruitmentTickets} 枚</span>
                <strong>召喚へ <ChevronRight size={15} /></strong>
              </span>
            </button>

            <button className="gacha-hub__summon-card gacha-hub__summon-card--imprint" type="button" onClick={onOpenImprintGacha} aria-label="刻印ガチャを開く">
              <span className="gacha-hub__summon-glow" />
              <span className="gacha-hub__summon-top">
                <span className="gacha-hub__summon-icon"><Gem size={24} /></span>
                <span className="gacha-hub__summon-open"><ArrowUpRight size={19} /></span>
              </span>
              <span className="gacha-hub__summon-kicker">IMPRINT ARCHIVE</span>
              <strong className="gacha-hub__summon-title">刻印召喚</strong>
              <span className="gacha-hub__summon-description">戦闘中に発動する刻印を獲得。回避・反撃・出血など、勝ち筋を組み立てる。</span>
              <span className="gacha-hub__summon-bottom">
                <span><Ticket size={14} /> チケット {imprintTickets} 枚</span>
                <strong>召喚へ <ChevronRight size={15} /></strong>
              </span>
            </button>
          </div>
        </section>

        <section className="gacha-hub__collection" aria-labelledby="gacha-hub-collection-title">
          <div className="gacha-hub__collection-icon"><Eye size={23} /></div>
          <div className="gacha-hub__collection-main">
            <p className="gacha-hub__eyebrow">BUILD MANAGEMENT</p>
            <h2 id="gacha-hub-collection-title">刻印管理</h2>
            <p>所持している刻印から最大3つを選んで装備。発動条件と効果を確認して、挑戦相手に合わせよう。</p>
            <div className="gacha-hub__collection-progress" aria-label={'刻印の収集率 ' + imprintCompletion + 'パーセント'}>
              <span style={{ width: imprintCompletion + '%' }} />
            </div>
            <div className="gacha-hub__collection-meta">
              <span>{unlockedImprints}/{IMPRINT_DEFINITIONS.length} 種類を解放</span>
              <span>装備中 {equippedImprints}/3</span>
            </div>
          </div>
          <button type="button" className="gacha-hub__manage-button" aria-label="刻印を管理" onClick={onOpenImprints}>
            管理する <ChevronRight size={16} />
          </button>
        </section>

        <aside className="gacha-hub__tip">
          <BookOpen size={17} />
          <p><strong>おすすめの流れ</strong><span>新しい権能・刻印を入手したら、刻印管理や挑戦準備で装備を確認してからバトルへ。</span></p>
        </aside>
      </div>
    </main>
  );
};

export default GachaHubScreen;
