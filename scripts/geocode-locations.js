import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const dataPath = join(process.cwd(), "data", "locations.json");
const cachePath = join(process.cwd(), "data", "geocode-cache.json");
const delayMs = Number(process.env.GEOCODE_DELAY_MS || 250);
const limit = Number(process.env.GEOCODE_LIMIT || 0);
const retryFailed = process.env.GEOCODE_RETRY_FAILED === "1";

const locations = JSON.parse(await readFile(dataPath, "utf8"));
const cache = await readJson(cachePath, {});

let attempted = 0;
let updated = 0;
let cached = 0;
let failed = 0;

for (const location of locations) {
  if (limit > 0 && attempted >= limit) break;
  await geocodeTarget(location, location.address);

  for (const place of location.distributionPlaces ?? []) {
    if (limit > 0 && attempted >= limit) break;
    await geocodeTarget(place, place.address);
  }

  for (const place of location.englishVersionDistributionPlaces ?? []) {
    if (limit > 0 && attempted >= limit) break;
    await geocodeTarget(place, place.address);
  }
}

await writeJson(dataPath, locations);

console.log(
  JSON.stringify(
    {
      total: locations.length,
      attempted,
      updated,
      cached,
      failed,
      cacheSize: Object.keys(cache).length
    },
    null,
    2
  )
);

async function geocodeTarget(target, address) {
  const query = normalizeAddress(address);
  if (!query) return;
  if (target.coordinateAccuracy === "address" && target.geocodeQuery === query) return;
  if (!retryFailed && target.geocodeError && target.geocodeQuery === query) return;

  attempted += 1;

  const result = cache[query] ?? (await geocode(query));
  if (!cache[query]) {
    cache[query] = result;
    await writeJson(cachePath, cache);
    await sleep(delayMs);
  } else {
    cached += 1;
  }

  if (result?.lat && result?.lng) {
    target.lat = result.lat;
    target.lng = result.lng;
    target.coordinateAccuracy = "address";
    target.geocodeQuery = query;
    target.geocodeTitle = result.title;
    target.geocodedAt = new Date().toISOString().slice(0, 10);
    delete target.geocodeError;
    updated += 1;
  } else {
    target.coordinateAccuracy = target.coordinateAccuracy || "prefecture_approx";
    target.geocodeQuery = query;
    target.geocodeError = result?.error ?? "not_found";
    failed += 1;
  }
}

async function geocode(query) {
  const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "manhole-card-map-geocoder/0.1"
      }
    });
    if (!response.ok) {
      return { error: `http_${response.status}` };
    }

    const features = await response.json();
    const feature = Array.isArray(features) ? features[0] : null;
    const coordinates = feature?.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) {
      return { error: "not_found" };
    }

    return {
      lng: Number(coordinates[0]),
      lat: Number(coordinates[1]),
      title: feature.properties?.title ?? ""
    };
  } catch (error) {
    return { error: error.message || "request_failed" };
  }
}

function normalizeAddress(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/電話[:：].*$/g, "")
    .replace(/[（(].*?[）)]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
