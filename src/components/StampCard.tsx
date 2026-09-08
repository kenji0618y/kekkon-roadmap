import { useNavigate } from 'react-router-dom';
import type { Stamp, StampStatus } from '../types';
import { moneyLabel } from '../lib/money';
import { enrichStamp } from '../lib/stampContent';

type Props = {
  stamp: Stamp;
  status: StampStatus;
  onToggle: () => void;
  compact?: boolean;
  /** One-line why preview (Today next stamps). */
  showWhyPreview?: boolean;
};

export function StampCard({ stamp, status, onToggle, compact, showWhyPreview }: Props) {
  const navigate = useNavigate();
  const done = status === 'done';
  const checked = status === 'checked';
  const unknown = status === 'unknown';
  const skipped = status === 'na';
  const branchClass =
    stamp.eligibility === 'child' ? ' child' : stamp.eligibility === 'buy' ? ' buy' : '';
  const inLabel = moneyLabel(stamp.money_in, 'in');
  const outLabel = moneyLabel(stamp.money_out, 'out');
  const whyPreview = showWhyPreview ? enrichStamp(stamp).why : null;

  return (
    <article
      className={`stamp${done ? ' done' : ''}${checked ? ' checked' : ''}${unknown ? ' unknown' : ''}${skipped ? ' skipped' : ''}${branchClass}${compact ? ' compact' : ''}`}
    >
      <div className="stamp-top">
        <button
          type="button"
          className="stamp-check"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={done ? '完了を解除' : '完了にする'}
          aria-pressed={done}
        >
          {done ? '済' : checked ? '✓' : unknown ? '?' : ''}
        </button>
        <button
          type="button"
          className="stamp-body"
          onClick={() => navigate(`/stamp/${encodeURIComponent(stamp.id)}`)}
        >
          <div>
            <span className="track-pill">{stamp.track}</span>
            <span className="stamp-id">{stamp.id}</span>
            {checked && <span className="status-pill checked">確認済</span>}
            {unknown && <span className="status-pill unknown">わからない</span>}
            {skipped && <span className="skip-pill">スキップ</span>}
          </div>
          <div className="stamp-title">{stamp.title}</div>
          {whyPreview && <div className="stamp-why-preview">{whyPreview}</div>}
          {!compact && (
            <div className="stamp-meta">
              {stamp.who} · {stamp.window}
            </div>
          )}
          {(inLabel || outLabel) && (
            <div className="stamp-money">{[inLabel, outLabel].filter(Boolean).join(' ／ ')}</div>
          )}
          {!compact && stamp.miss && (
            <div className="stamp-miss">MISS: {stamp.miss}</div>
          )}
          <div className="stamp-open">詳細・FAQ →</div>
        </button>
      </div>
    </article>
  );
}
