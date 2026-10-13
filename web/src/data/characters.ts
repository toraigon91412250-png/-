import { CharacterDef, IrenaSkillProgress } from '../types/game';
import irenaImg from '../assets/img_irena.jpg';
import irenaSelectImg from '../assets/img_irena_select.jpg';
import irenaIconImg from '../assets/img_irena_icon.jpg';
import irenaCutInImg from '../assets/img_irena_cutin.jpg';
import kaiserImg from '../assets/img_kaiser.jpg';
import stellaImage from '../assets/IMG_1185.jpeg';
import stellaCutInImage from '../assets/IMG_1186.jpeg';

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
  hasSuperFallenShot: false,
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
    hasSuperFallenShot: Boolean(progress.superFallenShotUnlocked),
  };
}

export const KAISER: CharacterDef = {
  id: 'kaiser',
  name: 'カイザー',
  title: '鉄壁の剛将',
  maxHp: 2750,
  attack: 187,
  defense: 180,
  speed: 180,
  evasionRate: 0.10, // 10%
  passiveName: '重装',
  passiveDescription: '通常攻撃を受けたとき最終ダメージを20軽減。鉄壁装甲展開中は装甲の25%軽減を優先し、二重適用しない',
  specialSkillName: '重撃',
  specialSkillDamage: 500,
  specialSkillCooldown: 1,
  specialSkillDescription: '必殺ゲージ+1。500ダメージを与え、100%の確率で「重圧」を付与（2ターン: 速度-25、攻撃力-25）',
  ultimateSkillName: '超重撃',
  ultimateSkillDamage: 700,
  ultimateSlogan: '粉砕せよ、大地を震わす鉄槌！',
  imageSrc: kaiserImg,
  primaryColor: '#FF8F00',
  secondaryColor: '#D84315',
};

/**
 * Characters selectable by the human player.
 * Add new playable characters here, not to CPU_CHARACTERS.
 */
// Current data for the playable Stella character.
export const STELLA: CharacterDef = {
  id: 'stella',
  name: 'ステラ（仮）',
  title: '天星の翼',
  maxHp: 3800,
  attack: 340,
  defense: 195,
  speed: 220,
  evasionRate: 0.18,
  damageTakenMultiplier: 0.85,
  passiveName: '天星の加護',
  passiveDescription: '星の結界が直接攻撃のダメージを15%軽減する。状態異常によるダメージは軽減しない。',
  specialSkillName: 'ステラレイ',
  specialSkillDamage: 360,
  specialSkillCooldown: 3,
  specialSkillDescription: '星の魔力を収束した光線で攻撃し、3ターンの「星蝕」を付与（各ターン開始時25ダメージ、速度-20、攻撃力-20）。',
  ultimateSkillName: 'グランノヴァ',
  ultimateSkillDamage: 950,
  ultimateSlogan: '天星の魔法陣から超新星の輝きを解き放つ。',
  imageSrc: stellaImage,
  selectImageSrc: stellaImage,
  iconImageSrc: stellaImage,
  specialCutInSrc: stellaCutInImage,
  primaryColor: '#D84B6B',
  secondaryColor: '#8E59D9',
};

export const PLAYER_CHARACTERS: readonly CharacterDef[] = [IRENA, STELLA];

/** CPU-only opponent roster; keep this list explicit so player additions never leak into the CPU. */
export const CPU_CHARACTERS: CharacterDef[] = [KAISER].map(character => ({
  ...character,
  maxHp: character.maxHp * 2,
  attack: character.attack * 1.5,
}));

/** Complete visual catalog used by combat effects. This is not a playable or CPU roster. */
export const CHARACTERS: CharacterDef[] = Array.from(
  new Map(
    [IRENA, KAISER, ...PLAYER_CHARACTERS].map(character => [character.id, character] as const),
  ).values(),
);

/** Safely resolves older or invalid selections to the first available playable character. */
export function getPlayerCharacterById(id?: string): CharacterDef {
  return PLAYER_CHARACTERS.find(character => character.id === id)
    ?? PLAYER_CHARACTERS[0]
    ?? IRENA;
}
