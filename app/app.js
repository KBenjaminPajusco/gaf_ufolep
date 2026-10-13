"use strict";
// Mes Enchaînements — construction d'enchaînements GAF / GAM UFOLEP et note de départ (programme sept. 2026).
// Données : elements.json (arches de la brochure). Règles : rules.js.

const APPS = [
  { id: "barres", label: "Barres", disc: "GAF", color: "var(--barres)" },
  { id: "poutre", label: "Poutre", disc: "GAF", color: "var(--poutre)" },
  { id: "sol", label: "Sol", disc: "GAF", color: "var(--sol)" },
  { id: "saut", label: "Saut", disc: "GAF", color: "var(--saut)" },
  { id: "gsol", label: "Sol", disc: "GAM", color: "var(--sol)", el: "sol" },
  { id: "arcons", label: "Arçons", disc: "GAM", color: "var(--arcons)" },
  { id: "anneaux", label: "Anneaux", disc: "GAM", color: "var(--anneaux)" },
  { id: "gsaut", label: "Saut", disc: "GAM", color: "var(--saut)", el: "saut" },
  { id: "paralleles", label: "Barres parallèles", disc: "GAM", color: "var(--paralleles)" },
  { id: "fixe", label: "Barre fixe", disc: "GAM", color: "var(--fixe)" },
];
const APP = (id = state.app) => APPS.find((a) => a.id === id) || APPS[0];
const elApp = (id = state.app) => APP(id).el || id;          // jeu d'éléments utilisé (sol et saut sont mixtes)
const isGAM = (id = state.app) => APP(id).disc === "GAM";
const levelsFor = (id = state.app) => (isGAM(id) ? GAM_LEVELS : LEVELS);
const palTable = (id = state.app) => PALIERS_GAM[id] || PALIERS;
const appName = (id) => `${APP(id).label} ${APP(id).disc}`;
const PAL_NUM = { PR: 0, PR1: 0, PR2: 0, PR3: 0, P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, P6: 6, P7: 7, NOMADE: -1 };
const AVANT = ["En avant", "Vers l'avant"], ARRIERE = ["En arrière", "Vers l'arrière"];
const KIND_LABEL = { acro: "acro", saut: "saut", pivot: "pivot", maintien: "maintien", force: "force", souplesse: "souplesse", cercle: "cercle", entree: "entrée", barre: "", saut_agres: "" };

// Enchaînements d'exemple (repérés par nom + palier dans les arches)
const EXAMPLES = {
  sol: { label: "Sol B1", level: "B1", items: [
    [/^Départ fente ATR retour fente/], [/^Rondade$/, "P3"], [/^Flic-Flac\. Renversement arrière/, "P3", { link: "direct" }],
    [/^Saut enjambé \(écart/], [/^Saut de chat en avant$/], [/^Saut de cosaque appel d.1 pied/, null, { link: "indirect" }],
    [/^Pirouette 1 tour \(360°\) sur 1 jambe et sur 1\/2 pointes, position de la jambe libre indiff/], [/^Saut de mains 1 pied/]] },
  poutre: { label: "Poutre B3", level: "B3", items: [
    [/^Saut libre \(sans appui des mains\) à la station, appel 2/], [/^Saut de biche$/], [/^Pirouette 1 tour \(360°\)/, "P4", { link: "direct" }],
    [/^Saut antéro-postérieur à 180° appel/], [/^Souplesse arrière/, "P3"], [/^Tic-Tac/, "P4", { link: "direct" }],
    [/^Equerre écartée jambes tendues tenue/], [/^Saut de mains\. Renversement avant avec envol appel 1 pied et réception libre/, "P3"],
    [/^Rondade$/, "P5"], [/^Salto arrière groupé$/, "P3", { link: "direct" }]] },
  barres: { label: "Barres C1", level: "C1", items: [
    [/^Bascule BS/, null, { bar: "BS" }], [/^Tour d.appui arrière libre à l.appui/, null, { bar: "BS" }], [/^Elan en arrière à l.ATR avec jambes serrées/, null, { bar: "BS" }],
    [/^Shoushounova D/, null, { bar: "BI" }], [/^Bascule fixe/, null, { bar: "BI" }], [/^Balancé avant à l.horizontale/, null, { bar: "BS" }],
    [/^Grand tour en arrière 360/, null, { bar: "BS" }], [/^Elan vers l.avant et salto arrière tendu/, null, { bar: "BS" }]] },
  saut: { label: "", level: "B1", items: [] },
};

// pendant un glisser-déposer : pas de sélection de texte sur la page
function dragOn() { document.body.classList.add("dragging"); window.getSelection()?.removeAllRanges(); }
function dragOff() { document.body.classList.remove("dragging"); window.getSelection()?.removeAllRanges(); }

let ELS = [], BY_ID = {};
const isMobile = () => window.matchMedia?.("(max-width: 899px)").matches;
const isMousse = (id) => BY_ID[id]?.arche === "Acro poutre mousse"; // ces éléments se font sur la poutre mousse
const LS_KEY = "palier-v1";
const state = load() || { level: "B1", app: "sol", view: "catalogue", filter: "aut", q: "", drafts: {} };
state.fOpen = false; state.renaming = false;
state.media = {}; state.detail = null;

function load() { try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch { return null; } }
function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify({ ...state, media: undefined, detail: undefined })); } catch { /* stockage indisponible */ } }
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (x) => (Math.round(x * 100) / 100).toLocaleString("fr-FR", { minimumFractionDigits: x % 1 ? 1 : 0, maximumFractionDigits: 2 });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function draftKey() { return `${state.app}:${state.level}`; }
function draft() {
  const k = draftKey();
  if (!state.drafts[k]) state.drafts[k] = { id: uid(), name: "", items: [], manual: {}, ded: { p: 0, m: 0, g: 0, c: 0 }, jumps: [{ id: "", ded: 0 }, { id: "", ded: 0 }], svalos: {} };
  return state.drafts[k];
}
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), 2200);
}

// ---------- statut d'un élément pour le niveau courant ----------
function status(el, level = state.level, app = state.app) {
  if (el.app === "saut") {
    const r = SAUT[level];
    if (el.palier.startsWith("PR")) return { aut: r.prAut.includes(el.id), val: r.prVal.includes(el.id) };
    if (el.palier === "NOMADE") return { aut: true, val: false };
    return { aut: r.aut.includes(el.palier), val: r.val.includes(el.palier) };
  }
  if (el.palier === "NOMADE") return { aut: true, val: false };
  const r = palTable(app)[level] || PALIERS[level];
  return { aut: r.aut.includes(el.palier), val: r.val.includes(el.palier) };
}
function palBadge(el, st) {
  const cls = st.val ? "val" : st.aut ? "" : "out";
  const txt = el.palier === "NOMADE" ? "N" : el.palier;
  return `<span class="pal ${cls}" title="${st.val ? "valorisable" : st.aut ? "autorisé, non valorisable" : "hors niveau"}">${txt}</span>`;
}

// ---------- contexte d'évaluation ----------
function buildCtx(d, level, app) {
  const known = (d.items || []).filter((r) => BY_ID[r.id]); // un élément inconnu (base mise à jour) est ignoré
  const items = known.map((r, i) => {
    const el = BY_ID[r.id]; const st = status(el, level, app);
    const crossBeam = i > 0 && app === "poutre" && isMousse(r.id) !== isMousse(known[i - 1].id);
    return { ...el, i, link: i === 0 || crossBeam ? "none" : r.link || "none", bar: r.bar || "BI", mousse: isMousse(r.id), p: PAL_NUM[el.palier], aut: st.aut, val: st.val && el.palier !== "NOMADE" };
  });
  if (["barres", "poutre", "anneaux", "paralleles", "fixe"].includes(app) && items.length) items[items.length - 1].sortie = true;
  const counted = items.filter((it) => it.aut);

  // séries liées directement (LA, LAE, LG, LM) et passages gymniques (PG, liaisons directes ou indirectes)
  const runs = (ok) => {
    const out = []; let cur = [];
    for (const it of items) {
      if (cur.length && ok(it)) cur.push(it); else { if (cur.length > 1) out.push(cur); cur = [it]; }
    }
    if (cur.length > 1) out.push(cur);
    return out;
  };
  const direct = runs((it) => it.link === "direct");
  const anyLink = runs((it) => it.link === "direct" || it.link === "indirect");

  const gymLG = (it) => it.kind === "saut" || it.kind === "pivot";
  const H = {
    items, counted,
    // constats pour le tronc commun : { ok, items (mouvements qui valident), k (quantité demandée) }
    need: (pred, k = 1) => { const m = counted.filter(pred); return { ok: m.length >= k, items: m, k }; },
    either: (...cs) => cs.find((c) => c.ok) || { ok: false, items: cs.flatMap((c) => c.items || []), k: 1 },
    bothBarsC: () => { const bi = counted.find((it) => it.bar === "BI"), bs = counted.find((it) => it.bar === "BS"); return { ok: !!(bi && bs), items: [bi, bs].filter(Boolean), why: `BI : ${bi ? short(bi) : "aucun"} · BS : ${bs ? short(bs) : "aucun"}` }; },
    barChangeC: (a, b) => { const k = items.findIndex((it, k) => k > 0 && (a ? items[k - 1].bar === a && it.bar === b : items[k - 1].bar !== it.bar)); return k > 0 ? { ok: true, items: [items[k - 1], items[k]], why: `${short(items[k - 1])} (${items[k - 1].bar}) → ${short(items[k])} (${items[k].bar})` } : { ok: false, items: [] }; },
    pgC: () => { const g = H.pg()[0]; return { ok: !!g, items: g || [], why: g ? "PG : " + g.map(short).join(" + ") : "" }; },
    laC: (k) => {
      const seen = new Map(); for (const s of H.las()) { const key = s.map((it) => it.id).join(">"); if (!seen.has(key)) seen.set(key, s); }
      const l = [...seen.values()];
      return { ok: l.length >= k, items: l.flat(), why: l.length ? `${Math.min(l.length, k)}/${k} : ` + l.map((s) => s.map(short).join(" + ")).join(" · ") : `0/${k}` };
    },
    arches: (n) => {
      const by = new Map(); for (const it of counted) { if (!by.has(it.arche)) by.set(it.arche, []); if (!by.get(it.arche).includes(short(it))) by.get(it.arche).push(short(it)); }
      const groups = [...new Set(counted.map((it) => it.arche))].map((a) => [a, counted.filter((it) => it.arche === a)]);
      return [`${n} arches`, { ok: by.size >= n, groups, why: `${Math.min(by.size, n)}/${n} : ` + ([...by].map(([a, l]) => `${a} (${l.join(", ")})`).join(" · ") || "aucune") }];
    },
    count: (a, b) => { const c = new Set(counted.map((it) => it.id)).size; return [`${a} à ${b} éléments`, { ok: c >= a && c <= b, items: counted, why: `${c} élément${c > 1 ? "s" : ""} reconnu${c > 1 ? "s" : ""}${c > b ? ` (${c - b} de trop)` : ""}` }]; },
    has: (pred) => counted.some(pred),
    n: (pred) => counted.filter(pred).length,
    bothBars: () => counted.some((it) => it.bar === "BI") && counted.some((it) => it.bar === "BS"),
    barChange: (a, b) => items.some((it, k) => k > 0 && (a ? items[k - 1].bar === a && it.bar === b : items[k - 1].bar !== it.bar)),
    acroHaute: (it) => it.kind === "acro" && !it.mousse,
    gym: (it) => ["saut", "pivot", "maintien"].includes(it.kind),
    one: (pred, anyPal) => counted.filter((it) => (anyPal || it.val) && it.palier !== "NOMADE" && pred(it)).map((it) => [it.i]),
    k: (pred, n) => {
      const c = counted.filter((it) => it.val && pred(it)); const out = [];
      for (let x = 0; x < c.length; x++) for (let y = x + 1; y < c.length; y++) if (c[x].id !== c[y].id) out.push([c[x].i, c[y].i]);
      return out.slice(0, 40);
    },
    isLA: (s) => s.length >= 2 && s.every((it) => it.kind === "acro" && it.aut),
    isLAE: (s) => H.isLA(s) && s.every((it) => it.envol),
    isLG: (s) => s.length >= 2 && s.every((it) => gymLG(it) && it.val) && new Set(s.map((x) => x.id)).size === s.length,
    isLM: (s) => s.length >= 2 && s.every((it) => (gymLG(it) || it.kind === "acro") && it.val) && s.some(gymLG) && s.some((it) => it.kind === "acro"),
    series: (pred, anyPal) => direct.filter((s) => s.every((it) => it.palier !== "NOMADE") && (anyPal || s.some((it) => it.val)) && pred(s)).map((s) => s.map((it) => it.i)),
    las: () => direct.filter((s) => H.isLA(s)),
    distinctLA: () => new Set(H.las().map((s) => s.map((it) => it.id).join(">"))).size,
    pg: () => anyLink.filter((s) => s.every((it) => it.kind === "saut" && it.aut) && new Set(s.map((x) => x.id)).size >= 2),
    sortieMin: (p) => { const l = items.at(-1); return l && l.val && l.p >= p ? [[l.i]] : []; },
    sortieLinked: (pred, needLink = true) => {
      const l = items.at(-1), pv = items.at(-2);
      if (!l || !pv || !l.aut || !pv.aut || (needLink && l.link !== "direct")) return [];
      return pred(pv, l) ? [[pv.i, l.i]] : [];
    },
    followedBy: (pa, pb, anyPal) => {
      const out = [];
      items.forEach((it, k) => {
        if (!it.aut || (!anyPal && !it.val)) return;
        if (pa(it) && pb(it)) out.push([it.i]);
        const nx = items[k + 1];
        if (nx && nx.aut && (anyPal || nx.val) && nx.link === "direct" && pa(it) && pb(nx)) out.push([it.i, nx.i]);
      });
      return out;
    },
    twoDirections: (inLAE) => {
      let pool = counted.filter((it) => it.kind === "acro" && it.val && it.side);
      if (inLAE) { const inS = new Set(direct.filter(H.isLAE).flat().map((it) => it.i)); pool = pool.filter((it) => it.envol && inS.has(it.i)); }
      const av = pool.filter((it) => AVANT.includes(it.side)), ar = pool.filter((it) => ARRIERE.includes(it.side));
      const out = []; for (const a of av) for (const b of ar) out.push([a.i, b.i]);
      return out.slice(0, 40);
    },
    twoSalti: (minP) => {
      const out = [];
      for (const s of anyLink) {
        const sal = s.filter((it) => it.salto && it.val);
        for (let x = 0; x < sal.length; x++) for (let y = x + 1; y < sal.length; y++)
          if (Math.max(sal[x].p, sal[y].p) >= minP) out.push([sal[x].i, sal[y].i]);
      }
      return out;
    },
    direct, anyLink,
  };
  return H;
}

