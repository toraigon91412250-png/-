import { expect, test, type Page } from '@playwright/test';

async function chooseOpeningIrenaAlignment(page: Page, alignment: 'GOD' | 'DEMON') {
  const gauge = page.getByRole('progressbar', { name: '堕天ゲージ' });
  const bossHp = page.getByRole('progressbar', { name: 'EXカイザーのHP' });
  const button = page.getByRole('button', { name: alignment === 'GOD' ? '神化を選択' : '堕天を選択' });
  const gaugeBefore = Number(await gauge.getAttribute('aria-valuenow'));
  const bossHpBefore = Number(await bossHp.getAttribute('aria-valuenow'));

  await expect(button).toBeVisible();
  await button.click();

  const gaugeAfter = Number(await gauge.getAttribute('aria-valuenow'));
  expect(alignment === 'GOD' ? gaugeAfter > gaugeBefore : gaugeAfter < gaugeBefore).toBe(true);
  await expect(bossHp).toHaveAttribute('aria-valuenow', String(bossHpBefore));
  const flash = page.getByTestId('short-irena-alignment-flash');
  await expect(flash).toBeVisible();
  await expect(flash).toHaveCSS('background-image', 'none');
  await expect(flash).toHaveCSS(
    'background-color',
    alignment === 'GOD' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.82)',
  );
  await expect(flash).toBeHidden({ timeout: 1500 });
  await expect(button).toBeHidden();
}

async function moveFinalIrenaGaugeTo(page: Page, target: number) {
  const gauge = page.getByRole('progressbar', { name: '堕天ゲージ' });
  const start = Number(await gauge.getAttribute('aria-valuenow'));
  if (target !== -100 && target !== 100 && (target - start) % 15 !== 0) {
    throw new Error(`Gauge target ${target} cannot be reached from ${start} with 15-point controls.`);
  }

  for (let moves = 0; moves < 32; moves += 1) {
    const current = Number(await gauge.getAttribute('aria-valuenow'));
    if (current === target) return;
    const moveGodward = current < target;
    const button = page.getByRole('button', {
      name: moveGodward ? '神側へ15ポイント移動' : '堕天側へ15ポイント移動',
    });
    const next = Math.max(-100, Math.min(100, current + (moveGodward ? 15 : -15)));
    await expect(button).toBeEnabled();
    await button.click();
    await expect(gauge).toHaveAttribute('aria-valuenow', String(next));
  }

  throw new Error(`Gauge did not reach target ${target} within 32 moves (current ${await gauge.getAttribute('aria-valuenow')}).`);
}


