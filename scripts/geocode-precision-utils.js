import { createHash } from "node:crypto";

const targetCollections = ["distributionPlaces", "englishVersionDistributionPlaces"];

export function collectGeocodeTargets(locations) {
  const targets = [];

  for (const location of locations) {
    if (!location.__skipTopLevelGeocodeTarget) {
      targets.push(geocodeTarget(location, location, "location"));
    }
    for (const kind of targetCollections) {
      for (const target of location[kind] ?? []) {
        targets.push(geocodeTarget(location, target, kind));
      }
    }
  }

  return targets;
}

export function collectGeocodeReviewIssues(locations, options = {}) {
  const candidates = [];

  for (const candidate of collectGeocodeTargets(locations)) {
    const objectiveReasons = objectiveGeocodeReasons(candidate);
    if (objectiveReasons.length === 0) continue;

    const severity = objectiveReasons.some((reason) => reason.severity === "high")
      ? "high"
      : "medium";

    candidates.push({
      ...candidate,
      reviewed: isManuallyReviewedGeocodeTitle(candidate.geocodeTitle),
      severity,
      score: objectiveReasons.reduce((total, reason) => total + reason.score, 0),
      reasons: objectiveReasons.map((reason) => reason.label),
      riskReasons: objectiveReasons.map((reason) => reason.label),
      ...(options.includeUrls ? { urls: candidate.urls } : {})
    });
  }

  return candidates.sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      b.score - a.score ||
      a.id.localeCompare(b.id) ||
      a.kind.localeCompare(b.kind)
  );
}

export function collectGeocodePrecisionCandidates(locations, options = {}) {
  const candidates = [];

  for (const location of locations) {
    if (!location.__skipTopLevelGeocodeTarget) {
      inspectTarget(candidates, location, location, "location", options);
    }

    for (const place of location.distributionPlaces ?? []) {
      inspectTarget(candidates, location, place, "distributionPlaces", options);
    }

    for (const place of location.englishVersionDistributionPlaces ?? []) {
      inspectTarget(candidates, location, place, "englishVersionDistributionPlaces", options);
    }
  }

  return candidates.sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      b.score - a.score ||
      a.id.localeCompare(b.id) ||
      a.kind.localeCompare(b.kind)
  );
}

export function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .trim();
}

