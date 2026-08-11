import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogueMetadataValidationErrors,
  isCanonicalPublicationSeries,
  isRealCalendarDate,
  normalizeImportedPublicationSeries,
  normalizePublicationSeries
} from "../scripts/catalogue-metadata-utils.js";

test("normalizes GKP publication-series variants for importer use", () => {
  assert.equal(normalizePublicationSeries("第2弾"), "第02弾");
  assert.equal(normalizePublicationSeries("第２弾"), "第02弾");
  assert.equal(normalizePublicationSeries(" 第 ０２ 弾 "), "第02弾");
  assert.equal(normalizePublicationSeries("第10弾"), "第10弾");
  assert.equal(normalizePublicationSeries("第0弾"), null);
  assert.equal(normalizePublicationSeries("特別弾"), null);
  assert.equal(normalizeImportedPublicationSeries("第２弾"), "第02弾");
  assert.equal(normalizeImportedPublicationSeries("特別弾"), "特別弾");
});

test("accepts only canonical positive publication-series values", () => {
  assert.equal(isCanonicalPublicationSeries("第01弾"), true);
  assert.equal(isCanonicalPublicationSeries("第29弾"), true);
  assert.equal(isCanonicalPublicationSeries("第2弾"), false);
  assert.equal(isCanonicalPublicationSeries("第０２弾"), false);
  assert.equal(isCanonicalPublicationSeries("第00弾"), false);
  assert.equal(isCanonicalPublicationSeries(""), false);
});

test("validates real slash and ISO calendar dates including leap years", () => {
  assert.equal(isRealCalendarDate("2024/02/29", "/"), true);
  assert.equal(isRealCalendarDate("2023/02/29", "/"), false);
  assert.equal(isRealCalendarDate("2026/04/31", "/"), false);
  assert.equal(isRealCalendarDate("2026/08/12", "/"), true);
  assert.equal(isRealCalendarDate("2000-02-29", "-"), true);
  assert.equal(isRealCalendarDate("1900-02-29", "-"), false);
  assert.equal(isRealCalendarDate("2026-13-01", "-"), false);
  assert.equal(isRealCalendarDate("2026-8-12", "-"), false);
});

test("optional official-first catalogue metadata can remain missing", () => {
  const officialFirst = { sourceType: "official_public_body_page" };
  assert.deepEqual(catalogueMetadataValidationErrors(officialFirst), []);
});

test("catalogue validation flags noncanonical series and impossible issue dates", () => {
  assert.deepEqual(
    catalogueMetadataValidationErrors({ series: "第2弾", issuedOn: "2026/02/30" }),
    [
      "series must use canonical 第NN弾 format with a positive integer",
      "issuedOn must be a real YYYY/MM/DD date"
    ]
  );
  assert.deepEqual(
    catalogueMetadataValidationErrors({ series: "第02弾", issuedOn: "2024/02/29" }),
    []
  );
});
