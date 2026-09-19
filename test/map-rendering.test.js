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


test("location data stays complete and immutable across UI and resize updates", async () => {
  const app = await readFile("app.js", "utf8");
  assert.match(app, /data: toLocationFeatureCollection\(locations\)/);
  assert.doesNotMatch(app, /updateLocationSource/);
  assert.deepEqual([...app.matchAll(/(\w+)\.setData\(/g)].map((match) => match[1]), ["currentSource"]);
  for (const id of ["selected-location-halo", "unclustered-locations", "selected-shaped-location-halo", "shaped-locations", "location-hit-area"]) {
    assert.match(app, new RegExp(`setFilter\\("${id}"`));
  }
  assert.match(app, /\["get", "cardId"\]/);
  assert.match(app, /\["get", "placeId"\]/);
  assert.match(app, /setPaintProperty\("unclustered-locations", "circle-color"/);
  assert.match(app, /setLayoutProperty\("shaped-locations", "text-size"/);
  assert.match(app, /updateLocationLayerState\(targetMap\)/);
});

test("map resize is coalesced, nonzero and independent of location rendering", async () => {
  const app = await readFile("app.js", "utf8");
  const resize = app.slice(app.indexOf("function resizeMapSoon"), app.indexOf("async function printMap"));
  assert.doesNotMatch(resize, /setData|updateLocation|renderAll/);
  assert.match(resize, /if \(mapResizeFrame\) return/);
  assert.match(resize, /requestAnimationFrame/);
  assert.match(resize, /if \(!width \|\| !height\) return/);
  assert.match(resize, /clearTimeout\(mapResizeFallback\)/);
  assert.match(resize, /setTimeout\(resizeMapSoon, 250\)/);
  assert.match(app, /new ResizeObserver\(/);
  assert.match(app, /\.observe\(elements.mapCanvas\)/);
  assert.match(app, /addEventListener\("pageshow", resizeMapAfterLayoutChange\)/);
  assert.match(app, /document.visibilityState === "visible"/);
});
