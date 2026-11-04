# 単体HTMLの安全な軽量化・完全報告書

作成日：2026-11-04（UTC）

対象：いれーな REBORN / `toraigon91412250-png/-`

基準コミット：`e3f39f421abc2cb59eb7131dfdde3c6643839c18`

## 結果

単体HTMLを **48,982,482 → 47,109,320バイト**に削減した。削減量は **1,873,162バイト（約1.79 MiB、約3.82%）**。画像の画質を落とさず、ブラウザで表示の差がないものだけを採用した。単体HTMLが50,000,000バイトを超えただけで公開用ビルドまで失敗する動作も、警告に修正した。

| 対象 | 変更前 | 変更後 |
| --- | ---: | ---: |
| 単体HTML | 48,982,482 B / 46.69 MiB | 47,109,320 B / 44.93 MiB |
| JS画像配列（別にCSS背景5枚） | 89 | 89 |
| 公開用index.html | 19,039,361 B | 19,039,361 B（完全一致） |
| 公開用画像 | 従来の画像 | バイト単位で完全一致 |
| ゲーム用JS・CSS・原画像 | 基準版 | バイト単位で完全一致 |

## バックアップと作業範囲

専用ブランチ `codex/standalone-lossless` で実施。作業前のmain全履歴を `/workspace/scratch/irena-before-standalone-optimization.bundle` に保存し、`git bundle verify` で検証した。元の作業ツリーの未コミット変更には触れていない。過去のGit履歴も書き換えていない。

## 実装

`tools/optimize-embedded-images.mjs` で、ビルド時だけPNGを可逆圧縮する。表示される色、アルファ値、寸法をデコードして比較し、条件を満たして小さくなった画像のみを採用する。透過画像はPNG形式を保ち、非透過PNGは可逆WebPに変換できる。JPEG・既存WebP・SVGは再圧縮しない。APNGのアニメーション制御を検出した画像や、精度・回転の扱いが異なる画像は元データを使う。

画像の縮小、切り取り、非可逆圧縮、画像削除は行っていない。原画像は上書きしない。処理には開発用依存 `sharp@0.34.5` を使う。sharpはビルド環境だけに必要で、ゲーム本体には組み込まれず、ゲームを開くときの外部サービス・追加ライブラリの読み込みもない。

`tools/build.mjs` は、単体HTMLだけに圧縮後の画像を埋め込む。公開用HTMLと外部画像には従来のデータを使う。公開用 `dist/` は、ビルド時刻を持つ `BUILD.json` を除き、全ファイルが基準版とバイト単位で一致した。

単体HTMLの50,000,000バイトは目安として警告のみを出す。公開用HTMLの25 MiBチェックは別に維持した。画像別サイズ、採用理由、全体サイズは `artifacts/build-size-report.json` に出力される。生成物は引き続きGit・ソースZIPには入らない。

## 透過画像で見つかった問題と対処

最初の試作では、PNGと可逆WebPでRGBA画素が同じでも、ブラウザでの半透明画素の処理に細かな差が出る画像があった。この試作は不採用とし、透過画像はPNG形式を維持する実装に変更した。最終出力で変換されたのは非透過の10画像で、ChromiumのCanvas比較では表示画素の相違がすべて0だった。透過画像は最終出力では元データが保たれた。

内部比較では完全透明画素のRGBのみを比較対象外とする。アルファ値は全画素で一致を要求する。表示されるRGBに差があれば、元画像に戻す。

## 採用した画像

次の数値はBase64化する前の画像データ。HTMLの削減量にはBase64分も含まれる。

