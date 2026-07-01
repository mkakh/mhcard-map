import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const dataPath = join(process.cwd(), "data", "locations.json");
const htmlDir = join(process.cwd(), ".tmp", "gkp");

const verifiedDistributionSources = new Map([
  [
    "17-201-a-01",
    {
      sourceUrl: "https://www2.city.kanazawa.ishikawa.jp/about_us/library/manhole_card/",
      facilityUrl: "https://www.kanazawa-kankoukyoukai.or.jp/spot/detail_50571.html",
      stockUrl: "https://www2.city.kanazawa.ishikawa.jp/about_us/library/manhole_card/",
      conditionUrl: "https://www2.city.kanazawa.ishikawa.jp/about_us/library/manhole_card/",
      condition: "在庫状況を確認のうえ、1人1枚まで配布"
    }
  ]
]);

const verifiedEnglishVersionDistributionPlaces = new Map([
  [
    "31-202-a-01",
    [
      {
        id: "place-english-yonago-international-tourist-information",
        name: "米子市国際観光案内所",
        address: "米子市弥生町2 JR米子駅1F",
        days: "英語版",
        hours: "午前9時から午後6時まで（年中無休）",
        closed: "",
        url: "https://www.city.yonago.lg.jp/41542.htm"
      }
    ]
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
let englishVersionSourcesChecked = 0;
let englishVersionDetected = 0;
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

const sourcePages = await loadEnglishVersionSourcePages(locations);
for (const location of locations) {
  const before = JSON.stringify(linkSnapshot(location));
  applyEnglishVersionFromSourcePages(location, sourcePages);
  applyVerifiedEnglishVersionDistributionPlaces(location);
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
      conditionsUpdated,
      englishVersionSourcesChecked,
      englishVersionDetected
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
    stock: location.stock,
    hasEnglishVersion: location.hasEnglishVersion,
    englishVersionStatus: location.englishVersionStatus,
    englishVersionNote: location.englishVersionNote,
    englishVersionUrl: location.englishVersionUrl,
    englishVersionDistributionPlaces: location.englishVersionDistributionPlaces
  };
}

async function loadEnglishVersionSourcePages(items) {
  const urls = [...new Set(items
    .flatMap((location) => [location.englishVersionUrl, location.stockUrl || location.facilityUrl])
    .map(normalizeUrl)
    .filter((url) => url && !isGkpUrl(url)))];
  const pages = new Map();

  await mapWithConcurrency(urls, 8, async (url) => {
    const page = await fetchSourcePage(url);
    if (page) pages.set(url, page);
  });

  return pages;
}

async function mapWithConcurrency(items, limit, worker) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

async function fetchSourcePage(url) {
  englishVersionSourcesChecked += 1;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) return null;
    const html = await decodeResponseText(response);
    const text = cleanupText(html);
    return {
      url: response.url || url,
      text,
      lines: text.split("\n").map((line) => line.trim()).filter(Boolean)
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function decodeResponseText(response) {
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const contentType = response.headers.get("content-type") ?? "";
  const headerCharset = contentType.match(/charset=([^;\s]+)/i)?.[1];
  const utf8Text = new TextDecoder("utf-8").decode(bytes);
  const metaCharset = utf8Text.match(/<meta[^>]+charset=["']?([^"'\s/>]+)/i)?.[1]
    ?? utf8Text.match(/<meta[^>]+content=["'][^"']*charset=([^"'\s;]+)/i)?.[1];
  const charset = normalizeCharset(headerCharset || metaCharset);

  if (!charset || charset === "utf-8") return utf8Text;
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return utf8Text;
  }
}

function normalizeCharset(value) {
  const charset = String(value ?? "").trim().toLowerCase();
  if (!charset) return "";
  if (["shift-jis", "shift_jis", "sjis", "windows-31j", "x-sjis"].includes(charset)) return "shift_jis";
  if (["utf-8", "utf8"].includes(charset)) return "utf-8";
  return charset;
}

function applyEnglishVersionFromSourcePages(location, pages) {
  const urls = [location.englishVersionUrl, location.stockUrl, location.facilityUrl].map(normalizeUrl).filter(Boolean);
  for (const url of urls) {
    const page = pages.get(url);
    if (!page) continue;
    const match = englishVersionMatchForLocation(location, page);
    if (!match) continue;

    location.hasEnglishVersion = true;
    location.englishVersionStatus = englishVersionStatus(match.note);
    location.englishVersionNote = match.note;
    location.englishVersionUrl = match.url || page.url || location.stockUrl || location.facilityUrl;
    if (match.distributionPlaces?.length) location.englishVersionDistributionPlaces = match.distributionPlaces;
    englishVersionDetected += 1;
    return;
  }

  if (location.hasEnglishVersion) {
    location.englishVersionStatus = englishVersionStatus(location.englishVersionNote);
    englishVersionDetected += 1;
  }
}

function applyVerifiedEnglishVersionDistributionPlaces(location) {
  const places = verifiedEnglishVersionDistributionPlaces.get(location.id);
  if (!places) return;
  location.hasEnglishVersion = true;
  location.englishVersionStatus = englishVersionStatus(location.englishVersionNote);
  location.englishVersionDistributionPlaces = places;
}

function englishVersionMatchForLocation(location, page) {
  const distributionPlaces = englishVersionDistributionPlacesForLocation(location, page.lines);
  const directNote = directEnglishVersionNoteForLocation(location, page.lines);
  if (directNote) {
    return {
      note: directNote,
      url: page.url,
      distributionPlaces
    };
  }

  const segment = sourcePageSegmentForLocation(location, page.lines);
  const note = segment.length > 0 ? bestEnglishVersionNote(location, segment) : "";
  if (!note && distributionPlaces.length === 0) return null;
  return {
    note: note || "英語版配布場所あり",
    url: page.url,
    distributionPlaces
  };
}

function englishVersionDistributionPlacesForLocation(location, lines) {
  const segment = sourcePageSegmentForLocation(location, lines);
  const sourceLines = segment.length > 0 ? segment : lines;
  const isEnglishVersionPage = sourceLines.some((line) => /英語版マンホールカード/.test(line));
  const places = [];

  for (let index = 0; index < sourceLines.length; index += 1) {
    const line = sourceLines[index];
    if (!isEnglishVersionPlaceMarker(line) && !(isEnglishVersionPage && /^配布場所(?:\s|$)/.test(line))) continue;

    const placeLine = englishVersionPlaceLine(sourceLines, index);
    const name = englishVersionPlaceName(placeLine) || nextMeaningfulLine(sourceLines, index + 1);
    const address = addressFromText(name) || addressFromText(nextMeaningfulLine(sourceLines, index + 2)) || "";
    const hours = nearbyValue(sourceLines, index, /^配布時間\s*(.+)$/);
    const closed = nearbyValue(sourceLines, index, /^(?:休館日|休み)\s*(.+)$/);
    if (!name || /配布時間|注意事項|電話|Image:|リンク/.test(name)) continue;

    places.push({
      id: distributionPlaceId(`english-${name}`, address || name),
      name: cleanupPlaceName(name),
      address: cleanupAddress(address),
      days: "英語版",
      hours,
      closed,
      url: ""
    });
  }

  return dedupeEnglishVersionDistributionPlaces(places);
}

function isEnglishVersionPlaceMarker(line) {
  return /配布場所.*英語版|英語版.*配布場所|日本語版とは配布場所が異なる/.test(line);
}

function englishVersionPlaceName(line) {
  const match = line.match(/^配布場所(?:[〖（(][^）)〗]+[）)〗])?\s*(.+)$/);
  return match?.[1]?.trim() ?? "";
}

function englishVersionPlaceLine(lines, index) {
  const line = lines[index] ?? "";
  if (/^配布場所/.test(line)) return line;
  return lines.slice(index + 1, index + 5).find((candidate) => /^配布場所/.test(candidate)) ?? line;
}

function nextMeaningfulLine(lines, start) {
  return lines.slice(start, start + 6).find((line) => {
    if (!line) return false;
    return !/^(電話|配布時間|注意事項|掲載日|Image:|リンク|※)/.test(line);
  }) ?? "";
}

function nearbyValue(lines, start, pattern) {
  for (const line of lines.slice(start, start + 8)) {
    const match = line.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function addressFromText(value) {
  const matches = [...String(value ?? "").matchAll(/[（(]([^）)]+(?:市|区|町|村)[^）)]*)[）)]/g)]
    .map((match) => match[1].trim());
  return matches.findLast((text) => /[0-9０-９丁目番地-]/.test(text)) ?? matches.at(-1) ?? "";
}

function cleanupPlaceName(value) {
  return String(value ?? "")
    .replace(/^配布場所(?:[〖（(][^）)〗]+[）)〗])?\s*/, "")
    .replace(/[（(][^）)]*(?:市|区|町|村)[^）)]*[0-9０-９丁目番地-][^）)]*[）)]/g, "")
    .trim();
}

