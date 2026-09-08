# MERGE_OVERLAPS

- Before: **149** tasks
- After: **137** tasks
- Removed by merge: **12**

## Merges (drop → keep)

- `A無2` → `G1` **妊娠前に風しんの備えを相談する**
  - absorbed: 風しん抗体検査の対象を確認する
- `D2` → `C即6` **結婚休暇の条件を確認して申し込む**
  - absorbed: 結婚休暇の条件を確認する
- `C他6` → `A得11` **結婚・子育て資金の一括贈与を調べる**
  - absorbed: 一括贈与の管理を確認する
- `C他5` → `F1` **住宅資金の贈与の条件と期限を調べる**
  - absorbed: 住宅資金の贈与の期限を確認する
- `E2, E3` → `E1` **携帯の家族向け条件を総額で比較する**
  - absorbed: auの家族向け条件を比較する, ソフトバンクの家族向け条件を比較する
- `A必4` → `C即13` **年金・医療保険の登録を確認する**
  - absorbed: 年金の届出が必要か確認する
- `C90-2` → `C90-1` **転入後のカード継続利用と電子証明書を確認する**
  - absorbed: 電子証明書を使える状態にする
- `C他4` → `A得6` **医療費控除の方式を選ぶ**
  - absorbed: セルフメディケーションの対象年を確認する
- `D6` → `C他7` **医療保険の扶養を届け出て結果を確認する**
  - absorbed: 扶養の認定結果を確認する
- `D15` → `G25` **二人の育休と給付を計画する**
  - absorbed: 育休中の会社の支援を確認する
- `W3` → `B7` **会社の制度の起算日を確認する**
  - absorbed: 挙式に合わせる会社の手続きを確認する

## Intentionally kept separate

- G7 / G8 妊婦支援給付 1回目・2回目（別タイミングの申請）
- G13 出生届 / G14 児童手当（別手続き・期限）
- A得1 NISAの仕組み / C他3 年間利用状況（学ぶ vs 毎年の確認）
- A得15 自筆遺言保管 / B11 公正証書遺言
- G17 聴覚検査 / G18 代謝異常検査 / G19 乳児健診
- G21 団地リフォーム / G22 団地家賃支援
- A無4・A無5・A無6 相談窓口（内容が異なる）
- C14-1 転入届 / C14-2 世帯の確認
- A必1 制度を集める / B7 起算日（段階が異なる）
- A必6 扶養の三制度の整理 / C他7 保険扶養の届出（概観 vs 手続き）
- S1 国保 / S2 国民年金（自営業向け・別制度）
- A得9 贈与の記録 / A得10 生活費援助（取扱いが異なる）

## Notes

- 金額の円は既存データのみ。結婚新生活支援を懸賞化していない。
- groups.json の ids を置換・重複除去。UI の `D6` 参照は別途 `C他7` へ更新。

## Also in this change

- Removed celebration UX: toast, gift-card「祝」, milestone「寿」congratulations, letter/gift modals and settings gift flow.
- Functional sonner toasts (save/copy) kept.
