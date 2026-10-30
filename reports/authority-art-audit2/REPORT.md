# いれーな REBORN｜20261023-audit2-art

## 実装範囲

ユーザー指定のaudit1 ZIPを正本として別ディレクトリに複製。audit1を上書きせず、権能5種の一覧・詳細の画像だけを差し替えた版です。Sites／Cloudflare／GitHubへ公開・変更・送信はしていません。

実行時の変更は `web/src/components/App.js` と `web/src/components/game.css` の2ファイル。UPGRADE_ARTの5パスと2か所の画像属性、指定画像だけへ適用するcontain表示を追加。画像フレームは既存の一覧48px角／詳細76px角を維持。天星覇権・刻印・通常戦闘UI・レイド・権能性能・価格・レベル・EX／最終決戦ロジック・保存は変更していません。新しい解放演出は実装していません。

## 画像対応と品質

| 内部ID | 権能名 | 原本 | ゲーム内コピー |
|---|---|---|---|
| fallen | 堕天 | assets-to-integrate/authority-unlock/堕天.png | assets/upgrade-ui/authority-unlock/fallen.png |
| king | 堕天王 | assets-to-integrate/authority-unlock/堕天王.png | assets/upgrade-ui/authority-unlock/king.png |
| judge | 断罪 | assets-to-integrate/authority-unlock/断罪.png | assets/upgrade-ui/authority-unlock/judge.png |
| abyss | 深淵 | assets-to-integrate/authority-unlock/深淵.png | assets/upgrade-ui/authority-unlock/abyss.png |
| wing | 黒翼 | assets-to-integrate/authority-unlock/黒翼.png | assets/upgrade-ui/authority-unlock/wing.png |

5枚ともPNG形式、1672×941px、インデックスカラー（Pモード）、アルファは全画素255で透過なし。深淵・堕天は128色、黒翼・断罪・堕天王は96色のパレット。Pillowでverifyとデコードを実施し破損なし。ファイル別SHA-256、サイズ、実行時コピー先は images.json に保存。

**元画像は削除・上書き・再生成・縮小・色変換していません。** 実行時コピーも元PNGとバイト単位で一致。原本はソースZIP直下のassets-to-integrateに維持しています。旧アイコンも削除していません。

横長画像が正方形の枠へ入るため、指定5種だけ `object-fit:contain; object-position:center` としました。横長の全画像を枠内に収め、上下に余白ができます。主要部分の切り取り・引き伸ばしを防止します。既存カード配置を維持するため画像は小さなサムネイルです。大型鑑賞ビューへの再設計は今回の対象外です。

読み込みエラーは既存のerrorハンドラを利用し、既存SVGへ一度だけ代替表示。新しい再試行ループや保存フィールドは追加していません。

## ビルド・パッケージ処理

`tools/build.mjs` は既存のassets配下のPNGリテラルを検出し、base64のdata:image/pngへ置換する方式。新しい5パスもこのままで対応できるため変更不要でした。天星覇権を含む他のパスは維持。HTMLは41画像内包、21,064,599バイトです。原画を無加工で使うためaudit1の15,786,094バイトから約5.28MB増加しています。画質と原画同一性を優先し、通信量・初回デコードの軽量化は未実施です。

`tools/package.py` も調査。従来スクリプトはプロジェクト外の未組込原本を収録しないため、今回は変更せず、専用のreports/authority-art-audit2/package.pyを使用。編集ソース・必要な履歴テスト資料・新しい実行時画像に加え、ZIPの同じ階層へ元のassets-to-integrateとreferencesを保持します。重複生成HTML・dist・node_modulesはソースZIPから省き、`npm run build`で再生成可能です。バージョン名を付けて別フォルダに納品します。

## テスト

変更前：`npm run check` 35ファイル成功、`npm test` 232件成功、`npm run build` 成功。

変更後：既存232件を維持し、`tests/authority-art.test.js`に4件追加。計236件成功・失敗0・スキップ0。構文36ファイル成功。追加テストは5IDと原本の対応・コピーのバイト一致・PNG寸法、許可したUI置換だけの全文比較、未所持／装備中／強化可能／最大の一覧・詳細、天星覇権と既存コード・素材の保護を確認します。購入・強化・装備・保存の既存行動テストも現在の実モジュールで実行します。

