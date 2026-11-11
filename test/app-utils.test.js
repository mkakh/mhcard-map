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

test("Mibu A and B select the correct weekday, weekend and public holiday desk", async () => {
  const { readFile } = await import("node:fs/promises");
  const cards = JSON.parse(await readFile("data/locations.json", "utf8"));
  for (const id of ["09-361-a-01", "09-361-b-01"]) {
    const card = cards.find((entry) => entry.id === id);
    for (const [date, desk, time] of [
      ["2026-11-11", "下水道課", "17:00"],
      ["2026-11-14", "日直室", "17:00"],
      ["2026-11-23", "日直室", "17:00"]
    ]) {
      const active = activeDistributionPlaces(card.distributionPlaces, date);
      assert.equal(active.length, 1, `${id} ${date}`);
      assert.match(active[0].name, new RegExp(desk));
      assert.match(selectPrimaryDistributionPlace(card.distributionPlaces, date).name, new RegExp(desk));
      assert.match(active[0].hours, new RegExp(time));
    }
  }
  const a = cards.find((entry) => entry.id === "09-361-a-01");
  assert.equal(activeDistributionPlaces(a.distributionPlaces, "2027-01-19")[0].hours, "9:00～17:00");
  assert.equal(activeDistributionPlaces(a.distributionPlaces, "2027-01-20")[0].hours, "9:00～16:30");
  assert.match(activeDistributionPlaces(a.distributionPlaces, "2027-02-11")[0].name, /日直室/);
  assert.deepEqual(activeDistributionPlaces(a.distributionPlaces, "2028-01-01").map((x) => x.days), ["土日祝日"]);
  assert.match(selectPrimaryDistributionPlace(a.distributionPlaces, "2028-01-01").name, /日直室/);
  assert.equal(selectPrimaryDistributionPlace(a.distributionPlaces, "2028-01-03"), null);
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

test("weekday Asahikawa hours and Tomakomai city-hall representative survive release", async () => {
  const { readFile } = await import("node:fs/promises");
  const cards = JSON.parse(await readFile("data/locations.json", "utf8"));
  const asahikawa = cards.find((card) => card.id === "01-204-a-01");
  const office = asahikawa.distributionPlaces.find((place) => place.id === "place-asahikawa-treatment-main-office");
  assert.equal(office.hours, "9:00～17:00");
  assert.deepEqual([office.lat, office.lng], [43.780346, 142.29404]);
  const tomakomai = cards.find((card) => card.id === "01-213-a-01");
  assert.deepEqual([tomakomai.lat, tomakomai.lng], [42.634014, 141.6056]);
  assert.deepEqual([tomakomai.distributionPlaces[0].lat, tomakomai.distributionPlaces[0].lng], [tomakomai.lat, tomakomai.lng]);
  assert.deepEqual([tomakomai.distributionPlaces[1].lat, tomakomai.distributionPlaces[1].lng], [42.63964, 141.59773]);
});
