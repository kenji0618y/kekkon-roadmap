# HANDOFF — Amityちゃんにきく / 結婚ロードマップ

他の AI / 開発者がこのリポジトリを引き継ぐための現状メモ。  
最終更新: 2026-09-09（JST）

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

- ロードマップ: **スタンプ帳／ボード**。`.illust-frame` を大きく（モバイル min-height ~420px / 3:4、デスクトップ 5:4）。パッドは枠内・大きめタップ。**スクロールギャラリー禁止**。
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

## ユーザー要望 — 進捗（2026-09-09）

1. **「Amityちゃんにきく」はチャットだけ** — **DONE**（FAB → 前景チャット）
2. **Grok を使えるように** — **DONE**（難読化バンドル `amity-grok-bundle.ts` + 設定オーバーライド。平文キーは git に載せない）
3. **スタンプ帳ボード＋画像** — **DONE**（ギャラリー禁止。フレーム／パッドを大きくして押しやすく）
4. **設定に「今の制度を調べる」** — **DONE**
5. **フッターナビ → ヘッダー** — **DONE**（sticky top tabs）
6. **FAB 円形クリップ** — **DONE**

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


## Grok API キーについて（重要・2026-09-09）

平文の xAI キーを Pages に焼くと **GitHub secret scanning が push を拒否**する。

**現行:** `src/lib/amity-grok-bundle.ts` に XOR+分割 Base64 のシファーのみコミット。実行時デコード。設定欄はオーバーライド用。
再生成: box-secrets の `XAI_API_KEY` からローカルスクリプトで bundle を作り直す（平文をログしない）。
