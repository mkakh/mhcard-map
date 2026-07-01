import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const prefectures = [
  ["01", "北海道", 43.0642, 141.3469],
  ["02", "青森県", 40.8244, 140.74],
  ["03", "岩手県", 39.7036, 141.1527],
  ["04", "宮城県", 38.2688, 140.8721],
  ["05", "秋田県", 39.7186, 140.1024],
  ["06", "山形県", 38.2404, 140.3633],
  ["07", "福島県", 37.7503, 140.4676],
  ["08", "茨城県", 36.3418, 140.4468],
  ["09", "栃木県", 36.5657, 139.8836],
  ["10", "群馬県", 36.3912, 139.0609],
  ["11", "埼玉県", 35.8569, 139.6489],
  ["12", "千葉県", 35.6046, 140.1233],
  ["13", "東京都", 35.6895, 139.6917],
  ["14", "神奈川県", 35.4478, 139.6425],
  ["15", "新潟県", 37.9026, 139.0236],
  ["16", "富山県", 36.6953, 137.2113],
  ["17", "石川県", 36.5947, 136.6256],
  ["18", "福井県", 36.0652, 136.2216],
  ["19", "山梨県", 35.6642, 138.5684],
  ["20", "長野県", 36.6513, 138.181],
  ["21", "岐阜県", 35.3912, 136.7223],
  ["22", "静岡県", 34.9769, 138.3831],
  ["23", "愛知県", 35.1802, 136.9066],
  ["24", "三重県", 34.7303, 136.5086],
  ["25", "滋賀県", 35.0045, 135.8686],
  ["26", "京都府", 35.0211, 135.7556],
  ["27", "大阪府", 34.6863, 135.52],
  ["28", "兵庫県", 34.6913, 135.183],
  ["29", "奈良県", 34.6851, 135.8048],
  ["30", "和歌山県", 34.226, 135.1675],
  ["31", "鳥取県", 35.5039, 134.2383],
  ["32", "島根県", 35.4723, 133.0505],
  ["33", "岡山県", 34.6618, 133.935],
  ["34", "広島県", 34.3963, 132.4594],
  ["35", "山口県", 34.1859, 131.4714],
  ["36", "徳島県", 34.0658, 134.5593],
  ["37", "香川県", 34.3401, 134.0434],
  ["38", "愛媛県", 33.8416, 132.7661],
  ["39", "高知県", 33.5597, 133.5311],
  ["40", "福岡県", 33.6064, 130.4181],
  ["41", "佐賀県", 33.2494, 130.2988],
  ["42", "長崎県", 32.7448, 129.8737],
  ["43", "熊本県", 32.7898, 130.7417],
  ["44", "大分県", 33.2382, 131.6126],
  ["45", "宮崎県", 31.9111, 131.4239],
  ["46", "鹿児島県", 31.5602, 130.5581],
  ["47", "沖縄県", 26.2124, 127.6809]
];

const htmlDir = join(process.cwd(), ".tmp", "gkp");
const outputPath = join(process.cwd(), "data", "locations.json");
const today = new Date().toISOString().slice(0, 10);
const existingLocations = await readExistingLocations();
const existingById = new Map(existingLocations.map((location) => [location.id, location]));
const existingByImageKey = new Map(
  existingLocations
    .map((location) => [imageKey(location.imageUrl), location])
    .filter(([key]) => key)
);

const locations = [];
await mkdir(htmlDir, { recursive: true });

