# CLAUDE.md — Claude: read before any edit

Auto-loaded project instructions for Claude.

Follow **`AGENTS.md`**, then read **`docs/AI_START_HERE.md`** completely before changing code or data.

<!-- ここは `npm run sync:docs` が書き込みます。手で直さないでください。 -->
<!-- STATE:LINE -->
186項目 · 33まとまり · FAQ 936組 · 出典 135件 · 6タブ · 検査 52項目
<!-- /STATE -->

Critical (do not skip):

- SoT = `src/data/*`（`/workspace/marriage-research` ではない）
- 完了前に `npm run handoff`。ビルドは `npm run build`（`vite build` 単体は不可）
- 内容を減らさない。増やしたら `scripts/verify-seed.mjs` の下限も上げる
- **作り手あてのメモを画面に出さない**（AGENTS.md の §Screen language。過去いちばん多い失敗）
- 式なしは W* を隠すだけ。JSON からは消さない。"Lean" は社内語で画面には出さない
- Amity は右下の丸ボタンだけ。デスクの吹き出しは削除済み・戻さない
- `pad` / `review` / practices・talks・agreements・refs を消さない
- `bookSchema` の新しい欄は既定値つきのまま。必須にすると既存の手帳が壊れる
- 秘密情報を置かない / 円を捏造しない / 結婚新生活を「もらえる額」にしない
- 公開後、`assets/index-*.js` が HTTP 200 か確認

## 終わる前に（全AI共通・コマンドは1つ）

```bash
npm run handoff        # = sync:docs（数字を書き直す） + verify:seed（検査）
```

- 検査が緑にならないうちは終わりではありません。
- **`sync:docs` が書き換えたドキュメントも一緒にコミットしてください。**
- 画面から何かを消した／増やした／方針を変えたら、`docs/DECISIONS.md` に**1行足す**。
- `main` に push すれば、GitHub Actions が検査→ビルド→公開まで自動で行います（手動デプロイ不要）。

くわしくは **`docs/HOW_TO_FINISH.md`**。「なぜそう決めたか」は **`docs/DECISIONS.md`**。

Full detail: `docs/AI_START_HERE.md` → `docs/HANDOFF.md` → `docs/CONTENT_GUARD.md` → `docs/HISTORY.md`.
