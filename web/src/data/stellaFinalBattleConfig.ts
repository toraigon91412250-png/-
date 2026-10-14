import { IRENA, STELLA } from './characters';
import stellaCutInImage from '../assets/IMG_1186.jpg';
import irenaGodPortrait from '../assets/IMG_1194.jpeg';
import irenaDemonPortrait from '../assets/IMG_1193.jpeg';
import irenaDemonAttackCutIn from '../assets/IMG_1195.jpeg';
import irenaGodFinalFinisher from '../assets/IMG_1199.jpeg';
import irenaDemonFinalFinisher from '../assets/413F5794-8459-451B-9E19-AF5E185C9FDA.png';
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
  irenaGodPortrait,
  irenaDemonPortrait,
  irenaDemonAttackCutIn,
  irenaGodFinalFinisher,
  irenaDemonFinalFinisher,
} as const;

/**
 * Final-battle-only configuration. Short-mode Irena takes her base stats from
 * the unchanged normal IRENA definition; the 150-point allocation is applied
 * separately and never writes back to the normal character roster.
 */
export const STELLA_FINAL_BATTLE_TUNING: StellaFinalBattleTuning = {
  bossMaxHp: 16000,
  meteorDamage: 5000,
  phaseCounterDamage: { 1: 230, 2: 340, 3: 470 },
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
      normalAttackDamage: 1500,
      imageSrc: STELLA.imageSrc,
      isPrototype: true,
    },
    'short-irena': {
      id: 'short-irena',
      name: '短期決戦モード・いれーな',
      title: '最終決戦専用・神魔境界',
      maxHp: IRENA.maxHp,
      attack: IRENA.attack,
      defense: IRENA.defense,
      speed: IRENA.speed,
      evasionRate: IRENA.evasionRate,
      normalAttackDamage: Math.round(IRENA.attack * 6),
      imageSrc: IRENA.imageSrc,
      isPrototype: true,
    },
  },
  meteorCutInImage: stellaCutInImage,
};
