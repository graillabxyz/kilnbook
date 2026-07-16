-- Add global glaze marketplace metadata.
-- Listings live on canonical glaze profiles so result history, seller profile,
-- recipe privacy, and fulfillment details stay connected.

alter table public.business_profiles
  add column if not exists marketplace_enabled boolean not null default false,
  add column if not exists seller_location text,
  add column if not exists ships_globally boolean not null default false,
  add column if not exists shop_policies text;

alter table public.glazes
  add column if not exists marketplace_enabled boolean not null default false,
  add column if not exists marketplace_formats text[] not null default '{}'::text[],
  add column if not exists marketplace_price_label text,
  add column if not exists marketplace_shop_url text,
  add column if not exists marketplace_ships_from text,
  add column if not exists marketplace_ships_globally boolean not null default false,
  add column if not exists marketplace_fulfillment_notes text,
  add column if not exists marketplace_safety_disclosure text,
  add column if not exists marketplace_inventory_status text not null default 'not_listed';

alter table public.glazes
  drop constraint if exists glazes_marketplace_inventory_status_check;

alter table public.glazes
  add constraint glazes_marketplace_inventory_status_check
  check (marketplace_inventory_status in ('not_listed', 'in_stock', 'made_to_order', 'limited', 'sold_out'));

create index if not exists business_profiles_marketplace_idx
  on public.business_profiles (marketplace_enabled, ships_globally)
  where marketplace_enabled is true;

create index if not exists glazes_marketplace_public_idx
  on public.glazes (marketplace_inventory_status, created_at desc)
  where marketplace_enabled is true and profile_visibility = 'public';

create index if not exists glazes_marketplace_formats_idx
  on public.glazes using gin (marketplace_formats);

insert into public.entitlements (id, minimum_plan, monthly_limit, description) values
  ('glaze_marketplace_listing', 'business', null, 'List sellable glaze profiles globally from a public seller profile.'),
  ('global_glaze_seller_profile', 'business', null, 'Public seller metadata, global shipping, shop policies, and glaze listing links.')
on conflict (id) do update set
  minimum_plan = excluded.minimum_plan,
  monthly_limit = excluded.monthly_limit,
  description = excluded.description;
