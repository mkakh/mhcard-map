import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const dataPath = join(process.cwd(), "data", "locations.json");
const cacheDir = join(process.cwd(), ".tmp", "official-pages");
const outputPath = join(process.cwd(), ".tmp", "official-design-name-candidates.csv");

const locations = JSON.parse(await readFile(dataPath, "utf8"));
await mkdir(cacheDir, { recursive: true });

const sourceUrls = [...new Set(locations.flatMap(sourceUrlsForLocation))];
const pages = new Map();

await mapWithConcurrency(sourceUrls, 8, async (url) => {
  const page = await loadOfficialPage(url);
  if (page) pages.set(url, page);
});

const rows = [];

for (const location of locations) {
  const existingNames = Array.isArray(location.officialDesignNames) ? location.officialDesignNames : [];
  const urls = sourceUrlsForLocation(location);

  for (const url of urls) {
    const page = pages.get(url);
    if (!page) continue;

    for (const candidate of candidatesForLocation(location, page)) {
      const normalizedName = normalizeCandidateName(candidate.name);
      if (!normalizedName) continue;
      if (isRejectedCandidate(location, normalizedName)) continue;

      const row = {
        id: location.id,
        prefecture: location.prefecture,
        municipality: location.municipality,
        cardName: location.cardName,
        candidateName: normalizedName,
        status: existingNames.includes(normalizedName) ? "採用済み" : "未判定",
        confidence: candidateConfidence(candidate),
        pattern: candidate.pattern,
        sourceUrl: page.url || url,
        sourceLine: candidate.line,
        context: candidate.context
      };
      const existingIndex = rows.findIndex((value) => value.id === row.id && value.candidateName === row.candidateName && value.sourceUrl === row.sourceUrl);
      if (existingIndex === -1) rows.push(row);
      else if (candidateRank(row) > candidateRank(rows[existingIndex])) rows[existingIndex] = row;
    }
  }
}

rows.sort((a, b) => a.id.localeCompare(b.id) || b.status.localeCompare(a.status) || a.candidateName.localeCompare(b.candidateName));

await writeCsv(outputPath, rows);

console.log(JSON.stringify({
  pagesRequested: sourceUrls.length,
  pagesLoaded: pages.size,
  candidates: rows.length,
  outputPath
}, null, 2));

function sourceUrlsForLocation(location) {
  return [...new Set([
    location.stockUrl,
    location.conditionUrl
  ].map(normalizeUrl).filter((url) => url && !isGkpUrl(url) && isLikelyOfficialUrl(url)))];
}

async function loadOfficialPage(url) {
  const cachePath = join(cacheDir, `${createHash("sha1").update(url).digest("hex")}.json`);

  try {
    const cached = JSON.parse(await readFile(cachePath, "utf8"));
    if (cached?.url && Array.isArray(cached.lines)) return cached;
  } catch {
    // Cache miss.
  }

  const page = await fetchOfficialPage(url);
  if (page) await writeFile(cachePath, `${JSON.stringify(page, null, 2)}\n`, "utf8");
  await new Promise((resolve) => setTimeout(resolve, 80));
  return page;
}

async function fetchOfficialPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) return null;
    const html = await decodeResponseText(response);
    const text = cleanupText(html);
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    if (!lines.some((line) => /マンホールカード/.test(line))) return null;
    return { url: response.url || url, lines };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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

function candidatesForLocation(location, page) {
  const relatedIndexes = relatedLineIndexes(location, page.lines);
  const candidates = [];

  for (const index of relatedIndexes) {
    const contextLines = page.lines.slice(Math.max(0, index - 4), Math.min(page.lines.length, index + 7));
    for (const [offset, line] of contextLines.entries()) {
      const actualIndex = Math.max(0, index - 4) + offset;
      for (const candidate of candidatesFromLine(line)) {
        candidates.push({
          ...candidate,
          context: compactContext(page.lines, actualIndex)
        });
      }
    }
  }

  return candidates;
}

function relatedLineIndexes(location, lines) {
  const keys = [
    location.cardName,
    location.municipality,
    location.place,
    location.address,
    ...(Array.isArray(location.distributionPlaces) ? location.distributionPlaces.flatMap((place) => [place.name, place.address]) : [])
  ].map(normalizeKey).filter((value) => value.length >= 4);

  const uniqueIndexes = new Set();
  for (const [index, line] of lines.entries()) {
    const lineKey = normalizeKey(line);
    if (/マンホールカード|マンホール蓋|マンホールふた|デザイン|図柄|絵柄|英語版/.test(line)) uniqueIndexes.add(index);
    if (keys.some((key) => lineKey.includes(key))) uniqueIndexes.add(index);
  }
  return [...uniqueIndexes].sort((a, b) => a - b);
}

