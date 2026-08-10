import { createHash } from "node:crypto";

export const updateHistoryVersion = 1;
export const maxHistoryBatches = 24;
export const maxChangesPerBatch = 200;

const fieldLabels = {
  cardName: "カード名",
  prefecture: "都道府県",
  municipality: "自治体",
  status: "配布状態",
  stock: "在庫",
  place: "配布場所",
  address: "住所",
  hours: "配布時間",
  closed: "休配日",
  condition: "配布条件",
  distributionPlaces: "配布場所一覧",
  lat: "緯度",
  lng: "経度",
  plusCode: "Plus Code",
  sourceUrl: "情報元",
  facilityUrl: "施設情報",
  stockUrl: "在庫情報",
  conditionUrl: "配布条件情報",
  imageUrl: "カード画像",
  series: "発行弾",
  issuedOn: "発行日",
  distributionStartsOn: "配布開始日",
  hasEnglishVersion: "英語版",
  englishVersionStatus: "英語版の状態",
  englishVersionNote: "英語版の案内",
  englishVersionUrl: "英語版の情報元",
  englishVersionDistributionPlaces: "英語版の配布場所"
};
const visibleFields = new Set(Object.keys(fieldLabels));

export function buildHistoryBatch(beforeLocations, afterLocations, { at = new Date().toISOString(), source = "Data update" } = {}) {
  if (!Array.isArray(beforeLocations) || !Array.isArray(afterLocations)) {
    throw new Error("Location snapshots must be arrays");
  }
  const timestamp = normalizeTimestamp(at);
  const beforeById = new Map(beforeLocations.map((location) => [location.id, location]));
  const afterById = new Map(afterLocations.map((location) => [location.id, location]));
  const ids = [...new Set([...beforeById.keys(), ...afterById.keys()])].sort();
  const allChanges = ids.flatMap((id) => {
    const before = beforeById.get(id);
    const after = afterById.get(id);
    const change = buildLocationChange(before, after);
    return change ? [change] : [];
  });

  if (allChanges.length === 0) return null;
  const changes = allChanges.slice(0, maxChangesPerBatch);
  const digest = createHash("sha256").update(JSON.stringify(changes)).digest("hex").slice(0, 12);
  const date = calendarDateInJapan(timestamp);
  return {
    id: `${date}-${digest}`,
    date,
    generatedAt: timestamp,
    source: String(source).slice(0, 160),
    totalChanges: allChanges.length,
    omittedChanges: Math.max(0, allChanges.length - changes.length),
    changes
  };
}

export function appendHistoryBatch(history, batch) {
  const current = normalizeHistoryContainer(history);
  if (!batch) return current;
  const batches = [batch, ...current.updates.filter((update) => update.id !== batch.id)]
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt) || b.id.localeCompare(a.id))
    .slice(0, maxHistoryBatches);
  return {
    version: updateHistoryVersion,
    generatedAt: batches[0]?.generatedAt ?? current.generatedAt,
    updates: batches
  };
}

export function validateUpdateHistory(value) {
  const errors = [];
  if (!isRecord(value)) return ["update history must be an object"];
  if (value.version !== updateHistoryVersion) errors.push(`update history version must be ${updateHistoryVersion}`);
  if (!isTimestamp(value.generatedAt)) errors.push("update history generatedAt must be an ISO timestamp");
  if (!Array.isArray(value.updates)) return [...errors, "update history updates must be an array"];
  if (value.updates.length > maxHistoryBatches) errors.push(`update history must contain at most ${maxHistoryBatches} batches`);

  const batchIds = new Set();
  value.updates.forEach((batch, batchIndex) => {
    const label = `update history batch ${batchIndex}`;
    if (!isRecord(batch)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!String(batch.id ?? "").trim()) errors.push(`${label} is missing id`);
    if (batchIds.has(batch.id)) errors.push(`${label} has duplicate id ${batch.id}`);
    batchIds.add(batch.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(batch.date ?? ""))) errors.push(`${label} date must be YYYY-MM-DD`);
    if (!isTimestamp(batch.generatedAt)) errors.push(`${label} generatedAt must be an ISO timestamp`);
    if (typeof batch.source !== "string" || !batch.source.trim()) errors.push(`${label} is missing source`);
    if (!Number.isInteger(batch.totalChanges) || batch.totalChanges < 1) errors.push(`${label} totalChanges must be positive`);
    if (!Number.isInteger(batch.omittedChanges) || batch.omittedChanges < 0) errors.push(`${label} omittedChanges must be non-negative`);
    if (!Array.isArray(batch.changes) || batch.changes.length === 0) {
      errors.push(`${label} changes must be a non-empty array`);
      return;
    }
    if (batch.changes.length > maxChangesPerBatch) errors.push(`${label} has too many changes`);
    if (batch.totalChanges !== batch.changes.length + batch.omittedChanges) {
      errors.push(`${label} totalChanges must equal shown plus omitted changes`);
    }
    batch.changes.forEach((change, changeIndex) => validateHistoryChange(change, `${label} change ${changeIndex}`, errors));
  });
  return errors;
}

