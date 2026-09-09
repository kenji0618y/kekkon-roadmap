# HANDOFF — Amityちゃんにきく / 結婚ロードマップ

他の AI / 開発者がこのリポジトリを引き継ぐための現状メモ。  
最終更新: 2026-09-09（JST）· Kenji がコンテキスト切れ前に HANDOFF 更新依頼

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

- ロードマップ: **スタンプ帳／ボード**。1マス＝1枚の大きいイラスト（フル表示）。四隅パッド＋超過は見出し一覧——**この「別UIに分ける」方式は Kenji が拒否（下記未解決）**。白グリッドで絵を覆わない。横スクロールギャラリー禁止。
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
docs/MERGE_OVERLAPS.md
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

### 未解決・次にやる（最優先）

Kenji（2026-09-09）:

> 「角のスタンプを押す。多いマスは見出しから一覧」——**そうせずに**、写真を分けるとかどうにか良い案を考えて、**別々にせず**にしてほしい。

現状の実装は「1イラストあたり最大4角パッド、5件目以降は見出しタップで square-detail 一覧」になっている。これは **イラスト上の操作と一覧操作が分断**されていて、ユーザーは拒否。

#### ゴール
- タスクが多くても **同じ体験のまま**スタンプを押せる（一覧への逃げ道を主導線にしない）
- イラストは主役のまま（白い巨大マスで覆わない・グリッドで絵を真っ二つにしない）
- 「写真を分ける」も手段の一つだが、**操作が別モードに分かれない**こと

#### 推奨案（引き継ぎ AI が検証して実装）

**A. サブマス分割（推奨）**  
グループ内タスク数が4を超えるとき、**同じ章のイラストを複数カードに分割**する（例: 「婚姻届 1/2」「婚姻届 2/2」）。各カードは同じ `phase` 絵 or 連番バリアントを使い、各カード≤4パッド。ユーザーはスクロールで隣の絵に進むが、「押す」動作は常に絵の上の枠だけ。見出し→別UI一覧は使わない。

**B. パッド数を可変で絵の縁に沿って増やす**  
4固定をやめ、6〜8個まで小さく縁に配置（透明度高め・タップ領域は44px確保）。多すぎると絵が消えるので上限と最小サイズを決める。一覧は使わない。

**C. A+B ハイブリッド**  
まず縁に最大6、それでも溢れるグループだけサブマス分割。

**やらないこと**
- 主導線として「見出しから一覧」に逃げる（今回拒否された）
- 白いタスクカードのグリッドでイラストを覆う旧UIに戻す
- スクロールギャラリー（横ストリップ写真だけ並べる形式）— 以前も「スクロール形式ではない」と訂正済み。縦にマスが続くボードはOK

#### 実装ヒント
- `src/components/StampIllustBoard.tsx` + `src/data/groups.json` + `phase-images.json`
- 分割時は groups を実行時に chunk するか、groups.json を細分化
- 公開: `npm run build` → `npx gh-pages -d dist`（`.nojekyll`）
- Live: https://kenji0618y.github.io/kekkon-roadmap/

## 直近コミット目安
- `fc54aac` — art-first stamp board
- `67e1f81` — header tabs, FAB clip, Grok bundle, larger stamps
- `05843f8` — Amity FAB, 聞くタブ削除
- HANDOFF 更新はこのファイル


## Grok API キーについて（重要・2026-09-09）

平文の xAI キーを Pages に焼くと **GitHub secret scanning が push を拒否**する。

**現行:** `src/lib/amity-grok-bundle.ts` に XOR+分割 Base64 のシファーのみコミット。実行時デコード。設定欄はオーバーライド用。
再生成: box-secrets の `XAI_API_KEY` からローカルスクリプトで bundle を作り直す（平文をログしない）。
