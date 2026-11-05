const { test, expect } = require("@playwright/test");
const { version } = require("../package.json");
async function go(page, i) {
  await page.goto("./#lesson/" + i);
  await expect(page.locator("#schema")).toContainText("products");
}
async function run(page, input) {
  if (input !== undefined) await page.locator("#input").fill(input);
  await page.locator("#run").click();
  await expect(page.locator("#run")).toBeEnabled();
}
test("完整十關、理解檢查、保存與恢復", async ({ page }) => {
  const solutions = [
    "SELECT name,price FROM products",
    "SELECT * FROM products WHERE released=1 AND price<200",
    "' OR 1=1 -- ",
    "admin' -- ",
    "不存在' UNION SELECT label,value FROM secrets -- ",
    null,
    "' OR 1=1 -- ",
    "SELECT name,price FROM products UNION SELECT NULL",
  ];
  const correct = [1, 1, 1, 2, 1, 1, 2, 1, 1, 1];
  for (let i = 0; i < 10; i++) {
    await go(page, i);
    if (i === 5 || i === 8) {
      await infer(page, i === 8);
    } else if (i === 9) {
      await run(page, "SELECT name,sql FROM sqlite_schema WHERE type='table'");
      await expect(page.locator("#result")).toContainText("mission_archive");
      await run(page, "SELECT dispatch_code FROM mission_archive");
    } else {
      await run(page, solutions[i]);
      if (i === 6) {
        await page.locator("#safe").check();
        await run(page);
      }
    }
    await expect(page.locator("#result")).toContainText("實驗目標達成");
    await page.locator('[data-answer="' + correct[i] + '"]').click();
    await expect(page.locator("#feedback")).toContainText("理解正確");
  }
  await page.goto("./#home");
  await expect(page.locator(".stats")).toContainText("10 / 10");
  await page.reload();
  await expect(page.locator(".stats")).toContainText("10 / 10");
});
test("真實引擎、安全模式、語法錯誤與重置", async ({ page }) => {
  await go(page, 2);
  await run(page, "' OR 1=1 -- ");
  await expect(page.locator("#result")).toContainText("未公開原型");
  await page.locator("#safe").check();
  await run(page);
  await expect(page.locator("#result")).toContainText("0 列結果");
  await expect(page.locator("#binding")).toContainText("獨立綁定");
  await page.goto("./#lab");
  await run(page, "DELETE FROM products");
  await run(page, "SELECT * FROM products");
  await expect(page.locator("#result")).toContainText("0 列結果");
  await page.locator("#reset").click();
  await run(page, "SELECT * FROM products");
  await expect(page.locator("#result")).toContainText("4 列結果");
  await run(page, "SELECT '");
  await expect(page.locator("#result .error")).toBeVisible();
});
test("逾時終止且可重新執行", async ({ page }) => {
  await page.goto("./#lab");
  await expect(page.locator("#schema")).toContainText("products");
  await run(
    page,
    "WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n) SELECT sum(x) FROM n",
  );
  await expect(page.locator("#result")).toContainText("超過 3 秒");
  await run(page, "SELECT 42 AS answer");
  await expect(page.locator("#result")).toContainText("42");
});
test("提示、錯題、測驗計分、手機無整頁橫向溢出", async ({ page }) => {
  await go(page, 0);
  await page.locator("#hint").click();
  await expect(page.locator("#hints")).toContainText("線索 1");
  await run(page, "SELECT name,price FROM products");
  await page.locator('[data-answer="0"]').click();
  await expect(page.locator("#feedback")).toContainText("再想一想");
  await page.goto("./#review");
  await expect(page.locator("main")).toContainText("待補強");
  await page.goto("./#exam");
  for (let i = 0; i < 12; i++) {
    await page.locator('[data-exam="0"]').click();
    await page.locator("#next-question").click();
  }
  await expect(page.locator("h1")).toHaveText("2 / 12");
  await page.goto("./#home");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await go(page, 4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("進度匯出匯入與格式驗證", async ({ page }) => {
  await page.goto("./#settings");
  const download = page.waitForEvent("download");
  await page.locator("#export").click();
  expect((await download).suggestedFilename()).toContain("progress.json");
  await page.locator("#import-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.locator("#import-status")).toContainText("匯入失敗");
  const backup = {
    version: 1,
    done: [0],
    checks: [0],
    wrong: [],
    prefs: { detail: false },
    examScores: [],
    attempts: {},
  };
  await page.locator("#import-file").setInputFiles({
    name: "good.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.locator("#import-status")).toContainText("匯入成功");
  await page.goto("./#home");
  await expect(page.locator(".stats")).toContainText("1 / 10");
});
test("流程播放、逐列觀察與模擬標示", async ({ page }) => {
  await go(page, 1);
  await run(page, "SELECT * FROM products WHERE released=1 AND price<200");
  await page.locator("#next-step").click();
  await expect(page.locator("#stepbox")).toContainText("程式");
  await page.locator("#prev-step").click();
  await expect(page.locator("#stepbox")).toContainText("輸入內容");
  await page.locator("#play").click();
  await expect(page.locator("#play")).toHaveText("暫停");
  await page.locator("#play").click();
  await expect(page.locator("#play")).toHaveText("播放");
  await page.locator("#price").fill("100");
  await expect(page.locator("#trace")).toContainText("price < 100");
  await expect(page.locator("#trace .pass")).toHaveCount(1);
  await go(page, 7);
  await page.locator("#simulate").click();
  await expect(page.locator("#time-result")).toContainText("模擬觀測");
  await expect(page.locator("#time-result")).toContainText("2,100");
});
test("輸出限制與引擎記憶體限制", async ({ page }) => {
  await page.goto("./#lab");
  await run(page, "SELECT printf('%03000d',1) AS longtext");
  await expect(page.locator("#result")).toContainText("截斷");
  await run(page, "SELECT length(randomblob(100000000))");
  await expect(page.locator("#result .error")).toBeVisible();
  await run(page, "SELECT 1 AS recovered");
  await expect(page.locator("#result")).toContainText("recovered");
});
test("弱點主題排序與補強後解除標記", async ({ page }) => {
  await go(page, 0);
  await page.locator("#jump-lab").click();
  await run(page, "SELECT name,price FROM products");
  await page.locator('[data-answer="0"]').click();
  await page.goto("./#exam");
  await expect(page.locator("h1")).toContainText("SELECT name FROM products");
  await go(page, 0);
  await run(page, "SELECT name,price FROM products");
  await page.locator('[data-answer="1"]').click();
  await page.goto("./#review");
  await expect(page.locator("main")).toContainText("目前沒有待補強錯題");
});

async function infer(page, errorChannel = false, aliased = false) {
  const wrap = (condition) =>
    errorChannel
      ? `文具' AND CASE WHEN ${condition} THEN json('bad') ELSE 1 END -- `
      : `文具' AND ${condition} -- `;
  await run(page, wrap("1=1"));
  await run(page, wrap("1=2"));
  const expression = aliased
    ? 'substr((SELECT s.value FROM "secrets" AS s),1,1)'
    : "substr((SELECT value FROM secrets),1,1)";
  let low = 65,
    high = 90;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    await run(page, wrap(`${expression}>'${String.fromCharCode(mid)}'`));
    const text = await page.locator("#result").innerText();
    const yes = errorChannel
      ? text.includes("malformed JSON")
      : text.includes("找到商品");
    if (yes) low = mid + 1;
    else high = mid;
  }
  const char = String.fromCharCode(low);
  await run(page, wrap(`${expression}='${char}'`));
  await page.locator("#inferred").fill(char);
  await page.locator("#submit-inference").click();
  await expect(page.locator("#inference-result")).toContainText(
    "推理與查詢證據一致",
  );
  return char;
}
test("盲注禁止註解、字串、死分支與永真條件誤通關", async ({ page }) => {
  await go(page, 5);
  await run(page, "文具' AND 1=1 -- ");
  await run(page, "文具' AND 1=2 -- ");
  for (const payload of [
    "文具' AND 1=1 -- secrets",
    "文具' AND 'secrets'='secrets' -- ",
    "文具' AND (1=1 OR (SELECT value FROM secrets)='X') -- ",
    "文具' AND EXISTS(SELECT value FROM secrets) -- ",
  ]) {
    await run(page, payload);
    await expect(page.locator("#result")).not.toContainText("實驗目標達成");
  }
  for (const char of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    await page.locator("#inferred").fill(char);
    await page.locator("#submit-inference").click();
    await expect(page.locator("#inference-result")).toContainText("尚未通過");
  }
  await infer(page, false, true);
  await expect(page.locator("#result")).toContainText("實驗目標達成");
});
test("秘密不經資料面板、Worker 回應或自由實驗室外洩", async ({ page }) => {
  await go(page, 5);
  await expect(page.locator("#schema")).toContainText("隔離調查模式");
  await expect(page.locator("#schema")).not.toContainText("AURORA");
  await page.getByText("資料字典與現有資料", { exact: true }).click();
  await page.locator("#refresh-data").click();
  await expect(page.locator("#schema")).not.toContainText("AURORA");
  await run(
    page,
    "不存在' UNION SELECT value,value,value,value,value FROM secrets -- ",
  );
  await expect(page.locator("#result table")).toHaveCount(0);
  await expect(page.locator("#result")).toContainText("找到商品");
  await run(
    page,
    "文具' AND json_extract('{}',(SELECT value FROM secrets)) -- ",
  );
  await expect(page.locator("#result")).toContainText("不公開詳細錯誤");
  const replies = await page.evaluate(async () => {
    const w = new Worker(new URL("worker.js", location.href));
    const out = await new Promise((resolve) => {
      w.onmessage = (e) => resolve(e.data);
      w.postMessage({
        id: 1,
        context: "blind",
        sql: "SELECT value FROM secrets",
      });
    });
    w.terminate();
    return out;
  });
  expect(replies.out[0].columns).toEqual([]);
  expect(replies.out[0].values).toEqual([]);
  expect(replies.out[0].observed).toBe(true);
  await page.goto("./#lab");
  await run(page, "SELECT * FROM secrets");
  await expect(page.locator("#result")).toContainText("AURORA");
  await go(page, 5);
  await infer(page);
});
test("條件錯誤是真正 SQLite 訊號，常數錯誤不能通關", async ({ page }) => {
  await go(page, 8);
  await run(page, "文具' AND json('bad') -- secrets");
  await expect(page.locator("#result")).toContainText("malformed JSON");
  await run(page, "文具' AND 1=1 -- ");
  await page.locator("#inferred").fill("A");
  await page.locator("#submit-inference").click();
  await expect(page.locator("#inference-result")).toContainText("尚未通過");
  await infer(page, true);
  await expect(page.locator("#result")).toContainText("實驗目標達成");
});
test("資料探查須先觀察定義，再取得隔離代碼", async ({ page }) => {
  await go(page, 9);
  await expect(page.locator("#schema")).not.toContainText("dispatch_code");
  await run(page, "SELECT dispatch_code FROM mission_archive");
  await expect(page.locator("#result")).not.toContainText("實驗目標達成");
  await run(page, "SELECT name,sql FROM sqlite_master WHERE type='table'");
  await expect(page.locator("#result")).toContainText(
    "CREATE TABLE mission_archive",
  );
  await run(page, "SELECT dispatch_code FROM mission_archive");
  await expect(page.locator("#result")).toContainText("實驗目標達成");
});
test("舊版盲注完成紀錄需重驗，保留其他課程", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() =>
    localStorage.setItem(
      "lantern-v1",
      JSON.stringify({ version: 1, done: [0, 5], checks: [0, 5] }),
    ),
  );
  await page.reload();
  await expect(page.locator(".stats")).toContainText("1 / 10");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lantern-v1")),
  );
  await go(page, 5);
  await expect(page.locator("#checkpoint")).toContainText("完成操作後解鎖");
});
test("錯題原理解說與弱點排序使用正確題目欄位", async ({ page }) => {
  await go(page, 6);
  await run(page);
  await page.locator("#safe").check();
  await run(page);
  await page.locator('[data-answer="0"]').click();
  await page.goto("./#exam");
  await expect(page.locator("h1")).toContainText("查詢改成 ?");
  await page.locator('[data-exam="0"]').click();
  await expect(page.locator("#exam-feedback")).toContainText(
    "綁定將值與 SQL 結構分開",
  );
  await page.goto("./#review");
  await expect(page.locator("main")).not.toContainText("undefined");
});
test("盲注重置清除證據，舊備份可轉換並修復錯題解說", async ({ page }) => {
  await go(page, 5);
  await infer(page);
  await page.locator("#reset").click();
  await page.locator("#submit-inference").click();
  await expect(page.locator("#inference-result")).toContainText("尚未通過");
  await page.goto("./#settings");
  await page.locator("#import-file").setInputFiles({
    name: "legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        done: [0, 5],
        checks: [0, 5],
        wrong: [{ id: "exam-5", q: "舊題", tag: "舊解說", count: 1 }],
        prefs: { detail: true },
        examScores: [],
      }),
    ),
  });
  await expect(page.locator("#import-status")).toContainText("匯入成功");
  await page.goto("./#home");
  await expect(page.locator(".stats")).toContainText("1 / 10");
  await page.goto("./#review");
  await expect(page.locator("main")).toContainText("綁定將值與 SQL 結構分開");
});
test("隨機函式不作為判題證據；錯誤通道不洩漏秘密字串", async ({ page }) => {
  await page.goto("./");
  const result = await page.evaluate(async () => {
    const w = new Worker(new URL("worker.js", location.href));
    let n = 0;
    const request = (m) =>
      new Promise((resolve, reject) => {
        w.onmessage = (e) => resolve(e.data);
        w.onerror = (e) => reject(Error(e.message));
        w.postMessage({ id: ++n, ...m });
      });
    const leaked = await request({
      context: "errorproof",
      sql: "SELECT json_extract('{}',(SELECT value FROM secrets))",
    });
    await request({
      context: "blind",
      sql: "SELECT * FROM products WHERE 1=2",
    });
    await request({
      context: "blind",
      sql: "SELECT * FROM products WHERE abs(random()) % 26 = 0",
    });
    let passed = false;
    for (const answer of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      const r = await request({
        context: "blind",
        action: "answer",
        answer,
        sql: "",
      });
      passed ||= r.out[0].passed;
    }
    await request({ context: "discovery", sql: "PRAGMA query_only=OFF" });
    const readonly = await request({
      context: "discovery",
      sql: "DELETE FROM mission_archive",
    });
    w.terminate();
    return { leaked, passed, readonly };
  });
  expect(result.leaked.out[0].observed).toBe(true);
  expect(result.leaked.out[0].engineError).toBe(
    "SQLite 查詢失敗（詳細內容已隱藏）",
  );
  expect(result.passed).toBe(false);
  expect(result.readonly.error).toContain("readonly");
});

