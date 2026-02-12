# Testing

## Commands
- Backend: `cd backend && PYTHONPATH=. pytest`
- Frontend: `cd frontend && npm test`
- Both (CI parity): `cd backend && PYTHONPATH=. pytest && cd ../frontend && npm test`

## CI Environment
- GitHub Actions runs on push to `main` and `staging` (.github/workflows/ci.yml)
- CI uses Python 3.12 + Node 20 on Ubuntu — local may differ (Python 3.13 on macOS)
- `test_family_flow` may fail locally on Python 3.13 but passes in CI on 3.12

## Checking CI
- List runs: `gh run list --repo ankur-commits/calendarapp --limit 5`
- View run: `gh run view <id> --repo ankur-commits/calendarapp`
- Failed logs: `gh run view <id> --log-failed --repo ankur-commits/calendarapp`
- Watch live: `gh run watch <id> --repo ankur-commits/calendarapp`

## Common CI Failure Patterns
| Error | Likely cause | Where to look |
|-------|-------------|---------------|
| `ImportError` / `ModuleNotFoundError` | Missing dep or circular import | `requirements.txt`, `backend/app/main.py` |
| `NameError` in conftest | Code ordering bug in `main.py` | `backend/app/main.py` |
| `assert` failures | Test logic vs code mismatch | `backend/tests/test_*.py` |
| npm test / `ELIFECYCLE` | Frontend build or test issue | `frontend/tests/`, `frontend/components/` |
| `alembic` errors | Migration out of sync | `backend/alembic/versions/` |
