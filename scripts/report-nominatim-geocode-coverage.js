import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { collectGeocodePrecisionCandidates, normalizeSearchQuery } from "./geocode-precision-utils.js";
import { filterChangedLocations } from "./location-change-utils.js";

const dataPath = join(process.cwd(), "data", "locations.json");
const cachePath = join(process.cwd(), ".tmp", "geocode-candidate-cache.json");
const maxRows = Number(process.env.MAX_ROWS || 80);
const showAll = process.argv.includes("--all");
const outputJson = process.argv.includes("--json");
const changedOnly = process.env.CHANGED_ONLY === "1";

const allLocations = JSON.parse(await readFile(dataPath, "utf8"));
const locations = changedOnly ? filterChangedLocations(allLocations) : allLocations;
const cache = await readJson(cachePath, { nominatim: {} });
const nominatimCache = cache.nominatim ?? {};
const candidates = collectGeocodePrecisionCandidates(locations);
const rows = candidates.map((candidate) => {
  const queries = nominatimQueries(candidate);
  const checkedQueries = queries.filter((query) => isCheckedCacheEntry(nominatimCache[query]));
  const resultQueries = checkedQueries.filter((query) => cachedResults(nominatimCache[query]).length > 0);
  return {
    id: candidate.id,
    cardName: candidate.cardName,
    severity: candidate.severity,
    target: candidate.kind,
    checked: checkedQueries.length,
    total: queries.length,
    status: coverageStatus(queries, checkedQueries, resultQueries),
    resultQueries,
    missingQueries: queries.filter((query) => !Object.prototype.hasOwnProperty.call(nominatimCache, query))
  };
});

const summary = {
  total: rows.length,
  changedOnly,
  inspectedLocations: locations.length,
  withResult: rows.filter((row) => row.status === "result").length,
  checkedNoResult: rows.filter((row) => row.status === "checked_no_result").length,
  partiallyChecked: rows.filter((row) => row.status === "partial").length,
  notChecked: rows.filter((row) => row.status === "not_checked").length,
  cachedQueries: Object.keys(nominatimCache).length
};

if (outputJson) {
  console.log(JSON.stringify({ summary, rows }, null, 2));
} else {
  printTextReport();
}

function nominatimQueries(candidate) {
  return [
    `${candidate.place} ${candidate.municipality} ${candidate.prefecture}`,
    `${candidate.address || candidate.geocodeQuery}`,
    `${candidate.geocodeQuery}`
  ]
    .map(normalizeSearchQuery)
    .filter(Boolean)
    .filter((query, index, queries) => queries.indexOf(query) === index);
}

function coverageStatus(queries, checkedQueries, resultQueries) {
  if (resultQueries.length > 0) return "result";
  if (checkedQueries.length === 0) return "not_checked";
  if (checkedQueries.length < queries.length) return "partial";
  return "checked_no_result";
}

function printTextReport() {
  console.log("# Nominatim Geocode Coverage");
  console.log("");
  for (const [key, value] of Object.entries(summary)) {
    console.log(`- ${key}: ${value}`);
  }
  console.log("");

  const missingRows = rows.filter((row) => row.status === "not_checked" || row.status === "partial");
  const visibleRows = showAll ? missingRows : missingRows.slice(0, maxRows);

  if (visibleRows.length === 0) {
    console.log("No unchecked Nominatim candidates detected.");
    return;
  }

  console.log("| status | id | card | severity | target | checked | missingQueries |");
  console.log("| --- | --- | --- | --- | --- | --- | --- |");
  for (const row of visibleRows) {
    console.log(
      [
        row.status,
        row.id,
        row.cardName,
        row.severity,
        row.target,
        `${row.checked}/${row.total}`,
        row.missingQueries.join(" / ")
      ]
        .map(markdownCell)
        .join(" | ")
        .replace(/^/, "| ")
        .replace(/$/, " |")
    );
  }

  if (!showAll && missingRows.length > visibleRows.length) {
    console.log("");
    console.log(`Showing ${visibleRows.length} of ${missingRows.length}. Set MAX_ROWS or pass --all to show more.`);
  }
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function cachedResults(entry) {
  if (Array.isArray(entry)) return entry;
  return Array.isArray(entry?.results) ? entry.results : [];
}

function isCheckedCacheEntry(entry) {
  if (Array.isArray(entry)) return true;
  return Boolean(entry && entry.status >= 200 && entry.status < 300 && Array.isArray(entry.results));
}
