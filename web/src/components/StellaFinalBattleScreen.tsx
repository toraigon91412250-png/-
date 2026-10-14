import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, HeartPulse, Shield, Sparkles, Swords, TimerReset, Zap } from 'lucide-react';
import kaiserImage from '../assets/img_kaiser.jpg';
import battleBackground from '../assets/戦闘中背景.png';
import { STELLA_FINAL_BATTLE_TUNING, type StellaFinalBattleFighterId } from '../data/stellaFinalBattleConfig';
import type { StellaFinalBattleRewardResult, StellaModeProgress } from '../utils/storage';
import './StellaFinalBattleScreen.css';

const { bossMaxHp: EX_KAISER_TOTAL_HP, meteorDamage: METEOR_DAMAGE_PROTOTYPE } = STELLA_FINAL_BATTLE_TUNING;

type BattleStatus = 'READY' | 'FIGHTING' | 'VICTORY' | 'DEFEAT';
type FinalAction = 'ATTACK' | 'IMMORTAL' | 'REBIRTH' | 'METEOR';
type BattlePhase = 1 | 2 | 3;

interface StellaFinalBattleState {
  status: BattleStatus;
  turn: number;
  phase: BattlePhase;
  fighterId: StellaFinalBattleFighterId;
  playerHp: number;
  kaiserHp: number;
  rebirthUses: number;
  meteorUsed: boolean;
  immortalReadyTurn: number;
  finalTurnLimit: number | null;
  finalTurnsLeft: number | null;
  meteorFlash: boolean;
  logs: string[];
}

function createInitialBattle(
  status: BattleStatus = 'READY',
  fighterId: StellaFinalBattleFighterId = 'stella',
): StellaFinalBattleState {
  const fighter = STELLA_FINAL_BATTLE_TUNING.fighters[fighterId];
  return {
    status,
    turn: 1,
    phase: 1,
    fighterId,
    playerHp: fighter.maxHp,
    kaiserHp: EX_KAISER_TOTAL_HP,
    rebirthUses: 0,
    meteorUsed: false,
    immortalReadyTurn: 1,
    finalTurnLimit: null,
    finalTurnsLeft: null,
    meteorFlash: false,
    logs: ['最終決戦の行動を使い分け、EXカイザーを撃破せよ。'],
  };
}

function phaseForHp(hp: number): BattlePhase {
  if (hp > EX_KAISER_TOTAL_HP * (2 / 3)) return 1;
  if (hp > EX_KAISER_TOTAL_HP / 3) return 2;
  return 3;
}

const PHASE_NAMES: Record<BattlePhase, string> = {
  1: '第一形態・鉄壁',
  2: '第二形態・解放',
  3: '第三形態・終局',
};

const REBIRTH_RATIOS = [1, 0.5, 0.25] as const;