async function startFinalIrenaAtGauge(page: Page, target: number) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('status').filter({ hasText: '最終決戦の画像素材 読み込み完了' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' }).click();
  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await chooseOpeningIrenaAlignment(page, 'GOD');
  await moveFinalIrenaGaugeTo(page, target);
}

async function startFinalIrenaAtEndpoint(page: Page, alignment: 'GOD' | 'DEMON') {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('status').filter({ hasText: '最終決戦の画像素材 読み込み完了' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' }).click();
  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await chooseOpeningIrenaAlignment(page, alignment);
  await moveFinalIrenaGaugeTo(page, alignment === 'GOD' ? 100 : -100);
}

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


test('EX Kaiser starts with EX mode and doubled Lv.100 stats after battle restart', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: false,
      exKaiserDefeated: false,
      revealAvailable: false,
      kaiser100RewardClaimed: true,
      finalBattleCleared: false,
      finalBattleRewardClaimed: false,
    }));
    window.localStorage.setItem('duel_arena_kaiser_challenge_progress', JSON.stringify({ unlockedLevel: 100 }));
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'EXカイザーに挑む' }).click();
  await expect(page.getByRole('status', { name: 'EXカイザー挑戦' })).toBeVisible();
  await page.getByRole('button', { name: /戦闘開始/ }).click();

  const deployOverlay = page.getByRole('status', { name: '戦闘出撃中' });
  await expect(deployOverlay).toBeHidden({ timeout: 5_000 });
  await expect(page.getByRole('button', { name: '攻撃' })).toBeEnabled({ timeout: 20_000 });
  await expect(page.getByText('EXカイザー', { exact: true })).toBeVisible();
  await expect(page.getByText('16500 / 16500', { exact: true })).toBeVisible();
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
  await expect(characterPicker.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' })).toHaveCount(0);

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
  await expect(rewardNotice).toContainText('最終決戦用いれーなが解放');
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
  const finalIrenaChoice = unlockedPicker.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' });
  await expect(finalIrenaChoice).toBeVisible();
  await finalIrenaChoice.click();
  await expect(finalIrenaChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.stella-final__fighter--stella .stella-final__fighter-name')).toHaveText('最終決戦用いれーな');
  await expect(page.getByRole('region', { name: '最終決戦用いれーなの150P育成' })).toBeVisible();

  const pickerBox = await unlockedPicker.boundingBox();
  const viewport = page.viewportSize();
  expect(pickerBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(pickerBox!.x).toBeGreaterThanOrEqual(0);
  expect(pickerBox!.x + pickerBox!.width).toBeLessThanOrEqual(viewport!.width + 1);

  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await chooseOpeningIrenaAlignment(page, 'GOD');
  await expect(page.getByRole('progressbar', { name: '最終決戦用いれーなのHP' })).toHaveAttribute('aria-valuemax', '4000');
  await expect(page.getByRole('button', { name: '通常攻撃' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '終極殲滅を発動' })).toBeDisabled();
  await page.getByRole('button', { name: '神側へ15ポイント移動' }).click();
  await expect(page.getByRole('progressbar', { name: '堕天ゲージ' })).toHaveAttribute('aria-valuenow', '30');
  await expect(page.getByRole('button', { name: '絶界昇華を発動' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '終極殲滅を発動' })).toBeDisabled();

  // The dedicated version does not enter the normal battle roster.
  await page.getByRole('button', { name: 'ホームに戻る' }).click();
  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await expect(page.getByRole('region', { name: '操作キャラクター' }).getByRole('button', { name: /最終決戦用いれーな/ })).toHaveCount(0);
});


test('final-duel Irena uses the reversible gauge, existing ultimate multipliers, and distinct route effects', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true, revealAvailable: false, kaiser100RewardClaimed: true, exKaiserDefeated: true,
      finalBattleCleared: true, finalBattleRewardClaimed: true,
    }));
    // Maximize speed so the final-phase timer remains long enough to test reversible gauge movement.
    window.localStorage.setItem('duel_arena_short_irena_stat_allocation', JSON.stringify({
      maxHp: 0, attack: 0, defense: 0, speed: 150,
    }));
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('status').filter({ hasText: '最終決戦の画像素材 読み込み完了' })).toBeVisible({ timeout: 15000 });

  const picker = page.getByRole('region', { name: '最終決戦の操作キャラクター' });
  const shortIrena = picker.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' });
  await expect(shortIrena).toBeVisible();
  await shortIrena.click();
  const build = page.getByRole('region', { name: '最終決戦用いれーなの150P育成' });
  await expect(build).toContainText('150 / 150P 使用・残り 0P');
  await expect(build.getByRole('button', { name: '攻撃を1P増やす' })).toBeDisabled();

  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  const gauge = page.getByRole('progressbar', { name: '堕天ゲージ' });
  const bossHp = page.getByRole('progressbar', { name: 'EXカイザーのHP' });
  await expect(gauge).toHaveAttribute('aria-valuenow', '0');
  await expect(bossHp).toHaveAttribute('aria-valuenow', '15000');
  await expect(page.getByRole('button', { name: '通常攻撃' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '神化を選択' })).toBeVisible();
  await expect(page.getByRole('button', { name: '堕天を選択' })).toBeVisible();

  // Opening choice changes only the gauge, and the cut-in always returns to normal.
  await chooseOpeningIrenaAlignment(page, 'DEMON');
  await expect(page.getByRole('button', { name: '終極殲滅を発動' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '絶界昇華を発動' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '究極必殺技（未解放）' })).toBeDisabled();
  await expect(gauge).toHaveAttribute('aria-valuenow', '-15');
  await moveFinalIrenaGaugeTo(page, -100);
  await expect(gauge).toHaveAttribute('aria-valuenow', '-100');
  await expect(page.getByRole('status', { name: '権能解放段階' })).toContainText('終点・究極必殺技');
  await expect(page.getByTestId('final-battle-player-portrait')).toHaveAttribute('src', /IMG_1193/);

  const demonFinisher = page.getByRole('button', { name: '堕天側の究極必殺技 終焉' });
  await expect(demonFinisher).toBeEnabled();
  await demonFinisher.click();
  await expect(page.getByTestId('short-irena-finisher')).toBeVisible();
  const demonFinisherImage = page.getByTestId('short-irena-finisher-image');
  await expect(demonFinisherImage).toHaveAttribute('src', /413F5794/);
  await expect.poll(() => demonFinisherImage.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const demonRoutePicker = page.getByRole('dialog', { name: '終焉のルート選択' });
  await expect(demonRoutePicker).toBeVisible({ timeout: 5000 });
  await expect(bossHp).toHaveAttribute('aria-valuenow', '0');
  await demonRoutePicker.getByRole('button', { name: /崩壊/ }).click();
  await expect(demonRoutePicker).toBeHidden();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '0', 'The selected route must not add a follow-up attack.');
  await expect(page.getByRole('status').filter({ hasText: '崩壊：EXカイザーの防御0／残り 3 ターン' })).toBeVisible();
  await expect(page.locator('.stella-final__log-lines')).toContainText('終焉の分岐「崩壊」');

  // Reloading starts a fresh battle with the same final-duel-only save, not a normal roster change.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('status').filter({ hasText: '最終決戦の画像素材 読み込み完了' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' }).click();
  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await chooseOpeningIrenaAlignment(page, 'GOD');
  await expect(gauge).toHaveAttribute('aria-valuenow', '15');
  await moveFinalIrenaGaugeTo(page, 100);
  await expect(gauge).toHaveAttribute('aria-valuenow', '100');
  await expect(page.getByRole('status', { name: '権能解放段階' })).toContainText('終点・究極必殺技');
  await expect(page.getByTestId('final-battle-player-portrait')).toHaveAttribute('src', /IMG_1194/);

  const godFinisher = page.getByRole('button', { name: '神側の究極必殺技 創世' });
  await expect(godFinisher).toBeEnabled();
  await godFinisher.click();
  await expect(page.getByTestId('short-irena-finisher')).toBeVisible();
  const godFinisherImage = page.getByTestId('short-irena-finisher-image');
  await expect(godFinisherImage).toHaveAttribute('src', /IMG_1199/);
  await expect.poll(() => godFinisherImage.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const godRoutePicker = page.getByRole('dialog', { name: '創世のルート選択' });
  await expect(godRoutePicker).toBeVisible({ timeout: 5000 });
  await expect(bossHp).toHaveAttribute('aria-valuenow', '600');
  await godRoutePicker.getByRole('button', { name: /神威/ }).click();
  await expect(godRoutePicker).toBeHidden();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '600', 'Route application does not trigger a follow-up attack.');
  await expect(page.getByRole('status').filter({ hasText: '神威：攻撃・防御・速度3倍／残り 2 ターン' })).toBeVisible();
  await expect(page.locator('.stella-final__log-lines')).toContainText('創世の分岐「神威」');
  await expect(godFinisher).toBeDisabled();

  // The finisher stays consumed at the endpoint. Move through the center to rearm it,
  // while keeping the verification within the configured final-turn deadline.
  await moveFinalIrenaGaugeTo(page, 25);
  await expect(gauge).toHaveAttribute('aria-valuenow', '25');
  await expect(page.getByRole('button', { name: '究極必殺技（未解放）' })).toBeDisabled();
  await page.getByRole('button', { name: '神側へ15ポイント移動' }).click();
  await expect(gauge).toHaveAttribute('aria-valuenow', '40');
  await moveFinalIrenaGaugeTo(page, 100);
  await expect(godFinisher).toBeEnabled();

  await page.getByRole('button', { name: 'ホームに戻る' }).click();
  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  await expect(page.getByRole('region', { name: '操作キャラクター' }).getByRole('button', { name: /最終決戦用いれーな/ })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const value = window.localStorage.getItem('duel_arena_short_irena_stat_allocation');
    return value ? JSON.parse(value).speed : -1;
  })).toBe(150);
});