test("快捷符號跟隨帳號與密碼欄位，保留游標及選取範圍", async ({ page }) => {
  await go(page, 3);
  await page.locator("#input").fill("admin");
  await page.locator("#password").fill("abcXYZdef");
  await page.locator("#password").evaluate((el) => el.setSelectionRange(3, 6));
  if (test.info().project.name === "webkit-mobile")
    await page.locator('[data-key="2"]').tap();
  else await page.locator('[data-key="2"]').click();
  await expect(page.locator("#password")).toHaveValue("abc AND def");
  await expect(page.locator("#input")).toHaveValue("admin");
  await expect(page.locator("#password")).toBeFocused();
  await expect(page.locator("#key-target")).toContainText("密碼");
  await expect(page.locator("#sql")).toContainText("password = 'abc AND def'");
  await page.locator("#input").fill("12345");
  await page.locator("#input").press("ArrowLeft");
  await page.locator('[data-key="0"]').click();
  await expect(page.locator("#input")).toHaveValue("1234'5");
  await expect(page.locator("#password")).toHaveValue("abc AND def");
});

test("快捷鍵支援鍵盤操作及 SQL 編輯器，答案欄不誤寫其他欄位", async ({
  page,
}) => {
  await page.goto("./#lab");
  await page.locator("#input").fill("SELECT 1");
  await page.locator("#input").press("Home");
  await page.locator("#input").evaluate((el) => el.setSelectionRange(0, 0));
  await page.locator('[data-key="1"]').focus();
  await page.locator('[data-key="1"]').press("Enter");
  await expect(page.locator("#input")).toHaveValue(" -- SELECT 1");
  await go(page, 5);
  await page.locator("#inferred").fill("M");
  await expect(page.locator('[data-key="2"]')).toBeDisabled();
  await expect(page.locator("#key-target")).toContainText("單一字元");
  await expect(page.locator("#input")).toHaveValue("文具' AND 1=1 -- ");
  await page.locator("#input").focus();
  await expect(page.locator('[data-key="2"]')).toBeEnabled();
});

