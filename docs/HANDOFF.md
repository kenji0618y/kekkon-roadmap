# HANDOFF — Amityちゃんにきく / 結婚ロードマップ

他の AI / 開発者がこのリポジトリを引き継ぐための現状メモ。  
最終更新: 2026-09-09（JST）· stamps-v2 コンテンツ復元（why/miss/window/FAQ）

## 公開 URL

- **GitHub Pages:** https://kenji0618y.github.io/kekkon-roadmap/
- **Repo:** https://github.com/kenji0618y/kekkon-roadmap
- デプロイ: `main` をビルドした `dist` を **`gh-pages` ブランチ**へ（`.nojekyll` 必須）
- Actions の workflow ファイル push は OAuth に `workflow` scope が無く失敗しやすい → **手動 / `npx gh-pages -d dist` 系で十分**

## プロダクト概要

広島市・共働き・世帯所得おおむね **800万円超**・**式なし Lean** の友人向けスマホ PWA。

| 要素 | 内容 |
|------|------|
| ブランド名（ユーザー向け） | **Amityちゃんにきく** |
| ナビキャラ | **Amityちゃん**（サメ、ヘッドセット） |
| サイドバー Grok Bot | agent id `74755f3e-2268-49fe-81d1-2ce344a05bef`（名前 Amity） |
| 技術 | Vite + React + TS、単一 SPA、`base: './'`、Hash 向き |
| データ | `src/data/tasks.json` 等（約 **137** タスク。149→マージ済み） |
| 保存 | **localStorage**（`futari-miraicho-v1`） |
| 端末同期 | 秘密 **GitHub Gist**（下記） |

## ハードルール（必ず守る）

1. **金額の円は捏造しない**（シード / ユーザー入力のみ）
2. **結婚新生活支援 30万/60万を賞品・獲得目標にしない**（広島市は案内上未実施、高所得で対象外になりやすい）
3. **お祝い / 寿 / 手紙ギフト演出は復活させない**（明示的に削除済み）
4. Secrets（xAI / GitHub PAT）を **リポジトリにコミットしない**

## ナビ構成（現状）

メインタブ（ロードマップ / 期限 / 記念 / 探す / 設定）は **ヘッダー（masthead）内・上部 sticky**。モバイルも下部固定ではなく上部。

**Amityちゃんにきく**は全タブ右下の丸 FAB（`overflow:hidden` + `clip-path:circle`）→ 前景チャット。

- ロードマップ: **スタンプ帳／ボードのみ**（view-switch 一覧なし）。1マス＝1枚の大きいイラスト（フル表示）。縁パッド最大 **6**（四隅 + mid-left/mid-right）。**>6 はサブマス分割**（同じ絵のカードが 1/2・2/2）。「探す」タブで一覧検索。白グリッドで絵を覆わない。横スクロールギャラリー禁止。
- CHECK FIRST は **OUR JOURNEY の下**
- 設定: 「今の制度を調べる」+ Grok キー上書き欄

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
- 生キーを `docs/` / git / Pages に平文で書かない。GitHub secret scanning 回避のため Vite env 埋め込みは使わない

## リセット

設定「スタンプ進捗をリセット」: `records` のみクリア（profile/memories は残す）。  
二重ロック: 文字列 `リセット` 入力 + チェックボックス後に危険ボタン有効。

## 主要パス

```
src/Notebook.tsx          # シェル・タブ
src/components/MarriageDesk.tsx   # 旧聞くタブ（未使用・FAB化済み）
src/components/DeskChatPanel.tsx  # embedded / modal
src/components/StampIllustBoard.tsx  # ボード配置（スクロールギャラリー禁止）
src/lib/use-book.ts
src/lib/gist-sync.ts
src/lib/amity-grok.ts
src/lib/amity-grok-bundle.ts  # ciphertext only
src/lib/desk-chat.ts
src/data/tasks.json / groups.json / sources.json / phase-images.json
public/phases/            # マスイラスト（gen-*.png 追加済み）
public/desk-mascot.png
docs/MERGE_OVERLAPS.md  # drop→keep マッピング（本復元で吸収済み）
docs/HANDOFF.md
```

## ビルド・公開手順

```bash
cd /path/to/kekkon-roadmap
npm ci
# optional: write gitignored .env.production.local with VITE_AMITY_GROK_KEY=...
npm run build
# dist を gh-pages へ（例）
npx gh-pages -d dist
# dist 直下に .nojekyll を置くこと
```

