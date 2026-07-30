import test from "node:test";
import assert from "node:assert/strict";
import { reviewCommentBodies } from "../scripts/review-comment-utils.js";

test("splits review tables into independently renderable comment chunks", () => {
  const rows = Array.from(
    { length: 12 },
    (_, index) => `| item-${index + 1} | ${"説明".repeat(10)}-${index + 1} |`
  );
  const maxBytes = 360;
  const bodies = reviewCommentBodies(
    [[
      "Candidates",
      [
        "Complete candidate details follow.",
        "",
        "| target | detail |",
        "| --- | --- |",
        ...rows
      ]
    ]],
    maxBytes
  );

  assert.ok(bodies.length > 1);
  bodies.forEach((body, index) => {
    assert.ok(Buffer.byteLength(body, "utf8") <= maxBytes);
    assert.match(body, new RegExp(`location-review-detail:${index + 1}/${bodies.length}`));
    assert.match(body, /## Candidates/);
    if (body.includes("| item-")) {
      assert.match(body, /\| target \| detail \|\n\| --- \| --- \|/);
    }
  });

  const observedRows = bodies.flatMap((body) => body.match(/\| item-\d+ \|[^\n]+/g) ?? []);
  assert.deepEqual(observedRows, rows);
});

test("preserves section and row order across chunks", () => {
  const bodies = reviewCommentBodies(
    [
      ["First", ["first-a", "first-b"]],
      ["Second", ["second-a", "second-b"]]
    ],
    160
  );
  assert.deepEqual(
    bodies.map((body) => body.match(/^## .+$/m)?.[0]),
    ["## First", "## Second"]
  );
  assert.ok(bodies.join("\n").indexOf("first-b") < bodies.join("\n").indexOf("second-a"));
});

test("rejects an indivisible line that cannot fit", () => {
  assert.throws(
    () => reviewCommentBodies([["Oversized", ["x".repeat(500)]]], 180),
    /indivisible line/
  );
});