for (const [code, prefecture, baseLat, baseLng] of prefectures) {
  const html = await readPrefectureHtml(code);
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  let prefectureIndex = 0;

  for (const row of rows) {
    if (!row.includes("<td")) continue;
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
    if (cells.length < 7) continue;

    const [municipalityHtml, imageHtml, seriesHtml, issuedHtml, distributionHtml, hoursHtml, stockHtml] = cells.slice(-7);
    const municipality = cleanupText(municipalityHtml).replace(/\n+/g, " ");
    const cardCode = extractCardCode(municipality);
    const series = cleanupText(seriesHtml);
    const issuedOn = cleanupText(issuedHtml);
    const distributionText = cleanupText(distributionHtml);
    const imageUrl = absolutizeUrl(firstMatch(imageHtml, /<img[^>]+src=["']([^"']+)["']/i));
    const sourceUrl = firstMatch(distributionHtml, /<a[^>]+href=["']([^"']+)["']/i);
    const place = cleanupText(firstMatch(distributionHtml, /<a[^>]*>([\s\S]*?)<\/a>/i)) || firstMeaningfulLine(distributionHtml);
    const municipalityName = municipality.replace(/\s*（[^）]+）\s*/g, "").replace(/\s*\([^)]*\)\s*/g, "").trim();
    const address = findAddress(distributionText, prefecture, municipalityName);
    const distributionPlaces = extractDistributionPlaces({
      distributionHtml,
      hoursHtml,
      fallbackPlace: place,
      fallbackAddress: address,
      municipalityName,
      prefecture
    });
    const [lat, lng] = approximateCoordinate(baseLat, baseLng, prefectureIndex);
    const legacyId = `${code}-${slugify(municipality)}-${String(prefectureIndex + 1).padStart(3, "0")}`;
    const id = stableLocationId(imageUrl, legacyId);
    const stock = cleanupText(stockHtml) || "不明";

    const location = {
      id,
      cardName: cardCode ? `${municipality.replace(/\s*[（(][^）)]+[）)]\s*/g, "").trim()} ${cardCode}` : municipality,
      prefecture,
      municipality: municipalityName,
      place,
      address,
      lat,
      lng,
      hours: cleanupText(hoursHtml),
      closed: "要確認",
      condition: "GKP掲載情報を確認",
      stock,
      status: isDistributionStopped(stock, distributionText) ? "休止中" : "配布中",
      sourceUrl: absolutizeUrl(sourceUrl) || `https://www.gk-p.jp/mhcard/?pref=${code}#mhcard_result`,
      imageUrl: absolutizeUrl(imageUrl),
      series,
      issuedOn,
      sourceType: "gkp_prefecture_page",
      coordinateAccuracy: "prefecture_approx",
      updatedAt: today
    };
    if (distributionPlaces.length > 1) location.distributionPlaces = distributionPlaces;
    locations.push(location);

    prefectureIndex += 1;
  }
}

for (const location of locations) {
  const existing = existingById.get(location.id) ?? existingByImageKey.get(imageKey(location.imageUrl));
  if (!existing) continue;

  const legacyIds = [...new Set(existing.legacyIds ?? [])];
  if (legacyIds.length > 0) location.legacyIds = legacyIds;
  mergeGeneratedDistributionPlaces(location, existing);
  if (hasSameImportedContent(existing, location)) location.updatedAt = existing.updatedAt || today;
}

