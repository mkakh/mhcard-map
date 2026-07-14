import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  addressInputIssues,
  collectGeocodePrecisionCandidates,
  collectGeocodeReviewIssues,
  distanceMeters,
  googleMapsCoordinateUrl,
  isManuallyReviewedGeocodeTitle
} from "./geocode-precision-utils.js";
import { collectGeocodeReviewEntries, filterChangedLocations } from "./location-change-utils.js";

const dataPath = join(process.cwd(), "data", "locations.json");
const outputPath = join(process.cwd(), ".tmp", "location-update-summary.md");
const reviewCommentsPath = join(process.cwd(), ".tmp", "location-update-review-comments.json");
const appliedGeocodeReviewPath = join(process.cwd(), ".tmp", "geocode-applied-review.json");
const dateOnlyFields = new Set(["updatedAt", "geocodedAt"]);
const placeDateOnlyFields = new Set(["geocodedAt"]);
const geocodeDetailFields = new Set([
  "address",
  "lat",
  "lng",
  "coordinateAccuracy",
  "geocodeQuery",
  "geocodeTitle",
  "geocodeError",
  "geocodedAt",
  "plusCode"
]);
const maxRows = 30;
const maxValueLength = 160;

const before = await readBaseLocations();
const after = JSON.parse(await readFile(dataPath, "utf8"));
const appliedGeocodeReviews = await readOptionalJson(appliedGeocodeReviewPath, []);
const beforeById = new Map(before.map((location) => [location.id, location]));
const afterById = new Map(after.map((location) => [location.id, location]));

const added = after.filter((location) => !beforeById.has(location.id));
const removed = before.filter((location) => !afterById.has(location.id));
const changed = [];
const fieldCounts = new Map();

for (const location of after) {
  const previous = beforeById.get(location.id);
  if (!previous) continue;

  const changedFields = [...new Set([...Object.keys(previous), ...Object.keys(location)])].filter(
    (field) => JSON.stringify(previous[field]) !== JSON.stringify(location[field])
  );

  if (changedFields.length === 0) continue;
  changedFields.forEach((field) => fieldCounts.set(field, (fieldCounts.get(field) ?? 0) + 1));
  changed.push({
    id: location.id,
    cardName: location.cardName,
    prefecture: location.prefecture,
    municipality: location.municipality,
    fields: changedFields,
    meaningfulFields: changedFields.filter((field) => isMeaningfulFieldChange(previous, location, field)),
    before: previous,
    after: location
  });
}

const meaningfulChanged = changed.filter((location) => location.meaningfulFields.length > 0);
const changedGeocodeAuditLocations = filterChangedLocations(after);
const geocodePrecisionCandidates = collectGeocodePrecisionCandidates(changedGeocodeAuditLocations);
const geocodeReviewChanges = collectGeocodeReviewEntries(before, after);
const geocodeReviewIssues = collectGeocodeReviewIssues(after);
const lines = [
  "Automated location data update.",
  "",
  "Review generated changes before merging.",
  "",
  "## Summary",
  "",
  `- Records: ${before.length} -> ${after.length}`,
  `- Added: ${added.length}`,
  `- Removed: ${removed.length}`,
  `- Changed records: ${changed.length}`,
  `- Content changes excluding update timestamps: ${meaningfulChanged.length}`,
  "",
  "## Changed Fields",
  "",
  ...fieldCountLines(),
  "",
  "## Manual Codex Review",
  "",
  ...manualCodexReviewLines(),
  "",
  "## Review Warnings",
  "",
  ...reviewWarningLines(),
  "",
  "## Changed Geocode Precision Audit",
  "",
  ...changedGeocodePrecisionAuditLines(),
  "",
  "## Objective Geocode Review Issues",
  "",
  ...objectiveGeocodeIssueLines(false),
  "",
  "## Changed Geocode Review Details",
  "",
  ...changedGeocodeReviewDetailLines(false),
  "",
  "## Added",
  "",
  ...locationListLines(added),
  "",
  "## Removed",
  "",
  ...locationListLines(removed),
  "",
  "## Content Changes",
  "",
  ...contentChangeLines()
];

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
const reviewComments = reviewCommentBodies([
  ["Objective Geocode Review Issues", objectiveGeocodeIssueLines(true)],
  ["Changed Geocode Review Details", changedGeocodeReviewDetailLines(true)],
  ["Applied Geocode Review Evidence", appliedGeocodeReviewEvidenceLines()]
]);
await writeFile(reviewCommentsPath, `${JSON.stringify(reviewComments, null, 2)}\n`, "utf8");
console.log(`Wrote update summary to ${outputPath}`);
console.log(`Wrote ${reviewComments.length} review comment chunk(s) to ${reviewCommentsPath}`);

