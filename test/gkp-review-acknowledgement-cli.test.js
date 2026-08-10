import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { GKP_ALL_REVIEW_FIELDS } from "../scripts/gkp-review-baseline-utils.js";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL("../scripts/acknowledge-gkp-review-candidates.js", import.meta.url));

test("cleans official-source baseline entries when there are no review candidates", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "mhcard-gkp-ack-"));
  try {
    await mkdir(join(cwd, "data"), { recursive: true });
    await writeFile(
      join(cwd, "data", "locations.json"),
      `${JSON.stringify([{ id: "13-101-a-01", sourceType: "official_public_body_page" }], null, 2)}\n`
    );
    await writeFile(
      join(cwd, "data", "gkp-review-baseline.json"),
      `${JSON.stringify({
        version: 3,
        fieldOrder: GKP_ALL_REVIEW_FIELDS,
        locations: {
          "13-101-a-01": {
            gkpListing: true,
            fingerprints: GKP_ALL_REVIEW_FIELDS.map(() => "-").join("|")
          }
        }
      }, null, 2)}\n`
    );

    await execFileAsync(process.execPath, [scriptPath], { cwd });
    const baseline = JSON.parse(await readFile(join(cwd, "data", "gkp-review-baseline.json"), "utf8"));

    assert.deepEqual(baseline.locations, {});
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
