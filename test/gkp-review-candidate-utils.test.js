import test from "node:test";
import assert from "node:assert/strict";
import {
  createGkpReviewCandidate,
  createMissingGkpReviewCandidate,
  createRestoredGkpReviewCandidate,
  formatGkpReviewCandidates,
  mergeGkpReviewCandidates
} from "../scripts/gkp-review-candidate-utils.js";

test("creates a complete before and GKP candidate without applying it", () => {
  const existing = location({ place: "確認済み配布先", stock: "配布中" });
  const observed = location({
    id: "13-101-a-02",
    place: "GKP変更後配布先",
    stock: "配布休止中",
    sourceUrl: "https://www.gk-p.jp/mhcard/?pref=13#mhcard_result"
  });

  const candidate = createGkpReviewCandidate(existing, observed, ["place", "stock"]);

  assert.equal(candidate.id, observed.id);
  assert.equal(candidate.gkpSourceUrl, observed.sourceUrl);
  assert.deepEqual(candidate.fields, {
    place: { before: "確認済み配布先", gkp: "GKP変更後配布先" },
    stock: { before: "配布中", gkp: "配布休止中" }
  });
});

test("reports a missing GKP row as a review candidate", () => {
  const candidate = createMissingGkpReviewCandidate(location());

  assert.deepEqual(candidate.fields.gkpListing, {
    before: true,
    gkp: false
  });
  assert.equal(candidate.gkpSourceUrl, "https://www.gk-p.jp/mhcard/?pref=13#mhcard_result");
});

test("reports a restored GKP row as a review candidate", () => {
  const candidate = createRestoredGkpReviewCandidate(
    location(),
    location({ sourceUrl: "https://www.gk-p.jp/mhcard/?pref=13#mhcard_result" })
  );
  const markdown = formatGkpReviewCandidates([candidate]).join("\n");

  assert.deepEqual(candidate.fields.gkpListing, { before: false, gkp: true });
  assert.match(markdown, /掲載なし/);
  assert.match(markdown, /掲載あり/);
});

test("merges fields for the same card and renders every value", () => {
  const base = {
    id: "13-101-a-01",
    cardName: "確認市 A001",
    prefecture: "東京都",
    municipality: "確認市",
    gkpSourceUrl: "https://www.gk-p.jp/mhcard/?pref=13#mhcard_result"
  };
  const candidates = mergeGkpReviewCandidates(
    [{ ...base, fields: { place: { before: "旧配布先", gkp: "新配布先" } } }],
    [{ ...base, fields: { address: { before: "旧住所", gkp: "新住所" } } }]
  );
  const markdown = formatGkpReviewCandidates(candidates).join("\n");

  assert.equal(candidates.length, 1);
  assert.match(markdown, /13-101-a-01/);
  assert.match(markdown, /旧配布先/);
  assert.match(markdown, /新配布先/);
  assert.match(markdown, /旧住所/);
  assert.match(markdown, /新住所/);
});

function location(overrides = {}) {
  return {
    id: "13-101-a-01",
    cardName: "確認市 A001",
    prefecture: "東京都",
    municipality: "確認市",
    sourceUrl: "https://www.gk-p.jp/mhcard/?pref=13#mhcard_result",
    ...overrides
  };
}
