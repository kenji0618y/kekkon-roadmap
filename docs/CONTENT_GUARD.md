# CONTENT GUARD — 中身を減らさないための決まり

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
| タブ | 7（デスク / マップ / 期限 / 記念 / ふたり / 探す / 設定） |
| verify-seed | 52項目 |
| データ確認日 | 2026-09-10 |
<!-- /STATE -->

他の AI / 開発者が UI・フレームワークを触っても、**app-seed 由来の中身を落とさない**ための短い指針。

## 必須

1. **Source of truth（このリポジトリ）:** `src/data/`（`tasks.json` / `deadlines.json` / `exclude.json` / `home.json` / `phases.json` / `groups.json` / `sources.json` / `practices.json` / `talks.json` / `agreements.json` / `refs.json` / `YEARLY_UPDATE.md` など）。
2. **無いもの:** `/workspace/marriage-research/app-seed/` は Kenji のローカル Grok Bot 用アーカイブであり、**この GitHub リポには含まれない**。クローンした AI はそこを探さない・必須扱いしない。復元済みの中身はすでに `src/data` にある。
3. ChatGPT ノートブック等とのマージは **rich フィールドを ABSORB**（上書きで薄くしない）。
4. 円の金額は収録データ／ユーザー入力のみ。結婚新生活を「もらえる額」にしない。
5. **作り手あてのメモを画面に出さない**（`AGENTS.md` §Screen language）。生成時の覚書と、
   読み手に見せる文は別物として書く。
6. **内容を増やしたら、この下の下限も一緒に上げる。** 上げ忘れると、次に減っても検査が気づけない。
7. 完了報告の前に必ず:

```bash
npm run verify:seed
```

カウント表を貼ること。`prebuild` でも自動実行される。

## スクリプト

- `scripts/verify-seed.mjs` — 件数下限 + UI マウント検査。失敗で exit 1。
- npm: `verify:seed` / `prebuild`
- `docs/YEARLY_UPDATE.md` と `src/data/YEARLY_UPDATE.md` は **同一内容必須**（設定 UI は `src/data` を import。verify が差分で fail）

## 下限インベントリ（2026-09-11 現在・詳細は HANDOFF HARD RULES）

| 項目 | 下限 |
|------|------|
| tasks 件数 | **=176**（完全一致）|
| tasks why / miss / window / track | ≥176 each |
| tasks pad（絵の上の短縮名） | =176・2〜8字（検査あり）|
| faq pairs (q+a) | ≥820 |
| deadlines next_absolute / relative | =10 / =6 |
| exclude.items | =36 |
| home hero / lies / talk / tomorrow | =3/=4/=10/=3 |
| anti_lie_banner | 必須（`headline` は 2026-09-10 に廃止）|
| phases / events | =9 / ≥48 |
| groups subtitle / chips sets | ≥12 / ≥33 |
| money_in / money_out on tasks | ≥90 / ≥50 |
| tasks review（毎年見直す民間サービス）| ≥12・15か月超は警告 |
| practices / talks / agreements / refs | =52 / =16 / =18 / =18 |
| refs の DV相談・性犯罪/性暴力の窓口 | 必須（外すと fail）|

UI: `SeedContentPanels`（tomorrow_3_actions・deadlines・exclude・phases）、TaskForm（why/miss/window/FAQ/お金のめやす）、
`PairWorkbook`（「ふたり」タブ本体と安全に関する一節）がマウントされていること。検査は全部で **47項目**。

失敗したら「UI を直したのでシードは後で」ではなく、**シードを戻してから**マージする。
