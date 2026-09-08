import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {MessageCircle, Send, X} from 'lucide-react';
import {
  answerDeskQuery,
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
  type ChatMessage,
} from '../lib/desk-chat';

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
  text: 'デスクちゃんです。スタンプや手続き・期限・広島の制度、なんでも聞いてね。端末の中だけで答えるよ（通信なし）。',
  at: 0,
};

export function DeskChatPanel({open, onClose, onOpenTask, onGoFind}: DeskChatPanelProps) {
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
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
  }, [open, msgs]);

  useEffect(() => {
    if (msgs.length === 1 && msgs[0].id === 'welcome') return;
    saveChatHistory(msgs);
  }, [msgs]);

  const canSend = useMemo(() => input.trim().length > 0 && input.trim().length <= 200, [input]);

  function ask(raw: string) {
    const q = raw.trim().slice(0, 200);
    if (!q) return;
    const userMsg: ChatMessage = {id: uid(), role: 'user', text: q, at: Date.now()};
    const ans = answerDeskQuery(q);
    const botMsg: ChatMessage = {
      id: uid(),
      role: 'assistant',
      text: ans.text,
      matches: ans.matches,
      suggestedKeywords: ans.suggestedKeywords,
      at: Date.now(),
    };
    setMsgs((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  }

  function onSubmit(e: {preventDefault(): void}) {
    e.preventDefault();
    if (!canSend) return;
    ask(input);
  }

  function reset() {
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
              <h2 id={titleId}>デスクちゃんに聞く</h2>
              <p>オンデバイス検索 · 通信なし</p>
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
                        else ask(k);
                      }}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
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
