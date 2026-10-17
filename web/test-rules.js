import assert from 'assert';
import { register } from 'node:module';
import { readFile } from 'node:fs/promises';
import { BATTLE_CHALLENGE_LEVELS, getEffectiveSpeed, getEffectiveAttack, getEffectiveDefense, STATUS_AILMENTS } from './src/types/game.ts';
import {
  applyDynamicAbilityModifiers,
  applyStaticAbilityModifiers,
  applyPassiveDamageReduction,
  createBattleCharacters,
  createKaiserForLevel,
  getJudgmentDamageMultiplier,
  getJudgmentDefenseIgnore,
  getJudgmentThreshold,
  getAchievementBadgeDamageMultiplier,
} from './src/utils/abilitySystem.ts';
import { createInitialFighter } from './src/hooks/useBattleGame.ts';
import { calculateHitDamagePreview, calculateNormalAttackDamage, calculateSpecialDamage, calculateUltimateDamage } from './src/utils/battleMath.ts';
import { applyStatAllocation, createStatPreset, getAbilityBuildMatchPercent, getRemainingStatPoints } from './src/utils/statBuild.ts';

register(
  'data:text/javascript,' + encodeURIComponent(`
    export async function load(url, context, nextLoad) {
      if (/\.(?:jpe?g|png|svg)$/i.test(new URL(url).pathname)) {
        return { format: 'module', source: 'export default "";', shortCircuit: true };
      }
      return nextLoad(url, context);
    }
  `),
  { parentURL: import.meta.url }
);

const { IRENA, KAISER, STELLA, PLAYER_CHARACTERS, CPU_CHARACTERS, getIrenaWithSkillProgress, getPlayerCharacterById } = await import('./src/data/characters.ts');
const { STELLA_FINAL_BATTLE_TUNING, STELLA_FINAL_BATTLE_IMAGES } = await import('./src/data/stellaFinalBattleConfig.ts');
const { getShortIrenaFinalTurnLimit } = await import('./src/utils/shortIrenaFinalBattle.ts');
const { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_BADGE_DEFINITIONS, INITIAL_ACHIEVEMENT_PROGRESS, buildAchievementBadgeProgress, completeAchievementIds, getAchievementMetricValue, getAchievementBadgeTier, markAllAchievementsForDeveloper, normalizeAchievementProgress, recordAchievementBattle } = await import('./src/utils/achievementSystem.ts');
const { ABILITY_DEFINITIONS } = await import('./src/data/abilities.ts');
const { CRAFTABLE_RESONANCE_ABILITY_IDS, RESONANCE_DEFINITIONS, RESONANCE_UPGRADE_COSTS } = await import('./src/data/resonanceAbilities.ts');
const {
  getFallenGodRevivalHpFraction,
  getFallenGodStatMultiplier,
  getResonanceFeatherMultiplier,
  getResonanceExecutionStats,
  getTurnErosionRate,
  getHighestTurnErosionRate,
  getFeatherErosionRate,
} = await import('./src/utils/resonanceSystem.ts');
const { IMPRINT_DEFINITIONS: ACHIEVEMENT_IMPRINT_DEFINITIONS } = await import('./src/data/imprints.ts');
const { RECRUITMENT_REWARDS } = await import('./src/data/recruitment.ts');

// Final-duel tuning is isolated from the main Kaiser challenge and now uses doubled boss durability/pressure.
assert.strictEqual(STELLA_FINAL_BATTLE_TUNING.bossMaxHp, 30000);
assert.deepStrictEqual(STELLA_FINAL_BATTLE_TUNING.phaseCounterDamage, { 1: 440, 2: 640, 3: 880 });
assert.strictEqual(STELLA_FINAL_BATTLE_TUNING.fighters.stella.normalAttackDamage, 2000);
assert.strictEqual(STELLA_FINAL_BATTLE_TUNING.meteorDamage, 5000);

