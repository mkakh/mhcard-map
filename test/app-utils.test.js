import assert from "node:assert/strict";
import test from "node:test";

await import("../app-utils.js");

const { calendarDateInJapan, selectPrimaryDistributionPlace } = globalThis.MhcardAppUtils;

test("uses the Asia/Tokyo calendar date at the local midnight boundary", () => {
  assert.equal(calendarDateInJapan(new Date("2026-08-10T14:59:59Z")), "2026-08-10");
  assert.equal(calendarDateInJapan(new Date("2026-08-10T15:00:00Z")), "2026-08-11");
});

test("selects the first active distribution place with inclusive bounds", () => {
  const places = [
    { id: "old", endsOn: "2026-08-28" },
    { id: "current", startsOn: "2026-08-29", endsOn: "2026-09-30" },
    { id: "overlap", startsOn: "2026-08-29" }
  ];

  assert.equal(selectPrimaryDistributionPlace(places, "2026-08-28").id, "old");
  assert.equal(selectPrimaryDistributionPlace(places, "2026-08-29").id, "current");
  assert.equal(selectPrimaryDistributionPlace(places, "2026-09-30").id, "current");
  assert.equal(selectPrimaryDistributionPlace(places, "2026-10-01").id, "overlap");
});

test("selects the earliest upcoming place before launch and latest expired place afterward", () => {
  const upcoming = [
    { id: "later", startsOn: "2026-09-10" },
    { id: "sooner", startsOn: "2026-08-23", endsOn: "2026-08-23" }
  ];
  const expired = [
    { id: "older", endsOn: "2026-08-01" },
    { id: "newer", endsOn: "2026-08-20" }
  ];

  assert.equal(selectPrimaryDistributionPlace(upcoming, "2026-08-11").id, "sooner");
  assert.equal(selectPrimaryDistributionPlace(expired, "2026-08-21").id, "newer");
});

test("preserves source order for unscheduled places and invalid comparison dates", () => {
  const places = [{ id: "first" }, { id: "second" }];
  assert.equal(selectPrimaryDistributionPlace(places, "2026-08-11").id, "first");
  assert.equal(selectPrimaryDistributionPlace(places, "not-a-date").id, "first");
  assert.equal(selectPrimaryDistributionPlace([], "2026-08-11"), null);
});
