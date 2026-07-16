-- Flux and Fire Phase 1 schema for Supabase PostgreSQL.
-- The UI never depends on duplicated display records; canonical objects are
-- joined through explicit relationship tables and versioned where history matters.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  username text not null unique,
  avatar_url text,
  biography text not null default '',
  profile_type text not null default 'artist' check (profile_type in ('artist', 'studio', 'educator', 'researcher', 'collective', 'supplier', 'custom')),
  identity_label text,
  approximate_location text,
  website text,
  ceramic_specialties text[] not null default '{}',
  preferred_temperature_unit text not null default 'c' check (preferred_temperature_unit in ('c', 'f')),
  preferred_weight_unit text not null default 'g' check (preferred_weight_unit in ('g', 'kg', 'oz', 'lb')),
  preferred_wind_speed_unit text not null default 'kph' check (preferred_wind_speed_unit in ('kph', 'mph', 'mps', 'knots')),
  kiln_temperature_convention text not null default 'temperature',
  visibility text not null default 'public' check (visibility in ('private', 'followers', 'studio', 'public')),
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'professional', 'studio')),
  onboarding_complete boolean not null default false,
  notification_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.studios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null unique,
  visibility text not null default 'private' check (visibility in ('private', 'followers', 'studio', 'public')),
  created_at timestamptz not null default now()
);