const expectedResonanceRecipes = [
  ['FALLEN_GOD', ['FALLEN', 'FALLEN_KING']],
  ['FALLEN_WING', ['FALLEN', 'BLACK_WING']],
  ['FALLEN_JUDGMENT', ['FALLEN', 'JUDGMENT']],
  ['ABYSS_FALLEN', ['FALLEN', 'ABYSS']],
  ['KING_WING', ['FALLEN_KING', 'BLACK_WING']],
  ['KING_JUDGMENT', ['FALLEN_KING', 'JUDGMENT']],
  ['ABYSS_KING', ['FALLEN_KING', 'ABYSS']],
  ['JUDGMENT_WING', ['BLACK_WING', 'JUDGMENT']],
  ['ABYSS_WING', ['BLACK_WING', 'ABYSS']],
  ['ABYSS_JUDGMENT', ['ABYSS', 'JUDGMENT']],
];
assert.strictEqual(RESONANCE_DEFINITIONS.length, 10, 'Exactly ten resonance powers must be registered.');
assert.deepStrictEqual(CRAFTABLE_RESONANCE_ABILITY_IDS, [
  'FALLEN_GOD', 'FALLEN_WING', 'ABYSS_KING', 'JUDGMENT_WING', 'ABYSS_JUDGMENT',
], 'Only the five selected resonance powers should be craftable through normal progression.');
assert.deepStrictEqual(RESONANCE_UPGRADE_COSTS, [0, 40, 80, 120, 160]);
assert.deepStrictEqual(
  RESONANCE_DEFINITIONS.map(definition => [definition.id, [...definition.ingredients].sort()]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  expectedResonanceRecipes.map(([id, ingredients]) => [id, [...ingredients].sort()]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  'Every order-independent recipe must use exactly the requested base powers.',
);
assert.strictEqual(new Set(RESONANCE_DEFINITIONS.map(definition => [...definition.ingredients].sort().join('+'))).size, 10,
  'No two resonance recipes may share the same unordered ingredient pair.');
assert.ok(RESONANCE_DEFINITIONS.every(definition => definition.levelDescriptions.length === 5 && definition.levelDescriptions.every(Boolean)),
  'Every resonance power must describe levels 1 through 5.');
assert.ok(RESONANCE_DEFINITIONS.every(definition => !definition.ingredients.includes('ASTRAL_DOMINION')),
  'The achievement authority cannot be a resonance ingredient.');
assert.deepStrictEqual(
  [0, 1, 2, 3, 4, 5, 6].map(index => getFallenGodRevivalHpFraction(5, index)),
  [.5, .25, .05, 0, 0, 0, 0],
  'Fallen God Lv5 must have exactly the specified seven death-save stages.',
);
assert.deepStrictEqual(
  [1, 2, 3, 4, 5].map(level => getFallenGodStatMultiplier(level, 3)),
  [2.5, 2.9, 3.3, 3.65, 4],
  'Fallen God HP1 multipliers must match the five-level table.',
);
assert.deepStrictEqual(
  [1, 2, 3, 4, 5].map(level => getResonanceFeatherMultiplier('JUDGMENT_WING', level)),
  [6, 8, 10, 12, 15],
  'Judgment Wing must replace Black Wing’s x5 multiplier with the requested final values.',
);
assert.deepStrictEqual(
  [1, 2, 3, 4, 5].map(level => getTurnErosionRate('ABYSS_JUDGMENT', level, 1)),
  [6, 8, 10, 12, 15],
);
assert.strictEqual(
  getHighestTurnErosionRate([
    { id: 'ABYSS_FALLEN', level: 5 },
    { id: 'ABYSS_WING', level: 5 },
    { id: 'ABYSS_JUDGMENT', level: 5 },
  ], 0.06),
  45,
  'Fused powers that replace the same inherited Abyss turn erosion must not stack that effect repeatedly.',
);
assert.deepStrictEqual(
  [1, 2, 3, 4, 5].map(level => getFeatherErosionRate('ABYSS_WING', level)),
  [5, 7, 9, 12, 15],
);
assert.deepStrictEqual(
  [1, 2, 3, 4, 5].map(level => getResonanceExecutionStats('ABYSS_JUDGMENT', level).threshold),
  [20, 16, 12, 9, 6],
);
assert.deepStrictEqual(
  [1, 2, 3, 4, 5].map(level => getResonanceExecutionStats('ABYSS_JUDGMENT', level).overflowMultiplierCap),
  [.5, .75, 1, 1.5, 2],
);
console.log('✓ Ten resonance recipes, forbidden ingredient, all-level descriptions, fusion cost, revival, feather, erosion, and execution tables verified.');

assert.strictEqual(ABILITY_DEFINITIONS.some(ability => ability.id === 'ASTRAL_DOMINION'), true);
assert.strictEqual(RECRUITMENT_REWARDS.some(reward => reward.abilityId === 'ASTRAL_DOMINION'), false,
  'The ultimate achievement authority must not leak into the regular summon pool.');
const astralMaxLevelIrena = applyStaticAbilityModifiers(IRENA, {
  kaiserLevel: 10,
  abilities: [{ id: 'ASTRAL_DOMINION', level: 5 }],
  imprints: [],
});
assert.strictEqual(astralMaxLevelIrena.maxHp, Math.round(IRENA.maxHp * 1.8));
assert.strictEqual(astralMaxLevelIrena.attack, Math.round(IRENA.attack * 1.8));
assert.strictEqual(astralMaxLevelIrena.defense, Math.round(IRENA.defense * 1.8));
assert.strictEqual(astralMaxLevelIrena.speed, Math.round(IRENA.speed * 1.8));
assert.strictEqual(astralMaxLevelIrena.specialSkillDamage, Math.round(IRENA.specialSkillDamage * 1.8 * 1.5));
assert.strictEqual(astralMaxLevelIrena.ultimateSkillDamage, Math.round(IRENA.ultimateSkillDamage * 1.8 * 1.5));
assert.strictEqual(ACHIEVEMENT_IMPRINT_DEFINITIONS.length, 10);
assert.strictEqual(ACHIEVEMENT_IMPRINT_DEFINITIONS.some(imprint => imprint.id === 'LAST_STAND'), true);
assert.strictEqual(ACHIEVEMENT_IMPRINT_DEFINITIONS.some(imprint => imprint.id === 'STARFALL'), true);
assert.strictEqual(new Set(ACHIEVEMENT_DEFINITIONS.map(achievement => achievement.id)).size, ACHIEVEMENT_DEFINITIONS.length,
  'Achievement IDs must stay unique so rewards cannot collide.');
assert.ok(ACHIEVEMENT_DEFINITIONS.length >= 30, 'The achievement archive should contain long-term and high-difficulty goals.');
const cleanVictorySample = {
  playerWon: true,
  kaiserLevel: 10,
  challengeMode: 'NORMAL',
  turnNumber: 4,
  playerHp: 100,
  playerMaxHp: 100,
  actionsTaken: ['ATTACK'],
  abilities: [],
  equippedImprints: [],
  usedImprints: [],
  logLines: [],
  difficulty: 'NORMAL',
};
const firstAchievementWin = recordAchievementBattle(INITIAL_ACHIEVEMENT_PROGRESS, cleanVictorySample);
assert.strictEqual(firstAchievementWin.currentWinStreak, 1);
assert.strictEqual(firstAchievementWin.quickWins, 1);
assert.strictEqual(firstAchievementWin.noAbilityWins, 1);
assert.strictEqual(firstAchievementWin.noSpecialUltimateWins, 1);
assert.strictEqual(firstAchievementWin.noImprintWins, 1);
assert.ok(firstAchievementWin.wonKaiserLevels.includes(10));
const afterLoss = recordAchievementBattle(firstAchievementWin, { ...cleanVictorySample, playerWon: false, turnNumber: 12 });
assert.strictEqual(afterLoss.currentWinStreak, 0, 'A defeat must break the active achievement win streak.');
assert.strictEqual(afterLoss.bestWinStreak, 1, 'The best streak must remain after a defeat.');
const allAchievementIdsForDev = markAllAchievementsForDeveloper(INITIAL_ACHIEVEMENT_PROGRESS);
assert.strictEqual(allAchievementIdsForDev.completedIds.length, ACHIEVEMENT_DEFINITIONS.length);
assert.strictEqual(normalizeAchievementProgress({ claimedRewardIds: ['unknown-id'] }).claimedRewardIds.length, 0,
  'Unknown achievement IDs cannot create claimable rewards.');
assert.strictEqual(ACHIEVEMENT_BADGE_DEFINITIONS.length, 3, 'There must be exactly three achievement badges.');
assert.deepStrictEqual(ACHIEVEMENT_BADGE_DEFINITIONS.map(badge => badge.achievementIds.length), [12, 12, 12]);
const assignedBadgeAchievementIds = ACHIEVEMENT_BADGE_DEFINITIONS.flatMap(badge => badge.achievementIds);
assert.strictEqual(new Set(assignedBadgeAchievementIds).size, 36, 'Each existing achievement must belong to exactly one badge.');
assert.deepStrictEqual(
  [...assignedBadgeAchievementIds].sort(),
  ACHIEVEMENT_DEFINITIONS.map(achievement => achievement.id).sort(),
  'Badge branches must cover all existing achievements without adding or omitting any.',
);
const badgeTierOne = completeAchievementIds(INITIAL_ACHIEVEMENT_PROGRESS, ACHIEVEMENT_BADGE_DEFINITIONS[0].achievementIds.slice(0, 3));
const badgeTierTwo = completeAchievementIds(badgeTierOne, ACHIEVEMENT_BADGE_DEFINITIONS[0].achievementIds.slice(3, 5));
const badgeTierThree = completeAchievementIds(badgeTierTwo, ACHIEVEMENT_BADGE_DEFINITIONS[0].achievementIds.slice(5, 8));
assert.strictEqual(getAchievementBadgeTier('A', INITIAL_ACHIEVEMENT_PROGRESS), 0);
assert.strictEqual(buildAchievementBadgeProgress(badgeTierOne).find(badge => badge.id === 'A').tier, 1);
assert.strictEqual(buildAchievementBadgeProgress(badgeTierTwo).find(badge => badge.id === 'A').tier, 2);
assert.strictEqual(buildAchievementBadgeProgress(badgeTierThree).find(badge => badge.id === 'A').tier, 3);
assert.strictEqual(getAchievementBadgeTier('A', badgeTierThree), 3);

// The final-form deadline is fixed to 8–10 turns and is independent of
// allocated/effective speed, including extreme speed multipliers.
assert.strictEqual(getShortIrenaFinalTurnLimit(0), 8);
assert.strictEqual(getShortIrenaFinalTurnLimit(0.5), 9);
assert.strictEqual(getShortIrenaFinalTurnLimit(0.999), 10);
assert.strictEqual(getShortIrenaFinalTurnLimit(1), 10);
const shortIrenaTimerBattleSource = await readFile(new URL('./src/components/StellaFinalBattleScreen.tsx', import.meta.url), 'utf8');
assert.strictEqual(
  (shortIrenaTimerBattleSource.match(/getShortIrenaFinalTurnLimit\(Math\.random\(\)\)/g) ?? []).length,
  2,
  'Both final-phase entry paths must use the same speed-independent timer rule.',
);
assert.doesNotMatch(shortIrenaTimerBattleSource, /speedExtraTurns|速度240超過分は最大\+5ターン|速度配分による猶予/,
  'Speed must not grant extra final-phase turns in code or player-facing rules.');
assert.match(shortIrenaTimerBattleSource, /<h3>不滅<\/h3><p>このターンの反撃を完全無効化。再使用まで3ターン。<\/p>/,
  'Stella’s Immortal authority explains its turn protection and reuse interval before activation.');
assert.match(shortIrenaTimerBattleSource, /<span><Swords size=\{17\} \/> 通常攻撃\{battle\.fighterId === 'stella' && <small>\{fighter\.normalAttackDamage\.toLocaleString\('ja-JP'\)\} ダメージ<\/small>\}<\/span>/,
  'Stella’s fixed normal-attack damage is displayed, without showing a misleading fixed value for Short Duel Irena.');

assert.match(shortIrenaTimerBattleSource, /<h3>再誕<\/h3><p>使用回数に応じて最大HPの100%・50%・25%分を回復（HP上限まで）。<\/p>/,
  'Stella’s Rebirth authority explains the diminishing healing and HP cap before activation.');
assert.match(shortIrenaTimerBattleSource, /<h3>天象支配<\/h3><p>巨大隕石で5,000ダメージ。戦闘中1回。<\/p>/,
  'Stella’s Stellar Dominion explains its fixed damage and one-use limit before activation.');
const regularIrenaSnapshot = {
  maxHp: IRENA.maxHp,
  attack: IRENA.attack,
  defense: IRENA.defense,
  speed: IRENA.speed,
  specialSkillDamage: IRENA.specialSkillDamage,
  ultimateSkillDamage: IRENA.ultimateSkillDamage,
};
assert.notStrictEqual(STELLA_FINAL_BATTLE_TUNING.fighters['short-irena'], IRENA);
assert.strictEqual(STELLA_FINAL_BATTLE_TUNING.fighters['short-irena'].id, 'short-irena');
assert.strictEqual(STELLA_FINAL_BATTLE_TUNING.fighters['short-irena'].isPrototype, true);
assert.deepStrictEqual(
  [
    STELLA_FINAL_BATTLE_TUNING.fighters['short-irena'].maxHp,
    STELLA_FINAL_BATTLE_TUNING.fighters['short-irena'].attack,
    STELLA_FINAL_BATTLE_TUNING.fighters['short-irena'].defense,
    STELLA_FINAL_BATTLE_TUNING.fighters['short-irena'].speed,
    STELLA_FINAL_BATTLE_TUNING.fighters['short-irena'].evasionRate,
  ],
  [IRENA.maxHp, IRENA.attack, IRENA.defense, IRENA.speed, IRENA.evasionRate],
  'Short Duel Irena base stats must match normal Irena before her isolated allocation.',
);
assert.deepStrictEqual(
  [
    STELLA_FINAL_BATTLE_IMAGES.irenaGodPortrait,
    STELLA_FINAL_BATTLE_IMAGES.irenaDemonPortrait,
    STELLA_FINAL_BATTLE_IMAGES.irenaDemonAttackCutIn,
    STELLA_FINAL_BATTLE_IMAGES.irenaGodFinalFinisher,
    STELLA_FINAL_BATTLE_IMAGES.irenaDemonFinalFinisher,
  ],
  ['', '', '', '', ''],
  'Asset imports must resolve to bundled URL strings in the test module loader.',
);
const stellaFinalBattleConfigSource = await readFile(new URL('./src/data/stellaFinalBattleConfig.ts', import.meta.url), 'utf8');
assert.match(stellaFinalBattleConfigSource, /import irenaDemonAttackCutIn from '\.\.\/assets\/IMG_1195\.jpeg';/,
  'The fallen-side normal attack cut-in uses the intended IMG_1195.jpeg artwork.');
assert.match(stellaFinalBattleConfigSource, /import irenaDemonFinalFinisher from '\.\.\/\.\.\/\.\.\/IMG_1224\.jpeg';/,
  'The fallen-side final finisher uses IMG_1224.jpeg instead of the removed image.');
assert.doesNotMatch(stellaFinalBattleConfigSource, /413F5794-8459-451B-9E19-AF5E185C9FDA/,
  'The removed final-finisher asset is no longer referenced.');
const {
  SHORT_IRENA_STAT_POINT_TOTAL,
  calculateShortIrenaAttackDamage,
  applyShortIrenaDamageFloor,
  getShortIrenaCombatStats,
  shiftDatenGauge,
  getDatenAlignment,
  getDatenAuthorityStage,
  canActivateShortIrenaAscension,
  shouldFailAtShortIrenaFinalDeadline,
  shouldRearmShortIrenaFinisher,
  getShortIrenaNormalAttackGaugeDelta,
  getShortIrenaOriginalAttackMultiplier,
  getShortIrenaCounterDamage,
} = await import('./src/utils/shortIrenaFinalBattle.ts');
assert.strictEqual(SHORT_IRENA_STAT_POINT_TOTAL, 150);

// Regression coverage for the phase-three Ascension softlock.
assert.strictEqual(canActivateShortIrenaAscension(30, 0, 2, null), true,
  'Ascension remains usable before the final phase when gauge and effect state allow it.');
assert.strictEqual(canActivateShortIrenaAscension(29, 0, 2, null), false,
  'Ascension remains unavailable without the required God-side gauge.');
assert.strictEqual(canActivateShortIrenaAscension(60, 1, 3, 3), false,
  'Ascension cannot be reactivated while its effect is already active.');
assert.strictEqual(canActivateShortIrenaAscension(60, 0, 3, 2), true,
  'Ascension remains available with more than one final action remaining.');
assert.strictEqual(canActivateShortIrenaAscension(60, 0, 3, 1), false,
  'The last available final-phase action must be reserved for the finisher.');
assert.strictEqual(canActivateShortIrenaAscension(60, 0, 3, 0), false,
  'Ascension must not become available after the final-turn clock reaches zero.');

const usableFinalDeadline = {
  alignment: 'GOD',
  skipKaiserAction: false,
  action: 'ATTACK',
  actionLockTurns: 0,
  finisherUsedAtAlignment: null,
  ascensionTurns: 0,
};
assert.strictEqual(shouldFailAtShortIrenaFinalDeadline(usableFinalDeadline), false,
  'A valid aligned final finisher opportunity must remain available at zero turns.');
assert.strictEqual(shouldFailAtShortIrenaFinalDeadline({ ...usableFinalDeadline, ascensionTurns: 2 }), true,
  'An active Ascension buff must not leave a no-action FIGHTING state at the deadline.');
assert.strictEqual(shouldFailAtShortIrenaFinalDeadline({ ...usableFinalDeadline, alignment: null }), true,
  'The final deadline without either alignment must still result in defeat.');
assert.strictEqual(shouldFailAtShortIrenaFinalDeadline({ ...usableFinalDeadline, skipKaiserAction: true }), true,
  'The final deadline must still defeat a player who cannot stop the terminal action.');
assert.strictEqual(shouldFailAtShortIrenaFinalDeadline({ ...usableFinalDeadline, action: 'PASS' }), true,
  'Passing on the final deadline must still result in defeat.');
assert.strictEqual(shouldFailAtShortIrenaFinalDeadline({ ...usableFinalDeadline, actionLockTurns: 1 }), true,
  'An action lock at the final deadline must still result in defeat.');
assert.strictEqual(shouldFailAtShortIrenaFinalDeadline({
  ...usableFinalDeadline, finisherUsedAtAlignment: 'GOD',
}), true, 'A finisher already used at the current alignment cannot be used again.');
const shortIrenaFinalBattleSource = await readFile(new URL('./src/components/StellaFinalBattleScreen.tsx', import.meta.url), 'utf8');
assert.match(shortIrenaFinalBattleSource,
  /action === 'ASCENSION' && !canActivateShortIrenaAscension\(/,
  'The battle handler must enforce the same Ascension availability rule as the button.');
assert.match(shortIrenaFinalBattleSource,
  /const canActivateAscension = canActivateShortIrenaAscension\(/,
  'The visible button must derive availability from the tested rule.');
assert.match(shortIrenaFinalBattleSource,
  /finalTurnsLeft === 0 && shouldFailAtShortIrenaFinalDeadline\(/,
  'Deadline resolution must force a terminal result when the finisher is blocked.');

assert.match(shortIrenaFinalBattleSource, /stella-final--playing/,
  'Only the active battle screen opts into the no-scroll compact layout.');
assert.match(shortIrenaFinalBattleSource, /shortIrenaCommandWindow && canUseDivineSpeed/,
  'Locked or unavailable Irena authorities are not rendered.');
assert.match(shortIrenaFinalBattleSource, /shortIrenaCommandWindow && canUseAllThings/,
  'The highest-gauge authority is rendered only at its actual unlock threshold.');
assert.match(shortIrenaFinalBattleSource, /shortIrenaUltimateWindow && \(/,
  'The ultimate button is rendered only when the current finisher can be used.');
assert.ok(!shortIrenaFinalBattleSource.includes('stella-final__counter-forecast'),
  'The combat HUD must not render enemy action prediction panels.');
assert.ok(!shortIrenaFinalBattleSource.includes("'予測 ' + normalAttackDamage"),
  'The normal attack command must not display predicted damage.');
assert.match(shortIrenaFinalBattleSource, /previous\.kaiserHp - current\.kaiserHp/,
  'The displayed Kaiser damage must come from actual HP lost.');
assert.match(shortIrenaFinalBattleSource, /previous\.playerHp - current\.playerHp/,
  'Incoming damage must be measured from the player HP that was actually lost.');
assert.match(shortIrenaFinalBattleSource, /stella-final__damage-number--' \+ popup\.target/,
  'Actual damage must render as a target-specific combat popup.');
assert.ok(!shortIrenaFinalBattleSource.includes('<p>防御力1.5倍、速度999倍。効果4ターン。</p>'),
  'Combat action cards omit long skill descriptions.');
assert.match(shortIrenaFinalBattleSource, /battle\.datenGauge < 100 && \(/,
  'The gauge does not offer an impossible move beyond the positive cap.');
assert.match(shortIrenaFinalBattleSource, /battle\.datenGauge > -100 && \(/,
  'The gauge does not offer an impossible move beyond the negative cap.');
const developerToolsSource = await readFile(new URL('./src/components/DeveloperToolsScreen.tsx', import.meta.url), 'utf8');
assert.match(developerToolsSource, /全機能開放/,
  'Developer Tools expose a clearly named full-game unlock button.');
assert.ok(
  developerToolsSource.indexOf('全機能開放') < developerToolsSource.indexOf('⚔️ 対戦テスト'),
  'The full-game unlock action appears before the generic battle setup on mobile.',
);
assert.doesNotMatch(developerToolsSource, /いれーな最終決戦をすぐ開始|onOpenStellaFinalBattle/,
  'Developer Tools no longer wire a single-button jump into the final battle.');
const screenTransitionLoaderSource = await readFile(new URL('./src/components/ScreenTransitionLoader.tsx', import.meta.url), 'utf8');
assert.match(screenTransitionLoaderSource, /MINIMUM_TRANSITION_TIME_MS = 450;/,
  'Ordinary screen transitions have a 450ms visual minimum.');
assert.match(screenTransitionLoaderSource, /!minimumTimeElapsed \|\| !extraWorkReady/,
  'Any required screen-specific preload still completes before the loader disappears.');
assert.doesNotMatch(screenTransitionLoaderSource, /artworkReady|preloadedArtwork/,
  'Decorative loading artwork is not allowed to block normal navigation.');
assert.doesNotMatch(screenTransitionLoaderSource, /<img|SCREEN_TRANSITION_ARTWORK|\.\.\/assets\//,
  'Ordinary screen transitions do not render or import loading artwork.');
assert.doesNotMatch(screenTransitionLoaderSource, /transitionIndex|data-screen-transition-art/,
  'The ordinary transition loader no longer selects an image by index.');
const screenTransitionLoaderCss = await readFile(new URL('./src/components/ScreenTransitionLoader.css', import.meta.url), 'utf8');
assert.match(screenTransitionLoaderCss, /background:\s*#000;/,
  'Ordinary screen transitions use a plain black screen.');
assert.doesNotMatch(screenTransitionLoaderCss, /url\(|backdrop-art|loader__art|loader__caption|loader__progress/,
  'Ordinary screen transitions do not contain image, caption, or progress visuals.');
const appDeveloperRouteSource = await readFile(new URL('./src/App.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(appDeveloperRouteSource, /handleOpenDeveloperFinalBattle|onOpenStellaFinalBattle=\{handleOpenDeveloperFinalBattle\}|isDeveloperFinalBattlePreview/,
  'The obsolete developer-only final-battle shortcut is removed.');
assert.match(appDeveloperRouteSource, /if \(!progress\.isUnlocked \|\| !progress\.exKaiserDefeated\) return;/,
  'Normal final-battle progression remains gated.');
assert.match(appDeveloperRouteSource, /isDeveloperPreview=\{false\}/,
  'The final battle now opens only through the normal progression route.');
assert.match(shortIrenaFinalBattleSource, /if \(isDeveloperPreview \|\| battle\.status !== 'VICTORY'/,
  'Developer final-battle previews do not claim permanent victory rewards.');
assert.match(shortIrenaFinalBattleSource, /開発者テスト：この勝利では通常の解放状況・初回クリア報酬を変更しない。/,
  'The final-battle result clearly identifies reward-neutral developer testing.');
const finalBattleUiCss = await readFile(new URL('./src/components/StellaFinalBattleScreen.css', import.meta.url), 'utf8');
assert.match(finalBattleUiCss, /stella-final__power-icon img\.stella-final__skill-art/,
  'Custom skill art fits the small mobile ability tile.');
assert.match(finalBattleUiCss, /stella-final__powers:has\(\.stella-final__opening-choice\)/,
  'The opening alignment choice does not reserve an empty skill grid.');
assert.match(finalBattleUiCss, /stella-final__powers:has\(\.stella-final__power-grid > \.stella-final__power-card:nth-child\(-n\+3\):last-child\)/,
  'One-row command lists use content-sized height instead of a blank second row.');
assert.match(finalBattleUiCss, /stella-final-alignment-transition/,
  'God and fallen selection use a dedicated visual transition.');
assert.match(finalBattleUiCss, /\.stella-final--playing\.stella-final--god/,
  'God alignment has a distinct battlefield theme.');
assert.match(finalBattleUiCss, /\.stella-final--playing\.stella-final--demon/,
  'Fallen alignment has a distinct battlefield theme.');
assert.match(finalBattleUiCss, /stella-final__damage-number--kaiser/,
  'Boss damage is displayed in a dedicated large combat number.');
assert.match(finalBattleUiCss, /stella-final__damage-number--player/,
  'Damage taken by the player is displayed separately from boss damage.');
assert.match(finalBattleUiCss, /rotate\(-7deg\)/,
  'Combat damage numbers retain the requested angle with a subtler motion.');
assert.match(finalBattleUiCss, /font-weight: 800;/,
  'Damage typography avoids the extra-bold pop-art treatment.');
assert.match(finalBattleUiCss, /-webkit-text-stroke: \.75px/,
  'Damage numbers use a thinner outline for a more restrained combat HUD.');
assert.match(finalBattleUiCss, /rgba\(224, 199, 157, \.22\)/,
  'Damage number glows use restrained hues instead of strong neon bloom.');
assert.match(finalBattleUiCss, /\.stella-final--playing \.stella-final__daten-gauge-track \{\s*height: 15px;/,
  'The inner gauge track is thicker while the surrounding frame remains unchanged.');

const finalBattleConfigSource = await readFile(new URL('./src/data/stellaFinalBattleConfig.ts', import.meta.url), 'utf8');
assert.match(finalBattleConfigSource, /IMG_1218\.jpeg/,
  'The in-between Irena portrait is registered for the final battle.');
assert.match(finalBattleConfigSource, /IMG_1228\.jpeg/,
  'The updated divine portrait is registered for the final battle.');
assert.match(finalBattleConfigSource, /3CBE9BD5-BD6E-4AAE-BCB3-E86ADA03C184\.png/,
  'The updated fallen portrait is registered for the final battle.');
const finalBattleImagePreloadSource = await readFile(new URL('./src/utils/imagePreload.ts', import.meta.url), 'utf8');
assert.match(finalBattleImagePreloadSource, /終極殲滅アイコン IMG_1230\.jpeg/,
  'The new skill artwork is required and preloaded before battle.');
assert.match(finalBattleImagePreloadSource, /堕天側立ち絵更新版 3CBE9BD5/,
  'The updated fallen portrait is included in strict image preload.');

assert.match(finalBattleUiCss, /stella-final__daten-gauge-threshold-labels/,
  'The gauge exposes the intermediate authority thresholds.');
assert.match(finalBattleUiCss, /\.stella-final--playing \{[\s\S]*?overflow: hidden/,
  'The active battle layout must prevent page scrolling.');
assert.match(finalBattleUiCss, /\.stella-final--playing \.stella-final__power-copy p \{ display: none; \}/,
  'Compact battle command cards hide descriptions.');
assert.match(shortIrenaFinalBattleSource, /stella-final__arena-art--player/,
  'The large player illustration is rendered in the active arena.');
assert.match(shortIrenaFinalBattleSource, /stella-final__arena-art--kaiser/,
  'The large Kaiser illustration is rendered in the active arena.');
assert.match(shortIrenaFinalBattleSource, /stella-final__combat-heading/,
  'The battle header shows the title, phase, and current turn.');
assert.match(shortIrenaFinalBattleSource, /irenaGodCrest/,
  'The divine route uses its dedicated crest in alignment and ultimate controls.');
assert.match(shortIrenaFinalBattleSource, /irenaDemonCrest/,
  'The fallen route uses its dedicated crest in alignment and gauge controls.');
assert.match(shortIrenaFinalBattleSource, /irenaDemonFinisherIcon/,
  'The fallen ultimate command uses the dedicated End icon.');
assert.match(shortIrenaFinalBattleSource, /irenaTerminusIcon/,
  'Terminus Annihilation uses its dedicated skill artwork.');
assert.match(shortIrenaFinalBattleSource, /irenaAscensionIcon/,
  'Ascension uses its dedicated skill artwork.');
assert.match(shortIrenaFinalBattleSource, /irenaAllMightIcon/,
  'Dominion Beyond Reason uses its dedicated skill artwork.');
assert.match(shortIrenaFinalBattleSource, /stella-final__hp-phase-mark/,
  'The Kaiser HP bar marks both phase boundaries.');
assert.match(shortIrenaFinalBattleSource, /stella-final__alignment-choice-icon/,
  'The initial choice buttons still show their choice crests.');
assert.match(shortIrenaFinalBattleSource, /pendingKaiserCounterDamage: number \| null/,
  'The initial alignment transition stores the counter hit until its reveal completes.');
assert.match(shortIrenaFinalBattleSource, /const duration = shouldPauseForFormReveal \? \(prefersReducedMotion \? 600 : 1850\) : 300/,
  'The opening alignment reveal and actual form changes run before the delayed enemy counter.');
assert.match(shortIrenaFinalBattleSource, /playerHp = Math\.max\(0, playerHp - pendingDamage\)/,
  'The deferred enemy counter applies its damage only after the reveal timer.');
assert.match(shortIrenaFinalBattleSource, /current\.pendingKaiserCounterDamage !== null\) return current/,
  'Battle actions are locked while the opening reveal is active.');
assert.match(shortIrenaFinalBattleSource, /let shouldDeferAlignmentCounter = isOpeningChoice/,
  'Opening God/Fallen choices defer the enemy response.');
assert.match(shortIrenaFinalBattleSource, /if \(alignment && alignment !== previousAlignment\) \{\s*shouldDeferAlignmentCounter = true/,
  'Reaching a true God/Fallen alignment also triggers the full-screen portrait reveal.');
const deferredAlignmentFallback = shortIrenaFinalBattleSource.match(/if \(shouldDeferAlignmentCounter\) \{\s*([\s\S]*?)const pendingDamage/)?.[1] ?? '';
assert.match(deferredAlignmentFallback, /if \(alignmentFlash === null\) \{\s*alignmentFlash = alignment \?\? \(datenGauge < 0 \? 'DEMON' : 'GOD'\);\s*alignmentFlashId \+= 1;/,
  'Every deferred counter starts a reveal timer, including attacks that reach ±100 without using a gauge button.');
assert.ok(shortIrenaFinalBattleSource.includes('if (!battle.alignmentFlash) return;'),
  'The transition timer remains tied to a visible alignment reveal, so the deferred branch must always create one.');
assert.match(shortIrenaFinalBattleSource, /const godMightTurns = wasGodMight \? tick\(current\.godMightTurns\)/,
  'Timed buffs still tick when the delayed alignment counter resolves.');
assert.match(shortIrenaFinalBattleSource, /pendingShortIrenaAction: ShortIrenaAction \| null/,
  'The delayed turn retains its action so deadline and status logic can be completed.');
const deferredAlignmentStart = shortIrenaFinalBattleSource.indexOf('if (shouldDeferAlignmentCounter) {');
const deferredAlignmentEnd = shortIrenaFinalBattleSource.indexOf('\n      if (skipKaiserAction)', deferredAlignmentStart);
const deferredAlignmentBranch = deferredAlignmentStart >= 0 && deferredAlignmentEnd > deferredAlignmentStart
  ? shortIrenaFinalBattleSource.slice(deferredAlignmentStart, deferredAlignmentEnd)
  : '';
assert.ok(deferredAlignmentBranch.length > 0, 'The deferred alignment branch must remain identifiable for state-preservation checks.');
for (const field of [
  'playerHp,', 'kaiserHp,', 'phase,', 'finalTurnLimit,', 'finalTurnsLeft,',
  'terminusReadyTurn,', 'allMightUsed,', 'allMightMultiplier,', 'kaiserBuffs,',
]) {
  assert.ok(deferredAlignmentBranch.includes(field),
    'A form reveal must preserve already-resolved combat field ' + field);
}
assert.match(shortIrenaFinalBattleSource, /pendingShortIrenaSkipKaiserAction: boolean/,
  'Deferred form changes retain whether the action skips the Kaiser response.');
assert.match(shortIrenaFinalBattleSource, /const skipKaiserAction = current\.pendingShortIrenaSkipKaiserAction/,
  'Delayed resolution respects a same-action Kaiser skip from Dominion Beyond Reason.');
assert.match(shortIrenaFinalBattleSource, /const wasSpeedDown = current\.pendingShortIrenaWasSpeedDown/,
  'A newly applied speed penalty does not lose a turn just because the form reveal is delayed.');
assert.ok(!shortIrenaFinalBattleSource.slice(
  shortIrenaFinalBattleSource.indexOf('{battle.alignmentFlash &&'),
  shortIrenaFinalBattleSource.indexOf('{battle.finisherPending &&'),
).includes('irenaGodCrest') && !shortIrenaFinalBattleSource.slice(
  shortIrenaFinalBattleSource.indexOf('{battle.alignmentFlash &&'),
  shortIrenaFinalBattleSource.indexOf('{battle.finisherPending &&'),
).includes('irenaDemonCrest'),
  'The alignment transition itself does not show the God or Fallen crest.');
assert.match(shortIrenaFinalBattleSource, /stella-final__opening-form-portrait/,
  'Alignment switching features a large portrait instead of a crest.');
assert.match(shortIrenaFinalBattleSource, /STELLA_FINAL_BATTLE_IMAGES\.irenaDemonPortrait/,
  'Choosing Fallen reveals the updated Fallen portrait.');
assert.match(shortIrenaFinalBattleSource, /canDisplayTerminusCooldown/,
  'Terminus remains visible while it is on cooldown.');
const terminusCooldownDisplayCondition = shortIrenaFinalBattleSource.match(/const canDisplayTerminusCooldown = ([\\s\\S]*?);/)?.[1] ?? '';
assert.ok(!terminusCooldownDisplayCondition.includes('canUseTerminus'),
  'A cooldown tile remains visible even after gauge movement changes the current activation threshold.');
assert.match(shortIrenaFinalBattleSource, /stella-final__cooldown-badge/,
  'Cooldown actions display their remaining-turn badge.');
assert.match(shortIrenaFinalBattleSource, /battle\.turn < battle\.immortalReadyTurn && <span className="stella-final__cooldown-badge"/,
  'Immortal remains visible during its cooldown.');
assert.match(shortIrenaFinalBattleSource, /\}, 1650\);/,
  'Damage-number removal timer matches the longer visual duration.');
assert.match(finalBattleUiCss, /\.stella-final--playing \.stella-final__power-card button::before \{\s*content: none !important;/,
  'Skill tiles no longer display a redundant activation button label.');
assert.match(finalBattleUiCss, /font-size: clamp\(51px, 14\.25vw, 108px\)/,
  'Damage numbers use a roughly 1.5x desktop scale.');
assert.match(finalBattleUiCss, /font-size: clamp\(48px, 15vw, 72px\)/,
  'Damage numbers use a roughly 1.5x scale on narrow phones.');
assert.match(finalBattleUiCss, /animation-duration: 1650ms/,
  'Damage-number animation lasts for 1.65 seconds.');
assert.match(finalBattleUiCss, /stella-final-opening-portrait/,
  'The opening form reveal has a dedicated full-screen portrait animation.');
assert.match(finalBattleUiCss, /\.stella-final--playing \.stella-final__arena-art/,
  'The active arena displays large character art.');
assert.match(finalBattleUiCss, /\.stella-final--playing \.stella-final__power-card button\{position:absolute;inset:0;/,
  'Each available command tile is a large tap target.');
assert.match(finalBattleUiCss, /\.stella-final--playing\{height:100vh;height:100dvh;overflow:hidden/,
  'The full active battle viewport is locked against scrolling.');
assert.ok(!shortIrenaFinalBattleSource.includes('<p>防御力1.5倍、速度999倍。効果4ターン。</p>'),
  'Skill explanations are removed from the command tiles.');

assert.strictEqual(getShortIrenaCombatStats().maxHp, IRENA.maxHp);
assert.strictEqual(getShortIrenaCombatStats().attack, IRENA.attack);
assert.strictEqual(getShortIrenaCombatStats().normalAttackDamage, IRENA.attack * 8);
assert.strictEqual(getShortIrenaCombatStats({ attack: 150 }).attack, IRENA.attack + 150 * 12);
assert.strictEqual(getShortIrenaCombatStats({ attack: 150 }).remainingPoints, 0);
assert.ok(getShortIrenaCombatStats({ attack: 150 }).normalAttackDamage > STELLA_FINAL_BATTLE_TUNING.bossMaxHp / 2,
  'The maximum offensive build should still exceed the original 15,000-HP final-duel baseline.');
assert.strictEqual(shiftDatenGauge(0, -60), -60, 'Existing large gauge adjustments must retain their requested movement.');
assert.strictEqual(shiftDatenGauge(30, -15), 15, 'A reverse move from +30 must stop at +15.');
assert.strictEqual(shiftDatenGauge(-30, 15), -15, 'A reverse move from -30 must stop at -15.');
assert.strictEqual(shiftDatenGauge(100, 15), 100, 'The upper gauge limit must be clamped.');
assert.strictEqual(shiftDatenGauge(-100, -15), -100, 'The lower gauge limit must be clamped.');
assert.strictEqual(shiftDatenGauge(-60, -50), -100);
assert.strictEqual(shiftDatenGauge(60, 50), 100);
assert.strictEqual(shiftDatenGauge(80, -40), 40, 'Reverse movement must not be dampened.');
assert.strictEqual(shiftDatenGauge(90, 15), 100, 'The God endpoint must clamp to +100.');
assert.strictEqual(shiftDatenGauge(-90, -15), -100, 'The Demon endpoint must clamp to -100.');
assert.strictEqual(shiftDatenGauge(-15, 15), 0, 'The gauge may return to its center.');
assert.strictEqual(getDatenAlignment(100), 'GOD');
assert.strictEqual(getDatenAlignment(-100), 'DEMON');
assert.strictEqual(getDatenAlignment(99), null);
assert.strictEqual(getDatenAuthorityStage(29), 0);
assert.strictEqual(getDatenAuthorityStage(-29), 0);
assert.strictEqual(getDatenAuthorityStage(30), 1);
assert.strictEqual(getDatenAuthorityStage(-59), 1);
assert.strictEqual(getDatenAuthorityStage(60), 2);
assert.strictEqual(getDatenAuthorityStage(-99), 2);
assert.strictEqual(getDatenAuthorityStage(100), 3);
assert.strictEqual(getDatenAuthorityStage(-100), 3);
assert.strictEqual(shouldRearmShortIrenaFinisher(null, 0), false);
assert.strictEqual(shouldRearmShortIrenaFinisher('GOD', 29), true);
assert.strictEqual(shouldRearmShortIrenaFinisher('GOD', 30), false);
assert.strictEqual(shouldRearmShortIrenaFinisher('DEMON', -29), true);
assert.strictEqual(shouldRearmShortIrenaFinisher('DEMON', -30), false);
assert.strictEqual(getShortIrenaNormalAttackGaugeDelta('GOD', IRENA.speed + 720), 18);
assert.strictEqual(getShortIrenaNormalAttackGaugeDelta('DEMON', IRENA.speed), -12);
assert.strictEqual(getShortIrenaOriginalAttackMultiplier(1), 0.55);
assert.strictEqual(getShortIrenaOriginalAttackMultiplier(2), 0.6);
assert.strictEqual(getShortIrenaOriginalAttackMultiplier(5), 0.75);
assert.strictEqual(getShortIrenaOriginalAttackMultiplier(10), 1);
assert.strictEqual(getShortIrenaOriginalAttackMultiplier(20), 1);
assert.strictEqual(getShortIrenaCounterDamage(230, 200), 130);
assert.strictEqual(getShortIrenaCounterDamage(230, 1100), 50);
assert.deepStrictEqual(calculateShortIrenaAttackDamage(2880, 180, 0), {
  damage: 2700,
  targetDefense: 180,
}, 'Normal attacks must apply the current Kaiser defense.');
assert.deepStrictEqual(calculateShortIrenaAttackDamage(2880, 180, 3), {
  damage: 2880,
  targetDefense: 0,
}, 'Collapse must change real attack damage by treating Kaiser defense as zero.');
assert.deepStrictEqual(calculateShortIrenaAttackDamage(0, 180, 1), {
  damage: 1,
  targetDefense: 0,
}, 'Defense-null must not turn a zero attack into a negative or zero damage result.');
assert.strictEqual(applyShortIrenaDamageFloor(1, 3000), 3000, '万象支配 must guarantee at least 3000 after defense.');
assert.strictEqual(applyShortIrenaDamageFloor(1999.1, 3000), 3000, 'The ability floor applies after normal defense math.');
assert.strictEqual(applyShortIrenaDamageFloor(3000, 2000), 3000, 'A floor cannot reduce larger damage.');
assert.strictEqual(applyShortIrenaDamageFloor(1999.1, 2000), 2000, '創世 and 終焉 must guarantee 2000.');

assert.deepStrictEqual({
  maxHp: IRENA.maxHp,
  attack: IRENA.attack,
  defense: IRENA.defense,
  speed: IRENA.speed,
  specialSkillDamage: IRENA.specialSkillDamage,
  ultimateSkillDamage: IRENA.ultimateSkillDamage,
}, regularIrenaSnapshot, 'Final-battle Irena data must not mutate the normal IRENA definition.');
const { CpuAi } = await import('./src/utils/ai.ts');

const { getIrenaSuperFallenShotMultiplier } = await import('./src/types/game.ts');
const {
  initializeKaiserChallengeFighter,
  resolveKaiserHit,
  advanceKaiserChallengeRound,
} = await import('./src/utils/kaiserChallenge.ts');
const { getRecruitmentRewardForPull } = await import('./src/data/recruitment.ts');
const { loadStatPoints, addStatPoints, saveBattleResult, loadRaidRewardProgress, claimRaidVictoryReward, redeemRaidCoreFragment, performRecruitment, IMPRINT_PROGRESS_STORAGE_KEY, loadImprintProgress, loadSkillProgress, chooseIrenaSkillPath, upgradeIrenaSkill, unlockImprint, equipImprint, unequipImprint, drawImprintGacha, setImprintTicketsForDeveloper, addImprintTicketsForDeveloper, unlockAllImprintsForDeveloper, claimKaiser100VictoryReward, claimStellaFinalBattleReward, loadStellaModeProgress, recordExKaiserVictory, unlockStellaMode, enableDeveloperMode, unlockAllGameFeaturesForDeveloper, resetProgressForDeveloper, STELLA_MODE_PROGRESS_KEY, loadAchievementProgress, persistAchievementProgress, claimAchievementReward, unlockAchievementUltimateAuthority, loadAbilityProgress, loadResonanceProgress, unlockAbilityResonance, combineResonanceAbility, upgradeResonanceAbility, addAbilityShards, setResonanceAbilityForDeveloper, setResonanceShardsForDeveloper } = await import('./src/utils/storage.ts');
const { MAX_EQUIPPED_IMPRINTS, IMPRINT_DEFINITIONS } = await import('./src/data/imprints.ts');
const { MAX_ABILITY_LEVEL } = await import('./src/data/abilities.ts');
const { getKingZoneValues } = await import('./src/utils/resonanceSystem.ts');
const { normalizeEquippedImprints, shouldTriggerForesight, shouldSuppressCpuBuffAction, resolveYinYangDefense, getTurnExecutionPlan, YIN_YANG_DAMAGE_REDUCTION, getOpposingBloodImprint, getBloodTearBurstDamage, resolveWindGuardDamage, getWindGuardCounterDamage, WIND_GUARD_MAX_REDUCTION, COSTLY_SHOT_HP_COST, FEATHER_SPLIT_PIERCE_MULTIPLIER, FEATHER_SPLIT_RAPID_MULTIPLIER, FEATHER_SPLIT_ALTERNATION_BONUS, FEATHER_SPLIT_PIERCE_COOLDOWN, FEATHER_SPLIT_RAPID_COOLDOWN, getFeatherSplitModeForSkill, getSpecialCooldownRemaining, resolveFeatherSplitDamage } = await import('./src/utils/imprintSystem.ts');
const { canUseRaidAction, createInitialRaidState, RAID_RULES, resolveRaidAction } = await import('./src/raid/engine.ts');
const {
  INITIAL_IRENA_TALENT_PROGRESS,
  addIrenaBattleExperience,
  applyIrenaTalentModifiers,
  getAvailableIrenaTalentPoints,
  getIrenaLevel,
  getIrenaLevelProgress,
  getIrenaTalentPointsForLevel,
  getIrenaXpForLevel,
  normalizeIrenaTalentProgress,
} = await import('./src/utils/irenaTalentSystem.ts');

const appSourceForTalentXpRegression = await readFile(new URL('./src/App.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(
  appSourceForTalentXpRegression,
  /\baddIrenaBattleExperience\s*\(/,
  'App must not grant talent EXP separately after saveBattleResult has persisted it.',
);
assert.match(
  appSourceForTalentXpRegression,
  /setIrenaTalentProgress\(loadIrenaTalentProgress\(\)\)/,
  'App must reload persisted talent progress after a battle result.',
);

assert.strictEqual(getIrenaLevel(0), 1);
assert.strictEqual(getIrenaLevel(80), 2, 'The first talent level should be reachable after one win.');
assert.strictEqual(getIrenaLevel(180), 3, 'Level requirements should rise as Irena grows.');
assert.strictEqual(getIrenaLevel(getIrenaXpForLevel(20)), 20, 'Irena should stop at the configured level cap.');
assert.strictEqual(getIrenaLevel(getIrenaXpForLevel(20) + 1000), 20, 'Excess experience must not exceed the level cap.');
assert.strictEqual(getIrenaTalentPointsForLevel(1), 0);
assert.strictEqual(getIrenaTalentPointsForLevel(2), 1);
assert.strictEqual(getIrenaTalentPointsForLevel(4), 2);
assert.strictEqual(getIrenaTalentPointsForLevel(20), 9);

const firstWinTalentProgress = addIrenaBattleExperience(INITIAL_IRENA_TALENT_PROGRESS, true);
assert.strictEqual(firstWinTalentProgress.experience, 100);
assert.strictEqual(getIrenaLevel(firstWinTalentProgress.experience), 2);
assert.strictEqual(getAvailableIrenaTalentPoints(firstWinTalentProgress), 1);
assert.strictEqual(
  addIrenaBattleExperience(INITIAL_IRENA_TALENT_PROGRESS, false).experience,
  35,
  'Defeat should still provide a smaller amount of talent experience.',
);

const allIrenaTalents = normalizeIrenaTalentProgress({
  experience: getIrenaXpForLevel(20),
  ranks: { WIND_READ: 3, FEATHER_RESONANCE: 3, ABYSS_RESONANCE: 3 },
});
const talentAdjustedIrena = applyIrenaTalentModifiers(IRENA, allIrenaTalents);
assert.strictEqual(talentAdjustedIrena.speed, IRENA.speed + 15);
assert.strictEqual(talentAdjustedIrena.evasionRate, 0.28);
assert.strictEqual(talentAdjustedIrena.specialSkillDamage, Math.round(IRENA.specialSkillDamage * 1.18));
assert.strictEqual(talentAdjustedIrena.ultimateSkillDamage, Math.round(IRENA.ultimateSkillDamage * 1.24));
assert.strictEqual(talentAdjustedIrena.defense, IRENA.defense - 9);
assert.strictEqual(talentAdjustedIrena.attack, IRENA.attack);
assert.strictEqual(talentAdjustedIrena.maxHp, IRENA.maxHp);
const talentAdjustedTwice = applyIrenaTalentModifiers(talentAdjustedIrena, allIrenaTalents);
assert.strictEqual(talentAdjustedTwice.speed, talentAdjustedIrena.speed, 'Reapplying the same talent ranks must not stack speed twice.');
assert.strictEqual(talentAdjustedTwice.evasionRate, talentAdjustedIrena.evasionRate, 'Reapplying talents must not stack evasion twice.');
assert.strictEqual(talentAdjustedTwice.specialSkillDamage, talentAdjustedIrena.specialSkillDamage, 'Reapplying talents must not stack Feather Resonance twice.');
assert.strictEqual(talentAdjustedTwice.ultimateSkillDamage, talentAdjustedIrena.ultimateSkillDamage, 'Reapplying talents must not stack Abyss Resonance twice.');
assert.strictEqual(talentAdjustedTwice.specialSkillDescription, talentAdjustedIrena.specialSkillDescription, 'The talent description suffix must not duplicate.');
const attackTalentBuild = applyIrenaTalentModifiers(IRENA, normalizeIrenaTalentProgress({
  experience: getIrenaXpForLevel(6),
  ranks: { WIND_READ: 0, FEATHER_RESONANCE: 0, ABYSS_RESONANCE: 0, RAVEN_ASSAULT: 3, LAST_WING: 0 },
}));
assert.strictEqual(attackTalentBuild.attack, Math.round(IRENA.attack * 1.15), 'Raven Assault max rank should add 15% attack.');
const defensiveTalentBuild = applyIrenaTalentModifiers(IRENA, normalizeIrenaTalentProgress({
  experience: getIrenaXpForLevel(6),
  ranks: { WIND_READ: 0, FEATHER_RESONANCE: 0, ABYSS_RESONANCE: 0, RAVEN_ASSAULT: 0, LAST_WING: 3 },
}));
assert.strictEqual(defensiveTalentBuild.maxHp, Math.round(IRENA.maxHp * 1.15), 'Last Wing max rank should add 15% max HP.');
assert.strictEqual(
  getIrenaLevelProgress(getIrenaXpForLevel(20)).progressPercent,
  100,
  'The level progress bar should be full at the maximum level.',
);
assert.deepStrictEqual(
  normalizeIrenaTalentProgress({ experience: 0, ranks: { WIND_READ: 3, FEATHER_RESONANCE: 3, ABYSS_RESONANCE: 3 } }).ranks,
  { WIND_READ: 0, FEATHER_RESONANCE: 0, ABYSS_RESONANCE: 0, RAVEN_ASSAULT: 0, LAST_WING: 0 },
  'A save cannot claim talent ranks before earning talent points.',
);
console.log('✓ Irena experience, talent points, save normalization, and talent effects are verified.');
const {
  normalizeKaiserChallengeProgress,
  getSelectableKaiserLevels,
  resolveKaiserChallengeResult,
} = await import('./src/utils/kaiserChallengeProgress.ts');

const initialKaiserProgress = normalizeKaiserChallengeProgress(null);
assert.deepStrictEqual(initialKaiserProgress, { unlockedLevel: 10 });
assert.deepStrictEqual(getSelectableKaiserLevels(10), [10]);
assert.deepStrictEqual(getSelectableKaiserLevels(20), [10, 20]);
assert.deepStrictEqual(getSelectableKaiserLevels(30), [20, 30]);
assert.deepStrictEqual(getSelectableKaiserLevels(100), [90, 100]);
assert.deepStrictEqual(
  resolveKaiserChallengeResult(initialKaiserProgress, 10, true),
  { unlockedLevel: 20 },
  'Defeating the current Kaiser level should unlock the next level.',
);
assert.deepStrictEqual(
  resolveKaiserChallengeResult(initialKaiserProgress, 10, false),
  initialKaiserProgress,
  'A loss must not unlock the next Kaiser level.',
);
assert.deepStrictEqual(
  resolveKaiserChallengeResult({ unlockedLevel: 30 }, 20, true),
  { unlockedLevel: 30 },
  'Winning an older cleared level must not skip progression.',
);
assert.deepStrictEqual(
  resolveKaiserChallengeResult({ unlockedLevel: 100 }, 100, true),
  { unlockedLevel: 100 },
  'Level 100 is the final challenge and must not overflow the level list.',
);
assert.deepStrictEqual(
  normalizeKaiserChallengeProgress({ unlockedLevel: 25 }),
  initialKaiserProgress,
  'Invalid saved Kaiser levels must fall back to the initial challenge.',
);
console.log('✓ Kaiser challenge unlocks are sequential and only retain the previous cleared level.');

assert.strictEqual(getIrenaSuperFallenShotMultiplier(1), 5.6);
assert.strictEqual(Math.round(getIrenaSuperFallenShotMultiplier(10) * 10) / 10, 7.4);
console.log('✓ Super Fallen Shot power is doubled.');

console.log('--- Testing Web Version Game Logic & Rules ---');

assert.strictEqual(IRENA.maxHp, 4000);
assert.strictEqual(IRENA.attack, 360);
assert.strictEqual(IRENA.defense, 200);
assert.strictEqual(IRENA.speed, 240);
assert.strictEqual(IRENA.evasionRate, 0.25);
assert.strictEqual(IRENA.specialSkillDamage, 300);
assert.strictEqual(IRENA.specialSkillCooldown, 2);
assert.strictEqual(IRENA.ultimateSkillDamage, 500);

assert.strictEqual(KAISER.maxHp, 2750);
assert.strictEqual(KAISER.attack, 187);
assert.strictEqual(KAISER.defense, 180);
assert.strictEqual(KAISER.speed, 180);
assert.strictEqual(KAISER.evasionRate, 0.10);
assert.strictEqual(KAISER.specialSkillDamage, 500);
assert.strictEqual(KAISER.specialSkillCooldown, 1);
assert.strictEqual(KAISER.ultimateSkillDamage, 700);
const cpuKaiserBase = CPU_CHARACTERS.find(character => character.id === KAISER.id);
assert.ok(cpuKaiserBase, 'The runtime CPU roster must contain Kaiser.');
assert.strictEqual(cpuKaiserBase.maxHp, KAISER.maxHp * 2);
assert.strictEqual(cpuKaiserBase.attack, KAISER.attack * 1.5);
assert.deepStrictEqual(PLAYER_CHARACTERS.map(character => character.id), ['irena', 'stella']);
assert.deepStrictEqual(CPU_CHARACTERS.map(character => character.id), ['kaiser']);
assert.strictEqual(getPlayerCharacterById('irena').id, 'irena');
assert.strictEqual(getPlayerCharacterById('stella').id, 'stella');
assert.strictEqual(getPlayerCharacterById('unknown-character').id, 'irena');
assert.strictEqual(STELLA.specialSkillName, 'ステラレイ');
assert.strictEqual(STELLA.ultimateSkillName, 'グランノヴァ');
assert.strictEqual(STELLA.passiveName, '天星の加護');
assert.strictEqual(STATUS_AILMENTS.STAR_ECLIPSE.displayName, '星蝕');
assert.strictEqual(STATUS_AILMENTS.STAR_ECLIPSE.defaultDuration, 3);
const stellaFighter = createInitialFighter(STELLA, true);
const stellaWithStarEclipse = { ...stellaFighter, activeAilments: [{ type: 'STAR_ECLIPSE', remainingTurns: 3, dotDamage: 25 }] };
assert.strictEqual(getEffectiveAttack(stellaWithStarEclipse), STELLA.attack - 20);
assert.strictEqual(getEffectiveSpeed(stellaWithStarEclipse), STELLA.speed - 20);
assert.strictEqual(getEffectiveDefense(stellaWithStarEclipse), STELLA.defense);
assert.strictEqual(applyPassiveDamageReduction(stellaFighter, 100, true), 85);
assert.strictEqual(applyPassiveDamageReduction(stellaFighter, 100, false), 100);
console.log('✓ Player and CPU rosters are explicitly isolated; invalid player selections safely fall back.');

const runtimeKaiserLv10 = createKaiserForLevel(cpuKaiserBase, 10);
const runtimeKaiserLv50 = createKaiserForLevel(cpuKaiserBase, 50);
const runtimeKaiserLv100 = createKaiserForLevel(cpuKaiserBase, 100);
assert.strictEqual(runtimeKaiserLv10.maxHp, 5500);
assert.strictEqual(runtimeKaiserLv10.attack, 281);
assert.strictEqual(runtimeKaiserLv10.defense, 180);
assert.strictEqual(runtimeKaiserLv10.speed, 180);
assert.strictEqual(runtimeKaiserLv10.specialSkillDamage, 500);
assert.strictEqual(runtimeKaiserLv10.ultimateSkillDamage, 700);
assert.deepStrictEqual(
  [runtimeKaiserLv50.maxHp, runtimeKaiserLv50.attack, runtimeKaiserLv50.defense, runtimeKaiserLv50.speed, runtimeKaiserLv50.specialSkillDamage, runtimeKaiserLv50.ultimateSkillDamage],
  [6722, 336, 198, 260, 599, 838],
  'Lv50 stats must follow the existing curve after the new base values.',
);
assert.deepStrictEqual(
  [runtimeKaiserLv100.maxHp, runtimeKaiserLv100.attack, runtimeKaiserLv100.defense, runtimeKaiserLv100.speed, runtimeKaiserLv100.specialSkillDamage, runtimeKaiserLv100.ultimateSkillDamage],
  [8250, 561, 270, 360, 1000, 1400],
  'Lv100 stats must remain close to the requested baseline curve.',
);

const runtimeKaiserLv30Fighter = createInitialFighter(createKaiserForLevel(cpuKaiserBase, 30), false, 30);
const runtimeKaiserLv40Fighter = createInitialFighter(createKaiserForLevel(cpuKaiserBase, 40), false, 40);
const kaiserLv10Fighter = createInitialFighter(runtimeKaiserLv10, false, 10);
const kaiserLv50Fighter = createInitialFighter(runtimeKaiserLv50, false, 50);
const kaiserLv100Fighter = createInitialFighter(runtimeKaiserLv100, false, 100);
assert.strictEqual(kaiserLv10Fighter.kaiserArmorMax, 0, 'Lv10 must not deploy armor.');
assert.strictEqual(runtimeKaiserLv30Fighter.kaiserArmorMax, 0, 'Lv30 must not deploy armor.');
assert.strictEqual(runtimeKaiserLv40Fighter.kaiserArmorMax, Math.round(runtimeKaiserLv40Fighter.character.maxHp * 0.2), 'Lv40 is the first armor level.');
assert.strictEqual(kaiserLv50Fighter.kaiserArmorMax, Math.round(runtimeKaiserLv50.maxHp * 0.2));
assert.strictEqual(kaiserLv50Fighter.kaiserArmorCurrent, kaiserLv50Fighter.kaiserArmorMax);
assert.strictEqual(kaiserLv100Fighter.kaiserArmorCurrent, Math.round(runtimeKaiserLv100.maxHp * 0.2));

const noArmorPreview = calculateHitDamagePreview(100, kaiserLv10Fighter, 10, 1, '通常攻撃');
assert.deepStrictEqual(noArmorPreview, {
  hpDamage: 100,
  armorDamage: 0,
  armorWasActive: false,
  armorWasBroken: false,
  armorWillBreak: false,
  phaseChanged: false,
}, 'Below Lv40, preview HP damage must match live damage without inventing armor.');

const armorPreview = calculateHitDamagePreview(100, runtimeKaiserLv40Fighter, 40, 1, '通常攻撃');
assert.strictEqual(armorPreview.hpDamage, 75, 'Active armor preview must show the 25% HP damage reduction.');
assert.strictEqual(armorPreview.armorDamage, 100, 'Armor preview must show durability loss from pre-mitigation damage.');
assert.strictEqual(armorPreview.armorWasActive, true);

const armorBreakPreview = calculateHitDamagePreview(
  100, { ...runtimeKaiserLv40Fighter, kaiserArmorCurrent: 50 }, 40, 2, '通常攻撃',
);
assert.strictEqual(armorBreakPreview.hpDamage, 75);
assert.strictEqual(armorBreakPreview.armorDamage, 50);
assert.strictEqual(armorBreakPreview.armorWillBreak, true, 'The preview must warn when this hit breaks armor.');

const brokenArmorPreview = calculateHitDamagePreview(
  100,
  { ...runtimeKaiserLv40Fighter, kaiserArmorCurrent: 0, kaiserArmorBrokenTurns: 2 },
  40, 3, '通常攻撃',
);
assert.strictEqual(brokenArmorPreview.hpDamage, 130, 'A broken armor forecast must include the live 1.3x damage rule.');
assert.strictEqual(brokenArmorPreview.armorWasBroken, true);

const phasePreview = calculateHitDamagePreview(100, {
  ...kaiserLv100Fighter,
  currentHp: Math.ceil(kaiserLv100Fighter.character.maxHp * 0.5) + 50,
  kaiserArmorCurrent: 0,
  kaiserArmorBrokenTurns: 0,
}, 100, 4, '通常攻撃');
assert.strictEqual(phasePreview.hpDamage, 50, 'The forecast must match phase-boundary damage clamping.');
assert.strictEqual(phasePreview.phaseChanged, true);

const executionBypassesArmorPreview = calculateHitDamagePreview(
  100, runtimeKaiserLv40Fighter, 40, 1, '堕天・終局',
);
assert.strictEqual(executionBypassesArmorPreview.hpDamage, 100,
  'The preview must preserve the existing Fallen execution armor-bypass rule.');

const lowLevelHit = resolveKaiserHit(kaiserLv10Fighter, 100, 10, 1, true, '通常攻撃');
assert.strictEqual(lowLevelHit.damage, 100, 'Lv10 damage must not be mitigated by armor.');
const armoredHit = resolveKaiserHit(kaiserLv50Fighter, 1000, 50, 1, true, '通常攻撃');
assert.strictEqual(armoredHit.damage, 750, 'Armor must reduce HP damage by 25%.');
assert.strictEqual(
  armoredHit.fighter.kaiserArmorCurrent,
  kaiserLv50Fighter.kaiserArmorMax - 1000,
  'Armor durability must use pre-mitigation damage.',
);
assert.strictEqual(armoredHit.fighter.currentHp, kaiserLv50Fighter.currentHp - 750);

const armorBreakTest = resolveKaiserHit(
  { ...kaiserLv50Fighter, kaiserArmorCurrent: 50 },
  100,
  50,
  2,
  true,
  '通常攻撃',
);
assert.strictEqual(armorBreakTest.damage, 75);
assert.strictEqual(armorBreakTest.fighter.kaiserArmorCurrent, 0);
assert.strictEqual(armorBreakTest.fighter.kaiserArmorBrokenTurns, 2);
assert.strictEqual(armorBreakTest.armorBroke, true);

// Breaking the armor on the exact hit that crosses Lv100's phase boundary must
// not leave Kaiser marked as vulnerable after phase two immediately redeploys armor.
const phaseThreshold = Math.ceil(kaiserLv100Fighter.character.maxHp * 0.5);
const armorBreakAtPhaseBoundary = resolveKaiserHit({
  ...kaiserLv100Fighter,
  currentHp: phaseThreshold + 50,
  kaiserArmorCurrent: 50,
}, 100, 100, 2, true, '通常攻撃');
assert.strictEqual(armorBreakAtPhaseBoundary.phaseChanged, true);
assert.strictEqual(armorBreakAtPhaseBoundary.armorBroke, true);
assert.strictEqual(
  armorBreakAtPhaseBoundary.fighter.kaiserArmorCurrent,
  Math.round(armorBreakAtPhaseBoundary.fighter.kaiserArmorMax * 0.5),
  'Phase-two armor redeployment must take precedence over the just-triggered armor break.',
);
assert.strictEqual(
  armorBreakAtPhaseBoundary.fighter.kaiserArmorBrokenTurns,
  0,
  'The phase-two armor redeployment must not retain the broken-state vulnerability.',
);
const breakTurnEnd = advanceKaiserChallengeRound(armorBreakTest.fighter, 2);
assert.strictEqual(breakTurnEnd.kaiserArmorBrokenTurns, 2, 'The break turn itself must not consume a vulnerable turn.');
const brokenHit = resolveKaiserHit(breakTurnEnd, 100, 50, 3, true, '通常攻撃');
assert.strictEqual(brokenHit.damage, 130, 'A broken Kaiser must receive 1.3x damage.');
assert.strictEqual(advanceKaiserChallengeRound(brokenHit.fighter, 3).kaiserArmorBrokenTurns, 1);
assert.strictEqual(advanceKaiserChallengeRound(
  advanceKaiserChallengeRound(brokenHit.fighter, 3),
  4,
).kaiserArmorBrokenTurns, 0);

const lv100OneShot = resolveKaiserHit(
  kaiserLv100Fighter,
  kaiserLv100Fighter.character.maxHp * 2,
  100,
  1,
  true,
  '堕天・終局',
);
assert.strictEqual(lv100OneShot.phaseChanged, true);
assert.strictEqual(lv100OneShot.fighter.currentHp, Math.ceil(runtimeKaiserLv100.maxHp * 0.5));
assert.strictEqual(lv100OneShot.fighter.kaiserPhase, 2);
assert.strictEqual(lv100OneShot.fighter.character.attack, Math.round(runtimeKaiserLv100.attack * 1.25));
assert.strictEqual(lv100OneShot.fighter.character.speed, Math.round(runtimeKaiserLv100.speed * 1.15));
assert.strictEqual(lv100OneShot.fighter.character.specialSkillDamage, Math.round(runtimeKaiserLv100.specialSkillDamage * 1.25));
assert.strictEqual(lv100OneShot.fighter.character.ultimateSkillDamage, Math.round(runtimeKaiserLv100.ultimateSkillDamage * 1.25));
assert.strictEqual(lv100OneShot.fighter.kaiserArmorCurrent, Math.round(lv100OneShot.fighter.kaiserArmorMax * 0.5));
assert.strictEqual(lv100OneShot.fighter.kaiserArmorBrokenTurns, 0);
const lv50LethalHit = resolveKaiserHit(
  kaiserLv50Fighter,
  kaiserLv50Fighter.character.maxHp * 2,
  50,
  1,
  true,
  '通常攻撃',
);
assert.strictEqual(lv50LethalHit.fighter.currentHp, 0, 'The Lv100 phase boundary must not impose a global damage cap on Lv50.');
assert.strictEqual(lv50LethalHit.phaseChanged, false, 'The final phase must only exist at Lv100.');
const lv100HitAfterTransition = resolveKaiserHit(lv100OneShot.fighter, 100, 100, 2, true, '通常攻撃');
assert.strictEqual(lv100HitAfterTransition.phaseChanged, false, 'Phase 2 must not trigger repeatedly.');
assert.strictEqual(lv100HitAfterTransition.fighter.character.attack, lv100OneShot.fighter.character.attack, 'Phase buffs must not stack.');
const executionAfterPhase = resolveKaiserHit(lv100OneShot.fighter, lv100OneShot.fighter.currentHp, 100, 2, true, '堕天・終局');
assert.strictEqual(executionAfterPhase.fighter.currentHp, 0, 'Conditional execution must remain lethal after the phase transition.');
const bleedPhaseHit = resolveKaiserHit({
  ...kaiserLv100Fighter,
  currentHp: Math.ceil(runtimeKaiserLv100.maxHp * 0.5) + 50,
}, 100, 100, 3, false, '出血ダメージ');
assert.strictEqual(bleedPhaseHit.phaseChanged, true, 'Bleed crossing 50% must also start phase 2.');
console.log('✓ Kaiser armor, two-turn break window, Lv100 phase boundary, single-use scaling, and bleed threshold behavior verified.');

// Resonance erosion must preserve Lv100 Phase 2's attack/skill and speed bonuses.
const erosionBattleConfig = {
  kaiserLevel: 100,
  abilities: [{ id: 'ABYSS_WING', level: 5 }],
};
const erosionBaseKaiser = createBattleCharacters(IRENA, KAISER, erosionBattleConfig).enemy;
const phaseTwoErosionKaiser = {
  ...createInitialFighter(erosionBaseKaiser, false, 100),
  kaiserPhase: 2,
  resonanceWeakness: {
    attack: 50,
    defense: 20,
    speed: 30,
    specialSkillDamage: 40,
    ultimateSkillDamage: 60,
  },
};
const erosionPhaseTwoStats = applyDynamicAbilityModifiers(phaseTwoErosionKaiser, erosionBattleConfig, 10).character;
assert.strictEqual(
  erosionPhaseTwoStats.attack,
  Math.round(erosionBaseKaiser.attack * 1.25 * 0.5),
  'Abyss erosion must retain the Lv100 Phase 2 attack multiplier while weakening from base stats.',
);
assert.strictEqual(
  erosionPhaseTwoStats.speed,
  Math.round(erosionBaseKaiser.speed * 1.15 * 0.7),
  'Abyss erosion must retain the Lv100 Phase 2 speed multiplier.',
);
assert.strictEqual(
  erosionPhaseTwoStats.specialSkillDamage,
  Math.round(erosionBaseKaiser.specialSkillDamage * 1.25 * 0.6),
  'Abyss erosion must retain the Lv100 Phase 2 special-damage multiplier.',
);
assert.strictEqual(
  erosionPhaseTwoStats.ultimateSkillDamage,
  Math.round(erosionBaseKaiser.ultimateSkillDamage * 1.25 * 0.4),
  'Abyss erosion must retain the Lv100 Phase 2 ultimate-damage multiplier.',
);
console.log('✓ Resonance erosion preserves Lv100 Kaiser Phase 2 combat multipliers.');


assert.strictEqual(STATUS_AILMENTS.BLEED.defaultDuration, 3);
assert.strictEqual(STATUS_AILMENTS.BLEED.dotDamage, 30);
assert.strictEqual(STATUS_AILMENTS.BLEED.speedMod, -20);
assert.strictEqual(STATUS_AILMENTS.BLEED.defenseMod, -20);
assert.strictEqual(STATUS_AILMENTS.BLEED.attackMod, 0);

assert.strictEqual(STATUS_AILMENTS.PRESSURE.defaultDuration, 2);
assert.strictEqual(STATUS_AILMENTS.PRESSURE.dotDamage, 0);
assert.strictEqual(STATUS_AILMENTS.PRESSURE.speedMod, -25);
assert.strictEqual(STATUS_AILMENTS.PRESSURE.defenseMod, 0);
assert.strictEqual(STATUS_AILMENTS.PRESSURE.attackMod, -25);
console.log('✓ Status ailment parameters verified.');

const fallenSpeedTestIrena = createInitialFighter({ ...IRENA, speed: 40 }, true);
fallenSpeedTestIrena.currentHp = 2000;
const fallenSpeedAdjusted = applyDynamicAbilityModifiers(
  fallenSpeedTestIrena,
  { kaiserLevel: 10, abilities: [{ id: 'FALLEN', level: 1 }] },
  1,
);
assert.strictEqual(fallenSpeedAdjusted.character.speed, 80);
assert.strictEqual(getEffectiveSpeed({
  ...fallenSpeedAdjusted,
  activeAilments: [{ type: 'BLEED', remainingTurns: 3 }],
}), 60);

const abyssSpeedAdjusted = applyDynamicAbilityModifiers(
  createInitialFighter(KAISER, false),
  { kaiserLevel: 10, abilities: [{ id: 'ABYSS', level: 4 }] },
  2,
);
assert.strictEqual(abyssSpeedAdjusted.character.speed, 171);
console.log('✓ Dynamic speed modifiers remain visible to effective-speed calculations.');

const fighterIrena = createInitialFighter(IRENA, true);
assert.strictEqual(getEffectiveSpeed(fighterIrena), 240);
fighterIrena.activeAilments.push({ type: 'BLEED', remainingTurns: 3 });
assert.strictEqual(getEffectiveSpeed(fighterIrena), 220);
assert.strictEqual(getEffectiveDefense(fighterIrena), 180);

const fighterKaiser = createInitialFighter(KAISER, false);
fighterKaiser.activeAilments.push({ type: 'PRESSURE', remainingTurns: 2 });
assert.strictEqual(getEffectiveSpeed(fighterKaiser), 155);
assert.strictEqual(getEffectiveAttack(fighterKaiser), 162);

const aiSpecialDamageReference = Math.max(0, KAISER.specialSkillDamage - IRENA.defense);
assert.strictEqual(aiSpecialDamageReference, 300);


const config = { kaiserLevel: 10, abilities: [] };
const attackBase = createInitialFighter(IRENA, true);
const attackTarget = createInitialFighter(KAISER, false);
const normalDamage = calculateNormalAttackDamage({
  attacker: attackBase,
  target: attackTarget,
  config,
  turn: 1,
  isActingFirst: true,
});
const criticalDamage = calculateNormalAttackDamage({
  attacker: attackBase,
  target: attackTarget,
  config,
  turn: 1,
  isActingFirst: true,
}, true);

assert.strictEqual(normalDamage, 180);
assert.strictEqual(criticalDamage, 280);
const fireBadgeNormalDamage = calculateNormalAttackDamage({
  attacker: attackBase,
  target: attackTarget,
  config: { ...config, achievementBadgeId: 'A', achievementBadgeLevel: 1 },
  turn: 1,
  isActingFirst: true,
});
assert.strictEqual(fireBadgeNormalDamage, Math.round(normalDamage * 1.05),
  'Fire badge tier I must increase player direct damage by exactly 5%.');
assert.strictEqual(getAchievementBadgeDamageMultiplier({ ...config, achievementBadgeId: 'B', achievementBadgeLevel: 1 }, 'NORMAL'), 1,
  'Skill badge must not increase normal attack damage.');
const baseSpecialBadgeDamage = calculateSpecialDamage({
  attacker: attackBase,
  target: attackTarget,
  config,
  turn: 1,
  isActingFirst: true,
});
const skillBadgeSpecialDamage = calculateSpecialDamage({
  attacker: attackBase,
  target: attackTarget,
  config: { ...config, achievementBadgeId: 'B', achievementBadgeLevel: 3 },
  turn: 1,
  isActingFirst: true,
});
assert.strictEqual(skillBadgeSpecialDamage, Math.round(baseSpecialBadgeDamage * 1.15),
  'Skill badge tier III must increase special damage by exactly 15%.');
assert.strictEqual(calculateUltimateDamage({
  attacker: attackBase,
  target: attackTarget,
  config: { ...config, achievementBadgeId: 'B', achievementBadgeLevel: 3 },
  turn: 1,
  isActingFirst: true,
  ultimateVariant: 'OMNIPOTENCE',
}), 1680, 'Skill badge tier III must increase ultimate damage by 12%.');
const balancedBadgeTierOne = applyStaticAbilityModifiers(IRENA, {
  kaiserLevel: 10, abilities: [], achievementBadgeId: 'C', achievementBadgeLevel: 1,
});
const balancedBadgeTierTwo = applyStaticAbilityModifiers(IRENA, {
  kaiserLevel: 10, abilities: [], achievementBadgeId: 'C', achievementBadgeLevel: 2,
});
const balancedBadgeTierThree = applyStaticAbilityModifiers(IRENA, {
  kaiserLevel: 10, abilities: [], achievementBadgeId: 'C', achievementBadgeLevel: 3,
});
assert.strictEqual(balancedBadgeTierOne.maxHp, Math.round(IRENA.maxHp * 1.05));
assert.strictEqual(balancedBadgeTierTwo.maxHp, Math.round(IRENA.maxHp * 1.07));
assert.strictEqual(balancedBadgeTierTwo.defense, Math.round(IRENA.defense * 1.07));
assert.strictEqual(balancedBadgeTierThree.attack, Math.round(IRENA.attack * 1.07));
assert.strictEqual(balancedBadgeTierThree.speed, Math.round(IRENA.speed * 1.07));
assert.strictEqual(balancedBadgeTierThree.damageTakenMultiplier, (IRENA.damageTakenMultiplier ?? 1) * 0.95);
assert.strictEqual(applyPassiveDamageReduction({ character: balancedBadgeTierThree }, 100, true), 95);
assert.strictEqual(applyPassiveDamageReduction({ character: balancedBadgeTierThree }, 100, false), 100,
  'Balanced badge reduction must apply only to direct hits.');
const attackTalentFighter = createInitialFighter(attackTalentBuild, true);
assert.strictEqual(calculateNormalAttackDamage({
  attacker: attackTalentFighter,
  target: attackTarget,
  config,
  turn: 1,
  isActingFirst: true,
}), normalDamage + (attackTalentBuild.attack - IRENA.attack),
  'Raven Assault must improve real normal-attack damage, not only the displayed stat.');
assert.strictEqual(createInitialFighter(defensiveTalentBuild, true).currentHp, defensiveTalentBuild.maxHp,
  'Last Wing must increase starting HP along with the displayed maximum.');
const armoredAttackTarget = createInitialFighter(KAISER, false, 40);
const rawNormalDamageAgainstArmor = calculateNormalAttackDamage({
  attacker: attackBase,
  target: armoredAttackTarget,
  config: { kaiserLevel: 10, abilities: [] },
  turn: 1,
  isActingFirst: true,
});
assert.strictEqual(
  rawNormalDamageAgainstArmor,
  normalDamage + 20,
  'Ironclad armor must replace the flat Heavy Armor reduction, not stack with it.',
);

assert.strictEqual(calculateUltimateDamage({
  attacker: attackBase,
  target: attackTarget,
  config,
  turn: 1,
  isActingFirst: true,
  ultimateVariant: 'OMNIPOTENCE',
}), 1500, 'OMNIPOTENCE must keep its original fixed damage without the talent.');

const oneAbyssRankIrena = applyIrenaTalentModifiers(IRENA, normalizeIrenaTalentProgress({
  experience: getIrenaXpForLevel(2),
  ranks: { WIND_READ: 0, FEATHER_RESONANCE: 0, ABYSS_RESONANCE: 1 },
}));
const oneAbyssRankAttacker = createInitialFighter(oneAbyssRankIrena, true);
const ultimateDamageContext = {
  attacker: oneAbyssRankAttacker,
  target: attackTarget,
  config,
  turn: 1,
  isActingFirst: true,
};
assert.strictEqual(
  calculateUltimateDamage(ultimateDamageContext),
  Math.round(IRENA.ultimateSkillDamage * 1.08),
  'The standard ultimate must receive the +8% talent multiplier exactly once.',
);
assert.strictEqual(
  calculateUltimateDamage({ ...ultimateDamageContext, ultimateVariant: 'RUIN' }),
  Math.round(Math.max(900, IRENA.ultimateSkillDamage) * 1.08),
  'RUIN must apply the talent bonus even when its 900 minimum damage is higher than the base skill stat.',
);
assert.strictEqual(
  calculateUltimateDamage({ ...ultimateDamageContext, ultimateVariant: 'OMNIPOTENCE' }),
  1620,
  'OMNIPOTENCE fixed damage must receive the one-rank +8% ultimate talent bonus.',
);
assert.strictEqual(
  calculateUltimateDamage({ ...ultimateDamageContext, ultimateVariant: 'ALL_GODS' }),
  0,
  'The talent multiplier must not alter the special ALL_GODS no-direct-damage calculation.',
);

const fullTalentAttacker = createInitialFighter(talentAdjustedIrena, true);
const fullTalentUltimateContext = { ...ultimateDamageContext, attacker: fullTalentAttacker };
assert.strictEqual(
  calculateUltimateDamage(fullTalentUltimateContext),
  Math.round(IRENA.ultimateSkillDamage * 1.24),
  'Three Abyss Resonance ranks must scale the standard ultimate by +24%.',
);
assert.strictEqual(
  calculateUltimateDamage({ ...fullTalentUltimateContext, ultimateVariant: 'RUIN' }),
  Math.round(Math.max(900, IRENA.ultimateSkillDamage) * 1.24),
  'Three ranks must scale RUIN after applying its 900 minimum base damage.',
);
assert.strictEqual(
  calculateUltimateDamage({ ...fullTalentUltimateContext, ultimateVariant: 'OMNIPOTENCE' }),
  1860,
  'Three Abyss Resonance ranks must scale OMNIPOTENCE fixed damage by +24%.',
);

const oneFeatherRankIrena = applyIrenaTalentModifiers(IRENA, normalizeIrenaTalentProgress({
  experience: getIrenaXpForLevel(2),
  ranks: { WIND_READ: 0, FEATHER_RESONANCE: 1, ABYSS_RESONANCE: 0 },
}));

const fallenConfig = { kaiserLevel: 10, abilities: [{ id: 'FALLEN', level: 1 }] };
const fallenAtTwelvePointFivePercent = createInitialFighter(IRENA, true);
fallenAtTwelvePointFivePercent.currentHp = 500;
const preparedFallenAtTwelvePointFivePercent = applyDynamicAbilityModifiers(
  fallenAtTwelvePointFivePercent,
  fallenConfig,
  1,
);
assert.strictEqual(preparedFallenAtTwelvePointFivePercent.character.maxHp, 10000);
const fallenTarget = createInitialFighter(KAISER, false);
const fallenDamageAboveFivePercent = calculateNormalAttackDamage({
  attacker: preparedFallenAtTwelvePointFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
});
assert.ok(
  fallenDamageAboveFivePercent < fallenTarget.currentHp,
  'Fallen must not execute an enemy when current HP is above 5% of the unmodified max HP.',
);

const fallenSpecialDamageAboveFivePercent = calculateSpecialDamage({
  attacker: preparedFallenAtTwelvePointFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
});
assert.ok(
  fallenSpecialDamageAboveFivePercent < fallenTarget.currentHp,
  'Fallen must not execute through Feather at 12.5% HP.',
);

const fallenSuperShotDamageAboveFivePercent = calculateSpecialDamage({
  attacker: preparedFallenAtTwelvePointFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  specialSkillId: 'SUPER_FALLEN_SHOT',
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
});
assert.ok(
  fallenSuperShotDamageAboveFivePercent > fallenTarget.currentHp,
  'Super Fallen Shot must keep its calculated damage when HP is above the execution threshold.',
);

const fallenUltimateDamageAboveFivePercent = calculateUltimateDamage({
  attacker: preparedFallenAtTwelvePointFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
});
assert.ok(
  fallenUltimateDamageAboveFivePercent < fallenTarget.currentHp,
  'Fallen must not execute through an ultimate at 12.5% HP.',
);

const fallenAtFivePercent = createInitialFighter(IRENA, true);
fallenAtFivePercent.currentHp = 200;
const preparedFallenAtFivePercent = applyDynamicAbilityModifiers(fallenAtFivePercent, fallenConfig, 1);
assert.strictEqual(calculateNormalAttackDamage({
  attacker: preparedFallenAtFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
}), fallenTarget.currentHp, 'Fallen execution must trigger at exactly 5% HP.');

assert.strictEqual(calculateSpecialDamage({
  attacker: preparedFallenAtFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
}), fallenTarget.currentHp, 'Feather must use the same 5% execution threshold.');

assert.strictEqual(calculateSpecialDamage({
  attacker: preparedFallenAtFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  specialSkillId: 'SUPER_FALLEN_SHOT',
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
}), fallenTarget.currentHp, 'Super Fallen Shot must use the same 5% execution threshold.');

assert.strictEqual(calculateUltimateDamage({
  attacker: preparedFallenAtFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
}), fallenTarget.currentHp, 'Ultimates must use the same 5% execution threshold.');

const buffed = { ...attackBase, isBuffed: true, buffDamageBonus: 125 };
assert.strictEqual(calculateNormalAttackDamage({
  attacker: buffed,
  target: attackTarget,
  config,
  turn: 1,
  isActingFirst: true,
}), 305);

const lv50Kaiser = createKaiserForLevel(KAISER, 50);
const maxSkillIrena = createInitialFighter(
  getIrenaWithSkillProgress({
    shards: 0,
    featherLevel: 10,
    ruinLevel: 1,
    featherPath: null,
    ruinPath: null,
  }),
  true,
);
const lv50FeatherDamage = calculateSpecialDamage({
  attacker: maxSkillIrena,
  target: createInitialFighter(lv50Kaiser, false),
  config: { kaiserLevel: 50, abilities: [] },
  turn: 1,
  isActingFirst: true,
});
assert.strictEqual(lv50Kaiser.maxHp, 3361);
assert.strictEqual(lv50Kaiser.attack, 224);
assert.strictEqual(lv50Kaiser.defense, 198);
assert.strictEqual(lv50Kaiser.speed, 260);
assert.strictEqual(lv50Kaiser.specialSkillDamage, 599);
assert.strictEqual(lv50Kaiser.ultimateSkillDamage, 838);
assert.strictEqual(maxSkillIrena.character.specialSkillDamage, 525);
assert.strictEqual(lv50FeatherDamage, 327);

assert.strictEqual(getJudgmentThreshold(1), 4);
assert.strictEqual(getJudgmentThreshold(2), 4);
assert.strictEqual(getJudgmentThreshold(3), 3);
assert.strictEqual(getJudgmentThreshold(4), 3);
assert.strictEqual(getJudgmentThreshold(5), 2);

assert.strictEqual(getJudgmentDamageMultiplier(1), 1.4);
assert.strictEqual(Math.round(getJudgmentDamageMultiplier(4) * 100) / 100, 1.85);
assert.strictEqual(getJudgmentDamageMultiplier(5), 3.0);
assert.strictEqual(getJudgmentDefenseIgnore(1), 0.20);
assert.strictEqual(Math.round(getJudgmentDefenseIgnore(4) * 100) / 100, 0.35);
assert.strictEqual(getJudgmentDefenseIgnore(5), 0.60);

const lv4BlackWing = applyStaticAbilityModifiers(IRENA, {
  kaiserLevel: 10,
  abilities: [{ id: 'BLACK_WING', level: 4 }],
});
const lv5BlackWing = applyStaticAbilityModifiers(IRENA, {
  kaiserLevel: 10,
  abilities: [{ id: 'BLACK_WING', level: 5 }],
});
assert.strictEqual(lv4BlackWing.specialSkillDamage, 540);
assert.strictEqual(lv5BlackWing.maxHp, 4400);
assert.strictEqual(lv5BlackWing.specialSkillDamage, 300);

const lv4AbyssKaiser = applyDynamicAbilityModifiers(
  createInitialFighter(KAISER, false),
  { kaiserLevel: 10, abilities: [{ id: 'ABYSS', level: 4 }] },
  2,
);
const lv5AbyssKaiser = applyDynamicAbilityModifiers(
  createInitialFighter(KAISER, false),
  { kaiserLevel: 10, abilities: [{ id: 'ABYSS', level: 5 }] },
  2,
);
assert.strictEqual(lv4AbyssKaiser.character.attack, 178);
assert.strictEqual(lv4AbyssKaiser.character.specialSkillDamage, KAISER.specialSkillDamage);
assert.strictEqual(lv5AbyssKaiser.character.attack, 176);
assert.strictEqual(lv5AbyssKaiser.character.specialSkillDamage, 470);
assert.strictEqual(lv5AbyssKaiser.character.ultimateSkillDamage, 658);

const judgmentTarget = createInitialFighter(KAISER, false);
const judgmentDamage = calculateNormalAttackDamage({
  attacker: attackBase,
  target: judgmentTarget,
  config: {
    kaiserLevel: 10,
    abilities: [{ id: 'JUDGMENT', level: 5 }],
  },
  turn: 1,
  isActingFirst: true,
  judgmentReady: true,
});
assert.strictEqual(judgmentDamage, 1454);

const buildAllocation = { maxHp: 3, attack: 4, defense: 2, speed: 3 };
const allocatedIrena = applyStatAllocation(IRENA, buildAllocation);
assert.strictEqual(allocatedIrena.maxHp, 4600);
assert.strictEqual(allocatedIrena.attack, 408);
assert.strictEqual(allocatedIrena.defense, 212);
assert.strictEqual(allocatedIrena.speed, 258);

const allocatedBattleCharacters = createBattleCharacters(IRENA, KAISER, {
  kaiserLevel: 10,
  abilities: [],
  statAllocation: buildAllocation,
});
assert.strictEqual(allocatedBattleCharacters.player.maxHp, 4600);
assert.strictEqual(allocatedBattleCharacters.player.attack, 408);
assert.strictEqual(allocatedBattleCharacters.player.defense, 212);
assert.strictEqual(allocatedBattleCharacters.player.speed, 258);

const normalLv100ForEx = createBattleCharacters(IRENA, KAISER, {
  kaiserLevel: 100,
  abilities: [],
}).enemy;
const exLv100ForTest = createBattleCharacters(IRENA, KAISER, {
  kaiserLevel: 100,
  kaiserChallengeMode: 'EX',
  abilities: [],
}).enemy;
for (const key of ['maxHp', 'attack', 'defense', 'speed', 'specialSkillDamage', 'ultimateSkillDamage', 'evasionRate']) {
  assert.strictEqual(exLv100ForTest[key], normalLv100ForEx[key] * 2,
    'EX Kaiser ' + key + ' must be twice the normal Lv.100 value.');
}
assert.strictEqual(exLv100ForTest.name, 'EXカイザー');


assert.strictEqual(getAbilityBuildMatchPercent('JUDGMENT', { maxHp: 0, attack: 6, defense: 0, speed: 6 }), 100);
assert.strictEqual(getAbilityBuildMatchPercent('FALLEN_KING', { maxHp: 6, attack: 0, defense: 6, speed: 0 }), 100);
assert.strictEqual(getAbilityBuildMatchPercent('ABYSS', { maxHp: 0, attack: 0, defense: 0, speed: 12 }), 100);
assert.strictEqual(getAbilityBuildMatchPercent('FALLEN_KING', { maxHp: 12, attack: 0, defense: 0, speed: 0 }), 100);

const extendedAllocation = { maxHp: 8, attack: 8, defense: 7, speed: 7 };
assert.strictEqual(getRemainingStatPoints(extendedAllocation, 30), 0);
const offensePreset = createStatPreset('OFFENSE', 20);
assert.strictEqual(getRemainingStatPoints(offensePreset, 20), 0);
assert.ok(offensePreset.attack >= offensePreset.speed);
const speedPreset = createStatPreset('SPEED', 20);
assert.strictEqual(getRemainingStatPoints(speedPreset, 20), 0);
assert.ok(speedPreset.speed > speedPreset.defense);

for (let i = 0; i < 20; i += 1) {
  assert.strictEqual(getRecruitmentRewardForPull(-1, true).kind, 'ABILITY_CORE');
}
console.log('✓ Stat presets and summon guarantee helper remain consistent.');

const storageValues = new Map();
globalThis.localStorage = {
  getItem: key => storageValues.has(key) ? storageValues.get(key) : null,
  setItem: (key, value) => storageValues.set(key, String(value)),
  removeItem: key => storageValues.delete(key),
  clear: () => storageValues.clear(),
};

const storageBeforeResonanceTests = new Map(storageValues);
try {
  assert.strictEqual(RESONANCE_DEFINITIONS.length, 10, 'Exactly ten resonance recipes must exist.');
  const recipePairs = RESONANCE_DEFINITIONS.map(recipe => [...recipe.ingredients].sort().join('+'));
  assert.strictEqual(new Set(recipePairs).size, 10, 'Resonance recipes must use ten distinct unordered source pairs.');
  assert.ok(RESONANCE_DEFINITIONS.every(recipe =>
    recipe.ingredients.length === 2 &&
    !recipe.ingredients.includes('ASTRAL_DOMINION') &&
    recipe.levelDescriptions.length === 5
  ), 'Each recipe must have two eligible ingredients and five level descriptions; ASTRAL_DOMINION is excluded.');
  assert.deepStrictEqual(
    [0, 1, 2, 3, 4, 5, 6].map(index => getFallenGodRevivalHpFraction(5, index)),
    [0.5, 0.25, 0.05, 0, 0, 0, 0],
    'Fallen God Lv.5 must provide the exact seven-stage revival sequence.',
  );
  assert.strictEqual(getFallenGodRevivalHpFraction(5, 7), null, 'Fallen God must stop reviving after seven lethal hits.');
  assert.strictEqual(getFallenGodStatMultiplier(5, 3), 4, 'Fallen God Lv.5 at HP1 must provide the specified x4 stat stage.');
  assert.strictEqual(getResonanceFeatherMultiplier('JUDGMENT_WING', 5), 15, 'Judgment Wing Lv.5 must replace the base feather multiplier with x15.');
  assert.strictEqual(getResonanceFeatherMultiplier('FALLEN_WING', 5), 10, 'Fallen Wing Lv.5 must replace the base feather multiplier with x10.');
  assert.strictEqual(getTurnErosionRate('ABYSS_FALLEN', 5, 0.06), 45, 'Abyss Fallen Lv.5 at HP10% or lower must erode every stat by 45 points per turn.');
  assert.strictEqual(getTurnErosionRate('ABYSS_WING', 5, 1), 18, 'Abyss Wing Lv.5 must erode 18% each turn.');
  assert.strictEqual(getFeatherErosionRate('ABYSS_WING', 5), 15, 'Abyss Wing Lv.5 must apply 15% extra erosion per landed Feather.');
  assert.deepStrictEqual(getKingZoneValues(5), {
    maxStacks: 6,
    defenseBonusPerStack: 0.08,
    directDamageReductionPerStack: 0.06,
  }, 'Abyss King Lv.5 must use the specified six-stack defense and mitigation values.');
  assert.strictEqual(getResonanceExecutionStats('ABYSS_JUDGMENT', 5).threshold, 6);
  assert.strictEqual(getResonanceExecutionStats('ABYSS_JUDGMENT', 5).overflowMultiplierCap, 2);
  assert.strictEqual(getResonanceExecutionStats('KING_JUDGMENT', 5).defenseIgnore, 0.9);

  const fallenOverlapFighter = createInitialFighter(IRENA, true);
  const fallenBaseStats = fallenOverlapFighter.resonanceBaseStats;
  fallenOverlapFighter.currentHp = Math.max(1, Math.round(fallenBaseStats.maxHp * 0.05));
  const fallenOverlapResult = applyDynamicAbilityModifiers(fallenOverlapFighter, {
    kaiserLevel: 10,
    abilities: [
      { id: 'FALLEN_WING', level: 5 },
      { id: 'FALLEN_JUDGMENT', level: 5 },
    ],
    imprints: [],
  }, 1);
  assert.strictEqual(
    fallenOverlapResult.character.attack,
    Math.round(fallenBaseStats.attack * 6.6),
    'Two fused abilities sharing FALLEN must use the strongest inherited low-HP multiplier once, not multiply both effects.',
  );

  const resonanceBattleHookSource = await readFile(new URL('./src/hooks/useBattleGame.ts', import.meta.url), 'utf8');
  assert.match(
    resonanceBattleHookSource,
    /isDirectHit = source !== '出血ダメージ' && source !== '星蝕ダメージ'/,
    'King Zone direct-hit mitigation and King Judgment stacks must not treat Star Eclipse ticks as direct attacks.',
  );
  assert.match(
    resonanceBattleHookSource,
    /specialSkillId === undefined\s*\|\|\s*\['FEATHER', 'FEATHER_PIERCE', 'FEATHER_RAPID', 'SUPER_FALLEN_SHOT'\]/,
    'Judgment Wing must treat an unspecified Irena special skill as the default Feather shot.',
  );
  console.log('✓ Ten resonance recipes, core level-value tables, overlapping inherited effects, and DoT hit classification are verified.');

  storageValues.clear();
  storageValues.set('duel_arena_ability_progress', JSON.stringify({
    levels: { ABYSS: 5, FALLEN: 5, BLACK_WING: 5, FALLEN_KING: 0, JUDGMENT: 4, ASTRAL_DOMINION: 1 },
    shards: { ABYSS: 2, FALLEN: 7, BLACK_WING: 5, FALLEN_KING: 0, JUDGMENT: 9, ASTRAL_DOMINION: 0 },
  }));
  const legacyAbilityProgress = loadAbilityProgress();
  const legacyResonanceProgress = loadResonanceProgress();
  assert.strictEqual(legacyAbilityProgress.levels.JUDGMENT, 4, 'Legacy base ability progress must be preserved.');
  assert.strictEqual(legacyResonanceProgress.unlocked, false, 'Legacy saves must default resonance to locked.');
  assert.strictEqual(legacyResonanceProgress.shards, 0, 'Legacy saves must safely default shared resonance shards.');

  const unlockResult = unlockAbilityResonance();
  assert.strictEqual(unlockResult.persisted, true);
  assert.strictEqual(loadResonanceProgress().unlocked, true, 'Resonance unlock state must persist.');
  const fused = combineResonanceAbility('FALLEN_WING');
  assert.strictEqual(fused.success, true, 'A locked-check-passing recipe with both source powers at Lv.5 must fuse.');
  assert.strictEqual(fused.progress.levels.FALLEN, 0);
  assert.strictEqual(fused.progress.levels.BLACK_WING, 0);
  assert.strictEqual(fused.progress.shards.FALLEN, 0);
  assert.strictEqual(fused.progress.shards.BLACK_WING, 0);
  assert.strictEqual(fused.progress.levels.JUDGMENT, 4, 'Fusion must not alter unrelated source powers.');
  assert.strictEqual(fused.resonance.levels.FALLEN_WING, 1);
  assert.strictEqual(fused.resonance.shards, 12, 'Unused source fragments must convert to shared resonance shards exactly once.');
  assert.ok(fused.resonance.craftedRecipes.includes('FALLEN_WING'));
  assert.strictEqual(loadResonanceProgress().craftedRecipes.includes('FALLEN_WING'), true, 'Crafted recipe records must survive reload.');

  const storedAfterFusion = JSON.parse(storageValues.get('duel_arena_ability_progress'));
  storedAfterFusion.levels.FALLEN = 5;
  storedAfterFusion.levels.BLACK_WING = 5;
  storedAfterFusion.shards.FALLEN = 3;
  storedAfterFusion.shards.BLACK_WING = 4;
  storedAfterFusion.resonance.shards = 400;
  storageValues.set('duel_arena_ability_progress', JSON.stringify(storedAfterFusion));
  const duplicateFusion = combineResonanceAbility('FALLEN_WING');
  assert.strictEqual(duplicateFusion.success, false, 'A crafted recipe must remain permanently unavailable even after ingredients are reacquired.');
  assert.ok(duplicateFusion.resonance.craftedRecipes.includes('FALLEN_WING'));

  const upgraded = upgradeResonanceAbility('FALLEN_WING');
  assert.strictEqual(upgraded.success, true, 'A resonance power with sufficient shared shards must upgrade.');
  assert.strictEqual(upgraded.resonance.levels.FALLEN_WING, 2);
  assert.strictEqual(upgraded.resonance.shards, 360, 'Lv.1 to Lv.2 must cost exactly 40 shared resonance shards.');
  console.log('✓ Resonance unlock, atomic fusion, permanent recipe records, fragment conversion, and upgrades are verified.');
} finally {
  storageValues.clear();
  for (const [key, value] of storageBeforeResonanceTests) storageValues.set(key, value);
}

const storageBeforeAchievementRewardTest = new Map(storageValues);
try {
  storageValues.clear();
  storageValues.set('duel_arena_battle_stats', JSON.stringify({ totalBattles: 35, wins: 12, losses: 23 }));
  const migratedLegacyWins = loadAchievementProgress();
  assert.strictEqual(migratedLegacyWins.eligibleWins, 12,
    'Existing non-developer save wins should seed achievement progress once.');
  assert.ok(storageValues.has('duel_arena_achievement_progress'),
    'The legacy achievement baseline should be persisted so it cannot be recalculated later.');

  storageValues.clear();
  storageValues.set('duel_arena_battle_stats', JSON.stringify({ totalBattles: 35, wins: 12, losses: 23 }));
  storageValues.set(STELLA_MODE_PROGRESS_KEY, JSON.stringify({ developerModeEnabled: true }));
  const migratedDeveloperWins = loadAchievementProgress();
  assert.strictEqual(migratedDeveloperWins.eligibleWins, 0,
    'Existing win totals must not be imported while Developer Tools mode is active.');

  storageValues.clear();
  storageValues.set('duel_arena_stat_points', '12');
  const eligibleWinSample = {
    playerWon: true,
    kaiserLevel: 10,
    challengeMode: 'NORMAL',
    turnNumber: 3,
    playerHp: 5,
    playerMaxHp: 100,
    actionsTaken: [],
    abilities: [],
    equippedImprints: [],
    usedImprints: [],
    logLines: [],
    difficulty: 'NORMAL',
  };
  const trackedWins = recordAchievementBattle(INITIAL_ACHIEVEMENT_PROGRESS, eligibleWinSample);
  assert.strictEqual(trackedWins.eligibleWins, 1,
    'Eligible gameplay wins must increment the achievement-specific count.');
  const imprintActivationSample = {
    ...eligibleWinSample,
    playerWon: false,
    actionsTaken: ['SPECIAL'],
    equippedImprints: ['FEATHER_SPLIT'],
    logLines: ACHIEVEMENT_IMPRINT_DEFINITIONS
      .filter(imprint => imprint.id !== 'FEATHER_SPLIT')
      .map(imprint => '【刻印発動：' + imprint.name + '】効果が発生した。'),
  };
  const trackedImprints = recordAchievementBattle(INITIAL_ACHIEVEMENT_PROGRESS, imprintActivationSample);
  assert.strictEqual(trackedImprints.usedImprintIds.length, ACHIEVEMENT_IMPRINT_DEFINITIONS.length,
    'All ten imprint triggers, including prefixed logs and the first Feather Split use, must count.');
  assert.strictEqual(getAchievementMetricValue('WINS', {
    progress: trackedWins,
    snapshot: {
      overallStats: { totalBattles: 100, wins: 99, losses: 1 },
      abilityProgress: { levels: {} },
    },
  }), 1, 'Developer/test wins in general statistics must not affect achievement win counts.');

  const eligibleForFirstReward = completeAchievementIds(INITIAL_ACHIEVEMENT_PROGRESS, ['first-victory']);
  assert.ok(persistAchievementProgress(eligibleForFirstReward));
  const firstClaim = claimAchievementReward('first-victory');
  assert.strictEqual(firstClaim.claimed, true, 'A completed achievement grants its reward the first time.');
  assert.strictEqual(loadStatPoints(), 17, 'The first achievement reward adds exactly five stat points.');
  const duplicateClaim = claimAchievementReward('first-victory');
  assert.strictEqual(duplicateClaim.claimed, false, 'A duplicate claim cannot grant the same reward twice.');
  assert.strictEqual(loadStatPoints(), 17, 'A duplicate claim must not change the resource balance.');

  const incompleteAchievements = loadAchievementProgress();
  assert.strictEqual(unlockAchievementUltimateAuthority().progress.levels.ASTRAL_DOMINION, 0,
    'The unique authority stays locked before full achievement completion.');
  const allAchievements = completeAchievementIds(incompleteAchievements, ACHIEVEMENT_DEFINITIONS.map(item => item.id));
  assert.ok(persistAchievementProgress(allAchievements));
  const unlockedAuthority = unlockAchievementUltimateAuthority();
  assert.strictEqual(unlockedAuthority.persisted, true);
  assert.strictEqual(unlockedAuthority.progress.levels.ASTRAL_DOMINION, 5,
    'Full completion unlocks the unique authority at max level.');
} finally {
  storageValues.clear();
  for (const [key, value] of storageBeforeAchievementRewardTest) storageValues.set(key, value);
}

assert.strictEqual(loadStatPoints(), 12, 'A missing stat-points key must use the initial 12 points.');
assert.strictEqual(addStatPoints(2), 14, 'A first win from a fresh save must add 2 points to the initial 12.');
assert.strictEqual(loadStatPoints(), 14);

// Stella progression must follow Lv.100 -> warp/regular Stella mode -> EX Kaiser -> final duel.
const stellaModeTestKeys = ['duel_arena_stat_points', 'duel_arena_raid_reward_progress', STELLA_MODE_PROGRESS_KEY];
const stellaModeStateBeforeTest = new Map(stellaModeTestKeys.map(key => [key, storageValues.get(key)]));
const originalSetItemForStellaModeTest = globalThis.localStorage.setItem;
const expectedInitialStellaProgress = {
  isUnlocked: false, stellaModeUnlocked: false, exKaiserDefeated: false,
  revealAvailable: false, kaiser100RewardClaimed: false, finalBattleCleared: false, finalBattleRewardClaimed: false,
};
try {
  storageValues.set('duel_arena_stat_points', '12');
  storageValues.set('duel_arena_raid_reward_progress', JSON.stringify({
    coreFragments: 0, imprintTickets: 0, bonusStatPoints: 0, claimedVictoryRunIds: [],
  }));
  storageValues.delete(STELLA_MODE_PROGRESS_KEY);

  assert.deepStrictEqual(loadStellaModeProgress(), expectedInitialStellaProgress,
    'A save created before Stella existed must default to locked without throwing.');
  assert.notStrictEqual(loadStellaModeProgress().developerModeEnabled, true,
    'A legacy save must not enable developer mode automatically.');
  const activatedDeveloperMode = enableDeveloperMode();
  assert.strictEqual(activatedDeveloperMode.persisted, true,
    'Developer mode should persist when storage is available.');
  assert.strictEqual(activatedDeveloperMode.progress.developerModeEnabled, true);
  assert.strictEqual(loadStellaModeProgress().developerModeEnabled, true,
    'Developer mode should remain enabled after reloading the saved progress.');
  assert.strictEqual(enableDeveloperMode().persisted, true,
    'Enabling developer mode again should be idempotent.');
  storageValues.delete(STELLA_MODE_PROGRESS_KEY);
  assert.strictEqual(unlockStellaMode().persisted, false, 'Stella mode cannot unlock before the Lv.100 reveal.');
  assert.strictEqual(recordExKaiserVictory().persisted, false, 'EX Kaiser cannot be recorded before its prerequisites.');

  // A legacy +50P marker with no warp flag must not get stuck on the old EX-first route.
  storageValues.set(STELLA_MODE_PROGRESS_KEY, JSON.stringify({
    isUnlocked: false, stellaModeUnlocked: false, exKaiserDefeated: false,
    revealAvailable: false, kaiser100RewardClaimed: true,
  }));
  assert.strictEqual(loadStellaModeProgress().revealAvailable, true,
    'A legacy +50P claim with no mode unlock must migrate to the warp entrance.');

  storageValues.delete(STELLA_MODE_PROGRESS_KEY);
  let failPointWriteOnce = true;
  globalThis.localStorage.setItem = (key, value) => {
    if (key === 'duel_arena_stat_points' && failPointWriteOnce) {
      failPointWriteOnce = false;
      throw new Error('simulated stat-point save failure');
    }
    originalSetItemForStellaModeTest(key, value);
  };
  const failedStellaClaim = claimKaiser100VictoryReward();
  assert.strictEqual(failedStellaClaim.persisted, false, 'A partial reward write must be reported as failure.');
  assert.strictEqual(loadStatPoints(), 12, 'A failed Lv.100 claim must not grant the 50 points.');
  assert.deepStrictEqual(loadStellaModeProgress(), expectedInitialStellaProgress,
    'A failed reward transaction must roll back the reveal and claim marker.');

  globalThis.localStorage.setItem = originalSetItemForStellaModeTest;
  const firstStellaClaim = claimKaiser100VictoryReward();
  assert.strictEqual(firstStellaClaim.persisted, true);
  assert.strictEqual(firstStellaClaim.rewardGranted, true);
  assert.strictEqual(loadStatPoints(), 62, 'A successful first claim grants exactly 50 base points.');
  assert.deepStrictEqual(firstStellaClaim.progress, {
    isUnlocked: false, stellaModeUnlocked: false, exKaiserDefeated: false,
    revealAvailable: true, kaiser100RewardClaimed: true, finalBattleCleared: false, finalBattleRewardClaimed: false,
  }, 'The Lv.100 win grants +50P and reveals the warp before Stella mode or EX is unlocked.');

  const repeatedStellaClaim = claimKaiser100VictoryReward();
  assert.strictEqual(repeatedStellaClaim.persisted, true);
  assert.strictEqual(repeatedStellaClaim.rewardGranted, false, 'Repeating the claim must not grant another reward.');
  assert.strictEqual(loadStatPoints(), 62, 'Repeated Lv.100 wins must not duplicate the +50 points.');

  const firstStellaUnlock = unlockStellaMode();
  assert.strictEqual(firstStellaUnlock.persisted, true, 'Confirming the warp should unlock playable Stella mode.');
  assert.deepStrictEqual(firstStellaUnlock.progress, {
    isUnlocked: false, stellaModeUnlocked: true, exKaiserDefeated: false,
    revealAvailable: false, kaiser100RewardClaimed: true, finalBattleCleared: false, finalBattleRewardClaimed: false,
  }, 'After the warp, Stella mode is open but EX victory and the final duel remain locked.');
  assert.strictEqual(unlockStellaMode().persisted, true, 'Stella-mode unlock confirmation should be idempotent.');

  const firstExVictory = recordExKaiserVictory();
  assert.strictEqual(firstExVictory.persisted, true);
  assert.deepStrictEqual(firstExVictory.progress, {
    isUnlocked: true, stellaModeUnlocked: true, exKaiserDefeated: true,
    revealAvailable: false, kaiser100RewardClaimed: true, finalBattleCleared: false, finalBattleRewardClaimed: false,
  }, 'Only an EX Kaiser victory after Stella mode unlock should open the dedicated final duel.');
  assert.strictEqual(recordExKaiserVictory().persisted, true, 'Repeating an EX victory must be idempotent.');
  assert.strictEqual(loadStatPoints(), 62, 'Unlocking Stella and beating EX must not repeat the +50P reward.');

  // Old saves where isUnlocked already meant final-battle access stay fully unlocked.
  storageValues.set(STELLA_MODE_PROGRESS_KEY, JSON.stringify({
    isUnlocked: true, exKaiserDefeated: false, kaiser100RewardClaimed: true,
  }));
  const migratedFinalBattle = loadStellaModeProgress();
  assert.strictEqual(migratedFinalBattle.stellaModeUnlocked, true);
  assert.strictEqual(migratedFinalBattle.exKaiserDefeated, true);
  assert.strictEqual(migratedFinalBattle.isUnlocked, true);
  storageValues.set(STELLA_MODE_PROGRESS_KEY, JSON.stringify(firstExVictory.progress));

  storageValues.set('duel_arena_raid_reward_progress', JSON.stringify({
    coreFragments: 0, imprintTickets: 0, bonusStatPoints: 17, claimedVictoryRunIds: [],
  }));
  assert.strictEqual(loadStatPoints(), 79, 'Existing raid bonus points remain included.');
  assert.strictEqual(claimStellaFinalBattleReward(false).persisted, false,
    'A non-victory cannot claim the final-battle reward.');
  assert.strictEqual(loadStatPoints(), 79, 'Rejected claims cannot change stat points.');
  assert.strictEqual(loadStellaModeProgress().finalBattleCleared, false);

  let failFinalBattlePointWriteOnce = true;
  globalThis.localStorage.setItem = (key, value) => {
    if (key === 'duel_arena_stat_points' && failFinalBattlePointWriteOnce) {
      failFinalBattlePointWriteOnce = false;
      throw new Error('simulated final-battle stat-point save failure');
    }
    originalSetItemForStellaModeTest(key, value);
  };
  const failedFinalBattleClaim = claimStellaFinalBattleReward(true);
  assert.strictEqual(failedFinalBattleClaim.persisted, false,
    'A failed final-battle reward transaction must report failure.');
  assert.strictEqual(storageValues.get('duel_arena_stat_points'), '62',
    'Failed final-battle reward must roll base points back.');
  assert.strictEqual(loadStatPoints(), 79,
    'Failed final-battle reward must preserve the existing raid bonus without double counting.');
  assert.strictEqual(loadStellaModeProgress().finalBattleCleared, false,
    'Failed final-battle reward must roll the clear marker back.');
  assert.strictEqual(loadStellaModeProgress().finalBattleRewardClaimed, false,
    'Failed final-battle reward must roll the reward marker back.');

  globalThis.localStorage.setItem = originalSetItemForStellaModeTest;
  const firstFinalBattleClaim = claimStellaFinalBattleReward(true);
  assert.strictEqual(firstFinalBattleClaim.persisted, true);
  assert.strictEqual(firstFinalBattleClaim.rewardGranted, true);
  assert.strictEqual(storageValues.get('duel_arena_stat_points'), '162',
    'The +100P reward must add to the stored base points, not the raid-inclusive total.');
  assert.strictEqual(loadStatPoints(), 179,
    'The +100P reward must preserve the 17 raid bonus points without double counting.');
  assert.strictEqual(firstFinalBattleClaim.progress.finalBattleCleared, true);
  assert.strictEqual(firstFinalBattleClaim.progress.finalBattleRewardClaimed, true);
  assert.strictEqual(loadStellaModeProgress().finalBattleRewardClaimed, true,
    'The final-Irena unlock marker persists across reloads.');
  const repeatedFinalBattleClaim = claimStellaFinalBattleReward(true);
  assert.strictEqual(repeatedFinalBattleClaim.persisted, true);
  assert.strictEqual(repeatedFinalBattleClaim.rewardGranted, false,
    'Repeated final-battle victories must not grant another reward.');
  assert.strictEqual(loadStatPoints(), 179,
    'Repeated final-battle victories must not alter the reward total.');

  const storageBeforeDeveloperResetTest = new Map(storageValues);
  try {
    storageValues.set(STELLA_MODE_PROGRESS_KEY, JSON.stringify({
      ...loadStellaModeProgress(),
      developerModeEnabled: true,
    }));
    storageValues.set('duel_arena_ability_progress', JSON.stringify({
      levels: { ABYSS: 0, FALLEN: 0, BLACK_WING: 0, FALLEN_KING: 0, JUDGMENT: 0, ASTRAL_DOMINION: 0 },
      shards: { ABYSS: 0, FALLEN: 0, BLACK_WING: 0, FALLEN_KING: 0, JUDGMENT: 0, ASTRAL_DOMINION: 0 },
      resonance: {
        unlocked: true,
        shards: 75,
        levels: { FALLEN_WING: 3 },
        craftedRecipes: ['FALLEN_WING'],
      },
    }));
    resetProgressForDeveloper();
    assert.notStrictEqual(loadStellaModeProgress().developerModeEnabled, true,
      'The in-game progression reset must disable persistent developer mode.');
    const resetResonance = loadResonanceProgress();
    assert.strictEqual(resetResonance.unlocked, false,
      'The full progression reset must clear the resonance unlock.');
    assert.strictEqual(resetResonance.shards, 0,
      'The full progression reset must clear resonance shards.');
    assert.strictEqual(resetResonance.levels.FALLEN_WING, 0,
      'The full progression reset must clear resonance levels.');
    assert.deepStrictEqual(resetResonance.craftedRecipes, [],
      'The full progression reset must clear permanent recipe records as part of a full account reset.');
  } finally {
    storageValues.clear();
    for (const [key, value] of storageBeforeDeveloperResetTest) storageValues.set(key, value);
  }
} finally {
  globalThis.localStorage.setItem = originalSetItemForStellaModeTest;
  for (const [key, value] of stellaModeStateBeforeTest) {
    if (value === undefined) storageValues.delete(key);
    else storageValues.set(key, value);
  }
}
console.log('✓ Stella Lv.100 -> warp -> playable mode -> EX -> final duel migration, rewards, and storage rollback are covered.');


// Full-game unlock must expose normal Irena combat, all registered modes, and each progression screen.
const fullUnlockTestKeys = [
  'duel_arena_stat_points',
  STELLA_MODE_PROGRESS_KEY,
  'duel_arena_kaiser_challenge_progress',
  'duel_arena_ability_progress',
  'duel_arena_recruitment_progress',
  'duel_arena_irena_skill_progress',
  IMPRINT_PROGRESS_STORAGE_KEY,
  'duel_arena_raid_reward_progress',
  'duel_arena_irena_talent_progress',
];
const fullUnlockSaveBeforeTest = new Map(fullUnlockTestKeys.map(key => [key, storageValues.get(key)]));
const windowDescriptorBeforeFullUnlockTest = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalSetItemBeforeFullUnlockTest = globalThis.localStorage.setItem;
try {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: { localStorage: globalThis.localStorage },
  });
  for (const key of fullUnlockTestKeys) storageValues.delete(key);
  storageValues.set('duel_arena_stat_points', '12');
  storageValues.set('duel_arena_raid_reward_progress', JSON.stringify({
    coreFragments: 0, imprintTickets: 0, bonusStatPoints: 0, claimedVictoryRunIds: [],
  }));

  const allFeaturesUnlock = unlockAllGameFeaturesForDeveloper();
  assert.strictEqual(allFeaturesUnlock.persisted, true, 'The full unlock must persist when storage is available.');
  assert.strictEqual(loadStellaModeProgress().allGameFeaturesUnlocked, true);
  assert.strictEqual(loadStellaModeProgress().developerModeEnabled, true);
  assert.strictEqual(loadStellaModeProgress().stellaModeUnlocked, true, 'Playable Stella mode should be unlocked.');
  assert.strictEqual(loadStellaModeProgress().exKaiserDefeated, true, 'EX Kaiser access and final battle must be unlocked.');
  assert.strictEqual(loadStellaModeProgress().isUnlocked, true, 'The final-battle Home entry should be available.');
  assert.strictEqual(loadStellaModeProgress().finalBattleRewardClaimed, false,
    'Unlocking access must not falsely claim the final-battle clear reward.');
  assert.strictEqual(loadStellaModeProgress().kaiser100RewardClaimed, true,
    'The +50P marker prevents a duplicate Lv.100 reward after the all-unlock action.');
  assert.strictEqual(loadStatPoints(), 62, 'A fresh all-unlock grants the Lv.100 unlock reward exactly once.');

  const kaiserProgress = JSON.parse(storageValues.get('duel_arena_kaiser_challenge_progress'));
  assert.deepStrictEqual(kaiserProgress, { unlockedLevel: 100 }, 'Normal Kaiser challenge progression must open through Lv.100.');

  const abilityProgressForFullUnlock = JSON.parse(storageValues.get('duel_arena_ability_progress'));
  for (const id of ['ABYSS', 'FALLEN', 'BLACK_WING', 'FALLEN_KING', 'JUDGMENT', 'ASTRAL_DOMINION']) {
    assert.strictEqual(abilityProgressForFullUnlock.levels[id], 0, id + ' must be consumed/locked after full unlock.');
    assert.strictEqual(abilityProgressForFullUnlock.shards[id], 0, id + ' source shards must be consumed after full unlock.');
  }
  const resonanceProgressForFullUnlock = loadResonanceProgress();
  assert.strictEqual(resonanceProgressForFullUnlock.unlocked, true,
    'Full feature unlock must unlock the resonance system.');
  assert.ok(resonanceProgressForFullUnlock.shards >= 9999,
    'Full feature unlock must supply shared resonance shards.');
  assert.deepStrictEqual(
    resonanceProgressForFullUnlock.craftedRecipes,
    RESONANCE_DEFINITIONS.map(definition => definition.id),
    'Full feature unlock must mark all ten recipes as available to test.',
  );
  for (const definition of RESONANCE_DEFINITIONS) {
    assert.strictEqual(resonanceProgressForFullUnlock.levels[definition.id], MAX_ABILITY_LEVEL,
      definition.id + ' must be max level after full feature unlock.');
  }
  assert.ok(JSON.parse(storageValues.get('duel_arena_recruitment_progress')).tickets >= 9999,
    'Recruitment screen must have enough tickets to use multi-pulls.');
  const skillProgressForFullUnlock = JSON.parse(storageValues.get('duel_arena_irena_skill_progress'));
  assert.strictEqual(skillProgressForFullUnlock.featherLevel, 3,
    'Unselected feather specialization must remain selectable after full unlock.');
  assert.strictEqual(skillProgressForFullUnlock.ruinLevel, 3,
    'Unselected ruin specialization must remain selectable after full unlock.');
  assert.ok(skillProgressForFullUnlock.superFallenShotUnlocked, 'The existing Irena ultimate must be unlocked.');
  assert.ok(skillProgressForFullUnlock.shards >= 9999);
  assert.strictEqual(loadImprintProgress().unlockedIds.length, IMPRINT_DEFINITIONS.length,
    'All registered imprints should be available for equipment.');
  const fullUnlockRaid = loadRaidRewardProgress();
  assert.ok(fullUnlockRaid.coreFragments >= 9999);
  assert.ok(fullUnlockRaid.imprintTickets >= 9999);
  const fullUnlockTalents = JSON.parse(storageValues.get('duel_arena_irena_talent_progress'));
  assert.strictEqual(getIrenaLevel(fullUnlockTalents.experience), 20, 'Irena talent progression should reach its configured cap.');
  assert.strictEqual(getAvailableIrenaTalentPoints(normalizeIrenaTalentProgress(fullUnlockTalents)), 9,
    'The full unlock should make all nine talent points available on a fresh save.');

  setResonanceAbilityForDeveloper('FALLEN_WING', 0);
  assert.strictEqual(loadResonanceProgress().levels.FALLEN_WING, 0,
    'Developer controls must be able to remove an injected resonance level for testing.');
  assert.ok(!loadResonanceProgress().craftedRecipes.includes('FALLEN_WING'),
    'Resetting a resonance test level to zero must clear its injected crafted state.');
  const simulatedDeveloperFusionSources = {
    ...abilityProgressForFullUnlock,
    levels: { ...abilityProgressForFullUnlock.levels, FALLEN: 5, BLACK_WING: 5 },
    shards: { ...abilityProgressForFullUnlock.shards, FALLEN: 12, BLACK_WING: 20 },
    resonance: {
      ...abilityProgressForFullUnlock.resonance,
      levels: { ...abilityProgressForFullUnlock.resonance.levels, FALLEN_WING: 0 },
      craftedRecipes: abilityProgressForFullUnlock.resonance.craftedRecipes.filter(id => id !== 'FALLEN_WING'),
    },
  };
  storageValues.set('duel_arena_ability_progress', JSON.stringify(simulatedDeveloperFusionSources));
  setResonanceAbilityForDeveloper('FALLEN_WING', 5);
  const developerFusedProgress = loadAbilityProgress();
  assert.strictEqual(developerFusedProgress.levels.FALLEN, 0,
    'Developer Tools must consume the first source ability when granting a resonance power.');
  assert.strictEqual(developerFusedProgress.shards.FALLEN, 0,
    'Developer Tools must consume source shards when granting a resonance power.');
  assert.strictEqual(developerFusedProgress.levels.BLACK_WING, 0,
    'Developer Tools must consume the second source ability when granting a resonance power.');
  assert.strictEqual(developerFusedProgress.shards.BLACK_WING, 0,
    'Developer Tools must consume the second source shards when granting a resonance power.');
  assert.strictEqual(developerFusedProgress.resonance.shards, 10031,
    'Developer fusion must convert leftover source shards into resonance shards.');
  assert.strictEqual(loadResonanceProgress().levels.FALLEN_WING, 5);
  assert.ok(loadResonanceProgress().craftedRecipes.includes('FALLEN_WING'));
  setResonanceShardsForDeveloper(1234);
  assert.strictEqual(loadResonanceProgress().shards, 1234,
    'Developer tools must be able to set the shared resonance currency.');
  assert.strictEqual(unlockAllGameFeaturesForDeveloper().persisted, true, 'The all-unlock action should be safe to repeat.');
  assert.strictEqual(loadStatPoints(), 62, 'Repeating the all-unlock action must not grant the +50P reward again.');
  assert.strictEqual(loadResonanceProgress().shards >= 9999, true,
    'Repeating full unlock must restore the resonance test currency without erasing resonance data.');

  assert.ok(chooseIrenaSkillPath('FEATHER', 'ABYSS'),
    'Full unlock must leave the feather specialization selectable.');
  assert.ok(chooseIrenaSkillPath('RUIN', 'EXECUTION'),
    'Full unlock must leave the ruin specialization selectable.');
  for (let level = 3; level < 10; level += 1) {
    assert.ok(upgradeIrenaSkill('FEATHER'), 'The chosen feather skill should be upgradeable through Lv.10.');
    assert.ok(upgradeIrenaSkill('RUIN'), 'The chosen ruin skill should be upgradeable through Lv.10.');
  }
  const fullyUpgradedSkills = loadSkillProgress();
  assert.strictEqual(fullyUpgradedSkills.featherLevel, 10);
  assert.strictEqual(fullyUpgradedSkills.ruinLevel, 10);

  const savedBeforeFailedUnlock = new Map(fullUnlockTestKeys.map(key => [key, storageValues.get(key)]));
  globalThis.localStorage.setItem = (key, value) => {
    if (key === 'duel_arena_kaiser_challenge_progress') throw new Error('simulated full-unlock save failure');
    originalSetItemBeforeFullUnlockTest(key, value);
  };
  const failedFullUnlock = unlockAllGameFeaturesForDeveloper();
  assert.strictEqual(failedFullUnlock.persisted, false, 'A failed full-unlock transaction must report failure.');
  for (const key of fullUnlockTestKeys) {
    assert.strictEqual(storageValues.get(key), savedBeforeFailedUnlock.get(key),
      'A failed full-unlock transaction must preserve the previous save: ' + key);
  }

  const developerToolsSourceForFullUnlock = await readFile(new URL('./src/components/DeveloperToolsScreen.tsx', import.meta.url), 'utf8');
  assert.match(developerToolsSourceForFullUnlock, /全機能開放/,
    'Developer Tools must provide the full game unlock button.');
  assert.doesNotMatch(developerToolsSourceForFullUnlock, /いれーな最終決戦をすぐ開始|onOpenStellaFinalBattle/,
    'The old final-battle shortcut must be replaced in Developer Tools.');
  const appSourceForFullUnlock = await readFile(new URL('./src/App.tsx', import.meta.url), 'utf8');
  assert.match(appSourceForFullUnlock, /currentStellaProgress\.allGameFeaturesUnlocked === true/,
    'Normal battle setup must use the saved flag to open all Kaiser levels.');
  assert.match(developerToolsSourceForFullUnlock, /権能共鳴テスト/);
  assert.match(developerToolsSourceForFullUnlock, /onSetResonanceAbility/);
  assert.match(developerToolsSourceForFullUnlock, /素材の元権能2種と欠片を消費/,
    'Developer Tools must explain that injecting a resonance power consumes its source powers.');
  const resonanceScreenSourceForCrafting = await readFile(new URL('./src/components/ResonanceScreen.tsx', import.meta.url), 'utf8');
  assert.match(resonanceScreenSourceForCrafting, /CRAFTABLE_RESONANCE_ABILITY_IDS/);
  assert.match(resonanceScreenSourceForCrafting, /合成対象外/);
  const battleSetupSourceForResonance = await readFile(new URL('./src/components/BattleSetupScreen.tsx', import.meta.url), 'utf8');
  assert.match(battleSetupSourceForResonance,
    /RESONANCE_DEFINITIONS\s*\.filter\(ability => resonanceProgress\.unlocked && \(resonanceProgress\.levels\[ability\.id\] \?\? 0\) > 0\)/,
    'Battle setup must only list owned resonance powers after unlocking the system.');
  assert.doesNotMatch(battleSetupSourceForResonance, /未合成|先に権能共鳴画面で合成してください/,
    'Battle setup must not display uncombined resonance placeholder cards or text.');
  const homeDashboardSourceForResonance = await readFile(new URL('./src/components/HomeDashboard.tsx', import.meta.url), 'utf8');
  assert.match(homeDashboardSourceForResonance, /home-dashboard__resonance-feature/);
  assert.match(homeDashboardSourceForResonance, /onOpenResonance/);
} finally {
  globalThis.localStorage.setItem = originalSetItemBeforeFullUnlockTest;
  for (const [key, value] of fullUnlockSaveBeforeTest) {
    if (value === undefined) storageValues.delete(key);
    else storageValues.set(key, value);
  }
  if (windowDescriptorBeforeFullUnlockTest) {
    Object.defineProperty(globalThis, 'window', windowDescriptorBeforeFullUnlockTest);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
}
console.log('✓ Full game unlock opens normal battles and progression, persists atomically, and is idempotent.');

// A single battle-result save is the sole source of battle talent EXP.
const talentProgressKeyForRewardTest = 'duel_arena_irena_talent_progress';
const battleRewardTestKeys = [
  'duel_arena_battle_stats',
  'duel_arena_irena_skill_progress',
  talentProgressKeyForRewardTest,
  'duel_arena_recruitment_progress',
  'duel_arena_stat_points',
];
const battleRewardStateBeforeTest = new Map(
  battleRewardTestKeys.map(key => [key, storageValues.get(key)]),
);
const windowDescriptorBeforeTalentRewardTest = Object.getOwnPropertyDescriptor(globalThis, 'window');
try {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: { localStorage: globalThis.localStorage },
  });
  storageValues.set(talentProgressKeyForRewardTest, JSON.stringify(INITIAL_IRENA_TALENT_PROGRESS));
  const singleBattleReward = saveBattleResult(true);
  assert.strictEqual(singleBattleReward.persisted, true, 'A normal battle result should persist all rewards.');
  assert.strictEqual(
    JSON.parse(storageValues.get(talentProgressKeyForRewardTest)).experience,
    100,
    'One victory save must grant exactly 100 talent EXP.',
  );

  const stellaBattleReward = saveBattleResult(true, 0, 'stella');
  assert.strictEqual(stellaBattleReward.persisted, true, 'A Stella battle result should still save the shared rewards.');
  assert.strictEqual(
    JSON.parse(storageValues.get(talentProgressKeyForRewardTest)).experience,
    100,
    'A Stella victory must not grant Irena talent EXP.',
  );
} finally {
  for (const [key, value] of battleRewardStateBeforeTest) {
    if (value === undefined) storageValues.delete(key);
    else storageValues.set(key, value);
  }
  if (windowDescriptorBeforeTalentRewardTest) {
    Object.defineProperty(globalThis, 'window', windowDescriptorBeforeTalentRewardTest);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
}

// Raid-exclusive reward persistence, idempotent victory claims, and permanent stat-point redemption.
const pointsBeforeRaidRewardTest = storageValues.get('duel_arena_stat_points');
const rewardBeforeRaidRewardTest = storageValues.get('duel_arena_raid_reward_progress');
assert.strictEqual(loadRaidRewardProgress().coreFragments, 0);
const firstRaidClaim = claimRaidVictoryReward('unit-test-raid-victory-001');
assert.strictEqual(firstRaidClaim.claimed, true, 'A new raid victory should grant one core fragment.');
assert.strictEqual(firstRaidClaim.progress.coreFragments, 1);
assert.strictEqual(firstRaidClaim.progress.imprintTickets, 1, 'Each unique raid victory also grants one imprint ticket.');
const repeatedRaidClaim = claimRaidVictoryReward('unit-test-raid-victory-001');
assert.strictEqual(repeatedRaidClaim.claimed, false, 'The same raid run must never pay out twice.');
assert.strictEqual(loadRaidRewardProgress().coreFragments, 1, 'A duplicate claim must not duplicate the item.');
assert.strictEqual(loadRaidRewardProgress().imprintTickets, 1, 'A duplicate claim must not duplicate the imprint ticket.');

const firstRedemption = redeemRaidCoreFragment();
assert.strictEqual(firstRedemption.used, true, 'A held core fragment should be redeemable.');
assert.strictEqual(firstRedemption.progress.coreFragments, 0, 'Redemption should consume exactly one fragment.');
assert.strictEqual(firstRedemption.progress.bonusStatPoints, 2, 'One fragment should permanently add two stat points.');
assert.strictEqual(loadStatPoints(), 16, 'Raid bonus points must be included in the main battle allocation pool.');
assert.strictEqual(redeemRaidCoreFragment().used, false, 'Redemption must fail cleanly with no fragment remaining.');

assert.strictEqual(addStatPoints(2), 18, 'Normal battle rewards must add to base points without double-counting raid bonuses.');
assert.strictEqual(loadStatPoints(), 18);
const secondRaidClaim = claimRaidVictoryReward('unit-test-raid-victory-002');
assert.strictEqual(secondRaidClaim.claimed, true, 'A different cleared raid run should grant its own reward.');
assert.strictEqual(redeemRaidCoreFragment().used, true);
assert.strictEqual(loadStatPoints(), 20, 'A second redeemed fragment should add another permanent two points.');
assert.strictEqual(claimRaidVictoryReward('').claimed, false, 'An empty run ID must never grant a reward.');

if (pointsBeforeRaidRewardTest === undefined) storageValues.delete('duel_arena_stat_points');
else storageValues.set('duel_arena_stat_points', pointsBeforeRaidRewardTest);
if (rewardBeforeRaidRewardTest === undefined) storageValues.delete('duel_arena_raid_reward_progress');
else storageValues.set('duel_arena_raid_reward_progress', rewardBeforeRaidRewardTest);
assert.strictEqual(loadStatPoints(), 14, 'Raid reward unit tests must restore the pre-test main progression.');
console.log('✓ Raid-exclusive item claims are idempotent and redeem into persistent main-game stat points.');

const imprintSaveBeforeTest = storageValues.get(IMPRINT_PROGRESS_STORAGE_KEY);
storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, JSON.stringify({ unlockedIds: [], equippedIds: [] }));
assert.deepStrictEqual(loadImprintProgress(), { unlockedIds: [], equippedIds: [] });
const unlockedForesight = unlockImprint('FORESIGHT');
assert.deepStrictEqual(unlockedForesight?.unlockedIds, ['FORESIGHT'], 'A known imprint can be unlocked.');
assert.deepStrictEqual(loadImprintProgress().unlockedIds, ['FORESIGHT'], 'Unlock state must persist.');
const equippedForesight = equipImprint('FORESIGHT');
assert.deepStrictEqual(equippedForesight?.equippedIds, ['FORESIGHT'], 'An unlocked imprint can be equipped.');
assert.deepStrictEqual(loadImprintProgress().equippedIds, ['FORESIGHT'], 'Equipment must persist.');
assert.strictEqual(equipImprint('FORESIGHT')?.equippedIds.length, 1, 'Duplicate equipment must not duplicate a slot.');
assert.deepStrictEqual(unequipImprint('FORESIGHT')?.equippedIds, [], 'An equipped imprint can be removed and saved.');
assert.strictEqual(equipImprint('FORESIGHT')?.equippedIds.includes('FORESIGHT'), true, 'Re-equipping after removal must work.');
assert.strictEqual(unlockImprint('FORESIGHT')?.unlockedIds.length, 1, 'Duplicate acquisition must not duplicate ownership.');
assert.strictEqual(MAX_EQUIPPED_IMPRINTS, 3, 'The imprint loadout has three slots.');

assert.strictEqual(FEATHER_SPLIT_PIERCE_MULTIPLIER, 1.3);
assert.strictEqual(FEATHER_SPLIT_RAPID_MULTIPLIER, 0.7);
assert.strictEqual(FEATHER_SPLIT_ALTERNATION_BONUS, 0.15);
assert.strictEqual(FEATHER_SPLIT_PIERCE_COOLDOWN, 3);
assert.strictEqual(FEATHER_SPLIT_RAPID_COOLDOWN, 2);
assert.strictEqual(getFeatherSplitModeForSkill('FEATHER_PIERCE'), 'PIERCE');
assert.strictEqual(getFeatherSplitModeForSkill('FEATHER_RAPID'), 'RAPID');
assert.strictEqual(getFeatherSplitModeForSkill('FEATHER'), null);
assert.deepStrictEqual(resolveFeatherSplitDamage(100, 'PIERCE', null), {
  damage: 130, baseMultiplier: 1.3, multiplier: 1.3, alternatingBonusApplied: false,
});
assert.deepStrictEqual(resolveFeatherSplitDamage(100, 'RAPID', null), {
  damage: 70, baseMultiplier: 0.7, multiplier: 0.7, alternatingBonusApplied: false,
});
const splitAlternation = resolveFeatherSplitDamage(100, 'RAPID', 'PIERCE');
assert.strictEqual(splitAlternation.damage, 81, 'Switching modes should add the one-use 15% bonus.');
assert.strictEqual(splitAlternation.alternatingBonusApplied, true);
assert.strictEqual(splitAlternation.multiplier, 0.7 * 1.15);
assert.strictEqual(resolveFeatherSplitDamage(100, 'PIERCE', 'PIERCE').alternatingBonusApplied, false,
  'Repeating the same mode must not trigger alternation.');
assert.strictEqual(resolveFeatherSplitDamage(Number.NaN, 'PIERCE', null).damage, 0,
  'Invalid damage must be sanitized.');
const splitCooldownFighter = {
  specialCooldownRemaining: 5,
  featherPierceCooldownRemaining: 2,
  featherRapidCooldownRemaining: 1,
};
assert.strictEqual(getSpecialCooldownRemaining(splitCooldownFighter, 'FEATHER_PIERCE', true), 2);
assert.strictEqual(getSpecialCooldownRemaining(splitCooldownFighter, 'FEATHER_RAPID', true), 1);
assert.strictEqual(getSpecialCooldownRemaining(splitCooldownFighter, 'FEATHER_PIERCE', false), 5,
  'Without the imprint, legacy shared cooldown remains authoritative.');
assert.strictEqual(IMPRINT_DEFINITIONS.some(imprint => imprint.id === 'FEATHER_SPLIT'), true,
  'Feather Split must be registered as an obtainable imprint.');
assert.deepStrictEqual(normalizeEquippedImprints(['FEATHER_SPLIT', 'FEATHER_SPLIT']), ['FEATHER_SPLIT']);
const splitDamageConfig = { kaiserLevel: 10, abilities: [], imprints: ['FEATHER_SPLIT'] };
const splitDamageAttacker = createInitialFighter(IRENA, true);
const splitDamageTarget = createInitialFighter(KAISER, false);
assert.strictEqual(calculateSpecialDamage({
  attacker: splitDamageAttacker, target: splitDamageTarget, config: splitDamageConfig,
  turn: 1, isActingFirst: true, specialSkillId: 'FEATHER_PIERCE',
}), 156, 'Piercing should scale the otherwise 120-damage baseline by 1.30.');
assert.strictEqual(calculateSpecialDamage({
  attacker: splitDamageAttacker, target: splitDamageTarget, config: splitDamageConfig,
  turn: 1, isActingFirst: true, specialSkillId: 'FEATHER_RAPID',
}), 84, 'Rapid should scale the otherwise 120-damage baseline by 0.70.');

const oneFeatherRankAttacker = createInitialFighter(oneFeatherRankIrena, true);
const oneFeatherRankDamage = calculateSpecialDamage({
  attacker: oneFeatherRankAttacker, target: splitDamageTarget, config,
  turn: 1, isActingFirst: true,
});
assert.strictEqual(oneFeatherRankDamage, Math.round(120 * 1.06),
  'Feather Resonance should increase final Feather damage by exactly 6% after target defense.');
const fullTalentFeatherDamage = calculateSpecialDamage({
  attacker: fullTalentAttacker, target: splitDamageTarget, config,
  turn: 1, isActingFirst: true,
});
assert.strictEqual(fullTalentFeatherDamage, Math.round(120 * 1.18),
  'Three Feather Resonance ranks should increase final Feather damage by exactly 18%.');
assert.strictEqual(calculateSpecialDamage({
  attacker: oneFeatherRankAttacker, target: splitDamageTarget, config: splitDamageConfig,
  turn: 1, isActingFirst: true, specialSkillId: 'FEATHER_PIERCE',
}), Math.round(156 * 1.06),
  'Feather Resonance should consistently scale the final Piercing hit.');
assert.strictEqual(calculateSpecialDamage({
  attacker: oneFeatherRankAttacker, target: splitDamageTarget, config: splitDamageConfig,
  turn: 1, isActingFirst: true, specialSkillId: 'FEATHER_RAPID',
}), Math.round(84 * 1.06),
  'Feather Resonance should consistently scale the final Rapid hit.');
assert.strictEqual(calculateSpecialDamage({
  attacker: { ...oneFeatherRankAttacker, lastFeatherSplitMode: 'PIERCE' },
  target: splitDamageTarget, config: splitDamageConfig,
  turn: 1, isActingFirst: true, specialSkillId: 'FEATHER_RAPID',
}), Math.round(97 * 1.06),
  'Feather Resonance should scale the final hit after the alternation bonus, without double application.');
assert.strictEqual(getEffectiveSpeed(fullTalentAttacker), IRENA.speed + 15,
  'Wind Reading speed must flow through the actual effective-speed calculation.');
assert.strictEqual(getEffectiveDefense(fullTalentAttacker), IRENA.defense - 9,
  'Abyss Resonance defense reduction must flow through the actual effective-defense calculation.');

const oneFeatherBlackWingConfig = { kaiserLevel: 10, abilities: [{ id: 'BLACK_WING', level: 1 }] };
const oneFeatherWithBlackWing = createBattleCharacters(oneFeatherRankIrena, KAISER, oneFeatherBlackWingConfig).player;
const oneFeatherWithBlackWingFighter = createInitialFighter(oneFeatherWithBlackWing, true);
assert.strictEqual(calculateSpecialDamage({
  attacker: oneFeatherWithBlackWingFighter,
  target: splitDamageTarget,
  config: oneFeatherBlackWingConfig,
  turn: 1,
  isActingFirst: true,
}), Math.round((Math.round(IRENA.specialSkillDamage * 1.2) - KAISER.defense) * 1.06),
  'Feather Resonance must stack with Black Wing Lv1 without dropping its base-damage bonus or double-applying talent.');
assert.strictEqual(calculateSpecialDamage({
  attacker: { ...splitDamageAttacker, lastFeatherSplitMode: 'PIERCE' },
  target: splitDamageTarget, config: splitDamageConfig,
  turn: 1, isActingFirst: true, specialSkillId: 'FEATHER_RAPID',
}), 97, 'Alternation bonus must be included in the displayed/computed damage.');

assert.deepStrictEqual(normalizeEquippedImprints(['FORESIGHT', 'FORESIGHT', 'UNKNOWN', null]), ['FORESIGHT']);
assert.deepStrictEqual(normalizeEquippedImprints(['BLOOD_TEAR', 'BLOOD_MEDIA']), ['BLOOD_TEAR'],
  'Legacy saves containing both blood imprints must normalize to one effect.');
assert.deepStrictEqual(normalizeEquippedImprints(['BLOOD_MEDIA', 'BLOOD_TEAR']), ['BLOOD_MEDIA'],
  'Blood-imprint exclusivity must be deterministic and preserve the first valid choice.');
assert.strictEqual(getOpposingBloodImprint('BLOOD_TEAR'), 'BLOOD_MEDIA');
assert.strictEqual(getOpposingBloodImprint('BLOOD_MEDIA'), 'BLOOD_TEAR');
assert.strictEqual(getOpposingBloodImprint('WIND_GUARD'), null);
assert.strictEqual(getBloodTearBurstDamage(30, 3), 135);
assert.strictEqual(getBloodTearBurstDamage(40, 4), 240);
assert.strictEqual(getBloodTearBurstDamage(-30, 3), 0);
assert.strictEqual(getBloodTearBurstDamage(30, -1), 0);
assert.strictEqual(WIND_GUARD_MAX_REDUCTION, 0.4);
assert.strictEqual(getWindGuardCounterDamage(300), 75);
assert.strictEqual(getWindGuardCounterDamage(-10), 0);
assert.deepStrictEqual(resolveWindGuardDamage(1, 500, true), {
  damage: 1, reducedBy: 0, counterDamage: 125, applied: true,
}, 'Rounding must not reduce a one-point hit by more than the 40% cap.');
assert.deepStrictEqual(resolveWindGuardDamage(200, 300, true), {
  damage: 140, reducedBy: 60, counterDamage: 75, applied: true,
});
assert.deepStrictEqual(resolveWindGuardDamage(200, 500, true), {
  damage: 120, reducedBy: 80, counterDamage: 125, applied: true,
}, 'Wind Guard mitigation must cap at 40% while counter damage scales from stored feather power.');
assert.deepStrictEqual(resolveWindGuardDamage(200, 300, false), {
  damage: 200, reducedBy: 0, counterDamage: 0, applied: false,
});
assert.strictEqual(COSTLY_SHOT_HP_COST, 200);

const eligibleForesight = {
  equippedImprints: ['FORESIGHT'],
  usedImprints: [],
  attackerIsPlayer: false,
  targetIsPlayer: true,
  targetIsEvading: true,
  incomingAction: 'SPECIAL',
  predictedAction: 'SPECIAL',
};
assert.strictEqual(shouldTriggerForesight(eligibleForesight), true, 'Foresight triggers against a forecast special.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, incomingAction: 'ULTIMATE', predictedAction: 'ULTIMATE' }), true, 'Foresight triggers against a forecast ultimate.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, targetIsEvading: false }), false, 'Foresight requires choosing evade.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, usedImprints: ['FORESIGHT'] }), false, 'Foresight is once per battle.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, equippedImprints: [] }), false, 'An unequipped imprint cannot trigger.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, attackerIsPlayer: true }), false, 'Foresight only counters the CPU.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, targetIsPlayer: false }), false, 'Foresight cannot trigger against a CPU target.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, incomingAction: 'ATTACK', predictedAction: 'ATTACK' }), false, 'Normal attacks are outside the effect.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, incomingAction: 'SPECIAL', predictedAction: 'ULTIMATE' }), false, 'The move must match the announced prediction.');

assert.strictEqual(shouldSuppressCpuBuffAction('BUFF', false, ['CHANT_HUNT']), true,
  'Chant Hunt must suppress the CPU buff action.');
assert.strictEqual(shouldSuppressCpuBuffAction('BUFF', true, ['CHANT_HUNT']), false,
  'Chant Hunt must never suppress a player action.');
assert.strictEqual(shouldSuppressCpuBuffAction('ATTACK', false, ['CHANT_HUNT']), false,
  'Chant Hunt must not alter the CPU attack action.');
assert.strictEqual(shouldSuppressCpuBuffAction('BUFF', false, ['FORESIGHT']), false,
  'Chant Hunt must be equipped to suppress CPU buffs.');

assert.strictEqual(YIN_YANG_DAMAGE_REDUCTION, 0.5);
const fastYinYangPlan = getTurnExecutionPlan('YIN_YANG', 'BUFF', 240, 80);
assert.strictEqual(fastYinYangPlan.playerGoesFirst, true);
assert.strictEqual(fastYinYangPlan.firstAction, 'YIN_YANG');
assert.strictEqual(fastYinYangPlan.secondAction, 'BUFF');
assert.strictEqual(fastYinYangPlan.yinYangDefenseActive, true,
  'Yin-Yang defense must be primed when the player acts first.');
const slowYinYangPlan = getTurnExecutionPlan('YIN_YANG', 'BUFF', 60, 80);
assert.strictEqual(slowYinYangPlan.playerGoesFirst, false);
assert.strictEqual(slowYinYangPlan.firstAction, 'BUFF');
assert.strictEqual(slowYinYangPlan.secondAction, 'YIN_YANG');
assert.strictEqual(slowYinYangPlan.yinYangDefenseActive, true,
  'Yin-Yang defense must be primed before the CPU acts even when the player is slower.');

assert.deepStrictEqual(resolveYinYangDefense(200, {
  attackerIsPlayer: false, targetIsPlayer: true, defenseActive: fastYinYangPlan.yinYangDefenseActive,
}), { damage: 100, reducedBy: 100, applied: true });
assert.deepStrictEqual(resolveYinYangDefense(201, {
  attackerIsPlayer: false, targetIsPlayer: true, defenseActive: slowYinYangPlan.yinYangDefenseActive,
}), { damage: 100, reducedBy: 101, applied: true },
  'Yin-Yang mitigation must work before the player action resolves.');
assert.deepStrictEqual(resolveYinYangDefense(200, {
  attackerIsPlayer: true, targetIsPlayer: false, defenseActive: true,
}), { damage: 200, reducedBy: 0, applied: false },
  'Yin-Yang must not reduce the player hitting the CPU.');
assert.deepStrictEqual(resolveYinYangDefense(200, {
  attackerIsPlayer: false, targetIsPlayer: true, defenseActive: false,
}), { damage: 200, reducedBy: 0, applied: false },
  'Yin-Yang defense expires outside the chosen turn.');

assert.deepStrictEqual(unlockImprint('CHANT_HUNT')?.unlockedIds, ['FORESIGHT', 'CHANT_HUNT']);
assert.deepStrictEqual(unlockImprint('YIN_YANG')?.unlockedIds, ['FORESIGHT', 'CHANT_HUNT', 'YIN_YANG']);
assert.deepStrictEqual(normalizeEquippedImprints(['FORESIGHT', 'CHANT_HUNT', 'YIN_YANG', 'YIN_YANG']),
  ['FORESIGHT', 'CHANT_HUNT', 'YIN_YANG']);

for (const equippedId of loadImprintProgress().equippedIds) unequipImprint(equippedId);
unlockImprint('BLOOD_TEAR');
unlockImprint('BLOOD_MEDIA');
assert.ok(equipImprint('BLOOD_TEAR')?.equippedIds.includes('BLOOD_TEAR'));
const switchedToBloodMedia = equipImprint('BLOOD_MEDIA');
assert.ok(switchedToBloodMedia?.equippedIds.includes('BLOOD_MEDIA'));
assert.strictEqual(switchedToBloodMedia?.equippedIds.includes('BLOOD_TEAR'), false,
  'Equipping Blood Media automatically removes mutually exclusive Blood Tear.');
assert.ok(switchedToBloodMedia?.equippedIds.length <= MAX_EQUIPPED_IMPRINTS);

if (imprintSaveBeforeTest === undefined) storageValues.delete(IMPRINT_PROGRESS_STORAGE_KEY);
else storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, imprintSaveBeforeTest);
console.log('✓ Imprint persistence and Foresight trigger gates are consistent.');

// Imprint gacha spends one dedicated ticket, excludes owned imprints, and stops when complete.
const gachaRaidSaveBeforeTest = storageValues.get('duel_arena_raid_reward_progress');
const gachaImprintSaveBeforeTest = storageValues.get(IMPRINT_PROGRESS_STORAGE_KEY);
storageValues.set('duel_arena_raid_reward_progress', JSON.stringify({
  coreFragments: 0, imprintTickets: 2, bonusStatPoints: 0, claimedVictoryRunIds: [],
}));
storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, JSON.stringify({ unlockedIds: ['FORESIGHT'], equippedIds: [] }));
const firstImprintDraw = drawImprintGacha(() => 0);
assert.strictEqual(firstImprintDraw.status, 'DRAWN');
assert.strictEqual(firstImprintDraw.imprint.id, 'CHANT_HUNT', 'Owned imprints must be excluded from the draw pool.');
assert.strictEqual(firstImprintDraw.raidRewardProgress.imprintTickets, 1, 'One draw consumes one ticket.');
assert.deepStrictEqual(firstImprintDraw.imprintProgress.unlockedIds, ['FORESIGHT', 'CHANT_HUNT']);
const secondImprintDraw = drawImprintGacha(() => 0);
assert.strictEqual(secondImprintDraw.status, 'DRAWN');
assert.strictEqual(secondImprintDraw.imprint.id, 'YIN_YANG', 'The next draw must choose the only unowned imprint.');
assert.strictEqual(secondImprintDraw.raidRewardProgress.imprintTickets, 0);
for (const imprint of IMPRINT_DEFINITIONS) unlockImprint(imprint.id);
storageValues.set('duel_arena_raid_reward_progress', JSON.stringify({
  coreFragments: 0, imprintTickets: 1, bonusStatPoints: 0, claimedVictoryRunIds: [],
}));
const allCollectedDraw = drawImprintGacha(() => 0);
assert.strictEqual(allCollectedDraw.status, 'ALL_COLLECTED', 'The draw must end once every registered imprint is owned.');
assert.strictEqual(allCollectedDraw.raidRewardProgress.imprintTickets, 1, 'A completed collection must not consume the remaining ticket.');
storageValues.set('duel_arena_raid_reward_progress', JSON.stringify({
  coreFragments: 0, imprintTickets: 0, bonusStatPoints: 0, claimedVictoryRunIds: [],
}));
storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, JSON.stringify({ unlockedIds: ['FORESIGHT'], equippedIds: [] }));
const noTicketDraw = drawImprintGacha(() => 0);
assert.strictEqual(noTicketDraw.status, 'NO_TICKETS');
assert.deepStrictEqual(noTicketDraw.imprintProgress.unlockedIds, ['FORESIGHT'], 'A draw without tickets must not unlock an imprint.');
if (gachaRaidSaveBeforeTest === undefined) storageValues.delete('duel_arena_raid_reward_progress');
else storageValues.set('duel_arena_raid_reward_progress', gachaRaidSaveBeforeTest);
if (gachaImprintSaveBeforeTest === undefined) storageValues.delete(IMPRINT_PROGRESS_STORAGE_KEY);
else storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, gachaImprintSaveBeforeTest);

// Developer controls must update the dedicated ticket inventory and unlock every registered imprint.
const developerRaidSaveBeforeTest = storageValues.get('duel_arena_raid_reward_progress');
const developerImprintSaveBeforeTest = storageValues.get(IMPRINT_PROGRESS_STORAGE_KEY);
storageValues.set('duel_arena_raid_reward_progress', JSON.stringify({
  coreFragments: 0, imprintTickets: 3, bonusStatPoints: 0, claimedVictoryRunIds: [],
}));
storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, JSON.stringify({
  unlockedIds: ['FORESIGHT'], equippedIds: ['FORESIGHT'],
}));
assert.strictEqual(addImprintTicketsForDeveloper(7).imprintTickets, 10,
  'Developer ticket addition must modify the dedicated imprint ticket balance.');
assert.strictEqual(setImprintTicketsForDeveloper(99).imprintTickets, 99,
  'Developer ticket setting must set the dedicated imprint ticket balance.');
const allDeveloperImprints = unlockAllImprintsForDeveloper();
assert.deepStrictEqual(allDeveloperImprints?.unlockedIds, IMPRINT_DEFINITIONS.map(imprint => imprint.id),
  'Developer unlock-all must unlock every registered imprint.');
assert.deepStrictEqual(allDeveloperImprints?.equippedIds, ['FORESIGHT'],
  'Unlock-all must preserve the existing loadout rather than equip everything.');
if (developerRaidSaveBeforeTest === undefined) storageValues.delete('duel_arena_raid_reward_progress');
else storageValues.set('duel_arena_raid_reward_progress', developerRaidSaveBeforeTest);
if (developerImprintSaveBeforeTest === undefined) storageValues.delete(IMPRINT_PROGRESS_STORAGE_KEY);
else storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, developerImprintSaveBeforeTest);
console.log('✓ Developer imprint ticket and unlock-all controls follow current registration.');



for (let i = 0; i < 8; i += 1) {
  storageValues.set('duel_arena_recruitment_progress', JSON.stringify({ tickets: 10, totalPulls: i * 10, collectedIds: [], lastResults: [] }));
  const drawResult = performRecruitment(10);
  assert.ok(drawResult, '10-pull should be available with 10 tickets.');
  assert.ok(drawResult.results.some(draw => draw.reward.kind === 'ABILITY_CORE'), `10-pull ${i + 1} must contain an ability core.`);
}
console.log('✓ Actual 10-pull execution preserves the ability-core guarantee.');

assert.ok(getEffectiveSpeed(attackBase) >= getEffectiveSpeed(attackTarget), 'Equal-speed rule must allow player first.');

const cpuForAi = createInitialFighter(KAISER, false);
const chargingIrena = {
  ...createInitialFighter(IRENA, true),
  isSuperFallenShotCharging: true,
  ultimateGauge: 0,
  featherChargeBonus: 0,
};
assert.strictEqual(
  CpuAi.decideAction(cpuForAi, chargingIrena, 'EXPERT'),
  'EVADE',
  'Expert CPU should respect an explicitly charging Super Fallen Shot by choosing evade.'
);

const pressuredCpu = {
  ...cpuForAi,
  activeAilments: [{ type: 'PRESSURE', remainingTurns: 2 }],
};
assert.strictEqual(
  CpuAi.decideAction(pressuredCpu, attackBase, 'NORMAL'),
  'SPECIAL',
  'A pressured Kaiser should prefer its fixed-damage special over a weakened normal attack.'
);

const emptyStatAllocation = { maxHp: 0, attack: 0, defense: 0, speed: 0 };
const baselineConfigForLevel = level => ({
  kaiserLevel: level,
  abilities: [],
  statAllocation: { ...emptyStatAllocation },
  statPointTotal: 12,
});

const levelStats = BATTLE_CHALLENGE_LEVELS.map(level => {
  const config = baselineConfigForLevel(level);
  const { player: playerCharacter, enemy: kaiser } = createBattleCharacters(IRENA, cpuKaiserBase, config);
  const player = createInitialFighter(playerCharacter, true);
  const enemy = createInitialFighter(kaiser, false, level);
  const rawPlayerDamage = calculateNormalAttackDamage({
    attacker: player,
    target: enemy,
    config,
    turn: 1,
    isActingFirst: true,
  });
  const resolvedPlayerHit = resolveKaiserHit(enemy, rawPlayerDamage, level, 1, true, '通常攻撃');
  const cpuDamage = calculateNormalAttackDamage({
    attacker: enemy,
    target: player,
    config,
    turn: 1,
    isActingFirst: false,
  });
  return {
    level,
    maxHp: kaiser.maxHp,
    attack: kaiser.attack,
    defense: kaiser.defense,
    speed: kaiser.speed,
    specialSkillDamage: kaiser.specialSkillDamage,
    ultimateSkillDamage: kaiser.ultimateSkillDamage,
    playerDamage: resolvedPlayerHit.damage,
    cpuDamage,
    armorMax: enemy.kaiserArmorMax ?? 0,
  };
});

for (let i = 1; i < levelStats.length; i += 1) {
  assert.ok(levelStats[i].maxHp > levelStats[i - 1].maxHp, 'Kaiser HP must rise with level.');
  assert.ok(levelStats[i].attack > levelStats[i - 1].attack, 'Kaiser attack must rise with level.');
  assert.ok(levelStats[i].defense > levelStats[i - 1].defense, 'Kaiser defense must rise with level.');
  assert.ok(levelStats[i].playerDamage <= levelStats[i - 1].playerDamage, 'Higher defense/armor must not increase the resolved first normal-hit damage.');
}

function simulateNormalAttackBattle(level, statAllocation = emptyStatAllocation) {
  // Deterministic reference model: normal attacks only, no evasion, criticals,
  // status ailments, abilities, or CPU action selection. Damage and Kaiser
  // armor/phase resolution use the same pure helpers as the game engine.
  const config = {
    kaiserLevel: level,
    abilities: [],
    statAllocation: { ...statAllocation },
    statPointTotal: Object.values(statAllocation).reduce((sum, points) => sum + points, 0),
  };
  const { player: playerCharacter, enemy: kaiser } = createBattleCharacters(IRENA, cpuKaiserBase, config);
  let player = createInitialFighter(playerCharacter, true);
  let enemy = createInitialFighter(kaiser, false, level);
  let rounds = 0;
  let playerDamageDone = 0;
  let armorBreaks = 0;
  let phaseTransitions = 0;

  const playerAttack = (turn, playerActsFirst) => {
    const rawDamage = calculateNormalAttackDamage({
      attacker: player,
      target: enemy,
      config,
      turn,
      isActingFirst: playerActsFirst,
    });
    const outcome = resolveKaiserHit(enemy, rawDamage, level, turn, true, '通常攻撃');
    enemy = outcome.fighter;
    playerDamageDone += outcome.damage;
    if (outcome.armorBroke) armorBreaks += 1;
    if (outcome.phaseChanged) phaseTransitions += 1;
  };

  const kaiserAttack = (turn, playerActsFirst) => {
    const damage = calculateNormalAttackDamage({
      attacker: enemy,
      target: player,
      config,
      turn,
      isActingFirst: !playerActsFirst,
    });
    player = { ...player, currentHp: Math.max(0, player.currentHp - damage) };
  };

  while (player.currentHp > 0 && enemy.currentHp > 0 && rounds < 100) {
    rounds += 1;
    const playerActsFirst = getEffectiveSpeed(player) >= getEffectiveSpeed(enemy);

    if (playerActsFirst) {
      playerAttack(rounds, true);
      if (enemy.currentHp > 0) kaiserAttack(rounds, true);
    } else {
      kaiserAttack(rounds, false);
      if (player.currentHp > 0) playerAttack(rounds, false);
    }

    if (player.currentHp > 0 && enemy.currentHp > 0) {
      enemy = advanceKaiserChallengeRound(enemy, rounds);
    }
  }

  return {
    level,
    rounds,
    playerHpRemaining: player.currentHp,
    playerMaxHp: player.character.maxHp,
    enemyHpRemaining: enemy.currentHp,
    enemyMaxHp: enemy.character.maxHp,
    playerDamageDone,
    armorBreaks,
    phaseTransitions,
    result: player.currentHp > 0 && enemy.currentHp <= 0
      ? 'VICTORY'
      : enemy.currentHp > 0 && player.currentHp <= 0
        ? 'DEFEAT'
        : 'LIMIT',
  };
}

const baselineCurve = levelStats.map(row => simulateNormalAttackBattle(row.level));
for (const row of baselineCurve) {
  assert.ok(row.rounds > 0 && row.rounds < 100, 'Lv' + row.level + ' normal-attack reference battle must finish within 100 rounds.');
  assert.ok(row.playerHpRemaining >= 0 && row.enemyHpRemaining >= 0, 'Combat simulation HP cannot be negative.');
  assert.ok(row.playerMaxHp > 0 && row.enemyMaxHp > 0, 'Combat simulation max HP must stay positive.');
}

for (const row of levelStats) {
  if (row.level < 40) {
    assert.strictEqual(row.armorMax, 0, 'Armor must be absent below Lv40.');
  } else {
    assert.ok(row.armorMax > 0, 'Armor must initialize from the selected challenge level.');
  }
}

const lv100 = levelStats[levelStats.length - 1];
assert.strictEqual(lv100.maxHp, Math.round(cpuKaiserBase.maxHp * 1.5));
assert.strictEqual(lv100.attack, cpuKaiserBase.attack * 2);
assert.strictEqual(lv100.defense, Math.round(cpuKaiserBase.defense * 1.5));
assert.strictEqual(lv100.speed, cpuKaiserBase.speed * 2);
assert.strictEqual(lv100.specialSkillDamage, cpuKaiserBase.specialSkillDamage * 2);
assert.strictEqual(lv100.ultimateSkillDamage, cpuKaiserBase.ultimateSkillDamage * 2);

const offenseAllocation = createStatPreset('OFFENSE', 12);
const enduranceAllocation = createStatPreset('DEFENSE', 12);
const baselineLv100 = simulateNormalAttackBattle(100);
const offenseLv100 = simulateNormalAttackBattle(100, offenseAllocation);
const enduranceLv100 = simulateNormalAttackBattle(100, enduranceAllocation);
assert.ok(
  offenseLv100.playerDamageDone > baselineLv100.playerDamageDone,
  'An offense-focused stat build should inflict more total damage than an unspent build in the same reference model.',
);
assert.ok(
  enduranceLv100.rounds >= baselineLv100.rounds,
  'An endurance-focused stat build should survive at least as long as an unspent build in the same reference model.',
);
console.log('✓ Kaiser Lv10-Lv100 reference model uses the selected level, armor wear/break, and phase resolver.');
console.log('Lv100 normal-attack-only comparison: ' + [
  'unspent=' + baselineLv100.result + '/' + baselineLv100.rounds + 'T/' + baselineLv100.playerDamageDone + ' dmg',
  'offense=' + offenseLv100.result + '/' + offenseLv100.rounds + 'T/' + offenseLv100.playerDamageDone + ' dmg',
  'endurance=' + enduranceLv100.result + '/' + enduranceLv100.rounds + 'T/' + enduranceLv100.playerDamageDone + ' dmg',
].join(' | '));
console.log('Level curve: ' + baselineCurve.map(row =>
  'Lv' + row.level +
  ' HP' + row.enemyMaxHp +
  ' ATK' + levelStats.find(stats => stats.level === row.level).attack +
  ' DEF' + levelStats.find(stats => stats.level === row.level).defense +
  ' armorBreaks' + row.armorBreaks +
  ' result' + row.result +
  '/' + row.rounds + 'T'
).join(' | '));

console.log('--- Testing isolated Raid Project 01 rules ---');

const raidInitial = createInitialRaidState();
assert.strictEqual(raidInitial.playerHp, RAID_RULES.PLAYER_MAX_HP);
assert.strictEqual(raidInitial.bossHp, RAID_RULES.PHASE_ONE_BOSS_HP);
assert.strictEqual(raidInitial.phase, 1);
assert.strictEqual(canUseRaidAction(raidInitial, 'ATTACK'), true);
assert.strictEqual(canUseRaidAction(raidInitial, 'ULTIMATE'), false);
assert.strictEqual(resolveRaidAction(raidInitial, 'ULTIMATE', () => 0.5), raidInitial, 'An ultimate without full TP must not mutate the run.');

const raidAttack = resolveRaidAction(raidInitial, 'ATTACK', () => 0.5);
assert.strictEqual(raidAttack.turn, 2);
assert.ok(raidAttack.bossHp < raidInitial.bossHp, 'A normal strike must damage the boss.');
assert.ok(raidAttack.tp > 0, 'A normal strike must build ultimate TP.');
assert.strictEqual(raidAttack.lastDamage, raidAttack.totalDamage, 'The impact readout should expose the latest strike damage.');
assert.ok(raidAttack.lastIncomingDamage > 0, 'The impact readout should expose the boss hit after an unguarded action.');
assert.ok(raidAttack.playerHp < raidInitial.playerHp, 'An unguarded attack must take the telegraphed sweep hit.');

const raidCounterState = { ...raidInitial, bossPattern: 'CHARGE' };
const raidCounter = resolveRaidAction(raidCounterState, 'COUNTER', () => 0.5);
assert.strictEqual(raidCounter.playerHp, raidCounterState.playerHp, 'A perfect counter must stop a heavy boss attack.');
assert.ok(raidCounter.perfectReads === 1);
assert.ok(raidCounter.bossPattern !== 'CHARGE', 'A successful counter must reveal a new telegraph.');

const raidInterruptState = { ...raidInitial, bossPattern: 'VOID' };
const raidInterrupt = resolveRaidAction(raidInterruptState, 'FEATHER', () => 0.5);
assert.strictEqual(raidInterrupt.playerHp, raidInterruptState.playerHp, 'Feather must interrupt VOID before its hit resolves.');
assert.strictEqual(raidInterrupt.perfectReads, 1);
assert.ok(raidInterrupt.mp < raidInterruptState.mp);

const raidGuardState = { ...raidInitial, bossPattern: 'SWEEP' };
const raidGuard = resolveRaidAction(raidGuardState, 'GUARD', () => 0.5);
assert.ok(raidGuard.playerHp > raidAttack.playerHp, 'Guard must be safer than an unguarded strike against a sweep.');

const raidBreakState = { ...raidInitial, breakGauge: 90 };
const raidBreak = resolveRaidAction(raidBreakState, 'ATTACK', () => 0.5);
assert.strictEqual(raidBreak.breakCount, 1);
assert.strictEqual(raidBreak.breakGauge, 0);
assert.strictEqual(raidBreak.brokenTurns, 1, 'Full BREAK gauge should open a burst turn.');

const raidPhaseState = { ...raidInitial, bossHp: 100, bossMaxHp: 100 };
const raidPhase = resolveRaidAction(raidPhaseState, 'ATTACK', () => 0.5);
assert.strictEqual(raidPhase.phase, 2, 'Defeating phase one should trigger phase two.');
assert.strictEqual(raidPhase.bossHp, RAID_RULES.PHASE_TWO_BOSS_HP);
assert.strictEqual(raidPhase.bossPattern, 'RAGE');

const raidVictoryState = {
  ...raidInitial,
  phase: 2,
  bossHp: 100,
  bossMaxHp: RAID_RULES.PHASE_TWO_BOSS_HP,
  bossPattern: 'RAGE',
};
const raidVictory = resolveRaidAction(raidVictoryState, 'COUNTER', () => 0.5);
assert.strictEqual(raidVictory.result, 'VICTORY', 'Defeating phase two with a perfect counter should win the run.');
assert.ok(raidVictory.score > 0);

const raidDefeatState = { ...raidInitial, playerHp: 1, bossPattern: 'CHARGE' };
const raidDefeat = resolveRaidAction(raidDefeatState, 'ATTACK', () => 0.99);
assert.strictEqual(raidDefeat.result, 'DEFEAT', 'An unguarded hit at 1 HP must end the run.');
assert.strictEqual(raidDefeat.playerHp, 0);

const raidAdaptState = {
  ...raidInitial,
  phase: 2,
  bossHp: RAID_RULES.PHASE_TWO_BOSS_HP,
  bossMaxHp: RAID_RULES.PHASE_TWO_BOSS_HP,
  bossPattern: 'SWEEP',
  lastAction: 'ATTACK',
  repeatCount: 1,
  combo: 1,
};
const raidAdapt = resolveRaidAction(raidAdaptState, 'ATTACK', () => 0.5);
assert.strictEqual(raidAdapt.adaptation, 1, 'Repeated actions in phase two should increase boss adaptation.');

const raidRegenState = {
  ...raidInitial,
  bossPattern: 'CORE_REGEN',
  bossHp: 3200,
  bossMaxHp: RAID_RULES.PHASE_ONE_BOSS_HP,
};
const raidRegen = resolveRaidAction(raidRegenState, 'ATTACK', () => 0.5);
assert.strictEqual(raidRegen.lastIncomingDamage, 0, 'Core regeneration is a recovery action, not a direct attack.');
assert.strictEqual(
  raidRegen.bossHp,
  Math.min(raidRegenState.bossMaxHp, raidRegenState.bossHp - raidRegen.lastDamage + RAID_RULES.CORE_REGEN_HEAL),
  'Ignoring Core Regeneration should restore boss HP after the player action.',
);
assert.strictEqual(raidRegen.bossPattern === 'CORE_REGEN', false, 'Core regeneration must resolve into a new telegraph.');

const raidRegenInterrupt = resolveRaidAction(raidRegenState, 'FEATHER', () => 0.5);
assert.strictEqual(
  raidRegenInterrupt.bossHp,
  raidRegenState.bossHp - raidRegenInterrupt.lastDamage,
  'Feather must stop the recovery before it restores boss HP.',
);
assert.strictEqual(raidRegenInterrupt.healingPrevented, RAID_RULES.CORE_REGEN_HEAL);
assert.strictEqual(raidRegenInterrupt.interrupts, 1);
assert.strictEqual(raidRegenInterrupt.lastIncomingDamage, 0);
assert.ok(raidRegenInterrupt.history.at(-1).includes('回復阻止'), 'The battle history should record the interrupted healing.');

const raidCollapsePrepState = {
  ...raidInitial,
  phase: 2,
  bossHp: RAID_RULES.PHASE_TWO_BOSS_HP,
  bossMaxHp: RAID_RULES.PHASE_TWO_BOSS_HP,
  bossPattern: 'COLLAPSE',
  bossWindup: 0,
};
const raidCollapseGuardPrep = resolveRaidAction(raidCollapsePrepState, 'GUARD', () => 0.5);
assert.strictEqual(raidCollapseGuardPrep.bossWindup, 1);
assert.strictEqual(raidCollapseGuardPrep.perfectReads, 0, 'Guard must not count as a perfect guard while Collapse Chain is still winding up.');
assert.notStrictEqual(raidCollapseGuardPrep.outcome.title, 'PERFECT GUARD');

const raidCollapsePrepared = resolveRaidAction(raidCollapsePrepState, 'ATTACK', () => 0.5);
assert.strictEqual(raidCollapsePrepared.bossPattern, 'COLLAPSE', 'Collapse Chain must remain telegraphed during its wind-up.');
assert.strictEqual(raidCollapsePrepared.bossWindup, 1, 'The first Collapse Chain turn must arm the next-turn strike.');
assert.strictEqual(raidCollapsePrepared.lastIncomingDamage, 0, 'Collapse Chain must not hit before its release turn.');

const raidCollapseReleaseState = { ...raidCollapsePrepared, bossWindup: 1, bossPattern: 'COLLAPSE' };
const raidCollapseCounter = resolveRaidAction(raidCollapseReleaseState, 'COUNTER', () => 0.5);
assert.strictEqual(raidCollapseCounter.lastIncomingDamage, 0, 'A correctly timed counter must cancel Collapse Chain.');
assert.strictEqual(raidCollapseCounter.interrupts, raidCollapseReleaseState.interrupts + 1);
assert.strictEqual(raidCollapseCounter.bossWindup, 0);
assert.notStrictEqual(raidCollapseCounter.bossPattern, 'COLLAPSE', 'A stopped Collapse Chain must be replaced by a new telegraph.');

const raidCollapseHit = resolveRaidAction(raidCollapseReleaseState, 'ATTACK', () => 0.5);
const raidCollapseGuard = resolveRaidAction(raidCollapseReleaseState, 'GUARD', () => 0.5);
assert.ok(raidCollapseHit.lastIncomingDamage > 1000, 'Ignoring Collapse Chain should carry a substantial damage risk.');
assert.ok(raidCollapseGuard.lastIncomingDamage < raidCollapseHit.lastIncomingDamage,
  'Guard must reduce the Collapse Chain hit if countering is not possible.');
assert.strictEqual(raidCollapseHit.bossWindup, 0, 'The pending multi-turn action must clear after release.');

console.log('✓ Raid telegraphs, counters, channel interruptions, multi-turn wind-up, healing prevention, BREAK, phase transition, victory, defeat, and adaptation verified.');

assert.strictEqual(raidGuardState.mp - raidGuard.mp, 5, 'Guard should have an intentional MP cost after turn regeneration.');
const raidHeavyGuardState = { ...raidInitial, bossPattern: 'CHARGE' };
const raidHeavyGuard = resolveRaidAction(raidHeavyGuardState, 'GUARD', () => 0.5);
const raidHeavyCounter = resolveRaidAction(raidHeavyGuardState, 'COUNTER', () => 0.5);
assert.ok(raidHeavyGuard.lastIncomingDamage > 0, 'Guard should reduce but not nullify a heavy hit.');
assert.strictEqual(raidHeavyCounter.lastIncomingDamage, 0, 'A successful counter should stop a heavy hit.');
assert.ok(raidHeavyCounter.lastDamage > raidHeavyGuard.lastDamage, 'A correct counter should reward the read with more damage than guard.');

const raidFocusState = { ...raidInitial, bossPattern: 'SWEEP', focusCharge: true };
const raidFocusedAttack = resolveRaidAction(raidFocusState, 'ATTACK', () => 0.5);
const raidUnfocusedAttack = resolveRaidAction({ ...raidFocusState, focusCharge: false }, 'ATTACK', () => 0.5);
assert.ok(
  Math.abs(raidFocusedAttack.lastDamage - Math.round(raidUnfocusedAttack.lastDamage * RAID_RULES.FOCUS_DAMAGE_MULTIPLIER)) <= 1,
  'Focus should apply its documented multiplier to the next damaging action, allowing for integer rounding.',
);


const raidFocusTurn = resolveRaidAction({ ...raidInitial, bossPattern: 'SWEEP' }, 'FOCUS', () => 0.5);
const raidUnfocusedTurn = resolveRaidAction({ ...raidInitial, bossPattern: 'SWEEP' }, 'ATTACK', () => 0.5);
const raidHeavyFocus = resolveRaidAction({ ...raidInitial, bossPattern: 'CHARGE' }, 'FOCUS', () => 0.5);
const raidHeavyGuardForFocus = resolveRaidAction({ ...raidInitial, bossPattern: 'CHARGE' }, 'GUARD', () => 0.5);
assert.ok(raidFocusTurn.lastIncomingDamage > 0, 'Focus should not completely negate incoming hits.');
assert.ok(raidFocusTurn.lastIncomingDamage < raidUnfocusedTurn.lastIncomingDamage,
  'Focus should reduce incoming damage while preparing the next hit.');
assert.ok(raidHeavyFocus.lastIncomingDamage > raidHeavyGuardForFocus.lastIncomingDamage,
  'Focus should stay less protective against heavy attacks than dedicated guard.');
const raidActionNames = ['ATTACK', 'FEATHER', 'GUARD', 'COUNTER', 'FOCUS', 'ULTIMATE'];
const raidTelegraphs = [
  { pattern: 'SWEEP', phase: 1 },
  { pattern: 'CHARGE', phase: 1 },
  { pattern: 'VOID', phase: 1 },
  { pattern: 'CORE_REGEN', phase: 1 },
  { pattern: 'RAGE', phase: 2 },
  { pattern: 'COLLAPSE', phase: 2 },
];
let raidMatrixCases = 0;
for (const entry of raidTelegraphs) {
  for (const action of raidActionNames) {
    const scenario = {
      ...raidInitial,
      phase: entry.phase,
      bossHp: entry.phase === 1 ? RAID_RULES.PHASE_ONE_BOSS_HP : RAID_RULES.PHASE_TWO_BOSS_HP,
      bossMaxHp: entry.phase === 1 ? RAID_RULES.PHASE_ONE_BOSS_HP : RAID_RULES.PHASE_TWO_BOSS_HP,
      bossPattern: entry.pattern,
      playerHp: RAID_RULES.PLAYER_MAX_HP,
      mp: RAID_RULES.PLAYER_MAX_MP,
      tp: RAID_RULES.PLAYER_MAX_TP,
      breakGauge: 0,
      brokenTurns: 0,
      featherCooldown: 0,
      focusCharge: false,
      combo: 0,
      repeatCount: 0,
      lastAction: null,
      actionCounts: { ...raidInitial.actionCounts },
      history: [...raidInitial.history],
    };
    assert.strictEqual(canUseRaidAction(scenario, action), true,
      action + ' should be available in the ' + entry.pattern + ' matrix case.');
    const next = resolveRaidAction(scenario, action, () => 0.5);
    assert.strictEqual(next.turn, scenario.turn + 1);
    assert.strictEqual(next.actionCounts[action], 1, action + ' should be recorded once.');
    assert.ok(next.playerHp >= 0 && next.playerHp <= next.playerMaxHp, action + '/' + entry.pattern + ' player HP must be bounded.');
    assert.ok(next.bossHp >= 0 && next.bossHp <= next.bossMaxHp, action + '/' + entry.pattern + ' boss HP must be bounded.');
    assert.ok(next.mp >= 0 && next.mp <= next.maxMp, action + '/' + entry.pattern + ' MP must be bounded.');
    assert.ok(next.tp >= 0 && next.tp <= RAID_RULES.PLAYER_MAX_TP, action + '/' + entry.pattern + ' TP must be bounded.');
    assert.ok(next.history.length <= 5);
    raidMatrixCases += 1;
  }
}
assert.strictEqual(raidMatrixCases, 36, 'Test all six actions against all six available telegraphs.');

const raidDryState = { ...raidInitial, mp: 0, tp: 0 };
for (const action of ['FEATHER', 'GUARD', 'COUNTER', 'FOCUS', 'ULTIMATE']) {
  assert.strictEqual(canUseRaidAction(raidDryState, action), false, action + ' should be disabled without its resource.');
  assert.strictEqual(resolveRaidAction(raidDryState, action, () => 0.5), raidDryState, action + ' must not mutate state when unavailable.');
}
assert.strictEqual(canUseRaidAction(raidDryState, 'ATTACK'), true, 'A free basic action must remain available at zero resources.');
const raidVoidDry = resolveRaidAction({ ...raidDryState, bossPattern: 'VOID' }, 'ATTACK', () => 0.5);
assert.ok(raidVoidDry.mp >= 0 && raidVoidDry.mp <= raidVoidDry.maxMp, 'Void drain and regeneration must keep MP in range.');

function createSeededRaidRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function pickBalancedRaidAction(state) {
  if (state.bossPattern === 'COLLAPSE' && state.bossWindup > 0) {
    if (canUseRaidAction(state, 'COUNTER')) return 'COUNTER';
    if (canUseRaidAction(state, 'GUARD')) return 'GUARD';
    return 'ATTACK';
  }
  if (state.bossPattern === 'CORE_REGEN' && canUseRaidAction(state, 'FEATHER')) return 'FEATHER';
  if (state.tp >= 100 && (state.brokenTurns > 0 || state.bossHp <= 2200)) return 'ULTIMATE';
  if (state.brokenTurns > 0) {
    if (canUseRaidAction(state, 'FEATHER')) return 'FEATHER';
    return 'ATTACK';
  }
  if (state.bossPattern === 'CHARGE' || state.bossPattern === 'RAGE') {
    if (canUseRaidAction(state, 'COUNTER')) return 'COUNTER';
    if (canUseRaidAction(state, 'GUARD')) return 'GUARD';
    return 'ATTACK';
  }
  if (state.bossPattern === 'VOID') {
    if (canUseRaidAction(state, 'FEATHER')) return 'FEATHER';
    if (canUseRaidAction(state, 'GUARD')) return 'GUARD';
    return 'ATTACK';
  }
  if (state.focusCharge) return 'ATTACK';
  if (state.tp < 65 && state.mp >= RAID_RULES.FOCUS_COST && state.playerHp > 2400 && state.bossHp > 2500) return 'FOCUS';
  return 'ATTACK';
}

function pickRecklessRaidAction(state) {
  if (state.tp >= 100 && (state.brokenTurns > 0 || state.bossHp <= 2200)) return 'ULTIMATE';
  return 'ATTACK';
}

function pickGuardRaidAction(state) {
  if (canUseRaidAction(state, 'GUARD')) return 'GUARD';
  return 'ATTACK';
}

function simulateRaidPolicy(policy, seed) {
  let state = createInitialRaidState();
  const random = createSeededRaidRandom(seed);
  let remainingActions = 60;
  while (state.result === 'ACTIVE' && remainingActions > 0) {
    state = resolveRaidAction(state, policy(state), random);
    remainingActions -= 1;
  }
  return { state, turns: state.turn - 1 };
}

const policyResults = { balanced: [], reckless: [], guardSpam: [] };
for (let seed = 101; seed < 131; seed += 1) {
  policyResults.balanced.push(simulateRaidPolicy(pickBalancedRaidAction, seed));
  policyResults.reckless.push(simulateRaidPolicy(pickRecklessRaidAction, seed));
  policyResults.guardSpam.push(simulateRaidPolicy(pickGuardRaidAction, seed));
}
function summarizeRaidPolicy(runs) {
  return {
    wins: runs.filter(run => run.state.result === 'VICTORY').length,
    defeats: runs.filter(run => run.state.result === 'DEFEAT').length,
    avgTurns: Math.round(runs.reduce((sum, run) => sum + run.turns, 0) / runs.length * 10) / 10,
    avgDamageTaken: Math.round(runs.reduce((sum, run) => sum + run.state.damageTaken, 0) / runs.length),
    avgBreaks: Math.round(runs.reduce((sum, run) => sum + run.state.breakCount, 0) / runs.length * 10) / 10,
    avgPerfectReads: Math.round(runs.reduce((sum, run) => sum + run.state.perfectReads, 0) / runs.length * 10) / 10,
    avgActions: Object.fromEntries(raidActionNames.map(action => [
      action,
      Math.round(runs.reduce((sum, run) => sum + run.state.actionCounts[action], 0) / runs.length * 10) / 10,
    ])),
  };
}
const raidPolicySummary = {
  balanced: summarizeRaidPolicy(policyResults.balanced),
  reckless: summarizeRaidPolicy(policyResults.reckless),
  guardSpam: summarizeRaidPolicy(policyResults.guardSpam),
};
console.log('Raid policy simulation (30 fixed seeds each):', JSON.stringify(raidPolicySummary));
assert.ok(raidPolicySummary.balanced.wins > raidPolicySummary.reckless.wins,
  'A telegraph-aware strategy should beat repeated normal attacks in these fixed-seed runs.');

const raidNearFullGuard = resolveRaidAction({
  ...raidInitial,
  playerHp: RAID_RULES.PLAYER_MAX_HP - 10,
  bossPattern: 'SWEEP',
}, 'GUARD', () => 0.5);
assert.ok(raidNearFullGuard.playerHp <= raidNearFullGuard.playerMaxHp, 'Guard healing must clamp at maximum HP.');

const raidTerminalState = {
  ...raidInitial,
  result: 'VICTORY',
  playerHp: 0,
  bossHp: 0,
};
assert.strictEqual(canUseRaidAction(raidTerminalState, 'ATTACK'), false, 'Terminal states must reject further commands.');
assert.strictEqual(resolveRaidAction(raidTerminalState, 'ATTACK', () => 0.5), raidTerminalState,
  'A late input must not mutate a terminal run.');

console.log('✓ Raid 36-case action/telegraph matrix, resource floor, focus value, guard cost, and seeded policy comparison verified.');






console.log('--- Testing storage failure rollback ---');
const recruitKeyForSaveTest = 'duel_arena_recruitment_progress';
const abilityKeyForSaveTest = 'duel_arena_ability_progress';
const skillKeyForSaveTest = 'duel_arena_irena_skill_progress';
const statsKeyForSaveTest = 'duel_arena_battle_stats';
const pointsKeyForSaveTest = 'duel_arena_stat_points';

const beforeRecruitmentFailure = new Map([
  [recruitKeyForSaveTest, storageValues.get(recruitKeyForSaveTest)],
  [abilityKeyForSaveTest, storageValues.get(abilityKeyForSaveTest)],
  [skillKeyForSaveTest, storageValues.get(skillKeyForSaveTest)],
]);
storageValues.set(recruitKeyForSaveTest, JSON.stringify({
  tickets: 10, totalPulls: 0, collectedIds: [], lastResults: [],
}));
const recruitmentTransactionBefore = new Map([
  [recruitKeyForSaveTest, storageValues.get(recruitKeyForSaveTest)],
  [abilityKeyForSaveTest, storageValues.get(abilityKeyForSaveTest)],
  [skillKeyForSaveTest, storageValues.get(skillKeyForSaveTest)],
]);
const setItemBeforeRecruitmentFailure = globalThis.localStorage.setItem;
globalThis.localStorage.setItem = (key, value) => {
  if (key === skillKeyForSaveTest) throw new Error('simulated storage write failure');
  storageValues.set(key, String(value));
};
assert.strictEqual(performRecruitment(1), null, 'A summon must fail when any reward save fails.');
for (const key of [recruitKeyForSaveTest, abilityKeyForSaveTest, skillKeyForSaveTest]) {
  assert.strictEqual(storageValues.get(key), recruitmentTransactionBefore.get(key),
    'A failed summon must restore its previous saved value: ' + key);
}
globalThis.localStorage.setItem = setItemBeforeRecruitmentFailure;

const battleTransactionKeys = [statsKeyForSaveTest, skillKeyForSaveTest, recruitKeyForSaveTest, pointsKeyForSaveTest];
const battleTransactionBefore = new Map(battleTransactionKeys.map(key => [key, storageValues.get(key)]));
const setItemBeforeBattleFailure = globalThis.localStorage.setItem;
globalThis.localStorage.setItem = (key, value) => {
  if (key === recruitKeyForSaveTest) throw new Error('simulated storage write failure');
  storageValues.set(key, String(value));
};
const failedBattleSave = saveBattleResult(true);
assert.strictEqual(failedBattleSave.persisted, false, 'A battle must report when reward persistence fails.');
for (const key of battleTransactionKeys) {
  assert.strictEqual(storageValues.get(key), battleTransactionBefore.get(key),
    'A failed battle reward save must restore its previous saved value: ' + key);
}
globalThis.localStorage.setItem = setItemBeforeBattleFailure;
for (const [key, value] of beforeRecruitmentFailure) {
  if (value === undefined) storageValues.delete(key);
  else storageValues.set(key, value);
}
console.log('✓ Recruitment and battle reward writes roll back instead of leaving partial progression.');


const {
  BUILD_SAVES_STORAGE_KEY,
  validateBuildSnapshot,
  loadSavedBuilds,
  saveNewBuild,
  overwriteSavedBuild,
  renameSavedBuild,
  deleteSavedBuild,
} = await import('./src/utils/buildSaveSystem.ts');
const buildContext = {
  availableStatPoints: 12,
  abilityLevels: { ABYSS: 1, FALLEN: 0, BLACK_WING: 2, FALLEN_KING: 0, JUDGMENT: 1 },
  unlockedImprintIds: ['FORESIGHT', 'FEATHER_SPLIT', 'BLOOD_TEAR'],
};
const buildSnapshot = {
  statAllocation: { maxHp: 3, attack: 4, defense: 2, speed: 3 },
  abilityIds: ['ABYSS', 'BLACK_WING'],
  imprintIds: ['FORESIGHT', 'FEATHER_SPLIT'],
};
const priorBuildSaves = storageValues.get(BUILD_SAVES_STORAGE_KEY);
storageValues.delete(BUILD_SAVES_STORAGE_KEY);
assert.strictEqual(validateBuildSnapshot(buildSnapshot, buildContext).valid, true);
assert.strictEqual(validateBuildSnapshot({
  ...buildSnapshot, statAllocation: { maxHp: 20, attack: 0, defense: 0, speed: 0 },
}, buildContext).valid, false, 'Build loading must reject allocations beyond the current point cap.');
assert.strictEqual(validateBuildSnapshot({
  ...buildSnapshot, abilityIds: ['ABYSS', 'FALLEN'],
}, buildContext).valid, false, 'Build loading must reject currently locked abilities.');
assert.strictEqual(validateBuildSnapshot({
  ...buildSnapshot, imprintIds: ['FORESIGHT', 'COSTLY_SHOT'],
}, buildContext).valid, false, 'Build loading must reject currently unowned imprints.');
assert.strictEqual(validateBuildSnapshot({
  ...buildSnapshot, imprintIds: ['BLOOD_TEAR', 'BLOOD_MEDIA'],
}, buildContext).valid, false, 'Build loading must reject mutually exclusive blood imprints.');
assert.deepStrictEqual(loadSavedBuilds(), []);
let buildResult = saveNewBuild('攻守型', buildSnapshot, buildContext, 1000);
assert.strictEqual(buildResult.success, true);
assert.strictEqual(buildResult.saves.length, 1);
const savedBuildId = buildResult.saves[0].id;
assert.deepStrictEqual(buildResult.saves[0].snapshot, buildSnapshot);
buildResult = renameSavedBuild(savedBuildId, '深淵・黒翼型');
assert.strictEqual(buildResult.success, true);
assert.strictEqual(buildResult.saves[0].name, '深淵・黒翼型');
buildResult = overwriteSavedBuild(savedBuildId, {
  ...buildSnapshot,
  statAllocation: { maxHp: 2, attack: 5, defense: 2, speed: 3 },
}, buildContext, 2000);
assert.strictEqual(buildResult.success, true);
assert.deepStrictEqual(buildResult.saves[0].snapshot.statAllocation, { maxHp: 2, attack: 5, defense: 2, speed: 3 });
assert.strictEqual(buildResult.saves[0].createdAt, 1000, 'Overwrite must preserve the original creation date.');
assert.strictEqual(buildResult.saves[0].updatedAt, 2000);
assert.strictEqual(deleteSavedBuild(savedBuildId).success, true);
assert.deepStrictEqual(loadSavedBuilds(), []);
if (priorBuildSaves === undefined) storageValues.delete(BUILD_SAVES_STORAGE_KEY);
else storageValues.set(BUILD_SAVES_STORAGE_KEY, priorBuildSaves);

const { replaceEquippedImprints } = await import('./src/utils/storage.ts');
const priorImprintProgress = storageValues.get(IMPRINT_PROGRESS_STORAGE_KEY);
storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, JSON.stringify({
  unlockedIds: ['FORESIGHT', 'FEATHER_SPLIT', 'BLOOD_TEAR', 'BLOOD_MEDIA'],
  equippedIds: ['FORESIGHT'],
}));
const replacedImprintProgress = replaceEquippedImprints(['FEATHER_SPLIT']);
assert.deepStrictEqual(replacedImprintProgress?.equippedIds, ['FEATHER_SPLIT']);
assert.strictEqual(replaceEquippedImprints(['COSTLY_SHOT']), null, 'An unowned imprint must not enter the equipped loadout.');
assert.strictEqual(replaceEquippedImprints(['BLOOD_TEAR', 'BLOOD_MEDIA']), null, 'Mutually exclusive blood imprints must not be equipped together.');
assert.deepStrictEqual(loadImprintProgress().equippedIds, ['FEATHER_SPLIT'], 'Rejected imprint sets must not change the active loadout.');
if (priorImprintProgress === undefined) storageValues.delete(IMPRINT_PROGRESS_STORAGE_KEY);
else storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, priorImprintProgress);
console.log('✓ Named build saves validate progression, persist, rename, overwrite, and delete without touching progression keys.');

