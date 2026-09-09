# HISTORY — decision log (2026-09)

Chronological continuity for incoming AIs. SHAs are from `git log` on `main` unless noted.  
Quotes tagged `t##u` are Kenji user-message ids from the Cursor continuity thread (useful for search in parent transcripts).

## Timeline (bullet)

### Research → first PWA
- **Content source of truth in this repo = `src/data/`.** An earlier research archive (`marriage-research/app-seed`: stamps-v2, deadlines, exclude, home, phases, YEARLY_UPDATE, …) lived on Kenji’s Grok Bot machine only and is **not** part of this GitHub clone. Treat that path as historical; do not require it.
- `0b6c66e` (2026-09-08) — Initial commit: 結婚ロードマップ PWA + GitHub Pages intent.
- `b17b9ce` / `47774bd` / `59ad095` / `9f41786` — Pages path / deploy fixes; Actions workflow avoided (OAuth `workflow` scope).

### ChatGPT notebook port
- `3648677` (gh-pages/candidate era) — ChatGPT notebook「ふたりの未来帖」as candidate base.
- `fa0633d` (2026-09-08) — Replace stamp Vite app with notebook SPA.
- **Mistake:** notebook merge **thinned** rich stamp fields (`why` / `miss` / `window` / FAQ) and left other seed JSON unwired. Later restored **into `src/data`** from the external research archive — **do not repeat** (see CONTENT_GUARD). If you only have this repo, the restored files are already under `src/data`.
- `34cb337` — Merge overlapping notebook tasks (→ ~137) + strip celebration UX.
- `01a2b46` — Add **結婚デスク** command-home dashboard as primary tab (original rich HUD).

### Stamp board + sync + Amity
- `d13832d` — Restore stamp-on-illustration roadmap UI.
- `524ab48` / `b828ba6` — Bidirectional progress sync via secret GitHub Gist (`4962ce100b42c446015825282f28b774`); desk navi mascot prefill.
- `df03965` / `add17d4` — On-device DESK mascot Q&A; JP query matching.
- `eaece87` / `e0f2fef` — **Amityちゃん** shark mascot + optional Grok research; rebrand **Amityちゃんにきく**.
- `3f8a410` — First `HANDOFF.md` for AI/dev continuity.

### Amity chat-only vs HUD (famous fork)
- **Kenji `t37u`:** wants a living **command desk HUD** (dynamic “司令室”), not a static pamphlet home.
- **Kenji `t53u`:** Amity /「聞く」should be **chat-only** (mascot conversation), not a second dashboard inside Amity.
- `fb9de10` (2026-09-08) — Make Amity desk chat-only + stamp art + settings research.
- **Mistake:** over-interpreted「チャットだけ」and **deleted the command-center HUD** along with embedded Amity dashboard. Kenji did **not** ask to abolish the desk HUD.
- `4141eea` / `3a1fcde` — Ignore Vite env locals; document why Grok key must not ship as plaintext Pages bundle.
- `05843f8` / `67e1f81` — Amity = **global FAB** chat overlay on every tab; sticky header tabs; Grok key obfuscated bundle.

### Stamp art-first / sub-mass / no list escape
- `fc54aac` — Rebuild stamp board: **art-first** squares with corner pads.
- `f9c9843` — HANDOFF: stamp overflow must stay **on-image**, not a separate list.
- **Kenji `t66u`:** no “list escape” from the stamp board (一覧トグルでボードを捨てない).
- `6a172af` — Overflow via **sub-mass split**; raise Sheet z-index above FAB.
- `0245775` — Pads **MAX=6** (edge mids); drop journey list / `mapView` toggle.

### Content loss & restore + CONTENT_GUARD
- Discovery: tasks missing why/miss/window/FAQ vs `stamps-v2`; home/deadlines/exclude/phases/money unwired or thin.
- `3aeba3d` — Restore stamps-v2 why/miss/window/FAQ into the **137** tasks (+ MERGE_OVERLAPS absorb).
- `e9d5bae` — Restore app-seed deadlines/exclude/home/phases + square subtitle/chips.
- `dbec0ac` — Restore headline/tomorrow/money seed UI + add **`docs/CONTENT_GUARD.md`** + `npm run verify:seed` / `prebuild`.
- `7a8d882` — Collapse heavy seed panels by default (mobile density; data kept).
- `13b2321` — Grok 403 credits/spending-limit → JP message + local desk-chat fallback.

### HUD restore + tab split
- **Kenji `t87`–`t89`:** restore the command-center HUD; clarify Amity FAB ≠ delete desk HUD.
- `07944e0` — Restore 結婚デスク command-center HUD (initially on journey home).
- `8b4427a` — **Split tabs by label:** desk HUD on **デスク**, roadmap = stamps only, new **時期** tab for phases.
- `c0c4bd6` — Consolidate overlapping desk UI → one unified next-actions block.

### Prune / add / lean5
- `1f93833` — Prune desk décor (fold Chord/Lattice/Network); friend-facing add-ons (onboarding, near deadlines, local-only chip, PWA prompt, nav scroll).
- `8a90775` (**lean5**) — Hide ceremony tasks when `ceremony==='no'` (data kept); pair modal = backup/Gist only; further slim desk; Grok **credits link** to `console.x.ai`; friend handoff card on desk.
- `e257c2f` — Continuity docs audit: SoT=`src/data` for GitHub clones; drop Vite Grok-key recipe; clarify no HashRouter; scope Grok Bot agent id.
- (recheck) — Path inventory + Lean hide≠delete note + `verify:seed` YEARLY docs↔src/data identity.

## Key Kenji quotes (message ids)

| id | Intent (paraphrase) | What we did / should remember |
|----|---------------------|-------------------------------|
| `t37u` | Want a dynamic 結婚デスク / command HUD | `01a2b46` introduced; must remain (now desk tab) |
| `t53u` | Amity / 聞く = **chat-only** | FAB + `DeskChatPanel`; not a second dashboard |
| `t66u` | No list escape from stamp art | Dropped journey list toggle; overflow = sub-mass |
| `t87`–`t89` | Restore HUD; chat-only ≠ delete HUD | `07944e0` + tab split `8b4427a` |

## Standing outcomes (as of app lean5 `8a90775` · docs recheck 2026-09-09)

- **137** tasks exact; celebration UX gone; 結婚新生活 not a prize.
- Amity = **FAB chat-only**; desk **HUD remains** on デスク.
- Seed inventory gated by **`verify:seed`**; never thin **`src/data`** (GitHub SoT). Local `marriage-research/` is optional archive only.
- Lean: `ceremony==='no'` **hides** ceremony tasks in UI; **do not delete** them from `tasks.json`.
- Gist sync + localStorage; Grok credits are **external** (console.x.ai). No `VITE_*` Grok key.
- Docs continuity: `AI_START_HERE` → `HANDOFF` → `CONTENT_GUARD` → this file → `MERGE_OVERLAPS`.

## Anti-patterns checklist

- [ ] Treating `/workspace/marriage-research/` or `box-secrets` as required (not in this repo)  
- [ ] Wiring Grok via `VITE_*` env (app does not read it; use localStorage / bundle)  
- [ ] Replacing `tasks.json` from a thinner notebook export  
- [ ] Deleting MarriageDesk because Amity is chat-only  
- [ ] Adding a journey “一覧” escape hatch for overflow stamps  
- [ ] Committing plaintext `xai-` / PAT / `.env*.local`  
- [ ] Claiming done without `npm run verify:seed` output  
