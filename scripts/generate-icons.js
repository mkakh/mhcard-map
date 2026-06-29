import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const svgPath = resolve(root, "icons", "mhcard-icon.svg");
const tempDir = resolve(root, ".tmp", "icon-render");
const tempHtmlPath = join(tempDir, "render.html");
const targets = [
  { path: resolve(root, "icons", "apple-touch-icon.png"), size: 180 },
  { path: resolve(root, "icons", "icon-192.png"), size: 192 },
  { path: resolve(root, "icons", "icon-512.png"), size: 512 }
];

const browserPath = findBrowser();
if (!browserPath) {
  console.error("Chrome or Edge was not found. Install one of them to generate PNG icons.");
  process.exit(1);
}

await mkdir(tempDir, { recursive: true });
await writeFile(
  tempHtmlPath,
  `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
      }

      img {
        display: block;
        width: 100vw;
        height: 100vh;
      }
    </style>
  </head>
  <body>
    <img src="${pathToFileURL(svgPath).href}" alt="">
  </body>
</html>
`,
  "utf8"
);

for (const target of targets) {
  await mkdir(dirname(target.path), { recursive: true });
  await renderPng(target.path, target.size);
  console.log(`Generated ${target.path} (${target.size}x${target.size})`);
}

await rm(tempDir, { recursive: true, force: true });

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "google-chrome",
    "chromium",
    "msedge"
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

function renderPng(outputPath, size) {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--hide-scrollbars",
    "--no-first-run",
    "--force-device-scale-factor=1",
    `--user-data-dir=${join(tempDir, `profile-${size}`)}`,
    `--window-size=${size},${size}`,
    `--screenshot=${outputPath}`,
    pathToFileURL(tempHtmlPath).href
  ];

  return new Promise((resolveProcess, rejectProcess) => {
    const child = spawn(browserPath, args, { stdio: "inherit" });
    child.on("error", rejectProcess);
    child.on("exit", (code) => {
      if (code === 0) resolveProcess();
      else rejectProcess(new Error(`Browser exited with code ${code}`));
    });
  });
}