function buildLocationChange(before, after) {
  const location = after ?? before;
  if (!location?.id) return null;
  if (!before) {
    return baseChange(location, "added", "カードを追加", "high", [{
      field: "location",
      label: "カード",
      kind: "added",
      before: null,
      after: locationSummary(after)
    }]);
  }
  if (!after) {
    return baseChange(location, "removed", "カードを削除", "high", [{
      field: "location",
      label: "カード",
      kind: "removed",
      before: locationSummary(before),
      after: null
    }]);
  }

  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((field) => visibleFields.has(field))
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .sort((a, b) => fieldOrder(a) - fieldOrder(b) || a.localeCompare(b))
    .map((field) => ({
      field,
      label: fieldLabels[field] ?? field,
      kind: fieldKind(field, before[field], after[field]),
      before: historyValue(field, before[field]),
      after: historyValue(field, after[field])
    }));
  if (fields.length === 0) return null;

  const headline = historyHeadline(before, after, fields);
  const importance = fields.some((field) => ["suspended", "resumed"].includes(field.kind)) || stockAvailabilityTransition(before.stock, after.stock)
    ? "critical"
    : fields.some((field) => ["stock", "location", "hours", "coordinates"].includes(field.kind)) ? "high" : "normal";
  return baseChange(after, "changed", headline, importance, fields);
}

function baseChange(location, changeType, headline, importance, fields) {
  return {
    locationId: location.id,
    cardName: String(location.cardName ?? location.id),
    prefecture: String(location.prefecture ?? ""),
    municipality: String(location.municipality ?? ""),
    changeType,
    headline,
    importance,
    fields
  };
}

function historyHeadline(before, after, fields) {
  if (before.status !== after.status) {
    if (after.status === "休止中") return "配布休止";
    if (before.status === "休止中" && after.status === "配布中") return "配布再開";
    if (before.status === "配布開始前" && after.status === "配布中") return "配布開始";
    return `配布状態を${after.status}へ変更`;
  }
  if (fields.some((field) => field.kind === "stock" && /在庫(切れ|終了)|配布.*(中止|休止)/.test(String(field.after)))) {
    return "在庫・配布状況を更新";
  }
  const labels = [...new Set(fields.map((field) => field.label))];
  return `${labels.slice(0, 3).join("・")}${labels.length > 3 ? "など" : ""}を更新`;
}

function fieldKind(field, before, after) {
  if (field === "status") {
    if (after === "休止中") return "suspended";
    if (before === "休止中" && after === "配布中") return "resumed";
    return "status";
  }
  if (field === "stock") return "stock";
  if (["place", "address", "distributionPlaces", "englishVersionDistributionPlaces"].includes(field)) return "location";
  if (["lat", "lng", "plusCode"].includes(field)) return "coordinates";
  if (["hours", "closed"].includes(field)) return "hours";
  if (field.endsWith("Url")) return "link";
  return "general";
}

function historyValue(field, value) {
  if (value === undefined || value === null || value === "") return null;
  let text;
  if (["distributionPlaces", "englishVersionDistributionPlaces"].includes(field) && Array.isArray(value)) {
    text = value.map((place) => [
      place.name,
      place.address,
      [place.days, place.hours].filter(Boolean).join(" "),
      place.closed,
      Number.isFinite(place.lat) && Number.isFinite(place.lng) ? `${place.lat}, ${place.lng}` : ""
    ].filter(Boolean).join(" / ")).join("\n");
  } else if (typeof value === "object") {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }
  return text.length > 800 ? `${text.slice(0, 797)}...` : text;
}

function locationSummary(location) {
  return [location.cardName, location.prefecture, location.municipality, location.place, location.address]
    .filter(Boolean)
    .join(" / ");
}

function fieldOrder(field) {
  return ["status", "stock", "place", "address", "distributionPlaces", "hours", "closed", "condition", "lat", "lng"]
    .indexOf(field) + 1 || 100;
}

function normalizeHistoryContainer(value) {
  if (!value) return { version: updateHistoryVersion, generatedAt: new Date(0).toISOString(), updates: [] };
  const errors = validateUpdateHistory(value);
  if (errors.length > 0) throw new Error(errors.join("; "));
  return structuredClone(value);
}

function normalizeTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error("History timestamp is invalid");
  return date.toISOString();
}

function calendarDateInJapan(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(timestamp));
}

function stockAvailabilityTransition(before, after) {
  return stockIsStopped(before) !== stockIsStopped(after);
}

function stockIsStopped(value) {
  return /在庫[^\n]*(切れ|終了|なし)|配布[^\n]*(休止|中止|停止)|準備中/.test(String(value ?? ""));
}

function isTimestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateHistoryChange(change, label, errors) {
  if (!isRecord(change)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const field of ["locationId", "cardName", "changeType", "headline", "importance"]) {
    if (typeof change[field] !== "string" || !change[field].trim()) errors.push(`${label} is missing ${field}`);
  }
  if (!Array.isArray(change.fields) || change.fields.length === 0) {
    errors.push(`${label} fields must be non-empty`);
    return;
  }
  change.fields.forEach((field, fieldIndex) => {
    if (!isRecord(field)) errors.push(`${label} field ${fieldIndex} must be an object`);
    else if (!["field", "label", "kind"].every((key) => typeof field[key] === "string" && field[key])) {
      errors.push(`${label} field ${fieldIndex} is incomplete`);
    }
  });
}
