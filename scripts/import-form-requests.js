import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const outputPath = join(process.cwd(), "data", "update-requests.json");
const csvUrl = process.env.GOOGLE_FORM_RESPONSES_CSV_URL || "";

if (!csvUrl) {
  console.log(
    JSON.stringify(
      {
        skipped: true,
        reason: "GOOGLE_FORM_RESPONSES_CSV_URL is not set"
      },
      null,
      2
    )
  );
  process.exit(0);
}

const response = await fetch(csvUrl);
if (!response.ok) {
  throw new Error(`Failed to fetch form responses: HTTP ${response.status}`);
}

const csv = await response.text();
const rows = parseCsv(csv);
const [headers = [], ...records] = rows;
const requests = records
  .map((record) => toRequest(headers, record))
  .filter((request) => request.locationId || request.cardName || request.message);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(requests, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      skipped: false,
      total: requests.length,
      outputPath
    },
    null,
    2
  )
);

function toRequest(headers, record) {
  const item = {};
  headers.forEach((header, index) => {
    item[normalizeHeader(header)] = record[index] ?? "";
  });

  return {
    id: stableRequestId(item),
    submittedAt: item.timestamp || item.submittedAt || "",
    locationId: item.locationId || "",
    cardName: item.cardName || "",
    prefecture: item.prefecture || "",
    municipality: item.municipality || "",
    place: item.place || "",
    address: item.address || "",
    requestType: item.requestType || "",
    message: item.message || "",
    referenceUrl: item.referenceUrl || "",
    status: "unreviewed"
  };
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^タイムスタンプ$/, "timestamp")
    .replace(/^location id$/i, "locationId")
    .replace(/^cardName$/i, "cardName")
    .replace(/^prefecture$/i, "prefecture")
    .replace(/^municipality$/i, "municipality")
    .replace(/^place$/i, "place")
    .replace(/^address$/i, "address")
    .replace(/^request type$/i, "requestType")
    .replace(/^message$/i, "message")
    .replace(/^referenceUrl$/i, "referenceUrl");
}

function stableRequestId(item) {
  return Buffer.from(
    [item.timestamp, item.locationId, item.cardName, item.message, item.referenceUrl].join("|")
  )
    .toString("base64url")
    .slice(0, 32);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.replace(/\r$/, ""));
  if (row.some((cell) => cell)) rows.push(row);
  return rows;
}