create table public.studio_members (
  studio_id uuid not null references public.studios (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'firer', 'employee', 'teacher', 'student', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (studio_id, profile_id)
);

create table public.subscription_plans (
  id text primary key,
  name text not null,
  description text not null
);

create table public.entitlements (
  id text primary key,
  minimum_plan text not null references public.subscription_plans (id),
  monthly_limit integer,
  description text not null
);

create table public.kilns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  studio_id uuid references public.studios (id) on delete set null,
  name text not null,
  manufacturer text,
  model text,
  serial_number_private text,
  kiln_type text not null,
  fuel_type text not null,
  controller_type text,
  controller_model text,
  internal_dimensions jsonb,
  usable_volume_liters numeric,
  power_kw numeric,
  voltage numeric,
  phase text,
  amperage numeric,
  burner_count integer,
  burner_type text,
  chimney_dimensions text,
  insulation_type text,
  maximum_temperature_c numeric,
  recommended_cone_range text,
  default_location text not null default 'indoors',
  installation_date date,
  acquisition_date date,
  photo_image_id uuid,
  manual_storage_path text,
  notes text not null default '',
  active boolean not null default true,
  visibility text not null default 'private' check (visibility in ('private', 'followers', 'studio', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kiln_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  kiln_id uuid not null references public.kilns (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  maintenance_date date not null,
  kiln_hour_reading numeric,
  firing_count integer,
  maintenance_type text not null,
  description text not null,
  cost numeric,
  service_provider text,
  next_recommended_service_date date,
  created_at timestamptz not null default now()
);

create table public.ceramic_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  notes text not null default ''
);

create table public.glazes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  studio_id uuid references public.studios (id) on delete set null,
  name text not null,
  creator_attribution text,
  source text,
  glaze_type text,
  surface text,
  color_family text[] not null default '{}',
  opacity text,
  finish text,
  firing_range text,
  cone_range text,
  atmosphere_compatibility text[] not null default '{}',
  food_safety_status text,
  safety_notes text,
  recipe_visibility text not null default 'private' check (recipe_visibility in ('private', 'followers', 'studio', 'public')),
  profile_visibility text not null default 'private' check (profile_visibility in ('private', 'followers', 'studio', 'public')),
  description text not null default '',
  application_notes text not null default '',
  mixing_notes text,
  hero_image_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.glaze_recipe_versions (
  id uuid primary key default gen_random_uuid(),
  glaze_id uuid not null references public.glazes (id) on delete cascade,
  version_number integer not null,
  effective_date date not null default current_date,
  batch_size_grams numeric not null,
  total_dry_weight_grams numeric not null,
  water_amount_grams numeric,
  additives jsonb not null default '[]'::jsonb,
  notes text not null default '',
  source_attribution text,
  change_summary text not null,
  calculated_total_percentage numeric not null,
  recipe_fingerprint text not null,
  visibility text not null default 'private' check (visibility in ('private', 'followers', 'studio', 'public')),
  created_at timestamptz not null default now(),
  unique (glaze_id, version_number)
);

create table public.glaze_recipe_ingredients (
  recipe_version_id uuid not null references public.glaze_recipe_versions (id) on delete cascade,
  material_id uuid references public.ceramic_materials (id) on delete restrict,
  material_name_snapshot text not null,
  ingredient_role text not null check (ingredient_role in ('base', 'colorant', 'additive')),
  percentage numeric not null,
  weight_grams numeric not null,
  display_order integer not null default 0,
  primary key (recipe_version_id, material_name_snapshot, ingredient_role)
);

create table public.clay_bodies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  studio_id uuid references public.studios (id) on delete set null,
  name text not null,
  manufacturer text,
  supplier text,
  source text,
  body_type text not null,
  raw_color text,
  fired_color text,
  texture text,
  grog_percentage numeric,
  grog_size text,
  absorption_percentage numeric,
  shrinkage_percentage numeric,
  maturation_range text,
  cone_range text,
  atmosphere_suitability text[] not null default '{}',
  recipe_visibility text not null default 'private' check (recipe_visibility in ('private', 'followers', 'studio', 'public')),
  profile_visibility text not null default 'private' check (profile_visibility in ('private', 'followers', 'studio', 'public')),
  notes text not null default '',
  image_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.clay_body_recipe_versions (
  id uuid primary key default gen_random_uuid(),
  clay_body_id uuid not null references public.clay_bodies (id) on delete cascade,
  version_number integer not null,
  effective_date date not null default current_date,
  notes text not null default '',
  change_summary text not null,
  visibility text not null default 'private' check (visibility in ('private', 'followers', 'studio', 'public')),
  created_at timestamptz not null default now(),
  unique (clay_body_id, version_number)
);

create table public.firings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  studio_id uuid references public.studios (id) on delete set null,
  title text not null,
  readable_number text not null,
  kiln_id uuid not null references public.kilns (id) on delete restrict,
  kiln_name_snapshot text not null,
  kiln_spec_snapshot jsonb not null,
  firing_type text not null,
  status text not null default 'draft' check (status in ('draft', 'planned', 'scheduled', 'in_progress', 'cooling', 'completed', 'cancelled', 'archived')),
  visibility text not null default 'private' check (visibility in ('private', 'followers', 'studio', 'public')),
  planned_start_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  timezone text not null,
  lead_firer_id uuid references public.profiles (id) on delete set null,
  target_temperature_c numeric,
  target_cone text,
  witness_cone_result text,
  firing_atmosphere text,
  reduction_start_temperature_c numeric,
  reduction_end_temperature_c numeric,
  damper_notes text,
  burner_settings text,
  gas_pressure_notes text,
  oxygen_notes text,
  kiln_pressure_notes text,
  chimney_behavior text,
  flame_appearance_notes text,
  smoke_notes text,
  cooling_method text,
  load_fullness_percentage numeric,
  estimated_ware_density text,
  shelf_layout jsonb,
  total_firing_minutes integer,
  total_heating_minutes integer,
  total_cooling_minutes integer,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, readable_number)
);

