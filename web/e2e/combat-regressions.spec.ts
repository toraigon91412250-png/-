import { expect, test, type Locator, type Page } from '@playwright/test';

async function startFreshBattle(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();

  await page.getByRole('button', { name: /バトル開始/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();

  // A fresh save must show the documented initial 12 stat points, not zero.
  await expect(page.getByText(/残り\s*12P\s*\/\s*12P/)).toBeVisible();
  await page.getByRole('button', { name: /戦闘開始/ }).click();

  const deployOverlay = page.getByRole('status', { name: '戦闘出撃中' });
  await expect(deployOverlay).toBeVisible();
  await expect(deployOverlay.locator('.battle-deploy-reticle')).toBeVisible();
  await expect(deployOverlay.locator('.battle-deploy-progress')).toBeVisible();
  await expect(deployOverlay).toContainText('TACTICAL LINK');
  await expect(deployOverlay).toBeHidden({ timeout: 5_000 });

  await expect(page.getByText(/^第\s*1\s*ターン$/)).toBeVisible({ timeout: 20_000 });
  const attackButton = page.locator('button:visible').filter({ hasText: /^攻撃/ }).first();
  await expect(attackButton).toBeEnabled({ timeout: 20_000 });
  return attackButton;
}

test('imprint loadout can be equipped, unequipped, persisted, and carried into battle', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    // Lock CPU action choice to its highest-scoring action so this live-combat
    // assertion is deterministic: the initial forecast is SPECIAL, not random variation.
    Math.random = () => 0.99;
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: '刻印を管理' }).click();
  await expect(page.getByRole('heading', { name: '刻印管理' })).toBeVisible();
  await expect(page.getByLabel('刻印枠1：空き')).toBeVisible();
  await expect(page.getByLabel('見切りを装備')).toBeEnabled();

  await page.getByLabel('見切りを装備').click();
  await expect(page.getByLabel('刻印枠1：見切り')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('刻印の装備を保存しました。');
  await expect.poll(() => page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem('duel_arena_imprint_progress') || '{}');
    return { unlockedIds: progress.unlockedIds, equippedIds: progress.equippedIds };
  })).toEqual({ unlockedIds: ['FORESIGHT'], equippedIds: ['FORESIGHT'] });

  await page.getByRole('button', { name: '本編に戻る' }).click();
  await page.getByRole('button', { name: '刻印を管理' }).click();
  await expect(page.getByLabel('刻印枠1：見切り')).toBeVisible();
  await page.getByLabel('見切りを解除').click();
  await expect(page.getByLabel('刻印枠1：空き')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem('duel_arena_imprint_progress') || '{}');
    return progress.equippedIds;
  })).toEqual([]);

  await page.getByLabel('見切りを装備').click();
  await page.getByRole('button', { name: '本編に戻る' }).click();
  await page.getByRole('button', { name: /バトル開始/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await page.getByRole('button', { name: /戦闘開始/ }).click();
  await expect(page.getByRole('status', { name: '戦闘出撃中' })).toBeVisible();
  await expect(page.getByRole('status', { name: '戦闘出撃中' })).toBeHidden({ timeout: 5_000 });
  await expect(page.getByRole('status', { name: '見切りの状態' })).toContainText('未使用', { timeout: 20_000 });

  // With deterministic CPU choice, the initial telegraph must be SPECIAL.
  // Evading it exercises the real battle hook and the once-per-battle state update.
  const intentLabel = await page.locator('[aria-label="戦況予測"] > div').first().locator('span').nth(1).innerText();
  expect(intentLabel).toBe('特殊技');
  await page.getByRole('button', { name: /^回避/ }).first().click();
  // The forecast status is the visible UI contract for a battle-limited trigger.
  // This assertion verifies the real combat hook changed its once-per-battle state.
  await expect(page.getByRole('status', { name: '見切りの状態' })).toContainText('発動済み', { timeout: 15_000 });

  expect(pageErrors, 'Imprint navigation, storage, and battle integration should not raise uncaught errors.').toEqual([]);
});

