# Copilot / ChatGPT instructions — kekkon-roadmap

Treat **`AGENTS.md`** and **`docs/AI_START_HERE.md`** as mandatory context before suggesting
or applying changes.

<!-- ここは `npm run sync:docs` が書き込みます。手で直さないでください。 -->
<!-- STATE:LINE -->
186項目 · 33まとまり · FAQ 936組 · 出典 135件 · 6タブ · 検査 52項目
<!-- /STATE -->

- Product: Amityちゃんにきく (Hiroshima marriage roadmap PWA)
- Source of truth: `src/data/*` only (no external `/workspace/marriage-research`)
- 終わる前に **`npm run handoff`**（sync:docs + verify:seed）。build は `npm run build`
- `sync:docs` が書き換えた docs も一緒にコミットする。push すれば Actions が自動で公開する
- Never thin content — and when you add content, raise the floors in `scripts/verify-seed.mjs`
- **Never let builder-facing notes reach the screen** (既定 / 一次 / 賞品 / M0 / Lean / invent /
  「〜は書かない」/「取りこぼし：」/ R8.4.1 / HUD …) — see AGENTS.md §Screen language
- Ceremony tasks are hidden, never deleted; "Lean" is an internal word only
- Amity is the bottom-right FAB chat only; the desk Amity bubble was removed on 2026-09-10
- Keep `tasks[].pad`, `tasks[].review`, and practices/talks/agreements/refs
- Keep `bookSchema.practices` / `.agreements` optional with defaults (required breaks saved notebooks)
- 消した／増やした／方針を変えたら `docs/DECISIONS.md` に1行足す
- Do not invent yen; do not treat 結婚新生活 as a prize; do not commit API keys or PATs

Read order: `docs/AI_START_HERE.md` → HANDOFF → CONTENT_GUARD → HISTORY.
