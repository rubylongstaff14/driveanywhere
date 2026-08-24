# DriveAnywhere — Launch path & value roadmap

## What ships today

| Surface | Status |
|--------|--------|
| **Web arcade** (Next.js + R3F + Rapier) | Playable solo + online rooms |
| **Unreal showcase** (UE 5.8 maps) | Editor driveable city rings — not the public product |
| **Shop / cosmetics** | Visual-only; coin packs are **test grants** (no Stripe yet) |
| **Multiplayer** | Node WebSocket rooms, 30 Hz sync, per-player car + paint |

Public launch target = **web arcade**. Unreal is R&D / trailer / future client.

---

## How to go live (minimum path)

### 1. Frontend (Amplify already wired)
1. Set Amplify env: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WS_URL`, optional Supabase keys.
2. `npm run build` must pass; deploy via `amplify.yml`.
3. Remove or gate the mock-mode banner for authenticated users.

### 2. Multiplayer WebSocket (separate host)
1. Follow `server/deploy.md` (EC2 + pm2 or equivalent).
2. TLS (`wss://`) required — do **not** ship with the hard-coded sslip.io fallback as sole prod URL.
3. Set `NEXT_PUBLIC_WS_URL` on Amplify to that host.
4. Smoke-test: 2 browsers → create/join → countdown → both cars visible with different paints.

### 3. Auth + persistence (before “real” competition)
1. Wire Supabase auth (see `docs/auth.md`) — no guest infinite coins in prod.
2. Persist attempts, best times, inventory server-side.
3. Leaderboards: weekly + all-time per circuit/class.

### 4. Payments (shop)
1. Stripe Checkout or Apple/Google IAP for coin packs.
2. Server validates receipts before granting coins.
3. Keep fairness rule: cosmetics never change vehicle stats.

### 5. Soft launch checklist
- [ ] Privacy / terms / age gate
- [ ] Mobile: landscape + “keyboard recommended” or on-screen stick
- [ ] WS reconnect + room TTL
- [ ] Rate-limit finish reports (anti-cheat lite)
- [ ] Crash / error telemetry (Sentry)
- [ ] Legal: landmark “inspired by” naming (avoid trademark misuse in marketing)

---

## Ideas that make the project more valuable (before / after push)

### Product loops (high ROI)
1. **Ghost challenges** — share a link; friend races your ghost; both get coins.
2. **Daily circuit** — one featured map + seed; global board resets at midnight UTC.
3. **Season pass** — free track + paid cosmetic track (still visual-only).
4. **Clubs / teams** — 4-player clubs, weekly club score = sum of bests.
5. **Photo mode + share card** — auto OG image with time + car + city.

### Content / world
6. **Megascans / Fab pack** for Unreal trailers (Big Ben, Eye, asphalt) — marketing lift, not web blocker.
7. **User route upload** (curated) — community circuits with moderation.
8. **Weather / time-of-day presets** per race (fog London, dusk Dubai) — cheap mood upgrade.
9. **Landmark collectibles** — drive past labeled heroes to unlock a stamp book (engagement, not pay-to-win).

### Technical moats
10. **Class-locked ranked** with server-side time validation + checksum of route seed.
11. **Replay files** (compact pose stream) for disputes and content.
12. **UE pixel-streaming** later — web stays primary; Unreal for “cinematic nights”.

### Monetization (fair)
13. Cosmetics + seasons only; never sell faster cars.
14. B2B: white-label city drives for tourism boards / brands (London Eye night drive sponsored event).
15. Creator tools: stamp a challenge from a hot lap → TikTok clip pipeline.

### Credibility
16. Press kit: 9 cities, fairness manifesto, 60-second trailer from Unreal Lit viewport.
17. Early access waitlist with real email (Resend) — replace local ack.

---

## Honest ceiling

Procedural landmarks ≠ Quixel photoreal. Ship the **arcade** as the product; use Unreal for **spectacle** until Megascans/Fab are imported. Don’t block launch on Eye perfection — iterate silhouettes while auth + WS + payments land.