test('raid imprint gacha spends one ticket per new imprint and excludes owned imprints', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_imprint_progress', JSON.stringify({
      unlockedIds: ['FORESIGHT'],
      equippedIds: [],
    }));
    window.localStorage.setItem('duel_arena_raid_reward_progress', JSON.stringify({
      coreFragments: 0,
      imprintTickets: 2,
      bonusStatPoints: 0,
      claimedVictoryRunIds: [],
    }));
    Math.random = () => 0;
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: '刻印ガチャを開く' }).click();
  await expect(page.getByRole('heading', { name: '刻印ガチャ' })).toBeVisible();
  await expect(page.getByLabel('刻印ガチャチケットの所持数 2')).toBeVisible();

  await page.getByRole('button', { name: '刻印を1回引く' }).click();
  await expect(page.getByRole('status')).toContainText('詠唱狩りを獲得しました！');
  await expect.poll(() => page.evaluate(() => {
    const raid = JSON.parse(window.localStorage.getItem('duel_arena_raid_reward_progress') || '{}');
    const imprints = JSON.parse(window.localStorage.getItem('duel_arena_imprint_progress') || '{}');
    return { tickets: raid.imprintTickets, unlockedIds: imprints.unlockedIds };
  })).toEqual({ tickets: 1, unlockedIds: ['FORESIGHT', 'CHANT_HUNT'] });

  await page.getByRole('button', { name: '刻印を1回引く' }).click();
  await expect(page.getByRole('status')).toContainText('陰陽転化を獲得しました！');
  await expect.poll(() => page.evaluate(() => {
    const raid = JSON.parse(window.localStorage.getItem('duel_arena_raid_reward_progress') || '{}');
    const imprints = JSON.parse(window.localStorage.getItem('duel_arena_imprint_progress') || '{}');
    return { tickets: raid.imprintTickets, unlockedIds: imprints.unlockedIds };
  })).toEqual({ tickets: 0, unlockedIds: ['FORESIGHT', 'CHANT_HUNT', 'YIN_YANG'] });

  const drawButton = page.getByRole('button', { name: '刻印を1回引く' });
  await expect(drawButton).toBeDisabled();
  await expect(drawButton).toContainText('すべての刻印を獲得済み');
  expect(pageErrors, 'Imprint gacha navigation and draws must not raise uncaught errors.').toEqual([]);
});

test('Yin-Yang Conversion protects the current turn, preserves pressure, and advances the round', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_imprint_progress', JSON.stringify({
      unlockedIds: ['FORESIGHT', 'CHANT_HUNT', 'YIN_YANG'],
      equippedIds: ['CHANT_HUNT', 'YIN_YANG'],
    }));
    Math.random = () => 0.99;
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /バトル開始/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await page.getByRole('button', { name: /戦闘開始/ }).click();
  const deployOverlay = page.getByRole('status', { name: '戦闘出撃中' });
  await expect(deployOverlay).toBeVisible();
  await expect(deployOverlay).toBeHidden({ timeout: 5_000 });
  await expect(page.getByText(/^第\s*1\s*ターン$/)).toBeVisible({ timeout: 20_000 });

  const intentLabel = await page.locator('[aria-label="戦況予測"] > div').first().locator('span').nth(1).innerText();
  expect(intentLabel).toBe('特殊技');
  await expect(page.getByRole('button', { name: '陰陽転化' })).toBeEnabled();
  await page.getByRole('button', { name: '陰陽転化' }).click();

  // This checks the state after resolution, regardless of whether CPU or player acted first.
  await expect(page.getByRole('button', { name: '強化中の詳細を表示' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('status', { name: '陰陽転化の状態' })).toContainText('防御成功', { timeout: 15_000 });
  // Kaiser’s special must still apply Pressure even though its direct damage is reduced.
  await expect(page.getByRole('button', { name: /重圧 2ターンの詳細を表示/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/^第\s*2\s*ターン$/)).toBeVisible({ timeout: 20_000 });

  expect(pageErrors, 'Yin-Yang must not break the status ailment or turn progression.').toEqual([]);
});

test('raid-exclusive core fragment can be used in the main game for permanent stat points', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_raid_reward_progress', JSON.stringify({
      coreFragments: 1,
      bonusStatPoints: 0,
      claimedVictoryRunIds: [],
    }));
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  const useItem = page.getByRole('button', { name: '深淵核片を使用する（+2P・永続）' });
  await expect(useItem).toBeEnabled();
  await expect(page.getByLabel('深淵核片の所持数 1')).toBeVisible();

  await useItem.click();
  await expect(page.getByText('深淵核片を使用！ ステータス配分上限 +2P（永続）。現在 14P。')).toBeVisible();
  await expect(page.getByRole('button', { name: 'レイドをクリアすると入手できます' })).toBeDisabled();
  await expect.poll(() => page.evaluate(() => {
    const reward = JSON.parse(window.localStorage.getItem('duel_arena_raid_reward_progress') || '{}');
    return { coreFragments: reward.coreFragments, bonusStatPoints: reward.bonusStatPoints };
  })).toEqual({ coreFragments: 0, bonusStatPoints: 2 });

  await page.getByRole('button', { name: /バトル開始/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await expect(page.getByText(/残り\s*14P\s*\/\s*14P/)).toBeVisible();

  expect(pageErrors, 'Redeeming a raid item should not raise uncaught JavaScript errors.').toEqual([]);
});

