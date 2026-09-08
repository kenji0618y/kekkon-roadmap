# Amityちゃんにきく（結婚ロードマップ）

広島市向けの結婚・新生活ハンドブック UI です。  
公開 URL: **https://kenji0618y.github.io/kekkon-roadmap/**

## 使い方

1. 上の URL を開く
2. 「ふたりに合わせる」から呼び名・働き方などを設定（初期値は共働き寄り）
3. ロードマップ／期限／記念手帳／制度検索を使う
4. 記録は **この端末のブラウザ（localStorage）** に保存されます
5. 「設定」からバックアップ JSON の書き出し／読み込みができます

### iPhone（ホーム画面に追加）

1. Safari で上記 URL を開く
2. 共有ボタン → **ホーム画面に追加**

### Android

1. Chrome で上記 URL を開く
2. メニュー → **ホーム画面に追加**／アプリをインストール

## 技術メモ

- Vite + React + TypeScript の静的 SPA（GitHub Pages）
- ChatGPT Sites / D1 / vinext は使いません（端末内保存のみ）
- 以前このリポジトリにあった Vite スタンプラリー UI は、ノートブック UI に置き換えました
- 結婚新生活支援事業は広島市では未実施の案内のまま（賞品扱いしません）

## 開発

```bash
# install / build / preview with local tooling
```

Pages へは `dist` を `gh-pages` ブランチへ配置します（Actions ワークフローは使いません）。

## Amity × Grok

- デスク（ナビ「聞く」）は **チャット専用**。司令室ダッシュボードは廃止。
- 得した記録／損回避はチャット上の細いストリップのみ（金額はユーザー入力のみ）。
- Grok キー: 設定の localStorage が優先。空ならビルド時 `VITE_AMITY_GROK_KEY`（**`.env*.local` は gitignore**）。
- **注意:** GitHub Pages の静的バンドルに Vite 経由でキーが入ると抽出可能。xAI 側で制限・ローテ推奨。生キーをリポにコミットしない。

## スタンプイラスト

- ロードマップは **スタンプ帳／ボード配置のまま**（横スクロールギャラリーにはしない）。
- 追加アートは `public/phases/gen-*.png`。`phase-images.json` でマスごとに割り当て。
