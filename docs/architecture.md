# Flux and Fire Architecture

Flux and Fire is a Next.js App Router application with a profile-first hierarchy and small client islands for the live firing workflow, forms, feed tab preference, image tagging, and chart rendering.

Core business logic lives in `lib/`:

- `product.ts`: centralized product naming and navigation.
- `domain.ts`: typed canonical records.
- `units.ts`: normalized measurement conversion.
- `recipe.ts`: recipe scaling, totals, and duplicate fingerprints.
- `firing-calculator.ts`: deterministic firing estimates and rate-of-rise calculations.
- `entitlements.ts`: centralized plan and feature decisions.
- `subscriptions.ts`: Business launch offer, plan labels, and pricing constants.
- `feed-ranking.ts`: time-decayed popular feed score.
- `privacy.ts`: record visibility checks.
- `services/kilnbook-repository.ts`: data access boundary used by the UI.
- `supabase/client.ts`: configured Supabase client factory.

The production database is Supabase PostgreSQL with RLS. UI components should call repository/service functions and never scatter Supabase queries through visual components. Business profiles live in a separate RLS-protected table so public portfolio details can be exposed without mixing them into private account/auth metadata.

Phase 1 is implemented as a preview-ready application surface with realistic ceramic seed data, production migration artifacts, and PWA install metadata. Live Supabase auth, storage transforms, realtime subscriptions, and remote migrations require project credentials.
