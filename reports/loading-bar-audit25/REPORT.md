# audit25 出撃バー
3種の元画像は無加工。画像内バーの内側をSVGで覆い、EXは紫ピンク、ステラは金、専用いれーなは赤ピンクで0→100まで約1150msの連続進行、約1500msで出撃完了。実通信率ではなく演出進行。画像と同じviewBox/containで縦横比を維持。終了・中断時にrequestAnimationFrame停止。戦闘仕様と表示条件は維持。
変更 battleVisuals.js/game.css、厳密な承認差分manifestとaudit-baseline.js。構文69ファイル、関連8テスト成功、ビルド成功。ブラウザ3モード各0→30→74→100、終了1回・overlay消去確認。390x664ステラ目視確認。iPhone実機未確認。
