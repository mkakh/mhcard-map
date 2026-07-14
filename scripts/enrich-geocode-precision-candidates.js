import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  backlogShardIndex,
  collectGeocodePrecisionCandidates,
  collectGeocodeReviewBacklog,
  distanceMeters,
  geocodeSnapshotHash,
  isCoordinateWithinPrefecture,
  normalize,
  normalizeSearchQuery,
  selectCandidateShard,
  selectGeocodeReviewBatch
} from "./geocode-precision-utils.js";
import { filterChangedLocations } from "./location-change-utils.js";

const dataPath = process.env.GEOCODE_CANDIDATE_DATA_PATH || join(process.cwd(), "data", "locations.json");
const cachePath = process.env.GEOCODE_CANDIDATE_CACHE_PATH || join(process.cwd(), ".tmp", "geocode-candidate-cache.json");
const outputPath = process.env.GEOCODE_CANDIDATE_OUTPUT_PATH || join(process.cwd(), ".tmp", "geocode-precision-candidate-review.csv");
const webSearchPath = join(process.cwd(), "tools", "web-search.sh");
const auditScope = process.env.GEOCODE_AUDIT_SCOPE || "precision";
const fetchOfficialMaps = process.env.FETCH_OFFICIAL_MAPS === "1";
const fetchPlaces = process.env.FETCH_PLACES === "1";
const fetchWebSearch = process.env.FETCH_WEB_SEARCH === "1";
const fetchDiscoveredOfficialPages = process.env.FETCH_DISCOVERED_OFFICIAL_PAGES !== "0";
const fetchNominatim = process.env.FETCH_NOMINATIM === "1";
const maxCandidates = Number(process.env.MAX_CANDIDATES || 0);
const maxNominatimRequests = Number(process.env.MAX_NOMINATIM_REQUESTS || 0);
const changedOnly = process.env.CHANGED_ONLY === "1";
const shardCount = Number(process.env.BACKLOG_SHARD_COUNT || 0);
const shardIndex = shardCount > 0
  ? Number(process.env.BACKLOG_SHARD_INDEX || backlogShardIndex(shardCount))
  : null;
const delayMs = Math.max(0, Number(process.env.GEOCODE_CANDIDATE_DELAY_MS || 200));
const nominatimDelayMs = Math.max(1100, Number(process.env.NOMINATIM_DELAY_MS || 1100));
const timeoutMs = Number(process.env.GEOCODE_CANDIDATE_TIMEOUT_MS || 15000);
const successCacheTtlMs = Number(process.env.GEOCODE_CANDIDATE_SUCCESS_CACHE_TTL_MS || 30 * 24 * 60 * 60 * 1000);
const failureCacheTtlMs = Number(process.env.GEOCODE_CANDIDATE_FAILURE_CACHE_TTL_MS || 6 * 60 * 60 * 1000);

const allLocations = JSON.parse(await readFile(dataPath, "utf8"));
const locations = changedOnly ? filterChangedLocations(allLocations) : allLocations;
const locationsById = new Map(allLocations.map((location) => [location.id, location]));
const cache = await readJson(cachePath, { officialPages: {}, nominatim: {}, places: {}, webSearch: {} });
cache.officialPages ??= {};
cache.nominatim ??= {};
cache.places ??= {};
cache.webSearch ??= {};

let candidates = collectCandidates(locations);
if (shardCount > 0) {
  candidates = auditScope === "review-backlog"
    ? selectGeocodeReviewBatch(candidates, shardCount, shardIndex)
    : selectCandidateShard(candidates, shardCount, shardIndex);
}
if (maxCandidates > 0) candidates = candidates.slice(0, maxCandidates);

const rows = [];
const counters = { officialPages: 0, places: 0, webSearch: 0, nominatim: 0 };

