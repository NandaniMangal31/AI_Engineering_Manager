# TaskStream AI — Frontend (MEAN stack, Angular client)

Angular 17 standalone-component / signals frontend for the four screens:
**Dashboard**, **Tasks**, **Stand-up Summary**, and **Team**. Built directly
against the MongoDB schema in `AI Engineering Manager - Database Design
Specification.pdf` — see `src/app/core/types.ts` for the field-by-field
mapping.

There is **no mock/hardcoded data** anywhere in `components/`. Every page
gets its data by subscribing to a Service, and every Service method is
wired to a real `HttpClient` call against an `/api/...` route. Until your
Express backend exists, those calls will fail — that's expected, and is
exactly what the loading/error states in every component are for.

## Getting started

```bash
npm install
npm start        # ng serve, http://localhost:4200
```

Angular's dev server won't proxy `/api` to your Express server by default.
Add a `proxy.conf.json`:

```json
{ "/api": { "target": "http://localhost:3000", "secure": false } }
```

and run `ng serve --proxy-config proxy.conf.json` (or wire it into
`angular.json`'s `serve.options`).

## Project layout

```
src/app/
  core/
    types.ts                  # interfaces/enums, 1:1 with the PDF's collections
    api.config.ts              # single place to change the API base URL
    interceptors/
      api-error.interceptor.ts # centralized HTTP error logging hook
    services/
      member.service.ts        # /api/members
      team.service.ts          # /api/teams
      task.service.ts          # /api/tasks
      standup.service.ts       # /api/standups (+ AI insights aggregate)
      activity.service.ts      # /api/activities (taskUpdates)
      notification.service.ts  # /api/notifications
      dependency.service.ts    # /api/dependencies
      dashboard.service.ts     # composes tasks+members into Dashboard view-models
      team-roster.service.ts   # composes tasks+members into Team page view-models
  shared/
    components/                # Sidebar, StatusBadge, PriorityBadge, TaskRow,
                                # Avatar, StatCard, Skeletons, ErrorState, BarChart
    utils/                      # pure display/calculation helpers (see below)
  features/
    dashboard/
    tasks/
    standup-summary/
    team/
  app.routes.ts                 # lazy-loaded routes, shared Sidebar layout in AppComponent
  app.config.ts                 # HttpClient + Router providers
  app.component.ts              # persistent sidebar + <router-outlet>
```

## Dynamic logic, as requested

- **Status styling**: `shared/utils/task-status.util.ts` → `getTaskDisplayStatus()`
  is the single place that turns `task.status` + `task.workflowStage` into a
  label + Tailwind classes. `StatusBadgeComponent` only takes `@Input()`s and
  calls this function — no component hardcodes a color.
- **Priority styling**: `shared/utils/priority.util.ts` does the same for
  `task.priority` → the "Urgent / High / Normal" labels and colors seen in
  the screenshots.
- **Workload %**: `shared/utils/workload.util.ts` → `calculateWorkloadPct()`
  computes each engineer's workload bar from their *active* tasks, weighted
  by priority (a Critical task counts for 4x a Low one — see
  `PRIORITY_WEIGHT`), exactly as you specified. `TeamRosterService` and
  `DashboardService` both call this rather than any component computing it
  inline.
- **Charts**: `BarChartComponent` wraps Chart.js and takes a plain
  `{label, value}[]` as `@Input() data` — it never contains a static number.
  Reused for both "Weekly Throughput" (Team) and "Sentiment Over Week"
  (Stand-up Summary).

## Assumptions I made (flagging rather than hiding them)

The PDF is a clean, well-thought-out schema for the "back office" data
(tasks, members, activity ledger), but a few widgets in your screenshots
show computed/aggregated data that doesn't map to a raw collection field.
Rather than inventing new backend collections, I made these explicit,
documented assumptions — search each file for the same note:

1. **Fine-grained task status** ("To Do" / "In Progress" / "Review") — the
   PDF's `tasks.status` enum only has `PROCESSING / COMPLETED / BLOCKED`.
   I derive the extra states from `status` + `workflowStage` on the
   frontend (`task-status.util.ts`). If you'd rather the backend own this
   directly, add e.g. a `TODO` value to `TaskStatus` and simplify that
   util to a straight lookup.
2. **Priority labels** — the PDF's priority enum is `Low/Medium/High/Critical`;
   the screenshots show "Normal/High/Urgent". I treat those as *display*
   labels for Medium/High/Critical (`priority.util.ts`).
3. **AI Insights & Synthesis, Parser Status, Detected Duplicates, Sentiment
   Over Week** — these aren't backed by a `standups` field in the PDF. I
   assumed a composed `GET /api/standups/:id/insights` endpoint
   (`StandupInsights` in `standup.service.ts`) that your AI pipeline writes
   to. If the backend instead stores these as columns on `standups`, fold
   the interface back into `Standup` and simplify the call.
4. **Weekly Throughput / Skill Distribution** (Team page) — throughput
   assumes a `GET /api/teams/:id/throughput` reporting endpoint (raw task
   docs shouldn't be aggregated by day on the client at scale). Skill
   distribution is computed client-side from each member's `skills` tags
   via keyword matching (`skill-distribution.util.ts`) since there's no
   dedicated collection for it — swap for a real endpoint if you add one.
5. **Dashboard stat deltas** (`+12%`, `↑ 8`) — shown as optional fields on
   `DashboardStats` that a real aggregate endpoint could populate; the
   current `DashboardService.getStats()` implementation derives the raw
   counts from `GET /api/tasks` and leaves the deltas undefined until
   there's a day-over-day endpoint to diff against.

None of this blocks you from wiring the real backend — every `TODO:` comment
in `services/` marks exactly which Express route to implement and what
shape it should return.
