import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const dataPath = join(process.cwd(), "data", "locations.json");
const cacheDir = join(process.cwd(), ".tmp", "search-pages");
const outputPath = join(process.cwd(), ".tmp", "search-official-design-name-candidates.csv");
const resultPath = join(process.cwd(), ".tmp", "search-official-manhole-card-results.csv");

const locations = JSON.parse(await readFile(dataPath, "utf8"));
await mkdir(cacheDir, { recursive: true });

const targets = locations.filter((location) =>
  !hasOfficialDesignNames(location)
  && isGkpUrl(location.stockUrl)
);

const resultRows = [];
const candidateRows = [];
const seenResultUrls = new Set();
const seenCandidates = new Set();

for (const location of targets) {
  for (const query of searchQueries(location)) {
    const results = await searchBingRss(query);

    for (const result of results) {
      const url = normalizeUrl(result.link);
      if (!url || isGkpUrl(url) || !isLikelyOfficialUrl(url, location)) continue;

      const resultKey = `${location.id}\t${url}`;
      if (!seenResultUrls.has(resultKey)) {
        seenResultUrls.add(resultKey);
        resultRows.push({
          id: location.id,
          cardName: location.cardName,
          query,
          title: result.title,
          link: url,
          description: result.description
        });
      }

      const page = await loadOfficialPage(url);
      if (!page) continue;

      for (const candidate of candidatesForLocation(location, page)) {
        const name = normalizeCandidateName(candidate.name);
        if (!name || isRejectedCandidate(location, name)) continue;

        const candidateKey = `${location.id}\t${name}\t${page.url}`;
        if (seenCandidates.has(candidateKey)) continue;
        seenCandidates.add(candidateKey);

        candidateRows.push({
          id: location.id,
          prefecture: location.prefecture,
          municipality: location.municipality,
          cardName: location.cardName,
          candidateName: name,
          confidence: candidateConfidence(candidate),
          pattern: candidate.pattern,
          sourceUrl: page.url,
          sourceLine: candidate.line,
          query
        });
      }
    }

    await sleep(350);
  }
}

candidateRows.sort((a, b) => a.id.localeCompare(b.id) || confidenceRank(b.confidence) - confidenceRank(a.confidence) || a.candidateName.localeCompare(b.candidateName));
resultRows.sort((a, b) => a.id.localeCompare(b.id) || a.link.localeCompare(b.link));

await writeCsv(outputPath, candidateRows, ["id", "prefecture", "municipality", "cardName", "candidateName", "confidence", "pattern", "sourceUrl", "sourceLine", "query"]);
await writeCsv(resultPath, resultRows, ["id", "cardName", "query", "title", "link", "description"]);

console.log(JSON.stringify({
  targets: targets.length,
  resultUrls: resultRows.length,
  candidates: candidateRows.length,
  outputPath,
  resultPath
}, null, 2));

function searchQueries(location) {
  const municipality = String(location.municipality ?? "").trim();
  const cardName = String(location.cardName ?? "").replace(/\s+[A-Z]\d{3,}/, "").trim();
  return [...new Set([
    `"${municipality}" "マンホールカード"`,
    `"${cardName}" "マンホールカード"`,
    `"${municipality}" "マンホールカード" "デザイン"`
  ].filter((query) => !/^""/.test(query)))];
}

async function searchBingRss(query) {
  const url = `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`;
  const cachePath = join(cacheDir, `rss-${createHash("sha1").update(url).digest("hex")}.xml`);

  let xml = "";
  try {
    xml = await readFile(cachePath, "utf8");
  } catch {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 compatible; official-source-audit/1.0"
      }
    });
    if (!response.ok) return [];
    xml = await response.text();
    await writeFile(cachePath, xml, "utf8");
  }

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
    const item = match[1];
    return {
      title: decodeEntities(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
      link: decodeEntities(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ""),
      description: cleanupSnippet(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "")
    };
  });
}

async function loadOfficialPage(url) {
  const cachePath = join(cacheDir, `page-${createHash("sha1").update(url).digest("hex")}.json`);

  try {
    const cached = JSON.parse(await readFile(cachePath, "utf8"));
    if (cached?.url && Array.isArray(cached.lines)) return cached;
  } catch {
    // Cache miss.
  }

  const page = await fetchOfficialPage(url);
  if (page) await writeFile(cachePath, `${JSON.stringify(page, null, 2)}\n`, "utf8");
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
    const lines = cleanupText(html).split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.some((line) => /マンホールカード/.test(line))) return null;
    return { url: response.url || url, lines };
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

