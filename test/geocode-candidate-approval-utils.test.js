import test from "node:test";
import assert from "node:assert/strict";
import { candidateApprovalError } from "../scripts/geocode-candidate-approval-utils.js";

test("only explicitly reviewed coordinates with official card evidence can be applied", () => {
  const approved = {
    decision: "adopt",
    approvedLat: "35.1",
    approvedLng: "139.2",
    officialUrlCandidates: '["https://www.example.go.jp/card"]',
    officialSearchCandidates: "[]",
    placesCandidates: '[{"lat":35.1,"lng":139.2}]',
    officialMapCandidates: "[]",
    reviewedOfficialUrl: "https://www.example.go.jp/card",
    reviewedCoordinateSource: "serper-places",
    reviewedCoordinateEvidence: "Exact facility name and address matched in Places.",
    reviewedAt: "2026-07-14",
    reviewNotes: "Card A001 and distribution facility matched on the official page."
  };

  assert.equal(candidateApprovalError(approved), "");
  assert.equal(candidateApprovalError({ ...approved, decision: "" }), "not explicitly adopted");
  assert.match(candidateApprovalError({ ...approved, approvedLat: "" }), /approvedLat/);
  assert.equal(candidateApprovalError({
    ...approved,
    approvedTitle: "施設（公式配布先・手動補正）"
  }), "");
  assert.match(candidateApprovalError({
    ...approved,
    approvedTitle: "施設（公式配布先・既存レビュー済み座標）"
  }), /approvedTitle must include 手動補正/);
  assert.match(candidateApprovalError({ ...approved, reviewedCoordinateSource: "nominatim" }), /reviewedCoordinateSource/);
  assert.match(candidateApprovalError({ ...approved, reviewedOfficialUrl: "https://" }), /valid HTTP/);
  assert.match(candidateApprovalError({ ...approved, reviewedOfficialUrl: "https://other.example/card" }), /generated official URL/);
  assert.match(candidateApprovalError({ ...approved, approvedLat: "35.2" }), /must match/);
  assert.match(candidateApprovalError({ ...approved, reviewedAt: "2026-02-30" }), /valid YYYY-MM-DD/);
  assert.match(candidateApprovalError({ ...approved, reviewNotes: "" }), /reviewNotes/);
});
