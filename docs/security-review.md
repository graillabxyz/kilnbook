# Security Review

- Supabase row-level security is enabled on user-owned records, social records, messages, notifications, blocks, mutes, and audit events.
- Client code does not contain a service-role key.
- Private recipes are protected at the recipe-version visibility layer.
- Public posts do not automatically expose private linked firing, glaze, clay-body, or image fields.
- Message reads require conversation membership.
- Image metadata is canonical and protected separately from tag relationships.
- Entitlements are centralized in `lib/entitlements.ts`.

Remaining production work:

- Apply the migration to a real Supabase project and test policies with multiple real users.
- Add storage bucket policies for original and derivative images.
- Add server-side rate limits for posts, comments, messages, and uploads.
- Add file type and byte-size checks before storage writes.
- Add CSRF-aware server actions where write actions move from preview state to production persistence.

