import test from "node:test";
import assert from "node:assert/strict";
import {
  collectGeocodeReviewEntries,
  filterChangedLocationsAgainstBase
} from "../scripts/location-change-utils.js";
import { collectGeocodeTargets } from "../scripts/geocode-precision-utils.js";

test("geocode review entries include changed, added, removed, and English targets", () => {
  const before = [baseLocation()];
  const after = [baseLocation({
    lat: 35.1,
    distributionPlaces: [place("regular", { lat: 35.2 }), place("added")],
    englishVersionDistributionPlaces: [place("english")]
  })];

  const entries = collectGeocodeReviewEntries(before, after);
  assert.deepEqual(
    entries.map((entry) => [entry.target, entry.targetId, entry.changeType]),
    [
      ["location", "card-1", "changed"],
      ["distributionPlaces", "added", "added"],
      ["distributionPlaces", "regular", "changed"],
      ["distributionPlaces", "removed", "removed"],
      ["englishVersionDistributionPlaces", "english", "added"]
    ]
  );
});

test("new locations include their top-level and nested geocode targets", () => {
  const added = baseLocation({
    distributionPlaces: [place("regular")],
    englishVersionDistributionPlaces: [place("english")]
  });
  const entries = collectGeocodeReviewEntries([], [added]);
  assert.equal(entries.length, 3);
  assert.ok(entries.every((entry) => entry.changeType === "added"));
});

test("changed-only filtering ignores timestamp-only changes", () => {
  const before = [baseLocation({ updatedAt: "2026-07-01" })];
  const after = [baseLocation({ updatedAt: "2026-07-14" })];
  assert.deepEqual(filterChangedLocationsAgainstBase(before, after), []);
});

test("status and facility-name changes trigger immediate geocode review", () => {
  const before = [baseLocation({ status: "休止中" })];
  const after = [baseLocation({
    status: "配布中",
    distributionPlaces: [place("regular", { name: "新しい配布施設" }), place("removed")]
  })];

  const filtered = filterChangedLocationsAgainstBase(before, after);
  assert.equal(filtered[0].__skipTopLevelGeocodeTarget, undefined);
  assert.deepEqual(filtered[0].distributionPlaces.map((item) => item.id), ["regular"]);
});

test("changed-only filtering keeps only changed geocode targets", () => {
  const before = [baseLocation()];
  const after = [baseLocation({
    distributionPlaces: [place("regular", { lat: 35.2 }), place("removed")]
  })];
  const filtered = filterChangedLocationsAgainstBase(before, after);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].__skipTopLevelGeocodeTarget, true);
  assert.equal(filtered[0].geocodeQuery, after[0].geocodeQuery);
  assert.deepEqual(filtered[0].distributionPlaces.map((item) => item.id), ["regular"]);
  assert.deepEqual(
    collectGeocodeTargets(filtered).map((candidate) => candidate.targetId),
    ["regular"]
  );
});

function baseLocation(overrides = {}) {
  return {
    id: "card-1",
    cardName: "カード",
    prefecture: "東京都",
    municipality: "千代田区",
    place: "施設",
    address: "東京都千代田区丸の内1-1",
    lat: 35,
    lng: 139,
    geocodeQuery: "東京都千代田区丸の内1-1",
    geocodeTitle: "東京都千代田区丸の内一丁目",
    updatedAt: "2026-07-01",
    distributionPlaces: [place("regular"), place("removed")],
    ...overrides
  };
}

function place(id, overrides = {}) {
  return {
    id,
    name: `施設-${id}`,
    address: `東京都千代田区丸の内1-${id.length}`,
    lat: 35,
    lng: 139,
    geocodeQuery: `東京都千代田区丸の内1-${id.length}`,
    geocodeTitle: "東京都千代田区丸の内一丁目",
    ...overrides
  };
}