過去改修を保護する履歴ハッシュ検証に対応するため、`tests/audit-baseline.js`で今回のApp/CSSだけの厳密な前後ハッシュを照合してからaudit1の履歴照合へ渡す処理を追加。旧アサーション・旧ハッシュ・旧テストは削除していません。新テストとブラウザは加工前の現在のApp・CSS・実モジュールを直接検証します。

Chromiumの画像・表示・操作検証398項目成功、失敗0、未処理JavaScriptエラー0。ブラウザ検証は browser.mjs と結果JSONを参照。320／375／390／430／1280pxで5種の一覧・詳細を確認し、読み込んだdata URLが元PNGのbase64と一致すること、naturalWidth/Heightが1672/941であること、contain表示、横はみ出し、ダイアログ領域、44pxの操作高さを自動確認。所持状態の別QAセーブ、実購入・強化・装備解除／装備・再読み込み、ESモジュール版の表示、画像通信を意図的に失敗させた代替表示と装備操作も対象です。QAセーブは検証用ブラウザの独立領域のみで、ユーザーのセーブや公開サイトには触れません。

WebKitは実行ファイルが環境に存在せず起動不可。今回のiPhone実機／Safari確認は未実施です。ユーザーによるaudit1のiPhone確認と、この画像差し替え版の実機確認は区別します。file://起動は今回未検証で、外部画像に依存しない単体HTMLをローカルHTTPで検証しています。

検証基盤のエラーと修正履歴は FAILURE-NOTES.md に記録。失敗を件数から隠して成功扱いせず、修正後の実行結果を採用します。納品ZIP復元後の再テスト・再ビルドと最終件数は verification.json に確定値を記録します。

## EX・ステラ・最終決戦の現行構造（変更なし）

コード根拠：gameCore.jsのenemyConfig／canStart／startBattle／phase／act／settle、progression.jsのfresh／warp／developerState、threePhase.js、App.jsのhomeGoal／home／battleView／lab／beginFight／doCombat／retry／warp操作、storage.jsのvalidateSave。

| モード | 操作キャラ・ボス | 開始条件 | 勝利後の保存・解放 |
|---|---|---|---|
| ex | 通常いれーな／EXカイザー | flags.stella | flags.ex=true、exReward初回のみtrue、神域連戦へ |
| stella | ステラ／終焉のカイザー | flags.stella | stellaClear=true、final=true |
| final | 最終決戦用いれーな／創世を喰らうカイザー | flags.final | finalClear=true |

通常100撃破でlv100・reward100を保存し、初回50SP。ホームの「境界の向こうへ／？？？？？」からワープ演出を経てwarp=true・stella=true。この後、**exとstellaの入口は同時に使用可能**。現行canStartはステラ戦にEX撃破を要求しません。homeGoalの案内順はEX→ステラ→専用いれーなですが、案内順は必須条件とは異なります。

通常100の敵基礎値はHP98,320／攻1,230／防308／速198。EXは全て2倍のHP196,640／攻2,460／防616／速396。ステラ戦の敵HP30,000、専用いれーな戦の敵HP85,000。これらは別モード・別の敵データです。

ex／stella／finalの形態は既存phase処理で残HP67%／33%を境界に移行し、HP回復はありません。exとfinalには第三形態9ラウンドの終末判定があり、通常停止・無敵・耐性で防げません。stellaにはこのex/final限定の9ラウンド判定を適用していません。

最終決戦用いれーなはstartBattleのcharacter='final'として通常いれーなと区別。finalBuildの150P、神化／堕天ゲージ、専用権能・ルートを使用。通常の権能・刻印を持ち込むキャラではありません。今回は分類も仕様も変更しません。

### 実験場の「EXカイザー・三相決戦」

`threePhase.js` のstartThreePhase／actThreePhase。内部modeはexですが、test=true、trial.kind='three-phase'、experiment.kind='three-phase'を付与した独立試作。開発用ビルドを作り、黒翼＋堕天王、HP1.8倍・敵攻撃0.65倍等の試作設定を使用。Appの実験場選択肢three-phaseから開始し、doCombatでactThreePhaseへ分岐。本編EXはactへ入り、この追加ルールを適用しません。再戦もretryThreePhaseで試作設定を維持します。

