import { lessons, exam } from "./course.js?v=__APP_VERSION__";
import { handbook } from "./handbook.js?v=__APP_VERSION__";
const APP_VERSION = "__APP_VERSION__";
document.querySelector(".version").textContent = "v" + APP_VERSION;
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "NULL").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let state = {
  version: 1,
  assessmentRevision: 2,
  done: [],
  checks: [],
  wrong: [],
  attempts: {},
  prefs: { detail: true },
  examScores: [],
};
try {
  const d = JSON.parse(localStorage.getItem("lantern-v1"));
  if (d?.version === 1)
    state = { ...state, ...d, assessmentRevision: d.assessmentRevision };
} catch {}
function migrateAssessment() {
  state.wrong = state.wrong.map((w) => {
    if (w.id?.startsWith("exam-")) {
      const q = exam[Number(w.id.slice(5))];
      if (q) return { ...w, tag: q[3], why: q[4] };
    }
    return w;
  });
  if (state.assessmentRevision !== 2) {
    state.done = state.done.filter((i) => i !== 5);
    state.checks = state.checks.filter((i) => i !== 5);
    state.assessmentRevision = 2;
  }
}
migrateAssessment();
try {
  if (localStorage.getItem("lantern-v1"))
    localStorage.setItem("lantern-v1", JSON.stringify(state));
} catch {}

function applyReadingTheme(theme) {
  const value = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = value;
  document.querySelector('meta[name="theme-color"]').content =
    value === "light" ? "#f5f3ec" : "#101b26";
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.textContent = value === "dark" ? "☀ 亮色" : "☾ 暗色";
    button.setAttribute(
      "aria-label",
      value === "dark"
        ? "目前暗色，切換為亮色模式"
        : "目前亮色，切換為暗色模式",
    );
  });
}
applyReadingTheme(document.documentElement.dataset.theme);
document.querySelectorAll("[data-theme-toggle]").forEach(
  (button) =>
    (button.onclick = () => {
      const theme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyReadingTheme(theme);
      state.prefs.theme = theme;
      try {
        localStorage.setItem("lantern-theme-v1", theme);
      } catch {
        toast("無法保存閱讀偏好。");
      }
      save();
    }),
);
matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
  let saved;
  try {
    saved = localStorage.getItem("lantern-theme-v1");
  } catch {}
  if (!["light", "dark"].includes(saved))
    applyReadingTheme(e.matches ? "light" : "dark");
});
const manualDialog = $("#handbook-dialog");
$("#close-handbook").onclick = () => manualDialog.close();
manualDialog.addEventListener("close", () => {
  document.body.classList.remove("manual-open");
  $("#handbook-body").replaceChildren();
});
function openHandbook() {
  renderHandbook($("#handbook-body"), true);
  document.body.classList.add("manual-open");
  manualDialog.showModal();
  $("#close-handbook").focus({ preventScroll: true });
}
function renderHandbook(container, embedded = false) {
  container.innerHTML = `${embedded ? "" : '<span class="eyebrow">BEGINNER FIELD GUIDE</span><h1 class="lesson-title">不懂的語法，隨時查。</h1>'}<p>不用一次記住。先查一個詞，讀白話解釋，再按「試跑範例」看真正的結果。範例使用獨立資料庫，與目前關卡的輸入、進度及秘密分開。</p><div class="manual-search"><label for="guide-search">搜尋知識、語法或錯誤訊息</label><input type="search" id="guide-search" placeholder="例如：引號、WHERE、AND OR、no such column" autocomplete="off" autocorrect="off"><label for="guide-category">範圍</label><select id="guide-category"><option value="全部">全部</option>${["入門", "SQL 語法", "漏洞原理", "防禦與排錯"].map((c) => `<option>${c}</option>`).join("")}</select></div><div class="toolbar manual-starters" aria-label="初學者快速查詢"><button class="secondary" data-topic="select">完全看不懂 SQL</button><button class="secondary" data-topic="quotes">引號怎麼用</button><button class="secondary" data-topic="boolean">AND 和 OR</button><button class="secondary" data-topic="errors">看不懂錯誤</button></div><p id="guide-count" role="status"></p><div id="guide-results"></div><p class="form-note source">語法依據 <a href="https://www.sqlite.org/lang_select.html" target="_blank" rel="noopener">SQLite SELECT</a>、<a href="https://www.sqlite.org/lang_expr.html" target="_blank" rel="noopener">運算式</a>與<a href="https://www.sqlite.org/lang_corefunc.html" target="_blank" rel="noopener">函式文件</a>；內容為原創白話說明。資料庫差異請見各條目的提醒。</p>`;
  const search = container.querySelector("#guide-search"),
    category = container.querySelector("#guide-category");
  let generation = 0,
    selectedTopic = null;
  const normalize = (t) => t.normalize("NFKC").toLocaleLowerCase();
  function update() {
    generation++;
    const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    const matches = handbook.filter(
      (item) =>
        (category.value === "全部" || item.category === category.value) &&
        (selectedTopic
          ? item.id === selectedTopic
          : terms.every((term) =>
              normalize(JSON.stringify(item)).includes(term),
            )),
    );
    container.querySelector("#guide-count").textContent =
      `找到 ${matches.length} / ${handbook.length} 個條目`;
    container.querySelector("#guide-results").innerHTML = matches.length
      ? matches
          .map(
            (item) =>
              `<details class="manual-entry" data-entry="${item.id}" ${terms.length && matches.length <= 3 ? "open" : ""}><summary><span class="pill">${item.category}</span><span>${esc(item.title)}</span></summary><p>${esc(item.plain)}</p><h3>常見寫法</h3><pre>${highlight(item.syntax)}</pre><h3>拆開來讀</h3><dl>${item.parts.map(([term, meaning]) => `<dt>${esc(term)}</dt><dd>${esc(meaning)}</dd>`).join("")}</dl><h3>可試跑的完整 SQL</h3><pre>${highlight(item.example)}</pre><p><strong>先預測：</strong>${esc(item.expected)}</p><button class="secondary" data-example="${item.id}">試跑範例</button><div class="manual-result" aria-live="polite"></div><div class="notice"><strong>容易搞混：</strong>${esc(item.mistake)}</div></details>`,
          )
          .join("")
      : '<div class="notice">目前沒有符合的條目。試試較短的關鍵字，例如 SELECT、引號、NULL，或切換範圍為「全部」。</div>';
  }
  search.addEventListener("input", () => {
    selectedTopic = null;
    update();
  });
  category.addEventListener("change", () => {
    selectedTopic = null;
    update();
  });
  container.querySelector(".manual-starters").onclick = (e) => {
    const button = e.target.closest("[data-topic]");
    if (!button) return;
    category.value = "全部";
    selectedTopic = button.dataset.topic;
    search.value = handbook.find((item) => item.id === selectedTopic).title;
    update();
  };
  container.querySelector("#guide-results").onclick = async (e) => {
    const button = e.target.closest("[data-example]");
    if (!button) return;
    const item = handbook.find((x) => x.id === button.dataset.example),
      result = button.nextElementSibling,
      requestGeneration = generation;
    button.disabled = true;
    result.textContent = "獨立範例資料庫執行中…";
    try {
      const out = await query(item.example, undefined, { context: "handbook" });
      if (!result.isConnected || requestGeneration !== generation) return;
      result.innerHTML = table(out);
    } catch (err) {
      if (result.isConnected && requestGeneration === generation)
        result.innerHTML = `<div class="error">${esc(err.message)}</div>`;
    } finally {
      button.disabled = false;
    }
  };
  update();
}
let worker,
  seq = 0,
  pending = new Map(),
  timer,
  flowTimer,
  routeToken = 0;
