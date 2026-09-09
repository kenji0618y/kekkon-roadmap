# CONTENT GUARD — シード流失防止

他の AI / 開発者が UI・フレームワークを触っても、**app-seed 由来の中身を落とさない**ための短い指針。

## 必須

1. **Source of truth（このリポジトリ）:** `src/data/`（`tasks.json` / `deadlines.json` / `exclude.json` / `home.json` / `phases.json` / `groups.json` / `YEARLY_UPDATE.md` など）。
2. **無いもの:** `/workspace/marriage-research/app-seed/` は Kenji のローカル Grok Bot 用アーカイブであり、**この GitHub リポには含まれない**。クローンした AI はそこを探さない・必須扱いしない。復元済みの中身はすでに `src/data` にある。
3. ChatGPT ノートブック等とのマージは **rich フィールドを ABSORB**（上書きで薄くしない）。
4. 円の金額はシード／ユーザー入力のみ。結婚新生活を賞品化しない。
5. 完了報告の前に必ず:

```bash
npm run verify:seed
```

カウント表を貼ること。`prebuild` でも自動実行される。

## スクリプト

- `scripts/verify-seed.mjs` — 件数下限 + UI マウント検査。失敗で exit 1。
- npm: `verify:seed` / `prebuild`
- `docs/YEARLY_UPDATE.md` と `src/data/YEARLY_UPDATE.md` は **同一内容必須**（設定 UI は `src/data` を import。verify が差分で fail）

## 下限インベントリ（詳細は HANDOFF HARD RULES）

| 項目 | 下限 |
|------|------|
| tasks why/miss/window | ≥137 each |
| faq pairs (q+a) | ≥650 |
| deadlines next_absolute / relative | =10 / =6 |
| exclude.items | =36 |
| home hero/lies/talk/tomorrow | =3/=4/=10/=3 |
| headline + anti_lie_banner | 必須 |
| phases / events | =9 / ≥48 |
| groups subtitle / chips sets | ≥10 / ≥31 |
| money_in / money_out on tasks | ≥90 / ≥50 |

UI: `SeedContentPanels`（headline・tomorrow_3_actions・deadlines・exclude・phases）と TaskForm（why/miss/window/FAQ/シード金額メモ）がマウントされていること。

失敗したら「UI を直したのでシードは後で」ではなく、**シードを戻してから**マージする。
