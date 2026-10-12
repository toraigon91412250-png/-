import { expect, test } from '@playwright/test';

test('regular screen changes show loading artwork, while developer tools, battle setup, and raid stay unchanged', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const loader = page.getByTestId('screen-transition-loader');

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await expect(loader).toHaveCount(0);

  // Home -> gacha hub uses the first dedicated loading illustration for roughly 1.8 seconds.
  const firstTransitionStartedAt = Date.now();
  await page.getByRole('button', { name: 'ガチャ', exact: true }).click();
  await expect(loader).toBeVisible();
  await expect(loader).toHaveAttribute('data-screen-transition-art', 'IMG_1177.jpeg');
  await expect(page.getByRole('heading', { name: 'ガチャ' })).toBeVisible();
  await expect(loader).toBeHidden({ timeout: 5_000 });
  expect(Date.now() - firstTransitionStartedAt, 'The standard screen loader should remain visible for its 1.8-second minimum duration.')
    .toBeGreaterThanOrEqual(1_700);

  // The recruitment transition waits for its summon artwork to preload.
  await page.getByRole('button', { name: '権能ガチャを開く' }).click();
  await expect(loader).toBeVisible();
  await expect(loader).toHaveAttribute('data-screen-transition-art', 'IMG_1176.jpeg');
  await expect(loader).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: '戻る', exact: true })).toBeVisible();

  // Recruitment -> gacha hub -> home both use the transition overlay.
  await page.getByRole('button', { name: '戻る', exact: true }).click();
  await expect(loader).toBeVisible();
  await expect(loader).toHaveAttribute('data-screen-transition-art', 'IMG_1178.jpeg');
  await expect(loader).toBeHidden({ timeout: 5_000 });

  await page.getByRole('button', { name: 'ホーム', exact: true }).click();
  await expect(loader).toBeVisible();
  await expect(loader).toHaveAttribute('data-screen-transition-art', 'IMG_1179.jpeg');
  await expect(loader).toBeHidden({ timeout: 5_000 });

  // Developer tools and the existing battle/raid transitions are intentionally excluded.
  await page.getByRole('button', { name: '開発者ツール', exact: true }).click();
  await expect(page.getByRole('heading', { name: '開発者ツール' })).toBeVisible();
  await expect(loader).toHaveCount(0);
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await expect(loader).toHaveCount(0);

  await page.getByRole('button', { name: '戦闘', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await expect(loader).toHaveCount(0);
  await page.getByRole('button', { name: '戻る', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();

  await page.getByRole('button', { name: 'レイド', exact: true }).click();
  await expect(page.getByRole('heading', { name: '戦闘準備完了' })).toBeVisible();
  await expect(loader).toHaveCount(0);

  expect(pageErrors, 'Screen transitions must not raise uncaught browser errors.').toEqual([]);
});
