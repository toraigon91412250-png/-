# audit23 専用出撃画像3種
ユーザー最新指示により公開まで実施。audit22を保持して別ディレクトリで改修。
EX→sortie-ex-kaiser.png、ステラ→sortie-stella.png、専用いれーな→sortie-final-irena.png。提供PNGを無加工コピー、元画像をtransfer-inputs/special-sortie-audit23に保持。画像941x1672（finalのみ941x1671）。透過パレットPNGはdecode正常。
## 変更
App.js：新規開始時のモード別画像選択。battleVisuals.js：選択用純関数とportrait背景、1500ms、文字重複なし、元絵は拡大なし。game.css：縦長containとセーフエリア、低輝度ぼかし背景。tools/build.mjs：3画像を単体へ埋込、Hostedでは無加工ファイルを同梱。tests/special-sortie.test.js追加2件。tests/audit-baseline.js：承認差分をSHA厳密照合して既存テスト維持。
通常1400ms出撃・節目除外・戦闘計算・進行・報酬・フラグ・セーブ・敵画像・ホーム画像は維持。画像が欠けるためportraitの微小ズームは無効化しフェードのみ。
## 検証
npm run check：68ファイル成功。npm test：410成功/0失敗。npm run build成功。単体36078121バイト、Hosted25780073バイト（25MiB未満）、62画像埋込。元画像と配置PNGバイト一致テスト成功。
Chromium：3モードを320x480/390x664/430x740で確認、画像全体contain、モード別aria、見出し重複なし、1501〜1503ms、二重開始なし、TURN1、reload再生なし、JS例外0。単体HTML3モードでも同様成功。PNGはdata URIから表示。
初回ブラウザ手順で隠れたPCナビを選択しタイムアウト。可視要素を選択するよう修正。次に検証セーブのワープ前フラグ不整合で開始できず、正しい解放フラグを揃えて再実行成功。ゲームコードの問題ではない。
読み込み失敗・キャンセルの既存後片付けも確認。実機iPhone/Safari/PWA・全解放順の再攻略は未確認。
