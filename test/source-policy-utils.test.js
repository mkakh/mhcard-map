import test from "node:test";
import assert from "node:assert/strict";
import {
  OFFICIAL_PUBLIC_BODY_SOURCE_TYPE,
  isOfficialPublicBodyLocation,
  reconcileOfficialPublicBodyLocation,
  reconcileReviewedGkpLocation,
  retainUnmatchedOfficialPublicBodyLocations,
  retainUnmatchedReviewedLocations,
  shouldApplyGkpSourceNormalization,
  sourcePolicyError
} from "../scripts/source-policy-utils.js";
import {
  GKP_CONTENT_REVIEW_FIELDS,
  createGkpObservation,
  mergeAcceptedGkpObservation
} from "../scripts/gkp-review-baseline-utils.js";

test("official public body records are retained when GKP has not listed them", () => {
  const official = officialLocation();
  const retained = retainUnmatchedOfficialPublicBodyLocations([official], new Set(), "2026-07-14");

  assert.deepEqual(retained, [official]);
  assert.equal(shouldApplyGkpSourceNormalization(retained[0]), false);
});

test("unmatched existing GKP records are retained for review instead of deleted", () => {
  const existing = {
    ...officialLocation(),
    sourceType: "gkp_prefecture_page",
    sourceUrl: "https://www.gk-p.jp/mhcard/?pref=13#mhcard_result"
  };

  const retained = retainUnmatchedReviewedLocations([existing], new Set(), "2026-07-14");

  assert.deepEqual(retained, [existing]);
});

test("later GKP discovery only backfills missing catalogue metadata", () => {
  const official = officialLocation({ imageUrl: "", series: "", issuedOn: "" });
  const imported = {
    id: official.id,
    sourceType: "gkp_prefecture_page",
    sourceUrl: "https://www.gk-p.jp/mhcard/?pref=13#mhcard_result",
    imageUrl: "https://www.gk-p.jp/wp-content/uploads/mhc/13-101-A-01.jpg",
    series: "第30弾",
    issuedOn: "2026/12/01",
    distributionStartsOn: "2026-12-01",
    place: "GKP側の配布場所",
    address: "GKP側の住所"
  };

  const reconciled = reconcileOfficialPublicBodyLocation(official, imported, "2026-07-14");

  assert.equal(reconciled.sourceType, OFFICIAL_PUBLIC_BODY_SOURCE_TYPE);
  assert.equal(reconciled.sourceUrl, official.sourceUrl);
  assert.equal(reconciled.place, official.place);
  assert.equal(reconciled.address, official.address);
  assert.equal(reconciled.imageUrl, imported.imageUrl);
  assert.equal(reconciled.series, imported.series);
  assert.equal(reconciled.issuedOn, imported.issuedOn);
  assert.equal(reconciled.distributionStartsOn, undefined);
});

test("official-first records create a reviewed activation candidate after the start date", () => {
  const official = officialLocation({
    status: "配布開始前",
    stock: "配布開始前",
    distributionStartsOn: "2026-07-31"
  });

  const [retained] = retainUnmatchedOfficialPublicBodyLocations([official], new Set(), "2026-08-01");

  assert.equal(retained.status, "配布中");
  assert.equal(retained.stock, "公式情報を確認");
  assert.equal(retained.updatedAt, "2026-08-01");
});

test("a later GKP identity conflict requires manual review", () => {
  assert.throws(
    () => reconcileOfficialPublicBodyLocation(
      officialLocation(),
      { id: "13-101-a-02" },
      "2026-07-14"
    ),
    /verify the printed card code manually/
  );
});

test("ordinary GKP records keep the existing normalization path", () => {
  assert.equal(isOfficialPublicBodyLocation({ sourceType: "gkp_prefecture_page" }), false);
  assert.equal(shouldApplyGkpSourceNormalization({ sourceType: "gkp_prefecture_page" }), true);
});

