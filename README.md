# Amityちゃんにきく（結婚ロードマップ）

> **AI（Claude / Grok / ChatGPT）へ:** 作業前に必ず [`AGENTS.md`](AGENTS.md)（Claude は [`CLAUDE.md`](CLAUDE.md)、ChatGPT は [`CHATGPT.md`](CHATGPT.md)）→ [`docs/AI_START_HERE.md`](docs/AI_START_HERE.md) を読め。Kenji に歴史を聞き直すな。完了前に `npm run verify:seed`。

広島市向け・共働き・式なし前提の結婚・新生活ハンドブック PWA です。

- **公開 URL:** https://kenji0618y.github.io/kekkon-roadmap/
- **Repo:** https://github.com/kenji0618y/kekkon-roadmap
- **引き継ぎ（AI 必読）:** [`docs/AI_START_HERE.md`](docs/AI_START_HERE.md) → HANDOFF → CONTENT_GUARD → HISTORY → MERGE_OVERLAPS（2026-09-11 全面更新）

## 使い方

1. 上の URL を開く
2. 初回オンボーディング／「ふたりの設定」で呼び名・働き方・式の有無などを設定（初期は共働き・式なし寄り）
3. タブでデスク／マップ／期限／記念／ふたり／探す／設定を使う
4. 記録は **この端末のブラウザ（localStorage）** に保存（任意で秘密 Gist 同期）
5. 「設定」からバックアップ JSON の書き出し／読み込みができます

## タブ構成（2026-09-11 現在・7タブ）

| タブ | 内容 |
|---|---|
| デスク | 進みぐあい・婚姻日・次の期限 ＋ 金額のグリッド ＋ 大きな数字／次のアクション／思い込み／対象外／会話のきっかけ |
| マップ | スタンプ帳ボード（絵の縁を押して進める）|
| 期限 | 制度の締切 ＋ 個人の予定 ＋ 時期の区切りと出来事（9時期・48出来事）|
| 記念 | 記念メモ ＋ 月に一度のふたり会議 |
| ふたり | ふたりの練習帳（行動52／会話16／合意18／根拠18）|
| 探す | 制度検索（176項目）|
| 設定 | プロフィール／同期／Grok／毎年更新メモ／リセット |


### iPhone（ホーム画面に追加）

1. Safari で上記 URL を開く
2. 共有ボタン → **ホーム画面に追加**

### Android

1. Chrome で上記 URL を開く
2. メニュー → **ホーム画面に追加**／アプリをインストール

## 技術メモ

- Vite + React + TypeScript の静的 SPA（GitHub Pages、`base: './'`。**HashRouter 未使用**）
- ChatGPT Sites / D1 / vinext は使いません（端末内保存 + 任意 Gist）
- データ正本は **`src/data`**（過去の app-seed から復元済み）。`/workspace/marriage-research` はリポに無い。UI 変更でシードを薄くしない → `docs/CONTENT_GUARD.md`
- 結婚新生活支援事業は広島市では未実施の案内のまま（「もらえる額」として扱いません）
- 円の金額は収録データまたはユーザー入力のみ（推測で書きません）
- **画面に作り手のメモを出さない**（既定・一次・賞品・M0・「〜は書かない」など）→ `AGENTS.md` §Screen language
- 民間の特典には最終確認日（`tasks[].review`）を持たせ、15か月を過ぎるとビルドが警告します

## 開発・検証・デプロイ

```bash
npm ci
npm run verify:seed   # 必須：完了報告前にカウントを貼る（prebuild でも実行・46項目）
npm run build
npx gh-pages -d dist  # dist 直下に .nojekyll
```

- 継続ドキュメント（`docs/*`）は **`main` に置く**。docs のみの更新は Pages 再デプロイ不要。
- Actions workflow の push は OAuth `workflow` scope 不足で失敗しやすい → 手動 `gh-pages` で十分。

## Amity × Grok

- Amity = 全タブ右下の**丸ボタン（チャット）だけ**。デスクの吹き出しは 2026-09-10 に削除。
- デスク上部のパネルは存続。ただし和紙の見た目に変更（ダークな HUD には戻さない）。
- 金額のグリッド（受取／見込み／固定費／税）は **デスク**（2026-09-10 に記念から移動）。
- Grok キー: 設定の localStorage が優先。なければ `amity-grok-bundle.ts` の難読化シファーを実行時デコード。
- クレジット／利用上限の購入はアプリ外 → https://console.x.ai/
- **注意:** 生の `xai-` キーをリポ / Pages バンドルに置かない。

## スタンプイラスト

- ロードマップは **スタンプ帳／ボード配置のまま**（横スクロールギャラリーや一覧エスケープにはしない）。
- 超過分は同じイラストの **サブマス分割**。追加アートは `public/phases/gen-*.png`（`phase-images.json`）。

## 引き継ぐ AI へ

`AGENTS.md`（Grok / Codex / Cursor）、`CLAUDE.md`（Claude）、`CHATGPT.md`（ChatGPT）を開けば、
そのまま `docs/AI_START_HERE.md` に進めるようになっています。Kenji に経緯を聞き直す必要はありません。

現状（2026-09-11）: 176項目 / 33まとまり / FAQ 829組 / 出典117件 / 7タブ / 検査46項目。
