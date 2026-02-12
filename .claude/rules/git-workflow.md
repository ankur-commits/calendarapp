# Git Workflow

- Active branch: `staging` — pushes auto-deploy to Railway (backend) + Vercel (frontend)
- Stable branch: `main` — never push here without explicit request
- Push to `staging` triggers GitHub Actions CI (.github/workflows/ci.yml): pytest + vitest
- Stage specific files with `git add <files>` — never `.env`, `*.db`, `node_modules/`
- After every push, check CI: `gh run list --repo ankur-commits/calendarapp --limit 1`
- If CI fails: `gh run view <id> --log-failed --repo ankur-commits/calendarapp` → fix → retest → push
- Never force push, never `git reset --hard`, never push to `main` without asking
