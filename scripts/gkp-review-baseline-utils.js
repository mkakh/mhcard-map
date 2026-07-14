import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

export const GKP_REVIEW_BASELINE_PATH = join(
  process.cwd(),
  "data",
  "gkp-review-baseline.json"
);

export const GKP_CONTENT_REVIEW_FIELDS = Object.freeze([
  "cardName",
  "place",
  "address",
  "hours",
  "closed",
  "condition",
  "stock",
  "status",
  "distributionStartsOn",
  "distributionPlaces",
  "hasEnglishVersion",
  "englishVersionStatus",
  "englishVersionNote",
  "englishVersionUrl"
]);

export const GKP_LINK_REVIEW_FIELDS = Object.freeze([
  "facilityUrl",
  "stockUrl",
  "stock"
]);

export const GKP_ALL_REVIEW_FIELDS = Object.freeze([
  ...new Set([...GKP_CONTENT_REVIEW_FIELDS, ...GKP_LINK_REVIEW_FIELDS])
]);
const GKP_REVIEW_FIELD_INDEX = new Map(
  GKP_ALL_REVIEW_FIELDS.map((field, index) => [field, index])
);
const UNINITIALIZED_FINGERPRINT = "-";
const NULL_FINGERPRINT = "0";

const GKP_DISTRIBUTION_PLACE_FIELDS = Object.freeze([
  "id",
  "name",
  "address",
  "days",
  "hours",
  "closed",
  "url"
]);

export async function readGkpReviewBaseline({ allowMissing = false } = {}) {
  try {
    const parsed = JSON.parse(await readFile(GKP_REVIEW_BASELINE_PATH, "utf8"));
    const formatError = gkpReviewBaselineFormatError(parsed);
    if (formatError) throw new Error(formatError);
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT" && allowMissing) return emptyGkpReviewBaseline();
    if (error?.code === "ENOENT") {
      throw new Error(
        "Missing data/gkp-review-baseline.json; restore the committed baseline " +
        "instead of silently accepting the current GKP data",
        { cause: error }
      );
    }
    throw error;
  }
}

export async function writeGkpReviewBaseline(baseline) {
  const locations = Object.fromEntries(
    Object.entries(baseline.locations ?? {}).sort(([left], [right]) =>
      left.localeCompare(right, "en")
    )
  );
  await writeFile(
    GKP_REVIEW_BASELINE_PATH,
    `${JSON.stringify({ version: 3, fieldOrder: GKP_ALL_REVIEW_FIELDS, locations }, null, 2)}\n`,
    "utf8"
  );
}

export function emptyGkpReviewBaseline() {
  return { version: 3, fieldOrder: GKP_ALL_REVIEW_FIELDS, locations: {} };
}

export function unlistedGkpReviewBaselineEntry() {
  return {
    gkpListing: false,
    fingerprints: GKP_ALL_REVIEW_FIELDS.map(() => UNINITIALIZED_FINGERPRINT).join("|")
  };
}

export function gkpReviewBaselineFormatError(baseline) {
  if (
    baseline?.version !== 3
    || !baseline.locations
    || typeof baseline.locations !== "object"
    || Array.isArray(baseline.locations)
  ) {
    return "Unsupported GKP review baseline format";
  }
  if (JSON.stringify(baseline.fieldOrder) !== JSON.stringify(GKP_ALL_REVIEW_FIELDS)) {
    return "GKP review baseline field order does not match the current schema";
  }

  for (const [id, entry] of Object.entries(baseline.locations)) {
    const fingerprints = typeof entry?.fingerprints === "string"
      ? entry.fingerprints.split("|")
      : [];
    const validFingerprints = fingerprints.length === GKP_ALL_REVIEW_FIELDS.length
      && fingerprints.every((value) =>
        value === UNINITIALIZED_FINGERPRINT
        || value === NULL_FINGERPRINT
        || /^[A-Za-z0-9_-]{12}$/.test(value)
      );
    if (typeof entry?.gkpListing !== "boolean" || !validFingerprints) {
      return `Invalid GKP review baseline entry: ${id}`;
    }
  }
  return "";
}

export function createGkpObservation(location, fields) {
  return {
    gkpListing: true,
    fields: Object.fromEntries(
      fields.map((field) => [field, normalizeObservedValue(field, location?.[field])])
    )
  };
}

export function changedGkpObservationFields(baselineEntry, observation, fields) {
  if (!baselineEntry) return [];
  const fingerprints = readFingerprints(baselineEntry);
  return fields.filter((field) => {
    const index = fieldIndex(field);
    return fingerprints[index] !== UNINITIALIZED_FINGERPRINT
      && fingerprints[index] !== observedValueHash(observation.fields?.[field]);
  });
}

export function mergeAcceptedGkpObservation(baselineEntry, observation, reviewCandidate) {
  const next = structuredClone(baselineEntry ?? { gkpListing: true, fingerprints: "" });
  if (!reviewCandidate?.fields?.gkpListing) next.gkpListing = observation.gkpListing;
  const fingerprints = readFingerprints(next);

  for (const [field, value] of Object.entries(observation.fields ?? {})) {
    if (!reviewCandidate?.fields?.[field]) fingerprints[fieldIndex(field)] = observedValueHash(value);
  }
  next.fingerprints = fingerprints.join("|");
  return next;
}

export function observationRecord(location, observation) {
  return {
    ...location,
    ...structuredClone(observation.fields)
  };
}

export function acknowledgeGkpReviewCandidates(baseline, candidates, officialIds = new Set()) {
  const next = structuredClone(baseline);

  for (const candidate of candidates) {
    if (officialIds.has(candidate.id)) {
      delete next.locations[candidate.id];
      continue;
    }

    const entry = next.locations[candidate.id] ?? { gkpListing: true, fingerprints: "" };
    const fingerprints = readFingerprints(entry);
    for (const [field, change] of Object.entries(candidate.fields ?? {})) {
      if (field === "gkpListing") entry.gkpListing = change.gkp === true;
      else fingerprints[fieldIndex(field)] = observedValueHash(change.gkp ?? null);
    }
    entry.fingerprints = fingerprints.join("|");
    next.locations[candidate.id] = entry;
  }
  return next;
}

function normalizeObservedValue(field, value) {
  if (field === "distributionPlaces" && Array.isArray(value)) {
    return value.map((place) =>
      Object.fromEntries(
        GKP_DISTRIBUTION_PLACE_FIELDS
          .filter((placeField) => place[placeField] !== undefined)
          .map((placeField) => [placeField, place[placeField]])
      )
    );
  }
  return value ?? null;
}

function observedValueHash(value) {
  if (value === null || value === undefined) return NULL_FINGERPRINT;
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("base64url")
    .slice(0, 12);
}

function readFingerprints(entry) {
  const values = String(entry?.fingerprints ?? "").split("|");
  return GKP_ALL_REVIEW_FIELDS.map(
    (_, index) => values[index] || UNINITIALIZED_FINGERPRINT
  );
}

function fieldIndex(field) {
  const index = GKP_REVIEW_FIELD_INDEX.get(field);
  if (index === undefined) throw new Error(`Unknown GKP review field: ${field}`);
  return index;
}
