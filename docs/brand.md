# Flux and Fire Brand System

Flux and Fire is a premium editorial ceramics application. The brand should feel calm, material, precise, and generous: a place where artists can preserve technical firing records and share the parts of their process they choose to make public.

## Brand Name

- Product name in text: `Flux and Fire`
- Visual wordmark: the supplied SVG wordmark at `public/flux-and-fire-wordmark.svg`
- Do not rename the product in UI, metadata, docs, or comments.
- Do not typeset a replacement wordmark with live text when the SVG wordmark can be used.

## Logo Assets

Primary assets:

- Logo mark: `public/flux-and-fire-logo.svg`
- Wordmark: `public/flux-and-fire-wordmark.svg`
- Favicon: `public/favicon.svg`

Logo mark rules:

- Use the kiln arch and flame mark as the primary app icon, favicon, sidebar mark, and compact mobile brand cue.
- The mark is terracotta on transparent background in `flux-and-fire-logo.svg`.
- The favicon places the same terracotta mark on warm ivory.
- Minimum rendered size: 32 px square for UI, 48 px square for marketing and auth screens.
- Keep clear space around the mark equal to at least 20 percent of the mark width.
- Keep the mark upright. Do not rotate, crop, outline, recolor, add gradients, or add new shadows beyond the app's existing subtle container treatment.

Wordmark rules:

- Use the supplied wordmark SVG next to the logo mark in the sidebar, desktop header, mobile header, marketing preview, and auth callback.
- Alt text should use the semantic product name: `Flux and Fire`.
- Minimum width: 128 px in compact UI, 190 px in primary headers.
- Keep clear space around the wordmark equal to the height of the capital letters.
- Do not recreate the wordmark in Cormorant Garamond or another text face. Cormorant is for editorial headings, not a substitute for the supplied artwork.

Lockup rules:

- Preferred lockup is logo mark left, wordmark right.
- Gap between mark and wordmark should be 10 to 14 px in normal UI.
- On very narrow mobile screens, the lockup may scale down but should remain in one row.
- The logo mark may appear alone only where space is constrained or where the wordmark is already visible nearby.

## Color System

All UI color choices should come from `app/globals.css` variables or `lib/brand.ts` constants.

| Role | CSS Variable | Hex | Usage |
| --- | --- | --- | --- |
| Warm clay background | `--kb-bg` | `#f6f2ec` | App canvas and page background |
| Porcelain surface | `--kb-surface` | `#fffdf9` | Cards, feed items, modals |
| Strong surface | `--kb-surface-strong` | `#ffffff` | Active segmented controls and highest contrast surfaces |
| Ink | `--kb-ink` | `#211d1a` | Primary text, primary buttons |
| Muted clay text | `--kb-muted` | `#746b62` | Metadata, secondary labels, helper text |
| Fine line | `--kb-line` | `#ded5c9` | Borders and dividers |
| Strong line | `--kb-line-strong` | `#c8b8a9` | More visible dividers and dashed states |
| Terracotta | `--kb-terracotta` | `#a34324` | Logo, active mobile nav, brand accent, primary emphasis |
| Cobalt | `--kb-cobalt` | `#315d67` | Kicker text, data lines, secondary emphasis |
| Moss | `--kb-moss` | `#657b54` | Kiln and completion accents |
| Clay | `--kb-clay` | `#c9794f` | Warm accent only |
| Sun | `--kb-sun` | `#d4a24c` | Draft and attention accents |
| Iron | `--kb-iron` | `#8f4f3a` | Firing curves and warm chart emphasis |
| Stone | `--kb-stone` | `#b9855f` | Clay body swatches and grounded accents |
| Ash blue | `--kb-ash-blue` | `#9bb4bd` | Glaze/library swatches |
| Ivory tint | `--kb-ivory` | `#fff8ef` | Logo containers and selected cards |
| Warm panel tint | `--kb-warm-panel` | `#f8efe5` | Summary panels |
| Warm highlight | `--kb-warm-highlight` | `#fff9f1` | Selected rows and warm active states |
| Navigation active | `--kb-nav-active` | `#efe6dc` | Sidebar and neutral active surfaces |
| Control fill | `--kb-control` | `#eee4d8` | Segmented controls |
| Neutral tag | `--kb-tag-neutral` | `#f5eee3` | Base chips and tags |
| Terracotta soft | `--kb-terracotta-soft` | `#f4e2d7` | Private/warm chips and selected identity pills |
| Cobalt soft | `--kb-cobalt-soft` | `#e3eef0` | Public/followers chips |
| Cobalt soft strong | `--kb-cobalt-soft-strong` | `#dce8ea` | Supabase/auth badges |
| Stone soft | `--kb-stone-soft` | `#f0e4d4` | Studio or restricted visibility chips |
| Chart grid | `--kb-chart-grid` | `#ddd5ca` | Recharts grid lines |

Color rules:

- Terracotta is the main brand color. Use it sparingly so the logo and primary moments retain authority.
- Cobalt is the primary data and secondary emphasis color.
- Keep the app warm, off-white, and editorial. Avoid saturated gradients, decorative orbs, neon colors, and one-note purple/blue palettes.
- Data visualizations should use `BRAND_CHART_COLORS` from `lib/brand.ts`.
- Profile avatar fallback colors should use `BRAND_PROFILE_COLORS` from `lib/brand.ts`.
- Ceramic/photo simulation gradients may contain local illustrative stops, but UI chrome should use the documented variables.
- Text must meet accessible contrast against its background. Use ink for primary copy and muted clay only for metadata.

