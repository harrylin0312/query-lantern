const fs = require("fs");
fs.mkdirSync("dist/vendor", { recursive: true });
for (const f of ["index.html", "app.js", "course.js", "style.css", "worker.js"])
  fs.copyFileSync(f, "dist/" + f);
for (const f of ["sql-wasm.js", "sql-wasm.wasm"])
  fs.copyFileSync("node_modules/sql.js/dist/" + f, "dist/vendor/" + f);

fs.copyFileSync("node_modules/sql.js/LICENSE", "dist/vendor/sql.js-LICENSE");
