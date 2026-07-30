import assert from "node:assert/strict";
import test from "node:test";
import {
  DATA_VALIDATION_ISSUE_TITLE,
  dataValidationFailureBody,
  dataValidationResolvedBody,
  validationOutcome
} from "../scripts/data-validation-issue-utils.js";

test("formats a safe failure issue with workflow context", () => {
  const body = dataValidationFailureBody({
    log: "\u001b[31mfailed\u001b[0m\n```",
    repository: "owner/repo",
    runId: "123",
    serverUrl: "https://github.example/",
    sha: "abc123"
  });

  assert.equal(DATA_VALIDATION_ISSUE_TITLE, "[自動更新] データ検証失敗");
  assert.match(body, /https:\/\/github\.example\/owner\/repo\/actions\/runs\/123/);
  assert.match(body, /`abc123`/);
  assert.match(body, /failed/);
  assert.doesNotMatch(body, /\u001b/);
  assert.match(body, /``\u200b`/);
});

test("truncates oversized validation logs explicitly", () => {
  const body = dataValidationFailureBody({ log: "あ".repeat(30000) });
  assert.match(body, /byte を省略しました/);
  assert.ok(Buffer.byteLength(body, "utf8") < 55000);
});

test("formats the successful resolution body", () => {
  const body = dataValidationResolvedBody({
    repository: "owner/repo",
    runId: "456",
    sha: "def456"
  });
  assert.match(body, /データ検証が成功/);
  assert.match(body, /actions\/runs\/456/);
});

test("accepts only terminal validation outcomes", () => {
  assert.equal(validationOutcome("success"), "success");
  assert.equal(validationOutcome("failure"), "failure");
  assert.throws(() => validationOutcome("skipped"), /success or failure/);
});
