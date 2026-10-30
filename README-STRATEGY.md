# 装備×育成×戦法 研究版（実験場限定）

最新版の通常戦闘UI・20階層試作を維持し、試作だけ蓄勢の攻撃力2→3倍と、ログ上限/刻印重複付与の不具合修正を適用。
本編100階層・確定倍率・セーブ形式・既存画像は変更していません。④の中断再開は未実装です。

試遊：納品irena-play.html → ホーム下部「実験場」→「20階層キャンペーンを開く」。
権能と刻印は試作拠点で手動変更。試作は再読み込みでリセットされます。

研究結論・合法性・投資・条件・全結果への案内は REPORT-STRATEGY.md。
再測定は reports/strategy-study/REPRODUCE.md。基本検証：

    npm run check
    npm test
    npm run build

ソースZIPには古い生成HTMLや巨大な全戦闘JSONLを重複収録しません。
全生データは irena-study-data.zip へ分離。irena-rebornフォルダへ展開すると再集計できます。
データZIPがなくても付属のスクリプトと凍結ソースから再生成できます。
画像・JS・CSSはビルドしたHTMLへ埋め込まれます。追加API・有料サービス・外部公開は不要。
iPhone Safari実機とfile://は未確認。WebKitを実機確認済みとは扱いません。
