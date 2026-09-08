import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {LoaderCircle, MessageCircle, Send, X} from 'lucide-react';
import {
  answerDeskQuery,
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
  type ChatMessage,
} from '../lib/desk-chat';
import {askGrokResearch, loadGrokKey} from '../lib/amity-grok';

export type DeskChatPanelProps = {
  open: boolean;
  onClose: () => void;
  onOpenTask: (id: string) => void;
  onGoFind?: (keyword?: string) => void;
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Amityちゃんです。スタンプや手続き・期限・広島の制度、なんでも聞いてね。端末内の検索に加えて、設定にキーがあれば Grok で深掘りするよ。',
  at: 0,
};

const NO_KEY_TIP = '設定に xAI (Grok) APIキーを入れると深掘りできる';

export function DeskChatPanel({open, onClose, onOpenTask, onGoFind}: DeskChatPanelProps) {
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

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, msgs, busy]);

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

    if (!hasKey) return;

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
        const errMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          text: `Grokに聞けなかったよ（${grok.error}）。上の端末内の答えを見てね。キーや通信を設定で確認して。`,
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

  if (!open) return null;

  return (
    <div className="desk-chat" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="desk-chat-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="desk-chat-panel">
        <header className="desk-chat-head">
          <div className="desk-chat-title">
            <img src="./desk-mascot.png" alt="" width={36} height={36} decoding="async" />
            <div>
              <h2 id={titleId}>Amityちゃんに聞く</h2>
              <p>端末内検索 · 任意で Grok 深掘り</p>
            </div>
          </div>
          <div className="desk-chat-head-actions">
            <button type="button" className="desk-chat-textbtn" onClick={reset}>
              履歴クリア
            </button>
            <button type="button" className="desk-chat-iconbtn" onClick={onClose} aria-label="閉じる">
              <X size={18} />
            </button>
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
            placeholder="例：転入届の期限は？／結婚新生活って？"
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
    </div>
  );
}

export default DeskChatPanel;
