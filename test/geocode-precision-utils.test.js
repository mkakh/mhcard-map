import test from "node:test";
import assert from "node:assert/strict";
import {
  addressInputIssues,
  collectGeocodePrecisionCandidates,
  collectGeocodeReviewIssues,
  distanceMeters,
  geocodeSnapshotHash,
  isAddressFormatOnlyShortening,
  isCoordinateWithinPrefecture,
  isManuallyReviewedGeocodeTitle,
  isSuspendedWithoutDistributionLocation
} from "../scripts/geocode-precision-utils.js";
import { encodePlusCode } from "../scripts/plus-code-utils.js";

test("Nominatim labels remain review candidates", () => {
  assert.equal(isManuallyReviewedGeocodeTitle("施設（Nominatim確認）"), false);
  assert.equal(isManuallyReviewedGeocodeTitle("施設（公式アクセス地図）"), false);
  assert.equal(isManuallyReviewedGeocodeTitle("施設（公式地図・手動補正）"), true);

  const candidates = collectGeocodePrecisionCandidates([
    location({ geocodeTitle: "施設（Nominatim確認）" })
  ]);
  assert.equal(candidates.length, 1);
  assert.match(candidates[0].reasons.join(" "), /address numbers disappeared/);
});

test("manual review suppresses address-title precision warnings but not prefecture mismatch", () => {
  assert.equal(collectGeocodePrecisionCandidates([
    location({ geocodeTitle: "施設（手動補正）" })
  ]).length, 0);

  const candidates = collectGeocodePrecisionCandidates([
    location({ geocodeTitle: "施設（手動補正）", lat: 40.745602, lng: 140.466461 })
  ]);
  assert.deepEqual(candidates[0].reasons, ["coordinate is outside prefecture bounds"]);
});

test("ordinary unreviewed coordinates are not treated as objective issues", () => {
  const formatOnly = location({
    geocodeQuery: "茨城県守谷市百合ケ丘二丁目2734番地の1",
    geocodeTitle: "守谷市百合ケ丘2-2734-1"
  });
  assert.equal(collectGeocodePrecisionCandidates([formatOnly]).length, 0);
  assert.equal(collectGeocodeReviewIssues([formatOnly]).length, 0);
});

test("manual review status does not suppress an objective coordinate error", () => {
  assert.equal(collectGeocodeReviewIssues([
    location({ geocodeTitle: "施設（手動補正）" })
  ]).length, 0);

  const issues = collectGeocodeReviewIssues([
    location({ geocodeTitle: "施設（手動補正）", lat: 40.745602, lng: 140.466461 })
  ]);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, "high");
});

test("known address corruption remains an issue after coordinate review", () => {
  const [candidate] = collectGeocodeReviewIssues([
    location({
      address: "住所：加古川市加古川町篠原町503-2",
      geocodeQuery: "住所：加古川市加古川町篠原町503-2",
      geocodeTitle: "加古川観光案内所（公式配布先・地図検索照合・手動補正）"
    })
  ]);

  assert.equal(candidate.severity, "medium");
  assert.match(candidate.riskReasons.join(" "), /address input issue/);
});

test("missing geocode inputs are exempt only for suspended cards without a published location", () => {
  const suspended = location({
    status: "休止中",
    place: "※現在、配布を一時中止しています",
    address: "",
    geocodeQuery: "",
    geocodeTitle: "",
    coordinateAccuracy: "prefecture_approx"
  });
  assert.equal(isSuspendedWithoutDistributionLocation(suspended), true);
  assert.equal(collectGeocodeReviewIssues([suspended]).length, 0);

  const [activeIssue] = collectGeocodeReviewIssues([{ ...suspended, status: "配布中" }]);
  assert.equal(activeIssue.severity, "medium");
  assert.match(activeIssue.reasons.join(" "), /geocodeQuery is missing/);
  assert.match(activeIssue.reasons.join(" "), /geocodeTitle is missing/);
});

test("legacy address format heuristic remains informational", () => {
  assert.equal(
    isAddressFormatOnlyShortening("茨城県守谷市百合ケ丘二丁目2734番地の1", "守谷市百合ケ丘2-2734-1"),
    true
  );
  assert.equal(
    isAddressFormatOnlyShortening("岡山県久米郡久米南町大字下二ケ1367-1", "久米南町下二ケ1367-1"),
    true
  );
  assert.equal(
    isAddressFormatOnlyShortening("宮城県東松島市野蒜字北余景56-36", "東松島市野蒜北景56-36"),
    false
  );
});

test("known address input corruption is reported mechanically", () => {
  assert.deepEqual(addressInputIssues("沖縄県国頭郡本部町字大浜881-1"), []);
  assert.match(addressInputIssues("住所：加古川市加古川町篠原町503-2").join(" "), /address label/);
  assert.match(addressInputIssues("山山梨県甲斐市篠原2534番地1").join(" "), /duplicated prefecture/);
  assert.match(addressInputIssues("大阪府四條綴市中野本町1-1").join(" "), /known typo/);
});

test("prefecture bounds catch obvious cross-prefecture coordinates", () => {
  assert.equal(isCoordinateWithinPrefecture("沖縄県", 26.59046, 127.985458), true);
  assert.equal(isCoordinateWithinPrefecture("沖縄県", 40.745602, 140.466461), false);
  assert.equal(isCoordinateWithinPrefecture("山梨県", 36.124226, 139.877808), false);
  const crossPrefecture = collectGeocodePrecisionCandidates([
    location({
      prefecture: "兵庫県",
      municipality: "兵庫県",
      address: "大阪府豊中市原田西町1-1",
      geocodeQuery: "大阪府豊中市原田西町1-1",
      geocodeTitle: "大阪府豊中市原田西町1番",
      lat: 34.769676,
      lng: 135.448883
    })
  ]);
  assert.equal(crossPrefecture.some((candidate) => candidate.reasons.includes("coordinate is outside prefecture bounds")), false);
});

test("distance, snapshot hashes, and Plus Codes are deterministic", () => {
  const distance = distanceMeters({ lat: 35, lng: 139 }, { lat: 35.001, lng: 139 });
  assert.ok(distance > 110 && distance < 112);

  const target = { id: "place-1", name: "施設", address: "住所1", lat: 35, lng: 139, geocodeQuery: "住所1", geocodeTitle: "住所1" };
  assert.equal(geocodeSnapshotHash(target), geocodeSnapshotHash({ ...target }));
  assert.notEqual(geocodeSnapshotHash(target), geocodeSnapshotHash({ ...target, address: "住所2" }));
  assert.notEqual(geocodeSnapshotHash(target), geocodeSnapshotHash({ ...target, coordinateAccuracy: "address" }));
  assert.equal(encodePlusCode(43.115871, 141.34256), "8RM3488V+82");
});

function location(overrides = {}) {
  return {
    id: "47-308-a-01",
    cardName: "本部町",
    prefecture: "沖縄県",
    municipality: "本部町",
    place: "施設",
    address: "沖縄県国頭郡本部町字大浜881-1",
    lat: 26.59046,
    lng: 127.985458,
    geocodeQuery: "沖縄県国頭郡本部町字大浜881-1",
    geocodeTitle: "沖縄県本部町大浜",
    ...overrides
  };
}
