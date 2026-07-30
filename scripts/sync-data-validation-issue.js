import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DATA_VALIDATION_ISSUE_TITLE,
  dataValidationFailureBody,
  dataValidationResolvedBody,
  validationOutcome
} from "./data-validation-issue-utils.js";

const repository = process.env.GITHUB_REPOSITORY;
const outcome = validationOutcome(process.env.VALIDATION_OUTCOME);
const runContext = {
  repository,
  runId: process.env.GITHUB_RUN_ID,
  serverUrl: process.env.GITHUB_SERVER_URL,
  sha: process.env.GITHUB_SHA
};

if (!repository || !repository.includes("/")) {
  throw new Error("GITHUB_REPOSITORY is required");
}

const openIssue = findIssue("open");

if (outcome === "success") {
  if (!openIssue) {
    console.log("No open data-validation issue to close");
    process.exit(0);
  }
  ghJson(
    ["api", "--method", "PATCH", `repos/${repository}/issues/${openIssue.number}`],
    {
      state: "closed",
      body: dataValidationResolvedBody(runContext)
    }
  );
  console.log(`Closed data-validation issue #${openIssue.number}`);
  process.exit(0);
}

const log = await readValidationLog();
const body = dataValidationFailureBody({ ...runContext, log });
const issue = openIssue ?? findIssue("all");

if (issue) {
  ghJson(
    ["api", "--method", "PATCH", `repos/${repository}/issues/${issue.number}`],
    { state: "open", body }
  );
  console.log(`Updated data-validation issue #${issue.number}`);
} else {
  const created = ghJson(
    ["api", "--method", "POST", `repos/${repository}/issues`],
    { title: DATA_VALIDATION_ISSUE_TITLE, body }
  );
  console.log(`Created data-validation issue #${created.number}`);
}

async function readValidationLog() {
  try {
    return await readFile(
      join(process.cwd(), ".tmp", "data-validation.log"),
      "utf8"
    );
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

function findIssue(state) {
  const pages = ghJson([
    "api",
    "--paginate",
    "--slurp",
    `repos/${repository}/issues?state=${state}&sort=created&direction=desc&per_page=100`
  ]);
  return pages.flat().find(
    (candidate) =>
      candidate.title === DATA_VALIDATION_ISSUE_TITLE
      && !candidate.pull_request
  ) ?? null;
}

function ghJson(args, input) {
  const result = spawnSync("gh", args.concat(input ? ["--input", "-"] : []), {
    cwd: process.cwd(),
    encoding: "utf8",
    input: input ? JSON.stringify(input) : undefined,
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(String(result.stderr || result.stdout).trim());
  }
  if (!String(result.stdout || "").trim()) return null;
  return JSON.parse(result.stdout);
}