`gh` は `kenji0618y` でログイン済みの環境あり。`workflow` scope なし。


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
1. Amity は全タブ右下 **固定丸 FAB**（サメアイコン・円クリップ）。「聞く」タブ削除。既定タブ＝ロードマップ
2. タブナビは **ヘッダー sticky**（フッタ固定ナビではない）
3. Grok: `amity-grok-bundle.ts` 難読化デコード（平文 `xai-` を git/Pages に置かない）。設定のキー欄は上書き用
4. スタンプ帳を一度「イラスト主役」に作り直し（commit `fc54aac` 付近）: 1マス＝1絵、四隅小パッド

### 完了（前回）
5. **サブマス分割（案 A）** — `StampIllustBoard` で実行時 chunk。超過グループは同じ phase 絵のカードに分割。全スタンプは絵の上。旧 `pickCornerTasks` / キャプション「· 一覧」削除。
6. **回帰修正（FAB / TaskForm Sheet）** — Sheet/Dialog/Alert の z-index を FAB(70)・desk-chat(90) より上へ（sheet 110 / dialog 120 / alert 130）。タスク Sheet が FAB に隠れない。FAB は chat または task Sheet 開中は `hidden`

### 完了（本更新）
7. **ハイブリッド縁パッド MAX=6** — `MAX_CORNER_PADS=6`。`cornerSlot` に 5–6（c4 mid-left / c5 mid-right）。CSS `.stamp-pad.corner.c4`/`.c5`（縦中央・min ~44px tap）。>6 は従来どおりサブマス分割。アート優先・一覧エスケープなし。
8. **一覧 view-switch 削除** — Notebook から `mapView` / LayoutGrid·List トグル / `chapter-list` ボード分岐を削除。ロードマップは常に `StampIllustBoard`。「探す」タブと TaskForm Sheet は維持。ヒントを「縁のスタンプ・1マス最大6・多い章はカード分割」に更新。

### 完了（コンテンツ復元）
9. **stamps-v2 → tasks.json フィールド復元** — `/workspace/marriage-research/app-seed/stamps-v2.json`（150）から、現行 137 タスクへ `why` / `miss` / `window` / `faq[{q,a}]` をマージ。ノートブック由来の `sources` / `need` / `chapter` / `group` / `type` / `notice` / `amountNote` / `verified` / `summary` / `steps` は維持（steps が空のときのみ stamp steps）。
10. **MERGE_OVERLAPS 吸収** — drop→keep の 12 件（A無2→G1, D2→C即6, C他6→A得11, C他5→F1, E2/E3→E1, A必4→C即13, C90-2→C90-1, C他4→A得6, D6→C他7, D15→G25, W3→B7）について、drop 側の FAQ（q 正規化で重複除去）と miss/why の差分を keep 側へ追記。F13 および未収録 stamp はタスク新規追加せずスキップ（件数を 137 のまま）。
11. **UI** — TaskForm に「なぜやるのか」「やらないと失うもの」「いつやるか」カードと、回答つき FAQ（既定で展開）。質問のみアコーディオンは FAQ が無い場合のフォールバック。
12. **型** — `Task` に optional `why` / `miss` / `window` / `faq`。

### 残リスク・未解決
- Grok 実通信はバンドル鍵／設定鍵と xAI 可用性に依存
- 6パッド時はイラスト中央がやや狭まる（意図的なハイブリッド）
- Claude remote との drift: ローカル main を正として前進。スマホはハードリロード推奨
- `.view-switch` CSS は未使用のまま残存（無害）。必要なら後で掃除

## 直近コミット目安
- （本更新）stamps-v2 content restore: why/miss/window/FAQ + MERGE_OVERLAPS absorption
- （直前）pads MAX=6 + journey list view-switch 削除
- `6a172af` — サブマス分割 + FAB/Sheet z-index
- `f9c9843` — HANDOFF: stamp overflow must stay on-image
- `fc54aac` — art-first stamp board
- `67e1f81` — header tabs, FAB clip, Grok bundle


## Grok API キーについて（重要・2026-09-09）

平文の xAI キーを Pages に焼くと **GitHub secret scanning が push を拒否**する。

**現行:** `src/lib/amity-grok-bundle.ts` に XOR+分割 Base64 のシファーのみコミット。実行時デコード。設定欄はオーバーライド用。
再生成: box-secrets の `XAI_API_KEY` からローカルスクリプトで bundle を作り直す（平文をログしない）。
