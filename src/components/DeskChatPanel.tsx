import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {LoaderCircle, MessageCircle, Send, X} from 'lucide-react';
import {toast} from 'sonner';
import {
  answerDeskQuery,
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
  type ChatMessage,
} from '../lib/desk-chat';
import {askGrokResearch, GROK_CREDITS_CONSOLE_URL, GROK_CREDITS_LIMIT_JA, hasBundledGrokKey, isGrokCreditsLimitResult, loadGrokKey} from '../lib/amity-grok';
import {markGrokLocalOnly, readGrokLocalOnlyFlag, GROK_MODE_EVENT} from '../lib/grok-mode';

export type DeskChatPanelProps = {
  open: boolean;
  onClose: () => void;
  onOpenTask: (id: string) => void;
  onGoFind?: (keyword?: string) => void;
  /** When true, render as full in-page panel (no modal/backdrop). */
  embedded?: boolean;
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Amityちゃんです。スタンプや手続き・期限・広島の制度、なんでも聞いてね。端末内の検索に加えて、キーがあれば Grok で深掘りするよ。',
  at: 0,
};

const NO_KEY_TIP = '設定に xAI (Grok) APIキーを入れると深掘りできる（バンドル済みなら不要）';

export function DeskChatPanel({open, onClose, onOpenTask, onGoFind, embedded = false}: DeskChatPanelProps) {
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>(() => {
    const saved = loadChatHistory();
    return saved.length ? saved : [WELCOME];
  });
  const [localOnly, setLocalOnly] = useState(() => !loadGrokKey() || !!readGrokLocalOnlyFlag());

  useEffect(() => {
    const sync = () => setLocalOnly(!loadGrokKey() || !!readGrokLocalOnlyFlag());
    sync();
    window.addEventListener(GROK_MODE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(GROK_MODE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [open]);

  useEffect(() => {
    if (!open && !embedded) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open, embedded]);

  useEffect(() => {
    if (!open && !embedded) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, embedded, msgs, busy]);

  useEffect(() => {
    if (msgs.length === 1 && msgs[0].id === 'welcome') return;
    saveChatHistory(msgs);
  }, [msgs]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const canSend = useMemo(
    () => !busy && input.trim().length > 0 && input.trim().length <= 200,
    [input, busy],
  );

  async function ask(raw: string) {
    const q = raw.trim().slice(0, 200);
    if (!q || busy) return;
    const userMsg: ChatMessage = {id: uid(), role: 'user', text: q, at: Date.now()};
    const ans = answerDeskQuery(q);
    const localText = ans.text;
    const hasKey = !!loadGrokKey();

    const localMsg: ChatMessage = {
      id: uid(),
      role: 'assistant',
      text: hasKey
        ? localText
        : `${localText}\n\n💡 ${NO_KEY_TIP}`,
      matches: ans.matches,
      suggestedKeywords: ans.suggestedKeywords,
      at: Date.now(),
    };
    setMsgs((prev) => [...prev, userMsg, localMsg]);
    setInput('');

    if (!hasKey) {
      markGrokLocalOnly('no-key');
      setLocalOnly(true);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    try {
      const localContext = [
        localText,
        ans.matches.length
          ? `候補項目：${ans.matches.map((m) => `${m.title} — ${m.snippet}`).join(' / ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
      const grok = await askGrokResearch(q, localContext, ac.signal);
      if (ac.signal.aborted) return;
      if (grok.ok) {
        const grokMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          text: `🔎 Grok調べ：\n${grok.text}`,
          at: Date.now(),
        };
        setMsgs((prev) => [...prev, grokMsg]);
      } else if (grok.error !== 'aborted' && grok.error !== 'no-key') {
        const credits = isGrokCreditsLimitResult(grok.error);
        if (credits) {
          markGrokLocalOnly('credits-limit');
          setLocalOnly(true);
        }
        const chatText = credits
          ? `${GROK_CREDITS_LIMIT_JA}\n\nクレジットを増やす（アプリでは購入不可）→ ${GROK_CREDITS_CONSOLE_URL}`
          : `Grokに聞けなかったよ（${grok.error}）。上の端末内の答えを見てね。キーや通信を設定で確認して。`;
        toast.error(credits ? GROK_CREDITS_LIMIT_JA : `Grokに聞けなかったよ（${grok.error}）`, {
          duration: 7000,
        });
        const errMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          text: chatText,
          at: Date.now(),
        };
        setMsgs((prev) => [...prev, errMsg]);
      }
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
      setBusy(false);
    }
  }

  function onSubmit(e: {preventDefault(): void}) {
    e.preventDefault();
    if (!canSend) return;
    void ask(input);
  }

  function reset() {
    abortRef.current?.abort();
    setBusy(false);
    clearChatHistory();
    setMsgs([{...WELCOME, at: Date.now()}]);
  }

  if (!embedded && !open) return null;

  const keyHint = loadGrokKey()
    ? hasBundledGrokKey()
      ? '端末内検索 · Grok 深掘り（バンドルまたは設定）'
      : '端末内検索 · Grok 深掘り'
    : '端末内検索 · 設定で Grok キー可';

  const panel = (
    <div className={`desk-chat-panel${embedded ? ' embedded' : ''}`}>
      <header className="desk-chat-head">
        <div className="desk-chat-title">
          <img src="./desk-mascot.png" alt="" width={36} height={36} decoding="async" />
          <div>
            <h2 id={titleId}>Amityちゃんに聞く</h2>
            <p>{keyHint}</p>
            {localOnly && (
              <span className="desk-local-only-chip chat-chip" title="Grok深掘りなし・端末内案内のみ">
                端末内のみモード
                {' '}
                <a className="desk-credits-link" href={GROK_CREDITS_CONSOLE_URL} target="_blank" rel="noopener noreferrer">
                  クレジットを増やす（xAI）
                </a>
              </span>
            )}
          </div>
        </div>
        <div className="desk-chat-head-actions">
          <button type="button" className="desk-chat-textbtn" onClick={reset}>
            履歴クリア
          </button>
          {!embedded && (
            <button type="button" className="desk-chat-iconbtn" onClick={onClose} aria-label="閉じる">
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      <div className="desk-chat-list" ref={listRef} role="log" aria-live="polite">
        {msgs.map((m) => (
          <div key={m.id} className={`desk-chat-bubble ${m.role}`}>
            <p>{m.text}</p>
            {!!m.matches?.length && (
              <ul className="desk-chat-matches">
                {m.matches.map((hit) => (
                  <li key={hit.id}>
                    <button type="button" onClick={() => onOpenTask(hit.id)}>
                      <strong>{hit.title}</strong>
                      <span>{hit.snippet}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!!m.suggestedKeywords?.length && (
              <div className="desk-chat-suggest">
                <span>探すタブの例：</span>
                {m.suggestedKeywords.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (onGoFind) onGoFind(k);
                      else void ask(k);
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="desk-chat-bubble assistant desk-chat-loading" role="status">
            <LoaderCircle size={14} className="spin" aria-hidden />
            <span>AmityがGrokで調べてる…</span>
          </div>
        )}
      </div>

      <form className="desk-chat-compose" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="desk-chat-input">
          質問
        </label>
        <input
          id="desk-chat-input"
          ref={inputRef}
          value={input}
          maxLength={200}
          placeholder="例：転入届の期限は？／児童手当って？"
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
          disabled={busy}
        />
        <button type="submit" disabled={!canSend} aria-label="送信">
          <Send size={16} />
        </button>
      </form>
      <p className="desk-chat-foot">
        <MessageCircle size={12} aria-hidden /> 金額の円は捏造しない · 結婚新生活は賞品扱いしない
      </p>
    </div>
  );

  if (embedded) {
    return (
      <div className="desk-chat desk-chat-embedded" role="region" aria-labelledby={titleId}>
        {panel}
      </div>
    );
  }

  return (
    <div className="desk-chat" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="desk-chat-backdrop" onClick={onClose} aria-hidden="true" />
      {panel}
    </div>
  );
}

export default DeskChatPanel;
