import assert from "node:assert/strict";
import test from "node:test";

await import("../card-catalog.js");

const {
  calculateVirtualWindow,
  compareLocations,
  estimateVirtualRowHeight,
  filterCatalogLocations,
  formatPublicationIssueMonths,
  fullCardNumberSortKey,
  orderedPublicationSeries,
  orderedPrefectures,
  publicationIssueMonthKey,
  publicationSeriesNumber,
  publicationSeriesOptions,
  seriesSortKey
} = globalThis.MhcardCatalog;

test("normalizes catalogue series keys", () => {
  assert.equal(seriesSortKey({ id: "01-100-a-1" }), "A001");
  assert.equal(seriesSortKey({ id: "13-101-B02" }), "B002");
  assert.equal(seriesSortKey({ id: "unstructured-card" }), "~UNSTRUCTUREDCARD");
});

test("normalizes full printed card numbers", () => {
  assert.equal(fullCardNumberSortKey({ id: "01-100-a-1" }), "01-100-A001");
  assert.equal(fullCardNumberSortKey({ id: "13-101-B02" }), "13-101-B002");
  assert.equal(fullCardNumberSortKey({ id: "unstructured-card" }), "~UNSTRUCTUREDCARD");
});

test("normalizes publication series numbers", () => {
  assert.equal(publicationSeriesNumber("第01弾"), 1);
  assert.equal(publicationSeriesNumber("第2弾"), 2);
  assert.equal(publicationSeriesNumber("第０２弾"), 2);
  assert.equal(publicationSeriesNumber("未設定"), null);
  assert.equal(publicationSeriesNumber(""), null);
});

test("orders unique publication series numerically", () => {
  const cards = [
    { series: "第10弾" },
    { series: "第02弾" },
    { series: "第2弾" },
    { series: "第01弾" },
    { series: "未設定" }
  ];

  assert.deepEqual(orderedPublicationSeries(cards), [1, 2, 10]);
});

test("normalizes valid publication dates to month keys", () => {
  assert.equal(publicationIssueMonthKey("2026/07/31"), "2026-07");
  assert.equal(publicationIssueMonthKey("2026-09-10"), "2026-09");
  assert.equal(publicationIssueMonthKey("2024/02/29"), "2024-02");
  assert.equal(publicationIssueMonthKey("2025/02/29"), null);
  assert.equal(publicationIssueMonthKey("2026/13/01"), null);
  assert.equal(publicationIssueMonthKey(""), null);
});

test("formats all publication months compactly and chronologically", () => {
  assert.equal(formatPublicationIssueMonths(["2025-12", "2025-07", "2025-11"]), "2025年7・11・12月");
  assert.equal(formatPublicationIssueMonths(["2023-01", "2022-08"]), "2022年8月・2023年1月");
  assert.equal(formatPublicationIssueMonths([]), "");
});

test("builds publication-series options with every unique issue month", () => {
  const cards = [
    { series: "第29弾", issuedOn: "2026/09/10" },
    { series: "第02弾", issuedOn: "2016/08/01" },
    { series: "第29弾", issuedOn: "2026/07/31" },
    { series: "第29弾", issuedOn: "2026/07/15" },
    { series: "第01弾", issuedOn: "invalid" }
  ];

  assert.deepEqual(publicationSeriesOptions(cards), [
    { number: 1, value: "1", issuedMonths: [], label: "第1弾" },
    { number: 2, value: "2", issuedMonths: ["2016-08"], label: "第2弾（2016年8月）" },
    {
      number: 29,
      value: "29",
      issuedMonths: ["2026-07", "2026-09"],
      label: "第29弾（2026年7・9月）"
    }
  ]);
});

test("filters the catalogue by prefecture and publication series without mutating it", () => {
  const cards = [
    { id: "13-100-A001", prefecture: "東京都", series: "第01弾" },
    { id: "13-100-B001", prefecture: "東京都", series: "第02弾" },
    { id: "27-100-A001", prefecture: "大阪府", series: "第2弾" },
    { id: "27-100-B001", prefecture: "大阪府", series: "" }
  ];
  const snapshot = structuredClone(cards);

  assert.deepEqual(
    filterCatalogLocations(cards, { prefecture: "東京都", series: "all" }).map((card) => card.id),
    ["13-100-A001", "13-100-B001"]
  );
  assert.deepEqual(
    filterCatalogLocations(cards, { prefecture: "all", series: "2" }).map((card) => card.id),
    ["13-100-B001", "27-100-A001"]
  );
  assert.deepEqual(
    filterCatalogLocations(cards, { prefecture: "東京都", series: "2" }).map((card) => card.id),
    ["13-100-B001"]
  );
  assert.deepEqual(filterCatalogLocations(cards), cards);
  assert.deepEqual(cards, snapshot);
});

