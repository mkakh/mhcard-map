import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("loads and deploys the machine-readable update history", async () => {
  const [app, html, workflow] = await Promise.all([
    readFile("app.js", "utf8"),
    readFile("index.html", "utf8"),
    readFile(".github/workflows/data-update.yml", "utf8")
  ]);

  assert.match(html, /id="updateHistoryButton"/);
  assert.match(html, /id="updateHistoryDialog"/);
  assert.match(app, /data\/update-history\.json/);
  assert.match(app, /data-history-location/);
  assert.match(app, /data-update-history-more/);
  assert.match(app, /変更前/);
  assert.match(app, /変更後/);
  assert.match(workflow, /Snapshot current location data/);
  assert.match(workflow, /npm run update:history/);
});

test("styles important history and narrow before-after values", async () => {
  const styles = await readFile("styles.css", "utf8");
  assert.match(styles, /\.update-history-change\.critical/);
  assert.match(styles, /\.update-history-badge\.critical/);
  assert.match(styles, /\.update-history-field dd/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.update-history-field dd\s*\{[\s\S]*grid-template-columns:\s*1fr/);
});
