/**
 * chat.js — client for the BEACON advisor backend.
 * Adapted from the Gen-AI Chatbot's SSE consumer (async-generator, buffer
 * draining, CRLF-safe). Streams tokens from POST /api/chat.
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export async function backendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    if (!res.ok) return null;
    return await res.json(); // { status, model, hasKey }
  } catch {
    return null;
  }
}

/** Yields { event: 'token'|'done'|'error', data } as the backend streams. */
export async function* streamChat(messages, context) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`chat HTTP ${res.status} ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const parseBlock = (raw) => {
    let event = 'message';
    let data = '';
    for (const line of raw.split('\n')) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).replace(/^ /, '');
    }
    if (!data) return null;
    try {
      return { event, data: JSON.parse(data) };
    } catch {
      return null;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const parsed = parseBlock(raw);
      if (parsed) yield parsed;
    }
  }
}
