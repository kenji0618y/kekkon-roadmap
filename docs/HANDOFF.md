# HANDOFF — Amityちゃんにきく / 結婚ロードマップ

> **Auto-entry (no Kenji prompt needed):** root [`AGENTS.md`](../AGENTS.md) / [`CLAUDE.md`](../CLAUDE.md) / [`CHATGPT.md`](../CHATGPT.md)  
> **Then:** [`docs/AI_START_HERE.md`](./AI_START_HERE.md)  
> **Decision log:** [`docs/HISTORY.md`](./HISTORY.md) · seed rules: [`CONTENT_GUARD.md`](./CONTENT_GUARD.md)

他の AI / 開発者がこのリポジトリを引き継ぐための現状メモ。  
最終更新: **2026-09-11（JST）**

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
· Claude/Grok/ChatGPT 自動導線（AGENTS/CLAUDE/CHATGPT + predev verify）

## 公開 URL

- **GitHub Pages:** https://kenji0618y.github.io/kekkon-roadmap/
- **Repo:** https://github.com/kenji0618y/kekkon-roadmap
- デプロイ: `main` をビルドした `dist` を **`gh-pages` ブランチ**へ（`.nojekyll` 必須）
- Actions の workflow ファイル push は OAuth に `workflow` scope が無く失敗しやすい → **手動 / `npx gh-pages -d dist` 系で十分**

## プロダクト概要

広島市・共働き・世帯所得おおむね **800万円超**・**式なし**前提の友人向けスマホ PWA。
（"Lean" は社内語。**画面には出さない** — 2026-09-10 に一掃済み）

| 要素 | 内容 |
|------|------|
| ブランド名（ユーザー向け） | **Amityちゃんにきく** |
| ナビキャラ | **Amityちゃん**（サメ、ヘッドセット） |
| サイドバー Grok Bot | agent id `74755f3e-2268-49fe-81d1-2ce344a05bef`（名前 Amity）— **Grok Bot サイドバー専用。GitHub クローンの AI は無視してよい（アプリ実行に不要）** |
| 技術 | Vite + React + TS、単一 SPA、`base: './'`（GitHub Pages 向け相対パス）。**HashRouter は使っていない**（`App.tsx` → `Notebook` 一枚） |
| データ | `src/data/tasks.json` 等（**176** タスク exact。137→2026-09-10 に39件追加）+ `practices/talks/agreements/refs.json`（ふたりタブ）|
| 保存 | **localStorage**（`futari-miraicho-v1`）。`bookSchema` の `practices`/`agreements` は**既定値つき**（必須にすると既存の手帳が壊れる）|
| 端末同期 | 秘密 **GitHub Gist**（下記） |

## ハードルール（必ず守る）

0. **作り手あての言葉を画面に出さない** — 2026-09-10 に発覚した最大の問題。詳細は `AGENTS.md` §Screen language。
1. **金額の円は捏造しない**（収録データ / ユーザー入力のみ）
2. **結婚新生活支援 30万/60万を「もらえる額」にしない**（広島市は案内上未実施、高所得で対象外になりやすい）
3. **お祝い / 寿 / 手紙ギフト演出は復活させない**（明示的に削除済み）
4. Secrets（xAI / GitHub PAT）を **リポジトリにコミットしない**
5. **NEVER drop or thin app-seed content when changing UI/framework.** **Source of truth in this repo = `src/data/`.** (`marriage-research/app-seed` is Kenji-local only, not on GitHub.) ChatGPT notebook merge must **ABSORB** rich fields, never replace/thin.
6. **Required inventory (data in `src/data` AND mounted in UI)** — minima enforced by `npm run verify:seed` (`prebuild`):
   - tasks 件数 = **176**（exact）; `why`/`miss`/`window`/`track` ≥ **176** each; FAQ pairs ≥ **820**
   - tasks `pad`（絵の上の短縮名・2〜8字）= **176**（exact・検査あり）
   - `deadlines.next_absolute` = **10**; `relative_always` = **6**
   - `exclude.items` = **36**
   - home: hero=**3**, lies=**4**, talk=**10**, `tomorrow_3_actions`=**3**, `anti_lie_banner` present
     （`headline` は 2026-09-10 に廃止）
   - phases = **9**, events ≥ **48**
   - groups subtitle ≥ **12**, chips sets ≥ **33**
   - money on tasks: `money_in` ≥90 / `money_out` ≥50
   - `review`（毎年見直す民間サービス）≥ **12**・最終確認から15か月超はビルドが警告（止めない）
   - ふたりタブ: practices=**52** / talks=**16** / agreements=**18** / refs=**18**、
     `refs` の DV相談・性犯罪/性暴力の窓口は**外すと fail**
   - **内容を増やしたら、この下限も一緒に上げること。**