// nom court d'un mouvement (partie principale) pour les explications
const short = (it) => { const n = it.name.split(/\. |\(/)[0].trim(); return n.length > 42 ? n.slice(0, 40) + "…" : n; };
function describe(c) {
  if (c.why) return c.why;
  const names = [...new Set((c.items || []).map(short))];
  if ((c.k || 1) > 1) return `${Math.min(names.length, c.k)}/${c.k}` + (names.length ? " : " + names.join(", ") : "");
  return names.length ? "Validé par : " + names.join(", ") : "Aucun mouvement ne remplit cette exigence";
}

// ---------- évaluation complète ----------
function evaluate(d, level = state.level, app = state.app) {
  const H = buildCtx(d, level, app);
  const man = d.manual || {};
  const tcSpec = TC[app][level](H);
  const tc = tcSpec.map(([t, c, w], k) => {
    const m = man["tc" + k];
    const manual = c === null;
    const ok = c && typeof c === "object" ? c.ok : !!c, why = c && typeof c === "object" ? describe(c) : manual ? "À juger : coche-la si elle est réalisée" : w;
    return { t, auto: ok, why, manual, ok: m === "ok" ? true : m === "ko" ? false : !!ok, forced: m, c: c && typeof c === "object" ? c : null };
  });
  const vSpec = VALOS[app][level];
  const vals = vSpec.map((v, k) => {
    const m = man["v" + k]; const pts = v.s ? 3 : 2;
    let res = v.f(H), manual = res === null;
    let wit = res === null ? [] : res === true ? [[]] : res === false ? [] : res;
    if (m === "ok") wit = [[]]; else if (m === "ko") wit = [];
    return { ...v, pts, wit, manual, forced: m };
  });
  // choix : au plus 4 valorisations (« choisir 4 valorisations parmi les 5 / les 6 »), éléments distincts sauf « shared »
  const K = Math.min(4, vals.length);
  let best = { pts: 0, pick: {} };
  const rec = (k, used, n, pts, pick) => {
    if (pts > best.pts) best = { pts, pick: { ...pick } };
    if (k === vals.length || n === K) return;
    const v = vals[k];
    for (const w of v.wit) {
      if (!v.shared && w.some((i) => used.has(i))) continue;
      const nu = v.shared ? used : new Set([...used, ...w]);
      pick[k] = w; rec(k + 1, nu, n + 1, pts + v.pts, pick); delete pick[k];
    }
    rec(k + 1, used, n, pts, pick);
  };
  rec(0, new Set(), 0, 0, {});
  vals.forEach((v, k) => { v.kept = k in best.pick; v.use = best.pick[k]; v.ok = v.wit.length > 0; });
  const vMax = [...vals].map((v) => v.pts).sort((a, b) => b - a).slice(0, K).reduce((a, b) => a + b, 0);

  // l'appli calcule la note de départ ; seuls les éléments non reconnus sont signalés
  const warns = [];
  H.items.forEach((it) => { if (!it.aut) warns.push(`« ${it.name} » (${it.palier}) est hors des paliers autorisés en ${level} : non reconnu.`); });
  const tcPts = tc.filter((x) => x.ok).length;
  const nd = tcPts + best.pts;
  return { H, tc, vals, tcPts, vPts: best.pts, vMax, K, nd, ndMax: tc.length + vMax, warns, final: nd };
}

function evaluateSaut(d, level = state.level) {
  const notes = d.jumps.map((j) => {
    const el = BY_ID[j.id]; if (!el) return null;
    const st = status(el, level); const v = SAUT_VALEUR[el.palier] ?? 0;
    return { el, st, v, note: st.aut ? v : 0 };
  });
  const valid = notes.filter(Boolean);
  const best = valid.length ? Math.max(...valid.map((n) => n.note)) : 0;
  const vPts = Object.values(d.svalos || {}).reduce((a, x) => a + (x.on ? Number(x.pts) || 0 : 0), 0);
  return { notes, best, vPts, final: best + vPts };
}

// ---------- rendu ----------
function render() {
  const home = state.page !== "edit";
  document.body.classList.toggle("on-recap", home);
  document.body.classList.toggle("picking", !home && state.view === "catalogue" && elApp() !== "saut");
  $("#page-recap").hidden = !home;
  if (home) { $("#ctxbar").innerHTML = ""; renderRecap(); persist(); return; }
  const lvlColor = `var(--${state.level})`;
  document.documentElement.style.setProperty("--lvl", lvlColor);
  document.documentElement.style.setProperty("--app", APPS.find((a) => a.id === state.app).color);
  const app = APP();
  if (!levelsFor().includes(state.level)) state.level = levelsFor()[0];
  $("#ctxbar").innerHTML = `<span class="ctx-app" style="--c:${app.color}">${app.disc === "GAM" ? "GAM · " : ""}${app.label}</span>
    <label class="ctx-lvl" style="--c:var(--${state.level})"><span class="sr">Niveau</span><select id="ctxLevel" aria-label="Niveau de l'enchaînement">${levelsFor().map((l) => `<option value="${l}" ${l === state.level ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <span class="ctx-name">${esc(draft().name || "Sans nom")}</span>`;
  document.querySelectorAll(".pane").forEach((p) => p.classList.toggle("active", p.id === "pane-" + state.view));
  document.querySelectorAll("#tabbar button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === state.view));
  renderCatalogue();
  if (elApp() === "saut") renderSaut(); else { renderRoutine(); renderNote(); }
  persist();
  autosave();
}

// ---------- catalogue : arches, filtres, cartes ----------
const FLAG_LABEL = { envol: "avec envol", salto: "salto", rotlong: "rotation" };
const PAL_KEYS = ["PR", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "N"];
const palKey = (e) => (e.palier === "NOMADE" ? "N" : e.palier.startsWith("PR") ? "PR" : e.palier);
const F = () => (state.f ||= { arche: "", pal: [], kind: "", side: "", flags: [] });

// ---------- recherche : mot par mot, tolérante aux fautes ----------
// « rondade flip salto » = 3 mouvements : chaque mot (ou groupe de mots qui décrit un même mouvement,
// ex. « salto arrière ») donne sa propre liste de résultats.
const STOP = new Set("a au aux de des du d en et l la le les ou par sur un une avec".split(" "));
const SYNO = { flip: "flic", flips: "flic", flic: "flic", poirier: "atr", poiriers: "atr", equilibre: "atr", tictac: "tic", tic: "tic", flack: "flac" };
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9/]+/g, " ").trim();
// clé « phonétique » simple : un enfant écrit comme il entend (salteau, rondad, souplaisse…)
const phon = (w) => w.replace(/eaux?|aux?/g, "o").replace(/ph/g, "f").replace(/qu|c(?=[aou])|ck/g, "k").replace(/ai|ei|e(?=[sz]s?$)/g, "e").replace(/(.)\1+/g, "$1").replace(/[stex]$/, "") || w;
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev[j - 2] + 1);
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
const qRaw = (q) => norm(q).split(" ").filter((w) => w && !STOP.has(w));
const qWords = (q) => qRaw(q).map((w) => SYNO[w] || w);
const tokIndex = new Map(); // id → { head: mots du nom court, all: tous les mots }
function toks(e) {
  let t = tokIndex.get(e.id);
  if (!t) {
    const head = norm(e.name.split(/\. |\(|:|,/)[0]).split(" ").filter((w) => w && !STOP.has(w)).slice(0, 5);
    const all = [...new Set([...norm(`${e.name} ${e.arche} ${e.side || ""}`).split(" "), ...head])].filter(Boolean);
    t = { head: new Set(head), all, ph: all.map(phon), num: String(e.num).toLowerCase() };
    tokIndex.set(e.id, t);
  }
  return t;
}
// score d'un mot de la recherche sur un mouvement (0 = absent) ; + 2 quand le mot est dans le nom court
const WS = new Map();
function wordScore(w, e) {
  const key = w + "|" + e.id; let s = WS.get(key);
  if (s === undefined) { s = wordScore0(w, e); if (WS.size > 50000) WS.clear(); WS.set(key, s); }
  return s;
}
function wordScore0(w, e) {
  const t = toks(e); if (/^\d/.test(w) && t.num === w) return 6;
  const pw = phon(w), max = w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0;
  let s = 0;
  t.all.forEach((tok, k) => {
    let v = 0;
    if (tok === w) v = 4;
    else if (w.length >= 2 && tok.startsWith(w)) v = 3;
    else if (t.ph[k] === pw && pw.length >= 3) v = 2.5;
    else if (max && lev(w, tok, max) <= max) v = 2;
    else if (max && tok.length > w.length && lev(w, tok.slice(0, w.length), 1) <= 1 && w.length >= 4) v = 1.5;
    if (v && t.head.has(tok)) v += 2; // le mot est dans le nom du mouvement, pas seulement dans la description
    s = Math.max(s, v);
  });
  return s;
}
// découpe la recherche en groupes : on colle des mots voisins seulement s'ils désignent ensemble un même mouvement
function searchGroups(q, pool) {
  const ws = qWords(q), raw = qRaw(q), out = [];
  for (let i = 0; i < ws.length;) {
    let done = false;
    for (let n = Math.min(4, ws.length - i); n >= 2 && !done; n--) {
      const span = ws.slice(i, i + n);
      // tous les mots dans le nom court du même mouvement (exact, début de mot ou même son)
      const hits = pool.map((e) => [e, span.map((w) => wordScore(w, e))]).filter(([, ss]) => ss.every((s) => s >= 4.5)).map(([e, ss]) => [e, ss.reduce((a, b) => a + b, 0)]);
      if (hits.length) { out.push({ words: span, label: raw.slice(i, i + n), hits }); i += n; done = true; }
    }
    if (!done) { const w = ws[i]; out.push({ words: [w], label: [raw[i]], hits: pool.map((e) => [e, wordScore(w, e)]).filter(([, s]) => s > 0) }); i++; }
  }
  // dans chaque groupe, les correspondances approximatives s'effacent devant les bonnes
  for (const g of out) { const best = Math.max(0, ...g.hits.map(([, s]) => s)); g.hits = g.hits.filter(([, s]) => s >= best - 1.5 * g.words.length); }
  return out;
}

function catalogueList(arche = F().arche) {
  const f = F();
  return ELS.filter((e) => e.app === elApp()).map((e) => [e, status(e)]).filter(([e, st]) => {
    if (state.filter === "val" && !st.val) return false;
    if (state.filter === "aut" && !st.aut) return false;
    if (arche && e.arche !== arche) return false;
    if (f.pal.length && !f.pal.includes(palKey(e))) return false;
    if (f.kind && e.kind !== f.kind) return false;
    return true;
  });
}

const PAGE = { w: 1190.55, h: 841.89 };
function renderCatalogue() {
  if (!ELS.some((e) => e.app === elApp())) {
    $("#pane-catalogue").innerHTML = `<div class="pick-bar"><button type="button" class="back-arrow" data-view="routine" aria-label="Retour">←</button><span>${esc(APP().label)}</span></div>
      <header><h2 id="h-cat">Mouvements</h2></header><p class="empty">${esc(GAM_STATUS[state.app] || "Pas encore de catalogue pour cet agrès.")}</p>`;
    return;
  }
  const f = F(), isSaut = elApp() === "saut";
  const curView = state.catView || (isMobile() ? "liste" : "arche");
  const arcView = curView === "arche";
  const all = ELS.filter((e) => e.app === elApp());
  if (f.arche && !all.some((e) => e.arche === f.arche)) f.arche = "";
  const arches = [...new Set(all.map((e) => e.arche))];
  const shown = arcView ? f.arche || arches[0] : f.arche;
  const scope = all.filter((e) => !shown || e.arche === shown);
  const kinds = [...new Set(scope.map((e) => e.kind))].filter((k) => KIND_LABEL[k]);
  const sides = [...new Set(scope.map((e) => e.side).filter(Boolean))];
  const list = catalogueList(shown);
  const order = (e) => (e.palier === "NOMADE" ? 9 : PAL_NUM[e.palier] + (e.palier.startsWith("PR") ? -1 : 0));
  list.sort((a, b) => order(a[0]) - order(b[0]) || a[0].arche.localeCompare(b[0].arche));
  const pal = isSaut ? SAUT[state.level] : palTable()[state.level];
  const nActive = f.pal.length + !!f.kind + (state.filter !== "aut");
  const searching = !!qWords(state.q).length;
  const chip = (attr, val, on, label) => `<button type="button" class="fchip" ${attr}="${esc(val)}" aria-pressed="${on}">${label}</button>`;
  const inRoutine = {};
  if (!isSaut) for (const it of draft().items) inRoutine[it.id] = (inRoutine[it.id] || 0) + 1;

  let html = `${isSaut ? "" : `<div class="pick-bar"><button type="button" class="back-arrow" data-view="routine" aria-label="Retour à l'enchaînement">←</button><span>Ajouter un élément</span></div>`}
  <header><h2 id="h-cat">Mouvements</h2>
    <div class="seg viewseg" role="group" aria-label="Affichage">${[["arche", "Arche"], ["liste", "Liste"]].map(([k, l]) => `<button type="button" data-catview="${k}" aria-pressed="${curView === k}">${l}</button>`).join("")}</div></header>
  <div class="tools">
    <input class="search" id="q" type="search" placeholder="Cherche : rondade flip salto…" value="${esc(state.q)}" aria-label="Chercher un ou plusieurs mouvements" autocomplete="off">
    <button type="button" class="fbtn" data-act="ftoggle" aria-expanded="${!!state.fOpen}">Filtres${nActive ? ` <b>${nActive}</b>` : ""}</button>
  </div>
  ${searching ? "" : `<div class="arches" role="group" aria-label="Arche">
    ${arcView ? "" : chip("data-arche-pick", "", !f.arche, "Toutes")}
    ${arches.map((a) => chip("data-arche-pick", a, shown === a, esc(a))).join("")}
  </div>`}
  ${state.fOpen ? `<div class="filters">
    <div class="frow"><span class="flabel">Montrer</span>${[["val", "Qui rapportent des points"], ["aut", "De mon niveau"], ["all", "Tous"]].map(([k, l]) => chip("data-filter", k, state.filter === k, l)).join("")}</div>
    <div class="frow"><span class="flabel">Palier</span>${PAL_KEYS.filter((k) => scope.some((e) => palKey(e) === k)).map((k) => chip("data-fpal", k, f.pal.includes(k), k === "N" ? "Nomade" : k)).join("")}</div>
    ${kinds.length > 1 ? `<div class="frow"><span class="flabel">Type</span>${kinds.map((k) => chip("data-fkind", k, f.kind === k, KIND_LABEL[k])).join("")}</div>` : ""}
  </div>` : ""}
  ${nActive ? `<div class="results-bar"><button type="button" class="linkbtn" data-act="clearf">effacer les filtres</button></div>` : ""}`;

  const card = (e, st) => `<li class="card-el ${st.aut ? "" : "out"}" data-id="${e.id}">
      <button type="button" class="thumb" data-detail="${e.id}" aria-label="Voir ${esc(e.name)}">
        ${e.img ? `<img src="img/${e.id}.webp" alt="" loading="lazy" draggable="false">` : `<span class="noimg">pas d'image</span>`}
        ${palBadge(e, st)}${state.media[e.id] ? `<span class="vid" title="vidéo disponible">▶</span>` : ""}${inRoutine[e.id] ? `<span class="cnt" title="déjà dans l'enchaînement">${inRoutine[e.id]}</span>` : ""}
      </button>
      <div class="cbody"><div class="nm" data-detail="${e.id}">${esc(short(e))}</div>${isSaut ? `<div class="meta">valeur ${SAUT_VALEUR[e.palier]}</div>` : ""}</div>
      ${isSaut ? "" : `<button class="add" type="button" data-add="${e.id}" aria-label="Ajouter ${esc(e.name)}">+</button>`}
    </li>`;
  const sortable = (sel) => { if (!isSaut && !isMobile() && window.Sortable) document.querySelectorAll(sel).forEach((ul) => Sortable.create(ul, {
    group: { name: "els", pull: "clone", put: false }, sort: false, animation: 120, forceFallback: true, onStart: dragOn, onEnd: dragOff, fallbackTolerance: 4,
    filter: ".add", preventOnFilter: false, delay: 180, delayOnTouchOnly: true,
  })); };

  // recherche : un bloc de résultats par mouvement cherché (« rondade flip salto » = 3 blocs)
  if (searching) {
    const pool = catalogueList("");
    const stOf = new Map(pool.map(([e, st]) => [e.id, st]));
    const groups = searchGroups(state.q, pool.map(([e]) => e));
    for (const g of groups) {
      g.hits.sort((a, b) => b[1] - a[1] || stOf.get(b[0].id).val - stOf.get(a[0].id).val || order(a[0]) - order(b[0]));
      html += `<section class="sgroup"><h3 class="sg-word">${groups.length > 1 ? `<span class="sg-n">${groups.indexOf(g) + 1}</span>` : ""}« ${esc(g.label.join(" "))} »</h3>`
        + (g.hits.length ? `<ul class="cards">${g.hits.map(([e]) => card(e, stOf.get(e.id))).join("")}</ul>` : `<p class="empty">Rien trouvé pour ce mot.${state.filter !== "all" ? ` <button type="button" class="linkbtn" data-filter="all">Chercher aussi hors de mon niveau</button>` : ""}</p>`)
        + `</section>`;
    }
    $("#pane-catalogue").innerHTML = html;
    sortable("#pane-catalogue .cards");
    return;
  }

  if (arcView) {
    const W = PAGE.w, H = PAGE.h, z = state.zoom || 1;
    const match = new Set(list.map(([e]) => e.id));
    const items = scope.filter((e) => e.hs).sort((a, b) => b.hs[3] * b.hs[4] - a.hs[3] * a.hs[4]);
    const pg = items[0]?.hs[0];
    html += `<div class="arche-tools"><span class="lg"><i class="k-val"></i>rapporte des points</span><span class="lg"><i class="k-aut"></i>de mon niveau</span>
      <span class="zoom" role="group" aria-label="Zoom"><button type="button" class="mini icon" data-zoom="-1" aria-label="Dézoomer" ${z <= 1 ? "disabled" : ""}>−</button><output>${Math.round(z * 100)} %</output><button type="button" class="mini icon" data-zoom="1" aria-label="Zoomer" ${z >= 2.5 ? "disabled" : ""}>+</button></span></div>
    <div class="arche-wrap"><div class="arche-canvas" id="archeCanvas" style="width:${z * 100}%">
      ${pg ? `<img src="arches/p${pg}.webp" alt="Arche ${esc(shown)} (brochure p. ${pg + 27})" draggable="false">` : ""}
      ${items.map((e) => {
        const st = status(e), [, cx, cy, w, h, a] = e.hs;
        const cls = [!match.has(e.id) ? "dim" : st.val ? "val" : st.aut ? "aut" : "out", inRoutine[e.id] ? "inr" : ""].join(" ");
        return `<button type="button" class="hs ${cls}" data-detail="${e.id}" data-id="${e.id}" title="${esc(e.palier === "NOMADE" ? "Nomade" : e.palier)} · ${esc(e.name)}"
          style="left:${((cx - w / 2) / W * 100).toFixed(3)}%;top:${((cy - h / 2) / H * 100).toFixed(3)}%;width:${(w / W * 100).toFixed(3)}%;height:${(h / H * 100).toFixed(3)}%;--a:${a}deg">${inRoutine[e.id] ? `<span class="cnt">${inRoutine[e.id]}</span>` : ""}</button>`;
      }).join("")}
    </div></div>`;
    $("#pane-catalogue").innerHTML = html;
    if (!isSaut && !isMobile() && window.Sortable) Sortable.create($("#archeCanvas"), {
      group: { name: "els", pull: "clone", put: false }, sort: false, draggable: ".hs", animation: 0, forceFallback: true, onStart: dragOn, onEnd: dragOff, fallbackTolerance: 5,
      delay: 200, delayOnTouchOnly: true, fallbackClass: "hs-drag",
    });
    return;
  }

  if (!list.length) html += `<p class="empty">Aucun mouvement ici. Essaie « Tous » dans les filtres.</p>`;
  html += `<ul class="cards" id="cards">${list.map(([e, st]) => card(e, st)).join("")}</ul>`;
  $("#pane-catalogue").innerHTML = html;
  sortable("#cards");
}

function ytSearch(e) {
  const app = { barres: "barres asymétriques", poutre: "poutre", sol: "sol", saut: "saut" }[e.app];
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(`gymnastique ${app} ${e.name.split(/[.(]/)[0]}`);
}
function embedUrl(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return { kind: "yt", src: `https://www.youtube-nocookie.com/embed/${m[1]}` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { kind: "video", src: url };
  return { kind: "link", src: url };
}
function renderDetail() {
  const dlg = $("#detail"), e = BY_ID[state.detail];
  if (!e) { if (dlg.open) dlg.close(); return; }
  const st = status(e), m = state.media[e.id];
  const ev = m ? embedUrl(m.url) : null;
  const statusTxt = st.val ? "Rapporte des points en " + state.level : st.aut ? "Autorisé en " + state.level + ", ne rapporte pas de points" : "Pas autorisé en " + state.level;
  dlg.innerHTML = `<form method="dialog" class="dlg">
    <header><div>${palBadge(e, st)} <span class="muted">${esc(e.arche)}</span></div><button class="mini icon" value="close" aria-label="Fermer">×</button></header>
    ${state.fromReq ? `<button type="button" class="linkbtn" data-req="${state.fromReq}">← Retour au barème</button>` : ""}
    <h3>${esc(e.name)}</h3>
    ${e.img ? `<img class="big" src="img/${e.id}.webp" alt="Pictogramme de la brochure : ${esc(e.name)}">` : ""}
    <div class="chips"><span class="chip ${st.val ? "okc" : ""}">${statusTxt}</span></div>
    <section class="video">
      ${ev ? ev.kind === "yt" ? `<div class="frame"><iframe src="${ev.src}" title="Vidéo ${esc(e.name)}" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
        : ev.kind === "video" ? `<video src="${esc(ev.src)}" controls playsinline preload="metadata"></video>` : `<p><a href="${esc(ev.src)}" target="_blank" rel="noopener">Ouvrir la vidéo</a></p>` : ""}
      <a class="btn yt" href="${ytSearch(e)}" target="_blank" rel="noopener">Voir des vidéos sur YouTube ↗</a>
      <details class="vid-add"><summary>${m ? "Changer ma vidéo" : "Ajouter ma vidéo"}</summary><div class="vrow">
        <input id="vidUrl" type="url" placeholder="Coller un lien YouTube ou .mp4" value="${esc(m?.url || "")}" aria-label="Lien de la vidéo">
        <button class="btn" type="button" data-act="savevid">Enregistrer</button>
        ${m ? `<button class="btn danger" type="button" data-act="delvid">Retirer</button>` : ""}
      </div></details>
    </section>
    ${e.app === "saut" ? "" : state.detailPos != null && draft().items[state.detailPos]?.id === e.id
      ? `<div class="pos-row"><span>Élément n° ${state.detailPos + 1} de l'enchaînement</span><button class="btn danger" type="button" data-delpos="${state.detailPos}">Retirer de l'enchaînement</button></div>
         <button class="btn wide" type="button" data-add="${e.id}">L'ajouter encore une fois à la fin</button>`
      : state.fromReq ? `<button class="btn primary wide" type="button" data-sadd="${e.id}:${state.sgLink || "none"}">Ajouter à l'enchaînement${state.sgLink === "direct" ? " (lié à l'élément précédent)" : ""}</button>`
      : `<button class="btn primary wide" type="button" data-add="${e.id}">Ajouter à l'enchaînement</button>`}
  </form>`;
  if (!dlg.open) dlg.showModal();
}

function seriesLabels(H, app) {
  const lab = {};
  for (const s of H.direct) {
    let t = H.isLAE(s) ? "LAE" : H.isLA(s) ? "LA" : H.isLG(s) ? "LG" : app === "poutre" && H.isLM(s) ? "LM" : "";
    if (t) lab[s[0].i] = t;
  }
  if (app === "sol") for (const s of H.pg()) if (!lab[s[0].i]) lab[s[0].i] = "PG";
  return lab;
}

function renderRoutine() {
  const d = draft(), ev = evaluate(d), H = ev.H;
  const lab = seriesLabels(H, elApp());
  let html = `<header><h2 id="h-rout">Enchaînement</h2><div id="saveState" class="save-state"></div>
    <span class="rt-actions"><button class="mini" type="button" data-act="rename" aria-pressed="${!!state.renaming}">✎ Nom</button><button class="mini" type="button" data-act="share">Partager</button></span></header><div class="stack">
  <div class="card stack">
    ${state.renaming ? `<div class="rt-head">
      <input id="rtName" type="text" placeholder="Nom (ex. Régional 2027)" value="${esc(d.name)}" aria-label="Nom de l'enchaînement">
      <input id="rtGym" type="text" placeholder="Gymnaste" value="${esc(d.gym || "")}" aria-label="Gymnaste" list="gymList">
    </div>
    <datalist id="gymList">${[...new Set((SAVED || []).map((r) => r.gym).filter(Boolean))].map((g) => `<option value="${esc(g)}">`).join("")}</datalist>` : ""}`;
  const noCat = !ELS.some((e) => e.app === elApp());
  if (noCat) html += `<p class="empty">${esc(GAM_STATUS[state.app] || "")}</p>`;
  html += `<ol class="rt-list" id="rtList" ${noCat ? "hidden" : ""}>`;
  if (!d.items.length) html += `<li class="empty ph">${isMobile() ? "Touche <b>+ Ajouter un élément</b> pour choisir ton premier mouvement." : "Glisse des mouvements ici, ou touche + dans le catalogue."}<br><br>${EXAMPLES[state.app]?.level === state.level ? `<button class="btn" type="button" data-act="example">Remplir avec l'exemple ${EXAMPLES[state.app]?.label}</button>` : ""}</li>`;
  else {
    H.items.forEach((it, k) => {
      const st = { aut: it.aut, val: it.val };
      const canIndirect = elApp() === "sol" && it.kind === "saut" && H.items[k - 1]?.kind === "saut";
      const linkTxt = it.link === "direct" ? "lié" : it.link === "indirect" ? "lié par pas" : "lier";
      html += `<li class="rt-item ${it.aut ? "" : "bad"} ${it.link !== "none" ? "linked" : ""}" data-eid="${it.id}">
        <span class="idx" title="glisser pour déplacer">${k + 1}</span><button type="button" class="rt-open" data-detail="${it.id}" data-pos="${k}" aria-label="Voir la fiche : ${esc(it.name)}">${it.img ? `<img class="rt-thumb" src="img/${it.id}.webp" alt="" draggable="false">` : palBadge(it, st)}</button>
        <div><div class="nm" data-detail="${it.id}" data-pos="${k}" title="Voir la fiche">${it.img ? palBadge(it, st) + " " : ""}${esc(short(it))} ${lab[k] ? `<span class="series-tag">${lab[k]}</span>` : ""}</div></div>
        <div class="ctrl">
          ${k > 0 && !(state.app === "poutre" && it.mousse !== H.items[k - 1].mousse) ? `<button class="mini" type="button" data-link="${k}" aria-pressed="${it.link !== "none"}" title="Liaison avec l'élément précédent${canIndirect ? " (directe ou par pas : PG)" : ""}">↔ ${linkTxt}</button>` : ""}
          ${state.app === "barres" ? `<button class="mini" type="button" data-bar="${k}" aria-pressed="${it.bar === "BS"}">${it.bar}</button>` : ""}
          ${it.mousse ? `<span class="beam-tag">poutre mousse</span>` : ""}
          <button class="mini icon" type="button" data-del="${k}" aria-label="Retirer">×</button>
        </div></li>`;
    });
  }
  html += `</ol></div>
  ${noCat ? "" : `<button class="add-fab" type="button" data-view="catalogue">+ Ajouter un élément</button>`}`;
  if (ev.warns.length) html += `<ul class="warn-list">${ev.warns.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>`;
  html += `</div>`;
  $("#pane-routine").innerHTML = html;
  $("#tabCount").textContent = d.items.length || "";
  initRoutineDnD(d);
  paintSaveState(d);
}

// glisser-déposer : depuis les cartes du catalogue (ajout) et dans la liste (réordonner)
function initRoutineDnD(d) {
  const ol = $("#rtList"); if (!ol || !window.Sortable) return;
  const indexOf = (node) => [...ol.children].filter((n) => n.classList.contains("rt-item") || n === node).indexOf(node);
  Sortable.create(ol, {
    group: { name: "els", pull: false, put: true }, draggable: ".rt-item", animation: 150, forceFallback: true, onStart: dragOn, onEnd: dragOff, fallbackTolerance: 4,
    filter: "button, .nm", preventOnFilter: false, delay: 150, delayOnTouchOnly: true, ghostClass: "ghost",
    onAdd(evt) {
      const id = evt.item.dataset.id, at = indexOf(evt.item);
      evt.item.remove();
      if (!BY_ID[id]) return;
      const prev = d.items[at - 1];
      d.items.splice(at, 0, { id, link: "none", bar: prev?.bar || "BI" });
      d.items[0].link = "none";
      toast(`Ajouté en position ${at + 1}`); render();
    },
    onUpdate(evt) {
      const [m] = d.items.splice(evt.oldDraggableIndex, 1);
      d.items.splice(evt.newDraggableIndex, 0, m);
      d.items[0].link = "none"; render();
    },
  });
}

function reqRow(kind, k, r, extra) {
  const cls = r.ok ? "ok" : r.manual && !r.forced ? "man" : "ko";
  const sym = r.ok ? "✓" : r.manual && !r.forced ? "?" : "✗";
  const hint = r.forced ? "réglé à la main · toucher pour changer" : r.manual ? "à juger : toucher pour valider" : "auto · toucher pour forcer";
  return `<div class="req ${cls} ${extra?.kept ? "kept" : ""}" ${extra?.hl?.length ? `data-hl="${extra.hl.join(",")}"` : ""}>
    <button class="st" type="button" data-man="${kind}${k}" title="${hint}" aria-label="${esc(r.t)} : ${hint}">${sym}</button>
    <button type="button" class="req-open" data-req="${kind}${k}" title="Voir le détail"><span>${r.s ? `<span class="star">(*) </span>` : ""}${esc(r.t)}</span>${extra?.why ? `<span class="why">${esc(extra.why)}</span>` : ""}</button>
    <span class="p">${extra?.pts ?? ""}</span></div>`;
}

// Détail d'une exigence : propose les mouvements du catalogue qui la rempliraient, à ajouter en un geste.
// Principe : on essaie chaque mouvement autorisé en fin d'enchaînement (non lié, puis lié au précédent)
// et on garde ceux qui font progresser l'exigence.
function reqRowOf(ev, key) {
  const isTc = key.startsWith("tc"), k = Number(key.replace(/\D/g, ""));
  return isTc ? ev.tc[k] : ev.vals[k];
}
// évaluation rapide d'une seule exigence (pour tester des centaines d'ajouts possibles)
function reqEval(d, key, level = state.level, app = state.app) {
  const H = buildCtx(d, level, app), k = Number(key.replace(/\D/g, ""));
  if (key.startsWith("tc")) {
    const [, c] = TC[app][level](H)[k];
    const obj = c && typeof c === "object" ? c : { ok: !!c, items: [] };
    return { ok: obj.ok, uses: (i) => (obj.items || []).some((it) => it.i === i), n: obj.items?.length || 0 };
  }
  const res = VALOS[app][level][k].f(H) || [], wit = Array.isArray(res) ? res : [];
  return { ok: wit.length > 0, uses: (i) => wit.some((w) => w.includes(i)), usesAll: (is) => wit.some((w) => is.every((i) => w.includes(i))) };
}
function suggestFor(d, key) {
  const ev = evaluate(d), r = reqRowOf(ev, key), isTc = key.startsWith("tc");
  if (!r || r.manual) return { r, list: [], series: [] };
  const cands = ELS.filter((e) => e.app === elApp() && status(e).aut);
  // « 4 arches » : uniquement les éléments des arches absentes de l'enchaînement
  if (isTc && /arches$/.test(r.t)) {
    const have = new Set(ev.H.counted.map((it) => it.arche));
    return { r, list: cands.filter((e) => !have.has(e.arche)).map((e) => ({ e, link: "none" })), series: [], arches: true };
  }
  if (isTc && /éléments$/.test(r.t)) return { r, list: [], series: [], info: "Ajoute des mouvements différents depuis le catalogue jusqu'à atteindre le nombre demandé." };
  const n = d.items.length, last = d.items.at(-1), bar = last?.bar || "BI";
  const base = reqEval(d, key);
  const better = (x) => (isTc ? x.ok && !base.ok || (!base.ok && x.n > base.n) : x.ok && !base.ok);
  const out = [], single = new Set();
  // 1) un seul mouvement ajouté en fin d'enchaînement (non lié, puis lié au précédent)
  for (const e of cands) {
    for (const link of n ? ["none", "direct"] : ["none"]) {
      const x = reqEval({ ...d, items: [...d.items, { id: e.id, link, bar }] }, key);
      if (x.uses(n) && (better(x) || base.ok)) { out.push({ e, link }); single.add(e.id); break; }
    }
  }
  // 2) exigence pas encore remplie : deux mouvements liés entre eux (LA, LAE, PG, 2 salti…)
  const pairs = [], pc = cands.filter((e) => e.palier !== "NOMADE");
  // valorisation possible mais pas comptée (ses mouvements servent déjà ailleurs) : on propose aussi des séries neuves
  if (!base.ok || (!isTc && !r.kept)) {
    for (const a of pc) {
      if (!base.ok && single.has(a.id)) continue;
      for (const b of pc) {
        if (!base.ok && single.has(b.id)) continue;
        const x = reqEval({ ...d, items: [...d.items, { id: a.id, link: "none", bar }, { id: b.id, link: "direct", bar }] }, key);
        if (x.ok && (x.usesAll ? x.usesAll([n, n + 1]) : x.uses(n) && x.uses(n + 1))) pairs.push({ a, b });
      }
    }
    // + des enchaînements qui se font vraiment : même sens de rotation, rondade en premier (elle part vers l'arrière),
    // salto plutôt en dernier, pas d'élément tenu au milieu d'une liaison, deux mouvements différents de préférence
    const back = (e) => ARRIERE.includes(e.side), rond = (e) => /^rondade/i.test(e.name), held = (e) => /tenu|tenue|maintien/i.test(e.name);
    const step = (x, y) => (x.id === y.id ? 20 : 0) + (x.side && x.side === y.side ? -3 : 0) + (rond(x) && back(y) ? -6 : 0) + (rond(y) ? 4 : 0) + (x.salto ? 3 : 0);
    const pv = (els) => (els.reduce((t, e) => t + PAL_NUM[e.palier] + (held(e) ? 4 : 0), 0) + els.slice(1).reduce((t, e, k) => t + step(els[k], e), 0)
      + (els.length - new Set(els.map(short)).size) * 12) / els.length; // le même mouvement deux fois : en dernier
    pairs.sort((p, q) => pv([p.a, p.b]) - pv([q.a, q.b]));
    let series = pairs.map((p) => ({ els: [p.a, p.b] }));
    // 3) séries de 3 : on prolonge les meilleures paires devant ou derrière (rondade – flic-flac – salto)
    const top = [], seenTop = new Set();
    for (const x of series) { const k = x.els.map(short).join(">"); if (!seenTop.has(k)) { seenTop.add(k); top.push(x); } if (top.length >= 30) break; }
    const rows = (els) => els.map((e, k) => ({ id: e.id, link: k ? "direct" : "none", bar }));
    const idx3 = [n, n + 1, n + 2];
    for (const x of top) for (const c of pc) for (const els of [[...x.els, c], [c, ...x.els]]) {
      const y = reqEval({ ...d, items: [...d.items, ...rows(els)] }, key);
      if (y.ok && (y.usesAll ? y.usesAll(idx3) : idx3.every((i) => y.uses(i)))) series.push({ els, link: "direct" });
    }
    // une proposition par suite de noms ; les plus simples d'abord, puis on garde les 60 meilleures pour les noter
    const seen = new Set();
    series = series.map((x) => ({ ...x, pv: pv(x.els) })).sort((a, b) => a.pv - b.pv)
      .filter((x) => { const nm = x.els.map(short), k = (nm.length === 2 ? nm.sort() : nm).join(">"); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 60);
    // ce que la série rapporte en plus : points de la note de départ (valo + tronc commun) et arches nouvelles
    const have = new Set(ev.H.counted.map((it) => it.arche));
    for (const x of series) {
      const e2 = evaluate({ ...d, items: [...d.items, ...rows(x.els)] });
      x.gain = e2.nd - ev.nd;
      x.arches = [...new Set(x.els.map((e) => e.arche))].map((a) => ({ a, neu: !have.has(a) }));
    }
    series.sort((a, b) => b.gain - a.gain || b.arches.filter((z) => z.neu).length - a.arches.filter((z) => z.neu).length || a.pv - b.pv);
    return { r, list: out, series };
  }
  return { r, list: out, series: [] };
}
// 10 séries au plus, variées (pas toujours le même mouvement) ; pour 2 éléments, dit si la liaison est nécessaire
// (« 2 acros de sens différents » n'en demande pas)
function pickSeries(series, d, key) {
  const nf = {}, ne = {}, keep = [], bar = d.items.at(-1)?.bar || "BI";
  for (const x of series) {
    const names = x.els.map(short);
    if ((nf[names[0]] || 0) >= 2 || names.some((m) => (ne[m] || 0) >= 4)) continue;
    nf[names[0]] = (nf[names[0]] || 0) + 1; names.forEach((m) => (ne[m] = (ne[m] || 0) + 1)); keep.push(x);
    if (keep.length >= 10) break;
  }
  for (const x of keep) if (!x.link) {
    const y = reqEval({ ...d, items: [...d.items, ...x.els.map((e) => ({ id: e.id, link: "none", bar }))] }, key);
    const idx = x.els.map((_, k) => d.items.length + k);
    x.link = y.ok && (y.usesAll ? y.usesAll(idx) : idx.every((i) => y.uses(i))) ? "none" : "direct";
  }
  return keep;
}
function openReqDetail(key) {
  const d = draft(), ev = evaluate(d), dlg = $("#detail");
  const isTc = key.startsWith("tc"), r = reqRowOf(ev, key); if (!r) return;
  const stat = isTc ? (r.manual && !r.forced ? ["warn", "À juger"] : r.ok ? ["ok", "Exigence remplie · +1"] : ["ko", "Exigence non remplie · 0"])
    : r.kept ? ["ok", `Valorisation retenue · +${r.pts}`] : r.ok ? ["warn", `Possible mais pas retenue · ${r.pts} pts`] : r.manual && !r.forced ? ["warn", `À juger · ${r.pts} pts`] : ["ko", `Non validée · ${r.pts} pts`];
  if (dlg._req !== key) state.rqq = "";
  const manual = r.manual && !r.forced;
  const body = manual ? `<p class="muted">L'appli ne peut pas vérifier cette exigence seule. Touche le rond à gauche de la ligne dans le barème pour la cocher si elle est réalisée.</p>`
    : `<input class="search rq-search" id="rqq" type="search" placeholder="Cherche parmi ces mouvements : rondade flip…" value="${esc(state.rqq || "")}" aria-label="Chercher parmi les mouvements proposés" autocomplete="off">
    <div id="rqRes"><p class="muted rq-wait">Je cherche des enchaînements…</p></div>`;
  dlg.innerHTML = `<form method="dialog" class="dlg">
    <header><span class="muted">${isTc ? "Tronc commun" : "Valorisation" + (r.s ? " principale (*)" : "")}</span><button class="mini icon" value="close" aria-label="Fermer">×</button></header>
    <h3>${esc(r.t)}</h3>
    <div class="dl-status ${stat[0]}">${stat[1]}</div>
    ${body}
  </form>`;
  dlg._req = key; dlg._sg = null;
  if (!dlg.open) dlg.showModal();
  // le calcul des séries prend un peu de temps : la fenêtre s'affiche d'abord
  if (!manual) setTimeout(() => { if (dlg._req !== key || !dlg.open) return; dlg._sg = suggestFor(draft(), key); renderReqResults(); }, 30);
}
// résultats de la fenêtre d'une exigence, filtrés par la recherche mot par mot
function renderReqResults() {
  const dlg = $("#detail"), box = $("#rqRes"), sg = dlg._sg, key = dlg._req; if (!box || !sg) return;
  const d = draft(), r = sg.r, q = state.rqq || "";
  if (sg.info || (!sg.list.length && !sg.series.length)) {
    $("#rqq")?.remove();
    box.innerHTML = `<p class="muted">${esc(sg.info || (r.ok ? "C'est déjà rempli." : "Pas de proposition simple : il faut plusieurs mouvements ou un changement de barre (voir le barème)."))}</p>`;
    return;
  }
  let list = sg.list, series = sg.series;
  if (qWords(q).length) {
    const pool = [...new Map([...list.map((x) => x.e), ...series.flatMap((x) => x.els)].map((e) => [e.id, e])).values()];
    const groups = searchGroups(q, pool), hit = new Map(); // id → { groupes trouvés, score }
    groups.forEach((g, gi) => g.hits.forEach(([e, sc]) => { const h = hit.get(e.id) || { g: new Set(), s: 0 }; h.g.add(gi); h.s = Math.max(h.s, sc); hit.set(e.id, h); }));
    list = list.filter((x) => hit.has(x.e.id)).sort((a, b) => hit.get(b.e.id).s - hit.get(a.e.id).s);
    // une série vaut plus si ses mouvements répondent à plusieurs mots (« rondade flip salto » → rondade – flic-flac – salto)
    const cover = (x) => new Set(x.els.flatMap((e) => [...(hit.get(e.id)?.g || [])])).size + x.els.filter((e) => hit.has(e.id)).length / 10;
    series = series.filter((x) => x.els.some((e) => hit.has(e.id))).map((x, k) => [x, cover(x), k]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(([x]) => x);
  }
  series = pickSeries(series, d, key);
  const order = (e) => (e.palier === "NOMADE" ? 9 : PAL_NUM[e.palier]);
  const groups = new Map();
  for (const x of qWords(q).length ? list : [...list].sort((a, b) => order(a.e) - order(b.e))) { if (!groups.has(x.e.arche)) groups.set(x.e.arche, []); groups.get(x.e.arche).push(x); }
  const card = ({ e, link }) => { const st = status(e); return `<li class="sg-row"><button type="button" class="sg-el" data-detail="${e.id}" data-sglink="${link}" title="Voir la fiche">
      ${e.img ? `<img src="img/${e.id}.webp" alt="" loading="lazy">` : ""}${palBadge(e, st)}
      <span><b>${esc(e.name)}</b>${link === "direct" ? `<small>lié à l'élément précédent</small>` : ""}</span></button>
      <button type="button" class="sg-add" data-sadd="${e.id}:${link}" aria-label="Ajouter ${esc(e.name)} à l'enchaînement">+</button></li>`; };
  const chip = (e) => `<button type="button" class="sg-el" data-detail="${e.id}" title="Voir la fiche">${e.img ? `<img src="img/${e.id}.webp" alt="" loading="lazy">` : ""}<span>${palBadge(e, status(e))} <b>${esc(short(e))}</b></span></button>`;
  const seriesCard = (x) => `<li class="sg-series">
      <div class="chain">${x.els.map(chip).join(`<span class="sg-arrow" aria-hidden="true">${x.link === "direct" ? "↔" : "+"}</span>`)}</div>
      <div class="sg-meta">${x.gain > 0 ? `<span class="gain">+${fmt(x.gain)} pt${x.gain > 1 ? "s" : ""}</span>` : ""}${x.arches.map((z) => `<span class="arc ${z.neu ? "neu" : ""}" title="${z.neu ? "arche que tu n'as pas encore" : ""}">${esc(z.a)}${z.neu ? " ★" : ""}</span>`).join("")}</div>
      <button type="button" class="sg-add" data-padd="${x.els.map((e) => e.id).join(",")}:${x.link}" aria-label="Ajouter ${esc(x.els.map(short).join(" puis "))}">+</button></li>`;
  const lk = series.some((x) => x.link === "direct");
  box.innerHTML = (!list.length && !series.length ? `<p class="muted">Aucun mouvement proposé ne correspond à « ${esc(q)} ».</p>` : "")
    + (series.length ? `<h4 class="sg-pairs-h">Enchaînements tout faits</h4>
      <p class="muted">Touche + pour ajouter toute la série${lk ? ", déjà liée" : ""}. ★ = arche que tu n'as pas encore.</p><ul class="sg-list">${series.map(seriesCard).join("")}</ul>` : "")
    + (list.length ? `<h4 class="sg-pairs-h">${series.length ? "Ou un seul mouvement" : sg.arches ? "Mouvements des arches que tu n'as pas encore" : r.ok ? "C'est rempli. Ces mouvements marcheraient aussi" : "Un de ces mouvements suffit"}</h4><p class="muted">Touche + pour l'ajouter.</p>`
      + [...groups].map(([a, xs]) => `<h4>${esc(a)}</h4><ul class="sg-list">${xs.map(card).join("")}</ul>`).join("") : "");
}

// version courte pour le barème : « 2/4 : … » → « 2/4 », « Validé par : X » → « X »
const brief = (w) => !w ? "" : /^\d+\/\d+/.test(w) ? w.split(" : ")[0] : w.replace(/^Validé par : /, "").replace(/^Aucun mouvement ne remplit cette exigence$/, "");
function renderNote() {
  const d = draft(), ev = evaluate(d), H = ev.H;
  const names = (w) => (w || []).map((i) => H.items[i] && short(H.items[i])).filter(Boolean).join(" + ");
  const lvlKey = state.level[0];
  let html = `<header><h2 id="h-note">Note de départ</h2></header><div class="stack">
  <div class="total pin">
    <div><span title="Tronc commun">T. commun</span><b>${ev.tcPts}<small class="muted">/${ev.tc.length}</small></b></div>
    <div><span>Valorisations</span><b>${ev.vPts}<small class="muted">/${ev.vMax}</small></b></div>
    <div class="final"><span>Note de départ</span><b>${fmt(ev.nd)}<small>/${ev.ndMax}</small></b></div>
  </div>
  ${isGAM() ? `<p class="gam-note">${GAM_STATUS[state.app] ? esc(GAM_STATUS[state.app]) + "<br>" : ""}${esc(GAM_NOTE)}</p>` : ""}
  <div class="card req-group"><h3>Tronc commun</h3>
    ${ev.tc.map((r, k) => reqRow("tc", k, r, { why: brief(r.why) || (r.forced ? "réglé à la main" : ""), pts: r.ok ? "+1" : "0",
      hl: [...new Set([...(r.c?.items || []), ...(r.c?.groups || []).flatMap(([, l]) => l)].map((it) => it.i))] })).join("")}
  </div>
  <div class="card req-group"><h3>Valorisations <span class="pts muted">${ev.vals.length > 4 ? "les 4 meilleures comptent" : ""}</span></h3>
    ${ev.vals.map((v, k) => {
      let why = "";
      if (v.kept && v.use?.length) why = names(v.use);
      else if (v.kept) why = v.forced ? "validée à la main" : "";
      else if (v.ok) why = "pas comptée : mouvements déjà utilisés" + (ev.vals.length > 4 ? " ou pas dans les 4 meilleures" : "");
      else if (v.manual && !v.forced) why = "à cocher si elle est faite";
      return reqRow("v", k, { ...v, ok: v.kept }, { why, pts: v.kept ? "+" + v.pts : v.pts, kept: v.kept, hl: v.kept ? v.use : v.wit[0] });
    }).join("")}
  </div>
  <details class="card info"><summary>Les règles ${esc(APPS.find((a) => a.id === state.app).label)} ${state.level}</summary><dl>
    <dt>Valorisations</dt><dd>(*) = 3 pts, sinon 2. Pas d'élément nomade ; chaque valorisation utilise des éléments différents des autres${elApp() === "sol" ? " (sauf « 2 acros de sens différents »)" : ""}. Validée même avec une chute.</dd>
    <dt>Paliers autorisés</dt><dd>${palTable()[state.level].aut.join(", ")}</dd>
    <dt>Valorisables</dt><dd>${palTable()[state.level].val.join(", ")}</dd>
    ${state.app === "poutre" ? `<dt>Durée</dt><dd>${DUREE.poutre[lvlKey]}</dd>` : ""}
    ${elApp() === "sol" ? `<dt>Durée</dt><dd>${DUREE.sol[state.level] || DUREE.sol[lvlKey]}</dd><dt>Musique</dt><dd>sans chant, l'exercice se termine avec la musique</dd>` : ""}
    ${state.app === "barres" && lvlKey !== "C" ? `<dt>Parties</dt><dd>${DUREE.barres[lvlKey]}</dd>` : ""}
    <dt>LA / LAE</dt><dd>éléments acrobatiques liés directement, sans pas ni sursaut ; LAE = tous avec envol, salti appel 2 pieds</dd>
    ${state.app !== "barres" ? `<dt>LG / LM</dt><dd>LG : 2 éléments gymniques différents (sauts, pivots) ; LM (poutre) : 1 gymnique + 1 acro. Tous dans les paliers valorisables.</dd>` : ""}
    <dt>À savoir</dt><dd>Calcul d'après le programme technique UFOLEP de sept. 2026 (outil non officiel). Le bonus n'est pas compté. Le jury reste seul juge.</dd>
  </dl></details>
  </div>`;
  $("#pane-note").innerHTML = html;
  $("#scorePill").innerHTML = `${fmt(ev.nd)} <small>/ ${ev.ndMax}</small>`;
}

function renderSaut() {
  const d = draft(), ev = evaluateSaut(d);
  const els = ELS.filter((e) => e.app === "saut");
  const opts = (sel) => `<option value="">— choisir un saut —</option>` + [...new Set(els.map((e) => e.arche))].map((a) =>
    `<optgroup label="${esc(a)}">${els.filter((e) => e.arche === a).map((e) => { const st = status(e); return `<option value="${e.id}" ${sel === e.id ? "selected" : ""} ${st.aut ? "" : "disabled"}>${e.palier === "NOMADE" ? "Nomade" : e.palier} · ${esc(e.name)} (${SAUT_VALEUR[e.palier]})${st.val ? " ★" : ""}</option>`; }).join("")}</optgroup>`).join("");
  let html = `<header><h2 id="h-rout">Mes 2 sauts</h2><span class="muted">${state.level}</span></header><div class="stack">`;
  d.jumps.forEach((j, k) => {
    const n = ev.notes[k];
    html += `<div class="card jump"><label for="j${k}">Saut ${k + 1}</label><select id="j${k}" data-jump="${k}">${opts(j.id)}</select>
      <div class="muted">${n ? `Valeur <b style="font:700 22px var(--f-display);color:var(--ink)">${n.v}</b>${n.st.val ? " · valorisable ★" : ""}` : "Choisis un saut autorisé (★ = valorisable)"}</div></div>`;
  });
  html += `<div class="card"><h3 style="font-size:18px;text-transform:uppercase;margin-bottom:6px">Valeur des sauts</h3><div class="table-wrap"><table class="val-table"><tr><th>PR1</th><th>PR2</th><th>PR3</th><th>P1–P2</th><th>P3–P5</th><th>P6–P7</th><th>Nomades</th></tr><tr><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td><td>12</td></tr></table></div>
  <p class="note-foot">Pile de tapis (PR1 à PR3) : filière jeunes uniquement. À partir de 13 ans, trampo-tremp autorisé avec −1 pt ; mini-trampoline autorisé en 2026-2027 avec −1 pt.</p></div></div>`;
  $("#pane-routine").innerHTML = html;
  $("#tabCount").textContent = d.jumps.filter((j) => j.id).length || "";

  const valos = SAUT_VALOS[state.level] || [];
  let note = `<header><h2 id="h-note">Note de départ</h2></header><div class="stack">
  <div class="total pin"><div><span>Meilleur saut</span><b>${fmt(ev.best)}</b></div><div><span>Valorisations</span><b>+${fmt(ev.vPts)}</b></div><div class="final"><span>Note de départ</span><b>${fmt(ev.final)}</b></div></div>
  <div class="card req-group"><h3>Valorisations ${state.level}</h3>
  ${valos.map((t, k) => { const s = d.svalos[k] || {}; return `<div class="req ${s.on ? "ok" : "man"}"><button class="st" type="button" data-sval="${k}" aria-label="${esc(t)}">${s.on ? "✓" : "?"}</button><div>${esc(t)}</div>
    <input type="number" min="0" step="0.5" value="${s.pts ?? ""}" placeholder="pts" data-svpts="${k}" aria-label="Points" style="width:64px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--bg)"></div>`; }).join("")}
  <p class="note-foot">La brochure ne chiffre pas les valorisations au saut : saisis les points annoncés par ton comité. Le meilleur des deux sauts compte, puis on ajoute la valorisation.</p></div>
  <p class="note-foot">Note de départ calculée d'après le Programme Technique GAF UFOLEP du 29/09/2026 (outil non officiel).</p></div>`;
  $("#pane-note").innerHTML = note;
  $("#scorePill").innerHTML = `${fmt(ev.final)} <small>saut</small>`;
}

// ---------- stockage local (sans serveur) : chaque navigateur garde ses enchaînements ----------
const STORE = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } },
  set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; } },
};
const K_ROUT = "palier-routines-v1", K_MEDIA = "palier-media-v1";
const Routines = {
  all() { return Object.values(STORE.get(K_ROUT)).sort((a, b) => (b.updated || "").localeCompare(a.updated || "")); },
  put(r) { const db = STORE.get(K_ROUT); db[r.id] = r; if (!STORE.set(K_ROUT, db)) throw new Error("stockage du navigateur indisponible (navigation privée ?)"); return r; },
  del(id) { const db = STORE.get(K_ROUT); delete db[id]; STORE.set(K_ROUT, db); },
};
const Media = {
  all() { return STORE.get(K_MEDIA); },
  put(id, url) { const db = STORE.get(K_MEDIA); db[id] = { url }; STORE.set(K_MEDIA, db); return db[id]; },
  del(id) { const db = STORE.get(K_MEDIA); delete db[id]; STORE.set(K_MEDIA, db); },
};

