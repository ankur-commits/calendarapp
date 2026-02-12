---
description: Test, commit, push to staging, and verify CI passes. Full deploy cycle.
---
1. Run `git status` and `git diff --stat` to review changes.
2. Run backend tests: `cd backend && PYTHONPATH=. pytest` — abort if tests fail.
3. Run frontend tests: `cd frontend && npm test` — abort if tests fail.
4. Stage relevant files with `git add <specific-files>`. Never stage `.env`, `*.db`, or `node_modules/`.
5. Run `git commit -m "<descriptive message>"` with a clear description of what changed.
6. Run `git push origin staging` to trigger CI + Railway + Vercel deployment.
7. Run `gh run list --repo ankur-commits/calendarapp --limit 1` to get the triggered CI run ID.
8. Poll CI status with `gh run view <run-id> --repo ankur-commits/calendarapp` until it completes.
9. If CI fails: run `gh run view <run-id> --log-failed --repo ankur-commits/calendarapp`, diagnose, fix, and re-run from step 1.
10. If CI passes: confirm with `git log --oneline -3` and report success.