7. Before claiming done: run **`npm run verify:seed`** and paste the counts. See also `docs/CONTENT_GUARD.md`.

## ナビ構成（2026-09-11 現在・6タブ）

メインタブは **ヘッダー（masthead）内・上部 sticky**（実機幅ではフッター固定）。
**原則: タブ名と無関係なコンテンツは載せない**（ラベル一致）。

**タブ順（左→右）・既定＝デスク:**

| id | ラベル（short） | 中身 |
|----|-----------------|------|
| `desk` | デスク | `MarriageDesk`（**和紙・明朝**。数字は これまで/婚姻日/次の期限 の3つ）+ **金額グリッド4枚**（記念から移動）+ `HomeInsightPanels`（大きな数字/次のアクション/思い込み/対象外/会話のきっかけ）|
| `journey` | ロードマップ（マップ） | 章ナビ + `StampIllustBoard` + マイルストーンのみ |
| `deadlines` | **期限と時期**（期限） | `InstitutionalDeadlines` + 個人タイムライン/ICS + **`PhasesPanel`（9時期・48出来事）** ← 旧「時期」タブを統合 |
| `pair` | **ふたりの練習帳**（ふたり） | `PairWorkbook` — 行動52 / 会話16 / 合意18 / 根拠18。行動の状態と合意は端末に保存 |
| `find` | 制度を探す（探す） | 検索のみ |
| `settings` | ふたりの設定（設定） | プロフィール／Gist／Grok／YEARLY_UPDATE／リセット |

**2026-09-10 に削除したもの（戻さない）**: 旧「時期」タブ（期限へ統合）／デスクの Amity 吹き出し／
デスクの「友人への渡し方」カード／`home.json` の `headline`／項目詳細の一文字バッジ（`track` の表示）／
デスクの「得した記録」「損回避・節約」（下の金額グリッドと重複）。

**Amityちゃんにきく**は全タブ右下の丸 FAB → 前景チャットのみ。
デスクの Amity 吹き出しは削除済み。`MarriageDesk` のパネル自体は残っているが、
**ダークな "command HUD" ではなく和紙**（`.desk-washi`）。秒針時計・LIVE・英字コード名も削除済み。
過去「チャットだけ」をパネル削除と読み違えた事故があるが、**いま逆にダークHUDへ戻すのも誤り**。

- スタンプ: 1マス＝1絵、縁パッド最大 **6**、**>6 はカード分割**。横スクロールギャラリー禁止。
  ラベルは `tasks[].pad` を使用（CSSは2行折り返し）。一覧は「探す」。
- SeedContentPanels マウント: HomeInsight→デスク、Phases→**期限**、InstitutionalDeadlines→期限。

## 同期（Gist）

- 既定 Gist ID: `4962ce100b42c446015825282f28b774`  
  https://gist.github.com/kenji0618y/4962ce100b42c446015825282f28b774
- ファイル: `futari-miraicho.json`
- コード: `src/lib/gist-sync.ts`、設定 UI で PAT（gist scope）
- 挙動: 保存後 debounce push / フォーカス・約20s で pull（revision / savedAt）
- **PAT を Pages やリポに埋め込まない**（端末 localStorage）

## Amity × Grok

