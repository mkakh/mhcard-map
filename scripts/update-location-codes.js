import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dataPath = join(process.cwd(), "data", "locations.json");
const codeAlphabet = "23456789CFGHJMPQRVWX";
const pairResolutions = [20, 1, 0.05, 0.0025, 0.000125];

const locations = JSON.parse(await readFile(dataPath, "utf8"));
let plusCodesUpdated = 0;
let mapcodesNormalized = 0;
let skipped = 0;

for (const location of locations) {
  const lat = Number(location.lat);
  const lng = Number(location.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    skipped += 1;
    continue;
  }

  const plusCode = encodePlusCode(lat, lng);
  if (location.plusCode !== plusCode) {
    location.plusCode = plusCode;
    plusCodesUpdated += 1;
  }

  if (!location.mapcode && location.mapcodeStatus !== "未登録") {
    location.mapcodeStatus = "未登録";
    mapcodesNormalized += 1;
  }
}

await writeFile(dataPath, `${JSON.stringify(locations, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      total: locations.length,
      plusCodesUpdated,
      mapcodesNormalized,
      skipped
    },
    null,
    2
  )
);

function encodePlusCode(lat, lng) {
  let adjustedLat = clipLatitude(lat);
  const adjustedLng = normalizeLongitude(lng);

  if (adjustedLat === 90) {
    adjustedLat -= computeLatitudePrecision();
  }

  let latValue = adjustedLat + 90;
  let lngValue = adjustedLng + 180;
  let code = "";

  for (const resolution of pairResolutions) {
    const latDigit = Math.floor(latValue / resolution);
    const lngDigit = Math.floor(lngValue / resolution);
    code += codeAlphabet[latDigit] + codeAlphabet[lngDigit];
    latValue -= latDigit * resolution;
    lngValue -= lngDigit * resolution;
  }

  return `${code.slice(0, 8)}+${code.slice(8)}`;
}

function clipLatitude(lat) {
  return Math.min(90, Math.max(-90, lat));
}

function normalizeLongitude(lng) {
  let normalized = lng;
  while (normalized < -180) normalized += 360;
  while (normalized >= 180) normalized -= 360;
  return normalized;
}

function computeLatitudePrecision() {
  return pairResolutions[pairResolutions.length - 1];
}
