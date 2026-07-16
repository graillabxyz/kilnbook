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
});