for (const [index, candidate] of candidates.entries()) {
  if (index === 0 || (index + 1) % 25 === 0 || index + 1 === candidates.length) {
    console.error(`Processing candidate ${index + 1}/${candidates.length}: ${candidate.id} ${candidate.kind}`);
  }

  const officialSearchCandidates = fetchWebSearch ? await serperOfficialSearchCandidates(candidate) : [];
  const discoveredOfficialUrls = officialSearchCandidates
    .filter((result) => isLikelyGovernmentUrl(result.url))
    .map((result) => result.url);
  if (fetchWebSearch && fetchDiscoveredOfficialPages) {
    for (const url of discoveredOfficialUrls) await fetchOfficialPage(url);
  }
  const officialMapCandidates = fetchOfficialMaps
    ? await embeddedMapCandidates(candidate, discoveredOfficialUrls)
    : [];
  const placesCandidates = fetchPlaces ? await serperPlacesCandidates(candidate) : [];
  const nominatimCandidates = fetchNominatim ? await fetchNominatimCandidates(candidate) : [];

  rows.push({
    id: candidate.id,
    cardName: candidate.cardName,
    severity: candidate.severity,
    target: candidate.kind,
    targetId: candidate.targetId,
    place: candidate.place,
    address: candidate.address,
    geocodeQuery: candidate.geocodeQuery,
    geocodeTitle: candidate.geocodeTitle,
    reasons: candidate.reasons.join("; "),
    currentLat: candidate.lat,
    currentLng: candidate.lng,
    officialUrlCandidates: JSON.stringify(candidate.urls ?? []),
    officialSearchCandidates: JSON.stringify(officialSearchCandidates),
    placesCandidates: JSON.stringify(placesCandidates),
    officialMapCandidates: JSON.stringify(officialMapCandidates),
    nominatimCandidates: JSON.stringify(nominatimCandidates),
    snapshotHash: geocodeSnapshotHash(originalTarget(candidate)),
    decision: "",
    approvedLat: "",
    approvedLng: "",
    approvedTitle: "",
    reviewedOfficialUrl: "",
    reviewedCoordinateSource: "",
    reviewedCoordinateEvidence: "",
    reviewedAt: "",
    reviewNotes: ""
  });
}

await writeJson(cachePath, cache);
await writeCsv(outputPath, rows);

console.log(JSON.stringify({
  auditScope,
  candidates: candidates.length,
  changedOnly,
  shardCount,
  shardIndex,
  fetchOfficialMaps,
  fetchPlaces,
  fetchWebSearch,
  fetchDiscoveredOfficialPages,
  fetchNominatim,
  requests: counters,
  outputPath
}, null, 2));

function collectCandidates(items) {
  if (auditScope === "precision") return collectGeocodePrecisionCandidates(items, { includeUrls: true });
  if (auditScope === "review-backlog") return collectGeocodeReviewBacklog(items, { includeUrls: true });
  throw new Error(`Unknown GEOCODE_AUDIT_SCOPE: ${auditScope}`);
}

function originalTarget(candidate) {
  const location = locationsById.get(candidate.id);
  if (!location) throw new Error(`${candidate.id}: location not found for snapshot`);
  if (candidate.kind === "location") return location;
  const target = location[candidate.kind]?.find((item) => item.id === candidate.targetId);
  if (!target) throw new Error(`${candidate.id}:${candidate.kind}:${candidate.targetId}: target not found for snapshot`);
  return target;
}

async function serperPlacesCandidates(candidate) {
  const query = normalizeSearchQuery(
    `${candidate.prefecture} ${candidate.municipality} ${candidate.place} ${candidate.address || candidate.geocodeQuery}`
  );
  const response = await cachedSerper("places", query, 5);
  return (response?.places ?? []).slice(0, 5).map((place) => coordinateCandidate(candidate, {
    source: "serper-places",
    title: place.title || "",
    address: place.address || "",
    lat: Number(place.latitude),
    lng: Number(place.longitude),
    url: place.website || ""
  })).filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
}

async function serperOfficialSearchCandidates(candidate) {
  const query = normalizeSearchQuery(
    `${candidate.prefecture} ${candidate.municipality} ${candidate.cardName} ${candidate.place} マンホールカード`
  );
  const response = await cachedSerper("search", query, 10);
  return (response?.organic ?? []).slice(0, 10).map((result) => ({
    title: result.title || "",
    url: result.link || "",
    snippet: result.snippet || ""
  }));
}

