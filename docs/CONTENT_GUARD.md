# CONTENT GUARD — シード流失防止

他の AI / 開発者が UI・フレームワークを触っても、**app-seed の中身を落とさない**ための短い指針。

## 必須

1. **Source of truth:** `/workspace/marriage-research/app-seed/` またはそのコピー `src/data/`。
2. ChatGPT ノートブック等とのマージは **rich フィールドを ABSORB**（上書きで薄くしない）。
3. 円の金額はシード／ユーザー入力のみ。結婚新生活を賞品化しない。
4. 完了報告の前に必ず:

```bash
npm run verify:seed
```

カウント表を貼ること。`prebuild` でも自動実行される。

## スクリプト

- `scripts/verify-seed.mjs` — 件数下限 + UI マウント検査。失敗で exit 1。
- npm: `verify:seed` / `prebuild`

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
