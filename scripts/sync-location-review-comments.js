import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const marker = "<!-- location-review-detail:";
const prNumber = process.argv[2];
const repository = process.env.GITHUB_REPOSITORY;
const commentsPath = join(process.cwd(), ".tmp", "location-update-review-comments.json");

if (!/^\d+$/.test(prNumber || "")) throw new Error("pull request number is required");
if (!repository || !repository.includes("/")) throw new Error("GITHUB_REPOSITORY is required");

const desiredBodies = JSON.parse(await readFile(commentsPath, "utf8"));
const existingPages = ghJson([
  "api", "--paginate", "--slurp", `repos/${repository}/issues/${prNumber}/comments`
]);
const existing = existingPages.flat().filter((comment) => String(comment.body || "").startsWith(marker));

for (const [index, body] of desiredBodies.entries()) {
  const comment = existing[index];
  if (comment) {
    if (comment.body !== body) {
      ghJson(["api", "--method", "PATCH", `repos/${repository}/issues/comments/${comment.id}`], { body });
    }
  } else {
    ghJson(["api", "--method", "POST", `repos/${repository}/issues/${prNumber}/comments`], { body });
  }
}

for (const comment of existing.slice(desiredBodies.length)) {
  ghJson(["api", "--method", "DELETE", `repos/${repository}/issues/comments/${comment.id}`]);
}

console.log(`Synchronized ${desiredBodies.length} review detail comment(s) on PR #${prNumber}`);

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
