import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarDateInJapan,
  normalizeDistributionDate,
  statusForDistributionStart
} from "../scripts/distribution-status-utils.js";

test("calendarDateInJapan changes at midnight in Asia/Tokyo", () => {
  assert.equal(calendarDateInJapan(new Date("2026-07-30T14:59:59Z")), "2026-07-30");
  assert.equal(calendarDateInJapan(new Date("2026-07-30T15:00:00Z")), "2026-07-31");
});

test("normalizeDistributionDate accepts GKP and ISO date formats", () => {
  assert.equal(normalizeDistributionDate("2026/7/31"), "2026-07-31");
  assert.equal(normalizeDistributionDate("2026-08-03"), "2026-08-03");
  assert.equal(normalizeDistributionDate("2026/02/30"), "");
});

test("statusForDistributionStart keeps future cards out of active distribution", () => {
  assert.equal(statusForDistributionStart({ startsOn: "2026-07-31", today: "2026-07-14" }), "配布開始前");
  assert.equal(statusForDistributionStart({ startsOn: "2026-07-31", today: "2026-07-31" }), "配布中");
  assert.equal(statusForDistributionStart({ startsOn: "2026-07-31", today: "2026-08-01" }), "配布中");
  assert.equal(statusForDistributionStart({ startsOn: "2026-07-31", today: "2026-07-14", stopped: true }), "休止中");
});
