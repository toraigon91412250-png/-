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
  const battleLog = page.locator('.stella-final__log-lines');
  await expect(battleLog.getByText(/権能「不滅」を発動/)).toBeVisible();
  await expect(page.getByText(/次回使用：第 4 ターン/)).toBeVisible();
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
  await expect(page.locator('.battle-challenge-level-caption')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /戦闘開始/ })).toBeEnabled();
});


test('actual Stella final-battle victory saves +100P once and unlocks only final-battle Irena', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('duel_arena_stella_mode_progress', JSON.stringify({
      isUnlocked: true,
      revealAvailable: false,
      kaiser100RewardClaimed: true,
      exKaiserDefeated: true,
    }));
    window.localStorage.setItem('duel_arena_stat_points', '62');
    window.localStorage.setItem('duel_arena_raid_reward_progress', JSON.stringify({
      coreFragments: 0, imprintTickets: 0, bonusStatPoints: 17, claimedVictoryRunIds: [],
    }));

    // Fail exactly the first +100P write to verify the in-screen retry path after real combat.
    const originalSetItem = Storage.prototype.setItem;
    let failFinalRewardWrite = true;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'duel_arena_stat_points' && value === '162' && failFinalRewardWrite) {
        failFinalRewardWrite = false;
        throw new DOMException('Simulated quota failure', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();

  const characterPicker = page.getByRole('region', { name: '最終決戦の操作キャラクター' });
  await expect(characterPicker.getByRole('button', { name: '最終決戦キャラクター：ステラ' })).toBeVisible();
  await expect(characterPicker.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' })).toHaveCount(0);

  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  const playerHp = page.locator('[role="progressbar"][aria-label="ステラのHP"]');
  const bossHp = page.locator('[role="progressbar"][aria-label="EXカイザーのHP"]');
  const immortal = page.getByRole('button', { name: '不滅を発動' });
  const rebirth = page.getByRole('button', { name: '再誕を発動' });
  const meteor = page.getByRole('button', { name: '天象支配を発動' });
  const attack = page.getByRole('button', { name: '通常攻撃' });
  const victoryHeading = page.getByRole('heading', { name: '最終決戦 勝利' });

  // Drive the actual battle controls. No test-only victory path or state mutation is used.
  for (let step = 0; step < 40; step += 1) {
    if (await victoryHeading.isVisible().catch(() => false)) break;

    const currentBossHp = Number(await bossHp.getAttribute('aria-valuenow'));
    const currentPlayerHp = Number(await playerHp.getAttribute('aria-valuenow'));
    const inFinalPhase = await page.locator('.stella-final__phase').innerText().then(text => text.includes('03'));
    const timerLabel = await page.locator('.stella-final__timer').getAttribute('aria-label').catch(() => null);
    const turnsLeft = timerLabel ? Number(timerLabel.replace('最終形態 残り', '').replace('ターン', '').trim()) : 0;
    const attackLabel = await page.locator('.stella-final__normal-attack').innerText();
    const attackDamage = Number((attackLabel.match(/(\\d[\\d,]*)ダメージ/) || [])[1]?.replace(/,/g, '') || 0);

    if (currentBossHp > 0 && await meteor.isEnabled() && !inFinalPhase) {
      await meteor.click();
    } else if (inFinalPhase && currentPlayerHp <= 420 && await immortal.isEnabled()) {
      await immortal.click();
    } else if (currentPlayerHp <= 1500 && await rebirth.isEnabled()) {
      await rebirth.click();
    } else if (await immortal.isEnabled()) {
      await immortal.click();
    } else if (attackDamage > 0 && currentBossHp > 0) {
      await attack.click();
    } else if (inFinalPhase && turnsLeft > 0) {
      await attack.click();
    } else {
      break;
    }
  }

  await expect(victoryHeading).toBeVisible();
  const rewardSaveError = page.getByRole('alert', { name: '最終決戦報酬の保存エラー' });
  await expect(rewardSaveError).toBeVisible();
  await expect(rewardSaveError).toContainText('保存を再試行');
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('duel_arena_stat_points'))).toBe('62');
  await expect.poll(() => page.evaluate(() => {
    const value = window.localStorage.getItem('duel_arena_stella_mode_progress');
    return value ? JSON.parse(value).finalBattleRewardClaimed : true;
  })).toBe(false);

  // Retry the persistent reward without restarting or replaying the battle.
  await rewardSaveError.getByRole('button', { name: '報酬保存を再試行' }).click();
  const rewardNotice = page.getByRole('status', { name: '最終決戦クリア報酬' });
  await expect(rewardNotice).toContainText('+100P');
  await expect(rewardNotice).toContainText('最終決戦用いれーなが解放');
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('duel_arena_stat_points'))).toBe('162');
  await expect.poll(() => page.evaluate(() => {
    const value = window.localStorage.getItem('duel_arena_stella_mode_progress');
    return value ? JSON.parse(value).finalBattleRewardClaimed : false;
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const value = window.localStorage.getItem('duel_arena_stella_mode_progress');
    return value ? JSON.parse(value).finalBattleCleared : false;
  })).toBe(true);

  // The persisted marker survives a reload and exposes only the dedicated version in this mode.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'バトルアリーナデュエル' })).toBeVisible();
  await page.getByRole('button', { name: 'ステラモードを開く' }).click();
  const unlockedPicker = page.getByRole('region', { name: '最終決戦の操作キャラクター' });
  const finalIrenaChoice = unlockedPicker.getByRole('button', { name: '最終決戦キャラクター：最終決戦用いれーな' });
  await expect(finalIrenaChoice).toBeVisible();
  await finalIrenaChoice.click();
  await expect(finalIrenaChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.stella-final__fighter--stella .stella-final__fighter-name')).toHaveText('最終決戦用いれーな');
  await expect(page.getByText(/仮設定/).first()).toBeVisible();

  await page.getByRole('button', { name: '最終決戦を開始' }).click();
  await expect(page.getByRole('progressbar', { name: '最終決戦用いれーなのHP' })).toHaveAttribute('aria-valuemax', '4000');
  await expect(page.getByRole('button', { name: '通常攻撃' })).toBeEnabled();

  const pickerBox = await unlockedPicker.boundingBox();
  const viewport = page.viewportSize();
  expect(pickerBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(pickerBox!.x).toBeGreaterThanOrEqual(0);
  expect(pickerBox!.x + pickerBox!.width).toBeLessThanOrEqual(viewport!.width + 1);

  // The dedicated version does not enter the normal battle roster.
  await page.getByRole('button', { name: 'ホームに戻る' }).click();
  await page.getByRole('button', { name: /挑戦の準備/ }).click();
  await expect(page.getByRole('heading', { name: 'バトル選択' })).toBeVisible();
  await expect(page.getByRole('region', { name: '操作キャラクター' }).getByRole('button', { name: /最終決戦用いれーな/ })).toHaveCount(0);
});
