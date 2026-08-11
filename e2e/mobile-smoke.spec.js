import { expect, test } from "@playwright/test";

const optionalDataPaths = [
  "update-requests.json",
  "update-history.json",
  "update-form-config.json"
];

async function makePageDeterministic(page, { blockedOptional = {}, failStorageWrites = false, initialCollections = null } = {}) {
  if (failStorageWrites) {
    await page.addInitScript(() => {
      Storage.prototype.setItem = function setItem() {
        throw new DOMException("Test storage failure", "QuotaExceededError");
      };
    });
  }
  if (initialCollections) {
    await page.addInitScript((collections) => {
      localStorage.setItem("mhc_collections", JSON.stringify(collections));
    }, initialCollections);
  }

  const blockers = new Map(Object.entries(blockedOptional).map(([path, body]) => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    return [path, { body, gate, release }];
  }));

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://127.0.0.1:4173") {
      await route.abort();
      return;
    }
    const optionalPath = optionalDataPaths.find((path) => url.pathname.endsWith(path));
    const blocker = blockers.get(optionalPath);
    if (blocker) {
      await blocker.gate;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(blocker.body)
      });
      return;
    }
    await route.continue();
  });

  return {
    release(path) {
      const blocker = blockers.get(path);
      if (!blocker) throw new Error(`No blocked optional response for ${path}`);
      blocker.release();
    }
  };
}

async function openCatalogue(page) {
  await page.getByRole("button", { name: "取得数・メモ" }).click();
  await page.getByRole("tab", { name: "カードリスト" }).click();
  await expect(page.locator("#myPageCatalogPanel")).toBeVisible();
}

async function openMobilePanel(page, name) {
  await page.getByRole("button", { name, exact: true }).click();
}

test("renders core data before optional JSON hydration and filters the catalogue", async ({ page }) => {
  const optional = await makePageDeterministic(page, {
    blockedOptional: {
      "update-requests.json": [],
      "update-history.json": { version: 1, updates: [] },
      "update-form-config.json": null
    }
  });
  await page.goto("/");

  await expect.poll(async () => Number(await page.locator("#totalCount").textContent())).toBeGreaterThanOrEqual(1_312);
  await openMobilePanel(page, "検索");
  await expect(page.locator("#requestCount")).toHaveText("0");
  await openMobilePanel(page, "詳細");
  await expect(page.locator("#openRequest")).toBeDisabled();
  await expect(page.locator("#openRequest")).toHaveText("更新要求フォームを確認中");
  optional.release("update-requests.json");
  optional.release("update-history.json");
  optional.release("update-form-config.json");
  await expect(page.locator("#openRequest")).toHaveText("更新要求フォーム未設定");
  await openCatalogue(page);
  await page.locator("#cardCatalogPrefecture").selectOption("岩手県");
  await expect.poll(async () => Number(await page.locator("#cardCatalogVisibleCount").textContent())).toBeGreaterThan(0);
  await page.locator("#cardCatalogSeries").selectOption("10");
  await expect(page.locator("#cardCatalogGrid [role=listitem]").first()).toBeVisible();
});

