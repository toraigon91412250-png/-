import { CharacterDef } from '../types/game';
import irenaImg from '../assets/img_irena.jpg';
import irenaSelectImg from '../assets/img_irena_select.jpg';
import irenaIconImg from '../assets/img_irena_icon.jpg';
import irenaCutInImg from '../assets/img_irena_cutin.jpg';
import kaiserImg from '../assets/img_kaiser.jpg';

export const IRENA: CharacterDef = {
  id: 'irena',
  name: 'いれーな',
  title: '風詠の射手',
  maxHp: 2000,
  attack: 180,
  defense: 100,
  speed: 120,
  evasionRate: 0.25, // 25%
  passiveName: '先読み',
  passiveDescription: '相手より先に行動するターン、通常攻撃ダメージ+20（クリティカル時は加算後に1.5倍）',
  specialSkillName: '羽弾',
  specialSkillDamage: 350,
  specialSkillCooldown: 1,
  specialSkillDescription: '必殺ゲージ+1。350ダメージを与え、100%の確率で「出血」を付与（3ターン: 毎ターン開始時30ダメージ、速度-20、防御-20）',
  ultimateSkillName: '羽嵐',
  ultimateSkillDamage: 500,
  ultimateSlogan: '嵐の刃よ、敵を貫け！',
  imageSrc: irenaImg,
  selectImageSrc: irenaSelectImg,
  iconImageSrc: irenaIconImg,
  specialCutInSrc: irenaCutInImg,
  primaryColor: '#26A69A',
  secondaryColor: '#AB47BC',
};

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
  specialSkillDamage: 300,
  specialSkillCooldown: 4,
  specialSkillDescription: '必殺ゲージ+1。300ダメージを与え、100%の確率で「重圧」を付与（2ターン: 速度-25、攻撃力-25）',
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
