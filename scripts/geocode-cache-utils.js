export function cachedGeocodeResult(cacheEntry, retryFailed, targetKey = "") {
  if (!cacheEntry) return null;

  const reviewed = targetKey && cacheEntry.reviewedResults?.[targetKey];
  if (reviewed) return reviewed;

  if (isManualResult(cacheEntry)) return null;
  if (!hasGeneralResult(cacheEntry)) return null;
  if (retryFailed && cacheEntry.error) return null;
  return cacheEntry;
}

export function shouldUseCachedGeocodeResult(cacheEntry, retryFailed, targetKey = "") {
  return Boolean(cachedGeocodeResult(cacheEntry, retryFailed, targetKey));
}

export function withCachedGeocodeResult(cacheEntry, result) {
  return {
    ...result,
    ...(cacheEntry?.reviewedResults ? { reviewedResults: cacheEntry.reviewedResults } : {})
  };
}

export function withReviewedGeocodeResult(cacheEntry, targetKey, result) {
  if (!targetKey) throw new Error("targetKey is required for a reviewed geocode result");
  return {
    ...(cacheEntry ?? {}),
    reviewedResults: {
      ...(cacheEntry?.reviewedResults ?? {}),
      [targetKey]: result
    }
  };
}

function isManualResult(result) {
  return /手動補正/.test(String(result?.title ?? ""));
}

function hasGeneralResult(result) {
  return Boolean(
    result?.error ||
    (Number.isFinite(result?.lat) && Number.isFinite(result?.lng))
  );
}