test("existing GKP records retain reviewed distribution and geocode fields", () => {
  const existing = {
    ...officialLocation(),
    sourceType: "gkp_prefecture_page",
    sourceUrl: "https://www.city.example.jp/reviewed-card.html",
    facilityUrl: "https://www.city.example.jp/reviewed-facility.html",
    geocodeTitle: "公式配布先（公式所在地・手動補正）"
  };
  const imported = {
    ...existing,
    place: "GKP側の変更後配布先",
    address: "東京都公式市二丁目2番2号",
    stock: "GKP側の在庫文面",
    sourceUrl: "https://www.gk-p.jp/mhcard/?pref=13#mhcard_result",
    imageUrl: "https://www.gk-p.jp/wp-content/uploads/mhc/13-101-A-01-new.jpg",
    series: "第31弾",
    issuedOn: "2027/04/01",
    geocodeTitle: "GKP取り込み後の座標"
  };
  const previousObservation = mergeAcceptedGkpObservation(
    undefined,
    createGkpObservation(
      {
        ...imported,
        place: existing.place,
        address: existing.address,
        stock: existing.stock
      },
      GKP_CONTENT_REVIEW_FIELDS
    ),
    null
  );

  const { location, reviewCandidate } = reconcileReviewedGkpLocation(
    existing,
    imported,
    "2026-07-14",
    previousObservation
  );

  assert.equal(location.place, existing.place);
  assert.equal(location.address, existing.address);
  assert.equal(location.stock, existing.stock);
  assert.equal(location.sourceUrl, existing.sourceUrl);
  assert.equal(location.facilityUrl, existing.facilityUrl);
  assert.equal(location.geocodeTitle, existing.geocodeTitle);
  assert.equal(location.imageUrl, imported.imageUrl);
  assert.equal(location.series, imported.series);
  assert.equal(location.issuedOn, imported.issuedOn);
  assert.deepEqual(reviewCandidate.fields.place, {
    before: existing.place,
    gkp: imported.place
  });
  assert.deepEqual(reviewCandidate.fields.address, {
    before: existing.address,
    gkp: imported.address
  });
  assert.equal(reviewCandidate.fields.imageUrl, undefined);
});

test("computed distribution-place fields and absent optional English data do not create candidates", () => {
  const existing = {
    ...officialLocation(),
    sourceType: "gkp_prefecture_page",
    distributionPlaces: [
      {
        id: "place-1",
        name: "配布先",
        address: "東京都公式市一丁目1番1号",
        days: "平日",
        hours: "9:00～17:00",
        closed: "土日祝日",
        url: "https://www.example-city.lg.jp/facility.html",
        lat: 35.6,
        lng: 139.7,
        plusCode: "8Q7XJP22+22",
        distributionMode: "regular"
      }
    ],
    hasEnglishVersion: true,
    englishVersionStatus: "available",
    englishVersionUrl: "https://www.example-city.lg.jp/english-card.html"
  };
  const imported = {
    ...existing,
    distributionPlaces: existing.distributionPlaces.map((place) => ({
      id: place.id,
      name: place.name,
      address: place.address,
      days: place.days,
      hours: place.hours,
      closed: place.closed,
      url: place.url
    }))
  };
  delete imported.hasEnglishVersion;
  delete imported.englishVersionStatus;
  delete imported.englishVersionUrl;

  const baseline = mergeAcceptedGkpObservation(
    undefined,
    createGkpObservation(imported, GKP_CONTENT_REVIEW_FIELDS),
    null
  );
  const { reviewCandidate } = reconcileReviewedGkpLocation(
    existing,
    imported,
    "2026-07-14",
    baseline
  );

  assert.equal(reviewCandidate, null);
});

test("reviewed GKP records still transition from pre-release on the start date", () => {
  const existing = {
    ...officialLocation(),
    sourceType: "gkp_prefecture_page",
    status: "配布開始前",
    stock: "配布開始前",
    distributionStartsOn: "2026-07-31"
  };
  const legacyBaseline = mergeAcceptedGkpObservation(
    undefined,
    createGkpObservation(existing, [
      ...GKP_CONTENT_REVIEW_FIELDS,
      "status",
      "distributionStartsOn"
    ]),
    null
  );
  const imported = { ...existing, status: "配布中" };
  delete imported.distributionStartsOn;

  const { location, reviewCandidate } = reconcileReviewedGkpLocation(
    existing,
    imported,
    "2026-07-31",
    legacyBaseline
  );

  assert.equal(location.status, "配布中");
  assert.equal(location.stock, "公式情報を確認");
  assert.equal(location.distributionStartsOn, "2026-07-31");
  assert.equal(location.updatedAt, "2026-07-31");
  assert.equal(reviewCandidate, null);
});

