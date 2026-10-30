# 次の開発者へ

第二段階の正本は公開リポジトリの本変更コミット。project_idは `.openai/hosting.json` の既存値を保持する。ダウンロード用Sitesは今回変更しない。

ゲーム本体Sites: appgprj_6ada04c83c3481918dbc196414e270c5。

開発を継続する場合は公開ソースのポイント全振り、開発者10,000P、developerGauntletを保持する。軽量版で全体上書きするとこれらが欠落する。audit30初期コピーに適用する場合は専用の軽量版差分ZIPを使う。

mirrorTrial.jsが封印・敵応答・相互作用を管理。mirrorSealBreakにはroute/seals、mirrorDoomResponseにはresponse/successが入る。1行動1破砕と各HP下限を保護する。通常倍率の変更は禁止。未準備必殺のダメージは残し、封印破砕だけ準備を要求する。

npm test / npm run check / npm run build。実戦比較はnode tools/mirror-stage2-sim.mjs。GAME_ROOTで比較元、SIM_OUTで出力先を指定可能。旧結果を上書きしないこと。保存場所はreports/mirror-stage2/。

Git bundleで公開前原本を保持。公開バージョン・コミット・結果はpublication.jsonを確認。実iPhoneは未確認。次回は人間の初見プレイと、短期連携を理解した攻略の体験を確認し、倍率を触る前に解除要件の分かりやすさを評価する。
