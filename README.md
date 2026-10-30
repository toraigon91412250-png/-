# 最新版 audit18（2026-10-24）

絶界昇華中/CT中も解放済み技の位置を保持し、封鎖残ターンを表示。防御の蓄勢を明記、EX敵枠を透過表示、終末判定を敵HP付近へ移動。専用技の詳細表示（③）は未追加。ゲーム計算・保存形式・20階B・既存素材はaudit17と同一。

検証・成果物：reports/combat-clarity-audit18/。npm run check / npm test / npm run build。

---

# 最新版 audit17（2026-10-24）

最終決戦の対峙画像/出撃、装備入替、戦果から育成・連戦の導線、装備補正表示を改善。ゲーム計算・保存形式・20階Bはaudit16と同一。

npm run check / npm test / npm run build。配布用の単体HTMLはirena-play.html、公開用はdist/。生成PNG原本もassets/finaleに保持。詳細・検証・バランスCSVはreports/sanctuary-audit17/。

---

# audit11 — Astra戦闘演出「黒翼の一閃」
採用済みB案とaudit9コンパクトUIを維持し、通常いれーなの戦闘演出を順次表示へ更新。
詳細と検証：reports/combat-direction-audit11/REPORT.md。
起動：このフォルダで python3 -m http.server、index.htmlを開く。
検証：npm run check / npm test / npm run build。生成irena-play.htmlは単体起動可能。
隣接する提供素材フォルダは原本照合テストで使用するため、そのまま保持。
以前のREADMEは下記に保持。

# audit10 — 戦術改修Bを本編20階層へ採用

実験場で評価済みのB案を同じ数値で本編採用。UIはaudit9の1画面配置を維持。報酬・解放順・既存実験場は維持。詳細は [今回の報告](reports/main-b-audit10/REPORT.md)。`npm run check` / `npm test` / `npm run build`。

# audit9 — iPhone向け戦闘UI・1画面化

実表示高さに追従し、戦場と全コマンドを同時表示。戦闘計算・保存・B案はaudit8のまま。詳細は [今回の報告](reports/compact-ui-audit9/REPORT.md)。`npm run check` / `npm test` / `npm run build`。素材照合テストのため、combat-ui-user-inputも同階層に保持。

# audit8 — 実験場限定・20階層戦術改修B

実験場からB案と現行20階層の独立比較を開始できます。試作・本編未採用。詳細は [今回の報告](reports/lab-b-audit8/REPORT.md)。本編の保存・倍率・20階データは維持。`npm run check` / `npm test` / `npm run build`。納品生成は `python3 reports/lab-b-audit8/package.py`。

# audit7 — audit6戦闘UI＋バランス調査統合版

最新報告: [統合・検証結果](reports/integration-audit7/REPORT.md)。計算・倍率・保存仕様の変更なし。`npm run check` / `npm test` / `npm run build`。納品: `python3 reports/integration-audit7/package.py`。

以下は過去版の履歴です。

# audit5 — 20階層本編版

通常攻略は実験場から採用した20階層です。20階突破後のワープ・EX/ステラ同時解放・専用いれーなの順序は維持しています。旧100階層セーブは5階→新1階で自動移行し、所持品・育成・実績・解放を保持します。新セーブはversion5で、旧アプリへの読み戻しには対応しません。

`npm run check` / `npm test` / `npm run build`。納品生成は `python3 reports/main20-audit5/package.py`。詳細は [今回のレポート](reports/main20-audit5/REPORT.md)。提供原画像の照合テストのため、assets-to-integrate と supplied-raid は irena-reborn と同じ階層に保持してください。

以下は過去版の開発履歴です。最新仕様は上記レポートを優先してください。

## 通常戦闘UI改修版（過去の記録）

通常いれーなの戦闘をスマホ向けに整理しました。split刻印装備時は穿羽・連羽のみ、未装備時は黒翼・羽弾のみ表示します。能力値と詳細ログは開閉式、現在の状態と終末タイマーはその外に表示します。防御は「被ダメージ70%軽減 / ゲージ＋18」と明記。戦闘計算・保存・報酬・成長は変更していません。