function save() {
  try {
    localStorage.setItem("lantern-v1", JSON.stringify(state));
  } catch {
    toast("無法保存到本機，請匯出進度備份。");
  }
}
function toast(t) {
  $("#toast")?.remove();
  const el = document.createElement("div");
  el.id = "toast";
  el.textContent = t;
  document.body.append(el);
  setTimeout(() => el.remove(), 3500);
}
function resetWorker() {
  worker?.terminate();
  for (const p of pending.values()) {
    clearTimeout(p.t);
    p.reject(Error("實驗環境已重置，請重新執行。"));
  }
  pending.clear();
  worker = new Worker(new URL("./worker.js?v=" + APP_VERSION, import.meta.url));
  worker.onmessage = ({ data: m }) => {
    const p = pending.get(m.id);
    if (!p) return;
    clearTimeout(p.t);
    pending.delete(m.id);
    m.error ? p.reject(Error(m.error)) : p.resolve(m.out);
  };
  worker.onerror = () => {
    for (const p of pending.values()) {
      clearTimeout(p.t);
      p.reject(Error("SQL 引擎載入失敗，請檢查網路並重置實驗室。"));
    }
    pending.clear();
  };
}
resetWorker();
function query(sql, params, extra = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const t = setTimeout(() => {
      pending.delete(id);
      reject(Error("查詢超過 3 秒，已終止 Worker 並重建資料庫。"));
      resetWorker();
    }, 3000);
    pending.set(id, { resolve, reject, t });
    worker.postMessage({ id, sql, params, ...extra });
  });
}
const table = (out) =>
  out
    .map((r) =>
      r.columns.length
        ? `<div class="scroll"><table><thead><tr>${r.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${r.values.map((v) => `<tr>${v.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><small>${r.values.length} 列結果${r.truncated ? "（輸出已截斷：最多 200 列／約 100 KB；文字欄位上限 2,000 字元）" : ""}</small>`
        : "<p>指令已完成，沒有結果欄位。</p>",
    )
    .join("");
function highlight(sql) {
  return (
    sql
      .match(
        /--[^\n]*|'(?:''|[^'])*'|\b(?:SELECT|FROM|WHERE|AND|OR|UNION|ALL|NULL|AS|ORDER|BY|LIMIT|CASE|WHEN|THEN|ELSE|END)\b|[^'\w-]+|\w+|./gi,
      )
      ?.map(
        (t) =>
          `<span class="${t.startsWith("--") ? "comment" : t.startsWith("'") ? "str" : /^(SELECT|FROM|WHERE|AND|OR|UNION|ALL|NULL|AS|ORDER|BY|LIMIT|CASE|WHEN|THEN|ELSE|END)$/i.test(t) ? "kw" : ""}">${esc(t)}</span>`,
      )
      .join("") || ""
  );
}
function home() {
  $("#app").innerHTML =
    `<div class="hero"><div><span class="eyebrow">FIELD TRAINING / SQL INJECTION</span><h1>看懂查詢，<br>才能看穿<span class="accent">漏洞。</span></h1><p>加入極光調查站。從第一張資料表開始，親手追蹤輸入如何變成 SQL，並用實驗證明你的推理。</p><div class="row"><button id="continue">${state.done.length ? "繼續調查" : "開始第一個任務"} ↗</button><a class="pill" href="#lab">直接進入實驗室 →</a></div></div><div class="hero-art" aria-hidden="true"><span class="eyebrow">QUERY OBSERVATORY / 01</span><div class="orbit"><span>INPUT → SQL</span></div><div class="art-code">SELECT understanding<br>FROM experiments<br>WHERE curiosity = true;</div></div></div><div class="stats"><div><strong>${state.done.length} / ${lessons.length}</strong><span>已完成實驗</span></div><div><strong>${state.checks.length} / ${lessons.length}</strong><span>理解檢查</span></div><div><strong>SQLite</strong><span>真實引擎 · 無需登入</span></div></div><div class="notice">兩日核心：第 1 日約 85 分鐘實驗＋30 分鐘複習；第 2 日約 85 分鐘實驗＋40 分鐘模擬考與補強。可分段休息，先理解再追求速度。</div>${[1, 2, 3].map((day) => `<h2 class="section-title">${day === 3 ? "進階延伸" : `DAY 0${day} · ${day === 1 ? "從資料到漏洞" : "從取證到修復"}`}</h2><div class="grid">${lessons.map((l, i) => (l.day === day ? `<a class="card lesson-card" href="#lesson/${i}"><span class="num">${state.done.includes(i) ? "✓" : String(i + 1).padStart(2, "0")}</span><div><span class="pill">${l.tag}</span><h3>${l.title}</h3><p>${l.min} 分鐘 · ${state.done.includes(i) ? "實驗完成" : "操作任務"}${state.checks.includes(i) ? " · 理解通過" : ""}</p></div></a>` : "")).join("")}</div>`).join("")}`;
  $("#continue").onclick = () =>
    (location.hash =
      "lesson/" +
      Math.max(
        0,
        lessons.findIndex(
          (_, i) => !state.done.includes(i) || !state.checks.includes(i),
        ),
      ));
}
let current = -1,
  hint = 0,
  defenseInput = "",
  flowStep = 0,
  lastTrace = {};