// ---------- codes de partage : enchaînement compressé, envoyable par message ----------
const CODE_PREFIX = "PAL1-";
const b64u = {
  enc(bytes) { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); },
  dec(str) { const s = atob(str.replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, (c) => c.charCodeAt(0)); },
};
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
async function encodeRoutine(r) {
  const compact = {
    a: r.app, l: r.level, n: r.name || "", g: r.gym || "",
    i: (r.items || []).map((it) => [it.id, it.link === "direct" ? 1 : it.link === "indirect" ? 2 : 0, it.bar === "BS" ? 1 : 0, it.mousse ? 1 : 0]),
    m: r.manual && Object.keys(r.manual).length ? r.manual : undefined,
    j: elApp(r.app) === "saut" ? r.jumps : undefined, s: elApp(r.app) === "saut" ? r.svalos : undefined,
  };
  const raw = new TextEncoder().encode(JSON.stringify(compact));
  const bytes = window.CompressionStream ? await pipe(raw, new CompressionStream("deflate-raw")) : raw;
  return CODE_PREFIX + (window.CompressionStream ? "z" : "j") + b64u.enc(bytes);
}
async function decodeRoutine(code) {
  const m = String(code).trim().match(/PAL1-([zj])([A-Za-z0-9_-]+)/);
  if (!m) throw new Error("ce n'est pas un code Palier (il commence par PAL1-)");
  let bytes = b64u.dec(m[2]);
  let c;
  try {
    if (m[1] === "z") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    c = JSON.parse(new TextDecoder().decode(bytes));
  } catch { throw new Error("code incomplet ou abîmé : vérifie qu'il a été copié en entier"); }
  if (!APPS.some((a) => a.id === c.a) || !LEVELS.includes(c.l)) throw new Error("code incomplet ou abîmé");
  const items = (c.i || []).filter(([id]) => BY_ID[id]).map(([id, lk, bar, mo]) => ({ id, link: lk === 1 ? "direct" : lk === 2 ? "indirect" : "none", bar: bar ? "BS" : "BI", mousse: !!mo }));
  return { id: uid(), app: c.a, level: c.l, name: c.n, gym: c.g, items, manual: c.m || {}, ded: c.d || { p: 0, m: 0, g: 0, c: 0 },
    jumps: c.j || [{ id: "", ded: 0 }, { id: "", ded: 0 }], svalos: c.s || {}, lost: (c.i || []).length - items.length };
}
const shareLink = (code) => `${location.origin}${location.pathname}#code=${code}`;
async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } }

async function openShare(r) {
  const code = await encodeRoutine(r), link = shareLink(code), dlg = $("#detail");
  dlg.innerHTML = `<form method="dialog" class="dlg">
    <header><h3>Partager « ${esc(r.name || "Sans nom")} »</h3><button class="mini icon" value="close" aria-label="Fermer">×</button></header>
    <p class="muted">Envoie le lien ou le code par message. La personne qui l'ouvre récupère une copie de l'enchaînement dans son navigateur ; ses modifications ne changent pas le tien.</p>
    <label class="flabel" for="shLink">Lien</label>
    <div class="vrow"><input id="shLink" readonly value="${esc(link)}"><button class="btn primary" type="button" data-copy="shLink">Copier le lien</button></div>
    <label class="flabel" for="shCode">Code (${code.length} caractères)</label>
    <div class="vrow"><textarea id="shCode" readonly rows="3">${esc(code)}</textarea><button class="btn" type="button" data-copy="shCode">Copier le code</button></div>
    ${navigator.share ? `<button class="btn wide" type="button" data-act="nshare">Envoyer avec une appli…</button>` : ""}
  </form>`;
  dlg._share = { title: `Enchaînement ${r.name || ""}`, text: `Mon enchaînement ${APPS.find((a) => a.id === r.app).label} ${r.level} sur Mes Enchaînements :`, url: link };
  if (!dlg.open) dlg.showModal();
}
function openImport(prefill = "") {
  const dlg = $("#detail");
  dlg.innerHTML = `<form method="dialog" class="dlg">
    <header><h3>Importer un enchaînement</h3><button class="mini icon" value="close" aria-label="Fermer">×</button></header>
    <p class="muted">Colle le code reçu (il commence par PAL1-) ou le lien complet.</p>
    <textarea id="impCode" rows="4" placeholder="PAL1-…">${esc(prefill)}</textarea>
    <div id="impPreview"></div>
    <button class="btn primary wide" type="button" data-act="doimport">Importer</button>
  </form>`;
  if (!dlg.open) dlg.showModal();
  if (prefill) previewImport();
}
async function previewImport() {
  const box = $("#impPreview"); if (!box) return null;
  try {
    const r = await decodeRoutine($("#impCode").value);
    const s = summary(r);
    box.innerHTML = `<div class="imp-ok"><span class="lv" style="background:var(--${r.level})">${r.level}</span> <b>${esc(APPS.find((a) => a.id === r.app).label)} · ${esc(r.name || "Sans nom")}</b>${r.gym ? ` · ${esc(r.gym)}` : ""}<br><span class="muted">${elApp(r.app) === "saut" ? "" : `${r.items.length} mouvements · `}note de départ ${s.main}${r.lost ? ` · ${r.lost} mouvement(s) inconnu(s) ignoré(s)` : ""}</span></div>`;
    return r;
  } catch (err) { box.innerHTML = $("#impCode").value.trim() ? `<p class="imp-err">${esc(err.message)}</p>` : ""; return null; }
}


