import { expect, test } from '@playwright/test';

test('normal battle setup keeps Stella hidden from Irena mode', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /挑戦の準備/ }).click();

  const roster = page.getByRole('region', { name: '操作キャラクター' });
  await expect(roster).toBeVisible();
  const irena = roster.getByRole('button', { name: 'いれーな、風詠の射手' });
  await expect(irena).toBeVisible();
  await expect(irena).toHaveAttribute('aria-pressed', 'true');
  await expect(roster.getByRole('button', { name: 'ステラ（仮）、天星の翼' })).toHaveCount(0);
});

test('unlocked Stella mode opens the dedicated EX Kaiser final battle and all three powers', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true,
      revealAvailable: false,
      kaiser100RewardClaimed: true,
      exKaiserDefeated: true,
    }));
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('heading', { name: 'EXカイザー 最終決戦' })).toBeVisible();

  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await expect(page.getByRole('button', { name: '通常攻撃' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '不滅を発動' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '再誕を発動' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '天象支配を発動' })).toBeEnabled();

  await page.getByRole('button', { name: '不滅を発動' }).click();
  const battleLog = page.locator('.stella-final__log-lines');
  await expect(battleLog.getByText(/権能「不滅」を発動/)).toBeVisible();
  await expect(page.getByText(/次回使用：第 4 ターン/)).toBeVisible();
});

test('Stella final duel uses the player-favored balance tuning in actual combat', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true,
      revealAvailable: false,
      kaiser100RewardClaimed: true,
      exKaiserDefeated: true,
      finalBattleCleared: true,
      finalBattleRewardClaimed: true,
    }));
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('status').filter({ hasText: '最終決戦の画像素材 読み込み完了' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '最終決戦を開始' }).click();

  const playerHp = page.getByRole('progressbar', { name: 'ステラのHP' });
  const bossHp = page.getByRole('progressbar', { name: 'EXカイザーのHP' });
  const attack = page.getByRole('button', { name: '通常攻撃' });
  await expect(playerHp).toHaveAttribute('aria-valuemax', '5000');
  await expect(bossHp).toHaveAttribute('aria-valuemax', '15000');
  await expect(page.locator('.stella-final__normal-attack')).toContainText('2,000');
  await expect(page.getByText(/試作値：5,000ダメージ・1回/)).toBeVisible();

  await attack.click();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '13000');
  await expect(playerHp).toHaveAttribute('aria-valuenow', '4780');
  await attack.click();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '11000');
  await expect(playerHp).toHaveAttribute('aria-valuenow', '4560');
  await attack.click();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '9000');
  await expect(playerHp).toHaveAttribute('aria-valuenow', '4240');
  await expect(page.locator('.stella-final__phase')).toContainText('02');
});

test('Lv.100 reward opens EX Kaiser challenge before the hidden Stella entrance', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: false,
      exKaiserDefeated: false,
      revealAvailable: false,
      kaiser100RewardClaimed: true,
    }));
    window.localStorage.setItem('duel_arena_kaiser_challenge_progress', JSON.stringify({ unlockedLevel: 100 }));
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'EXカイザーに挑む' }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'EXカイザー挑戦' })).toContainText('全戦闘ステータスが2倍');
  await expect(page.locator('.battle-challenge-level-caption')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /戦闘開始/ })).toBeEnabled();
});


