# Architecture (Milestone 1)

## Goals

Ship a stable website foundation that:

- works without Supabase
- loads a professional landing page and route library
- keeps game/3D code out of non-game pages
- validates mock route metadata with Zod

## Modes

```
env vars missing  → mock mode  → local JSON/TS seed data
env vars present  → supabase mode (stubbed until Milestone 6)
```

`lib/config/env.ts` is the single detection point.

## Data flow (routes)

```
MOCK_ROUTES (lib/database/mock/routes.ts)
        ↓ validated by Zod
getPublishedRoutes / getRouteBySlug (lib/routes/get-routes.ts)
        ↓
App Router pages + RouteCard UI
```

Pages do not import mock arrays directly — they go through the route service layer so Supabase can replace the backend later.

## Rendering strategy

- Server Components by default for landing, library, detail, leaderboard
- Client Components only for interactivity (mobile nav, early-access form)
- No Three.js / Rapier in Milestone 1

## Upcoming boundaries

| Concern           | Planned home                                      |
| ----------------- | ------------------------------------------------- |
| Auth              | `lib/auth/` + Milestone 2 pages                   |
| Game state        | `stores/` + Zustand (not React state every frame) |
| Physics / vehicle | `lib/game/` + dynamic import on `/play/[slug]`    |
| Attempts / PB     | localStorage (M5) then Supabase (M6)              |

## Security notes (MVP)

- No secrets committed
- Service-role keys never exposed to the browser
- Client-submitted times will be server-validated from Milestone 5/6 onward
