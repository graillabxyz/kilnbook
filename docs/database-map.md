# Database Relationship Map

```mermaid
erDiagram
  profiles ||--o{ kilns : owns
  profiles ||--o{ firings : owns
  profiles ||--o{ glazes : owns
  profiles ||--o{ clay_bodies : owns
  studios ||--o{ studio_members : has
  studios ||--o{ firings : shares
  kilns ||--o{ firings : used_by
  firings ||--o{ firing_segments : plans
  firings ||--o{ firing_log_points : records
  firings ||--o{ firing_environment_records : captures
  glazes ||--o{ glaze_recipe_versions : versions
  profiles ||--o{ glazes : sells
  glaze_recipe_versions ||--o{ glaze_recipe_ingredients : contains
  clay_bodies ||--o{ clay_body_recipe_versions : versions
  firings ||--o{ glaze_applications : produces
  glazes ||--o{ glaze_applications : applied_as
  glaze_recipe_versions ||--o{ glaze_applications : historical_version
  clay_bodies ||--o{ glaze_applications : body_used
  ceramic_pieces ||--o{ glaze_applications : receives
  glaze_applications ||--o{ glaze_application_layers : layers
  images ||--o{ image_glaze_tags : tagged
  images ||--o{ image_clay_body_tags : tagged
  images ||--o{ image_firing_tags : tagged
  posts ||--o{ post_firings : links
  posts ||--o{ post_glazes : links
  posts ||--o{ post_clay_bodies : links
  posts ||--o{ post_images : shows
  conversations ||--o{ messages : contains
```

Key integrity rules:

- One glaze profile can have many recipe versions.
- A firing-specific glaze application references the exact glaze recipe version used.
- Clay bodies are canonical records, not text labels.
- Images are canonical storage metadata and use join tables for structured tags.
- Posts link to canonical records and may store only lightweight historical preview snapshots.
- Private recipe and firing data is filtered by RLS, not hidden only in the browser.
- Marketplace listings attach to glaze profiles so seller context, result history, recipe privacy, and safety disclosures remain connected.
