import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Daito B001 top-level location matches its primary distribution place", async () => {
  const locations = JSON.parse(await readFile("data/locations.json", "utf8"));
  const location = locations.find((item) => item.id === "27-218-b-01");
  const primary = location?.distributionPlaces?.[0];

  assert.ok(location);
  assert.ok(primary);
  for (const [topLevelField, placeField] of [
    ["place", "name"],
    ["address", "address"],
    ["lat", "lat"],
    ["lng", "lng"],
    ["plusCode", "plusCode"],
    ["coordinateAccuracy", "coordinateAccuracy"],
    ["geocodeQuery", "geocodeQuery"],
    ["geocodeTitle", "geocodeTitle"],
    ["geocodedAt", "geocodedAt"]
  ]) {
    assert.equal(location[topLevelField], primary[placeField], `${topLevelField} must match the primary place`);
  }
});