test('actual Stella final-battle victory saves +100P once and unlocks only final-battle Irena', async ({ page }) => {
  await page.addInitScript(() => {
    const initializedKey = '__e2e_stella_final_reward_initialized';
    if (window.localStorage.getItem(initializedKey) !== 'true') {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
        isUnlocked: true,
        revealAvailable: false,
        kaiser100RewardClaimed: true,
        exKaiserDefeated: true,
        finalBattleCleared: false,
        finalBattleRewardClaimed: false,
      }));
      window.localStorage.setItem('duel_arena_stat_points', '62');
      window.localStorage.setItem('duel_arena_raid_reward_progress', JSON.stringify({
        coreFragments: 0, imprintTickets: 0, bonusStatPoints: 17, claimedVictoryRunIds: [],
      }));
      window.localStorage.setItem(initializedKey, 'true');
    }

    // Fail exactly the first +100P write to verify the in-screen retry path after real combat.
    const originalSetItem = Storage.prototype.setItem;
    let failFinalRewardWrite = window.localStorage.getItem('__e2e_stella_final_reward_failure_used') !== 'true';
    Storage.prototype.setItem = function (key, value) {
      if (key === 'duel_arena_stat_points' && value === '162' && failFinalRewardWrite) {
        failFinalRewardWrite = false;
        originalSetItem.call(window.localStorage, '__e2e_stella_final_reward_failure_used', 'true');
        throw new DOMException('Simulated quota failure', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();

  const characterPicker = page.getByRole('region', { name: '最終決戦の操作キャラクター' });
  await expect(characterPicker.getByRole('button', { name: '最終決戦キャラクター：ステラ' })).toBeVisible();
  await expect(characterPicker.getByRole('button', { name: '最終決戦キャラクター：短期決戦モード・いれーな' })).toHaveCount(0);

  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  const playerHp = page.locator('[role="progressbar"][aria-label="ステラのHP"]');
  const bossHp = page.locator('[role="progressbar"][aria-label="EXカイザーのHP"]');
  const immortal = page.getByRole('button', { name: '不滅を発動' });
  const rebirth = page.getByRole('button', { name: '再誕を発動' });
  const meteor = page.getByRole('button', { name: '天象支配を発動' });
  const attack = page.getByRole('button', { name: '通常攻撃' });
  const victoryHeading = page.getByRole('heading', { name: '最終決戦 勝利' });

  // Drive the actual battle controls. No test-only victory path or state mutation is used.
  for (let step = 0; step < 40; step += 1) {
    if (await victoryHeading.isVisible().catch(() => false)) break;

    const currentBossHp = Number(await bossHp.getAttribute('aria-valuenow'));
    const currentPlayerHp = Number(await playerHp.getAttribute('aria-valuenow'));
    const inFinalPhase = await page.locator('.stella-final__phase').innerText().then(text => text.includes('03'));
    if (currentBossHp > 0 && await meteor.isEnabled() && !inFinalPhase) {
      await meteor.click();
    } else if (inFinalPhase && currentPlayerHp <= 420 && await immortal.isEnabled()) {
      await immortal.click();
    } else if (currentPlayerHp <= 1500 && await rebirth.isEnabled()) {
      await rebirth.click();
    } else if (currentBossHp > 0) {
      await attack.click();
    } else {
      break;
    }
  }

  await expect(victoryHeading).toBeVisible();
  const rewardSaveError = page.getByRole('alert', { name: '最終決戦報酬の保存エラー' });
  await expect(rewardSaveError).toBeVisible();
  await expect(rewardSaveError).toContainText('保存を再試行');
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('duel_arena_stat_points'))).toBe('62');
  await expect.poll(() => page.evaluate(() => {
    const value = window.localStorage.getItem('duel_arena_stella_mode_progress');
    return value ? JSON.parse(value).finalBattleRewardClaimed : true;
  })).toBe(false);

  // Retry the persistent reward without restarting or replaying the battle.
  await rewardSaveError.getByRole('button', { name: '報酬保存を再試行' }).click();
  const rewardNotice = page.getByRole('status', { name: '最終決戦クリア報酬' });
  await expect(rewardNotice).toContainText('+100P');
  await expect(rewardNotice).toContainText('短期決戦モード・いれーなが解放');
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('duel_arena_stat_points'))).toBe('162');
  await expect.poll(() => page.evaluate(() => {
    const value = window.localStorage.getItem('duel_arena_stella_mode_progress');
    return value ? JSON.parse(value).finalBattleRewardClaimed : false;
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const value = window.localStorage.getItem('duel_arena_stella_mode_progress');
    return value ? JSON.parse(value).finalBattleCleared : false;
  })).toBe(true);

  // The persisted marker survives a reload and exposes only the dedicated version in this mode.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  const unlockedPicker = page.getByRole('region', { name: '最終決戦の操作キャラクター' });
  const finalIrenaChoice = unlockedPicker.getByRole('button', { name: '最終決戦キャラクター：短期決戦モード・いれーな' });
  await expect(finalIrenaChoice).toBeVisible();
  await finalIrenaChoice.click();
  await expect(finalIrenaChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.stella-final__fighter--stella .stella-final__fighter-name')).toHaveText('短期決戦モード・いれーな');
  await expect(page.getByRole('region', { name: '短期決戦モード・いれーなの150P育成' })).toBeVisible();

  const pickerBox = await unlockedPicker.boundingBox();
  const viewport = page.viewportSize();
  expect(pickerBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(pickerBox!.x).toBeGreaterThanOrEqual(0);
  expect(pickerBox!.x + pickerBox!.width).toBeLessThanOrEqual(viewport!.width + 1);

  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await expect(page.getByRole('progressbar', { name: '短期決戦モード・いれーなのHP' })).toHaveAttribute('aria-valuemax', '4000');
  await expect(page.getByRole('button', { name: '通常攻撃' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '終極殲滅を発動' })).toBeEnabled();

  // The dedicated version does not enter the normal battle roster.
  await page.getByRole('button', { name: 'ホームに戻る' }).click();
  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await expect(page.getByRole('region', { name: '操作キャラクター' }).getByRole('button', { name: /短期決戦モード・いれーな/ })).toHaveCount(0);
});


