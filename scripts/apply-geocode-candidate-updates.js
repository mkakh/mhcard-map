import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  geocodeSnapshotHash,
  isCoordinateWithinPrefecture,
  prefectureMention
} from "./geocode-precision-utils.js";
import { candidateApprovalError } from "./geocode-candidate-approval-utils.js";
import { withReviewedGeocodeResult } from "./geocode-cache-utils.js";
import { encodePlusCode } from "./plus-code-utils.js";

const dataPath = join(process.cwd(), "data", "locations.json");
const cachePath = join(process.cwd(), "data", "geocode-cache.json");
const csvPath = join(process.cwd(), ".tmp", "geocode-precision-candidate-review.csv");
const reviewLogPath = join(process.cwd(), ".tmp", "geocode-applied-review.json");
const dryRun = process.env.DRY_RUN === "1";

const locations = JSON.parse(await readFile(dataPath, "utf8"));
const geocodeCache = JSON.parse(await readFile(cachePath, "utf8"));
const rows = parseCsv(await readFile(csvPath, "utf8"));
const byId = new Map(locations.map((location) => [location.id, location]));
const applied = [];
const skipped = [];

for (const row of rows) {
  const approvalError = candidateApprovalError(row);
  if (approvalError) {
    skipped.push({ id: row.id, target: row.target, reason: approvalError });
    continue;
  }
  const location = byId.get(row.id);
  if (!location) {
    skipped.push({ id: row.id, target: row.target, reason: "location not found" });
    continue;
  }

  const target = findTarget(location, row);
  if (!target) {
    skipped.push({ id: row.id, target: row.target, reason: "target not found" });
    continue;
  }
  if (row.targetId && target.id !== row.targetId && row.target !== "location") {
    skipped.push({ id: row.id, target: row.target, reason: "target id mismatch" });
    continue;
  }
  if (row.snapshotHash !== geocodeSnapshotHash(target)) {
    skipped.push({ id: row.id, target: row.target, reason: "stale candidate snapshot" });
    continue;
  }
  const lat = Number(row.approvedLat);
  const lng = Number(row.approvedLng);
  const coordinatePrefecture = prefectureMention(target.address) || prefectureMention(target.geocodeQuery) || location.prefecture;
  if (!isCoordinateWithinPrefecture(coordinatePrefecture, lat, lng)) {
    skipped.push({ id: row.id, target: row.target, reason: `candidate coordinate is outside ${coordinatePrefecture} bounds` });
    continue;
  }
  const title = geocodeTitle(row, target);
  const before = {
    lat: target.lat,
    lng: target.lng,
    geocodeTitle: target.geocodeTitle,
    plusCode: target.plusCode,
    coordinateAccuracy: target.coordinateAccuracy,
    geocodeError: target.geocodeError
  };

  target.lat = lat;
  target.lng = lng;
  target.geocodeTitle = title;
  target.geocodedAt = row.reviewedAt;
  target.plusCode = encodePlusCode(lat, lng);
  target.coordinateAccuracy = "address";
  delete target.geocodeError;

  updateGeocodeCache(row.geocodeQuery, targetKey(row), lat, lng, title);
  applied.push({
    id: row.id,
    cardName: row.cardName,
    target: row.target,
    targetId: row.targetId,
    place: row.place,
    address: target.address,
    geocodeQuery: row.geocodeQuery,
    source: row.reviewedCoordinateSource,
    reviewedOfficialUrl: row.reviewedOfficialUrl,
    reviewedCoordinateEvidence: row.reviewedCoordinateEvidence,
    reviewNotes: row.reviewNotes,
    reviewedAt: row.reviewedAt,
    before,
    after: {
      lat: target.lat,
      lng: target.lng,
      geocodeTitle: target.geocodeTitle,
      plusCode: target.plusCode,
      coordinateAccuracy: target.coordinateAccuracy,
      geocodeError: target.geocodeError
    }
  });
}

if (!dryRun) {
  await writeFile(dataPath, `${JSON.stringify(locations, null, 2)}\n`, "utf8");
  await writeFile(cachePath, `${JSON.stringify(geocodeCache, null, 2)}\n`, "utf8");
  await mkdir(dirname(reviewLogPath), { recursive: true });
  await writeFile(reviewLogPath, `${JSON.stringify(applied, null, 2)}\n`, "utf8");
}

console.log(
  JSON.stringify(
    {
      dryRun,
      allowedSources: ["serper-places", "official-embedded-map", "manual-coordinate"],
      applied: applied.length,
      skipped: skipped.length,
      skippedDetails: skipped.slice(0, 20),
      appliedDetails: applied.slice(0, 20)
    },
    null,
    2
  )
);

function findTarget(location, row) {
  if (row.target === "location") return row.targetId && row.targetId !== location.id ? null : location;

  const collection = location[row.target];
  if (!Array.isArray(collection)) return null;

  if (!row.targetId) return null;
  return collection.find((place) => place.id === row.targetId) ?? null;
}

function geocodeTitle(row, target) {
  const name = target.place || target.name || row.place || row.cardName;
  if (row.approvedTitle) return row.approvedTitle;
  const evidence = row.reviewedCoordinateSource === "official-embedded-map" ? "公式地図照合" : "地図検索照合";
  return `${name}（公式配布先・${evidence}・手動補正）`;
}

function updateGeocodeCache(query, reviewedTargetKey, lat, lng, title) {
  for (const key of geocodeCacheKeys(query)) {
    geocodeCache[key] = withReviewedGeocodeResult(
      geocodeCache[key],
      reviewedTargetKey,
      { lng, lat, title }
    );
  }
}

function targetKey(row) {
  return row.target === "location"
    ? `location:${row.id}`
    : `${row.target}:${row.id}:${row.targetId}`;
}

function geocodeCacheKeys(query) {
  const keys = new Set([query]);
  const withoutPrefecture = String(query).replace(/^(北海道|東京都|京都府|大阪府|.{2,3}県)/, "");
  if (withoutPrefecture && withoutPrefecture !== query) keys.add(withoutPrefecture);
  return [...keys].filter(Boolean);
}

function parseCsv(text) {
  const records = [];
  const normalized = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const header = rows.shift() ?? [];
  for (const values of rows) {
    if (values.every((value) => value === "")) continue;
    records.push(Object.fromEntries(header.map((field, index) => [field, values[index] ?? ""])));
  }

  return records;
}
