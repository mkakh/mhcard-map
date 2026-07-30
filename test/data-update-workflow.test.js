import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("surfaces validation failures before preserving the red gate", async () => {
  const workflow = await readFile(".github/workflows/data-update.yml", "utf8");
  const validate = workflow.indexOf("id: validate");
  const syncGkp = workflow.indexOf("name: Sync GKP review candidates");
  const syncFailure = workflow.indexOf("name: Sync data-validation issue");
  const failGate = workflow.indexOf("name: Preserve validation failure");
  const createPr = workflow.indexOf("name: Create update pull request");

  assert.ok(validate >= 0);
  assert.match(workflow, /continue-on-error: true/);
  assert.match(workflow, /steps\.validate\.outcome/);
  assert.ok(validate < syncGkp);
  assert.ok(syncGkp < syncFailure);
  assert.ok(syncFailure < failGate);
  assert.ok(failGate < createPr);
});

test("does not synchronize or close review issues from skipped work", async () => {
  const workflow = await readFile(".github/workflows/data-update.yml", "utf8");
  assert.match(
    workflow,
    /steps\.import-gkp\.outcome == 'success'/
  );
  assert.match(
    workflow,
    /steps\.validate\.outcome == 'success' \|\| steps\.validate\.outcome == 'failure'/
  );
});
