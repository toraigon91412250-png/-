import { expect, test } from '@playwright/test';

test('growth tab centralizes progression controls without removing raid reward access', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  const navigation = page.locator('.bottom-navigation');
  await expect(navigation.getByRole('button', { name: '強化', exact: true })).toBeVisible();
  await navigation.getByRole('button', { name: '強化', exact: true }).click();

  await expect(page.getByRole('heading', { name: '強化', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'キャラクター育成' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '権能育成' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '刻印編成' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '深淵核片' })).toBeVisible();

  await expect(page.getByRole('button', { name: 'ステータス配分を開く' })).toBeVisible();
  await expect(page.getByRole('button', { name: '堕天の才能盤を開く' })).toBeVisible();
  await expect(page.getByRole('button', { name: '技の強化を開く' })).toBeVisible();
  await expect(page.getByRole('button', { name: '黒翼召喚で権能・欠片を集める' })).toBeVisible();
  await expect(page.getByRole('button', { name: '管理する' })).toBeVisible();

  const coreAction = page.locator('.growth-hub__core-card > button');
  await expect(coreAction).toBeDisabled();
  await expect(coreAction).toHaveText('素材不足');
  expect(pageErrors).toEqual([]);
});