async function readBaseLocations() {
  const baseRef = process.env.GEOCODE_CHANGED_BASE || "HEAD";
  const result = spawnSync("git", ["show", `${baseRef}:data/locations.json`], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024
  });
  const content = result.stdout;
  if (!content) {
    throw new Error(`Failed to read ${baseRef}:data/locations.json`);
  }
  return JSON.parse(content);
}

async function readOptionalJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function fieldCountLines() {
  const entries = [...fieldCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (entries.length === 0) return ["No field-level changes detected."];
  return entries.map(([field, count]) => `- ${field}: ${count}`);
}

function manualCodexReviewLines() {
  const gkpOnly = after.filter((location) => isGkpOnlyLocation(location));
  const missingOfficialDesignNames = after.filter((location) => !hasOfficialDesignNames(location));
  const changedSourceFields = meaningfulChanged.filter((location) =>
    location.meaningfulFields.some((field) =>
      ["sourceUrl", "facilityUrl", "stockUrl", "conditionUrl", "officialDesignNames", "hasEnglishVersion", "englishVersionStatus", "englishVersionNote", "englishVersionUrl", "englishVersionDistributionPlaces"].includes(field)
    )
  );

  const lines = [
    "- Codex/AI search is not run by this workflow.",
    "- If the counts below look suspicious, run `$manhole-card-official-audit` manually and treat search results as candidates only.",
    `- GKP-only source records: ${gkpOnly.length}`,
    `- Records without officialDesignNames: ${missingOfficialDesignNames.length}`,
    `- Source/English/official-name records changed in this PR: ${changedSourceFields.length}`
  ];

  if (gkpOnly.length > 0) {
    lines.push("", "Top GKP-only records:");
    lines.push(...gkpOnly.slice(0, 10).map((location) => `- ${locationLabel(location)}`));
    if (gkpOnly.length > 10) lines.push(`- Additional GKP-only records omitted: ${gkpOnly.length - 10}`);
  }

  return lines;
}

function changedGeocodePrecisionAuditLines() {
  const lines = [
    `- Changed/added records inspected: ${changedGeocodeAuditLocations.length}`,
    `- Legacy heuristic candidates: ${geocodePrecisionCandidates.length}`,
    "- This heuristic is informational only; it never excludes, approves, or prioritizes a target."
  ];

  if (geocodePrecisionCandidates.length === 0) {
    lines.push("- No changed/added records triggered the legacy address-shortening heuristic.");
    return lines;
  }

  lines.push("", "Review these changed/added records before merging:");
  lines.push(
    ...geocodePrecisionCandidates.map((candidate) =>
      `- ${candidate.severity} ${candidate.id} ${candidate.cardName} ${candidate.kind}/${candidate.targetId}: ${candidate.reasons.join("; ")} (${formatValue(candidate.geocodeQuery)} -> ${formatValue(candidate.geocodeTitle)})`
    )
  );

  return lines;
}

function objectiveGeocodeIssueLines(includeDetails = true) {
  const lines = [
    `- Current objective issues: ${geocodeReviewIssues.length}`,
    "- Ordinary geocoder results are not treated as issues merely because they lack independent manual review.",
    "- Changed and newly added geocode targets are shown separately in this PR.",
    "- Suspended cards without a published distribution location are exempt until their distribution data changes.",
    "- This section requests review only. No search or external geocoder result is applied automatically."
  ];

  if (geocodeReviewIssues.length === 0) {
    lines.push("- No objective geocode review issues detected.");
    return lines;
  }

  if (!includeDetails) {
    lines.push("- Full target rows are synchronized to PR review-detail comments.");
    return lines;
  }

  lines.push(
    "",
    "| severity | target | place / address | coordinates | map | reason |",
    "| --- | --- | --- | --- | --- | --- |",
    ...geocodeReviewIssues.map((candidate) => [
      candidate.severity,
      `${candidate.id} ${candidate.kind}/${candidate.targetId}`,
      `${candidate.place} / ${candidate.address}`,
      coordinateValue(candidate),
      mapLink(candidate, "map"),
      candidate.reasons.join("; ")
    ].map(markdownCell).join(" | ").replace(/^/, "| ").replace(/$/, " |"))
  );
  return lines;
}

function changedGeocodeReviewDetailLines(includeDetails = true) {
  const entries = geocodeReviewChanges;
  if (entries.length === 0) return ["No geocode review triggers detected."];

  const summary = [
    `- Changed/new geocode review targets: ${entries.length}`,
    "- Address text is shown once when unchanged and as before -> after when changed."
  ];
  if (!includeDetails) {
    summary.push("- Full before/after rows are synchronized to PR review-detail comments.");
    return summary;
  }

  return [
    ...summary,
    "",
    "| target | review trigger | address before -> after | coordinates before -> after | movement | maps | official sources | review |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...entries.map((entry) => [
      geocodeEntryLabel(entry),
      geocodeReviewTrigger(entry),
      beforeAfterValue(entry.before?.address, entry.after?.address),
      `${coordinateValue(entry.before)} -> ${coordinateValue(entry.after)}`,
      movementValue(entry.before, entry.after),
      `${mapLink(entry.before, "before")} / ${mapLink(entry.after, "after")}`,
      sourceLinkList(entrySourceUrls(entry)),
      `${geocodeReviewSource(entry.after?.geocodeTitle ?? entry.before?.geocodeTitle)} ${formatValue(entry.after?.geocodedAt ?? entry.after?.updatedAt ?? entry.locationAfter?.updatedAt)}`
    ].map(markdownCell).join(" | ").replace(/^/, "| ").replace(/$/, " |"))
  ];
}

