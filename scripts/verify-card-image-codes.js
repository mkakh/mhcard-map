import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn, spawnSync } from "node:child_process";

const locationsPath = join(process.cwd(), "data", "locations.json");
const applyChanges = process.argv.includes("--apply");
const strict = process.argv.includes("--strict");
const warnOnly = process.argv.includes("--warn-only");
const allImages = process.argv.includes("--all");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const tesseractCommand = process.env.TESSERACT_COMMAND || "tesseract";
const magickCommand = process.env.MAGICK_COMMAND || "magick";
const cropSpecs = [
  "28%x10%+8+10",
  "30%x12%+6+9",
  "42%x13%+8+10"
];

const tesseractCheck = spawnSync(tesseractCommand, ["--version"], { encoding: "utf8" });
if (tesseractCheck.error || tesseractCheck.status !== 0) {
  console.error(`Tesseract is required. Install tesseract-ocr or set TESSERACT_COMMAND.`);
  process.exit(1);
}

const magickCheck = spawnSync(magickCommand, ["-version"], { encoding: "utf8" });
if (magickCheck.error || magickCheck.status !== 0) {
  console.error(`ImageMagick is required. Install imagemagick or set MAGICK_COMMAND.`);
  process.exit(1);
}

const locations = JSON.parse(await readFile(locationsPath, "utf8"));
const candidates = locations.filter(isOcrCandidate).slice(0, limit);
const tempDir = join(tmpdir(), "manhole-card-ocr");
await mkdir(tempDir, { recursive: true });

const ids = new Set(locations.map((location) => location.id));
const changes = [];
const warnings = [];

for (const [index, location] of candidates.entries()) {
  const imagePath = join(tempDir, `${index}-${location.id}.jpg`);
  try {
    await download(location.imageUrl, imagePath);
    const currentCode = cardCodeFromId(location.id);
    const detectedCode = await detectPrintedCode(imagePath, currentCode, index, location.id);
    if (!detectedCode) {
      warnings.push(`${location.id}: OCR did not find printed card code`);
      continue;
    }

    if (detectedCode === currentCode) continue;

    const nextId = idFromPrintedCode(detectedCode);
    if (!nextId) {
      warnings.push(`${location.id}: OCR found unsupported code ${detectedCode}`);
      continue;
    }
    if (ids.has(nextId) && nextId !== location.id) {
      warnings.push(`${location.id}: OCR target ${nextId} already exists`);
      continue;
    }

    changes.push({
      fromId: location.id,
      toId: nextId,
      fromCode: currentCode,
      toCode: detectedCode,
      cardName: location.cardName,
      imageUrl: location.imageUrl
    });

    if (applyChanges) {
      ids.delete(location.id);
      ids.add(nextId);
      const previousId = location.id;
      location.id = nextId;
      location.legacyIds = uniqueLegacyIds([...(location.legacyIds ?? []), previousId], location.id, ids);
      if (!cardCodeFromName(location.cardName) && detectedCode !== codeWithOneSuffix(detectedCode)) {
        location.cardName = `${location.municipality} ${cardCodeSuffix(detectedCode)}`;
      }
    }
  } catch (error) {
    warnings.push(`${location.id}: ${error.message}`);
  }
}

