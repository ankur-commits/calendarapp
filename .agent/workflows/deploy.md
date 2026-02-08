---
description: Deploy changes to staging by running tests, committing, pushing to git, and verifying CI passes. Triggers Railway (backend) + Vercel (frontend) auto-deploy.
---
1. Run `git status` to review what files have changed.
2. Run `git diff --stat` to summarize the changes.
3. Run backend tests: `cd backend && PYTHONPATH=. pytest` — abort if tests fail.
4. Run frontend tests: `cd frontend && npm test` — abort if tests fail.
5. Stage the relevant changed files with `git add <specific-files>`. Never stage `.env`, `*.db`, or `node_modules/`.
6. Run `git commit -m "<descriptive commit message>"` with a clear description of what changed.
7. Run `git push origin staging` to push and trigger CI + Railway + Vercel deployment.
8. Run `gh run list --repo ankur-commits/calendarapp --limit 1` to get the triggered CI run ID.
9. Poll CI status with `gh run view <run-id> --repo ankur-commits/calendarapp` until it completes.
10. If CI fails, run `gh run view <run-id> --log-failed --repo ankur-commits/calendarapp` to get the error, then fix and re-deploy.
11. If CI passes, confirm with `git log --oneline -3`.
