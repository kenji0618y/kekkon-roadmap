# 年次アップデート手順（スタンプシード v2）

対象: `app-seed/stamps-v2.json` / `meta.json`（現在 stamp_count=134）

## 1. 年号を上げる
1. `meta.json` の `data_year` と `updated_at` を更新する。
2. 各スタンプの `review_year` を新年度にする（スクリプト既定値も更新）。
3. `15-deadline-calendar-*.md` を翌年度版にコピーし、窓・時効を差し替える。

## 2. 市・国の制度を再確認（円は創作しない）
- 広島市公式（三世代近居・特賃・妊婦支援・こども医療・UR連携案内など）を一次で見直す。
- 国の NISA / iDeCo / 住宅ローン減税 / 住宅取得等資金贈与 / 児童手当 / 出産育児一時金をタックスアンサー・厚労省・こども家庭庁で確認。
- **金額が変わったときだけ** `money_in` / `money_out` / `miss` を更新する。推測で埋めない。不明は「会社差・要確認」。

## 3. exclude を維持
- `exclude.json` の対象外（配偶者控除・被扶養・市営・UR減額・0–2歳無償化・**結婚新生活支援** 等）を賞品・あと○円に出さない。
- 所得・ジョブロック・Lean前提が変わらない限り、H リストを安易に削らない。

## 4. 結婚新生活を賞品にしない（必須チェック）
```bash
python3 -c "import json; d=json.load(open('app-seed/stamps-v2.json'));
assert all('結婚新生活' not in s.get('title','') for s in d);
print('OK: no 結婚新生活 prize titles', len(d))"
```
FAQ 内で「未導入・賞品にしない」と注意書きするのは可。タイトルや獲得可能賞品としての掲載は不可。

## 5. 品質ゲート
- 全スタンプに `why`・`steps`(≥2)・`faq`(≥1)。必／改氏／税／NISA・iDeCo／子手当・一時金／住宅／UR・家賃／会社慶弔は FAQ 3–5。
- `enrich_stamps_v2.py` を再実行するか、差分を手で入れたあと同スクリプトの validate 相当を通す。
- プロフィール既定: 広島市・ジョブロック・共働き800万超・式なし届出婚。三世代近居は「親が市内＋子（予定）」のときだけ。

## 6. 配布
更新後の `stamps-v2.json` と `meta.json` をアプリの data にコピーし、表示上の「あと○円」が exclude と矛盾しないか目視する。
