# Flux and Fire Supabase Setup

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it to browser code.
4. Apply the migrations in order from `supabase/migrations/`.
5. Run `supabase/seed.sql` for lookup plans, entitlements, and ceramic materials.
6. Create a private `flux-and-fire-images` storage bucket with derivative paths for `thumbnail`, `card`, `medium`, and plan-gated full resolution.
7. Configure Supabase Auth providers for email/password, magic link, Google, and password reset.
8. Add the app callback URL to Supabase Auth redirect URLs:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://kilnbook-mu.vercel.app/auth/callback`
9. `0002_google_oauth_profiles.sql` wires Google or email users into a public profile row and private self-only auth details.
10. `0003_business_tier_profiles.sql` adds the Business launch tier, business profile table, explicit Data API grants, and RLS policies.
11. `0004_business_profile_hero_index.sql` covers the optional business portfolio hero image foreign key.

The migration enables row-level security and uses canonical records plus join tables for firings, glazes, clay bodies, applications, pieces, images, and posts.