await mkdir(join(process.cwd(), "data"), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(locations, null, 2)}\n`, "utf8");
console.log(`Wrote ${locations.length} locations to ${outputPath}`);

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

function firstMatch(value, pattern) {
  return value.match(pattern)?.[1] ?? "";
}

function firstMeaningfulLine(html) {
  return cleanupText(html).split("\n").find((line) => !line.startsWith("電話")) ?? "配布場所要確認";
}

function extractDistributionPlaces({ distributionHtml, hoursHtml, fallbackPlace, fallbackAddress, municipalityName, prefecture }) {
  const placeLines = parseLinkedLines(distributionHtml).filter((line) => !isDistributionNoise(line.text));
  const hourGroups = parseHourGroups(cleanupText(hoursHtml));
  const places = [];
  let currentUrl = "";
  let currentDays = "";
  let pending = null;

  for (const line of placeLines) {
    if (line.url) currentUrl = line.url;
    const pureDays = pureDaysMarker(line.text);
    if (pureDays) {
      currentDays = pureDays;
      continue;
    }

    if (pending && !hasPlaceMarker(line.text) && isAddressOnlyLine(line.text, municipalityName, prefecture)) {
      places.push(placeFromParsed({
        parsed: { ...pending, address: line.text },
        hourGroups,
        index: places.length,
        url: currentUrl,
        fallbackAddress
      }));
      pending = null;
      continue;
    }

    const parsed = parsePlaceLine(line.text, municipalityName, prefecture, currentDays);
    if (!parsed) continue;
    if (parsed.address) {
      places.push(placeFromParsed({ parsed, hourGroups, index: places.length, url: line.url || currentUrl, fallbackAddress }));
      pending = null;
    } else if (line.url || parsed.marker || parsed.days) {
      pending = { ...parsed, url: line.url || currentUrl };
    }
  }

  if (places.length === 0 && fallbackPlace) {
    const schedule = hourGroups[0] ?? {};
    places.push({
      id: distributionPlaceId(fallbackPlace, fallbackAddress),
      name: fallbackPlace,
      address: fallbackAddress,
      days: schedule.days || "",
      hours: schedule.hours || cleanupText(hoursHtml),
      closed: schedule.closed || "",
      url: absolutizeUrl(firstMatch(distributionHtml, /<a[^>]+href=["']([^"']+)["']/i))
    });
  }

  return dedupeDistributionPlaces(places);
}

function placeFromParsed({ parsed, hourGroups, index, url, fallbackAddress }) {
  const schedule = scheduleForPlace(parsed.marker, parsed.days, hourGroups, index);
  const address = parsed.address || fallbackAddress;
  return {
    id: distributionPlaceId(parsed.name, address),
    name: parsed.name,
    address,
    days: parsed.days || schedule.days,
    hours: schedule.hours,
    closed: schedule.closed,
    url: absolutizeUrl(parsed.url || url)
  };
}

function parseLinkedLines(html) {
  return String(html ?? "")
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_, attrs, label) => {
      const url = firstMatch(attrs, /href=["']([^"']+)["']/i);
      return `\n[[LINK:${url}|${cleanupText(label)}]]\n`;
    })
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((raw) => decodeEntities(raw).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((text) => {
      const linked = text.match(/^\[\[LINK:(.*?)\|(.*?)\]\]$/);
      return linked ? { text: linked[2].trim(), url: absolutizeUrl(linked[1]) } : { text, url: "" };
    });
}

function parsePlaceLine(line, municipalityName, prefecture, currentDays = "") {
  const markerMatch = line.match(/^(?:([①-⑳])|([0-9]+)[.)）]|【([^】]+)】)\s*(.+)$/);
  const marker = markerMatch?.[1] || markerMatch?.[2] || "";
  const days = markerMatch?.[3] || currentDays;
  const body = markerMatch ? markerMatch[4].trim() : line.trim();
  if (!body || isDistributionNoise(body)) return null;
  if (!hasAddressPattern(body, municipalityName, prefecture)) {
    return {
      marker,
      days: normalizeDays(days),
      name: body,
      address: ""
    };
  }

  const split = splitNameAndAddress(body, municipalityName, prefecture);
  return {
    marker,
    days: normalizeDays(days),
    name: split.name,
    address: split.address
  };
}

function splitNameAndAddress(value, municipalityName, prefecture) {
  const text = value.replace(/^[:：\s]+/, "").trim();
  const addressIndex = firstAddressIndex(text, municipalityName, prefecture);
  if (addressIndex > 0) {
    return {
      name: text.slice(0, addressIndex).trim(),
      address: normalizeAddress(text.slice(addressIndex).trim())
    };
  }
  return { name: text, address: "" };
}

function firstAddressIndex(text, municipalityName, prefecture) {
  const candidates = [
    ...allIndexes(text, prefecture),
    ...allIndexes(text, municipalityName),
    ...municipalityName.split(/\s+/).filter(Boolean).flatMap((token) => allIndexes(text, token))
  ]
    .filter(Boolean)
    .filter((index) => index > 0);
  return candidates.length > 0 ? Math.min(...candidates) : -1;
}

function allIndexes(text, token) {
  if (!token) return [];
  const indexes = [];
  let index = text.indexOf(token);
  while (index !== -1) {
    indexes.push(index);
    index = text.indexOf(token, index + token.length);
  }
  return indexes;
}

function pureDaysMarker(line) {
  const match = line.match(/^【([^】]+)】$/);
  return match ? normalizeDays(match[1]) : "";
}

function hasPlaceMarker(line) {
  return /^(?:[①-⑳]|[0-9]+[.)）]|【[^】]+】)/.test(line);
}

function isAddressOnlyLine(line, municipalityName, prefecture) {
  if (isDistributionNoise(line)) return false;
  if (line.includes("電話")) return false;
  if (line.length > 80) return false;
  return hasAddressPattern(line, municipalityName, prefecture);
}

function hasAddressPattern(line, municipalityName, prefecture) {
  const text = normalizeAddress(line);
  if (!/[0-9０-９一二三四五六七八九十]/.test(text)) return false;
  return firstAddressIndex(` ${text}`, municipalityName, prefecture) > 0 || text.includes(prefecture);
}

function parseHourGroups(text) {
  const groups = [];
  let currentDays = "";
  let current = null;

  for (const rawLine of text.split("\n").map((line) => line.trim()).filter(Boolean)) {
    const markerMatch = rawLine.match(/^(?:([①-⑳])|([0-9]+)[.)）]|【([^】]+)】)\s*(.*)$/);
    if (markerMatch) {
      const marker = markerMatch[1] || markerMatch[2] || "";
      const days = normalizeDays(markerMatch[3] || currentDays);
      if (markerMatch[3]) currentDays = days;
      current = {
        marker,
        days,
        hours: markerMatch[4].trim(),
        closed: ""
      };
      groups.push(current);
      continue;
    }

    if (!current) {
      current = { marker: "", days: "", hours: rawLine, closed: "" };
      groups.push(current);
    } else if (isClosedLine(rawLine)) {
      current.closed = appendText(current.closed, cleanupClosedLine(rawLine));
    } else {
      current.hours = appendText(current.hours, rawLine);
    }
  }

  return groups;
}

function scheduleForPlace(marker, days, groups, index) {
  const byMarker = marker ? groups.find((group) => group.marker === marker) : null;
  const byDays = days ? groups.find((group) => group.days === days && !group.marker) : null;
  const fallback = groups[index] ?? groups.find((group) => !group.marker) ?? {};
  return byMarker ?? byDays ?? fallback;
}

function mergeGeneratedDistributionPlaces(location, existing) {
  if (!Array.isArray(location.distributionPlaces) || !Array.isArray(existing.distributionPlaces)) return;
  const existingById = new Map(existing.distributionPlaces.map((place) => [place.id, place]));
  location.distributionPlaces = location.distributionPlaces.map((place) => {
    const previous = existingById.get(place.id);
    if (!previous) return place;
    if (normalizePlaceKey(previous.address) !== normalizePlaceKey(place.address)) return place;
    return {
      ...place,
      ...pickComputedPlaceFields(previous)
    };
  });
}

function pickComputedPlaceFields(place) {
  return Object.fromEntries(
    ["lat", "lng", "plusCode", "coordinateAccuracy", "geocodeQuery", "geocodeTitle", "geocodedAt", "geocodeError"]
      .filter((field) => place[field] !== undefined)
      .map((field) => [field, place[field]])
  );
}

function dedupeDistributionPlaces(places) {
  const seenKeys = new Set();
  const seenIds = new Set();
  return places
    .filter((place) => place.name && place.address)
    .map((place) => ({
      ...place,
      address: normalizeAddress(place.address),
      hours: normalizeTimeText(place.hours),
      closed: normalizeClosedText(place.closed)
    }))
    .filter((place) => {
      const key = `${place.name}\n${place.address}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      if (seenIds.has(place.id)) place.id = distributionPlaceId(`${place.name}\n${place.days}`, place.address, true);
      seenIds.add(place.id);
      return true;
    });
}

