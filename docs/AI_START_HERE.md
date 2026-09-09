# AI_START_HERE — read this first

Incoming AI / developer: start here, then follow the read order below.  
Do **not** rediscover product history by chatting with Kenji.

## Product

| | |
|--|--|
| One-liner | 広島市向け・共働き寄り・式なし Lean の結婚／新生活ハンドブック PWA（ブランド名 **Amityちゃんにきく**） |
| Pages URL | https://kenji0618y.github.io/kekkon-roadmap/ |
| Repo | https://github.com/kenji0618y/kekkon-roadmap |
| Owner | Kenji Kadomoto · GitHub `kenji0618y` · timezone **Asia/Tokyo** |

## Read order (mandatory)

1. **`docs/AI_START_HERE.md`** ← you are here  
2. **`docs/HANDOFF.md`** — current IA, hard rules inventory, paths, deploy, lean5 status  
3. **`docs/CONTENT_GUARD.md`** — never thin app-seed; run verify  
4. **`docs/HISTORY.md`** — chronological decisions + famous mistakes (2026-09)  
5. **`docs/MERGE_OVERLAPS.md`** — drop→keep task merge map (already absorbed)

Also useful: `docs/YEARLY_UPDATE.md` (settings shows the same text).

## Hard rules (summary)

1. **No invented yen** — amounts only from seed or user input.  
2. **No 結婚新生活「prize」** — Hiroshima city guide treats it as not available; do not gamify 30万/60万.  
3. **No celebration UX** — お祝い／寿／手紙ギフト演出は復活させない.  
4. **No secret commits** — xAI key, GitHub PAT, `.env*.local` stay out of git / Pages plaintext.  
5. **NEVER thin app-seed** — source of truth = `/workspace/marriage-research/app-seed` **or** copies in `src/data`. Merges **ABSORB** rich fields (`why` / `miss` / `window` / FAQ / deadlines / exclude / home / phases / money_*). UI refactors must not drop data.  
6. Before claiming done: run **`npm run verify:seed`** and paste the count table. (`prebuild` also runs it.)

Full minima → `CONTENT_GUARD.md` / HANDOFF HARD RULES (~137 tasks, FAQ ≥650, etc.).

## Current tab IA

Default tab = **デスク**. Tabs live in the **sticky header** (not a bottom bar).  
**Rule:** content must match the tab label.

| id | Label (short) | Contents |
|----|---------------|----------|
| `desk` | デスク | `MarriageDesk` **command-center HUD** (thin metrics) + `HomeInsightPanels` (headline / hero / unified next-actions / lies / exclude / talk) + friend handoff card |
| `journey` | ロードマップ（マップ） | Chapter nav + `StampIllustBoard` + CHECK FIRST + milestones only — **no** HUD / long seed essays |
| `deadlines` | 期限と予定（期限） | `InstitutionalDeadlines` + personal timeline / ICS |
| `phases` | 時期と出来事（時期） | `PhasesPanel` (9 phases · ≥48 events) only |
| `memories` | 記念手帳（記念） | Memory notes + **full money-grid** + monthly ふたり会議 |
| `find` | 制度を探す（探す） | Search only |
| `settings` | ふたりの設定（設定） | Profile / Gist / Grok / YEARLY_UPDATE / reset |

### Amity vs desk HUD (do not confuse)

- **Amityちゃんにきく** = global **FAB** (bottom-right shark) → foreground **chat only** on every tab.  
- **Desk command HUD** = **NOT deleted**. It lives at the top of the **デスク** tab (`MarriageDesk`).  
- Interpreting「チャットだけ」as “delete the HUD” was a famous mistake — see HISTORY.

Stamps: art-first squares, corner pads **MAX=6**, overflow = **sub-mass split** on the same illustration. No horizontal gallery. No journey “list escape”.

## Famous past mistakes (do not repeat)

1. **ChatGPT notebook migration thinned seed** (`fa0633d` era): dropped `why` / `miss` / `window` / FAQ (and later gaps on deadlines/exclude/home/phases/money). Restored from `marriage-research/app-seed` (`stamps-v2` → tasks, plus data JSON) via `3aeba3d` / `e9d5bae` / `dbec0ac`. **Always ABSORB; never replace-thin.**  
2. **Over-reading「チャットだけ」** (`fb9de10`): made Amity chat-only **and** removed the command-center HUD. Kenji meant Amity=chat-only, **not** abolish the desk HUD. Restored `07944e0`, then moved HUD to dedicated **デスク** tab (`8b4427a`).

## Deploy (docs live on `main`)

App Pages publish is separate from continuity docs:

```bash
cd /path/to/kekkon-roadmap   # this repo
npm ci
npm run build                # runs verify:seed via prebuild
npx gh-pages -d dist         # ensure dist has .nojekyll
```

- Continuity markdown (`docs/*`, README) → commit + **push `origin main` only**.  
- Rebuild + `gh-pages` **only when the shipped app / asset paths change** — not for docs-only edits.  
- GitHub Actions workflow push often fails (OAuth missing `workflow` scope) → manual `gh-pages` is fine.

## External (not in-repo)

| Item | Where |
|------|--------|
| Sync Gist ID | `4962ce100b42c446015825282f28b774` (`futari-miraicho.json`) — PAT stays in device localStorage |
| Grok credits / spend limits | **https://console.x.ai/** — app cannot buy credits; show JP message + link |
| Grok key | settings localStorage override, or obfuscated `amity-grok-bundle.ts` decode at runtime — never plaintext `xai-` in git/Pages |

## Quick verify

```bash
npm run verify:seed
npm run build
```

Then open Pages on phone with hard reload if you deployed the app.
