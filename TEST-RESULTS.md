# v1.1.0 輸入體驗驗證

本機 Chromium + iPhone 13 尺寸 WebKit **40/40 通過（22.2 秒）**。正式 GitHub Pages 同套測試 **40/40 通過（44.4 秒）**。受測應用提交 `df1aba0`；GitHub Actions [run 41962909585](https://github.com/harrylin0312/query-lantern/actions/runs/41962909585) 建置、測試與部署皆成功。

正式站另以行動 WebKit 截圖確認「極光調查站 v1.1.0」可見，390px 視窗的頁面寬度仍為 390px。

新增案例：快捷鍵跟隨帳號／密碼欄位、保留游標與選取範圍、鍵盤操作、推理答案欄不誤寫 SQL、長文字與多行輸入的版面穩定性，以及所有頁面的手機版本號與資源版本一致性。

下方為前版歷史紀錄。所有行動驗證仍為 WebKit 模擬，未宣稱實體 iPhone Safari 測試。

---

# 最新修訂驗證（2026-11-05）

本機 Chromium + iPhone 13 尺寸 WebKit：**32/32 通過（22.7 秒）**。正式 GitHub Pages 的同一套 Chromium + 行動 WebKit 測試：**32/32 通過（38.9 秒）**。受測應用提交：`5defbb5`。

GitHub Actions [run 41944602730](https://github.com/harrylin0312/query-lantern/actions/runs/41944602730) 的建置、測試與 Pages 部署均成功。`app.js`、`course.js`、`worker.js` 與 `sql-wasm.wasm` 全部 HTTP 200，SHA-256 與本機受測版本一致。

新版第 6、9、10 關另以 390px 行動 WebKit 檢查：頁面寬度皆為 390px，沒有整頁橫向溢出或 pageerror。下方 16/16 為初版歷史紀錄，不代表新版評量，也不代表實體 iPhone 測試。

新增測試範圍：十關完整操作與理解檢查；註解、字串、死分支、永真及僅 EXISTS 表名的誤通關反例；未知隨機秘密的合法推理（含引號表名與別名）；資料面板、Worker 回應及錯誤訊息不洩漏秘密；與自由實驗室隔離；真實 SQLite 條件錯誤與資料探查；舊版進度與備份轉換；重置清除證據；非確定性函式不作證據；調查資料庫唯讀；模擬考回饋與弱點排序。

未使用實體 iPhone Safari；通關為本站練習結果，不是能力認證。新版的確定性函式範圍與判題限制見 README。

---

# 初版歷史驗證紀錄

日期：2026-11-05。受測應用提交：`b2cd925`。

| 環境                                                         | 結果                                      |
| ------------------------------------------------------------ | ----------------------------------------- |
| 本機 build                                                   | 成功                                      |
| 本機 Chromium + iPhone 13 尺寸 WebKit                        | 16/16 通過，11.2 秒                       |
| 正式 GitHub Pages，同一套 Chromium + 行動 WebKit 測試        | 16/16 通過，22.1 秒                       |
| 首次 Actions 建置、測試、Pages 部署                          | 成功，run 41940771207                     |
| 第二次推送後自動重新建置、測試、部署                         | 成功，run 41941048269                     |
| 公開 HTML / app.js / worker.js / sql-wasm.js / sql-wasm.wasm | 全部 HTTP 200；WASM MIME application/wasm |

正式網址：https://harrylin0312.github.io/query-lantern/

Actions：https://github.com/harrylin0312/query-lantern/actions

涵蓋：完整八關與理解檢查、跨刷新進度、SQLite 真實結果、注入與參數化對照、資料庫修改與重置、語法錯誤、3 秒逾時終止及恢復、分層提示、錯題與模擬考計分、備份下載與有效／無效匯入、手機整頁寬度、流程控制、條件觀察器、模擬標示、輸出截斷與記憶體限制後恢復、弱點主題排序與補強後解除標記。

另外以內建瀏覽器實際操作正式網站：不安全模式回傳虛構機密商品；相同輸入在安全模式回傳零列。已檢視桌面首頁、390×844 手機關卡與公開站行動 WebKit 截圖。

## 實際限制

- 未使用實體 iPhone Safari，WebKit 模擬不等同真機驗證；實機鍵盤與系統 Safari 行為仍可能有差異。
- 尚無真人學習成效或學習負擔實驗；兩日時間是設計估計。
- 適性策略是錯題主題優先排序、補充原理與對應實驗，不是經實證的能力估計模型。
- 時間型為明確標示的模型；Error 關實作真實 SQLite 欄數錯誤，不宣稱重現所有 DBMS 的錯誤洩漏。OAST 與二階注入僅介紹。
- 每次執行第一個 SQL 陳述式；輸出有列數、總量與單欄文字截斷限制。SQLite heap 限制不代表瀏覽器整體記憶體有相同上限。
- 無帳號或雲端備份，請定期匯出本機進度。初次開啟仍需網路，未實作離線 Service Worker。
