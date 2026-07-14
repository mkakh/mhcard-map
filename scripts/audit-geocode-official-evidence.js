import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const candidatePath = process.env.GEOCODE_CANDIDATE_REPORT_JSON_PATH || join(process.cwd(), ".tmp", "geocode-precision-candidate-review.json");
const cachePath = process.env.GEOCODE_CANDIDATE_CACHE_PATH || join(process.cwd(), ".tmp", "geocode-candidate-cache.json");
const outputPath = process.env.GEOCODE_OFFICIAL_EVIDENCE_PATH || join(process.cwd(), ".tmp", "geocode-official-evidence.json");
const candidates = JSON.parse(await readFile(candidatePath, "utf8"));
const cache = JSON.parse(await readFile(cachePath, "utf8"));

const rows = candidates.map((candidate) => {
  const searchedOfficialUrls = candidate.officialSearchCandidates
    .map((result) => result.url)
    .filter(isLikelyGovernmentUrl);
  const pages = [...new Set([...candidate.officialUrlCandidates, ...searchedOfficialUrls])].map((url) => {
    const page = cache.officialPages?.[url] ?? {};
    const text = normalizedPageText(page.text || "");
    const placeTokens = meaningfulPlaceTokens(candidate.place);
    const addressTokens = meaningfulAddressTokens(candidate.address || candidate.geocodeQuery);
    const placeMatches = placeTokens.filter((token) => text.includes(token));
    const addressMatches = addressTokens.filter((token) => text.includes(token));
    const cardMention = text.includes(normalize("マンホールカード"));
    const municipalityMention = text.includes(normalize(candidate.cardName).replace(/[A-Z]\d{3}.*/, "")) ||
      text.includes(normalize(candidate.id.slice(0, 6)));
    return {
      url,
      status: page.status || 0,
      cardMention,
      municipalityMention,
      placeTokens,
      placeMatches,
      addressTokens,
      addressMatches,
      score: (cardMention ? 5 : 0) + placeMatches.length * 3 + addressMatches.length * 2
    };
  }).sort((a, b) => b.score - a.score);

  const cardEvidence = pages.find((page) => page.cardMention) ?? null;
  const placeEvidence = pages.find((page) => page.placeMatches.length > 0 || page.addressMatches.length > 0) ?? null;
  return {
    id: candidate.id,
    target: candidate.target,
    targetId: candidate.targetId,
    place: candidate.place,
    address: candidate.address,
    evidence: pages[0] ?? null,
    verifiedAcrossOfficialPages: Boolean(cardEvidence && placeEvidence),
    cardEvidence,
    placeEvidence,
    pages
  };
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  rows: rows.length,
  verifiedAcrossOfficialPages: rows.filter((row) => row.verifiedAcrossOfficialPages).length,
  missingCardEvidence: rows.filter((row) => !row.cardEvidence).length,
  missingPlaceEvidence: rows.filter((row) => !row.placeEvidence).length,
  outputPath
}, null, 2));

function normalizedPageText(html) {
  return normalize(String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;|&#38;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"'));
}

function isLikelyGovernmentUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (hostname.endsWith(".go.jp") || hostname.endsWith(".lg.jp")) return true;
    return hostname.endsWith(".jp") && hostname.split(".").some((label) =>
      /(?:^|-)(?:city|town|vill|village|pref)(?:$|-)/.test(label)
    );
  } catch {
    return false;
  }
}

function meaningfulPlaceTokens(value) {
  const normalized = String(value || "")
    .normalize("NFKC")
    .replace(/【[^】]*】/g, " ")
    .replace(/[「」（）()［］\[\]・,，、]/g, " ")
    .replace(/(?:受付|窓口|守衛室|管理人室|地域情報コーナー|1階|2階|3階|4階|5階|6階|F)$/g, " ");
  const tokens = normalized.split(/\s+/).map(normalize).filter((token) => token.length >= 3);
  return [...new Set([normalize(normalized), ...tokens].filter((token) => token.length >= 3))];
}

function meaningfulAddressTokens(value) {
  const normalized = normalize(String(value || "")
    .replace(/^(?:所在地|住所|平日)[:：]/, "")
    .replace(/[（(].*?[）)]/g, ""));
  const withoutPrefecture = normalized.replace(/^(北海道|東京都|京都府|大阪府|.{2,3}県)/, "");
  const withoutBuilding = withoutPrefecture.replace(/(?:ビル|センター|庁舎|会館|タワー|タワ-|階).*$/, "");
  return [...new Set([withoutPrefecture, withoutBuilding].filter((token) => token.length >= 5))];
}

function normalize(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, "").replace(/[‐‑‒–—―ー−]/g, "-");
}