function candidatesForLocation(location, page) {
  const keys = [
    location.cardName,
    location.municipality,
    location.place,
    location.address
  ].map(normalizeKey).filter((value) => value.length >= 4);

  const relatedIndexes = new Set();
  for (const [index, line] of page.lines.entries()) {
    const lineKey = normalizeKey(line);
    if (/マンホールカード|マンホール蓋|マンホールふた|デザイン|図柄|絵柄/.test(line)) relatedIndexes.add(index);
    if (keys.some((key) => lineKey.includes(key))) relatedIndexes.add(index);
  }

  const candidates = [];
  for (const index of relatedIndexes) {
    const contextLines = page.lines.slice(Math.max(0, index - 3), Math.min(page.lines.length, index + 5));
    for (const line of contextLines) {
      candidates.push(...candidatesFromLine(line));
    }
  }
  return candidates;
}

function candidatesFromLine(line) {
  const text = String(line ?? "").replace(/\s+/g, " ").trim();
  if (!text) return [];

  const patterns = [
    { regex: /[「『【]([^」』】]{2,40})[」』】](?:マンホールカード|マンホール蓋|マンホールふた)/g, name: "quoted-title" },
    { regex: /[「『【]([^」』】]{2,40})[」』】]の(?:マンホールカード|カード|マンホール蓋|マンホールふた)/g, name: "quoted-card-title" },
    { regex: /(?:デザイン|図柄|絵柄|蓋|ふた)[^「『【]{0,25}[「『【]([^」』】]{2,40})[」』】]/g, name: "quoted-after-design-word" },
    { regex: /[「『【]([^」』】]{2,40})[」』】][^。]{0,25}(?:デザイン|図柄|絵柄|描かれ|あしら|イメージ|採用)/g, name: "quoted-before-design-word" },
    { regex: /【([0-9０-９]+)】([^【】\n]{2,40})/g, name: "numbered-heading" }
  ];

  const candidates = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern.regex)) {
      candidates.push({ name: match[2] || match[1], pattern: pattern.name, line: text });
    }
  }
  return candidates;
}

function isRejectedCandidate(location, candidate) {
  const value = normalizeCandidateName(candidate);
  if (!value || value.length < 2 || value.length > 40) return true;
  if (/^(?:A|B|C|D|E|F|G|H|I|J|K|L)?\d{3}$/.test(value)) return true;
  if (/マンホールカード|配布|在庫|終了|休止|こちら|ページ|クリック|お問い合わせ|下水道|上下水道|観光|情報|公式|コレクションカード|外部サイト|PDF/.test(value)) return true;

  const candidateKey = normalizeKey(value);
  return candidateKey === normalizeKey(location.municipality) || candidateKey === normalizeKey(location.cardName);
}

function candidateConfidence(candidate) {
  if (candidate.pattern === "quoted-card-title" || candidate.pattern === "quoted-title" || candidate.pattern === "numbered-heading") return "high";
  if (/デザイン|図柄|絵柄|モチーフ|描|採用/.test(candidate.line)) return "medium";
  return "low";
}

function confidenceRank(value) {
  return { high: 3, medium: 2, low: 1 }[value] ?? 0;
}

function hasOfficialDesignNames(location) {
  return Array.isArray(location.officialDesignNames) && location.officialDesignNames.length > 0;
}

function normalizeCandidateName(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[「『【\s]+|[」』】\s]+$/g, "")
    .replace(/^(?:の|は|を|に|で|と|、|。)+/, "")
    .replace(/(?:です|します|しました|しています|について)$/g, "")
    .trim();
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

function cleanupSnippet(value) {
  return decodeEntities(String(value ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
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

function isLikelyOfficialUrl(url, location) {
  try {
    const host = new URL(url).hostname;
    if (isPrefectureLevelCard(location) && /^(?:www\.)?(?:city|town|vill)\./.test(host)) return false;
    return /\.(lg|go)\.jp$/.test(host)
      || /\.metro\.tokyo\.lg\.jp$/.test(host)
      || /(?:city|town|vill|pref)\./.test(host);
  } catch {
    return false;
  }
}

function isPrefectureLevelCard(location) {
  return normalizeKey(location?.municipality) === normalizeKey(location?.prefecture);
}

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[（）()「」『』【】\[\]・･.,、。:：\-－_]/g, "")
    .toLowerCase();
}

async function writeCsv(path, values, header) {
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
