import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const workflowsDirectory = ".github/workflows";

async function readWorkflow(name) {
  return readFile(`${workflowsDirectory}/${name}`, "utf8");
}

test("pins every GitHub Action to a documented immutable SHA", async () => {
  const names = (await readdir(workflowsDirectory)).filter((name) =>
    name.endsWith(".yml") || name.endsWith(".yaml")
  );

  for (const name of names) {
    const workflow = await readWorkflow(name);
    const usesLines = workflow
      .split("\n")
      .filter((line) => /^\s*(?:-\s+)?uses:/.test(line));

    assert.ok(usesLines.length > 0, `${name} should use at least one action`);
    for (const line of usesLines) {
      assert.match(
        line,
        /^\s*(?:-\s+)?uses:\s+[\w.-]+\/[\w.-]+(?:\/[\w.-]+)?@[0-9a-f]{40}\s+#\s+v\d+(?:\.\d+){1,2}\s*$/,
        `${name} contains an unpinned or undocumented action: ${line.trim()}`
      );
    }
  }
});

test("publishes only runtime data in the Pages artifact", async () => {
  const workflow = await readWorkflow("pages.yml");

  assert.match(workflow, /mkdir -p dist\/data/);
  assert.match(
    workflow,
    /cp data\/locations\.json data\/update-history\.json data\/update-form-config\.json data\/update-requests\.json dist\/data\//
  );
  assert.doesNotMatch(workflow, /cp\s+-R\s+data\b/);
  assert.doesNotMatch(
    workflow,
    /data\/(?:geocode-cache|gkp-review-baseline|municipality-codes)\.json/
  );
});

test("copies every local runtime asset referenced by the HTML entry point", async () => {
  const [html, workflow] = await Promise.all([
    readFile("index.html", "utf8"),
    readWorkflow("pages.yml")
  ]);
  const copiedRootFiles = new Set();
  let copiesIconsDirectory = false;

  for (const line of workflow.split("\n")) {
    const match = line.trim().match(/^cp\s+(.+)\s+dist(?:\/[^\s]+|\/)$/);
    if (!match) continue;
    const tokens = match[1].split(/\s+/).filter((token) => !token.startsWith("-"));
    tokens.forEach((token) => copiedRootFiles.add(token));
    if (tokens.includes("icons")) copiesIconsDirectory = true;
  }

  const localAssets = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => !/^(?:https?:|data:|#)/.test(url))
    .map((url) => url.replace(/[?#].*$/, "").replace(/^\.\//, "").replace(/^\//, ""))
    .filter(Boolean);

  assert.ok(localAssets.includes("favicon.ico"), "the entry point should reference favicon.ico");
  for (const asset of localAssets) {
    if (asset.startsWith("icons/")) {
      assert.ok(copiesIconsDirectory, `Pages should copy the icons directory for ${asset}`);
    } else {
      assert.ok(copiedRootFiles.has(asset), `Pages should copy the referenced root asset ${asset}`);
    }
  }
});

test("runs bounded data updates and browser smoke tests", async () => {
  const [updateWorkflow, ciWorkflow] = await Promise.all([
    readWorkflow("data-update.yml"),
    readWorkflow("ci.yml")
  ]);

  assert.match(updateWorkflow, /jobs:\n\s+update:[\s\S]*?timeout-minutes: 60/);
  assert.match(ciWorkflow, /browser-smoke:\n\s+name: Browser smoke test/);
  assert.match(ciWorkflow, /browser-smoke:[\s\S]*?timeout-minutes: 15/);
  assert.match(ciWorkflow, /npm ci/);
  assert.match(ciWorkflow, /playwright install --with-deps chromium/);
  assert.match(ciWorkflow, /npm run test:e2e/);
});

test("configures weekly dependency updates and CodeQL analysis", async () => {
  const [dependabot, codeql] = await Promise.all([
    readFile(".github/dependabot.yml", "utf8"),
    readWorkflow("codeql.yml")
  ]);

  assert.match(dependabot, /package-ecosystem: github-actions/);
  assert.match(dependabot, /package-ecosystem: npm/);
  assert.equal((dependabot.match(/interval: weekly/g) || []).length, 2);

  assert.match(codeql, /push:\n\s+branches: \[main\]/);
  assert.match(codeql, /pull_request:\n\s+branches: \[main\]/);
  assert.match(codeql, /schedule:\n\s+- cron:/);
  assert.match(codeql, /security-events: write/);
  assert.match(codeql, /languages: javascript-typescript/);
  assert.match(codeql, /github\/codeql-action\/init@[0-9a-f]{40}/);
  assert.match(codeql, /github\/codeql-action\/analyze@[0-9a-f]{40}/);
  assert.match(codeql, /timeout-minutes: 20/);
});

test("keeps public documentation free of stale generated values", async () => {
  const [readme, sitemap] = await Promise.all([
    readFile("README.md", "utf8"),
    readFile("sitemap.xml", "utf8")
  ]);

  assert.doesNotMatch(readme, /実データ\d+件/);
  assert.doesNotMatch(readme, /クラスタ数表示用フォント/);
  assert.doesNotMatch(sitemap, /<lastmod>/);
});
