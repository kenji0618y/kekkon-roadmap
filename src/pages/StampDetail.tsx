import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StampActions } from '../components/StampActions';
import type { AppState } from '../hooks/useAppState';
import { moneyLabel } from '../lib/money';
import { enrichStamp } from '../lib/stampContent';
import type { StampStatus } from '../types';

type Props = { state: AppState };

export function StampDetail({ state }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();

  const raw = useMemo(
    () => state.allStamps.find((s) => s.id === id) || null,
    [state.allStamps, id],
  );

  if (!raw) {
    return (
      <div className="page">
        <p className="kicker">スタンプ詳細</p>
        <h1>見つかりません</h1>
        <Link className="btn primary" to="/map">
          ロードマップへ戻る
        </Link>
      </div>
    );
  }

  const stamp = enrichStamp(raw);
  const status: StampStatus = state.statuses[stamp.id] || 'todo';
  const inLabel = moneyLabel(stamp.money_in, 'in');
  const outLabel = moneyLabel(stamp.money_out, 'out');
  const unknownFirst = status === 'unknown';

  return (
    <div className="page detail">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        ← 戻る
      </button>

      <div className="detail-head card-soft">
        <div>
          <span className="track-pill">{stamp.track}</span>
          <span className="stamp-id">{stamp.id}</span>
        </div>
        <h1>{stamp.title}</h1>
        <p className="muted">
          {stamp.who} · {stamp.window}
        </p>
        {(inLabel || outLabel) && (
          <div className="stamp-money big">{[inLabel, outLabel].filter(Boolean).join(' ／ ')}</div>
        )}
      </div>

      {unknownFirst && (
        <section className="card-soft block faq-first">
          <StampActions
            stamp={stamp}
            status={status}
            messages={state.chats[stamp.id] || []}
            onStatus={(s) => state.setStatus(stamp.id, s)}
            onChat={(msgs) => state.setChat(stamp.id, msgs)}
            forceFaqOpen
          />
        </section>
      )}

      <section className="card-soft block">
        <h2>なぜやる</h2>
        <p>{stamp.why}</p>
      </section>

      <section className="card-soft block">
        <h2>手順</h2>
        <ol className="steps">
          {stamp.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      {stamp.miss && (
        <section className="card-soft block miss-block">
          <h2>取りこぼし</h2>
          <p>{stamp.miss}</p>
        </section>
      )}

      {!unknownFirst && (
        <section className="card-soft block">
          <StampActions
            stamp={stamp}
            status={status}
            messages={state.chats[stamp.id] || []}
            onStatus={(s) => state.setStatus(stamp.id, s)}
            onChat={(msgs) => state.setChat(stamp.id, msgs)}
          />
        </section>
      )}
    </div>
  );
}