const savedAbilityStateBeforeResonanceTests = storageValues.get(abilityKeyForSaveTest);
const resonanceTestLevels = {
  ABYSS: 5, FALLEN: 5, BLACK_WING: 5, FALLEN_KING: 5, JUDGMENT: 5, ASTRAL_DOMINION: 5,
};
const resonanceTestShards = {
  ABYSS: 2, FALLEN: 12, BLACK_WING: 20, FALLEN_KING: 19, JUDGMENT: 8, ASTRAL_DOMINION: 100,
};
storageValues.set(abilityKeyForSaveTest, JSON.stringify({
  levels: resonanceTestLevels,
  shards: resonanceTestShards,
  resonance: { unlocked: false, shards: 7, levels: {}, craftedRecipes: [] },
}));
assert.strictEqual(unlockAbilityResonance().progress.unlocked, true);
assert.strictEqual(loadResonanceProgress().unlocked, true, 'Resonance unlock must persist across reloads.');
for (const id of RESONANCE_DEFINITIONS.map(definition => definition.id).filter(id => !CRAFTABLE_RESONANCE_ABILITY_IDS.includes(id))) {
  const unavailableRecipe = combineResonanceAbility(id);
  assert.strictEqual(unavailableRecipe.success, false, id + ' must not be craftable through normal progression.');
}
assert.strictEqual(loadAbilityProgress().levels.FALLEN, 5,
  'Attempting non-craftable combinations must not consume source powers.');
