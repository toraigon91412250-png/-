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

test('unlocked Stella mode opens the dedicated EX Kaiser final battle and all three powers', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true,
      revealAvailable: false,
      kaiser100RewardClaimed: true,
      exKaiserDefeated: true,
    }));
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  await expect(page.getByRole('heading', { name: 'EXカイザー 最終決戦' })).toBeVisible();

  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await expect(page.getByRole('button', { name: '通常攻撃' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '不滅を発動' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '再誕を発動' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '天象支配を発動' })).toBeEnabled();

  await page.getByRole('button', { name: '不滅を発動' }).click();
  await expect(page.getByText(/不滅.*完全無敵/)).toBeVisible();
});

test('Lv.100 reward opens EX Kaiser challenge before the hidden Stella entrance', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: false,
      exKaiserDefeated: false,
      revealAvailable: false,
      kaiser100RewardClaimed: true,
    }));
    window.localStorage.setItem('duel_arena_kaiser_challenge_progress', JSON.stringify({ unlockedLevel: 100 }));
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'EXカイザーに挑む' }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'EXカイザー挑戦' })).toContainText('全戦闘ステータスが2倍');
  await expect(page.getByRole('button', { name: /戦闘開始/ })).toBeEnabled();
});
