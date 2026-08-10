import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("renders every location as an individual point at every zoom", async () => {
  const app = await readFile("app.js", "utf8");
  const start = app.indexOf("function addLocationLayers");
  const end = app.indexOf("\nfunction markerShapeStates", start);

  assert.ok(start >= 0 && end > start, "addLocationLayers must remain inspectable");
  const locationLayers = app.slice(start, end);

  assert.doesNotMatch(locationLayers, /\bcluster(?:MaxZoom|Radius|Properties)?\s*:/);
  assert.doesNotMatch(locationLayers, /id:\s*"cluster(?:s|-count)"/);
  assert.doesNotMatch(locationLayers, /point_count/);
  assert.doesNotMatch(locationLayers, /getClusterExpansionZoom/);
});
