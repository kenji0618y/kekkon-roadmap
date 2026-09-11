# AGENTS.md — stop. Read this before editing.

Auto-entry for **Grok**, **ChatGPT/Codex**, **Claude**, Cursor, Copilot and any other agent.

You are in **kenji0618y/kekkon-roadmap**（Amityちゃんにきく / 結婚ロードマップ PWA）.

**いまの状態（自動生成）**

<!-- ここは `npm run sync:docs` が書き込みます。手で直さないでください。 -->
<!-- STATE:TABLE -->
| いまの状態 | 数 |
|---|---|
| 項目（tasks） | **176** |
| まとまり（groups） | 33 |
| FAQ | 829組 |
| 出典（sources） | 117件 |
| ふたりの練習帳 | 行動52 / 会話16 / 合意18 / 根拠18 |
| 時期・出来事 | 9区切り / 48件 |
| 毎年見直す項目 | 12件 |
| タブ | 6（デスク / マップ / 期限 / ふたり / 探す / 設定） |
| verify-seed | 52項目 |
| データ確認日 | 2026-09-10 |
<!-- /STATE -->

## Mandatory before any code change

1. Read **`docs/AI_START_HERE.md`** fully (then HANDOFF → CONTENT_GUARD → HISTORY).
2. Do **not** ask Kenji to re-explain product history.
3. Source of truth = **`src/data/*`** in this repo. `/workspace/marriage-research` is **not** in GitHub — never require it.
4. **Never thin content.** `why`/`miss`/`window`/`pad`/FAQ/deadlines/exclude/home/phases/money_*/
   practices/talks/agreements/refs. ABSORB only. If you add content, **raise the floors in
   `scripts/verify-seed.mjs` too** — otherwise the next person can delete it unnoticed.
5. **Nothing written for the builder may reach the screen.** This is the rule that has been
   broken the most (see §Screen language). A friend reads this app, not a developer.
6. 式なし前提（`ceremony==='no'`）は W* タスクを **UI から隠すだけ**。`tasks.json` から**消さない**。
   （英語の "Lean" は社内語。**画面には出さない**。）
7. Amity は**右下の丸ボタン（チャット）だけ**。デスクタブに Amity の吹き出しは**置かない**（2026-09-10 に削除）。
8. 円は捏造しない。結婚新生活支援を「もらえる額」にしない。お祝い演出は復活させない。秘密情報はコミットしない。
9. 完了前に **`npm run handoff`**（= sync:docs + verify:seed）。緑にならなければ終わりではない。
   ビルドは **`npm run build`**（`vite build` 単体は不可）。
10. 公開は **自動**。`main` に push すれば GitHub Actions（`.github/workflows/ci.yml`）が
    検査→ビルド→`gh-pages` まで行う。手でデプロイしない。結果は Actions タブで確認。
11. Grok キーは localStorage か `amity-grok-bundle.ts` のみ。**`VITE_*` は使わない**。残高: https://console.x.ai/

## 終わる前に（全AI共通・コマンドは1つ）

```bash
npm run handoff        # = sync:docs（数字を書き直す） + verify:seed（検査）
```

- 検査が緑にならないうちは終わりではありません。
- **`sync:docs` が書き換えたドキュメントも一緒にコミットしてください。**
- 画面から何かを消した／増やした／方針を変えたら、`docs/DECISIONS.md` に**1行足す**。
- `main` に push すれば、GitHub Actions が検査→ビルド→公開まで自動で行います（手動デプロイ不要）。

くわしくは **`docs/HOW_TO_FINISH.md`**。「なぜそう決めたか」は **`docs/DECISIONS.md`**。

## Screen language（いちばん破られてきた規則）

生成時のメモ・作り手あての指示・内部の記号が、そのまま友人の画面に出ていた。2026-09-10 に
データ 290 箇所 + 画面文言を掃除した。**戻さないこと。**

| 出してはいけない | 画面での言い方 |
|---|---|
| 既定 / 一次 / 賞品 / M0 / Lean / カスケード / invent / 捏造 / シード / 標報 / ジョブロック | この前提 / 公式情報 / もらえる額 / 婚姻日 / （出さない）/ 名義変更の連鎖 / 推測で書かない / — / 収録データ / 標準報酬 / — |
| 「〜は書かない」「〜するな」「見ろ」「落とすな」 | 読み手への文にする（「〜は出せません」「〜しないほうが得です」） |
| 「取りこぼし：」「窓：」「手順はスタンプの steps」 | 「見落としやすいところ：」「いつ：」「この項目の『やること』」 |
| R8.4.1 / R9.1 などの元号略号、OSS、OTC、HUD、Ridge/Lattice/Chord | 2026年4月1日 / オンライン申請 / 市販薬 / （日本語にする） |
| 内部の項目番号（A必1 など）を本文や一覧に出す | 出さない（リンクで飛ばす） |

判定基準はひとつ。**その文を友人が読んで意味が通るか。** 通らなければ書き直す。

## Data shapes added on 2026-09-10/11（消さない）

- `tasks[].pad` — 絵の上に出る短縮名（3〜8字・全176件必須）。無いとラベルが機械的に切れる。
- `tasks[].review` — `YYYY-MM-DD`。**毎年見直す民間サービス**の最終確認日（12件）。
  `npm run build` が15か月を過ぎた項目を警告する（ビルドは止めない）。手順は `docs/YEARLY_UPDATE.md`。
- `src/data/practices.json`(52) / `talks.json`(16) / `agreements.json`(18) / `refs.json`(18)
  — 「ふたり」タブ。**研究／専門家の提案／公的機関／書籍の区別（`refs[].kind`）と
  `limits`（限界）を消さない。** 性犯罪・性暴力（R15）と DV相談（R16）の窓口を外すと verify が落ちる。
- `bookSchema.practices` / `.agreements` — **既定値つき（`.catch({}).default({})`）。必須にしない。**
  必須にすると、すでに使っている手帳が読めなくなる。
- **ロボット避けで403になるサイト**（リンク切れと誤判定しない）。note に明記してある:
  `sources.json` → Amazon（2件）・ベビーザらス（2件）・三井住友カード（2件）／
  `refs.json` → SAGE（R01・R08・R09・R10・R14）・PubMed（R11）。**別ファイル・別フィールド**なので混ぜない。

## Entry map

| Audience | Open first |
|----------|------------|
| Any agent | `AGENTS.md`（this file） → `docs/AI_START_HERE.md` |
| Claude | `CLAUDE.md` → same |
| ChatGPT / Codex / Copilot | `CHATGPT.md` + `.github/copilot-instructions.md` → same |
| Cursor | `.cursor/rules/kekkon-roadmap.mdc` → same |
| Humans | `README.md` |

Kenji does **not** need to remind you. If you opened this repo, these rules already apply.
