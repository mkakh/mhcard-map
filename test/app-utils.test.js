import assert from "node:assert/strict";
import test from "node:test";

await import("../app-utils.js");

const { calendarDateInJapan, activeDistributionPlaces, selectPrimaryDistributionPlace, placeCoordinateCategory } = globalThis.MhcardAppUtils;

test("uses the Asia/Tokyo calendar date at the local midnight boundary", () => {
  assert.equal(calendarDateInJapan(new Date("2026-08-10T14:59:59Z")), "2026-08-10");
  assert.equal(calendarDateInJapan(new Date("2026-08-10T15:00:00Z")), "2026-08-11");
});

test("selects the first active distribution place with inclusive bounds", () => {
  const places = [
    { id: "old", endsOn: "2026-08-28" },
    { id: "current", startsOn: "2026-08-29", endsOn: "2026-09-30" },
    { id: "overlap", startsOn: "2026-08-29" }
  ];

  assert.equal(selectPrimaryDistributionPlace(places, "2026-08-28").id, "old");
  assert.equal(selectPrimaryDistributionPlace(places, "2026-08-29").id, "current");
  assert.equal(selectPrimaryDistributionPlace(places, "2026-09-30").id, "current");
  assert.equal(selectPrimaryDistributionPlace(places, "2026-10-01").id, "overlap");
});

test("selects the earliest upcoming place before launch and latest expired place afterward", () => {
  const upcoming = [
    { id: "later", startsOn: "2026-09-10" },
    { id: "sooner", startsOn: "2026-08-23", endsOn: "2026-08-23" }
  ];
  const expired = [
    { id: "older", endsOn: "2026-08-01" },
    { id: "newer", endsOn: "2026-08-20" }
  ];

  assert.equal(selectPrimaryDistributionPlace(upcoming, "2026-08-11").id, "sooner");
  assert.equal(selectPrimaryDistributionPlace(expired, "2026-08-21").id, "newer");
});

test("preserves source order for unscheduled places and invalid comparison dates", () => {
  const places = [{ id: "first" }, { id: "second" }];
  assert.equal(selectPrimaryDistributionPlace(places, "2026-08-11").id, "first");
  assert.equal(selectPrimaryDistributionPlace(places, "not-a-date").id, "first");
  assert.equal(selectPrimaryDistributionPlace([], "2026-08-11"), null);
});

test("classifies suspended places with and without a known address", () => {
  assert.equal(
    placeCoordinateCategory({ status: "休止中" }, { address: "東京都千代田区", coordinateAccuracy: "address" }),
    "stopped-known"
  );
  assert.equal(
    placeCoordinateCategory({ status: "休止中" }, { address: "", coordinateAccuracy: "prefecture_approx" }),
    "stopped-unknown"
  );
  assert.equal(
    placeCoordinateCategory({ status: "配布中" }, { address: "", geocodeError: "not found" }),
    "geocode-failed"
  );
});

test("hides a temporary Dazaifu outlet after its final day", async () => {
  const { readFile } = await import("node:fs/promises");
  const locations = JSON.parse(await readFile("data/locations.json", "utf8"));
  const card = locations.find((item) => item.id === "40-221-c-01");
  assert.ok(card);
  assert.equal(card.distributionPlaces.length, 1);
  assert.equal(card.distributionPlaces[0].name, "太宰府市観光案内所（西鉄太宰府駅構内）");
  assert.equal(activeDistributionPlaces(card.distributionPlaces, "2026-09-30").length, 0);
  assert.equal(activeDistributionPlaces(card.distributionPlaces, "2026-10-01").length, 1);
  assert.equal(activeDistributionPlaces(card.distributionPlaces, "2026-12-22").length, 1);
  assert.equal(activeDistributionPlaces(card.distributionPlaces, "2026-12-23").length, 0);
});

test("Yokosuka C001 switches from park office to museum without overlapping pins", async () => {
  const { readFile } = await import("node:fs/promises");
  const locations = JSON.parse(await readFile("data/locations.json", "utf8"));
  const card = locations.find((item) => item.id === "14-201-c-01");
  assert.ok(card);
  assert.deepEqual(card.distributionPlaces.map((place) => place.name), ["ヴェルニー公園管理事務所", "よこすか近代遺産ミュージアム ティボディエ邸"]);
  assert.deepEqual(activeDistributionPlaces(card.distributionPlaces, "2026-11-13").map((place) => place.id), ["place-yokosuka-c-temporary-park-office"]);
  assert.deepEqual(activeDistributionPlaces(card.distributionPlaces, "2026-11-14").map((place) => place.id), ["place-yokosuka-c-museum-after-renewal"]);
  assert.notDeepEqual([card.distributionPlaces[0].lat, card.distributionPlaces[0].lng], [card.distributionPlaces[1].lat, card.distributionPlaces[1].lng]);
});

test("East Matsushima B and C keep card-specific normal and closure-day outlets", async () => {
  const { readFile } = await import("node:fs/promises");
  const locations = JSON.parse(await readFile("data/locations.json", "utf8"));
  for (const [id, normal] of [["04-214-b-01", "東松島市商工会"], ["04-214-c-01", "東松島市役所 鳴瀬庁舎2階 都市整備課窓口"]]) {
    const card = locations.find((item) => item.id === id);
    assert.equal(card.place, normal);
    assert.deepEqual(card.distributionPlaces.map((place) => place.name), [normal, "東松島市震災復興伝承館"]);
    assert.notDeepEqual([card.distributionPlaces[0].lat, card.distributionPlaces[0].lng], [card.distributionPlaces[1].lat, card.distributionPlaces[1].lng]);
    assert.match(card.distributionPlaces[1].days, /定休日|閉庁日/);
  }
});

test("Miyakojima weekday card pin uses the named on-site management building", async () => {
  const { readFile } = await import("node:fs/promises");
  const locations = JSON.parse(await readFile("data/locations.json", "utf8"));
  const card = locations.find((item) => item.id === "47-214-a-01");
  const weekday = card.distributionPlaces.find((place) => place.id === "place-200cf1c5fa");
  assert.deepEqual([card.lat, card.lng], [24.813734, 125.29509]);
  assert.deepEqual([weekday.lat, weekday.lng], [card.lat, card.lng]);
  assert.match(weekday.name, /管理棟/);
  assert.equal(card.distributionPlaces.length, 2);
});
