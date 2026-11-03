# 変更履歴

## chibina-room-flying-v1 — 2026-11-03

- 既存ホームのちびーなルーム入口を使い、全画面ルームと5人の移動表示を実装。
- 黒翼にv6の3レイヤーと3回羽ばたき・滑空CSSを移植。座標移動と翼transformは別要素。
- 会話吹き出し、1入力=1行の手動送り、演出cue表示、話者の集合配置、ホームキャラ選択を実装。
- 初回CR-095、文脈ゲート付きCR-201、指定並走配置と5〜8秒の余韻を持つCR-274を個別処理。
- 開発者画面に220本すべてを選ぶ再生器を追加。
- 追加画像はv6の3 WebP（合計309,470 bytes）。会話JSON原本とコードを別々に保持。

### 変更ファイル

- `web/src/components/App.js` — 既存ルーム入口からの遷移、ランタイム接続、開発者再生器の接続。
- `web/src/components/chibinaRoom.js` — 描画、飛行、イベント選択、会話進行。
- `web/src/data/chibinaEvents.js` / `assets/chibina-room/events_220.json` — 220本の採用済みデータ。
- `assets/home-ui/chibina-flight/*.webp` — 黒翼の公式v6レイヤー。
- `web/src/components/game.css` — ルーム、吹き出し、安全領域、モーション。
- `tools/build.mjs` — 新コードと3画像をビルド対象に追加。
- `tests/chibina-room.test.js`、`tests/audit-baseline.js`、本レポート類。
