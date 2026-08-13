/**
 * Project BEACON — AI Advisor backend.
 * A lightweight NVIDIA proxy that keeps the API key server-side and streams
 * responses to the client. It reuses the core patterns from the Gen-AI Chatbot
 * project — an OpenAI-compatible client + Server-Sent-Events token streaming —
 * without any of the RAG/agent infrastructure (BEACON's "knowledge" is just the
 * computed metrics, passed in as context).
 *
 * Endpoints:
 *   GET  /health        -> { status, model, hasKey }
 *   POST /api/chat      -> SSE stream of { event: 'token'|'done'|'error', data }
 *   POST /api/insight   -> { text } one-shot narrative
 *
 * Env (see .env.example): NVIDIA_API_KEY, NVIDIA_MODEL, NVIDIA_BASE_URL,
 *                         ALLOWED_ORIGIN, PORT
 */
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import 'dotenv/config';

const app = express();
app.use(express.json({ limit: '1mb' }));

const ORIGINS = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((s) => s.trim());
app.use(cors({ origin: ORIGINS }));

const MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct';
const BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const hasKey = () => !!process.env.NVIDIA_API_KEY;

const client = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY || 'missing', baseURL: BASE_URL });

const SYSTEM = `You are the AI Advisor inside "Project BEACON", a capital-budgeting web app for Cardamom & Co., a fictional Dubai specialty-coffee chain choosing which new branch to open.
Rules:
- Answer using ONLY the figures in the provided CONTEXT plus general corporate-finance reasoning.
- Never invent specific numbers that are not in or directly derivable from the context.
- Amounts are in AED. Be concise, plain-language and practical — the reader may be non-financial.
- When relevant, refer to NPV/IRR/PI/payback and the ranking of the three candidate sites.
- If a question is outside this investment analysis, say so briefly.`;

app.get('/health', (_req, res) => res.json({ status: 'ok', model: MODEL, hasKey: hasKey() }));

app.post('/api/chat', async (req, res) => {
  const { messages = [], context = '' } = req.body || {};
  if (!hasKey()) return res.status(503).json({ error: 'NVIDIA_API_KEY not configured' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const stream = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      stream: true,
      messages: [
        { role: 'system', content: `${SYSTEM}\n\nCONTEXT:\n${context}` },
        ...messages.slice(-10),
      ],
    });
    for await (const chunk of stream) {
      const delta = chunk?.choices?.[0]?.delta?.content;
      if (delta) send('token', { text: delta });
    }
    send('done', {});
  } catch (e) {
    send('error', { message: String(e?.message || e) });
  }
  res.end();
});

app.post('/api/insight', async (req, res) => {
  const { context = '' } = req.body || {};
  if (!hasKey()) return res.status(503).json({ error: 'NVIDIA_API_KEY not configured' });
  try {
    const r = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Given this capital-budgeting analysis, write a concise plain-language verdict (4-6 sentences): what the numbers mean, the single biggest risk, and which site to prefer and why.\n\nCONTEXT:\n${context}`,
        },
      ],
    });
    res.json({ text: r?.choices?.[0]?.message?.content || '' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`BEACON advisor backend listening on :${PORT} (model ${MODEL}, key ${hasKey() ? 'set' : 'MISSING'})`));
