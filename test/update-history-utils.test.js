import assert from "node:assert/strict";
import test from "node:test";
import {
  appendHistoryBatch,
  buildHistoryBatch,
  maxHistoryBatches,
  validateUpdateHistory
} from "../scripts/update-history-utils.js";

test("builds user-facing history and ignores timestamp-only changes", () => {
  const before = [location({ updatedAt: "2026-08-01" }), location({ id: "unchanged", updatedAt: "2026-08-01" })];
  const after = [
    location({ status: "休止中", stock: "在庫終了", updatedAt: "2026-08-10" }),
    location({ id: "unchanged", updatedAt: "2026-08-10" })
  ];
  const batch = buildHistoryBatch(before, after, { at: "2026-08-10T12:00:00Z", source: "PR #1" });

  assert.equal(batch.totalChanges, 1);
  assert.equal(batch.changes[0].headline, "配布休止");
  assert.equal(batch.changes[0].importance, "critical");
  assert.deepEqual(batch.changes[0].fields.map((field) => field.field), ["status", "stock"]);
});

test("records additions, removals, locations, hours, and coordinates", () => {
  const before = [location(), location({ id: "removed" })];
  const after = [
    location({ place: "新施設", hours: "10:00～17:00", lat: 36 }),
    location({ id: "added" })
  ];
  const batch = buildHistoryBatch(before, after, { at: "2026-08-10", source: "test" });

  assert.deepEqual(batch.changes.map((change) => change.changeType), ["added", "changed", "removed"]);
  assert.deepEqual(batch.changes[1].fields.map((field) => field.kind), ["location", "hours", "coordinates"]);
});

test("ignores internal distribution-place changes and retains visible schedule changes", () => {
  const beforePlace = {
    id: "place-1",
    name: "配布施設",
    address: "東京都千代田区丸の内1-1",
    hours: "9:00～17:00",
    lat: 35,
    lng: 139,
    geocodeTitle: "内部検索結果A",
    url: "https://example.jp/old"
  };
  const internalOnly = buildHistoryBatch(
    [location({ distributionPlaces: [beforePlace] })],
    [location({ distributionPlaces: [{ ...beforePlace, geocodeTitle: "内部検索結果B", url: "https://example.jp/new" }] })],
    { at: "2026-08-10", source: "test" }
  );
  const visible = buildHistoryBatch(
    [location({ distributionPlaces: [beforePlace] })],
    [location({
      distributionPlaces: [{
        ...beforePlace,
        startsOn: "2026-08-29",
        distributionMode: "regular",
        availabilityNote: "8月29日から通常配布"
      }]
    })],
    { at: "2026-08-10", source: "test" }
  );

  assert.equal(internalOnly, null);
  assert.equal(visible.totalChanges, 1);
  assert.match(visible.changes[0].fields[0].after, /2026-08-29から/);
  assert.match(visible.changes[0].fields[0].after, /通常配布/);
  assert.match(visible.changes[0].fields[0].after, /8月29日から通常配布/);
});

test("keeps long user-facing values distinguishable after bounding them", () => {
  const sharedPrefix = "長い住所".repeat(250);
  const before = location({
    distributionPlaces: [{ name: "配布施設", address: `${sharedPrefix}変更前`, lat: 35, lng: 139 }]
  });
  const after = location({
    distributionPlaces: [{ name: "配布施設", address: `${sharedPrefix}変更後`, lat: 35, lng: 139 }]
  });
  const batch = buildHistoryBatch([before], [after], { at: "2026-08-10", source: "test" });
  const field = batch.changes[0].fields[0];

  assert.equal(field.before.length, 800);
  assert.equal(field.after.length, 800);
  assert.notEqual(field.before, field.after);
  assert.match(field.before, /\[sha256:[a-f0-9]{64}\]$/);
  assert.deepEqual(validateUpdateHistory(appendHistoryBatch(null, batch)), []);
});

test("uses the Japan calendar date and reserves critical stock emphasis for availability transitions", () => {
  const ordinary = buildHistoryBatch([location()], [location({ stock: "在庫十分" })], {
    at: "2026-08-09T18:00:00Z",
    source: "test"
  });
  const stopped = buildHistoryBatch([location()], [location({ stock: "在庫終了" })], {
    at: "2026-08-09T18:00:00Z",
    source: "test"
  });

  assert.equal(ordinary.date, "2026-08-10");
  assert.equal(ordinary.changes[0].importance, "high");
  assert.equal(stopped.changes[0].importance, "critical");
});

test("deduplicates and caps history batches", () => {
  let history = null;
  for (let index = 0; index < maxHistoryBatches + 3; index += 1) {
    const batch = buildHistoryBatch([location()], [location({ stock: `stock-${index}` })], {
      at: `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
      source: `batch-${index}`
    });
    history = appendHistoryBatch(history, batch);
    history = appendHistoryBatch(history, batch);
  }
  assert.equal(history.updates.length, maxHistoryBatches);
  assert.equal(new Set(history.updates.map((batch) => batch.id)).size, maxHistoryBatches);
  assert.deepEqual(validateUpdateHistory(history), []);
});

test("rejects malformed history", () => {
  assert.ok(validateUpdateHistory({ version: 99, generatedAt: "bad", updates: [] }).length >= 2);
});

test("rejects history fields whose user-facing values are identical", () => {
  const batch = buildHistoryBatch([location()], [location({ stock: "残り僅か" })], {
    at: "2026-08-10",
    source: "test"
  });
  batch.changes[0].fields[0].after = batch.changes[0].fields[0].before;

  assert.match(validateUpdateHistory(appendHistoryBatch(null, batch)).join("\n"), /must change its user-facing value/);
});

function location(overrides = {}) {
  return {
    id: "card-1",
    cardName: "カード A001",
    prefecture: "東京都",
    municipality: "千代田区",
    place: "施設",
    address: "東京都千代田区丸の内1-1",
    status: "配布中",
    stock: "在庫あり",
    hours: "9:00～17:00",
    lat: 35,
    lng: 139,
    updatedAt: "2026-08-01",
    ...overrides
  };
}
