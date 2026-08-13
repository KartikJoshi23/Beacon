# Project BEACON — AI-Powered Capital Budgeting

An investment-appraisal web app for **Cardamom & Co.** (a Dubai specialty-coffee chain) deciding **which new branch to open**. It takes the standard capital-budgeting inputs, computes **13 measures** (NPV, IRR, MIRR, PI, payback, discounted payback, ARR, break-even, sensitivity, scenarios…), ranks mutually-exclusive alternatives, and includes an **AI Advisor** (NVIDIA-hosted LLM) that explains results and answers questions grounded in the live numbers.

**Stack:** React + Vite · Three.js / react-three-fiber (WebGL hero) · Framer Motion · pure client-side finance engine (independently verified) · Node/Express backend proxying the NVIDIA API (streaming chat).

---

## 1. Run locally

Two processes: the **frontend** (Vite) and the optional **AI backend** (Express). The app works fully without the backend — the AI Advisor just falls back to an offline engine.

**Frontend**
```bash
cd project-prometheus
npm install
npm run dev            # http://localhost:5173
```

**AI backend (optional — enables live chat)**
```bash
cd project-prometheus/server
cp .env.example .env   # then put your NVIDIA key in .env
npm install
npm start              # http://localhost:8787
```
Get a free NVIDIA key at https://build.nvidia.com. The frontend auto-targets `http://localhost:8787` in dev.

Verify the engine (no browser needed):
```bash
cd project-prometheus
npm run verify         # 19/19 checks
```

---

## 2. Environment variables

**Backend (`server/.env`)**

| Variable | Required | Example |
|---|---|---|
| `NVIDIA_API_KEY` | yes | `nvapi-…` |
| `NVIDIA_MODEL` | no | `meta/llama-3.1-8b-instruct` (fast, default) |
| `NVIDIA_BASE_URL` | no | `https://integrate.api.nvidia.com/v1` |
| `ALLOWED_ORIGIN` | yes (prod) | your Vercel URL, comma-separated |
| `PORT` | no | Render sets this automatically |

**Frontend (`.env` / Vercel env)**

| Variable | Required | Example |
|---|---|---|
| `VITE_API_URL` | prod | `https://beacon-advisor.onrender.com` |

> ⚠️ Never put your real key in `.env.example` (it's committed). It goes in `.env`, which is git-ignored.

---

## 3. Deploy

Deploy the **backend first** (to get its URL), then the **frontend**, then point them at each other.

### 3a. Backend → Render (free)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/KartikJoshi23/Beacon)

One click uses `render.yaml`. Or set it up manually — **New → Web Service → connect the `Beacon` repo**, then enter exactly:

| Field | Value |
|---|---|
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/health` |
| **Instance Type** | Free |

Then add **Environment** variables: `NVIDIA_API_KEY` = your key, `NVIDIA_MODEL` = `meta/llama-3.1-8b-instruct`, and `ALLOWED_ORIGIN` = your Vercel URL (fill in after step 3b). Deploy → you get e.g. `https://beacon-advisor.onrender.com`. Confirm it's up: open `https://…onrender.com/health` → `{"status":"ok","hasKey":true}`.

> Free Render services sleep after inactivity; the first request after idling takes ~30s to wake. The app shows a graceful "connecting…" state and falls back offline if needed.

### 3b. Frontend → Vercel (free)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/KartikJoshi23/Beacon&project-name=beacon&env=VITE_API_URL)

Or manually — **New Project → import the `Beacon` repo**:

| Field | Value |
|---|---|
| **Framework Preset** | Vite (auto-detected via `vercel.json`) |
| **Root Directory** | `./` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Environment Variable** | `VITE_API_URL` = your Render URL from 3a |

Deploy → you get e.g. `https://beacon-xxxx.vercel.app`.

### 3c. Connect them

Back in **Render → your service → Environment**, set `ALLOWED_ORIGIN` to your Vercel URL (e.g. `https://beacon-xxxx.vercel.app`) and save (it redeploys). Done — open the Vercel URL and the floating **✦ Ask the Advisor** shows a green **LIVE** pill.

---

## 4. Project layout

```
project-prometheus/
├─ src/
│  ├─ lib/finance.js       # verified capital-budgeting engine (pure)
│  ├─ lib/context.js       # grounding context for the AI (per tab / whole model)
│  ├─ data/scenario.js     # Cardamom & Co. dataset (3 candidate sites)
│  ├─ components/          # tabs, charts, HeroScene (WebGL), FloatingChat …
│  └─ App.jsx
├─ scripts/verify.mjs      # independent verification harness
├─ server/                 # Express → NVIDIA proxy (streaming chat)
├─ render.yaml             # Render blueprint (backend)
├─ vercel.json             # Vercel config (frontend)
└─ screenshots/            # report figures
```

Author: **Kartik Joshi** — Masters in AI with Business.