export function normalizeSearchQuery(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

export function severityRank(severity) {
  if (severity === "high") return 0;
  if (severity === "medium") return 1;
  return 2;
}

export const prefectureBounds = {
  北海道: { minLat: 41.3, maxLat: 45.7, minLng: 139.2, maxLng: 146.0 },
  青森県: { minLat: 40.1, maxLat: 41.7, minLng: 139.4, maxLng: 141.7 },
  岩手県: { minLat: 38.7, maxLat: 40.5, minLng: 140.6, maxLng: 142.1 },
  宮城県: { minLat: 37.7, maxLat: 39.1, minLng: 140.2, maxLng: 141.8 },
  秋田県: { minLat: 38.8, maxLat: 40.6, minLng: 139.6, maxLng: 141.2 },
  山形県: { minLat: 37.7, maxLat: 39.3, minLng: 139.5, maxLng: 140.7 },
  福島県: { minLat: 36.7, maxLat: 38.0, minLng: 139.1, maxLng: 141.1 },
  茨城県: { minLat: 35.7, maxLat: 36.95, minLng: 139.65, maxLng: 140.9 },
  栃木県: { minLat: 36.15, maxLat: 37.2, minLng: 139.3, maxLng: 140.35 },
  群馬県: { minLat: 35.9, maxLat: 37.1, minLng: 138.4, maxLng: 139.7 },
  埼玉県: { minLat: 35.7, maxLat: 36.3, minLng: 138.7, maxLng: 139.9 },
  千葉県: { minLat: 34.85, maxLat: 36.15, minLng: 139.7, maxLng: 141.0 },
  東京都: { minLat: 24.0, maxLat: 36.0, minLng: 138.8, maxLng: 154.1 },
  神奈川県: { minLat: 35.1, maxLat: 35.75, minLng: 138.85, maxLng: 139.85 },
  新潟県: { minLat: 36.7, maxLat: 38.6, minLng: 137.6, maxLng: 139.9 },
  富山県: { minLat: 36.25, maxLat: 37.0, minLng: 136.75, maxLng: 137.8 },
  石川県: { minLat: 36.0, maxLat: 37.9, minLng: 136.1, maxLng: 137.5 },
  福井県: { minLat: 35.3, maxLat: 36.35, minLng: 135.4, maxLng: 136.85 },
  山梨県: { minLat: 35.1, maxLat: 36.05, minLng: 138.15, maxLng: 139.25 },
  長野県: { minLat: 35.1, maxLat: 37.1, minLng: 137.3, maxLng: 139.0 },
  岐阜県: { minLat: 35.1, maxLat: 36.5, minLng: 136.25, maxLng: 137.7 },
  静岡県: { minLat: 34.55, maxLat: 35.65, minLng: 137.45, maxLng: 139.2 },
  愛知県: { minLat: 34.5, maxLat: 35.5, minLng: 136.6, maxLng: 137.9 },
  三重県: { minLat: 33.65, maxLat: 35.3, minLng: 135.8, maxLng: 136.95 },
  滋賀県: { minLat: 34.7, maxLat: 35.8, minLng: 135.7, maxLng: 136.5 },
  京都府: { minLat: 34.7, maxLat: 35.8, minLng: 134.8, maxLng: 136.1 },
  大阪府: { minLat: 34.25, maxLat: 35.05, minLng: 135.05, maxLng: 135.8 },
  兵庫県: { minLat: 34.1, maxLat: 35.8, minLng: 134.2, maxLng: 135.6 },
  奈良県: { minLat: 33.8, maxLat: 34.8, minLng: 135.5, maxLng: 136.3 },
  和歌山県: { minLat: 33.4, maxLat: 34.4, minLng: 134.95, maxLng: 136.05 },
  鳥取県: { minLat: 35.0, maxLat: 35.7, minLng: 133.1, maxLng: 134.6 },
  島根県: { minLat: 34.2, maxLat: 37.3, minLng: 131.6, maxLng: 133.4 },
  岡山県: { minLat: 34.2, maxLat: 35.4, minLng: 133.2, maxLng: 134.4 },
  広島県: { minLat: 34.0, maxLat: 35.1, minLng: 132.0, maxLng: 133.5 },
  山口県: { minLat: 33.7, maxLat: 34.8, minLng: 130.7, maxLng: 132.5 },
  徳島県: { minLat: 33.5, maxLat: 34.3, minLng: 133.6, maxLng: 134.9 },
  香川県: { minLat: 34.0, maxLat: 34.65, minLng: 133.4, maxLng: 134.5 },
  愛媛県: { minLat: 32.85, maxLat: 34.35, minLng: 132.0, maxLng: 133.7 },
  高知県: { minLat: 32.65, maxLat: 34.05, minLng: 132.45, maxLng: 134.35 },
  福岡県: { minLat: 33.0, maxLat: 34.3, minLng: 129.9, maxLng: 131.2 },
  佐賀県: { minLat: 32.9, maxLat: 33.7, minLng: 129.7, maxLng: 130.6 },
  長崎県: { minLat: 31.9, maxLat: 34.8, minLng: 128.0, maxLng: 130.4 },
  熊本県: { minLat: 32.0, maxLat: 33.35, minLng: 129.9, maxLng: 131.35 },
  大分県: { minLat: 32.7, maxLat: 33.85, minLng: 130.8, maxLng: 132.2 },
  宮崎県: { minLat: 31.3, maxLat: 32.9, minLng: 130.65, maxLng: 132.0 },
  鹿児島県: { minLat: 27.0, maxLat: 32.4, minLng: 128.3, maxLng: 131.3 },
  沖縄県: { minLat: 24.0, maxLat: 27.9, minLng: 122.8, maxLng: 131.4 }
};

export function isManuallyReviewedGeocodeTitle(value) {
  return /手動補正/.test(String(value ?? ""));
}

export function isCoordinateWithinPrefecture(prefecture, lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return true;
  const bounds = prefectureBounds[prefecture];
  if (!bounds) return true;
  return latitude >= bounds.minLat && latitude <= bounds.maxLat && longitude >= bounds.minLng && longitude <= bounds.maxLng;
}

export function prefectureMention(value) {
  const text = String(value ?? "");
  return Object.keys(prefectureBounds).find((prefecture) => text.includes(prefecture)) ?? "";
}

const knownInvalidAddressPatterns = [
  [/^住所\s*[:：]/, "address starts with an address label"],
  [/^所在地\s*[:：]/, "address starts with a location label"],
  [/^(?:平日|休日|土日祝?|祝日)\s*[:：]/, "address starts with a schedule label"],
  [/沖和県/, "address contains the known typo 沖和県"],
  [/山山梨県/, "address contains the duplicated prefecture typo 山山梨県"],
  [/⻑野県/, "address contains a compatibility-form prefecture name"],
  [/神奈川県川崎区/, "address is missing 川崎市 before 川崎区"],
  [/愛知県音羽町/, "address is missing 碧南市 before 音羽町"],
  [/太秦安井一町目町/, "address contains the known typo 太秦安井一町目町"],
  [/四條綴市/, "address contains the known typo 四條綴市"]
];

export function addressInputIssues(value) {
  const text = String(value ?? "").trim();
  if (!text) return [];
  return knownInvalidAddressPatterns
    .filter(([pattern]) => pattern.test(text))
    .map(([, message]) => message);
}

export function distanceMeters(before, after) {
  const aLat = Number(before?.lat);
  const aLng = Number(before?.lng);
  const bLat = Number(after?.lat);
  const bLng = Number(after?.lng);
  if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return Number.NaN;

  const earthRadius = 6371000;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function googleMapsCoordinateUrl(value) {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function geocodeSnapshotHash(target) {
  const snapshot = {
    id: target?.id ?? "",
    name: target?.place ?? target?.name ?? "",
    address: target?.address ?? "",
    lat: target?.lat ?? null,
    lng: target?.lng ?? null,
    geocodeQuery: target?.geocodeQuery ?? "",
    geocodeTitle: target?.geocodeTitle ?? "",
    coordinateAccuracy: target?.coordinateAccuracy ?? "",
    geocodeError: target?.geocodeError ?? ""
  };
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function inspectTarget(candidates, location, target, kind, options) {
  const geocodeQuery = normalize(target.geocodeQuery);
  const geocodeTitle = normalize(target.geocodeTitle);
  if (!geocodeQuery || !geocodeTitle) return;
  const reasons = [];
  const coordinatePrefecture = prefectureMention(target.address) || prefectureMention(geocodeQuery) || location.prefecture;
  if (!isCoordinateWithinPrefecture(coordinatePrefecture, target.lat, target.lng)) {
    reasons.push({ severity: "high", score: 10, label: "coordinate is outside prefecture bounds" });
  }
  if (!isManuallyReviewedGeocodeTitle(geocodeTitle) && !isAddressFormatOnlyShortening(geocodeQuery, geocodeTitle)) {
    reasons.push(...precisionLossReasons(geocodeQuery, geocodeTitle));
  }
  if (reasons.length === 0) return;

  const score = reasons.reduce((total, reason) => total + reason.score, 0);
  const candidate = {
    id: location.id,
    cardName: location.cardName,
    prefecture: location.prefecture,
    coordinatePrefecture,
    municipality: location.municipality,
    kind,
    targetId: target.id || (kind === "location" ? location.id : ""),
    place: target.place || target.name || location.place || "",
    address: target.address || "",
    lat: target.lat,
    lng: target.lng,
    coordinateAccuracy: target.coordinateAccuracy,
    geocodeError: target.geocodeError,
    geocodeQuery,
    geocodeTitle,
    severity: reasons.some((reason) => reason.severity === "high") ? "high" : "medium",
    score,
    reasons: reasons.map((reason) => reason.label)
  };

  if (options.includeUrls) {
    candidate.urls = officialUrls(location, target);
  }

  candidates.push(candidate);
}

function geocodeTarget(location, target, kind) {
  return {
    id: location.id,
    cardName: location.cardName,
    prefecture: location.prefecture,
    coordinatePrefecture:
      prefectureMention(target.address) || prefectureMention(target.geocodeQuery) || location.prefecture,
    municipality: location.municipality,
    kind,
    targetId: target.id || (kind === "location" ? location.id : ""),
    place: target.place || target.name || location.place || "",
    address: target.address || "",
    lat: target.lat,
    lng: target.lng,
    coordinateAccuracy: target.coordinateAccuracy,
    geocodeError: target.geocodeError,
    geocodeQuery: target.geocodeQuery || "",
    geocodeTitle: target.geocodeTitle || "",
    status: target.status || location.status || "",
    urls: officialUrls(location, target)
  };
}

function objectiveGeocodeReasons(candidate) {
  const reasons = [];
  if (!Number.isFinite(Number(candidate.lat)) || !Number.isFinite(Number(candidate.lng))) {
    reasons.push({ severity: "high", score: 10, label: "coordinate is missing or invalid" });
  } else if (!isCoordinateWithinPrefecture(candidate.coordinatePrefecture, candidate.lat, candidate.lng)) {
    reasons.push({ severity: "high", score: 10, label: "coordinate is outside prefecture bounds" });
  }
  if (candidate.geocodeError) {
    reasons.push({ severity: "high", score: 8, label: `geocoder error: ${candidate.geocodeError}` });
  }
  if (!isSuspendedWithoutDistributionLocation(candidate)) {
    if (!normalize(candidate.geocodeQuery)) {
      reasons.push({ severity: "medium", score: 3, label: "geocodeQuery is missing" });
    }
    if (!normalize(candidate.geocodeTitle)) {
      reasons.push({ severity: "medium", score: 3, label: "geocodeTitle is missing" });
    }
  }
  const inputIssues = new Set([
    ...addressInputIssues(candidate.address),
    ...addressInputIssues(candidate.geocodeQuery)
  ]);
  for (const issue of inputIssues) {
    reasons.push({ severity: "medium", score: 4, label: `address input issue: ${issue}` });
  }
  return reasons;
}

export function isSuspendedWithoutDistributionLocation(target) {
  if (target?.status !== "休止中" || normalize(target?.address)) return false;
  const place = normalize(target?.place ?? target?.name);
  return !place || /配布.*(?:中止|休止)|(?:中止|休止).*配布/.test(place);
}

export function precisionLossReasons(query, title) {
  const reasons = [];
  const queryNumbers = numberTokens(query);
  const titleNumbers = numberTokens(title);
  const detailNumberLoss = queryNumbers.length - titleNumbers.length;

  if (queryNumbers.length > 0 && titleNumbers.length === 0 && hasAddressDetail(query)) {
    reasons.push({ severity: "high", score: 5, label: "address numbers disappeared" });
  } else if (detailNumberLoss >= 2) {
    reasons.push({ severity: "medium", score: 2, label: "address number precision decreased" });
  }

  if (hasAzaPrecisionLoss(query, title)) {
    reasons.push({
      severity: titleNumbers.length === 0 ? "high" : "medium",
      score: titleNumbers.length === 0 ? 4 : 2,
      label: "aza/oaza precision disappeared"
    });
  }

  if (hasBlockPrecisionLoss(query, title)) {
    reasons.push({
      severity: titleNumbers.length === 0 ? "high" : "medium",
      score: titleNumbers.length === 0 ? 3 : 1,
      label: "block precision disappeared"
    });
  }

  return reasons;
}

export function officialUrls(location, target) {
  return [
    target.facilityUrl,
    target.stockUrl,
    target.conditionUrl,
    location.facilityUrl,
    location.stockUrl,
    location.conditionUrl,
    location.sourceUrl
  ]
    .filter((url) => /^https?:\/\//.test(String(url ?? "")))
    .filter((url) => !isGkpUrl(url))
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

function isGkpUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "gk-p.jp" || hostname.endsWith(".gk-p.jp");
  } catch {
    return false;
  }
}

function hasAddressDetail(value) {
  return /(?:\d|丁目|番|号|地割|線|字|大字|-)/.test(value);
}

function hasAzaPrecisionLoss(query, title) {
  if (!/(?:大字|字)/.test(query)) return false;
  if (/(?:大字|字)/.test(title)) return false;
  if (numberTokens(title).length > 0 && /(?:番|号|丁目|地割|線)/.test(title)) return false;
  return true;
}

function hasBlockPrecisionLoss(query, title) {
  if (!/(?:地割|線)/.test(query)) return false;
  return !/(?:地割|線)/.test(title);
}

export function isAddressFormatOnlyShortening(query, title) {
  const normalizedQuery = stripPrefecture(canonicalAddressFormat(query));
  const normalizedTitle = stripPrefecture(canonicalAddressFormat(title));
  if (!normalizedQuery || !normalizedTitle) return false;
  if (normalizedQuery === normalizedTitle) return true;
  return normalizedQuery.startsWith(normalizedTitle) && normalizedTitle.length < normalizedQuery.length;
}

function canonicalAddressFormat(value) {
  return normalize(value)
    .replace(/[‐‑‒–—―ー−]/g, "-")
    .replace(/[^市区町村郡]+郡(?=[^市区町村郡]+[町村])/g, "")
    .replace(/大字/g, "")
    .replace(/字(?=[^\d-])/g, "")
    .replace(/([一二三四五六七八九十百]+)(丁目|番地|番|号|条|線|部|階)/g, (_match, number, unit) => `${kanjiNumber(number)}${unit}`)
    .replace(/([0-9]+)丁目/g, "$1-")
    .replace(/([0-9]+)番地の/g, "$1-")
    .replace(/([0-9]+)番地/g, "$1")
    .replace(/([0-9]+)番/g, "$1")
    .replace(/([0-9]+)号/g, "$1")
    .replace(/--+/g, "-")
    .replace(/-$/g, "")
    .replace(/[()（）]/g, "")
    .toLowerCase();
}

function stripPrefecture(value) {
  return value.replace(/^(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/, "");
}

function kanjiNumber(text) {
  const digits = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if ([...text].every((character) => Object.hasOwn(digits, character))) {
    return Number([...text].map((character) => digits[character]).join(""));
  }

  let total = 0;
  let current = 0;
  const units = { 十: 10, 百: 100 };
  for (const character of text) {
    if (Object.hasOwn(digits, character)) {
      current = digits[character];
    } else if (Object.hasOwn(units, character)) {
      total += (current || 1) * units[character];
      current = 0;
    }
  }
  return total + current;
}

function numberTokens(value) {
  return normalize(value).match(/\d+/g) ?? [];
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