function candidatesFromLine(line) {
  const candidates = [];
  const text = String(line ?? "").replace(/\s+/g, " ").trim();
  if (!text) return candidates;

  const quotedPatterns = [
    { regex: /[「『【]([^」』】]{2,40})[」』】](?:マンホールカード|マンホール蓋|マンホールふた)/g, name: "quoted-title" },
    { regex: /[「『【]([^」』】]{2,40})[」』】]の(?:マンホールカード|カード|マンホール蓋|マンホールふた)/g, name: "quoted-card-title" },
    { regex: /(?:デザイン|図柄|絵柄|蓋|ふた)[^「『【]{0,25}[「『【]([^」』】]{2,40})[」』】]/g, name: "quoted-after-design-word" },
    { regex: /[「『【]([^」』】]{2,40})[」』】][^。]{0,25}(?:デザイン|図柄|絵柄|描かれ|あしら|イメージ)/g, name: "quoted-before-design-word" }
  ];

  for (const pattern of quotedPatterns) {
    for (const match of text.matchAll(pattern.regex)) {
      candidates.push({ name: match[1], pattern: pattern.name, line: text });
    }
  }

  if (/マンホールカード|マンホール蓋|マンホールふた/.test(text)) {
    for (const match of text.matchAll(/[「『【]([^」』】]{2,40})[」』】]/g)) {
      candidates.push({ name: match[1], pattern: "quoted-in-card-line", line: text });
    }
  }

  const labelPatterns = [
    { regex: /(?:デザイン|図柄|絵柄)[:：]\s*([^。｜|、,]{2,40})/g, name: "design-label" },
    { regex: /(?:カード名|名称)[:：]\s*([^。｜|、,]{2,40})/g, name: "name-label" },
    { regex: /(?:マンホール蓋|マンホールふた)[:：]\s*([^。｜|、,]{2,40})/g, name: "lid-label" }
  ];

  for (const pattern of labelPatterns) {
    for (const match of text.matchAll(pattern.regex)) {
      candidates.push({ name: match[1], pattern: pattern.name, line: text });
    }
  }

  return candidates;
}

function isRejectedCandidate(location, candidate) {
  const value = normalizeCandidateName(candidate);
  if (!value) return true;
  if (value.length < 2 || value.length > 40) return true;
  if (/^(?:A|B|C|D|E|F|G|H|I|J|K|L)?\d{3}$/.test(value)) return true;
  if (/^(?:第)?[0-9０-９一二三四五六七八九十]+弾$/.test(value)) return true;
  if (/マンホールカード|配布|在庫|終了|休止|こちら|ページ|クリック|お問い合わせ|下水道|上下水道|観光|情報|公式|コレクションカード|外部サイト|PDF/.test(value)) return true;

  const municipality = normalizeKey(location.municipality);
  const cardName = normalizeKey(location.cardName);
  const candidateKey = normalizeKey(value);
  if (candidateKey === municipality || candidateKey === cardName) return true;

  return false;
}

function normalizeCandidateName(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[「『\s]+|[」』\s]+$/g, "")
    .replace(/^(?:の|は|を|に|で|と|、|。)+/, "")
    .replace(/(?:です|します|しました|しています|について)$/g, "")
    .trim();
}

function compactContext(lines, index) {
  return lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 2)).join(" / ");
}

function candidateRank(row) {
  const confidenceRanks = { high: 100, medium: 50, low: 0 };
  const ranks = {
    "quoted-card-title": 5,
    "quoted-title": 4,
    "quoted-before-design-word": 3,
    "quoted-after-design-word": 3,
    "design-label": 2,
    "name-label": 2,
    "lid-label": 2,
    "quoted-in-card-line": 1
  };
  return (row.status === "採用済み" ? 1000 : 0) + (confidenceRanks[row.confidence] ?? 0) + (ranks[row.pattern] ?? 0);
}

function candidateConfidence(candidate) {
  if (candidate.pattern === "quoted-card-title" || candidate.pattern === "quoted-title") return "high";
  if (/デザイン|図柄|絵柄|モチーフ|描/.test(candidate.line)) return "medium";
  return "low";
}

async function writeCsv(path, values) {
  const header = ["id", "prefecture", "municipality", "cardName", "candidateName", "status", "confidence", "pattern", "sourceUrl", "sourceLine", "context"];
  const csv = "\uFEFF" + [
    header,
    ...values.map((row) => header.map((field) => row[field] ?? ""))
  ].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
  await writeFile(path, csv, "utf8");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

async function decodeResponseText(response) {
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const contentType = response.headers.get("content-type") ?? "";
  const charset = contentType.match(/charset=([^;\s]+)/i)?.[1]?.trim();
  const utf8Text = new TextDecoder("utf-8").decode(bytes);
  const htmlCharset = utf8Text.match(/<meta[^>]+charset=["']?([^"'\s/>]+)/i)?.[1]?.trim();
  const detected = charset || htmlCharset;
  if (!detected || /utf-?8/i.test(detected)) return utf8Text;

  try {
    return new TextDecoder(detected).decode(bytes);
  } catch {
    return utf8Text;
  }
}

function cleanupText(html) {
  return decodeEntities(
    String(html ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h[1-6]>/gi, "\n")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
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

function normalizeUrl(url) {
  const value = String(url ?? "").trim().replace(/\s+/g, "");
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function isGkpUrl(url) {
  try {
    return new URL(url).hostname.endsWith("gk-p.jp");
  } catch {
    return false;
  }
}

function isLikelyOfficialUrl(url) {
  try {
    const host = new URL(url).hostname;
    return /\.(lg|go)\.jp$/.test(host)
      || /\.metro\.tokyo\.lg\.jp$/.test(host)
      || /(?:city|town|vill|pref)\./.test(host)
      || /city\.[^.]+\.lg\.jp$/.test(host)
      || /town\.[^.]+\.lg\.jp$/.test(host);
  } catch {
    return false;
  }
}

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[（）()「」『』【】\[\]・･.,、。:：\-－_]/g, "")
    .toLowerCase();
}
