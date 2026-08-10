import assert from "node:assert/strict";
import test from "node:test";

await import("../collection-backup.js");

const { createBackup, mergeCollections, parseBackupText } = globalThis.MhcardCollectionBackup;

test("round-trips a versioned collection backup", () => {
  const collections = {
    "01-100-a-01": {
      collected: true,
      collectedOn: "2026-08-10",
      placeMemos: { "place-one": "入口は北側" }
    }
  };
  const backup = createBackup(collections, "2026-08-10T10:00:00.000Z");

  assert.deepEqual(parseBackupText(JSON.stringify(backup)), backup);
  assert.equal(backup.format, "mhcard-map-collections");
  assert.equal(backup.version, 1);
});

test("safe merge preserves current values and adds missing imported data", () => {
  const current = {
    cardA: { collected: false, collectedOn: "2026-08-09", placeMemos: { p1: "現在のメモ" } },
    cardB: { collected: true }
  };
  const imported = {
    cardA: { collected: true, collectedOn: "2026-01-01", placeMemos: { p1: "古いメモ", p2: "追加メモ" } },
    cardC: { collected: true, collectedOn: "2026-08-10" }
  };

  assert.deepEqual(mergeCollections(current, imported), {
    cardA: {
      collected: true,
      collectedOn: "2026-08-09",
      placeMemos: { p1: "現在のメモ", p2: "追加メモ" }
    },
    cardB: { collected: true },
    cardC: { collected: true, collectedOn: "2026-08-10" }
  });
});

test("rejects malformed, unsupported, and unsafe backups", () => {
  assert.throws(() => parseBackupText("{"), /JSON/);
  assert.throws(
    () => parseBackupText(JSON.stringify({ format: "mhcard-map-collections", version: 2, exportedAt: new Date().toISOString(), collections: {} })),
    /バージョン/
  );
  assert.throws(
    () => parseBackupText('{"format":"mhcard-map-collections","version":1,"exportedAt":"2026-08-10T00:00:00Z","collections":{"__proto__":{"collected":true}}}'),
    /カードID/
  );
  assert.throws(
    () => parseBackupText(JSON.stringify({
      format: "mhcard-map-collections",
      version: 1,
      exportedAt: "2026-08-10T00:00:00Z",
      collections: { cardA: { collected: "yes" } }
    })),
    /真偽値/
  );
  assert.throws(
    () => parseBackupText(JSON.stringify({
      format: "mhcard-map-collections",
      version: 1,
      exportedAt: "2026-08-10T00:00:00Z",
      collections: { cardA: { collected: true, collectedOn: "2026-02-30" } }
    })),
    /取得日/
  );
});