test('the remaining divine/demonic routes apply their distinct effects without follow-up attacks', async ({ page }) => {
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
  });

  // GOD / 静寂: the next actual Kaiser counter is suppressed exactly once.
  await startFinalIrenaAtEndpoint(page, 'GOD');
  const playerHp = page.getByRole('progressbar', { name: '最終決戦用いれーなのHP' });
  const bossHp = page.getByRole('progressbar', { name: 'EXカイザーのHP' });
  await page.getByRole('button', { name: '神側の究極必殺技 創世' }).click();
  const godRoutes = page.getByRole('dialog', { name: '創世のルート選択' });
  await expect(godRoutes).toBeVisible();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '600');
  await godRoutes.getByRole('button', { name: /静寂/ }).click();
  await expect(page.getByRole('status').filter({ hasText: '静寂：EXカイザーの通常反撃停止／残り 1 ターン' })).toBeVisible();
  const hpBeforeSilencedCounter = await playerHp.getAttribute('aria-valuenow');
  await page.getByRole('button', { name: '通常攻撃' }).click();
  await expect(playerHp).toHaveAttribute('aria-valuenow', hpBeforeSilencedCounter!);
  await expect(bossHp).toHaveAttribute('aria-valuenow', '1');
  await expect(page.locator('.stella-final__log-lines')).toContainText('静寂によりカイザーの通常反撃を停止');

  // GOD / 再臨: set the existing authority cooldown state back to its ready turn.
  await startFinalIrenaAtEndpoint(page, 'GOD');
  await page.getByRole('button', { name: '神側の究極必殺技 創世' }).click();
  const rebirthRoutes = page.getByRole('dialog', { name: '創世のルート選択' });
  await expect(rebirthRoutes).toBeVisible();
  await rebirthRoutes.getByRole('button', { name: /再臨/ }).click();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '600');
  await expect(page.locator('.stella-final__log-lines')).toContainText('再使用可能にした');
  
  // DEMON / 断絶: immunity is applied for ten turns. The current engine has no Kaiser buff source.
  await startFinalIrenaAtEndpoint(page, 'DEMON');
  await page.getByRole('button', { name: '堕天側の究極必殺技 終焉' }).click();
  const severRoutes = page.getByRole('dialog', { name: '終焉のルート選択' });
  await expect(severRoutes).toBeVisible();
  await severRoutes.getByRole('button', { name: /断絶/ }).click();
  await expect(page.getByRole('status').filter({ hasText: '断絶：カイザーのバフ付与無効／残り 10 ターン' })).toBeVisible();
  await expect(page.locator('.stella-final__log-lines')).toContainText('新たなバフ付与を10ターン拒否');

  // DEMON / 消滅: pressure is cleared and resistance is set for five turns.
  await startFinalIrenaAtEndpoint(page, 'DEMON');
  await page.getByRole('button', { name: '堕天側の究極必殺技 終焉' }).click();
  const extinguishRoutes = page.getByRole('dialog', { name: '終焉のルート選択' });
  await expect(extinguishRoutes).toBeVisible();
  await extinguishRoutes.getByRole('button', { name: /消滅/ }).click();
  await expect(page.getByRole('status').filter({ hasText: '消滅：重圧耐性／残り 5 ターン' })).toBeVisible();
  await expect(page.locator('.stella-final__log-lines')).toContainText('重圧を解除し、重圧耐性を5ターン');
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
  // Stella's meteor cut-in is required before the final battle can begin.
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
  await page.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' }).click();
  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await chooseOpeningIrenaAlignment(page, 'GOD');
  const playerHp = page.getByRole('progressbar', { name: '最終決戦用いれーなのHP' });
  const bossHp = page.getByRole('progressbar', { name: 'EXカイザーのHP' });
  const gauge = page.getByRole('progressbar', { name: '堕天ゲージ' });
  await page.getByRole('button', { name: '通常攻撃' }).click();
  await expect(playerHp).toHaveAttribute('aria-valuenow', '3760');
  await moveFinalIrenaGaugeTo(page, 63);
  const bossBeforeControl = Number(await bossHp.getAttribute('aria-valuenow'));
  await page.getByRole('button', { name: '理外掌握：神側へ' }).click();
  await expect(playerHp).toHaveAttribute('aria-valuenow', '4000');
  await expect(bossHp).toHaveAttribute('aria-valuenow', String(bossBeforeControl));
  await expect(gauge).toHaveAttribute('aria-valuenow', '100');
  await expect(page.getByRole('status').filter({ hasText: '全能 1.5倍' })).toBeVisible();
  await expect(page.getByText(/元攻撃力×0\.75（永続）/)).toBeVisible();
  await expect(page.getByRole('button', { name: '理外掌握：堕天側へ' })).toBeDisabled();
  await page.getByRole('button', { name: '通常攻撃' }).click();
  await expect.poll(async () => Number(await bossHp.getAttribute('aria-valuenow'))).toBeLessThan(bossBeforeControl);
});
test('a previously used endpoint ultimate cannot soft-lock the final-turn judgment', async ({ page }) => {
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

  await startFinalIrenaAtEndpoint(page, 'GOD');
  const bossHp = page.getByRole('progressbar', { name: 'EXカイザーのHP' });
  await page.getByRole('button', { name: '神側の究極必殺技 創世' }).click();
  const routes = page.getByRole('dialog', { name: '創世のルート選択' });
  await expect(routes).toBeVisible();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '600');
  await routes.getByRole('button', { name: /静寂/ }).click();
  await expect(page.locator('.stella-final__timer')).toHaveAttribute('aria-label', '最終形態 残り7ターン');

  // The first attack consumes 静寂; later attacks cannot finish the boss
  // because the special duel keeps normal attacks from reducing its HP below 1.
  const attack = page.getByRole('button', { name: '通常攻撃' });
  for (let action = 0; action < 7; action += 1) await attack.click();

  await expect(page.getByRole('heading', { name: '最終決戦 敗北' })).toBeVisible();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '1');
  await expect(page.locator('.stella-final__log-lines')).toContainText('最終判定。究極必殺技はこの終点で使用済みのため再使用できず敗北。');
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
  await page.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' }).click();
  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await chooseOpeningIrenaAlignment(page, 'DEMON');

  const attack = page.getByRole('button', { name: '通常攻撃' });
  const gauge = page.getByRole('progressbar', { name: '堕天ゲージ' });

  for (let turn = 0; turn < 4; turn += 1) await attack.click();
  await expect(page.locator('.stella-final__phase')).toContainText('03');
  await expect(page.locator('.stella-final__timer')).toHaveAttribute('aria-label', '最終形態 残り8ターン');

  // Gauge movement remains available on either side after stage two unlocks.
  const moveGod = page.getByRole('button', { name: '神側へ15ポイント移動' });
  for (let move = 0; move < 4; move += 1) await moveGod.click();
  await expect(gauge).toHaveAttribute('aria-valuenow', '-3');
  await expect(page.locator('.stella-final__timer')).toHaveAttribute('aria-label', '最終形態 残り4ターン');

  // Spend the last four turns moving toward the centre without reaching either endpoint.
  for (let move = 0; move < 4; move += 1) await moveGod.click();
  await expect(page.getByRole('heading', { name: '最終決戦 敗北' })).toBeVisible();
  await expect(gauge).toHaveAttribute('aria-valuenow', '57');
  await expect(page.locator('.stella-final__log-lines')).toContainText('最終判定。堕天ゲージが神側にも堕天側にも振り切れていないため敗北');
  await expect(page.getByRole('button', { name: '究極必殺技（未解放）' })).toBeDisabled();
});

