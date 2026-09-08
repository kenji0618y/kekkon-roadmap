import type { Stamp, StampStatus } from '../types';
import { shortStampLabel } from '../lib/askTips';

type Props = {
  stamp: Stamp;
  status: StampStatus;
  onPress: () => void;
  dimmed?: boolean;
};

export function StampPad({ stamp, status, onPress, dimmed }: Props) {
  const label = shortStampLabel(stamp);
  const st = status || 'todo';
  return (
    <button
      type="button"
      className={`stamp-pad press-depth st-${st}${dimmed ? ' pad-dimmed' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
      aria-label={`${stamp.title}（${statusLabel(st)}）`}
    >
      <span className="stamp-pad-mark" aria-hidden>
        {st === 'done' ? (
          '済'
        ) : st === 'checked' ? (
          <span className="check-blue" />
        ) : st === 'unknown' ? (
          '?'
        ) : st === 'na' ? (
          '—'
        ) : (
          ''
        )}
      </span>
      <span className="stamp-pad-label">{label}</span>
    </button>
  );
}

function statusLabel(st: StampStatus): string {
  switch (st) {
    case 'done':
      return '完了';
    case 'checked':
      return '確認済';
    case 'unknown':
      return 'わからない';
    case 'na':
      return '対象外';
    default:
      return '未着手';
  }
}
