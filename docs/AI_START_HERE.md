# AI_START_HERE — read this first

Incoming AI / developer: start here, then follow the read order below.  
Do **not** rediscover product history by chatting with Kenji.

## Product

| | |
|--|--|
| One-liner | 広島市向け・共働き・式なし前提の結婚／新生活ハンドブック PWA（ブランド名 **Amityちゃんにきく**）|
| Pages URL | https://kenji0618y.github.io/kekkon-roadmap/ |
| Repo | https://github.com/kenji0618y/kekkon-roadmap |
| Owner | Kenji Kadomoto · GitHub `kenji0618y` · timezone **Asia/Tokyo** |
| Docs tip (main) | **2026-09-11 full pass** · 176 tasks / 33 groups / FAQ 829 / sources 117 / 7 tabs / verify-seed 47 checks |
| Live app | Pages `gh-pages` = shipped app。確認は URL と `assets/index-*.js` の 200。**docs-only では再デプロイしない** |
| Truth for every AI | **GitHub `main`** in this repo. Do not chase Kenji-local paths, Claude remotes, or `box-secrets`. |

## Auto-entry (Claude / Grok / ChatGPT)

Kenji does **not** need to tell you to start here. Root files force the path:

| File | Who picks it up |
|------|-----------------|
| `AGENTS.md` | Grok, Codex, Cursor, general agents |
| `CLAUDE.md` | Claude Code / Claude |
| `CHATGPT.md` | ChatGPT / Codex-style agents |
| `.github/copilot-instructions.md` | GitHub Copilot / ChatGPT-on-GitHub |
| `.cursor/rules/kekkon-roadmap.mdc` | Cursor (`alwaysApply`) |

If you are reading this, continue the read order below.

## Read order (mandatory)

1. **`docs/AI_START_HERE.md`** ← you are here  
2. **`docs/HANDOFF.md`** — current IA, hard rules inventory, paths, deploy, lean5 status  
3. **`docs/CONTENT_GUARD.md`** — never thin app-seed; run verify  
4. **`docs/HISTORY.md`** — chronological decisions + famous mistakes (2026-09)  
5. **`docs/MERGE_OVERLAPS.md`** — drop→keep task merge map (already absorbed)

Also useful: `src/data/YEARLY_UPDATE.md` (settings UI imports this). Keep `docs/YEARLY_UPDATE.md` in sync (verify-seed checks both).

## Hard rules (summary)

1. **画面に作り手の言葉を出さない** — いちばん多い失敗。詳細は `AGENTS.md` の §Screen language。
   既定／一次／賞品／M0／Lean／invent／捏造／シード／「〜は書かない」／「取りこぼし：」／
   R8.4.1 のような元号略号／HUD・Ridge・Lattice などの英字コード名は**すべて画面に出さない**。
2. **円を捏造しない** — 公式の案内か、二人が入力した記録だけ。
3. **結婚新生活支援を「もらえる額」にしない** — 広島市は未実施。30万/60万をゲーム化しない。
4. **お祝い演出を戻さない** — 寿・手紙ギフトの類は復活させない。
5. **秘密情報をコミットしない** — xAI キー、GitHub PAT、`.env*.local`。
6. **内容を減らさない** — SoT は `src/data/*`。マージは **ABSORB**（`why`/`miss`/`window`/`pad`/FAQ/
   deadlines/exclude/home/phases/money_*/practices/talks/agreements/refs）。UI の作り替えでデータを落とさない。
7. **増やしたら下限も上げる** — `scripts/verify-seed.mjs` の数字を一緒に更新する。
   上げ忘れると、次に誰かが減らしても気づけない。
8. 完了前に **`npm run verify:seed`**（47項目）を走らせ、カウント表を貼る。

Full minima → `CONTENT_GUARD.md` / HANDOFF HARD RULES（176 tasks, FAQ ≥820 ほか）。

