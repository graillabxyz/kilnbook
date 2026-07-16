# Phased Implementation Plan

## Phase 1: Foundation

Implemented in this scaffold:

- Responsive application shell.
- Profile, onboarding, unit, privacy, and subscription surfaces.
- Kiln, glaze, clay-body, and firing libraries.
- Glaze recipe version model.
- Firing records, schedule editor, manual log points, live firing quick entry, environment capture, results, and comparison workspace.
- Image metadata and structured tag workflow.
- Basic search and Explore surfaces.
- Supabase migration, RLS policies, seed data, and typed services.
- Focused tests for unit conversion, rates, estimates, recipe math, entitlements, feed ranking, and privacy.

## Phase 2: Smart Planning

- Saved templates.
- Comparable-firing advisory schedule generation.
- Fuel and cost estimates.
- Maintenance prediction.
- Checklist templates and completion history.

## Phase 3: Community

- Full post composer persistence.
- Cursor-paginated Following and Popular feeds.
- Direct messages through Supabase Realtime.
- Bookmarks, collections, blocking, reporting, moderation queue.
- Public glaze, clay-body, firing, and result database pages backed by authorized image result-group queries.
- Explore search facets for social signal, visual result, ceramic context, recipe source, chemistry, and evidence quality.
- Result detail pages that start from the post story and unfold into image annotations, glaze profiles, clay bodies, firing records, comments, and privacy-aware public previews.
- Global glaze marketplace listings attached to public glaze profiles and seller profiles, with external shop links before in-app checkout.

## Phase 4: Paid Analytics

- Stripe subscriptions.
- Stripe Connect or equivalent seller payout flow for in-app glaze marketplace checkout.
- Saved dashboards.
- Advanced correlations and exports.
- Studio roles, approvals, audit history, and shared libraries.
- Confidence-scored analytics across recipe versions, commercial glazes, clay bodies, firing curves, defects, UMF regions, and environment data.
