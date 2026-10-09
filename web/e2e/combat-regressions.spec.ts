import { expect, test, type Page } from '@playwright/test';

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

  await expect(page.getByText(/^第\s*1\s*ターン$/)).toBeVisible({ timeout: 20_000 });
  const attackButton = page.locator('button:visible').filter({ hasText: /^攻撃/ }).first();
  await expect(attackButton).toBeEnabled({ timeout: 20_000 });
  return attackButton;
}

test('raid prototype opens independently and resolves a defensive turn on desktop and mobile', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /レイドボスに挑戦/ }).click();

  await expect(page.getByRole('heading', { name: 'アビスコア', exact: true })).toBeVisible();
  await expect(page.getByText('BOSS TELEGRAPH')).toBeVisible();
  await expect(page.getByRole('button', { name: '迎撃' })).toBeEnabled();
  await page.getByRole('button', { name: '防御' }).click();

  await expect(page.getByText('TURN 02')).toBeVisible();
  await expect(page.getByText('防御態勢')).toBeVisible();
  await expect(page.getByText('LAST HIT')).toBeVisible();
  await expect(page.getByText('LAST RECEIVED')).toBeVisible();
  await page.getByTitle('戻る').click();
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();

  expect(pageErrors, 'The raid prototype should not raise uncaught JavaScript errors.').toEqual([]);
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
