import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { streamChat, backendHealth } from '../lib/chat.js';
import { buildAdvisorContext, buildTabContext, TAB_LABELS, SUGGESTED_QUESTIONS } from '../lib/context.js';
import './FloatingChat.css';

export default function FloatingChat({ activeTab, ...data }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState('tab'); // 'tab' | 'model'
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState(undefined);
  const logRef = useRef(null);

  useEffect(() => {
    let alive = true;
    backendHealth().then((h) => alive && setHealth(h));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const context = useMemo(
    () => (scope === 'model' ? buildAdvisorContext(data) : buildTabContext(activeTab, data)),
    [scope, activeTab, data]
  );

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
            `⚠️ Live chat isn’t reachable. Run the backend (server/) with a free NVIDIA API key to enable live answers — the rest of the app works offline.`,
        };
        return c;
      });
    } finally {
      setBusy(false);
    }
  }

  const clear = () => setMessages([]);

  const pill = (() => {
    if (health === undefined) return { cls: 'checking', text: 'connecting…' };
    if (!health) return { cls: 'off', text: 'offline' };
    if (!health.hasKey) return { cls: 'off', text: 'no key' };
    return { cls: 'live', text: 'live' };
  })();

  return (
    <>
      <motion.button
        className={`fc-fab ${open ? 'fc-fab--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close advisor chat' : 'Open advisor chat'}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
      >
        {open ? '✕' : '✦'}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fc glass-strong"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="fc__head">
              <div className="fc__head-l">
                <span className="fc__title">Ask the Advisor</span>
                <span className={`fc__pill fc__pill--${pill.cls}`}>{pill.text}</span>
              </div>
              <div className="fc__head-r">
                <button className="fc__icon" title="Clear chat" onClick={clear} disabled={!messages.length}>⌫</button>
                <button className="fc__icon" title="Close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            <div className="fc__scope">
              <span className="fc__scope-label">Answer about:</span>
              <div className="fc__seg">
                <button className={scope === 'tab' ? 'on' : ''} onClick={() => setScope('tab')}>
                  This tab
                </button>
                <button className={scope === 'model' ? 'on' : ''} onClick={() => setScope('model')}>
                  Whole model
                </button>
              </div>
              {scope === 'tab' && <span className="fc__ctx mono">{TAB_LABELS[activeTab] || activeTab}</span>}
            </div>

            <div className="fc__log" ref={logRef}>
              {messages.length === 0 && (
                <div className="fc__empty">
                  <p className="muted">
                    Ask about {scope === 'tab' ? `the ${TAB_LABELS[activeTab] || 'current'} view` : 'the whole appraisal'} — grounded in the live numbers.
                  </p>
                  <div className="fc__suggest">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button key={q} className="fc__chip" onClick={() => ask(q)} disabled={busy}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`fc__msg fc__msg--${msg.role} ${msg.error ? 'fc__msg--error' : ''}`}>
                  {msg.role === 'assistant' && <span className="fc__who mono">Advisor</span>}
                  <div className="fc__bubble">
                    {msg.content}
                    {busy && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && (
                      <span className="fc__typing"><i /><i /><i /></span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form
              className="fc__composer"
              onSubmit={(e) => {
                e.preventDefault();
                ask(draft);
              }}
            >
              <textarea
                rows={1}
                value={draft}
                placeholder="Ask a question…"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    ask(draft);
                  }
                }}
                disabled={busy}
              />
              <button type="submit" className="btn btn-primary fc__send" disabled={busy || !draft.trim()}>
                {busy ? '…' : '➤'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
