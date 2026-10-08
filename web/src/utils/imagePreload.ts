import arenaBackground from '../assets/img_arena_bg.jpg';
import irenaImage from '../assets/img_irena.jpg';
import irenaSelectImage from '../assets/img_irena_select.jpg';
import irenaIconImage from '../assets/img_irena_icon.jpg';
import irenaCutinImage from '../assets/img_irena_cutin.jpg';
import kaiserImage from '../assets/img_kaiser.jpg';
import victoryImage from '../assets/いれーな勝利演出.jpg';
import battleBackground from '../assets/戦闘中背景.png';
import beamImage from '../assets/IMG_1151.jpeg';
import chargeBackgroundImage from '../assets/IMG_1152.jpeg';
import controlledShotImage from '../assets/IMG_1154.jpeg';
import strongShotImage from '../assets/IMG_1155.jpeg';
import limitGif from '../assets/bannerkoubou-koukasen-20261007-170734.gif';
import raidBossArt from '../assets/raid_boss_art.svg';
import raidIrenaCutin from '../assets/raid_irena_cutin.svg';

const PUBLIC_IMAGES = [
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

const SRC_IMAGES = [
  arenaBackground,
  irenaImage,
  irenaSelectImage,
  irenaIconImage,
  irenaCutinImage,
  kaiserImage,
  victoryImage,
  battleBackground,
  beamImage,
  chargeBackgroundImage,
  controlledShotImage,
  strongShotImage,
  limitGif,
  raidBossArt,
  raidIrenaCutin,
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

export const preloadAllGameImages = (): Promise<void[]> => {
  if (typeof window === 'undefined') return Promise.resolve([]);
  const publicImages = PUBLIC_IMAGES.map(path => import.meta.env.BASE_URL + path);
  return Promise.all([...SRC_IMAGES, ...publicImages].map(preloadImage));
};