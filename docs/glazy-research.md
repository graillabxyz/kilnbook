# Glazy Review And Flux And Fire Structure

Date reviewed: 2026-07-16

## Scope

This review used the user-provided Glazy URLs:

- https://glazy.org/search?base_type=110
- https://glazy.org/recipes/168541
- https://glazy.org/sitemap.xml
- https://glazy.org/robots.txt

Glazy is a JavaScript application, so public HTML fetches return only the app shell. The review therefore focused on public navigation, visible route structure, representative search/detail behavior, and product concepts observable from the app surface. Glazy's `robots.txt` allows user-facing browsing while explicitly disallowing bulk scraping and large-scale AI dataset collection, so this document does not copy community records, recipes, photos, or user data.

## Public Page Map

The sitemap exposes these public areas:

- Home
- Search
- Materials
- Analyses
- Kiln schedules
- Login
- Register

The application route structure also indicates deeper pages for recipes, materials, analyses, exported recipes, kiln schedules, posts, user profiles, user recipes, user materials, user analyses, images, reviews, comments, bookmarks, inventory, and settings.

## Search Model Findings

Glazy's search surface is strongest when it lets technical users filter by ceramic variables rather than only by text. The most relevant facets for Flux and Fire are:

- Base or record type
- Keyword
- Cone or temperature range
- Atmosphere
- Surface
- Transparency or opacity
- Color
- Country or location
- Author
- Has photo
- Included materials
- Required oxides
- Excluded oxides
- Status, publication state, and production state
- Sorting by newest, oldest, updated, activity, best, and worst

Flux and Fire should use this as inspiration for a modern result database, but the search should begin from social evidence: images, posts, comments, saves, and result groups. A casual user should not need to understand oxide search to participate. A researcher should be able to turn on that precision when needed.

## Recipe Detail Findings

The Glazy recipe detail page is valuable because it combines recipe data, chemistry, images, comments, reviews, revisions, and firing context in one place. Important concepts to support in Flux and Fire:

- Recipe name, aliases, description, and attribution
- Recipe versions and revisions
- Parent, child, and sibling recipe relationships
- Ingredient percentages and batch calculations
- Water, specific gravity, and application notes
- Cone range and atmosphere
- Surface, transparency, color, and photo evidence
- UMF, extended UMF, percentage analysis, formula analysis, and LOI
- Fluxes, stabilizers, glass-formers, colorants, and additives
- Calculated expansion and fit-related warnings
- Kiln schedules and ramp/hold data
- Reviews, comments, bookmarks, shares, export, and print

Flux and Fire should present this depth as progressive disclosure. The result page can start with the social post and image result groups, then unfold into recipe versions, firing records, clay body fit, chemistry, comparisons, and analytics.

## Kiln And Firing Findings

Kiln schedules are a first-class public concept on Glazy. Flux and Fire should go further by making firing detail flexible:

- A firing can be a sparse historic memory.
- A firing can be a structured record with cone, kiln type, atmosphere, clay, glaze, and notes.
- A firing can include a full schedule, holds, damper notes, weather, kiln position, and results.
- A firing can be live-tracked with readings, curves, environment data, images, and later cleanup.
- A firing can become research-grade when variables, material lots, recipe versions, and replication notes matter.

This lets casual, archival, studio, and engineering-oriented users all use the same product without being forced into the same detail level.

## What Flux And Fire Should Not Do

- Do not try to replace Glazy's recipe database.
- Do not clone Glazy's information architecture or community records.
- Do not make chemistry-first forms the default user experience.
- Do not make incomplete old firings feel invalid.
- Do not hide privacy controls behind visual-only affordances.

## Flux And Fire Product Position

Flux and Fire should be social first and glaze-results focused:

- The home feed is for conversation, discoveries, kiln openings, test tiles, questions, and progress.
- The core evidence unit is an image result group: a portion of an image that can connect to a firing, glaze, clay body, kiln, recipe version, application method, and notes.
- The search database grows from public and authorized result groups, not from disconnected sample records.
- The global marketplace grows from public glaze profiles and seller profiles, not disconnected product ads.
- Recipe privacy belongs to the recipe version, while posts and image result groups have their own visibility.
- Public search should show only fields the viewer is allowed to see.
- Analytics should explain confidence and correlation, not imply causation from weak evidence.

## Information Architecture To Add

### Home

Social feed with posts, image result groups, comments, saves, shares, and lightweight record previews.

### Explore

Searchable result database organized around public or authorized result groups. Primary filters should include image/photo presence, glaze, clay body, cone, atmosphere, kiln type, color, surface, opacity, defects, author, and social activity. Advanced filters can include materials, oxides, UMF zones, expansion risk, application method, and firing detail level.

Explore should also include a global glaze marketplace surface for public sellable glaze profiles. Listings can represent digital recipes, dry mixes, wet glazes, sample tiles, or consultations. Seller links, safety disclosures, and recipe privacy must stay distinct.

### Result Detail

A modern detail page should have:

- Social story and comments
- Image result groups
- Linked firing records
- Linked glaze profiles and recipe versions
- Linked clay bodies and application details
- Analytics and comparison cards
- Privacy-aware public previews

### Glaze Profile

Supports both studio recipes and commercial glazes. Includes public profile data, private or public recipe versions, ingredient lists, chemistry analysis, result history, defects, compatible clay bodies, and common firing contexts.

### Firing Profile

Supports sparse historical records, structured records, live tracking, and research-grade records. It should store cone, temperature, atmosphere, kiln type, kiln profile, schedule, environment, weather, position, notes, images, and linked results.

### Clay Body Profile

Stores manufacturer or studio source, body type, cone range, color, texture, absorption, shrinkage, grog, atmosphere suitability, glaze fit history, and linked result groups.

### Analytics

Flux and Fire can differentiate with analytics that combine social evidence and ceramic variables:

- Result confidence score based on known recipe, firing, clay, application, and photo evidence.
- Similar-result search across glaze, clay, cone, and atmosphere.
- Surface/color clustering by image observations.
- Defect correlations across clay, glaze, and firing conditions.
- Recipe version comparisons.
- UMF and oxide-based comparisons for users who want technical depth.
- Firing curve and weather/environment overlays.
- Studio repetition and production consistency metrics.

## Data Structure Implications

The database should continue moving toward these durable entities:

- `profiles`
- `posts`
- `post_images`
- `image_result_groups`
- `glaze_profiles`
- `glaze_recipe_versions`
- `clay_body_profiles`
- `kiln_profiles`
- `firing_records`
- `kiln_schedules`
- `firing_log_points`
- `firing_environment_records`
- `chemistry_analyses`
- `material_taxonomy`
- `oxide_taxonomy`
- `comments`
- `reviews`
- `bookmarks`
- `collections`
- `glaze marketplace metadata`
- `analytics_snapshots`

The app should never require all of these entities to exist before posting. The structure should allow a post to begin as a social image and become more analytical over time.
