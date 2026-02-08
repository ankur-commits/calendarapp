---
description: Pull logs from all three systems (GitHub Actions CI, Railway, Vercel), diagnose issues, apply fixes, test, and deploy.
---

## Step 1: Check GitHub Actions CI status (most common failure point)
1. Run `gh run list --repo ankur-commits/calendarapp --limit 5` to see recent CI runs.
2. If any run shows `failure`, run `gh run view <run-id> --repo ankur-commits/calendarapp` to see which job failed (backend-test or frontend-test).
3. Run `gh run view <run-id> --log-failed --repo ankur-commits/calendarapp` to get the full failure output.
4. Extract the specific error with: `gh run view <run-id> --log-failed --repo ankur-commits/calendarapp 2>&1 | grep -E "(FAILED|ERROR|Error|assert|ImportError|NameError|SyntaxError|ModuleNotFoundError)" | head -20`

## Step 2: Check Railway backend logs (runtime/deploy errors)
5. Run `railway logs` for runtime errors (500s, crashes, import failures).
6. Run `railway logs --build` for build-time errors (missing deps, syntax errors).
7. Run `railway variables` to verify env vars if errors suggest missing config.

## Step 3: Check Vercel frontend (if frontend issues suspected)
8. Check Vercel deployment status and logs for build or runtime errors.

## Step 4: Diagnose
9. Analyze all collected log output to identify root cause.
10. Read the source files referenced in error traces.

## Step 5: Fix
11. Present a fix plan to the user for approval.
12. Once approved, apply the code changes.

## Step 6: Verify locally
13. Run backend tests: `cd backend && PYTHONPATH=. pytest`
14. Run frontend tests: `cd frontend && npm test`

## Step 7: Deploy and confirm
15. If local tests pass, use the `/deploy` workflow to commit and push.
16. After push, run `gh run list --repo ankur-commits/calendarapp --limit 1` and wait for the new CI run.
17. Run `gh run watch <new-run-id> --repo ankur-commits/calendarapp` to watch CI in real-time, or poll with `gh run view <new-run-id>`.
18. If CI passes, check `railway logs` to confirm backend is healthy.
19. If CI fails again, loop back to Step 1.
