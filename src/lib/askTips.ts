import type { Stamp } from '../types';

export type AskTip = { label: string; text: string };

/** Canned JP tips from stamp.who + window + title. Never invents yen. */
export function askTipsFor(stamp: Stamp): AskTip[] {
  const who = stamp.who?.trim() || '担当窓口';
  const win = stamp.window?.trim() || '案内の時期';
  const title = stamp.title;

  return [
    {
      label: '何を聞くか',
      text: `「${title}」について、今の状況でも対象になるか、必要な書類、申請の順番を教えてください。金額の確約は求めず、条件と期限だけ確認します。`,
    },
    {
      label: '誰に',
      text: `${who}に電話か窓口で聞きます。担当が違う場合は正しい窓口へのつなぎ方も聞いてください。`,
    },
    {
      label: '何を控える',
      text: `聞いた日・相手の部署名・「${win}」に関する案内・持参物リストをメモ。金額は公式案内や書面に書いてある数字だけ控えます（推測で書かない）。`,
    },
  ];
}

export function shortStampLabel(stamp: Stamp): string {
  const t = stamp.title;
  if (t.length <= 8) return t;
  // Prefer first clause before （ or ・
  const cut = t.split(/[（(・／]/)[0].trim();
  if (cut.length >= 3 && cut.length <= 10) return cut;
  return t.slice(0, 7) + '…';
}

export function squareProgress(
  stampIds: string[],
  statuses: Record<string, string>,
): { done: number; checked: number; unknown: number; total: number; label: string } {
  let done = 0;
  let checked = 0;
  let unknown = 0;
  for (const id of stampIds) {
    const st = statuses[id] || 'todo';
    if (st === 'done') done += 1;
    else if (st === 'checked') checked += 1;
    else if (st === 'unknown') unknown += 1;
  }
  const total = stampIds.length;
  const label = `完了${done} 確認${checked} ？${unknown} / 全${total}`;
  return { done, checked, unknown, total, label };
}