test('理外掌握 cannot stop the final instant-death judgment', async ({ page }) => {
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
  await page.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' }).click();
  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await chooseOpeningIrenaAlignment(page, 'DEMON');

  const attack = page.getByRole('button', { name: '通常攻撃' });
  const gauge = page.getByRole('progressbar', { name: '堕天ゲージ' });
  const moveDemon = page.getByRole('button', { name: '堕天側へ15ポイント移動' });
  const controlDemon = page.getByRole('button', { name: '理外掌握：堕天側へ' });

  for (let turn = 0; turn < 4; turn += 1) await attack.click();
  await expect(page.locator('.stella-final__phase')).toContainText('03');
  await expect(page.locator('.stella-final__timer')).toHaveAttribute('aria-label', '最終形態 残り8ターン');
  await expect(controlDemon).toBeEnabled();

  // Keep the gauge at the demonic endpoint until only one turn remains.
  for (let turn = 0; turn < 7; turn += 1) await moveDemon.click();
  await expect(gauge).toHaveAttribute('aria-valuenow', '-100');
  await expect(page.locator('.stella-final__timer')).toHaveAttribute('aria-label', '最終形態 残り1ターン');

  await controlDemon.click();
  await expect(page.getByRole('heading', { name: '最終決戦 敗北' })).toBeVisible();
  await expect(page.locator('.stella-final__log-lines')).toContainText('理外掌握でもカイザーの即死行動は止められず、敗北。');
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
  await page.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' }).click();
  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await chooseOpeningIrenaAlignment(page, 'DEMON');
  await moveFinalIrenaGaugeTo(page, -60);

  const playerHp = page.getByRole('progressbar', { name: '最終決戦用いれーなのHP' });
  const bossHp = page.getByRole('progressbar', { name: 'EXカイザーのHP' });
  const terminus = page.getByRole('button', { name: '終極殲滅を発動' });
  const control = page.getByRole('button', { name: '理外掌握：神側へ' });
  const pass = page.getByRole('button', { name: '行動不能ターンを消費' });

  await terminus.click();
  await expect(terminus).toBeDisabled();
  await expect(pass).toBeVisible();
  const ultimate = page.getByRole('button', { name: '堕天側の究極必殺技 終焉' });
  await expect(ultimate).toBeDisabled();
  await pass.click();
  await expect(terminus).toBeDisabled();
  await expect(ultimate).toBeEnabled();
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
  await expect(page.locator('.stella-final__log-lines')).toContainText('第8ターン：権能「終極殲滅」');
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
      maxHp: 150, attack: 0, defense: 0, speed: 0,
    }));
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('status').filter({ hasText: '最終決戦の画像素材 読み込み完了' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' }).click();
  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await chooseOpeningIrenaAlignment(page, 'DEMON');
  await moveFinalIrenaGaugeTo(page, -30);

  const attack = page.getByRole('button', { name: '通常攻撃' });
  const terminus = page.getByRole('button', { name: '終極殲滅を発動' });
  const ascension = page.getByRole('button', { name: '絶界昇華を発動' });
  const controlGod = page.getByRole('button', { name: '理外掌握：神側へ' });
  const controlDemon = page.getByRole('button', { name: '理外掌握：堕天側へ' });
  const pass = page.getByRole('button', { name: '行動不能ターンを消費' });
  const bossHp = page.getByRole('progressbar', { name: 'EXカイザーのHP' });
  const gauge = page.getByRole('progressbar', { name: '堕天ゲージ' });

  await expect(page.getByText(/実効ステータス：ATK 360／DEF 200／SPD 240/)).toBeVisible();

  // Put the gauge at -60 without locking the route. The recoil turn must be consumed first.
  await terminus.click();
  await expect(pass).toBeVisible();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '10000');
  await pass.click();
  await moveFinalIrenaGaugeTo(page, 45);

  await ascension.click();
  await expect(gauge).toHaveAttribute('aria-valuenow', '100');
  const ultimate = page.getByRole('button', { name: '神側の究極必殺技 創世' });
  await expect(ultimate).toBeDisabled();
  await expect(page.getByText(/実効ステータス：ATK 1,080／DEF 600／SPD 720/)).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '絶界昇華：攻撃・防御・速度3倍／残り 2 ターン' })).toBeVisible();
  await expect(terminus).toBeDisabled();
  await expect(ascension).toBeDisabled();
  await expect(controlGod).toBeDisabled();
  await expect(controlDemon).toBeDisabled();

  await attack.click();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '1540');
  await expect(page.getByRole('status').filter({ hasText: '絶界昇華：攻撃・防御・速度3倍／残り 1 ターン' })).toBeVisible();
  await expect(terminus).toBeDisabled();
  await expect(ascension).toBeDisabled();
  await expect(controlGod).toBeDisabled();
  await expect(controlDemon).toBeDisabled();

  await attack.click();
  await expect(bossHp).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByRole('status').filter({ hasText: '絶界昇華の反動：防御50%低下／残り 3 ターン' })).toBeVisible();
  await expect(terminus).toBeDisabled();
  // The expiry recoil locks abilities until the required PASS action is consumed.
  await expect(ascension).toBeDisabled();
  await expect(controlGod).toBeDisabled();
  await expect(controlDemon).toBeDisabled();

  await expect(pass).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '絶界昇華の反動：防御50%低下／残り 3 ターン' })).toBeVisible();
  await expect(gauge).toHaveAttribute('aria-valuenow', '100');
  await expect(ultimate).toBeDisabled();

  await pass.click();
  await expect(ascension).toBeEnabled();
  await expect(terminus).toBeDisabled();
  await expect(controlGod).toBeEnabled();
  await expect(controlDemon).toBeEnabled();
  await expect(ultimate).toBeEnabled();
});

