import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("normal location list uses a bounded accessible virtual window", async () => {
  const [app, styles] = await Promise.all([readFile("app.js", "utf8"), readFile("styles.css", "utf8")]);
  assert.match(app, /locationListOverscanRows/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /addEventListener\("scroll", scheduleRender, \{ passive: true \}\)/);
  assert.match(app, /aria-posinset=/);
  assert.match(app, /aria-setsize=/);
  assert.match(styles, /--location-list-row-height:\s*204px/);
  assert.match(styles, /\.location-list-item\s*\{[^}]*height:\s*var\(--location-list-row-height\)/s);
  assert.match(app, /function getLocationListRowHeight/);
  assert.match(styles, /\.location-card h3,\s*\.location-card p\s*\{[^}]*text-overflow:\s*ellipsis/s);
  assert.match(styles, /\.location-list-window/);
  assert.match(app, /renderLocationListVirtualWindow\(\{ force: true \}\)/);
  assert.match(app, /function handleLocationListKeydown/);
  assert.match(app, /aria-current="true"/);
});

test("update request form keeps loading and unavailable states distinct", async () => {
  const app = await readFile("app.js", "utf8");
  assert.match(app, /let updateFormConfigLoaded = false/);
  assert.match(app, /updateFormConfigLoaded = true;\s*updateRequestButtonState\(\)/);
  assert.match(app, /function updateRequestButtonState/);
  assert.doesNotMatch(app, /updateFormConfigLoaded = true;\s*renderDetail\(\)/);
  assert.match(app, /更新要求フォームを確認中/);
  assert.match(app, /更新要求フォーム未設定/);
});

test("collection writes publish state only after storage succeeds", async () => {
  const app = await readFile("app.js", "utf8");
  const toggle = app.slice(app.indexOf("function toggleCollected"), app.indexOf("function saveMemo"));
  assert.ok(toggle.indexOf("saveJson(storageKeys.collections, nextCollections)") < toggle.indexOf("collections = nextCollections"));
  assert.match(toggle, /return false/);
  assert.match(app, /function buildMigratedCollections/);
});

test("core and optional application data start loading concurrently", async () => {
  const app = await readFile("app.js", "utf8");
  const init = app.slice(app.indexOf("async function init"), app.indexOf("function bindEvents"));
  assert.ok(init.indexOf("loadUpdateRequests()") < init.indexOf("await locationsPromise"));
  assert.ok(init.indexOf("loadUpdateHistory()") < init.indexOf("await locationsPromise"));
  assert.ok(init.indexOf("loadUpdateFormConfig()") < init.indexOf("await locationsPromise"));
  assert.ok(init.indexOf("renderAll()") < init.indexOf("Promise.all"));
  assert.doesNotMatch(init, /if \(currentFilteredLocations\.length\)/);
  assert.match(init, /updateRequests = value;\s*renderSummary\(currentFilteredLocations\);/);
});