// ---------- enregistrements (dans le navigateur) ----------
let SAVED = null; // liste des enchaînements du serveur (cache)
const payload = (d, app = state.app, level = state.level) => {
  const { _last, _status, ...rest } = d;
  return { ...rest, app: d.app || app, level: d.level || level };
};
async function loadSaved() {
  SAVED = Routines.all();
  return SAVED;
}
// Enregistre sur le serveur ; une fois fait, chaque modification est réenregistrée toute seule.
async function saveDraft(d, { quiet } = {}) {
  const body = { ...payload(d), updated: new Date().toISOString() };
  d._status = "saving"; paintSaveState(d);
  try {
    Routines.put(body);
    d.saved = body.updated; d._last = JSON.stringify(payload(d)); d._status = "ok";
    if (!quiet) toast("Enregistré");
  } catch (err) { d._status = "err"; if (!quiet) toast("Échec de l'enregistrement : " + err.message); }
  paintSaveState(d); persist();
}
function autosave() {
  const d = draft();
  if (!d.saved) { paintSaveState(d); return; }
  if (JSON.stringify(payload(d)) === d._last) return;
  d._status = "dirty"; paintSaveState(d);
  clearTimeout(autosave.t);
  autosave.t = setTimeout(() => saveDraft(draft(), { quiet: true }), 900);
}
function paintSaveState(d) {
  const el = $("#saveState"); if (!el) return;
  const t = d.saved ? new Date(d.saved).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
  const [cls, txt] = !d.saved ? ["draft", "Brouillon · enregistre-le pour le retrouver dans « Mes enchaînements »"]
    : d._status === "saving" || d._status === "dirty" ? ["busy", "enregistrement…"]
    : d._status === "err" ? ["err", "Impossible d'enregistrer : le navigateur bloque le stockage (navigation privée ?)"]
    : ["ok", "enregistré"];
  el.className = "save-state " + cls; el.textContent = txt;
}
// Avant de remplacer un brouillon non enregistré qui contient des mouvements, on le met de côté sur le serveur.
async function stashIfNeeded(d, app, level) {
  if (d.saved || !(d.items?.length || d.jumps?.some((j) => j.id))) return false;
  const name = d.name || `Brouillon ${APPS.find((a) => a.id === app).label} ${level} du ${new Date().toLocaleDateString("fr-FR")}`;
  try { Routines.put({ ...payload(d, app, level), name, app, level, updated: new Date().toISOString() }); return true; } catch { return false; }
}

