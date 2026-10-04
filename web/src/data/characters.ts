import { CharacterDef, IrenaSkillProgress } from '../types/game';
import irenaImg from '../assets/img_irena.jpg';
import irenaSelectImg from '../assets/img_irena_select.jpg';
import irenaIconImg from '../assets/img_irena_icon.jpg';
import irenaCutInImg from '../assets/img_irena_cutin.jpg';
import kaiserImg from '../assets/img_kaiser.jpg';

export const IRENA: CharacterDef = {
  id: 'irena',
  name: 'いれーな',
  title: '風詠の射手',
  maxHp: 4000,
  attack: 360,
  defense: 200,
  speed: 240,
  evasionRate: 0.25, // 25%
  passiveName: '先読み',
  passiveDescription: '相手より先に行動するターン、通常攻撃ダメージ+20（クリティカル時は加算後に1.5倍）',
  specialSkillName: '羽弾',
  specialSkillDamage: 300,
  specialSkillCooldown: 2,
  specialSkillDescription: '必殺ゲージ+1。300ダメージを与え、100%の確率で「出血」を付与（3ターン: 毎ターン開始時30ダメージ、速度-20、防御-20）',
  ultimateSkillName: '全能の一撃',
  ultimateSkillDamage: 500,
  ultimateSlogan: '全ての権能を統合した一撃！',
  imageSrc: irenaImg,
  selectImageSrc: irenaSelectImg,
  iconImageSrc: irenaIconImg,
  specialCutInSrc: irenaCutInImg,
  primaryColor: '#26A69A',
  secondaryColor: '#AB47BC',
};

export function getIrenaWithSkillProgress(progress: IrenaSkillProgress): CharacterDef {
  const featherLevel = Math.max(1, progress.featherLevel);
  const ruinLevel = Math.max(1, progress.ruinLevel);
  const featherDamage = IRENA.specialSkillDamage + (featherLevel - 1) * 25;
  const ruinDamage = 900 + (ruinLevel - 1) * 75;
  const bleedDamage = featherLevel >= 3 ? 40 : 30;
  const featherChargeCap = featherLevel >= 10 ? 13 : featherLevel >= 7 ? 11 : featherLevel >= 4 ? 9 : 7;

  return {
    ...IRENA,
    specialSkillDamage: featherDamage,
    specialSkillDescription:
      '必殺ゲージ+1。' + featherDamage + 'ダメージを与え、100%の確率で「出血」を付与（3ターン: 毎ターン開始時' + bleedDamage + 'ダメージ、速度-20、防御-20）。羽弾蓄積上限' + featherChargeCap + '回',
    ultimateSkillDamage: ruinDamage,
    featherSkillPath: progress.featherPath,
    ruinSkillPath: progress.ruinPath,
    featherSkillLevel: featherLevel,
    ruinSkillLevel: ruinLevel,
  };
}

export const KAISER: CharacterDef = {
  id: 'kaiser',
  name: 'カイザー',
  title: '鉄壁の剛将',
  maxHp: 2400,
  attack: 160,
  defense: 140,
  speed: 80,
  evasionRate: 0.10, // 10%
  passiveName: '重装',
  passiveDescription: '通常攻撃を受けたとき、最終ダメージを20軽減（特殊攻撃・必殺技は除外、0未満にならない）',
  specialSkillName: '重撃',
  specialSkillDamage: 375,
  specialSkillCooldown: 1,
  specialSkillDescription: '必殺ゲージ+1。375ダメージを与え、100%の確率で「重圧」を付与（2ターン: 速度-25、攻撃力-25）',
  ultimateSkillName: '超重撃',
  ultimateSkillDamage: 500,
  ultimateSlogan: '粉砕せよ、大地を震わす鉄槌！',
  imageSrc: kaiserImg,
  primaryColor: '#FF8F00',
  secondaryColor: '#D84315',
};

export const CHARACTERS = [IRENA, KAISER];

export const CPU_CHARACTERS = CHARACTERS.map(character => ({
  ...character,
  maxHp: character.maxHp * 2,
  attack: character.attack * 1.5,
}));
