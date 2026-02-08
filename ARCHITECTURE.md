# FamilyCal - Architecture Reference

> This document is designed for AI agents (Claude, Gemini, etc.) to quickly understand the codebase, deployment topology, and operational workflows.

## Project Overview

**FamilyCal** is an AI-powered family calendar application that lets families manage events, shopping lists, to-dos, and chores through natural language (text and voice). It uses multiple AI models for intent parsing, event discovery, and adaptive learning.

- **Repo**: `https://github.com/ankur-commits/calendarapp.git`
- **Active Branch**: `staging` (deployed), `main` (stable)
- **CI**: GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main` and `staging`

---

## Deployment Topology

```
                    ┌──────────────────────────────┐
                    │      GitHub Repository        │
                    │  ankur-commits/calendarapp    │
                    │  Branches: main, staging      │
                    └──────────┬───────────────────┘
                               │ git push
                    ┌──────────┴───────────────────┐
                    │    GitHub Actions CI          │
                    │    .github/workflows/ci.yml   │
                    │    - pytest (backend)         │
                    │    - vitest (frontend)        │
                    └──────┬──────────┬────────────┘
                           │          │
              ┌────────────▼──┐  ┌────▼─────────────┐
              │   Railway     │  │   Vercel          │
              │   (Backend)   │  │   (Frontend)      │
              └───────────────┘  └──────────────────┘
```

### Backend - Railway

| Property | Value |
|----------|-------|
| **Platform** | Railway |
| **Project** | `gregarious-youth` |
| **Service** | `calendar-backend` |
| **Environment** | `staging` |
| **Runtime** | Python 3.12 |
| **Public URL** | `https://calendar-backend-staging.up.railway.app` |
| **Internal URL** | `calendar-backend.railway.internal` |
| **Start Command** | `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT` (Procfile) |
| **Database** | PostgreSQL on Railway (`calendar-db.railway.internal:5432/railway`) |
| **Deploy Trigger** | Git push to `staging` branch |

**Railway Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Railway)
- `OPENAI_API_KEY` - For Whisper STT + GPT-4o-mini NLP
- `GEMINI_API_KEY` - For Gemini 2.0 Flash event search + multi-intent
- `TICKETMASTER_API_KEY` - For real event discovery
- `EVENTBRITE_API_KEY` - For Eventbrite scraping
- `PYTHON_VERSION` - 3.12.0

### Frontend - Vercel

| Property | Value |
|----------|-------|
| **Platform** | Vercel |
| **Project ID** | `prj_HlamSfx3cx9cGKdiYwx8Zw5f1pcV` |
| **Org** | `team_CjSzm8a3vifUQwMLRwgef8Oy` (ankur-sanghis-projects) |
| **Project Name** | `calendarapp` |
| **Framework** | Next.js 16 |
| **Root Directory** | `frontend/` |
| **Deploy Trigger** | Git push to `staging` branch |

