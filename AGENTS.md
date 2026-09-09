# AGENTS.md — stop. Read this before editing.

This file is the auto-entry for **Grok**, **ChatGPT/Codex**, Cursor, and other coding agents.

You are working in **kenji0618y/kekkon-roadmap** (Amityちゃんにきく / 結婚ロードマップ PWA).

## Mandatory before any code change

1. Read **`docs/AI_START_HERE.md`** fully (then HANDOFF → CONTENT_GUARD → HISTORY).
2. Do **not** ask Kenji to re-explain product history.
3. Source of truth = **`src/data/*`** in this repo. `/workspace/marriage-research` is **not** in GitHub — never require it.
4. Never thin seed (`why`/`miss`/`window`/FAQ/deadlines/exclude/home/phases/money_*). ABSORB only.
5. Lean: `ceremony==='no'` **hides** W* tasks in UI — **do not delete** them from `tasks.json`. No empty 挙式 stamp cards.
6. Amity local search (`desk-chat` / `answerDeskQuery`) must pass **`profile` / `inScope`**.
7. Amity FAB = chat-only. Desk **command HUD stays** on デスク. Do not delete the HUD.
8. No invented yen. No 結婚新生活 as a prize. No celebration/寿 UX. No secrets in git.
9. Before claiming done: run **`npm run verify:seed`** and paste the count table. Use **`npm run build`** (not bare `vite build`) so `prebuild` runs verify. `predev` also runs verify.
10. App deploy: `npx gh-pages -d dist` (+ `.nojekyll`). Confirm Pages `assets/index-*.js` returns **HTTP 200** (CDN can lag). Docs-only → push `main` only.
11. Grok key: localStorage or `amity-grok-bundle.ts` only — **no** `VITE_*`. Credits: https://console.x.ai/
12. Cursor Cloud Agents may be plan-locked — continue with a normal clone if launch fails.

## Entry map

| Audience | Open first |
|----------|------------|
| Any agent | `AGENTS.md` (this file) → `docs/AI_START_HERE.md` |
| Claude | `CLAUDE.md` → same |
| ChatGPT / Copilot | `CHATGPT.md` + `.github/copilot-instructions.md` → same |
| Humans | `README.md` |

Kenji does **not** need to remind you. If you opened this repo, these rules already apply.