最終決戦とステラの画面は維持し、ホームカード画像と「戦闘に戻る」修正も保持しています。詳細・検証結果・追加画像の仕様は [reports/battle-ui/REPORT.md](reports/battle-ui/REPORT.md)。元の参考JPEGはゲーム素材として使っていません。

---
以下は過去版から引き継いだ資料です。

# ホームUI改修版（2026-10-21）

添付の承認デザインと指定3画像を使用したホーム画面です。画像全体を貼り付けず、HTML/CSS・実際の所持P/共鳴片/攻略状況/実績/解放フラグで描画します。戦闘・保存・進行・画像分類・数値は変更していません。

通常のタイトルから開始すると新しいホームを表示します。「冒険を続ける」は既存の通常戦闘、Lv.100後は既存の「？？？？？」ワープへ接続します。6つのカードは既存の強化/召喚/レイド/刻印/ステラ/EXへ接続します。追加コンテンツは「さらなる試練・神格覚醒」、ステータス・装備は折りたたみ欄、実験場・開発者・JSON保存は下部に残しています。

詳細: [reports/home-ui/REPORT.md](reports/home-ui/REPORT.md)。指示書はreports/home-ui/REQUEST.md。3画像の無加工原本はassets/home-ui/にあります。

指示書が言及する「三相決戦のフェーズ飛ばし・装甲処理の追加修正版」は本環境で確認できていません。本版では元の三相決戦を変更せず保持し、その修正適用済みとは扱いません。

検証: `npm test` / `npm run check` / `npm run build`。ブラウザは`npm run dev`等のローカルHTTPで配信し、`GAME_URL=http://127.0.0.1:4181/irena-play.html node tools/home-ui-browser.mjs chromium`（またはwebkit）。変更前ビルドを別のHTTPで配信しBASELINE_URLを渡すと非ホーム7画面×4幅のDOM・計算済みスタイル比較も実行します。ブラウザ検証はPlaywrightが別途必要ですが、ゲーム本体とビルドは外部サービス/APIキー不要です。

---
以下は変更前から引き継いだ資料です。

# EXカイザー・三相決戦【実験場限定・試作】

「実験場」→モード「EXカイザー・三相決戦【試作】」→「独立試験を開始」で遊べます。元のEXカイザーと別のルールです。技ボタンは既存のものだけを使用します。

第一相は基本戦、第二相は実際の被弾後に硬化・重圧・回復が発生、第三相は既存の9ラウンド終末判定です。破壊の権能と超堕天撃で黒晶殻を破壊。防御は重圧解除・HP12%回復・蓄勢、蓄勢は斬撃/破壊の権能を一回強化します。予測表示はありません。既存の重撃予兆も撤去しましたが、元の戦闘計算は維持しています。

数値と固定ビルドは試作専用。勝敗・素材・実績・解放は本編へ反映しません。セーブ形式、神/堕天分類、羽弾最終5倍等を変更していません。

今回のルール・試作数値・戦法比較・検証・採用リスクは `reports/three-phase/REPORT.md` を参照。検証画像は別のirena-review.zipに含めます。

関連検証:

```sh
node --test tests/three-phase.test.js
node tools/three-phase-sim.mjs
node tools/three-phase-browser.mjs chromium
node tools/three-phase-browser.mjs webkit
npm test
npm run check
npm run build
npm run package
```

以下は基礎となった既存版の開発資料です。

# いれーな REBORN — 品質進化版 (2026-10-20)

今回の正本は添付された `irena-REBORN-Codex-light.zip` です。ゲーム本体は同梱のJavaScriptとCSSで動作し、実行時の外部依存はありません。

今回の変更・検証結果・未確認事項は `reports/quality-evolution/DELIVERY-REPORT.md`、進捗は同フォルダの `PROGRESS.md` を参照してください。以前の reports は履歴として残してあります。

