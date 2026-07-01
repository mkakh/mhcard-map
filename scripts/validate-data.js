import { readFile } from "node:fs/promises";
import { join } from "node:path";

const dataPath = join(process.cwd(), "data", "locations.json");
const allowedCoordinateAccuracy = new Set(["address", "prefecture_approx"]);
const allowedStatuses = new Set(["配布中", "休止中", "要確認"]);
const urlFields = ["sourceUrl", "facilityUrl", "stockUrl", "conditionUrl", "imageUrl"];
const placeUrlFields = ["url", "facilityUrl", "stockUrl", "conditionUrl"];
const requiredStringFields = ["id", "cardName", "prefecture", "municipality", "status", "updatedAt", "plusCode"];

const errors = [];
const warnings = [];

const locations = JSON.parse(await readFile(dataPath, "utf8"));

if (!Array.isArray(locations) || locations.length === 0) {
  fail("data/locations.json must be a non-empty array");
} else {
  validateLocations(locations);
}

if (warnings.length > 0) {
  console.warn(`Data validation warnings (${warnings.length}):`);
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length > 0) {
  console.error(`Data validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Data validation passed: ${locations.length} locations`);

function validateLocations(items) {
  const ids = new Set();

  items.forEach((location, index) => {
    const label = location?.id || `index ${index}`;
    if (!location || typeof location !== "object") {
      fail(`${label}: location must be an object`);
      return;
    }

    requiredStringFields.forEach((field) => {
      if (!String(location[field] ?? "").trim()) fail(`${label}: missing required field ${field}`);
    });

    if (ids.has(location.id)) fail(`${label}: duplicate id`);
    ids.add(location.id);

    if (!/^[a-z0-9-]+$/.test(String(location.id ?? ""))) fail(`${label}: id must be lowercase alphanumeric with hyphens`);
    if (!allowedStatuses.has(location.status)) fail(`${label}: unknown status ${location.status}`);
    if (!allowedCoordinateAccuracy.has(location.coordinateAccuracy)) fail(`${label}: unknown coordinateAccuracy ${location.coordinateAccuracy}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(location.updatedAt ?? ""))) fail(`${label}: updatedAt must be YYYY-MM-DD`);

    validateCoordinate(label, "lat", location.lat, 20, 46);
    validateCoordinate(label, "lng", location.lng, 122, 154);

    urlFields.forEach((field) => validateUrl(label, field, location[field]));

    if (location.legacyIds !== undefined) {
      if (!Array.isArray(location.legacyIds)) fail(`${label}: legacyIds must be an array`);
      else if (new Set(location.legacyIds).size !== location.legacyIds.length) fail(`${label}: duplicate legacyIds`);
    }

    validateDistributionPlaces(label, location.distributionPlaces);

    if (!String(location.place ?? "").trim() && !String(location.address ?? "").trim()) {
      warnings.push(`${label}: both place and address are empty`);
    }
  });
}

function validateDistributionPlaces(label, distributionPlaces) {
  if (distributionPlaces === undefined) return;
  if (!Array.isArray(distributionPlaces)) {
    fail(`${label}: distributionPlaces must be an array`);
    return;
  }

  const ids = new Set();
  distributionPlaces.forEach((place, index) => {
    const placeLabel = `${label}: distributionPlaces[${index}]`;
    if (!place || typeof place !== "object") {
      fail(`${placeLabel}: must be an object`);
      return;
    }

    if (!/^[a-z0-9-]+$/.test(String(place.id ?? ""))) {
      fail(`${placeLabel}: id must be lowercase alphanumeric with hyphens`);
    }
    if (ids.has(place.id)) fail(`${placeLabel}: duplicate id`);
    ids.add(place.id);

    ["name", "address", "plusCode"].forEach((field) => {
      if (!String(place[field] ?? "").trim()) fail(`${placeLabel}: missing required field ${field}`);
    });

    validateCoordinate(placeLabel, "lat", place.lat, 20, 46);
    validateCoordinate(placeLabel, "lng", place.lng, 122, 154);

    if (place.coordinateAccuracy !== undefined && !allowedCoordinateAccuracy.has(place.coordinateAccuracy)) {
      fail(`${placeLabel}: unknown coordinateAccuracy ${place.coordinateAccuracy}`);
    }

    placeUrlFields.forEach((field) => validateUrl(placeLabel, field, place[field]));
  });
}

function validateCoordinate(label, field, value, min, max) {
  if (!Number.isFinite(value)) {
    fail(`${label}: ${field} must be a finite number`);
    return;
  }
  if (value < min || value > max) fail(`${label}: ${field} is outside expected Japan range`);
}

function validateUrl(label, field, value) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) fail(`${label}: ${field} must be http(s)`);
  } catch {
    fail(`${label}: ${field} must be a valid URL`);
  }
}

function fail(message) {
  errors.push(message);
}
