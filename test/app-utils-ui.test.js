import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("loads and deploys the application utilities before the application", async () => {
  const [html, workflow] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile(".github/workflows/pages.yml", "utf8")
  ]);

  assert.ok(html.indexOf("app-utils.js") > html.indexOf("collection-backup.js"));
  assert.ok(html.indexOf("app.js") > html.indexOf("app-utils.js"));
  assert.match(workflow, /app-utils\.js/);
});

test("uses the Japan calendar and date-aware place selector in the application", async () => {
  const [app, spec] = await Promise.all([
    readFile("app.js", "utf8"),
    readFile("SPEC.md", "utf8")
  ]);

  assert.equal((app.match(/MhcardAppUtils\.calendarDateInJapan\(\)/g) ?? []).length, 2);
  assert.match(app, /MhcardAppUtils\.selectPrimaryDistributionPlace\(distributionPlaces\(location\)\)/);
  assert.doesNotMatch(app, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/);
  assert.match(spec, /current Asia\/Tokyo date/);
  assert.match(spec, /earliest upcoming place/);
});
