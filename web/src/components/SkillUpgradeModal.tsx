import React from 'react';
import { ArrowLeft, Sparkles, Flame, Crosshair, Droplets, Layers3, Skull, Swords } from 'lucide-react';
import { ABILITY_DEFINITIONS, MAX_ABILITY_LEVEL } from '../data/abilities';
import { MAX_ABILITY_LEVEL } from '../data/abilities';
import { AbilityId, AbilityProgress, FeatherSkillPath, IrenaSkillId, IrenaSkillProgress, RuinSkillPath } from '../types/game';
import { BATTLE_REWARD_LOSS, BATTLE_REWARD_WIN, PATH_MASTERY_REWARD, getAbilityUpgradeCost, getSkillUpgradeCost, MAX_SKILL_LEVEL } from '../utils/storage';

interface Props {
  progress: IrenaSkillProgress;
  abilityProgress: AbilityProgress;
  onUpgrade: (skillId: IrenaSkillId) => void;
  onUpgradeAbility: (abilityId: AbilityId) => void;
  onChoosePath: (skillId: IrenaSkillId, path: FeatherSkillPath | RuinSkillPath) => void;
  onClose: () => void;
}

type PathInfo = { id: FeatherSkillPath | RuinSkillPath; name: string; icon: React.ReactNode; text: string };

const FEATHER_PATHS: PathInfo[] = [
  { id: 'ABYSS', name: '深淵', icon: <Crosshair size={16} />, text: '高チャージ時、羽弾がさらに炸裂。最大火力を狙うルート。' },
  { id: 'JUDGMENT', name: '断罪', icon: <Droplets size={16} />, text: '出血中の敵に追加ダメージ。状態異常を軸に攻めるルート。' },
  { id: 'CHARGE', name: '蓄積', icon: <Layers3 size={16} />, text: '羽弾発射後も一部チャージが残る。再蓄積が速いルート。' },
];

const RUIN_PATHS: PathInfo[] = [
  { id: 'EXECUTION', name: '処刑', icon: <Skull size={16} />, text: '敵が瀕死なら追加ダメージ。最後の一撃に特化。' },
  { id: 'ANNIHILATION', name: '殲滅', icon: <Swords size={16} />, text: '出血中の敵へ追加ダメージ。羽弾との連携に特化。' },
];

