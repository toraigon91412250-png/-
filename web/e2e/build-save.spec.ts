import { expect, test } from '@playwright/test';

test('named builds save, rename, overwrite, load, and delete the combined battle loadout', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_ability_progress', JSON.stringify({
      levels: { ABYSS: 1, FALLEN: 0, BLACK_WING: 1, FALLEN_KING: 0, JUDGMENT: 0 },
      shards: { ABYSS: 0, FALLEN: 0, BLACK_WING: 0, FALLEN_KING: 0, JUDGMENT: 0 },
    }));
    window.localStorage.setItem('duel_arena_imprint_progress', JSON.stringify({
      unlockedIds: ['FORESIGHT', 'FEATHER_SPLIT'],
      equippedIds: ['FORESIGHT', 'FEATHER_SPLIT'],
    }));
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();

  await page.getByRole('button', { name: /深淵/ }).click();
  await page.getByRole('button', { name: /黒翼/ }).click();
  await page.getByRole('button', { name: 'HPを1P増やす' }).click();
  await page.getByRole('button', { name: 'HPを1P増やす' }).click();

  await page.getByLabel('新しいビルド名').fill('先手型');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('heading', { name: '先手型', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('ビルドを保存しました。');

  await page.getByRole('button', { name: '名前変更', exact: true }).click();
  await page.getByLabel('ビルド名', { exact: true }).last().fill('先手・黒翼');
  await page.getByRole('button', { name: '名前を保存' }).click();
  await expect(page.getByRole('heading', { name: '先手・黒翼', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '攻撃力を1P増やす' }).click();
  await page.getByRole('button', { name: '上書き', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('現在の構成で上書きしました');

  await page.getByRole('button', { name: 'HPを1P減らす' }).click();
  await page.getByRole('button', { name: '読み込む', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('を読み込みました。');
  await expect(page.getByText(/3P使用中/)).toBeVisible();

  await expect.poll(() => page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem('duel_arena_imprint_progress') || '{}');
    const saves = JSON.parse(window.localStorage.getItem('duel_arena_build_saves_v1') || '{}');
    return {
      equippedIds: progress.equippedIds,
      savedName: saves.saves?.[0]?.name,
      allocation: saves.saves?.[0]?.snapshot?.statAllocation,
      abilities: saves.saves?.[0]?.snapshot?.abilityIds,
      imprints: saves.saves?.[0]?.snapshot?.imprintIds,
    };
  })).toEqual({
    equippedIds: ['FORESIGHT', 'FEATHER_SPLIT'],
    savedName: '先手・黒翼',
    allocation: { maxHp: 2, attack: 1, defense: 0, speed: 0 },
    abilities: ['ABYSS', 'BLACK_WING'],
    imprints: ['FORESIGHT', 'FEATHER_SPLIT'],
  });

  await page.getByRole('button', { name: '削除', exact: true }).click();
  await page.getByRole('button', { name: '削除を確定' }).click();
  await expect(page.getByText(/保存済みビルドはありません/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem('duel_arena_imprint_progress') || '{}');
    const builds = JSON.parse(window.localStorage.getItem('duel_arena_build_saves_v1') || '{}');
    return {
      imprintOwnership: progress.unlockedIds,
      equippedIds: progress.equippedIds,
      buildCount: builds.saves?.length,
    };
  })).toEqual({
    imprintOwnership: ['FORESIGHT', 'FEATHER_SPLIT'],
    equippedIds: ['FORESIGHT', 'FEATHER_SPLIT'],
    buildCount: 0,
  });

  expect(pageErrors, 'Build save actions should not raise uncaught browser errors.').toEqual([]);
});
