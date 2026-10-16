import arenaBackground from '../assets/img_arena_bg.jpg';
import irenaImage from '../assets/img_irena.jpg';
import irenaSelectImage from '../assets/img_irena_select.jpg';
import irenaIconImage from '../assets/img_irena_icon.jpg';
import irenaCutinImage from '../assets/img_irena_cutin.jpg';
import irenaPierceCutInImage from '../assets/4269B24F-33D7-4AC8-8D99-BA584A72BA7D.png';
import kaiserImage from '../assets/img_kaiser.jpg';
import victoryImage from '../assets/いれーな勝利演出.jpg';
import battleBackground from '../assets/戦闘中背景.png';
import superFallenShotCutIn from '../assets/IMG_1166.jpeg';
import raidBossArt from '../assets/raid_boss_art.svg';
import raidIrenaCutin from '../assets/raid_irena_cutin.svg';
import stellaImage from '../assets/IMG_1185.jpg';
import stellaCutInImage from '../assets/IMG_1186.jpg';
import { STELLA_FINAL_BATTLE_IMAGES } from '../data/stellaFinalBattleConfig';

// Public assets shared by combat VFX and recruitment animations. Keep these in
// the common battle preload so entering combat never depends on visiting Gacha first.
const BATTLE_EFFECT_IMAGE_PATHS = [
  'assets/recruitment/black-cloud.png',
  'assets/recruitment/black-feather.png',
  'assets/recruitment/irena-summon-1.jpg',
  'assets/recruitment/irena-summon-2.jpg',
  'assets/recruitment/space-crack.png',
] as const;

const RECRUITMENT_IMAGES = [
  'assets/recruitment/1791110297970.jpg',
  'assets/recruitment/1791110298323.jpg',
  'assets/recruitment/1791110298431.jpg',
  'assets/recruitment/1791110298566.jpg',
  ...BATTLE_EFFECT_IMAGE_PATHS,
  'assets/recruitment/開く直前の門.jpg',
] as const;

const publicAssetUrl = (path: string): string => import.meta.env.BASE_URL + path;

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
  superFallenShotCutIn,
  raidBossArt,
  raidIrenaCutin,
  stellaImage,
  stellaCutInImage,
  ...Object.values(STELLA_FINAL_BATTLE_IMAGES),
  ...BATTLE_EFFECT_IMAGE_PATHS.map(publicAssetUrl),
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
  const recruitmentImages = RECRUITMENT_IMAGES.map(publicAssetUrl);
  return Promise.all(recruitmentImages.map(preloadImage));
};

const finalBattleImagePreloadCache = new Map<string, Promise<void>>();
const FINAL_BATTLE_REQUIRED_IMAGES: ReadonlyArray<readonly [string, string]> = [
  ['ステラ立ち絵', STELLA_FINAL_BATTLE_IMAGES.stellaPortrait],
  ['ステラ天象支配カットイン IMG_1186.jpg', STELLA_FINAL_BATTLE_IMAGES.stellaCutIn],
  ['通常版いれーな立ち絵', STELLA_FINAL_BATTLE_IMAGES.irenaBasePortrait],
  ['最終決戦中間形態立ち絵 IMG_1218.jpeg', STELLA_FINAL_BATTLE_IMAGES.irenaMiddlePortrait],
  ['神側立ち絵更新版 IMG_1228.jpeg', STELLA_FINAL_BATTLE_IMAGES.irenaGodPortrait],
  ['堕天側立ち絵更新版 3CBE9BD5-BD6E-4AAE-BCB3-E86ADA03C184.png', STELLA_FINAL_BATTLE_IMAGES.irenaDemonPortrait],
  ['神側紋章 IMG_1227.jpeg', STELLA_FINAL_BATTLE_IMAGES.irenaGodCrest],
  ['堕天側紋章 IMG_1226.jpeg', STELLA_FINAL_BATTLE_IMAGES.irenaDemonCrest],
  ['堕天側通常攻撃カットイン IMG_1195.jpeg', STELLA_FINAL_BATTLE_IMAGES.irenaDemonAttackCutIn],
  ['終焉アイコン IMG_1229.jpeg', STELLA_FINAL_BATTLE_IMAGES.irenaDemonFinisherIcon],
  ['終極殲滅アイコン IMG_1230.jpeg', STELLA_FINAL_BATTLE_IMAGES.irenaTerminusIcon],
  ['理外掌握アイコン IMG_1231.jpeg', STELLA_FINAL_BATTLE_IMAGES.irenaAllMightIcon],
  ['絶界昇華アイコン IMG_1232.jpeg', STELLA_FINAL_BATTLE_IMAGES.irenaAscensionIcon],
  ['神側最終必殺技 IMG_1199.jpeg', STELLA_FINAL_BATTLE_IMAGES.irenaGodFinalFinisher],
  ['堕天側最終必殺技 IMG_1224.jpeg', STELLA_FINAL_BATTLE_IMAGES.irenaDemonFinalFinisher],
  ['EXカイザー立ち絵', STELLA_FINAL_BATTLE_IMAGES.kaiserPortrait],
  ['最終決戦背景', STELLA_FINAL_BATTLE_IMAGES.battleBackground],
];

const preloadRequiredImage = (label: string, src: string): Promise<void> => {
  const cached = finalBattleImagePreloadCache.get(src);
  if (cached) return cached;

  let promise: Promise<void>;
  promise = new Promise<void>((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new Error('画像プリロード失敗: ' + label + ' (' + src + ')'));
    };
    const finish = async () => {
      if (settled) return;
      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        fail();
        return;
      }
      try {
        if (typeof image.decode === 'function') await image.decode();
        if (settled) return;
        settled = true;
        resolve();
      } catch {
        fail();
      }
    };

    image.decoding = 'async';
    image.onload = () => { void finish(); };
    image.onerror = fail;
    image.src = src;
    if (image.complete) {
      if (image.naturalWidth > 0) void finish();
      else fail();
    }
  });

  finalBattleImagePreloadCache.set(src, promise);
  void promise.catch(() => {
    if (finalBattleImagePreloadCache.get(src) === promise) {
      finalBattleImagePreloadCache.delete(src);
    }
  });
  return promise;
};

/**
 * Required final-battle art is strict: load/decode failures reject and surface
 * the offending logical asset plus URL. Failed entries are evicted for retries.
 */
export const preloadStellaFinalBattleImages = (): Promise<void[]> => {
  if (typeof window === 'undefined') return Promise.resolve([]);
  return Promise.all(FINAL_BATTLE_REQUIRED_IMAGES.map(([label, src]) => preloadRequiredImage(label, src)));
};
