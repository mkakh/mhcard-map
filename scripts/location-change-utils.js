import { spawnSync } from "node:child_process";

export function filterChangedLocations(locations) {
  return filterChangedLocationsAgainstBase(readBaseLocations(), locations);
}

export function filterChangedLocationsAgainstBase(baseLocations, locations) {
  const baseById = new Map(baseLocations.map((location) => [location.id, location]));
  return locations.flatMap((location) => {
    const previous = baseById.get(location.id);
    if (!previous) return [location];
    if (JSON.stringify(previous) === JSON.stringify(location)) return [];

    const changedLocation = structuredClone(location);
    const topLevelChanged = geocodeFieldsChanged(previous, location);
    if (!topLevelChanged) {
      changedLocation.__skipTopLevelGeocodeTarget = true;
    }

    let nestedTargetChanged = false;
    for (const field of ["distributionPlaces", "englishVersionDistributionPlaces"]) {
      changedLocation[field] = changedPlaces(previous[field], location[field]);
      if (changedLocation[field].length === 0) {
        delete changedLocation[field];
      } else {
        nestedTargetChanged = true;
      }
    }

    if (!topLevelChanged && !nestedTargetChanged) return [];
    return [changedLocation];
  });
}

const geocodeReviewFields = [
  "status",
  "place",
  "name",
  "address",
  "lat",
  "lng",
  "geocodeQuery",
  "geocodeTitle",
  "coordinateAccuracy",
  "geocodeError"
];

export function geocodeFieldsChanged(previous, current) {
  return geocodeReviewFields.some((field) => JSON.stringify(previous?.[field]) !== JSON.stringify(current?.[field]));
}

export function collectGeocodeReviewEntries(beforeLocations, afterLocations) {
  const beforeById = new Map(beforeLocations.map((location) => [location.id, location]));
  const afterById = new Map(afterLocations.map((location) => [location.id, location]));
  const ids = [...new Set([...beforeById.keys(), ...afterById.keys()])].sort();
  const entries = [];

  for (const id of ids) {
    const before = beforeById.get(id);
    const after = afterById.get(id);
    collectTargetEntry(entries, before, after, before, after, "location");
    for (const field of ["distributionPlaces", "englishVersionDistributionPlaces"]) {
      collectPlaceEntries(entries, before, after, field);
    }
  }

  return entries;
}

function collectPlaceEntries(entries, beforeLocation, afterLocation, field) {
  const previous = Array.isArray(beforeLocation?.[field]) ? beforeLocation[field] : [];
  const next = Array.isArray(afterLocation?.[field]) ? afterLocation[field] : [];
  const beforeById = new Map(previous.map((place) => [place.id, place]));
  const afterById = new Map(next.map((place) => [place.id, place]));
  const ids = [...new Set([...beforeById.keys(), ...afterById.keys()])].sort();

  for (const id of ids) {
    collectTargetEntry(
      entries,
      beforeLocation,
      afterLocation,
      beforeById.get(id),
      afterById.get(id),
      field
    );
  }
}

function collectTargetEntry(entries, beforeLocation, afterLocation, beforeTarget, afterTarget, target) {
  if (beforeTarget && afterTarget && !geocodeFieldsChanged(beforeTarget, afterTarget)) return;
  if (!beforeTarget && !afterTarget) return;

  const location = afterLocation ?? beforeLocation;
  entries.push({
    id: location.id,
    cardName: location.cardName,
    prefecture: location.prefecture,
    municipality: location.municipality,
    target,
    targetId: afterTarget?.id ?? beforeTarget?.id ?? location.id,
    place: afterTarget?.place ?? afterTarget?.name ?? beforeTarget?.place ?? beforeTarget?.name ?? location.place ?? "",
    changeType: !beforeTarget ? "added" : !afterTarget ? "removed" : "changed",
    before: beforeTarget ?? null,
    after: afterTarget ?? null,
    locationBefore: beforeLocation ?? null,
    locationAfter: afterLocation ?? null
  });
}

function changedPlaces(previousPlaces, currentPlaces) {
  const previousById = new Map((previousPlaces ?? []).map((place) => [place.id, place]));
  return (currentPlaces ?? []).filter((place) => JSON.stringify(previousById.get(place.id)) !== JSON.stringify(place));
}

function readBaseLocations() {
  const baseRef = process.env.GEOCODE_CHANGED_BASE || "HEAD";
  const result = spawnSync("git", ["show", `${baseRef}:data/locations.json`], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024
  });
  if (result.status !== 0 || !result.stdout) {
    throw new Error(`Failed to read ${baseRef}:data/locations.json: ${result.stderr || "no output"}`);
  }
  return JSON.parse(result.stdout);
}
