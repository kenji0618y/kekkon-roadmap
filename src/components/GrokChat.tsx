import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, Stamp } from '../types';
import { answerAsGrok } from '../lib/grokAnswer';

type Props = {
  stamp: Stamp;
  messages: ChatMessage[];
  onMessages: (next: ChatMessage[]) => void;
};

export function GrokChat({ stamp, messages, onMessages }: Props) {
  const [input, setInput] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.at.localeCompare(b.at)),
    [messages],
  );

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sorted.length, stamp.id]);

  function send() {
    const text = input.trim();
    if (!text) return;
    const now = new Date().toISOString();
    const userMsg: ChatMessage = { role: 'user', text, at: now };
    const reply: ChatMessage = {
      role: 'grok',
      text: answerAsGrok(stamp, text),
      at: new Date(Date.now() + 1).toISOString(),
    };
    onMessages([...messages, userMsg, reply]);
    setInput('');
  }

  return (
    <section className="grok-chat" aria-label="Grokに質問">
      <h3 className="grok-chat-title">Grokに質問</h3>
      <div className="grok-chat-panel" ref={scroller}>
        {sorted.length === 0 && (
          <p className="grok-chat-empty muted micro">
            このスタンプの why / 手順 / FAQ / 金額（記載のみ）に基づいて答えます。円は推測しません。
          </p>
        )}
        {sorted.map((m, i) => (
          <div key={`${m.at}-${i}`} className={`grok-bubble ${m.role}`}>
            <span className="grok-bubble-role">{m.role === 'user' ? 'あなた' : 'Grok'}</span>
            <div className="grok-bubble-text">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="grok-chat-input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              send();
            }
          }}
          placeholder="例：いつまでに？金額は？"
          aria-label="Grokへの質問"
        />
        <button type="button" className="btn primary grok-send" onClick={send}>
          送信
        </button>
      </div>
    </section>
  );
}
