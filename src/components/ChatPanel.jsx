import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { streamChat, backendHealth } from '../lib/chat.js';
import { buildAdvisorContext, SUGGESTED_QUESTIONS } from '../lib/context.js';
import './ChatPanel.css';

export default function ChatPanel({ input, metrics, comparison, currentName }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState(undefined); // undefined=checking, null=offline, obj=up
  const scrollRef = useRef(null);

  const context = useMemo(
    () => buildAdvisorContext({ input, metrics, comparison, currentName }),
    [input, metrics, comparison, currentName]
  );

  useEffect(() => {
    let alive = true;
    backendHealth().then((h) => alive && setHealth(h));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function ask(text) {
    const q = (text ?? '').trim();
    if (!q || busy) return;
    const base = [...messages, { role: 'user', content: q }];
    setMessages([...base, { role: 'assistant', content: '' }]);
    setDraft('');
    setBusy(true);
    let acc = '';
    try {
      for await (const ev of streamChat(base, context)) {
        if (ev.event === 'token') {
          acc += ev.data.text || '';
          setMessages((m) => {
            const c = [...m];
            c[c.length - 1] = { role: 'assistant', content: acc };
            return c;
          });
        } else if (ev.event === 'error') {
          throw new Error(ev.data.message || 'stream error');
        } else if (ev.event === 'done') {
          break;
        }
      }
      if (!acc) throw new Error('no response');
    } catch (e) {
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = {
          role: 'assistant',
          error: !acc,
          content:
            acc ||
            `⚠️ Live chat isn’t reachable right now. The AI Advisor summary above works fully offline. To enable live answers, run the backend (server/) with a free NVIDIA API key.`,
        };
        return c;
      });
    } finally {
      setBusy(false);
    }
  }

  const statusPill = () => {
    if (health === undefined) return { cls: 'checking', text: 'checking backend…' };
    if (!health) return { cls: 'off', text: 'offline · run backend for live chat' };
    if (!health.hasKey) return { cls: 'off', text: 'backend up · NVIDIA key not set' };
    return { cls: 'live', text: `live · NVIDIA ${health.model}` };
  };
  const pill = statusPill();

  return (
    <div className="chat glass hairline">
      <div className="chat__head">
        <div className="chat__title">
          <span className="chat__spark" aria-hidden>✦</span> Ask the Advisor
        </div>
        <span className={`chat__status chat__status--${pill.cls}`}>{pill.text}</span>
      </div>

      <div className="chat__log" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat__empty">
            <p className="muted">
              Ask anything about this appraisal — grounded in the current numbers. For example:
            </p>
            <div className="chat__suggest">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button key={q} className="chat__chip" onClick={() => ask(q)} disabled={busy}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            className={`chat__msg chat__msg--${msg.role} ${msg.error ? 'chat__msg--error' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {msg.role === 'assistant' && <span className="chat__who mono">Advisor</span>}
            <div className="chat__bubble">
              {msg.content}
              {busy && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && (
                <span className="chat__typing"><i /><i /><i /></span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <form
        className="chat__composer"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
      >
        <textarea
          rows={1}
          value={draft}
          placeholder="Ask about NPV, the site ranking, risks…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              ask(draft);
            }
          }}
          disabled={busy}
        />
        <button type="submit" className="btn btn-primary chat__send" disabled={busy || !draft.trim()}>
          {busy ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
