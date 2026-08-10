import assert from "node:assert/strict";
import test from "node:test";

await import("../card-catalog.js");

const { compareLocations, orderedPrefectures, seriesSortKey } = globalThis.MhcardCatalog;

test("normalizes catalogue series keys", () => {
  assert.equal(seriesSortKey({ id: "01-100-a-1" }), "A001");
  assert.equal(seriesSortKey({ id: "13-101-B02" }), "B002");
  assert.equal(seriesSortKey({ id: "unstructured-card" }), "~UNSTRUCTUREDCARD");
});

test("sorts catalogue cards by series before municipality", () => {
  const cards = [
    { id: "01-100-b-01", cardName: "B" },
    { id: "13-101-a-10", cardName: "A10" },
    { id: "47-201-a-02", cardName: "A2" },
    { id: "02-202-a-01", cardName: "A1" }
  ];

  assert.deepEqual(cards.toSorted(compareLocations).map((card) => card.id), [
    "02-202-a-01",
    "47-201-a-02",
    "13-101-a-10",
    "01-100-b-01"
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