if (applyChanges && changes.length > 0) {
  await writeFile(locationsPath, `${JSON.stringify(locations, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({
  total: locations.length,
  candidates: candidates.length,
  changed: changes.length,
  applied: applyChanges,
  changes,
  warnings
}, null, 2));

if (warnOnly) {
  for (const change of changes) {
    console.log(`::warning title=Card image code mismatch::${change.fromId} ${change.cardName}: ${change.fromCode} -> ${change.toCode}`);
  }
  for (const warning of warnings) {
    console.log(`::warning title=Card image OCR warning::${warning}`);
  }
}

if (strict && warnings.length > 0) process.exit(1);
if (!applyChanges && changes.length > 0 && !warnOnly) process.exit(1);

function isOcrCandidate(location) {
  if (!location.imageUrl) return false;
  if (allImages) return true;
  if (cardCodeFromName(location.cardName)) return false;

  const key = imageKey(location.imageUrl);
  const match = key.match(/(?:^|-)([a-z])-?0*(\d{1,3})(?:-\d+)?$/);
  if (!match) return false;

  return Number(match[2]) !== 1;
}

async function download(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`failed to download image (${response.status})`);
  }
  await pipeline(response.body, createWriteStream(outputPath));
}

async function detectPrintedCode(imagePath, currentCode, index, locationId) {
  const detectedCodes = [];
  for (const [cropIndex, cropSpec] of cropSpecs.entries()) {
    const cropPath = join(tempDir, `${index}-${locationId}-code-${cropIndex}.png`);
    await cropCodeRegion(imagePath, cropPath, cropSpec);
    const detectedCode = extractPrintedCode(await ocr(cropPath));
    if (!detectedCode) continue;
    if (detectedCode === currentCode) return detectedCode;
    detectedCodes.push(detectedCode);
  }
  return detectedCodes[0] ?? "";
}

function ocr(imagePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(tesseractCommand, [
      imagePath,
      "stdout",
      "--psm",
      "7",
      "-c",
      "tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-"
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => stdout += chunk);
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `tesseract exited with ${code}`));
    });
  });
}

function cropCodeRegion(inputPath, outputPath, cropSpec) {
  return new Promise((resolve, reject) => {
    const child = spawn(magickCommand, [
      inputPath,
      "-gravity",
      "northeast",
      "-crop",
      cropSpec,
      "+repage",
      "-resize",
      "1800%",
      "-colorspace",
      "Gray",
      "-normalize",
      outputPath
    ], { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `magick exited with ${code}`));
    });
  });
}

function extractPrintedCode(text) {
  const normalized = String(text ?? "")
    .toUpperCase()
    .replace(/[‐‑‒–—―ー－]/g, "-")
    .replace(/\s+/g, "");

  const match = normalized.match(/(\d{2})-?(\d{3})-?([A-Z])0*(\d{3})/);
  if (!match) return "";
  return `${match[1]}-${match[2]}-${match[3]}${match[4].padStart(3, "0")}`;
}

function idFromPrintedCode(code) {
  const match = String(code ?? "").match(/^(\d{2})-(\d{3})-([A-Z])0*(\d{3})$/);
  if (!match) return "";
  const number = Number(match[4]);
  const suffix = number === 1
    ? `${match[3].toLowerCase()}-01`
    : number < 100
      ? `${match[3].toLowerCase()}-${String(number).padStart(2, "0")}`
      : `${match[3].toLowerCase()}${number}`;
  return `${match[1]}-${match[2]}-${suffix}`;
}

function cardCodeFromId(id) {
  const match = String(id ?? "").match(/^(\d{2})-(\d{3})-([a-z])-?0*(\d+)$/i);
  if (!match) return "";
  return `${match[1]}-${match[2]}-${match[3].toUpperCase()}${String(Number(match[4])).padStart(3, "0")}`;
}

function cardCodeFromName(cardName) {
  return String(cardName ?? "").match(/\s([A-Z][0-9]{3})\)?$/)?.[1] ?? "";
}

function cardCodeSuffix(code) {
  return String(code ?? "").match(/([A-Z]\d{3})$/)?.[1] ?? "";
}

function codeWithOneSuffix(code) {
  return String(code ?? "").replace(/[A-Z]\d{3}$/, (suffix) => `${suffix[0]}001`);
}

function uniqueLegacyIds(values, currentId, currentIds) {
  return [...new Set(values)].filter((id) => id && id !== currentId && !currentIds.has(id));
}

function imageKey(imageUrl) {
  const fileName = (String(imageUrl ?? "").split("/").pop() ?? "").replace(/[.。]+$/g, "");
  return fileName
    .replace(/\.[^.]+$/, "")
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
