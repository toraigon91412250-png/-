import { expect, test } from '@playwright/test';

test('battle setup exposes a separate playable roster including Stella without adding her to the CPU roster', async ({ page }) => {
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

  const stella = roster.getByRole('button', { name: 'ステラ（仮）、天星の翼' });
  await expect(stella).toBeVisible();
  await expect(stella).toHaveAttribute('aria-pressed', 'false');
  await stella.click();
  await expect(stella).toHaveAttribute('aria-pressed', 'true');
  await expect(irena).toHaveAttribute('aria-pressed', 'false');

  await irena.click();
  await expect(irena).toHaveAttribute('aria-pressed', 'true');
});

test('Stella can start a battle and exposes her own special and ultimate commands', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  const roster = page.getByRole('region', { name: '操作キャラクター' });
  await roster.getByRole('button', { name: 'ステラ（仮）、天星の翼' }).click();
  await page.getByRole('button', { name: '戦闘開始！' }).click();
  await expect(page.getByRole('button', { name: /ステラレイ/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'グランノヴァを発動' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'グランノヴァを発動' })).toBeDisabled();
  await expect(page.getByText('ステラ（仮）', { exact: true }).first()).toBeVisible();
});