## Typography

Only two Google Fonts are allowed:

- `Cormorant Garamond`
- `Inter`

Embed:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Global variables:

```css
:root {
  --font-brand: "Cormorant Garamond", serif;
  --font-ui: "Inter", sans-serif;
}
```

Cormorant Garamond usage:

- Editorial headline
- Hero headline
- Dashboard page titles
- Firing names
- Glaze names
- Clay body names
- Collection names
- Card titles
- Large section headings
- Editorial marketing copy

Inter usage:

- Body text
- Navigation
- Sidebar
- Buttons
- Inputs
- Forms
- Labels
- Metadata
- Dates
- Temperature values
- Statistics
- Charts
- Tags
- Badges
- Comments
- Feed actions
- Settings
- Tables
- Analytics
- Notifications
- Tooltips

Type hierarchy:

| UI Element | Font | Weight |
| --- | --- | --- |
| Supplied SVG wordmark | SVG asset | Do not re-typeset |
| Fallback brand text | Cormorant Garamond | 600 |
| Hero headline | Cormorant Garamond | 500 |
| Dashboard title | Cormorant Garamond | 600 |
| Card title | Cormorant Garamond | 600 |
| Sidebar navigation | Inter | 500 |
| Buttons | Inter | 600 |
| Labels | Inter | 500 |
| Body text | Inter | 400 |
| Metadata | Inter | 400 |
| Statistics | Inter | 600 |
| Tags | Inter | 500 |

Typography rules:

- Use `letter-spacing: 0`.
- Do not introduce additional fallback font stacks outside `--font-brand` and `--font-ui`.
- Do not scale font size with viewport width.
- Keep Cormorant for editorial hierarchy only; do not use it for form labels, tags, tables, metrics, or controls.
- Body copy should keep a relaxed but readable line height around 1.4 to 1.5.

## Layout And Components

General UI:

- Cards, buttons, inputs, chips, and panels use an 8 px radius unless a component is intentionally circular or square.
- Avoid cards inside cards. Use cards for repeated records, modals, and framed tools only.
- Use full-width sections or unframed layouts for page structure.
- Keep controls dense, scan-friendly, and calm. This is a working app, not a marketing brochure.
- Use subtle borders and warm surfaces instead of heavy shadows.

Buttons:

- Primary action buttons use ink background and porcelain text.
- Secondary/quiet buttons use porcelain or translucent porcelain with a fine line border.
- Icon buttons should use lucide icons and an accessible label.
- Disabled buttons must remain visible but clearly inactive.

Tags and badges:

- Tags use Inter, small sizing, and the documented soft tints.
- Visibility labels must remain explicit: `private`, `followers`, `studio only`, or `public`.
- Private recipe controls are available, but public sharing is the default for glaze recipes.

Mobile:

- Mobile should feel like a social feed: home feed first, sticky top brand bar, bottom navigation.
- Bottom navigation order is Home, Explore, Add, Profile.
- The Add button opens the add chooser, not a hidden page jump.
- Mobile composer panels are hidden from the feed unless the user enters the Add flow.

Charts:

- Use brand grid, iron, and cobalt chart colors from `BRAND_CHART_COLORS`.
- Use Inter for chart labels and tooltips.
- Do not use chart colors that are not in the brand palette.

Imagery:

- Use real ceramic result images when available.
- In seed/demo states, abstract ceramic swatches are acceptable if they use brand-adjacent material colors.
- Avoid dark, blurred, generic stock imagery for product, ceramic, or profile surfaces.

## Voice And Product Language

Voice:

- Calm, precise, artist-aware, and generous.
- Use terms ceramic artists understand: firing, cone, atmosphere, glaze, clay body, recipe version, result, kiln, load, hold, reduction, oxidation.
- Treat every account as a profile first. A profile may identify as artist, studio, educator, researcher, collective, supplier, or custom.

Product language rules:

- Do not make every workflow studio-first.
- Do not imply private recipes are hidden UI-only. Private records must be protected by policy and authorization.
- When encouraging sharing, be clear that the user controls visibility.
- Avoid marketing-heavy copy inside the working app.

## Implementation Map

- Product metadata and navigation: `lib/product.ts`
- Brand asset and color constants: `lib/brand.ts`
- Global typography and color tokens: `app/globals.css`
- Google Fonts embed: `app/layout.tsx`
- App logo and wordmark usage: `app/kilnbook-workspace.tsx`
- Auth callback brand usage: `app/auth/callback/auth-callback-client.tsx`
- Logo assets: `public/flux-and-fire-logo.svg`, `public/flux-and-fire-wordmark.svg`, `public/favicon.svg`

Before merging brand-related changes:

- Run `rg -n "font-family" app lib` and verify only `var(--font-brand)` and `var(--font-ui)` are used.
- Run `rg -n "#[0-9a-fA-F]{3,8}" app/kilnbook-workspace.tsx lib/supabase/auth-profile.ts` and verify app-level colors are in `lib/brand.ts`.
- Run `npm test`.
- Visually check desktop header, mobile header, sidebar, Add chooser, feed cards, and charts.