test('short-duel Irena allocates 150P and uses both image-backed divine/demonic final routes', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true, revealAvailable: false, kaiser100RewardClaimed: true, exKaiserDefeated: true,
      finalBattleCleared: true, finalBattleRewardClaimed: true,
    }));
    window.localStorage.setItem('duel_arena_short_irena_stat_allocation', JSON.stringify({
      maxHp: 0, attack: 150, defense: 0, speed: 0,
    }));
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('status').filter({ hasText: '最終決戦の画像素材 読み込み完了' })).toBeVisible({ timeout: 15000 });

  const picker = page.getByRole('region', { name: '最終決戦の操作キャラクター' });
  const shortIrena = picker.getByRole('button', { name: '最終決戦キャラクター：短期決戦モード・いれーな' });
  await expect(shortIrena).toBeVisible();
  await shortIrena.click();
  const build = page.getByRole('region', { name: '短期決戦モード・いれーなの150P育成' });
  await expect(build).toContainText('150 / 150P 使用・残り 0P');
  await expect(build.getByRole('button', { name: '攻撃を1P増やす' })).toBeDisabled();

  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await expect(page.getByRole('heading', { name: '最終決戦の行動' })).toBeVisible();
  const normalAttack = page.getByRole('button', { name: '通常攻撃' });
  const terminus = page.getByRole('button', { name: '終極殲滅を発動' });
  const ascension = page.getByRole('button', { name: '絶界昇華を発動' });
  const controlDemon = page.getByRole('button', { name: '理外掌握：堕天側へ' });
  const controlGod = page.getByRole('button', { name: '理外掌握：神側へ' });

  await normalAttack.click();
  const demonCutIn = page.getByTestId('short-irena-normal-cutin');
  const cutInStartedAt = Date.now();
  await expect(demonCutIn).toBeVisible();
  await page.waitForTimeout(600);
  await expect(demonCutIn).toBeVisible();
  const demonCutInImage = demonCutIn.locator('img');
  await expect.poll(() => demonCutInImage.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const cutInBox = await demonCutInImage.boundingBox();
  const viewport = page.viewportSize();
  expect(cutInBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(cutInBox!.x).toBeGreaterThanOrEqual(0);
  expect(cutInBox!.x + cutInBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(cutInBox!.y).toBeGreaterThanOrEqual(0);
  expect(cutInBox!.y + cutInBox!.height).toBeLessThanOrEqual(viewport!.height + 1);
  await expect(demonCutIn).toBeHidden({ timeout: 700 });
  expect(Date.now() - cutInStartedAt).toBeGreaterThanOrEqual(600);

  await terminus.click();
  await expect(page.getByRole('button', { name: '行動不能ターンを消費' })).toBeVisible();
  await page.getByRole('button', { name: '行動不能ターンを消費' }).click();
  await controlDemon.click();
  await expect(page.getByRole('progressbar', { name: '堕天ゲージ' })).toHaveAttribute('aria-valuenow', '-100');
  await expect(page.getByTestId('final-battle-player-portrait')).toHaveAttribute('src', /IMG_1193/);
  const demonFinisher = page.getByRole('button', { name: '堕天側の最終必殺技' });
  await expect(demonFinisher).toBeEnabled();
  await demonFinisher.click();
  await expect(page.getByTestId('short-irena-finisher')).toBeVisible();
  const demonFinisherImage = page.getByTestId('short-irena-finisher-image');
  await expect(demonFinisherImage).toHaveAttribute('src', /413F5794/);
  await expect.poll(() => demonFinisherImage.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(demonFinisherImage).toHaveCSS('object-fit', 'contain');
  await expect(page.getByRole('heading', { name: '最終決戦 勝利' })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.stella-final__log-lines')).toContainText('威力116,122');

  await page.getByRole('button', { name: 'もう一度挑む' }).click();
  await expect(controlGod).toBeEnabled();
  await controlGod.click();
  await ascension.click();
  await expect(page.getByRole('progressbar', { name: '堕天ゲージ' })).toHaveAttribute('aria-valuenow', '100');
  await expect(page.getByTestId('final-battle-player-portrait')).toHaveAttribute('src', /IMG_1194/);
  const godFinisher = page.getByRole('button', { name: '神側の最終必殺技' });
  await expect(godFinisher).toBeEnabled();
  await godFinisher.click();
  await expect(page.getByTestId('short-irena-finisher')).toBeVisible();
  const godFinisherImage = page.getByTestId('short-irena-finisher-image');
  await expect(godFinisherImage).toHaveAttribute('src', /IMG_1199/);
  await expect.poll(() => godFinisherImage.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(godFinisherImage).toHaveCSS('object-fit', 'contain');
  const godImageBox = await godFinisherImage.boundingBox();
  expect(godImageBox).not.toBeNull();
  expect(godImageBox!.x).toBeGreaterThanOrEqual(0);
  expect(godImageBox!.x + godImageBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(godImageBox!.y).toBeGreaterThanOrEqual(0);
  expect(godImageBox!.y + godImageBox!.height).toBeLessThanOrEqual(viewport!.height + 1);
  await expect(page.getByRole('heading', { name: '最終決戦 勝利' })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.stella-final__log-lines')).toContainText('威力42,768');

  await page.getByRole('button', { name: 'ホームに戻る' }).click();
  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  await expect(page.getByRole('region', { name: '操作キャラクター' }).getByRole('button', { name: /短期決戦モード・いれーな/ })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const value = window.localStorage.getItem('duel_arena_short_irena_stat_allocation');
    return value ? JSON.parse(value).attack : -1;
  })).toBe(150);
});

test('failed final-battle image preload blocks battle start and can be retried', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true, revealAvailable: false, kaiser100RewardClaimed: true, exKaiserDefeated: true,
      finalBattleCleared: true, finalBattleRewardClaimed: true,
    }));
  });
  // Abort the actual image payload, not Vite's ?import JavaScript module.
  // The meteor cut-in must be part of the strict final-battle preload too.
  const blockedStellaCutIn = (url: URL) => url.pathname === '/src/assets/IMG_1186.jpg' && url.search === '';
  await page.route(blockedStellaCutIn, route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  const preloadError = page.getByRole('alert', { name: '最終決戦画像のプリロード失敗' });
  await expect(preloadError).toBeVisible({ timeout: 15000 });
  await expect(preloadError).toContainText('IMG_1186.jpg');
  await expect(page.getByRole('button', { name: '画像読み込み後に開始' })).toBeDisabled();

  await page.unroute(blockedStellaCutIn);
  await preloadError.getByRole('button', { name: '画像を再読み込み' }).click();
  await expect(page.getByRole('status').filter({ hasText: '最終決戦の画像素材 読み込み完了' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: '最終決戦を開始' })).toBeEnabled();
});


