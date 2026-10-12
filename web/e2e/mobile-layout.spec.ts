import { expect, test } from '@playwright/test';

test('mobile battle keeps primary commands visible while the arena scrolls', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-chromium', 'Mobile layout contract');

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await page.getByRole('button', { name: /戦闘開始/ }).click();

  const deployOverlay = page.getByRole('status', { name: '戦闘出撃中' });
  await expect(deployOverlay).toBeHidden({ timeout: 10_000 });
  await expect(page.getByText(/^第\s*1\s*ターン$/)).toBeVisible({ timeout: 20_000 });

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  const arena = page.locator('.battle-mobile-scroll');
  const actionArea = page.locator('.battle-mobile-action-area');
  const attackButton = page.locator('.battle-action-dock button:visible').filter({ hasText: /^攻撃/ }).first();

  await expect(arena).toBeVisible();
  await expect(actionArea).toBeVisible();
  await expect(attackButton).toBeVisible();

  const arenaBox = await arena.boundingBox();
  const actionBox = await actionArea.boundingBox();
  const attackBefore = await attackButton.boundingBox();
  expect(arenaBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(attackBefore).not.toBeNull();

  expect(arenaBox!.y + arenaBox!.height).toBeLessThanOrEqual(actionBox!.y + 1);
  expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(viewport!.height + 1);
  expect(attackBefore!.y).toBeGreaterThanOrEqual(actionBox!.y);
  expect(attackBefore!.y + attackBefore!.height).toBeLessThanOrEqual(viewport!.height + 1);

  await arena.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const attackAfter = await attackButton.boundingBox();
  expect(attackAfter).not.toBeNull();
  expect(Math.abs(attackAfter!.y - attackBefore!.y)).toBeLessThan(2);
});

test('mobile pages permit browser zoom for accessibility', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-chromium', 'Mobile viewport setting');
  await page.goto('/');
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).not.toContain('user-scalable=no');
  expect(viewport).not.toMatch(/maximum-scale\s*=\s*1(?:\.0)?/);
});

test('mobile battle setup keeps the start action anchored and stat controls easy to tap', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-chromium', 'Mobile layout contract');

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  const root = page.locator('.battle-setup-screen');
  const footer = page.locator('.battle-setup-action-footer');
  const startButton = page.locator('.battle-setup-start-button');
  await expect(footer).toBeVisible();
  await expect(startButton).toBeVisible();

  const footerBefore = await footer.boundingBox();
  const startBefore = await startButton.boundingBox();
  expect(footerBefore).not.toBeNull();
  expect(startBefore).not.toBeNull();
  expect(footerBefore!.y + footerBefore!.height).toBeLessThanOrEqual(viewport!.height + 1);
  expect(startBefore!.y).toBeGreaterThanOrEqual(footerBefore!.y);
  expect(startBefore!.y + startBefore!.height).toBeLessThanOrEqual(viewport!.height + 1);

  const hpPlus = page.getByRole('button', { name: 'HPを1P増やす' });
  const hpPlusBox = await hpPlus.boundingBox();
  expect(hpPlusBox).not.toBeNull();
  expect(hpPlusBox!.width).toBeGreaterThanOrEqual(44);
  expect(hpPlusBox!.height).toBeGreaterThanOrEqual(44);

  await root.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const footerAfter = await footer.boundingBox();
  const startAfter = await startButton.boundingBox();
  expect(footerAfter).not.toBeNull();
  expect(startAfter).not.toBeNull();
  expect(Math.abs(footerAfter!.y - footerBefore!.y)).toBeLessThan(2);
  expect(Math.abs(startAfter!.y - startBefore!.y)).toBeLessThan(2);
});