const fusedGod = combineResonanceAbility('FALLEN_GOD');
assert.strictEqual(fusedGod.success, true);
assert.strictEqual(fusedGod.progress.levels.FALLEN, 0);
assert.strictEqual(fusedGod.progress.shards.FALLEN, 0);
assert.strictEqual(fusedGod.progress.levels.FALLEN_KING, 0);
assert.strictEqual(fusedGod.progress.shards.FALLEN_KING, 0);
assert.strictEqual(fusedGod.resonance.levels.FALLEN_GOD, 1, 'Fused authorities start at Lv.1.');
assert.strictEqual(fusedGod.resonance.shards, 38, 'Source shards must convert 1:1 in addition to the existing resonance shards.');
assert.ok(fusedGod.resonance.craftedRecipes.includes('FALLEN_GOD'));
assert.strictEqual(combineResonanceAbility('FALLEN_GOD').success, false, 'A recipe may only be crafted once.');
addAbilityShards('BLACK_WING', 3);
assert.strictEqual(loadResonanceProgress().shards, 41, 'Additional shards for an already-maxed source authority convert 1:1.');
const upgradedGod = upgradeResonanceAbility('FALLEN_GOD');
assert.strictEqual(upgradedGod.success, true);
assert.strictEqual(upgradedGod.resonance.levels.FALLEN_GOD, 2);
assert.strictEqual(upgradedGod.resonance.shards, 1, 'Lv.1 to Lv.2 must cost exactly 40 resonance shards.');

