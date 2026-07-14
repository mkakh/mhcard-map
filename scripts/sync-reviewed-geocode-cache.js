import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { withReviewedGeocodeResult } from "./geocode-cache-utils.js";
import { isManuallyReviewedGeocodeTitle } from "./geocode-precision-utils.js";

const dataPath = join(process.cwd(), "data", "locations.json");
const cachePath = join(process.cwd(), "data", "geocode-cache.json");
const locations = JSON.parse(await readFile(dataPath, "utf8"));
const cache = JSON.parse(await readFile(cachePath, "utf8"));

for (const entry of Object.values(cache)) {
  if (entry && typeof entry === "object") delete entry.reviewedResults;
}

let reviewedTargets = 0;
let cacheKeys = 0;
for (const location of locations) {
  syncTarget(location, `location:${location.id}`);
  for (const place of location.distributionPlaces ?? []) {
    syncTarget(place, `distributionPlaces:${location.id}:${place.id}`);
  }
  for (const place of location.englishVersionDistributionPlaces ?? []) {
    syncTarget(place, `englishVersionDistributionPlaces:${location.id}:${place.id}`);
  }
}

await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ reviewedTargets, cacheKeys }, null, 2));

function syncTarget(target, targetKey) {
  if (!isManuallyReviewedGeocodeTitle(target.geocodeTitle)) return;
  if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return;
  const result = { lng: target.lng, lat: target.lat, title: target.geocodeTitle };
  for (const key of geocodeCacheKeys(target.geocodeQuery)) {
    cache[key] = withReviewedGeocodeResult(cache[key], targetKey, result);
    cacheKeys += 1;
  }
  reviewedTargets += 1;
}

function geocodeCacheKeys(query) {
  const keys = new Set([String(query || "")]);
  const withoutPrefecture = String(query || "").replace(/^(北海道|東京都|京都府|大阪府|.{2,3}県)/, "");
  if (withoutPrefecture) keys.add(withoutPrefecture);
  return [...keys].filter(Boolean);
}
