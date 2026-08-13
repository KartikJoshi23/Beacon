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
| `ALLOWED_ORIGIN` | no (optional) | leave unset to allow all origins |
| `PORT` | no | Render sets this automatically |

**Frontend (`.env` / Vercel env)**

| Variable | Required | Example |
|---|---|---|
| `VITE_API_URL` | prod | `https://beacon-advisor.onrender.com` |

> ⚠️ Never put your real key in `.env.example` (it's committed). It goes in `.env`, which is git-ignored.

---

## 3. Deploy (free, ~5 minutes)

Two deploys: the **backend** on Render, then the **frontend** on Vercel. You add exactly **one variable in each** — nothing else.

> **What "environment variable" means here:** a name/value pair you type into the host's dashboard. You'll add `NVIDIA_API_KEY` on Render (value = your `nvapi-…` key) and `VITE_API_URL` on Vercel (value = your Render URL).

### Step 1 — Backend on Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/KartikJoshi23/Beacon)

1. Click the button → sign in with GitHub → it auto-configures everything from `render.yaml` (root dir, build, start command).
2. It shows **one empty field, `NVIDIA_API_KEY`** — paste your `nvapi-…` key there.
3. Click **Apply / Deploy**. When it's live you get a URL like `https://beacon-advisor.onrender.com`. **Copy it.**
4. (Optional check) open `https://…onrender.com/health` → you should see `{"status":"ok","hasKey":true}`.

<details><summary>Prefer to set it up by hand instead of the button?</summary>

New → Web Service → connect the `Beacon` repo, then set: **Root Directory** = `server`, **Build Command** = `npm install`, **Start Command** = `npm start`, **Instance Type** = Free. Then under **Environment → Add Environment Variable**: Key = `NVIDIA_API_KEY`, Value = your `nvapi-…` key. Deploy.
</details>

> Free Render services sleep after ~15 min idle; the first request then takes ~30s to wake (the chat shows "connecting…" and falls back offline meanwhile).

### Step 2 — Frontend on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/KartikJoshi23/Beacon&project-name=beacon&env=VITE_API_URL)

1. Click the button → sign in with GitHub → it imports the repo (Vite auto-detected via `vercel.json`).
2. It asks for **one variable, `VITE_API_URL`** — paste the Render URL from Step 1 (e.g. `https://beacon-advisor.onrender.com`).
3. Click **Deploy**. You get a URL like `https://beacon-xxxx.vercel.app` — that's your live app.

That's the whole thing. Open the Vercel URL; the floating **✦ Ask the Advisor** will show a green **LIVE** pill. **No CORS / `ALLOWED_ORIGIN` step** — the backend accepts your frontend by default.

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
