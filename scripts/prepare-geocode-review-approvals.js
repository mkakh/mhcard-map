import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const csvPath = process.env.GEOCODE_CANDIDATE_OUTPUT_PATH || join(process.cwd(), ".tmp", "geocode-precision-candidate-review.csv");
const decisionsPath = process.env.GEOCODE_APPROVAL_DECISIONS_PATH || join(process.cwd(), ".tmp", "geocode-approval-decisions.json");
const rows = parseCsv(await readFile(csvPath, "utf8"));
const decisions = JSON.parse(await readFile(decisionsPath, "utf8"));
const decisionsByKey = new Map(decisions.map((decision) => [decision.key, decision]));
const appliedKeys = [];

for (const row of rows) {
  const key = rowKey(row);
  const decision = decisionsByKey.get(key);
  if (!decision) continue;
  const source = decision.source;
  const candidates = source === "serper-places"
    ? parseJsonArray(row.placesCandidates)
    : source === "official-embedded-map"
      ? parseJsonArray(row.officialMapCandidates)
      : [];
  const candidate = source === "manual-coordinate" ? decision : candidates[decision.candidateIndex];
  if (!candidate || !Number.isFinite(Number(candidate.lat)) || !Number.isFinite(Number(candidate.lng))) {
    throw new Error(`${key}: selected coordinate candidate does not exist`);
  }

  row.decision = decision.decision || "adopt";
  row.approvedLat = candidate.lat;
  row.approvedLng = candidate.lng;
  row.approvedTitle = decision.approvedTitle || "";
  row.reviewedOfficialUrl = decision.reviewedOfficialUrl;
  row.reviewedCoordinateSource = source;
  row.reviewedCoordinateEvidence = decision.coordinateEvidence;
  row.reviewedAt = decision.reviewedAt;
  row.reviewNotes = decision.reviewNotes;
  appliedKeys.push(key);
}

const unknown = [...decisionsByKey.keys()].filter((key) => !appliedKeys.includes(key));
if (unknown.length > 0) throw new Error(`Unknown decision keys: ${unknown.join(", ")}`);
await writeCsv(csvPath, rows);
console.log(JSON.stringify({ rows: rows.length, decisionsApplied: appliedKeys.length }, null, 2));

function rowKey(row) {
  return `${row.id}:${row.target}:${row.targetId}`;
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCsv(path, items) {
  const header = Object.keys(items[0] ?? {});
  const csv = "\uFEFF" + [header, ...items.map((item) => header.map((field) => item[field] ?? ""))]
    .map((row) => row.map(csvCell).join(","))
    .join("\n") + "\n";
  await writeFile(path, csv, "utf8");
}

function csvCell(value) {
  const text = String(value).replace(/\r?\n/g, " ");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function parseCsv(text) {
  const records = [];
  const normalized = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const header = rows.shift() ?? [];
  for (const values of rows) {
    if (values.every((value) => value === "")) continue;
    records.push(Object.fromEntries(header.map((field, index) => [field, values[index] ?? ""])));
  }
  return records;
}
