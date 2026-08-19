# DriveAnywhere.ai

Race simplified versions of real London routes and challenge your friends for the fastest time.

Browser-based arcade driving on **prepared, lightweight 3D routes** — not photoreal digital twins.

## Current status

**Milestones 1–5 complete (mock mode):** foundation, auth, 3D driving, route JSON, timing/leaderboards.
Also landed early: graphics presets, instanced scenery, minimap, start lights and favourites.

Supabase remains optional and deferred. Challenge links and deployment polish come later.

### How route geometry loads

Route JSON in `public/routes/` is the source of truth, but the game does **not**
fetch it at runtime. `lib/routes/route-registry.ts` imports those files
statically and validates them with Zod, so:

- a route that exists at build time can never 404 at play time
- a malformed route breaks the build instead of a player's session
- `/play/[slug]` is fully prerendered

Regenerate the geometry with `npm run seed:routes` after editing
`scripts/seed-local-data.ts`. Checkpoints, buildings and street furniture are
derived from the road centreline, so they cannot drift off the drivable surface.

## Requirements

- Node.js 20+ (tested with Node 22)
- npm

No Supabase account is required for local development.

## Quick start (Windows PowerShell)

```powershell
cd C:\Users\Admin\Desktop\OpenRace\t1
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful commands

| Command              | Purpose                      |
| -------------------- | ---------------------------- |
| `npm run dev`        | Start the development server |
| `npm run build`      | Production build             |
| `npm run start`      | Serve the production build   |
| `npm run lint`       | Run ESLint                   |
| `npm run test`       | Run Vitest unit tests        |
| `npm run test:watch` | Vitest watch mode            |
| `npm run seed:routes`| Regenerate route JSON files  |
| `npm run format`     | Format with Prettier         |

## Mock mode vs Supabase

If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing:

- the app starts normally
- routes and leaderboards use local mock data
- no page should crash

Copy `.env.example` to `.env.local` when you want to override settings:

```powershell
Copy-Item .env.example .env.local
```

Mock auth and attempts work now. Real Supabase wiring is deferred (see `docs/auth.md`).

## Project layout (meaningful notes)

- `app/` — Next.js App Router pages
- `components/` — UI split by domain (`layout`, `landing`, `routes`, `ui`)
- `lib/` — config, mock database, route access, validation, utils
- `types/` — shared TypeScript types
- `public/images/routes/` — SVG route preview placeholders
- `tests/unit/` — Vitest + Testing Library
- `docs/` — architecture and setup notes
- `stores/` — Zustand stores (auth, game, graphics settings)
- `scripts/` — route seeding
- `supabase/` — reserved for Milestone 6

## Seeded London routes

1. **Westminster Sprint** — 504 m, 4 checkpoints, beginner
2. **Embankment Run** — 773 m, 6 checkpoints, medium
3. **Canary Wharf Loop** — 986 m, 8 checkpoints, advanced

## Driving

| Key       | Action           |
| --------- | ---------------- |
| `W` / `↑` | Accelerate       |
| `S` / `↓` | Brake / reverse  |
| `A` `D`   | Steer            |
| `Space`   | Handbrake        |
| `R`       | Reset to last checkpoint |
| `C`       | Camera (chase / hood) |
| `Esc`     | Pause            |

Graphics presets (Low / Medium / High) live in the pause menu and are saved to
the browser. First-time visitors get a preset guessed from CPU cores and device
memory.

## Attribution

© OpenStreetMap contributors — see `/attribution`.

We do **not** scrape or bake Google Street View / Google Earth imagery.

## Documentation

- [Local development](docs/local-development.md)
- [Architecture](docs/architecture.md)
- [Route format (preview)](docs/route-format.md)

## Licence note

This repository is an early private MVP prototype. Add an explicit licence before public release.
