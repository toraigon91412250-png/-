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

test('unlocked Stella mode opens a Stella-only battle and exposes her special and ultimate commands', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true,
      revealAvailable: false,
      kaiser100RewardClaimed: true,
    }));
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();

  const roster = page.getByRole('region', { name: '操作キャラクター' });
  await expect(roster.getByRole('button', { name: 'ステラ（仮）、天星の翼' })).toBeVisible();
  await expect(roster.getByRole('button', { name: 'いれーな、風詠の射手' })).toHaveCount(0);

  await page.getByRole('button', { name: '戦闘開始！' }).click();
  await expect(page.getByRole('button', { name: /ステラレイ/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'グランノヴァを発動' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'グランノヴァを発動' })).toBeDisabled();
  await expect(page.getByText('ステラ（仮）', { exact: true }).first()).toBeVisible();
});