const beforeFailedFusion = {
  levels: { ...loadAbilityProgress().levels, FALLEN: 5, BLACK_WING: 5 },
  shards: { ...loadAbilityProgress().shards, FALLEN: 8, BLACK_WING: 9 },
  resonance: { ...loadResonanceProgress(), levels: { ...loadResonanceProgress().levels, FALLEN_WING: 0 } },
};
storageValues.set(abilityKeyForSaveTest, JSON.stringify(beforeFailedFusion));
const setItemBeforeFusionFailure = globalThis.localStorage.setItem;
globalThis.localStorage.setItem = (key, value) => {
  if (key === abilityKeyForSaveTest) throw new Error('simulated resonance fusion storage failure');
  storageValues.set(key, String(value));
};
const failedResonanceFusion = combineResonanceAbility('FALLEN_WING');
assert.strictEqual(failedResonanceFusion.success, false, 'Failed fusion persistence must report failure.');
assert.deepStrictEqual(JSON.parse(storageValues.get(abilityKeyForSaveTest)), beforeFailedFusion,
  'Failed fusion must not partially consume source authorities or save a recipe.');
globalThis.localStorage.setItem = setItemBeforeFusionFailure;
if (savedAbilityStateBeforeResonanceTests === undefined) storageValues.delete(abilityKeyForSaveTest);
else storageValues.set(abilityKeyForSaveTest, savedAbilityStateBeforeResonanceTests);
console.log('✓ Resonance unlock persistence, one-time atomic fusion, 1:1 shard conversion, Lv.1 grant, upgrade cost, and write-failure rollback verified.');