create table public.firing_collaborators (
  firing_id uuid not null references public.firings (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'collaborator',
  primary key (firing_id, profile_id)
);

create table public.firing_segments (
  id uuid primary key default gen_random_uuid(),
  firing_id uuid not null references public.firings (id) on delete cascade,
  segment_type text not null,
  start_elapsed_minutes integer not null,
  end_elapsed_minutes integer not null,
  start_temperature_c numeric,
  target_temperature_c numeric,
  atmosphere text,
  notes text not null default ''
);

create table public.firing_log_points (
  id uuid primary key default gen_random_uuid(),
  firing_id uuid not null references public.firings (id) on delete cascade,
  logged_at timestamptz not null,
  elapsed_minutes integer not null,
  target_temperature_c numeric,
  actual_temperature_c numeric not null,
  calculated_rate_c_per_hour numeric,
  segment_type text,
  atmosphere text,
  gas_pressure_kpa numeric,
  oxygen_percentage numeric,
  damper_position text,
  burner_setting text,
  notes text not null default '',
  event_marker text,
  source text not null default 'manual' check (source in ('manual', 'imported')),
  created_at timestamptz not null default now()
);

create table public.firing_environment_records (
  id uuid primary key default gen_random_uuid(),
  firing_id uuid not null references public.firings (id) on delete cascade,
  kiln_location text not null,
  outside_start_temperature_c numeric,
  outside_low_c numeric,
  outside_high_c numeric,
  indoor_ambient_temperature_c numeric,
  humidity_start_percentage numeric,
  humidity_low_percentage numeric,
  humidity_high_percentage numeric,
  wind_speed_kph numeric,
  wind_direction text,
  wind_gust_kph numeric,
  rain_conditions text,
  barometric_pressure_hpa numeric,
  ventilation_notes text,
  weather_notes text,
  approximate_weather_location text,
  created_at timestamptz not null default now()
);

create table public.ceramic_pieces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  piece_type text not null,
  artist_id uuid references public.profiles (id) on delete set null,
  clay_body_id uuid references public.clay_bodies (id) on delete set null,
  forming_method text,
  construction_date date,
  drying_duration_days numeric,
  estimated_wall_thickness_mm numeric,
  bisque_firing_id uuid references public.firings (id) on delete set null,
  final_firing_id uuid references public.firings (id) on delete set null,
  dimensions jsonb,
  weight_grams numeric,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.firing_pieces (
  firing_id uuid not null references public.firings (id) on delete cascade,
  piece_id uuid not null references public.ceramic_pieces (id) on delete cascade,
  primary key (firing_id, piece_id)
);

create table public.glaze_applications (
  id uuid primary key default gen_random_uuid(),
  firing_id uuid not null references public.firings (id) on delete cascade,
  glaze_id uuid not null references public.glazes (id) on delete restrict,
  glaze_recipe_version_id uuid not null references public.glaze_recipe_versions (id) on delete restrict,
  clay_body_id uuid references public.clay_bodies (id) on delete set null,
  ceramic_piece_id uuid references public.ceramic_pieces (id) on delete set null,
  application_method text not null,
  application_thickness text,
  number_of_coats numeric,
  specific_gravity numeric,
  bisque_temperature_c numeric,
  kiln_position text,
  shelf_level text,
  distance_from_burner_or_element text,
  orientation text,
  notes text not null default '',
  result_rating integer check (result_rating between 0 and 100),
  result_status text not null default 'untested',
  created_at timestamptz not null default now()
);

comment on table public.glaze_applications is
  'Firing-specific record that preserves exact glaze version, clay body, application method, and result conditions.';

create table public.glaze_application_layers (
  id uuid primary key default gen_random_uuid(),
  glaze_application_id uuid not null references public.glaze_applications (id) on delete cascade,
  glaze_id uuid not null references public.glazes (id) on delete restrict,
  glaze_recipe_version_id uuid not null references public.glaze_recipe_versions (id) on delete restrict,
  layer_order integer not null,
  layer_location text not null,
  number_of_coats numeric,
  unique (glaze_application_id, layer_order, layer_location)
);

create table public.result_defects (
  glaze_application_id uuid not null references public.glaze_applications (id) on delete cascade,
  defect text not null,
  severity text,
  notes text,
  primary key (glaze_application_id, defect)
);

create table public.images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  storage_bucket text not null default 'flux-and-fire-images',
  storage_path text not null,
  original_filename text,
  content_type text not null,
  byte_size bigint not null,
  width integer,
  height integer,
  caption text not null default '',
  alt_text text not null default '',
  focal_point jsonb not null default '{"x":0.5,"y":0.5}'::jsonb,
  visibility text not null default 'private' check (visibility in ('private', 'followers', 'studio', 'public')),
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table public.image_firing_tags (
  image_id uuid not null references public.images (id) on delete cascade,
  firing_id uuid not null references public.firings (id) on delete cascade,
  primary key (image_id, firing_id)
);

create table public.image_glaze_tags (
  image_id uuid not null references public.images (id) on delete cascade,
  glaze_id uuid not null references public.glazes (id) on delete cascade,
  primary key (image_id, glaze_id)
);

create table public.image_clay_body_tags (
  image_id uuid not null references public.images (id) on delete cascade,
  clay_body_id uuid not null references public.clay_bodies (id) on delete cascade,
  primary key (image_id, clay_body_id)
);

create table public.image_piece_tags (
  image_id uuid not null references public.images (id) on delete cascade,
  piece_id uuid not null references public.ceramic_pieces (id) on delete cascade,
  primary key (image_id, piece_id)
);

create table public.image_glaze_application_tags (
  image_id uuid not null references public.images (id) on delete cascade,
  glaze_application_id uuid not null references public.glaze_applications (id) on delete cascade,
  primary key (image_id, glaze_application_id)
);

create table public.image_regions (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.images (id) on delete cascade,
  region_shape jsonb not null,
  label text,
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '',
  visibility text not null default 'public' check (visibility in ('private', 'followers', 'studio', 'public')),
  broad_location text,
  preview_snapshot jsonb not null default '{}'::jsonb,
  engagement_score numeric not null default 0,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table public.post_images (
  post_id uuid not null references public.posts (id) on delete cascade,
  image_id uuid not null references public.images (id) on delete cascade,
  display_order integer not null default 0,
  caption text,
  primary key (post_id, image_id)
);

create table public.post_firings (
  post_id uuid not null references public.posts (id) on delete cascade,
  firing_id uuid not null references public.firings (id) on delete cascade,
  primary key (post_id, firing_id)
);

create table public.post_glazes (
  post_id uuid not null references public.posts (id) on delete cascade,
  glaze_id uuid not null references public.glazes (id) on delete cascade,
  primary key (post_id, glaze_id)
);

create table public.post_clay_bodies (
  post_id uuid not null references public.posts (id) on delete cascade,
  clay_body_id uuid not null references public.clay_bodies (id) on delete cascade,
  primary key (post_id, clay_body_id)
);

create table public.post_pieces (
  post_id uuid not null references public.posts (id) on delete cascade,
  piece_id uuid not null references public.ceramic_pieces (id) on delete cascade,
  primary key (post_id, piece_id)
);

create table public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique
);

create table public.post_hashtags (
  post_id uuid not null references public.posts (id) on delete cascade,
  hashtag_id uuid not null references public.hashtags (id) on delete cascade,
  primary key (post_id, hashtag_id)
);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_comment_id uuid references public.comments (id) on delete cascade,
  body text not null,
  edited_at timestamptz,
  deleted_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.feed_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  last_feed_tab text not null default 'following' check (last_feed_tab in ('following', 'popular')),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null default 'direct' check (conversation_type in ('direct', 'group')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  muted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '',
  reported_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  image_id uuid references public.images (id) on delete set null,
  linked_firing_id uuid references public.firings (id) on delete set null,
  linked_glaze_id uuid references public.glazes (id) on delete set null,
  linked_clay_body_id uuid references public.clay_bodies (id) on delete set null,
  linked_post_id uuid references public.posts (id) on delete set null
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  notification_type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table public.mutes (
  muter_id uuid not null references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id)
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  subject_type text not null,
  subject_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_username_idx on public.profiles (username);
create index studio_members_profile_idx on public.studio_members (profile_id);
create index kilns_owner_idx on public.kilns (owner_id, active);
create index firings_owner_started_idx on public.firings (owner_id, actual_start_at desc);
create index firings_status_idx on public.firings (status);
create index firing_log_points_order_idx on public.firing_log_points (firing_id, elapsed_minutes);
create index firing_segments_order_idx on public.firing_segments (firing_id, start_elapsed_minutes);
create index glazes_owner_name_idx on public.glazes (owner_id, name);
create index clay_bodies_owner_name_idx on public.clay_bodies (owner_id, name);
create index glaze_applications_glaze_idx on public.glaze_applications (glaze_id, clay_body_id, firing_id);
create index glaze_applications_clay_idx on public.glaze_applications (clay_body_id, glaze_id, firing_id);
create index images_owner_visibility_idx on public.images (owner_id, visibility);
create index posts_author_created_idx on public.posts (author_id, created_at desc);
create index posts_visibility_created_idx on public.posts (visibility, created_at desc);
create index posts_engagement_idx on public.posts (engagement_score desc, created_at desc);
create index post_likes_profile_idx on public.post_likes (profile_id);
create index comments_post_created_idx on public.comments (post_id, created_at);
create index follows_following_idx on public.follows (following_id, follower_id);
create index conversation_members_profile_idx on public.conversation_members (profile_id, conversation_id);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
create index notifications_profile_unread_idx on public.notifications (profile_id, read_at, created_at desc);

alter table public.profiles enable row level security;
alter table public.studios enable row level security;
alter table public.studio_members enable row level security;
alter table public.kilns enable row level security;
alter table public.kiln_maintenance_records enable row level security;
alter table public.glazes enable row level security;
alter table public.glaze_recipe_versions enable row level security;
alter table public.glaze_recipe_ingredients enable row level security;
alter table public.clay_bodies enable row level security;
alter table public.clay_body_recipe_versions enable row level security;
alter table public.firings enable row level security;
alter table public.firing_collaborators enable row level security;
alter table public.firing_segments enable row level security;
alter table public.firing_log_points enable row level security;
alter table public.firing_environment_records enable row level security;
alter table public.ceramic_pieces enable row level security;
alter table public.firing_pieces enable row level security;
alter table public.glaze_applications enable row level security;
alter table public.glaze_application_layers enable row level security;
alter table public.result_defects enable row level security;
alter table public.images enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.post_firings enable row level security;
alter table public.post_glazes enable row level security;
alter table public.post_clay_bodies enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.feed_preferences enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.blocks enable row level security;
alter table public.mutes enable row level security;
alter table public.content_reports enable row level security;
alter table public.audit_events enable row level security;

create or replace function public.is_studio_member(target_studio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.studio_members
    where studio_id = target_studio_id and profile_id = auth.uid()
  );
$$;

create or replace function public.can_view_owned_visibility(
  owner_id uuid,
  studio_id uuid,
  visibility text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = owner_id
    or visibility = 'public'
    or (visibility = 'studio' and studio_id is not null and public.is_studio_member(studio_id))
    or (
      visibility = 'followers'
      and exists (
        select 1 from public.follows
        where follower_id = auth.uid() and following_id = owner_id
      )
    );
$$;

create policy "profiles owner update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles visible select" on public.profiles
  for select using (public.can_view_owned_visibility(id, null, visibility));
create policy "profiles self insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "owned kilns select" on public.kilns
  for select using (public.can_view_owned_visibility(owner_id, studio_id, visibility));
create policy "owned kilns write" on public.kilns
  for all using (auth.uid() = owner_id or public.is_studio_member(studio_id))
  with check (auth.uid() = owner_id or public.is_studio_member(studio_id));

create policy "owned glazes select" on public.glazes
  for select using (public.can_view_owned_visibility(owner_id, studio_id, profile_visibility));
create policy "owned glazes write" on public.glazes
  for all using (auth.uid() = owner_id or public.is_studio_member(studio_id))
  with check (auth.uid() = owner_id or public.is_studio_member(studio_id));

create policy "recipe versions visible by recipe policy" on public.glaze_recipe_versions
  for select using (
    exists (
      select 1 from public.glazes
      where glazes.id = glaze_recipe_versions.glaze_id
        and public.can_view_owned_visibility(glazes.owner_id, glazes.studio_id, glaze_recipe_versions.visibility)
    )
  );
create policy "recipe versions owner write" on public.glaze_recipe_versions
  for all using (
    exists (select 1 from public.glazes where glazes.id = glaze_recipe_versions.glaze_id and glazes.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.glazes where glazes.id = glaze_recipe_versions.glaze_id and glazes.owner_id = auth.uid())
  );

create policy "recipe ingredients follow version" on public.glaze_recipe_ingredients
  for select using (
    exists (
      select 1 from public.glaze_recipe_versions grv
      join public.glazes g on g.id = grv.glaze_id
      where grv.id = glaze_recipe_ingredients.recipe_version_id
        and public.can_view_owned_visibility(g.owner_id, g.studio_id, grv.visibility)
    )
  );

create policy "clay bodies select" on public.clay_bodies
  for select using (public.can_view_owned_visibility(owner_id, studio_id, profile_visibility));
create policy "clay bodies write" on public.clay_bodies
  for all using (auth.uid() = owner_id or public.is_studio_member(studio_id))
  with check (auth.uid() = owner_id or public.is_studio_member(studio_id));

create policy "firings select" on public.firings
  for select using (
    public.can_view_owned_visibility(owner_id, studio_id, visibility)
    or exists (
      select 1 from public.firing_collaborators
      where firing_id = firings.id and profile_id = auth.uid()
    )
  );
create policy "firings write" on public.firings
  for all using (auth.uid() = owner_id or public.is_studio_member(studio_id))
  with check (auth.uid() = owner_id or public.is_studio_member(studio_id));

create policy "firing child select follows firing" on public.firing_log_points
  for select using (
    exists (
      select 1 from public.firings
      where firings.id = firing_log_points.firing_id
        and public.can_view_owned_visibility(firings.owner_id, firings.studio_id, firings.visibility)
    )
  );
create policy "firing child write follows owner" on public.firing_log_points
  for all using (
    exists (select 1 from public.firings where firings.id = firing_log_points.firing_id and firings.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.firings where firings.id = firing_log_points.firing_id and firings.owner_id = auth.uid())
  );

create policy "images select" on public.images
  for select using (public.can_view_owned_visibility(owner_id, null, visibility));
create policy "images write" on public.images
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "posts select" on public.posts
  for select using (public.can_view_owned_visibility(author_id, null, visibility));
create policy "posts write" on public.posts
  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "likes select visible posts" on public.post_likes
  for select using (
    exists (
      select 1 from public.posts
      where posts.id = post_likes.post_id
        and public.can_view_owned_visibility(posts.author_id, null, posts.visibility)
    )
  );
create policy "likes self write" on public.post_likes
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "comments visible posts" on public.comments
  for select using (
    exists (
      select 1 from public.posts
      where posts.id = comments.post_id
        and public.can_view_owned_visibility(posts.author_id, null, posts.visibility)
    )
  );
create policy "comments self write" on public.comments
  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "conversation members select own" on public.conversation_members
  for select using (profile_id = auth.uid());
create policy "messages select conversation member" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_members
      where conversation_id = messages.conversation_id and profile_id = auth.uid()
    )
  );
create policy "messages insert member" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members
      where conversation_id = messages.conversation_id and profile_id = auth.uid()
    )
  );

create policy "notifications self" on public.notifications
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "blocks self" on public.blocks
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "mutes self" on public.mutes
  for all using (muter_id = auth.uid()) with check (muter_id = auth.uid());
create policy "feed preferences self" on public.feed_preferences
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
