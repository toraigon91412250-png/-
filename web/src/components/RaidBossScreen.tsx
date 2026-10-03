import React, { useEffect, useRef, useState } from 'react';
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

type PlayerState = {
  hp: number;
  mp: number;
  tp: number;
  shield: number;
  potions: number;
  guardNext: boolean;
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
  counter: string;
};

const BOSS_MAX_HP: Record<Phase, number> = { 1: 50000, 2: 60000 };
const PLAYER_MAX_HP = 10000;
const PLAYER_MAX_MP = 100;
const PLAYER_MAX_TP = 100;
const BREAK_MAX = 100;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const formatNumber = (value: number) => Math.max(0, Math.round(value)).toLocaleString('ja-JP');
const randomBetween = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

const PATTERN_INFO: Record<BossPattern, PatternInfo> = {
  SWEEP: {
    name: '黒爪薙ぎ',
    detail: '広い範囲を切り裂く。攻め返しやすい。',
    minDamage: 950,
    maxDamage: 1250,
    danger: 'NORMAL',
    color: '#c67cff',
    counter: '通常攻撃',
  },
  CHARGE: {
    name: '滅界砲',
    detail: '核が高速回転。次の一撃が非常に重い。',
    minDamage: 2050,
    maxDamage: 2750,
    danger: 'EXTREME',
    color: '#ff6d86',
    counter: '防御 / 迎撃',
  },
  VOID: {
    name: '虚無落雷',
    detail: 'MPを蝕む黒雷。羽弾なら詠唱ごと潰せる。',
    minDamage: 1250,
    maxDamage: 1650,
    danger: 'HIGH',
    color: '#72a9ff',
    counter: '羽弾',
  },
  RAGE: {
    name: '終焉衝動',
    detail: '第2形態専用。最危険だが迎撃の好機。',
    minDamage: 2400,
    maxDamage: 3200,
    danger: 'EXTREME',
    color: '#ff3f62',
    counter: '防御 / 迎撃',
  },
};

const CSS = [
  '@keyframes raidAmbient{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.035);opacity:1}}',
  '@keyframes raidPulse{0%,100%{transform:scale(.98)}50%{transform:scale(1.04)}}',
  '@keyframes raidFlash{0%{opacity:0;transform:scale(.55)}15%{opacity:1}100%{opacity:0;transform:scale(1.25)}}',
  '@keyframes raidPop{0%{opacity:0;transform:scale(.7)}20%{opacity:1;transform:scale(1.05)}100%{opacity:0;transform:scale(1.16)}}',
  '@keyframes raidCut{0%{opacity:0;transform:scale(1.08)}15%{opacity:1;transform:scale(1.02)}80%{opacity:1}100%{opacity:0;transform:scale(.99)}}',
  '@keyframes raidText{0%,15%{opacity:0;transform:translateX(30px)}35%{opacity:1;transform:translateX(0)}84%{opacity:1}100%{opacity:0}}',
  '@keyframes raidBreak{0%{opacity:0;transform:scale(.45)}18%{opacity:1;transform:scale(1.15)}55%{opacity:1}100%{opacity:0;transform:scale(1.32)}}',
  '@keyframes raidPhase{0%{opacity:0}18%{opacity:1}100%{opacity:0}}',
  '@keyframes raidDamage{0%{opacity:0;transform:translate(-50%,12px) scale(.72)}18%{opacity:1;transform:translate(-50%,0) scale(1.08)}100%{opacity:0;transform:translate(-50%,-52px)}}',
  '@keyframes raidWarn{0%,100%{opacity:.72}50%{opacity:1}}',
  '@keyframes raidLoad{from{transform:scaleX(0)}to{transform:scaleX(1)}}',
  '@media(max-width:760px){.raidActions{grid-template-columns:repeat(2,minmax(0,1fr))!important}.raidBottom{grid-template-columns:1fr!important}.raidStage{min-height:450px!important}.raidCutinTitle{font-size:40px!important}.raidFooter{display:none!important}}',
].join('\\n');

