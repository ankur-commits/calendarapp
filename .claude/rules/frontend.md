---
paths:
  - "frontend/**"
---
# Frontend Rules (Next.js / React / TypeScript)

## Structure
- Next.js App Router: pages in `frontend/app/`, components in `frontend/components/`
- Main dashboard: `frontend/app/page.tsx` — calendar views, voice input, AI assistant panel
- Key pages: login, signup, onboarding, invite, settings, analytics, shopping, todos
- Key components: AuthGuard, DashboardLayout, Sidebar, CalendarView, TimelineView, VoiceInput, EventAssistant, AddEventModal, ActionCard

## Conventions
- API calls: `axios` with base URL from `process.env.NEXT_PUBLIC_API_URL`
- Auth tokens: `localStorage` key `"token"`, sent as `Authorization: Bearer <token>`
- Styling: Tailwind CSS v4, icons from `lucide-react`, utility merging with `clsx` + `tailwind-merge`
- Calendar widget: `react-big-calendar` with `date-fns` localizer
- New pages: create `frontend/app/<route>/page.tsx`
- New components: create `frontend/components/<Name>.tsx`

## Operations
- Dev server: `cd frontend && npm run dev`
- Tests: `cd frontend && npm test` (vitest + @testing-library/react)
- Vercel project: `calendarapp` in org `ankur-sanghis-projects`
- Frontend `.env.local` is created by Vercel CLI and is gitignored
