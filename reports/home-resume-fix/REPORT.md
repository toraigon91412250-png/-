# ホームから進行中の戦闘に戻る最小修正

ゲーム本体の変更はweb/src/components/App.jsのホーム描画2行のみ。進行中（battleあり、resultなし）は「戦闘に戻る」とし、既存nav/battleへ接続する。戦闘がない/終了済みの場合は元の冒険/ワープ分岐を維持する。

変更前の通知を実ブラウザで再現済み（before.json）。変更後は390px幅のChromiumで5項目を確認：文言、ターン/HP/ゲージ/保存JSONの完全維持、再開後の操作、終了後の冒険ボタン復帰、次戦の開始。ブラウザエラー0。関連ホームテスト6件合格、失敗0・スキップ0。App構文チェックと本番ビルド成功。ユーザー指定に合わせ全体テスト・大規模ブラウザ回帰は今回再実行していない。iPhone実機は未確認。

直前納品ZIPとの比較で、web/assets/tools/testsの変更はApp.jsのみ。戦闘計算・保存・解放条件・画像・CSS・テストは変更していない。既存の三相決戦追加修正版に関する未確認事項はそのまま。デプロイなし。

検証再実行：node --test tests/home-ui.test.js / node --check web/src/components/App.js / npm run build。HTTP4181で配信した上でnode reports/home-resume-fix/browser-check.mjs。変更前確認は修正前HTMLで--beforeを指定する。