async function cachedSerper(type, query, count) {
  const bucket = type === "places" ? cache.places : cache.webSearch;
  const key = `${type}:${query}`;
  const cached = normalizeCacheEntry(bucket[key]);
  if (cached && isFreshCacheEntry(cached)) return cached.response;

  const result = spawnSync(webSearchPath, [
    "--provider", "serper", "--type", type, "--count", String(count), "--json", query
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: timeoutMs + 30000,
    maxBuffer: 10 * 1024 * 1024
  });
  const counter = type === "places" ? "places" : "webSearch";
  counters[counter] += 1;
  let response = {};
  let status = result.status === 0 ? 200 : 0;
  let error = "";
  try {
    response = result.status === 0 ? JSON.parse(result.stdout) : {};
  } catch (parseError) {
    status = 0;
    error = `invalid JSON: ${parseError.message}`;
  }
  if (result.status !== 0) error = String(result.stderr || `search exited ${result.status}`).trim();
  bucket[key] = { status, fetchedAt: new Date().toISOString(), response, ...(error ? { error } : {}) };
  await writeJson(cachePath, cache);
  if (delayMs > 0) await sleep(delayMs);
  return response;
}

async function embeddedMapCandidates(candidate, additionalUrls = []) {
  const candidates = [];
  for (const url of [...new Set([...(candidate.urls ?? []), ...additionalUrls])]) {
    const page = await fetchOfficialPage(url);
    if (!page?.text) continue;
    for (const coordinate of extractCoordinates(page.text)) {
      candidates.push(coordinateCandidate(candidate, {
        source: "official-embedded-map",
        title: "unbound embedded map; verify page context",
        address: "",
        lat: coordinate.lat,
        lng: coordinate.lng,
        url
      }));
    }
  }
  return dedupeCoordinateCandidates(candidates);
}

function isLikelyGovernmentUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (hostname.endsWith(".go.jp") || hostname.endsWith(".lg.jp")) return true;
    return hostname.endsWith(".jp") && hostname.split(".").some((label) =>
      /(?:^|-)(?:city|town|vill|village|pref)(?:$|-)/.test(label)
    );
  } catch {
    return false;
  }
}

