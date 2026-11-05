# 教材研究與教學決策

2026-11-05 實際讀取：

- https://portswigger.net/web-security/learning-paths/sql-injection
- https://portswigger.net/web-security/sql-injection
- https://portswigger.net/web-security/sql-injection/union-attacks
- https://portswigger.net/web-security/sql-injection/blind
- https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- https://sql.js.org/documentation/

sql.js 首頁工具回傳無可讀文字，改讀上述官方 API 文件。沒有聲稱逐一完成 PortSwigger 51 項課程或其官方實驗。

## 課程依賴

PortSwigger 路徑由注入定義、偵測、隱藏資料與邏輯繞過，延伸 UNION、資料庫探查、盲注、錯誤、時間、外帶、二階與防禦。完全初學者還缺乏資料表、引號、投影與布林邏輯，因此本站先設計兩個 SQL 基礎實作，再進入注入。

本站的任務、資料與題目自行創作：極光站商品、帳號、發射代碼。沒有重製官方實驗頁面、劇情或答案。

## 真實性界線

- SELECT、WHERE、AND/OR、UNION、註解、子查詢與 substr 都由 sql.js 的 SQLite WASM 執行。
- 布林端點隱藏結果列，但真假依據是實際查詢有無回傳。
- Error 關使用真正 UNION 欄數錯誤，不能因此宣稱重現所有 error-based 資料外洩。
- 時間型面板是固定條件模型，不把 SQLite 查詢偽裝成 SLEEP。
- 流程播放呈現應用層資料旅程，不宣稱是 SQLite 執行計畫。逐列觀察器有固定而明示的 SQL，與自由編輯內容分開。
- 不提供外部目標網址、OAST 網路請求、漏洞伺服器。

## 初學者常見誤解與對策

- 「注入就是猜密碼」：登入關展示註解如何移除密碼條件。
- 「沒有錯誤就安全」：Boolean 端點要求真假對照。
- 「所有資料庫語法通用」：進階關說明 SQLite 除零、MySQL 註解空白及各家延遲語法差異。
- 「prepare 就一定安全」：理解題區別先拼接與真正綁定。
- 「? 可以代替欄名」：教學說明結構選項應固定映射。
- 「最小權限修復注入」：區別根因修復與損害限制。

## 學習負擔檢視

前兩關一次引入投影、條件兩組概念；首次注入前已先練單引號與 AND/OR。每關有目標、三層提示、執行結果與完成後理解檢查。估計核心兩日各約 2 小時，屬設計估時，尚未進行真人學習成效研究。適性功能為錯題主題優先排序與對應實驗補強，不宣稱有經實證的個人能力模型。
