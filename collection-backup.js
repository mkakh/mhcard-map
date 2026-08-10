(() => {
  const format = "mhcard-map-collections";
  const version = 1;
  const maxEntries = 20_000;
  const maxKeyLength = 200;
  const maxMemoLength = 100_000;
  const blockedKeys = new Set(["__proto__", "prototype", "constructor"]);

  function createBackup(collections, exportedAt = new Date().toISOString()) {
    const timestamp = String(exportedAt);
    if (Number.isNaN(Date.parse(timestamp))) throw new Error("Invalid export timestamp");
    return {
      format,
      version,
      exportedAt: timestamp,
      collections: normalizeCollections(collections)
    };
  }

  function parseBackupText(text) {
    let value;
    try {
      value = JSON.parse(String(text));
    } catch {
      throw new Error("JSONを読み取れませんでした");
    }
    return parseBackup(value);
  }

  function parseBackup(value) {
    if (!isRecord(value)) throw new Error("バックアップの形式が正しくありません");
    if (value.format !== format) throw new Error("マンホールカードマップのバックアップではありません");
    if (value.version !== version) throw new Error(`未対応のバックアップバージョンです: ${String(value.version)}`);
    if (typeof value.exportedAt !== "string" || Number.isNaN(Date.parse(value.exportedAt))) {
      throw new Error("バックアップ日時が正しくありません");
    }
    return {
      format,
      version,
      exportedAt: value.exportedAt,
      collections: normalizeCollections(value.collections)
    };
  }

  function mergeCollections(current, imported) {
    const currentCollections = normalizeCollections(current);
    const importedCollections = normalizeCollections(imported);
    const merged = cloneCollections(importedCollections);

    Object.entries(currentCollections).forEach(([locationId, currentEntry]) => {
      const importedEntry = merged[locationId];
      if (!importedEntry) {
        merged[locationId] = cloneEntry(currentEntry);
        return;
      }

      const entry = {
        collected: Boolean(currentEntry.collected || importedEntry.collected),
        collectedOn: currentEntry.collectedOn || importedEntry.collectedOn || "",
        placeMemos: {
          ...(importedEntry.placeMemos ?? {}),
          ...(currentEntry.placeMemos ?? {})
        }
      };
      if (!entry.collectedOn) delete entry.collectedOn;
      if (Object.keys(entry.placeMemos).length === 0) delete entry.placeMemos;
      merged[locationId] = entry;
    });

    return merged;
  }

  function normalizeCollections(value) {
    if (!isRecord(value)) throw new Error("取得データがオブジェクトではありません");
    const entries = Object.entries(value);
    if (entries.length > maxEntries) throw new Error("取得データの件数が多すぎます");

    const normalized = {};
    entries.forEach(([locationId, entry]) => {
      assertSafeKey(locationId, "カードID");
      normalized[locationId] = normalizeEntry(entry);
    });
    return normalized;
  }

  function normalizeEntry(value) {
    if (!isRecord(value)) throw new Error("カードの取得データが正しくありません");
    const allowedFields = new Set(["collected", "collectedOn", "placeMemos"]);
    const unknownField = Object.keys(value).find((key) => !allowedFields.has(key));
    if (unknownField) throw new Error(`未対応の取得データ項目です: ${unknownField}`);

    const entry = { collected: false };
    if (value.collected !== undefined) {
      if (typeof value.collected !== "boolean") throw new Error("取得済み状態が真偽値ではありません");
      entry.collected = value.collected;
    }
    if (value.collectedOn !== undefined) {
      if (typeof value.collectedOn !== "string" || (value.collectedOn && !isIsoDate(value.collectedOn))) {
        throw new Error("取得日が正しくありません");
      }
      if (value.collectedOn) entry.collectedOn = value.collectedOn;
    }
    if (value.placeMemos !== undefined) {
      if (!isRecord(value.placeMemos)) throw new Error("配布場所メモがオブジェクトではありません");
      const memos = {};
      Object.entries(value.placeMemos).forEach(([placeId, memo]) => {
        assertSafeKey(placeId, "配布場所ID");
        if (typeof memo !== "string") throw new Error("メモが文字列ではありません");
        if (memo.length > maxMemoLength) throw new Error("メモが長すぎます");
        if (memo) memos[placeId] = memo;
      });
      if (Object.keys(memos).length > 0) entry.placeMemos = memos;
    }
    return entry;
  }

  function assertSafeKey(key, label) {
    if (!key || key.length > maxKeyLength || blockedKeys.has(key) || /[\u0000-\u001f]/.test(key)) {
      throw new Error(`${label}が正しくありません`);
    }
  }

  function isIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }

  function cloneCollections(collections) {
    return Object.fromEntries(Object.entries(collections).map(([id, entry]) => [id, cloneEntry(entry)]));
  }

  function cloneEntry(entry) {
    return {
      ...entry,
      ...(entry.placeMemos ? { placeMemos: { ...entry.placeMemos } } : {})
    };
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  globalThis.MhcardCollectionBackup = Object.freeze({
    createBackup,
    format,
    mergeCollections,
    parseBackup,
    parseBackupText,
    version
  });
})();