> **Do not look for `/workspace/marriage-research/`.** That path is Kenji’s local Grok Bot archive only and is **not** in this repo. If you only have this GitHub clone, edit `src/data` and keep `verify:seed` green.

## Current tab IA（2026-09-11 現在・7タブ）

Default tab = **デスク**。**ルール: タブの名前と中身を一致させる。**

| id | Label (short) | Contents |
|----|---------------|----------|
| `desk` | デスク | `MarriageDesk`（和紙の面・数字は これまで/婚姻日/次の期限 の3つ）+ **金額グリッド4枚**（記念から移動）+ `HomeInsightPanels`（大きな数字 / 次のアクション / 思い込み / 対象外 / 会話のきっかけ）|
| `journey` | ロードマップ（マップ） | 章ナビ + `StampIllustBoard` + CHECK FIRST + マイルストーンのみ |
| `deadlines` | 期限と時期（期限） | `InstitutionalDeadlines` + 個人予定/ICS + **`PhasesPanel`（9時期・48出来事）** ← 旧「時期」タブを統合 |
| `memories` | 記念手帳（記念） | 記念メモ + 月次ふたり会議（**金額グリッドはデスクへ移動済み**）|
| `pair` | ふたりの練習帳（ふたり） | `PairWorkbook` — 行動52 / 会話16 / 合意18 / 根拠18。合意と行動は端末に保存 |
| `find` | 制度を探す（探す） | 検索のみ |
| `settings` | ふたりの設定（設定） | プロフィール / Gist / Grok / 毎年更新メモ / リセット |

**2026-09-10 に消したもの（戻さない）:** 旧「時期」タブ（期限へ統合）、デスクの Amity 吹き出し、
デスクの「友人への渡し方」カード、`home.json` の `headline`、項目詳細の一文字バッジ（`track` の表示）、
デスクの「得した記録」「損回避・節約」（下の金額グリッドと重複していたため）。

### Amity（混同しない）

- **Amityちゃんにきく** = 全タブ右下の **FAB チャットのみ**。
- デスクタブの Amity 吹き出しは **2026-09-10 に削除**。戻さない。
- `MarriageDesk`（デスク上部のパネル）自体は**残っている**。ただしダークな "command HUD" ではなく、
  ほかのタブと同じ**和紙・明朝**（`.desk-washi`）。秒針時計・LIVE・英字コード名も削除済み。
  過去、「チャットだけ」を「パネルごと削除」と読み違えた事故がある（HISTORY 参照）。
  いま逆に、**ダークHUDに戻すのも間違い**。

Stamps: 絵が主役。縁のパッド **MAX=6**、溢れたら同じ絵でカード分割。横スクロールのギャラリー不可。
「一覧」への逃げ道を作らない。ラベルは `tasks[].pad`（3〜8字）を使い、CSSは2行折り返し。

### 式なし前提（タスクを消さない）
- 友人の初期プロフィールは **式なし**（`ceremony==='no'`）。
- そのとき `isCeremonyTask`（eligibility/need ceremony / id `W*`）は **UI から隠れるだけ**で
  **`tasks.json` には残す**。式ありに切り替えたら再表示されること。掃除のつもりで W* を消さない。
  スタンプ板に空の挙式カードを出さない。
- **英語の "Lean" は社内語。画面には出さない**（2026-09-10 に画面から一掃した）。
- 初回は `OnboardingSheet`。PWA 更新は `PwaUpdateBanner`。
- Amity の端末内回答（`answerDeskQuery` / `desk-chat.ts`）も同じ `profile` / `inScope` を通す。

## 2026-09-10/11 に増えたもの（消さない）

