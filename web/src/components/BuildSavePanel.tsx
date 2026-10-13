import React, { useState } from 'react';
import { ABILITY_DEFINITIONS } from '../data/abilities';
import { IMPRINT_DEFINITIONS } from '../data/imprints';
import {
  deleteSavedBuild,
  loadSavedBuilds,
  MAX_BUILD_NAME_LENGTH,
  MAX_SAVED_BUILDS,
  overwriteSavedBuild,
  renameSavedBuild,
  saveNewBuild,
  validateBuildSnapshot,
  type BuildValidationContext,
  type SavedBuild,
  type SavedBuildSnapshot,
} from '../utils/buildSaveSystem';
import './BuildSavePanel.css';

interface BuildSavePanelProps {
  snapshot: SavedBuildSnapshot;
  context: BuildValidationContext;
  onLoad: (snapshot: SavedBuildSnapshot) => string | null;
}

function summarizeSnapshot(snapshot: SavedBuildSnapshot): string {
  const abilityNames = snapshot.abilityIds
    .map(id => ABILITY_DEFINITIONS.find(ability => ability.id === id)?.name ?? id)
    .join(' ＋ ');
  const imprintNames = snapshot.imprintIds.length === 0
    ? '刻印なし'
    : snapshot.imprintIds.map(id => IMPRINT_DEFINITIONS.find(imprint => imprint.id === id)?.name ?? id).join('・');
  const spent = Object.values(snapshot.statAllocation).reduce((sum, points) => sum + points, 0);
  return spent + 'P / ' + abilityNames + ' / ' + imprintNames;
}

export const BuildSavePanel: React.FC<BuildSavePanelProps> = ({ snapshot, context, onLoad }) => {
  const [saves, setSaves] = useState<SavedBuild[]>(() => loadSavedBuilds());
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const currentValidation = validateBuildSnapshot(snapshot, context);

  const applyOperation = (result: ReturnType<typeof saveNewBuild>) => {
    if (result.success) {
      setSaves(result.saves);
      return true;
    }
    setMessage(result.message);
    return false;
  };

  const handleSave = () => {
    const result = saveNewBuild(newName, snapshot, context);
    if (!applyOperation(result)) return;
    setNewName('');
    setMessage('ビルドを保存しました。');
  };

  const handleOverwrite = (saved: SavedBuild) => {
    const result = overwriteSavedBuild(saved.id, snapshot, context);
    if (!applyOperation(result)) return;
    setMessage('「' + saved.name + '」を現在の構成で上書きしました。');
  };

  const handleRename = (saved: SavedBuild) => {
    const result = renameSavedBuild(saved.id, editingName);
    if (!applyOperation(result)) return;
    setEditingId(null);
    setEditingName('');
    setMessage('ビルド名を変更しました。');
  };

  const handleDelete = (saved: SavedBuild) => {
    const result = deleteSavedBuild(saved.id);
    if (!applyOperation(result)) return;
    setDeleteConfirmId(null);
    if (editingId === saved.id) setEditingId(null);
    setMessage('「' + saved.name + '」を削除しました。');
  };

  return (
    <section className="build-save-panel" aria-labelledby="build-save-heading">
      <div className="build-save-panel__header">
        <div>
          <div className="build-save-panel__eyebrow">BUILD LOADOUTS</div>
          <h2 id="build-save-heading">ビルド保存</h2>
          <p>ステータス配分・権能2つ・装備刻印をまとめて管理します。戦闘レベルは保存されません。</p>
        </div>
        <div className="build-save-panel__count">{saves.length} / {MAX_SAVED_BUILDS}</div>
      </div>

      <div className="build-save-panel__current">
        <div className="build-save-panel__section-title">現在の構成</div>
        <p>{summarizeSnapshot(snapshot)}</p>
        <label className="build-save-panel__label" htmlFor="build-save-new-name">新しいビルド名</label>
        <div className="build-save-panel__create-row">
          <input
            id="build-save-new-name"
            value={newName}
            maxLength={MAX_BUILD_NAME_LENGTH}
            onChange={event => setNewName(event.target.value)}
            placeholder="例：先手型・深淵"
          />
          <button type="button" onClick={handleSave} disabled={!currentValidation.valid || saves.length >= MAX_SAVED_BUILDS || !newName.trim()}>
            保存
          </button>
        </div>
        {!currentValidation.valid && <p className="build-save-panel__hint">{currentValidation.message}</p>}
        {saves.length >= MAX_SAVED_BUILDS && <p className="build-save-panel__hint">保存件数の上限です。不要なビルドを削除してください。</p>}
      </div>

      {saves.length === 0 ? (
        <p className="build-save-panel__empty">保存済みビルドはありません。現在の構成に名前を付けて保存できます。</p>
      ) : (
        <div className="build-save-panel__list">
          {saves.map(saved => (
            <article className="build-save-card" key={saved.id}>
              <div className="build-save-card__details">
                {editingId === saved.id ? (
                  <div className="build-save-card__rename">
                    <label className="build-save-panel__label" htmlFor={'build-save-rename-' + saved.id}>ビルド名</label>
                    <input
                      id={'build-save-rename-' + saved.id}
                      value={editingName}
                      maxLength={MAX_BUILD_NAME_LENGTH}
                      onChange={event => setEditingName(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') handleRename(saved);
                        if (event.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <div className="build-save-card__rename-actions">
                      <button type="button" onClick={() => handleRename(saved)}>名前を保存</button>
                      <button type="button" className="build-save-button--subtle" onClick={() => setEditingId(null)}>キャンセル</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>{saved.name}</h3>
                    <p>{summarizeSnapshot(saved.snapshot)}</p>
                    <span className="build-save-card__date">更新：{new Date(saved.updatedAt).toLocaleDateString('ja-JP')}</span>
                  </>
                )}
              </div>

              <div className="build-save-card__actions">
                <button
                  type="button"
                  onClick={() => {
                    const result = validateBuildSnapshot(saved.snapshot, context);
                    if (!result.valid) {
                      setMessage(result.message);
                      return;
                    }
                    const error = onLoad(result.snapshot);
                    if (error) {
                      setMessage(error);
                      return;
                    }
                    setMessage('「' + saved.name + '」を読み込みました。');
                  }}
                >
                  読み込む
                </button>
                <button type="button" className="build-save-button--subtle" onClick={() => handleOverwrite(saved)} disabled={!currentValidation.valid}>上書き</button>
                <button
                  type="button"
                  className="build-save-button--subtle"
                  onClick={() => {
                    setEditingId(saved.id);
                    setEditingName(saved.name);
                    setDeleteConfirmId(null);
                    setMessage(null);
                  }}
                >
                  名前変更
                </button>
                {deleteConfirmId === saved.id ? (
                  <>
                    <button type="button" className="build-save-button--danger" onClick={() => handleDelete(saved)}>削除を確定</button>
                    <button type="button" className="build-save-button--subtle" onClick={() => setDeleteConfirmId(null)}>キャンセル</button>
                  </>
                ) : (
                  <button type="button" className="build-save-button--danger" onClick={() => setDeleteConfirmId(saved.id)}>削除</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {message && <p className="build-save-panel__message" role="status">{message}</p>}
    </section>
  );
};

export default BuildSavePanel;