function cleanupAddress(value) {
  return String(value ?? "").replace(/^所在地[：:\s]*/, "").trim();
}

function dedupeEnglishVersionDistributionPlaces(places) {
  const seen = new Set();
  return places.filter((place) => {
    const key = `${place.name}\n${place.address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return place.name && place.address;
  });
}

function distributionPlaceId(name, address) {
  const source = `${normalizePlaceKey(address || name)}\n${normalizePlaceKey(name)}`;
  return `place-${createHash("sha1").update(source).digest("hex").slice(0, 10)}`;
}

function normalizePlaceKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[‐‑‒–—―ー−]/g, "-")
    .toLowerCase();
}

function directEnglishVersionNoteForLocation(location, lines) {
  const suffix = cardSuffix(location);
  if (!suffix) return "";
  const directIndex = lines.findIndex((line) => {
    if (!/英語版/.test(line) || /パンフレット/.test(line)) return false;
    return line.includes(`${suffix}英語版`) || line.includes(`${suffix}（`) || line.includes(`${suffix}(`);
  });
  if (directIndex === -1) return "";

  return lines.find((line) => /英語版.*イベント|イベント.*英語版|イベント配布/.test(line)) ?? lines[directIndex];
}

function cardSuffix(location) {
  const match = String(location.cardName ?? "").match(/\s([A-Z])\d{3}$/);
  return match?.[1] ?? "";
}

function sourcePageSegmentForLocation(location, lines) {
  const series = String(location.series ?? "").trim();
  if (!series) return [];

  const seriesValues = seriesCandidates(series);
  const includesCurrentSeries = (line) => seriesValues.some((value) => line.includes(value));
  const start = lines.findIndex(includesCurrentSeries);
  if (start === -1) return [];

  const endOffset = lines
    .slice(start + 1)
    .findIndex((line) => (!includesCurrentSeries(line) && /第[0-9０-９]+弾/.test(line)) || isSourcePageSectionBoundary(line));
  const end = endOffset === -1 ? Math.min(lines.length, start + 50) : start + 1 + endOffset;
  return lines.slice(start, end);
}

function seriesCandidates(series) {
  const normalized = String(series ?? "").trim();
  const match = normalized.match(/^第([0-9０-９]+)弾$/);
  if (!match) return [normalized].filter(Boolean);

  const asciiNumber = match[1].replace(/[０-９]/g, (value) => String.fromCharCode(value.charCodeAt(0) - 0xfee0));
  const number = String(Number(asciiNumber));
  const padded = number.padStart(2, "0");
  const fullWidth = number.replace(/[0-9]/g, (value) => String.fromCharCode(value.charCodeAt(0) + 0xfee0));
  const fullWidthPadded = padded.replace(/[0-9]/g, (value) => String.fromCharCode(value.charCodeAt(0) + 0xfee0));

  return [...new Set([
    normalized,
    `第${number}弾`,
    `第${padded}弾`,
    `第${fullWidth}弾`,
    `第${fullWidthPadded}弾`
  ])];
}

function bestEnglishVersionNote(location, lines) {
  const bilingualLines = lines.filter((line) => /日本語版と英語版/.test(line));
  if (bilingualLines.length > 1) return `${location.series}マンホールカード（日本語版と英語版）`;

  return lines.find((line) => /マンホールカード.*英語版ができました|English\s+version/i.test(line))
    ?? lines.find((line) => /日本語版の他に.*英語版/.test(line))
    ?? lines.find((line) => /英語版.*配布/.test(line) && !/配布.*終了/.test(line) && !/パンフレット/.test(line))
    ?? lines.find((line) => /日本語版または英語版/.test(line))
    ?? lines.find((line) => /英語版\s*[：:]/.test(line) && !/パンフレット/.test(line))
    ?? bilingualLines[0]
    ?? "";
}

function englishVersionStatus(value) {
  const text = String(value ?? "");
  if (/在庫なし|配布.*終了|配布休止|一時中止|中止/.test(text)) return "out_of_stock";
  if (/イベント|event/i.test(text)) return "event_only";
  return text ? "available" : "unknown";
}

function isSourcePageSectionBoundary(line) {
  return /マンホールマップ|関連情報|地図|お問い合わせ|このページ/.test(line);
}

function isGkpUrl(url) {
  try {
    return new URL(url).hostname.endsWith("gk-p.jp");
  } catch {
    return false;
  }
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
    .replace(/&#038;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function absolutizeUrl(url) {
  const value = cleanUrl(url).replace(/&amp;/g, "&");
  if (!value) return "";
  let resolved = value;
  if (resolved.startsWith("//")) resolved = `https:${resolved}`;
  else if (resolved.startsWith("/")) resolved = `https://www.gk-p.jp${resolved}`;
  if (resolved.startsWith("http://www.gk-p.jp")) resolved = resolved.replace("http://", "https://");

  try {
    const parsed = new URL(resolved);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
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