test("GKP issue-date inference cannot override a later reviewed distribution start", () => {
  const existing = {
    ...officialLocation(),
    sourceType: "gkp_prefecture_page",
    status: "配布開始前",
    stock: "配布開始前",
    distributionStartsOn: "2026-08-03"
  };
  const imported = { ...existing, status: "配布中", stock: "配布開始前" };
  delete imported.distributionStartsOn;
  const baseline = mergeAcceptedGkpObservation(
    undefined,
    createGkpObservation(imported, GKP_CONTENT_REVIEW_FIELDS),
    null
  );

  const { location, reviewCandidate } = reconcileReviewedGkpLocation(
    existing,
    imported,
    "2026-07-31",
    baseline
  );

  assert.equal(location.status, "配布開始前");
  assert.equal(location.distributionStartsOn, "2026-08-03");
  assert.equal(reviewCandidate, null);
});

test("GKP-derived active status cannot override a reviewed postponement", () => {
  const existing = {
    ...officialLocation(),
    sourceType: "gkp_prefecture_page",
    status: "要確認",
    stock: "配布開始延期（開始日未定）"
  };
  const imported = { ...existing, status: "配布中" };
  const baseline = mergeAcceptedGkpObservation(
    undefined,
    createGkpObservation(imported, GKP_CONTENT_REVIEW_FIELDS),
    null
  );

  const { location, reviewCandidate } = reconcileReviewedGkpLocation(
    existing,
    imported,
    "2026-07-31",
    baseline
  );

  assert.equal(location.status, "要確認");
  assert.equal(location.stock, existing.stock);
  assert.equal(reviewCandidate, null);
});

test("a real GKP stock change remains a review candidate", () => {
  const existing = {
    ...officialLocation(),
    sourceType: "gkp_prefecture_page",
    stock: "配布中",
    status: "配布中"
  };
  const previousImported = { ...existing, stock: "配布中", status: "配布中" };
  const imported = { ...existing, stock: "在庫切れ", status: "休止中" };
  const baseline = mergeAcceptedGkpObservation(
    undefined,
    createGkpObservation(previousImported, GKP_CONTENT_REVIEW_FIELDS),
    null
  );

  const { location, reviewCandidate } = reconcileReviewedGkpLocation(
    existing,
    imported,
    "2026-07-31",
    baseline
  );

  assert.equal(location.status, existing.status);
  assert.equal(location.stock, existing.stock);
  assert.deepEqual(Object.keys(reviewCandidate.fields), ["stock"]);
  assert.deepEqual(reviewCandidate.fields.stock, {
    before: "配布中",
    gkp: "在庫切れ"
  });
});

test("a GKP row restored after an acknowledged disappearance requires review", () => {
  const existing = {
    ...officialLocation(),
    sourceType: "gkp_prefecture_page"
  };
  const baseline = mergeAcceptedGkpObservation(
    undefined,
    createGkpObservation(existing, GKP_CONTENT_REVIEW_FIELDS),
    null
  );
  baseline.gkpListing = false;

  const { reviewCandidate, baselineEntry } = reconcileReviewedGkpLocation(
    existing,
    existing,
    "2026-07-14",
    baseline
  );

  assert.deepEqual(reviewCandidate.fields.gkpListing, { before: false, gkp: true });
  assert.equal(baselineEntry.gkpListing, false);
});

test("official-first source policy requires a reviewed non-GKP source", () => {
  assert.match(sourcePolicyError({ sourceType: "unknown" }), /unknown sourceType/);
  assert.match(sourcePolicyError({
    sourceType: OFFICIAL_PUBLIC_BODY_SOURCE_TYPE,
    sourceUrl: "https://www.gk-p.jp/mhcard/?pref=13"
  }), /reviewed government source/);
  assert.equal(sourcePolicyError(officialLocation()), "");
});

function officialLocation(overrides = {}) {
  return {
    id: "13-101-a-01",
    cardName: "公式市 A001",
    prefecture: "東京都",
    municipality: "公式市",
    place: "公式配布場所",
    address: "東京都公式市一丁目1番1号",
    lat: 35.6,
    lng: 139.7,
    hours: "9:00～17:00",
    closed: "土日祝日",
    condition: "1人1枚",
    stock: "配布中",
    status: "配布中",
    sourceUrl: "https://www.example-city.lg.jp/manhole-card/a001.html",
    sourceType: OFFICIAL_PUBLIC_BODY_SOURCE_TYPE,
    imageUrl: "https://www.example-city.lg.jp/images/card-a001.jpg",
    series: "第30弾",
    issuedOn: "2026/12/01",
    coordinateAccuracy: "address",
    updatedAt: "2026-07-14",
    plusCode: "8Q7XJP22+22",
    ...overrides
  };
}
