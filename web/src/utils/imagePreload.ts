import arenaBackground from '../assets/img_arena_bg.jpg';
import irenaImage from '../assets/img_irena.jpg';
import irenaSelectImage from '../assets/img_irena_select.jpg';
import irenaIconImage from '../assets/img_irena_icon.jpg';
import irenaCutinImage from '../assets/img_irena_cutin.jpg';
import irenaPierceCutInImage from '../assets/4269B24F-33D7-4AC8-8D99-BA584A72BA7D.png';
import kaiserImage from '../assets/img_kaiser.jpg';
import victoryImage from '../assets/いれーな勝利演出.jpg';
import battleBackground from '../assets/戦闘中背景.png';
import raidBossArt from '../assets/raid_boss_art.svg';
import raidIrenaCutin from '../assets/raid_irena_cutin.svg';
import stellaImage from '../assets/IMG_1185.jpg';
import stellaCutInImage from '../assets/IMG_1186.jpg';

const RECRUITMENT_IMAGES = [
  'assets/recruitment/1791110297970.jpg',
  'assets/recruitment/1791110298323.jpg',
  'assets/recruitment/1791110298431.jpg',
  'assets/recruitment/1791110298566.jpg',
  'assets/recruitment/black-cloud.png',
  'assets/recruitment/black-feather.png',
  'assets/recruitment/irena-summon-1.jpg',
  'assets/recruitment/irena-summon-2.jpg',
  'assets/recruitment/space-crack.png',
  'assets/recruitment/開く直前の門.jpg',
] as const;

// Preload battle, character, outcome, and combat VFX imagery before the field is playable.
const BATTLE_IMAGES = [
  arenaBackground,
  irenaImage,
  irenaSelectImage,
  irenaIconImage,
  irenaCutinImage,
  irenaPierceCutInImage,
  kaiserImage,
  victoryImage,
  battleBackground,
  raidBossArt,
  raidIrenaCutin,
  stellaImage,
  stellaCutInImage,
] as const;

const imagePreloadCache = new Map<string, Promise<void>>();

const preloadImage = (src: string): Promise<void> => {
  const cached = imagePreloadCache.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (typeof image.decode === 'function') {
        image.decode().catch(() => {}).finally(resolve);
      } else {
        resolve();
      }
    };

    image.decoding = 'async';
    image.onload = finish;
    image.onerror = () => resolve();
    image.src = src;

    if (image.complete) finish();
  });

  imagePreloadCache.set(src, promise);
  return promise;
};

export const preloadBattleImages = (): Promise<void[]> => {
  if (typeof window === 'undefined') return Promise.resolve([]);
  return Promise.all(BATTLE_IMAGES.map(preloadImage));
};

/** Load large summon-only artwork when the player enters the recruitment screen. */
export const preloadRecruitmentImages = (): Promise<void[]> => {
  if (typeof window === 'undefined') return Promise.resolve([]);
  const recruitmentImages = RECRUITMENT_IMAGES.map(path => import.meta.env.BASE_URL + path);
  return Promise.all(recruitmentImages.map(preloadImage));
};