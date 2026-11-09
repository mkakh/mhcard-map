import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const tmp = join(process.cwd(), ".tmp");
await mkdir(tmp, { recursive: true });
const fetched = spawnSync(process.execPath, ["scripts/import-gkp-data.js"], {
  env: { ...process.env, GKP_AUDIT_OBSERVATIONS_ONLY: "1" },
  encoding: "utf8", timeout: 180_000, maxBuffer: 10_000_000
});
if (fetched.status !== 0) throw new Error("Fresh GKP fetch incomplete: " + (fetched.error?.message ?? fetched.stderr?.slice(-1000) ?? fetched.status));
const snapshot = JSON.parse(await readFile(join(tmp, "gkp-full-observations.json"), "utf8"));
const locations = JSON.parse(await readFile("data/locations.json", "utf8"));
if (snapshot.prefectures !== 47 || snapshot.prefectureCounts?.length !== 47
  || snapshot.prefectureCounts.some((item) => item.count <= 0) || snapshot.rows.length === 0) {
  throw new Error("Incomplete GKP snapshot: expected 47 nonempty prefectures");
}
const byId = new Map(locations.map((card) => [card.id, card]));
const seen = new Set();
const checks = [];
const fieldCounts = { place: 0, address: 0, hours: 0, stock: 0 };
for (const row of snapshot.rows) {
  if (seen.has(row.id)) throw new Error("Duplicate GKP ID " + row.id);
  seen.add(row.id);
  const card = byId.get(row.id);
  if (!card) {
    checks.push({ id: row.id, prefecture: row.prefecture, missingCard: true, distributionText: row.distributionText });
    continue;
  }
  const fields = [];
  for (const field of Object.keys(fieldCounts)) {
    const observed = field === "stock" ? row.stockText : field === "hours" ? row.hoursText : row[field];
    if (normalize(observed) !== normalize(card[field])) { fields.push(field); fieldCounts[field] += 1; }
  }
  const lines = row.distributionText.split("\n").map((line) => line.trim()).filter(Boolean);
  const addresses = lines.filter((line) => !/^電話/.test(line)
    && /(?:[0-9０-９]+(?:丁目|番地|番|号)|[0-9０-９]+[-－‐‑–—][0-9０-９]+)/.test(line)
    && /(?:都|道|府|県|市|町|村)/.test(line));
  const dayGroups = /(?:【平日】|【土日祝日】)/.test(row.distributionText) && /[①②]/.test(row.distributionText) ? 3 : 1;
  const mappedPlaces = card.distributionPlaces?.length ? card.distributionPlaces : [{ name: card.place, address: card.address }];
  const outletLead = Math.max(addresses.length, dayGroups) > mappedPlaces.length;
  const nameLeads = mappedPlaces.filter((place) => place.name && !normalize(row.distributionText).includes(normalize(place.name)))
    .map((place) => place.name);
  const relocationIndex = lines.findIndex((line) => /配布場所.*変更|休館中.*配布/.test(line));
  const announcedSite = relocationIndex >= 0 ? lines[relocationIndex + 1] || "" : "";
  const announcedName = normalize(announcedSite.split(/[（(]/)[0].replace(/^[①-⑳]/, ""));
  const relocationLead = Boolean(announcedName && !normalize(card.place).includes(announcedName));
  checks.push({ id: row.id, prefecture: row.prefecture, fields, outletLead, nameLeads, relocationLead, announcedSite,
    observedAddressLineCount: addresses.length, mappedOutlets: mappedPlaces.length,
    ...(fields.length || outletLead || nameLeads.length || relocationLead ? { distributionText: row.distributionText,
      observedHours: row.hoursText, observedStock: row.stockText,
      mappedPlace: card.place, mappedAddress: card.address,
      mappedHours: card.hours, mappedStock: card.stock, sourceType: card.sourceType } : {}) });
}
const summary = { checkedAt: snapshot.checkedAt, fetchedPrefectures: snapshot.prefectures,
  prefectureCounts: snapshot.prefectureCounts,
  gkpRows: snapshot.rows.length, uniqueGkpIds: seen.size, comparedCards: checks.length,
  localCards: locations.length, missingCards: checks.filter((x) => x.missingCard).length,
  localOnlyCards: locations.filter((x) => !seen.has(x.id)).map((x) => x.id),
  differingCards: checks.filter((x) => x.fields?.length || x.outletLead || x.nameLeads?.length || x.relocationLead).length,
  outletLeads: checks.filter((x) => x.outletLead).length,
  relocationLeads: checks.filter((x) => x.relocationLead).length,
  nameLeads: checks.filter((x) => x.nameLeads?.length).length, fieldCounts };
await writeFile(join(tmp, "gkp-full-card-audit.json"), JSON.stringify({ summary, checks }, null, 2) + "\n");
console.log(JSON.stringify({ ...summary, prefectureCounts: undefined }, null, 2));
console.log("Differences are leads, not independently verified distribution defects.");
function normalize(value) { return String(value ?? "").normalize("NFKC")
  .replace(/[\s　]/g, "").replace(/[‐‑‒–—―ー−－]/g, "-"); }