test("keeps the 1312-card normal list reachable with a bounded DOM window", async ({ page }) => {
  await makePageDeterministic(page);
  await page.goto("/");
  await expect.poll(async () => Number(await page.locator("#totalCount").textContent())).toBeGreaterThanOrEqual(1_312);
  const total = (await page.locator("#totalCount").textContent()).trim();
  await openMobilePanel(page, "検索");

  const renderedCards = page.locator(".location-list-item");
  await expect(renderedCards.first()).toBeVisible();
  expect(await renderedCards.count()).toBeLessThan(30);

  const secondButton = renderedCards.nth(1).locator("button");
  await secondButton.click();
  await expect(secondButton).toHaveClass(/active/);
  await expect(secondButton).toHaveAttribute("aria-current", "true");
  await openMobilePanel(page, "検索");

  await renderedCards.first().locator("button").focus();
  await page.keyboard.press("Tab");
  await expect(renderedCards.nth(1).locator("button")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(renderedCards.first().locator("button")).toBeFocused();
  await renderedCards.first().locator("button").press("End");
  await expect(renderedCards.last()).toHaveAttribute("aria-posinset", total);
  await expect(renderedCards.last().locator("button")).toBeFocused();
  expect(await renderedCards.count()).toBeLessThan(30);

  await renderedCards.last().locator("button").press("Home");
  await expect(renderedCards.first()).toHaveAttribute("aria-posinset", "1");
  await expect(renderedCards.first().locator("button")).toBeFocused();
  await renderedCards.first().locator("button").press("ArrowDown");
  await expect(page.locator('.location-list-item[aria-posinset="2"] button')).toBeFocused();

  await page.locator(".sidebar").evaluate((sidebar) => {
    sidebar.scrollTop = sidebar.scrollHeight;
    sidebar.dispatchEvent(new Event("scroll"));
  });
  await expect(renderedCards.last()).toHaveAttribute("aria-posinset", total);
  expect(await renderedCards.count()).toBeLessThan(30);
});

test("publishes delayed request counts even while the location filter is empty", async ({ page }) => {
  const optional = await makePageDeterministic(page, {
    blockedOptional: {
      "update-requests.json": [{ locationId: "01-100-a-01" }, { locationId: "01-100-b-01" }]
    }
  });
  await page.goto("/");
  await expect.poll(async () => Number(await page.locator("#totalCount").textContent())).toBeGreaterThanOrEqual(1_312);
  await openMobilePanel(page, "検索");
  await page.locator("#searchInput").fill("__no_location_can_match_this__");
  await expect(page.locator("#totalCount")).toHaveText("0");
  optional.release("update-requests.json");
  await expect(page.locator("#requestCount")).toHaveText("2");
  await expect(page.locator("#totalCount")).toHaveText("0");
});

test("enables the update request only after form configuration finishes loading", async ({ page }) => {
  const optional = await makePageDeterministic(page, {
    blockedOptional: {
      "update-form-config.json": {
        formUrl: "https://docs.google.com/forms/d/e/test/viewform",
        entries: { locationId: "entry.1" }
      }
    }
  });
  await page.goto("/");
  await expect.poll(async () => Number(await page.locator("#totalCount").textContent())).toBeGreaterThanOrEqual(1_312);
  await openMobilePanel(page, "詳細");
  await expect(page.locator("#openRequest")).toBeDisabled();
  await expect(page.locator("#openRequest")).toHaveText("更新要求フォームを確認中");
  await page.locator("#collectedOn").fill("2026-08-12");
  await page.locator("[data-place-memo]").first().fill("未保存の入口メモ");
  optional.release("update-form-config.json");
  await expect(page.locator("#openRequest")).toBeEnabled();
  await expect(page.locator("#openRequest")).toHaveText("更新要求");
  await expect(page.locator("#collectedOn")).toHaveValue("2026-08-12");
  await expect(page.locator("[data-place-memo]").first()).toHaveValue("未保存の入口メモ");
});

test("refreshes collected and memo badges immediately in the same virtual window", async ({ page }) => {
  await makePageDeterministic(page);
  await page.goto("/");
  await expect.poll(async () => Number(await page.locator("#totalCount").textContent())).toBeGreaterThanOrEqual(1_312);

  await openMobilePanel(page, "検索");
  const renderedCard = page.locator("[data-location-list-id]").first();
  await expect(renderedCard).toBeVisible();
  const locationId = await renderedCard.getAttribute("data-location-list-id");
  expect(locationId).toBeTruthy();
  await renderedCard.click();

  await openMobilePanel(page, "詳細");
  await page.locator("#toggleCollected").click();
  await page.locator("[data-place-memo]").first().fill("入口は北側");
  await page.locator("#saveMemo").click();
  await openMobilePanel(page, "検索");
  const selectedCard = page.locator(`[data-location-list-id="${locationId}"]`);
  await expect(selectedCard).toHaveAttribute("aria-current", "true");
  await expect(selectedCard.getByText("取得済み", { exact: true })).toBeVisible();
  await expect(selectedCard.getByText("メモあり", { exact: true })).toBeVisible();
});

test("keeps a worst-case location row within its fixed height at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await makePageDeterministic(page, {
    initialCollections: {
      "01-231-b-01": {
        collected: true,
        placeMemos: { primary: "長いメモ" }
      }
    }
  });
  await page.goto("/");
  await expect.poll(async () => Number(await page.locator("#totalCount").textContent())).toBeGreaterThanOrEqual(1_312);
  await openMobilePanel(page, "検索");
  await page.locator("#searchInput").fill("恵庭市 B001");
  const card = page.locator('[data-location-list-id="01-231-b-01"]');
  await expect(card).toBeVisible();
  const dimensions = await card.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight
  }));
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight);
});

test("persists a catalogue collection toggle without rebuilding the full list", async ({ page }) => {
  await makePageDeterministic(page);
  await page.goto("/");
  await openCatalogue(page);

  const tile = page.locator("[data-card-catalog-toggle]").first();
  const locationId = await tile.getAttribute("data-card-catalog-toggle");
  await expect(tile).toHaveAttribute("aria-pressed", "false");
  await tile.click();
  await expect(tile).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate((id) => JSON.parse(localStorage.getItem("mhc_collections"))[id].collected, locationId)).toBe(true);

  await page.reload();
  await openCatalogue(page);
  await expect(page.locator(`[data-card-catalog-toggle="${locationId}"]`)).toHaveAttribute("aria-pressed", "true");
});

test("retains the prior collection state when localStorage rejects a write", async ({ page }) => {
  await makePageDeterministic(page, { failStorageWrites: true });
  await page.goto("/");
  await openCatalogue(page);

  const tile = page.locator("[data-card-catalog-toggle]").first();
  await expect(tile).toHaveAttribute("aria-pressed", "false");
  await tile.click();
  await expect(tile).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".toast")).toContainText("取得状態を保存できませんでした");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("mhc_collections"))).toBeNull();
});
