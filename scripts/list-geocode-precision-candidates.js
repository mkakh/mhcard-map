import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  backlogShardIndex,
  collectGeocodePrecisionCandidates,
  collectGeocodeReviewBacklog,
  geocodeCandidateKey,
  googleMapsCoordinateUrl,
  selectCandidateShard,
  selectGeocodeReviewBatch
} from "./geocode-precision-utils.js";
import { filterChangedLocations } from "./location-change-utils.js";

const dataPath = join(process.cwd(), "data", "locations.json");
const maxRows = Number(process.env.MAX_ROWS || 80);
const outputJson = process.argv.includes("--json");
const showAll = process.argv.includes("--all");
const changedOnly = process.env.CHANGED_ONLY === "1";
const excludeChanged = process.env.EXCLUDE_CHANGED === "1";
const auditScope = process.env.GEOCODE_AUDIT_SCOPE || "precision";
const shardCount = Number(process.env.BACKLOG_SHARD_COUNT || 0);
const shardIndex = shardCount > 0
  ? Number(process.env.BACKLOG_SHARD_INDEX || backlogShardIndex(shardCount))
  : null;

const allLocations = JSON.parse(await readFile(dataPath, "utf8"));
const locations = changedOnly ? filterChangedLocations(allLocations) : allLocations;
const changedCandidateKeys = excludeChanged
  ? new Set(collectCandidates(filterChangedLocations(allLocations)).map(geocodeCandidateKey))
  : new Set();
const allCandidates = collectCandidates(locations)
  .filter((candidate) => !changedCandidateKeys.has(geocodeCandidateKey(candidate)));
const candidates = shardCount > 0
  ? auditScope === "review-backlog"
    ? selectGeocodeReviewBatch(allCandidates, shardCount, shardIndex)
    : selectCandidateShard(allCandidates, shardCount, shardIndex)
  : allCandidates;

if (outputJson) {
  console.log(JSON.stringify({
    total: candidates.length,
    totalBeforeShard: allCandidates.length,
    changedOnly,
    excludeChanged,
    auditScope,
    inspectedLocations: locations.length,
    shardCount,
    shardIndex,
    candidates
  }, null, 2));
} else {
  printTextReport();
}

function printTextReport() {
  const high = candidates.filter((candidate) => candidate.severity === "high");
  const medium = candidates.filter((candidate) => candidate.severity === "medium");
  const rows = showAll ? candidates : candidates.slice(0, maxRows);

  console.log(auditScope === "review-backlog" ? "# Geocode Review Backlog" : "# Legacy Geocode Precision Heuristic");
  console.log("");
  console.log(`- Total: ${candidates.length}`);
  if (shardCount > 0) {
    console.log(`- Total before weekly shard: ${allCandidates.length}`);
    console.log(`- Weekly shard: ${shardIndex + 1}/${shardCount}`);
  }
  console.log(`- High: ${high.length}`);
  console.log(`- Medium: ${medium.length}`);
  console.log(`- Routine review: ${candidates.filter((candidate) => candidate.severity === "review").length}`);
  if (changedOnly) console.log(`- Inspected changed locations: ${locations.length}`);
  console.log("");

  if (candidates.length === 0) {
    console.log(auditScope === "review-backlog" ? "No geocode review backlog detected." : "No legacy precision heuristic candidates detected.");
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
  if (auditScope === "review-backlog") return collectGeocodeReviewBacklog(items);
  throw new Error(`Unknown GEOCODE_AUDIT_SCOPE: ${auditScope}`);
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}
