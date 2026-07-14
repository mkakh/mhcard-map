import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  collectGeocodePrecisionCandidates,
  collectGeocodeReviewIssues,
  googleMapsCoordinateUrl
} from "./geocode-precision-utils.js";
import { filterChangedLocations } from "./location-change-utils.js";

const dataPath = join(process.cwd(), "data", "locations.json");
const maxRows = Number(process.env.MAX_ROWS || 80);
const outputJson = process.argv.includes("--json");
const showAll = process.argv.includes("--all");
const changedOnly = process.env.CHANGED_ONLY === "1";
const auditScope = process.env.GEOCODE_AUDIT_SCOPE || "precision";

const allLocations = JSON.parse(await readFile(dataPath, "utf8"));
const locations = changedOnly ? filterChangedLocations(allLocations) : allLocations;
const candidates = collectCandidates(locations);

if (outputJson) {
  console.log(JSON.stringify({
    total: candidates.length,
    changedOnly,
    auditScope,
    inspectedLocations: locations.length,
    candidates
  }, null, 2));
} else {
  printTextReport();
}

function printTextReport() {
  const high = candidates.filter((candidate) => candidate.severity === "high");
  const medium = candidates.filter((candidate) => candidate.severity === "medium");
  const rows = showAll ? candidates : candidates.slice(0, maxRows);

  console.log(auditScope === "review-issues" ? "# Objective Geocode Review Issues" : "# Legacy Geocode Precision Heuristic");
  console.log("");
  console.log(`- Total: ${candidates.length}`);
  console.log(`- High: ${high.length}`);
  console.log(`- Medium: ${medium.length}`);
  if (changedOnly) console.log(`- Inspected changed locations: ${locations.length}`);
  console.log("");

  if (candidates.length === 0) {
    console.log(auditScope === "review-issues" ? "No objective geocode review issues detected." : "No legacy precision heuristic candidates detected.");
    return;
  }

  if (rows.length === 0) {
    console.log("No rows shown. Set MAX_ROWS or pass --all to show candidates.");
    return;
  }

  console.log("| severity | id | card | target | targetId | reason | address | coordinates | map | geocodeQuery | geocodeTitle |");
  console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");

  for (const candidate of rows) {
    console.log(
      [
        candidate.severity,
        candidate.id,
        candidate.cardName,
        candidate.kind,
        candidate.targetId,
        candidate.reasons.join("; "),
        candidate.address,
        `${candidate.lat},${candidate.lng}`,
        googleMapsCoordinateUrl(candidate),
        candidate.geocodeQuery,
        candidate.geocodeTitle
      ]
        .map(markdownCell)
        .join(" | ")
        .replace(/^/, "| ")
        .replace(/$/, " |")
    );
  }

  if (!showAll && candidates.length > rows.length) {
    console.log("");
    console.log(`Showing ${rows.length} of ${candidates.length}. Set MAX_ROWS or pass --all to show more.`);
  }
}

function collectCandidates(items) {
  if (auditScope === "precision") return collectGeocodePrecisionCandidates(items);
  if (auditScope === "review-issues") return collectGeocodeReviewIssues(items);
  throw new Error(`Unknown GEOCODE_AUDIT_SCOPE: ${auditScope}`);
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}
