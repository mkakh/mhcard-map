import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { encodePlusCode } from "./plus-code-utils.js";

const dataPath = join(process.cwd(), "data", "locations.json");

const locations = JSON.parse(await readFile(dataPath, "utf8"));
let plusCodesUpdated = 0;
let skipped = 0;

for (const location of locations) {
  updatePlusCode(location);
  (location.distributionPlaces ?? []).forEach(updatePlusCode);
  (location.englishVersionDistributionPlaces ?? []).forEach(updatePlusCode);
}

await writeFile(dataPath, `${JSON.stringify(locations, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      total: locations.length,
      plusCodesUpdated,
      skipped
    },
    null,
    2
  )
);

function updatePlusCode(target) {
  const lat = Number(target.lat);
  const lng = Number(target.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    skipped += 1;
    return;
  }

  const plusCode = encodePlusCode(lat, lng);
  if (target.plusCode !== plusCode) {
    target.plusCode = plusCode;
    plusCodesUpdated += 1;
  }
}
