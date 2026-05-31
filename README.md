# Bloom Together

A private digital sanctuary for two — a full-stack couples app with a shared calendar, memory scrapbook, love notes, tasks, and focus sessions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, mounted at `/api`)
- `pnpm --filter @workspace/bloom-together run dev` — run the React frontend (port 26067, mounted at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, paths prefixed `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind + shadcn/ui, wouter routing

## Where things live

- `lib/db/src/schema/` — Drizzle schema files (users, bloom_spaces, members, events, availability, votes, memories, memory_photos, notes, tasks, focus_sessions)
- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/` — Orval-generated React Query hooks + Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers (auth, bloomspaces, events, memories, notes, tasks, focus, profile, dashboard)
- `artifacts/bloom-together/src/pages/` — Frontend pages (login, onboarding, dashboard, calendar, memories, notes, tasks, focus, settings)
- `artifacts/bloom-together/src/lib/AuthContext.tsx` — JWT auth context + provider
- `artifacts/bloom-together/src/components/layout.tsx` — AppLayout with sidebar + mobile nav

## Architecture decisions

- Auth is custom JWT (Bearer token stored in localStorage); `SESSION_SECRET` env var signs tokens. Clerk is present but only used for proxy middleware.
- Bloom Space concept: two users share one space identified by an invite code; most data is scoped to `bloomSpaceId`.
- All API routes are mounted under `/api` via the shared reverse proxy; services handle the full path.
- Frontend uses Orval-generated hooks (`@workspace/api-client-react`) — always pass `queryKey` explicitly in query options to avoid TS2741.
- `auth.tsx` re-exports from `AuthContext.tsx` to keep Fast Refresh happy (component + hook must not share a module).

## Product

- **Login / Register** — email+password auth, redirects to onboarding on first login
- **Onboarding** — create a new Bloom Space or join one via invite code
- **Dashboard** — greeting, stats, upcoming events, latest love note, recent memories
- **Calendar** — shared monthly calendar with event categories and add-event modal
- **Memories** — polaroid-style scrapbook gallery
- **Love Notes** — sticky/letter/floral style notes with pinning and heart reactions
- **Tasks** — shared to-do list with completion garden visualization
- **Focus Sessions** — ambient pomodoro timer for studying together
- **Settings** — profile editing + invite code sharing

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Express 5: `req.params.id` is `string | string[]` — always wrap with `String(req.params.id)` before `parseInt`.
- Orval hooks require `queryKey` explicitly in options (TS2741 otherwise).
- After changing `lib/db` schema, run `pnpm run typecheck:libs` to rebuild declarations before `api-server` typecheck works.
- Do NOT run `pnpm dev` at workspace root — use `restart_workflow` or individual `--filter` commands.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
