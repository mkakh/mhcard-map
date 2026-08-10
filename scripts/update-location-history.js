import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { appendHistoryBatch, buildHistoryBatch, updateHistoryVersion } from "./update-history-utils.js";

const args = parseArgs(process.argv.slice(2));
const historyPath = join(process.cwd(), "data", "update-history.json");
const before = await readLocations(args.before, args.beforeRef ?? "HEAD");
const after = await readLocations(args.after, args.afterRef, join(process.cwd(), "data", "locations.json"));
const history = await readHistory(historyPath);
const batch = buildHistoryBatch(before, after, { at: args.at, source: args.source });
const next = appendHistoryBatch(history, batch);

await writeFile(historyPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ addedBatch: batch?.id ?? null, changes: batch?.totalChanges ?? 0, batches: next.updates.length }, null, 2));

function parseArgs(values) {
  const parsed = { at: new Date().toISOString(), source: "Automated data update" };
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    const value = values[index + 1];
    if (!["--before", "--after", "--before-ref", "--after-ref", "--at", "--source"].includes(key) || value === undefined) {
      throw new Error(`Unknown or incomplete argument: ${key}`);
    }
    parsed[key.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    index += 1;
  }
  return parsed;
}

async function readLocations(path, ref, fallbackPath) {
  if (path) return JSON.parse(await readFile(path, "utf8"));
  if (ref) {
    const result = spawnSync("git", ["show", `${ref}:data/locations.json`], {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024
    });
    if (result.status !== 0 || !result.stdout) throw new Error(`Could not read locations from ${ref}`);
    return JSON.parse(result.stdout);
  }
  return JSON.parse(await readFile(fallbackPath, "utf8"));
}

async function readHistory(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { version: updateHistoryVersion, generatedAt: new Date(0).toISOString(), updates: [] };
    throw error;
  }
}