test('legacy unlocked save can still enter the EX Kaiser challenge without resetting Stella progress', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true,
      revealAvailable: false,
      kaiser100RewardClaimed: false,
      exKaiserDefeated: true,
    }));
    window.localStorage.setItem('duel_arena_kaiser_challenge_progress', JSON.stringify({ unlockedLevel: 100 }));
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'EXカイザー再戦' }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'EXカイザー挑戦' })).toContainText('全戦闘ステータスが2倍');
  await expect(page.getByRole('button', { name: /戦闘開始/ })).toBeEnabled();
});

test('mobile battle top controls are shifted below the iPhone status area', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/');
  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await page.getByRole('button', { name: /戦闘開始/ }).click();

  const deployOverlay = page.getByRole('status', { name: '戦闘出撃中' });
  await expect(deployOverlay).toBeVisible();
  await expect(deployOverlay).toBeHidden({ timeout: 5_000 });
  await expect(page.getByText(/^第\s*1\s*ターン$/)).toBeVisible({ timeout: 20_000 });

  const attackButton = page.locator('.battle-action-dock button[aria-label="攻撃"]');
  await expect(attackButton).toBeEnabled({ timeout: 20_000 });
  const backButton = page.locator('.battle-screen-root button[title="戻る"]');
  await expect(backButton).toBeVisible();
  const backBox = await backButton.boundingBox();
  const attackBox = await attackButton.boundingBox();
  expect(backBox).not.toBeNull();
  expect(attackBox).not.toBeNull();
  expect(backBox!.y).toBeGreaterThanOrEqual(20);
  expect(attackBox!.y + attackBox!.height).toBeLessThanOrEqual(844);
});


