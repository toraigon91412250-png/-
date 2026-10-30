# 品質監査の再実行

プロジェクトのルートで静的サーバーを起動し、別の端末で実行します。公開・デプロイは行いません。

```bash
python3 -m http.server 4180 --bind 127.0.0.1
node tools/quality-evolution.mjs after chromium
node tools/quality-evolution.mjs after webkit
node tools/quality-evolution.mjs after chromium --stress-only
node tools/quality-evolution.mjs after webkit --stress-only
```

`GAME_URL` でプレイ用HTMLのURL、`QA_OUTPUT` で出力先を変更できます。通常の結果は `after-<engine>`、120ターン試験は `stress-<engine>` に保存します。

この実行環境のWebKitには、システム外に用意した共有ライブラリを読み込むため、次の起動環境変数を使用しました。ブラウザ本体と全テストは実際に動作します。テストのアサーションはスキップしていません。

```bash
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node tools/quality-evolution.mjs after webkit
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node tools/quality-evolution.mjs after webkit --stress-only
```

元ZIPの変更前監査は、別ディレクトリに展開した不変のHTMLを別ポートで配信して実行します。

```bash
GAME_URL=http://127.0.0.1:4181/irena-play.html node tools/quality-evolution.mjs before chromium
```

変更前モードは、既知の未処理エラーも観察結果として保存します。「エラーがない」という合格判定を行うモードではありません。変更後モードは未処理例外・コンソールエラーが1件でもあれば失敗します。

画面写真は320×568、390×664、768×900。モバイル幅ではネイティブタッチ入力を送信し、演出は有効にしています。通常プレイ開始・斬撃・羽弾・勝利・保存・再開・装備変更は新規データで操作します。高難度モードは独立した開発者データ、Lv.100/EXの初回報酬は事前育成した検証用セーブから実際の攻撃・勝利を経て確認します。これを通常プレイ全100階の試遊とは扱いません。

120ターン試験は実験場の通常モード、基礎攻撃0.1倍・HP20倍で連続防御します。毎ターンの進行、入力ロック解除、演出終了、一時エフェクトの片付け、本編JSONがバイト単位で変わらないことを検証します。所要時間は結果JSONの `observations[].durationMs` に実測記録します。数時間の連続試験やiPhone実機検証を意味しません。

新しい敵画像は原本のバイト一致、`object-fit: contain` と表示枠内への収まりを検証します。0.55秒の登場演出が終わってから寸法を測定します。失敗した過去の実行と、テスト実装中の修正理由は `TEST-HARNESS-HISTORY.md` と `failure-*.json` に残しています。
