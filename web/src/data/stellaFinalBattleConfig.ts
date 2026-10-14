import stellaImage from '../assets/IMG_1185.jpg';
import stellaCutInImage from '../assets/IMG_1186.jpg';
import irenaImage from '../assets/img_irena.jpg';

export type StellaFinalBattleFighterId = 'stella' | 'final-irena';

export interface StellaFinalBattleFighterConfig {
  id: StellaFinalBattleFighterId;
  name: string;
  title: string;
  maxHp: number;
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

/**
 * Final-battle-only tuning. All player/boss prototype numbers live here so
 * they can be adjusted independently without mutating normal IRENA or STELLA.
 * Final-Irena currently has no additional, finalized techniques or effects.
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
      normalAttackDamage: 1500,
      imageSrc: stellaImage,
      isPrototype: true,
    },
    'final-irena': {
      id: 'final-irena',
      name: '最終決戦用いれーな',
      title: '最終決戦専用・仮設定',
      maxHp: 4000,
      normalAttackDamage: 850,
      imageSrc: irenaImage,
      isPrototype: true,
    },
  },
  meteorCutInImage: stellaCutInImage,
};