| 画像 | 変更前 B | 変更後 B |
| --- | ---: | ---: |
| authority-v1/wing.png | 709,063 | 611,094 |
| authority-v1/judge.png | 806,769 | 737,448 |
| authority-v1/abyss.png | 842,422 | 740,330 |
| authority-v1/fallen.png | 854,511 | 747,022 |
| authority-v1/king.png | 798,814 | 698,546 |
| sortie-normal-final.png | 591,206 | 511,014 |
| sortie-ex-kaiser.png | 663,421 | 576,410 |
| sortie-stella.png | 768,847 | 669,992 |
| sortie-final-irena.png | 767,770 | 683,624 |
| chibina-room-banner.png | 1,910,651 | 1,333,122 |

完全なパスと全89画像の結果は同じフォルダの `size-results.json` に記録している。

## 検証結果

- 全自動テスト：**742件成功、0件失敗**。
- JavaScript構文検査：**132ファイル成功**。
- 配布用の単体HTMLと各ZIPを生成。ZIP整合性検査は **3/3成功**。
- ソースZIPへの `dist/`・`irena-play.html` の混入なし。
- 原画像・ゲーム用 `web/` に差分なし。
- 単体HTMLは画像配列を除いたJS・CSS・HTML全体が変更前と完全一致。
- Chromiumで変更した10画像の表示画素を比較し、相違 **0**。
- 外部通信を遮断し、HTML本文だけを渡して起動、斬撃、防御、セーブ後の再読み込み、ちびーなルームの画像表示が成功。
- 検証中の追加ファイルへのリクエスト **0件**、ブラウザ例外 **0件**。

最初の全体検査では、旧50MB停止条件を文字列で要求するテスト1件と、依存設定の変更前ハッシュを要求する履歴監査2件が失敗した。旧停止条件への要求を取り除き、今回の変更を正確な前後ハッシュとして新規承認記録へ追加した。過去の監査記録は変更せず、ゲーム動作のテストも削除していない。修正後に全742件の成功を確認した。

証拠の要点は `verification.json`、`browser-results.json`、`size-results.json` に記録した。

## 検証の限界

この環境の管理ポリシーでは `file://` ナビゲーションが許可されていないため、ダブルクリック起動そのものは実測していない。通信遮断・HTML本文のみの構成で確認した。実機iPhone/Safariも未検証。ゲームの実行コードとセーブ形式は変更しておらず、JS配列の89画像とCSS背景5画像は引き続きHTMLに内包される。新しいブラウザ機能への依存は追加していない。

## 容量について残る点

今回減ったのは単体HTMLのファイルサイズ。原画像と過去のGit履歴は残るため、GitHubの過去を含む保存容量が約1.79 MiB減ったという意味ではない。公開用データは同一なので、今回の変更による公開ページの通信量削減もない。

単体HTMLは依然約44.93 MiBあり、今後画像が増えると大きくなる。50MB警告は目安で、ブラウザ性能を保証する値ではない。完全な単体形式を保ってさらに大幅に減らすには、画像の画質・解像度に関する判断が必要になる。今回は安全性を優先し、その変更を採用していない。

## 再現・復旧

```sh
npm ci
npm run build
npm test
npm run check
python3 tools/package.py
CHROMIUM_PATH=/usr/bin/chromium node tools/verify-standalone-images.mjs BEFORE.html irena-play.html
```

最後のコマンドには変更前HTMLが必要。Playwright付属Chromiumを使う場合は `CHROMIUM_PATH` を省略できる。結果は `artifacts/standalone-browser-verification.json`。

この変更のPRを通常のrevertで取り消せる。原画像・ゲームソース・保存形式には変更がないため、既存セーブの変換やユーザー操作は不要。必要なら変更前bundleから基準版を取り出せる。

## 公式資料

- [GitHubの大容量ファイル制限](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)：50 MiB超は警告、100 MiB超は通常Gitで拒否。独自の50,000,000バイト停止値とは別。
- [GitHub Pagesの利用制限](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)：公開サイトの上限は1GB。
- [sharpのWebP出力設定](https://sharp.pixelplumbing.com/api-output/#webp)：lossless出力の仕様。

公開反映の最終結果は、ユーザーへ渡す完全報告書の末尾に追記する。
