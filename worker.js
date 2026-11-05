importScripts("./vendor/sql-wasm.js");
let db, SQL, handbookDb;
const seed = `CREATE TABLE products(id INTEGER,name TEXT,category TEXT,price INTEGER,released INTEGER); INSERT INTO products VALUES(1,'月光筆記','文具',80,1),(2,'星圖','文具',120,1),(3,'未公開原型','機密',990,0),(4,'軌道杯','生活',250,1);CREATE TABLE users(id INTEGER,username TEXT,password TEXT,role TEXT);INSERT INTO users VALUES(1,'admin','ORBIT-42','管理員'),(2,'mira','moon123','學員');CREATE TABLE secrets(label TEXT,value TEXT);INSERT INTO secrets VALUES('launch','AURORA');`;
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function randomCode(n) {
  const bytes = crypto.getRandomValues(new Uint32Array(n));
  return Array.from(bytes, (v) => alphabet[v % 26]).join("");
}
const scenarios = new Map();
const ready = initSqlJs({ locateFile: (f) => "./vendor/" + f }).then(
  (engine) => {
    SQL = engine;
    db = new SQL.Database();
    db.run(seed + "PRAGMA hard_heap_limit=16777216;PRAGMA max_page_count=256;");
  },
);
function scenario(context) {
  if (!scenarios.has(context)) {
    const isolated = new SQL.Database();
    isolated.run(seed);
    const secret = randomCode(8);
    isolated.run("UPDATE secrets SET value=?", [secret]);
    if (context === "discovery") {
      isolated.run("CREATE TABLE mission_archive(dispatch_code TEXT)");
      isolated.run("INSERT INTO mission_archive VALUES(?)", [secret]);
    }
    isolated.run("PRAGMA max_page_count=256;PRAGMA query_only=ON");
    scenarios.set(context, {
      db: isolated,
      secret,
      yes: false,
      no: false,
      witness: false,
      discovered: false,
    });
  }
  const active = scenarios.get(context);
  active.db.run("PRAGMA query_only=ON");
  return active;
}
function execute(database, sql, params) {
  if (sql.length > 12000) throw Error("查詢超過 12,000 字元");
  let stmt;
  try {
    stmt = database.prepare(sql);
    if (params) stmt.bind(params);
    let values = [],
      size = 0,
      truncated = false;
    while (stmt.step()) {
      if (values.length >= 200 || size > 100000) {
        truncated = true;
        break;
      }
      const row = stmt.get().map((v) => {
        if (v instanceof Uint8Array) {
          truncated = true;
          return "[BLOB " + v.length + " bytes]";
        }
        if (typeof v === "string" && v.length > 2000) {
          truncated = true;
          return v.slice(0, 2000) + "…[截斷]";
        }
        return v;
      });
      size += JSON.stringify(row).length;
      values.push(row);
    }
    return [{ columns: stmt.getColumnNames(), values, truncated }];
  } finally {
    stmt?.free();
  }
}
function signal(database, sql, params, channel) {
  try {
    const out = execute(database, sql, params);
    return {
      yes: channel === "errorproof" ? false : out[0].values.length > 0,
      error: false,
    };
  } catch (e) {
    return { yes: channel === "errorproof", error: true, message: e.message };
  }
}
// Semantic assessment: no keyword matching. Change only the secret's first
// character, and execute the identical query twice for every candidate.
// A witness must distinguish the actual first character from all 25 alternatives.
function distinguishes(s, sql, params, channel) {
  // Inspect SQLite's compiled instructions, not user text. Volatile or unknown
  // functions may be explored, but cannot certify a secret-dependent witness.
  const deterministic = new Set([
    "substr",
    "substring",
    "unicode",
    "length",
    "lower",
    "upper",
    "hex",
    "instr",
    "char",
    "quote",
    "coalesce",
    "ifnull",
    "nullif",
    "trim",
    "ltrim",
    "rtrim",
    "like",
    "glob",
    "json",
    "json_valid",
    "json_extract",
    "abs",
    "round",
    "typeof",
    "count",
    "sum",
    "min",
    "max",
    "total",
    "avg",
  ]);
  const plan = execute(s.db, "EXPLAIN " + sql, params)[0];
  if (
    plan.truncated ||
    plan.values.some(
      (row) =>
        ["Function", "PureFunc", "AggStep"].includes(row[1]) &&
        !deterministic.has(String(row[5]).split("(")[0]),
    )
  )
    return false;

  let probe;
  try {
    const snapshot = s.db.export();
    s.db.run("PRAGMA query_only=ON");
    probe = new SQL.Database(snapshot);
    let expected = null;
    for (let repeat = 0; repeat < 2; repeat++) {
      const vector = [];
      for (const char of alphabet) {
        probe.run("PRAGMA query_only=OFF");
        probe.run("UPDATE secrets SET value=?", [char + s.secret.slice(1)]);
        probe.run("PRAGMA query_only=ON");
        const result = signal(probe, sql, params, channel);
        if (channel === "blind" && result.error) return false;
        vector.push(result.yes);
      }
      if (
        vector.filter(Boolean).length !== 1 ||
        !vector[alphabet.indexOf(s.secret[0])]
      )
        return false;
      const key = JSON.stringify(vector);
      if (expected !== null && key !== expected) return false;
      expected = key;
    }
    return true;
  } finally {
    probe?.close();
  }
}
onmessage = async ({ data: m }) => {
  const context = m.context || "default";
  try {
    await ready;
    let out;
    if (context === "handbook") {
      if (!handbookDb) {
        handbookDb = new SQL.Database();
        handbookDb.run(seed);
      }
      handbookDb.run("PRAGMA query_only=ON");
      out = execute(handbookDb, m.sql, m.params);
    } else if (
      m.action === "public" &&
      ["blind", "errorproof", "discovery"].includes(context)
    ) {
      out = execute(scenario(context).db, "SELECT * FROM products");
    } else if (["blind", "errorproof"].includes(context)) {
      const s = scenario(context);
      if (m.action === "answer") {
        const passed =
          /^[A-Z]$/.test(m.answer || "") &&
          m.answer === s.secret[0] &&
          s.yes &&
          s.no &&
          s.witness;
        out = [{ columns: [], values: [], passed }];
      } else {
        const result = signal(s.db, m.sql, m.params, context);
        if (context === "blind" && result.error)
          throw Error("查詢無法執行；盲注端點不公開詳細錯誤。");
        s.yes ||= result.yes;
        s.no ||= !result.yes;
        if (result.yes && !m.params && !s.witness)
          s.witness = distinguishes(s, m.sql, m.params, context);
        out = [
          {
            columns: [],
            values: [],
            observed: result.yes,
            engineError:
              context === "errorproof" && result.error
                ? result.message === "malformed JSON"
                  ? result.message
                  : "SQLite 查詢失敗（詳細內容已隱藏）"
                : undefined,
          },
        ];
      }
    } else if (context === "discovery") {
      const s = scenario(context);
      out = execute(s.db, m.sql, m.params);
      const row = out[0];
      if (
        row.columns.includes("name") &&
        row.columns.includes("sql") &&
        row.values.some(
          (v) =>
            v.includes("mission_archive") &&
            v.some(
              (c) =>
                typeof c === "string" &&
                c.includes("CREATE TABLE mission_archive"),
            ),
        )
      )
        s.discovered = true;
      row.passed =
        s.discovered &&
        row.columns.includes("dispatch_code") &&
        row.values.some((v) => v.includes(s.secret));
    } else out = execute(db, m.sql, m.params);
    postMessage({ id: m.id, out });
  } catch (e) {
    postMessage({
      id: m.id,
      error:
        context === "blind"
          ? "查詢無法執行；盲注端點不公開詳細錯誤。"
          : e.message,
    });
  }
};
