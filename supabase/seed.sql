insert into public.subscription_plans (id, name, description) values
  ('free', 'Free', 'Core firing journal, libraries, basic charts, community browsing, and limited messaging.'),
  ('professional', 'Professional', 'Advanced analytics, smart planning, private recipe history, and expanded exports.'),
  ('studio', 'Studio', 'Future multi-member studios, shared records, roles, approvals, and studio analytics.')
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into public.entitlements (id, minimum_plan, monthly_limit, description) values
  ('unlimited_personal_firings', 'free', null, 'Unlimited personal firing records subject to anti-abuse policies.'),
  ('basic_firing_curves', 'free', null, 'Manual firing curves with 30 or 60 minute intervals.'),
  ('image_tagging', 'free', null, 'Tag images to canonical firings, glazes, clay bodies, pieces, and applications.'),
  ('limited_messaging', 'free', 8, 'Limited new conversation requests each month.'),
  ('advanced_firing_analytics', 'professional', null, 'Advanced firing and kiln-performance analysis.'),
  ('multi_firing_comparison', 'professional', null, 'Compare two to five firings with curve overlays.'),
  ('smart_schedule_generation', 'professional', null, 'Generate advisory firing plans using deterministic rules and history.'),
  ('private_recipe_history', 'professional', null, 'Version history for private glaze and clay-body recipes.'),
  ('studio_shared_records', 'studio', null, 'Shared studio kilns, glazes, firings, and image libraries.')
on conflict (id) do update set
  minimum_plan = excluded.minimum_plan,
  monthly_limit = excluded.monthly_limit,
  description = excluded.description;

insert into public.ceramic_materials (name, category, notes) values
  ('Custer Feldspar', 'flux', 'Common potassium feldspar in cone 6-10 glazes.'),
  ('Silica 325 mesh', 'silica', 'Fine silica for glass former adjustments.'),
  ('EPK Kaolin', 'clay', 'Kaolin used for alumina and suspension.'),
  ('Whiting', 'flux', 'Calcium carbonate source.'),
  ('Red Iron Oxide', 'colorant', 'Iron colorant for tenmoku and celadon work.'),
  ('Rutile', 'colorant', 'Titanium-bearing colorant for variegation.')
on conflict (name) do nothing;