// ---------- créer / ouvrir un enchaînement ----------
function newRoutine(app, level, name, gym) {
  const label = appName(app);
  const r = { id: uid(), app, level, name: name || `${label} ${level}`, gym: gym || "", items: [], manual: {}, ded: { p: 0, m: 0, g: 0, c: 0 },
    jumps: [{ id: "", ded: 0 }, { id: "", ded: 0 }], svalos: {}, updated: new Date().toISOString() };
  Routines.put(r); SAVED = null;
  return r;
}
function openRoutine(r) {
  state.level = r.level; state.app = r.app;
  const d = { manual: {}, ded: { p: 0, m: 0, g: 0, c: 0 }, jumps: [{ id: "", ded: 0 }, { id: "", ded: 0 }], svalos: {}, items: [], ...structuredClone(r), saved: r.updated || new Date().toISOString() };
  d._last = JSON.stringify(payload(d));
  state.drafts[draftKey()] = d;
  state.page = "edit"; state.view = isMobile() ? "routine" : "catalogue"; history.replaceState(null, "", location.pathname + "#edit");
  render(); window.scrollTo({ top: 0 });
}
function openCreate(keep) {
  const dlg = $("#detail");
  if (!keep) { dlg._disc = null; dlg._app = null; dlg._lvl = null; dlg._name = ""; dlg._gym = ""; }
  const app = APPS.find((a) => a.id === dlg._app);
  const disc = dlg._disc;
  dlg.innerHTML = `<form method="dialog" class="dlg create">
    <header><h3>Créer un enchaînement</h3><button class="mini icon" value="close" aria-label="Fermer">×</button></header>
    <h4>1 · Discipline</h4>
    <div class="dtiles">${["GAF", "GAM"].map((x) => `<button type="button" class="ctile" data-cdisc="${x}" style="--c:var(--ink)" aria-pressed="${disc === x}">${x}<small>${x === "GAF" ? "gymnastique féminine" : "gymnastique masculine"}</small></button>`).join("")}</div>
    ${disc ? `<h4>2 · Agrès</h4>
    <div class="ctiles ${disc === "GAM" ? "six" : ""}">${APPS.filter((a) => a.disc === disc).map((a) => `<button type="button" class="ctile" data-capp="${a.id}" style="--c:${a.color}" aria-pressed="${dlg._app === a.id}">${a.label}</button>`).join("")}</div>
    <h4>3 · Niveau</h4>
    <div class="ltiles">${(disc === "GAM" ? GAM_LEVELS : LEVELS).map((l) => `<button type="button" class="ltile" data-clvl="${l}" style="--c:var(--${l})" aria-pressed="${dlg._lvl === l}">${l}</button>`).join("")}</div>` : ""}
    <h4>${disc ? 4 : 2} · Nom et gymnaste <span class="muted">(facultatif)</span></h4>
    <div class="vrow"><input id="cName" type="text" placeholder="${app ? `${app.label} ${dlg._lvl || ""}`.trim() : "Nom"}" value="${esc(dlg._name || "")}" aria-label="Nom">
      <input id="cGym" type="text" placeholder="Gymnaste" value="${esc(dlg._gym || "")}" list="gymList2" aria-label="Gymnaste"></div>
    <datalist id="gymList2">${[...new Set(Routines.all().map((r) => r.gym).filter(Boolean))].map((g) => `<option value="${esc(g)}">`).join("")}</datalist>
    <button class="btn primary wide" type="button" data-act="docreate" ${dlg._app && dlg._lvl ? "" : "disabled"}>${dlg._app && dlg._lvl ? `Créer · ${app.disc} ${app.label} ${dlg._lvl}` : disc ? "Choisis l'agrès et le niveau" : "Choisis la discipline"}</button>
  </form>`;
  if (!dlg.open) dlg.showModal();
}
// anciens brouillons (avant l'enregistrement automatique) : on les range dans « Mes enchaînements »
function migrateDrafts() {
  for (const [k, dr] of Object.entries(state.drafts)) {
    const [app, level] = k.split(":");
    dr.app ||= app; dr.level ||= level;
    if (dr.saved) continue;
    if (!(dr.items?.length || dr.jumps?.some((j) => j.id))) { delete state.drafts[k]; continue; }
    dr.name ||= `${APPS.find((a) => a.id === app)?.label} ${level}`;
    dr.updated = dr.saved = new Date().toISOString();
    try { Routines.put(payload(dr, app, level)); dr._last = JSON.stringify(payload(dr)); } catch { /* stockage indisponible */ }
  }
}

