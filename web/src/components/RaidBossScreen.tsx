import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Crosshair,
  Eye,
  Gauge,
  Heart,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import raidBossArt from '../assets/raid_boss_art.svg';
import raidIrenaCutIn from '../assets/raid_irena_cutin.svg';

type Phase = 1 | 2;
type BossPattern = 'SWEEP' | 'CHARGE' | 'VOID' | 'RAGE';
type PlayerAction = 'NORMAL' | 'FEATHER' | 'FOCUS' | 'GUARD' | 'COUNTER' | 'POTION' | 'ULTIMATE';
type FxType = PlayerAction | 'BOSS' | 'BREAK' | 'PHASE' | null;
type DamageSource = 'PLAYER' | 'BOSS';

type PlayerState = {
  hp: number;
  mp: number;
  tp: number;
  shield: number;
  potions: number;
  focus: boolean;
  featherCooldown: number;
};

type PatternInfo = {
  name: string;
  detail: string;
  minDamage: number;
  maxDamage: number;
  danger: 'NORMAL' | 'HIGH' | 'EXTREME';
  color: string;
  bestResponse: string;
};

type DamagePopup = {
  value: number;
  source: DamageSource;
  key: number;
};

const BOSS_HP: Record<Phase, number> = { 1: 50000, 2: 60000 };
const PLAYER_MAX_HP = 10000;
const PLAYER_MAX_MP = 100;
const PLAYER_MAX_TP = 100;
const BREAK_MAX = 100;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const randomBetween = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
const formatNumber = (value: number) => Math.max(0, Math.round(value)).toLocaleString('ja-JP');

const PATTERN_INFO: Record<BossPattern, PatternInfo> = {
  SWEEP: {
    name: '黒爪薙ぎ',
    detail: '大きな予備動作の後に横薙ぎ。直後は押し返しやすい。',
    minDamage: 950,
    maxDamage: 1250,
    danger: 'NORMAL',
    color: '#c67cff',
    bestResponse: '通常攻撃',
  },
  CHARGE: {
    name: '滅界砲',
    detail: '核を圧縮して極大の一撃を準備する。迎撃できる。',
    minDamage: 2100,
    maxDamage: 2800,
    danger: 'EXTREME',
    color: '#ff6d86',
    bestResponse: '防御 / 迎撃',
  },
  VOID: {
    name: '虚無落雷',
    detail: '黒雷を集め、MPを削る。羽弾なら詠唱を断てる。',
    minDamage: 1250,
    maxDamage: 1650,
    danger: 'HIGH',
    color: '#72a9ff',
    bestResponse: '羽弾',
  },
  RAGE: {
    name: '終焉衝動',
    detail: '深淵解放後の必殺級攻撃。最も危険な読み合い。',
    minDamage: 2450,
    maxDamage: 3250,
    danger: 'EXTREME',
    color: '#ff3f62',
    bestResponse: '防御 / 迎撃',
  },
};

const CSS = [
  '@keyframes raidAmbient{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.035);opacity:1}}',
  '@keyframes raidPulse{0%,100%{transform:scale(.985)}50%{transform:scale(1.04)}}',
  '@keyframes raidShake{0%,100%{transform:translate3d(0,0,0)}18%{transform:translate3d(-7px,2px,0)}36%{transform:translate3d(8px,-2px,0)}54%{transform:translate3d(-5px,2px,0)}72%{transform:translate3d(4px,-1px,0)}}',
  '@keyframes raidFlash{0%{opacity:0;transform:scale(.45)}16%{opacity:1}100%{opacity:0;transform:scale(1.24)}}',
  '@keyframes raidPop{0%{opacity:0;transform:scale(.68)}20%{opacity:1;transform:scale(1.06)}100%{opacity:0;transform:scale(1.17)}}',
  '@keyframes raidDamage{0%{opacity:0;transform:translate(-50%,15px) scale(.7)}18%{opacity:1;transform:translate(-50%,0) scale(1.1)}100%{opacity:0;transform:translate(-50%,-58px) scale(1)}}',
  '@keyframes raidCut{0%{opacity:0;transform:scale(1.07)}13%{opacity:1;transform:scale(1.015)}78%{opacity:1}100%{opacity:0;transform:scale(.995)}}',
  '@keyframes raidText{0%,14%{opacity:0;transform:translateX(28px)}34%{opacity:1;transform:translateX(0)}84%{opacity:1}100%{opacity:0}}',
  '@keyframes raidWarn{0%,100%{opacity:.7}50%{opacity:1}}',
  '@keyframes raidBreak{0%{opacity:0;transform:scale(.4)}18%{opacity:1;transform:scale(1.14)}56%{opacity:1}100%{opacity:0;transform:scale(1.32)}}',
  '@keyframes raidPhase{0%{opacity:0}15%{opacity:1}100%{opacity:0}}',
  '@keyframes raidLoad{from{transform:scaleX(0)}to{transform:scaleX(1)}}',
  '@keyframes raidBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}',
  '@media(max-width:760px){.raidBottom{grid-template-columns:1fr!important}.raidActions{grid-template-columns:repeat(2,minmax(0,1fr))!important}.raidStage{min-height:470px!important}.raidCutinTitle{font-size:42px!important}.raidFooter{display:none!important}.raidPreGrid{grid-template-columns:1fr!important}}',
].join('\\n');

