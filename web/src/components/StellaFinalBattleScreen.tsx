import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Flame, HeartPulse, Shield, Sparkles, Swords, TimerReset, Zap } from 'lucide-react';
import { KAISER } from '../data/characters';
import kaiserImage from '../assets/img_kaiser.jpg';
import battleBackground from '../assets/戦闘中背景.png';
import { STELLA_FINAL_BATTLE_TUNING, type StellaFinalBattleFighterId } from '../data/stellaFinalBattleConfig';
import type { StellaFinalBattleRewardResult, StellaModeProgress } from '../utils/storage';
import { preloadStellaFinalBattleImages } from '../utils/imagePreload';
import {
  EMPTY_SHORT_IRENA_ALLOCATION,
  SHORT_IRENA_ASCENSION_DEFENSE_DOWN_MULTIPLIER,
  SHORT_IRENA_ASCENSION_DEFENSE_DOWN_TURNS,
  SHORT_IRENA_ASCENSION_MULTIPLIER,
  SHORT_IRENA_ASCENSION_RECOVERY_TURNS,
  SHORT_IRENA_ASCENSION_TURNS,
  SHORT_IRENA_ALL_MIGHT_SPEED_MULTIPLIER,
  SHORT_IRENA_ALL_MIGHT_TURN_MULTIPLIER,
  SHORT_IRENA_STAT_POINT_TOTAL,
  SHORT_IRENA_TERMINUS_COOLDOWN_TURNS,
  SHORT_IRENA_TERMINUS_MIN_DAMAGE,
  SHORT_IRENA_TERMINUS_RECOIL_ACTION_LOCK_TURNS,
  SHORT_IRENA_TERMINUS_SPEED_DOWN_MULTIPLIER,
  SHORT_IRENA_TERMINUS_SPEED_DOWN_TURNS,
  calculateShortIrenaAttackDamage,
  applyShortIrenaDamageFloor,
  getDatenAlignment,
  canActivateShortIrenaAscension,
  shouldFailAtShortIrenaFinalDeadline,
  getShortIrenaFinalTurnLimit,
  getDatenAuthorityStage,
  shouldRearmShortIrenaFinisher,
  SHORT_IRENA_GAUGE_STEP,
  getShortIrenaCombatStats,
  getShortIrenaCounterDamage,
  getShortIrenaNormalAttackGaugeDelta,
  getShortIrenaOriginalAttackMultiplier,
  loadShortIrenaAllocation,
  saveShortIrenaAllocation,
  shiftDatenGauge,
  type ShortIrenaAlignment,
} from '../utils/shortIrenaFinalBattle';
import { STELLA_FINAL_BATTLE_IMAGES } from '../data/stellaFinalBattleConfig';
import type { StatAllocation } from '../types/game';
import './StellaFinalBattleScreen.css';

const { bossMaxHp: EX_KAISER_TOTAL_HP, meteorDamage: METEOR_DAMAGE_PROTOTYPE } = STELLA_FINAL_BATTLE_TUNING;

type BattleStatus = 'READY' | 'FIGHTING' | 'VICTORY' | 'DEFEAT';
type FinalAction = 'ATTACK' | 'IMMORTAL' | 'REBIRTH' | 'METEOR';
type ShortIrenaFinisherRoute = 'GOD_MIGHT' | 'GOD_SILENCE' | 'GOD_REBIRTH' | 'DEMON_COLLAPSE' | 'DEMON_SEVER' | 'DEMON_EXTINGUISH';
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
  shortIrenaAllocation: StatAllocation;
  datenGauge: number;
  alignment: ShortIrenaAlignment | null;
  initialChoiceMade: boolean;
  alignmentFlash: ShortIrenaAlignment | null;
  finisherRoutePending: ShortIrenaAlignment | null;
  finisherUsedAtAlignment: ShortIrenaAlignment | null;
  godMightTurns: number;
  divineSpeedTurns: number;
  allPowerTurns: number;
  allThingsTurns: number;
  alignmentFlashId: number;
  finisherAttackMultiplierSnapshot: number | null;
  finisherEffectiveSpeedSnapshot: number | null;
  kaiserActionLockTurns: number;
  kaiserDefenseNullTurns: number;
  kaiserBuffImmuneTurns: number;
  kaiserBuffs: string[];
  playerPressureTurns: number;
  playerPressureImmuneTurns: number;
  terminusReadyTurn: number;
  ascensionTurns: number;
  actionLockTurns: number;
  speedDownTurns: number;
  defenseDownTurns: number;
  allMightUsed: boolean;
  allMightMultiplier: number;
  allMightBaseAttackMultiplier: number;
  allMightSpeedMultiplier: number;
  normalAttackCutIn: boolean;
  finisherPending: ShortIrenaAlignment | null;
  logs: string[];
}

function createInitialBattle(
  status: BattleStatus = 'READY',
  fighterId: StellaFinalBattleFighterId = 'stella',
  shortIrenaAllocation: StatAllocation = EMPTY_SHORT_IRENA_ALLOCATION,
): StellaFinalBattleState {
  const fighter = STELLA_FINAL_BATTLE_TUNING.fighters[fighterId];
  const normalizedAllocation = getShortIrenaCombatStats(shortIrenaAllocation).allocation;
  const shortIrenaMaxHp = getShortIrenaCombatStats(normalizedAllocation).maxHp;
  return {
    status,
    turn: 1,
    phase: 1,
    fighterId,
    playerHp: fighterId === 'short-irena' ? shortIrenaMaxHp : fighter.maxHp,
    kaiserHp: EX_KAISER_TOTAL_HP,
    rebirthUses: 0,
    meteorUsed: false,
    immortalReadyTurn: 1,
    finalTurnLimit: null,
    finalTurnsLeft: null,
    meteorFlash: false,
    shortIrenaAllocation: normalizedAllocation,
    datenGauge: 0,
    alignment: null,
    initialChoiceMade: fighterId !== 'short-irena',
    alignmentFlash: null,
    finisherRoutePending: null,
    finisherUsedAtAlignment: null,
    godMightTurns: 0,
    divineSpeedTurns: 0,
    allPowerTurns: 0,
    allThingsTurns: 0,
    alignmentFlashId: 0,
    finisherAttackMultiplierSnapshot: null,
    finisherEffectiveSpeedSnapshot: null,
    kaiserActionLockTurns: 0,
    kaiserDefenseNullTurns: 0,
    kaiserBuffImmuneTurns: 0,
    kaiserBuffs: [],
    playerPressureTurns: 0,
    playerPressureImmuneTurns: 0,
    terminusReadyTurn: 1,
    ascensionTurns: 0,
    actionLockTurns: 0,
    speedDownTurns: 0,
    defenseDownTurns: 0,
    allMightUsed: false,
    allMightMultiplier: 1,
    allMightBaseAttackMultiplier: 1,
    allMightSpeedMultiplier: 1,
    normalAttackCutIn: false,
    finisherPending: null,
    logs: [fighterId === 'short-irena'
      ? '最終決戦用いれーな。初手で神化か堕天を選び、専用ゲージの方向を決めろ。'
      : '最終決戦の行動を使い分け、EXカイザーを撃破せよ。'],
  };
}

function phaseForHp(hp: number): BattlePhase {
  if (hp > EX_KAISER_TOTAL_HP * (2 / 3)) return 1;
  if (hp > EX_KAISER_TOTAL_HP / 3) return 2;
  return 3;
} 

interface ShortIrenaBossDamageResolution {
  remainingHp: number;
  actualDamage: number;
  cappedAtPhaseGate: boolean;
}

/**
 * Normal actions from final-duel Irena can cross only one Kaiser phase gate.
 * The finisher uses the same phase gate in forms one and two; only the final
 * form permits defeat. This preserves a climax without letting the first
 * finisher erase the phase structure.
 */
function resolveShortIrenaBossDamage(
  currentHp: number,
  requestedDamage: number,
  currentPhase: BattlePhase,
  allowDefeat = false,
): ShortIrenaBossDamageResolution {
  const safeDamage = Math.max(0, Math.ceil(requestedDamage));
  const hpBeforeGate = Math.max(0, currentHp - safeDamage);
  const phaseGateHp = currentPhase === 1
    ? Math.ceil(EX_KAISER_TOTAL_HP * (2 / 3))
    : currentPhase === 2
      ? Math.ceil(EX_KAISER_TOTAL_HP / 3)
      : allowDefeat ? 0 : 1;
  const remainingHp = Math.min(currentHp, Math.max(phaseGateHp, hpBeforeGate));
  return {
    remainingHp,
    actualDamage: Math.max(0, currentHp - remainingHp),
    cappedAtPhaseGate: currentHp > phaseGateHp && hpBeforeGate < phaseGateHp,
  };
}

const PHASE_NAMES: Record<BattlePhase, string> = {
  1: '第一形態・鉄壁',
  2: '第二形態・解放',
  3: '第三形態・終局',
};

const REBIRTH_RATIOS = [1, 0.5, 0.25] as const;

type ShortIrenaPresetId = 'BALANCED' | 'ASSAULT' | 'FORTRESS' | 'SPEED';

const SHORT_IRENA_BUILD_PRESETS: ReadonlyArray<{
  id: ShortIrenaPresetId;
  label: string;
  description: string;
  allocation: StatAllocation;
}> = [
  {
    id: 'BALANCED',
    label: '均衡型',
    description: '弱点を作りにくい標準型',
    allocation: { maxHp: 38, attack: 38, defense: 37, speed: 37 },
  },
  {
    id: 'ASSAULT',
    label: '火力型',
    description: '攻撃優先。形態を削り、終局で火力を出す',
    allocation: { maxHp: 20, attack: 75, defense: 20, speed: 35 },
  },
  {
    id: 'FORTRESS',
    label: '耐久型',
    description: 'HPと防御優先。長期戦を安定させる',
    allocation: { maxHp: 55, attack: 20, defense: 55, speed: 20 },
  },
  {
    id: 'SPEED',
    label: '速度型',
    description: '速度とゲージ操作を重視',
    allocation: { maxHp: 20, attack: 30, defense: 20, speed: 80 },
  },
];

