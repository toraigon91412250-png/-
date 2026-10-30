# 20階層・再誕への近道【実験場限定試作】

このフォルダは通常戦闘UI改修済み最新版からの独立コピーです。本編への採用・公開はしていません。

プレイ：納品した irena-play.html をブラウザで開き、ホーム下部の「実験場」→「20階層キャンペーンを開く」。

通常20階層→ステラ→試作EXをプレイできます。試作専用Pで育成・権能・刻印を変更します。
試作はメモリにだけ保持し、再読み込みでは最初からになります。本編セーブ・実績・報酬には反映しません。

ソースZIPには古いビルドや生成HTMLを重複収録していません。以下で新しい単体HTMLを生成します（Node.jsが必要、ビルド自体は追加依存パッケージ不要）：

    npm run check
    npm test
    npm run build

出力：irena-play.html / dist/index.html。ブラウザのローカルファイル制限がある場合は npm run dev でローカル確認。
バランス再計測：

    node reports/overnight-lab/measure-main.mjs
    node reports/overnight-lab/measure-campaign.mjs

詳しい仕様、実測条件、変更前後、テスト、素材要件は reports/overnight-lab/REPORT.md。
最終結果は reports/overnight-lab/verification.json。
iPhone Safari実機・file://起動は未確認。WebKit検証を実機確認とは扱いません。
