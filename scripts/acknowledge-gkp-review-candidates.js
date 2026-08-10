import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readGkpReviewCandidates } from "./gkp-review-candidate-utils.js";
import {
  acknowledgeGkpReviewCandidates,
  readGkpReviewBaseline,
  writeGkpReviewBaseline
} from "./gkp-review-baseline-utils.js";
import { isOfficialPublicBodyLocation } from "./source-policy-utils.js";

const locations = JSON.parse(
  await readFile(join(process.cwd(), "data", "locations.json"), "utf8")
);
const officialIds = new Set(
  locations.filter(isOfficialPublicBodyLocation).map((location) => location.id)
);
const candidates = await readGkpReviewCandidates();
const requestedIds = process.argv.slice(2);
const baseline = await readGkpReviewBaseline();

if (candidates.length === 0) {
  const next = acknowledgeGkpReviewCandidates(baseline, [], officialIds);
  const removedOfficialCount = countRemovedOfficialEntries(baseline, next, officialIds);
  if (removedOfficialCount > 0) await writeGkpReviewBaseline(next);
  console.log(
    `No GKP review candidates to acknowledge; ` +
    `${removedOfficialCount} official-source record(s) removed from the baseline`
  );
} else {
  if (requestedIds.length === 0) {
    throw new Error("Pass --all-reviewed or one or more explicitly reviewed candidate IDs");
  }

  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const selectedCandidates = requestedIds.includes("--all-reviewed")
    ? candidates
    : requestedIds.map((id) => {
        const candidate = candidateById.get(id);
        if (!candidate) throw new Error(`Unknown GKP review candidate ID: ${id}`);
        return candidate;
      });

  const next = acknowledgeGkpReviewCandidates(baseline, selectedCandidates, officialIds);
  const removedOfficialCount = countRemovedOfficialEntries(baseline, next, officialIds);
  await writeGkpReviewBaseline(next);
  console.log(
    `Acknowledged ${selectedCandidates.length} reviewed GKP candidate(s); ` +
    `${removedOfficialCount} ` +
    `official-source record(s) removed from the baseline`
  );
}

function countRemovedOfficialEntries(baseline, next, officialIds) {
  return [...officialIds].filter(
    (id) => baseline.locations[id] && !next.locations[id]
  ).length;
}