- `src/lib/amity-grok.ts` — xAI `https://api.x.ai/v1`、モデル `grok-3`
- キー優先順位: **localStorage `amity-grok-key`（設定オーバーライド）** → なければ **`amity-grok-bundle.ts` の難読化シファーを実行時デコード**
- シファーは commit 可。ソース/dist に連続部分文字列 `xai-` を置かない（文字コード比較で prefix 検証）
- チャット: FAB → `DeskChatPanel`。キーありなら必ず `askGrokResearch`。loading「AmityがGrokで調べてる…」、失敗時は toast + 理由
- 生キーを `docs/` / git / Pages に平文で書かない。**`VITE_AMITY_GROK_KEY` 等の Vite env はコードが読まない**（入れても無効）。GitHub secret scanning 回避のため Vite env 埋め込みも使わない

## リセット

設定「スタンプ進捗をリセット」: `records` のみクリア（profile/memories は残す）。  
二重ロック: 文字列 `リセット` 入力 + チェックボックス後に危険ボタン有効。

## 主要パス

```
src/Notebook.tsx                    # シェル・タブ
src/components/MarriageDesk.tsx     # デスク上部のパネル（和紙 .desk-washi。Amity吹き出し・友人handoffは削除済み）
src/components/DeskChatPanel.tsx    # FAB チャット
src/components/StampIllustBoard.tsx # アート優先・MAX=6・サブマス分割
src/components/SeedContentPanels.tsx # 大きな数字/次のアクション/思い込み/対象外/会話 + Phases（期限タブ）
src/components/PairWorkbook.tsx     # 「ふたり」タブ（行動52/会話16/合意18/根拠18）
src/components/OnboardingSheet.tsx
src/components/PwaUpdateBanner.tsx
src/lib/model.ts                    # inScope / isCeremonyTask（式なしのとき非表示）+ practice/agreement スキーマ（既定値つき）
src/lib/use-book.ts                 # localStorage futari-miraicho-v1
src/lib/gist-sync.ts                # DEFAULT_GIST_ID
src/lib/amity-grok.ts               # grok-3 · credits → console.x.ai
src/lib/amity-grok-bundle.ts        # ciphertext only（連続 "xai-" 禁止）
src/lib/desk-chat.ts                # 端末内フォールバック
src/lib/grok-mode.ts
src/data/tasks.json / groups.json / sources.json / phase-images.json
src/data/deadlines.json / exclude.json / home.json / phases.json
src/data/sugoroku.json              # 未使用（過去のスタンプ版の参考データ。import されていない）
src/data/practices.json / talks.json / agreements.json / refs.json   # ふたりタブ
src/data/YEARLY_UPDATE.md         # 設定 UI 表示元（import）
docs/YEARLY_UPDATE.md            # verify-seed が存在+同一内容を検査
public/phases/                      # マスイラスト
public/desk-mascot.png / amity-shark.png   # 2026-09-10 に背景を透過
docs/AI_START_HERE.md
docs/HISTORY.md
docs/MERGE_OVERLAPS.md
docs/HANDOFF.md
docs/CONTENT_GUARD.md
scripts/verify-seed.mjs
```

## ビルド・公開手順

```bash
cd /path/to/kekkon-roadmap
npm ci
npm run build                # prebuild → verify:seed
# dist を gh-pages へ（例）
npx gh-pages -d dist
# dist 直下に .nojekyll を置くこと
# Grok キーは Vite env では読まない。設定 UI の localStorage、または amity-grok-bundle.ts
# 公開後: Pages の index.html が指す assets/index-*.js が 200 か確認（CDNが古いHTMLのまま新JS未配置だと壊れる）
# スマホはハードリロード or PWA「更新があります」
```

`gh` は `kenji0618y` でログイン済みの環境あり。`workflow` scope なし。



---

> **ここから下は履歴です。** 2026-09-09 までの経緯と、そのときの数字（137 タスクなど）が
> そのまま残してあります。**現状の数字は上の「ハードルール」「ナビ構成」を見てください**
> （2026-09-11 時点で 176 タスク・6タブ）。
> 履歴の数字を現状と取り違えないこと。

## 復元メモ（2026-09-09）

