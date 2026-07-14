import {
  normalizeDistributionDate,
  statusForDistributionStart
} from "./distribution-status-utils.js";
import {
  createGkpReviewCandidate,
  createRestoredGkpReviewCandidate,
  mergeGkpReviewCandidates
} from "./gkp-review-candidate-utils.js";
import {
  GKP_CONTENT_REVIEW_FIELDS,
  changedGkpObservationFields,
  createGkpObservation,
  mergeAcceptedGkpObservation,
  observationRecord
} from "./gkp-review-baseline-utils.js";

export const GKP_SOURCE_TYPE = "gkp_prefecture_page";
export const OFFICIAL_PUBLIC_BODY_SOURCE_TYPE = "official_public_body_page";
export const SUPPORTED_SOURCE_TYPES = Object.freeze([GKP_SOURCE_TYPE, OFFICIAL_PUBLIC_BODY_SOURCE_TYPE]);

const GKP_CATALOGUE_FIELDS = Object.freeze([
  "imageUrl",
  "series",
  "issuedOn"
]);

export function isOfficialPublicBodyLocation(location) {
  return location?.sourceType === OFFICIAL_PUBLIC_BODY_SOURCE_TYPE;
}

export function shouldApplyGkpSourceNormalization(location) {
  return !isOfficialPublicBodyLocation(location);
}

export function sourcePolicyError(location) {
  if (!SUPPORTED_SOURCE_TYPES.includes(location?.sourceType)) return `unknown sourceType ${location?.sourceType}`;
  if (isOfficialPublicBodyLocation(location) && isGkpUrl(location.sourceUrl)) {
    return "official_public_body_page sourceUrl must be the reviewed government source, not GKP";
  }
  return "";
}

export function reconcileOfficialPublicBodyLocation(existing, imported, today) {
  const next = structuredClone(existing);
  let changed = false;

  if (imported?.id && imported.id !== next.id) {
    throw new Error(
      `Official-first identity conflict: reviewed ${next.id} matched GKP ${imported.id}; verify the printed card code manually`
    );
  }

  for (const field of ["imageUrl", "series", "issuedOn"]) {
    if (!hasValue(next[field]) && hasValue(imported?.[field])) {
      next[field] = imported[field];
      changed = true;
    }
  }

  const refreshed = refreshOfficialPublicBodyLocation(next, today);
  if (refreshed.status !== next.status || refreshed.stock !== next.stock) changed = true;
  if (changed && normalizeDistributionDate(today)) refreshed.updatedAt = normalizeDistributionDate(today);
  return refreshed;
}

export function reconcileReviewedGkpLocation(existing, imported, today, baselineEntry) {
  const refreshedExisting = refreshReviewedLocation(existing, today);
  const observation = createGkpObservation(imported, GKP_CONTENT_REVIEW_FIELDS);
  const reviewFields = changedGkpObservationFields(
    baselineEntry,
    observation,
    GKP_CONTENT_REVIEW_FIELDS
  );
  const contentReviewCandidate = createGkpReviewCandidate(
    observationRecord(refreshedExisting, createGkpObservation(refreshedExisting, reviewFields)),
    observationRecord(imported, observation),
    reviewFields
  );
  const listingReviewCandidate = baselineEntry?.gkpListing === false
    ? createRestoredGkpReviewCandidate(refreshedExisting, imported)
    : null;
  const reviewCandidate = mergeGkpReviewCandidates(
    [contentReviewCandidate, listingReviewCandidate].filter(Boolean)
  )[0] ?? null;
  const next = structuredClone(refreshedExisting);

  next.id = imported.id;
  for (const field of GKP_CATALOGUE_FIELDS) {
    if (hasValue(imported?.[field])) next[field] = imported[field];
  }

  if (!sameRecord(existing, next)) next.updatedAt = normalizeDistributionDate(today) || existing.updatedAt;
  return {
    location: next,
    reviewCandidate,
    baselineEntry: mergeAcceptedGkpObservation(baselineEntry, observation, reviewCandidate)
  };
}

export function retainUnmatchedOfficialPublicBodyLocations(existingLocations, matchedExistingIds, today) {
  return existingLocations
    .filter((location) => isOfficialPublicBodyLocation(location) && !matchedExistingIds.has(location.id))
    .map((location) => refreshOfficialPublicBodyLocation(location, today));
}

export function retainUnmatchedReviewedLocations(existingLocations, matchedExistingIds, today) {
  return existingLocations
    .filter((location) => !matchedExistingIds.has(location.id))
    .map((location) => refreshReviewedLocation(location, today));
}

export function refreshOfficialPublicBodyLocation(location, today) {
  return refreshReviewedLocation(location, today);
}

export function refreshReviewedLocation(location, today) {
  const next = structuredClone(location);
  const normalizedToday = normalizeDistributionDate(today);
  const startsOn = normalizeDistributionDate(next.distributionStartsOn);
  if (!normalizedToday || !startsOn || !["配布開始前", "配布中"].includes(next.status)) return next;

  const status = statusForDistributionStart({ startsOn, today: normalizedToday });
  if (status === next.status) return next;

  next.status = status;
  if (status === "配布中" && next.stock === "配布開始前") next.stock = "公式情報を確認";
  next.updatedAt = normalizedToday;
  return next;
}

export function isGkpUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "gk-p.jp" || hostname.endsWith(".gk-p.jp");
  } catch {
    return false;
  }
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function sameRecord(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
