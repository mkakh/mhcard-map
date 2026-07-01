import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const dataPath = join(process.cwd(), "data", "locations.json");
const outputPath = join(process.cwd(), ".tmp", "location-update-summary.md");
const dateOnlyFields = new Set(["updatedAt", "geocodedAt"]);
const placeDateOnlyFields = new Set(["geocodedAt"]);
const maxRows = 30;
const maxValueLength = 160;

const before = await readBaseLocations();
const after = JSON.parse(await readFile(dataPath, "utf8"));
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
    meaningfulFields: changedFields.filter((field) => !dateOnlyFields.has(field)),
    before: previous,
    after: location
  });
}

const meaningfulChanged = changed.filter((location) => location.meaningfulFields.length > 0);
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
console.log(`Wrote update summary to ${outputPath}`);

async function readBaseLocations() {
  const content = execFileSync("git", ["show", "HEAD:data/locations.json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024
  });
  return JSON.parse(content);
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

function isGkpOnlyLocation(location) {
  const urls = [location.sourceUrl, location.stockUrl, location.conditionUrl].filter(Boolean);
  return urls.length > 0 && urls.every(isGkpUrl);
}

function isGkpUrl(value) {
  try {
    return new URL(value).hostname.endsWith("gk-p.jp");
  } catch {
    return false;
  }
}

function hasOfficialDesignNames(location) {
  return Array.isArray(location.officialDesignNames) && location.officialDesignNames.length > 0;
}

function locationListLines(locations) {
  if (locations.length === 0) return ["None."];
  return locations.slice(0, maxRows).map((location) => `- ${locationLabel(location)}`);
}

function contentChangeLines() {
  if (meaningfulChanged.length === 0) return ["Only update timestamp fields changed."];

  const rows = meaningfulChanged.slice(0, maxRows).flatMap((location) => [
    `### ${locationLabel(location)}`,
    "",
    `Changed fields: ${location.meaningfulFields.join(", ")}`,
    "",
    ...location.meaningfulFields.flatMap((field) => field === "distributionPlaces"
      ? distributionPlaceChangeLines(location.before[field], location.after[field])
      : [
          `- ${field}`,
          `  - before: ${formatValue(location.before[field])}`,
          `  - after: ${formatValue(location.after[field])}`
        ]),
    ""
  ]);

  if (meaningfulChanged.length > maxRows) {
    rows.push(`Additional content changes omitted: ${meaningfulChanged.length - maxRows}`);
  }

  return rows;
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
