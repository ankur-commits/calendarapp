---
paths:
  - "backend/**"
---
# Backend Rules (FastAPI / Python)

## Structure
- App entry: `backend/app/main.py`
- Routes: `backend/app/routes/` (auth, events, voice, assistant, users, families, shopping, todos)
- Services: `backend/app/services/` (nlp, ai_learning, classifier, ticketmaster, logistics)
- Models: `backend/app/models.py` (Family, User, Event, Chore, ShoppingItem, ToDo, UserProfileAttribute)
- Schemas: `backend/app/schemas.py` (Pydantic request/response models)
- Auth: `backend/app/auth.py` (JWT HS256, Argon2 hashing, OAuth2 Bearer, 30min expiry)
- DB: `backend/app/database.py` (SQLAlchemy — SQLite local, PostgreSQL via DATABASE_URL)

## Conventions
- New routes: create file in `backend/app/routes/`, import + register in `main.py`
- New services: create file in `backend/app/services/`, import in the route that uses it
- DB migrations after model changes: `cd backend && alembic revision --autogenerate -m "desc" && alembic upgrade head`
- Railway start command (Procfile): `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## Operations
- Runtime logs: `railway logs`
- Build logs: `railway logs --build`
- Env vars: `railway variables`
- Tests: `cd backend && PYTHONPATH=. pytest`

## Known Issues
- Shopping/todos routes hardcode `family_id=1` and `user_id=1` — auth context passing is incomplete
- `Chore` model has duplicate `family` and `added_by` relationship definitions
- `auth.py` route `dev_login` has a duplicate return statement