**Vercel Environment Variables:**
- `NEXT_PUBLIC_API_URL` = `https://calendar-backend-staging.up.railway.app`

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Vercel)                                   │
│                  Next.js 16 / React 19 / TypeScript / Tailwind CSS v4       │
│                                                                              │
│  App Router Pages:                     UI Components:                        │
│  /           → Dashboard + Calendar    AuthGuard (JWT token guard)           │
│  /login      → Login form              DashboardLayout (app shell)           │
│  /signup     → Registration             ├─ Sidebar (nav + UserSwitcher)      │
│  /onboarding → Family create/join       └─ Main Content                      │
│  /invite     → Accept family invite         ├─ CalendarView (react-big-cal)  │
│  /settings   → User preferences            ├─ TimelineView (list view)      │
│  /analytics  → Family analytics             ├─ VoiceInput (mic → audio)     │
│  /shopping   → Shopping list                ├─ EventAssistant (AI panel)     │
│  /todos      → To-do list                  ├─ AddEventModal (create/edit)   │
│  /forgot-password                           ├─ ActionCard (AI suggestions)   │
│  /reset-password                            └─ LocationAutocomplete          │
│                                                                              │
│  Key Libraries: axios, react-big-calendar, date-fns, lucide-react, clsx     │
│  Testing: Vitest + @testing-library/react                                    │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │ HTTPS (axios)
                                │ NEXT_PUBLIC_API_URL
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Railway)                                    │
│                  FastAPI / Python 3.12 / SQLAlchemy / Alembic                │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  app/main.py — FastAPI app, CORS (allow all), Alembic auto-migrate    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Auth (app/auth.py):               API Routes (app/routes/):                │
│  - JWT HS256, 30min expiry         /api/auth/*       → auth.py              │
│  - Argon2 password hashing           token, register, dev-login,            │
│  - OAuth2 Bearer scheme               reset-password, setup-invite, /me     │
│                                    /api/events/*     → events.py            │
│                                      CRUD + commute calc (LogisticsService) │
│                                    /api/voice/*      → voice.py             │
│                                      POST /process (audio→Whisper→NLP)      │
│                                    /api/assistant/*  → assistant.py          │
│                                      POST /search (Gemini+Google Search)    │
│                                      POST /interact (multi-intent AI)       │
│                                      POST /learn (feedback loop)            │
│                                    /api/users/*      → users.py             │
│                                      CRUD (family-scoped via auth)          │
│                                    /api/families/*   → families.py          │
│                                      create, invite, join-request           │
│                                    /api/shopping/*   → shopping.py          │
│                                      CRUD + toggle bought                   │
│                                    /api/todos/*      → todos.py             │
│                                      CRUD                                   │
│                                                                              │
│  Services (app/services/):                                                   │
│  ┌─────────────────┬──────────────────┬──────────────────┐                  │
│  │ nlp.py          │ ai_learning.py   │ classifier.py    │                  │
│  │ OpenAI GPT-4o-  │ Gemini 2.0 Flash │ OpenAI GPT-4o-  │                  │
│  │ mini: parse     │ Multi-intent     │ mini: categorize │                  │
│  │ stream-of-      │ parsing + user   │ events into      │                  │
│  │ consciousness   │ profile context  │ 10 categories    │                  │
│  │ text → JSON     │ + confidence     │                  │                  │
│  │ + Whisper STT   │ learning loop    │                  │                  │
│  ├─────────────────┼──────────────────┼──────────────────┤                  │
│  │ ticketmaster.py │ logistics.py     │                  │                  │
│  │ Real event      │ Drive time /     │                  │                  │
│  │ discovery via   │ geocoding        │                  │                  │
│  │ Ticketmaster    │ (mock - swap     │                  │                  │
│  │ Discovery API   │ for Google Maps) │                  │                  │
│  └─────────────────┴──────────────────┴──────────────────┘                  │
│                                                                              │
│  Data Layer:                                                                 │
│  database.py → SQLAlchemy (SQLite local / PostgreSQL prod via DATABASE_URL) │
│  models.py   → Family, User, Event, event_attendees (M2M),                 │
│                Chore, ShoppingItem, ToDo, UserProfileAttribute              │
│  schemas.py  → Pydantic request/response models                             │
│  alembic/    → Database migrations                                           │
│                                                                              │
│  Testing: pytest + httpx (backend/tests/)                                    │
│    test_auth.py, test_events.py, test_users.py,                             │
│    test_family_flow.py, test_features.py                                     │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE (Railway PostgreSQL)                        │
│  Host: calendar-db.railway.internal:5432                                     │
│  Database: railway                                                           │
│                                                                              │
│  Tables:                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐                       │
│  │ families │◄──┤  users   │◄──┤ event_attendees  │ (M2M join)             │
│  └──────────┘    └────┬─────┘    └────────┬─────────┘                       │
│                       │                    │                                  │
│  ┌──────────┐    ┌────▼─────┐    ┌────────▼─────────┐                       │
│  │  chores  │    │  events  │    │ shopping_items   │                       │
│  └──────────┘    └──────────┘    └──────────────────┘                       │
│                                                                              │
│  ┌──────────────────────────┐    ┌──────────┐                               │
│  │ user_profile_attributes  │    │  todos   │                               │
│  │ (AI learned preferences) │    │          │                               │
│  └──────────────────────────┘    └──────────┘                               │
└──────────────────────────────────────────────────────────────────────────────┘

                          EXTERNAL SERVICES

┌────────────────────┐  ┌──────────────────────┐  ┌────────────────────────┐
│  OpenAI API        │  │  Google Gemini API    │  │  Ticketmaster API      │
│  - Whisper (STT)   │  │  - Gemini 2.0 Flash  │  │  - Discovery v2        │
│  - GPT-4o-mini     │  │  - Google Search tool │  │  - Event search        │
│    (NLP, classify) │  │  - JSON response mode │  │  - Venue, pricing      │
└────────────────────┘  └──────────────────────┘  └────────────────────────┘
```

---

## Key Data Flows

### 1. Voice Input Flow
```
User speaks → browser MediaRecorder → audio/webm blob
  → POST /api/voice/process (multipart, Bearer JWT)
    → OpenAI Whisper transcription
    → nlp.py: GPT-4o-mini parses transcript → { events, chores, shopping_items }
  → Frontend opens AddEventModal pre-filled with first event
```

### 2. AI Assistant (Text) Flow
```
User types "Soccer practice Tuesday and buy milk"
  → POST /api/assistant/interact { query, user_id }
    → ai_learning.py: loads UserProfileAttributes for context
    → Gemini 2.0 Flash parses into { events, shopping_list, todos }
  → Frontend renders ActionCards
  → User clicks "Add" on each card → respective CRUD API
```

### 3. Event Search Flow
```
User types "concerts this weekend"
  → POST /api/assistant/search { query }
    → Gemini 2.0 Flash + Google Search grounding tool
    → Returns real events with ticket URLs, venues, pricing
  → Frontend renders event suggestion cards
```

### 4. AI Learning Feedback Loop
```
User confirms/modifies an event
  → POST /api/assistant/learn { user_id, user_input, actual_action }
    → ai_learning.py: updates UserProfileAttribute confidence scores
    → Next query for this user includes learned preferences as context
```

### 5. Auth Flow
```
Register: POST /api/auth/register → Argon2 hash → DB
Login:    POST /api/auth/token → verify password → JWT (30min)
Guard:    Frontend AuthGuard checks localStorage token
          → GET /api/auth/me → if no family_id → redirect /onboarding
Family:   POST /api/families/ (create) or /api/families/invite (invite via token)
```

---

## File Structure Reference

```
Calendar App/
├── .github/workflows/ci.yml       # GitHub Actions: pytest + vitest
├── .agent/workflows/
│   ├── deploy.md                   # Agent workflow: commit & push
│   └── troubleshoot.md             # Agent workflow: logs → fix → deploy
├── render.yaml                     # Legacy Render config (not active)
├── backend/
│   ├── Procfile                    # Railway start command
│   ├── requirements.txt            # Python deps (20 packages)
│   ├── alembic.ini                 # Alembic config
│   ├── alembic/                    # DB migrations
│   ├── .env                        # Local env vars (gitignored)
│   ├── app/
│   │   ├── main.py                 # FastAPI app setup + route registration
│   │   ├── auth.py                 # JWT + Argon2 auth module
│   │   ├── database.py             # SQLAlchemy engine (SQLite/PostgreSQL)
│   │   ├── models.py               # 7 ORM models
│   │   ├── schemas.py              # Pydantic schemas
│   │   ├── routes/
│   │   │   ├── auth.py             # /api/auth/*
│   │   │   ├── events.py           # /api/events/*
│   │   │   ├── voice.py            # /api/voice/*
│   │   │   ├── assistant.py        # /api/assistant/*
│   │   │   ├── users.py            # /api/users/*
│   │   │   ├── families.py         # /api/families/*
│   │   │   ├── shopping.py         # /api/shopping/*
│   │   │   └── todos.py            # /api/todos/*
│   │   └── services/
│   │       ├── nlp.py              # OpenAI NLP parsing + Whisper
│   │       ├── ai_learning.py      # Gemini multi-intent + profile learning
│   │       ├── classifier.py       # OpenAI event classification
│   │       ├── ticketmaster.py     # Ticketmaster event discovery
│   │       └── logistics.py        # Drive time / geocode (mock)
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_events.py
│       ├── test_users.py
│       ├── test_family_flow.py
│       └── test_features.py
├── frontend/
│   ├── .vercel/project.json        # Vercel project link
│   ├── .env.local                  # NEXT_PUBLIC_API_URL (gitignored)
│   ├── package.json                # Next.js 16, React 19, deps
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── app/
│   │   ├── layout.tsx              # Root layout (fonts, metadata)
│   │   ├── page.tsx                # Main dashboard page
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── onboarding/page.tsx
│   │   ├── invite/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── shopping/page.tsx
│   │   ├── todos/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── components/
│   │   ├── AuthGuard.tsx           # JWT + family check guard
│   │   ├── DashboardLayout.tsx     # App shell with sidebar
│   │   ├── Sidebar.tsx             # Navigation sidebar
│   │   ├── UserSwitcher.tsx        # User context switcher
│   │   ├── CalendarView.tsx        # react-big-calendar grid
│   │   ├── TimelineView.tsx        # List/timeline view
│   │   ├── VoiceInput.tsx          # MediaRecorder → API
│   │   ├── EventAssistant.tsx      # AI text assistant panel
│   │   ├── AddEventModal.tsx       # Create/edit event modal
│   │   ├── ActionCard.tsx          # AI suggestion cards
│   │   ├── Analytics.tsx           # Analytics charts
│   │   ├── EventList.tsx           # Event list component
│   │   └── LocationAutocomplete.tsx
│   └── tests/
│       └── smoke.test.tsx
└── eventbrite_scraper.py           # Standalone scraper (root level)
    llm_classifier.py               # Standalone classifier (root level)
    nlp_query_parser.py             # Standalone NLP parser (root level)
    opp.py                          # Standalone script (root level)
    ticketmaster_api.py             # Standalone Ticketmaster (root level)
```

---

## CLI Commands Reference

### GitHub Actions CI (test results)
```bash
gh run list --repo ankur-commits/calendarapp --limit 5     # Recent CI runs
gh run view <run-id> --repo ankur-commits/calendarapp      # Run details + job status
gh run view <run-id> --log-failed --repo ankur-commits/calendarapp  # Failed job logs
gh run watch <run-id> --repo ankur-commits/calendarapp     # Watch run in real-time
```

### Railway (Backend)
```bash
railway status                          # Current project/service/environment
railway logs                            # View deploy/runtime logs
railway logs --build                    # View build logs
railway variables                       # List all env vars
railway open                            # Open Railway dashboard
railway run <cmd>                       # Run command with Railway env vars
```

### Vercel (Frontend)
```bash
vercel                                  # Deploy preview
vercel --prod                           # Deploy production
vercel logs <url>                       # View function/build logs
vercel env ls                           # List environment variables
vercel inspect <deployment-url>         # Inspect deployment
```

### Local Development
```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install
npm run dev                              # Next.js dev server on :3000

# Tests
cd backend && pytest                     # Backend tests
cd frontend && npm test                  # Frontend tests (vitest)
```

### Git Workflow
```bash
git checkout staging                    # Active development branch
git add <files>                         # Stage changes
git commit -m "message"                 # Commit
git push origin staging                 # Push → triggers CI + Railway + Vercel deploy
gh run list --limit 1                   # Check if CI passed after push
```
