import type { BattleAbilityId, ImprintId, StatAllocation } from '../types/game';
import { ABILITY_DEFINITIONS } from '../data/abilities';
import { RESONANCE_DEFINITIONS, isResonanceAbilityId } from '../data/resonanceAbilities';
import { IMPRINT_DEFINITIONS, isImprintId, MAX_EQUIPPED_IMPRINTS } from '../data/imprints';

export const BUILD_SAVES_STORAGE_KEY = 'duel_arena_build_saves_v1';
export const MAX_SAVED_BUILDS = 20;
export const MAX_BUILD_NAME_LENGTH = 32;

export interface SavedBuildSnapshot {
  statAllocation: StatAllocation;
  abilityIds: BattleAbilityId[];
  imprintIds: ImprintId[];
}

export interface SavedBuild {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  snapshot: SavedBuildSnapshot;
}

export interface BuildValidationContext {
  availableStatPoints: number;
  abilityLevels: Partial<Record<BattleAbilityId, number>>;
  unlockedImprintIds: readonly ImprintId[];
}

export type BuildValidationResult =
  | { valid: true; snapshot: SavedBuildSnapshot }
  | { valid: false; message: string };

export type BuildSaveOperationResult =
  | { success: true; saves: SavedBuild[] }
  | { success: false; message: string };

const ABILITY_IDS = new Set<BattleAbilityId>([
  ...ABILITY_DEFINITIONS.map(ability => ability.id),
  ...RESONANCE_DEFINITIONS.map(ability => ability.id),
]);
const KNOWN_IMPRINT_IDS = new Set<ImprintId>(IMPRINT_DEFINITIONS.map(imprint => imprint.id));
const STAT_KEYS: readonly (keyof StatAllocation)[] = ['maxHp', 'attack', 'defense', 'speed'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAbilityId(value: unknown): value is BattleAbilityId {
  return typeof value === 'string' && (ABILITY_IDS.has(value as BattleAbilityId) || isResonanceAbilityId(value));
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (!name || name.length > MAX_BUILD_NAME_LENGTH) return null;
  return name;
}

function normalizeStatAllocationShape(value: unknown): StatAllocation | null {
  if (!isRecord(value)) return null;
  const result = {} as StatAllocation;
  for (const key of STAT_KEYS) {
    const point = value[key];
    if (typeof point !== 'number' || !Number.isSafeInteger(point) || point < 0) return null;
    result[key] = point;
  }
  return result;
}

function normalizeSnapshotShape(value: unknown): SavedBuildSnapshot | null {
  if (!isRecord(value)) return null;
  const statAllocation = normalizeStatAllocationShape(value.statAllocation);
  if (!statAllocation) return null;

  if (!Array.isArray(value.abilityIds) || value.abilityIds.length !== 2) return null;
  if (!value.abilityIds.every(isAbilityId)) return null;
  const abilityIds = value.abilityIds as BattleAbilityId[];
  if (new Set(abilityIds).size !== abilityIds.length) return null;

  if (!Array.isArray(value.imprintIds) || value.imprintIds.length > MAX_EQUIPPED_IMPRINTS) return null;
  if (!value.imprintIds.every((id): id is ImprintId => typeof id === 'string' && KNOWN_IMPRINT_IDS.has(id as ImprintId) && isImprintId(id))) return null;
  const imprintIds = value.imprintIds as ImprintId[];
  if (new Set(imprintIds).size !== imprintIds.length) return null;
  if (imprintIds.includes('BLOOD_TEAR') && imprintIds.includes('BLOOD_MEDIA')) return null;

  return {
    statAllocation: { ...statAllocation },
    abilityIds: [...abilityIds],
    imprintIds: [...imprintIds],
  };
}

/** Strictly validate a saved build against today's progression without silently truncating the loadout. */
export function validateBuildSnapshot(value: unknown, context: BuildValidationContext): BuildValidationResult {
  const snapshot = normalizeSnapshotShape(value);
  if (!snapshot) {
    return { valid: false, message: 'ビルドの保存データが不正です。保存内容を確認してください。' };
  }

  const availablePoints = context.availableStatPoints;
  if (!Number.isSafeInteger(availablePoints) || availablePoints < 0) {
    return { valid: false, message: '現在のステータスポイントを確認できません。' };
  }
  const spentPoints = STAT_KEYS.reduce((sum, key) => sum + snapshot.statAllocation[key], 0);
  if (spentPoints > availablePoints) {
    return { valid: false, message: 'このビルドは現在の上限を超えるため読み込めません。先にステータスポイントを獲得してください。' };
  }

  for (const id of snapshot.abilityIds) {
    if (!Number.isFinite(context.abilityLevels[id]) || (context.abilityLevels[id] ?? 0) < 1) {
      return { valid: false, message: '保存された権能が未解放です。権能を解放してから読み込んでください。' };
    }
  }
  for (const id of snapshot.imprintIds) {
    if (!context.unlockedImprintIds.includes(id)) {
      return { valid: false, message: '保存された刻印が未所持です。刻印を入手してから読み込んでください。' };
    }
  }

  return { valid: true, snapshot };
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readSavedBuilds(storage: Storage): SavedBuild[] {
  const raw = storage.getItem(BUILD_SAVES_STORAGE_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.saves)) return [];
    return parsed.saves.flatMap((entry): SavedBuild[] => {
      if (!isRecord(entry)) return [];
      const name = normalizeName(entry.name);
      const snapshot = normalizeSnapshotShape(entry.snapshot);
      if (
        typeof entry.id !== 'string' || !entry.id.trim() || entry.id.length > 100
        || !name
        || typeof entry.createdAt !== 'number' || !Number.isSafeInteger(entry.createdAt) || entry.createdAt < 0
        || typeof entry.updatedAt !== 'number' || !Number.isSafeInteger(entry.updatedAt) || entry.updatedAt < 0
        || !snapshot
      ) return [];
      return [{ id: entry.id, name, createdAt: entry.createdAt, updatedAt: entry.updatedAt, snapshot }];
    }).slice(0, MAX_SAVED_BUILDS);
  } catch {
    return [];
  }
}

