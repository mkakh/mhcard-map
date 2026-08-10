import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("loads and deploys the backup helper before the application", async () => {
  const [html, workflow] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile(".github/workflows/pages.yml", "utf8")
  ]);
  assert.ok(html.indexOf("collection-backup.js") > html.indexOf("card-catalog.js"));
  assert.ok(html.indexOf("app.js") > html.indexOf("collection-backup.js"));
  assert.match(workflow, /collection-backup\.js/);
});

test("offers confirmed merge and replacement imports in the backup tab", async () => {
  const app = await readFile("app.js", "utf8");

  assert.match(app, /data-my-page-tab="backup"/);
  assert.match(app, /data-export-collections/);
  assert.match(app, /data-import-collections/);
  assert.match(app, /application\/json/);
  assert.match(app, /mergeCollections/);
  assert.match(app, /window\.confirm/);
  assert.match(app, /完全に置き換え/);
  assert.match(app, /5 \* 1024 \* 1024/);
});
