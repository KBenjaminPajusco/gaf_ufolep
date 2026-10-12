const fs = require("fs"), vm = require("vm");
const ctx = { console, structuredClone, document: { addEventListener() {}, querySelector() { return null; }, documentElement: { style: { setProperty() {} } } },
  localStorage: { getItem() { return null; }, setItem() {} }, navigator: {}, fetch: () => new Promise(() => {}), window: { addEventListener() {} }, location: { origin: "", pathname: "/" } };
vm.createContext(ctx);
ctx.require_json = fs.readFileSync("app/elements.json", "utf8");
vm.runInContext(fs.readFileSync("app/rules.js", "utf8") + "\n" + fs.readFileSync("app/app.js", "utf8") + `
ELS = JSON.parse(require_json); BY_ID = Object.fromEntries(ELS.map((e) => [e.id, e]));
for (const app of ["sol", "barres"]) {
  const ex = EXAMPLES[app];
  const find = (re, pal) => ELS.find((x) => x.app === app && re.test(x.name) && (!pal || x.palier === pal))?.id;
  const items = ex.items.map(([re, pal, o]) => ({ id: find(re, pal), link: "none", bar: "BI", ...o })).slice(0, app === "sol" ? 5 : 8);
  const ev = evaluate({ items, manual: {} }, ex.level, app);
  console.log("== " + ex.label + (app === "sol" ? " (5 premiers éléments)" : ""));
  ev.tc.forEach((r) => console.log((r.ok ? " ✓ " : " ✗ ") + r.t + "  →  " + r.why));
  ev.vals.forEach((v) => { if (v.ok && !v.kept) console.log("  ~ " + v.t + "  →  possible avec " + v.wit[0].map((i) => short(ev.H.items[i])).join(" + ")); });
}`, ctx);