test('理外掌握 fixes the turn-based multiplier, heals, stops one Kaiser action, and permanently raises speed', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true, revealAvailable: false, kaiser100RewardClaimed: true, exKaiserDefeated: true,
      finalBattleCleared: true, finalBattleRewardClaimed: true,
    }));
    window.localStorage.setItem('duel_arena_short_irena_stat_allocation', JSON.stringify({
      maxHp: 0, attack: 0, defense: 0, speed: 150,
    }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('status').filter({ hasText: '最終決戦の画像素材 読み込み完了' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '最終決戦キャラクター：短期決戦モード・いれーな' }).click();
  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  const playerHp = page.getByRole('progressbar', { name: '短期決戦モード・いれーなのHP' });
  const bossHp = page.getByRole('progressbar', { name: 'EXカイザーのHP' });
  const gauge = page.getByRole('progressbar', { name: '堕天ゲージ' });
  await page.getByRole('button', { name: '通常攻撃' }).click();
  const bossBeforeControl = Number(await bossHp.getAttribute('aria-valuenow'));
  const gaugeBeforeControl = Number(await gauge.getAttribute('aria-valuenow'));
  await expect(playerHp).toHaveAttribute('aria-valuenow', '3870');
  await page.getByRole('button', { name: '理外掌握：神側へ' }).click();
  await expect(playerHp).toHaveAttribute('aria-valuenow', '4000');
  await expect(bossHp).toHaveAttribute('aria-valuenow', String(bossBeforeControl));
  await expect(gauge).toHaveAttribute('aria-valuenow', String(gaugeBeforeControl + 50));
  await expect(page.getByRole('status').filter({ hasText: '全能 0.6倍' })).toBeVisible();
  await expect(page.getByText(/元攻撃力×0\.60（永続）/)).toBeVisible();
  await expect(page.getByRole('button', { name: '理外掌握：堕天側へ' })).toBeDisabled();
  await page.getByRole('button', { name: '通常攻撃' }).click();
  await expect.poll(async () => Number(await bossHp.getAttribute('aria-valuenow'))).toBeLessThan(bossBeforeControl);
});
test('short-duel Irena loses when the final turn expires without a locked divine/demonic route', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true, revealAvailable: false, kaiser100RewardClaimed: true, exKaiserDefeated: true,
      finalBattleCleared: true, finalBattleRewardClaimed: true,
    }));
    window.localStorage.setItem('duel_arena_short_irena_stat_allocation', JSON.stringify({
      maxHp: 150, attack: 0, defense: 0, speed: 0,
    }));
    Math.random = () => 0;
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('status').filter({ hasText: '最終決戦の画像素材 読み込み完了' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '最終決戦キャラクター：短期決戦モード・いれーな' }).click();
  await page.getByRole('button', { name: '最終決戦を開始' }).click();

  const attack = page.getByRole('button', { name: '通常攻撃' });
  for (let turn = 0; turn < 4; turn += 1) await attack.click();
  await expect(page.locator('.stella-final__phase')).toContainText('03');
  await expect(page.locator('.stella-final__timer')).toHaveAttribute('aria-label', '最終形態 残り8ターン');

  // Stay between route endpoints while the third-form countdown expires.
  await page.getByRole('button', { name: '絶界昇華を発動' }).click();
  await attack.click();
  await attack.click();
  await expect(page.getByRole('button', { name: '行動不能ターンを消費' })).toBeVisible();
  await page.getByRole('button', { name: '行動不能ターンを消費' }).click();
  await page.getByRole('button', { name: '終極殲滅を発動' }).click();
  await expect(page.getByRole('button', { name: '行動不能ターンを消費' })).toBeVisible();
  await page.getByRole('button', { name: '行動不能ターンを消費' }).click();
  await attack.click();
  await attack.click();
  await expect(page.getByRole('heading', { name: '最終決戦 敗北' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: '堕天ゲージ' })).toHaveAttribute('aria-valuenow', '-40');
  await expect(page.locator('.stella-final__log-lines')).toContainText('堕天ゲージが神側にも堕天側にも振り切れていないため敗北');
  await expect(page.getByRole('button', { name: '最終必殺技（未解放）' })).toBeDisabled();
});