test('raid victory grants its exclusive item and the item upgrades the main-game build', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    const state = window as unknown as { __raidSeed: number };
    state.__raidSeed = 101;
    Math.random = () => {
      const current = window as unknown as { __raidSeed: number };
      current.__raidSeed = (Math.imul(current.__raidSeed, 1664525) + 1013904223) >>> 0;
      return current.__raidSeed / 4294967296;
    };
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /レイドボスに挑戦/ }).click();
  await expect(page.getByRole('heading', { name: 'アビスコア', exact: true })).toBeVisible();

  // Reset the RNG after the raid component's one-time run ID is created,
  // matching the deterministic balanced-policy simulation in test-rules.js.
  await page.evaluate(() => {
    (window as unknown as { __raidSeed: number }).__raidSeed = 101;
  });
  await page.getByRole('button', { name: 'バトル開始', exact: true }).click();
  await expect(page.getByRole('status', { name: 'レイド戦闘準備中' })).toBeHidden({ timeout: 5_000 });

  const clearHeading = page.getByRole('heading', { name: 'RAID CLEAR', exact: true });
  const failHeading = page.getByRole('heading', { name: 'RAID FAILED', exact: true });
  const intent = page.locator('.raid-v1-intent h3');
  const turnMarker = page.locator('.raid-v1-action-heading > span');
  const actionEnabled = async (name: string) => page.getByRole('button', { name, exact: true }).isEnabled();
  const readNumber = async (locator: Locator) => {
    const text = await locator.innerText();
    return Number(text.split('/')[0].replace(/,/g, '').trim());
  };

  // Mirror the tested telegraph-aware policy and use the same seeded RNG.
  for (let turn = 0; turn < 45; turn += 1) {
    if (await clearHeading.isVisible() || await failHeading.isVisible()) break;

    const pattern = await intent.innerText();
    const playerHp = await readNumber(page.locator('.raid-v1-player-stat .raid-v1-bar-caption strong'));
    const bossHp = await readNumber(page.locator('.raid-v1-boss-hp .raid-v1-bar-caption strong'));
    const resources = page.locator('.raid-v1-resource-head strong');
    const mp = await readNumber(resources.nth(0));
    const tp = await readNumber(resources.nth(1));
    const broken = (await page.locator('.raid-v1-break-block .raid-v1-bar-caption strong').innerText()) === 'BURST WINDOW';
    const focusReady = await page.locator('.raid-v1-focus-ready').count() > 0;
    let action = '通常攻撃';

    if (pattern === '崩壊連撃・発動直前') {
      action = await actionEnabled('迎撃') ? '迎撃' : await actionEnabled('防御') ? '防御' : '通常攻撃';
    } else if (pattern === '虚核再生' && await actionEnabled('羽弾')) {
      action = '羽弾';
    } else if (tp >= 100 && (broken || bossHp <= 2200) && await actionEnabled('終天羽星穿ち')) {
      action = '終天羽星穿ち';
    } else if (broken) {
      action = await actionEnabled('羽弾') ? '羽弾' : '通常攻撃';
    } else if (pattern === '滅界砲' || pattern === '終焉衝動') {
      action = await actionEnabled('迎撃') ? '迎撃' : await actionEnabled('防御') ? '防御' : '通常攻撃';
    } else if (pattern === '虚無落雷') {
      action = await actionEnabled('羽弾') ? '羽弾' : await actionEnabled('防御') ? '防御' : '通常攻撃';
    } else if (focusReady) {
      action = '通常攻撃';
    } else if (tp < 65 && mp >= 8 && playerHp > 2400 && bossHp > 2500 && await actionEnabled('集中')) {
      action = '集中';
    }

    const before = await turnMarker.innerText();
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(turnMarker).not.toHaveText(before, { timeout: 5_000 });
  }

  await expect(clearHeading).toBeVisible();
  await expect(page.locator('.raid-v1-raid-reward')).toContainText('深淵核片 ×1');
  await expect.poll(() => page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem('duel_arena_raid_reward_progress') || '{}');
    return { coreFragments: progress.coreFragments, bonusStatPoints: progress.bonusStatPoints };
  })).toEqual({ coreFragments: 1, bonusStatPoints: 0 });

  await page.getByRole('button', { name: '本編に戻る' }).last().click();
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await expect(page.getByLabel('深淵核片の所持数 1')).toBeVisible();
  await page.getByRole('button', { name: '深淵核片を使用する（+2P・永続）' }).click();
  await expect(page.getByText('深淵核片を使用！ ステータス配分上限 +2P（永続）。現在 14P。')).toBeVisible();
  await page.getByRole('button', { name: /バトル開始/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await expect(page.getByText(/残り\s*14P\s*\/\s*14P/)).toBeVisible();

  expect(pageErrors, 'A raid victory and its main-game reward must not raise uncaught JavaScript errors.').toEqual([]);
});