const recruitmentAbilityKeyForResonanceTest = 'duel_arena_ability_progress';
const recruitmentKeyForResonanceTest = 'duel_arena_recruitment_progress';
const skillKeyForResonanceTest = 'duel_arena_irena_skill_progress';
const previousRecruitmentResonanceState = new Map([
  [recruitmentAbilityKeyForResonanceTest, storageValues.get(recruitmentAbilityKeyForResonanceTest)],
  [recruitmentKeyForResonanceTest, storageValues.get(recruitmentKeyForResonanceTest)],
  [skillKeyForResonanceTest, storageValues.get(skillKeyForResonanceTest)],
]);
const originalRandomForResonanceRecruitment = Math.random;
try {
  storageValues.set(recruitmentAbilityKeyForResonanceTest, JSON.stringify({
    levels: { ABYSS: 5, FALLEN: 5, BLACK_WING: 5, FALLEN_KING: 5, JUDGMENT: 5, ASTRAL_DOMINION: 5 },
    shards: { ABYSS: 11, FALLEN: 12, BLACK_WING: 13, FALLEN_KING: 14, JUDGMENT: 15, ASTRAL_DOMINION: 16 },
    resonance: { unlocked: true, shards: 7, levels: {}, craftedRecipes: [] },
  }));
  storageValues.set(recruitmentKeyForResonanceTest, JSON.stringify({
    tickets: 10,
    totalPulls: 0,
    collectedIds: RECRUITMENT_REWARDS.map(reward => reward.id),
    lastResults: [],
  }));
  const skillShardsBeforeResonanceRecruitment = loadSkillProgress().shards;
  let resonanceRandomCall = 0;
  Math.random = () => {
    const call = resonanceRandomCall++;
    if (call === 0) return 0;
    if (call === 1) return 0.99;
    return 0.75;
  };
  const resonanceRecruitment = performRecruitment(10);
  assert.ok(resonanceRecruitment, 'A funded 10-pull should complete.');
  assert.strictEqual(resonanceRecruitment.results[0].reward.kind, 'ABILITY_CORE');
  assert.strictEqual(resonanceRecruitment.results[1].reward.kind, 'ABILITY_CORE');
  assert.ok(resonanceRecruitment.results.slice(2).every(draw => draw.reward.kind === 'ABILITY_SHARD' && draw.reward.abilityId === 'ABYSS'));
  const postRecruitmentAbilityProgress = loadAbilityProgress();
  const postRecruitmentResonance = loadResonanceProgress();
  assert.strictEqual(postRecruitmentResonance.shards, 627,
    'Duplicate maxed source cores and eight source-shard pulls must convert 1:1 to shared resonance shards.');
  assert.strictEqual(postRecruitmentResonance.unlocked, true,
    'Recruitment writes must retain the existing resonance unlock state.');
  assert.deepStrictEqual(postRecruitmentResonance.craftedRecipes, [],
    'Recruitment writes must retain the permanent recipe-record field.');
  assert.deepStrictEqual(
    postRecruitmentAbilityProgress.shards,
    { ABYSS: 11, FALLEN: 12, BLACK_WING: 13, FALLEN_KING: 14, JUDGMENT: 15, ASTRAL_DOMINION: 16 },
    'Maxed source-power rewards must not be added to the consumed source-fragment balances.',
  );
  assert.strictEqual(loadSkillProgress().shards, skillShardsBeforeResonanceRecruitment,
    'Maxed eligible source fragments must not be diverted to the old skill-fragment exchange.');

  const resonanceShardsBeforeAstralReward = loadResonanceProgress().shards;
  const astralShardsBefore = loadAbilityProgress().shards.ASTRAL_DOMINION;
  addAbilityShards('ASTRAL_DOMINION', 3);
  assert.strictEqual(loadResonanceProgress().shards, resonanceShardsBeforeAstralReward,
    'ASTRAL_DOMINION remains outside resonance-currency conversion.');
  assert.strictEqual(loadAbilityProgress().shards.ASTRAL_DOMINION, astralShardsBefore + 3,
    'Existing ASTRAL_DOMINION shard handling must remain unchanged.');
  console.log('✓ Recruitment conversion preserves resonance saves, routes maxed source rewards 1:1 to resonance shards, and leaves ASTRAL_DOMINION unchanged.');
} finally {
  Math.random = originalRandomForResonanceRecruitment;
  for (const [key, value] of previousRecruitmentResonanceState) {
    if (value === undefined) storageValues.delete(key);
    else storageValues.set(key, value);
  }
}

console.log('--- ALL TEST ASSERTIONS PASSED! ---');