export const RaidBossScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [mode, setMode] = useState<'LOADING' | 'PRE_BATTLE' | 'BATTLE' | 'RESULT'>('LOADING');
  const [phase, setPhase] = useState<Phase>(1);
  const [bossHp, setBossHp] = useState(BOSS_MAX_HP[1]);
  const [bossBreak, setBossBreak] = useState(0);
  const [brokenTurns, setBrokenTurns] = useState(0);
  const [bossPattern, setBossPattern] = useState<BossPattern>('SWEEP');
  const [player, setPlayer] = useState<PlayerState>({
    hp: PLAYER_MAX_HP,
    mp: PLAYER_MAX_MP,
    tp: 0,
    shield: 0,
    potions: 2,
    guardNext: false,
    focus: false,
    featherCooldown: 0,
  });
  const [turn, setTurn] = useState(1);
  const [combo, setCombo] = useState(0);
  const [bestHit, setBestHit] = useState(0);
  const [totalDamage, setTotalDamage] = useState(0);
  const [breakCount, setBreakCount] = useState(0);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [log, setLog] = useState('戦闘開始。ボスの予告を読む。');
  const [isResolving, setIsResolving] = useState(false);
  const [fx, setFx] = useState<FxType>(null);
  const [fxText, setFxText] = useState('');
  const [victory, setVictory] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [lastAction, setLastAction] = useState<PlayerAction | null>(null);
  const [repeatCount, setRepeatCount] = useState(0);

  const audioRef = useRef<AudioContext | null>(null);
  const timersRef = useRef<number[]>([]);

  const bossMaxHp = BOSS_MAX_HP[phase];
  const bossHpPct = clamp((bossHp / bossMaxHp) * 100, 0, 100);
  const playerHpPct = clamp((player.hp / PLAYER_MAX_HP) * 100, 0, 100);
  const intent = PATTERN_INFO[bossPattern];
  const broken = brokenTurns > 0;
  const canUltimate = player.tp >= PLAYER_MAX_TP;

  const clearTimers = () => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter(value => value !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
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

  const audio = () => {
    if (!soundOn) return null;
    try {
      if (!audioRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return null;
        audioRef.current = new Ctx();
      }
      if (audioRef.current.state === 'suspended') void audioRef.current.resume();
      return audioRef.current;
    } catch {
      return null;
    }
  };

  const sfx = (kind: 'click' | 'hit' | 'heavy' | 'guard' | 'counter' | 'feather' | 'break' | 'phase' | 'win' | 'lose') => {
    const ctx = audio();
    if (!ctx) return;
    const table: Record<string, [OscillatorType, number, number, number, number]> = {
      click: ['triangle', 520, 760, .06, .12],
      hit: ['triangle', 180, 60, .18, .2],
      heavy: ['sawtooth', 115, 36, .23, .28],
      guard: ['sine', 280, 880, .14, .22],
      counter: ['square', 500, 90, .15, .22],
      feather: ['triangle', 900, 160, .18, .26],
      break: ['sawtooth', 90, 980, .2, .3],
      phase: ['sawtooth', 65, 430, .18, .3],
      win: ['triangle', 520, 1040, .16, .34],
      lose: ['sine', 320, 90, .14, .38],
    };
    try {
      const [type, start, end, gainValue, duration] = table[kind];
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(start, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(25, end), now + duration);
      gain.gain.setValueAtTime(gainValue, now);
      gain.gain.exponentialRampToValueAtTime(.008, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + .01);
      if (kind === 'win') {
        [659.25, 783.99, 1046.5].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          const t = now + .08 + i * .1;
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(.08, t);
          g.gain.exponentialRampToValueAtTime(.008, t + .24);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(t);
          o.stop(t + .26);
        });
      }
    } catch {
      // ignore
    }
  };

  const resetBattle = () => {
    clearTimers();
    setPhase(1);
    setBossHp(BOSS_MAX_HP[1]);
    setBossBreak(0);
    setBrokenTurns(0);
    setBossPattern('SWEEP');
    setPlayer({
      hp: PLAYER_MAX_HP,
      mp: PLAYER_MAX_MP,
      tp: 0,
      shield: 0,
      potions: 2,
      guardNext: false,
      focus: false,
      featherCooldown: 0,
    });
    setTurn(1);
    setCombo(0);
    setBestHit(0);
    setTotalDamage(0);
    setBreakCount(0);
    setLastDamage(null);
    setLog('戦闘開始。ボスの予告を読む。');
    setIsResolving(false);
    setFx(null);
    setFxText('');
    setVictory(false);
    setLastAction(null);
    setRepeatCount(0);
    setMode('BATTLE');
    sfx('click');
  };

  const finishDefeat = (message: string) => {
    sfx('lose');
    setPlayer(prev => ({ ...prev, hp: 0 }));
    setLog(message);
    setVictory(false);
    setIsResolving(false);
    setFx(null);
    setMode('RESULT');
  };

  const finishVictory = () => {
    sfx('win');
    setLog('深淵喰らい・アビスコアを討伐した！');
    setVictory(true);
    setIsResolving(false);
    setFx('BREAK');
    setFxText('RAID CLEAR');
    setMode('RESULT');
  };

  const choosePattern = (
    currentPhase: Phase,
    currentPlayer: PlayerState,
    previous: BossPattern,
    action: PlayerAction,
    repeats: number,
  ): BossPattern => {
    if (currentPhase === 2 && repeats >= 2) {
      const adaptation: Partial<Record<PlayerAction, BossPattern>> = {
        NORMAL: 'VOID',
        FEATHER: 'CHARGE',
        FOCUS: 'RAGE',
        GUARD: 'VOID',
        COUNTER: 'SWEEP',
        POTION: 'CHARGE',
      };
      const forced = adaptation[action];
      if (forced && forced !== previous) return forced;
    }

    const pool: BossPattern[] = currentPhase === 2
      ? ['SWEEP', 'CHARGE', 'VOID', 'RAGE']
      : ['SWEEP', 'CHARGE', 'VOID'];

    const weighted = pool.map(pattern => {
      if (pattern === previous) return { pattern, weight: 0 };
      let weight = 2;
      if (currentPlayer.hp < PLAYER_MAX_HP * .44 && (pattern === 'CHARGE' || pattern === 'RAGE')) weight += 2;
      if (currentPlayer.mp < 30 && pattern === 'SWEEP') weight += 2;
      if (currentPlayer.shield > 0 && pattern === 'VOID') weight += 2;
      if (currentPlayer.tp >= 80 && (pattern === 'CHARGE' || pattern === 'RAGE')) weight += 1;
      if (currentPhase === 2 && pattern === 'RAGE') weight = currentPlayer.hp < PLAYER_MAX_HP * .45 ? 4 : 1;
      return { pattern, weight };
    }).filter(entry => entry.weight > 0);

    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    if (!total) return pool.find(pattern => pattern !== previous) || pool[0];

    let roll = Math.random() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.pattern;
    }
    return weighted[weighted.length - 1].pattern;
  };

  const bossAttack = (
    currentPhase: Phase,
    currentPattern: BossPattern,
    currentPlayer: PlayerState,
    activeRepeat: PlayerAction | null,
    activeRepeats: number,
  ) => {
    if (brokenTurns > 0) {
      const remaining = brokenTurns - 1;
      setBrokenTurns(remaining);
      setBossPattern(choosePattern(currentPhase, currentPlayer, currentPattern, activeRepeat || 'NORMAL', activeRepeats));
      setLog(remaining > 0 ? 'BREAK継続。さらに一撃入れられる！' : 'BREAK終了。ボスが再起動する！');
      setIsResolving(false);
      return;
    }

    setFx('BOSS');
    setFxText(PATTERN_INFO[currentPattern].name);
    sfx(currentPattern === 'CHARGE' || currentPattern === 'RAGE' ? 'heavy' : 'hit');

    schedule(() => {
      const info = PATTERN_INFO[currentPattern];
      const raw = randomBetween(info.minDamage, info.maxDamage);
      const mitigation = currentPlayer.guardNext
        ? (currentPattern === 'CHARGE' || currentPattern === 'RAGE' ? .24 : .55)
        : 1;
      const incoming = Math.round(raw * mitigation);
      const shieldDamage = Math.min(currentPlayer.shield, incoming);
      const hpDamage = Math.max(0, incoming - shieldDamage);
      const nextHp = Math.max(0, currentPlayer.hp - hpDamage);
      const nextPlayer = {
        ...currentPlayer,
        hp: nextHp,
        shield: Math.max(0, currentPlayer.shield - shieldDamage),
        guardNext: false,
        featherCooldown: Math.max(0, currentPlayer.featherCooldown - 1),
      };

      setPlayer(nextPlayer);
      setLastDamage(hpDamage);
      setFx(null);
      setLog(currentPattern === 'CHARGE' || currentPattern === 'RAGE'
        ? info.name + 'が直撃！ ' + formatNumber(hpDamage) + 'ダメージ'
        : info.name + '！ ' + formatNumber(hpDamage) + 'ダメージ');

      if (nextHp <= 0) {
        finishDefeat('アビスコアに押し切られた。');
        return;
      }

      setBossPattern(choosePattern(currentPhase, nextPlayer, currentPattern, activeRepeat || 'NORMAL', activeRepeats));
      setTurn(prev => prev + 1);
      setIsResolving(false);
    }, 420);
  };

  const performAction = (action: PlayerAction) => {
    if (mode !== 'BATTLE' || isResolving) return;

    if (action === 'ULTIMATE' && !canUltimate) {
      setLog('必殺ゲージが100%必要。');
      return;
    }
    if (action === 'FEATHER' && player.featherCooldown > 0) {
      setLog('羽弾はまだ再使用できない。');
      return;
    }
    if (action === 'FEATHER' && player.mp < 18) {
      setLog('MPが足りない。');
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

    setIsResolving(true);
    setLastDamage(null);

    const repeats = lastAction === action ? repeatCount + 1 : 1;
    setLastAction(action);
    setRepeatCount(repeats);

    const currentIntent = bossPattern;
    const currentBroken = brokenTurns;
    const perfectCounter = action === 'COUNTER' && (currentIntent === 'CHARGE' || currentIntent === 'RAGE');
    const interrupt = action === 'FEATHER' && currentIntent === 'VOID';
    const pressure = action === 'NORMAL' && currentIntent === 'SWEEP';

    setFx(action);
    setFxText(
      action === 'FEATHER' ? '羽弾' :
      action === 'COUNTER' ? 'COUNTER!' :
      action === 'FOCUS' ? '集中' :
      action === 'GUARD' ? '防御' :
      action === 'POTION' ? 'RECOVER' :
      action === 'ULTIMATE' ? '終天羽星穿ち' :
      '通常攻撃',
    );

    const damageBase =
      action === 'NORMAL' ? randomBetween(6500, 7600) :
      action === 'FEATHER' ? randomBetween(9800, 11500) :
      action === 'COUNTER' ? (perfectCounter ? randomBetween(7200, 8600) : randomBetween(3200, 4200)) :
      action === 'ULTIMATE' ? randomBetween(26000, 30000) :
      0;

    const tpGain =
      action === 'NORMAL' ? 18 :
      action === 'FEATHER' ? 24 :
      action === 'COUNTER' ? (perfectCounter ? 12 : 18) :
      action === 'FOCUS' ? 15 :
      action === 'GUARD' ? 14 :
      action === 'POTION' ? 8 :
      0;

    const mpCost =
      action === 'FEATHER' ? 18 :
      action === 'FOCUS' ? 12 :
      action === 'GUARD' ? 10 :
      0;

    if (action === 'POTION') {
      const nextPlayer = {
        ...player,
        hp: Math.min(PLAYER_MAX_HP, player.hp + 2800),
        mp: Math.min(PLAYER_MAX_MP, player.mp + 30),
        tp: clamp(player.tp + tpGain, 0, PLAYER_MAX_TP),
        potions: player.potions - 1,
        guardNext: false,
        focus: false,
        featherCooldown: Math.max(0, player.featherCooldown - 1),
      };
      setPlayer(nextPlayer);
      setCombo(0);
      setLog('ポーションで立て直した。');

      schedule(() => {
        if (currentBroken > 0) {
          const remaining = currentBroken - 1;
          setBrokenTurns(remaining);
          if (remaining === 0) setBossPattern(choosePattern(phase, nextPlayer, currentIntent, action, repeats));
          setFx(null);
          setIsResolving(false);
          return;
        }
        bossAttack(phase, currentIntent, nextPlayer, action, repeats);
      }, 520);
      return;
    }

    if (action === 'FOCUS') {
      const nextPlayer = {
        ...player,
        mp: clamp(player.mp - mpCost, 0, PLAYER_MAX_MP),
        tp: clamp(player.tp + tpGain, 0, PLAYER_MAX_TP),
        focus: true,
        guardNext: false,
        featherCooldown: Math.max(0, player.featherCooldown - 1),
      };
      setPlayer(nextPlayer);
      setCombo(0);
      setLog(currentIntent === 'CHARGE' || currentIntent === 'RAGE'
        ? '集中を仕込んだ。強攻撃を受ける覚悟が必要。'
        : '集中を仕込んだ。次の一撃が強化される。');

      schedule(() => {
        if (currentBroken > 0) {
          const remaining = currentBroken - 1;
          setBrokenTurns(remaining);
          if (remaining === 0) setBossPattern(choosePattern(phase, nextPlayer, currentIntent, action, repeats));
          setFx(null);
          setIsResolving(false);
          return;
        }
        bossAttack(phase, currentIntent, nextPlayer, action, repeats);
      }, 520);
      return;
    }

    if (action === 'GUARD') {
      const perfectGuard = currentIntent === 'CHARGE' || currentIntent === 'RAGE';
      const nextPlayer = {
        ...player,
        hp: Math.min(PLAYER_MAX_HP, player.hp + 450),
        mp: clamp(player.mp - mpCost, 0, PLAYER_MAX_MP),
        tp: clamp(player.tp + tpGain, 0, PLAYER_MAX_TP),
        shield: 3600,
        guardNext: true,
        focus: false,
        featherCooldown: Math.max(0, player.featherCooldown - 1),
      };
      setPlayer(nextPlayer);
      setCombo(0);
      if (perfectGuard && currentBroken === 0) {
        setBossBreak(prev => clamp(prev + 28, 0, BREAK_MAX));
        setLog('PERFECT GUARD！大技を読み、BREAKを奪った。');
        sfx('guard');
      } else {
        setLog('防御構え。盾3,600を展開。');
        sfx('click');
      }

      schedule(() => {
        if (currentBroken > 0) {
          const remaining = currentBroken - 1;
          setBrokenTurns(remaining);
          if (remaining === 0) setBossPattern(choosePattern(phase, nextPlayer, currentIntent, action, repeats));
          setFx(null);
          setIsResolving(false);
          return;
        }
        bossAttack(phase, currentIntent, nextPlayer, action, repeats);
      }, 620);
      return;
    }

    if (action === 'COUNTER') sfx(perfectCounter ? 'counter' : 'guard');
    if (action === 'FEATHER') sfx('feather');

    const focusMul = player.focus ? 1.45 : 1;
    const comboMul = combo >= 2 ? 1.08 : 1;
    const breakMul = currentBroken > 0 ? 1.30 : 1;
    const responseMul = perfectCounter ? 1.28 : interrupt ? 1.18 : pressure ? 1.14 : 1;
    const finalDamage = Math.round(damageBase * focusMul * comboMul * breakMul * responseMul);
    const actualDamage = Math.min(bossHp, finalDamage);

    const breakGain =
      action === 'NORMAL' ? (pressure ? 24 : 16) :
      action === 'FEATHER' ? (interrupt ? 58 : 30) :
      action === 'COUNTER' ? (perfectCounter ? 62 : 14) :
      action === 'ULTIMATE' ? 42 :
      0;

    const nextBreak = currentBroken > 0 ? 0 : clamp(bossBreak + breakGain, 0, BREAK_MAX);
    const triggersBreak = currentBroken === 0 && nextBreak >= BREAK_MAX;

    const nextPlayer = {
      ...player,
      mp: clamp(player.mp - mpCost, 0, PLAYER_MAX_MP),
      tp: action === 'ULTIMATE' ? 0 : clamp(player.tp + tpGain, 0, PLAYER_MAX_TP),
      focus: false,
      guardNext: false,
      featherCooldown: action === 'FEATHER' ? 2 : Math.max(0, player.featherCooldown - 1),
    };

    if (perfectCounter) setLog('迎撃成功！大技の隙を反転した。');
    else if (interrupt) setLog('羽弾が黒雷の詠唱を撃ち抜いた！');
    else if (pressure) setLog('薙ぎ払いの隙を突いて押し込む！');
    else if (action === 'ULTIMATE') setLog('いれーな「終天・羽星穿ち」！');
    else if (action === 'FEATHER') setLog('いれーな「羽弾」！');
    else if (player.focus) setLog('集中した一撃！');
    else setLog('通常攻撃！');

    const impactDelay = action === 'FEATHER' ? 760 : action === 'ULTIMATE' ? 900 : action === 'COUNTER' ? 520 : 360;

    schedule(() => {
      setPlayer(nextPlayer);
      setBossHp(Math.max(0, bossHp - actualDamage));
      setLastDamage(actualDamage);
      setBestHit(prev => Math.max(prev, actualDamage));
      setTotalDamage(prev => prev + actualDamage);
      setCombo(prev => prev + 1);
      setBossBreak(nextBreak);

      if (bossHp - actualDamage <= 0) {
        setFx('BREAK');
        setFxText('RAID CLEAR');
        schedule(finishVictory, 680);
        return;
      }

      if (triggersBreak) {
        setBossBreak(0);
        setBrokenTurns(2);
        setBreakCount(prev => prev + 1);
        sfx('break');
        setFx('BREAK');
        setFxText('BREAK!');
        setLog('深淵の核が崩壊！ 2ターンのバースト窓が開いた！');
        schedule(() => {
          setFx(null);
          setIsResolving(false);
        }, 720);
        return;
      }

      if (currentBroken > 0) {
        const remaining = currentBroken - 1;
        setBrokenTurns(remaining);
        if (remaining === 0) {
          setBossPattern(choosePattern(phase, nextPlayer, currentIntent, action, repeats));
          setLog('BREAK終了。ボスが再起動する！');
        }
        setFx(null);
        setIsResolving(false);
        return;
      }

      if (perfectCounter || interrupt) {
        setBossPattern(choosePattern(phase, nextPlayer, currentIntent, action, repeats));
        setTurn(prev => prev + 1);
        setLastDamage(null);
        setFx(null);
        setIsResolving(false);
        return;
      }

      if (phase === 1 && bossHp - actualDamage <= BOSS_MAX_HP[1] * .5) {
        setPhase(2);
        setBossHp(BOSS_MAX_HP[2]);
        setBossBreak(0);
        setBrokenTurns(0);
        setBossPattern('RAGE');
        setFx('PHASE');
        setFxText('PHASE II');
        sfx('phase');
        setLog('第2形態「深淵解放」。同じ行動を2回続けるとボスが対応する。');
        schedule(() => {
          setFx(null);
          setIsResolving(false);
        }, 1050);
        return;
      }

      const nextPattern = choosePattern(phase, nextPlayer, currentIntent, action, repeats);
      setBossPattern(nextPattern);
      setTurn(prev => prev + 1);
      setLastDamage(null);
      setFx(null);
      setIsResolving(false);

      if (phase === 2 && repeats >= 2) {
        setLog(
          action === 'FEATHER' ? 'ボスが羽弾を学習。滅界砲の構えに入った。' :
          action === 'NORMAL' ? 'ボスが通常攻撃の流れを学習した。' :
          'ボスが行動パターンを更新した。',
        );
      }
    }, impactDelay);
  };

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

    if (fx === 'NORMAL') {
      return <div style={styles.fxOverlay}><div style={styles.hitCircle} /><div style={{ ...styles.hitLine, animation: 'raidPop .5s ease-out forwards' }} /></div>;
    }

    if (fx === 'COUNTER') {
      return <div style={styles.fxOverlay}><div style={styles.counterCircle} /><div style={styles.giantText}>{fxText}</div></div>;
    }

    if (fx === 'GUARD') {
      return <div style={styles.fxOverlay}><div style={styles.guardCircle}><Shield size={64} /></div><div style={styles.giantText}>{fxText}</div></div>;
    }

    if (fx === 'FOCUS') {
      return <div style={styles.fxOverlay}><div style={styles.focusCircle}><Eye size={54} /></div><div style={styles.giantText}>{fxText}</div></div>;
    }

    if (fx === 'POTION') {
      return <div style={styles.fxOverlay}><div style={styles.recoverCircle}><Heart size={54} /></div><div style={styles.giantText}>{fxText}</div></div>;
    }

    if (fx === 'ULTIMATE') {
      return <div style={styles.fxOverlay}><div style={styles.ultimateCircle} /><div style={styles.giantText}>終天羽星穿ち</div></div>;
    }

    if (fx === 'BREAK') {
      return <div style={styles.fxOverlay}><div style={styles.breakCircle} /><div style={styles.breakText}>{fxText}</div></div>;
    }

    if (fx === 'PHASE') {
      return <div style={styles.phaseOverlay}><div style={styles.phaseText}>{fxText}</div><div style={styles.phaseSub}>深淵解放</div></div>;
    }

    if (fx === 'BOSS') {
      return <div style={styles.fxOverlay}><div style={{ ...styles.bossHit, borderColor: intent.color }} /><div style={{ ...styles.bossHitText, color: intent.color }}>{fxText}</div></div>;
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
          <div style={styles.loadingSub}>専用アートと新規戦闘演出を読み込んでいます</div>
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
              <div style={styles.kicker}>RAID OPERATION 01</div>
              <div style={styles.preTitle}>深淵喰らい・アビスコア</div>
              <div style={styles.preSub}>読む。選ぶ。崩す。最後は一気に仕留める。</div>
            </div>
          </div>
          <div style={styles.preBody}>
            <div className="raidPreGrid" style={styles.preRow}>
              <div style={styles.preBox}>
                <img src={raidIrenaCutIn} alt="" style={styles.preIrena} />
                <div><div style={styles.kicker}>SOLO RAID</div><div style={styles.preName}>いれーな</div><div style={styles.small}>HP 10,000 · MP 100 · TP 0</div></div>
              </div>
              <div style={styles.preBox}>
                <div><div style={styles.kicker}>BOSS</div><div style={styles.preBoss}>ABYSS CORE</div><div style={styles.small}>50,000 → 60,000 HP · 2 PHASES</div></div>
              </div>
            </div>
            <div style={styles.ruleGrid}>
              <div style={styles.rule}><Crosshair size={18} /><div><b>予告</b><span>次の攻撃は見える。固定順ではない。</span></div></div>
              <div style={styles.rule}><Gauge size={18} /><div><b>BREAK</b><span>核を崩すと2ターンの攻撃窓。</span></div></div>
              <div style={styles.rule}><Eye size={18} /><div><b>適応</b><span>第2形態は連打に対処する。</span></div></div>
            </div>
            <button type="button" onClick={resetBattle} style={styles.primaryButton}><Swords size={19} /> レイド開始</button>
            <button type="button" onClick={onBack} style={styles.secondaryButton}><ArrowLeft size={17} /> 本体へ戻る</button>
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
          <div style={{ ...styles.resultIcon, ...(victory ? styles.resultWin : styles.resultLoss) }}>{victory ? <Sparkles size={44} /> : <Skull size={44} />}</div>
          <div style={styles.resultTitle}>{victory ? '討伐成功' : '戦闘終了'}</div>
          <div style={styles.resultText}>{log}</div>
          <div className="raidStatGrid" style={styles.resultGrid}>
            <div style={styles.resultItem}><span>TURN</span><b>{turn}</b></div>
            <div style={styles.resultItem}><span>MAX HIT</span><b>{formatNumber(bestHit)}</b></div>
            <div style={styles.resultItem}><span>TOTAL DMG</span><b>{formatNumber(totalDamage)}</b></div>
            <div style={styles.resultItem}><span>BREAK</span><b>{breakCount}</b></div>
          </div>
          <div style={styles.resultNote}><div style={styles.kicker}>COMBAT LOOP</div><div style={styles.resultNoteText}>読む → 選ぶ → 命中 → BREAK → BURST</div></div>
          <button type="button" onClick={resetBattle} style={styles.primaryButton}><RotateCcw size={18} /> もう一度挑む</button>
          <button type="button" onClick={onBack} style={styles.secondaryButton}><ArrowLeft size={17} /> 本体へ戻る</button>
        </div>
      </div>
    );
  }

  const dangerText = intent.danger === 'EXTREME' ? '危険' : intent.danger === 'HIGH' ? '警戒' : '通常';

  return (
    <div style={styles.fullScreen}>
      <style>{CSS}</style>
      <div style={styles.main}>
        <div style={styles.header}>
          <button type="button" onClick={onBack} style={styles.backButton}><ArrowLeft size={16} /> 戻る</button>
          <div style={styles.headerTitle}><span style={styles.headerPhase}>{phase === 1 ? 'PHASE I · 封印核' : 'PHASE II · 深淵解放'}</span><span>深淵喰らい・アビスコア</span></div>
          <button type="button" onClick={() => setSoundOn(value => !value)} style={styles.soundButton} aria-label="サウンド切替">
            {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
        </div>

        <section style={styles.stage}>
          <div style={{ ...styles.stageBackdrop, backgroundImage: 'linear-gradient(rgba(4,4,12,.35),rgba(5,3,12,.86)),url(' + raidBossArt + ')' }} />
          <div style={styles.stageVignette} />

          <div style={styles.bossHud}>
            <div><div style={styles.kicker}>ABYSS CORE // TARGET</div><div style={styles.bossName}>深淵喰らい・アビスコア</div></div>
            <div style={{ textAlign: 'right' }}><div style={styles.hpText}>{formatNumber(bossHp)} / {formatNumber(bossMaxHp)}</div><div style={styles.phaseBadge}>PHASE {phase}</div></div>
          </div>

          <div style={styles.hpTrack}><div style={{ ...styles.hpFill, width: bossHpPct + '%' }} /></div>

          <div style={styles.breakWrap}>
            <div style={styles.breakHead}><span>BREAK</span><b>{broken ? 'WINDOW × ' + brokenTurns : Math.round(bossBreak) + '%'}</b></div>
            <div style={styles.breakTrack}><div style={{ ...styles.breakFill, width: (broken ? 100 : bossBreak) + '%' }} /></div>
          </div>

          {!broken && (
            <div style={{ ...styles.intentCard, borderColor: intent.color }}>
              <div style={styles.intentTop}><span>NEXT INTENT</span><span style={{ color: intent.color }}>{dangerText}</span></div>
              <div style={styles.intentName}>{intent.name}</div>
              <div style={styles.intentDetail}>{intent.detail}</div>
              <div style={styles.intentCounter}>対処目安：{intent.counter}</div>
            </div>
          )}

          {broken && (
            <div style={styles.breakWindow}><div style={styles.breakKicker}>CORE EXPOSED</div><div style={styles.breakWindowTitle}>いまが最大火力</div><div style={styles.breakWindowSub}>攻撃系ダメージ ×1.30</div></div>
          )}

          <div style={styles.bossVisual}><img src={raidBossArt} alt="" style={styles.bossImage} /></div>
          {lastDamage !== null && <div style={styles.damage}>{formatNumber(lastDamage)}</div>}

          <div style={styles.turn}>TURN {turn}</div>
          <div style={styles.log}><div style={styles.logKicker}>{broken ? 'BREAK WINDOW' : 'BATTLE LOG'}</div><div style={styles.logText}>{log}</div><div style={styles.hint}>
            {broken ? '攻撃を重ねてバーストを使い切る。' :
              bossPattern === 'CHARGE' || bossPattern === 'RAGE' ? '迎撃か防御が高効率。' :
              bossPattern === 'VOID' ? '羽弾なら中断して大量BREAK。' :
              '通常攻撃なら押し返しボーナス。'}
          </div></div>

          {fxView()}
        </section>

        <section className="raidBottom" style={styles.bottom}>
          <div style={styles.playerPanel}>
            <div style={styles.panelHeader}><div><div style={styles.kicker}>ALLY</div><div style={styles.playerName}>いれーな</div></div><div style={styles.state}>{player.focus ? 'FOCUS READY' : broken ? 'BURST TIME' : 'READY'}</div></div>
            <div style={styles.hpLine}><span>HP</span><b>{formatNumber(player.hp)} / {formatNumber(PLAYER_MAX_HP)}</b></div>
            <div style={styles.playerHpTrack}><div style={{ ...styles.playerHpFill, width: playerHpPct + '%' }} /></div>
            <div className="raidStatGrid" style={styles.resourceGrid}>
              <div style={styles.resource}><span>MP</span><b>{player.mp}</b></div>
              <div style={styles.resource}><span>TP</span><b>{player.tp}</b></div>
              <div style={styles.resource}><span>SHIELD</span><b>{formatNumber(player.shield)}</b></div>
              <div style={styles.resource}><span>COMBO</span><b>{combo}</b></div>
            </div>
            <div style={styles.status}><span>ポーション ×{player.potions}</span>{player.featherCooldown > 0 && <span>羽弾 CD {player.featherCooldown}</span>}{player.focus && <span>次攻撃 ×1.45</span>}</div>
          </div>

          <div style={styles.tacticalPanel}>
            <div style={styles.kicker}>TACTICAL READ</div>
            <div style={styles.tacticalTitle}>{broken ? 'BREAKを伸ばして一気に削る' : intent.name + ' に備える'}</div>
            <div style={styles.tacticalRow}><span>おすすめ</span><b>{broken ? '攻撃系を連打' : intent.counter}</b></div>
            <div style={styles.tacticalRow}><span>第2形態</span><b>{phase === 2 ? '同じ行動2連続で学習' : 'まだ適応なし'}</b></div>
            <div style={styles.tacticalRow}><span>コンボ</span><b>{combo >= 2 ? '×1.08 有効' : 'あと1回で ×1.08'}</b></div>
          </div>
        </section>

        <section className="raidActions" style={styles.actions}>
          <button type="button" disabled={isResolving} onClick={() => performAction('NORMAL')} style={styles.actionButton}><Swords size={19} /><span>通常攻撃</span><small>6,500–7,600 · TP +18</small></button>
          <button type="button" disabled={isResolving || player.mp < 18 || player.featherCooldown > 0} onClick={() => performAction('FEATHER')} style={{ ...styles.actionButton, ...styles.featherButton }}><Sparkles size={19} /><span>羽弾</span><small>{player.featherCooldown > 0 ? 'CD ' + player.featherCooldown : '9,800–11,500 · MP18'}</small></button>
          <button type="button" disabled={isResolving || player.mp < 12} onClick={() => performAction('FOCUS')} style={styles.actionButton}><Eye size={19} /><span>風詠集中</span><small>次攻撃 ×1.45 · MP12</small></button>
          <button type="button" disabled={isResolving || player.mp < 10} onClick={() => performAction('GUARD')} style={styles.actionButton}><Shield size={19} /><span>防御</span><small>盾3,600 · HP +450</small></button>
          <button type="button" disabled={isResolving} onClick={() => performAction('COUNTER')} style={{ ...styles.actionButton, ...styles.counterButton }}><Crosshair size={19} /><span>迎撃</span><small>強攻撃なら大反撃</small></button>
          <button type="button" disabled={isResolving || player.potions <= 0} onClick={() => performAction('POTION')} style={styles.actionButton}><Heart size={19} /><span>ポーション</span><small>HP +2,800 · MP +30</small></button>
          <button type="button" disabled={isResolving || !canUltimate} onClick={() => performAction('ULTIMATE')} style={{ ...styles.actionButton, ...styles.ultimateButton, ...(canUltimate ? styles.ultimateReady : {}) }}><Zap size={20} /><span>必殺・終天羽星穿ち</span><small>{canUltimate ? 'READY · 26,000–30,000' : 'TP ' + player.tp + '/100'}</small></button>
        </section>

        <div className="raidFooter" style={styles.footer}><span>読む → 選ぶ → 命中 → BREAK → BURST</span><span>{phase === 2 ? 'ADAPTIVE BOSS ONLINE' : 'READABLE BOSS ONLINE'}</span></div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  fullScreen: { position: 'relative', width: '100%', height: '100%', minHeight: '100%', overflowY: 'auto', background: '#05050c', color: '#f5f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, boxSizing: 'border-box' },
  loading: { textAlign: 'center' },
  loadingIcon: { width: 72, height: 72, margin: '0 auto 16px', borderRadius: 20, display: 'grid', placeItems: 'center', color: '#ff718e', background: 'rgba(255,54,88,.08)', border: '1px solid #573043' },
  loadingKicker: { color: '#ff8fa6', fontSize: 11, fontWeight: 900, letterSpacing: '.24em' },
  loadingTitle: { marginTop: 8, fontSize: 'clamp(30px,7vw,56px)', fontWeight: 1000 },
  loadingSub: { marginTop: 6, color: '#8f99ad', fontSize: 13 },
  loadingTrack: { width: 'min(340px,72vw)', height: 3, margin: '24px auto 0', overflow: 'hidden', background: '#1b1724' },
  loadingBar: { width: '100%', height: '100%', background: 'linear-gradient(90deg,#ff4e73,#7f58ff)', transformOrigin: 'left', animation: 'raidLoad .75s ease-out forwards' },

  preCard: { width: 'min(100%,960px)', overflow: 'hidden', borderRadius: 24, background: '#0a0b13', border: '1px solid #2b2940', boxShadow: '0 28px 90px rgba(0,0,0,.55)' },
  preArt: { position: 'relative', height: 350, overflow: 'hidden' },
  preArtImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  preShade: { position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(2,3,9,.94),rgba(3,3,10,.52) 48%,rgba(3,3,10,.12)),linear-gradient(0deg,rgba(5,5,12,.92),transparent 55%)' },
  preTitleBlock: { position: 'absolute', left: 26, right: 26, bottom: 24 },
  kicker: { color: '#ff91a8', fontSize: 10, fontWeight: 900, letterSpacing: '.2em' },
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
  primaryButton: { minHeight: 52, marginTop: 14, borderRadius: 13, border: '1px solid #ff6b8c', background: 'linear-gradient(135deg,#571b31,#2f225d)', color: '#fff', fontWeight: 1000, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', width: '100%' },
  secondaryButton: { minHeight: 45, marginTop: 8, borderRadius: 12, border: '1px solid #2d3850', background: '#0d1320', color: '#ccd5e6', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', width: '100%' },

  resultCard: { width: 'min(100%,620px)', padding: 24, borderRadius: 22, border: '1px solid #2d3045', background: 'rgba(10,11,20,.97)', textAlign: 'center', boxSizing: 'border-box' },
  resultIcon: { width: 86, height: 86, margin: '14px auto 8px', borderRadius: '50%', display: 'grid', placeItems: 'center' },
  resultWin: { color: '#c1b0ff', border: '1px solid #826eff', background: 'rgba(120,88,255,.1)' },
  resultLoss: { color: '#ff7b94', border: '1px solid #6c3044', background: 'rgba(255,60,90,.08)' },
  resultTitle: { fontSize: 38, fontWeight: 1000 },
  resultText: { marginTop: 6, color: '#a5aec1', fontSize: 13, lineHeight: 1.55 },
  resultGrid: { marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 },
  resultItem: { padding: 12, borderRadius: 11, background: '#0d1320', border: '1px solid #232d43' },
  resultNote: { marginTop: 14, padding: 13, borderRadius: 12, background: '#0b101a', border: '1px solid #1f293b', textAlign: 'left' },
  resultNoteText: { marginTop: 6, color: '#cbd6e9', fontSize: 13 },

  main: { width: 'min(100%,1180px)', minWidth: 0 },
  header: { minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 7px', borderRadius: 12, background: 'rgba(9,10,17,.94)', border: '1px solid #232c42', boxSizing: 'border-box' },
  backButton: { minHeight: 34, padding: '0 10px', borderRadius: 9, border: '1px solid #2e3a54', background: '#0d1320', color: '#ccd6e7', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: 800 },
  headerTitle: { display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, fontSize: 13, fontWeight: 950 },
  headerPhase: { color: '#ff7f98', fontSize: 10, letterSpacing: '.15em' },
  soundButton: { width: 34, height: 34, borderRadius: 9, border: '1px solid #2e3a54', background: '#0d1320', color: '#dce5f3', display: 'grid', placeItems: 'center', cursor: 'pointer' },

  stage: { position: 'relative', overflow: 'hidden', minHeight: 510, marginTop: 10, padding: 15, borderRadius: 18, border: '1px solid #292f45', background: '#070810', boxSizing: 'border-box' },
  stageBackdrop: { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .72, transform: 'scale(1.02)', animation: 'raidAmbient 8s ease-in-out infinite', pointerEvents: 'none' },
  stageVignette: { position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 44%,transparent 0%,rgba(4,4,11,.1) 44%,rgba(3,3,9,.94) 100%)', pointerEvents: 'none' },
  bossHud: { position: 'relative', zIndex: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  bossName: { marginTop: 3, fontSize: 'clamp(19px,3vw,26px)', fontWeight: 1000 },
  hpText: { color: '#ffd6df', fontSize: 12, fontWeight: 900 },
  phaseBadge: { display: 'inline-block', marginTop: 3, padding: '3px 6px', borderRadius: 999, background: 'rgba(38,17,35,.76)', border: '1px solid #593147', color: '#ff9eaf', fontSize: 9, fontWeight: 900 },
  hpTrack: { position: 'relative', zIndex: 4, height: 15, marginTop: 7, borderRadius: 999, background: '#20131a', border: '1px solid #50303a', overflow: 'hidden' },
  hpFill: { height: '100%', background: 'linear-gradient(90deg,#5d1b49,#e53e6a,#ff934e)', transition: 'width .38s ease' },
  breakWrap: { position: 'relative', zIndex: 4, marginTop: 8 },
  breakHead: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9aa6bb', fontWeight: 900, letterSpacing: '.15em' },
  breakTrack: { height: 7, marginTop: 4, borderRadius: 999, background: '#1f1b10', border: '1px solid #534626', overflow: 'hidden' },
  breakFill: { height: '100%', background: 'linear-gradient(90deg,#8f751a,#fff1a0)', transition: 'width .28s ease' },

  intentCard: { position: 'relative', zIndex: 5, width: 'min(100%,580px)', margin: '10px auto 0', padding: '11px 13px', borderRadius: 13, borderLeft: '3px solid #ff5d7d', background: 'rgba(8,10,18,.78)', animation: 'raidWarn 1.7s ease-in-out infinite' },
  intentTop: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#8793aa', fontWeight: 900, letterSpacing: '.15em' },
  intentName: { marginTop: 4, fontSize: 18, fontWeight: 1000 },
  intentDetail: { marginTop: 2, color: '#94a0b5', fontSize: 10 },
  intentCounter: { marginTop: 5, color: '#d1c8ff', fontSize: 10, fontWeight: 900 },
  breakWindow: { position: 'relative', zIndex: 5, width: 'min(100%,560px)', margin: '12px auto 0', padding: '11px 13px', borderRadius: 13, textAlign: 'center', background: 'rgba(45,35,11,.5)', border: '1px solid #f0d667' },
  breakKicker: { color: '#fff1a1', fontSize: 9, fontWeight: 1000, letterSpacing: '.22em' },
  breakWindowTitle: { marginTop: 4, fontSize: 19, fontWeight: 1000 },
  breakWindowSub: { marginTop: 3, color: '#dfd5a1', fontSize: 10 },

  bossVisual: { position: 'absolute', left: '50%', top: 145, width: 'min(72vw,520px)', height: 'min(54vw,335px)', transform: 'translateX(-50%)', zIndex: 2, display: 'grid', placeItems: 'center' },
  bossImage: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16, opacity: .82, mixBlendMode: 'screen', animation: 'raidPulse 2.8s ease-in-out infinite', filter: 'saturate(1.18) contrast(1.08)' },
  damage: { position: 'absolute', left: '50%', top: '48%', zIndex: 12, fontSize: 'clamp(34px,6vw,58px)', fontWeight: 1000, color: '#fff', textShadow: '0 3px 0 #521426,0 0 22px rgba(255,86,126,.9)', animation: 'raidDamage .72s ease-out forwards' },
  turn: { position: 'absolute', left: 15, bottom: 88, zIndex: 5, padding: '5px 8px', borderRadius: 7, background: 'rgba(6,8,13,.78)', border: '1px solid #303a51', color: '#aeb9ce', fontSize: 9, fontWeight: 900, letterSpacing: '.15em' },
  log: { position: 'absolute', left: 15, right: 15, bottom: 13, zIndex: 5, padding: '9px 12px', borderRadius: 12, background: 'rgba(5,7,12,.84)', border: '1px solid #2a3449', boxSizing: 'border-box' },
  logKicker: { color: '#78859d', fontSize: 8, fontWeight: 900, letterSpacing: '.17em' },
  logText: { marginTop: 4, fontSize: 12, fontWeight: 900, lineHeight: 1.45 },
  hint: { marginTop: 4, color: '#a9b4c8', fontSize: 10 },

  fxOverlay: { position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', overflow: 'hidden', display: 'grid', placeItems: 'center' },
  fxShade: { position: 'absolute', inset: 0, background: 'rgba(4,4,15,.44)' },
  cutinImage: { position: 'absolute', inset: '-3% -4%', width: '108%', height: '106%', objectFit: 'cover', animation: 'raidCut 1.3s cubic-bezier(.18,.78,.18,1) forwards', filter: 'saturate(1.08) contrast(1.05)' },
  cutinSweep: { position: 'absolute', left: '-10%', top: '45%', width: '120%', height: 5, background: 'linear-gradient(90deg,transparent,#fff,rgba(180,120,255,.7),transparent)', boxShadow: '0 0 30px rgba(210,190,255,.85)', transform: 'rotate(-8deg)', animation: 'raidPop 1.1s ease-out forwards' },
  cutinText: { position: 'absolute', right: '6%', top: '18%', textAlign: 'right', animation: 'raidText 1.25s ease-out forwards', textShadow: '0 4px 18px rgba(0,0,0,.85)' },
  cutinSub: { color: '#d8d6ff', fontSize: 10, fontWeight: 900, letterSpacing: '.18em' },
  cutinTitle: { marginTop: 6, color: '#fff', fontSize: 54, lineHeight: .95, fontWeight: 1000, textShadow: '0 0 24px #8d75ff' },
  cutinHint: { marginTop: 5, color: '#f0ecff', fontSize: 10, fontWeight: 1000, letterSpacing: '.14em' },
  hitCircle: { width: '48%', aspectRatio: '1', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 46px rgba(205,238,255,.85)', animation: 'raidFlash .55s ease-out forwards' },
  hitLine: { position: 'absolute', width: '74%', height: 8, borderRadius: 999, background: 'linear-gradient(90deg,transparent,#fff,transparent)', boxShadow: '0 0 20px rgba(255,255,255,.8)' },
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
  status: { marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 5, color: '#9ce8dc', fontSize: 8 },
  tacticalPanel: { borderRadius: 15, border: '1px solid #302b48', background: '#0e0d18', padding: 13 },
  tacticalTitle: { marginTop: 6, fontSize: 17, fontWeight: 1000 },
  tacticalRow: { marginTop: 8, paddingBottom: 7, display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid #211f30', color: '#8790a4', fontSize: 10 },

  actions: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 },
  actionButton: { minHeight: 82, padding: '9px 7px', borderRadius: 13, border: '1px solid #2d3950', background: '#101625', color: '#edf2ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontWeight: 900, boxSizing: 'border-box' },
  featherButton: { borderColor: '#6f61a4', background: 'linear-gradient(135deg,#15152a,#201537)' },
  counterButton: { borderColor: '#b28d3d', background: 'linear-gradient(135deg,#171411,#302417)' },
  ultimateButton: { gridColumn: 'span 2', borderColor: '#6d57bd', background: 'linear-gradient(135deg,#21163e,#3a1b28)' },
  ultimateReady: { borderColor: '#f4d997', boxShadow: '0 0 24px rgba(244,217,151,.14)' },
  footer: { marginTop: 8, display: 'flex', justifyContent: 'space-between', color: '#6f7b91', fontSize: 8, letterSpacing: '.08em' },
};

export default RaidBossScreen;
