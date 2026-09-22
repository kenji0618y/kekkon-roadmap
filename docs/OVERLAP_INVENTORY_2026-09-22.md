# 重複・重なり在庫レポート（消さず提案のみ）

- 作成: 2026-09-22（Asia/Tokyo）
- 対象: `src/data/*` + デスクUIの二重表示
- 方針: **シードは削除しない**。Kenji が keep/drop を決めるための一覧。

## 件数サマリ

| 指標 | 数 |
|---|---|
| tasks | **186** |
| FAQ組（全タスク合計） | **2074** |
| FAQが2タスク以上に出る質問（ユニーク） | **17** |
| うちテンプレ洪水（10タスク以上） | **13** |
| タイトル近傍クラスタ（類似≥0.72） | **5** |
| 式あり専用（W*/ceremony） | **6** |
| deadlines 絶対 / 相対 | 11 / 6 |
| exclude / lies / talk_lines | 36 / 4 / 10 |
| phases 出来事 | 48 |
| practices / talks | 52 / 16 |

---

### いる（残す）

- **全186タスク本体** — 式なしUIで隠すだけ。`tasks.json` から消さない（W1–W7含む）。
- **G7 / G8（妊婦支援1回目・2回目）** — 別タイミングの申請。タイトルは似ているが別手続き。
- **A得4 / A得7（生命／地震保険料控除）** — 別控除。意図的に並立。
- **A得1（NISAの仕組み）と C他3（年間利用状況）** — 学ぶ vs 毎年確認。
- **A必6（扶養の整理）と C他7（保険扶養の届出）** — 概観 vs 手続き。C他7は `hidden_if: dependent_enrollment` メタあり。
- **A得9 / A得11 / F1（贈与系）** — 記録・一括贈与・住宅資金で要件が違う。
- **A必1（会社の制度を集める）** — 式なしでも規程取り寄せの本体。残す。
- **C即6 / D1（休暇・祝金の実行）** — A必1のあとの実行ステップ。残す。
- **相対期限（転入14日・出生届・児童手当等）** — タスクの window と役割が違う（カレンダー用の制度時計）。残す。
- **exclude H01–H36** — 「もらえない／買わない」カタログの本体。残す。
- **lies 4件 + anti_lie_banner** — デスクから探すタブへ移済み。データは残す。
- **talk_lines 10件** — ふたりタブ用。lies と同テーマでも媒体が違う（会話の一言）。残す。
- **home.tomorrow_3_actions / filing_week_path** — シードは残す。**表示の二重はUIで畳む**（下のUI節）。
- **FAQ本文そのもの** — テンプレQでも回答Aはタスク固有のことが多い。一括削除しない。
- **phases 48出来事** — 期限タブの時期ストーリー。deadlines と補完関係。残す。

---

### いらない／統合候補（消さず提案のみ）

#### タスク（シード削除はKenji承認後）

- **id/title: `B7` 会社の制度の起算日を確認する**
  - why overlap: `hidden_if: [ceremony_none_skip_optional]` なのに、現行 `inScope` は未配線で式なしでも表示。内容は A必1 / C即6 / D1 と起算・挙式条件が重複。
  - recommendation: **hide when profile `ceremony===no`**（コード配線）。シードは残す。式ありでは keep。将来マージするなら A必1 へ吸収を検討。

- **id/title: `W1`–`W7`（式のキャンセル／見積り／支払／お祝い／写真／招待）**
  - why overlap: 式なしプロフィールでは既に `isCeremonyTask` で非表示。シード上は式あり専用の正当な塊。
  - recommendation: **keep**（消さない）。UI hide のまま。

- **タイトル近傍クラスタ（意図的並立・削除不要）**
  - `A得4`×`A得7`、`G7`×`G8` — recommendation: **keep**（別制度／別回）。

#### FAQ（テンプレ洪水・コード側で畳む）

チャット top-12 を汚染しやすいテンプレQ（出現タスク数）:
- **Q: 「これは私たちに関係ありますか？」（57タスク）**
  - why overlap: ほぼ同じ質問文が多数タスクのFAQにコピーされている。
  - recommendation: **UI-collapse（desk-chat で正規化タイトル・同一Q dedupe）**。シードのFAQ行は残す。
- **Q: 「この手続きは私たちに必要ですか？」（51タスク）**
  - why overlap: ほぼ同じ質問文が多数タスクのFAQにコピーされている。
  - recommendation: **UI-collapse（desk-chat で正規化タイトル・同一Q dedupe）**。シードのFAQ行は残す。
- **Q: 「窓口、持ち物、受付時間、期限を教えてください。」（49タスク）**
  - why overlap: ほぼ同じ質問文が多数タスクのFAQにコピーされている。
  - recommendation: **UI-collapse（desk-chat で正規化タイトル・同一Q dedupe）**。シードのFAQ行は残す。
- **Q: 「いつ・誰が・何を持っていけばいいですか？」（45タスク）**
  - why overlap: ほぼ同じ質問文が多数タスクのFAQにコピーされている。
  - recommendation: **UI-collapse（desk-chat で正規化タイトル・同一Q dedupe）**。シードのFAQ行は残す。
- **Q: 「私たちの状況で対象になりますか？除外される条件はありますか？」（39タスク）**
  - why overlap: ほぼ同じ質問文が多数タスクのFAQにコピーされている。
  - recommendation: **UI-collapse（desk-chat で正規化タイトル・同一Q dedupe）**。シードのFAQ行は残す。
