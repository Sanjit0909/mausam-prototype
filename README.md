# MAUSAM — Personalised Weather Intelligence

A weather platform built for Smart India Hackathon that adapts its homepage — priority
cards, insights, and recommendations — to each user's selected interests (fitness, travel,
family, agriculture, commuting, marine/beach, events, health), instead of showing everyone
the same generic dashboard.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Recharts + Lucide icons
- **Backend**: Python + FastAPI (weather aggregation, personalization engine, AI assistant)
- **Auth / Database**: Supabase (email/password auth + Postgres with Row Level Security)
- **AI**: Google Gemini (`google-genai` SDK), with an automatic rule-based fallback assistant if no key is configured
- **Weather / Environmental data**: Open-Meteo (forecast, air quality, geocoding, marine, historical archive — all free, no API key required) + US National Weather Service (bonus live alerts, US-only)

## Project Structure

```
Mausam Prototype/
├── backend/            FastAPI app (see backend/app/)
│   ├── app/
│   │   ├── routers/    One file per endpoint group
│   │   ├── services/   External API adapters + business logic (alerts engine, recommendation engine, AI assistant)
│   │   ├── models/     Pydantic response schemas
│   │   └── core/       Shared HTTP client + in-memory TTL cache
│   ├── requirements.txt
│   └── .env            Your local secrets (not committed)
├── frontend/           Next.js app
│   ├── app/            Pages (App Router)
│   ├── components/     UI components grouped by domain
│   ├── lib/             API client, types, Supabase clients, formatters
│   ├── context/        Auth / Preferences / Location React contexts
│   └── .env.local      Your local secrets (not committed)
└── supabase/
    └── schema.sql      Run once in the Supabase SQL editor to create required tables
```

## One-Time Setup

### 1. Supabase database

In your Supabase project dashboard, open **SQL Editor → New Query**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the `preferences` and
`saved_locations` tables with Row Level Security so each user can only read/write their own data.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

Edit `backend/.env` (copy from `.env.example` if missing):

```
GEMINI_API_KEY=your_key_here     # optional — leave blank to use the rule-based fallback assistant
GEMINI_MODEL=gemini-2.5-flash
CORS_ORIGINS=http://localhost:3000
```

Run it:

```bash
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/health` — should return `{"status": "ok", ...}`.

### 3. Frontend

```bash
cd frontend
npm install
```

Edit `frontend/.env.local` (copy from `.env.local.example` if missing):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Run it:

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Core User Flow

Landing → Sign Up → Select Interests (Onboarding) → Personalised Homepage → Search/Change
Location → Weather + Forecast + Environmental Data → Personalised Insights & Recommendations
→ Alerts → AI Weather Assistant.

### Important: Supabase email confirmation

New Supabase projects have **"Confirm email" enabled by default** — after signing up, a user
must click a confirmation link sent to their real inbox before they can log in (the app shows a
"Check your inbox" screen in this case, which is expected, not a bug). For a smooth live demo,
either use a real email you can access, or turn this off for the demo at **Supabase Dashboard →
Authentication → Sign In / Providers → Email → disable "Confirm email"** (re-enable afterwards
for a real deployment).

## Demo Script (suggested order for a live SIH walkthrough)

1. **Landing page** (`/`) — show the persona grid and premium visual design.
2. **Sign up** with a real/demo-accessible email, confirm it, then **log in**.
3. **Onboarding** — select 2–3 interests (e.g. Outdoor Fitness + Health) to show personalization intent.
4. **Homepage** (`/home`) — point out: hero weather, cards reordered by interest (AQI/UV promoted
   for Health), the personalized insight banner, and interest-specific recommendation cards.
5. **Change location** via the header search or `/explore` — search "Mumbai", select it, show the
   homepage and its Marine card (wave height) update — a feature only shown for a coastal city.
6. **Alerts** (`/alerts`) — show a derived advisory (e.g. AQI or heat) with its severity badge and
   the "Advisory" vs "Official (NWS)" source label.
7. **AI Assistant** (`/assistant`) — ask "Should I go for a run today?" and "What should I carry if
   I travel tomorrow?" to show context-aware, real-data-grounded answers.
8. **Profile** (`/profile`) — show interests can be changed anytime, instantly reshaping the homepage.

## Data Honesty Notes

- All current weather, forecast, AQI, marine wave data, and historical data are **real, live
  values** from Open-Meteo — no API key required, verified reachable at build time.
- Severe weather **alerts** are a mix of: (a) official US National Weather Service alerts when
  the selected location is inside the US, labeled `Official (NWS)`, and (b) rule-based
  advisories derived from real live thresholds (heat, high wind, poor AQI, high UV, heavy rain)
  for all other locations — no public, keyless IMD/India-wide alert API exists, so these are
  clearly labeled `Advisory`, never presented as an official government alert.
- **Tide** highs/lows are labeled `Sample data` in the UI — no free, reliable, keyless tide
  prediction API was available in the build window. Wave height/period/swell data next to it
  **is real** (Open-Meteo Marine API).
- **Moonrise/moonset** times are intentionally omitted (not estimated) — accurate values need a
  full lunar ephemeris, out of scope for this prototype. Moon **phase** and **illumination %**
  are real, computed from a standard astronomical formula.
- The **AI assistant** uses Google Gemini when `GEMINI_API_KEY` is configured and valid; if the
  key is missing or a call fails, it automatically falls back to a template-based assistant that
  still uses real, live weather data — the chat UI shows a small "Smart Assistant · offline mode"
  label whenever a reply came from the fallback path.

## Personalization Engine

`backend/app/services/recommendation_engine.py` is a small, explainable rule-based engine (no
ML) that: (1) scores and reorders homepage metric cards based on which of the user's selected
interests prioritize them, (2) generates plain-language insights from live thresholds (UV, AQI,
rain probability, temperature), and (3) generates one recommendation card per selected interest.
The function signatures are intentionally simple so a learned/ML recommender could later replace
the internals without changing any caller.
