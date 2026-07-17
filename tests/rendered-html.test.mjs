import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders Flux and Fire without starter preview metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Flux and Fire<\/title>/i);
  assert.match(html, /Home feed/);
  assert.match(html, /Ceramic process library/);
  assert.doesNotMatch(
    html,
    /codex-preview|Your site is taking shape|react-loading-skeleton|mara@example\.com|Profile setup checklist|Continue with Google/,
  );
});

test("starter preview files and dependency are removed", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /KilnbookWorkspace/);
  assert.doesNotMatch(page, /profile-mara/);
  assert.match(layout, /PRODUCT\.name/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("PWA install metadata and service worker are present", async () => {
  const [layout, register, manifestRaw, serviceWorker] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/pwa-register.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestRaw);

  assert.match(layout, /rel="manifest"/);
  assert.match(layout, /apple-touch-icon/);
  assert.match(register, /serviceWorker/);
  assert.equal(manifest.name, "Flux and Fire");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/?source=pwa");
  assert.equal(manifest.theme_color, "#a34324");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.type === "image/png"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.type === "image/png"));
  assert.match(serviceWorker, /addEventListener\("fetch"/);
  assert.match(serviceWorker, /CACHE_NAME/);
});

test("brand system is documented and wired into the app", async () => {
  const [brandDoc, globals, layout, workspace, brandConstants] = await Promise.all([
    readFile(new URL("../docs/brand.md", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/kilnbook-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/brand.ts", import.meta.url), "utf8"),
  ]);

  assert.match(brandDoc, /Flux and Fire Brand System/);
  assert.match(brandDoc, /public\/flux-and-fire-logo\.svg/);
  assert.match(brandDoc, /public\/flux-and-fire-wordmark\.svg/);
  assert.match(brandDoc, /Cormorant Garamond/);
  assert.match(brandDoc, /Inter/);
  assert.match(brandDoc, /#a34324/);
  assert.match(brandDoc, /#315d67/);

  assert.match(globals, /--font-brand: "Cormorant Garamond", serif;/);
  assert.match(globals, /--font-ui: "Inter", sans-serif;/);
  assert.match(globals, /--kb-terracotta: #a34324;/);
  assert.match(globals, /--kb-cobalt: #315d67;/);
  assert.match(layout, /fonts\.googleapis\.com/);
  assert.match(layout, /Cormorant\+Garamond/);
  assert.match(layout, /family=Inter/);
  assert.match(workspace, /BRAND_ASSETS/);
  assert.match(workspace, /BRAND_CHART_COLORS/);
  assert.match(brandConstants, /BRAND_PROFILE_COLORS/);
});

test("mobile add and navigation follow the simplified Instagram-style order", async () => {
  const [workspace, product, globals] = await Promise.all([
    readFile(new URL("../app/kilnbook-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/product.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(product, /"Home",\n  "Explore",\n  "Add",\n  "Search",\n  "Profile"/);
  assert.match(workspace, /onConfirm\(option\.kind, "public"\)/);
  assert.match(workspace, /MOBILE_SCROLL_VIEWS = new Set<View>\(\["Home", "Explore", "Profile", "Settings", "Add"\]\)/);
  assert.match(workspace, /const items: MobileNavItem\[\] = \[\n    \{ label: "Home"/);
  assert.match(workspace, /\{ label: "Add", icon: Plus, action: "add" \},\n    \{ label: "Search"/);
  assert.match(workspace, /type ActiveAddFlow/);
  assert.match(workspace, /Live tracker is running/);
  assert.match(workspace, /Save glaze recipe/);
  assert.match(workspace, /Save previous firing/);
  assert.match(workspace, /Save glaze result/);
  assert.match(globals, /grid-template-columns: repeat\(5, 20%\)/);
  assert.match(globals, /\.kb-main-scrollable > :not\(\.kb-header\)/);
  assert.match(globals, /overflow-y: auto/);
  assert.match(globals, /\.kb-main-contained > :not\(\.kb-header\)/);
  assert.match(globals, /overflow: hidden/);
  assert.match(globals, /\.kb-mobile-nav button\.compose svg/);
  assert.match(globals, /\.kb-add-mobile-list/);
});

test("glaze, clay body, and kiln libraries use real creation flows", async () => {
  const [workspace, globals] = await Promise.all([
    readFile(new URL("../app/kilnbook-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /GLAZE_SUPPLIER_CATALOG/);
  assert.match(workspace, /CLAY_BODY_CATALOG/);
  assert.match(workspace, /KILN_CATALOG/);
  assert.match(workspace, /function GlazeCreateDialog/);
  assert.match(workspace, /function ClayBodyCreateDialog/);
  assert.match(workspace, /function KilnCreateDialog/);
  assert.match(workspace, /kb-firing-select/);
  assert.match(workspace, /kb-record-detail-panel/);
  assert.match(workspace, /kb-library-card-copy/);
  assert.match(workspace, /persistGlazeRecord/);
  assert.match(workspace, /persistClayBodyProfile/);
  assert.match(workspace, /persistKilnProfile/);
  assert.match(workspace, /Add commercial glaze/);
  assert.match(workspace, /Save clay body/);
  assert.match(workspace, /Save kiln/);
  assert.match(workspace, /AMACO/);
  assert.match(workspace, /Laguna/);
  assert.match(workspace, /Skutt KM-1027/);
  assert.doesNotMatch(workspace, /setDraftGlazeCount|setDraftClayCount|setDraftKilnCount/);
  assert.doesNotMatch(workspace, /Untitled glaze|Untitled clay body|Untitled kiln/);

  assert.match(globals, /\.kb-create-dialog/);
  assert.match(globals, /\.kb-ingredient-row/);
  assert.match(globals, /\.kb-swatch-picker/);
  assert.match(globals, /\.kb-library-select\.active/);
  assert.match(globals, /\.kb-nav button\s*\{\n  min-height: 2\.75rem;\n  display: grid;\n  grid-template-columns: 1\.55rem minmax\(0, 1fr\);/);
  assert.match(globals, /\.kb-firing-select/);
  assert.match(globals, /grid-template-areas:\n    "number title"\n    "number meta"/);
  assert.match(globals, /\.kb-library-card-copy/);
  assert.match(globals, /\.kb-record-detail-panel/);
  assert.match(globals, /\.kb-linked-row\s*\{\n  grid-template-columns: minmax\(0, 1fr\) auto auto;/);
});

test("messages, profile, and settings use modern social layouts", async () => {
  const [workspace, globals] = await Promise.all([
    readFile(new URL("../app/kilnbook-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /messageFilter/);
  assert.match(workspace, /Search messages/);
  assert.match(workspace, /kb-conversation-panel/);
  assert.match(workspace, /kb-message-thread/);
  assert.match(workspace, /kb-profile-layout/);
  assert.match(workspace, /kb-profile-stats/);
  assert.match(workspace, /kb-settings-layout/);
  assert.match(workspace, /normalizePublicUrl/);
  assert.doesNotMatch(workspace, /Conversations with ceramic record links/);
  assert.doesNotMatch(workspace, /Authentication, units, privacy, and notifications/);

  assert.match(globals, /\.kb-messages-shell/);
  assert.match(globals, /\.kb-message-filter button\.active/);
  assert.match(globals, /\.kb-message-compose\.modern/);
  assert.match(globals, /\.kb-profile-cover/);
  assert.match(globals, /\.kb-profile-post-row/);
  assert.match(globals, /\.kb-settings-card-grid/);
  assert.match(globals, /grid-template-areas:\n    "hero hero"/);
});

test("post composer supports psychographic UX model and multi-result image annotations", async () => {
  const [workspace, globals, uxDoc, usabilityDoc] = await Promise.all([
    readFile(new URL("../app/kilnbook-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/ux-psychographics.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/usability-review.md", import.meta.url), "utf8"),
  ]);

  assert.match(uxDoc, /Flux and Fire UX Psychographics/);
  assert.match(uxDoc, /Firing Detail Ladder/);
  assert.match(uxDoc, /Result group/);
  assert.match(uxDoc, /Historic Archivist/);
  assert.match(uxDoc, /Mobile-First Casual Poster/);
  assert.match(usabilityDoc, /docs\/ux-psychographics\.md/);

  const composerStart = workspace.indexOf("function PostComposer");
  const composerEnd = workspace.indexOf("function InlinePicker");
  assert.notEqual(composerStart, -1);
  assert.notEqual(composerEnd, -1);
  const composer = workspace.slice(composerStart, composerEnd);

  assert.match(workspace, /type ComposerImageAnnotation/);
  assert.match(workspace, /annotations: ComposerImageAnnotation\[\]/);
  assert.match(workspace, /Result group 1/);
  assert.match(workspace, /Add result group/);
  assert.match(workspace, /New historic firing/);
  assert.match(workspace, /Unknown or unrecorded firing/);
  assert.match(workspace, /Post context/);
  assert.match(workspace, /Broad records for the whole post/);
  assert.doesNotMatch(workspace, /Each image can show different glazes/);
  assert.doesNotMatch(workspace, /Add profile/);
  assert.match(composer, /firings\.filter\(\(firing\) => firing\.ownerId === viewer\.id\)/);
  assert.match(composer, /glazes\.filter\(\(glaze\) => glaze\.ownerId === viewer\.id\)/);
  assert.match(composer, /clayBodies\.filter\(\(clay\) => clay\.ownerId === viewer\.id\)/);
  assert.match(composer, /kilns\.filter\(\(kiln\) => kiln\.ownerId === viewer\.id\)/);
  assert.match(composer, /myFirings\.map/);
  assert.match(composer, /myGlazes\.map/);
  assert.match(composer, /myClayBodies\.map/);
  assert.match(composer, /myKilns\.map/);
  assert.doesNotMatch(composer, /firings\.map\(/);
  assert.doesNotMatch(composer, /glazes\.map\(/);
  assert.doesNotMatch(composer, /clayBodies\.map\(/);
  assert.doesNotMatch(composer, /kilns\.map\(/);

  assert.match(globals, /\.kb-image-annotation-list/);
  assert.match(globals, /\.kb-image-annotation/);
  assert.match(globals, /\.kb-add-group-button/);
});

test("workspace libraries are scoped to the signed-in viewer", async () => {
  const workspace = await readFile(new URL("../app/kilnbook-workspace.tsx", import.meta.url), "utf8");

  assert.match(workspace, /readOwnedRecordLibraries\(supabase, viewer\.id\)/);
  assert.match(workspace, /kilns\.filter\(\(kiln\) => kiln\.ownerId === viewer\.id\)/);
  assert.match(workspace, /glazes\.filter\(\(glaze\) => glaze\.ownerId === viewer\.id\)/);
  assert.match(workspace, /clayBodies\.filter\(\(clay\) => clay\.ownerId === viewer\.id\)/);
  assert.match(workspace, /firings\.filter\(\(firing\) => firing\.ownerId === viewer\.id\)/);
  assert.match(workspace, /snapshot\.posts\.filter\(\(post\) => post\.authorId === viewer\.id\)/);
  assert.match(workspace, /<DashboardScreen\s+firings=\{workspaceFirings\}\s+glazes=\{workspaceGlazes\}\s+clayBodies=\{workspaceClayBodies\}/);
  assert.match(workspace, /<FiringsScreen\s+firings=\{workspaceFirings\}/);
  assert.match(workspace, /<GlazesScreen\s+viewer=\{viewer\}\s+glazes=\{workspaceGlazes\}/);
  assert.match(workspace, /<ClayBodiesScreen\s+viewer=\{viewer\}\s+clayBodies=\{workspaceClayBodies\}/);
  assert.match(workspace, /<KilnsScreen\s+viewer=\{viewer\}\s+kilns=\{workspaceKilns\}/);
  assert.match(workspace, /<ProfileScreen\s+viewer=\{viewer\}\s+authStatus=\{authStatus\}\s+glazes=\{workspaceGlazes\}\s+posts=\{workspacePosts\}/);
  assert.doesNotMatch(workspace, /Glaze tests" value=\{String\(glazes\.length \+ 5\)\}/);
  assert.match(workspace, /No firings in your library/);
  assert.match(workspace, /No glazes in your library/);
  assert.match(workspace, /No clay bodies in your library/);
  assert.match(workspace, /No kilns in your library/);
});

test("Glazy research informs the social-first glaze result database structure", async () => {
  const [researchDoc, uxDoc, phasePlan, taxonomy, workspace, globals] = await Promise.all([
    readFile(new URL("../docs/glazy-research.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/ux-psychographics.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/phase-plan.md", import.meta.url), "utf8"),
    readFile(new URL("../lib/glaze-result-taxonomy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/kilnbook-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(researchDoc, /Glazy Review And Flux And Fire Structure/);
  assert.match(researchDoc, /social first and glaze-results focused/i);
  assert.match(researchDoc, /Image result groups/);
  assert.match(researchDoc, /UMF/);
  assert.match(researchDoc, /https:\/\/glazy\.org\/search\?base_type=110/);
  assert.match(uxDoc, /Searchable Result Database Conclusions/);
  assert.match(uxDoc, /Social evidence/);
  assert.match(phasePlan, /authorized image result-group queries/);

  assert.match(taxonomy, /GLAZE_RESULT_SEARCH_FACETS/);
  assert.match(taxonomy, /Evidence quality/);
  assert.match(taxonomy, /FIRING_DETAIL_LEVELS/);
  assert.match(taxonomy, /FLUX_FIRE_GLAZY_REVIEW_PRINCIPLES/);

  assert.match(workspace, /function GlazeResultDatabaseStructure/);
  assert.match(workspace, /Social posts that can deepen into searchable glaze evidence/);
  assert.match(workspace, /GLAZE_RESULT_SEARCH_FACETS/);
  assert.match(workspace, /FIRING_DETAIL_LEVELS/);

  assert.match(globals, /\.kb-result-database-panel/);
  assert.match(globals, /\.kb-result-facet-grid/);
  assert.match(globals, /\.kb-result-structure-grid/);
  assert.match(globals, /\.kb-detail-ladder/);
});

test("global glaze marketplace stays attached to profiles and glaze records", async () => {
  const [domain, repository, workspace, globals, seedData, migration, marketplaceDoc, uxDoc] = await Promise.all([
    readFile(new URL("../lib/domain.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/services/kilnbook-repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/kilnbook-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../lib/seed-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/0005_global_glaze_marketplace.sql", import.meta.url), "utf8"),
    readFile(new URL("../docs/global-glaze-marketplace.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/ux-psychographics.md", import.meta.url), "utf8"),
  ]);

  assert.match(domain, /GlazeMarketplaceListing/);
  assert.match(domain, /GlazeSaleFormat/);
  assert.match(domain, /marketplaceListing\?: GlazeMarketplaceListing/);
  assert.match(domain, /marketplaceEnabled\?: boolean/);

  assert.match(repository, /mapBusinessProfile/);
  assert.match(repository, /marketplace_enabled/);
  assert.match(repository, /marketplaceListing/);

  assert.match(workspace, /Global glaze marketplace/);
  assert.match(workspace, /GlazeMarketplaceCard/);
  assert.match(workspace, /List this glaze on the global marketplace/);
  assert.match(workspace, /marketplace_formats/);
  assert.match(globals, /\.kb-marketplace-grid/);
  assert.match(globals, /\.kb-commerce-badge/);

  assert.match(seedData, /marketplaceListing/);
  assert.match(seedData, /shipsGlobally: true/);
  assert.match(migration, /marketplace_enabled/);
  assert.match(migration, /glazes_marketplace_public_idx/);
  assert.match(migration, /glaze_marketplace_listing/);

  assert.match(marketplaceDoc, /Global Glaze Marketplace/);
  assert.match(marketplaceDoc, /digital recipe, dry mix, wet glaze, sample tile, or consultation/);
  assert.match(uxDoc, /Glaze Seller/);
});
