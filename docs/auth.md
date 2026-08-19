# Authentication

## Current behaviour (Milestone 2)

The app uses **mock authentication** stored in the browser:

- Registration / login accounts → `localStorage`
- Active session → `localStorage`
- Guest mode → temporary session, no password

No Supabase account is required.

## Try it

1. Open `http://localhost:3000/register`
2. Create an account, or click **Continue as guest**
3. Visit `/profile` and `/settings`
4. Use **Log out** in the header

## Supabase later

When you are ready:

1. Create a Supabase project
2. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
3. Install `@supabase/supabase-js` / `@supabase/ssr`
4. Replace the stub in `lib/auth/supabase-client.ts`
5. Point `lib/auth/auth-service.ts` at real auth handlers

UI forms already go through the auth service facade, so pages should not need a full rewrite.