function distributionPlaceId(name, address, includeName = false) {
  const source = includeName
    ? `${normalizePlaceKey(address)}\n${normalizePlaceKey(name)}`
    : normalizePlaceKey(address || name);
  return `place-${createHash("sha1").update(source).digest("hex").slice(0, 10)}`;
}

function normalizePlaceKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[‐‑‒–—―ー−]/g, "-")
    .toLowerCase();
}

function normalizeAddress(value) {
  let normalized = String(value ?? "")
    .replace(/^<\w+/i, "")
    .replace(/^[:：\s]+/, "")
    .replace(/[‐‑‒–—―ー−]/g, "-")
    .trim();
  if (/^[（(].*[）)]$/.test(normalized)) {
    normalized = normalized.replace(/^[（(]\s*/, "").replace(/\s*[）)]$/, "");
  }
  return normalized;
}

function normalizeDays(value) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/休日/g, "土日祝日")
    .replace(/祝祭日/g, "祝日")
    .trim();
}

function normalizeTimeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeClosedText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function appendText(previous, next) {
  return [previous, next].filter(Boolean).join(" ");
}

function isClosedLine(line) {
  return /(ただし|休み|お休み|休館|休業|定休|年末年始|閉庁)/.test(line);
}

function cleanupClosedLine(line) {
  return line.replace(/^ただし、?/, "").trim();
}

