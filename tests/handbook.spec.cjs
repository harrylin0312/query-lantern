const { test, expect } = require("@playwright/test");
const { version } = require("../package.json");
test("手冊搜尋、分類、無結果與 SQL 範例可實際執行", async ({ page }) => {
  await page.goto("./#guide");
  await expect(page.locator("#guide-count")).toContainText("23 / 23");
  await page.locator("#guide-search").fill("substr");
  const entry = page.locator('[data-entry="substr"]');
  if ((await entry.getAttribute("open")) === null)
    await entry.locator("summary").click();
  await expect(entry).toContainText("正數起點從 1 算起");
  await entry.getByRole("button", { name: "試跑範例", exact: true }).click();
  await expect(entry.locator(".manual-result")).toContainText("first_char");
  await expect(entry.locator(".manual-result")).toContainText("O");
  await expect(entry.locator(".manual-result")).toContainText("5");
  await page.locator("#guide-search").fill("");
  await page.locator("#guide-category").selectOption("入門");
  await expect(page.locator("#guide-count")).toContainText("6 / 23");
  await page.locator("#guide-search").fill("<script>找不到的語法</script>");
  await expect(page.locator("#guide-results")).toContainText("目前沒有符合");
  await expect(page.locator("#guide-results script")).toHaveCount(0);
  await page.getByRole("button", { name: "AND 和 OR", exact: true }).click();
  await expect(page.locator('[data-entry="boolean"]')).toBeVisible();
  await expect(page.locator("#guide-count")).toContainText("1 / 23");
  await expect(page.locator('[data-entry="boolean"]')).toHaveAttribute(
    "open",
    "",
  );
});
test("實驗中查手冊不遺失輸入、結果或修改過的自由資料", async ({ page }) => {
  await page.goto("./#lab");
  await page.locator("#input").fill("DELETE FROM products");
  await page.locator("#run").click();
  await expect(page.locator("#run")).toBeEnabled();
  await page.locator("#input").fill("SELECT * FROM products");
  await page.locator("#run").click();
  await expect(page.locator("#result")).toContainText("0 列結果");
  await page.locator("#input").fill("SELECT name FROM products -- 尚未執行");
  await page.getByRole("button", { name: "查語法與觀念" }).click();
  const dialog = page.getByRole("dialog", { name: "知識與語法手冊" });
  await expect(dialog).toBeVisible();
  const oldTheme = await page.locator("html").getAttribute("data-theme");
  await dialog.locator("[data-theme-toggle]").click();
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-theme",
    oldTheme,
  );
  await dialog.locator("#guide-search").fill("SELECT");
  const entry = dialog.locator('[data-entry="select"]');
  if ((await entry.getAttribute("open")) === null)
    await entry.locator("summary").click();
  await entry.getByRole("button", { name: "試跑範例", exact: true }).click();
  await expect(entry.locator(".manual-result")).toContainText("4 列結果");
  await page.getByRole("button", { name: "關閉手冊" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("#input")).toHaveValue(
    "SELECT name FROM products -- 尚未執行",
  );
  await expect(page.locator("#result")).toContainText("0 列結果");
  await expect(page).toHaveURL(/#lab$/);
  await page.getByRole("button", { name: "查語法與觀念" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("link", { name: "知識手冊", exact: true }).click();
  await expect(page.locator("#guide-search")).toHaveCount(1);
});
test("手冊全部23個SQL範例與預期資料一致", async ({ page }) => {
  await page.goto("./#guide");
  const results = await page.evaluate(async (version) => {
    const { handbook } = await import("./handbook.js?v=" + version);
    const worker = new Worker(new URL("worker.js?v=" + version, location.href));
    try {
      const results = [];
      for (const entry of handbook) {
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(Error("example timeout: " + entry.id)),
            3000,
          );
          worker.onmessage = (e) => {
            clearTimeout(timeout);
            resolve(e.data);
          };
          worker.onerror = (e) => reject(Error(e.message));
          worker.postMessage({
            id: entry.id,
            sql: entry.example,
            context: "handbook",
          });
        });
        results.push({ id: entry.id, ...response });
      }
      return results;
    } finally {
      worker.terminate();
    }
  }, version);
  const counts = {
    tables: 4,
    select: 4,
    where: 2,
    quotes: 2,
    compare: 2,
    boolean: 2,
    pipeline: 2,
    comments: 1,
    punctuation: 2,
    orderby: 2,
    null: 1,
    as: 1,
    union: 2,
    subquery: 1,
    substr: 1,
    case: 4,
    injection: 4,
    blind: 1,
    errors: 1,
    bind: 2,
    schema: 3,
    writes: 1,
    leastprivilege: 3,
  };
  expect(results).toHaveLength(23);
  for (const r of results) {
    expect(r.error, r.id).toBeUndefined();
    expect(r.out[0].values.length, r.id).toBe(counts[r.id]);
  }
  const get = (id) => results.find((x) => x.id === id).out[0];
  expect(get("where").values).toEqual([
    ["月光筆記", 80],
    ["星圖", 120],
  ]);
  expect(get("orderby").values).toEqual([
    ["未公開原型", 990],
    ["軌道杯", 250],
  ]);
  expect(get("null").values).toEqual([[1, null]]);
  expect(get("substr").values).toEqual([["O", 5]]);
  expect(get("blind").values).toEqual([[1, 1]]);
});
test("亮暗主題切換、持久保存、跨頁與手機標頭", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "目前暗色，切換為亮色模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(245, 243, 236)");
  await page.getByRole("link", { name: "知識手冊", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator("#guide-search").fill("引號");
  expect(
    await page
      .locator("#guide-search")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(255, 255, 255)");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "目前亮色，切換為暗色模式" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".version")).toHaveText("v" + version);
});
test("閱讀主題可以跟隨系統，也會隨進度備份匯出匯入", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("./#settings");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const backup = {
    version: 1,
    assessmentRevision: 2,
    done: [0],
    checks: [0],
    wrong: [],
    prefs: { detail: true, theme: "light" },
    examScores: [],
  };
  await page.locator("#import-file").setInputFiles({
    name: "progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.locator("#import-status")).toContainText("匯入成功");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const download = page.waitForEvent("download");
  await page.locator("#export").click();
  const path = await (await download).path();
  const fs = require("fs");
  expect(JSON.parse(fs.readFileSync(path, "utf8")).prefs.theme).toBe("light");
});