export default function SkillUpgradeModal({ progress, abilityProgress, onUpgrade, onUpgradeAbility, onChoosePath, onClose }: Props) {
  const levelOf = (id: IrenaSkillId) => id === 'FEATHER' ? progress.featherLevel : progress.ruinLevel;
  const pathOf = (id: IrenaSkillId) => id === 'FEATHER' ? progress.featherPath : progress.ruinPath;
  const baseDamage = (id: IrenaSkillId, level: number) => id === 'FEATHER' ? 300 + (level - 1) * 25 : 900 + (level - 1) * 75;
  const nextIncrease = (id: IrenaSkillId) => id === 'FEATHER' ? 25 : 75;

  const renderSkill = (id: IrenaSkillId, name: string, icon: React.ReactNode, paths: PathInfo[]) => {
    const level = levelOf(id);
    const selectedPath = pathOf(id);
    const maxed = level >= MAX_SKILL_LEVEL;
    const cost = getSkillUpgradeCost(level);
    const needsPath = level >= 3 && !selectedPath;
    const canUpgrade = !maxed && !needsPath && progress.shards >= cost;
    const effectSummary = id === 'FEATHER'
      ? level >= 4
        ? '出血 40ダメージ/T　｜　蓄積上限 ' + (level >= 10 ? 13 : level >= 7 ? 11 : 9) + '回'
        : level >= 3
          ? '出血 40ダメージ/T'
          : '出血 30ダメージ/T'
      : selectedPath === 'EXECUTION'
        ? '瀕死判定：HP ' + (level >= 10 ? 50 : level >= 7 ? 45 : 40) + '%以下'
        : selectedPath === 'ANNIHILATION'
          ? '出血中に追加ダメージ'
          : 'Lv.3で専用ルートを選択';

    const milestone =
      maxed
        ? 'MASTER：このビルドは最終段階。'
        : level < 3
          ? 'Lv.3で専用ルートを選択。'
          : needsPath
            ? '今すぐ専用ルートを選択できます。'
            : level < 7
              ? 'Lv.7でルート効果がさらに強化。'
              : 'Lv.10でMAX。ルートの完成形へ。';

    return (
      <div key={id} style={{ padding: '14px', borderRadius: '16px', background: 'rgba(12,19,33,0.94)', border: maxed ? '1px solid rgba(255,224,130,0.7)' : '1px solid #31405E', boxShadow: 'inset 0 0 24px rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '9px', minWidth: 0 }}>
            <div style={{ width: '38px', height: '38px', flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '11px', background: id === 'FEATHER' ? 'rgba(126,87,194,0.25)' : 'rgba(198,40,40,0.24)' }}>{icon}</div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 950 }}>{name}</div>
              <div style={{ marginTop: '3px', fontSize: '10px', color: '#9EABBF', lineHeight: 1.45 }}>{id === 'FEATHER' ? '通常攻撃で育てて放つ特殊技' : '一度だけ放てる決戦技'}</div>
            </div>
          </div>
          <div style={{ flexShrink: 0, padding: '5px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.28)', color: maxed ? '#FFE082' : '#E1BEE7', fontSize: '12px', fontWeight: 950 }}>Lv.{level}{maxed ? ' MAX' : ''}</div>
        </div>

        <div style={{ marginTop: '11px', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.035)' }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#DCE5F2' }}>現在：{baseDamage(id, level)} ダメージ</div>
          {!maxed && <div style={{ marginTop: '4px', fontSize: '10px', color: '#A9B5C8' }}>次のLv：+{nextIncrease(id)} ダメージ</div>}
          <div style={{ marginTop: '5px', fontSize: '10px', color: '#E1BEE7', fontWeight: 850 }}>{effectSummary}</div>
          <div style={{ marginTop: '4px', fontSize: '10px', color: '#D1C4E9', fontWeight: 800 }}>{milestone}</div>
        </div>

        {needsPath && (
          <div style={{ marginTop: '11px', padding: '10px', borderRadius: '11px', background: 'rgba(126,87,194,0.08)', border: '1px solid rgba(179,157,219,0.28)' }}>
            <div style={{ fontSize: '11px', fontWeight: 950, color: '#E1BEE7' }}>★ 専用ルートを選択</div>
            <div style={{ marginTop: '4px', fontSize: '10px', color: '#A9B5C8' }}>ここで選んだ方向は以後変更できません。Lv.4から固有効果が発動します。</div>
            <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: id === 'FEATHER' ? '1fr' : '1fr', gap: '7px' }}>
              {paths.map(path => (
                <button key={path.id} onClick={() => onChoosePath(id, path.id)} style={{ width: '100%', padding: '9px 10px', borderRadius: '10px', border: '1px solid #5D4F78', background: 'rgba(27,20,43,0.9)', color: '#FFFFFF', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 950 }}>{path.icon} {path.name}</div>
                  <div style={{ marginTop: '3px', fontSize: '9px', lineHeight: 1.45, color: '#B8B5C7' }}>{path.text}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedPath && (
          <div style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '9px', background: 'rgba(255,224,130,0.06)', border: '1px solid rgba(255,224,130,0.24)', fontSize: '10px', color: '#FFE082', fontWeight: 850 }}>
            選択ルート：{paths.find(p => p.id === selectedPath)?.name ?? selectedPath}
          </div>
        )}

        <button onClick={() => onUpgrade(id)} disabled={!canUpgrade} style={{ marginTop: '10px', width: '100%', height: '44px', borderRadius: '10px', border: canUpgrade ? '1px solid #D1C4E9' : '1px solid #38435A', background: maxed ? 'rgba(120,96,28,0.35)' : canUpgrade ? 'linear-gradient(90deg,#6A1B9A,#8E24AA)' : 'rgba(37,45,63,0.7)', color: maxed ? '#FFE082' : canUpgrade ? '#FFFFFF' : '#7D8798', fontWeight: 950, cursor: canUpgrade ? 'pointer' : 'not-allowed' }}>
          {maxed ? 'MAXまで強化済み' : needsPath ? 'ルートを選択してください' : '強化する　✦ ' + cost + '欠片'}
        </button>
      </div>
    );
  };


  const renderAbility = (definition: (typeof ABILITY_DEFINITIONS)[number]) => {
    const level = abilityProgress.levels[definition.id];
    const shards = abilityProgress.shards[definition.id];
    const maxed = level >= MAX_ABILITY_LEVEL;
    const cost = getAbilityUpgradeCost(level);
    const locked = level <= 0;
    const canUpgrade = !locked && !maxed && shards >= cost;
    const currentEffect = level > 0
      ? definition.levelDescriptions[Math.max(0, Math.min(MAX_ABILITY_LEVEL - 1, level - 1))]
      : '召喚で本体を入手するとLv.1で解放';

    return (
      <div
        key={definition.id}
        style={{
          padding: '12px',
          borderRadius: '14px',
          background: 'rgba(12,19,33,0.94)',
          border: maxed ? '1px solid rgba(255,224,130,0.7)' : '1px solid #31405E',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{
            width: '36px', height: '36px', flexShrink: 0, display: 'grid', placeItems: 'center',
            borderRadius: '10px', background: 'rgba(126,87,194,0.18)', fontSize: '19px',
          }}>{definition.symbol}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15px', fontWeight: 950 }}>{definition.name}</span>
              <span style={{ fontSize: '10px', color: level > 0 ? '#FFE082' : '#7C879C', fontWeight: 900 }}>
                {level > 0 ? 'Lv.' + level : '未解放'}
              </span>
            </div>
            <div style={{ marginTop: '3px', fontSize: '9px', lineHeight: 1.4, color: '#A9B5C8' }}>
              {definition.shortDescription}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '8px', padding: '8px 9px', borderRadius: '9px', background: 'rgba(255,255,255,0.035)' }}>
          <div style={{ fontSize: '9px', color: '#D1C4E9', fontWeight: 850 }}>
            {currentEffect}
          </div>
          <div style={{ marginTop: '4px', fontSize: '9px', color: '#8FA0B6' }}>
            権能欠片 {shards} / 必要 {maxed ? '－' : cost}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onUpgradeAbility(definition.id)}
          disabled={!canUpgrade}
          style={{
            marginTop: '8px', width: '100%', height: '40px', borderRadius: '9px',
            border: canUpgrade ? '1px solid #CE93D8' : '1px solid #38435A',
            background: maxed ? 'rgba(120,96,28,0.35)' : canUpgrade ? 'linear-gradient(90deg,#6A1B9A,#8E24AA)' : 'rgba(37,45,63,0.7)',
            color: maxed ? '#FFE082' : canUpgrade ? '#FFFFFF' : '#7D8798',
            fontSize: '12px', fontWeight: 950, cursor: canUpgrade ? 'pointer' : 'not-allowed',
          }}
        >
          {maxed ? 'MAXまで強化済み' : locked ? '召喚で解放' : '強化する　✦ ' + cost + '欠片'}
        </button>
      </div>
    );
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(2,4,10,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
      <div style={{ width: '100%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box', padding: '18px', borderRadius: '20px', background: 'linear-gradient(180deg,#171D2D,#0D1220)', border: '1px solid rgba(206,147,216,0.65)', boxShadow: '0 18px 60px rgba(0,0,0,0.7)', color: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.18em', color: '#B39DDB' }}>IRENA GROWTH</div>
            <div style={{ marginTop: '4px', fontSize: '25px', fontWeight: 950 }}>技強化</div>
            <div style={{ marginTop: '4px', fontSize: '11px', color: '#AAB6C8' }}>育て方を選んで、いれーなの戦い方を作る。</div>
          </div>
          <div style={{ minWidth: '106px', textAlign: 'center', padding: '8px', borderRadius: '12px', background: 'rgba(20,15,33,0.9)', border: '1px solid rgba(255,224,130,0.55)' }}>
            <div style={{ fontSize: '9px', fontWeight: 900, color: '#B8A6D7' }}>黒羽の欠片</div>
            <div style={{ marginTop: '2px', fontSize: '25px', fontWeight: 950, color: '#FFE082' }}>{progress.shards}</div>
          </div>
        </div>

        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
          {renderSkill('FEATHER', '羽弾', <Sparkles size={19} />, FEATHER_PATHS)}
          {renderSkill('RUIN', '破壊の権能', <Flame size={19} />, RUIN_PATHS)}
        </div>

        <div style={{ marginTop: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 950, color: '#E1BEE7' }}>権能強化候補</div>
          <div style={{ marginTop: '3px', fontSize: '9px', color: '#8FA0B6', lineHeight: 1.4 }}>
            現在実装されている権能だけを表示しています。未解放の権能は召喚後に強化できます。
          </div>
          <div style={{ marginTop: '8px', display: 'grid', gap: '8px' }}>
            {ABILITY_DEFINITIONS.map(renderAbility)}
          </div>
        </div>

        <div style={{ marginTop: '13px', padding: '10px 12px', borderRadius: '11px', background: 'rgba(38,166,154,0.08)', border: '1px solid rgba(128,203,196,0.22)', color: '#B7C8D5', fontSize: '10px', lineHeight: 1.5 }}>
          勝利で {BATTLE_REWARD_WIN} 欠片、敗北でも {BATTLE_REWARD_LOSS} 欠片。選択ルートの戦術条件を達成すると追加で {PATH_MASTERY_REWARD} 欠片を獲得。
        </div>

        <button onClick={onClose} style={{ marginTop: '12px', width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #45516D', background: 'rgba(13,19,31,0.78)', color: '#FFFFFF', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <ArrowLeft size={16} /> 戦闘結果へ戻る
        </button>
      </div>
    </div>
  );
}