export const StellaFinalBattleScreen: React.FC<{
  onBackHome: () => void;
  progress: StellaModeProgress;
  onClaimVictoryReward: () => StellaFinalBattleRewardResult;
}> = ({ onBackHome, progress, onClaimVictoryReward }) => {
  const [selectedFighterId, setSelectedFighterId] = useState<StellaFinalBattleFighterId>('stella');
  const [shortIrenaAllocation, setShortIrenaAllocation] = useState<StatAllocation>(() => loadShortIrenaAllocation());
  const [allocationSaveError, setAllocationSaveError] = useState(false);
  const [preloadStatus, setPreloadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [preloadRetryKey, setPreloadRetryKey] = useState(0);
  const [battle, setBattle] = useState<StellaFinalBattleState>(() => createInitialBattle());
  const rewardAttemptedForVictoryRef = useRef(false);
  const [rewardResult, setRewardResult] = useState<StellaFinalBattleRewardResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPreloadStatus('loading');
    setPreloadError(null);
    void preloadStellaFinalBattleImages().then(() => {
      if (!cancelled) setPreloadStatus('ready');
    }).catch(error => {
      if (cancelled) return;
      setPreloadStatus('error');
      setPreloadError(error instanceof Error ? error.message : String(error));
    });
    return () => { cancelled = true; };
  }, [preloadRetryKey]);

  useEffect(() => {
    if (!battle.normalAttackCutIn || battle.fighterId !== 'short-irena') return;
    const duration = battle.alignment === 'DEMON' || battle.datenGauge < 0 ? 700 : 260;
    const timer = window.setTimeout(() => {
      setBattle(current => current.normalAttackCutIn ? { ...current, normalAttackCutIn: false } : current);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [battle.normalAttackCutIn, battle.fighterId, battle.alignment, battle.datenGauge, battle.turn]);

  useEffect(() => {
    if (!battle.alignmentFlash) return;
    const flashId = battle.alignmentFlashId;
    const timer = window.setTimeout(() => {
      setBattle(current => current.alignmentFlashId === flashId ? { ...current, alignmentFlash: null } : current);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [battle.alignmentFlash, battle.alignmentFlashId]);

  useEffect(() => {
    const alignment = battle.finisherPending;
    if (!alignment || battle.status !== 'FIGHTING') return;
    const timer = window.setTimeout(() => {
      setBattle(current => {
        if (current.finisherPending !== alignment || current.status !== 'FIGHTING') return current;
        const stats = getShortIrenaCombatStats(current.shortIrenaAllocation);
        const effectiveAttackMultiplier = current.finisherAttackMultiplierSnapshot
          ?? (current.allMightMultiplier
            * current.allMightBaseAttackMultiplier
            * (current.ascensionTurns > 0 ? SHORT_IRENA_ASCENSION_MULTIPLIER : 1)
            * (current.godMightTurns > 0 ? 3 : 1)
            * (current.allPowerTurns > 0 ? 2 : 1)
            * (current.allThingsTurns > 0 ? 4 : 1)
            * (current.playerPressureTurns > 0 ? Math.max(0, stats.attack - 25) / Math.max(1, stats.attack) : 1));
        // Keep the original GOD ×5 / DEMON ×8 spectacle. The phase gate limits
        // forms one and two, while the final phase remains a valid ultimate payoff.
        const finisherMultiplier = alignment === 'GOD' ? 5 : 8;
        const finisherPower = applyShortIrenaDamageFloor(
          Math.ceil(stats.normalAttackDamage * effectiveAttackMultiplier * finisherMultiplier),
          2000,
        );
        const bossHit = resolveShortIrenaBossDamage(
          current.kaiserHp,
          finisherPower,
          current.phase,
          current.phase === 3,
        );
        const actualDamage = bossHit.actualDamage;
        const remainingBossHp = bossHit.remainingHp;
        const name = alignment === 'GOD' ? '神側の究極必殺技「創世」' : '堕天側の究極必殺技「終焉」';
        const logs = [
          ...current.logs,
          name + 'の威力' + finisherPower.toLocaleString('ja-JP') + '。実ダメージ' + actualDamage.toLocaleString('ja-JP')
            + (bossHit.cappedAtPhaseGate ? '。形態を飛ばさないため、次形態のHP境界で制限。' : '。')
            + (remainingBossHp <= 0 ? 'EXカイザー撃破。ルート効果を選択する。' : '究極技後のルートを選択する。'),
        ];
        let phase = current.phase;
        let finalTurnLimit = current.finalTurnLimit;
        let finalTurnsLeft = current.finalTurnsLeft;

        // Keep the boss phase and final-turn clock consistent with a real finisher hit.
        // Crossing into the final phase starts its deadline; a finisher used while
        // already in that phase consumes one remaining turn.
        if (remainingBossHp > 0) {
          const nextPhase = phaseForHp(remainingBossHp);
          if (nextPhase > phase) {
            phase = nextPhase;
            logs.push(PHASE_NAMES[phase] + 'へ移行。究極技のダメージ後もHPを引き継ぐ。');
            if (phase === 3) {
              finalTurnLimit = getShortIrenaFinalTurnLimit(Math.random());
              finalTurnsLeft = Math.max(0, finalTurnLimit - 1);
              logs.push('最終形態の制限開始。残りターン数が' + finalTurnLimit + 'に決定した。速度倍率による追加猶予はない。究極必殺技を発動したターンを1ターン消費。');
            }
          } else if (current.phase === 3 && current.finalTurnsLeft !== null) {
            finalTurnsLeft = Math.max(0, current.finalTurnsLeft - 1);
          }
        }
        return {
          ...current,
          kaiserHp: remainingBossHp,
          phase,
          finalTurnLimit,
          finalTurnsLeft,
          finisherPending: null,
          finisherRoutePending: alignment,
          finisherAttackMultiplierSnapshot: null,
          finisherEffectiveSpeedSnapshot: null,
          normalAttackCutIn: false,
          logs: logs.slice(-8),
        };
      });
    }, 1450);
    return () => window.clearTimeout(timer);
  }, [battle.finisherPending, battle.status]);

  const startBattle = () => {
    if (preloadStatus !== 'ready') return;
    rewardAttemptedForVictoryRef.current = false;
    setRewardResult(null);
    setBattle(createInitialBattle('FIGHTING', selectedFighterId, shortIrenaAllocation));
  };

  const changeShortIrenaAllocation = (key: keyof StatAllocation, amount: number) => {
    const next = { ...shortIrenaAllocation, [key]: shortIrenaAllocation[key] + amount };
    if (next[key] < 0) return;
    const normalized = getShortIrenaCombatStats(next);
    if (amount > 0 && normalized.remainingPoints < 0) return;
    const saved = saveShortIrenaAllocation(normalized.allocation);
    setShortIrenaAllocation(normalized.allocation);
    setAllocationSaveError(!saved);
  };

  const applyShortIrenaPreset = (allocation: StatAllocation) => {
    const normalized = getShortIrenaCombatStats(allocation).allocation;
    const saved = saveShortIrenaAllocation(normalized);
    setShortIrenaAllocation(normalized);
    setAllocationSaveError(!saved);
  };

  useEffect(() => {
    if (battle.status !== 'VICTORY' || battle.fighterId !== 'stella' || rewardAttemptedForVictoryRef.current) return;
    rewardAttemptedForVictoryRef.current = true;
    setRewardResult(onClaimVictoryReward());
  }, [battle.status, battle.fighterId, onClaimVictoryReward]);

  type ShortIrenaAction = 'DIVINIZE' | 'FALLEN' | 'MOVE_GOD' | 'MOVE_DEMON' | 'ATTACK' | 'DIVINE_SPEED' | 'ALL_POWER' | 'ALL_THINGS' | 'TERMINUS' | 'ASCENSION' | 'CONTROL_GOD' | 'CONTROL_DEMON' | 'FINISH' | 'PASS';

  const takeShortIrenaAction = (action: ShortIrenaAction) => {
    setBattle(current => {
      if (current.status !== 'FIGHTING' || current.finisherPending || current.finisherRoutePending) return current;
      const stage = getDatenAuthorityStage(current.datenGauge);
      if (!current.initialChoiceMade && action !== 'DIVINIZE' && action !== 'FALLEN') return current;
      if (current.initialChoiceMade && (action === 'DIVINIZE' || action === 'FALLEN')) return current;
      if (action === 'TERMINUS' && current.datenGauge > -30) return current;
      if (action === 'ASCENSION' && !canActivateShortIrenaAscension(current.datenGauge, current.ascensionTurns, current.phase, current.finalTurnsLeft)) return current;
      if (action === 'DIVINE_SPEED' && current.datenGauge < 30) return current;
      if (action === 'ALL_POWER' && current.datenGauge < 60) return current;
      if (action === 'ALL_THINGS' && current.datenGauge !== 100) return current;
      if ((action === 'CONTROL_GOD' || action === 'CONTROL_DEMON') && stage < 2) return current;
      if (action === 'FINISH' && !getDatenAlignment(current.datenGauge)) return current;
      if (current.finalTurnsLeft === 0 && action !== 'FINISH') return current;
      if (current.actionLockTurns > 0 && action !== 'PASS') return current;
      if (current.actionLockTurns === 0 && action === 'PASS') return current;
      if (current.ascensionTurns > 0 && (action === 'TERMINUS' || action === 'ASCENSION' || action === 'DIVINE_SPEED' || action === 'ALL_POWER' || action === 'ALL_THINGS' || action === 'CONTROL_GOD' || action === 'CONTROL_DEMON' || action === 'FINISH')) return current;

      const turn = current.turn;
      const stats = getShortIrenaCombatStats(current.shortIrenaAllocation);
      const logs = [...current.logs];
      const log = (message: string) => logs.push('第' + turn + 'ターン：' + message);

      if (action === 'FINISH') {
        const alignment = getDatenAlignment(current.datenGauge);
        if (!alignment || current.finisherUsedAtAlignment === alignment) return current;
        const finisherPressureMultiplier = current.playerPressureTurns > 0
          ? Math.max(0, stats.attack - 25) / Math.max(1, stats.attack)
          : 1;
        const finisherAttackMultiplier = current.allMightMultiplier
          * current.allMightBaseAttackMultiplier
          * (current.ascensionTurns > 0 ? SHORT_IRENA_ASCENSION_MULTIPLIER : 1)
          * (current.godMightTurns > 0 ? 3 : 1)
          * (current.allPowerTurns > 0 ? 2 : 1)
          * (current.allThingsTurns > 0 ? 4 : 1)
          * finisherPressureMultiplier;
        const finisherEffectiveSpeed = Math.max(1, stats.speed)
          * current.allMightSpeedMultiplier
          * (current.ascensionTurns > 0 ? SHORT_IRENA_ASCENSION_MULTIPLIER : 1)
          * (current.godMightTurns > 0 ? 3 : 1)
          * (current.divineSpeedTurns > 0 ? 999 : 1)
          * (current.allPowerTurns > 0 ? 2 : 1)
          * (current.allThingsTurns > 0 ? 999 : 1)
          * (current.playerPressureTurns > 0 ? Math.max(1, stats.speed - 25) / Math.max(1, stats.speed) : 1)
          * (current.speedDownTurns > 0 ? SHORT_IRENA_TERMINUS_SPEED_DOWN_MULTIPLIER : 1);
        log((alignment === 'GOD' ? '神側の究極必殺技「創世」×5' : '堕天側の究極必殺技「終焉」×8') + 'を発動。第一・第二形態では次形態のHP境界を越えない。実際のダメージ後、3ルートから選択する。');
        // FINISH consumes one player turn. Snapshot current multipliers, then tick timed effects once.
        const tick = (value: number) => Math.max(0, value - 1);
        return {
          ...current,
          turn: turn + 1,
          finisherPending: alignment,
          finisherRoutePending: null,
          finisherAttackMultiplierSnapshot: finisherAttackMultiplier,
          finisherEffectiveSpeedSnapshot: finisherEffectiveSpeed,
          godMightTurns: tick(current.godMightTurns),
          divineSpeedTurns: tick(current.divineSpeedTurns),
          allPowerTurns: tick(current.allPowerTurns),
          allThingsTurns: tick(current.allThingsTurns),
          kaiserActionLockTurns: tick(current.kaiserActionLockTurns),
          kaiserDefenseNullTurns: tick(current.kaiserDefenseNullTurns),
          kaiserBuffImmuneTurns: tick(current.kaiserBuffImmuneTurns),
          playerPressureTurns: tick(current.playerPressureTurns),
          playerPressureImmuneTurns: tick(current.playerPressureImmuneTurns),
          speedDownTurns: tick(current.speedDownTurns),
          defenseDownTurns: tick(current.defenseDownTurns),
          normalAttackCutIn: false,
          logs: logs.slice(-8),
        };
      }

      let kaiserHp = current.kaiserHp;
      let playerHp = current.playerHp;
      let phase = current.phase;
      let finalTurnLimit = current.finalTurnLimit;
      let finalTurnsLeft = current.finalTurnsLeft;
      let datenGauge = current.datenGauge;
      let alignment = current.alignment;
      let finisherUsedAtAlignment = current.finisherUsedAtAlignment;
      let initialChoiceMade = current.initialChoiceMade;
      let alignmentFlash: ShortIrenaAlignment | null = null;
      let godMightTurns = current.godMightTurns;
      let divineSpeedTurns = current.divineSpeedTurns;
      let allPowerTurns = current.allPowerTurns;
      let allThingsTurns = current.allThingsTurns;
      let alignmentFlashId = current.alignmentFlashId;
      let kaiserActionLockTurns = current.kaiserActionLockTurns;
      let kaiserDefenseNullTurns = current.kaiserDefenseNullTurns;
      let kaiserBuffImmuneTurns = current.kaiserBuffImmuneTurns;
      let kaiserBuffs = [...current.kaiserBuffs];
      let playerPressureTurns = current.playerPressureTurns;
      let playerPressureImmuneTurns = current.playerPressureImmuneTurns;
      let terminusReadyTurn = current.terminusReadyTurn;
      let ascensionTurns = current.ascensionTurns;
      let actionLockTurns = current.actionLockTurns;
      let speedDownTurns = current.speedDownTurns;
      let defenseDownTurns = current.defenseDownTurns;
      let allMightUsed = current.allMightUsed;
      let allMightMultiplier = current.allMightMultiplier;
      let allMightBaseAttackMultiplier = current.allMightBaseAttackMultiplier;
      let allMightSpeedMultiplier = current.allMightSpeedMultiplier;
      let normalAttackCutIn = false;
      let skipKaiserAction = current.kaiserActionLockTurns > 0;
      let gaugeDelta = 0;

      const wasAscended = current.ascensionTurns > 0;
      const wasGodMight = current.godMightTurns > 0;
      const wasDivineSpeed = current.divineSpeedTurns > 0;
      const wasAllPower = current.allPowerTurns > 0;
      const wasAllThings = current.allThingsTurns > 0;
      // 万象支配's cleanse happens before its attack is calculated.
      const effectivePressureTurns = action === 'ALL_THINGS' ? 0 : current.playerPressureTurns;
      const wasSpeedDown = current.speedDownTurns > 0 && action !== 'ALL_THINGS';
      const wasDefenseDown = current.defenseDownTurns > 0 && action !== 'ALL_THINGS';
      const pressureAttackMultiplier = effectivePressureTurns > 0
        ? Math.max(0, stats.attack - 25) / Math.max(1, stats.attack)
        : 1;
      const pressureSpeedMultiplier = effectivePressureTurns > 0
        ? Math.max(1, stats.speed - 25) / Math.max(1, stats.speed)
        : 1;
      const effectiveAttackMultiplier = allMightMultiplier
        * allMightBaseAttackMultiplier
        * (wasAscended ? SHORT_IRENA_ASCENSION_MULTIPLIER : 1)
        * (wasGodMight ? 3 : 1)
        * (wasAllPower || action === 'ALL_POWER' ? 2 : 1)
        * (wasAllThings || action === 'ALL_THINGS' ? 4 : 1)
        * pressureAttackMultiplier;
      const effectiveSpeed = Math.max(1, stats.speed)
        * allMightSpeedMultiplier
        * (wasAscended ? SHORT_IRENA_ASCENSION_MULTIPLIER : 1)
        * (wasGodMight ? 3 : 1)
        * (wasDivineSpeed || action === 'DIVINE_SPEED' ? 999 : 1)
        * (wasAllPower || action === 'ALL_POWER' ? 2 : 1)
        * (wasAllThings || action === 'ALL_THINGS' ? 999 : 1)
        * pressureSpeedMultiplier
        * (wasSpeedDown ? SHORT_IRENA_TERMINUS_SPEED_DOWN_MULTIPLIER : 1);
      const effectiveDefense = Math.max(0, stats.defense)
        * (wasAscended || action === 'ASCENSION' ? SHORT_IRENA_ASCENSION_MULTIPLIER : 1)
        * (wasGodMight ? 3 : 1)
        * (wasDivineSpeed || action === 'DIVINE_SPEED' ? 1.5 : 1)
        * (wasAllPower || action === 'ALL_POWER' ? 2 : 1)
        * (wasAllThings || action === 'ALL_THINGS' ? 2 : 1)
        * (wasDefenseDown ? SHORT_IRENA_ASCENSION_DEFENSE_DOWN_MULTIPLIER : 1);

      if (action === 'DIVINIZE' || action === 'MOVE_GOD' || action === 'FALLEN' || action === 'MOVE_DEMON') {
        const movesGodward = action === 'DIVINIZE' || action === 'MOVE_GOD';
        const isOpeningChoice = action === 'DIVINIZE' || action === 'FALLEN';
        if (isOpeningChoice) initialChoiceMade = true;
        alignmentFlash = movesGodward ? 'GOD' : 'DEMON';
        alignmentFlashId += 1;
        gaugeDelta = movesGodward ? SHORT_IRENA_GAUGE_STEP : -SHORT_IRENA_GAUGE_STEP;
        log(action === 'DIVINIZE'
          ? '初手「神化」。攻撃は行わず、ゲージのみ神側へ15ポイント移動する。'
          : action === 'FALLEN'
            ? '初手「堕天」。攻撃は行わず、ゲージのみ堕天側へ15ポイント移動する。'
            : 'ゲージ操作。攻撃せず、' + (movesGodward ? '神側' : '堕天側') + 'へ15ポイント移動する。');
      } else if (action === 'DIVINE_SPEED') {
        if (datenGauge < 30) return current;
        divineSpeedTurns = 4;
        log('権能「神域の速度」。防御力1.5倍、速度999倍。効果4ターン（発動ターンを含む）。');
      } else if (action === 'ALL_POWER') {
        if (datenGauge < 60) return current;
        allPowerTurns = 4;
        log('権能「全能降臨」。攻撃力・防御力・速度が2倍。効果4ターン（発動ターンを含む）。');
      } else if (action === 'ALL_THINGS') {
        if (datenGauge !== 100) return current;
        allThingsTurns = 2;
        playerPressureTurns = 0;
        speedDownTurns = 0;
        defenseDownTurns = 0;
        const rawDamage = Math.max(1, Math.ceil(stats.normalAttackDamage * effectiveAttackMultiplier));
        const resolvedDamage = calculateShortIrenaAttackDamage(rawDamage, KAISER.defense, kaiserDefenseNullTurns).damage;
        const requestedDamage = applyShortIrenaDamageFloor(resolvedDamage, 3000);
        const bossHit = resolveShortIrenaBossDamage(kaiserHp, requestedDamage, phase);
        kaiserHp = bossHit.remainingHp;
        normalAttackCutIn = true;
        log('権能「万象支配」。発動時の実ダメージは' + bossHit.actualDamage.toLocaleString('ja-JP')
          + '（威力最低3,000・形態移行上限適用後）。'
          + (bossHit.cappedAtPhaseGate ? '次形態へ進むため、実ダメージを形態移行上限で制限。' : '')
          + '攻撃4倍・防御2倍・速度999倍、状態異常を解除。効果2ターン（発動ターン込み）。');
      } else if (action === 'PASS') {
        actionLockTurns = Math.max(0, actionLockTurns - 1);
        log('権能の反動で1ターン行動不能。行動せずにターンを消費した。');
      } else if (action === 'ATTACK') {
        const reinforcingRoute = datenGauge > 0 ? 'GOD' : 'DEMON';
        gaugeDelta = getShortIrenaNormalAttackGaugeDelta(reinforcingRoute, effectiveSpeed);
        const rawDamage = Math.max(1, Math.ceil(stats.normalAttackDamage * effectiveAttackMultiplier));
        const { damage: requestedDamage, targetDefense } = calculateShortIrenaAttackDamage(
          rawDamage,
          KAISER.defense,
          kaiserDefenseNullTurns,
        );
        const bossHit = resolveShortIrenaBossDamage(kaiserHp, requestedDamage, phase);
        kaiserHp = bossHit.remainingHp;
        normalAttackCutIn = true;
        log('通常攻撃。全能倍率・強化状態を反映し、EXカイザーの防御' + targetDefense.toLocaleString('ja-JP')
          + '適用後に' + bossHit.actualDamage.toLocaleString('ja-JP') + 'ダメージ'
          + (bossHit.cappedAtPhaseGate ? '（形態移行上限適用）' : '')
          + '。堕天ゲージが' + (reinforcingRoute === 'GOD' ? '神側' : '堕天側') + 'へ傾く。');
      } else if (action === 'TERMINUS') {
        if (turn < terminusReadyTurn) return current;
        terminusReadyTurn = turn + SHORT_IRENA_TERMINUS_COOLDOWN_TURNS;
        gaugeDelta = -60;
        const requestedDamage = Math.ceil(Math.max(
          SHORT_IRENA_TERMINUS_MIN_DAMAGE,
          stats.attack * allMightMultiplier * allMightBaseAttackMultiplier * (wasGodMight ? 3 : 1) * pressureAttackMultiplier * 2.5,
        ));
        const bossHit = resolveShortIrenaBossDamage(kaiserHp, requestedDamage, phase);
        kaiserHp = bossHit.remainingHp;
        actionLockTurns = SHORT_IRENA_TERMINUS_RECOIL_ACTION_LOCK_TURNS;
        speedDownTurns = SHORT_IRENA_TERMINUS_SPEED_DOWN_TURNS;
        log('権能「終極殲滅」。防御貫通で' + bossHit.actualDamage.toLocaleString('ja-JP') + 'ダメージ'
          + (bossHit.cappedAtPhaseGate ? '（形態移行上限適用）' : '')
          + '。CT' + SHORT_IRENA_TERMINUS_COOLDOWN_TURNS + 'ターン。反動で次の1ターン行動不能、速度50%低下（2ターン）。堕天側へ傾く。');
      } else if (action === 'ASCENSION') {
        if (ascensionTurns > 0) return current;
        gaugeDelta = 60;
        // The activation action counts as the first of the three boosted turns.
        ascensionTurns = SHORT_IRENA_ASCENSION_TURNS;
        log('権能「絶界昇華」。攻撃・防御・速度が3倍になる（発動ターンを含む3ターン）。強化中は権能を使用できない。神側へ傾く。');
      } else if (action === 'CONTROL_GOD' || action === 'CONTROL_DEMON') {
        if (allMightUsed) return current;
        allMightUsed = true;
        allMightMultiplier = Math.round(turn * SHORT_IRENA_ALL_MIGHT_TURN_MULTIPLIER * 1000) / 1000;
        allMightBaseAttackMultiplier = getShortIrenaOriginalAttackMultiplier(turn);
        allMightSpeedMultiplier = SHORT_IRENA_ALL_MIGHT_SPEED_MULTIPLIER;
        playerHp = stats.maxHp;
        terminusReadyTurn = turn + 1;
        skipKaiserAction = true;
        gaugeDelta = action === 'CONTROL_GOD' ? 50 : -50;
        log('権能「理外掌握／全能」。使用ターン' + turn + 'により攻撃倍率×' + allMightMultiplier.toFixed(1) + 'を永続確定。元攻撃力は×' + allMightBaseAttackMultiplier.toFixed(2) + 'に補正。HP全回復、全権能のCTをリセット、速度' + SHORT_IRENA_ALL_MIGHT_SPEED_MULTIPLIER + '倍（永続）。カイザーの通常行動を1回停止するが、終局の即死判定は止められない。' + (action === 'CONTROL_GOD' ? '神側' : '堕天側') + 'へ干渉。');
      }

      datenGauge = shiftDatenGauge(datenGauge, gaugeDelta);
      const previousAlignment = alignment;
      alignment = getDatenAlignment(datenGauge);
      if (alignment && alignment !== previousAlignment) {
        log('ゲージが' + (alignment === 'GOD' ? '神側' : '堕天側') + 'の終点に到達。対応する究極必殺技が解放された。');
      } else if (!alignment && previousAlignment) {
        log('ゲージが終点から戻り、究極必殺技は封印された。再使用にはゲージを中央域（絶対値30未満）まで戻す必要がある。発動済みの効果やクールダウンはゲージ移動では解除されない。');
      }
      if (shouldRearmShortIrenaFinisher(finisherUsedAtAlignment, datenGauge)) {
        finisherUsedAtAlignment = null;
        log('ゲージが中央域へ戻った。究極必殺技を再び解放できる。');
      }

      const newPhase = phaseForHp(kaiserHp);
      if (newPhase > phase) {
        phase = newPhase;
        log(PHASE_NAMES[phase] + 'へ移行。これまでのダメージは引き継がれる。');
        if (phase === 3) {
          finalTurnLimit = getShortIrenaFinalTurnLimit(Math.random());
          finalTurnsLeft = finalTurnLimit;
          logs.push('最終形態の制限開始。残りターン数が' + finalTurnLimit + 'に決定した。速度倍率による追加猶予はない。');
        }
      }

      if (skipKaiserAction) {
        log(action === 'CONTROL_GOD' || action === 'CONTROL_DEMON'
          ? '理外掌握によりカイザーの通常行動を停止。第三形態の終局判定タイマーには干渉できない。'
          : '静寂によりカイザーの通常反撃を停止。第三形態の終局判定タイマーには干渉できない。');
      } else {
        const baseCounter = STELLA_FINAL_BATTLE_TUNING.phaseCounterDamage[phase];
        const enemyDamage = getShortIrenaCounterDamage(baseCounter, effectiveDefense);
        playerHp = Math.max(0, playerHp - enemyDamage);
        log('EXカイザーの反撃。適用中の防御補正後、' + enemyDamage.toLocaleString('ja-JP') + 'ダメージを受けた。');
      }

      if (ascensionTurns > 0) {
        ascensionTurns = Math.max(0, ascensionTurns - 1);
        if (ascensionTurns === 0) {
          actionLockTurns = SHORT_IRENA_ASCENSION_RECOVERY_TURNS;
          defenseDownTurns = SHORT_IRENA_ASCENSION_DEFENSE_DOWN_TURNS;
          log('絶界昇華が終了。反動で次の1ターン行動不能、防御50%低下（3ターン）。');
        }
      }
      if (wasGodMight) godMightTurns = Math.max(0, godMightTurns - 1);
      if (wasDivineSpeed || action === 'DIVINE_SPEED') divineSpeedTurns = Math.max(0, divineSpeedTurns - 1);
      if (wasAllPower || action === 'ALL_POWER') allPowerTurns = Math.max(0, allPowerTurns - 1);
      if (wasAllThings || action === 'ALL_THINGS') allThingsTurns = Math.max(0, allThingsTurns - 1);
      if (current.kaiserActionLockTurns > 0) kaiserActionLockTurns = Math.max(0, kaiserActionLockTurns - 1);
      if (current.kaiserDefenseNullTurns > 0) kaiserDefenseNullTurns = Math.max(0, kaiserDefenseNullTurns - 1);
      if (current.kaiserBuffImmuneTurns > 0) kaiserBuffImmuneTurns = Math.max(0, kaiserBuffImmuneTurns - 1);
      if (current.playerPressureTurns > 0) playerPressureTurns = Math.max(0, playerPressureTurns - 1);
      if (current.playerPressureImmuneTurns > 0) playerPressureImmuneTurns = Math.max(0, playerPressureImmuneTurns - 1);

      if (wasSpeedDown) speedDownTurns = Math.max(0, speedDownTurns - 1);
      if (wasDefenseDown) defenseDownTurns = Math.max(0, defenseDownTurns - 1);

      let status: BattleStatus = 'FIGHTING';
      if (playerHp <= 0) {
        status = 'DEFEAT';
        log('最終決戦用いれーなは戦闘不能になった。');
      } else if (current.phase === 3 && finalTurnsLeft !== null) {
        finalTurnsLeft = Math.max(0, finalTurnsLeft - 1);
        if (finalTurnsLeft === 0 && shouldFailAtShortIrenaFinalDeadline({
          alignment,
          skipKaiserAction,
          action,
          actionLockTurns,
          finisherUsedAtAlignment,
          ascensionTurns,
        })) {
          status = 'DEFEAT';
          playerHp = 0;
          logs.push(
            !alignment
              ? '最終判定。堕天ゲージが神側にも堕天側にも振り切れていないため敗北。'
              : skipKaiserAction
                ? '最終判定。理外掌握でもカイザーの即死行動は止められず、敗北。'
                : action === 'PASS' || actionLockTurns > 0
                  ? '最終判定。反動で最終必殺技を放てず、カイザーの即死行動により敗北。'
                  : '最終判定。究極必殺技はこの終点で使用済みのため再使用できず敗北。',
          );
        } else if (finalTurnsLeft === 0 && alignment) {
          logs.push('最終判定。' + (alignment === 'GOD' ? '神側' : '堕天側') + 'への傾きは確定済み。最終必殺技を発動できる最後の機会。');
        }
      }
      return {
        ...current,
        status,
        turn: status === 'FIGHTING' ? turn + 1 : turn,
        phase,
        playerHp,
        kaiserHp,
        finalTurnLimit,
        finalTurnsLeft,
        datenGauge,
        alignment,
        initialChoiceMade,
        alignmentFlash,
        finisherUsedAtAlignment,
        godMightTurns,
        divineSpeedTurns,
        allPowerTurns,
        allThingsTurns,
        alignmentFlashId,
        kaiserActionLockTurns,
        kaiserDefenseNullTurns,
        kaiserBuffImmuneTurns,
        kaiserBuffs,
        playerPressureTurns,
        playerPressureImmuneTurns,
        terminusReadyTurn,
        ascensionTurns,
        actionLockTurns,
        speedDownTurns,
        defenseDownTurns,
        allMightUsed,
        allMightMultiplier,
        allMightBaseAttackMultiplier,
        allMightSpeedMultiplier,
        normalAttackCutIn,
        logs: logs.slice(-8),
      };
    });
  };

  const takeFinisherRoute = (route: ShortIrenaFinisherRoute) => {
    setBattle(current => {
      const alignment = current.finisherRoutePending;
      if (current.status !== 'FIGHTING' || !alignment) return current;

      const logs = [...current.logs];
      const log = (message: string) => logs.push('第' + current.turn + 'ターン：' + message);
      let godMightTurns = current.godMightTurns;
      let kaiserActionLockTurns = current.kaiserActionLockTurns;
      let kaiserDefenseNullTurns = current.kaiserDefenseNullTurns;
      let kaiserBuffImmuneTurns = current.kaiserBuffImmuneTurns;
      let kaiserBuffs = [...current.kaiserBuffs];
      let playerPressureTurns = current.playerPressureTurns;
      let playerPressureImmuneTurns = current.playerPressureImmuneTurns;
      let terminusReadyTurn = current.terminusReadyTurn;

      if (alignment === 'GOD') {
        if (route === 'GOD_MIGHT') {
          godMightTurns = 2;
          log('創世の分岐「神威」。攻撃・防御・速度が3倍（2ターン）になる。');
        } else if (route === 'GOD_SILENCE') {
          kaiserActionLockTurns = 1;
          log('創世の分岐「静寂」。EXカイザーの次の通常反撃を1回だけ停止する。終局判定は停止しない。');
        } else if (route === 'GOD_REBIRTH') {
          terminusReadyTurn = current.turn;
          log('創世の分岐「再臨」。既存コードでクールダウン管理されている終極殲滅を再使用可能にした。');
        } else {
          return current;
        }
      } else {
        if (route === 'DEMON_COLLAPSE') {
          kaiserDefenseNullTurns = 3;
          log('終焉の分岐「崩壊」。EXカイザーの防御を0として扱う（3ターン）。');
        } else if (route === 'DEMON_SEVER') {
          kaiserBuffs = [];
          kaiserBuffImmuneTurns = 10;
          log('終焉の分岐「断絶」。カイザーの適用中バフを解除し、新たなバフ付与を10ターン拒否する。');
        } else if (route === 'DEMON_EXTINGUISH') {
          playerPressureTurns = 0;
          playerPressureImmuneTurns = 5;
          log('終焉の分岐「消滅」。いれーなの重圧を解除し、重圧耐性を5ターン得る。');
        } else {
          return current;
        }
      }

      let status: BattleStatus = current.kaiserHp <= 0 ? 'VICTORY' : 'FIGHTING';
      let playerHp = current.playerHp;
      if (status !== 'VICTORY' && current.phase === 3 && current.finalTurnsLeft === 0) {
        status = 'DEFEAT';
        playerHp = 0;
        log('最終判定。ルート効果を適用したが、EXカイザーが生存したため終局判定で敗北。');
      } else if (status === 'VICTORY') {
        log('ルート効果の適用後、EXカイザーを撃破した。最終決戦に勝利！');
      }

      return {
        ...current,
        status,
        playerHp,
        finisherRoutePending: null,
        finisherUsedAtAlignment: alignment,
        godMightTurns,
        kaiserActionLockTurns,
        kaiserDefenseNullTurns,
        kaiserBuffImmuneTurns,
        kaiserBuffs,
        playerPressureTurns,
        playerPressureImmuneTurns,
        terminusReadyTurn,
        logs: logs.slice(-8),
      };
    });
  };

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
  const activeAllocation = battle.status === 'READY' ? shortIrenaAllocation : battle.shortIrenaAllocation;
  const shortStats = getShortIrenaCombatStats(activeAllocation);
  const fighterMaxHp = displayedFighterId === 'short-irena' ? shortStats.maxHp : fighter.maxHp;
  const displayedPlayerHp = battle.status === 'READY' ? fighterMaxHp : battle.playerHp;
  const playerHpPercent = Math.max(0, (displayedPlayerHp / fighterMaxHp) * 100);
  const displayedFighterImage = displayedFighterId === 'short-irena'
    ? battle.status !== 'READY' && battle.alignment === 'GOD'
      ? STELLA_FINAL_BATTLE_IMAGES.irenaGodPortrait
      : battle.status !== 'READY' && battle.alignment === 'DEMON'
        ? STELLA_FINAL_BATTLE_IMAGES.irenaDemonPortrait
        : fighter.imageSrc
    : fighter.imageSrc;
  const displayedAllMightMultiplier = battle.status === 'READY' ? 1 : battle.allMightMultiplier;
  const displayedAllMightBaseAttackMultiplier = battle.status === 'READY' ? 1 : battle.allMightBaseAttackMultiplier;
  const displayedAscensionMultiplier = battle.status !== 'READY' && battle.ascensionTurns > 0 ? SHORT_IRENA_ASCENSION_MULTIPLIER : 1;
  const displayedGodMightMultiplier = battle.status !== 'READY' && battle.godMightTurns > 0 ? 3 : 1;
  const displayedDivineSpeedMultiplier = battle.status !== 'READY' && battle.divineSpeedTurns > 0 ? 999 : 1;
  const displayedAllPowerMultiplier = battle.status !== 'READY' && battle.allPowerTurns > 0 ? 2 : 1;
  const displayedAllThingsMultiplier = battle.status !== 'READY' && battle.allThingsTurns > 0 ? 4 : 1;
  const displayedPressureAttackMultiplier = battle.status !== 'READY' && battle.playerPressureTurns > 0
    ? Math.max(0, shortStats.attack - 25) / Math.max(1, shortStats.attack)
    : 1;
  const normalAttackDamage = displayedFighterId === 'short-irena'
    ? Math.max(1, Math.ceil(shortStats.normalAttackDamage * displayedAllMightMultiplier * displayedAllMightBaseAttackMultiplier * displayedAscensionMultiplier * displayedGodMightMultiplier * displayedAllPowerMultiplier * displayedAllThingsMultiplier * displayedPressureAttackMultiplier) - (battle.status !== 'READY' && battle.kaiserDefenseNullTurns > 0 ? 0 : KAISER.defense))
    : fighter.normalAttackDamage;
  const normalAttackDamageAfterPhaseLimit = displayedFighterId === 'short-irena'
    ? resolveShortIrenaBossDamage(battle.kaiserHp, normalAttackDamage, battle.phase).actualDamage
    : normalAttackDamage;
  const displayedEffectiveAttack = Math.ceil(shortStats.attack * displayedAllMightMultiplier * displayedAllMightBaseAttackMultiplier * displayedAscensionMultiplier * displayedGodMightMultiplier * displayedAllPowerMultiplier * displayedAllThingsMultiplier * displayedPressureAttackMultiplier);
  const displayedEffectiveDefense = Math.ceil(shortStats.defense * displayedAscensionMultiplier * displayedGodMightMultiplier * (battle.status !== 'READY' && battle.divineSpeedTurns > 0 ? 1.5 : 1) * displayedAllPowerMultiplier * (battle.status !== 'READY' && battle.allThingsTurns > 0 ? 2 : 1) * (battle.status !== 'READY' && battle.defenseDownTurns > 0 ? SHORT_IRENA_ASCENSION_DEFENSE_DOWN_MULTIPLIER : 1));
  const displayedEffectiveSpeed = Math.ceil(shortStats.speed * (battle.status === 'READY' ? 1 : battle.allMightSpeedMultiplier) * displayedAscensionMultiplier * displayedGodMightMultiplier * displayedDivineSpeedMultiplier * displayedAllPowerMultiplier * (battle.status !== 'READY' && battle.allThingsTurns > 0 ? 999 : 1) * (battle.status !== 'READY' && battle.playerPressureTurns > 0 ? Math.max(1, shortStats.speed - 25) / Math.max(1, shortStats.speed) : 1) * (battle.status !== 'READY' && battle.speedDownTurns > 0 ? SHORT_IRENA_TERMINUS_SPEED_DOWN_MULTIPLIER : 1));
  const shortIrenaBuildAttackRequested = calculateShortIrenaAttackDamage(
    shortStats.normalAttackDamage,
    KAISER.defense,
    0,
  ).damage;
  const shortIrenaBuildAttackPreview = resolveShortIrenaBossDamage(
    EX_KAISER_TOTAL_HP,
    shortIrenaBuildAttackRequested,
    1,
  ).actualDamage;
  const shortIrenaBuildCounterPreview = getShortIrenaCounterDamage(
    STELLA_FINAL_BATTLE_TUNING.phaseCounterDamage[1],
    shortStats.defense,
  );
  const shortIrenaCounterBaseDamage = STELLA_FINAL_BATTLE_TUNING.phaseCounterDamage[battle.phase];
  const shortIrenaForecastEffectiveDefense = Math.max(0, shortStats.defense)
    * (battle.ascensionTurns > 0 ? SHORT_IRENA_ASCENSION_MULTIPLIER : 1)
    * (battle.godMightTurns > 0 ? 3 : 1)
    * (battle.divineSpeedTurns > 0 ? 1.5 : 1)
    * (battle.allPowerTurns > 0 ? 2 : 1)
    * (battle.allThingsTurns > 0 ? 2 : 1)
    * (battle.defenseDownTurns > 0 ? SHORT_IRENA_ASCENSION_DEFENSE_DOWN_MULTIPLIER : 1);
  const shortIrenaCounterForecast = battle.kaiserActionLockTurns > 0
    ? 0
    : getShortIrenaCounterDamage(shortIrenaCounterBaseDamage, shortIrenaForecastEffectiveDefense);
  const authorityStage = getDatenAuthorityStage(battle.datenGauge);
  const authorityStageLabel = authorityStage === 0
    ? '0〜29ポイント：権能未解放'
    : authorityStage === 1
      ? '30〜59ポイント：第1段階'
      : authorityStage === 2
        ? '60〜99ポイント：第2段階'
        : '100ポイント：終点・究極必殺技';
  const canUseTerminus = battle.datenGauge <= -30;
  const canActivateAscension = canActivateShortIrenaAscension(battle.datenGauge, battle.ascensionTurns, battle.phase, battle.finalTurnsLeft);
  const canUseDivineSpeed = battle.datenGauge >= 30;
  const canUseAllPower = battle.datenGauge >= 60;
  const canUseAllThings = battle.datenGauge === 100;
  const canUseAllMight = authorityStage >= 2;
  const canUseUltimate = battle.alignment !== null && battle.finisherUsedAtAlignment !== battle.alignment;
  const shortIrenaCommandWindow = isFighting
    && battle.initialChoiceMade
    && battle.actionLockTurns === 0
    && battle.ascensionTurns === 0
    && !battle.finisherPending
    && !battle.finisherRoutePending
    && battle.finalTurnsLeft !== 0;
  const canMoveShortIrenaGauge = isFighting
    && battle.initialChoiceMade
    && battle.actionLockTurns === 0
    && !battle.finisherPending
    && !battle.finisherRoutePending
    && battle.finalTurnsLeft !== 0;
  const shortIrenaUltimateWindow = isFighting
    && battle.initialChoiceMade
    && canUseUltimate
    && battle.actionLockTurns === 0
    && battle.ascensionTurns === 0
    && !battle.finisherPending
    && !battle.finisherRoutePending;
  const kaiserHpPercent = Math.max(0, (battle.kaiserHp / EX_KAISER_TOTAL_HP) * 100);
  const resultTitle = battle.status === 'VICTORY' ? '最終決戦 勝利' : '最終決戦 敗北';
  const shortIrenaActiveEffects: Array<{ id: string; label: string; kind: 'buff' | 'debuff' | 'control' }> = [
    ...(battle.ascensionTurns > 0 ? [{ id: 'ascension', label: '絶界昇華 ' + battle.ascensionTurns + 'T', kind: 'buff' as const }] : []),
    ...(battle.godMightTurns > 0 ? [{ id: 'god-might', label: '神威 ' + battle.godMightTurns + 'T', kind: 'buff' as const }] : []),
    ...(battle.divineSpeedTurns > 0 ? [{ id: 'divine-speed', label: '速度999× ' + battle.divineSpeedTurns + 'T', kind: 'buff' as const }] : []),
    ...(battle.allPowerTurns > 0 ? [{ id: 'all-power', label: '全能降臨 ' + battle.allPowerTurns + 'T', kind: 'buff' as const }] : []),
    ...(battle.allThingsTurns > 0 ? [{ id: 'all-things', label: '万象支配 ' + battle.allThingsTurns + 'T', kind: 'buff' as const }] : []),
    ...(battle.actionLockTurns > 0 ? [{ id: 'action-lock', label: '行動不能 1T', kind: 'debuff' as const }] : []),
    ...(battle.speedDownTurns > 0 ? [{ id: 'speed-down', label: '速度低下 ' + battle.speedDownTurns + 'T', kind: 'debuff' as const }] : []),
    ...(battle.defenseDownTurns > 0 ? [{ id: 'defense-down', label: '防御低下 ' + battle.defenseDownTurns + 'T', kind: 'debuff' as const }] : []),
    ...(battle.playerPressureTurns > 0 ? [{ id: 'pressure', label: '重圧 ' + battle.playerPressureTurns + 'T', kind: 'debuff' as const }] : []),
    ...(battle.kaiserActionLockTurns > 0 ? [{ id: 'kaiser-lock', label: '静寂 ' + battle.kaiserActionLockTurns + 'T', kind: 'control' as const }] : []),
    ...(battle.kaiserDefenseNullTurns > 0 ? [{ id: 'kaiser-defense-null', label: '崩壊 ' + battle.kaiserDefenseNullTurns + 'T', kind: 'control' as const }] : []),
    ...(battle.kaiserBuffImmuneTurns > 0 ? [{ id: 'kaiser-buff-immune', label: '断絶 ' + battle.kaiserBuffImmuneTurns + 'T', kind: 'control' as const }] : []),
    ...(battle.playerPressureImmuneTurns > 0 ? [{ id: 'pressure-immune', label: '重圧耐性 ' + battle.playerPressureImmuneTurns + 'T', kind: 'buff' as const }] : []),
    ...(battle.allMightUsed ? [{ id: 'all-might', label: '理外掌握 済', kind: 'buff' as const }] : []),
    ...(battle.fighterId === 'short-irena' ? [{
      id: 'effective-stats',
      label: '実効ステータス：ATK ' + displayedEffectiveAttack.toLocaleString('ja-JP') + '／DEF ' + displayedEffectiveDefense.toLocaleString('ja-JP') + '／SPD ' + displayedEffectiveSpeed.toLocaleString('ja-JP') + '・全能 ' + battle.allMightMultiplier.toFixed(1) + '倍（永続）',
      kind: 'control' as const,
    }] : []),
  ];

  return (
    <main className={"stella-final" + (battle.status !== 'READY' ? ' stella-final--playing' : '')} style={{ backgroundImage: 'linear-gradient(180deg, rgba(4, 6, 18, .52), rgba(4, 6, 18, .94)), url(' + JSON.stringify(battleBackground) + ')' }}>
      <div className="stella-final__ambient" aria-hidden="true" />
      <header className="stella-final__header">
        <button type="button" className="stella-final__back" onClick={onBackHome} aria-label="ホームに戻る">
          <ArrowLeft size={17} /> ホーム
        </button>
        <div className="stella-final__eyebrow">STELLA MODE / FINAL DUEL</div>
        {battle.status === 'READY' ? (
          <div className="stella-final__header-mark"><Sparkles size={17} /> 最終決戦専用モード</div>
        ) : (
          <div className="stella-final__combat-heading" aria-live="polite">
            <strong>カイザー最終決戦</strong>
            <span>{PHASE_NAMES[battle.phase]}</span>
            {isFighting && <small>TURN {battle.turn}</small>}
          </div>
        )}
      </header>

      <div className="stella-final__content">
        <div className="stella-final__title-block">
          <p>THE FINAL ENCOUNTER</p>
          <h1>EXカイザー 最終決戦</h1>
          <span>三形態・HP引き継ぎ・最終形態ターン制限</span>
        </div>

        <section className="stella-final__arena" aria-label="最終決戦の戦場">
          <div className="stella-final__arena-art stella-final__arena-art--player" aria-hidden="true"><img src={displayedFighterImage} alt="" /></div>
          <div className="stella-final__arena-art stella-final__arena-art--kaiser" aria-hidden="true"><img src={kaiserImage} alt="" /></div>
          <div className="stella-final__fighter stella-final__fighter--stella">
            <div className="stella-final__portrait">
              <img src={displayedFighterImage} alt={fighter.name} data-testid="final-battle-player-portrait" />
              <span className="stella-final__portrait-label">PLAYER</span>
            </div>
            <div className="stella-final__fighter-name">{fighter.name}</div>
            <div className="stella-final__fighter-subtitle">{fighter.title}{displayedFighterId === 'short-irena' && battle.status !== 'READY' && battle.alignment ? '・' + (battle.alignment === 'GOD' ? '神側終点' : '堕天側終点') : ''}</div>
            <div className="stella-final__hp-meta"><span>HP</span><strong>{displayedPlayerHp.toLocaleString('ja-JP')} / {fighterMaxHp.toLocaleString('ja-JP')}</strong></div>
            <div className="stella-final__hp-track" role="progressbar" aria-label={fighter.name + 'のHP'} aria-valuemin={0} aria-valuemax={fighterMaxHp} aria-valuenow={displayedPlayerHp}>
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
                        {battle.fighterId === 'stella' && isFighting && (
                <section className="stella-final__counter-forecast stella-final__counter-forecast--stella"
                  aria-label="EXカイザーの次の行動予告" aria-live="polite">
                  <div className="stella-final__counter-forecast-heading">
                    <span>敵の次の行動</span>
                    <strong>{PHASE_NAMES[battle.phase]}</strong>
                  </div>
                  <div className="stella-final__counter-forecast-values">
                    <div><span>EXカイザーの通常反撃</span><strong>{STELLA_FINAL_BATTLE_TUNING.phaseCounterDamage[battle.phase].toLocaleString('ja-JP')} ダメージ</strong></div>
                  </div>
                </section>
              )}
                        {battle.fighterId === 'short-irena' && (
                <section className={'stella-final__counter-forecast' + (battle.phase === 3 && (battle.finalTurnsLeft ?? 99) <= 2 ? ' stella-final__counter-forecast--urgent' : '')}
                  aria-label="EXカイザーの次の行動予告" aria-live="polite">
                  <div className="stella-final__counter-forecast-heading">
                    <span>敵の行動予告</span>
                    <strong>{battle.phase === 3 ? '第三形態・終局' : PHASE_NAMES[battle.phase]}</strong>
                  </div>
                  <div className="stella-final__counter-forecast-values">
                    <div><span>通常反撃の基本値</span><strong>{shortIrenaCounterBaseDamage.toLocaleString('ja-JP')}</strong></div>
                    <div><span>現在の防御込み目安</span><strong>{shortIrenaCounterForecast.toLocaleString('ja-JP')} ダメージ</strong></div>
                  </div>
                  {battle.phase === 3 && battle.finalTurnsLeft !== null && (
                    <div className="stella-final__final-deadline" role="status">
                      終局まで <strong>{battle.finalTurnsLeft} 手</strong>
                    </div>
                  )}
                </section>
              )}
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
                  aria-pressed={selectedFighterId === 'short-irena'}
                  onClick={() => setSelectedFighterId('short-irena')}
                >
                  <img src={STELLA_FINAL_BATTLE_TUNING.fighters['short-irena'].imageSrc} alt="" />
                  <span><strong>最終決戦用いれーな</strong><small>神魔分岐・150P専用育成</small></span>
                  <span className="stella-final__choice-state">{selectedFighterId === 'short-irena' ? '選択中' : '選択'}</span>
                </button>
              ) : (
                <p className="stella-final__locked-character">最終決戦にステラで初勝利すると、クリア報酬とともに最終決戦用いれーなが解放される。</p>
              )}
            </div>
            <p className="stella-final__prototype-note">最終決戦用いれーなは最終決戦限定。通常版いれーなの基礎データ・育成データは変更しない。</p>
            {selectedFighterId === 'short-irena' && (
              <section className="stella-final__short-build" aria-label="最終決戦用いれーなの150P育成">
                <div className="stella-final__short-build-heading">
                  <strong>専用ステータス育成</strong>
                  <span>{shortStats.spentPoints} / {SHORT_IRENA_STAT_POINT_TOTAL}P 使用・残り {shortStats.remainingPoints}P</span>
                </div>
                <div className="stella-final__build-preset-list" aria-label="おすすめ育成型">
                  {SHORT_IRENA_BUILD_PRESETS.map(preset => {
                    const selected = (Object.keys(preset.allocation) as Array<keyof StatAllocation>)
                      .every(key => preset.allocation[key] === shortIrenaAllocation[key]);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={selected}
                        className="stella-final__build-preset"
                        onClick={() => applyShortIrenaPreset(preset.allocation)}
                      >
                        <strong>{preset.label}</strong>
                        <span>{preset.description}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="stella-final__short-build-grid">
                  {([
                    ['maxHp', '最大HP', shortStats.maxHp],
                    ['attack', '攻撃', shortStats.attack],
                    ['defense', '防御', shortStats.defense],
                    ['speed', '速度', shortStats.speed],
                  ] as const).map(([key, label, value]) => (
                    <div className="stella-final__stat-stepper" key={key}>
                      <div><strong>{label}</strong><span>{value.toLocaleString('ja-JP')}</span></div>
                      <div className="stella-final__stat-stepper-actions">
                        <button type="button" aria-label={label + 'を1P減らす'} disabled={shortIrenaAllocation[key] <= 0} onClick={() => changeShortIrenaAllocation(key, -1)}>−</button>
                        <span>{shortIrenaAllocation[key]}P</span>
                        <button type="button" aria-label={label + 'を1P増やす'} disabled={shortStats.remainingPoints <= 0} onClick={() => changeShortIrenaAllocation(key, 1)}>＋</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="stella-final__short-build-impact" aria-label="配分による戦闘への影響">
                  <div><span>初撃の実ダメージ予測</span><strong>{shortIrenaBuildAttackPreview.toLocaleString('ja-JP')} ダメージ</strong></div>
                  <div><span>第一形態の反撃目安</span><strong>{shortIrenaBuildCounterPreview.toLocaleString('ja-JP')} ダメージ</strong></div>
                  <p>目安は強化・状態異常なしの値。実戦中は権能や反動により変化する。</p>
                </div>
                <p>150Pを自由配分。1Pあたり HP +200 / 攻撃 +12 / 防御 +6 / 速度 +6。基本値 HP 4000 / ATK 360 / DEF 200 / SPD 240。プリセット適用後も1P単位で調整できる。</p>
                {allocationSaveError && <p className="stella-final__asset-error" role="alert">育成配分を保存できなかった。今回は変更を適用するが、再読み込みすると保存されていない可能性がある。</p>}
              </section>
            )}
          </section>
        )}

        {battle.meteorFlash && battle.fighterId === 'stella' && (
          <div className="stella-final__meteor-cut-in" aria-hidden="true">
            <img src={STELLA_FINAL_BATTLE_TUNING.meteorCutInImage} alt="" />
            <span>天象支配</span>
          </div>
        )}
        {battle.normalAttackCutIn && battle.fighterId === 'short-irena' && (
          (battle.alignment === 'DEMON' || battle.datenGauge < 0)
            ? <div key={battle.turn} className="stella-final__short-attack-cutin" data-testid="short-irena-normal-cutin" aria-hidden="true"><img src={STELLA_FINAL_BATTLE_IMAGES.irenaDemonAttackCutIn} alt="" /><span>終極殲滅</span></div>
            : <div key={battle.turn} className="stella-final__short-attack-flash" aria-hidden="true"><span>神速の一閃</span></div>
        )}
        {battle.alignmentFlash && battle.fighterId === 'short-irena' && (
          <div
            key={battle.alignmentFlashId}
            className={'stella-final__alignment-flash stella-final__alignment-flash--' + battle.alignmentFlash.toLowerCase()}
            data-testid="short-irena-alignment-flash"
            aria-hidden="true"
          />
        )}
        {battle.finisherPending && (
          <div className={'stella-final__short-finisher stella-final__short-finisher--' + battle.finisherPending.toLowerCase()} data-testid="short-irena-finisher" role="status" aria-label={battle.finisherPending === 'GOD' ? '神側最終必殺技演出' : '堕天側最終必殺技演出'}>
            <img
              src={battle.finisherPending === 'GOD' ? STELLA_FINAL_BATTLE_IMAGES.irenaGodFinalFinisher : STELLA_FINAL_BATTLE_IMAGES.irenaDemonFinalFinisher}
              alt=""
              data-testid="short-irena-finisher-image"
            />
            <strong>{battle.finisherPending === 'GOD' ? '創世' : '終焉'}</strong>
            <span>{battle.finisherPending === 'GOD' ? '神側の究極必殺技' : '堕天側の究極必殺技'}</span>
          </div>
        )}

        {battle.finisherRoutePending && battle.fighterId === 'short-irena' && (
          <section
            className={'stella-final__route-select stella-final__route-select--' + battle.finisherRoutePending.toLowerCase()}
            role="dialog"
            aria-modal="true"
            aria-label={battle.finisherRoutePending === 'GOD' ? '創世のルート選択' : '終焉のルート選択'}
          >
            <div className="stella-final__route-select-copy">
              <span>ULTIMATE ROUTE</span>
              <h2>{battle.finisherRoutePending === 'GOD' ? '創世' : '終焉'}</h2>
              <p>究極技の大ダメージ適用済み。追加攻撃は行わず、効果から1つだけ選択する。</p>
            </div>
            {battle.finisherRoutePending === 'GOD' ? (
              <div className="stella-final__route-select-grid">
                <button type="button" onClick={() => takeFinisherRoute('GOD_MIGHT')}><strong>神威</strong><span>攻撃・防御・速度を3倍（2ターン）</span></button>
                <button type="button" onClick={() => takeFinisherRoute('GOD_SILENCE')}><strong>静寂</strong><span>カイザーの通常反撃を1回停止</span></button>
                <button type="button" onClick={() => takeFinisherRoute('GOD_REBIRTH')}><strong>再臨</strong><span>既存の権能クールダウンをリセット</span></button>
              </div>
            ) : (
              <div className="stella-final__route-select-grid">
                <button type="button" onClick={() => takeFinisherRoute('DEMON_COLLAPSE')}><strong>崩壊</strong><span>カイザーの防御を0として扱う（3ターン）</span></button>
                <button type="button" onClick={() => takeFinisherRoute('DEMON_SEVER')}><strong>断絶</strong><span>適用中のバフを解除し、新たなバフ付与を10ターン無効</span></button>
                <button type="button" onClick={() => takeFinisherRoute('DEMON_EXTINGUISH')}><strong>消滅</strong><span>自分の重圧解除、重圧耐性を5ターン</span></button>
              </div>
            )}
          </section>
        )}
        {battle.status === 'READY' ? (
          <section className="stella-final__briefing" aria-label="最終決戦ルール">
            <div className="stella-final__briefing-heading"><Shield size={18} /> 最終決戦のルール</div>
            <p>EXカイザーは三形態。HP境界は10,000／5,000で、形態変化後も残りHPを引き継ぐ。通常攻撃と通常権能は、一度の行動で次の形態を飛ばせない。</p>
            <p>第三形態の制限ターン数は8～10ターンで、速度や速度倍率による追加猶予はない。究極技で第三形態へ入った場合、その発動ターン分を1手消費する。期限を過ぎると終局の必殺技で敗北。</p>
            {selectedFighterId === 'short-irena' && <p>最終決戦用いれーなは150P専用育成。初手で神化／堕天を選び、ゲージを15ポイント移動。±30／±60で権能が増え、±100で究極技を解放する。創世×5／終焉×8は第一・第二形態で次のHP境界に止まり、第三形態では撃破可能。攻撃配分は火力、速度配分は敵より先に行動するために影響する。</p>}
            <p className="stella-final__prototype-note">戦闘データ：EXカイザー最大HP {EX_KAISER_TOTAL_HP.toLocaleString('ja-JP')}／天象支配 {METEOR_DAMAGE_PROTOTYPE.toLocaleString('ja-JP')}ダメージ（1回）。</p>
            {preloadStatus === 'loading' && <p className="stella-final__asset-status" role="status">最終決戦の画像素材をプリロード中…</p>}
            {preloadStatus === 'ready' && <p className="stella-final__asset-status" role="status">最終決戦の画像素材 読み込み完了</p>}
            {preloadStatus === 'error' && <div className="stella-final__asset-error" role="alert" aria-label="最終決戦画像のプリロード失敗"><strong>画像を読み込めないため、戦闘を開始できない。</strong><p>{preloadError}</p><button type="button" onClick={() => setPreloadRetryKey(value => value + 1)}>画像を再読み込み</button></div>}
            <button type="button" className="stella-final__start" disabled={preloadStatus !== 'ready'} onClick={startBattle}>{preloadStatus === 'ready' ? '最終決戦を開始' : '画像読み込み後に開始'}</button>
          </section>
        ) : (
          <>
            <section className="stella-final__powers" aria-label={fighter.name + 'の最終決戦アクション'}>
              <div className="stella-final__powers-heading">
                <div><span>{battle.fighterId === 'stella' ? "STELLA'S AUTHORITIES" : 'FINAL DUEL COMMANDS'}</span><h2>最終決戦の行動</h2></div>
                {isFighting && <span className="stella-final__turn-chip">第 {battle.turn} ターン</span>}
              </div>

              {battle.fighterId === 'short-irena' && (
                <section className="stella-final__status-strip" aria-label="最終決戦用いれーなの現在の状態" role="status">
                  <div className="stella-final__status-strip-heading">
                    <span>CURRENT EFFECTS</span>
                    <strong>現在の状態</strong>
                    <small>{shortIrenaActiveEffects.length} 件</small>
                  </div>
                  {shortIrenaActiveEffects.length > 0 ? (
                    <div className="stella-final__status-chips">
                      {shortIrenaActiveEffects.map(effect => (
                        <span key={effect.id} className={'stella-final__status-chip stella-final__status-chip--' + effect.kind}>
                          {effect.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="stella-final__status-empty">時間制の強化・反動なし。権能はゲージ条件と使用可能表示を確認。</p>
                  )}
                  {battle.actionLockTurns > 0 && (
                    <div className="stella-final__status-action">
                      <span>行動不能</span>
                      <button type="button" aria-label="行動不能ターンを消費"
                        disabled={!isFighting || Boolean(battle.finisherPending) || Boolean(battle.finisherRoutePending)}
                        onClick={() => takeShortIrenaAction('PASS')}>行動不能ターンを消費</button>
                    </div>
                  )}
                </section>
              )}

              {battle.fighterId === 'short-irena' ? (
                <>
                  <div className="stella-final__daten-gauge" aria-label="堕天ゲージ表示">
                    <div className="stella-final__daten-gauge-labels"><strong>堕天側</strong><span>{battle.alignment ? (battle.alignment === 'GOD' ? '神側の終点' : '堕天側の終点') : String(battle.datenGauge)}</span><strong>神側</strong></div>
                    <div className={'stella-final__daten-gauge-track' + (battle.alignment ? ' is-' + battle.alignment.toLowerCase() : '')} role="progressbar" aria-label="堕天ゲージ" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={battle.datenGauge}>
                      <span className="stella-final__daten-gauge-center" />
                      <span className="stella-final__daten-gauge-marker" style={{ left: ((battle.datenGauge + 100) / 2) + '%' }} />
                    </div>
                    <div className="stella-final__authority-stage" role="status" aria-label="権能解放段階">
                      <strong>{authorityStageLabel}</strong>
                      <span>現在値 {battle.datenGauge} / 100</span>
                    </div>
                  </div>
                  {canMoveShortIrenaGauge && (
                    <div className="stella-final__gauge-controls" aria-label="ゲージ操作">
                      {battle.datenGauge < 100 && (
                        <button type="button" aria-label="神側へ15ポイント移動" onClick={() => takeShortIrenaAction('MOVE_GOD')}>神側へ +15</button>
                      )}
                      {battle.datenGauge > -100 && (
                        <button type="button" aria-label="堕天側へ15ポイント移動" onClick={() => takeShortIrenaAction('MOVE_DEMON')}>堕天側へ −15</button>
                      )}
                    </div>
                  )}
                  {!battle.initialChoiceMade ? (
                    <section className="stella-final__opening-choice" aria-label="最初の行動">
                      <div><strong>最初の行動</strong></div>
                      <div className="stella-final__opening-choice-buttons">
                        <button type="button" aria-label="神化を選択" onClick={() => takeShortIrenaAction('DIVINIZE')}>神化</button>
                        <button type="button" aria-label="堕天を選択" onClick={() => takeShortIrenaAction('FALLEN')}>堕天</button>
                      </div>
                    </section>
                  ) : (
                    <>
                  <div className="stella-final__power-grid stella-final__short-authorities">
                    {shortIrenaCommandWindow && canUseDivineSpeed && (
                    <article className="stella-final__power-card stella-final__power-card--divine-speed">
                      <div className="stella-final__power-icon"><Zap size={21} /></div>
                      <div className="stella-final__power-copy"><h3>神域の速度</h3><small>{battle.divineSpeedTurns > 0 ? battle.divineSpeedTurns + 'T' : '4T'}</small></div>
                      <button type="button" aria-label="神域の速度を発動" disabled={!isFighting || !battle.initialChoiceMade || !canUseDivineSpeed || battle.actionLockTurns > 0 || battle.ascensionTurns > 0 || Boolean(battle.finisherPending) || Boolean(battle.finisherRoutePending) || battle.finalTurnsLeft === 0} onClick={() => takeShortIrenaAction('DIVINE_SPEED')}>発動</button>
                    </article>
                  )}
                    {shortIrenaCommandWindow && canUseAllPower && (
                    <article className="stella-final__power-card stella-final__power-card--all-power">
                      <div className="stella-final__power-icon"><Sparkles size={21} /></div>
                      <div className="stella-final__power-copy"><h3>全能降臨</h3><small>{battle.allPowerTurns > 0 ? battle.allPowerTurns + 'T' : '4T'}</small></div>
                      <button type="button" aria-label="全能降臨を発動" disabled={!isFighting || !battle.initialChoiceMade || !canUseAllPower || battle.actionLockTurns > 0 || battle.ascensionTurns > 0 || Boolean(battle.finisherPending) || Boolean(battle.finisherRoutePending) || battle.finalTurnsLeft === 0} onClick={() => takeShortIrenaAction('ALL_POWER')}>発動</button>
                    </article>
                  )}
                    {shortIrenaCommandWindow && canUseAllThings && (
                    <article className="stella-final__power-card stella-final__power-card--all-things">
                      <div className="stella-final__power-icon"><Sparkles size={21} /></div>
                      <div className="stella-final__power-copy"><h3>万象支配</h3><small>{battle.allThingsTurns > 0 ? battle.allThingsTurns + 'T' : '2T'}</small></div>
                      <button type="button" aria-label="万象支配を発動" disabled={!isFighting || !battle.initialChoiceMade || !canUseAllThings || battle.actionLockTurns > 0 || battle.ascensionTurns > 0 || Boolean(battle.finisherPending) || Boolean(battle.finisherRoutePending) || battle.finalTurnsLeft === 0} onClick={() => takeShortIrenaAction('ALL_THINGS')}>発動</button>
                    </article>
                  )}
                    {shortIrenaCommandWindow && canUseTerminus && battle.turn >= battle.terminusReadyTurn && (
                    <article className="stella-final__power-card stella-final__power-card--terminus">
                      <div className="stella-final__power-icon"><Zap size={21} /></div>
                      <div className="stella-final__power-copy"><h3>終極殲滅</h3></div>
                      <button type="button" aria-label="終極殲滅を発動" disabled={!isFighting || !battle.initialChoiceMade || !canUseTerminus || battle.turn < battle.terminusReadyTurn || battle.actionLockTurns > 0 || battle.ascensionTurns > 0 || Boolean(battle.finisherPending) || Boolean(battle.finisherRoutePending) || battle.finalTurnsLeft === 0} onClick={() => takeShortIrenaAction('TERMINUS')}>発動</button>
                    </article>
                  )}
                    {shortIrenaCommandWindow && canActivateAscension && (
                    <article className="stella-final__power-card stella-final__power-card--ascension">
                      <div className="stella-final__power-icon"><Sparkles size={21} /></div>
                      <div className="stella-final__power-copy"><h3>絶界昇華</h3><small>{SHORT_IRENA_ASCENSION_TURNS}T</small></div>
                      <button type="button" aria-label="絶界昇華を発動" disabled={!isFighting || !battle.initialChoiceMade || !canActivateAscension || battle.actionLockTurns > 0 || Boolean(battle.finisherPending) || Boolean(battle.finisherRoutePending) || battle.finalTurnsLeft === 0} onClick={() => takeShortIrenaAction('ASCENSION')}>発動</button>
                    </article>
                  )}
                    {shortIrenaCommandWindow && canUseAllMight && !battle.allMightUsed && (
                    <article className="stella-final__power-card stella-final__power-card--control">
                      <div className="stella-final__power-icon"><Shield size={21} /></div>
                      <div className="stella-final__power-copy"><h3>理外掌握</h3></div>
                      <div className="stella-final__control-buttons">
                        <button type="button" aria-label="理外掌握：神側へ" disabled={!isFighting || !battle.initialChoiceMade || !canUseAllMight || battle.allMightUsed || battle.ascensionTurns > 0 || battle.actionLockTurns > 0 || Boolean(battle.finisherPending) || Boolean(battle.finisherRoutePending) || battle.finalTurnsLeft === 0} onClick={() => takeShortIrenaAction('CONTROL_GOD')}>神側へ</button>
                        <button type="button" aria-label="理外掌握：堕天側へ" disabled={!isFighting || !battle.initialChoiceMade || !canUseAllMight || battle.allMightUsed || battle.ascensionTurns > 0 || battle.actionLockTurns > 0 || Boolean(battle.finisherPending) || Boolean(battle.finisherRoutePending) || battle.finalTurnsLeft === 0} onClick={() => takeShortIrenaAction('CONTROL_DEMON')}>堕天側へ</button>
                      </div>
                    </article>
                  )}
                  </div>
                  {shortIrenaUltimateWindow && (
                    <div className="stella-final__short-finish-row">
                      <div><strong>{battle.alignment === 'GOD' ? '究極必殺技・創世' : '究極必殺技・終焉'}</strong><small>{battle.alignment === 'GOD' ? '神側倍率 ×5' : '堕天側倍率 ×8'}</small></div>
                      <button type="button" aria-label={battle.alignment === 'GOD' ? '神側の究極必殺技 創世' : '堕天側の究極必殺技 終焉'} onClick={() => takeShortIrenaAction('FINISH')}><Flame size={30} aria-hidden="true" /><span className="stella-final__sr-only">究極必殺技を放つ</span></button>
                    </div>
                  )}
                    </>
                  )}
                </>
              ) : (
                <div className="stella-final__power-grid">
                  {isFighting && battle.turn >= battle.immortalReadyTurn && (
                    <article className="stella-final__power-card stella-final__power-card--immortal">
                    <div className="stella-final__power-icon"><Shield size={21} /></div>
                    <div className="stella-final__power-copy"><h3>不滅</h3></div>
                    <button type="button" aria-label="不滅を発動" disabled={!isFighting || battle.turn < battle.immortalReadyTurn} onClick={() => takeAction('IMMORTAL')}>発動</button>
                  </article>
                  )}
                  {isFighting && battle.rebirthUses < REBIRTH_RATIOS.length && battle.playerHp < fighterMaxHp && (
                    <article className="stella-final__power-card stella-final__power-card--rebirth">
                    <div className="stella-final__power-icon"><HeartPulse size={21} /></div>
                    <div className="stella-final__power-copy"><h3>再誕</h3><small>{battle.rebirthUses}/3</small></div>
                    <button type="button" aria-label="再誕を発動" disabled={!isFighting || battle.rebirthUses >= 3 || battle.playerHp >= fighterMaxHp} onClick={() => takeAction('REBIRTH')}>回復</button>
                  </article>
                  )}
                  {isFighting && !battle.meteorUsed && (
                    <article className="stella-final__power-card stella-final__power-card--meteor">
                    <div className="stella-final__power-icon"><Zap size={21} /></div>
                    <div className="stella-final__power-copy"><h3>天象支配</h3><small>{METEOR_DAMAGE_PROTOTYPE.toLocaleString('ja-JP')}</small></div>
                    <button type="button" aria-label="天象支配を発動" disabled={!isFighting || battle.meteorUsed} onClick={() => takeAction('METEOR')}>発動</button>
                  </article>
                  )}
                </div>
              )}
              {(battle.fighterId !== 'short-irena' || (battle.initialChoiceMade && battle.actionLockTurns === 0 && battle.finalTurnsLeft !== 0 && !battle.finisherPending && !battle.finisherRoutePending)) && isFighting && (
                <div className="stella-final__normal-attack">
                  <span><Swords size={17} /> 通常攻撃 <small>{battle.fighterId === 'short-irena' ? '予測 ' + normalAttackDamageAfterPhaseLimit.toLocaleString('ja-JP') : normalAttackDamage.toLocaleString('ja-JP')}ダメージ</small></span>
                  <button type="button" aria-label="通常攻撃" onClick={() => battle.fighterId === 'short-irena' ? takeShortIrenaAction('ATTACK') : takeAction('ATTACK')}>攻撃する</button>
                </div>
              )}


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
