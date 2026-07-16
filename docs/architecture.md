# Kilnbook Architecture

Kilnbook is a Next.js App Router application with a server-first shell and small client islands for the live firing workflow, forms, feed tab preference, image tagging, and chart rendering.

Core business logic lives in `lib/`:

- `product.ts`: centralized product naming and navigation.
- `domain.ts`: typed canonical records.
- `units.ts`: normalized measurement conversion.
- `recipe.ts`: recipe scaling, totals, and duplicate fingerprints.
- `firing-calculator.ts`: deterministic firing estimates and rate-of-rise calculations.
- `entitlements.ts`: centralized plan and feature decisions.
- `feed-ranking.ts`: time-decayed popular feed score.
- `privacy.ts`: record visibility checks.
- `services/kilnbook-repository.ts`: data access boundary used by the UI.
- `supabase/client.ts`: configured Supabase client factory.

The production database is Supabase PostgreSQL with RLS. UI components should call repository/service functions and never scatter Supabase queries through visual components.

Phase 1 is implemented as a preview-ready application surface with realistic ceramic seed data and production migration artifacts. Live Supabase auth, storage transforms, realtime subscriptions, and remote migrations require project credentials.

