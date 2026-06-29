import { mkdir, readFile, writeFile } from "node:fs/promises";
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
    const imageUrl = firstMatch(imageHtml, /<img[^>]+src=["']([^"']+)["']/i);
    const sourceUrl = firstMatch(distributionHtml, /<a[^>]+href=["']([^"']+)["']/i);
    const place = cleanupText(firstMatch(distributionHtml, /<a[^>]*>([\s\S]*?)<\/a>/i)) || firstMeaningfulLine(distributionHtml);
    const address = findAddress(distributionText, prefecture);
    const [lat, lng] = approximateCoordinate(baseLat, baseLng, prefectureIndex);
    const id = `${code}-${slugify(municipality)}-${String(prefectureIndex + 1).padStart(3, "0")}`;

    locations.push({
      id,
      cardName: cardCode ? `${municipality.replace(/\s*[（(][^）)]+[）)]\s*/g, "").trim()} ${cardCode}` : municipality,
      prefecture,
      municipality: municipality.replace(/\s*（[^）]+）\s*/g, "").replace(/\s*\([^)]*\)\s*/g, "").trim(),
      place,
      address,
      lat,
      lng,
      mapcode: "",
      mapcodeStatus: "未登録",
      hours: cleanupText(hoursHtml),
      closed: "要確認",
      condition: "GKP掲載情報を確認",
      stock: cleanupText(stockHtml) || "不明",
      status: cleanupText(stockHtml).includes("配布終了") ? "休止中" : "配布中",
      sourceUrl: absolutizeUrl(sourceUrl) || `https://www.gk-p.jp/mhcard/?pref=${code}#mhcard_result`,
      imageUrl: absolutizeUrl(imageUrl),
      series,
      issuedOn,
      sourceType: "gkp_prefecture_page",
      coordinateAccuracy: "prefecture_approx",
      updatedAt: "2026-06-29"
    });

    prefectureIndex += 1;
  }
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

function findAddress(text, prefecture) {
  return text.split("\n").find((line) => line.includes(prefecture)) ?? "";
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

function absolutizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http://www.gk-p.jp")) return url.replace("http://", "https://");
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `https://www.gk-p.jp${url}`;
  return url;
}

function approximateCoordinate(baseLat, baseLng, index) {
  const ring = Math.floor(index / 12) + 1;
  const angle = ((index % 12) / 12) * Math.PI * 2;
  const radius = 0.08 * ring;
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
