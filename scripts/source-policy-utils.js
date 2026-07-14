import {
  normalizeDistributionDate,
  statusForDistributionStart
} from "./distribution-status-utils.js";

export const GKP_SOURCE_TYPE = "gkp_prefecture_page";
export const OFFICIAL_PUBLIC_BODY_SOURCE_TYPE = "official_public_body_page";
export const SUPPORTED_SOURCE_TYPES = Object.freeze([GKP_SOURCE_TYPE, OFFICIAL_PUBLIC_BODY_SOURCE_TYPE]);

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

export function retainUnmatchedOfficialPublicBodyLocations(existingLocations, matchedExistingIds, today) {
  return existingLocations
    .filter((location) => isOfficialPublicBodyLocation(location) && !matchedExistingIds.has(location.id))
    .map((location) => refreshOfficialPublicBodyLocation(location, today));
}

export function refreshOfficialPublicBodyLocation(location, today) {
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
