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

test("fresh GKP comparison fixes three independently listed alternate venues", async () => {
  const locations = JSON.parse(await readFile("data/locations.json", "utf8"));
  for (const [id, names] of [
    ["16-201-a-01", ["富山市役所 西館 2階 上下水道局お客さまサービスステーション", "富山市国際交流センター"]],
    ["33-202-c-01", ["旧柚木家住宅（西爽亭）", "新倉敷駅観光案内所"]],
    ["42-000-a-01", ["大村湾南部浄化センター", "諫早物産ホール諫早観光物産コンベンション協会", "大村公園観光案内所"]]
  ]) {
    const card = locations.find((item) => item.id === id);
    assert.ok(card);
    assert.deepEqual(card.distributionPlaces.map((place) => place.name), names);
    assert.deepEqual([card.lat, card.lng], [card.distributionPlaces[0].lat, card.distributionPlaces[0].lng]);
  }
});

test("Karuizawa A001 does not present exhausted cards as available", async () => {
  const locations = JSON.parse(await readFile("data/locations.json", "utf8"));
  const card = locations.find((item) => item.id === "20-321-a-01");
  assert.equal(card.status, "休止中");
  assert.match(card.stock, /さわやかハット.*町役場.*在庫なし/);
});
