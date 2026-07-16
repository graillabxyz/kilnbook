# Flux and Fire Supabase Setup

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it to browser code.
4. Apply `supabase/migrations/0001_kilnbook_phase1.sql`.
5. Run `supabase/seed.sql` for lookup plans, entitlements, and ceramic materials.
6. Create a private `flux-and-fire-images` storage bucket with derivative paths for `thumbnail`, `card`, `medium`, and plan-gated full resolution.
7. Configure Supabase Auth providers for email/password, magic link, Google, and password reset.
8. Add the app callback URL to Supabase Auth redirect URLs:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://kilnbook-mu.vercel.app/auth/callback`
9. Apply `0002_google_oauth_profiles.sql` so new Google or email users create a public profile row and private self-only auth details.

The migration enables row-level security and uses canonical records plus join tables for firings, glazes, clay bodies, applications, pieces, images, and posts.
