import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import excludeData from '../data/exclude.json';
import { StampCard } from '../components/StampCard';
import { Toggles } from '../components/Toggles';
import type { AppState } from '../hooks/useAppState';
import { enrichStamp } from '../lib/stampContent';
import { isStampVisible } from '../lib/money';

type Props = { state: AppState; embedded?: boolean };

export function Know({ state, embedded }: Props) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'exclude' ? 'exclude' : 'search';
  const [q, setQ] = useState('');
  const [onlyUnknownOrNotes, setOnlyUnknownOrNotes] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.allStamps
      .filter((s) => isStampVisible(s, state.settings))
      .filter((s) => {
        if (onlyUnknownOrNotes) {
          const st = state.statuses[s.id] || 'todo';
          const hasNote = !!(state.notes[s.id] && state.notes[s.id].trim());
          if (st !== 'unknown' && !hasNote) return false;
        }
        if (!needle) return true;
        const e = enrichStamp(s);
        const hay = [
          e.id,
          e.title,
          e.who,
          e.window,
          e.miss || '',
          e.why,
          ...(e.steps || []),
          ...e.faq.flatMap((f) => [f.q, f.a]),
          e.money_in?.note || '',
          state.notes[s.id] || '',
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      });
  }, [state.allStamps, state.settings, state.statuses, state.notes, q, onlyUnknownOrNotes]);

  return (
    <div className={embedded ? 'map-tab-panel' : 'page'}>
      <div className="section-row">
        <div>
          {!embedded && (
            <>
              <p className="kicker">知る · FAQ・対象外</p>
              <h1>調べてから動く。</h1>
            </>
          )}
          {embedded && <p className="muted micro map-tab-meta">FAQ・検索・対象外</p>}
        </div>
        <Link className="text-link" to="/edit">
          編集
        </Link>
      </div>
      <Toggles settings={state.settings} onChange={state.setToggle} compact />

      <div className="tabs">
        <button
          type="button"
          className={`tab${tab === 'search' ? ' on' : ''}`}
          onClick={() => setParams({})}
        >
          検索
        </button>
        <button
          type="button"
          className={`tab${tab === 'exclude' ? ' on' : ''}`}
          onClick={() => setParams({ tab: 'exclude' })}
        >
          対象外
        </button>
      </div>

      {tab === 'exclude' ? (
        <>
          <div className="banner compact warn-zero">
            <strong>賞品にしない</strong>
            <span>{excludeData.description}</span>
          </div>
          {excludeData.items.map((it) => (
            <article key={it.id} className="exclude-item">
              <span className="badge">対象外</span>
              <div className="ex-title">{it.title}</div>
              <div className="why">{it.why}</div>
              {it.source && <div className="muted micro">出典: {it.source}</div>}
            </article>
          ))}
        </>
      ) : (
        <>
          <div className="search-bar">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="スタンプ・FAQを検索"
              aria-label="検索"
            />
          </div>
          <label className="filter-check">
            <input
              type="checkbox"
              checked={onlyUnknownOrNotes}
              onChange={(e) => setOnlyUnknownOrNotes(e.target.checked)}
            />
            <span>わからない／メモありだけ</span>
          </label>
          {!q.trim() && !onlyUnknownOrNotes ? (
            <p className="muted">タイトル・なぜ・手順・FAQ全文から探せます。</p>
          ) : filtered.length === 0 ? (
            <div className="empty">該当なし</div>
          ) : (
            filtered.map((s) => (
              <StampCard
                key={s.id}
                stamp={s}
                status={state.statuses[s.id] || 'todo'}
                onToggle={() => state.toggleDone(s.id)}
                compact
              />
            ))
          )}
        </>
      )}
    </div>
  );
}
