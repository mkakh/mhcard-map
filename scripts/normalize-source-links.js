import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dataPath = join(process.cwd(), "data", "locations.json");
const htmlDir = join(process.cwd(), ".tmp", "gkp");

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
const gkpRowsByImageUrl = await loadGkpRowsByImageUrl();

let updated = 0;
let verifiedSourcesAssigned = 0;
let sourceUrlsAssigned = 0;
let facilityUrlsAssigned = 0;
let stockUrlsAssigned = 0;
let stockUrlsFallbackAssigned = 0;
let conditionUrlsAssigned = 0;
let conditionsUpdated = 0;
let rowsMatched = 0;

for (const location of locations) {
  const before = JSON.stringify(linkSnapshot(location));
  const verified = verifiedDistributionSources.get(location.id);

  if (verified) {
    Object.assign(location, verified);
    verifiedSourcesAssigned += 1;
  } else {
    const prefectureCode = getPrefectureCode(location.id);
    const gkpUrl = prefectureCode ? `https://www.gk-p.jp/mhcard/?pref=${prefectureCode}#mhcard_result` : "";
    const gkpRow = gkpRowsByImageUrl.get(normalizeUrl(location.imageUrl));

    if (gkpUrl && location.sourceUrl !== gkpUrl) {
      location.sourceUrl = gkpUrl;
      sourceUrlsAssigned += 1;
    }

    if (gkpRow) {
      rowsMatched += 1;

      if (gkpRow.facilityUrl && location.facilityUrl !== gkpRow.facilityUrl) {
        location.facilityUrl = gkpRow.facilityUrl;
        facilityUrlsAssigned += 1;
      }

      const stockUrl = gkpRow.stockUrl || gkpUrl;
      if (stockUrl && location.stockUrl !== stockUrl) {
        location.stockUrl = stockUrl;
        if (gkpRow.stockUrl) stockUrlsAssigned += 1;
        else stockUrlsFallbackAssigned += 1;
      }

      if (gkpRow.stockText && location.stock !== gkpRow.stockText) {
        location.stock = gkpRow.stockText;
      }
    } else if (gkpUrl && location.stockUrl !== gkpUrl) {
      location.stockUrl = gkpUrl;
      stockUrlsFallbackAssigned += 1;
    }

    const conditionUrl = cleanUrl(location.sourceUrl);
    if (conditionUrl && location.conditionUrl !== conditionUrl) {
      location.conditionUrl = conditionUrl;
      conditionUrlsAssigned += 1;
    }

    if (isGenericCondition(location.condition) && location.condition !== "公式情報を確認") {
      location.condition = "公式情報を確認";
      conditionsUpdated += 1;
    }
  }

  const after = JSON.stringify(linkSnapshot(location));
  if (before !== after) updated += 1;
}

await writeFile(dataPath, `${JSON.stringify(locations, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      total: locations.length,
      updated,
      rowsMatched,
      verifiedSourcesAssigned,
      sourceUrlsAssigned,
      facilityUrlsAssigned,
      stockUrlsAssigned,
      stockUrlsFallbackAssigned,
      conditionUrlsAssigned,
      conditionsUpdated
    },
    null,
    2
  )
);

function linkSnapshot(location) {
  return {
    sourceUrl: location.sourceUrl,
    facilityUrl: location.facilityUrl,
    stockUrl: location.stockUrl,
    conditionUrl: location.conditionUrl,
    condition: location.condition,
    stock: location.stock
  };
}

async function loadGkpRowsByImageUrl() {
  await mkdir(htmlDir, { recursive: true });
  const files = await ensurePrefectureHtmlFiles();
  const rowsByImageUrl = new Map();

  for (const file of files) {
    const html = await readFile(join(htmlDir, file), "utf8");
    const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

    for (const row of rows) {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
      if (cells.length < 7) continue;

      const [, imageHtml, , , distributionHtml, , stockHtml] = cells.slice(-7);
      const imageUrl = absolutizeUrl(firstHrefOrSrc(imageHtml, "src"));
      if (!imageUrl) continue;

      rowsByImageUrl.set(normalizeUrl(imageUrl), {
        facilityUrl: absolutizeUrl(firstHrefOrSrc(distributionHtml, "href")),
        stockUrl: absolutizeUrl(firstHrefOrSrc(stockHtml, "href")),
        stockText: cleanupText(stockHtml)
      });
    }
  }

  return rowsByImageUrl;
}

async function ensurePrefectureHtmlFiles() {
  let files = [];
  try {
    files = (await readdir(htmlDir)).filter((file) => /^pref-\d{2}\.html$/.test(file));
  } catch {
    files = [];
  }

  const existingCodes = new Set(files.map((file) => file.match(/^pref-(\d{2})\.html$/)?.[1]).filter(Boolean));
  for (let number = 1; number <= 47; number += 1) {
    const code = String(number).padStart(2, "0");
    if (existingCodes.has(code)) continue;

    const file = `pref-${code}.html`;
    const url = `https://www.gk-p.jp/mhcard/?pref=${code}#mhcard_result`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    await writeFile(join(htmlDir, file), await response.text(), "utf8");
    files.push(file);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return files.sort();
}

function firstHrefOrSrc(value, attribute) {
  return String(value ?? "").match(new RegExp(`<[^>]+${attribute}=["']([^"']+)["']`, "i"))?.[1] ?? "";
}

function cleanupText(html) {
  return decodeEntities(
    String(html ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>|<\/div>|<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n")
  ).trim();
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#038;/g, "&");
}

function absolutizeUrl(url) {
  const value = cleanUrl(url).replace(/&amp;/g, "&");
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("http://www.gk-p.jp")) return value.replace("http://", "https://");
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) return `https://www.gk-p.jp${value}`;
  return value;
}

function normalizeUrl(url) {
  return absolutizeUrl(url).replace(/\s+/g, "").replace(/\/$/, "");
}

function cleanUrl(value) {
  return String(value ?? "").trim();
}

function getPrefectureCode(id) {
  return String(id ?? "").match(/^(\d{2})-/)?.[1] ?? "";
}

function isGenericCondition(value) {
  return ["GKP掲載情報を確認", "公式情報を確認"].includes(String(value ?? "").trim());
}