test("sorts catalogue cards by full printed card number", () => {
  const cards = [
    { id: "01-100-b-01", cardName: "B" },
    { id: "13-101-a-10", cardName: "A10" },
    { id: "47-201-a-02", cardName: "A2" },
    { id: "02-202-a-01", cardName: "A1" },
    { id: "00-102-b-01", cardName: "National B" },
    { id: "00-102-a-01", cardName: "National A" }
  ];

  assert.deepEqual(cards.toSorted(compareLocations).map((card) => card.id), [
    "00-102-a-01",
    "00-102-b-01",
    "01-100-b-01",
    "02-202-a-01",
    "13-101-a-10",
    "47-201-a-02"
  ]);
});

test("uses normalized card ID and name as deterministic tie breakers", () => {
  const cards = [
    { id: "47-201-a-01", cardName: "Z" },
    { id: "01-100-a-01", cardName: "B" },
    { id: "01-100-a-01", cardName: "A" },
    { id: "malformed-z", cardName: "Malformed" }
  ];

  assert.deepEqual(cards.toSorted(compareLocations).map((card) => card.cardName), [
    "A",
    "B",
    "Z",
    "Malformed"
  ]);
});

test("calculates a bounded virtual window at the top", () => {
  assert.deepEqual(
    calculateVirtualWindow({
      itemCount: 1312,
      columns: 2,
      rowHeight: 300,
      rowGap: 9,
      viewportStart: 0,
      viewportHeight: 600,
      overscanRows: 4
    }),
    {
      rowCount: 656,
      startIndex: 0,
      endIndex: 12,
      offsetTop: 0,
      totalHeight: 202695
    }
  );
});

test("calculates virtual windows in the middle and at the bottom", () => {
  const middle = calculateVirtualWindow({
    itemCount: 100,
    columns: 3,
    rowHeight: 200,
    rowGap: 10,
    viewportStart: 1050,
    viewportHeight: 420,
    overscanRows: 2
  });
  assert.deepEqual(middle, {
    rowCount: 34,
    startIndex: 9,
    endIndex: 27,
    offsetTop: 630,
    totalHeight: 7130
  });

  const bottom = calculateVirtualWindow({
    itemCount: 9,
    columns: 2,
    rowHeight: 100,
    rowGap: 10,
    viewportStart: 9999,
    viewportHeight: 300,
    overscanRows: 1
  });
  assert.deepEqual(bottom, {
    rowCount: 5,
    startIndex: 2,
    endIndex: 9,
    offsetTop: 110,
    totalHeight: 540
  });
});

test("keeps the fallback virtual window bounded when layout measurement is unavailable", () => {
  for (const layout of [
    { availableWidth: 0, columns: 2, rowGap: 9 },
    { availableWidth: 720, columns: 3, rowGap: 12 }
  ]) {
    const rowHeight = estimateVirtualRowHeight(layout);
    const windowState = calculateVirtualWindow({
      itemCount: 1312,
      columns: layout.columns,
      rowHeight,
      rowGap: layout.rowGap,
      viewportStart: 0,
      viewportHeight: 900,
      overscanRows: 4
    });

    assert.ok(rowHeight >= 240);
    assert.ok(windowState.endIndex < 60);
  }
});

test("clamps invalid virtual-window inputs and handles an empty list", () => {
  assert.deepEqual(
    calculateVirtualWindow({
      itemCount: 0,
      columns: 0,
      rowHeight: -1,
      rowGap: -1,
      viewportStart: -100,
      viewportHeight: -20,
      overscanRows: -2
    }),
    { rowCount: 0, startIndex: 0, endIndex: 0, offsetTop: 0, totalHeight: 0 }
  );
});

test("keeps official prefecture order when nationwide card IDs start with 00", () => {
  const cards = [
    { id: "00-102-a-01", prefecture: "大阪府" },
    { id: "13-101-a-01", prefecture: "東京都" },
    { id: "00-101-a-01", prefecture: "埼玉県" },
    { id: "02-100-a-01", prefecture: "青森県" },
    { id: "01-100-a-01", prefecture: "北海道" },
    { id: "00-102-b-01", prefecture: "東京都" },
    { id: "99-999-a-01", prefecture: "架空県" }
  ];

  assert.deepEqual(orderedPrefectures(cards), [
    "北海道",
    "青森県",
    "埼玉県",
    "東京都",
    "大阪府",
    "架空県"
  ]);
});
