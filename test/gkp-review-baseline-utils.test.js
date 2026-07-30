import test from "node:test";
import assert from "node:assert/strict";
import {
  GKP_ALL_REVIEW_FIELDS,
  GKP_CONTENT_REVIEW_FIELDS,
  acknowledgeGkpReviewCandidates,
  changedGkpObservationFields,
  createGkpObservation,
  emptyGkpReviewBaseline,
  gkpReviewBaselineFormatError,
  mergeAcceptedGkpObservation
} from "../scripts/gkp-review-baseline-utils.js";

test("derived launch fields keep compatibility slots without becoming GKP observations", () => {
  assert.equal(GKP_CONTENT_REVIEW_FIELDS.includes("status"), false);
  assert.equal(GKP_CONTENT_REVIEW_FIELDS.includes("distributionStartsOn"), false);
  assert.deepEqual(GKP_ALL_REVIEW_FIELDS, [
    "cardName",
    "place",
    "address",
    "hours",
    "closed",
    "condition",
    "stock",
    "status",
    "distributionStartsOn",
    "distributionPlaces",
    "hasEnglishVersion",
    "englishVersionStatus",
    "englishVersionNote",
    "englishVersionUrl",
    "facilityUrl",
    "stockUrl"
  ]);
  assert.equal(emptyGkpReviewBaseline().version, 3);
});

test("the first observation initializes a baseline without creating historical changes", () => {
  const observation = createGkpObservation({ place: "現在のGKP配布先" }, ["place"]);

  assert.deepEqual(changedGkpObservationFields(undefined, observation, ["place"]), []);
  const baseline = mergeAcceptedGkpObservation(undefined, observation, null);
  assert.equal(baseline.gkpListing, true);
  assert.match(baseline.fingerprints, /^[A-Za-z0-9_|-]+$/);
});

test("only fields changed since the accepted GKP observation require review", () => {
  const baseline = mergeAcceptedGkpObservation(
    undefined,
    createGkpObservation(
      { place: "旧GKP配布先", address: "同じ住所" },
      ["place", "address"]
    ),
    null
  );
  const observation = createGkpObservation(
    { place: "新GKP配布先", address: "同じ住所" },
    ["place", "address"]
  );

  assert.deepEqual(
    changedGkpObservationFields(baseline, observation, ["place", "address"]),
    ["place"]
  );
});

test("fields introduced by a later normalization phase initialize without review", () => {
  const baseline = mergeAcceptedGkpObservation(
    undefined,
    createGkpObservation({ stock: "配布中" }, ["stock"]),
    null
  );
  const links = createGkpObservation(
    { facilityUrl: "https://example.jp/facility" },
    ["facilityUrl"]
  );

  assert.deepEqual(
    changedGkpObservationFields(baseline, links, ["facilityUrl"]),
    []
  );
});

test("acknowledgement advances rejected values and removes official-source entries", () => {
  const baseline = emptyGkpReviewBaseline();
  baseline.locations["13-101-a-01"] = mergeAcceptedGkpObservation(
    undefined,
    createGkpObservation({ place: "旧配布先" }, ["place"]),
    null
  );
  baseline.locations["13-102-a-01"] = mergeAcceptedGkpObservation(
    undefined,
    createGkpObservation({ stock: "旧在庫" }, ["stock"]),
    null
  );
  const candidates = [
    {
      id: "13-101-a-01",
      fields: { place: { before: "確認済み配布先", gkp: "新GKP配布先" } }
    },
    {
      id: "13-102-a-01",
      fields: { stock: { before: "配布中", gkp: "在庫切れ" } }
    }
  ];

  const next = acknowledgeGkpReviewCandidates(
    baseline,
    candidates,
    new Set(["13-102-a-01"])
  );

  assert.notEqual(
    next.locations["13-101-a-01"].fingerprints,
    baseline.locations["13-101-a-01"].fingerprints
  );
  assert.equal(next.locations["13-102-a-01"], undefined);
});

test("acknowledgement records whether a reviewed GKP row is present", () => {
  const baseline = emptyGkpReviewBaseline();
  baseline.locations["13-101-a-01"] = mergeAcceptedGkpObservation(
    undefined,
    createGkpObservation({ place: "配布先" }, ["place"]),
    null
  );
  const missing = [{
    id: "13-101-a-01",
    fields: { gkpListing: { before: true, gkp: false } }
  }];
  const restored = [{
    id: "13-101-a-01",
    fields: { gkpListing: { before: false, gkp: true } }
  }];

  const afterMissing = acknowledgeGkpReviewCandidates(baseline, missing);
  const afterRestored = acknowledgeGkpReviewCandidates(afterMissing, restored);

  assert.equal(afterMissing.locations["13-101-a-01"].gkpListing, false);
  assert.equal(afterRestored.locations["13-101-a-01"].gkpListing, true);
});

test("baseline format validation rejects malformed fingerprints", () => {
  const baseline = emptyGkpReviewBaseline();
  baseline.locations["13-101-a-01"] = {
    gkpListing: true,
    fingerprints: "too-short"
  };

  assert.match(gkpReviewBaselineFormatError(baseline), /13-101-a-01/);
  assert.equal(gkpReviewBaselineFormatError(emptyGkpReviewBaseline()), "");
});
