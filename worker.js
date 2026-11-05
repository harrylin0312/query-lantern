importScripts("./vendor/sql-wasm.js");
let db;
const ready = initSqlJs({ locateFile: (f) => "./vendor/" + f }).then((SQL) => {
  db = new SQL.Database();
  db.run(
    `CREATE TABLE products(id INTEGER,name TEXT,category TEXT,price INTEGER,released INTEGER); INSERT INTO products VALUES(1,'月光筆記','文具',80,1),(2,'星圖','文具',120,1),(3,'未公開原型','機密',990,0),(4,'軌道杯','生活',250,1);CREATE TABLE users(id INTEGER,username TEXT,password TEXT,role TEXT);INSERT INTO users VALUES(1,'admin','ORBIT-42','管理員'),(2,'mira','moon123','學員');CREATE TABLE secrets(label TEXT,value TEXT);INSERT INTO secrets VALUES('launch','AURORA');PRAGMA hard_heap_limit=16777216;PRAGMA max_page_count=256;`,
  );
});
onmessage = async ({ data: m }) => {
  try {
    await ready;
    if (m.sql.length > 12000) throw Error("查詢超過 12,000 字元");
    let out = [],
      stmt;
    try {
      stmt = db.prepare(m.sql);
      if (m.params) stmt.bind(m.params);
      let values = [],
        size = 0,
        truncated = false;
      while (stmt.step()) {
        if (values.length >= 200 || size > 100000) {
          truncated = true;
          break;
        }
        let row = stmt.get().map((v) => {
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
      out = [{ columns: stmt.getColumnNames(), values, truncated }];
    } finally {
      stmt?.free();
    }
    postMessage({ id: m.id, out });
  } catch (e) {
    postMessage({ id: m.id, error: e.message });
  }
};