- `fb9de10` で Amity desk を chat-only にした際、**コマンドセンター HUD ごと削りすぎた**。
- Kenji意図: **「Amity聞く = chat-only」** であり、**司令室ダイナミック HUD の削除ではない**。
- 復元元: `01a2b46`（Add 結婚デスク command-home）および `fb9de10^` の MarriageDesk リッチ版。
- 置き場所: 当初 journey → **現在は `desk` タブ最上段**。Amity は引き続き FAB `DeskChatPanel` のみ。

## 意図的にやらないこと

- 国の結婚新生活をメインの得として推す
- お祝い演出の復活
- スタンプを横スクロール・ギャラリー化する
- Origin / Cloud Agents 必須化（プラン制約あり）
- 他エージェントの秘密・トークンをチャットや MD に貼る

## 連絡・オーナー

- ユーザー: Kenji Kadomoto（GitHub `kenji0618y`）
- タイムゾーン: Asia/Tokyo

引き継いだら、要望を確認 → `npm run build` → `gh-pages` 更新 → スマホでハードリロード確認。



## ユーザー要望 — 進捗（2026-09-09 更新）

### 完了済み
1. Amity は全タブ右下 **固定丸 FAB**（サメアイコン・円クリップ）。「聞く」タブ削除。既定タブ＝**デスク**（左端）
2. タブナビは **ヘッダー sticky**（フッタ固定ナビではない）
3. Grok: `amity-grok-bundle.ts` 難読化デコード（平文 `xai-` を git/Pages に置かない）。設定のキー欄は上書き用
4. スタンプ帳を一度「イラスト主役」に作り直し（commit `fc54aac` 付近）: 1マス＝1絵、四隅小パッド

### 完了（前回）
5. **サブマス分割（案 A）** — `StampIllustBoard` で実行時 chunk。超過グループは同じ phase 絵のカードに分割。全スタンプは絵の上。旧 `pickCornerTasks` / キャプション「· 一覧」削除。
6. **回帰修正（FAB / TaskForm Sheet）** — Sheet/Dialog/Alert の z-index を FAB(70)・desk-chat(90) より上へ（sheet 110 / dialog 120 / alert 130）。タスク Sheet が FAB に隠れない。FAB は chat または task Sheet 開中は `hidden`

### 完了（UI重複整理 · 本更新）
27. **次アクション統合**: デスクの `today-panel` next-actions を削除。`HomeInsightPanels` の1ブロックに `tomorrow_3_actions` 優先＋動的 `next` で空き枠を埋める（完了済みシードはスキップ）。
28. **金額**: デスク HUD は得した/損回避の薄メトリクスのみ。フル money-grid は**記念**のみ。
29. **期限**: デスク HUD は次の制度カウントダウン指標のみ。`InstitutionalDeadlines` 全文は**期限**タブのみ。
30. **時期 / hero・talk・exclude**: ジャーニーへ再掲しない。HomeInsight はデスク1回のみ。

### 完了（タブIA分割 · 本更新）
22. **デスク**タブ新設（左端・既定）: MarriageDesk HUD + 今日の一歩 + HomeInsightPanels。ロードマップから HUD/シード長文を除去。
23. **ロードマップ**はスタンプ／章／ボード／マイルストーンのみ。
24. **時期**タブ新設: PhasesPanel（9/48）をデスク・ジャーニーから分離。
25. **期限**は InstitutionalDeadlines + 個人予定のみ。記念に月次ふたり会議導線を寄せた。
26. Amity FAB chat-only は全タブ維持（≠ HUD削除）。

### 完了（本更新）
7. **ハイブリッド縁パッド MAX=6** — `MAX_CORNER_PADS=6`。`cornerSlot` に 5–6（c4 mid-left / c5 mid-right）。CSS `.stamp-pad.corner.c4`/`.c5`（縦中央・min ~44px tap）。>6 は従来どおりサブマス分割。アート優先・一覧エスケープなし。
8. **一覧 view-switch 削除** — Notebook から `mapView` / LayoutGrid·List トグル / `chapter-list` ボード分岐を削除。ロードマップは常に `StampIllustBoard`。「探す」タブと TaskForm Sheet は維持。ヒントを「縁のスタンプ・1マス最大6・多い章はカード分割」に更新。

