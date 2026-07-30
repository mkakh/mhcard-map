export const DATA_VALIDATION_ISSUE_TITLE = "[自動更新] データ検証失敗";

const marker = "<!-- data-validation-failure -->";
const maxLogBytes = 50000;

export function dataValidationFailureBody({
  log = "",
  repository = "",
  runId = "",
  serverUrl = "https://github.com",
  sha = ""
} = {}) {
  const runUrl = workflowRunUrl({ repository, runId, serverUrl });
  const normalizedLog = stripAnsi(String(log || "").trim())
    || "検証ログを読み取れませんでした。Workflow runを確認してください。";
  const excerpt = truncateUtf8(normalizedLog, maxLogBytes);

  return [
    marker,
    "週次データ更新の最終検証が失敗したため、PRは作成していません。",
    "検証条件は緩めず、原因を確認してから再実行してください。",
    "",
    runUrl ? `- Workflow run: ${runUrl}` : "- Workflow run: (不明)",
    sha ? `- Commit: \`${sha}\`` : "- Commit: (不明)",
    "",
    "## 検証ログ",
    "",
    "```text",
    escapeFence(excerpt.text),
    "```",
    ...(excerpt.omittedBytes > 0
      ? ["", `ログ上限のため末尾 ${excerpt.omittedBytes} byte を省略しました。`]
      : [])
  ].join("\n");
}

export function dataValidationResolvedBody({
  repository = "",
  runId = "",
  serverUrl = "https://github.com",
  sha = ""
} = {}) {
  const runUrl = workflowRunUrl({ repository, runId, serverUrl });
  return [
    marker,
    "データ検証が成功したため、自動的にクローズしました。",
    "",
    runUrl ? `- Workflow run: ${runUrl}` : "- Workflow run: (不明)",
    sha ? `- Commit: \`${sha}\`` : "- Commit: (不明)"
  ].join("\n");
}

export function validationOutcome(value) {
  if (value === "success" || value === "failure") return value;
  throw new Error(`VALIDATION_OUTCOME must be success or failure, got ${JSON.stringify(value)}`);
}

function workflowRunUrl({ repository, runId, serverUrl }) {
  if (!repository || !runId) return "";
  return `${String(serverUrl || "https://github.com").replace(/\/+$/, "")}/${repository}/actions/runs/${runId}`;
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function escapeFence(value) {
  return value.replaceAll("```", "``\u200b`");
}

function truncateUtf8(value, maxBytes) {
  const buffer = Buffer.from(value, "utf8");
  if (buffer.length <= maxBytes) return { text: value, omittedBytes: 0 };

  let end = maxBytes;
  while (end > 0 && (buffer[end] & 0xc0) === 0x80) end -= 1;
  return {
    text: buffer.subarray(0, end).toString("utf8"),
    omittedBytes: buffer.length - end
  };
}