function geocodeReviewTrigger(entry) {
  const fields = [
    "status", "place", "name", "address", "lat", "lng", "geocodeQuery",
    "geocodeTitle", "coordinateAccuracy", "geocodeError"
  ].filter((field) => JSON.stringify(entry.before?.[field]) !== JSON.stringify(entry.after?.[field]));

  return fields.map((field) => {
    if (["status", "place", "name"].includes(field)) {
      return `${field}: ${beforeAfterValue(entry.before?.[field], entry.after?.[field])}`;
    }
    return field;
  }).join("; ");
}

function appliedGeocodeReviewEvidenceLines() {
  if (!Array.isArray(appliedGeocodeReviews) || appliedGeocodeReviews.length === 0) {
    return ["No newly applied manual geocode decisions were recorded."];
  }

  return [
    `- Explicitly reviewed and applied targets: ${appliedGeocodeReviews.length}`,
    "- A row is applied only when the official page, coordinate source, evidence, review date, and notes are explicit.",
    "",
    "| target | place / address | official source | coordinate evidence | reviewed | notes |",
    "| --- | --- | --- | --- | --- | --- |",
    ...appliedGeocodeReviews.map((entry) => [
      `${entry.id} ${entry.target}/${entry.targetId || entry.id}`,
      `${currentReviewTarget(entry)?.place || currentReviewTarget(entry)?.name || entry.place || entry.cardName || ""} / ${currentReviewTarget(entry)?.address || entry.address || ""}`,
      sourceLink(entry.reviewedOfficialUrl, "official"),
      `${entry.source || ""}: ${entry.reviewedCoordinateEvidence || ""}`,
      entry.reviewedAt || "",
      entry.reviewNotes || ""
    ].map(markdownCell).join(" | ").replace(/^/, "| ").replace(/$/, " |"))
  ];
}