## 今回の改善

- 全カットインと神化/堕天の入力を管理し、連打・スキップ・自然終了で重複ターンが発生しないよう修正。
- 理外掌握は負のゲージ（堕天側）のみ使用可能。全回復・速度1000倍等の効果を保持。
- 実際に増えたP・欠片・共鳴片・レベル・SP、実績と新たな解放を結果画面で確認可能。
- スマホは「戦場へ／技を選ぶ」で表示位置を移動。通常・神・堕天・中間・ステラ立ち絵と既存カットインを保持。
- JSON復元後の端末保存に失敗した場合、成功と表示せず未保存であることを案内。

## 遊び方と配布物

`irena-play.html` はCSS・JavaScript・使用する19画像を統合した単体HTMLです。`irena-deploy.zip` は静的ホスティング用の `index.html` を含みます。今回Webへの公開やデプロイは行っていません。

iPhoneではSafariでHTTP/HTTPS配信したHTMLを開く方法を推奨します。ファイルアプリのプレビューがJavaScriptを許可するかは端末環境に依存します。iPhone実機での確認は行っていません。

通常カイザーを攻略し、Pと欠片で育成。権能2枠・刻印3枠・徽章1枠を組み替えます。通常Lv.50撃破で共鳴・レイド、Lv.100撃破でSP50と「？？？？？」が解放され、ワープでステラ、その後EXへ挑戦できます。ステラ最終決戦クリアで専用いれーな、EX撃破で神域連戦。全36実績で天星覇権Lv.5です。

最終決戦では使用可能な技のみ表示し、技ボタンと究極技ルートの説明文は付けていません。通常カイザー/EXの立ち絵と「創世」の専用カットインは2026-10-20の追加添付を使用します。深淵レイド・神域・専用ボスは既存の代替紋章、覚醒段階の専用絵と第5段階MP4は未提供です。CSS代替演出を完成ムービーとは扱いません。

## セーブ

`irena-reborn-v3`（version 4）へ自動保存し、旧v1/v2キーも検索します。既存の保存形式は変更していません。未知の旧構造を推測変換することはできません。

JSON書き出し/読み込みはlocalStorageと独立して利用できます。読み込みは上書き確認付き。不正データ・未対応の将来バージョンは拒否します。保存失敗時は画面に通知し、JSONバックアップを利用できます。戦闘途中の一時状態は再起動でリセットされます。開発者・実験場の試験戦闘は本編の進行/報酬/実績を更新しません。

## 開発と検証

Node.js20以降、Python3（ZIP生成）。ブラウザ検証のみ任意のPlaywright開発依存を使用します。

```sh
npm run check
npm test
npm run build
npm run dev
# 別ターミナル: GAME_URL=http://127.0.0.1:4173/irena-play.html npm run test:browser
node tools/lab-retry-check.mjs
node tools/ui-regression.mjs
node tools/iphone-qa.mjs chromium
node tools/iphone-qa.mjs webkit
node tools/quality-evolution.mjs after chromium
node tools/quality-evolution.mjs after webkit
npm run package
```

全ブラウザツールは `GAME_URL`、Chromiumは `CHROMIUM_PATH` を指定可能です。Playwrightがなければ `npm install`、各ブラウザは `npx playwright install chromium webkit` で導入してください。Linux WebKitの検証とiPhone実機の確認は別です。

`web/src/data/config.js` に能力設定、`utils/gameCore.js` に戦闘、`utils/progression.js` に育成/進行、`utils/storage.js` に保存、`components/` にUIがあります。`assets/runtime/` が表示用画像です。今回提供された素材を再生成・再圧縮していません。画像の役割はApp.jsのPORTRAITS/SCENESとassets/media-manifest.jsonを参照してください。

ソースZIPは編集用コード・素材・テスト・結果メタデータを含み、監査スクリーンショットは別の `irena-review.zip` に保存します。公開用ZIPにサーバーやAPIキーは不要です。
