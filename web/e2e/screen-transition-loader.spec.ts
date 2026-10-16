import { expect, test } from '@playwright/test';

test('regular screen changes use a dark-only loader, while battle and raid loading stay unchanged', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const loader = page.getByTestId('screen-transition-loader');
  const expectDarkLoader = async () => {
    await expect(loader).toBeVisible();
    await expect(loader.locator('img')).toHaveCount(0);
    await expect(loader).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await expect(loader).not.toContainText('NOW LOADING...');
  };

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await expect(loader).toHaveCount(0);

  // Home -> gacha hub briefly covers the new screen with black only.
  const firstTransitionStartedAt = Date.now();
  await page.getByRole('button', { name: '黒翼召喚を開く' }).click();
  await expectDarkLoader();
  await expect(page.getByRole('heading', { name: 'ガチャ' })).toBeVisible();
  await expect(loader).toBeHidden({ timeout: 5_000 });
  const firstTransitionDuration = Date.now() - firstTransitionStartedAt;
  expect(firstTransitionDuration, 'The short loader should remain visible long enough to read as a transition.')
    .toBeGreaterThanOrEqual(400);
  expect(firstTransitionDuration, 'Ordinary navigation should no longer impose the previous long wait.')
    .toBeLessThan(1_300);

  // Screen-specific asynchronous preparation is still honored, without showing artwork.
  await page.getByRole('button', { name: '権能ガチャを開く' }).click();
  await expectDarkLoader();
  await expect(loader).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: '戻る', exact: true })).toBeVisible();

  // Recruitment -> gacha hub -> home both use the transition overlay.
  await page.getByRole('button', { name: '戻る', exact: true }).click();
  await expectDarkLoader();
  await expect(loader).toBeHidden({ timeout: 5_000 });

  await page.locator('.bottom-navigation').getByRole('button', { name: 'ホーム', exact: true }).click();
  await expectDarkLoader();
  await expect(loader).toBeHidden({ timeout: 5_000 });

  // Developer tools and the existing battle/raid transitions are intentionally excluded.
  await page.getByRole('button', { name: '開発者ツール', exact: true }).click();
  await expect(page.getByRole('heading', { name: '開発者ツール' })).toBeVisible();
  await expect(loader).toHaveCount(0);
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await expect(loader).toHaveCount(0);

  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await expect(loader).toHaveCount(0);
  await page.getByRole('button', { name: '戻る', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();

  await page.getByRole('button', { name: '深淵レイドを開く' }).click();
  await expect(page.getByRole('heading', { name: '戦闘準備完了' })).toBeVisible();
  await expect(loader).toHaveCount(0);

  expect(pageErrors, 'Screen transitions must not raise uncaught browser errors.').toEqual([]);
});