export const StellaFinalBattleScreen: React.FC<{
  onBackHome: () => void;
  progress: StellaModeProgress;
  onClaimVictoryReward: () => StellaFinalBattleRewardResult;
}> = ({ onBackHome, progress, onClaimVictoryReward }) => {
  const [selectedFighterId, setSelectedFighterId] = useState<StellaFinalBattleFighterId>('stella');
  const [battle, setBattle] = useState<StellaFinalBattleState>(() => createInitialBattle());
  const rewardAttemptedForVictoryRef = useRef(false);
  const [rewardResult, setRewardResult] = useState<StellaFinalBattleRewardResult | null>(null);

  const startBattle = () => {
    rewardAttemptedForVictoryRef.current = false;
    setRewardResult(null);
    setBattle(createInitialBattle('FIGHTING', selectedFighterId));
  };

  useEffect(() => {
    if (battle.status !== 'VICTORY' || battle.fighterId !== 'stella' || rewardAttemptedForVictoryRef.current) return;
    rewardAttemptedForVictoryRef.current = true;
    setRewardResult(onClaimVictoryReward());
  }, [battle.status, battle.fighterId, onClaimVictoryReward]);

  const takeAction = (action: FinalAction) => {
    setBattle(current => {
      if (current.status !== 'FIGHTING') return current;

      const turn = current.turn;
      const fighterConfig = STELLA_FINAL_BATTLE_TUNING.fighters[current.fighterId];
      const maxHp = fighterConfig.maxHp;
      let playerHp = current.playerHp;
      let kaiserHp = current.kaiserHp;
      let phase = current.phase;
      let rebirthUses = current.rebirthUses;
      let meteorUsed = current.meteorUsed;
      let immortalReadyTurn = current.immortalReadyTurn;
      let finalTurnLimit = current.finalTurnLimit;
      let finalTurnsLeft = current.finalTurnsLeft;
      let meteorFlash = false;
      let status: BattleStatus = 'FIGHTING';
      const logs = [...current.logs];
      const log = (message: string) => logs.push('第' + turn + 'ターン：' + message);

      if (action === 'ATTACK') {
        const damage = fighterConfig.normalAttackDamage;
        kaiserHp = Math.max(0, kaiserHp - damage);
        log(fighterConfig.name + 'の通常攻撃。EXカイザーに ' + damage.toLocaleString('ja-JP') + ' ダメージ。');
      } else if (action === 'IMMORTAL') {
        if (turn < immortalReadyTurn) return current;
        immortalReadyTurn = turn + 3;
        log('権能「不滅」を発動。次の攻撃を完全無敵で無効化する。');
      } else if (action === 'REBIRTH') {
        if (rebirthUses >= REBIRTH_RATIOS.length || playerHp >= maxHp) return current;
        const healing = Math.round(maxHp * REBIRTH_RATIOS[rebirthUses]);
        const actualHealing = Math.min(maxHp - playerHp, healing);
        rebirthUses += 1;
        playerHp += actualHealing;
        log('権能「再誕」。HPを ' + actualHealing.toLocaleString('ja-JP') + ' 回復。' + rebirthUses + '回目の使用。');
      } else {
        if (meteorUsed) return current;
        meteorUsed = true;
        meteorFlash = true;
        kaiserHp = Math.max(0, kaiserHp - METEOR_DAMAGE_PROTOTYPE);
        log('権能「天象支配」。巨大な隕石が落下し、' + METEOR_DAMAGE_PROTOTYPE.toLocaleString('ja-JP') + ' ダメージ。');
      }

      if (kaiserHp <= 0) {
        status = 'VICTORY';
        log('EXカイザーを撃破した。' + fighterConfig.name + 'の勝利！');
      } else {
        const newPhase = phaseForHp(kaiserHp);
        if (newPhase > phase) {
          phase = newPhase;
          log(PHASE_NAMES[phase] + 'へ移行。これまでのダメージは引き継がれる。');
          if (phase === 3) {
            finalTurnLimit = 8 + Math.floor(Math.random() * 3);
            finalTurnsLeft = finalTurnLimit;
            logs.push('最終形態の制限開始。残りターン数が ' + finalTurnLimit + ' に決定した。');
          }
        }

        const negatesAttack = action === 'IMMORTAL';
        const enemyDamage = STELLA_FINAL_BATTLE_TUNING.phaseCounterDamage[phase];
        if (negatesAttack) {
          log('「不滅」がEXカイザーの反撃を完全無効化。ダメージは発生しない。');
        } else {
          playerHp = Math.max(0, playerHp - enemyDamage);
          log('EXカイザーの反撃。' + fighterConfig.name + 'は ' + enemyDamage.toLocaleString('ja-JP') + ' ダメージを受けた。');
        }

        if (playerHp <= 0) {
          status = 'DEFEAT';
          log(fighterConfig.name + 'は戦闘不能になった。');
        } else if (current.phase === 3 && finalTurnsLeft !== null) {
          finalTurnsLeft = Math.max(0, finalTurnsLeft - 1);
          if (finalTurnsLeft === 0) {
            playerHp = 0;
            status = 'DEFEAT';
            logs.push('制限ターン終了。EXカイザーが終局の必殺技を放ち、ステラは敗北した。');
          }
        }
      }

      return {
        ...current,
        status,
        turn: status === 'FIGHTING' ? turn + 1 : turn,
        phase,
        playerHp,
        kaiserHp,
        rebirthUses,
        meteorUsed,
        immortalReadyTurn,
        finalTurnLimit,
        finalTurnsLeft,
        meteorFlash,
        logs: logs.slice(-8),
      };
    });
  };

  const isFighting = battle.status === 'FIGHTING';
  const displayedFighterId = battle.status === 'READY' ? selectedFighterId : battle.fighterId;
  const fighter = STELLA_FINAL_BATTLE_TUNING.fighters[displayedFighterId];
  const displayedPlayerHp = battle.status === 'READY' ? fighter.maxHp : battle.playerHp;
  const playerHpPercent = Math.max(0, (displayedPlayerHp / fighter.maxHp) * 100);
  const kaiserHpPercent = Math.max(0, (battle.kaiserHp / EX_KAISER_TOTAL_HP) * 100);
  const resultTitle = battle.status === 'VICTORY' ? '最終決戦 勝利' : '最終決戦 敗北';

  return (
    <main className="stella-final" style={{ backgroundImage: 'linear-gradient(180deg, rgba(4, 6, 18, .52), rgba(4, 6, 18, .94)), url(' + JSON.stringify(battleBackground) + ')' }}>
      <div className="stella-final__ambient" aria-hidden="true" />
      <header className="stella-final__header">
        <button type="button" className="stella-final__back" onClick={onBackHome} aria-label="ホームに戻る">
          <ArrowLeft size={17} /> ホーム
        </button>
        <div className="stella-final__eyebrow">STELLA MODE / FINAL DUEL</div>
        <div className="stella-final__header-mark"><Sparkles size={17} /> 最終決戦専用モード</div>
      </header>

      <div className="stella-final__content">
        <div className="stella-final__title-block">
          <p>THE FINAL ENCOUNTER</p>
          <h1>EXカイザー 最終決戦</h1>
          <span>三形態・HP引き継ぎ・最終形態ターン制限</span>
        </div>

        <section className="stella-final__arena" aria-label="最終決戦の戦場">
          <div className="stella-final__fighter stella-final__fighter--stella">
            <div className="stella-final__portrait">
              <img src={fighter.imageSrc} alt={fighter.name} />
              <span className="stella-final__portrait-label">PLAYER</span>
            </div>
            <div className="stella-final__fighter-name">{fighter.name}</div>
            <div className="stella-final__fighter-subtitle">{fighter.title}</div>
            <div className="stella-final__hp-meta"><span>HP</span><strong>{displayedPlayerHp.toLocaleString('ja-JP')} / {fighter.maxHp.toLocaleString('ja-JP')}</strong></div>
            <div className="stella-final__hp-track" role="progressbar" aria-label={fighter.name + 'のHP'} aria-valuemin={0} aria-valuemax={fighter.maxHp} aria-valuenow={displayedPlayerHp}>
              <span className="stella-final__hp-fill stella-final__hp-fill--player" style={{ width: playerHpPercent + '%' }} />
            </div>
          </div>

          <div className="stella-final__arena-center" aria-live="polite">
            <span className="stella-final__versus">VS</span>
            <span className="stella-final__phase">PHASE 0{battle.phase}</span>
            <strong>{PHASE_NAMES[battle.phase]}</strong>
            {isFighting && <span className="stella-final__turn">第 {battle.turn} ターン</span>}
            {battle.phase === 3 && battle.finalTurnsLeft !== null && (
              <div className="stella-final__timer" role="status" aria-label={'最終形態 残り' + battle.finalTurnsLeft + 'ターン'}>
                <TimerReset size={16} />
                <span>残り <strong>{battle.finalTurnsLeft}</strong> / {battle.finalTurnLimit} ターン</span>
              </div>
            )}
          </div>

          <div className="stella-final__fighter stella-final__fighter--kaiser">
            <div className="stella-final__portrait">
              <img src={kaiserImage} alt="EXカイザー" />
              <span className="stella-final__portrait-label">FINAL BOSS</span>
            </div>
            <div className="stella-final__fighter-name">EXカイザー</div>
            <div className="stella-final__fighter-subtitle">{PHASE_NAMES[battle.phase]}</div>
            <div className="stella-final__hp-meta"><span>HP</span><strong>{battle.kaiserHp.toLocaleString('ja-JP')} / {EX_KAISER_TOTAL_HP.toLocaleString('ja-JP')}</strong></div>
            <div className="stella-final__hp-track" role="progressbar" aria-label="EXカイザーのHP" aria-valuemin={0} aria-valuemax={EX_KAISER_TOTAL_HP} aria-valuenow={battle.kaiserHp}>
              <span className="stella-final__hp-fill stella-final__hp-fill--boss" style={{ width: kaiserHpPercent + '%' }} />
            </div>
          </div>
        </section>

        {battle.status === 'READY' && (
          <section className="stella-final__character-select" aria-label="最終決戦の操作キャラクター">
            <div className="stella-final__character-select-heading">
              <strong>挑戦キャラクター</strong>
              <span>{progress.finalBattleRewardClaimed ? '最終決戦用キャラクターを選択可能' : '初回クリア後に追加キャラクターが解放'}</span>
            </div>
            <div className="stella-final__character-choice-grid">
              <button
                type="button"
                className="stella-final__character-choice"
                aria-label="最終決戦キャラクター：ステラ"
                aria-pressed={selectedFighterId === 'stella'}
                onClick={() => setSelectedFighterId('stella')}
              >
                <img src={STELLA_FINAL_BATTLE_TUNING.fighters.stella.imageSrc} alt="" />
                <span><strong>ステラ</strong><small>天星の翼</small></span>
                <span className="stella-final__choice-state">{selectedFighterId === 'stella' ? '選択中' : '選択'}</span>
              </button>
              {progress.finalBattleRewardClaimed ? (
                <button
                  type="button"
                  className="stella-final__character-choice"
                  aria-label="最終決戦キャラクター：最終決戦用いれーな"
                  aria-pressed={selectedFighterId === 'final-irena'}
                  onClick={() => setSelectedFighterId('final-irena')}
                >
                  <img src={STELLA_FINAL_BATTLE_TUNING.fighters['final-irena'].imageSrc} alt="" />
                  <span><strong>最終決戦用いれーな</strong><small>最終決戦専用・仮設定</small></span>
                  <span className="stella-final__choice-state">{selectedFighterId === 'final-irena' ? '選択中' : '選択'}</span>
                </button>
              ) : (
                <p className="stella-final__locked-character">最終決戦にステラで初勝利すると、クリア報酬とともに最終決戦用いれーなが解放される。</p>
              )}
            </div>
            <p className="stella-final__prototype-note">キャラクターHP・通常攻撃は最終決戦専用の仮設定。通常版いれーなの能力値や育成データには影響しない。</p>
          </section>
        )}

        {battle.meteorFlash && (
          <div className="stella-final__meteor-cut-in" aria-hidden="true">
            <img src={STELLA_FINAL_BATTLE_TUNING.meteorCutInImage} alt="" />
            <span>天象支配</span>
          </div>
        )}

        {battle.status === 'READY' ? (
          <section className="stella-final__briefing" aria-label="最終決戦ルール">
            <div className="stella-final__briefing-heading"><Shield size={18} /> 最終決戦のルール</div>
            <p>EXカイザーは三形態。形態が変わってもHPは回復せず、与えたダメージを引き継ぐ。</p>
            <p>第三形態に入ると、制限ターンが8～10ターンからランダムに決まり、期限を過ぎると終局の必殺技で敗北する。</p>
            <p className="stella-final__prototype-note">試作バランス：EXカイザー最大HP {EX_KAISER_TOTAL_HP.toLocaleString('ja-JP')}、天象支配 {METEOR_DAMAGE_PROTOTYPE.toLocaleString('ja-JP')}ダメージ。数値は調整用の仮設定。</p>
            <button type="button" className="stella-final__start" onClick={startBattle}>最終決戦を開始</button>
          </section>
        ) : (
          <>
            <section className="stella-final__powers" aria-label={fighter.name + 'の最終決戦アクション'}>
              <div className="stella-final__powers-heading">
                <div><span>{battle.fighterId === 'stella' ? "STELLA'S AUTHORITIES" : 'FINAL DUEL COMMANDS'}</span><h2>最終決戦の行動</h2></div>
                {isFighting && <span className="stella-final__turn-chip">第 {battle.turn} ターン</span>}
              </div>

              <div className="stella-final__power-grid">
                <article className="stella-final__power-card stella-final__power-card--immortal">
                  <div className="stella-final__power-icon"><Shield size={21} /></div>
                  <div className="stella-final__power-copy"><h3>不滅</h3><p>次の反撃を1ターン完全無敵で無効化。</p><small>{battle.turn < battle.immortalReadyTurn ? '次回使用：第 ' + battle.immortalReadyTurn + ' ターン' : '使用可能・4ターン周期'}</small></div>
                  <button type="button" aria-label="不滅を発動" disabled={!isFighting || battle.turn < battle.immortalReadyTurn} onClick={() => takeAction('IMMORTAL')}>発動</button>
                </article>
                <article className="stella-final__power-card stella-final__power-card--rebirth">
                  <div className="stella-final__power-icon"><HeartPulse size={21} /></div>
                  <div className="stella-final__power-copy"><h3>再誕</h3><p>最大HPを基準に100% → 50% → 25%回復。</p><small>使用回数：{battle.rebirthUses} / 3</small></div>
                  <button type="button" aria-label="再誕を発動" disabled={!isFighting || battle.rebirthUses >= 3 || battle.playerHp >= fighter.maxHp} onClick={() => takeAction('REBIRTH')}>回復</button>
                </article>
                <article className="stella-final__power-card stella-final__power-card--meteor">
                  <div className="stella-final__power-icon"><Zap size={21} /></div>
                  <div className="stella-final__power-copy"><h3>天象支配</h3><p>巨大な隕石を落とす一度きりの大技。</p><small>{battle.meteorUsed ? '使用済み' : '試作値：4,500ダメージ・1回'}</small></div>
                  <button type="button" aria-label="天象支配を発動" disabled={!isFighting || battle.meteorUsed} onClick={() => takeAction('METEOR')}>発動</button>
                </article>
              </div>
              <div className="stella-final__normal-attack">
                <span><Swords size={17} /> 通常攻撃 <small>仮設定：{fighter.normalAttackDamage.toLocaleString('ja-JP')}ダメージ</small></span>
                <button type="button" aria-label="通常攻撃" disabled={!isFighting} onClick={() => takeAction('ATTACK')}>攻撃する</button>
              </div>
              <p className="stella-final__no-forecast">敵の攻撃予測は表示されない。実際の行動を見て、権能を使い分けよう。</p>
            </section>

            <section className="stella-final__battle-log" aria-label="戦闘ログ">
              <div className="stella-final__log-heading">BATTLE LOG</div>
              <div className="stella-final__log-lines" aria-live="polite">
                {battle.logs.map((entry, index) => <p key={index}>{entry}</p>)}
              </div>
            </section>

            {(battle.status === 'VICTORY' || battle.status === 'DEFEAT') && (
              <section className={'stella-final__result stella-final__result--' + battle.status.toLowerCase()} role="status">
                <div className="stella-final__result-label">{battle.status === 'VICTORY' ? 'VICTORY' : 'DEFEAT'}</div>
                <h2>{resultTitle}</h2>
                <p>{battle.status === 'VICTORY' ? fighter.name + 'はEXカイザーを打ち破った。' : '権能を見直し、第三形態の制限ターン内に決着をつけよう。'}</p>
                {battle.status === 'VICTORY' && (
                  <>
                    {battle.fighterId === 'stella' && rewardResult && !rewardResult.persisted ? (
                      <div className="stella-final__reward-error" role="alert" aria-label="最終決戦報酬の保存エラー">
                        <strong>報酬を保存できなかった</strong>
                        <p>100Pとクリア記録は保存されていない。再戦せずに保存を再試行できる。</p>
                        <button type="button" onClick={() => setRewardResult(onClaimVictoryReward())}>報酬保存を再試行</button>
                      </div>
                    ) : (
                      <div className="stella-final__reward-notice" role="status" aria-label="最終決戦クリア報酬">
                        {battle.fighterId === 'stella' && rewardResult?.rewardGranted
                          ? '初回クリア報酬を獲得！ ステータスポイント +100P。最終決戦用いれーなが解放された。'
                          : progress.finalBattleRewardClaimed
                            ? '初回クリア報酬 +100P は獲得済み。最終決戦用いれーなは解放済み。再戦報酬の重複付与はない。'
                            : '初回クリア報酬はステラでの初勝利時に付与される。'}
                      </div>
                    )}
                  </>
                )}
                <div className="stella-final__result-actions">
                  <button type="button" className="stella-final__start" onClick={startBattle}>もう一度挑む</button>
                  <button type="button" className="stella-final__return" onClick={onBackHome}>ホームへ戻る</button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default StellaFinalBattleScreen;
