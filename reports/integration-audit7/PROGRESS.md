# audit7 UI・バランス調査統合

元コード・元ZIPは保持。作業先は /workspace/irena-audit7-integrated/irena-reborn。

入力: audit6-LIGHT-transfer.zip、audit5-audit6-handoff.zip。完全audit6ソースZIPは未受領。
audit5原本ZIPのSHA256は資料値7d22dfffdffcccaa8a0b55d2eb76a1c6414a219a20b9c11756514315a0039b6fと一致。
原本の別展開で差分をdry-runしてから適用し、UI参照版を復元。提供実ファイル6点と一致。START-HERE.mdのみ、軽量版の実ファイルは旧audit5案内、差分側はaudit6案内で不一致（説明ファイルだけ）。
復元HTMLのSHA256は報告値3f212991f6c80a4f936c294f494be2e63c09669d949e2f2bf8609c0a183b7bb9と完全一致。復元UI版320テスト成功。

調査側はaudit5から既存コード変更なし。追加はreports/balance-audit6とtests/balance-study.test.jsのみ。UIとの直接競合なし。統合版は既存App.js/CSS/監査読み出し層のみ変更し、調査成果をそのまま保持。戦闘計算・倍率・経済・保存・画像に変更なし。
統合時の全326テスト成功。ブラウザ320/375/390/430と通常/羽撃ち分け/EX/ステラ/専用いれーなを確認中。

測定成果30,416戦・1,488ルートを保持。バランス数値の変更は0。連羽CT2→3等は未承認の比較候補に留める。

ゲーム公開サイトは更新しない。完了後のHTML・ソース・レポート・スクリーンショットは新しいaudit7名で納品する。

最終: check46 / tests328 / build成功。Chromium119項目成功、エラー0。防御右列を全8組で確認。ZIP復元検証へ。
ZIP別展開: check46/tests328/build成功、HTMLバイト一致。完了。
