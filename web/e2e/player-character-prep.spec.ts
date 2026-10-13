import { expect, test } from '@playwright/test';

test('the new player-only character can be selected and enters battle with her own skills', async ({ page }) => {
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
  const stella = roster.getByRole('button', { name: 'ステラ（仮）、星詠の翼姫' });
  await expect(irena).toHaveAttribute('aria-pressed', 'true');
  await expect(stella).toBeVisible();
  await expect(stella).toHaveAttribute('aria-pressed', 'false');
  await expect(roster.getByRole('button', { name: '新キャラ準備中' })).toHaveCount(0);

  await stella.click();
  await expect(stella).toHaveAttribute('aria-pressed', 'true');
  await expect(irena).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('権能選択', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '戦闘開始！' }).click();
  await expect(page.getByText('ステラ（仮）', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'グランノヴァを発動' })).toBeVisible();
  await expect(page.getByText(/ステラレイ/)).toBeVisible();
  await expect(page.getByText('固有: 天星の加護')).toBeVisible();

  await page.getByRole('button', { name: /ステラレイ/ }).click();
  await expect(page.getByRole('button', { name: /星蝕 \d+ターンの詳細を表示/ })).toBeVisible();
});
