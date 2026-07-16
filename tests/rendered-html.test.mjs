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
  assert.match(html, /Firing journal/);
  assert.match(html, /Quiet Tenmoku/);
  assert.match(html, /Home feed/);
  assert.match(html, /Ceramic process library/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("starter preview files and dependency are removed", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /KilnbookWorkspace/);
  assert.match(layout, /PRODUCT\.name/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
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
