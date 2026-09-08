import type { Money, Stamp } from '../types';

export function yenOf(m: Money): number | null {
  if (!m || m.amount_yen == null) return null;
  const n = Number(m.amount_yen);
  if (Number.isNaN(n)) return null;
  return n;
}

export function formatYen(n: number): string {
  const abs = Math.abs(Math.round(n));
  const s = abs.toLocaleString('ja-JP');
  return n < 0 ? `−${s}円` : `${s}円`;
}

/** Pull the largest explicit yen figure from Japanese miss text when possible. */
export function parseYenFromText(text: string | null | undefined): number | null {
  if (!text) return null;
  const patterns = [
    /(\d[\d,]*)\s*万円/g,
    /(\d[\d,]*)\s*万/g,
    /(\d[\d,]*)\s*円/g,
  ];
  let best: number | null = null;
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    const isMan = re.source.includes('万');
    while ((m = re.exec(text)) !== null) {
      const raw = Number(m[1].replace(/,/g, ''));
      if (Number.isNaN(raw)) continue;
      const yen = isMan ? raw * 10000 : raw;
      if (yen <= 0) continue;
      if (best == null || yen > best) best = yen;
    }
  }
  return best;
}

export function sumRealized(
  stamps: Stamp[],
  statuses: Record<string, string>,
  customIn: Record<string, number>,
): number {
  let sum = 0;
  for (const s of stamps) {
    if (statuses[s.id] !== 'done') continue;
    if (typeof customIn[s.id] === 'number' && !Number.isNaN(customIn[s.id])) {
      sum += customIn[s.id];
      continue;
    }
    const y = yenOf(s.money_in);
    if (y != null && y > 0) sum += y;
  }
  return sum;
}

export function sumAvoided(stamps: Stamp[], statuses: Record<string, string>): number {
  let sum = 0;
  for (const s of stamps) {
    if (statuses[s.id] !== 'done') continue;
    const y = parseYenFromText(s.miss);
    if (y != null) sum += y;
  }
  return sum;
}

export function isStampVisible(
  s: Stamp,
  settings: { hasChild: boolean; buyingHome: boolean },
): boolean {
  if (s.eligibility === 'child' && !settings.hasChild) return false;
  if (s.eligibility === 'buy' && !settings.buyingHome) return false;
  return true;
}

export function moneyLabel(m: Money, kind: 'in' | 'out'): string | null {
  const y = yenOf(m);
  if (y == null) {
    if (m?.note) return kind === 'in' ? `入：${m.note}` : `出：${m.note}`;
    return null;
  }
  const unit = m?.unit ? `（${m.unit}）` : '';
  const note = m?.note ? ` · ${m.note}` : '';
  if (y === 0) return `${kind === 'in' ? '入' : '出'}：0円${note}`;
  return `${kind === 'in' ? '入' : '出'}：${formatYen(y)}${unit}${note}`;
}
