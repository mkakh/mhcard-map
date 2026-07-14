const candidateFieldsBySource = {
  "serper-places": "placesCandidates",
  "official-embedded-map": "officialMapCandidates",
  "manual-coordinate": ""
};

export function candidateApprovalError(row) {
  if (row.decision !== "adopt") return "not explicitly adopted";
  if (
    String(row.approvedLat ?? "").trim() === "" ||
    String(row.approvedLng ?? "").trim() === "" ||
    !Number.isFinite(Number(row.approvedLat)) ||
    !Number.isFinite(Number(row.approvedLng))
  ) {
    return "approvedLat and approvedLng are required";
  }
  if (!isHttpUrl(row.reviewedOfficialUrl)) return "reviewedOfficialUrl must be a valid HTTP(S) URL";
  if (!officialUrlWasDiscovered(row, row.reviewedOfficialUrl)) {
    return "reviewedOfficialUrl must be present in the generated official URL candidates";
  }
  if (!Object.hasOwn(candidateFieldsBySource, row.reviewedCoordinateSource)) {
    return "reviewedCoordinateSource must be serper-places, official-embedded-map, or manual-coordinate";
  }
  if (!String(row.reviewedCoordinateEvidence || "").trim()) {
    return "reviewedCoordinateEvidence is required";
  }
  if (row.reviewedCoordinateSource !== "manual-coordinate" && !approvedCoordinateWasDiscovered(row)) {
    return "approved coordinate must match the selected generated coordinate source";
  }
  if (!isValidDate(row.reviewedAt)) return "reviewedAt must be a valid YYYY-MM-DD date";
  if (!String(row.reviewNotes || "").trim()) return "reviewNotes is required";
  return "";
}

function approvedCoordinateWasDiscovered(row) {
  const field = candidateFieldsBySource[row.reviewedCoordinateSource];
  const candidates = parseJsonArray(row[field]);
  const approvedLat = Number(row.approvedLat);
  const approvedLng = Number(row.approvedLng);
  return candidates.some((candidate) =>
    Math.abs(Number(candidate.lat) - approvedLat) < 1e-7 &&
    Math.abs(Number(candidate.lng) - approvedLng) < 1e-7
  );
}

function officialUrlWasDiscovered(row, reviewedUrl) {
  const direct = parseJsonArray(row.officialUrlCandidates);
  const searched = parseJsonArray(row.officialSearchCandidates).map((candidate) => candidate.url);
  return [...direct, ...searched].includes(reviewedUrl);
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
