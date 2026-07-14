import test from "node:test";
import assert from "node:assert/strict";
import {
  OFFICIAL_PUBLIC_BODY_SOURCE_TYPE,
  isOfficialPublicBodyLocation,
  reconcileOfficialPublicBodyLocation,
  retainUnmatchedOfficialPublicBodyLocations,
  shouldApplyGkpSourceNormalization,
  sourcePolicyError
} from "../scripts/source-policy-utils.js";

test("official public body records are retained when GKP has not listed them", () => {
  const official = officialLocation();
  const retained = retainUnmatchedOfficialPublicBodyLocations([official], new Set(), "2026-07-14");

  assert.deepEqual(retained, [official]);
  assert.equal(shouldApplyGkpSourceNormalization(retained[0]), false);
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