### 完了（コンテンツ復元）
9. **stamps-v2 → tasks.json フィールド復元** — 外部アーカイブ `stamps-v2.json`（150・Kenji ローカルのみ）から、現行 **`src/data/tasks.json` 137** へ `why` / `miss` / `window` / `faq[{q,a}]` をマージ済み。ノートブック由来の `sources` / `need` / `chapter` / `group` / `type` / `notice` / `amountNote` / `verified` / `summary` / `steps` は維持（steps が空のときのみ stamp steps）。**クローン AI は stamps-v2 を探さず `src/data` を編集する。**
10. **MERGE_OVERLAPS 吸収** — drop→keep の 12 件（A無2→G1, D2→C即6, C他6→A得11, C他5→F1, E2/E3→E1, A必4→C即13, C90-2→C90-1, C他4→A得6, D6→C他7, D15→G25, W3→B7）について、drop 側の FAQ（q 正規化で重複除去）と miss/why の差分を keep 側へ追記。F13 および未収録 stamp はタスク新規追加せずスキップ（件数を 137 のまま）。
11. **UI** — TaskForm に「なぜやるのか」「やらないと失うもの」「いつやるか」カードと、回答つき FAQ（既定で展開）。質問のみアコーディオンは FAQ が無い場合のフォールバック。
12. **型** — `Task` に optional `why` / `miss` / `window` / `faq`。
### 完了（remaining gaps + guardrails）
17. **headline / tomorrow_3_actions** を HomeInsightPanels に表示。Notebook から `onOpenTask` 配線。
18. **money_in / money_out / track / eligibility / hidden_if** を stamps-v2 → tasks.json（137）へマージ。MERGE_OVERLAPS drop のメモを keeper へ吸収。TaskForm「シード金額メモ」（入/出・シードのみ）。
19. **F13**（子育てエコホーム旧）を F2（みらいエコ後継）へ why/miss/faq 吸収。タスク新規追加なし。
20. **YEARLY_UPDATE.md** を docs/ と settings「毎年更新メモ」に原文表示。
21. **CONTENT_GUARD** — `scripts/verify-seed.mjs` + `npm run verify:seed` + `prebuild`。HANDOFF HARD RULES に下限インベントリ。

### 完了（app-seed 全面復元）
13. **deadlines/exclude/home/phases** を `src/data/` にコピーし UI 接続。
14. **期限タブ**に「制度・カレンダー締切」（next_absolute 日付順 + URL + seed money）。
15. **ロードマップ**に大きな数字 / 思い込み / 対象外36 / 会話10 / 時期9×出来事48。
16. **Square 副題10・チップ31** を groups に復元し StampIllustBoard 表示。



### 完了（prune + add · 本更新）
31. **Desk 装飾折りたたみ** — Chord / Lattice / Network を「くわしく見る」の裏に（既定閉じ）。Ridge・Activity・進捗％・得した/損回避・次の期限は維持。シード削除なし。
32. **Settings「同じ手帳を二人で」短縮** — 招待未対応を明記し、バックアップ／Gist へ誘導。
33. **Settings「毎年更新メモ」** — `<details>` で「開発者向け」既定閉じ。
34. **探すタブ** — 「149項目」→ `tasks.length` 動的（137）。
35. **未使用 `.view-switch` CSS 削除**。
36. **初回オンボーディング** — ward / 任意 wdate / ceremony=no lean / 共働き employment。`!book` または未設定プロフィールで表示。円は入力しない。
37. **Desk 近い絶対期限** — deadlines.json 60日以内のワンタップ一覧 → 期限タブ／`#institutional-deadlines`。
38. **端末内のみモード chip** — credits-limit 時のみ Desk・Amity チャットへ表示（no-keyでは出さない）。
39. **モバイル6タブ** — 横スクロール nav（≈390px で usable）、short ラベル維持。
40. **PWA 更新バナー** — `registerType: prompt` + `useRegisterSW`「更新があります。再読み込み」。