test('理外掌握 resets active authority cooldowns and skips exactly the current Kaiser action', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true, revealAvailable: false, kaiser100RewardClaimed: true, exKaiserDefeated: true,
      finalBattleCleared: true, finalBattleRewardClaimed: true,
    }));
    window.localStorage.setItem('duel_arena_short_irena_stat_allocation', JSON.stringify({
      maxHp: 0, attack: 0, defense: 0, speed: 0,
    }));
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('status').filter({ hasText: '最終決戦の画像素材 読み込み完了' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '最終決戦キャラクター：短期決戦モード・いれーな' }).click();
  await page.getByRole('button', { name: '最終決戦を開始' }).click();

  const playerHp = page.getByRole('progressbar', { name: '短期決戦モード・いれーなのHP' });
  const bossHp = page.getByRole('progressbar', { name: 'EXカイザーのHP' });
  const terminus = page.getByRole('button', { name: '終極殲滅を発動' });
  const control = page.getByRole('button', { name: '理外掌握：神側へ' });
  const pass = page.getByRole('button', { name: '行動不能ターンを消費' });

  await terminus.click();
  await expect(terminus).toBeDisabled();
  await expect(pass).toBeVisible();
  await pass.click();
  await expect(terminus).toBeDisabled();
  const bossBeforeControl = Number(await bossHp.getAttribute('aria-valuenow'));

  // The cooldown is still active before All Might, then must be ready next turn.
  await control.click();
  await expect(playerHp).toHaveAttribute('aria-valuenow', '4000');
  await expect(bossHp).toHaveAttribute('aria-valuenow', String(bossBeforeControl));
  await expect(page.locator('.stella-final__log-lines')).toContainText('理外掌握によりカイザーの通常行動を停止');
  await expect(page.locator('.stella-final__log-lines')).toContainText('全権能のCTをリセット');
  await expect(terminus).toBeEnabled();

  await terminus.click();
  await expect.poll(async () => Number(await bossHp.getAttribute('aria-valuenow'))).toBeLessThan(bossBeforeControl);
  await expect(page.locator('.stella-final__log-lines')).toContainText('第4ターン：権能「終極殲滅」');
});

