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

test("Wajima A001 and B001 use the current shared water bureau outlet", async () => {
  const locations = JSON.parse(await readFile("data/locations.json", "utf8"));
  const a = locations.find((item) => item.id === "17-204-a-01");
  const b = locations.find((item) => item.id === "17-204-b-01");
  assert.ok(a && b);
  assert.match(a.place, /輪島市上下水道局/);
  assert.equal(a.address, b.address);
  assert.deepEqual([a.lat, a.lng], [b.lat, b.lng]);
  assert.doesNotMatch(a.place, /輪島キリコ会館/);
});

test("Fukui A001 keeps separately pinned weekday and two weekend outlets", async () => {
  const locations = JSON.parse(await readFile("data/locations.json", "utf8"));
  const card = locations.find((item) => item.id === "18-201-a-01");
  assert.ok(card);
  assert.deepEqual(card.distributionPlaces.map((place) => [place.id, place.days, place.hours]), [
    ["place-fukui-a-weekday-waterworks", "平日", "8:30～17:15"],
    ["place-fukui-a-weekend-water-museum", "土日祝日", "9:00～16:30"],
    ["place-fukui-a-weekend-welcome-center", "土日祝日", "9:00～17:00"]
  ]);
  assert.deepEqual([card.lat, card.lng], [card.distributionPlaces[0].lat, card.distributionPlaces[0].lng]);
  assert.equal(new Set(card.distributionPlaces.map((place) => [place.lat, place.lng].join(','))).size, 3);
});