test('divine-stage authorities enforce gauge gates, change real combat stats, and tick once per turn', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true, revealAvailable: false, kaiser100RewardClaimed: true, exKaiserDefeated: true,
      finalBattleCleared: true, finalBattleRewardClaimed: true,
    }));
    window.localStorage.setItem('duel_arena_short_irena_stat_allocation', JSON.stringify({ maxHp: 0, attack: 0, defense: 0, speed: 0 }));
  });

  await startFinalIrenaAtGauge(page, 30);
  const gauge = page.getByRole('progressbar', { name: '堕天ゲージ' });
  const playerHp = page.getByRole('progressbar', { name: '最終決戦用いれーなのHP' });
  const divineSpeed = page.getByRole('button', { name: '神域の速度を発動' });
  await expect(divineSpeed).toBeEnabled();
  await expect(page.getByRole('button', { name: '全能降臨を発動' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '万象支配を発動' })).toBeDisabled();
  await divineSpeed.click();
  await expect(playerHp).toHaveAttribute('aria-valuenow', '3690');
  await expect(page.getByRole('status').filter({ hasText: '神域の速度：防御1.5倍・速度999倍／残り 3 ターン' })).toBeVisible();
  await expect(page.getByText(/実効ステータス：ATK 360／DEF 300／SPD 239,760/)).toBeVisible();
  await page.getByRole('button', { name: '堕天側へ15ポイント移動' }).click();
  await expect(gauge).toHaveAttribute('aria-valuenow', '15');
  await expect(divineSpeed).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: '神域の速度：防御1.5倍・速度999倍／残り 2 ターン' })).toBeVisible();
  await expect(page.getByText(/実効ステータス：ATK 360／DEF 300／SPD 239,760/)).toBeVisible();
  await page.getByRole('button', { name: '神側へ15ポイント移動' }).click();
  await expect(page.getByRole('status').filter({ hasText: '神域の速度：防御1.5倍・速度999倍／残り 1 ターン' })).toBeVisible();
  await page.getByRole('button', { name: '堕天側へ15ポイント移動' }).click();
  await expect(gauge).toHaveAttribute('aria-valuenow', '15');
  await expect(page.getByRole('status').filter({ hasText: '神域の速度：防御1.5倍・速度999倍' })).toHaveCount(0);
  await expect(page.getByText(/実効ステータス：ATK 360／DEF 200／SPD 240/)).toBeVisible();

  await startFinalIrenaAtGauge(page, 60);
  const allPower = page.getByRole('button', { name: '全能降臨を発動' });
  await expect(allPower).toBeEnabled();
  await expect(page.getByRole('button', { name: '万象支配を発動' })).toBeDisabled();
  await allPower.click();
  await expect(page.getByRole('status').filter({ hasText: '全能降臨：攻撃・防御・速度2倍／残り 3 ターン' })).toBeVisible();
  await expect(page.getByText(/実効ステータス：ATK 720／DEF 400／SPD 480/)).toBeVisible();
  await page.getByRole('button', { name: '堕天側へ15ポイント移動' }).click();
  await expect(page.getByRole('status').filter({ hasText: '全能降臨：攻撃・防御・速度2倍／残り 2 ターン' })).toBeVisible();
  await expect(page.getByText(/実効ステータス：ATK 720／DEF 400／SPD 480/)).toBeVisible();

  await startFinalIrenaAtGauge(page, 100);
  const allThings = page.getByRole('button', { name: '万象支配を発動' });
  const bossHp = page.getByRole('progressbar', { name: 'EXカイザーのHP' });
  await expect(allThings).toBeEnabled();
  const hpBefore = Number(await bossHp.getAttribute('aria-valuenow'));
  await allThings.click();
  await expect.poll(async () => Number(await bossHp.getAttribute('aria-valuenow'))).toBeLessThan(hpBefore);
  await expect(page.locator('.stella-final__log-lines')).toContainText('権能「万象支配」。発動時の攻撃は');
  await expect(page.getByRole('status').filter({ hasText: '万象支配：攻撃4倍・防御2倍・速度999倍／残り 1 ターン' })).toBeVisible();
  await expect(page.getByText(/実効ステータス：ATK 1,440／DEF 400／SPD 239,760/)).toBeVisible();
  await page.getByRole('button', { name: '堕天側へ15ポイント移動' }).click();
  await expect(page.getByRole('status').filter({ hasText: '万象支配：攻撃4倍・防御2倍・速度999倍' })).toHaveCount(0);
  await expect(page.getByText(/実効ステータス：ATK 360／DEF 200／SPD 240/)).toBeVisible();

  await startFinalIrenaAtGauge(page, 75);
  await page.getByRole('button', { name: '全能降臨を発動' }).click();
  await page.getByRole('button', { name: '神側へ15ポイント移動' }).click();
  await page.getByRole('button', { name: '神側へ15ポイント移動' }).click();
  await expect(gauge).toHaveAttribute('aria-valuenow', '100');
  await expect(page.getByRole('status').filter({ hasText: '全能降臨：攻撃・防御・速度2倍／残り 1 ターン' })).toBeVisible();
  await page.getByRole('button', { name: '神側の究極必殺技 創世' }).click();
  await expect(page.getByRole('dialog', { name: '創世のルート選択' })).toBeVisible({ timeout: 5000 });
  await expect(bossHp).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('.stella-final__log-lines')).toContainText('威力28,800');
  await expect(page.getByRole('status').filter({ hasText: '全能降臨：攻撃・防御・速度2倍' })).toHaveCount(0);
});

