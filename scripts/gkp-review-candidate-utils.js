import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const GKP_REVIEW_CANDIDATES_PATH = join(
  process.cwd(),
  ".tmp",
  "gkp-review-candidates.json"
);

export function createGkpReviewCandidate(existing, observed, fields) {
  const changes = {};

  for (const field of fields) {
    if (sameValue(existing?.[field], observed?.[field])) continue;
    changes[field] = {
      before: existing?.[field] ?? null,
      gkp: observed?.[field] ?? null
    };
  }

  if (Object.keys(changes).length === 0) return null;
  return {
    id: observed?.id || existing.id,
    cardName: existing.cardName,
    prefecture: existing.prefecture,
    municipality: existing.municipality,
    gkpSourceUrl: observed.sourceUrl,
    fields: changes
  };
}

export function createMissingGkpReviewCandidate(existing) {
  return {
    id: existing.id,
    cardName: existing.cardName,
    prefecture: existing.prefecture,
    municipality: existing.municipality,
    gkpSourceUrl: gkpCatalogueUrl(existing),
    fields: {
      gkpListing: {
        before: true,
        gkp: false
      }
    }
  };
}

export function createRestoredGkpReviewCandidate(existing, observed) {
  return {
    id: observed?.id || existing.id,
    cardName: existing.cardName,
    prefecture: existing.prefecture,
    municipality: existing.municipality,
    gkpSourceUrl: observed.sourceUrl || gkpCatalogueUrl(observed),
    fields: {
      gkpListing: {
        before: false,
        gkp: true
      }
    }
  };
}

export function mergeGkpReviewCandidates(...candidateLists) {
  const byId = new Map();

  for (const candidate of candidateLists.flat()) {
    if (!candidate?.id || !candidate.fields || Object.keys(candidate.fields).length === 0) continue;
    const current = byId.get(candidate.id);
    if (!current) {
      byId.set(candidate.id, structuredClone(candidate));
      continue;
    }
    Object.assign(current.fields, candidate.fields);
    if (candidate.gkpSourceUrl) current.gkpSourceUrl = candidate.gkpSourceUrl;
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "en"));
}

export async function readGkpReviewCandidates() {
  try {
    const parsed = JSON.parse(await readFile(GKP_REVIEW_CANDIDATES_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function writeGkpReviewCandidates(candidates) {
  await mkdir(dirname(GKP_REVIEW_CANDIDATES_PATH), { recursive: true });
  await writeFile(
    GKP_REVIEW_CANDIDATES_PATH,
    `${JSON.stringify(mergeGkpReviewCandidates(candidates), null, 2)}\n`,
    "utf8"
  );
}

export function formatGkpReviewCandidates(candidates, { headingLevel = 2 } = {}) {
  const heading = "#".repeat(headingLevel);
  if (candidates.length === 0) {
    return [
      `${heading} GKP要確認候補`,
      "",
      "GKPと既存レビュー済みデータの未確認差分はありません。"
    ];
  }

  const lines = [
    `${heading} GKP要確認候補（${candidates.length}件）`,
    "",
    "以下はGKPで観測した差分です。既存データには自動適用していません。公式ページを確認して採用または却下してください。"
  ];

  for (const candidate of candidates) {
    lines.push(
      "",
      `${heading}# ${candidate.id} ${candidate.cardName}（${candidate.prefecture} / ${candidate.municipality}）`
    );
    if (candidate.gkpSourceUrl) lines.push(`- GKP: ${candidate.gkpSourceUrl}`);
    for (const [field, change] of Object.entries(candidate.fields)) {
      lines.push(`- \`${field}\``);
      lines.push(`  - 現在: ${formatValue(change.before, field)}`);
      lines.push(`  - GKP候補: ${formatValue(change.gkp, field)}`);
    }
  }

  return lines;
}

function sameValue(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function formatValue(value, field) {
  if (value === null || value === undefined || value === "") return "`(なし)`";
  if (value === true) return field === "gkpListing" ? "`掲載あり`" : "`あり`";
  if (value === false) return field === "gkpListing" ? "`掲載なし`" : "`なし`";
  if (typeof value === "string") return value.replace(/\n/g, " / ");
  return `\`${JSON.stringify(value)}\``;
}

function gkpCatalogueUrl(location) {
  const prefectureCode = String(location?.id ?? "").match(/^(\d{2})-/)?.[1];
  return prefectureCode
    ? `https://www.gk-p.jp/mhcard/?pref=${prefectureCode}#mhcard_result`
    : "https://www.gk-p.jp/mhcard/";
}
