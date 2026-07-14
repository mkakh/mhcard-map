import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const inputPath = process.env.GEOCODE_CANDIDATE_OUTPUT_PATH || join(process.cwd(), ".tmp", "geocode-precision-candidate-review.csv");
const outputPath = process.env.GEOCODE_CANDIDATE_REPORT_PATH || join(process.cwd(), ".tmp", "geocode-precision-candidate-review.md");
const jsonOutputPath = process.env.GEOCODE_CANDIDATE_REPORT_JSON_PATH || join(process.cwd(), ".tmp", "geocode-precision-candidate-review.json");
const rows = parseCsv(await readFile(inputPath, "utf8"));
const structuredRows = rows.map((row) => ({
  ...row,
  officialUrlCandidates: parseJsonArray(row.officialUrlCandidates),
  officialSearchCandidates: parseJsonArray(row.officialSearchCandidates),
  placesCandidates: parseJsonArray(row.placesCandidates),
  officialMapCandidates: parseJsonArray(row.officialMapCandidates),
  nominatimCandidates: parseJsonArray(row.nominatimCandidates)
}));
const lines = [
  "# Geocode Candidate Review",
  "",
  `- Rows: ${rows.length}`,
  "- Search and geocoder results are candidates only. Review the official card page and exact facility before adoption.",
  "",
  "| target | current | Places candidates | official URL candidates | Nominatim / embedded maps |",
  "| --- | --- | --- | --- | --- |"
];

for (const row of rows) {
  const places = parseJsonArray(row.placesCandidates);
  const nominatim = parseJsonArray(row.nominatimCandidates);
  const maps = parseJsonArray(row.officialMapCandidates);
  const official = [
    ...parseJsonArray(row.officialUrlCandidates).map((url) => ({ url, title: "existing" })),
    ...parseJsonArray(row.officialSearchCandidates)
  ];
  lines.push([
    `${row.id} ${row.target}/${row.targetId}<br>${row.place}<br>${row.address}`,
    `${row.currentLat},${row.currentLng}<br>[map](https://www.google.com/maps?q=${row.currentLat},${row.currentLng})`,
    places.slice(0, 3).map(formatCoordinate).join("<br>") || "(none)",
    official.slice(0, 4).map((item) => `[${item.title || "source"}](${item.url})`).join("<br>") || "(none)",
    [
      ...nominatim.slice(0, 2).map(formatCoordinate),
      ...maps.slice(0, 2).map(formatCoordinate)
    ].join("<br>") || "(none)"
  ].map(markdownCell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
await writeFile(jsonOutputPath, `${JSON.stringify(structuredRows, null, 2)}\n`, "utf8");
console.log(`Wrote ${rows.length} rows to ${outputPath}`);
console.log(`Wrote ${rows.length} rows to ${jsonOutputPath}`);

function formatCoordinate(candidate) {
  const distance = Number.isFinite(Number(candidate.distanceMeters)) ? `${candidate.distanceMeters}m` : "?m";
  const map = `https://www.google.com/maps?q=${candidate.lat},${candidate.lng}`;
  return `[${candidate.source || "candidate"} ${distance}](${map}) ${candidate.title || ""} / ${candidate.address || ""}`;
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
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
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
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