const flowNames = [
  "輸入",
  "程式處理",
  "SQL 形成",
  "解析與執行",
  "結果",
  "網頁反應",
];
function renderLab(i = -1) {
  current = i;
  hint = 0;
  defenseInput = "";
  const l = lessons[i],
    kind = l?.kind || "sql";
  $("#app").innerHTML =
    `<div class="subhead"><a href="#home">← 學習路線</a><span class="pill">${l ? `${i + 1} / ${lessons.length} · ${l.tag}` : "SANDBOX · 自由實驗"}</span><button class="secondary" id="jump-lab">操作實驗 ↓</button><button class="secondary" id="open-handbook">查語法與觀念</button></div><h1 class="lesson-title">${l?.title || "你的 SQL 工作臺"}</h1><div class="lesson-layout"><section class="textblock"><p>${l?.intro || "自由探索內建的三張資料表。可執行 SQL、修改資料並一鍵重置。不會連線到任何真實目標。每次只執行第一個 SQL 陳述式，最多顯示 200 列。"}</p><details ${state.prefs.detail ? "open" : ""}><summary>觀念拆解</summary><p>${l?.concept || "SELECT 讀取，INSERT 新增，UPDATE 修改，DELETE 刪除。任何修改只影響目前 Worker 的記憶體資料庫。重新整理或重置會復原；課程進度不受影響。"}</p></details>${l ? `<div class="goal"><small>本次調查目標</small><p>${l.goal}</p></div><button class="secondary" id="hint">需要一點線索</button><div id="hints"></div>` : ""}<details><summary>資料字典與現有資料</summary><p class="form-note">products：商品 id / 名稱 name / 分類 category / 整數價格 price / 是否上架 released（1=是）。users：帳號、示範密碼、角色。secrets：標籤與秘密。皆為虛構。</p><div id="schema">讀取中…</div><button class="secondary" id="refresh-data">更新資料檢視</button></details>${l ? `<div id="checkpoint"></div>` : ""}${kind === "error" ? `<details open><summary>時間型盲注 · 明確標示的模擬</summary><p>下列時間是教學模型，並非 SQLite 睡眠函式或實際網路測量。</p><label>條件模型<select id="time-condition"><option value="true">真：假設秘密第一字為 A</option><option value="false">假：假設秘密第一字為 Z</option></select></label><button id="simulate" class="secondary">觀察模擬時間</button><div id="time-result"></div></details>` : ""}</section><section class="card" id="workbench"><div class="row between"><span class="eyebrow">${kind === "blind" ? "BLIND ENDPOINT" : "LIVE SQLITE / WASM"}</span><button id="reset" class="secondary">重置資料庫</button></div>${["catalog", "login", "union", "blind", "defense", "errorproof"].includes(kind) ? `<label>${kind === "login" ? "虛構登入 · 帳號" : "虛構商店 · 分類輸入"}<input id="input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${esc(l.start)}"></label>${kind === "login" ? `<label>密碼（示範）<input id="password" value="wrong" autocomplete="off" autocorrect="off" autocapitalize="off"></label>` : ""}<label class="row"><input type="checkbox" id="safe"> 安全模式 · Prepared Statement</label>` : `<label for="input">SQL 編輯器</label><textarea id="input" autocapitalize="off" autocomplete="off" spellcheck="false">${esc(l?.start || "SELECT * FROM products")}</textarea>`}<small id="key-target" aria-live="polite"></small><div class="toolbar" id="keys">${["'", " -- ", " AND ", " OR ", " = ", "SELECT ", "FROM "].map((v, j) => `<button class="secondary" data-key="${j}" aria-label="插入 ${esc(v)}">${esc(v)}</button>`).join("")}</div><button id="run">執行查詢 →</button><label>實際送往引擎的 SQL</label><pre id="sql"></pre><div id="binding"></div>${["blind", "errorproof"].includes(kind) ? `<div class="goal"><label for="inferred">你推理的秘密第一個字元（A–Z）</label><input id="inferred" maxlength="1" autocomplete="off" autocapitalize="characters" aria-describedby="inference-help"><small id="inference-help">先完成有／無訊號對照，再用確定性條件查詢辨識一個字元（例如 substr 比較）；random 等函式不作為通關證據。提示中的 X 不是答案。</small><button id="submit-inference" class="secondary">提交推理結果</button><div id="inference-result" aria-live="polite"></div></div>` : ""}<div id="result" class="result" aria-live="polite"><p>先預測結果，再執行。</p></div><details open><summary>查詢旅程 · 可暫停與回看</summary><div class="flow">${flowNames.map((n, j) => `<span data-step="${j}">${j + 1} ${n}</span>`).join("")}</div><div class="stepbox" id="stepbox">執行一次查詢後，就能追蹤它的旅程。</div><div class="toolbar"><button class="secondary" id="prev-step">← 上一步</button><button class="secondary" id="play">播放</button><button class="secondary" id="next-step">下一步 →</button></div><small>流程為教學示意；SQL 結果來自真實引擎，這不是 SQLite 實際執行計畫。</small></details>${i === 1 ? `<details open><summary>逐列篩選觀察器</summary><label>價格上限<input type="range" id="price" min="50" max="1000" value="200"></label><div id="trace"></div><small>此觀察器固定 WHERE released=1 AND price&lt;上限；與上方自由查詢分開。</small></details>` : ""}</section></div>`;
  $("#jump-lab").onclick = () =>
    $("#workbench").scrollIntoView({ block: "start" });
  $("#open-handbook").onclick = openHandbook;
  $("#input").oninput = preview;
  $("#safe")?.addEventListener("change", preview);
  $("#password")?.addEventListener("input", preview);
  $("#run").onclick = run;
  $("#submit-inference")?.addEventListener("click", async () => {
    const token = routeToken;
    try {
      const out = await query("", undefined, {
        context: kind,
        action: "answer",
        answer: $("#inferred").value.trim().toUpperCase(),
      });
      if (token !== routeToken) return;
      if (out[0].passed) {
        $("#inference-result").textContent = "✓ 推理與查詢證據一致。";
        complete(i);
      } else
        $("#inference-result").textContent =
          "尚未通過：請完成兩種訊號對照，並用會隨秘密字元改變的條件驗證，再提交推理。";
    } catch (e) {
      if (token === routeToken) $("#inference-result").textContent = e.message;
    }
  });
  $("#reset").onclick = () => {
    resetWorker();
    defenseInput = "";
    if ($("#inferred")) $("#inferred").value = "";
    if ($("#inference-result"))
      $("#inference-result").textContent = "證據已清空，請重新推理。";
    $("#result").innerHTML =
      '<div class="notice">資料庫已重建，請重新執行查詢。</div>';
    schema();
    toast(
      ["blind", "errorproof", "discovery"].includes(kind)
        ? "秘密已重新隨機產生，請重新推理。"
        : "已恢復原始虛構資料",
    );
  };
  $("#refresh-data").onclick = schema;
  $("#hint")?.addEventListener("click", () => {
    if (hint < l.hints.length) {
      const p = document.createElement("p");
      p.textContent = `線索 ${hint + 1}：${l.hints[hint++]}`;
      $("#hints").append(p);
      state.attempts[i] = { ...state.attempts[i], hints: hint };
      save();
    }
  });
  let activeEditor = $("#input");
  const positions = new WeakMap();
  const fieldNames = {
    input:
      kind === "login"
        ? "帳號"
        : $("#input").tagName === "TEXTAREA"
          ? "SQL 編輯器"
          : "分類輸入",
    password: "密碼",
    inferred: "推理答案",
  };
  function remember(field) {
    positions.set(field, {
      start: field.selectionStart ?? field.value.length,
      end: field.selectionEnd ?? field.value.length,
    });
  }
  function target(field) {
    activeEditor = field;
    remember(field);
    const supported = field.id !== "inferred";
    $("#key-target").textContent = supported
      ? "快捷輸入套用：" + fieldNames[field.id]
      : "推理答案僅接受單一字元，SQL 快捷鍵暫停使用。";
    $("#keys")
      .querySelectorAll("button")
      .forEach((b) => (b.disabled = !supported));
  }
  for (const field of document.querySelectorAll("#input,#password,#inferred")) {
    field.addEventListener("focus", () => target(field));
    for (const event of ["input", "select", "keyup", "pointerup", "blur"])
      field.addEventListener(event, () => remember(field));
  }
  target(activeEditor);
  let pressedKey = null,
    ignorePointerClick = null;
  $("#keys").addEventListener("pointerdown", (e) => {
    const button = e.target.closest("[data-key]");
    if (
      !button ||
      button.disabled ||
      e.button !== 0 ||
      activeEditor.id === "inferred"
    )
      return;
    pressedKey = button;
    ignorePointerClick = null;
    if (document.activeElement === activeEditor) remember(activeEditor);
    e.preventDefault();
  });
  $("#keys").addEventListener("pointerup", (e) => {
    const button = e.target.closest("[data-key]");
    if (button && button === pressedKey) {
      // WebKit may suppress click after a cancelled touch pointerdown.
      // Activate on pointerup and consume any subsequent synthetic click once.
      ignorePointerClick = button;
      e.preventDefault();
      insertShortcut(button);
    }
    pressedKey = null;
  });
  $("#keys").addEventListener("pointercancel", () => {
    pressedKey = null;
  });
  $("#keys").onclick = (e) => {
    const button = e.target.closest("[data-key]");
    if (button === ignorePointerClick && e.detail > 0) {
      ignorePointerClick = null;
      return;
    }
    ignorePointerClick = null;
    insertShortcut(button);
  };
  function insertShortcut(b) {
    if (!b || b.disabled || activeEditor.id === "inferred") return;
    const input = activeEditor,
      v = ["'", " -- ", " AND ", " OR ", " = ", "SELECT ", "FROM "][
        +b.dataset.key
      ];
    const range = positions.get(input) ?? {
      start: input.value.length,
      end: input.value.length,
    };
    input.setRangeText(v, range.start, range.end, "end");
    remember(input);
    if (document.activeElement !== input) input.focus({ preventScroll: true });
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  $("#prev-step").onclick = () => step(-1);
  $("#next-step").onclick = () => step(1);
  $("#play").onclick = () => {
    if (flowTimer) {
      clearInterval(flowTimer);
      flowTimer = null;
      $("#play").textContent = "播放";
    } else {
      flowTimer = setInterval(() => {
        step(1);
        if (flowStep === 5) {
          clearInterval(flowTimer);
          flowTimer = null;
          $("#play").textContent = "重播";
        }
      }, 1400);
      $("#play").textContent = "暫停";
      if (flowStep === 5) flowStep = -1;
    }
  };
  $("#simulate")?.addEventListener("click", () => {
    $("#time-result").innerHTML =
      `<div class="notice">模擬觀測：${$("#time-condition").value === "true" ? "2,100 ms（基線 100 + 條件延遲 2,000）" : "100 ms（僅基線）"}。真實環境需重複測量，不能只看一次。</div>`;
  });
  $("#price")?.addEventListener("input", trace);
  preview();
  schema();
  trace();
  checkpoint();
}
function built() {
  const kind = lessons[current]?.kind || "sql",
    input = $("#input").value,
    safe = $("#safe")?.checked;
  let sql = input,
    params;
  if (["catalog", "defense", "blind", "errorproof"].includes(kind))
    sql = safe
      ? "SELECT * FROM products WHERE category = ? AND released = 1"
      : `SELECT * FROM products WHERE category = '${input}' AND released = 1`;
  if (kind === "union")
    sql = safe
      ? "SELECT name,category FROM products WHERE category = ? AND released = 1"
      : `SELECT name,category FROM products WHERE category = '${input}' AND released = 1`;
  if (kind === "login")
    sql = safe
      ? "SELECT id,username,role FROM users WHERE username = ? AND password = ?"
      : `SELECT id,username,role FROM users WHERE username = '${input}' AND password = '${$("#password").value}'`;
  if (safe) params = kind === "login" ? [input, $("#password").value] : [input];
  return { sql, params, input, safe, kind };
}
function preview() {
  const b = built();
  $("#sql").innerHTML = highlight(b.sql);
  $("#binding").innerHTML = b.params
    ? `<small>獨立綁定的值（不當作 SQL 解析）：${esc(JSON.stringify(b.params))}</small>`
    : "";
}
async function schema() {
  const token = routeToken;
  try {
    let html = "";
    const restricted = ["blind", "errorproof", "discovery"].includes(
      lessons[current]?.kind,
    );
    for (const t of restricted
      ? ["products"]
      : ["products", "users", "secrets"])
      html +=
        `<h3>${t}</h3>` +
        table(
          await query(
            "SELECT * FROM " + t,
            undefined,
            restricted
              ? { context: lessons[current].kind, action: "public" }
              : {},
          ),
        );
    if (restricted)
      html +=
        '<div class="notice">隔離調查模式：此面板只顯示公開商品。secrets(label TEXT, value TEXT) 的資料列不公開，秘密由 Worker 隨機產生，與其他關卡及自由實驗室分開。資料探查任務須自行查詢 sqlite_schema。</div>';
    if (token === routeToken && $("#schema")) $("#schema").innerHTML = html;
  } catch (e) {
    if (token === routeToken && $("#schema"))
      $("#schema").textContent = e.message;
  }
}
async function trace() {
  if (!$("#trace")) return;
  const price = +$("#price").value,
    token = routeToken;
  try {
    const data = await query(
      "SELECT name,released,price, (released=1 AND price < ?) AS pass FROM products",
      [price],
    );
    if (token !== routeToken) return;
    $("#trace").innerHTML =
      `<small>released = 1 AND price &lt; ${price}</small>` +
      data[0].values
        .map(
          ([n, r, p, ok]) =>
            `<div class="trace-row"><span>${esc(n)}<br><small>${r === 1 ? "真" : "假"} AND ${p < price ? "真" : "假"}</small></span><span class="${ok ? "pass" : "fail"}">${ok ? "✓ 留下" : "× 排除"}</span></div>`,
        )
        .join("");
  } catch (e) {
    if ($("#trace")) $("#trace").textContent = e.message;
  }
}
async function run() {
  const b = built(),
    id = current,
    token = routeToken;
  preview();
  $("#run").disabled = true;
  $("#result").textContent = "引擎執行中…";
  state.attempts[id] = {
    ...state.attempts[id],
    runs: (state.attempts[id]?.runs || 0) + 1,
  };
  save();
  try {
    const out = await query(b.sql, b.params, {
      context: ["blind", "errorproof", "discovery"].includes(b.kind)
        ? b.kind
        : "default",
    });
    if (token !== routeToken) return;
    const values = out[0]?.values || [],
      cols = out[0]?.columns || [];
    lastTrace = { ...b, out };
    flowStep = 0;
    showStep();
    $("#result").innerHTML =
      b.kind === "blind"
        ? `<div class="notice">端點回應：${out[0].observed ? "找到商品" : "沒有商品"}（僅回傳真假訊號；不傳送資料列）</div>`
        : b.kind === "errorproof"
          ? `<div class="${out[0].observed ? "error" : "notice"}">${out[0].observed ? "端點錯誤：" + esc(out[0].engineError) : "端點正常（不公開查詢資料列）"}</div>`
          : table(out);
    let pass = false;
    if (id === 0)
      pass =
        cols.join(",") === "name,price" &&
        values.length === 4 &&
        values.some((v) => v[0] === "未公開原型");
    if (id === 1)
      pass =
        cols.length === 5 &&
        values.length === 2 &&
        values.every((v) => [1, 2].includes(v[0]));
    if (id === 2)
      pass = !b.safe && values.some((v) => v.includes("未公開原型"));
    if (id === 3)
      pass =
        !b.safe &&
        $("#password").value !== "ORBIT-42" &&
        values.some((v) => v.includes("admin"));
    if (id === 4)
      pass =
        !b.safe && values.some((v) => v[0] === "launch" && v[1] === "AURORA");
    if (id === 6) {
      if (!b.safe && values.some((v) => v.includes("未公開原型")))
        defenseInput = b.input;
      pass =
        b.safe &&
        b.input === defenseInput &&
        values.length === 0 &&
        !!defenseInput;
    }
    if (b.kind === "discovery") pass = out[0].passed;
    if (pass) complete(id);
    else if (id >= 0)
      $("#result").insertAdjacentHTML(
        "beforeend",
        '<p class="muted">查詢已執行。對照任務目標，繼續調整並觀察。</p>',
      );
  } catch (e) {
    if (token !== routeToken) return;
    lastTrace = { ...b, error: e.message };
    flowStep = 3;
    showStep();
    $("#result").innerHTML =
      `<div class="error">${esc(e.message)}<br><small>${/syntax|unrecognized/i.test(e.message) ? "先檢查引號是否成對，以及註解位置。" : /column|UNION/i.test(e.message) ? "檢查欄名與 UNION 兩側欄數。" : /no such table/i.test(e.message) ? "資料表可能已被修改，請檢查資料字典或重置。" : "請檢查 SQL；逾時後可直接重新執行。"}</small></div>`;
    if (id === 7 && /same number of result columns/i.test(e.message))
      complete(id);
  } finally {
    if (token === routeToken) $("#run").disabled = false;
  }
}
function complete(id) {
  if (!state.done.includes(id)) state.done.push(id);
  save();
  $("#result").insertAdjacentHTML(
    "beforeend",
    `<div class="success">✓ 實驗目標達成<br>${lessons[id].explain}</div>`,
  );
  checkpoint();
}
function checkpoint() {
  if (current < 0) return;
  const l = lessons[current],
    id = current;
  if (!state.done.includes(id)) {
    $("#checkpoint").innerHTML =
      '<p class="form-note">完成操作後解鎖理解檢查。所有課程皆可返回與自由閱讀。</p>';
    return;
  }
  const [q, opts, answer, why] = l.q;
  $("#checkpoint").innerHTML =
    `<div class="card"><span class="eyebrow">DEBRIEF / 理解檢查</span><h3>${q}</h3>${opts.map((o, j) => `<button class="choice" data-answer="${j}">${esc(o)}</button>`).join("")}<div id="feedback">${state.checks.includes(id) ? "✓ 先前已通過，可再次複習。" : ""}</div></div>`;
  $("#checkpoint").onclick = (e) => {
    const b = e.target.closest("[data-answer]");
    if (!b) return;
    const correct = +b.dataset.answer === answer;
    if (correct && !state.checks.includes(id)) state.checks.push(id);
    if (!correct) recordWrong("lesson-" + id, q, why, l.tag);
    else {
      const w = state.wrong.find((w) => w.id === "lesson-" + id);
      if (w) w.resolved = true;
    }
    save();
    $("#feedback").innerHTML =
      `<div class="${correct ? "success" : "error"}">${correct ? "✓ 理解正確" : "再想一想"}：${why}</div>${correct ? `<a class="pill" href="${id < lessons.length - 1 ? "#lesson/" + (id + 1) : "#exam"}">${id < lessons.length - 1 ? "前往下一站" : "前往模擬考"} →</a>` : "<p>請回到 SQL 對照條件與結果，再選一次。</p>"}`;
  };
}
function showStep() {
  const t = lastTrace;
  document
    .querySelectorAll("[data-step]")
    .forEach((el) =>
      el.classList.toggle("current", +el.dataset.step === flowStep),
    );
  const texts = [
    `輸入內容：${t.input ?? "尚未執行"}`,
    t.safe
      ? "程式固定 SQL 結構，把輸入放進參數陣列。"
      : "程式直接使用 SQL 或拼接表單輸入。未受信任的引號可能成為語法。",
    t.sql || "先執行查詢。",
    t.error
      ? `解析或執行失敗：${t.error}`
      : "Worker 中的 SQLite 解析 SQL 並執行。WHERE 依條件篩選列；這裡不顯示引擎內部指令。",
    t.kind === "blind"
      ? "端點只暴露是否有結果，不顯示秘密。"
      : `真實引擎回傳 ${t.out?.[0]?.values.length ?? 0} 列。`,
    t.kind === "login"
      ? "示範應用只要回傳帳號就視為登入，這正是可被查詢邏輯影響的地方。"
      : "網頁依結果更新顯示。比較你的預測與資料庫實際回傳。",
  ];
  $("#stepbox").textContent = texts[flowStep];
}
function step(d) {
  flowStep = Math.max(0, Math.min(5, flowStep + d));
  showStep();
}
function recordWrong(id, q, why, tag) {
  tag =
    {
      "SQL 基礎": "基礎",
      條件與布林: "布林",
      條件注入: "注入",
      邏輯繞過: "注入",
      "Boolean 盲注": "盲注",
      參數化防禦: "防禦",
      進階延伸: "方言",
      條件錯誤: "盲注",
      資料探查: "UNION",
    }[tag] || tag;
  const old = state.wrong.find((w) => w.id === id);
  if (old) {
    old.count++;
    old.resolved = false;
  } else state.wrong.push({ id, q, why, tag, count: 1, resolved: false });
}
let examIndex = 0,
  answers = [],
  examOrder = [];
function startExam() {
  examIndex = 0;
  answers = [];
  const weak = state.wrong.filter((w) => !w.resolved).map((w) => w.tag);
  examOrder = exam
    .map((_, i) => i)
    .sort(
      (a, b) =>
        Number(weak.includes(exam[b][3])) - Number(weak.includes(exam[a][3])),
    );
  examQuestion();
}
function examQuestion() {
  if (examIndex === examOrder.length) {
    const score = answers.filter((a) => a.correct).length;
    state.examScores.push({
      date: new Date().toISOString(),
      score,
      total: exam.length,
    });
    save();
    $("#app").innerHTML =
      `<div class="examwrap"><span class="eyebrow">ASSESSMENT COMPLETE</span><h1>${score} / ${exam.length}</h1><p>這是練習測驗，不對應特定考試官方題型。選擇題之外，也要完成登入、UNION、盲注與防禦實作。</p>${answers.map((a, j) => `<div class="card review-item"><h3>${a.correct ? "✓" : "×"} ${exam[a.id][0]}</h3><p>正解：${esc(exam[a.id][1][exam[a.id][2]])}。${exam[a.id][4]}</p></div>`).join("")}<div class="row"><button id="again">再測一次</button><a href="#review">補強弱點 →</a></div></div>`;
    $("#again").onclick = startExam;
    return;
  }
  const id = examOrder[examIndex],
    q = exam[id];
  $("#app").innerHTML =
    `<div class="examwrap"><span class="eyebrow">MOCK EXAM / ${examIndex + 1} OF ${exam.length}</span><progress value="${examIndex}" max="${exam.length}"></progress><h1 class="lesson-title">${q[0]}</h1><p>本機弱點會優先出題。先獨立推理，提交後會顯示原理。</p>${q[1].map((o, j) => `<button class="choice" data-exam="${j}">${esc(o)}</button>`).join("")}<div id="exam-feedback" aria-live="polite"></div><button id="next-question" class="hidden">下一題 →</button><p class="form-note">作答進度不跨頁保存，已提交的錯題會立即保存。</p></div>`;
  let answered = false;
  document.querySelectorAll("[data-exam]").forEach(
    (b) =>
      (b.onclick = () => {
        if (answered) return;
        answered = true;
        const correct = +b.dataset.exam === q[2];
        answers.push({ id, correct });
        if (!correct) recordWrong("exam-" + id, q[0], q[4], q[3]);
        else {
          const w = state.wrong.find((w) => w.id === "exam-" + id);
          if (w) w.resolved = true;
        }
        save();
        b.classList.add("selected");
        $("#exam-feedback").innerHTML =
          `<div class="${correct ? "success" : "error"}">${correct ? "正確" : "需要補強"} · ${q[4]}</div>`;
        $("#next-question").classList.remove("hidden");
      }),
  );
  $("#next-question").onclick = () => {
    examIndex++;
    examQuestion();
  };
}
function review() {
  const weak = state.wrong.filter((w) => !w.resolved);
  $("#app").innerHTML =
    `<span class="eyebrow">PERSONAL DEBRIEF</span><h1 class="lesson-title">把不熟，變成看懂。</h1><p>${weak.length ? `目前有 ${weak.length} 個待補強觀念。模擬考會先出這些主題；答對相同題目後會移到已複習。` : "目前沒有待補強錯題。先完成實驗與理解檢查，再挑戰模擬考。"}</p><div class="grid">${state.wrong.map((w) => `<div class="card"><span class="pill">${w.resolved ? "已複習" : esc(w.tag)} · 錯誤 ${w.count} 次</span><h3>${esc(w.q)}</h3><p>${esc(w.why)}</p><a class="pill" href="#lesson/${w.id.startsWith("lesson") ? w.id.split("-")[1] : w.tag === "防禦" ? 6 : w.tag === "盲注" ? 5 : w.tag === "UNION" ? 4 : w.tag === "注入" ? 2 : 1}">回到對應實驗 →</a></div>`).join("")}</div><h2 class="section-title">考前速查 · 先問這六件事</h2><div class="card"><ol><li>輸入在哪裡？是字串、數字還是結構選項？</li><li>引號與註解如何改變解析邊界？</li><li>AND / OR 的優先序是什麼？用括號重寫。</li><li>結果是直接可見、錯誤訊息，還是真假／時間差異？</li><li>UNION 的欄數與型別是否相容？DBMS 是哪種？</li><li>是否真正綁定參數？動態結構是否固定映射？權限是否最小？</li></ol></div><h2 class="section-title">實作能力檢核</h2><p>選擇題之外，請獨立完成以下操作，並口頭解釋每一個引號與條件的作用。</p><div class="grid">${[2, 3, 4, 5, 6].map((i) => `<a href="#lesson/${i}" class="card">${state.done.includes(i) ? "✓" : "○"} ${lessons[i].tag}<br><small>${state.checks.includes(i) ? "實作與理解皆通過" : "返回實驗驗證理解"}</small></a>`).join("")}</div><h2 class="section-title">測驗紀錄</h2>${
      state.examScores
        .slice(-5)
        .map(
          (s) =>
            `<p>${new Date(s.date).toLocaleString("zh-TW")} · ${s.score}/${s.total}</p>`,
        )
        .join("") || "<p>尚未完成模擬考。</p>"
    }`;
}
function settings() {
  $("#app").innerHTML =
    `<span class="eyebrow">YOUR LOCAL LOGBOOK</span><h1 class="lesson-title">保留每一步理解。</h1><div class="grid"><div class="card"><h2>進度與偏好</h2><p>進度保存在此瀏覽器；私人瀏覽或清除網站資料可能使紀錄消失。實驗資料庫每次重開會復原。</p><label class="row"><input type="checkbox" id="detail" ${state.prefs.detail ? "checked" : ""}> 預設展開詳細觀念</label><div class="toolbar"><button id="export">匯出進度 JSON</button><button class="secondary" id="import">匯入備份</button><input id="import-file" class="hidden" type="file" accept="application/json,.json"></div><div id="import-status" aria-live="polite"></div><small>匯入會取代目前學習紀錄，請先匯出備份。動畫遵循系統減少動態效果偏好。</small></div><div class="card source"><h2>教材與真實性</h2><p>原創任務、文字與題目。研究日期：2026-11-05。</p><ul><li><a href="https://portswigger.net/web-security/learning-paths/sql-injection" target="_blank" rel="noopener">PortSwigger 學習路徑</a>與 SQLi、UNION、Blind 教學</li><li><a href="https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html" target="_blank" rel="noopener">OWASP 防禦 Cheat Sheet</a></li><li><a href="https://sql.js.org/documentation/" target="_blank" rel="noopener">sql.js 官方 API</a></li></ul><p>所有 SQL 實驗由 SQLite WASM 真實執行；條件錯誤關使用 SQLite JSON 函式，不冒充其他 DBMS。流程圖為教學示意；時間型面板為明確標示的模型。沒有漏洞後端，也不能指定外部目標。</p></div></div>`;
  $("#detail").onchange = (e) => {
    state.prefs.detail = e.target.checked;
    save();
  };
  $("#export").onclick = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "query-lantern-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $("#import").onclick = () => $("#import-file").click();
  $("#import-file").onchange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 1000000) throw Error("備份超過 1 MB");
      const d = JSON.parse(await file.text());
      if (
        d.version !== 1 ||
        !["done", "checks"].every(
          (k) =>
            Array.isArray(d[k]) &&
            d[k].every(
              (i) => Number.isInteger(i) && i >= 0 && i < lessons.length,
            ),
        ) ||
        !Array.isArray(d.wrong) ||
        !d.wrong.every(
          (w) =>
            typeof w.id === "string" &&
            typeof w.q === "string" &&
            (typeof w.why === "string" ||
              (w.id.startsWith("exam-") && !!exam[Number(w.id.slice(5))])) &&
            typeof w.tag === "string" &&
            typeof w.count === "number",
        ) ||
        !Array.isArray(d.examScores) ||
        !d.examScores.every(
          (s) => typeof s.date === "string" && typeof s.score === "number",
        ) ||
        !d.prefs ||
        typeof d.prefs.detail !== "boolean" ||
        (d.prefs.theme !== undefined &&
          !["light", "dark"].includes(d.prefs.theme))
      )
        throw Error("不支援或損壞的進度格式");
      state = { ...state, ...d, assessmentRevision: d.assessmentRevision };
      migrateAssessment();
      if (d.prefs.theme) {
        applyReadingTheme(d.prefs.theme);
        try {
          localStorage.setItem("lantern-theme-v1", d.prefs.theme);
        } catch {}
      }
      save();
      $("#import-status").textContent = "✓ 進度匯入成功。";
    } catch (err) {
      $("#import-status").textContent = "匯入失敗：" + err.message;
    }
  };
}
function route() {
  if (manualDialog.open) manualDialog.close();
  routeToken++;
  clearInterval(flowTimer);
  flowTimer = null;
  const hash = location.hash.slice(1) || "home";
  document
    .querySelectorAll("nav a")
    .forEach((a) => a.classList.toggle("active", a.hash === "#" + hash));
  if (hash.startsWith("lesson/")) {
    const i = Number(hash.split("/")[1]);
    if (Number.isInteger(i) && lessons[i]) renderLab(i);
    else home();
  } else if (hash === "lab") renderLab();
  else if (hash === "exam") startExam();
  else if (hash === "review") review();
  else if (hash === "settings") settings();
  else if (hash === "guide") renderHandbook($("#app"));
  else home();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
route();