- **Q: 「申請前に済ませること、必要書類、受付期限を教えてください。」（39タスク）**
  - why overlap: ほぼ同じ質問文が多数タスクのFAQにコピーされている。
  - recommendation: **UI-collapse（desk-chat で正規化タイトル・同一Q dedupe）**。シードのFAQ行は残す。
- **Q: 「他の給付・控除との併用や精算の注意点はありますか？」（39タスク）**
  - why overlap: ほぼ同じ質問文が多数タスクのFAQにコピーされている。
  - recommendation: **UI-collapse（desk-chat で正規化タイトル・同一Q dedupe）**。シードのFAQ行は残す。
- **Q: 「この制度は私たちの雇用形態・勤務状況で利用できますか？」（21タスク）**
  - why overlap: ほぼ同じ質問文が多数タスクのFAQにコピーされている。
  - recommendation: **UI-collapse（desk-chat で正規化タイトル・同一Q dedupe）**。シードのFAQ行は残す。
- **Q: 「申請の基準日、期限、必要書類、提出先を教えてください。」（21タスク）**
  - why overlap: ほぼ同じ質問文が多数タスクのFAQにコピーされている。
  - recommendation: **UI-collapse（desk-chat で正規化タイトル・同一Q dedupe）**。シードのFAQ行は残す。
- **Q: 「二人が一番大切にしたいことは何ですか？」（21タスク）**
  - why overlap: ほぼ同じ質問文が多数タスクのFAQにコピーされている。
  - recommendation: **UI-collapse（desk-chat で正規化タイトル・同一Q dedupe）**。シードのFAQ行は残す。
- **Q: 「どちらかに負担が偏っていませんか？次はいつ見直しますか？」（21タスク）**
  - why overlap: ほぼ同じ質問文が多数タスクのFAQにコピーされている。
  - recommendation: **UI-collapse（desk-chat で正規化タイトル・同一Q dedupe）**。シードのFAQ行は残す。
- **Q: 「変更した場合の総支払額と追加費用はいくらですか？」（13タスク）**
  - why overlap: ほぼ同じ質問文が多数タスクのFAQにコピーされている。
  - recommendation: **UI-collapse（desk-chat で正規化タイトル・同一Q dedupe）**。シードのFAQ行は残す。

#### home / exclude / talk のテーマ重複（データは残す）

- **lie_marriage_subsidy × exclude H01/H02 × talk tl03 × DeskRoleLabels「結婚新生活支援」**
  - why overlap: 「広島は未実施／30万は賞品にしない」を複数面で繰り返す（意図的な安全装置）。
  - recommendation: **keep** データ。デスクでは Role 1箇所＋探すタブの ExcludeAndLies に寄せ済みを維持。

- **lie_spouse_deduction × H03/H28 × talk tl03** — recommendation: **keep**（探し／会話で媒体分け）。
- **lie_kogaku_vs_iryo × H06 × talk tl04** — recommendation: **keep**。
- **lie_myna_90 × talk tl05 × タスク C90 系** — recommendation: **keep**（思い込み vs 手続き）。

- **tomorrow_3_actions の stamp と filing_week_path の交差**
  - overlap stamps: `['A必2', 'A必3', 'B2']`（A必2 / A必3 / B2）
  - recommendation: シードは **keep**。デスクでは「次のアクション」を SoT にし、最短パスは折りたたみ／司令室から明日リストを外す（UI-collapse）。

#### deadlines ↔ タスク window

- **相対「児童手当」↔ `G14`、相対「出生届」↔ `G13`、相対「不動産氏名・住所変更登記」↔ `C2年1`**
  - why overlap: 同じ手続きの時計が deadlines と task.window の両方にある。
  - recommendation: **keep both**（期限タブの制度時計 vs スタンプの作業メモ）。マージするとカレンダー書き出しが壊れる。

- **絶対期限（みらいエコ・iDeCo上限・株主優待権利日など）**
  - recommendation: **keep**。対応タスクが薄いものあり → タスク新設は別PR。今回は削除しない。

---

### UIの二重表示（コード側で畳める）

- **Amity司令室「明日の一手」 × HomeInsightPanels「次のアクション」**
  - id: `home.tomorrow_3_actions` を両方で描画
  - why overlap: デスク同一タブ内で同じリストが2回
  - recommendation: **UI-collapse** — 司令室から明日リストを外し、「次のアクション」へ横断リンク。シードは残す。

- **最短パス：届出週 × 次のアクション**
  - id: `home.filing_week_path` vs tomorrow stamps
  - why overlap: A必2/A必3/B2 が両方に出る
  - recommendation: **UI-collapse** — 最短パスを既定で閉じる（必要なら開く）。

- **どこを見るか（DeskRoleLabels）× 探す ExcludeAndLies × 司令室の市リンク**
  - why overlap: 市の婚姻届／Graffer／未導入の結婚新生活が Role に集約済み。司令室は期限・ペアに特化。
  - recommendation: **keep Role 1箇所**。司令室に市リンクを増やさない。

- **ヒーロー数字** — 期限タブのみ（デスクから移動済み）。desk-chat コーパスには残る → **keep**。

- **desk-chat FAQ top-12**
  - why overlap: 同一テンプレQが別タスクFAQとして並ぶ
  - recommendation: **UI-collapse（正規化Q dedupe）**。

---

## 補足（実装ループ向け観察）

1. `hidden_if: ceremony_none_skip_optional` が B7 に付いているが `inScope` 未使用 → 式なしで B7 が残る（バグ寄り）。
2. 他の `hidden_if`（`spouse_deduction_default` 等）はプロフィール配線が無いため、**今回は ceremony_none のみ**触る。
3. シード削除は本レポートの「いらない／統合候補」を Kenji が選んだあと。