test('絶界昇華 triples effective stats and blocks all authorities for its full active duration', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true, revealAvailable: false, kaiser100RewardClaimed: true, exKaiserDefeated: true,
      finalBattleCleared: true, finalBattleRewardClaimed: true,
    }));
    window.localStorage.setItem('duel_arena_short_irena_stat_allocation', JSON.stringify({
      maxHp: 0, attack: 0, defense: 0, speed: 0,
    }));
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('status').filter({ hasText: '最終決戦の画像素材 読み込み完了' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '最終決戦キャラクター：短期決戦モード・いれーな' }).click();
  await page.getByRole('button', { name: '最終決戦を開始' }).click();

  const attack = page.getByRole('button', { name: '通常攻撃' });
  const terminus = page.getByRole('button', { name: '終極殲滅を発動' });
  const ascension = page.getByRole('button', { name: '絶界昇華を発動' });
  const controlGod = page.getByRole('button', { name: '理外掌握：神側へ' });
  const controlDemon = page.getByRole('button', { name: '理外掌握：堕天側へ' });
  const bossHp = page.getByRole('progressbar', { name: 'EXカイザーのHP' });

  await expect(page.getByText(/実効ステータス：ATK 360／DEF 200／SPD 240/)).toBeVisible();
  await ascension.click();
  await expect(page.getByText(/実効ステータス：ATK 1,080／DEF 600／SPD 720/)).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '絶界昇華：攻撃・防御・速度3倍／残り 2 ターン' })).toBeVisible();
  await expect(terminus).toBeDisabled();
  await expect(ascension).toBeDisabled();
  await expect(controlGod).toBeDisabled();
  await expect(controlDemon).toBeDisabled();

  await attack.click();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '7360');
  await expect(page.getByRole('status').filter({ hasText: '絶界昇華：攻撃・防御・速度3倍／残り 1 ターン' })).toBeVisible();
  await expect(terminus).toBeDisabled();
  await expect(ascension).toBeDisabled();
  await expect(controlGod).toBeDisabled();
  await expect(controlDemon).toBeDisabled();

  await attack.click();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByRole('button', { name: '行動不能ターンを消費' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '絶界昇華の反動：防御50%低下／残り 3 ターン' })).toBeVisible();

  await page.getByRole('button', { name: '行動不能ターンを消費' }).click();
  await expect(ascension).toBeEnabled();
});

