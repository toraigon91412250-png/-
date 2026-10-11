import { expect, test } from '@playwright/test';

test('mobile battle keeps primary commands visible while the arena scrolls', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-chromium', 'Mobile layout contract');

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /バトル開始/ }).click();
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