試験戦のsettleは報酬0で、本編のflags.exやfinal等を解放しません。20階層キャンペーンにも短縮EXがありますがcampaign20.jsのtest=trueの別データで、メモリ内進行のみです。本編のEX・最終決戦へ統合されていません。

### 報酬

本編勝利Pの式は `35 + floor*5 + mode加算`。通常UIはex／stella／finalをfloor100で開始します。

- 通常100：535P、初回のみ50SP。
- EX：通常1,035P、初回のみ追加100P（初回合計1,135P）。
- ステラ：1,335P。
- 専用いれーな最終決戦：1,735P。

共通で各権能欠片 `4+floor(floor/10)`、これらのfloor100では各14、共鳴片3。既存実績判定も更新。初回ボーナスと通常周回Pを区別しています。既知の「EX初回100P」は、この復元コードでは通常勝利Pとは別の追加報酬です。今回修正していません。開始ゲート・基礎値・フラグ変化・報酬はstructure.mjsのコード由来フィクスチャでstructure.jsonへ記録。実際に全ボスをブラウザで撃破した証拠とは扱いません。

### 保存と入口

保存キーはirena-reborn-v3、現行スキーマversion4。旧v1/v2キー互換・JSON入出力は既存のまま。lv100／reward100／warp／stella／ex／exReward／stellaClear／final／finalClearは独立フィールド。戦闘中の一時状態を再開する永続保存はありません。

ホームにEXとステラのカード、追加の試練に専用いれーな。戦闘待機画面にもex／stella／finalそれぞれのmodeCardがあり、flagsに従って使用可能。したがって見た目の入口もデータも分かれています。

## 次回に判断が必要な点・改修候補

ユーザーの「同じ最終決戦」は、画面・物語・戦闘処理のどの統合かコードだけで確定できません。今回すべて保留しました。

1. **画面をまとめるだけ**：共通の「最終決戦」入口にEX／ステラ／専用いれーなを並べ、現行mode・フラグ・報酬を維持。比較的変更範囲が小さい候補。カード名称と見せる順序の確定が必要。
2. **物語上の連続章にする**：共通の章表示・完了状況を設ける。EX撃破をステラ開始の条件にするか、現在同時解放のまま案内だけ順序化するかを決める必要がある。後者でも演出の二重発火対策が必要。
3. **一つの連続戦へ統合**：キャラ交代、HP・CT・ゲージ・報酬の持ち越し、敗北時の再開地点、途中離脱、旧セーブ移行を新仕様として定義する必要があり、高リスク。今回実装しない。
4. 9ターン判定をどの戦闘へ適用するか、三相決戦は試作のままか本編採用か、周回報酬と各初回報酬・実績の扱い、既クリア者に再達成を要求するかを決める。

既存の「通常100→？？？？？→ワープ→ステラ解放→EXへ挑戦可能」「ステラ最終決戦クリア→専用いれーな」は現行実装で維持されています。これを「EX撃破後でないとステラ戦に挑めない」という別条件へ読み替えていません。一本の最終決戦という新しい意図と、過去仕様の別モード記述のどちらをどう反映するかは、次回ユーザーと確定する事項です。

## 未解決・未確認

今回の画像範囲で確認した不具合は修正・再検証対象とし、最終結果JSONに記録します。iPhone実機／Safari・WebKit／file://、低メモリ端末での初回デコード時間は未確認。原画の無加工利用でHTMLが約21MBに増えた点は配布上の制限です。EXと最終決戦の統合仕様は未決定で未実装。公開サイトはaudit1のままで、この版へ更新していません。

## 納品ZIPの復元検証（確定）

版名付きソースZIPを別フォルダに展開し、`npm run check`36ファイル、`npm test`236件、`npm run build`を再実行して全て成功。再生成HTMLは検証済みHTMLとバイト単位で一致。SHA-256 `67136646eb771ff900d2886470045441b29c4481d4bd892c08d9c9555dec6176`。入力audit1 ZIPとbackupもSHA-256一致。最終パッケージのZIP CRC・原画同一性・実行時ファイル一致を確認。最終版は20261023-audit2-artで、公開・デプロイしていません。
