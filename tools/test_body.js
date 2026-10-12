ELS = JSON.parse(require_json); BY_ID = Object.fromEntries(ELS.map((e) => [e.id, e]));
for (const app of ["sol", "poutre", "barres"]) {
  const ex = EXAMPLES[app];
  const find = (re, pal) => ELS.find((x) => x.app === app && re.test(x.name) && (!pal || x.palier === pal))?.id;
  const items = ex.items.map(([re, pal, o]) => ({ id: find(re, pal), link: "none", bar: "BI", mousse: false, ...o }));
  const missing = items.filter((x) => !x.id).length;
  const ev = evaluate({ items: items.filter((x) => x.id), manual: {}, ded: {} }, ex.level, app);
  console.log(ex.label, "manquants:", missing, "ND", ev.nd + "/" + ev.ndMax, ev.tc.filter((t) => !t.ok).map((t) => t.t));
}
// sanity: every level/app has rules that run on an empty routine
for (const app of ["sol", "poutre", "barres"]) for (const l of LEVELS) { const ev = evaluate({ items: [], manual: {}, ded: {} }, l, app); if (ev.ndMax < 13) console.log("max bizarre", app, l, ev.ndMax); }
console.log("OK niveaux");

(async () => {
  for (const app of ["sol", "poutre", "barres"]) {
    const ex = EXAMPLES[app];
    const find = (re, pal) => ELS.find((x) => x.app === app && re.test(x.name) && (!pal || x.palier === pal))?.id;
    const r = { app, level: ex.level, name: "Test " + ex.label, gym: "Léa", items: ex.items.map(([re, pal, o]) => ({ id: find(re, pal), link: "none", bar: "BI", mousse: false, ...o })), manual: { v1: "ok" }, ded: { p: 2, m: 0, g: 0, c: 0 } };
    const code = await encodeRoutine(r);
    const back = await decodeRoutine("Regarde ça " + shareLink(code) + " !");
    const a = evaluate(r, r.level, app), b = evaluate(back, back.level, app);
    console.log(ex.label, "code", code.length, "car.", "| aller-retour identique :", JSON.stringify(back.items) === JSON.stringify(r.items) && a.final === b.final && back.gym === "Léa", "| note", a.final, b.final);
  }
  try { await decodeRoutine("PAL1-zAAAA"); } catch (e) { console.log("code abîmé ->", e.message); }
})();