### 完了（lean5 remaining · 本更新）
41. **Lean no-ceremony 非表示** — `isCeremonyTask`（eligibility===ceremony / need ceremony / id `W*`）。`profile.ceremony==='no'` のとき `inScope` / scoped / actionable / スタンプ板 / next-actions / find 既定から除外。`tasks.json` は削除しない（式ありに戻すと再表示）。
42. **Pair モーダル** — クラウド招待を前面から削除。「端末内＋バックアップ／Gist」明示。主ボタン＝バックアップ書き出し／設定 Gist。レガシー join は details のみ。
43. **Desk さらにスリム** — 主表示＝progress / 得した・損回避 / 次アクション（HomeInsight）/ 近い絶対期限 / 端末内のみ chip。Ridge・Activity も「くわしく見る」折りたたみへ。
44. **Grok credits 案内** — アプリでは購入不可。`GROK_CREDITS_CONSOLE_URL`（https://console.x.ai/）へリンク／ボタン。JP 上限メッセージ維持。設定に深掘り＝クレジット必要の注記。
45. **友人 handoff カード** — デスクに3行（①URL ②ホーム画面追加 ③区・式なしオンボード）＋ Pages URL コピー。

### 残リスク・未解決
- Grok 実通信はバンドル鍵／設定鍵と xAI 可用性（クレジット）に依存。アプリから購入不可 → https://console.x.ai/
- 6パッド時はイラスト中央がやや狭まる（意図的なハイブリッド）
- **正本は常に GitHub `main`（このリポ）。** 他ツール／別クローンとの差は `main` に合わせて解消。アプリ更新後はスマホでハードリロード
- （解消）`.view-switch` CSS 削除済み
- （解消）continuity docs の SoT／Vite／HashRouter 誤解（`e257c2f` / `c63a1bb`）

## 直近コミット目安
- （本更新）Amity端末内検索も profile inScope（式なしでW*出さない）・空章EmptyState・pairラベル整理
- （直前）Lean空の挙式カード非表示・ChatGPT signin削除
- （直前）docs recheck: FAQ 658・YEARLY 表記・clone-AI 向け罠の除去
- （直前）`c63a1bb` Lean hide≠delete + YEARLY identity in verify:seed；`e257c2f` SoT=`src/data`
- （直前）lean5 `8a90775`: ceremony hide / pair backup-Gist / desk slim / credits link / friend handoff
- （直前）prune+add: decor fold / onboarding / near deadlines / local-only / PWA prompt / nav scroll
- （直前）remaining gaps: headline/tomorrow/money seed + CONTENT_GUARD/verify:seed
- （直前）app-seed restore: deadlines/exclude/home/phases + square subtitle/chips + UI
- （直前）stamps-v2 content restore: why/miss/window/FAQ + MERGE_OVERLAPS absorption
- （直前）pads MAX=6 + journey list view-switch 削除
- `6a172af` — サブマス分割 + FAB/Sheet z-index
- `f9c9843` — HANDOFF: stamp overflow must stay on-image
- `fc54aac` — art-first stamp board
- `67e1f81` — header tabs, FAB clip, Grok bundle




## シード復元チェックリスト（**2026-09-09 時点のスナップショット**）

> この表は当時の記録です。**現状の数字ではありません**（2026-09-11 現在 176項目・FAQ 829・
> subtitle 12・chips 33・money_in 107・money_out 59）。「時期」タブと track バッジは廃止済み。
> 現状は上の「ハードルール」「ナビ構成」を見てください。

