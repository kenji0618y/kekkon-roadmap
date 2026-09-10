# CLAUDE.md — Claude: read before any edit

Auto-loaded project instructions for Claude.

Follow **`AGENTS.md`**, then read **`docs/AI_START_HERE.md`** completely before changing code or data.

**Last full pass: 2026-09-11** — 176 tasks · 33 groups · FAQ 829 · sources 117 · 7 tabs ·
`verify-seed` 46 checks.

Critical (do not skip):

- SoT = `src/data/*`（`/workspace/marriage-research` ではない）
- 完了前に `npm run verify:seed`。ビルドは `npm run build`（`vite build` 単体は不可）
- 内容を減らさない。増やしたら `scripts/verify-seed.mjs` の下限も上げる
- **作り手あてのメモを画面に出さない**（AGENTS.md の §Screen language。過去いちばん多い失敗）
- 式なしは W* を隠すだけ。JSON からは消さない。"Lean" は社内語で画面には出さない
- Amity は右下の丸ボタンだけ。デスクの吹き出しは削除済み・戻さない
- `pad` / `review` / practices・talks・agreements・refs を消さない
- `bookSchema` の新しい欄は既定値つきのまま。必須にすると既存の手帳が壊れる
- 秘密情報を置かない / 円を捏造しない / 結婚新生活を「もらえる額」にしない
- 公開後、`assets/index-*.js` が HTTP 200 か確認

Full detail: `docs/AI_START_HERE.md` → `docs/HANDOFF.md` → `docs/CONTENT_GUARD.md` → `docs/HISTORY.md`.
