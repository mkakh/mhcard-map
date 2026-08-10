import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("loads the catalogue comparator before the application", async () => {
  const [html, workflow] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile(".github/workflows/pages.yml", "utf8")
  ]);
  const catalogue = html.indexOf("card-catalog.js");
  const app = html.indexOf("app.js");

  assert.ok(catalogue >= 0 && app > catalogue);
  assert.match(workflow, /cp index\.html app\.js card-catalog\.js styles\.css dist\//);
});

test("renders an accessible, filterable, directly toggleable card catalogue", async () => {
  const app = await readFile("app.js", "utf8");

  assert.match(app, /role="tablist"/);
  assert.match(app, /role="tab"/);
  assert.match(app, /role="tabpanel"/);
  assert.match(app, /data-my-page-tab/);
  assert.match(app, /id="cardCatalogPrefecture"/);
  assert.match(app, /data-card-catalog-toggle/);
  assert.match(app, /aria-pressed=/);
  assert.match(app, /loading="lazy"/);
  assert.match(app, /decoding="async"/);
  assert.match(app, /画像なし/);
  assert.match(app, /該当するカードはありません。/);
  assert.match(app, /MhcardCatalog\.orderedPrefectures/);
  assert.match(app, /function updateCardCatalogTile/);
  assert.match(app, /function updateCardCatalogCounts/);
});

test("styles and specifies the new catalogue behavior", async () => {
  const [styles, spec] = await Promise.all([
    readFile("styles.css", "utf8"),
    readFile("SPEC.md", "utf8")
  ]);

  assert.match(styles, /\.my-page-tabs/);
  assert.match(styles, /\.card-catalog-grid/);
  assert.match(styles, /\.card-catalog-card\[aria-pressed="true"\]/);
  assert.match(styles, /\.card-catalog-image\.image-missing/);
  assert.match(spec, /A001.*A002.*B001/);
  assert.match(spec, /prefecture dropdown/i);
  assert.match(spec, /Left\/Right\/Home\/End/);
  assert.match(spec, /aria-pressed/);
});