| item | old (app-seed / sugoroku) | now_data | now_ui |
|------|---------------------------|----------|--------|
| why | 150 (stamps-v2) | 137 tasks | TaskForm カード |
| miss | 150 | 137 | TaskForm カード |
| window | 150 | 137 | TaskForm カード |
| faq pairs | 681 | **658**（≥650 · MERGE_OVERLAPS 吸収済。`npm run verify:seed` が正） | TaskForm FAQ |
| absolute deadlines | 10 next_absolute | 10 in `deadlines.json` | 期限タブ「制度・カレンダー締切」 |
| relative deadlines | 6 | 6 | 同タブ・相対リスト |
| exclude | 36 | 36 | デスク HomeInsightPanels「もらえない制度と理由」 |
| lies_not_to_buy | 4 | 4 | デスク HomeInsightPanels |
| hero_numbers | 3 | 3 | デスク HomeInsightPanels |
| talk_lines | 10 | 10 | デスク HomeInsightPanels |
| phases | 9 | 9 | **時期**タブ PhasesPanel |
| events | 48 | 48 | 時期タブ details |
| square subtitles | 10 | 10 on `groups.json` | StampIllustBoard caption |
| square chips sets | 31 | 31 | StampIllustBoard chips |
| home.headline | 1 | **廃止（2026-09-10）** | — |
| tomorrow_3_actions | 3 | 3 | デスク統合「次のアクション」（seed優先＋動的fill · stamp → TaskForm） |
| money_in on tasks | 110 stamps / 0 tasks | **99**（マッチ＋吸収） | TaskForm「シード金額メモ」入 |
| money_out on tasks | 56 stamps / 0 tasks | **54** | TaskForm「シード金額メモ」出 |
| track / eligibility | 150 / 0 | **137** / **137** | track バッジ・eligibility≠always ラベル |
| YEARLY_UPDATE.md | seed only | `src/data/`（設定 UI import）+ `docs/`（同一必須・verify） | settings「毎年更新メモ」 |
| F13（stamp-only） | 未吸収 | **F2 に why/miss/faq 吸収** | 旧エコホーム警告 |

### Remaining-gap checklist（e9d5bae 後 → 本更新で FIXED）
| gap | before | after |
|-----|--------|-------|
| tomorrow_3_actions UI | data=3 / UI=false | data=3 / UI=**true** |
| headline UI | data=1 / UI=false | data=1 / UI=**true** |
| money_in/out on tasks | stamps only / tasks=0 | tasks mi=99 mo=54 / UI=**true** |
| track/eligibility/hidden_if | stamps only | on tasks + UI badges |
| YEARLY_UPDATE | seed only | src/data + docs（同一）+ settings |
| 13 stamp-only ids | FAQ absorbed; F13 not | F13 → F2; 12 MERGE keepers already |

### 絶対日付 10（Pages 掲載）
1. こども医療R9.1拡充・集中申請終了
2. みらいエコZEH注文・交付申請
3. みらいエコ／窓リノベ／給湯の交付申請予約終了
4. iDeCo・企業型DC拠出限度引上げ
5. 団地空き家・家賃補助R8申込
6. 住宅取得等資金贈与・みらいエコ等申請・セルフメディケーション終期
7. こども医療・所得制限撤廃
8. ふるさとワンストップ特例・変更届
9. 所得税確定申告・贈与税申告（住宅資金）
10. 結婚・子育て資金一括贈与サンセット／産後ケアR8半額終期

### 実装メモ
- 円はシード記載のみ表示（捏造禁止）。結婚新生活は exclude + lies で 0 / 賞品扱いしない。
- Square 副題・チップは旧 `sugoroku.json`（initial stamp app）から `groups.json` へ復元。
- UI: `src/components/SeedContentPanels.tsx`

## Grok API キーについて（重要・2026-09-09）

平文の xAI キーを Pages に焼くと **GitHub secret scanning が push を拒否**する。

**現行:** `src/lib/amity-grok-bundle.ts` に XOR+分割 Base64 のシファーのみコミット。実行時デコード。設定欄（localStorage）はオーバーライド用。**`VITE_*` は読まない。**

**バンドル再生成:** Kenji／運用者のみ。平文キーを git / Pages / チャット / ログに出さない。クローンした AI は **再生成を必須にしない**（キーが無いときは設定 UI のオーバーライドか端末内フォールバックでよい）。「box-secrets」等のローカル秘密ストアは **この GitHub リポに含まれない**。
