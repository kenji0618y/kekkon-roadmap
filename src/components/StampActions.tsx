import { useEffect, useState } from 'react';
import type { ChatMessage, Stamp, StampStatus } from '../types';
import { askTipsFor } from '../lib/askTips';
import { moneyLabel } from '../lib/money';
import { enrichStamp } from '../lib/stampContent';
import { GrokChat } from './GrokChat';

type Props = {
  stamp: Stamp;
  status: StampStatus;
  messages: ChatMessage[];
  onStatus: (s: StampStatus) => void;
  onChat: (messages: ChatMessage[]) => void;
  /** When true, FAQ accordion starts expanded (unknown). */
  forceFaqOpen?: boolean;
};

const STATUS_BTNS: { id: StampStatus; label: string; cls: string }[] = [
  { id: 'checked', label: '確認済', cls: 'st-checked' },
  { id: 'done', label: '完了', cls: 'st-done' },
  { id: 'unknown', label: 'わからない', cls: 'st-unknown' },
  { id: 'todo', label: 'まだ', cls: 'st-todo' },
  { id: 'na', label: '対象外', cls: 'st-na' },
];

export function StampActions({
  stamp,
  status,
  messages,
  onStatus,
  onChat,
  forceFaqOpen,
}: Props) {
  const enriched = enrichStamp(stamp);
  const isUnknown = status === 'unknown' || !!forceFaqOpen;
  const [openFaq, setOpenFaq] = useState<number | null>(isUnknown ? 0 : null);
  const tips = askTipsFor(stamp);
  const inLabel = moneyLabel(stamp.money_in, 'in');
  const outLabel = moneyLabel(stamp.money_out, 'out');
  const moneyLine = [inLabel, outLabel].filter(Boolean).join(' ／ ');

  useEffect(() => {
    if (status === 'unknown') setOpenFaq(0);
  }, [status, stamp.id]);

  return (
    <div className="stamp-actions">
      <div className="status-btn-row" role="group" aria-label="ステータス">
        {STATUS_BTNS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`status-btn ${b.cls}${status === b.id ? ' on' : ''}`}
            aria-pressed={status === b.id}
            onClick={() => onStatus(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>

      <section className="stamp-brief why-block" aria-label="なぜやる">
        <h3 className="stamp-brief-title">なぜやる</h3>
        <p className="stamp-brief-body">{enriched.why}</p>
      </section>

      <section className="stamp-brief steps-block" aria-label="手順">
        <h3 className="stamp-brief-title">手順</h3>
        <ol className="stamp-brief-steps">
          {enriched.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      {(moneyLine || stamp.miss) && (
        <div className="stamp-brief-meta" aria-label="お金とミス">
          {moneyLine && (
            <p className="stamp-brief-money">
              <strong>お金</strong>
              <span>{moneyLine}</span>
            </p>
          )}
          {stamp.miss && (
            <p className="stamp-brief-miss">
              <strong>ミスると</strong>
              <span>{stamp.miss}</span>
            </p>
          )}
        </div>
      )}

      <GrokChat stamp={stamp} messages={messages} onMessages={onChat} />

      {status === 'unknown' && (
        <section className="ask-tips card-soft" aria-label="聞き方">
          <h3 className="ask-tips-title">聞き方（わからないとき）</h3>
          <ol className="ask-tips-list">
            {tips.map((t) => (
              <li key={t.label}>
                <strong>{t.label}</strong>
                <span>{t.text}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={`faq-block${status === 'unknown' ? ' faq-priority' : ''}`}>
        <h3 className="faq-block-title">よくある質問</h3>
        <div className="faq-list">
          {enriched.faq.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={i} className={`faq-item${open ? ' open' : ''}`}>
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : i)}
                >
                  <span>{f.q}</span>
                  <span aria-hidden>{open ? '−' : '+'}</span>
                </button>
                {open && <div className="faq-a">{f.a}</div>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
