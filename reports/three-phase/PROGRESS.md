# EXカイザー・三相決戦 試作

正本: /workspace/shared/downloads/irena-quality-20261020/irena-source.zip (SHA925834724f3ca456503411c1cb563c67773dd72c59e2154c8164088b5fc4b129)。
作業: /workspace/irena-three-phase/irena-reborn。旧納品を変更せず別に展開。

変更前147テスト・ビルド成功。通常EXの敵ターンを標準値とする任意コールバックを追加し、試作ルールは新規threePhase.jsへ分離。既存技・確定倍率・分類・保存・進行・報酬は維持。

実装: 実験場selectに三相決戦、固定黒翼＋堕天王ビルド、第二相の実際の硬化/重圧/回復、破壊と必殺の硬化解除、必殺による行動停止、防御の蓄勢/回復、第三相の既存9ラウンド終末判定。EX画像の850ms形態演出、再挑戦時リセット、本編報酬なし。

重撃の予兆表示とCSSを削除。元のダメージ計算は維持。予測・行動順推定・次の技アイコン等は追加しない。

検証完了: 164/164ユニット、構文25ファイル、ビルド成功。Chromium109・WebKit109・既存ブラウザ119・UI回帰389・実験場再挑戦3、全て成功。戦法比較は各200seed、結果はstrategy-comparison.json。公開・GitHub操作なし。

ZIP生成・別ディレクトリでの全164テスト/構文/ビルド・HTML一致確認まで成功。最終版は検証ログを含めて再梱包し、/workspace/shared/downloads/irena-three-phase/ に保存。実機iPhoneとfile://は未確認。数値は実験用で正式仕様ではない。
