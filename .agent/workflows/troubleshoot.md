---
description: Automatically pull logs, plan a fix, and deploy.
---
1. Run `railway logs --service backend --lines 50` to get the latest backend logs.
// turbo
2. Run `vercel logs calendar-frontend --production --limit 50` to get the latest frontend logs.
3. Analyze the logs to identify the root cause of any errors.
4. Create an implementation plan to fix the identified issues.
5. Use `notify_user` to present the plan and ask for approval.
6. Once approved, use the `/deploy` workflow to deploy the fixes.