function currentReviewTarget(entry) {
  const location = afterById.get(entry.id);
  if (!location) return null;
  if (entry.target === "location") return location;
  if (!Array.isArray(location[entry.target])) return null;
  return location[entry.target].find((target) => target.id === entry.targetId) ?? null;
}

function reviewCommentBodies(sections, maxBytes = 55000) {
  const chunks = [];
  let current = [];
  let currentBytes = 0;

  for (const [title, sectionLines] of sections) {
    const lines = [`## ${title}`, "", ...sectionLines, ""];
    for (const line of lines) {
      const lineBytes = Buffer.byteLength(`${line}\n`, "utf8");
      if (current.length > 0 && currentBytes + lineBytes > maxBytes) {
        chunks.push(current.join("\n"));
        current = [];
        currentBytes = 0;
      }
      current.push(line);
      currentBytes += lineBytes;
    }
  }
  if (current.length > 0) chunks.push(current.join("\n"));

  return chunks.map((body, index) =>
    `<!-- location-review-detail:${index + 1}/${chunks.length} -->\n${body}`
  );
}

function beforeAfterValue(beforeValue, afterValue) {
  const beforeText = formatValue(beforeValue);
  const afterText = formatValue(afterValue);
  return beforeText === afterText ? afterText : `${beforeText} -> ${afterText}`;
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function geocodeReviewSource(value) {
  const title = String(value ?? "");
  if (/手動補正/.test(title)) return "manual review";
  if (/公式アクセス地図|公式地図/.test(title)) return "official embedded-map review candidate";
  if (/Nominatim確認/.test(title)) return "Nominatim review candidate";
  return "geocoder result";
}

function coordinateValue(value) {
  if (!Number.isFinite(Number(value?.lat)) || !Number.isFinite(Number(value?.lng))) return "(missing)";
  return `${value.lat}, ${value.lng}`;
}

function movementValue(beforeValue, afterValue) {
  const meters = distanceMeters(beforeValue, afterValue);
  if (!Number.isFinite(meters)) return "(not comparable)";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function mapLink(value, label) {
  const url = googleMapsCoordinateUrl(value);
  return url ? `[${label}](${url})` : "(missing)";
}

function geocodeEntryLabel(entry) {
  const location = entry.locationAfter ?? entry.locationBefore;
  const locationText = locationLabel(location);
  if (entry.target === "location") return locationText;
  return `${locationText} / ${entry.target}/${entry.targetId} ${entry.place}`.trim();
}

function entrySourceUrls(entry) {
  const location = entry.locationAfter ?? entry.locationBefore ?? {};
  const target = entry.after ?? entry.before ?? {};
  return sourceUrls(location, target);
}

function sourceUrls(location, place = {}) {
  return [
    place.facilityUrl,
    place.stockUrl,
    place.conditionUrl,
    location.facilityUrl,
    location.stockUrl,
    location.conditionUrl,
    location.sourceUrl
  ]
    .filter((url) => /^https?:\/\//.test(String(url ?? "")))
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

function sourceLinkList(urls) {
  if (urls.length === 0) return "(missing)";
  return urls.map((url, index) => sourceLink(url, `source ${index + 1}`)).join(" / ");
}

function sourceLink(url, label) {
  return /^https?:\/\//.test(String(url ?? "")) ? `[${label}](${url})` : "(missing)";
}

function reviewWarningLines() {
  const warnings = [];

  for (const entry of geocodeReviewChanges) {
    const title = String(entry.after?.geocodeTitle ?? "");
    for (const [field, value] of [["address", entry.after?.address], ["geocodeQuery", entry.after?.geocodeQuery]]) {
      for (const issue of addressInputIssues(value)) {
        warnings.push(`- ${geocodeEntryLabel(entry)}: ${field} ${issue}.`);
      }
    }
    if (/Nominatim確認/.test(title)) {
      warnings.push(`- ${geocodeEntryLabel(entry)}: Nominatim is a reference candidate, not official proof. Verify the coordinate against an official card-level source.`);
    } else if (/(?:公式アクセス地図|公式地図)/.test(title) && !isManuallyReviewedGeocodeTitle(title)) {
      warnings.push(`- ${geocodeEntryLabel(entry)}: an embedded map coordinate still needs card-level manual confirmation.`);
    }
  }

  for (const location of meaningfulChanged) {
    const before = location.before;
    const after = location.after;
    const label = locationLabel(after);

    if (before.facilityUrl && !after.facilityUrl) {
      warnings.push(`- ${label}: facilityUrl was removed (${before.facilityUrl}). Verify the new distribution facility URL or add a verified source override.`);
    } else if ((location.fields.includes("place") || location.fields.includes("address")) && !after.facilityUrl && !hasOfficialReviewUrl(after)) {
      warnings.push(`- ${label}: place/address changed but facilityUrl is missing. Verify whether the new distribution place has an official facility page.`);
    }

    if (location.meaningfulFields.some((field) => ["hours", "place", "address"].includes(field)) && hasSinglePlaceScheduleRisk(before, after)) {
      warnings.push(`- ${label}: hours mention weekday/holiday distribution but distributionPlaces is missing. Verify that separate distribution windows were not collapsed into one place.`);
    }

    if (location.meaningfulFields.includes("hours") && hasClosureTextRemoved(before, after)) {
      warnings.push(`- ${label}: closure text was removed from hours. Verify weekend/holiday or year-end distribution handling before merging.`);
    }

    if (
      location.meaningfulFields.some((field) => ["geocodeQuery", "geocodeTitle"].includes(field)) &&
      !/(?:Nominatim確認|公式アクセス地図|公式地図)/.test(String(after.geocodeTitle ?? "")) &&
      hasGeocodePrecisionWarning(before, after)
    ) {
      warnings.push(`- ${label}: geocodeTitle is less specific than geocodeQuery (${formatValue(after.geocodeQuery)} -> ${formatValue(after.geocodeTitle)}). Verify coordinates before merging.`);
    }

    for (const place of location.meaningfulFields.includes("distributionPlaces") ? suspiciousDistributionPlaces(after.distributionPlaces) : []) {
      warnings.push(`- ${label}: distribution place ${placeLabel(place)} has schedule notes mixed into hours (${formatValue(place.hours)}). Verify place-specific days/hours display.`);
    }
  }

  return warnings.length > 0 ? warnings : ["No review warnings detected."];
}

function isMeaningfulFieldChange(before, after, field) {
  if (dateOnlyFields.has(field)) return false;
  if (field === "distributionPlaces" || field === "englishVersionDistributionPlaces") {
    return JSON.stringify(stripPlaceDateOnlyFields(before[field])) !== JSON.stringify(stripPlaceDateOnlyFields(after[field]));
  }
  return JSON.stringify(before[field]) !== JSON.stringify(after[field]);
}

function stripPlaceDateOnlyFields(value) {
  if (Array.isArray(value)) return value.map(stripPlaceDateOnlyFields);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([field]) => !placeDateOnlyFields.has(field))
        .map(([field, fieldValue]) => [field, stripPlaceDateOnlyFields(fieldValue)])
    );
  }
  return value;
}

function isGkpOnlyLocation(location) {
  const urls = [location.sourceUrl, location.stockUrl, location.conditionUrl].filter(Boolean);
  return urls.length > 0 && urls.every(isGkpUrl);
}

function isGkpUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "gk-p.jp" || hostname.endsWith(".gk-p.jp");
  } catch {
    return false;
  }
}