test('EX Kaiser remains Lv.100 when a developer-style Lv.100 clear leaves normal progression below Lv.100', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    // Mirrors the persisted result of clearing Lv.100 from Developer Tools:
    // one-time reward/EX access is saved, but the normal challenge ladder is not advanced.
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: false,
      exKaiserDefeated: false,
      revealAvailable: false,
      kaiser100RewardClaimed: true,
      finalBattleCleared: false,
      finalBattleRewardClaimed: false,
    }));
    window.localStorage.setItem('duel_arena_kaiser_challenge_progress', JSON.stringify({ unlockedLevel: 10 }));
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'EXカイザーに挑む' }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'EXカイザー挑戦' })).toContainText('全戦闘ステータスが2倍');
  await expect(page.getByText('EX挑戦：Lv.100固定')).toBeVisible();
  await expect(page.getByText('EXカイザーへの挑戦はLv.100固定です。通常のカイザー挑戦の解放進行とは別に戦います。')).toBeVisible();
  await expect(page.getByRole('button', { name: /Lv\.100/ })).toBeVisible();
  await page.getByRole('button', { name: /戦闘開始/ }).click();

  const deployOverlay = page.getByRole('status', { name: '戦闘出撃中' });
  await expect(deployOverlay).toBeHidden({ timeout: 5_000 });
  await expect(page.getByRole('button', { name: '攻撃' })).toBeEnabled({ timeout: 20_000 });
  await expect(page.getByText('EXカイザー', { exact: true })).toBeVisible();
  await expect(page.getByText('16500 / 16500', { exact: true })).toBeVisible();
});

test('repeated same-direction gauge choices replay the light/dark flash', async ({ page }) => {
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

  await startFinalIrenaAtGauge(page, 15);
  const gauge = page.getByRole('progressbar', { name: '堕天ゲージ' });
  const flash = page.getByTestId('short-irena-alignment-flash');
  const moveGod = page.getByRole('button', { name: '神側へ15ポイント移動' });
  const moveDemon = page.getByRole('button', { name: '堕天側へ15ポイント移動' });

  await moveGod.click();
  await expect(gauge).toHaveAttribute('aria-valuenow', '30');
  await expect(flash).toBeVisible();
  await expect(flash).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.9)');
  const firstGodFlash = await flash.elementHandle();
  expect(firstGodFlash).not.toBeNull();

  // A second same-direction choice before the first 300ms flash clears must remount it.
  await moveGod.click();
  await expect(gauge).toHaveAttribute('aria-valuenow', '45');
  await expect.poll(() => firstGodFlash!.evaluate(element => element.isConnected)).toBe(false);
  await expect(flash).toBeVisible();
  await expect(flash).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.9)');

  await moveDemon.click();
  await expect(gauge).toHaveAttribute('aria-valuenow', '30');
  await expect(flash).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.82)');
  const firstDemonFlash = await flash.elementHandle();
  expect(firstDemonFlash).not.toBeNull();

  await moveDemon.click();
  await expect(gauge).toHaveAttribute('aria-valuenow', '15');
  await expect.poll(() => firstDemonFlash!.evaluate(element => element.isConnected)).toBe(false);
  await expect(flash).toBeVisible();
  await expect(flash).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.82)');
});

