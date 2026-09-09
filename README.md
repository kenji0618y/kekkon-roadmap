# Amityちゃんにきく（結婚ロードマップ）

広島市向け・共働き寄り・式なし Lean の結婚・新生活ハンドブック PWA です。

- **公開 URL:** https://kenji0618y.github.io/kekkon-roadmap/
- **Repo:** https://github.com/kenji0618y/kekkon-roadmap
- **引き継ぎ（AI 必読）:** [`docs/AI_START_HERE.md`](docs/AI_START_HERE.md) → HANDOFF → CONTENT_GUARD → HISTORY → MERGE_OVERLAPS

## 使い方

1. 上の URL を開く
2. 初回オンボーディング／「ふたりの設定」で呼び名・働き方・式の有無などを設定（初期は共働き・式なし寄り）
3. タブでデスク／ロードマップ／期限／時期／記念手帳／制度検索を使う
4. 記録は **この端末のブラウザ（localStorage）** に保存（任意で秘密 Gist 同期）
5. 「設定」からバックアップ JSON の書き出し／読み込みができます

### タブ IA（現状）

| タブ | 内容 |
|------|------|
| デスク | 司令室 HUD（薄メトリクス）+ ホーム洞察 + 友人向け handoff |
| ロードマップ | スタンプ帳ボード（アート優先・縁パッド最大6） |
| 期限 | 制度締切 + 個人予定 |
| 時期 | 9時期・出来事一覧 |
| 記念 | 記念メモ + 金額グリッド + 月次ふたり会議 |
| 探す | 制度検索（約 **137** タスク） |
| 設定 | プロフィール / Gist / Grok / 毎年更新メモ / リセット |

**Amityちゃんにきく**は全タブ右下の **FAB チャットのみ**。  
**結婚デスクの司令室 HUD は廃止していません**（デスクタブ最上段）。「Amity をチャットだけ」≠「HUD を消す」。

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
- 結婚新生活支援事業は広島市では未実施の案内のまま（賞品扱いしません）
- 円の金額はシードまたはユーザー入力のみ（捏造禁止）

## 開発・検証・デプロイ

```bash
npm ci
npm run verify:seed   # 必須：完了報告前にカウントを貼る（prebuild でも実行）
npm run build
npx gh-pages -d dist  # dist 直下に .nojekyll
```

- 継続ドキュメント（`docs/*`）は **`main` に置く**。docs のみの更新は Pages 再デプロイ不要。
- Actions workflow の push は OAuth `workflow` scope 不足で失敗しやすい → 手動 `gh-pages` で十分。

## Amity × Grok

- Amity = **FAB チャット**（全タブ）。司令室ダッシュボードは **デスク HUD** として存続。
- 得した記録／損回避の薄い指標はデスク HUD；フル money-grid は記念タブ。
- Grok キー: 設定の localStorage が優先。なければ `amity-grok-bundle.ts` の難読化シファーを実行時デコード。
- クレジット／利用上限の購入はアプリ外 → https://console.x.ai/
- **注意:** 生の `xai-` キーをリポ / Pages バンドルに置かない。

## スタンプイラスト

- ロードマップは **スタンプ帳／ボード配置のまま**（横スクロールギャラリーや一覧エスケープにはしない）。
- 超過分は同じイラストの **サブマス分割**。追加アートは `public/phases/gen-*.png`（`phase-images.json`）。
