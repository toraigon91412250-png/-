# 再現手順（Node.js、プロジェクトルートで実行）

npm run check
npm test
npm run build

# 前回値の照合（今回は変更前に実行し完全再現を確認）
node reports/overnight-lab/measure-main.mjs
# 旧campaign比較は現在Bを使うため、納品時そのままの比較は下のrawを使用。

# 変更前の凍結済みソースからraw/A/B/Cを再生成（現行runtimeからの推測ではない）
node reports/strategy-study/make-candidates.mjs
node reports/strategy-study/run-study.mjs raw 32
node reports/strategy-study/run-study.mjs A 32
node reports/strategy-study/run-study.mjs B 32
node reports/strategy-study/run-study.mjs C 32
node reports/strategy-study/run-study.mjs A 32 41001 holdout-A
node reports/strategy-study/run-study.mjs B 32 41001 holdout-B
node reports/strategy-study/paired.mjs 32
node reports/strategy-study/make-metrics-engine.mjs
node reports/strategy-study/run-study.mjs metrics 32 21001 guard-metrics
node reports/strategy-study/run-study.mjs runtime 32 21001 final-runtime
python3 reports/strategy-study/analyze.py

全入力・育成方針・シードはstudy-config.json、敵データと前後ソースはbaseline-campaign20.txt/engine-*.mjs/candidates.json。
CSVは各ディレクトリsummary.csvとactions.csv。戦闘ごとの全記録はroutes.jsonl、同一状態の3案比較はpaired.jsonl。
巨大な生データはソースZIPから分離してirena-study-data.zipに収録。プロジェクトルートへ展開するとreports/strategy-study/へ戻る。
上のコマンドで、分離データがなくても全件を再生成できる。バランス研究自体には外部サービス・API・課金は不要。
ブラウザ検証はChromium/PlaywrightおよびWebKitが必要。GAME_URL環境変数を受け取る既存tools、研究専用browser-check.mjsはローカル4184を使用。
