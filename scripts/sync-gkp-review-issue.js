import { spawnSync } from "node:child_process";
import {
  formatGkpReviewCandidates,
  readGkpReviewCandidates
} from "./gkp-review-candidate-utils.js";

const title = "[自動更新] GKP要確認候補";
const marker = "<!-- gkp-review-candidate-detail:";
const repository = process.env.GITHUB_REPOSITORY;

if (!repository || !repository.includes("/")) {
  throw new Error("GITHUB_REPOSITORY is required");
}

const candidates = await readGkpReviewCandidates();
const openIssue = findIssue("open");

if (candidates.length === 0) {
  if (openIssue) {
    ghJson(
      ["api", "--method", "PATCH", `repos/${repository}/issues/${openIssue.number}`],
      { state: "closed", body: emptyBody() }
    );
    console.log(`Closed GKP review issue #${openIssue.number}; no candidates remain`);
  } else {
    console.log("No GKP review candidates or open review issue");
  }
  process.exit(0);
}

const body = issueBody(candidates);
const issue = openIssue ?? findIssue("all");
const activeIssue = issue
  ? updateIssue(issue, body)
  : ghJson(["api", "--method", "POST", `repos/${repository}/issues`], { title, body });

const desiredComments = chunkLines(
  formatGkpReviewCandidates(candidates, { headingLevel: 2 })
).map((chunk, index, chunks) =>
  `<!-- gkp-review-candidate-detail:${index + 1}/${chunks.length} -->\n${chunk}`
);
syncComments(activeIssue.number, desiredComments);
console.log(
  `Synchronized ${candidates.length} GKP review candidate(s) in issue #${activeIssue.number} ` +
  `across ${desiredComments.length} detail comment(s)`
);

function findIssue(state) {
  const pages = ghJson([
    "api",
    "--paginate",
    "--slurp",
    `repos/${repository}/issues?state=${state}&sort=created&direction=desc&per_page=100`
  ]);
  return pages.flat().find((candidate) => candidate.title === title && !candidate.pull_request) ?? null;
}

function updateIssue(issue, body) {
  if (issue.body === body && issue.state === "open") return issue;
  return ghJson(
    ["api", "--method", "PATCH", `repos/${repository}/issues/${issue.number}`],
    { body, state: "open" }
  );
}

function syncComments(issueNumber, desiredBodies) {
  const pages = ghJson([
    "api",
    "--paginate",
    "--slurp",
    `repos/${repository}/issues/${issueNumber}/comments?per_page=100`
  ]);
  const existing = pages.flat().filter((comment) => String(comment.body || "").startsWith(marker));

  for (const [index, body] of desiredBodies.entries()) {
    const comment = existing[index];
    if (!comment) {
      ghJson(
        ["api", "--method", "POST", `repos/${repository}/issues/${issueNumber}/comments`],
        { body }
      );
    } else if (comment.body !== body) {
      ghJson(
        ["api", "--method", "PATCH", `repos/${repository}/issues/comments/${comment.id}`],
        { body }
      );
    }
  }

  for (const comment of existing.slice(desiredBodies.length)) {
    ghJson(["api", "--method", "DELETE", `repos/${repository}/issues/comments/${comment.id}`]);
  }
}

function issueBody(items) {
  const lines = [
    "<!-- gkp-review-candidates -->",
    "週次ActionがGKPで観測した、既存レビュー済みデータとの差分です。既存データには自動適用していません。",
    "",
    `- 要確認: ${items.length}件`,
    "- 対応: 公式ページを開き、カードと配布先を照合して採用または却下する",
    "- 全ての変更前/GKP候補値: このIssueの同期コメントに表示",
    "",
    "## 対象一覧",
    ""
  ];

  const maxBytes = 50000;
  let listed = 0;
  for (const item of items) {
    const fields = Object.keys(item.fields).map((field) => `\`${field}\``).join(", ");
    const line = `- ${item.id} ${item.cardName}（${item.prefecture} / ${item.municipality}）: ${fields}`;
    if (Buffer.byteLength(`${lines.join("\n")}\n${line}`, "utf8") > maxBytes) break;
    lines.push(line);
    listed += 1;
  }
  if (listed < items.length) {
    lines.push(
      "",
      `- 本文上限のため残り${items.length - listed}件の一覧は同期コメントに分割表示しています。`
    );
  }
  return lines.join("\n");
}

function emptyBody() {
  return [
    "<!-- gkp-review-candidates -->",
    "未適用のGKP差分がなくなったため、自動的にクローズしました。"
  ].join("\n");
}

function chunkLines(lines, maxBytes = 55000) {
  const chunks = [];
  let current = [];
  let currentBytes = 0;

  for (const line of lines) {
    const bytes = Buffer.byteLength(`${line}\n`, "utf8");
    if (current.length > 0 && currentBytes + bytes > maxBytes) {
      chunks.push(current.join("\n"));
      current = [];
      currentBytes = 0;
    }
    current.push(line);
    currentBytes += bytes;
  }
  if (current.length > 0) chunks.push(current.join("\n"));
  return chunks;
}

function ghJson(args, input) {
  const result = spawnSync("gh", args.concat(input ? ["--input", "-"] : []), {
    cwd: process.cwd(),
    encoding: "utf8",
    input: input ? JSON.stringify(input) : undefined,
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(String(result.stderr || result.stdout).trim());
  if (!String(result.stdout || "").trim()) return null;
  return JSON.parse(result.stdout);
}