export function loadSavedBuilds(): SavedBuild[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    return readSavedBuilds(storage);
  } catch {
    return [];
  }
}

function persistSaves(storage: Storage, saves: SavedBuild[]): BuildSaveOperationResult {
  try {
    storage.setItem(BUILD_SAVES_STORAGE_KEY, JSON.stringify({ version: 1, saves }));
    return { success: true, saves };
  } catch {
    return { success: false, message: '保存に失敗しました。端末の空き容量とブラウザの保存設定を確認してください。' };
  }
}

function validateName(value: string): { name: string } | { message: string } {
  const name = normalizeName(value);
  if (!name) return { message: 'ビルド名を1〜32文字で入力してください。' };
  return { name };
}

export function saveNewBuild(
  name: string,
  value: unknown,
  context: BuildValidationContext,
  now = Date.now(),
): BuildSaveOperationResult {
  const storage = getStorage();
  if (!storage) return { success: false, message: 'この環境ではビルドを保存できません。' };
  const checkedName = validateName(name);
  if ('message' in checkedName) return { success: false, message: checkedName.message };
  const checkedSnapshot = validateBuildSnapshot(value, context);
  if (!checkedSnapshot.valid) return { success: false, message: checkedSnapshot.message };

  let saves: SavedBuild[];
  try {
    saves = readSavedBuilds(storage);
  } catch {
    return { success: false, message: '保存データを読み取れませんでした。' };
  }
  if (saves.length >= MAX_SAVED_BUILDS) {
    return { success: false, message: '保存できるビルドは最大20件です。不要なビルドを削除してください。' };
  }

  let id = '';
  let attempt = 0;
  do {
    attempt += 1;
    id = 'build-' + Math.max(0, Math.floor(now)).toString(36) + '-' + Math.random().toString(36).slice(2, 9) + (attempt > 1 ? '-' + attempt : '');
  } while (saves.some(saved => saved.id === id) && attempt < 100);
  if (saves.some(saved => saved.id === id)) {
    return { success: false, message: 'ビルドIDを作成できませんでした。もう一度お試しください。' };
  }

  const created: SavedBuild = {
    id,
    name: checkedName.name,
    createdAt: Math.max(0, Math.floor(now)),
    updatedAt: Math.max(0, Math.floor(now)),
    snapshot: checkedSnapshot.snapshot,
  };
  return persistSaves(storage, [...saves, created]);
}

export function overwriteSavedBuild(
  id: string,
  value: unknown,
  context: BuildValidationContext,
  now = Date.now(),
): BuildSaveOperationResult {
  const storage = getStorage();
  if (!storage) return { success: false, message: 'この環境ではビルドを保存できません。' };
  const checkedSnapshot = validateBuildSnapshot(value, context);
  if (!checkedSnapshot.valid) return { success: false, message: checkedSnapshot.message };

  let saves: SavedBuild[];
  try {
    saves = readSavedBuilds(storage);
  } catch {
    return { success: false, message: '保存データを読み取れませんでした。' };
  }
  if (!saves.some(saved => saved.id === id)) return { success: false, message: '上書き対象のビルドが見つかりません。' };
  const next = saves.map(saved => saved.id === id
    ? { ...saved, updatedAt: Math.max(0, Math.floor(now)), snapshot: checkedSnapshot.snapshot }
    : saved);
  return persistSaves(storage, next);
}

export function renameSavedBuild(id: string, name: string): BuildSaveOperationResult {
  const storage = getStorage();
  if (!storage) return { success: false, message: 'この環境ではビルドを保存できません。' };
  const checkedName = validateName(name);
  if ('message' in checkedName) return { success: false, message: checkedName.message };

  let saves: SavedBuild[];
  try {
    saves = readSavedBuilds(storage);
  } catch {
    return { success: false, message: '保存データを読み取れませんでした。' };
  }
  if (!saves.some(saved => saved.id === id)) return { success: false, message: '変更対象のビルドが見つかりません。' };
  const next = saves.map(saved => saved.id === id
    ? { ...saved, name: checkedName.name, updatedAt: Date.now() }
    : saved);
  return persistSaves(storage, next);
}

export function deleteSavedBuild(id: string): BuildSaveOperationResult {
  const storage = getStorage();
  if (!storage) return { success: false, message: 'この環境ではビルドを保存できません。' };
  let saves: SavedBuild[];
  try {
    saves = readSavedBuilds(storage);
  } catch {
    return { success: false, message: '保存データを読み取れませんでした。' };
  }
  if (!saves.some(saved => saved.id === id)) return { success: false, message: '削除対象のビルドが見つかりません。' };
  return persistSaves(storage, saves.filter(saved => saved.id !== id));
}
