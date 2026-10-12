const fs = require("fs"), vm = require("vm");
const ctx = { console, performance, structuredClone, document: { addEventListener() {}, querySelector() { return null; }, documentElement: { style: { setProperty() {} } } },
  localStorage: { getItem() { return null; }, setItem() {} }, navigator: {}, fetch: () => new Promise(() => {}), window: { addEventListener() {} }, location: { origin: "", pathname: "/" } };
vm.createContext(ctx);
ctx.require_json = fs.readFileSync("app/elements.json", "utf8");
vm.runInContext(fs.readFileSync("app/rules.js", "utf8") + "\n" + fs.readFileSync("app/app.js", "utf8") + `
ELS = JSON.parse(require_json); BY_ID = Object.fromEntries(ELS.map((e) => [e.id, e]));
state.app = "sol"; state.level = "B1";
const ex = EXAMPLES.sol; const find = (re, pal) => ELS.find((x) => x.app === "sol" && re.test(x.name) && (!pal || x.palier === pal))?.id;
const d = { items: ex.items.slice(0, 4).map(([re, pal, o]) => ({ id: find(re, pal), link: "none", bar: "BI", ...o })), manual: {} };
const ev = evaluate(d);
for (const key of ["tc0", "tc2", "tc3", "v0", "v2", "v3"]) {
  const t0 = performance.now(); const sg = suggestFor(d, key); const ms = Math.round(performance.now() - t0);
  const r = key.startsWith("tc") ? ev.tc[+key.slice(2)] : ev.vals[+key.slice(1)];
  console.log(key, (r.ok ? "✓ " : "✗ ") + r.t, "→", sg.list.length, "suggestions,", ms, "ms :", sg.list.slice(0, 4).map((x) => x.e.palier + " " + x.e.name.slice(0, 28) + (x.link === "direct" ? " (lié)" : "")).join(" | "));
}`, ctx);