test('mobile setup layout fits narrow portrait and short landscape viewports', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-chromium', 'Mobile viewport contract');

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/');
  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();

  const root = page.locator('.battle-setup-screen');
  const footer = page.locator('.battle-setup-action-footer');
  const startButton = page.locator('.battle-setup-start-button');
  const hpPlus = page.getByRole('button', { name: 'HPを1P増やす' });

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 667, height: 375 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(footer).toBeVisible();
    await expect(startButton).toBeVisible();

    const rootBox = await root.boundingBox();
    const footerBox = await footer.boundingBox();
    const startBox = await startButton.boundingBox();
    expect(rootBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    expect(startBox).not.toBeNull();

    expect(footerBox!.x).toBeGreaterThanOrEqual(-1);
    expect(footerBox!.x + footerBox!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(startBox!.y).toBeGreaterThanOrEqual(footerBox!.y);
    expect(startBox!.y + startBox!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(rootBox!.width).toBeLessThanOrEqual(viewport.width + 1);

    const hpPlusBox = await hpPlus.boundingBox();
    expect(hpPlusBox).not.toBeNull();
    expect(hpPlusBox!.width).toBeGreaterThanOrEqual(44);
    expect(hpPlusBox!.height).toBeGreaterThanOrEqual(44);
  }
});

test('mobile bottom navigation removes unused space below the tabs', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-chromium', 'Mobile bottom navigation contract');

  await page.goto('/');

  const navigation = page.getByRole('navigation', { name: 'メインナビゲーション' });
  await expect(navigation).toBeVisible();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  const navigationBox = await navigation.boundingBox();
  expect(navigationBox).not.toBeNull();
  expect(navigationBox!.height).toBeLessThanOrEqual(72);
  expect(navigationBox!.y + navigationBox!.height).toBeLessThanOrEqual(viewport!.height + 1);

  for (const label of ['ホーム', '強化', 'ガチャ', '戦闘', 'レイド']) {
    await expect(navigation.getByRole('button', { name: label })).toBeVisible();
  }
});

test('home dashboard exposes its main routes and remains usable on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');

  const home = page.locator('.home-dashboard');
  await expect(home).toBeVisible();
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'カイザー最終試練' })).toBeVisible();
  await expect(page.getByRole('button', { name: /挑戦の準備/ })).toBeVisible();
  await expect(home.locator('.home-dashboard__primary-copy strong')).toHaveText('挑戦の準備');
  await expect(home.locator('.home-dashboard__content-value')).toHaveCount(0);

  await expect(page.getByRole('heading', { name: '強化メニューをひとつに集約' })).toBeVisible();
  await expect(page.getByRole('button', { name: '強化を開く' })).toBeVisible();
  await expect(page.getByRole('button', { name: '黒翼召喚を開く' })).toBeVisible();
  await expect(page.getByRole('button', { name: '深淵レイドを開く' })).toBeVisible();
  await expect(home.locator('.home-dashboard__growth-grid')).toHaveCount(0);
  await expect(home.locator('.home-dashboard__content-grid')).toHaveCount(0);

  const homeHasHorizontalOverflow = await page.evaluate(() => {
    const dashboard = document.querySelector('.home-dashboard');
    return document.documentElement.scrollWidth > window.innerWidth
      || document.body.scrollWidth > window.innerWidth
      || Boolean(dashboard && dashboard.scrollWidth > dashboard.clientWidth + 1);
  });
  expect(homeHasHorizontalOverflow).toBe(false);

  const navigation = page.getByRole('navigation', { name: 'メインナビゲーション' });
  await navigation.getByRole('button', { name: '強化' }).click();
  const growthHub = page.locator('.growth-hub');
  await expect(growthHub).toBeVisible();
  for (const label of [
    'ステータス配分を開く',
    '堕天の才能盤を開く',
    '技の強化を開く',
    '黒翼召喚で権能・欠片を集める',
    '管理する',
  ]) {
    await expect(growthHub.getByRole('button', { name: label })).toBeVisible();
  }

  const hasHorizontalOverflow = await page.evaluate(() => {
    const dashboard = document.querySelector('.home-dashboard');
    const growth = document.querySelector('.growth-hub');
    return document.documentElement.scrollWidth > window.innerWidth
      || document.body.scrollWidth > window.innerWidth
      || Boolean(dashboard && dashboard.scrollWidth > dashboard.clientWidth + 1)
      || Boolean(growth && growth.scrollWidth > growth.clientWidth + 1);
  });
  expect(hasHorizontalOverflow).toBe(false);

  await navigation.getByRole('button', { name: 'ガチャ' }).click();
  await expect(page.getByRole('heading', { name: 'ガチャ' })).toBeVisible();
  await navigation.getByRole('button', { name: 'ホーム' }).click();
  await expect(home).toBeVisible();
  await expect(navigation).toBeVisible();
});
