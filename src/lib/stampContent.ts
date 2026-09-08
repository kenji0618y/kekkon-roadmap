import type { Stamp, StampFaq, StampStatus } from '../types';

/** Runtime fallback when JSON lacks why/steps/faq. Never invents yen. */
export function enrichStamp(s: Stamp): Stamp & {
  why: string;
  steps: string[];
  faq: StampFaq[];
} {
  const why =
    s.why?.trim() ||
    (s.miss
      ? `「${s.title}」を窓内に片付けると、「${s.miss}」を避けやすくなります。`
      : `「${s.title}」は${s.window || '適切な時期'}に進める価値がある手続きです。`);

  let steps = (s.steps || []).filter((x) => x && x.trim());
  if (steps.length < 2) {
    steps = [
      `${s.window || '適切な時期'}に、${s.who || '当事者'}が「${s.title}」の条件と書類を確認する`,
      '窓口・提出方法を決め、控えを残して完了にする',
    ];
    if (s.miss) steps.push(`取りこぼし注意：${s.miss}`);
  }

  let faq = (s.faq || []).filter((f) => f?.q && f?.a);
  if (faq.length < 1) {
    faq = [
      {
        q: `「${s.title}」はいつやる？`,
        a: `目安は「${s.window || '案内の時期'}」です。過ぎると条件が変わることがあります。`,
      },
    ];
    if (s.miss) {
      faq.push({
        q: 'やらなかったら？',
        a: `想定される取りこぼしは「${s.miss}」です。金額はJSON記載のみ表示します。`,
      });
    }
  }

  return { ...s, why, steps, faq };
}

const URGENT_HINTS = [
  '今',
  '届出前',
  'M0',
  '提出',
  'プレ',
  '入院前',
  '妊娠前',
  '転居',
  '契約の前',
  '〜2026',
  '〜2027',
  '12/31',
  '3/15',
  '90日',
  '14日',
  '15日',
];

export function urgencyScore(s: Stamp): number {
  const w = s.window || '';
  let score = 0;
  for (const h of URGENT_HINTS) {
    if (w.includes(h)) score += 10;
  }
  if (s.track === '必') score += 8;
  if (s.track === '無') score += 5;
  if (s.eligibility === 'always') score += 2;
  if (s.miss) score += 3;
  if (s.id.startsWith('A必')) score += 4;
  return score;
}

const NEXT_STATUSES: StampStatus[] = ['todo', 'unknown', 'checked'];

function statusPriority(st: string): number {
  if (st === 'unknown') return 3;
  if (st === 'todo') return 2;
  if (st === 'checked') return 1;
  return 0;
}

/** Prefer unknown → todo → checked (not done/na). */
export function recommendStamps(
  visible: Stamp[],
  statuses: Record<string, string>,
  limit = 3,
): Stamp[] {
  return visible
    .filter((s) => NEXT_STATUSES.includes((statuses[s.id] || 'todo') as StampStatus))
    .sort(
      (a, b) =>
        statusPriority(statuses[b.id] || 'todo') - statusPriority(statuses[a.id] || 'todo') ||
        urgencyScore(b) - urgencyScore(a) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}