function hasOfficialReviewUrl(location) {
  return [location.facilityUrl, location.stockUrl, location.conditionUrl]
    .some((url) => /^https?:\/\//.test(String(url ?? "")) && !isGkpUrl(url));
}

function hasOfficialDesignNames(location) {
  return Array.isArray(location.officialDesignNames) && location.officialDesignNames.length > 0;
}

function locationListLines(locations) {
  if (locations.length === 0) return ["None."];
  return locations.slice(0, maxRows).map((location) => `- ${locationLabel(location)}`);
}

function contentChangeLines() {
  const contentChanges = meaningfulChanged
    .map((location) => ({ ...location, contentFields: contentFields(location) }))
    .filter((location) => location.contentFields.length > 0);
  if (contentChanges.length === 0) return ["All content changes are address/geocode changes listed above."];

  const rows = contentChanges.slice(0, maxRows).flatMap((location) => [
    `### ${locationLabel(location)}`,
    "",
    `Changed fields: ${location.contentFields.join(", ")}`,
    "",
    ...location.contentFields.flatMap((field) => field === "distributionPlaces" || field === "englishVersionDistributionPlaces"
      ? distributionPlaceChangeLines(location.before[field], location.after[field])
      : [
          `- ${field}`,
          `  - before: ${formatValue(location.before[field])}`,
          `  - after: ${formatValue(location.after[field])}`
        ]),
    ""
  ]);

  if (contentChanges.length > maxRows) {
    rows.push(`Additional content changes omitted: ${contentChanges.length - maxRows}`);
  }

  return rows;
}

function contentFields(location) {
  return location.meaningfulFields.filter((field) => {
    if (geocodeDetailFields.has(field)) return false;
    if (field === "distributionPlaces" || field === "englishVersionDistributionPlaces") {
      return JSON.stringify(stripPlaceReviewFields(location.before[field])) !== JSON.stringify(stripPlaceReviewFields(location.after[field]));
    }
    return true;
  });
}

function stripPlaceReviewFields(value) {
  if (Array.isArray(value)) return value.map(stripPlaceReviewFields);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([field]) => !geocodeDetailFields.has(field))
        .map(([field, fieldValue]) => [field, stripPlaceReviewFields(fieldValue)])
    );
  }
  return value;
}