export const RaidBossScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [mode, setMode] = useState<'LOADING' | 'PRE_BATTLE' | 'BATTLE' | 'RESULT'>('LOADING');
  const [phase, setPhase] = useState<Phase>(1);
  const [bossHp, setBossHp] = useState(BOSS_HP[1]);
  const [bossBreak, setBossBreak] = useState(0);
  const [brokenTurns, setBrokenTurns] = useState(0);
  const [bossPattern, setBossPattern] = useState<BossPattern>('SWEEP');
  const [player, setPlayer] = useState<PlayerState>({
    hp: PLAYER_MAX_HP,
    mp: PLAYER_MAX_MP,
    tp: 0,
    shield: 0,
    potions: 2,
    focus: false,
    featherCooldown: 0,
  });
  const [turn, setTurn] = useState(1);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bestHit, setBestHit] = useState(0);
  const [totalDamage, setTotalDamage] = useState(0);
  const [damageTaken, setDamageTaken] = useState(0);
  const [breakCount, setBreakCount] = useState(0);
  const [perfectResponses, setPerfectResponses] = useState(0);
  const [adaptationLevel, setAdaptationLevel] = useState(0);
  const [lastAction, setLastAction] = useState<PlayerAction | null>(null);
  const [repeatCount, setRepeatCount] = useState(0);
  const [log, setLog] = useState('戦闘開始。ボスの予告を読む。');
  const [isResolving, setIsResolving] = useState(false);
  const [fx, setFx] = useState<FxType>(null);
  const [fxText, setFxText] = useState('');
  const [damagePopup, setDamagePopup] = useState<DamagePopup | null>(null);
  const [impactKey, setImpactKey] = useState(0);
  const [impactSource, setImpactSource] = useState<DamageSource | null>(null);
  const [victory, setVictory] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [bestScore, setBestScore] = useState(0);

  const audioRef = useRef<AudioContext | null>(null);
  const timersRef = useRef<number[]>([]);

  const bossMaxHp = BOSS_HP[phase];
  const bossPct = clamp((bossHp / bossMaxHp) * 100, 0, 100);
  const playerPct = clamp((player.hp / PLAYER_MAX_HP) * 100, 0, 100);
  const intent = PATTERN_INFO[bossPattern];
  const broken = brokenTurns > 0;
  const ultimateReady = player.tp >= PLAYER_MAX_TP;

  const score = Math.max(
    0,
    Math.round(
      totalDamage +
        breakCount * 5000 +
        perfectResponses * 3500 +
        maxCombo * 1600 -
        damageTaken * 0.45 -
        turn * 180,
    ),
  );

  const phaseLabel = phase === 1 ? 'PHASE I · 封印核' : 'PHASE II · 深淵解放';

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter(value => value !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
  };

  const clearTimers = () => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    const id = window.setTimeout(() => setMode('PRE_BATTLE'), 650);
    return () => {
      window.clearTimeout(id);
      clearTimers();
      try {
        audioRef.current?.close();
      } catch {
        // ignore
      }
    };
  }, []);

  const getAudio = () => {
    if (!soundOn) return null;
    try {
      if (!audioRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return null;
        audioRef.current = new Ctx();
      }
      if (audioRef.current.state === 'suspended') void audioRef.current.resume();
      return audioRef.current;
    } catch {
      return null;
    }
  };

  const sfx = (
    kind: 'click' | 'hit' | 'heavy' | 'guard' | 'counter' | 'feather' | 'break' | 'phase' | 'win' | 'lose',
  ) => {
    const ctx = getAudio();
    if (!ctx) return;

    const sounds: Record<
      string,
      [OscillatorType, number, number, number, number]
    > = {
      click: ['triangle', 520, 760, 0.06, 0.12],
      hit: ['triangle', 180, 60, 0.18, 0.2],
      heavy: ['sawtooth', 115, 36, 0.23, 0.28],
      guard: ['sine', 280, 880, 0.14, 0.22],
      counter: ['square', 500, 90, 0.15, 0.22],
      feather: ['triangle', 900, 160, 0.18, 0.26],
      break: ['sawtooth', 90, 980, 0.2, 0.3],
      phase: ['sawtooth', 65, 430, 0.18, 0.3],
      win: ['triangle', 520, 1040, 0.16, 0.34],
      lose: ['sine', 320, 90, 0.14, 0.38],
    };

    try {
      const [type, start, end, gainValue, duration] = sounds[kind];
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(start, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(25, end), now + duration);
      gain.gain.setValueAtTime(gainValue, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.01);

      if (kind === 'win') {
        [659.25, 783.99, 1046.5].forEach((frequency, index) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          const t = now + 0.08 + index * 0.1;
          o.type = 'triangle';
          o.frequency.setValueAtTime(frequency, t);
          g.gain.setValueAtTime(0.08, t);
          g.gain.exponentialRampToValueAtTime(0.008, t + 0.24);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(t);
          o.stop(t + 0.26);
        });
      }
    } catch {
      // ignore
    }
  };

  const resetBattle = () => {
    clearTimers();
    setPhase(1);
    setBossHp(BOSS_HP[1]);
    setBossBreak(0);
    setBrokenTurns(0);
    setBossPattern('SWEEP');
    setPlayer({
      hp: PLAYER_MAX_HP,
      mp: PLAYER_MAX_MP,
      tp: 0,
      shield: 0,
      potions: 2,
      focus: false,
      featherCooldown: 0,
    });
    setTurn(1);
    setCombo(0);
    setMaxCombo(0);
    setBestHit(0);
    setTotalDamage(0);
    setDamageTaken(0);
    setBreakCount(0);
    setPerfectResponses(0);
    setAdaptationLevel(0);
    setLastAction(null);
    setRepeatCount(0);
    setLog('戦闘開始。ボスの予告を読む。');
    setIsResolving(false);
    setFx(null);
    setFxText('');
    setDamagePopup(null);
    setImpactSource(null);
    setVictory(false);
    setMode('BATTLE');
    sfx('click');
  };

  const recordScore = () => {
    setBestScore(prev => Math.max(prev, score));
  };

  const finishDefeat = (message: string) => {
    recordScore();
    sfx('lose');
    setPlayer(prev => ({ ...prev, hp: 0 }));
    setLog(message);
    setVictory(false);
    setIsResolving(false);
    setFx(null);
    setDamagePopup(null);
    setMode('RESULT');
  };

  const finishVictory = () => {
    recordScore();
    sfx('win');
    setLog('深淵喰らい・アビスコアを討伐した！');
    setVictory(true);
    setIsResolving(false);
    setFx('BREAK');
    setFxText('RAID CLEAR');
    setDamagePopup(null);
    setMode('RESULT');
  };

  const choosePattern = (
    currentPhase: Phase,
    currentPlayer: PlayerState,
    previous: BossPattern,
    recentAction: PlayerAction | null,
    repeats: number,
  ): BossPattern => {
    if (currentPhase === 2 && repeats >= 2 && recentAction) {
      const adaptations: Partial<Record<PlayerAction, BossPattern>> = {
        NORMAL: 'VOID',
        FEATHER: 'CHARGE',
        FOCUS: 'RAGE',
        GUARD: 'VOID',
        COUNTER: 'SWEEP',
        POTION: 'CHARGE',
      };
      const response = adaptations[recentAction];
      if (response && response !== previous) return response;
    }

    const pool: BossPattern[] =
      currentPhase === 2
        ? ['SWEEP', 'CHARGE', 'VOID', 'RAGE']
        : ['SWEEP', 'CHARGE', 'VOID'];

    const weighted = pool
      .map(pattern => {
        if (pattern === previous) return { pattern, weight: 0 };

        let weight = 2;

        if (
          currentPlayer.hp <= PLAYER_MAX_HP * 0.45 &&
          (pattern === 'CHARGE' || pattern === 'RAGE')
        ) {
          weight += 2;
        }

        if (currentPlayer.mp <= 28 && pattern === 'SWEEP') weight += 2;
        if (currentPlayer.shield > 0 && pattern === 'VOID') weight += 2;
        if (currentPlayer.tp >= 80 && (pattern === 'CHARGE' || pattern === 'RAGE')) weight += 1;

        if (currentPhase === 2 && pattern === 'RAGE') {
          weight = currentPlayer.hp <= PLAYER_MAX_HP * 0.45 ? 4 : 1;
        }

        return { pattern, weight };
      })
      .filter(entry => entry.weight > 0);

    const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return pool.find(pattern => pattern !== previous) || pool[0];

    let roll = Math.random() * totalWeight;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.pattern;
    }
    return weighted[weighted.length - 1].pattern;
  };

  const showImpact = (source: DamageSource, value: number) => {
    const nextKey = impactKey + 1;
    setImpactKey(nextKey);
    setImpactSource(source);
    setDamagePopup({ value, source, key: nextKey });
    schedule(() => {
      setDamagePopup(null);
      setImpactSource(null);
    }, 720);
  };

  const runBossAttack = (
    currentPhase: Phase,
    currentPattern: BossPattern,
    currentPlayer: PlayerState,
    activeAction: PlayerAction | null,
    repeats: number,
    extraMultiplier = 1,
  ) => {
    setFx('BOSS');
    setFxText(PATTERN_INFO[currentPattern].name);
    sfx(
      currentPattern === 'CHARGE' || currentPattern === 'RAGE' ? 'heavy' : 'hit',
    );

    schedule(() => {
      const info = PATTERN_INFO[currentPattern];
      const phaseMultiplier =
        currentPhase === 2 ? 1.04 + Math.min(adaptationLevel, 3) * 0.035 : 1;
      const raw = randomBetween(info.minDamage, info.maxDamage);
      const totalIncoming = Math.round(raw * phaseMultiplier * extraMultiplier);

      const guardMultiplier = currentPlayer.shield > 0
        ? (currentPattern === 'CHARGE' || currentPattern === 'RAGE' ? 0.26 : 0.55)
        : 1;

      const incoming = Math.round(totalIncoming * guardMultiplier);
      const shieldDamage = Math.min(currentPlayer.shield, incoming);
      const hpDamage = Math.max(0, incoming - shieldDamage);
      const nextHp = Math.max(0, currentPlayer.hp - hpDamage);
      const nextPlayer: PlayerState = {
        ...currentPlayer,
        hp: nextHp,
        shield: Math.max(0, currentPlayer.shield - shieldDamage),
        focus: currentPlayer.focus,
        featherCooldown: Math.max(0, currentPlayer.featherCooldown - 1),
      };

      setPlayer(nextPlayer);
      setDamageTaken(prev => prev + hpDamage);
      setImpactSource('BOSS');
      showImpact('BOSS', hpDamage);
      setFx(null);

      if (currentPlayer.shield > 0 && shieldDamage >= incoming && hpDamage === 0) {
        setLog(info.name + 'を盾だけで受け切った！');
      } else {
        setLog(
          (currentPattern === 'CHARGE' || currentPattern === 'RAGE'
            ? info.name + 'が直撃！ '
            : info.name + '！ ') +
            formatNumber(hpDamage) +
            'ダメージ',
        );
      }

      if (nextHp <= 0) {
        finishDefeat('アビスコアに押し切られた。');
        return;
      }

      const nextPattern = choosePattern(
        currentPhase,
        nextPlayer,
        currentPattern,
        activeAction,
        repeats,
      );
      setBossPattern(nextPattern);
      setTurn(prev => prev + 1);
      setIsResolving(false);
    }, 430);
  };

  const performAction = (action: PlayerAction) => {
    if (mode !== 'BATTLE' || isResolving) return;

    if (action === 'FEATHER' && (player.featherCooldown > 0 || player.mp < 18)) {
      setLog(player.featherCooldown > 0 ? '羽弾はまだ再使用できない。' : 'MPが足りない。');
      return;
    }
    if (action === 'FOCUS' && player.mp < 12) {
      setLog('MPが足りない。');
      return;
    }
    if (action === 'GUARD' && player.mp < 10) {
      setLog('MPが足りない。');
      return;
    }
    if (action === 'POTION' && player.potions <= 0) {
      setLog('ポーションを使い切った。');
      return;
    }
    if (action === 'ULTIMATE' && !ultimateReady) {
      setLog('必殺ゲージが100%必要。');
      return;
    }

    setIsResolving(true);

    const repeats = lastAction === action ? repeatCount + 1 : 1;
    setLastAction(action);
    setRepeatCount(repeats);

    const currentPattern = bossPattern;
    const currentBrokenTurns = brokenTurns;
    const isHeavy = currentPattern === 'CHARGE' || currentPattern === 'RAGE';
    const perfectCounter = action === 'COUNTER' && isHeavy;
    const counterMiss = action === 'COUNTER' && !perfectCounter;
    const featherInterrupt = action === 'FEATHER' && currentPattern === 'VOID';
    const sweepOpening = action === 'NORMAL' && currentPattern === 'SWEEP';

    setFx(action);
    setFxText(
      action === 'FEATHER'
        ? '羽弾'
        : action === 'COUNTER'
          ? perfectCounter ? 'COUNTER!' : 'COUNTER MISS'
          : action === 'FOCUS'
            ? '集中'
            : action === 'GUARD'
              ? 'GUARD'
              : action === 'POTION'
                ? 'RECOVER'
                : action === 'ULTIMATE'
                  ? '終天羽星穿ち'
                  : '通常攻撃',
    );

    const comboMultiplier =
      action === 'NORMAL' || action === 'FEATHER' || action === 'COUNTER' || action === 'ULTIMATE'
        ? 1 + Math.min(combo, 4) * 0.04
        : 1;

    const breakMultiplier =
      currentBrokenTurns === 2 ? 1.5 :
      currentBrokenTurns === 1 ? 1.25 :
      1;

    const responseMultiplier =
      perfectCounter ? 1.32 :
      featherInterrupt ? 1.18 :
      sweepOpening ? 1.14 :
      1;

    const focusMultiplier = player.focus ? 1.55 : 1;

    const damageBase =
      action === 'NORMAL'
        ? randomBetween(6500, 7600)
        : action === 'FEATHER'
          ? randomBetween(9800, 11500)
          : action === 'COUNTER'
            ? perfectCounter
              ? randomBetween(7600, 9000)
              : randomBetween(1800, 2600)
            : action === 'ULTIMATE'
              ? randomBetween(26000, 30000)
              : 0;

    const finalDamage = Math.round(
      damageBase *
        comboMultiplier *
        breakMultiplier *
        responseMultiplier *
        focusMultiplier *
        (action === 'ULTIMATE' && currentBrokenTurns > 0 ? 1.35 : 1),
    );

    const actualDamage = Math.min(bossHp, finalDamage);

    const breakGain =
      action === 'NORMAL'
        ? sweepOpening ? 24 : 16
        : action === 'FEATHER'
          ? featherInterrupt ? 58 : 30
          : action === 'COUNTER'
            ? perfectCounter ? 68 : 4
            : action === 'ULTIMATE'
              ? 46
              : 0;

    const nextBreak =
      currentBrokenTurns > 0
        ? 0
        : clamp(bossBreak + breakGain, 0, BREAK_MAX);

    const triggersBreak =
      currentBrokenTurns === 0 && nextBreak >= BREAK_MAX;

    if (counterMiss) {
      setCombo(0);
      setLog('迎撃失敗。次のボス攻撃が25%強化される！');
      sfx('guard');
    } else if (perfectCounter) {
      setPerfectResponses(prev => prev + 1);
      setLog('迎撃成功！大技の隙を反転した。');
      sfx('counter');
    } else if (featherInterrupt) {
      setLog('羽弾が黒雷の詠唱を撃ち抜いた！');
      sfx('feather');
    } else if (action === 'ULTIMATE') {
      setLog(
        currentBrokenTurns > 0
          ? 'BREAK中に必殺を叩き込み、終天羽星穿ちが炸裂！'
          : 'いれーな「終天羽星穿ち」！',
      );
    } else if (action === 'FEATHER') {
      setLog('いれーな「羽弾」！');
    } else if (sweepOpening) {
      setLog('薙ぎ払い直後の隙を突いた！');
    } else if (player.focus) {
      setLog('集中を乗せた一撃！');
    } else if (action === 'NORMAL') {
      setLog('通常攻撃！');
    }

    const impactDelay =
      action === 'FEATHER' ? 760 :
      action === 'ULTIMATE' ? 900 :
      action === 'COUNTER' ? 520 :
      action === 'GUARD' ? 620 :
      action === 'FOCUS' || action === 'POTION' ? 520 :
      360;

    if (action === 'POTION') {
      const nextPlayer: PlayerState = {
        ...player,
        hp: Math.min(PLAYER_MAX_HP, player.hp + 2800),
        mp: Math.min(PLAYER_MAX_MP, player.mp + 30),
        tp: clamp(player.tp + 8, 0, PLAYER_MAX_TP),
        potions: player.potions - 1,
        focus: false,
        featherCooldown: Math.max(0, player.featherCooldown - 1),
      };
      setPlayer(nextPlayer);
      setCombo(0);
      schedule(() => {
        setFx(null);
        if (currentBrokenTurns > 0) {
          const remaining = currentBrokenTurns - 1;
          setBrokenTurns(remaining);
          if (remaining === 0) {
            setBossPattern(
              choosePattern(phase, nextPlayer, currentPattern, action, repeats),
            );
          }
          setIsResolving(false);
          return;
        }
        runBossAttack(phase, currentPattern, nextPlayer, action, repeats);
      }, impactDelay);
      return;
    }

    if (action === 'FOCUS') {
      const nextPlayer: PlayerState = {
        ...player,
        mp: clamp(player.mp - 12, 0, PLAYER_MAX_MP),
        tp: clamp(player.tp + 15, 0, PLAYER_MAX_TP),
        focus: true,
        featherCooldown: Math.max(0, player.featherCooldown - 1),
      };
      setPlayer(nextPlayer);
      setCombo(0);
      schedule(() => {
        setFx(null);
        if (currentBrokenTurns > 0) {
          const remaining = currentBrokenTurns - 1;
          setBrokenTurns(remaining);
          if (remaining === 0) {
            setBossPattern(
              choosePattern(phase, nextPlayer, currentPattern, action, repeats),
            );
          }
          setIsResolving(false);
          return;
        }
        runBossAttack(phase, currentPattern, nextPlayer, action, repeats);
      }, impactDelay);
      return;
    }

    if (action === 'GUARD') {
      const perfectGuard = isHeavy;
      const nextPlayer: PlayerState = {
        ...player,
        hp: Math.min(PLAYER_MAX_HP, player.hp + 450),
        mp: clamp(player.mp - 10, 0, PLAYER_MAX_MP),
        tp: clamp(player.tp + 14, 0, PLAYER_MAX_TP),
        shield: 3600,
        focus: false,
        featherCooldown: Math.max(0, player.featherCooldown - 1),
      };

      setPlayer(nextPlayer);
      setCombo(0);

      if (perfectGuard && currentBrokenTurns === 0) {
        setBossBreak(prev => clamp(prev + 28, 0, BREAK_MAX));
        setLog('PERFECT GUARD！大技を読み、BREAKを奪った。');
        sfx('guard');
      } else {
        setLog('防御構え。盾3,600を展開。');
        sfx('click');
      }

      schedule(() => {
        setFx(null);
        if (currentBrokenTurns > 0) {
          const remaining = currentBrokenTurns - 1;
          setBrokenTurns(remaining);
          if (remaining === 0) {
            setBossPattern(
              choosePattern(phase, nextPlayer, currentPattern, action, repeats),
            );
          }
          setIsResolving(false);
          return;
        }
        runBossAttack(phase, currentPattern, nextPlayer, action, repeats);
      }, impactDelay);
      return;
    }

    sfx(action === 'FEATHER' ? 'feather' : action === 'COUNTER' ? 'counter' : action === 'ULTIMATE' ? 'heavy' : 'hit');

    schedule(() => {
      const nextPlayer: PlayerState = {
        ...player,
        mp: clamp(player.mp, 0, PLAYER_MAX_MP),
        tp: action === 'ULTIMATE'
          ? 0
          : clamp(
              player.tp +
                (action === 'NORMAL'
                  ? 18
                  : action === 'FEATHER'
                    ? 24
                    : action === 'COUNTER'
                      ? perfectCounter ? 12 : 18
                      : 0),
              0,
              PLAYER_MAX_TP,
            ),
        focus: false,
        featherCooldown: action === 'FEATHER'
          ? 2
          : Math.max(0, player.featherCooldown - 1),
      };

      setPlayer(nextPlayer);
      setBossHp(Math.max(0, bossHp - actualDamage));
      setBossBreak(nextBreak);
      setBestHit(prev => Math.max(prev, actualDamage));
      setTotalDamage(prev => prev + actualDamage);

      const nextCombo =
        counterMiss || currentBrokenTurns <= 0 && action === 'COUNTER' && !perfectCounter
          ? 0
          : combo + 1;
      setCombo(nextCombo);
      setMaxCombo(prev => Math.max(prev, nextCombo));
      showImpact('PLAYER', actualDamage);
      setFx(null);

      if (bossHp - actualDamage <= 0) {
        setFx('BREAK');
        setFxText('RAID CLEAR');
        schedule(finishVictory, 720);
        return;
      }

      if (triggersBreak) {
        setBossBreak(0);
        setBrokenTurns(2);
        setBreakCount(prev => prev + 1);
        setFx('BREAK');
        setFxText('BREAK!');
        setLog('深淵の核が崩壊！ 2ターンのバースト窓が開いた！');
        sfx('break');
        schedule(() => {
          setFx(null);
          setIsResolving(false);
        }, 720);
        return;
      }

      if (currentBrokenTurns > 0) {
        const remaining = currentBrokenTurns - 1;
        setBrokenTurns(remaining);
        if (remaining === 0) {
          setBossPattern(
            choosePattern(phase, nextPlayer, currentPattern, action, repeats),
          );
          setLog('BREAK終了。ボスが再起動する！');
        }
        setIsResolving(false);
        return;
      }

      if (perfectCounter || featherInterrupt) {
        setBossPattern(
          choosePattern(phase, nextPlayer, currentPattern, action, repeats),
        );
        setTurn(prev => prev + 1);
        schedule(() => setDamagePopup(null), 400);
        setIsResolving(false);
        return;
      }

      if (phase === 1 && bossHp - actualDamage <= BOSS_HP[1] * 0.5) {
        setPhase(2);
        setBossHp(BOSS_HP[2]);
        setBossBreak(0);
        setBrokenTurns(0);
        setBossPattern('RAGE');
        setAdaptationLevel(0);
        setFx('PHASE');
        setFxText('PHASE II');
        sfx('phase');
        setLog('第2形態「深淵解放」。同じ行動を2回続けるとボスが対応する。');

        schedule(() => {
          setFx(null);
          runBossAttack(2, 'RAGE', nextPlayer, action, repeats);
        }, 1050);
        return;
      }

      if (phase === 2 && repeats >= 2) {
        setAdaptationLevel(prev => Math.min(3, prev + 1));
        setLog(
          action === 'FEATHER'
            ? 'ボスが羽弾を学習。滅界砲の構えに入った。'
            : action === 'NORMAL'
              ? 'ボスが通常攻撃の流れを学習した。'
              : 'ボスが行動パターンを更新した。',
        );
      }

      const nextPattern = choosePattern(
        phase,
        nextPlayer,
        currentPattern,
        action,
        repeats,
      );
      setBossPattern(nextPattern);
      setTurn(prev => prev + 1);
      setIsResolving(false);

      schedule(() => setDamagePopup(null), 400);
      runBossAttack(
        phase,
        nextPattern,
        nextPlayer,
        action,
        repeats,
        counterMiss ? 1.25 : 1,
      );
    }, impactDelay);
  };

  const actionHint = useMemo(() => {
    if (broken) return 'BREAK WINDOW：1ターン目の攻撃が最も強い。必殺もここで大幅強化。';
    if (bossPattern === 'CHARGE' || bossPattern === 'RAGE') return '大技の予告中。防御なら安全、迎撃ならBREAKを大きく稼げる。';
    if (bossPattern === 'VOID') return '羽弾なら詠唱中断＋大幅BREAK。外しても高火力だが反撃は受ける。';
    return '黒爪薙ぎは通常攻撃で押し返せる。攻め続けるほどCOMBOが伸びる。';
  }, [bossPattern, broken]);

  const fxView = () => {
    if (!fx) return null;

    if (fx === 'FEATHER') {
      return (
        <div style={styles.fxOverlay}>
          <div style={styles.fxShade} />
          <img src={raidIrenaCutIn} alt="" style={styles.cutinImage} />
          <div style={styles.cutinSweep} />
          <div style={styles.cutinText}>
            <div style={styles.cutinSub}>IRENA · SIGNATURE ART</div>
            <div className="raidCutinTitle" style={styles.cutinTitle}>『羽弾』</div>
            <div style={styles.cutinHint}>VOID SHATTER</div>
          </div>
        </div>
      );
    }

    if (fx === 'BREAK') {
      return (
        <div style={styles.fxOverlay}>
          <div style={styles.breakCircle} />
          <div style={styles.breakText}>{fxText}</div>
        </div>
      );
    }

    if (fx === 'PHASE') {
      return (
        <div style={styles.phaseOverlay}>
          <div style={styles.phaseText}>{fxText}</div>
          <div style={styles.phaseSub}>深淵解放</div>
        </div>
      );
    }

    if (fx === 'BOSS') {
      return (
        <div style={styles.fxOverlay}>
          <div style={{ ...styles.bossHit, borderColor: intent.color }} />
          <div style={{ ...styles.bossHitText, color: intent.color }}>{fxText}</div>
        </div>
      );
    }

    if (fx === 'NORMAL') {
      return (
        <div style={styles.fxOverlay}>
          <div style={styles.hitCircle} />
          <div style={styles.hitLine} />
        </div>
      );
    }

    if (fx === 'COUNTER') {
      return (
        <div style={styles.fxOverlay}>
          <div style={styles.counterCircle} />
          <div style={styles.giantText}>{fxText}</div>
        </div>
      );
    }

    if (fx === 'GUARD') {
      return (
        <div style={styles.fxOverlay}>
          <div style={styles.guardCircle}><Shield size={64} /></div>
          <div style={styles.giantText}>{fxText}</div>
        </div>
      );
    }

    if (fx === 'FOCUS') {
      return (
        <div style={styles.fxOverlay}>
          <div style={styles.focusCircle}><Eye size={54} /></div>
          <div style={styles.giantText}>{fxText}</div>
        </div>
      );
    }

    if (fx === 'POTION') {
      return (
        <div style={styles.fxOverlay}>
          <div style={styles.recoverCircle}><Heart size={54} /></div>
          <div style={styles.giantText}>{fxText}</div>
        </div>
      );
    }

    if (fx === 'ULTIMATE') {
      return (
        <div style={styles.fxOverlay}>
          <div style={styles.ultimateCircle} />
          <div style={styles.giantText}>終天羽星穿ち</div>
        </div>
      );
    }

    return null;
  };

  if (mode === 'LOADING') {
    return (
      <div style={styles.fullScreen}>
        <style>{CSS}</style>
        <div style={styles.loading}>
          <div style={styles.loadingIcon}><Skull size={34} /></div>
          <div style={styles.kicker}>RAID // ABYSS CORE</div>
          <div style={styles.loadingTitle}>深淵戦闘領域を展開</div>
          <div style={styles.loadingSub}>専用アートと新規戦闘システムを読み込んでいます</div>
          <div style={styles.loadingTrack}><div style={styles.loadingBar} /></div>
        </div>
      </div>
    );
  }

  if (mode === 'PRE_BATTLE') {
    return (
      <div style={styles.fullScreen}>
        <style>{CSS}</style>
        <div style={styles.preCard}>
          <div style={styles.preArt}>
            <img src={raidBossArt} alt="" style={styles.preArtImage} />
            <div style={styles.preShade} />
            <div style={styles.preTitleBlock}>
              <div style={styles.kicker}>RAID OPERATION 02 · REWORK</div>
              <div style={styles.preTitle}>深淵喰らい・アビスコア</div>
              <div style={styles.preSub}>読む。賭ける。崩す。バーストする。次の一手で流れが変わる。</div>
            </div>
          </div>

          <div style={styles.preBody}>
            <div className="raidPreGrid" style={styles.preRow}>
              <div style={styles.preBox}>
                <img src={raidIrenaCutIn} alt="" style={styles.preIrena} />
                <div>
                  <div style={styles.kicker}>SOLO RAID</div>
                  <div style={styles.preName}>いれーな</div>
                  <div style={styles.small}>HP 10,000 · MP 100 · TP 0</div>
                </div>
              </div>
              <div style={styles.preBox}>
                <div>
                  <div style={styles.kicker}>BOSS</div>
                  <div style={styles.preBoss}>ABYSS CORE</div>
                  <div style={styles.small}>PHASE I 50,000 → PHASE II 60,000</div>
                </div>
              </div>
            </div>

            <div style={styles.ruleGrid}>
              <div style={styles.rule}>
                <Crosshair size={18} />
                <div><b>読み合い</b><span>大技にはリターンの大きい迎撃。失敗には代償。</span></div>
              </div>
              <div style={styles.rule}>
                <Gauge size={18} />
                <div><b>BREAK</b><span>100%で2ターンのバースト。1ターン目は高倍率。</span></div>
              </div>
              <div style={styles.rule}>
                <Eye size={18} />
                <div><b>学習</b><span>第2形態は同じ行動を続けると本気で対応する。</span></div>
              </div>
            </div>

            <button type="button" onClick={resetBattle} style={styles.primaryButton}>
              <Swords size={19} /> レイド開始
            </button>
            <button type="button" onClick={onBack} style={styles.secondaryButton}>
              <ArrowLeft size={17} /> 本体へ戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'RESULT') {
    return (
      <div style={styles.fullScreen}>
        <style>{CSS}</style>
        <div style={styles.resultCard}>
          <div style={styles.kicker}>RAID RESULT</div>
          <div style={{ ...styles.resultIcon, ...(victory ? styles.resultWin : styles.resultLoss) }}>
            {victory ? <Sparkles size={44} /> : <Skull size={44} />}
          </div>
          <div style={styles.resultTitle}>{victory ? '討伐成功' : '戦闘終了'}</div>
          <div style={styles.resultText}>{log}</div>

          <div style={styles.scoreBox}>
            <div style={styles.scoreKicker}>RUN SCORE</div>
            <div style={styles.score}>{formatNumber(score)}</div>
            <div style={styles.scoreBest}>BEST {formatNumber(Math.max(bestScore, score))}</div>
            <div style={styles.scoreSub}>ターン短縮・被弾減少・高COMBO・完璧迎撃が、次の自己ベストを作る。</div>
          </div>

          <div style={styles.resultGrid}>
            <div style={styles.resultItem}><span>TURN</span><b>{turn}</b></div>
            <div style={styles.resultItem}><span>MAX HIT</span><b>{formatNumber(bestHit)}</b></div>
            <div style={styles.resultItem}><span>MAX COMBO</span><b>{maxCombo}</b></div>
            <div style={styles.resultItem}><span>BREAK</span><b>{breakCount}</b></div>
            <div style={styles.resultItem}><span>DAMAGE TAKEN</span><b>{formatNumber(damageTaken)}</b></div>
            <div style={styles.resultItem}><span>PERFECT</span><b>{perfectResponses}</b></div>
          </div>

          <div style={styles.resultNote}>
            <div style={styles.kicker}>CORE LOOP</div>
            <div style={styles.resultNoteText}>予告 → 判断 → 命中 → 反撃 → BREAK → BURST。第2形態では同じ手が通らなくなる。</div>
          </div>

          <button type="button" onClick={resetBattle} style={styles.primaryButton}>
            <RotateCcw size={18} /> もう一度挑む
          </button>
          <button type="button" onClick={onBack} style={styles.secondaryButton}>
            <ArrowLeft size={17} /> 本体へ戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.fullScreen}>
      <style>{CSS}</style>
      <div style={{ ...styles.main, animation: impactSource ? 'raidShake .34s ease-out' : undefined }}>
        <div style={styles.header}>
          <button type="button" onClick={onBack} style={styles.backButton}>
            <ArrowLeft size={16} /> 戻る
          </button>
          <div style={styles.headerTitle}>
            <span style={styles.headerPhase}>{phaseLabel}</span>
            <span>深淵喰らい・アビスコア</span>
          </div>
          <button type="button" onClick={() => setSoundOn(value => !value)} style={styles.soundButton}>
            {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
        </div>

        <section className="raidStage" style={styles.stage}>
          <div style={{ ...styles.stageBackdrop, backgroundImage: 'linear-gradient(rgba(4,4,12,.35),rgba(5,3,12,.86)),url(' + raidBossArt + ')' }} />
          <div style={styles.stageVignette} />

          <div style={styles.bossHud}>
            <div>
              <div style={styles.kicker}>ABYSS CORE // TARGET</div>
              <div style={styles.bossName}>深淵喰らい・アビスコア</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={styles.hpText}>{formatNumber(bossHp)} / {formatNumber(bossMaxHp)}</div>
              <div style={styles.phaseBadge}>{phaseLabel}</div>
            </div>
          </div>

          <div style={styles.hpTrack}>
            <div style={{ ...styles.hpFill, width: bossPct + '%' }} />
          </div>

          <div style={styles.breakWrap}>
            <div style={styles.breakHead}>
              <span>BREAK</span>
              <b>{broken ? 'BURST × ' + brokenTurns : Math.round(bossBreak) + '%'}</b>
            </div>
            <div style={styles.breakTrack}>
              <div style={{ ...styles.breakFill, width: (broken ? 100 : bossBreak) + '%' }} />
            </div>
          </div>

          {!broken ? (
            <div style={{ ...styles.intentCard, borderColor: intent.color }}>
              <div style={styles.intentTop}>
                <span>NEXT INTENT</span>
                <span style={{ color: intent.color }}>
                  {intent.danger === 'EXTREME' ? 'EXTREME' : intent.danger === 'HIGH' ? 'HIGH' : 'NORMAL'}
                </span>
              </div>
              <div style={styles.intentName}>{intent.name}</div>
              <div style={styles.intentDetail}>{intent.detail}</div>
              <div style={styles.intentCounter}>読み合いの軸：{intent.bestResponse}</div>
            </div>
          ) : (
            <div style={styles.breakWindow}>
              <div style={styles.breakKicker}>CORE EXPOSED</div>
              <div style={styles.breakTitle}>最大火力を叩き込め</div>
              <div style={styles.breakSub}>1ターン目 ×1.50 / 2ターン目 ×1.25 / 必殺はさらに ×1.35</div>
            </div>
          )}

          <div style={styles.bossVisual}>
            <img
              key={'boss-' + impactKey}
              src={raidBossArt}
              alt=""
              style={{
                ...styles.bossImage,
                filter:
                  broken
                    ? 'saturate(1.5) contrast(1.2) brightness(1.18)'
                    : impactSource === 'BOSS'
                      ? 'saturate(1.3) contrast(1.22) brightness(1.25)'
                      : phase === 2
                        ? 'saturate(1.28) contrast(1.14) brightness(1.08)'
                        : 'saturate(1.12) contrast(1.08)',
              }}
            />
          </div>

          {damagePopup && (
            <div
              key={damagePopup.key}
              style={{
                ...styles.damage,
                color: damagePopup.source === 'PLAYER' ? '#fff' : '#ff92a9',
              }}
            >
              {formatNumber(damagePopup.value)}
            </div>
          )}

          <div style={styles.turn}>TURN {turn}</div>

          <div style={styles.log}>
            <div style={styles.logTop}>
              <span>{broken ? 'BURST WINDOW' : 'BATTLE LOG'}</span>
              <span>{phase === 2 ? 'ADAPT ' + adaptationLevel + '/3' : 'READABLE BOSS'}</span>
            </div>
            <div style={styles.logText}>{log}</div>
            <div style={styles.hint}>{actionHint}</div>
          </div>

          {fxView()}
        </section>

        <section className="raidBottom" style={styles.bottom}>
          <div style={styles.playerPanel}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.kicker}>ALLY</div>
                <div style={styles.playerName}>いれーな</div>
              </div>
              <div style={styles.state}>{player.focus ? 'FOCUS READY' : broken ? 'BURST TIME' : 'READY'}</div>
            </div>

            <div style={styles.hpLine}>
              <span>HP</span>
              <b>{formatNumber(player.hp)} / {formatNumber(PLAYER_MAX_HP)}</b>
            </div>
            <div style={styles.playerHpTrack}>
              <div style={{ ...styles.playerHpFill, width: playerPct + '%' }} />
            </div>

            <div style={styles.resourceGrid}>
              <div style={styles.resource}><span>MP</span><b>{player.mp}</b></div>
              <div style={styles.resource}><span>TP</span><b>{player.tp}</b></div>
              <div style={styles.resource}><span>SHIELD</span><b>{formatNumber(player.shield)}</b></div>
              <div style={styles.resource}><span>COMBO</span><b>{combo}</b></div>
            </div>

            <div style={styles.resourceNote}>
              <span>次攻撃</span>
              <b>{player.focus ? '×1.55' : '通常'}</b>
              <span>羽弾</span>
              <b>{player.featherCooldown > 0 ? 'CD ' + player.featherCooldown : 'READY'}</b>
              <span>ポーション</span>
              <b>×{player.potions}</b>
            </div>
          </div>

          <div style={styles.tacticalPanel}>
            <div style={styles.kicker}>TACTICAL READ</div>
            <div style={styles.tacticalTitle}>
              {broken ? 'バースト時間を使い切る' : intent.name + ' をどう返す？'}
            </div>
            <div style={styles.tacticalRow}>
              <span>高リターン</span>
              <b>{broken ? '必殺 / 羽弾 / 通常連打' : intent.bestResponse}</b>
            </div>
            <div style={styles.tacticalRow}>
              <span>失敗時</span>
              <b>{bossPattern === 'CHARGE' || bossPattern === 'RAGE' ? '迎撃ミス＝重い反撃' : '通常のボス攻撃'}</b>
            </div>
            <div style={styles.tacticalRow}>
              <span>第2形態</span>
              <b>{phase === 2 ? '同じ手を続けると学習' : '次の形態で解禁'}</b>
            </div>
          </div>
        </section>

        <section className="raidActions" style={styles.actions}>
          <button type="button" disabled={isResolving} onClick={() => performAction('NORMAL')} style={styles.actionButton}>
            <Swords size={19} />
            <span>通常攻撃</span>
            <small>6,500–7,600 · TP +18</small>
          </button>

          <button
            type="button"
            disabled={isResolving || player.mp < 18 || player.featherCooldown > 0}
            onClick={() => performAction('FEATHER')}
            style={{ ...styles.actionButton, ...styles.featherButton }}
          >
            <Sparkles size={19} />
            <span>羽弾</span>
            <small>{player.featherCooldown > 0 ? 'CD ' + player.featherCooldown : '9,800–11,500 · MP18'}</small>
          </button>

          <button type="button" disabled={isResolving || player.mp < 12} onClick={() => performAction('FOCUS')} style={styles.actionButton}>
            <Eye size={19} />
            <span>風詠集中</span>
            <small>次攻撃 ×1.55 · MP12</small>
          </button>

          <button type="button" disabled={isResolving || player.mp < 10} onClick={() => performAction('GUARD')} style={styles.actionButton}>
            <Shield size={19} />
            <span>防御</span>
            <small>盾3,600 · HP +450</small>
          </button>

          <button type="button" disabled={isResolving} onClick={() => performAction('COUNTER')} style={{ ...styles.actionButton, ...styles.counterButton }}>
            <Crosshair size={19} />
            <span>迎撃</span>
            <small>大技なら超強力 · 外すと反撃強化</small>
          </button>

          <button type="button" disabled={isResolving || player.potions <= 0} onClick={() => performAction('POTION')} style={styles.actionButton}>
            <Heart size={19} />
            <span>ポーション</span>
            <small>HP +2,800 · MP +30</small>
          </button>

          <button
            type="button"
            disabled={isResolving || !ultimateReady}
            onClick={() => performAction('ULTIMATE')}
            style={{ ...styles.actionButton, ...styles.ultimateButton, ...(ultimateReady ? styles.ultimateReady : {}) }}
          >
            <Zap size={20} />
            <span>必殺・終天羽星穿ち</span>
            <small>{ultimateReady ? 'READY · 26,000–30,000' : 'TP ' + player.tp + '/100'}</small>
          </button>
        </section>

        <div className="raidFooter" style={styles.footer}>
          <span>予告 → 判断 → 命中 → 反撃 → BREAK → BURST</span>
          <span>{phase === 2 ? 'ADAPTIVE BOSS ONLINE' : 'READABLE BOSS ONLINE'}</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  fullScreen: {
    position: 'relative',
    width: '100%',
    minHeight: '100%',
    height: '100%',
    overflowY: 'auto',
    background: '#05050c',
    color: '#f5f7ff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    boxSizing: 'border-box',
  },
  loading: { textAlign: 'center' },
  loadingIcon: { width: 72, height: 72, margin: '0 auto 16px', borderRadius: 20, display: 'grid', placeItems: 'center', color: '#ff718e', background: 'rgba(255,54,88,.08)', border: '1px solid #573043' },
  kicker: { color: '#ff91a8', fontSize: 10, fontWeight: 900, letterSpacing: '.2em' },
  loadingTitle: { marginTop: 8, fontSize: 'clamp(30px,7vw,56px)', fontWeight: 1000 },
  loadingSub: { marginTop: 6, color: '#8f99ad', fontSize: 13 },
  loadingTrack: { width: 'min(340px,72vw)', height: 3, margin: '24px auto 0', overflow: 'hidden', background: '#1b1724' },
  loadingBar: { width: '100%', height: '100%', background: 'linear-gradient(90deg,#ff4e73,#7f58ff)', transformOrigin: 'left', animation: 'raidLoad .75s ease-out forwards' },

  preCard: { width: 'min(100%,960px)', overflow: 'hidden', borderRadius: 24, background: '#0a0b13', border: '1px solid #2b2940', boxShadow: '0 28px 90px rgba(0,0,0,.55)' },
  preArt: { position: 'relative', height: 350, overflow: 'hidden' },
  preArtImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  preShade: { position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(2,3,9,.94),rgba(3,3,10,.52) 48%,rgba(3,3,10,.12)),linear-gradient(0deg,rgba(5,5,12,.92),transparent 55%)' },
  preTitleBlock: { position: 'absolute', left: 26, right: 26, bottom: 24 },
  preTitle: { marginTop: 7, fontSize: 'clamp(28px,6vw,48px)', lineHeight: 1.05, fontWeight: 1000 },
  preSub: { marginTop: 6, color: '#b3bbcc', fontSize: 13 },
  preBody: { padding: 18 },
  preRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  preBox: { minHeight: 92, padding: 10, borderRadius: 16, background: '#0e1220', border: '1px solid #29324b', display: 'flex', alignItems: 'center', gap: 12, boxSizing: 'border-box' },
  preIrena: { width: 120, height: 74, borderRadius: 11, objectFit: 'cover', objectPosition: '18% center', border: '1px solid #8d7eff' },
  preName: { marginTop: 4, fontSize: 21, fontWeight: 1000 },
  preBoss: { marginTop: 4, fontSize: 21, fontWeight: 1000, color: '#ff8da3' },
  small: { marginTop: 4, color: '#8f9bb3', fontSize: 10 },
  ruleGrid: { marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 9 },
  rule: { minHeight: 70, padding: 11, borderRadius: 13, border: '1px solid #252c40', background: '#0d111b', color: '#9eabc3', display: 'flex', gap: 9, alignItems: 'flex-start' },
  'rule b': { color: '#f0f4ff', fontSize: 11 },
  'rule span': { color: '#9aa5bb', fontSize: 10, lineHeight: 1.45 },
  primaryButton: { minHeight: 52, marginTop: 14, borderRadius: 13, border: '1px solid #ff6b8c', background: 'linear-gradient(135deg,#571b31,#2f225d)', color: '#fff', fontWeight: 1000, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', width: '100%' },
  secondaryButton: { minHeight: 45, marginTop: 8, borderRadius: 12, border: '1px solid #2d3850', background: '#0d1320', color: '#ccd5e6', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', width: '100%' },

  resultCard: { width: 'min(100%,640px)', padding: 24, borderRadius: 22, border: '1px solid #2d3045', background: 'rgba(10,11,20,.97)', textAlign: 'center', boxSizing: 'border-box' },
  resultIcon: { width: 86, height: 86, margin: '14px auto 8px', borderRadius: '50%', display: 'grid', placeItems: 'center' },
  resultWin: { color: '#c1b0ff', border: '1px solid #826eff', background: 'rgba(120,88,255,.1)' },
  resultLoss: { color: '#ff7b94', border: '1px solid #6c3044', background: 'rgba(255,60,90,.08)' },
  resultTitle: { fontSize: 38, fontWeight: 1000 },
  resultText: { marginTop: 6, color: '#a5aec1', fontSize: 13, lineHeight: 1.55 },
  scoreBox: { marginTop: 16, padding: 16, borderRadius: 15, background: 'linear-gradient(135deg,#171125,#101420)', border: '1px solid #44366c' },
  scoreKicker: { color: '#a99cff', fontSize: 9, fontWeight: 900, letterSpacing: '.22em' },
  score: { marginTop: 4, fontSize: 44, fontWeight: 1000, color: '#fff1bd', textShadow: '0 0 25px rgba(255,234,160,.25)' },
  scoreBest: { marginTop: 2, color: '#fff1bd', fontSize: 10, fontWeight: 900, letterSpacing: '.12em' },
  scoreSub: { marginTop: 4, color: '#9aa5bb', fontSize: 10, lineHeight: 1.5 },
  resultGrid: { marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 },
  resultItem: { padding: 11, borderRadius: 11, background: '#0d1320', border: '1px solid #232d43' },
  'resultItem span': { display: 'block', color: '#7f8aa0', fontSize: 8, letterSpacing: '.12em' },
  resultNote: { marginTop: 14, padding: 13, borderRadius: 12, background: '#0b101a', border: '1px solid #1f293b', textAlign: 'left' },
  resultNoteText: { marginTop: 6, color: '#cbd6e9', fontSize: 12, lineHeight: 1.55 },

  main: { width: 'min(100%,1180px)', minWidth: 0 },
  header: { minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 7px', borderRadius: 12, background: 'rgba(9,10,17,.94)', border: '1px solid #232c42', boxSizing: 'border-box' },
  backButton: { minHeight: 34, padding: '0 10px', borderRadius: 9, border: '1px solid #2e3a54', background: '#0d1320', color: '#ccd6e7', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: 800 },
  headerTitle: { display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, fontSize: 13, fontWeight: 950 },
  headerPhase: { color: '#ff7f98', fontSize: 10, letterSpacing: '.15em' },
  soundButton: { width: 34, height: 34, borderRadius: 9, border: '1px solid #2e3a54', background: '#0d1320', color: '#dce5f3', display: 'grid', placeItems: 'center', cursor: 'pointer' },

  stage: { position: 'relative', overflow: 'hidden', minHeight: 510, marginTop: 10, padding: 15, borderRadius: 18, border: '1px solid #292f45', background: '#070810', boxSizing: 'border-box' },
  stageBackdrop: { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .72, transform: 'scale(1.02)', animation: 'raidAmbient 8s ease-in-out infinite', pointerEvents: 'none' },
  stageVignette: { position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 45%,transparent 0%,rgba(4,4,11,.16) 42%,rgba(3,3,9,.94) 100%)', pointerEvents: 'none' },
  bossHud: { position: 'relative', zIndex: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  bossName: { marginTop: 3, fontSize: 'clamp(19px,3vw,26px)', fontWeight: 1000 },
  hpText: { color: '#ffd6df', fontSize: 12, fontWeight: 900 },
  phaseBadge: { marginTop: 3, display: 'inline-block', padding: '3px 6px', borderRadius: 999, background: 'rgba(38,17,35,.76)', border: '1px solid #593147', color: '#ff9eaf', fontSize: 9, fontWeight: 900 },
  hpTrack: { position: 'relative', zIndex: 4, height: 15, marginTop: 7, borderRadius: 999, background: '#20131a', border: '1px solid #50303a', overflow: 'hidden' },
  hpFill: { height: '100%', background: 'linear-gradient(90deg,#5d1b49,#e53e6a,#ff934e)', transition: 'width .38s ease' },
  breakWrap: { position: 'relative', zIndex: 4, marginTop: 8 },
  breakHead: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9aa6bb', fontWeight: 900, letterSpacing: '.15em' },
  breakTrack: { height: 7, marginTop: 4, borderRadius: 999, background: '#1f1b10', border: '1px solid #534626', overflow: 'hidden' },
  breakFill: { height: '100%', background: 'linear-gradient(90deg,#8f751a,#fff1a0)', transition: 'width .28s ease' },
  intentCard: { position: 'relative', zIndex: 5, width: 'min(100%,580px)', margin: '10px auto 0', padding: '11px 13px', borderRadius: 13, borderLeft: '3px solid #ff5d7d', background: 'rgba(8,10,18,.78)', animation: 'raidWarn 1.7s ease-in-out infinite' },
  intentTop: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#8793aa', fontWeight: 900, letterSpacing: '.15em' },
  intentName: { marginTop: 4, fontSize: 18, fontWeight: 1000 },
  intentDetail: { marginTop: 2, color: '#94a0b5', fontSize: 10, lineHeight: 1.45 },
  intentCounter: { marginTop: 5, color: '#d1c8ff', fontSize: 10, fontWeight: 900 },
  breakWindow: { position: 'relative', zIndex: 5, width: 'min(100%,560px)', margin: '12px auto 0', padding: '11px 13px', borderRadius: 13, textAlign: 'center', background: 'rgba(45,35,11,.5)', border: '1px solid #f0d667' },
  breakKicker: { color: '#fff1a1', fontSize: 9, fontWeight: 1000, letterSpacing: '.22em' },
  breakTitle: { marginTop: 4, fontSize: 19, fontWeight: 1000 },
  breakSub: { marginTop: 3, color: '#dfd5a1', fontSize: 10 },

  bossVisual: { position: 'absolute', left: '50%', top: 142, width: 'min(74vw,530px)', height: 'min(56vw,345px)', transform: 'translateX(-50%)', zIndex: 2, display: 'grid', placeItems: 'center' },
  bossImage: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16, opacity: .82, mixBlendMode: 'screen', animation: 'raidPulse 2.8s ease-in-out infinite', transition: 'filter .18s ease' },
  damage: { position: 'absolute', left: '50%', top: '48%', zIndex: 13, fontSize: 'clamp(34px,6vw,58px)', fontWeight: 1000, textShadow: '0 3px 0 #521426,0 0 22px rgba(255,86,126,.9)', animation: 'raidDamage .72s ease-out forwards', pointerEvents: 'none' },
  turn: { position: 'absolute', left: 15, bottom: 91, zIndex: 5, padding: '5px 8px', borderRadius: 7, background: 'rgba(6,8,13,.78)', border: '1px solid #303a51', color: '#aeb9ce', fontSize: 9, fontWeight: 900, letterSpacing: '.15em' },
  log: { position: 'absolute', left: 15, right: 15, bottom: 13, zIndex: 5, padding: '9px 12px', borderRadius: 12, background: 'rgba(5,7,12,.84)', border: '1px solid #2a3449', boxSizing: 'border-box' },
  logTop: { display: 'flex', justifyContent: 'space-between', gap: 8, color: '#78859d', fontSize: 8, fontWeight: 900, letterSpacing: '.13em' },
  logText: { marginTop: 4, fontSize: 12, fontWeight: 900, lineHeight: 1.45 },
  hint: { marginTop: 4, color: '#a9b4c8', fontSize: 10, lineHeight: 1.4 },

  fxOverlay: { position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', overflow: 'hidden', display: 'grid', placeItems: 'center' },
  fxShade: { position: 'absolute', inset: 0, background: 'rgba(4,4,15,.44)' },
  cutinImage: { position: 'absolute', inset: '-3% -4%', width: '108%', height: '106%', objectFit: 'cover', animation: 'raidCut 1.3s cubic-bezier(.18,.78,.18,1) forwards', filter: 'saturate(1.08) contrast(1.05)' },
  cutinSweep: { position: 'absolute', left: '-10%', top: '45%', width: '120%', height: 5, background: 'linear-gradient(90deg,transparent,#fff,rgba(180,120,255,.7),transparent)', boxShadow: '0 0 30px rgba(210,190,255,.85)', transform: 'rotate(-8deg)', animation: 'raidPop 1.1s ease-out forwards' },
  cutinText: { position: 'absolute', right: '6%', top: '18%', textAlign: 'right', animation: 'raidText 1.25s ease-out forwards', textShadow: '0 4px 18px rgba(0,0,0,.85)' },
  cutinSub: { color: '#d8d6ff', fontSize: 10, fontWeight: 900, letterSpacing: '.18em' },
  cutinTitle: { marginTop: 6, color: '#fff', fontSize: 54, lineHeight: .95, fontWeight: 1000, textShadow: '0 0 24px #8d75ff' },
  cutinHint: { marginTop: 5, color: '#f0ecff', fontSize: 10, fontWeight: 1000, letterSpacing: '.14em' },
  hitCircle: { width: '48%', aspectRatio: '1', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 46px rgba(205,238,255,.85)', animation: 'raidFlash .55s ease-out forwards' },
  hitLine: { position: 'absolute', width: '74%', height: 8, borderRadius: 999, background: 'linear-gradient(90deg,transparent,#fff,transparent)', boxShadow: '0 0 20px rgba(255,255,255,.8)', animation: 'raidPop .5s ease-out forwards' },
  counterCircle: { width: '46%', aspectRatio: '1', borderRadius: '50%', border: '3px solid #fff3bb', boxShadow: '0 0 44px rgba(255,224,130,.65)', animation: 'raidPop .7s ease-out forwards' },
  guardCircle: { width: 160, height: 160, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#b9fff0', border: '2px solid rgba(173,255,235,.94)', background: 'rgba(75,240,208,.08)', boxShadow: '0 0 48px rgba(110,255,226,.38)', animation: 'raidPop .8s ease-out forwards' },
  focusCircle: { width: 144, height: 144, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#d6ccff', border: '2px solid #c6b6ff', boxShadow: '0 0 44px rgba(160,125,255,.56)', animation: 'raidPop .72s ease-out forwards' },
  recoverCircle: { width: 140, height: 140, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#abffbe', border: '2px solid rgba(130,255,160,.82)', background: 'rgba(65,180,95,.08)', boxShadow: '0 0 38px rgba(110,255,140,.3)', animation: 'raidPop .8s ease-out forwards' },
  ultimateCircle: { width: '52%', aspectRatio: '1', borderRadius: '50%', border: '3px solid #ded4ff', boxShadow: '0 0 70px rgba(156,106,255,.84)', animation: 'raidFlash .86s ease-out forwards' },
  breakCircle: { width: '62%', aspectRatio: '1', borderRadius: '50%', border: '4px solid #fff0a4', boxShadow: '0 0 72px rgba(255,232,128,.86)', animation: 'raidBreak .95s ease-out forwards' },
  breakText: { position: 'relative', color: '#fff7be', fontSize: 'clamp(40px,9vw,92px)', fontWeight: 1000, letterSpacing: '.12em', textShadow: '0 0 34px rgba(255,233,120,.95)', animation: 'raidBreak .92s ease-out forwards' },
  phaseOverlay: { position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', pointerEvents: 'none', background: 'radial-gradient(circle,rgba(255,54,88,.84),rgba(10,0,16,.97) 68%)', animation: 'raidPhase 1.1s ease-out forwards' },
  phaseText: { color: '#fff', fontSize: 'clamp(52px,11vw,120px)', fontWeight: 1000, textShadow: '0 0 45px rgba(255,72,110,.95)' },
  phaseSub: { position: 'absolute', top: '61%', color: '#ffc8d4', fontSize: 16, fontWeight: 900, letterSpacing: '.35em' },
  bossHit: { width: '44%', aspectRatio: '1', borderRadius: '50%', border: '3px solid #ff6b86', boxShadow: '0 0 46px rgba(255,70,100,.72)', animation: 'raidFlash .68s ease-out forwards' },
  bossHitText: { position: 'relative', marginTop: 205, fontSize: 'clamp(24px,5vw,48px)', fontWeight: 1000, textShadow: '0 0 26px currentColor', animation: 'raidPop .65s ease-out forwards' },
  giantText: { position: 'relative', marginTop: 220, color: '#fff', fontSize: 'clamp(22px,5vw,46px)', fontWeight: 1000, textShadow: '0 0 24px rgba(255,255,255,.75)', animation: 'raidPop .7s ease-out forwards' },

  bottom: { marginTop: 10, display: 'grid', gridTemplateColumns: '1.06fr .94fr', gap: 10 },
  playerPanel: { borderRadius: 15, border: '1px solid #24384a', background: '#0b1419', padding: 12 },
  panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  playerName: { marginTop: 4, fontSize: 22, fontWeight: 1000 },
  state: { color: '#86f2d6', fontSize: 9, fontWeight: 900, letterSpacing: '.16em' },
  hpLine: { display: 'flex', justifyContent: 'space-between', marginTop: 10, color: '#92a0b5', fontSize: 10, fontWeight: 900 },
  playerHpTrack: { height: 10, marginTop: 4, borderRadius: 999, overflow: 'hidden', background: '#102026', border: '1px solid #204b49' },
  playerHpFill: { height: '100%', background: 'linear-gradient(90deg,#19b897,#75f0d3)', transition: 'width .28s ease' },
  resourceGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 6 },
  resource: { marginTop: 9, padding: '7px 6px', borderRadius: 9, background: '#091117', border: '1px solid #1d3140', textAlign: 'center' },
  resourceNote: { marginTop: 8, display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto 1fr', gap: 5, alignItems: 'center', color: '#6f7d92', fontSize: 8 },
  'resourceNote b': { color: '#c6d0e1', textAlign: 'right' },
  tacticalPanel: { borderRadius: 15, border: '1px solid #302b48', background: '#0e0d18', padding: 13 },
  tacticalTitle: { marginTop: 6, fontSize: 17, fontWeight: 1000 },
  tacticalRow: { marginTop: 8, paddingBottom: 7, display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid #211f30', color: '#8790a4', fontSize: 10 },
  'tacticalRow b': { color: '#d8d4f1', textAlign: 'right' },

  actions: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 },
  actionButton: { minHeight: 84, padding: '9px 7px', borderRadius: 13, border: '1px solid #2d3950', background: '#101625', color: '#edf2ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontWeight: 900, boxSizing: 'border-box' },
  featherButton: { borderColor: '#6f61a4', background: 'linear-gradient(135deg,#15152a,#201537)' },
  counterButton: { borderColor: '#b28d3d', background: 'linear-gradient(135deg,#171411,#302417)' },
  ultimateButton: { gridColumn: 'span 2', borderColor: '#6d57bd', background: 'linear-gradient(135deg,#21163e,#3a1b28)' },
  ultimateReady: { borderColor: '#f4d997', boxShadow: '0 0 24px rgba(244,217,151,.14)' },
  footer: { marginTop: 8, display: 'flex', justifyContent: 'space-between', color: '#6f7b91', fontSize: 8, letterSpacing: '.08em' },
};

export default RaidBossScreen;
