# Flux and Fire UX Psychographics

This document is the standing reference for UX reviews, audits, and product changes. Every workflow should be checked against these user types before we simplify, add, rename, or remove a feature.

## Core UX Model

Flux and Fire should not force every ceramic record into a single strict path. Users may arrive with a quick photo, a memory of an old firing, a full temperature curve, a private recipe, a commercial glaze name, or a research-grade data set. The app should accept all of those without making lightweight users feel wrong or detailed users feel constrained.

Use this model across the product:

- Post: the social or narrative wrapper. A post can stand alone or point to records.
- Record: a reusable profile such as firing, glaze, clay body, kiln, piece, or recipe version.
- Image: visual evidence. One image can contain one piece, many pieces, one firing, multiple firings, one glaze, layered glazes, or unknown details.
- Result group: an annotation inside an image. Each group can link its own firing, glaze or glazes, clay body or clay bodies, notes, and visibility.
- Firing detail ladder: a firing can start as a minimal description and become more specific over time.

## Firing Detail Ladder

Firing records must support multiple precision levels:

| Level | Example | Required UX |
| --- | --- | --- |
| Memory | "Cone 7 gas oxidation, winter 2024" | Save quickly with sparse fields and unknowns allowed. |
| Structured | Cone, kiln, atmosphere, date, clay, glaze | Let users add enough detail for useful search and comparison. |
| Documented | Schedule, holds, atmosphere changes, weather, results | Keep detailed fields available without making them mandatory. |
| Live tracked | Readings, curve, atmosphere, environment, notes, images | Optimize for speed, large touch targets, and later cleanup. |
| Research grade | Replicable process, material lots, application, defects | Preserve precision, versioning, provenance, and exports. |

Unknown data is valid data. Use "unknown", "unrecorded", or empty optional fields rather than blocking the user.

## Intended Psychographic Profiles

### Share-First Artist

- Motivation: show process, finished work, and occasional useful discoveries.
- Anxiety: technical forms will slow down posting or make them feel underqualified.
- Success: can post a photo, add one or two context links, and move on.
- Guardrails: keep composer fast; never require firing curves; make public sharing feel natural.

### Private Experimenter

- Motivation: track tests, failures, and private glaze recipes before deciding what to share.
- Anxiety: recipes or failed tests could be exposed accidentally.
- Success: can use the same public-quality tools privately.
- Guardrails: visibility must be explicit per recipe, record, image, and post; private recipes must be protected by policy.

### Historic Archivist

- Motivation: preserve years of notebook, photo, and memory-based firing history.
- Anxiety: old work lacks complete data, so the app may reject it or make it look incomplete.
- Success: can create a firing with only remembered cone, kiln type, atmosphere, approximate date, and notes.
- Guardrails: allow sparse historic firings; let records become more detailed later.

### Production Studio Operator

- Motivation: repeat successful loads, reduce defects, understand costs, and manage records at volume.
- Anxiety: social features will get in the way of operational speed.
- Success: can scan, compare, filter, and reuse records quickly.
- Guardrails: dense layouts, predictable controls, batch-friendly flows, and useful defaults.

### Community Educator

- Motivation: document class firings, student work, and shared kiln outcomes.
- Anxiety: too much personal-account language or private-recipe framing will not fit group use.
- Success: can add many pieces and result groups to one image, often with unknown makers or incomplete details.
- Guardrails: support many pieces per image, many firings per post, and non-studio identity labels.

### Glaze Researcher

- Motivation: isolate variables across recipe versions, clay bodies, application, kiln position, and atmosphere.
- Anxiety: image-only posting will flatten the technical record.
- Success: can connect results to exact recipe versions and firing conditions.
- Guardrails: preserve canonical profiles, structured tags, version history, defects, and careful correlation language.

### Commercial Glaze User

- Motivation: record results from AMACO, Mayco, Spectrum, Laguna, or other common supplier products.
- Anxiety: "recipe" language may imply they need raw-material formulas they do not have.
- Success: can add a purchased glaze from a common catalog, then tag results by clay and firing.
- Guardrails: support supplier glaze profiles alongside studio recipes.

### Mobile-First Casual Poster

- Motivation: share or save what just came out of the kiln from a phone.
- Anxiety: desktop-grade forms are too large and slow.
- Success: home feed, Add, image upload, result groups, and publish feel app-like.
- Guardrails: avoid horizontal overflow; keep bottom nav predictable; make image annotation touch targets large.

### Professional Business Profile

- Motivation: present a credible public profile, services, portfolio, and selected process expertise.
- Anxiety: business tools may make the personal profile feel too commercial or cluttered.
- Success: can show public-facing work while keeping operational records private.
- Guardrails: separate public profile, settings, business info, and private records.

## Post And Image UX Conclusions

- The post composer should separate story from data. The text area is the story; broad context links are optional.
- "Profiles" is too ambiguous in the composer. Use record-oriented language such as context, firing, glaze, clay body, kiln, or result group.
- A broad post context is for records that apply to the whole post.
- Image annotations are for exact visual evidence. One image can contain many result groups.
- Each result group can link its own firing, glaze or glazes, and clay body or clay bodies.
- A user should be able to tag an unknown or unrecorded firing and later create a real historic firing record.
- Historic firing creation should be lightweight. Live tracking should be optimized for current firings, not required for past firings.
- Post privacy and record privacy must be separate. A public post may include public context while private recipes remain protected.

## Searchable Result Database Conclusions

The Glazy review in `docs/glazy-research.md` confirms that ceramicists need deep filtering by recipe, material, oxide, cone, atmosphere, surface, photo evidence, kiln schedule, and analysis. Flux and Fire should support that depth without making it the front door.

Use this hierarchy for database work:

1. Social evidence: posts, comments, saves, authors, and image result groups.
2. Visual evidence: color, surface, opacity, defects, photo presence, and image annotations.
3. Ceramic context: glaze, clay body, firing, kiln, cone, atmosphere, and application.
4. Recipe context: studio formula, commercial supplier glaze, recipe version, and recipe privacy.
5. Analytical context: materials, oxides, UMF region, expansion risk, firing curve, and confidence.

Search results should explain why a result matches and how complete the evidence is. Analytics should surface confidence levels before showing correlations.

## Audit Checklist

Before changing any UX surface, check:

- Can a lightweight user complete the flow with minimal data?
- Can a detailed user add precision without leaving the flow too early?
- Can a historic record contain unknowns?
- Can one image represent multiple pieces, firings, glazes, or clay bodies?
- Is privacy explicit and enforced at the correct artifact level?
- Is the language profile-first rather than studio-first?
- Does Explore preserve the social-first result database model from `docs/glazy-research.md`?
- Does mobile avoid left/right overflow and unnecessary loading?
- Are all visible buttons and links purposeful and functional?
- Does the workflow still fit the brand system in `docs/brand.md`?

## Current Composer Decision

The composer should use this hierarchy:

1. Write the post story.
2. Add optional broad post context.
3. Add images.
4. Add one or more result groups inside each image.
5. Link each result group to firing, glaze, and clay body records only when useful.

This keeps Flux and Fire useful for a quick photo, a remembered cone 7 gas oxidation firing, a precise glaze test, or a multi-piece studio kiln opening.
