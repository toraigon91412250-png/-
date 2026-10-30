# audit30 — 実験場の全機能開放と鏡像三形態

「全機能開放」を押して試験データで実験場に入ると、鏡像いれーなの第1形態から第3形態まで連続で戦える。第3形態への直接挑戦ボタンも開放。試験データでは第2形態撃破時に第3形態へ自動移行する。通常プレイの隠し条件は変更しない。

鏡界記録は本編のセーブと別であり、全機能開放中の鏡像戦は通常の鏡界記録を更新しない。試験データの再作成や読み込み後にも開放する。鏡像の戦闘倍率・報酬・主要進行は変更しない。

変更: web/src/components/App.js、web/src/utils/mirrorTrial.js、tests/mirror-finale.test.js、tests/audit-baseline.js、reports/mirror-dev-audit30/authorized-changes.json。

検証: 関連26件成功、全体446件成功・失敗0、npm run check成功（76ファイル）、npm run build成功（単体HTML 50,753,072 bytes）。Chromium 390×844で全機能開放後の第3形態入口・通し戦入口・案内・横はみ出しなし・JSエラーなしを確認。戦闘ロジックはユニットテストで第1→第2→第3形態と通常条件維持を確認。iPhone Safari実機は未確認。