| 何 | どこ | 注意 |
|---|---|---|
| `tasks[].pad` | `src/data/tasks.json` 全176件 | 絵の上の短縮名。無いと機械的に切れて読めなくなる |
| `tasks[].review` | 12件 | 毎年見直す民間サービスの最終確認日。ビルドが15か月超を警告（止めない）|
| `practices/talks/agreements/refs.json` | `src/data/` | 「ふたり」タブ。`refs[].kind`（研究/提案/公的/書籍）と `limits` を消さない |
| 性犯罪・性暴力（R15）・DV相談（R16）の窓口 | `refs.json` | **外すと verify が落ちる。** 話し合いを無理に進めない但し書きも残す |
| `bookSchema.practices` / `.agreements` | `src/lib/model.ts` | **既定値つきのまま。必須にすると既存の手帳が読めなくなる** |
| ロボット避けで403の目印 | `sources[].note`（Amazon・ベビーザらス・三井住友）と `refs[].note`（SAGE・PubMed）| **別ファイル**。リンク切れと誤判定しない |

## Famous past mistakes (do not repeat)

1. **ChatGPT notebook migration thinned seed** (`fa0633d` era): dropped `why` / `miss` / `window` / FAQ (and later gaps on deadlines/exclude/home/phases/money). Restored into **`src/data`** from an external archive (`stamps-v2` → tasks, plus data JSON) via `3aeba3d` / `e9d5bae` / `dbec0ac`. **Always ABSORB; never replace-thin.** Do not hunt for that archive on GitHub — the restored files already live under `src/data`.  
2. **Over-reading「チャットだけ」** (`fb9de10`): Amity をチャット専用にしたついでに
   デスクのパネルごと消した。Kenji の意図は Amity=チャットだけで、**パネルの廃止ではない**。
   `07944e0` で復元し、`8b4427a` で専用の **デスク** タブへ。
3. **作り手のメモが画面に出ていた**（2026-09-10 に発見）: 「現金は書かない」「invent」「賞品」
   「M0」「取りこぼし：」などが友人の画面に表示されていた。データ290箇所＋画面文言を掃除。
   **生成時のメモと、読み手への文を必ず分ける。**
4. **内容を増やしたのに下限を上げ忘れる**: `verify-seed` は「減っていないか」を見る仕組み。
   137→176 に増やしたら下限も 176 にする。上げ忘れると次に減っても気づけない。

## Deploy (docs live on `main`)

App Pages publish is separate from continuity docs:

```bash
cd /path/to/kekkon-roadmap   # this repo
npm ci
npm run build                # MUST use npm (runs verify:seed via prebuild). Do **not** call `vite build` alone.
npx gh-pages -d dist         # ensure dist has .nojekyll
```

- Continuity markdown (`docs/*`, README) → commit + **push `origin main` only**.  
- Rebuild + `gh-pages` **only when the shipped app / asset paths change** — not for docs-only edits.  
- GitHub Actions workflow push often fails (OAuth missing `workflow` scope) → manual `gh-pages` is fine.
- **After app deploy:** open Pages, confirm `index.html`’s `assets/index-*.js` returns **HTTP 200** (CDN can briefly serve old HTML while the new hashed JS is missing → blank/old app). Phone: hard reload or tap PWA「更新があります」.

## External (not in-repo)

| Item | Where |
|------|--------|
| Sync Gist ID | `4962ce100b42c446015825282f28b774` (`futari-miraicho.json`) — PAT stays in device localStorage |
| Grok credits / spend limits | **https://console.x.ai/** — app cannot buy credits; show JP message + link |
| Grok key | settings **localStorage** override, else obfuscated `amity-grok-bundle.ts` decode at runtime — **never** Vite `VITE_*` env, never plaintext `xai-` in git/Pages |
| Historical research archive | Kenji-local `marriage-research/app-seed` (Grok Bot machine only). **Not cloneable from this repo.** Shipped SoT is `src/data`. |
| Cursor Cloud Agents | May be **plan-locked**. If launch fails, edit on a normal clone / local tooling — do not block on Cloud Agents. |

## Quick verify

```bash
npm run verify:seed
npm run build
```

Then open Pages on phone with hard reload if you deployed the app.