async function fetchOfficialPage(url) {
  const cached = normalizeCacheEntry(cache.officialPages[url]);
  if (cached && isFreshCacheEntry(cached)) return cached;
  counters.officialPages += 1;
  try {
    const response = await fetchWithTimeout(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const charset = response.headers.get("content-type")?.match(/charset=([^;]+)/i)?.[1] ?? "utf-8";
    const page = {
      status: response.status,
      fetchedAt: new Date().toISOString(),
      text: response.ok ? decodeText(buffer, charset) : ""
    };
    cache.officialPages[url] = page;
    await writeJson(cachePath, cache);
    return page;
  } catch (error) {
    const page = { status: 0, fetchedAt: new Date().toISOString(), error: error.message, text: "" };
    cache.officialPages[url] = page;
    await writeJson(cachePath, cache);
    return page;
  } finally {
    if (delayMs > 0) await sleep(delayMs);
  }
}

async function fetchNominatimCandidates(candidate) {
  if (maxNominatimRequests > 0 && counters.nominatim >= maxNominatimRequests) return [];
  const queries = [...new Set([
    `${candidate.place} ${candidate.municipality} ${candidate.prefecture}`,
    candidate.address || candidate.geocodeQuery
  ].map(normalizeSearchQuery).filter(Boolean))];
  const candidates = [];

  for (const query of queries) {
    if (maxNominatimRequests > 0 && counters.nominatim >= maxNominatimRequests) break;
    const cached = normalizeCacheEntry(cache.nominatim[query]);
    let results = cached && isFreshCacheEntry(cached) ? cached.response : null;
    if (!results) {
      counters.nominatim += 1;
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`;
      try {
        const response = await fetchWithTimeout(url, {
          headers: { "user-agent": "manhole-card-map-geocode-review/0.2 (+https://mhcard-map.com/)" }
        });
        results = response.ok ? await response.json() : [];
        cache.nominatim[query] = { status: response.status, fetchedAt: new Date().toISOString(), response: results };
      } catch (error) {
        results = [];
        cache.nominatim[query] = { status: 0, fetchedAt: new Date().toISOString(), response: [], error: error.message };
      }
      await writeJson(cachePath, cache);
      await sleep(nominatimDelayMs);
    }
    for (const result of (Array.isArray(results) ? results : []).slice(0, 3)) {
      candidates.push(coordinateCandidate(candidate, {
        source: "nominatim",
        title: result.display_name || result.name || "",
        address: result.display_name || "",
        lat: Number(result.lat),
        lng: Number(result.lon),
        url: `query:${query}`
      }));
    }
  }
  return dedupeCoordinateCandidates(candidates);
}

function coordinateCandidate(candidate, coordinate) {
  const title = normalize(coordinate.title);
  const place = normalize(candidate.place);
  return {
    ...coordinate,
    distanceMeters: Math.round(distanceMeters(candidate, coordinate)),
    withinPrefecture: isCoordinateWithinPrefecture(
      candidate.coordinatePrefecture,
      coordinate.lat,
      coordinate.lng
    ),
    placeNameOverlap: place.length >= 3 && (title.includes(place) || place.includes(title))
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": "manhole-card-map-geocode-review/0.2",
        ...(options.headers ?? {})
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractCoordinates(text) {
  const coordinates = [];
  const decoded = decodeHtmlEntities(text);
  const patterns = [
    /[?&;]hlat=([0-9.+-]+)[^"'<>]*[?&;]hlon=([0-9.+-]+)/gi,
    /[?&;]lat=([0-9.+-]+)[^"'<>]*[?&;]lon=([0-9.+-]+)/gi,
    /[?&;]ll=([0-9.+-]+),([0-9.+-]+)/gi,
    /[?&;]q=([0-9.+-]+),([0-9.+-]+)/gi,
    /!3d([0-9.+-]+)!4d([0-9.+-]+)/gi
  ];
  for (const pattern of patterns) {
    for (const match of decoded.matchAll(pattern)) {
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 24 && lat <= 46 && lng >= 122 && lng <= 146) {
        coordinates.push({ lat, lng });
      }
    }
  }
  return dedupeCoordinateCandidates(coordinates.map((coordinate) => ({ source: "coordinate", ...coordinate })))
    .map(({ lat, lng }) => ({ lat, lng }));
}

function dedupeCoordinateCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng)) return false;
    const key = `${candidate.source}:${candidate.lat.toFixed(7)},${candidate.lng.toFixed(7)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeCacheEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  if (Array.isArray(entry.results) && entry.response === undefined) {
    return { ...entry, response: entry.results };
  }
  return entry;
}

function isFreshCacheEntry(entry) {
  const fetchedAt = Date.parse(entry.fetchedAt || "");
  if (!Number.isFinite(fetchedAt)) return false;
  const ttl = entry.status >= 200 && entry.status < 300 ? successCacheTtlMs : failureCacheTtlMs;
  return Date.now() - fetchedAt < ttl;
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'");
}

function decodeText(buffer, charset) {
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
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

async function writeCsv(path, items) {
  await mkdir(dirname(path), { recursive: true });
  const header = [
    "id", "cardName", "severity", "target", "targetId", "place", "address",
    "geocodeQuery", "geocodeTitle", "reasons", "currentLat", "currentLng",
    "officialUrlCandidates", "officialSearchCandidates", "placesCandidates",
    "officialMapCandidates", "nominatimCandidates", "snapshotHash", "decision",
    "approvedLat", "approvedLng", "approvedTitle", "reviewedOfficialUrl",
    "reviewedCoordinateSource", "reviewedCoordinateEvidence", "reviewedAt", "reviewNotes"
  ];
  const csv = "\uFEFF" + [header, ...items.map((item) => header.map((field) => item[field] ?? ""))]
    .map((row) => row.map(csvCell).join(","))
    .join("\n") + "\n";
  await writeFile(path, csv, "utf8");
}

function csvCell(value) {
  const text = String(value).replace(/\r?\n/g, " ");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