function isDistributionNoise(line) {
  return /^(電話|TEL|FAX|問合せ|問い合わせ|お問い合わせ|詳細|こちらから|※|ただし|配布時間|配布条件)/i.test(line);
}

function findAddress(text, prefecture, municipality) {
  const municipalityTokens = municipality
    .split(/\s+/)
    .map((token) => token.replace(/[（(][^）)]+[）)]/g, "").trim())
    .filter(Boolean);

  const candidates = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      line,
      score: scoreAddressLine(line, prefecture, municipalityTokens)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.line ?? "";
}

function scoreAddressLine(line, prefecture, municipalityTokens) {
  if (isNonAddressLine(line)) return 0;

  let score = 0;
  if (line.includes(prefecture)) score += 100;
  if (municipalityTokens.some((token) => token && line.includes(token))) score += 80;
  if (/[市区町村郡]/.test(line)) score += 18;
  if (/[0-9０-９]/.test(line)) score += 12;
  if (/(丁目|番地|番|号|条|西|東|南|北)/.test(line)) score += 18;
  if (/(ビル|会館|センター|庁舎|役所|駅|階|F)/i.test(line)) score += 4;
  if (line.length < 5) score -= 20;
  if (line.length > 80) score -= 35;

  return score >= 30 ? score : 0;
}

function isNonAddressLine(line) {
  return /^(電話|TEL|FAX|※|ただし|なお|詳しく|詳細|こちら|配布|在庫|休館|開館|営業時間|問い合わせ|お問い合わせ|平日|土日|祝日)/i.test(line);
}

function isDistributionStopped(stock, distributionText) {
  return /配布終了|配布を一時中止|配布休止|一時中止|中止しています/.test(`${stock}\n${distributionText}`);
}

function extractCardCode(value) {
  return value.match(/[（(]([A-Z0-9-]+)[）)]/)?.[1] ?? "";
}

function slugify(value) {
  return value
    .normalize("NFKC")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function stableLocationId(imageUrl, fallback) {
  return imageKey(imageUrl) || fallback;
}

function imageKey(imageUrl) {
  const fileName = String(imageUrl ?? "").split("/").pop() ?? "";
  return fileName
    .replace(/\.[^.]+$/, "")
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function hasSameImportedContent(existing, next) {
  const keys = [
    "cardName",
    "prefecture",
    "municipality",
    "place",
    "address",
    "hours",
    "closed",
    "condition",
    "stock",
    "status",
    "sourceUrl",
    "imageUrl",
    "series",
    "issuedOn",
    "sourceType",
    "distributionPlaces"
  ];
  return keys.every((key) => String(existing[key] ?? "") === String(next[key] ?? ""));
}

function absolutizeUrl(url) {
  const value = String(url ?? "").trim();
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

function approximateCoordinate(baseLat, baseLng, index) {
  const ring = Math.floor(index / 12) + 1;
  const angle = ((index % 12) / 12) * Math.PI * 2;
  const radius = 0.025 * ring;
  return [
    Number((baseLat + Math.sin(angle) * radius).toFixed(6)),
    Number((baseLng + Math.cos(angle) * radius).toFixed(6))
  ];
}

async function readPrefectureHtml(code) {
  const filePath = join(htmlDir, `pref-${code}.html`);
  try {
    return await readFile(filePath, "utf8");
  } catch {
    const url = `https://www.gk-p.jp/mhcard/?pref=${code}#mhcard_result`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }
    const html = await response.text();
    await writeFile(filePath, html, "utf8");
    await new Promise((resolve) => setTimeout(resolve, 150));
    return html;
  }
}

async function readExistingLocations() {
  try {
    const parsed = JSON.parse(await readFile(outputPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
