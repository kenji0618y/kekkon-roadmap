# 年次データ更新ガイド

円・期限・対象外は JSON seed のみ。コードで金額を発明しない。

## 対象ファイル

- src/data/stamps.json
- src/data/deadlines.json
- src/data/phases.json
- src/data/home.json
- src/data/exclude.json
- src/data/profile.json
- src/data/meta.json

## 手順

1. app-seed 最新化
2. stamps-v2 があれば上書き
3. 円は出典付きのみ
4. why / steps / faq を入れる
5. 結婚新生活は賞品にしない
6. meta.json 更新
7. 検証スクリプト実行
8. ビルド確認

## schema_version 2

why?, steps?, faq?:{q,a}[], review_year?

不足時はアプリが title/miss/window から最小プレースホルダを合成（円は合成しない）。
