import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dataPath = join(process.cwd(), "data", "locations.json");

const verifiedDistributionSources = new Map([
  [
    "17-金沢市-001",
    {
      sourceUrl: "https://www2.city.kanazawa.ishikawa.jp/about_us/library/manhole_card/",
      facilityUrl: "https://www.kanazawa-kankoukyoukai.or.jp/spot/detail_50571.html",
      stockUrl: "https://www2.city.kanazawa.ishikawa.jp/about_us/library/manhole_card/",
      conditionUrl: "https://www2.city.kanazawa.ishikawa.jp/about_us/library/manhole_card/",
      condition: "在庫状況を確認のうえ、1人1枚まで配布"
    }
  ]
]);

const locations = JSON.parse(await readFile(dataPath, "utf8"));
let updated = 0;
let facilityUrlsAdded = 0;
let gkpSourcesAssigned = 0;
let verifiedSourcesAssigned = 0;
let stockUrlsAssigned = 0;
let conditionUrlsAssigned = 0;
let conditionsUpdated = 0;

for (const location of locations) {
  const before = JSON.stringify({
    sourceUrl: location.sourceUrl,
    facilityUrl: location.facilityUrl,
    stockUrl: location.stockUrl,
    conditionUrl: location.conditionUrl,
    condition: location.condition
  });
  const verified = verifiedDistributionSources.get(location.id);

  if (verified) {
    location.sourceUrl = verified.sourceUrl;
    location.facilityUrl = verified.facilityUrl;
    location.stockUrl = verified.stockUrl;
    location.conditionUrl = verified.conditionUrl;
    location.condition = verified.condition;
    verifiedSourcesAssigned += 1;
  } else {
    const currentSourceUrl = cleanUrl(location.sourceUrl);
    const currentFacilityUrl = cleanUrl(location.facilityUrl);

    if (currentSourceUrl && !isGkpSource(currentSourceUrl) && !currentFacilityUrl) {
      location.facilityUrl = currentSourceUrl;
      facilityUrlsAdded += 1;
    }

    const prefectureCode = getPrefectureCode(location.id);
    if (prefectureCode) {
      const gkpUrl = `https://www.gk-p.jp/mhcard/?pref=${prefectureCode}#mhcard_result`;
      if (location.sourceUrl !== gkpUrl) {
        location.sourceUrl = gkpUrl;
        gkpSourcesAssigned += 1;
      }
    }

    const stockUrl = cleanUrl(location.facilityUrl) || cleanUrl(location.sourceUrl);
    if (stockUrl && location.stockUrl !== stockUrl) {
      location.stockUrl = stockUrl;
      stockUrlsAssigned += 1;
    }

    const conditionUrl = cleanUrl(location.sourceUrl);
    if (conditionUrl && location.conditionUrl !== conditionUrl) {
      location.conditionUrl = conditionUrl;
      conditionUrlsAssigned += 1;
    }

    if (isGenericCondition(location.condition)) {
      location.condition = "公式情報を確認";
      conditionsUpdated += 1;
    }
  }

  const after = JSON.stringify({
    sourceUrl: location.sourceUrl,
    facilityUrl: location.facilityUrl,
    stockUrl: location.stockUrl,
    conditionUrl: location.conditionUrl,
    condition: location.condition
  });
  if (before !== after) updated += 1;
}

await writeFile(dataPath, `${JSON.stringify(locations, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      total: locations.length,
      updated,
      facilityUrlsAdded,
      gkpSourcesAssigned,
      verifiedSourcesAssigned,
      stockUrlsAssigned,
      conditionUrlsAssigned,
      conditionsUpdated
    },
    null,
    2
  )
);

function cleanUrl(value) {
  return String(value ?? "").trim();
}

function isGkpSource(value) {
  return /^https:\/\/www\.gk-p\.jp\/mhcard\/\?pref=\d{2}#mhcard_result$/.test(cleanUrl(value));
}

function getPrefectureCode(id) {
  return String(id ?? "").match(/^(\d{2})-/)?.[1] ?? "";
}

function isGenericCondition(value) {
  return ["GKP掲載情報を確認", "公式情報を確認"].includes(String(value ?? "").trim());
}