function locationLabel(location) {
  return `${location.id} ${location.cardName ?? ""} (${location.prefecture ?? ""}${location.municipality ? ` / ${location.municipality}` : ""})`;
}

function formatValue(value) {
  if (value === undefined) return "(missing)";
  if (value && typeof value === "object") return formatObject(value);
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return "(empty)";
  return text.length > maxValueLength ? `${text.slice(0, maxValueLength)}...` : text;
}

function distributionPlaceChangeLines(before, after) {
  const previous = Array.isArray(before) ? before : [];
  const next = Array.isArray(after) ? after : [];
  const beforeById = new Map(previous.map((place) => [place.id, place]));
  const afterById = new Map(next.map((place) => [place.id, place]));
  const added = next.filter((place) => !beforeById.has(place.id));
  const removed = previous.filter((place) => !afterById.has(place.id));
  const changed = next
    .map((place) => ({ before: beforeById.get(place.id), after: place }))
    .filter(({ before }) => before)
    .map(({ before, after }) => ({
      before,
      after,
      fields: [...new Set([...Object.keys(before), ...Object.keys(after)])]
        .filter((field) => !placeDateOnlyFields.has(field))
        .filter((field) => !geocodeDetailFields.has(field))
        .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    }))
    .filter((entry) => entry.fields.length > 0);

  const lines = ["- distributionPlaces"];
  if (added.length === 0 && removed.length === 0 && changed.length === 0) {
    lines.push("  - only place timestamp fields changed");
    return lines;
  }

  for (const place of added) {
    lines.push(`  - added: ${placeLabel(place)}`);
  }
  for (const place of removed) {
    lines.push(`  - removed: ${placeLabel(place)}`);
  }
  for (const entry of changed) {
    lines.push(`  - changed: ${placeLabel(entry.after)}`);
    for (const field of entry.fields) {
      lines.push(`    - ${field}: ${formatValue(entry.before[field])} -> ${formatValue(entry.after[field])}`);
    }
  }
  return lines;
}