test('raid prototype opens independently and resolves a defensive turn on desktop and mobile', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /レイドボスに挑戦/ }).click();

  await expect(page.getByRole('heading', { name: 'アビスコア', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'バトル開始', exact: true })).toBeEnabled();
  await expect(page.getByText('BOSS TELEGRAPH')).toHaveCount(0);
  await page.getByRole('button', { name: 'バトル開始', exact: true }).click();
  const loadingOverlay = page.getByRole('status', { name: 'レイド戦闘準備中' });
  await expect(loadingOverlay).toBeVisible();
  await expect(loadingOverlay).toContainText('深淵接続中');
  await expect(loadingOverlay).toContainText('TARGET LOCK · ABYSS CORE');
  await expect(page.locator('.raid-v1-deploy-progress')).toBeVisible();
  await expect(loadingOverlay).toBeHidden({ timeout: 5_000 });
  await expect(page.getByText('BOSS TELEGRAPH')).toBeVisible();
  const raidShell = page.locator('.raid-v1-shell--battle');
  await expect(raidShell).toBeVisible();
  for (const action of ['通常攻撃', '羽弾', '防御', '迎撃', '集中', '終天羽星穿ち']) {
    await expect(page.getByRole('button', { name: action, exact: true })).toBeInViewport();
  }
  await expect.poll(() => raidShell.evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  await expect(page.getByRole('button', { name: '迎撃' })).toBeEnabled();
  await page.getByRole('button', { name: '防御' }).click();

  await expect(page.getByText('TURN 02')).toBeVisible();
  await expect(page.getByText('防御態勢', { exact: true })).toBeVisible();
  await expect(page.getByText('LAST HIT')).toHaveCount(0);
  await expect(page.getByText('LAST RECEIVED')).toHaveCount(0);
  await expect(page.getByText('予告への正答は攻撃を止め、BREAKを加速させる。')).toHaveCount(0);
  await expect(page.getByLabel('直近5手の戦闘履歴')).toBeVisible();
  await page.getByRole('button', { name: '集中' }).click();
  await expect(page.getByText('FOCUS READY · 次の攻撃ダメージ ×1.65')).toBeVisible();
  await expect(page.getByLabel('直近5手の戦闘履歴').getByText(/集中/).first()).toBeVisible();
  await page.getByTitle('戻る').click();
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();

  expect(pageErrors, 'The raid prototype should not raise uncaught JavaScript errors.').toEqual([]);
});


test('Core Regeneration is visible and Feather interrupts the recovery on desktop and mobile', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /レイドボスに挑戦/ }).click();
  await page.getByRole('button', { name: 'バトル開始', exact: true }).click();

  // A stable high sample selects CORE_REGEN after the opening sweep and remains safe for this test.
  await page.evaluate(() => {
    Math.random = () => 0.99;
  });
  const turnMarker = page.locator('.raid-v1-action-heading > span');
  const firstTurn = await turnMarker.innerText();
  await page.getByRole('button', { name: '通常攻撃', exact: true }).click();
  await expect(turnMarker).not.toHaveText(firstTurn);
  await expect(page.locator('.raid-v1-intent h3')).toHaveText('虚核再生');
  await expect(page.locator('.raid-v1-intent')).toContainText('羽弾で再生を中断');

  await page.getByRole('button', { name: '羽弾', exact: true }).click();
  await expect(page.locator('.raid-v1-outcome')).toContainText('SPELL INTERRUPT');
  await expect(page.locator('.raid-v1-combat-log')).toContainText('回復を阻止した');
  await expect(page.locator('.raid-v1-history')).toContainText('回復阻止');

  expect(pageErrors, 'The regeneration interruption must not raise uncaught JavaScript errors.').toEqual([]);
});

