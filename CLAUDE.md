# FamilyCal

AI-powered family calendar app with natural language input (voice + text).

## Stack
- **Backend**: FastAPI, Python 3.12, SQLAlchemy, Alembic — `backend/`
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4 — `frontend/`
- **AI**: OpenAI (GPT-4o-mini, Whisper), Google Gemini 2.0 Flash
- **DB**: PostgreSQL (Railway prod) / SQLite (local dev)
- **Deploy**: Railway (backend), Vercel (frontend), GitHub Actions CI
- **Repo**: github.com/ankur-commits/calendarapp — branch `staging`

## References
- Full architecture, data flows, deployment topology: @ARCHITECTURE.md

## Universal Rules
- Always work on the `staging` branch
- Never commit `.env`, `*.db`, `node_modules/`, or secrets
- Run tests before pushing: `cd backend && PYTHONPATH=. pytest` then `cd frontend && npm test`
- After pushing, verify CI: `gh run list --repo ankur-commits/calendarapp --limit 1`
- If CI fails: `gh run view <id> --log-failed --repo ankur-commits/calendarapp`
- Stage specific files only — never `git add .` or `git add -A`
- The `render.yaml` at root is legacy (unused) — Railway + Vercel are the active platforms
