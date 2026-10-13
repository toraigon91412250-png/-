import { expect, test } from '@playwright/test';

test('battle setup exposes a separate player character roster and a disabled upcoming slot', async ({ page }) => {
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

  const upcomingCharacter = roster.getByRole('button', { name: '新キャラ準備中' });
  await expect(upcomingCharacter).toBeVisible();
  await expect(upcomingCharacter).toBeDisabled();

  await irena.click();
  await expect(irena).toHaveAttribute('aria-pressed', 'true');
});
