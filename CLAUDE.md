# CLAUDE.md - FamilyCal Project Instructions

## Project Overview
FamilyCal is an AI-powered family calendar app. See `ARCHITECTURE.md` for full system architecture, data flows, and deployment topology.

## Repository
- **Repo**: https://github.com/ankur-commits/calendarapp.git
- **Active branch**: `staging` (auto-deploys to Railway + Vercel)
- **Stable branch**: `main`

## Tech Stack
- **Backend**: FastAPI (Python 3.12), SQLAlchemy, Alembic, PostgreSQL
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **AI**: OpenAI (GPT-4o-mini, Whisper), Google Gemini 2.0 Flash, Ticketmaster API
- **Deployment**: Railway (backend + Postgres), Vercel (frontend)
- **CI**: GitHub Actions (pytest + vitest on push to main/staging)

## Working Directory
All paths are relative to `/Users/ankursanghi/Documents/Calendar App/`.

## Code Style & Conventions
- Backend follows FastAPI patterns: routes in `backend/app/routes/`, services in `backend/app/services/`
- Models in `backend/app/models.py`, schemas in `backend/app/schemas.py`
- Frontend uses Next.js App Router: pages in `frontend/app/`, components in `frontend/components/`
- All API calls from frontend use `axios` with `process.env.NEXT_PUBLIC_API_URL` base
- Auth: JWT Bearer tokens stored in `localStorage` key `"token"`

## Development Workflow

### Running Locally
```bash
# Backend (from project root)
cd backend && source ../.venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Frontend (from project root)
cd frontend && npm run dev
```

### Running Tests
```bash
# Backend tests
cd backend && PYTHONPATH=. pytest

# Frontend tests
cd frontend && npm test

# Run both (for CI parity)
cd backend && PYTHONPATH=. pytest && cd ../frontend && npm test
```

### Git Workflow
Always work on the `staging` branch. Pushing to `staging` triggers:
1. GitHub Actions CI (pytest + vitest)
2. Railway auto-deploy (backend)
3. Vercel auto-deploy (frontend)

When committing:
```bash
git add <specific-files>          # Never git add . blindly - avoid .env, .db files
git commit -m "Descriptive message"
git push origin staging
```

**Important**: `.env`, `*.db`, `node_modules/`, `.next/` are gitignored. Never commit secrets.

## Deployment & Operations

### Backend (Railway)
- **Project**: `gregarious-youth`, **Service**: `calendar-backend`, **Env**: `staging`
- **URL**: `https://calendar-backend-staging.up.railway.app`
- **Start**: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT` (Procfile)
- **DB**: PostgreSQL at `calendar-db.railway.internal:5432/railway`

### Frontend (Vercel)
- **Project**: `calendarapp` (prj_HlamSfx3cx9cGKdiYwx8Zw5f1pcV)
- **Org**: `ankur-sanghis-projects`
- **Root dir**: `frontend/`
- **API URL env**: `NEXT_PUBLIC_API_URL=https://calendar-backend-staging.up.railway.app`

### Observability — Three Layers of Logs
There are three independent systems that can fail. Always check all three when troubleshooting.

```bash
# --- Layer 1: GitHub Actions CI (test failures) ---
gh run list --repo ankur-commits/calendarapp --limit 5   # See recent runs + pass/fail
gh run view <run-id> --repo ankur-commits/calendarapp     # Which job failed?
gh run view <run-id> --log-failed --repo ankur-commits/calendarapp  # Full error output

# --- Layer 2: Railway (backend runtime/deploy errors) ---
railway logs                    # Runtime logs (500s, crashes, tracebacks)
railway logs --build            # Build errors (missing deps, syntax errors)
railway variables               # Verify env vars are set

# --- Layer 3: Vercel (frontend build/runtime errors) ---
vercel logs <deployment-url>    # Function + build logs
vercel env ls                   # Verify env vars
vercel inspect <deployment-url> # Deployment metadata
```

### Troubleshooting Workflow
When asked to troubleshoot or fix an issue, check all three layers:

1. **Check CI first** (most common): `gh run list` → find failures → `gh run view <id> --log-failed` → extract error
2. **Check Railway**: `railway logs` for backend crashes, `railway logs --build` for deploy failures
3. **Check Vercel**: if frontend is broken, check Vercel build/function logs
4. **Diagnose**: Read the source files from the error traces
5. **Fix**: Apply code changes locally
6. **Test locally**: Run `pytest` (backend) and/or `npm test` (frontend) to confirm fix
7. **Deploy**: Commit and push to `staging`
8. **Verify CI passes**: `gh run list --limit 1` → `gh run view <new-id>` → confirm success
9. **Verify runtime**: `railway logs` to confirm backend is healthy
10. **If CI fails again**: Loop back to step 1

### Common CI Failure Patterns
| Error in CI logs | Likely cause | Where to look |
|-----------------|-------------|---------------|
| `ImportError` / `ModuleNotFoundError` | Missing dep or circular import | `requirements.txt`, `backend/app/main.py` |
| `NameError: name 'app' is not defined` | Code ordering bug in `main.py` | `backend/app/main.py` (known issue) |
| `assert` failures in pytest | Test logic vs code mismatch | `backend/tests/test_*.py` |
| `ELIFECYCLE` / npm test failure | Frontend test or build issue | `frontend/tests/`, `frontend/components/` |
| `alembic` errors | Migration out of sync | `backend/alembic/versions/` |

### Database Migrations
When modifying `backend/app/models.py`:
```bash
cd backend
alembic revision --autogenerate -m "description of change"
alembic upgrade head  # Test locally
# Then commit the migration file and push
```

## Key Files to Know
| Purpose | File |
|---------|------|
| FastAPI app entry | `backend/app/main.py` |
| Database models | `backend/app/models.py` |
| Pydantic schemas | `backend/app/schemas.py` |
| Auth (JWT/Argon2) | `backend/app/auth.py` |
| DB connection | `backend/app/database.py` |
| NLP service (OpenAI) | `backend/app/services/nlp.py` |
| AI learning (Gemini) | `backend/app/services/ai_learning.py` |
| Event classifier | `backend/app/services/classifier.py` |
| Ticketmaster integration | `backend/app/services/ticketmaster.py` |
| Main dashboard page | `frontend/app/page.tsx` |
| AI assistant component | `frontend/components/EventAssistant.tsx` |
| Voice input component | `frontend/components/VoiceInput.tsx` |
| Auth guard | `frontend/components/AuthGuard.tsx` |
| CI pipeline | `.github/workflows/ci.yml` |
| Railway start cmd | `backend/Procfile` |
| Architecture reference | `ARCHITECTURE.md` |

## Common Gotchas
- `backend/app/main.py` references `@app.on_event("startup")` before `app = FastAPI()` — this is a known bug but works because of import ordering
- The `render.yaml` at the root is a **legacy file** from a previous Render deployment — Railway and Vercel are the current platforms
- Frontend `.env.local` is created by Vercel CLI and is gitignored — the Vercel project env vars are the source of truth
- Shopping and todos routes use hardcoded `family_id=1` and `user_id=1` defaults — auth context passing is incomplete
- `backend/app/routes/auth.py` has a duplicate `return` statement in `dev_login` (line 94-95)
- The `Chore` model in `models.py` has duplicate `family` and `added_by` relationship definitions (lines 91-92 shadow 88-89)
