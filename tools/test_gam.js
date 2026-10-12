const fs = require("fs"), vm = require("vm");
const ctx = { console, structuredClone, document: { addEventListener() {}, querySelector() { return null; }, documentElement: { style: { setProperty() {} } } },
  localStorage: { getItem() { return null; }, setItem() {} }, navigator: {}, fetch: () => new Promise(() => {}), window: { addEventListener() {} }, location: { origin: "", pathname: "/" } };
vm.createContext(ctx);
ctx.require_json = fs.readFileSync("app/elements.json", "utf8");
vm.runInContext(fs.readFileSync("app/rules.js", "utf8") + "\n" + fs.readFileSync("app/app.js", "utf8") + `
ELS = JSON.parse(require_json); BY_ID = Object.fromEntries(ELS.map((e) => [e.id, e]));
let errors = 0;
for (const app of ["gsol", "arcons", "anneaux", "paralleles", "fixe"]) for (const level of GAM_LEVELS) {
  state.app = app; state.level = level;
  const pool = ELS.filter((e) => e.app === elApp(app) && status(e, level, app).val);
  const items = pool.filter((e, i) => i % Math.max(1, Math.floor(pool.length / 9)) === 0).slice(0, 9).map((e, i) => ({ id: e.id, link: i % 3 ? "direct" : "none", bar: "BI" }));
  try { const ev = evaluate({ items, manual: {} }, level, app); if (level === "B2" || app === "arcons" && level === "A1") console.log(app, level, "ND", ev.nd + "/" + ev.ndMax, "| TC", ev.tc.map((t) => (t.ok ? "✓" : t.manual ? "?" : "✗") + t.t).join(" ; "), "| V", ev.vals.map((v) => (v.kept ? "✓" : v.manual ? "?" : v.ok ? "~" : "✗")).join("")); }
  catch (e) { errors++; console.log("ERREUR", app, level, e.message); }
}
for (const l of GAM_LEVELS) { const ev = evaluateSaut({ jumps: [{ id: ELS.find((e) => e.app === "saut" && e.palier === "P2").id }, { id: "" }], svalos: {} }, l); if (l === "B1") console.log("gsaut", l, "meilleur", ev.best); }
console.log("erreurs:", errors);
`, ctx);
