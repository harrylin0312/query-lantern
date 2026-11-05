# Query Lantern｜極光 SQL 調查站

繁體中文、Mobile-first 的 SQL Injection 學習遊戲。完全靜態，無帳號、無漏洞後端。資料均為虛構。

公開網站：https://harrylin0312.github.io/query-lantern/

GitHub：https://github.com/harrylin0312/query-lantern

## 學習內容

兩日核心 7 關：資料表與 SELECT → WHERE / AND / OR → 條件注入 → 登入繞過 → UNION → Boolean 盲注 → 參數化防禦。第 8 關延伸真實錯誤觀察與明確標示的時間模型；第 9 關實作 SQLite 條件錯誤盲注，第 10 關實作資料結構探查。

- 真正 SQLite WASM、獨立 Worker、3 秒逾時終止／重建
- 16 MiB SQLite hard heap limit、資料庫頁數限制、12,000 字元輸入限制、200 列輸出限制
- 安全模式使用 prepare/bind，保留獨立參數顯示
- 結果導向通關、三層提示、理解檢查、12 題模擬考與實作能力檢核
- localStorage 進度、錯題補強、依弱點主題調整測驗順序、JSON 匯出／匯入
- 語法標色、應用流程播放／暫停／回溯、固定條件逐列觀察器
- hash 導覽與相對資源路徑，支援 GitHub Pages 子目錄

自由 SQL 每次只執行第一個陳述式。重新整理會恢復實驗資料，學習進度持續保存。SQL 編輯器為手機原生文字輸入，提供常用語法按鈕，未引入大型編輯器套件。

## 架構

- `index.html`：語意化頁面外框
- `app.js`：路由、Worker RPC、任務判定、互動工具、進度與測驗
- `course.js`：原創課程、提示、理解題與模擬考資料
- `worker.js`：隔離的 sql.js 初始化與 SQL 執行
- `style.css`：響應式視覺與 reduced-motion 支援
- `scripts/build.cjs`：複製靜態檔案與本機套件內 WASM 到 dist
- `tests/learning.spec.cjs`：跨 Chromium / 行動 WebKit 主要流程測試
- `.github/workflows/pages.yml`：測試後部署 Pages

## 開發

需求 Node.js 22+、Python 3（本機測試伺服器）。

```sh
npm ci
npm run build
python3 -m http.server 4173 --directory dist
```

開啟 http://localhost:4173 。修改後重新 build 與刷新。

## 測試

```sh
npx playwright install chromium webkit
npm test
```

可用 `PLAYWRIGHT_BROWSERS_PATH` 指定測試引擎位置。正式站可用 `TEST_URL=https://帳號.github.io/query-lantern/ npm test` 重跑同套測試。測試包含十關完成與理解檢查、真實引擎、參數化對照、重置、逾時恢復、提示、測驗評分、錯題、儲存恢復、匯出／匯入與小螢幕橫向溢出。

WebKit 裝置設定為 iPhone 13 模擬，不能等同實體 iPhone Safari 驗證。無真人學習成效試驗。自適應為主題優先排序與補充教學，沒有宣稱自動估算考試能力。

## 部署

推送 main 後 GitHub Actions 建置、測試、上傳 dist 並部署 Pages。儲存庫 Settings → Pages 的 source 設為 GitHub Actions。相對載入 `./worker.js`、`./vendor/sql-wasm.wasm`，不需要 SPA 伺服器 rewrite，也不依賴外部 CDN。

公開站的歷次部署與本次測試結果見 `TEST-RESULTS.md`。

## 教材與限制

見 [RESEARCH.md](RESEARCH.md) 與網站「紀錄與來源」。SQLite 無法直接代表所有 DBMS；時間、OAST、特定 DBMS 的詳細錯誤外洩僅以說明或模型介紹。第 9 關使用真正 SQLite 的 CASE 與 JSON 錯誤側通道，不模擬其他引擎。進階內容重點是辨識差異，不提供完整多 DBMS 靶場。

程式碼採 MIT 授權。sql.js 及 SQLite 依其各自授權，見 node_modules/sql.js/LICENSE，建置時一併保留於 vendor。

## 2026-11-05 評量修訂

- Boolean 與條件錯誤各自使用獨立 SQLite 資料庫；秘密在 Worker 內隨機產生，不與公開 UNION / 自由實驗資料共享。面板只展示公開商品，盲注回應不傳回秘密資料列，詳細錯誤經遮蔽。
- 通關需完成兩種訊號對照、執行能唯一辨識未知第一字元的查詢、提交正確推理結果。Worker 將相同 SQL 在 A–Z 26 個反事實秘密值上各執行兩次；只有訊號能唯一區分實際第一字元才記錄證據。不是字串包含 `secrets` 就通關。
- 以 SQLite EXPLAIN 檢查函式指令；只有已確認的確定性函式可作為評量證據。`random` 或未列入的函式仍可探索，但不計入通關證據。這是有明確範圍的練習判定，不宣稱接受所有等價 SQL。
- 舊版第 6 關完成／理解紀錄自動要求重驗；其他紀錄保留，舊備份可轉換。重置會產生新秘密並清空當次查詢證據；先前經新版驗證的完成紀錄保留。
- 純前端學習工具可被開發者工具修改，沒有宣稱安全防作弊或能力認證。全部通關也不能代表熟練所有 SQL Injection 技術。
- 修正模擬考主題與解說欄位索引，讓錯題排序與原理回饋使用正確資料。