test('a real normal Lv.100 victory persists the +50P reward once and exposes only the EX route', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stat_points', '500');
    window.localStorage.setItem('duel_arena_kaiser_challenge_progress', JSON.stringify({ unlockedLevel: 100 }));
    window.localStorage.setItem('duel_arena_ability_progress', JSON.stringify({
      levels: { ABYSS: 1, FALLEN: 0, BLACK_WING: 1, FALLEN_KING: 0, JUDGMENT: 0 },
      shards: { ABYSS: 0, FALLEN: 0, BLACK_WING: 0, FALLEN_KING: 0, JUDGMENT: 0 },
    }));
    window.localStorage.setItem('duel_arena_build_saves_v1', JSON.stringify({
      version: 1,
      saves: [{
        id: 'normal-lv100-audit-build',
        name: 'Lv100監査用',
        createdAt: 1,
        updatedAt: 1,
        snapshot: {
          statAllocation: { maxHp: 50, attack: 450, defense: 0, speed: 0 },
          abilityIds: ['ABYSS', 'BLACK_WING'],
          imprintIds: [],
        },
      }],
    }));
    Math.random = () => 0.99;
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();

  await page.getByRole('button', { name: /Lv\.100/ }).click();
  await page.getByRole('button', { name: '読み込む', exact: true }).click();
  await expect(page.locator('.build-save-panel__message')).toContainText('Lv100監査用を読み込みました。');
  await expect(page.getByText(/残り\s*0P\s*\/\s*500P/)).toBeVisible();
  await page.getByRole('button', { name: /戦闘開始/ }).click();

  const deployOverlay = page.getByRole('status', { name: '戦闘出撃中' });
  await expect(deployOverlay).toBeHidden({ timeout: 5_000 });
  await expect(page.getByRole('button', { name: '攻撃' })).toBeEnabled({ timeout: 20_000 });
  const attack = page.locator('.battle-action-dock button[aria-label="攻撃"]');
  const turnMarker = page.getByText(/^第\s*\d+\s*ターン$/);
  const victoryTitle = page.getByText('VICTORY', { exact: true });

  // Play the real level-100 fight, including the forced 50% phase transition.
  for (let actionCount = 0; actionCount < 6; actionCount += 1) {
    if (await victoryTitle.isVisible().catch(() => false)) break;
    const turnBefore = await turnMarker.innerText();
    await attack.click();
    await expect.poll(async () => (
      await victoryTitle.isVisible().catch(() => false)
      || (await turnMarker.innerText().catch(() => '')) !== turnBefore
    ), { timeout: 20_000 }).toBe(true);
  }

  await expect(victoryTitle).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('勝利！', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('duel_arena_stat_points'))).toBe('552');
  await expect.poll(() => page.evaluate(() => {
    const raw = window.localStorage.getItem('duel_arena_stella_mode_progress');
    return raw ? JSON.parse(raw).kaiser100RewardClaimed : false;
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const raw = window.localStorage.getItem('duel_arena_stella_mode_progress');
    const progress = raw ? JSON.parse(raw) : {};
    return {
      isUnlocked: progress.isUnlocked,
      exKaiserDefeated: progress.exKaiserDefeated,
      revealAvailable: progress.revealAvailable,
    };
  })).toEqual({ isUnlocked: false, exKaiserDefeated: false, revealAvailable: false });

  await page.getByRole('button', { name: /キャラクター選択に戻る/ }).click();
  await expect(page.getByRole('button', { name: 'EXカイザーに挑む' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ステラモードを開く' })).toHaveCount(0);

  // Replay Lv.100 through the real Developer Tools path. It is still a NORMAL
  // Kaiser fight, must not grant the one-time +50P again, and must retain EX access.
  await page.getByRole('button', { name: '開発者ツール', exact: true }).click();
  await expect(page.getByRole('heading', { name: '開発者ツール' })).toBeVisible();
  await page.getByRole('button', { name: 'Lv.100', exact: true }).click();
  await page.getByRole('button', { name: 'この設定でバトル準備へ' }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await expect(page.getByText('開発者テスト：全Lv選択可能')).toBeVisible();
  await page.getByRole('button', { name: '火力', exact: true }).click();
  await expect(page.getByText(/残り\s*0P\s*\/\s*552P/)).toBeVisible();
  await page.getByRole('button', { name: /戦闘開始/ }).click();

  await expect(page.getByRole('status', { name: '戦闘出撃中' })).toBeHidden({ timeout: 5_000 });
  await expect(page.getByRole('button', { name: '攻撃' })).toBeEnabled({ timeout: 20_000 });
  const secondVictoryTitle = page.getByText('VICTORY', { exact: true });
  const secondTurnMarker = page.getByText(/^第\s*\d+\s*ターン$/);
  const secondAttack = page.locator('.battle-action-dock button[aria-label="攻撃"]');
  for (let actionCount = 0; actionCount < 6; actionCount += 1) {
    if (await secondVictoryTitle.isVisible().catch(() => false)) break;
    const turnBefore = await secondTurnMarker.innerText();
    await secondAttack.click();
    await expect.poll(async () => (
      await secondVictoryTitle.isVisible().catch(() => false)
      || (await secondTurnMarker.innerText().catch(() => '')) !== turnBefore
    ), { timeout: 20_000 }).toBe(true);
  }
  await expect(secondVictoryTitle).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('duel_arena_stat_points'))).toBe('554');
  await expect.poll(() => page.evaluate(() => {
    const raw = window.localStorage.getItem('duel_arena_stella_mode_progress');
    return raw ? JSON.parse(raw).kaiser100RewardClaimed : false;
  })).toBe(true);

  await page.getByRole('button', { name: /キャラクター選択に戻る/ }).click();
  await expect(page.getByRole('button', { name: 'EXカイザーに挑む' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ステラモードを開く' })).toHaveCount(0);
});
