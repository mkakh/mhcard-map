import test from "node:test";
import assert from "node:assert/strict";
import {
  cachedGeocodeResult,
  shouldUseCachedGeocodeResult,
  withCachedGeocodeResult,
  withReviewedGeocodeResult
} from "../scripts/geocode-cache-utils.js";

test("failed GSI cache entries are bypassed only when retry is requested", () => {
  assert.equal(shouldUseCachedGeocodeResult(undefined, false), false);
  assert.equal(shouldUseCachedGeocodeResult({ error: "not_found" }, false), true);
  assert.equal(shouldUseCachedGeocodeResult({ error: "not_found" }, true), false);
  assert.equal(shouldUseCachedGeocodeResult({ lat: 35, lng: 139 }, true), true);
});

test("manual cache results are scoped to an exact geocode target", () => {
  const manual = { lat: 35, lng: 139, title: "施設（手動補正）" };
  const entry = withReviewedGeocodeResult(undefined, "location:card-1", manual);

  assert.deepEqual(cachedGeocodeResult(entry, false, "location:card-1"), manual);
  assert.equal(cachedGeocodeResult(entry, false, "location:card-2"), null);
});

test("ordinary cache refreshes preserve target-scoped reviewed results", () => {
  const reviewed = withReviewedGeocodeResult(undefined, "location:card-1", {
    lat: 35,
    lng: 139,
    title: "施設（手動補正）"
  });
  const refreshed = withCachedGeocodeResult(reviewed, { lat: 36, lng: 140, title: "住所" });

  assert.equal(refreshed.lat, 36);
  assert.ok(refreshed.reviewedResults["location:card-1"]);
});
