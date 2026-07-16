-- Add the launch-period Business tier and public business profile metadata.
-- Free remains the generous default; Business adds professional portfolio,
-- directory, inventory, analytics, cost, export, and notification surfaces.

alter table public.profiles
  drop constraint if exists profiles_subscription_tier_check;

alter table public.profiles
  add constraint profiles_subscription_tier_check
  check (subscription_tier in ('free', 'professional', 'business', 'studio'));

create table if not exists public.business_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  business_name text not null,
  logo_url text,
  description text not null default '',
  website_url text,
  instagram text,
  etsy text,
  shopify text,
  facebook text,
  youtube text,
  google_maps_url text,
  business_hours text,
  contact_email text,
  contact_phone text,
  public_studio_address text,
  services_offered text[] not null default '{}',
  portfolio_hero_image_id uuid references public.images (id) on delete set null,
  portfolio_hero_image_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_profiles_business_name_idx
  on public.business_profiles (business_name);

create index if not exists business_profiles_services_idx
  on public.business_profiles using gin (services_offered);

alter table public.business_profiles enable row level security;

grant select on table public.business_profiles to anon, authenticated;
grant insert, update, delete on table public.business_profiles to authenticated;
grant select, insert, update, delete on table public.business_profiles to service_role;

drop policy if exists "business profiles visible by profile visibility" on public.business_profiles;
create policy "business profiles visible by profile visibility" on public.business_profiles
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = business_profiles.profile_id
        and public.can_view_owned_visibility(profiles.id, null, profiles.visibility)
    )
  );

drop policy if exists "business profiles self insert" on public.business_profiles;
create policy "business profiles self insert" on public.business_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = profile_id);

drop policy if exists "business profiles self update" on public.business_profiles;
create policy "business profiles self update" on public.business_profiles
  for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

drop policy if exists "business profiles self delete" on public.business_profiles;
create policy "business profiles self delete" on public.business_profiles
  for delete
  to authenticated
  using ((select auth.uid()) = profile_id);

insert into public.subscription_plans (id, name, description) values
  ('free', 'Free', 'Core firing journal, libraries, basic charts, community browsing, posting, following, comments, and limited messaging.'),
  ('professional', 'Professional legacy', 'Legacy professional label kept for existing accounts while Business becomes the launch upgrade path.'),
  ('business', 'Business', 'Free during the 2026 initial release period; 2027 price is 4.99 USD per month. Adds public business profiles, directory priority, portfolio, studio analytics, cost tracking, inventory, exports, and business reminders.'),
  ('studio', 'Studio', 'Future multi-member studios, shared records, roles, approvals, and studio analytics.')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.entitlements (id, minimum_plan, monthly_limit, description) values
  ('unlimited_personal_firings', 'free', null, 'Unlimited personal firing records subject to anti-abuse policies.'),
  ('basic_firing_curves', 'free', null, 'Manual firing curves with 30 or 60 minute intervals.'),
  ('image_tagging', 'free', null, 'Tag images to canonical firings, glazes, clay bodies, pieces, and applications.'),
  ('limited_messaging', 'free', 8, 'Limited new conversation requests each month on Free, with expanded limits on upgraded plans.'),
  ('advanced_firing_analytics', 'business', null, 'Advanced firing and kiln-performance analysis.'),
  ('multi_firing_comparison', 'business', null, 'Compare two to five firings with curve overlays.'),
  ('smart_schedule_generation', 'business', null, 'Generate advisory firing plans using deterministic rules and history.'),
  ('private_recipe_history', 'business', null, 'Version history for private glaze and clay-body recipes.'),
  ('full_resolution_storage', 'business', null, 'Expanded full-resolution image storage for business libraries.'),
  ('business_profile', 'business', null, 'Public business contact, shop, service, location, and portfolio details.'),
  ('studio_portfolio', 'business', null, 'Public-facing portfolio pages and curated professional work.'),
  ('business_directory', 'business', null, 'Directory and search priority for businesses, teachers, services, and production potters.'),
  ('studio_analytics', 'business', null, 'Studio analytics for professional firing and production operations.'),
  ('cost_tracking', 'business', null, 'Fuel, labor, maintenance, depreciation, and per-piece cost tracking.'),
  ('advanced_firing_insights', 'business', null, 'Advanced comparisons and insight language that avoids overstating causation.'),
  ('advanced_image_library', 'business', null, 'Search images by glaze, clay body, firing, kiln position, atmosphere, year, piece type, and defect.'),
  ('material_inventory', 'business', null, 'Material stock, batch availability, reorder needs, and usage history.'),
  ('kiln_inventory', 'business', null, 'Kiln equipment, shelves, posts, cones, thermocouples, elements, burners, and maintenance history.'),
  ('business_collections', 'business', null, 'Curated public collections for teaching, portfolio, and product presentation.'),
  ('advanced_export', 'business', null, 'CSV, PDF firing reports, inventory reports, financial summaries, and JSON backups.'),
  ('business_notifications', 'business', null, 'Business reminders for materials, kiln maintenance, incomplete records, and reporting.'),
  ('studio_shared_records', 'studio', null, 'Shared studio kilns, glazes, firings, and image libraries.'),
  ('studio_permissions', 'studio', null, 'Role-based permissions for multi-member studio workspaces.')
on conflict (id) do update set
  minimum_plan = excluded.minimum_plan,
  monthly_limit = excluded.monthly_limit,
  description = excluded.description;
