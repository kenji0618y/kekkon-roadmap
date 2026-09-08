# HANDOFF — Amityちゃんにきく / 結婚ロードマップ

他の AI / 開発者がこのリポジトリを引き継ぐための現状メモ。  
最終更新: 2026-09-09（JST） / 最終公開コミット目安: `e0f2fef`

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

左から: **デスク** → ロードマップ → 期限と予定 → 記念手帳 → 制度を探す → ふたりの設定

- デスク: 司令室 UI + Amity ナビ + 得した記録 / 損回避・節約 + チャット
- ロードマップ: イラストマス + スタンプ（枠は帳内にクリップ）
- CHECK FIRST は **OUR JOURNEY の下**

## 同期（Gist）

- 既定 Gist ID: `4962ce100b42c446015825282f28b774`  
  https://gist.github.com/kenji0618y/4962ce100b42c446015825282f28b774
- ファイル: `futari-miraicho.json`
- コード: `src/lib/gist-sync.ts`、設定 UI で PAT（gist scope）
- 挙動: 保存後 debounce push / フォーカス・約20s で pull（revision / savedAt）
- **PAT を Pages やリポに埋め込まない**（端末 localStorage）

## Amity × Grok

- `src/lib/amity-grok.ts` — xAI `https://api.x.ai/v1`、モデル `grok-3`
- キー localStorage: `amity-grok-key`（設定画面で入力）
- チャット: `DeskChatPanel` + 端末内 tasks 検索 → キーがあれば Grok 深掘り
- ユーザーは xAI API キーを Grok Bot 側の secret として提供済み（**値はリポに書かない・この MD にも書かない**）。登録をアプリ初期値に載せる作業は **未完了**（下記）

## リセット

設定「スタンプ進捗をリセット」: `records` のみクリア（profile/memories は残す）。  
二重ロック: 文字列 `リセット` 入力 + チェックボックス後に危険ボタン有効。

## 主要パス

```
src/Notebook.tsx          # シェル・タブ
src/components/MarriageDesk.tsx
src/components/DeskChatPanel.tsx
src/components/StampIllustBoard.tsx
src/lib/use-book.ts       # localStorage + Gist sync
src/lib/gist-sync.ts
src/lib/amity-grok.ts
src/lib/desk-chat.ts      # オンデバイス検索
src/data/tasks.json / groups.json / sources.json / phase-images.json
public/phases/            # マスイラスト
public/desk-mascot.png    # Amity サメ
docs/MERGE_OVERLAPS.md
docs/HANDOFF.md           # 本ファイル
```

## ビルド・公開手順

```bash
cd /path/to/kekkon-roadmap
npm ci
npm run build
# dist を gh-pages へ（例）
npx gh-pages -d dist
# または既存のデプロイスクリプトに従う。dist 直下に .nojekyll を置くこと
```

`gh` は `kenji0618y` でログイン済みの環境あり。`workflow` scope なし。

## ユーザー要望 — 進行中 / 未完了（2026-09-09）

優先して実装すること:

1. **「Amityちゃんにきく」はチャットだけ**  
   デスクの司令室ダッシュボード等を削り、聞く体験をチャット中心にする（タブ名/ブランドと整合）。

2. **Grok API を登録済みにする**  
   ユーザーは xAI キーを secret 提供済み。アプリ側でキー入力なしでも Grok が使えるようにする。  
   **注意:** GitHub Pages の静的 JS に生キーを焼くと誰でも抽出できる。推奨は  
   - ビルド時のみ `.env*.local`（gitignore）から注入しつつ利用制限を xAI 側でかける、または  
   - 小さなプロキシ / 秘密の設定経路  
   生キーを `docs/` や git 追跡ファイルに書かない。

3. **写真はスタンプ帳グリッドではなくスクロールで並べ、画像を増やす**  
   新規イラスト生成済み（box 上、未取り込みの可能性あり）:  
   - `/home/box/sand-data/agents/0a106625-f2e9-46f5-9fd1-91b0c0cfa40b/assets/826d85fd41c8825a4e0deb87cffb874d0a434ccdd901ae764c41b4b74ecc48a9.png`（filing 系）  
   - `.../0a28d85cd127a718e16408c489d9213a024f10d81bd7402b905643834d9b4d60.png`（pregnant 系）  
   - `.../682bbc018dc9540ccb4bd6dd6a2bf05e04887da9e5b76521b61c2ceb6b0327d7.png`（cohabit 系）  
   - `.../5f45c19a9e8d27839a760a2e746caed49ca4df04840c61a8e372f9dba80dd8ad.png`（birth 系）  
   - `.../adc6a2353d7bf16eff9fd082f50675c4f3cb3855053a516851dec6250ff1801e.png`（daycare 系）  
   → `public/` へコピーし、横 or 縦スクロールギャラリーに変更（スタンプ押し UX は維持しつつ帳グリッド感を減らす）。

4. **設定に「今の制度を調べる」項目**  
   Amity/Grok または既存検索への導線（クエリ入力 → 深掘り / 制度を探す）。

## 意図的にやらないこと

- 国の結婚新生活をメインの得として推す
- お祝い演出の復活
- Origin / Cloud Agents 必須化（プラン制約あり）
- 他エージェントの秘密・トークンをチャットや MD に貼る

## 連絡・オーナー

- ユーザー: Kenji Kadomoto（GitHub `kenji0618y`）
- タイムゾーン: Asia/Tokyo

引き継いだら、上記「未完了」を実装 → `npm run build` → `gh-pages` 更新 → スマホでハードリロード確認。
