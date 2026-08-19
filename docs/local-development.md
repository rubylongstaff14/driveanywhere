# Local development

## Prerequisites

1. Install [Node.js LTS](https://nodejs.org/) (20+ recommended).
2. Confirm tools in PowerShell:

```powershell
node -v
npm -v
```

## Install and run

```powershell
cd C:\Users\Admin\Desktop\OpenRace\t1
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Environment variables

```powershell
Copy-Item .env.example .env.local
```

Leave Supabase values empty for **mock mode** (default for Milestone 1).

| Variable                        | Required? | Purpose                                                     |
| ------------------------------- | --------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | No        | Site URL for metadata (defaults to `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL`      | No        | Enables Supabase mode later                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No        | Public anon key (never put service-role keys here)          |

## Quality checks

```powershell
npm run lint
npm run test
npm run build
```

## Troubleshooting

- **Port 3000 in use:** stop the other process, or run `npm run dev -- -p 3001`.
- **Stale build:** delete `.next` then run `npm run build` again:

```powershell
Remove-Item -Recurse -Force .next
npm run build
```

- **Mock banner visible:** expected until Supabase env vars are set.
