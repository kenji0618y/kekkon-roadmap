/** Calendar date in Asia/Tokyo as YYYY-MM-DD */
export function tokyoToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function nextStreak(
  prevStreak: number,
  lastVisitDate: string | null,
  today: string,
): { streak: number; lastVisitDate: string } {
  if (lastVisitDate === today) {
    return { streak: Math.max(1, prevStreak || 1), lastVisitDate: today };
  }
  const yesterday = addDaysYmd(today, -1);
  if (lastVisitDate === yesterday) {
    return { streak: Math.max(1, (prevStreak || 0) + 1), lastVisitDate: today };
  }
  return { streak: 1, lastVisitDate: today };
}
