-- Wire Supabase Auth users, including Google OAuth users, into Flux and Fire profiles.
-- Public profile data stays in public.profiles; private account details stay self-only.

-- Sharing is the default for new glaze work. Private recipes remain available,
-- but they should be an explicit choice instead of the schema fallback.
alter table public.glazes
  alter column recipe_visibility set default 'public',
  alter column profile_visibility set default 'public';

alter table public.glaze_recipe_versions
  alter column visibility set default 'public';

create table if not exists public.profile_auth_details (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  email text,
  auth_provider text not null default 'email' check (auth_provider in ('email', 'google', 'magic_link', 'sso', 'unknown')),
  auth_provider_id text,
  email_verified boolean not null default false,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_auth_details_email_idx
  on public.profile_auth_details (lower(email))
  where email is not null;

create index if not exists profile_auth_details_provider_idx
  on public.profile_auth_details (auth_provider, auth_provider_id)
  where auth_provider_id is not null;

alter table public.profile_auth_details enable row level security;

grant select, insert, update on public.profile_auth_details to authenticated;
grant select, insert, update, delete on public.profile_auth_details to service_role;

drop policy if exists "profile auth details self select" on public.profile_auth_details;
create policy "profile auth details self select" on public.profile_auth_details
  for select
  to authenticated
  using ((select auth.uid()) = profile_id);

drop policy if exists "profile auth details self insert" on public.profile_auth_details;
create policy "profile auth details self insert" on public.profile_auth_details
  for insert
  to authenticated
  with check ((select auth.uid()) = profile_id);

drop policy if exists "profile auth details self update" on public.profile_auth_details;
create policy "profile auth details self update" on public.profile_auth_details
  for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create or replace function public.profile_username_from_auth(
  raw_meta jsonb,
  auth_email text,
  auth_user_id uuid
)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  base_value text;
  cleaned_value text;
  suffix text;
begin
  base_value := coalesce(
    nullif(raw_meta ->> 'user_name', ''),
    nullif(raw_meta ->> 'preferred_username', ''),
    nullif(raw_meta ->> 'name', ''),
    nullif(split_part(auth_email, '@', 1), ''),
    'artist-' || left(replace(auth_user_id::text, '-', ''), 8)
  );

  cleaned_value := lower(regexp_replace(base_value, '[^a-zA-Z0-9]+', '-', 'g'));
  cleaned_value := regexp_replace(cleaned_value, '(^-+|-+$)', '', 'g');
  cleaned_value := regexp_replace(cleaned_value, '-{2,}', '-', 'g');
  cleaned_value := left(cleaned_value, 32);

  if length(cleaned_value) < 3 then
    cleaned_value := 'artist-' || left(replace(auth_user_id::text, '-', ''), 8);
  end if;

  suffix := left(replace(auth_user_id::text, '-', ''), 6);

  if exists (
    select 1
    from public.profiles
    where username = cleaned_value
      and id <> auth_user_id
  ) then
    cleaned_value := left(cleaned_value, 25) || '-' || suffix;
  end if;

  return cleaned_value;
end;
$$;

revoke execute on function public.profile_username_from_auth(jsonb, text, uuid) from public;

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb;
  app_metadata jsonb;
  display_name text;
  username text;
  avatar_url text;
  provider_value text;
  normalized_provider text;
  provider_id text;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  app_metadata := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  display_name := coalesce(
    nullif(metadata ->> 'full_name', ''),
    nullif(metadata ->> 'name', ''),
    nullif(metadata ->> 'display_name', ''),
    nullif(metadata ->> 'preferred_username', ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Ceramic artist'
  );
  username := public.profile_username_from_auth(metadata, new.email, new.id);
  avatar_url := coalesce(nullif(metadata ->> 'avatar_url', ''), nullif(metadata ->> 'picture', ''));
  provider_value := coalesce(nullif(app_metadata ->> 'provider', ''), 'email');
  normalized_provider := case
    when provider_value = 'google' then 'google'
    when provider_value = 'sso' then 'sso'
    when provider_value in ('magiclink', 'magic_link') then 'magic_link'
    when provider_value = 'email' then 'email'
    else 'unknown'
  end;
  provider_id := coalesce(nullif(metadata ->> 'sub', ''), nullif(metadata ->> 'provider_id', ''));

  insert into public.profiles (
    id,
    display_name,
    username,
    avatar_url,
    biography,
    profile_type,
    identity_label
  )
  values (
    new.id,
    display_name,
    username,
    avatar_url,
    '',
    'artist',
    case
      when normalized_provider = 'google' then 'Google-connected ceramic profile'
      else 'Ceramic profile'
    end
  )
  on conflict (id) do update set
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  insert into public.profile_auth_details (
    profile_id,
    email,
    auth_provider,
    auth_provider_id,
    email_verified,
    last_sign_in_at
  )
  values (
    new.id,
    new.email,
    normalized_provider,
    provider_id,
    new.email_confirmed_at is not null,
    new.last_sign_in_at
  )
  on conflict (profile_id) do update set
    email = excluded.email,
    auth_provider = excluded.auth_provider,
    auth_provider_id = excluded.auth_provider_id,
    email_verified = excluded.email_verified,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = now();

  return new;
end;
$$;

revoke execute on function public.handle_auth_user_profile() from public;

drop trigger if exists on_auth_user_profile_changed on auth.users;
create trigger on_auth_user_profile_changed
  after insert or update of email, raw_user_meta_data, raw_app_meta_data, email_confirmed_at, last_sign_in_at
  on auth.users
  for each row execute function public.handle_auth_user_profile();
