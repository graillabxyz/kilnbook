-- Cover the optional business portfolio hero image foreign key for deletes and joins.

create index if not exists business_profiles_hero_image_idx
  on public.business_profiles (portfolio_hero_image_id)
  where portfolio_hero_image_id is not null;