test('phase two Collapse Chain shows its wind-up and can be countered at release', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    const state = window as unknown as { __raidRandomValue: number };
    state.__raidRandomValue = 0.1;
    Math.random = () => state.__raidRandomValue;
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /レイドボスに挑戦/ }).click();
  await page.getByRole('button', { name: 'バトル開始', exact: true }).click();

  const phaseChip = page.locator('.raid-v1-phase-chip');
  const turnMarker = page.locator('.raid-v1-action-heading > span');
  const intent = page.locator('.raid-v1-intent h3');

  // Finish phase one with repeatable low-damage rolls and valid counters against heavy telegraphs.
  for (let turn = 0; turn < 18; turn += 1) {
    if ((await phaseChip.innerText()).includes('PHASE 02')) break;

    const title = await intent.innerText();
    let action = '通常攻撃';
    if (title === '滅界砲' || title === '終焉衝動') {
      action = await page.getByRole('button', { name: '迎撃', exact: true }).isEnabled()
        ? '迎撃'
        : await page.getByRole('button', { name: '防御', exact: true }).isEnabled()
          ? '防御'
          : '通常攻撃';
    } else if (title === '虚無落雷' || title === '虚核再生') {
      action = await page.getByRole('button', { name: '羽弾', exact: true }).isEnabled()
        ? '羽弾'
        : '通常攻撃';
    } else if (title === 'バーストチャンス') {
      action = await page.getByRole('button', { name: '終天羽星穿ち', exact: true }).isEnabled()
        ? '終天羽星穿ち'
        : '通常攻撃';
    }

    const button = page.getByRole('button', { name: action, exact: true });
    const before = await turnMarker.innerText();
    await button.click();
    await expect(turnMarker).not.toHaveText(before, { timeout: 5_000 });
  }
  await expect(phaseChip).toHaveText('PHASE 02', { timeout: 5_000 });

  // High rolls are safe for a successful counter and deterministically select the last phase-two telegraph.
  await page.evaluate(() => {
    (window as unknown as { __raidRandomValue: number }).__raidRandomValue = 0.99;
  });
  await expect(intent).toHaveText('終焉衝動');
  await page.getByRole('button', { name: '迎撃', exact: true }).click();
  await expect(intent).toHaveText('崩壊連撃');

  // FOCUS is safe during the wind-up and does not consume the BREAK gauge needed for the release counter.
  await page.evaluate(() => {
    (window as unknown as { __raidRandomValue: number }).__raidRandomValue = 0.1;
  });
  const warningTurn = await turnMarker.innerText();
  await page.getByRole('button', { name: '集中', exact: true }).click();
  await expect(turnMarker).not.toHaveText(warningTurn);
  await expect(intent).toHaveText('崩壊連撃・発動直前');
  await expect(page.locator('.raid-v1-intent')).toContainText('次の行動で崩壊連撃が発動');

  const playerHpBeforeCounter = await page.locator('.raid-v1-player-stat .raid-v1-bar-caption strong').innerText();
  const releaseTurn = await turnMarker.innerText();
  await page.getByRole('button', { name: '迎撃', exact: true }).click();
  await expect(turnMarker).not.toHaveText(releaseTurn);
  await expect(page.locator('.raid-v1-outcome')).toContainText('PERFECT READ');
  await expect(page.locator('.raid-v1-player-stat .raid-v1-bar-caption strong')).toHaveText(playerHpBeforeCounter);
  await expect(intent).not.toHaveText('崩壊連撃・発動直前');

  expect(pageErrors, 'Collapse Chain must be resolved without uncaught JavaScript errors.').toEqual([]);
});

test('fresh save starts with 12 points and action controls relock until the turn resolves', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const attackButton = await startFreshBattle(page);
  await attackButton.click();

  // The app must reject additional taps while the current turn is executing.
  await expect(attackButton).toBeDisabled();
  await expect(page.getByText(/^第\s*2\s*ターン$/)).toBeVisible({ timeout: 20_000 });
  await expect(attackButton).toBeEnabled({ timeout: 20_000 });

  expect(pageErrors, 'The page should not raise uncaught JavaScript errors.').toEqual([]);
});

test('leaving during an executing turn cancels the battle and keeps the selection screen active', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const attackButton = await startFreshBattle(page);
  await attackButton.click();
  await expect(attackButton).toBeDisabled();

  await page.getByTitle('戻る').click();
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();

  // Wait past the normal turn animation window to catch stale asynchronous work.
  await page.waitForTimeout(3_000);
  await expect(page.getByRole('button', { name: /バトル開始/ })).toBeVisible();
  await expect(page.getByTitle('戻る')).toHaveCount(0);

  expect(pageErrors, 'Cancelling a battle should not raise uncaught JavaScript errors.').toEqual([]);
});
