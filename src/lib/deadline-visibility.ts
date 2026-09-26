import {branchVisible} from './model'

type SeedDeadline = {title: string; branch?: string | null}
type ProfileLike = {child: string; home: string}

/** 株主優待の例は画面に出さない（データは残す）。2026-09-26 */
const HIDDEN_ON_SCREEN = /株主優待/
/** みらいエコ住宅（ZEH水準）は住まい=購入（検討・手続き中）のときだけ出す。 */
const ZEH_TITLE = /みらいエコ住宅（ZEH水準）/

/** 画面・カレンダー・書き出しに出す制度の絶対締切か（シードJSONは消さない）。 */
export function deadlineVisible(d: SeedDeadline, p: ProfileLike): boolean {
  if (!branchVisible(d.branch, p.child, p.home)) return false
  if (HIDDEN_ON_SCREEN.test(d.title)) return false
  if (ZEH_TITLE.test(d.title) && !['soon', 'buying'].includes(p.home)) return false
  return true
}

/**
 * 公式案内で受付が終わっていることが確かめられた締切の表示ラベル。
 * みらいエコ住宅：注文住宅（ZEH水準）の交付申請の予約受付は「遅くとも2026年8月17日まで」、
 * 申請は建築事業者が行う（https://jutaku-shoene2026.mlit.go.jp/about/new-house.html ・2026-09-26確認）。
 */
export function deadlineClosedLabel(d: SeedDeadline): string | null {
  if (ZEH_TITLE.test(d.title)) return '予約受付は終了（注文住宅・遅くとも2026年8月17日まで）。申請は建築事業者が行います。'
  return null
}