test("長文字與多行輸入不改變預覽區、欄寬及執行按鈕位置", async ({ page }) => {
  const rects = () =>
    page.evaluate(() =>
      Object.fromEntries(
        ["workbench", "input", "keys", "run", "sql", "binding", "result"].map(
          (id) => {
            const r = document.getElementById(id).getBoundingClientRect();
            return [
              id,
              {
                x: r.x + scrollX,
                y: r.y + scrollY,
                width: r.width,
                height: r.height,
              },
            ];
          },
        ),
      ),
    );
  await go(page, 3);
  await page.locator("#safe").check();
  await page.locator("#input").fill("a");
  await page.locator("#password").fill("b");
  const before = await rects();
  await page.locator("#password").fill("very-long-password".repeat(400));
  await page.locator("#input").fill("long-account".repeat(400));
  const after = await rects();
  for (const id of Object.keys(before)) {
    for (const key of ["x", "y", "width", "height"])
      expect(
        Math.abs(before[id][key] - after[id][key]),
        `${id}.${key}`,
      ).toBeLessThan(1);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("./#lab");
  await page.locator("#input").fill("SELECT 1");
  const single = await rects();
  await page
    .locator("#input")
    .fill(
      Array.from(
        { length: 80 },
        (_, i) => "SELECT " + i + " -- " + "x".repeat(80),
      ).join("\n"),
    );
  const multi = await rects();
  for (const id of ["workbench", "input", "run", "sql", "result"])
    for (const key of ["x", "y", "width", "height"])
      expect(
        Math.abs(single[id][key] - multi[id][key]),
        `${id}.${key}`,
      ).toBeLessThan(1);
  expect(
    await page
      .locator("#sql")
      .evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
});

test("站名旁版本號在手機及所有路由可見，建置資源使用同一版本", async ({
  page,
}) => {
  for (const path of ["home", "lesson/3", "settings"]) {
    await page.goto("./#" + path);
    await expect(page.locator(".brand small")).toBeVisible();
    await expect(page.locator(".brand small")).toHaveText("極光調查站");
    await expect(page.locator(".version")).toBeVisible();
    await expect(page.locator(".version")).toHaveText("v" + version);
  }
  const assets = await page
    .locator('script[type="module"]')
    .getAttribute("src");
  expect(assets).toBe("app.js?v=" + version);
  expect(
    await page.locator('link[rel="stylesheet"]').getAttribute("href"),
  ).toBe("style.css?v=" + version);
});
