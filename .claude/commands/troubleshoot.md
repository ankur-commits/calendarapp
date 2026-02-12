---
description: Check CI, Railway, and Vercel for errors. Diagnose, fix, test, and deploy.
---

## Step 1 — Check GitHub Actions CI (most common failure point)
1. Run `gh run list --repo ankur-commits/calendarapp --limit 5` to see recent CI runs.
2. If any run shows `failure`: `gh run view <run-id> --repo ankur-commits/calendarapp` to see which job failed.
3. Get error details: `gh run view <run-id> --log-failed --repo ankur-commits/calendarapp`

## Step 2 — Check Railway (backend runtime/deploy errors)
4. Run `railway logs` for runtime errors (500s, crashes, tracebacks).
5. Run `railway logs --build` for build-time errors (missing deps, syntax).
6. Run `railway variables` to verify env vars if errors suggest missing config.

## Step 3 — Check Vercel (frontend issues)
7. Check Vercel deployment status and logs if frontend is broken.

## Step 4 — Diagnose and Fix
8. Analyze all collected logs, identify root cause.
9. Read the source files referenced in error traces.
10. Present fix plan to user for approval.
11. Apply the code changes.

## Step 5 — Verify and Deploy
12. Run `cd backend && PYTHONPATH=. pytest` — confirm backend tests pass.
13. Run `cd frontend && npm test` — confirm frontend tests pass.
14. If tests pass, use `/deploy` to commit, push, and verify CI.
15. If CI fails again, loop back to Step 1.