// ---------- page « Mes enchaînements » ----------
function summary(r) {
  if (elApp(r.app) === "saut") { const ev = evaluateSaut(r, r.level); return { main: fmt(ev.final), sub: "meilleur saut + valorisations", tc: "" }; }
  const ev = evaluate(r, r.level, r.app);
  return { main: `${fmt(ev.nd)}<small>/${ev.ndMax}</small>`, nd: `${fmt(ev.nd)}/${ev.ndMax}`, tc: `TC ${ev.tcPts}/${ev.tc.length}`, v: `valorisations ${ev.vPts}/${ev.vMax}`, warn: ev.warns.length };
}
async function renderRecap() {
  const box = $("#page-recap");
  if (SAVED === null) { box.innerHTML = `<p class="empty">Chargement…</p>`; await loadSaved(); }
  if (SAVED === null) { box.innerHTML = `<p class="empty">Le navigateur bloque le stockage local : les enchaînements ne peuvent pas être gardés ici.</p>`; return; }
  const rf = (state.rf ||= { q: "", app: "", level: "" });
  // filtres : seulement ce qu'on possède (un filtre devenu vide est remis à « tous »)
  const discs = ["GAF", "GAM"].filter((x) => SAVED.some((r) => APP(r.app).disc === x));
  if (rf.disc && !discs.includes(rf.disc)) rf.disc = "";
  const inDisc = SAVED.filter((r) => !rf.disc || APP(r.app).disc === rf.disc);
  const ownApps = APPS.filter((a) => inDisc.some((r) => r.app === a.id));
  if (rf.app && !ownApps.some((a) => a.id === rf.app)) rf.app = "";
  const inApp = inDisc.filter((r) => !rf.app || r.app === rf.app);
  const ownLvls = LEVELS.filter((l) => inApp.some((r) => r.level === l));
  if (rf.level && !ownLvls.includes(rf.level)) rf.level = "";
  const q = rf.q.trim().toLowerCase();
  const list = SAVED.filter((r) => BY_ID && (!rf.disc || APP(r.app).disc === rf.disc) && (!rf.app || r.app === rf.app) && (!rf.level || r.level === rf.level)
    && (!q || `${r.name} ${r.gym || ""}`.toLowerCase().includes(q)));
  const groups = {};
  for (const r of list) (groups[r.gym?.trim() || ""] ||= []).push(r);
  const names = Object.keys(groups).sort((a, b) => (!a) - (!b) || a.localeCompare(b, "fr"));
  const chip = (attr, val, on, label) => `<button type="button" class="fchip" ${attr}="${esc(val)}" aria-pressed="${on}">${label}</button>`;
  const date = (iso) => iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";

  let html = `<div class="recap-head"><h2>Mes enchaînements</h2>
    <div class="recap-actions"><button class="btn primary big" type="button" data-act="create">+ Créer un enchaînement</button>
    <button class="btn" type="button" data-act="import">Importer un code</button>
</div></div>
  <p class="muted note-store">Tes enchaînements sont gardés dans ce navigateur, sur cet appareil. Pour les retrouver ailleurs, partage-les avec un code.</p>
  <div class="tools">
    <input class="search" id="rq" type="search" placeholder="Chercher un nom ou une gymnaste" value="${esc(rf.q)}" aria-label="Chercher un enchaînement">
  </div>
  <div class="filters-inline">
    ${discs.length > 1 ? `<div class="frow"><span class="flabel">Discipline</span>${chip("data-rdisc", "", !rf.disc, "Toutes")}${discs.map((x) => chip("data-rdisc", x, rf.disc === x, x)).join("")}</div>` : ""}
    ${ownApps.length > 1 ? `<div class="frow"><span class="flabel">Agrès</span>${chip("data-rapp", "", !rf.app, "Tous")}${ownApps.map((a) => chip("data-rapp", a.id, rf.app === a.id, discs.length > 1 && !rf.disc ? appName(a.id) : a.label)).join("")}</div>` : ""}
    ${ownLvls.length > 1 ? `<div class="frow"><span class="flabel">Niveau</span>${chip("data-rlvl", "", !rf.level, "Tous")}${ownLvls.map((l) => chip("data-rlvl", l, rf.level === l, l)).join("")}</div>` : ""}
  </div>`;
  if (!SAVED.length) html += `<p class="empty">Aucun enchaînement pour l'instant.<br>Touche <b>Créer un enchaînement</b>, choisis l'agrès et le niveau : il sera enregistré ici automatiquement, au fil de tes modifications.</p>`;
  else if (!list.length) html += `<p class="empty">Aucun enchaînement ne correspond à ces filtres.</p>`;
  for (const g of names) {
    html += `<section class="gym-group"><h3>${g ? esc(g) : "Sans gymnaste"}</h3><ul class="rcards">`;
    for (const r of groups[g]) {
      const s = summary(r), app = APPS.find((a) => a.id === r.app);
      const thumbs = (elApp(r.app) === "saut" ? r.jumps.map((j) => j.id) : r.items.map((i) => i.id)).filter((id) => BY_ID[id]?.img).slice(0, 8);
      const n = elApp(r.app) === "saut" ? r.jumps.filter((j) => j.id).length : r.items.length;
      html += `<li class="rcard" style="--c:${app.color}">
        <div class="rtop"><span class="lv" style="background:var(--${r.level})">${r.level}</span><span class="app">${app.disc === "GAM" ? "GAM · " : ""}${app.label}</span><span class="muted when">modifié le ${date(r.updated)}</span></div>
        <button type="button" class="rname" data-ropen="${r.id}">${esc(r.name || "Sans nom")}</button>
        <div class="rscore"><b>${s.main}</b><span>${s.nd ? `note de départ · ${s.tc} · ${s.v}` : s.sub}</span></div>
        <div class="rthumbs">${thumbs.map((id) => `<img src="img/${id}.webp" alt="" loading="lazy">`).join("")}${n > thumbs.length ? `<span class="more">${n} mvt${n > 1 ? "s" : ""}</span>` : ""}</div>
        ${s.warn ? `<div class="rwarn">${s.warn} élément${s.warn > 1 ? "s" : ""} hors niveau</div>` : ""}
        <div class="ractions"><button class="btn primary" type="button" data-ropen="${r.id}">Ouvrir</button><button class="btn" type="button" data-rshare="${r.id}">Partager</button><button class="btn" type="button" data-rdup="${r.id}">Dupliquer</button><button class="btn danger" type="button" data-rdel="${r.id}">Supprimer</button></div>
      </li>`;
    }
    html += `</ul></section>`;
  }
  box.innerHTML = html;
}

