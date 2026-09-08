import { useMemo, useState } from 'react';
import { StampCard } from '../components/StampCard';
import { Toggles } from '../components/Toggles';
import type { AppState } from '../hooks/useAppState';

type Props = { state: AppState };

const TRACKS = ['すべて', '必', '得', '無', '会社', '民間', '住', '法', '買う', '子'] as const;

export function Stamps({ state }: Props) {
  const [track, setTrack] = useState<(typeof TRACKS)[number]>('すべて');

  const list = useMemo(() => {
    return state.visible
      .filter((s) => track === 'すべて' || s.track === track)
      .sort((a, b) => a.track.localeCompare(b.track) || a.id.localeCompare(b.id));
  }, [state.visible, track]);

  return (
    <div className="page">
      <p className="kicker">スタンプ · {list.length}件</p>
      <h1>やって消す。</h1>
      <Toggles settings={state.settings} onChange={state.setToggle} compact />

      <div className="chips sticky-chips">
        {TRACKS.map((t) => (
          <button
            key={t}
            type="button"
            className={`chip${track === t ? ' on' : ''}`}
            onClick={() => setTrack(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty">該当なし。トグルやトラックを変えてみてください。</div>
      ) : (
        list.map((s) => (
          <StampCard
            key={s.id}
            stamp={s}
            status={state.statuses[s.id] || 'todo'}
            onToggle={() => state.toggleDone(s.id)}
            compact
          />
        ))
      )}
    </div>
  );
}
