import deadlines from '../data/deadlines.json';
import { Toggles } from '../components/Toggles';
import type { AppState } from '../hooks/useAppState';
import { formatYen } from '../lib/money';

type Props = { state: AppState; embedded?: boolean };

type Abs = (typeof deadlines.next_absolute)[number];
type Rel = (typeof deadlines.relative_always)[number];

function branchOk(branch: string | null | undefined, settings: AppState['settings']): boolean {
  if (!branch || branch === 'always') return true;
  if (branch === 'child') return settings.hasChild;
  if (branch === 'buy') return settings.buyingHome;
  return true;
}

function moneyLine(d: Abs | Rel): string | null {
  if ('money' in d && d.money && d.money.amount_yen != null) {
    const u = d.money.unit ? `（${d.money.unit}）` : '';
    return `${formatYen(d.money.amount_yen)}${u}`;
  }
  if ('money_in' in d && d.money_in && d.money_in.amount_yen != null) {
    const u = d.money_in.unit ? `（${d.money_in.unit}）` : '';
    return `入：${formatYen(d.money_in.amount_yen)}${u}`;
  }
  if ('money_out' in d && d.money_out && d.money_out.amount_yen != null) {
    const note = d.money_out.note ? ` · ${d.money_out.note}` : '';
    const u = d.money_out.unit ? `（${d.money_out.unit}）` : '';
    return `出：${formatYen(d.money_out.amount_yen)}${u}${note}`;
  }
  return null;
}

export function Deadlines({ state, embedded }: Props) {
  const abs = deadlines.next_absolute.filter((d) => branchOk(d.branch, state.settings));
  const rel = deadlines.relative_always.filter((d) => branchOk(d.branch, state.settings));

  return (
    <div className={embedded ? 'map-tab-panel' : 'page'}>
      {!embedded && (
        <>
          <p className="kicker">
            期限 · 基準日 {deadlines.as_of}（{deadlines.timezone}）
          </p>
          <h1>いま切れる期限</h1>
        </>
      )}
      {embedded && (
        <p className="muted micro map-tab-meta">
          基準日 {deadlines.as_of}（{deadlines.timezone}）
        </p>
      )}
      <Toggles settings={state.settings} onChange={state.setToggle} compact />

      <h2>絶対日付</h2>
      {abs.map((d) => (
        <article key={d.date + d.title} className={`deadline${d.date <= '2026-12-31' ? ' urgent' : ''}`}>
          <div className="when">〜{d.date}</div>
          <div className="title">{d.title}</div>
          {d.note && <div className="note">{d.note}</div>}
          {moneyLine(d) && <div className="stamp-money">{moneyLine(d)}</div>}
        </article>
      ))}

      <h2>届出・イベント相対</h2>
      {rel.map((d) => (
        <article key={d.offset + d.title} className="deadline">
          <div className="when">{d.offset}</div>
          <div className="title">{d.title}</div>
          {'miss' in d && d.miss && <div className="stamp-miss">MISS: {d.miss}</div>}
          {moneyLine(d) && <div className="stamp-money">{moneyLine(d)}</div>}
        </article>
      ))}
    </div>
  );
}
