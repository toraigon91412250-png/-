import { IRENA, STELLA } from './characters';
import stellaCutInImage from '../assets/IMG_1186.jpg';
import irenaMiddlePortrait from '../../../IMG_1218.jpeg';
import irenaDemonAttackCutIn from '../assets/IMG_1195.jpeg';
import irenaDemonCrest from '../../../IMG_1226.jpeg';
import irenaGodCrest from '../../../IMG_1227.jpeg';
import irenaGodPortrait from '../../../IMG_1228.jpeg';
import irenaDemonFinisherIcon from '../../../IMG_1229.jpeg';
import irenaTerminusIcon from '../../../IMG_1230.jpeg';
import irenaAllMightIcon from '../../../IMG_1231.jpeg';
import irenaAscensionIcon from '../../../IMG_1232.jpeg';
import irenaDemonPortrait from '../../../3CBE9BD5-BD6E-4AAE-BCB3-E86ADA03C184.png';
import irenaGodFinalFinisher from '../assets/IMG_1199.jpeg';
import irenaDemonFinalFinisher from '../../../IMG_1224.jpeg';
import kaiserImage from '../assets/img_kaiser.jpg';
import battleBackground from '../assets/戦闘中背景.png';

export type StellaFinalBattleFighterId = 'stella' | 'short-irena';

export interface StellaFinalBattleFighterConfig {
  id: StellaFinalBattleFighterId;
  name: string;
  title: string;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  evasionRate: number;
  normalAttackDamage: number;
  imageSrc: string;
  isPrototype: boolean;
}

export interface StellaFinalBattleTuning {
  bossMaxHp: number;
  meteorDamage: number;
  phaseCounterDamage: Record<1 | 2 | 3, number>;
  fighters: Record<StellaFinalBattleFighterId, StellaFinalBattleFighterConfig>;
  meteorCutInImage: string;
}

export const STELLA_FINAL_BATTLE_IMAGES = {
  stellaPortrait: STELLA.imageSrc,
  stellaCutIn: stellaCutInImage,
  kaiserPortrait: kaiserImage,
  battleBackground,
  irenaBasePortrait: IRENA.imageSrc,
  irenaMiddlePortrait,
  irenaGodPortrait,
  irenaDemonPortrait,
  irenaGodCrest,
  irenaDemonCrest,
  irenaDemonAttackCutIn,
  irenaDemonFinisherIcon,
  irenaTerminusIcon,
  irenaAllMightIcon,
  irenaAscensionIcon,
  irenaGodFinalFinisher,
  irenaDemonFinalFinisher,
} as const;

/**
 * Final-battle-only configuration. Short-mode Irena takes her base stats from
 * the unchanged normal IRENA definition; the 150-point allocation is applied
 * separately and never writes back to the normal character roster.
 */
export const STELLA_FINAL_BATTLE_TUNING: StellaFinalBattleTuning = {
  bossMaxHp: 15000,
  meteorDamage: 5000,
  phaseCounterDamage: { 1: 220, 2: 320, 3: 440 },
  fighters: {
    stella: {
      id: 'stella',
      name: 'ステラ',
      title: '天星の翼',
      maxHp: 5000,
      attack: STELLA.attack,
      defense: STELLA.defense,
      speed: STELLA.speed,
      evasionRate: STELLA.evasionRate,
      normalAttackDamage: 2000,
      imageSrc: STELLA.imageSrc,
      isPrototype: true,
    },
    'short-irena': {
      id: 'short-irena',
      name: '最終決戦用いれーな',
      title: '最終決戦専用・神魔境界',
      maxHp: IRENA.maxHp,
      attack: IRENA.attack,
      defense: IRENA.defense,
      speed: IRENA.speed,
      evasionRate: IRENA.evasionRate,
      normalAttackDamage: Math.round(IRENA.attack * 8),
      imageSrc: irenaMiddlePortrait,
      isPrototype: true,
    },
  },
  meteorCutInImage: stellaCutInImage,
};