// ---------- interactions ----------
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button, [data-detail]"); if (!b) return;
  const ds = b.dataset, d = draft();
  if (ds.level) { state.level = ds.level; }
  else if (ds.app) { state.app = ds.app; }
  else if (ds.view || ds.go) { state.view = ds.view || ds.go; window.scrollTo({ top: 0 }); }
  else if (ds.filter) state.filter = ds.filter;
  else if (ds.req) { state.detail = null; openReqDetail(ds.req); return; }
  else if (ds.sadd) {
    const [id, link] = ds.sadd.split(":"); const prev = d.items.at(-1);
    d.items.push({ id, link: d.items.length ? link : "none", bar: prev?.bar || "BI" });
    const back = state.fromReq || $("#detail")._req; state.detail = null; state.fromReq = null;
    render(); toast(`Ajouté : ${BY_ID[id].name.slice(0, 40)}`); openReqDetail(back); return;
  }
  else if (ds.padd) {
    const [ids, link] = ds.padd.split(":"), list = ids.split(","), prev = d.items.at(-1);
    list.forEach((id, k) => d.items.push({ id, link: k ? link : "none", bar: prev?.bar || "BI" }));
    const back = $("#detail")._req; state.detail = null; state.fromReq = null;
    render(); toast(`Ajoutés : ${list.map((id) => short(BY_ID[id])).join(link === "direct" ? " ↔ " : " + ")}`); openReqDetail(back); return;
  }
  else if (ds.detail) { e.preventDefault(); state.fromReq = b.closest("#detail") ? $("#detail")._req || null : null; state.sgLink = ds.sglink || null; state.detail = ds.detail; state.detailPos = ds.pos != null ? Number(ds.pos) : null; renderDetail(); return; }
  else if ("archePick" in ds) { F().arche = ds.archePick; F().side = ""; F().kind = ""; }
  else if (ds.fpal) { const a = F().pal; a.includes(ds.fpal) ? a.splice(a.indexOf(ds.fpal), 1) : a.push(ds.fpal); }
  else if (ds.fkind) F().kind = F().kind === ds.fkind ? "" : ds.fkind;
  else if (ds.fside) F().side = F().side === ds.fside ? "" : ds.fside;
  else if (ds.fflag) { const a = F().flags; a.includes(ds.fflag) ? a.splice(a.indexOf(ds.fflag), 1) : a.push(ds.fflag); }
  else if (ds.act === "ftoggle") state.fOpen = !state.fOpen;
  else if (ds.act === "rename") state.renaming = !state.renaming;
  else if (ds.act === "clearf") { Object.assign(F(), { pal: [], kind: "", side: "", flags: [] }); state.q = ""; }
  else if (ds.catview) state.catView = ds.catview;
  else if (ds.zoom) state.zoom = Math.min(2.5, Math.max(1, (state.zoom || 1) + Number(ds.zoom) * 0.5));
  else if (ds.act === "savevid" || ds.act === "delvid") {
    const id = state.detail, url = $("#vidUrl").value.trim();
    try {
      if (ds.act === "delvid") { Media.del(id); delete state.media[id]; toast("Vidéo retirée"); }
      else { if (!/^https:\/\//.test(url)) { toast("Colle un lien qui commence par https://"); return; } state.media[id] = Media.put(id, url); toast("Vidéo enregistrée"); }
    } catch (err) { toast("Échec : " + err.message); return; }
    renderDetail(); renderCatalogue(); return;
  }
  else if (ds.add) {
    const prev = d.items.at(-1);
    d.items.push({ id: ds.add, link: "none", bar: prev?.bar || "BI" });
    if ($("#detail").open) $("#detail").close();
    toast(`Ajouté : ${BY_ID[ds.add].name.slice(0, 40)}`);
    // téléphone : retour à l'enchaînement, sauf pendant une recherche de plusieurs mouvements (on les ajoute à la suite)
    if (isMobile() && qWords(state.q).length < 2) { state.view = "routine"; render(); requestAnimationFrame(() => $("#rtList .rt-item:last-child")?.scrollIntoView({ block: "center" })); return; }
  } else if (ds.link) {
    const it = d.items[ds.link], cur = BY_ID[it.id], pv = BY_ID[d.items[ds.link - 1].id];
    const cycle = elApp() === "sol" && cur.kind === "saut" && pv.kind === "saut" ? ["none", "direct", "indirect"] : ["none", "direct"];
    it.link = cycle[(cycle.indexOf(it.link || "none") + 1) % cycle.length];
  } else if (ds.bar) { const it = d.items[ds.bar]; it.bar = it.bar === "BS" ? "BI" : "BS"; }
  else if (ds.move) {
    const [k, dir] = ds.move.split(":").map(Number); const j = k + dir;
    [d.items[k], d.items[j]] = [d.items[j], d.items[k]];
    d.items[0].link = "none";
  } else if (ds.delpos) {
    const k = Number(ds.delpos); d.items.splice(k, 1); if (d.items[0]) d.items[0].link = "none";
    $("#detail").close(); toast("Retiré de l'enchaînement");
  } else if (ds.del) { d.items.splice(Number(ds.del), 1); if (d.items[0]) d.items[0].link = "none"; }
  else if (ds.man) {
    const cyc = [undefined, "ok", "ko"]; const cur = d.manual[ds.man];
    const nxt = cyc[(cyc.indexOf(cur) + 1) % 3];
    if (nxt) d.manual[ds.man] = nxt; else delete d.manual[ds.man];
  } else if (ds.sval) { const s = (d.svalos[ds.sval] ||= {}); s.on = !s.on; }
  else if (ds.act === "example") {
    const ex = EXAMPLES[state.app]; state.level = ex.level;
    const find = (re, pal) => ELS.find((x) => x.app === elApp() && re.test(x.name) && (!pal || x.palier === pal))?.id;
    const items = ex.items.map(([re, pal, o]) => ({ id: find(re, pal), link: "none", bar: "BI", ...o })).filter((x) => x.id);
    state.drafts[draftKey()] = { ...draft(), name: `Exemple ${ex.label}`, items };
    toast(`Exemple ${ex.label} chargé`);
  } else if (ds.act === "create") { openCreate(); return; }
  else if (ds.capp || ds.clvl || ds.cdisc) {
    const dlg = $("#detail");
    if (ds.cdisc && ds.cdisc !== dlg._disc) { dlg._disc = ds.cdisc; dlg._app = null; dlg._lvl = null; }
    if (ds.capp) dlg._app = ds.capp; if (ds.clvl) dlg._lvl = ds.clvl;
    dlg._name = $("#cName")?.value ?? ""; dlg._gym = $("#cGym")?.value ?? ""; openCreate(true); return;
  } else if (ds.act === "docreate") {
    const dlg = $("#detail"); if (!dlg._app || !dlg._lvl) { toast("Choisis l'agrès et le niveau"); return; }
    const r = newRoutine(dlg._app, dlg._lvl, $("#cName").value.trim(), $("#cGym").value.trim());
    dlg.close(); openRoutine(r); toast(`Créé : ${r.name}`);
  } else if (ds.page) {
    state.page = "home"; history.replaceState(null, "", location.pathname); SAVED = null;
    window.scrollTo({ top: 0 });
  } else if (ds.act === "share" || ds.rshare) {
    const r = ds.rshare ? (SAVED || []).find((x) => x.id === ds.rshare) : payload(d);
    if (!r?.items?.length && r?.app !== "saut") { toast("Ajoute d'abord des mouvements"); return; }
    await openShare(r); return;
  } else if (ds.copy) {
    const el = $("#" + ds.copy); const ok = await copyText(el.value);
    if (!ok) { el.focus(); el.select(); }
    toast(ok ? "Copié : colle-le dans un message" : "Sélectionné : copie-le avec Ctrl+C"); return;
  } else if (ds.act === "nshare") { navigator.share($("#detail")._share).catch(() => {}); return; }
  else if (ds.act === "import") { openImport(); return; }
  else if (ds.act === "doimport") {
    const r = await previewImport(); if (!r) { toast("Code non reconnu"); return; }
    const { lost, ...rr } = r; rr.updated = new Date().toISOString(); rr.name = rr.name || "Enchaînement reçu";
    Routines.put(rr); $("#detail").close(); history.replaceState(null, "", location.pathname);
    SAVED = null; toast(`Importé : ${rr.name}`);
  }
  else if ("rdisc" in ds) { (state.rf ||= {}).disc = ds.rdisc; state.rf.app = ""; }
  else if ("rapp" in ds) (state.rf ||= {}).app = ds.rapp;
  else if ("rlvl" in ds) (state.rf ||= {}).level = ds.rlvl;
  else if (ds.ropen) {
    const r = (SAVED || []).find((x) => x.id === ds.ropen); if (!r) return;
    openRoutine(r); return;
  } else if (ds.rdup) {
    const r = (SAVED || []).find((x) => x.id === ds.rdup); if (!r) return;
    Routines.put({ ...structuredClone(r), id: uid(), saved: undefined, name: `${r.name || "Sans nom"} (copie)`, updated: new Date().toISOString() });
    toast("Copie créée"); SAVED = null;
  } else if (ds.rdel) {
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Confirmer la suppression"; return; }
    Routines.del(ds.rdel);
    for (const [k, dr] of Object.entries(state.drafts)) if (dr.id === ds.rdel) delete state.drafts[k];
    toast("Supprimé"); SAVED = null;
  } else return;
  render();
});
// survol croisé : un mouvement du catalogue allume ses occurrences dans l'enchaînement, et inversement
function hoverLink(id, fromCatalogue) {
  document.querySelectorAll(".hl").forEach((n) => n.classList.remove("hl"));
  if (!id) return;
  const sel = CSS.escape(id);
  document.querySelectorAll(`#rtList [data-eid="${sel}"], #archeCanvas .hs[data-id="${sel}"], #cards .card-el[data-id="${sel}"]`).forEach((n) => n.classList.add("hl"));
  // depuis le catalogue : si l'occurrence est hors de vue dans la colonne enchaînement, on la fait apparaître
  const first = fromCatalogue && document.querySelector(`#rtList [data-eid="${sel}"]`);
  const pane = first && $("#pane-routine");
  if (pane && pane.scrollHeight > pane.clientHeight) {
    const r = first.getBoundingClientRect(), pr = pane.getBoundingClientRect();
    if (r.top < pr.top + 40 || r.bottom > pr.bottom) pane.scrollBy({ top: r.top - pr.top - pr.height / 3, behavior: "smooth" });
  }
}
document.addEventListener("mouseover", (e) => {
  if (document.querySelector(".sortable-drag, .hs-drag")) return; // pas pendant un glisser
  const rq = e.target.closest?.("#pane-note .req");
  if (rq) {
    const key = "req:" + (rq.dataset.hl || "");
    if (key !== hoverLink.cur) {
      hoverLink.cur = key; hoverLink(null);
      const rows = [...document.querySelectorAll("#rtList .rt-item")];
      (rq.dataset.hl || "").split(",").filter(Boolean).forEach((i) => rows[i]?.classList.add("hl"));
    }
    return;
  }
  const n = e.target.closest?.("#archeCanvas .hs, #cards .card-el, #rtList .rt-item");
  const id = n ? n.dataset.id || n.dataset.eid : null;
  if (id !== hoverLink.cur) { hoverLink.cur = id; hoverLink(id, !!n && !n.classList.contains("rt-item")); }
});
$("#detail")?.addEventListener("close", () => { state.detail = null; state.detailPos = null; state.fromReq = null; $("#detail")._req = null; });
document.addEventListener("input", (e) => {
  const t = e.target, d = draft();
  if (t.id === "q") { state.q = t.value; const pos = t.selectionStart; renderCatalogue(); const q = $("#q"); q.focus(); q.setSelectionRange(pos, pos); persist(); }
  else if (t.id === "rtName" || t.id === "rtGym") { d[t.id === "rtName" ? "name" : "gym"] = t.value; persist(); autosave(); if (t.id === "rtName" && $(".ctx-name")) $(".ctx-name").textContent = t.value || "Sans nom"; }
  else if (t.id === "impCode") previewImport();
  else if (t.id === "rqq") { state.rqq = t.value; renderReqResults(); }
  else if (t.id === "rq") { (state.rf ||= {}).q = t.value; const pos = t.selectionStart; renderRecap().then(() => { const q = $("#rq"); q.focus(); q.setSelectionRange(pos, pos); }); persist(); }
});
document.addEventListener("change", async (e) => {
  const t = e.target, d = draft();
  if (t.id === "ctxLevel") { // une gymnaste change de niveau : l'enchaînement suit
    const old = draftKey(); state.level = t.value; d.level = t.value;
    delete state.drafts[old]; state.drafts[draftKey()] = d; render(); toast(`Niveau ${t.value} : note recalculée`); return;
  }

  if (t.dataset.jump) d.jumps[t.dataset.jump].id = t.value;
  else if (t.dataset.svpts) (d.svalos[t.dataset.svpts] ||= {}).pts = t.value;
  else return;
  render();
});

fetch("elements.json").then((r) => r.json()).then((data) => {
  ELS = data; BY_ID = Object.fromEntries(data.map((e) => [e.id, e]));
  state.media = Media.all();
  for (const [k, dr] of Object.entries(state.drafts)) dr.items = (dr.items || []).filter((it) => BY_ID[it.id]);
  migrateDrafts();
  state.page = location.hash === "#edit" && state.drafts[draftKey()]?.saved ? "edit" : "home";
  const hc = location.hash.match(/^#code=(PAL1-[A-Za-z0-9_-]+)/);
  if (hc) { state.page = "home"; setTimeout(() => openImport(hc[1]), 0); }
  loadSaved().then(() => { if (state.page === "edit" && elApp() !== "saut") renderRoutine(); });
  render();
});
window.ResizeObserver && new ResizeObserver(([e]) => document.documentElement.style.setProperty("--top", e.target.offsetHeight + "px")).observe($(".top"));
document.addEventListener("toggle", (e) => { if (e.target.matches?.("details.filters")) { state.fOpen = e.target.open; persist(); } }, true);
window.addEventListener("hashchange", () => {
  const hc = location.hash.match(/^#code=(PAL1-[A-Za-z0-9_-]+)/);
  state.page = location.hash === "#edit" && !hc && state.drafts[draftKey()] ? "edit" : "home"; SAVED = null; render();
  if (hc) openImport(hc[1]);
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