function placeLabel(place) {
  return `${place.id ?? "(no id)"} ${place.name ?? ""}${place.address ? ` / ${place.address}` : ""}`.trim();
}

function formatObject(value) {
  const text = JSON.stringify(value)
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text === "{}") return "(empty)";
  return text.length > maxValueLength ? `${text.slice(0, maxValueLength)}...` : text;
}

function hasSinglePlaceScheduleRisk(before, after) {
  if (Array.isArray(after.distributionPlaces) && after.distributionPlaces.length > 0) return false;
  if (!after.hours || after.hours === before.hours) return false;
  return /(宿直室|警備員室|配布場所|窓口)/.test(after.hours);
}

function hasClosureTextRemoved(before, after) {
  if (!before.hours || !after.hours || before.hours === after.hours) return false;
  const beforeText = String(before.hours);
  const afterText = String(after.hours);
  const removedClosure = /(土日|土曜日|日曜日|祝日|年末年始|休み|お休み|休館|休業|定休)/.test(beforeText)
    && !/(土日|土曜日|日曜日|祝日|年末年始|休み|お休み|休館|休業|定休)/.test(afterText);
  if (!removedClosure) return false;
  return !Array.isArray(after.distributionPlaces) || after.distributionPlaces.length === 0;
}

function hasGeocodePrecisionWarning(before, after) {
  if (!after.geocodeQuery || !after.geocodeTitle) return false;
  if (before.geocodeQuery === after.geocodeQuery && before.geocodeTitle === after.geocodeTitle) return false;
  if (isReviewedGeocodeTitle(after.geocodeTitle)) return false;
  if (hasAzaPrecisionLoss(after.geocodeQuery, after.geocodeTitle)) return true;
  if (!hasAddressNumber(after.geocodeQuery)) return false;
  if (!hasAddressNumber(after.geocodeTitle)) return true;
  return addressNumberCount(after.geocodeTitle) < addressNumberCount(after.geocodeQuery);
}

function isReviewedGeocodeTitle(value) {
  return isManuallyReviewedGeocodeTitle(value);
}

function suspiciousDistributionPlaces(places) {
  if (!Array.isArray(places)) return [];
  return places.filter((place) => {
    const hours = String(place.hours ?? "");
    return /令和[0-9０-９]+年[0-9０-９]+月[0-9０-９]+日より|下記の通り変更/.test(hours);
  });
}

function hasAddressNumber(value) {
  return /[0-9０-９一二三四五六七八九十]+(?:丁目|番地|番|号|条|線|[-－‐‑‒–—―ー−])/.test(String(value ?? ""));
}

function addressNumberCount(value) {
  return (String(value ?? "").match(/[0-9０-９一二三四五六七八九十]+(?:丁目|番地|番|号|条|線|[-－‐‑‒–—―ー−])/g) ?? []).length;
}

function hasAzaPrecisionLoss(query, title) {
  const normalizedQuery = normalizeAddressText(query);
  const normalizedTitle = normalizeAddressText(title);
  const match = normalizedQuery.match(/字([^0-9０-９\s]+)$/);
  if (!match) return false;
  const azaName = match[1];
  return Boolean(azaName) && !normalizedTitle.includes(azaName);
}

function normalizeAddressText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[‐‑‒–—―ー−]/g, "-");
}
