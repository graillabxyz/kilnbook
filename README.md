# Kilnbook

Kilnbook is a production-oriented web application scaffold for ceramic artists, studios, glaze researchers, and kiln operators. It combines a firing journal, glaze and clay-body libraries, firing analytics, shared result discovery, social posts, and messaging architecture.

## Stack

- Next.js App Router
- TypeScript strict mode
- React
- Tailwind CSS
- React Hook Form
- Zod
- Recharts
- Supabase PostgreSQL/Auth/Storage/Realtime migration artifacts
- Centralized entitlement, privacy, unit conversion, recipe, feed-ranking, and firing-estimate services

## Local Development

```bash
npm install
npm run dev
```

The local preview uses realistic ceramic seed data through `lib/services/kilnbook-repository.ts`.

## Validation

```bash
npm test
```

The test command builds the app, runs Phase 1 business-rule tests, and verifies the rendered HTML no longer contains starter preview code.

## Supabase

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
4. Apply `supabase/migrations/0001_kilnbook_phase1.sql`.
5. Run `supabase/seed.sql`.
6. Configure Supabase Auth for email/password, magic link, Google, and password reset.
7. Create a private `kilnbook-images` bucket and storage policies.

## Deliverables

- Architecture summary: `docs/architecture.md`
- Database relationship map: `docs/database-map.md`
- Phased implementation plan: `docs/phase-plan.md`
- Supabase migration and RLS: `supabase/migrations/0001_kilnbook_phase1.sql`
- Seed data: `supabase/seed.sql` and `lib/seed-data.ts`
- Environment documentation: `.env.example`
- Deferred features: `docs/deferred-features.md`
- Security review: `docs/security-review.md`
- Usability review: `docs/usability-review.md`
- Accessibility review: `docs/accessibility-review.md`

## Canonical Relationship Summary

- Glazes are canonical records with versioned recipes.
- A firing links to exact glaze recipe versions through firing-specific glaze applications.
- Clay bodies are canonical records everywhere glazes and firings are related.
- Ceramic pieces can carry clay body, glaze application, bisque, final firing, image, and dimension metadata.
- Images are canonical storage metadata and are related to firings, glazes, clay bodies, pieces, and applications through join tables.
- Posts link to canonical records and may store only lightweight historical preview snapshots.
- Private recipes and private firing data are protected by RLS and service-layer authorization.

