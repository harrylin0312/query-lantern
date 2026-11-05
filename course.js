export const lessons = [
  {
    title: "資料庫是一座有規則的倉庫",
    tag: "SQL 基礎",
    day: 1,
    min: 15,
    kind: "sql",
    intro:
      "極光站的商品資料放在 products 資料表。每一列是一件商品，每一欄是一種屬性。id、price、released 是整數；name、category 是文字。SQL 是向資料庫提出要求的語言。",
    concept:
      "SELECT 選欄位，FROM 指定資料表。* 表示全部欄位。查詢回傳一張結果表，不會因為 SELECT 而改動原資料。",
    goal: "只取出所有商品的 name 和 price，保留四件商品。",
    start: "SELECT * FROM products",
    hints: [
      "試著把 * 換成兩個欄位。",
      "欄位之間用逗號分開。",
      "SELECT name, price FROM products",
    ],
    explain:
      "你已把整張資料表投影成兩欄。結果仍有四列，因為尚未使用 WHERE 篩選。",
    q: [
      "SELECT price FROM products 的 price 是？",
      ["資料表", "欄位", "資料庫"],
      1,
      "FROM 後面才是資料表；SELECT 後面是想取得的欄位。",
    ],
  },
  {
    title: "讓每一列回答是或否",
    tag: "條件與布林",
    day: 1,
    min: 20,
    kind: "sql",
    intro:
      "WHERE 會對資料列判斷條件，只有結果為真的列才留下。文字放在單引號內，例如 category = '文具'；數字不必加引號。",
    concept:
      "AND 要兩邊都真；OR 只要一邊真。AND 的優先序高於 OR。用括號能明確表達先後。SQL 邏輯概念順序可想成 FROM → WHERE → SELECT；引擎實際執行計畫可能不同。",
    goal: "查出 released = 1 且 price 小於 200 的兩件商品，顯示全部欄位。",
    start: "SELECT * FROM products WHERE released = 1",
    hints: [
      "兩個條件要同時成立，使用 AND。",
      "價格比較使用 <。",
      "SELECT * FROM products WHERE released = 1 AND price < 200",
    ],
    explain: "月光筆記與星圖都通過兩個條件；未公開原型沒有上架，軌道杯太貴。",
    q: [
      "0 AND 1 OR 1 的結果？",
      ["假", "真", "語法錯誤"],
      1,
      "先算 AND：0 AND 1 為假，再與 1 做 OR 得到真。",
    ],
  },
  {
    title: "輸入跨過了引號邊界",
    tag: "條件注入",
    day: 1,
    min: 25,
    kind: "catalog",
    intro:
      "虛構商店把分類輸入直接拼進 SQL。正常輸入「文具」只應顯示已上架文具。現在你是內部稽核員，要找出為何機密商品可能外洩。",
    concept:
      "單引號原本圈住資料。若輸入包含結束引號、OR 條件與註解，輸入就能變成 SQL 語法。-- 使本行後方成為註解。根本問題是程式把資料當成程式碼。",
    goal: "在不安全模式透過分類欄位，讓查詢結果包含「未公開原型」。",
    start: "文具",
    hints: [
      "先試一個單引號，觀察錯誤與組成的 SQL。",
      "結束字串後，加入永遠為真的 OR，再註解剩下的引號與上架條件。",
      "' OR 1=1 -- ",
    ],
    explain:
      "OR 1=1 使條件為真，註解又移除了原本的上架限制。這不是猜對密碼，而是改寫了查詢結構。",
    q: [
      "只在前端禁止輸入單引號，足以修復嗎？",
      ["足夠", "不足夠", "只要隱藏錯誤即可"],
      1,
      "請求可繞過前端。應在伺服器端使用參數綁定，分離資料與語法。",
    ],
  },
  {
    title: "登入不等於知道密碼",
    tag: "邏輯繞過",
    day: 1,
    min: 25,
    kind: "login",
    intro:
      "極光站的示範登入程式只要 SQL 回傳使用者，就視為登入成功。密碼皆為虛構明文，只用來觀察條件；正式系統應使用安全的密碼雜湊與驗證流程。",
    concept:
      "原查詢要求 username 與 password 同時相符。註解可以讓密碼條件不再被資料庫解析。登入繞過並不一定會揭露原密碼。",
    goal: "密碼維持錯誤值，透過帳號輸入讓結果包含 admin。",
    start: "admin",
    hints: [
      "指定 admin，再結束字串。",
      "讓後面的 AND password 條件變成註解。",
      "admin' -- ",
    ],
    explain:
      "查詢現在只比對 admin，不再檢查密碼。若直接 OR 1=1 也可能回傳多個帳號，應觀察實際結果。",
    q: [
      "username='mira' AND password='錯' OR 1=1 會？",
      ["只回傳 mira", "沒有結果", "所有使用者"],
      2,
      "AND 先算，右側 OR 1=1 讓每一列都符合。",
    ],
  },
  {
    title: "兩張結果表接上同一條軌道",
    tag: "UNION",
    day: 2,
    min: 30,
    kind: "union",
    intro:
      "商品端點只回傳 name、category 兩欄。UNION 可以合併另一個 SELECT 的結果。先知道輸出欄數，再思考每個位置能放什麼資料。",
    concept:
      "UNION 兩側欄數必須相同，資料型別相容性依資料庫而異。SQLite 型別較寬鬆，不代表其他引擎也會接受。UNION 去除重複列，UNION ALL 保留重複。",
    goal: "利用分類輸入，讓結果包含 secrets 表的 launch / AURORA 兩欄。",
    start: "文具",
    hints: [
      "原查詢有兩欄，所以另一個 SELECT 也必須有兩欄。",
      "secrets 的欄位是 label、value。先讓原查詢找不到商品。",
      "不存在' UNION SELECT label,value FROM secrets -- ",
    ],
    explain:
      "回傳欄名仍沿用第一個 SELECT，但新資料列來自 secrets。可見欄位與欄數決定資料如何被呈現。",
    q: [
      "兩欄查詢 UNION SELECT NULL 會？",
      ["補空白成功", "欄數不符", "必定取得管理員"],
      1,
      "一欄不能直接合併兩欄，NULL 不會自動補齊欄數。",
    ],
  },
  {
    title: "看不見內容，仍然能問問題",
    tag: "Boolean 盲注",
    day: 2,
    min: 30,
    kind: "blind",
    intro:
      "這次端點只顯示「找到商品」或「沒有商品」，不公開資料列。秘密每次重置時隨機產生，與 UNION 關卡及自由實驗室完全分開。盲注透過可觀察差異推理資料，而非直接顯示秘密。這裡的條件仍由真正 SQLite 執行。",
    concept:
      "先做真／假對照，確定回應差異與條件有關，再用 substr 逐字詢問。一次有回應差異不等於已證明漏洞；需控制其他變因。",
    goal: "先完成真／假對照，再用條件查詢推理隨機秘密的第一字元（A–Z），最後提交該字元。",
    start: "文具' AND 1=1 -- ",
    hints: [
      "先比較 AND 1=1 與 AND 1=2。",
      "子查詢 (SELECT value FROM secrets) 取出單一值；substr(文字,1,1) 取第一字。可先用 > 'M' 縮小 A–Z 範圍，再用 = 確認。",
      "文具' AND substr((SELECT value FROM secrets),1,1)='X' -- ",
    ],
    explain:
      "你用資料驅動的條件辨識出未知字元。系統已讓相同查詢在不同秘密值下重跑，確認真假差異確實來自秘密內容；註解、字串或永真條件都不算證據。",
    q: [
      "沒有顯示資料庫錯誤，代表沒有 SQLi？",
      ["對", "不對", "只有 SQLite 才對"],
      1,
      "盲注可以只依回應內容、時間或其他側通道觀察。",
    ],
  },
  {
    title: "讓資料永遠只是資料",
    tag: "參數化防禦",
    day: 2,
    min: 25,
    kind: "defense",
    intro:
      "同樣的表單切換為安全模式。SQL 先固定為 WHERE category = ? AND released = 1，再把分類作為參數綁定。問號是值的位置，不是用字串替換進 SQL。",
    concept:
      "Prepared Statement 先定義結構，再 bind 值。先拼接惡意輸入、最後才 prepare 仍然有漏洞。參數不能代替表名或 ASC/DESC；動態結構應映射到程式預先允許的選項。",
    goal: "在不安全模式用同一段注入查到機密，再切換安全模式重試，確認回傳零列。",
    start: "' OR 1=1 -- ",
    hints: [
      "先執行不安全模式，確認回傳機密商品。",
      "切換安全模式，保持相同輸入再執行。",
      "安全模式會把整段輸入當作分類名稱，所以不應有相符分類。",
    ],
    explain:
      "安全查詢的結構沒有改變。最小權限限制損害範圍；輸入驗證、隱藏錯誤、WAF 與手動跳脫都不能取代參數化。Stored Procedure 內若仍拼接 SQL，也可能有漏洞。",
    q: [
      "哪個方案最能直接修復資料值造成的 SQLi？",
      ["擋掉 SELECT 字樣", "先拼字串再 prepare", "固定 SQL 後綁定參數"],
      2,
      "結構與值必須分開。黑名單容易漏掉語法與編碼變形。",
    ],
  },
  {
    title: "錯誤、時間與資料庫方言",
    tag: "進階延伸",
    day: 3,
    min: 25,
    kind: "error",
    intro:
      "錯誤可揭露語法、欄數或結構，但語法錯誤不等於已能竊取資料。Error-based 資料外洩通常利用特定引擎的轉型或函式，把資料帶入錯誤訊息。SQLite 的 1/0 會得到 NULL，不能照搬其他引擎的條件除零技巧。",
    concept:
      "此關先用真實 SQLite 製造 UNION 欄數錯誤。下方時間模型只示意條件與延遲的關係：不是在 SQLite 執行 SLEEP，也不是網路效能量測。實務需多次取樣與基線比較。",
    goal: "執行兩側欄數不同的 UNION，觀察真實 SQLite 錯誤。",
    start: "SELECT name,price FROM products UNION SELECT NULL",
    hints: [
      "第一個 SELECT 有兩欄，第二個只有一欄。",
      "直接執行預填 SQL 觀察錯誤；修成 SELECT NULL,NULL 再比較。",
      "這裡的錯誤來自資料庫，不是預設答案。",
    ],
    explain:
      "DBMS 差異很重要：MySQL 的 -- 後通常需要空白、可用 SLEEP；PostgreSQL 有 pg_sleep；SQL Server 有 WAITFOR DELAY；Oracle 常需 FROM dual。不可把方言當作可通用 Payload。二階注入是資料先儲存，之後被不安全拼接；OAST 利用外帶通道，本站不提供外部網路實驗。",
    q: [
      "SQLite 中 SELECT 1/0 的結果？",
      ["一定拋錯", "NULL", "延遲五秒"],
      1,
      "錯誤行為依引擎不同。判斷錯誤型技術前要驗證方言與設定。",
    ],
  },
  {
    title: "讓錯誤成為可驗證的訊號",
    tag: "條件錯誤",
    day: 3,
    min: 30,
    kind: "errorproof",
    intro:
      "這個隔離端點不回傳資料列，只顯示正常或 SQLite 錯誤。秘密為另一組隨機大寫字母，不與 Boolean 關共享。你的任務是利用條件決定是否觸發錯誤，推理第一個字元。",
    concept:
      "SQLite 的除零回傳 NULL，不能當成條件錯誤。此實驗用真正的 json('bad') 觸發 malformed JSON；CASE WHEN 條件 THEN json('bad') ELSE 1 END 僅在指定條件成立時求值錯誤分支。這是 SQLite 的條件錯誤側通道，不是模擬 SQL Server / PostgreSQL 的型別轉換外洩，也不會讓錯誤直接包含秘密。",
    goal: "先觀察正常與 malformed JSON 兩種回應，再讓錯誤只在秘密第一字元符合時發生，推理並提交該字元（A–Z）。",
    start: "文具' AND CASE WHEN 1=1 THEN json('bad') ELSE 1 END -- ",
    hints: [
      "比較 CASE WHEN 1=1 與 CASE WHEN 1=2：哪個會真的求值 json('bad')？",
      "把常數條件改成 substr((SELECT value FROM secrets),1,1) 的比較。錯誤=條件真，正常=條件假。",
      "文具' AND CASE WHEN substr((SELECT value FROM secrets),1,1)='X' THEN json('bad') ELSE 1 END -- （X 只是候選字元，請自行推理）",
    ],
    explain:
      "錯誤是否發生取決於秘密內容，因此正常／錯誤是一位元訊號。你已完成真正 SQLite 條件錯誤推理；這仍不同於把資料直接帶進詳細錯誤訊息的外洩技術。修復要參數化，不能只隱藏錯誤。",
    q: [
      "條件錯誤盲注依賴什麼？",
      [
        "秘密必須直接出現在錯誤文字",
        "條件能控制是否發生可觀察錯誤",
        "任何單次語法錯誤都代表成功",
      ],
      1,
      "重點是受控條件與錯誤的穩定關係；語法錯誤本身不代表已推理秘密。",
    ],
  },
  {
    title: "先找結構，再找資料",
    tag: "資料探查",
    day: 3,
    min: 25,
    kind: "discovery",
    intro:
      "你取得一個隔離的唯讀 SQLite 查詢工作臺，但不知道任務代碼存在哪張表。右側資料字典只列公開商品。請先探查資料庫結構，再查出調度代碼。此關的隨機資料與其他實驗分開。",
    concept:
      "sqlite_schema（舊名 sqlite_master）保存資料表、索引等物件的定義。name 是物件名稱、type 是種類、sql 是建立語句。先用 WHERE type='table' 看資料表，再閱讀 CREATE TABLE 找出欄位。其他 DBMS 的中繼資料介面可能是 information_schema 或系統目錄，不能照搬 SQLite 名稱。",
    goal: "先查出含 name 與 sql 的資料表定義，再依你找到的欄位讀取任務調度代碼。兩步都要實際執行。",
    start: "SELECT name FROM sqlite_schema WHERE type='table'",
    hints: [
      "除了名稱，你還需要 CREATE TABLE 內的欄位定義。",
      "SELECT name,sql FROM sqlite_schema WHERE type='table'",
      "讀取 mission_archive 的建立語句後，試著 SELECT dispatch_code FROM mission_archive。代碼由此實驗隨機產生。",
    ],
    explain:
      "你先從 SQLite 中繼資料找到結構，再查詢目標欄位。這裡是直接 SQL 工作臺；在 UNION 注入中，同樣的中繼資料 SELECT 還要符合原查詢的欄數與輸出位置。",
    q: [
      "sqlite_schema 的 sql 欄通常提供？",
      ["每一列的秘密值", "物件的建立 SQL 定義", "目前使用者的明文密碼"],
      1,
      "它描述結構；知道資料表與欄位名稱後，仍需要另一個查詢才能讀取內容。",
    ],
  },
];
export const exam = [
  [
    "SELECT name FROM products WHERE price < 200 有幾列？",
    ["1", "2", "4"],
    1,
    "基礎",
    "80、120 符合；990、250 不符合。",
  ],
  [
    "WHERE released=1 AND category='文具' OR 1=1 選出？",
    ["文具兩列", "全部四列", "只有已上架"],
    1,
    "布林",
    "AND 優先於 OR；最後 OR 真讓所有列符合。",
  ],
  [
    "輸入為何可能變成 SQL Injection？",
    ["資料被當成 SQL 結構解析", "字串太長", "資料庫使用英文"],
    0,
    "注入",
    "關鍵是查詢結構與不可信資料沒有分離。",
  ],
  [
    "哪個現象最能支持 Boolean 盲注？",
    ["單次 500 錯誤", "受控真／假條件穩定改變回應", "網頁有搜尋欄"],
    1,
    "盲注",
    "需反覆對照排除其他變因。",
  ],
  [
    "SELECT a,b FROM t UNION SELECT NULL,NULL 需要什麼？",
    ["另一側同欄數且型別可相容", "同一張表", "相同欄名"],
    0,
    "UNION",
    "不同資料表也能合併；輸出欄名由前側決定。",
  ],
  [
    "查詢改成 ? 後，如何傳遞輸入？",
    ["手動把 ? 換成輸入", "透過資料庫 API bind", "先刪所有空白"],
    1,
    "防禦",
    "綁定將值與 SQL 結構分開。",
  ],
  [
    "使用者可選排序欄位時？",
    ["把表名綁到 ?", "直接拼任何輸入", "固定允許清單映射欄名"],
    2,
    "防禦",
    "參數代表值；識別字需固定映射。",
  ],
  [
    "最小權限能保證沒有 SQLi 嗎？",
    ["能", "不能，但可降低損害", "只要 DBA 就安全"],
    1,
    "防禦",
    "權限控管是縱深防禦，不修復拼接。",
  ],
  [
    "WHERE username='admin' -- ' AND password='x' 的密碼條件？",
    ["仍會檢查", "變為本行註解", "自動改為空字串"],
    1,
    "注入",
    "-- 後同一行被忽略。",
  ],
  [
    "時間型盲注一次變慢就證明漏洞？",
    ["是", "否，需基線與多次對照", "只有手機才是"],
    1,
    "盲注",
    "網路雜訊與負載也會造成延遲。",
  ],
  [
    'prepare("SELECT ..." + input) 自動安全嗎？',
    ["是", "否，已把輸入拼入結構", "只在 SQLite 安全"],
    1,
    "防禦",
    "prepare 本身不會將已拼接的語法還原為資料。",
  ],
  [
    "登入繞過成功意味著？",
    ["一定知道原密碼", "可能只改變驗證條件", "一定取得作業系統權限"],
    1,
    "注入",
    "應根據實際回傳與程式行為判斷影響。",
  ],
];
