// Règles du Programme Technique GAF UFOLEP (29/09/2026) — pages 26 à 32 « Décomposition de la note ».
// Chaque exigence : t = libellé brochure, f = test automatique.
// f renvoie : true/false (exigence de tronc commun), une liste de « témoins » (tableaux d'index d'éléments)
// pour une valorisation, ou null quand la brochure demande un jugement humain (à cocher).

const LEVELS = ["A1", "A2", "B1", "B2", "B3", "C1", "C2", "C3"];
const PAL_ORDER = ["PR", "P1", "P2", "P3", "P4", "P5", "P6", "P7"];
const range = (a, b) => PAL_ORDER.slice(PAL_ORDER.indexOf(a), PAL_ORDER.indexOf(b) + 1);

// Paliers autorisés / valorisables — identiques en barres, poutre et sol (p. 26, 28, 30)
const PALIERS = {
  A1: { aut: range("PR", "P3"), val: range("P1", "P2") },
  A2: { aut: range("PR", "P3"), val: range("P1", "P2") },
  B1: { aut: range("P1", "P5"), val: range("P1", "P4") },
  B2: { aut: range("P1", "P5"), val: range("P2", "P4") },
  B3: { aut: range("P1", "P5"), val: range("P3", "P5") },
  C1: { aut: range("P2", "P7"), val: range("P3", "P6") },
  C2: { aut: range("P3", "P7"), val: range("P4", "P7") },
  C3: { aut: range("P3", "P7"), val: range("P4", "P7") },
};
// Saut (p. 32) : les pré-requis de la pile de tapis sont désignés élément par élément
const SAUT = {
  A1: { aut: ["P1"], val: ["P1"], prAut: ["saut-23-2", "saut-23-5"], prVal: ["saut-23-5"] },
  A2: { aut: ["P1"], val: ["P1"], prAut: ["saut-23-5", "saut-23-4"], prVal: ["saut-23-4"] },
  B1: { aut: range("P1", "P3"), val: range("P1", "P2"), prAut: ["saut-23-4", "saut-23-PR3", "saut-24-5"], prVal: ["saut-23-4", "saut-23-PR3", "saut-24-5"] },
  B2: { aut: range("P1", "P4"), val: range("P2", "P3"), prAut: ["saut-23-4", "saut-23-PR3", "saut-24-5"], prVal: ["saut-23-PR3", "saut-24-5"] },
  B3: { aut: range("P1", "P5"), val: range("P2", "P4"), prAut: [], prVal: [] },
  C1: { aut: range("P1", "P6"), val: range("P3", "P5"), prAut: [], prVal: [] },
  C2: { aut: range("P1", "P7"), val: range("P4", "P7"), prAut: [], prVal: [] },
  C3: { aut: range("P1", "P7"), val: range("P4", "P7"), prAut: [], prVal: [] },
};
const SAUT_VALEUR = { PR1: 9, PR2: 10, PR3: 11, P1: 12, P2: 12, P3: 13, P4: 13, P5: 13, P6: 14, P7: 14, NOMADE: 12 };
const SAUT_VALOS = {
  A1: ["Saut à 1 m", "Saut tremplin"],
  A2: ["Saut à 1 m", "Saut tremplin"],
  B1: ["Saut tremplin", "2 sauts à 1,20 m (min.)"],
  B2: ["Saut avec rotation longitudinale ou transversale", "Saut avec un élément sur le tremplin"],
  B3: ["2 sauts de 1er envol différents (1 des 2 sauts min. dans les paliers valorisables) hors nomades", "Saut avec rotation longitudinale ou transversale", "Saut avec un élément sur le tremplin"],
};
SAUT_VALOS.C1 = SAUT_VALOS.C2 = SAUT_VALOS.C3 = SAUT_VALOS.B3;

const DUREE = {
  poutre: { A: "1 min 10 (chutes comprises)", B: "1 min 30 (chutes comprises)", C: "2 min (chutes comprises)" },
  sol: { A: "jusqu'à 40''", B1: "jusqu'à 55''", B2: "jusqu'à 55''", B3: "jusqu'à 1'10''", C: "jusqu'à 1'30''" },
  barres: { A: "Enchaînement autorisé en 2 ou 3 parties", B: "Enchaînement autorisé en 2 parties max" },
};

// ---------- Exigences par agrès et par niveau ----------
// H = helpers construits sur l'enchaînement (voir buildCtx dans app.js)
const BAL = ["Balancés avant", "Balancés arrière"];
const isBal = (it) => BAL.includes(it.arche);

const TC = {
  barres: {
    A1: (H) => [H.arches(4), H.count(6, 8), ["1 élément BI et 1 BS", H.bothBars()], ["1 élément des arches des balancés", H.has((it) => isBal(it))]],
    B1: (H) => [H.arches(4), H.count(6, 8), ["1 élément des arches des balancés", H.has(isBal)], ["1 élément des arches venir à l'appui", H.has((it) => it.arche === "Venir à l'appui")]],
    B2: (H) => [H.arches(4), H.count(6, 8), ["1 changement de barre BI-BS", H.barChange("BI", "BS")], ["1 élément des arches des élans", H.has((it) => it.arche === "Élans")], ["1 élément des arches venir à l'appui", H.has((it) => it.arche === "Venir à l'appui")]],
    B3: (H) => [H.arches(4), H.count(8, 10), ["1 changement de barre BI-BS", H.barChange("BI", "BS")], ["1 élément des arches des balancés", H.has(isBal)], ["1 élément des arches venir à l'appui", H.has((it) => it.arche === "Venir à l'appui")]],
    C1: (H) => [H.arches(4), H.count(8, 10), ["1 changement de barre BI-BS", H.barChange("BI", "BS")], ["1 élément des arches des balancés", H.has(isBal)], ["1 élément des arches des élans", H.has((it) => it.arche === "Élans")]],
    C2: (H) => [H.arches(4), H.count(8, 10), ["1 changement de barre BI-BS", H.barChange("BI", "BS")], ["1 élément des arches des balancés", H.has(isBal)], ["1 élément à l'ATR", H.has((it) => it.atr)]],
    C3: (H) => [H.arches(4), H.count(8, 10), ["1 changement de barre BI-BS ou BS-BI", H.barChange()], ["1 élément des arches des balancés", H.has(isBal)], ["2 éléments à l'ATR", H.n((it) => it.atr) >= 2]],
  },
  poutre: {
    A1: (H) => [H.arches(4), H.count(6, 8), ["1 acro en poutre haute", H.n((it) => H.acroHaute(it)) >= 1], ["2 sauts", H.n((it) => it.kind === "saut") >= 2]],
    B2: (H) => [H.arches(5), H.count(8, 10), ["2 acros en poutre haute", H.n((it) => H.acroHaute(it)) >= 2], ["1 pivot P4 (min.)", H.has((it) => it.kind === "pivot" && it.p >= 4)], ["1 élément P3 (min.)", H.has((it) => it.p >= 3)]],
    B3: (H) => [H.arches(5), H.count(8, 10), ["3 acros en poutre haute", H.n((it) => H.acroHaute(it)) >= 3], ["1 pivot P4 (min.)", H.has((it) => it.kind === "pivot" && it.p >= 4)], ["1 élément P4 (min.)", H.has((it) => it.p >= 4)]],
    C1: (H) => [H.arches(5), H.count(8, 10), ["3 acros en poutre haute", H.n((it) => H.acroHaute(it)) >= 3], ["1 pivot P4 (min.)", H.has((it) => it.kind === "pivot" && it.p >= 4)], ["1 élément P5 (min.)", H.has((it) => it.p >= 5)]],
    C2: (H) => [H.arches(5), H.count(8, 10), ["3 acros en poutre haute", H.n((it) => H.acroHaute(it)) >= 3], ["1 pivot P4 (min.)", H.has((it) => it.kind === "pivot" && it.p >= 4)], ["1 élément P6 (min.)", H.has((it) => it.p >= 6)]],
    C3: (H) => [H.arches(5), H.count(8, 10), ["3 acros en poutre haute", H.n((it) => H.acroHaute(it)) >= 3], ["1 pivot P4 (min.)", H.has((it) => it.kind === "pivot" && it.p >= 4)], ["1 élément P7", H.has((it) => it.p >= 7)]],
  },
  sol: {
    A1: (H) => [H.arches(4), H.count(6, 8), ["1 élément de souplesse", H.has((it) => it.kind === "souplesse")], ["2 acros", H.n((it) => it.kind === "acro") >= 2]],
    A2: (H) => [H.arches(4), H.count(6, 8), ["1 saut", H.has((it) => it.kind === "saut")], ["2 acros", H.n((it) => it.kind === "acro") >= 2]],
    B1: (H) => [H.arches(4), H.count(6, 8), ["1 PG ou 1 FORCE", H.pg().length > 0 || H.has((it) => it.kind === "force")], ["1 LA", H.las().length >= 1]],
    B2: (H) => [H.arches(4), H.count(8, 10), ["1 PG ou 1 FORCE", H.pg().length > 0 || H.has((it) => it.kind === "force")], ["2 LA distinctes", H.distinctLA() >= 2], ["1 élément P4", H.has((it) => it.p >= 4)]],
    B3: (H) => [H.arches(4), H.count(8, 10), ["1 PG ou 1 FORCE", H.pg().length > 0 || H.has((it) => it.kind === "force")], ["2 LA distinctes", H.distinctLA() >= 2], ["1 élément P5", H.has((it) => it.p >= 5)]],
    C1: (H) => [H.arches(4), H.count(8, 12), ["1 PG ou 1 FORCE", H.pg().length > 0 || H.has((it) => it.kind === "force")], ["2 LA distinctes", H.distinctLA() >= 2], ["1 élément P5 (min.)", H.has((it) => it.p >= 5)]],
    C2: (H) => [H.arches(4), H.count(8, 12), ["1 PG ou 1 FORCE", H.pg().length > 0 || H.has((it) => it.kind === "force")], ["2 LA distinctes", H.distinctLA() >= 2], ["1 élément P6 (min.)", H.has((it) => it.p >= 6)]],
    C3: (H) => [H.arches(4), H.count(8, 12), ["1 PG ou 1 FORCE", H.pg().length > 0 || H.has((it) => it.kind === "force")], ["2 LA distinctes", H.distinctLA() >= 2], ["1 élément P7", H.has((it) => it.p >= 7)]],
  },
};
TC.barres.A2 = TC.barres.A1;
TC.poutre.A2 = TC.poutre.A1;
TC.poutre.B1 = TC.poutre.A1;

// Valorisations : s = principale (*) → 3 pts, sinon 2 pts. shared = peut réutiliser des éléments d'autres valorisations.
// anyPal = la brochure désigne explicitement un palier hors « valorisables » (ex. « 1 ATR (PR) » en poutre mousse).
const V = (t, f, o = {}) => ({ t, f, ...o });
const S = (t, f, o = {}) => ({ t, f, s: true, ...o });
const MAN = () => null;

const VALOS = {
  barres: {
    A1: [S("1 élément des arches Balancés (hors sortie)", (H) => H.one((it) => isBal(it) && !it.sortie && !it.sortiekind)),
      V("1 mvt en 2 parties avec interruption (BI/BS ou inversement)", MAN),
      V("1 élément de l'arche des élans", (H) => H.one((it) => it.arche === "Élans")),
      V("1 élément de l'arche venir à l'appui", (H) => H.one((it) => it.arche === "Venir à l'appui"))],
    A2: [S("Enchaînement de 2 balancés (av. et arr.), aide possible au démarrage du bal. av. (hors sortie)", MAN),
      V("1 sauter à l'appui", (H) => H.one((it) => /sauter à l'appui/i.test(it.name))),
      V("1 élément de l'arche des élans", (H) => H.one((it) => it.arche === "Élans")),
      V("1 pose de pieds à la station debout puis sortie en saut droit vers l'avant", MAN)],
    B1: [S("Enchaînement de deux balancés (av. et arr. ou inversement ×2) (hors sortie)", MAN),
      V("1 élément P2 (min.)", (H) => H.one((it) => it.p >= 2)),
      S("1 prise d'élan + tour d'appui arrière", (H) => H.one((it) => /tour d'appui.*arri/i.test(it.name))),
      V("1 changement de barre BI - BS", (H) => H.barChange("BI", "BS")),
      V("1 sortie amenée du balancé arrière", MAN)],
    B2: [S("Enchaînement de deux balancés (av. et arr. ou inversement ×2) (hors sortie)", MAN),
      V("1 élément P3 (min.)", (H) => H.one((it) => it.p >= 3)),
      V("1 rotation P3 (min.)", (H) => H.one((it) => it.arche === "Rotations" && it.p >= 3)),
      S("Bascule, prise d'élan à l'horizontale", (H) => H.one((it) => it.bascule)),
      V("1 sortie P3 (min.)", (H) => H.sortieMin(3))],
    B3: [S("1 élément en balancé av. ou arr. (hors sortie)", (H) => H.one((it) => isBal(it) && !it.sortie && !it.sortiekind)),
      V("2 éléments P3 (min.)", (H) => H.k((it) => it.p >= 3, 2)),
      V("1 rotation P3 (min.)", (H) => H.one((it) => it.arche === "Rotations" && it.p >= 3)),
      S("Bascule P4, prise d'élan au-dessus de l'horizontale", (H) => H.one((it) => it.bascule && it.p >= 4)),
      V("1 sortie P4 (min.)", (H) => H.sortieMin(4))],
    C1: [V("1 lâcher", (H) => H.one((it) => it.lacher)),
      S("1 élément en balancé av. ou arr. (hors sortie)", (H) => H.one((it) => isBal(it) && !it.sortie && !it.sortiekind)),
      V("1 élément P4 (min.)", (H) => H.one((it) => it.p >= 4)),
      V("1 rotation P4 (min.)", (H) => H.one((it) => it.arche === "Rotations" && it.p >= 4)),
      S("1 élément fini à l'ATR", (H) => H.one((it) => it.atr)),
      V("1 sortie P4 (min.) amenée du balancé", (H) => H.sortieMin(4))],
    C2: [V("1 lâcher", (H) => H.one((it) => it.lacher)),
      S("1 grand tour", (H) => H.one((it) => it.grandtour)),
      V("1 élément P5 (min.)", (H) => H.one((it) => it.p >= 5)),
      V("1 rotation P4 (min.)", (H) => H.one((it) => it.arche === "Rotations" && it.p >= 4)),
      S("Bascule avec un élément fini à l'ATR", (H) => H.followedBy((a) => a.bascule, (b) => b.atr)),
      V("1 sortie P5 (min.)", (H) => H.sortieMin(5))],
    C3: [S("1 lâcher P5 (min.)", (H) => H.one((it) => it.lacher && it.p >= 5)),
      V("1 élément en balancé av. ou arr. P5 (min.) (hors sortie)", (H) => H.one((it) => isBal(it) && !it.sortie && !it.sortiekind && it.p >= 5)),
      V("1 élément P5 (min.)", (H) => H.one((it) => it.p >= 5)),
      V("1 rotation P6 (min.)", (H) => H.one((it) => it.arche === "Rotations" && it.p >= 6)),
      S("1 ATR ou grand tour avec rotation 180° (min.)", (H) => H.one((it) => (it.atr || it.grandtour) && it.rotlong)),
      V("1 sortie P5 (min.) amenée d'un élément P5 (min.)", (H) => H.sortieLinked((a, b) => a.p >= 5 && b.p >= 5, false))],
  },
  poutre: {
    A1: [V("1 élément de l'arche des pivots", (H) => H.one((it) => it.arche === "Pivots" && !it.mousse)),
      V("1 cabriole", (H) => H.one((it) => /cabriole/i.test(it.name) && !it.mousse)),
      S("ATR 1 jambe ou placement du dos", (H) => H.one((it) => /ATR|placement du dos/.test(it.name) && !it.mousse)),
      V("Poutre mousse : 1 ATR (PR)", (H) => H.one((it) => it.mousse && /ATR/.test(it.name), true))],
    A2: [V("1 demi-pivot sur 1 jambe", (H) => H.one((it) => it.kind === "pivot" && /1\/2 tour.*1 jambe|demi pivot/i.test(it.name) && !it.mousse)),
      V("1 saut appel 2 pieds", (H) => H.one((it) => it.arche === "Sauts appel 2 pieds" && !it.mousse)),
      S("1 ATR P2", (H) => H.one((it) => it.atr && it.p >= 2 && !it.mousse)),
      V("Poutre mousse : roue", (H) => H.one((it) => it.mousse && /roue/i.test(it.name), true))],
    B1: [V("1 élément pivot P3 (min.)", (H) => H.one((it) => it.kind === "pivot" && it.p >= 3 && !it.mousse)),
      S("1 saut P3 (min.)", (H) => H.one((it) => it.kind === "saut" && it.p >= 3 && !it.mousse)),
      S("1 acro P2 (min.)", (H) => H.one((it) => H.acroHaute(it) && it.p >= 2)),
      V("1 sortie P3 (min.)", (H) => H.sortieMin(3)),
      V("Poutre mousse : acro P2 (min.)", (H) => H.one((it) => it.mousse && it.kind === "acro" && it.p >= 2))],
    B2: [S("2 éléments gymniques P3 (min.) dans le mouvement", (H) => H.k((it) => H.gym(it) && it.p >= 3 && !it.mousse, 2)),
      V("1 saut avec écart antéro", (H) => H.one((it) => it.kind === "saut" && /antéro/i.test(it.name) && !it.mousse)),
      S("1 élément acro sur la poutre P3 (min.)", (H) => H.one((it) => H.acroHaute(it) && it.p >= 3)),
      V("1 sortie P3 (min.)", (H) => H.sortieMin(3)),
      V("Poutre mousse : acro P3 (min.)", (H) => H.one((it) => it.mousse && it.kind === "acro" && it.p >= 3))],
    B3: [S("1 LG ou LM", (H) => H.series((s) => H.isLG(s) || H.isLM(s))),
      V("1 saut avec écart antéro", (H) => H.one((it) => it.kind === "saut" && /antéro/i.test(it.name) && !it.mousse)),
      S("1 acro sur la poutre P4 (min.)", (H) => H.one((it) => H.acroHaute(it) && it.p >= 4)),
      V("1 sortie avec liaison acro", (H) => H.sortieLinked((a) => a.kind === "acro")),
      V("Poutre mousse : acro P4 (min.)", (H) => H.one((it) => it.mousse && it.kind === "acro" && it.p >= 4))],
    C1: [S("1 LG ou LM dont 2 P3 (min.)", (H) => H.series((s) => (H.isLG(s) || H.isLM(s)) && s.filter((it) => it.p >= 3).length >= 2)),
      V("1 saut avec 1 rotation à 180° (min.)", (H) => H.one((it) => it.kind === "saut" && it.rotlong && !it.mousse)),
      S("1 LA sur poutre", (H) => H.series((s) => H.isLA(s) && s.every((it) => !it.mousse))),
      V("1 élément acro P5 (min.) sur la poutre", (H) => H.one((it) => H.acroHaute(it) && it.p >= 5)),
      V("1 sortie avec liaison acro", (H) => H.sortieLinked((a) => a.kind === "acro")),
      V("Poutre mousse : 1 LA dont 1 élément avec envol", (H) => H.series((s) => H.isLA(s) && s.every((it) => it.mousse) && s.some((it) => it.envol), true))],
    C2: [S("1 LG ou LM dont 2 P4 (min.)", (H) => H.series((s) => (H.isLG(s) || H.isLM(s)) && s.filter((it) => it.p >= 4).length >= 2)),
      V("1 saut avec 1 rotation à 180°", (H) => H.one((it) => it.kind === "saut" && it.rotlong && !it.mousse)),
      S("1 LA dont 1 élément avec envol sur poutre", (H) => H.series((s) => H.isLA(s) && s.every((it) => !it.mousse) && s.some((it) => it.envol))),
      V("1 acro avec envol sur la poutre", (H) => H.one((it) => H.acroHaute(it) && it.envol)),
      V("1 sortie avec liaison acro dont un élément P4 (min.)", (H) => H.sortieLinked((a, b) => a.kind === "acro" && Math.max(a.p, b.p) >= 4)),
      V("Poutre mousse : 1 LA 2 éléments dont 1 salto", (H) => H.series((s) => H.isLA(s) && s.every((it) => it.mousse) && s.some((it) => it.salto), true))],
    C3: [S("1 LG ou LM dont 2 P4 (min.)", (H) => H.series((s) => (H.isLG(s) || H.isLM(s)) && s.filter((it) => it.p >= 4).length >= 2)),
      V("1 saut écart avec 1 rotation à 180°", (H) => H.one((it) => it.kind === "saut" && it.ecart && it.rotlong && !it.mousse)),
      S("1 LA de 2 éléments dont 1 salto sur poutre", (H) => H.series((s) => H.isLA(s) && s.every((it) => !it.mousse) && s.some((it) => it.salto))),
      V("1 salto sur poutre P6 (min.)", (H) => H.one((it) => H.acroHaute(it) && it.salto && it.p >= 6)),
      V("1 sortie avec liaison acro dont 1 élément P5 (min.)", (H) => H.sortieLinked((a, b) => a.kind === "acro" && Math.max(a.p, b.p) >= 5)),
      V("Poutre mousse : 1 LA de 2 éléments avec envol dont 1 salto", (H) => H.series((s) => H.isLA(s) && s.every((it) => it.mousse && it.envol) && s.some((it) => it.salto), true))],
  },
  sol: {
    A1: [S("1 ATR départ et retour en fente", (H) => H.one((it) => /ATR/.test(it.name) && /fente/i.test(it.name))),
      V("1 saut", (H) => H.one((it) => it.kind === "saut")),
      V("1 élément P2", (H) => H.one((it) => it.p >= 2)),
      V("2 acros de sens différents", (H) => H.twoDirections(false), { shared: true })],
    A2: [S("1 ATR départ et retour en fente", (H) => H.one((it) => /ATR/.test(it.name) && /fente/i.test(it.name))),
      V("1 saut P2 (min.)", (H) => H.one((it) => it.kind === "saut" && it.p >= 2)),
      V("Sursaut + fente + roue", (H) => H.followedBy((a) => /sursaut fente/i.test(a.name), (b) => /roue/i.test(b.name), true)),
      V("2 acros de sens différents", (H) => H.twoDirections(false), { shared: true })],
    B1: [V("1 ATR tenu 2'' départ et retour en fente", (H) => H.one((it) => /ATR/.test(it.name) && /fente/i.test(it.name))),
      S("1 LAE dont 1 élément P3 (min.)", (H) => H.series((s) => H.isLAE(s) && s.some((it) => it.val && it.p >= 3))),
      S("1 FORCE ou 1 SAUT écart P3 (min.)", (H) => H.one((it) => (it.kind === "force" || (it.kind === "saut" && it.ecart)) && it.p >= 3)),
      V("1 élément acro avec envol P3 (min.)", (H) => H.one((it) => it.kind === "acro" && it.envol && it.p >= 3)),
      V("2 acros de sens différents", (H) => H.twoDirections(false), { shared: true })],
    B2: [V("1 LAE dont 1 acro avec appui manuel", (H) => H.series((s) => H.isLAE(s) && s.some((it) => it.appuimanuel))),
      S("1 LAE dont 1 élément P4 (min.)", (H) => H.series((s) => H.isLAE(s) && s.some((it) => it.val && it.p >= 4))),
      S("1 FORCE ou 1 SAUT écart P3 (min.)", (H) => H.one((it) => (it.kind === "force" || (it.kind === "saut" && it.ecart)) && it.p >= 3)),
      V("1 salto en P4", (H) => H.one((it) => it.salto && it.p >= 4)),
      V("2 acros de sens différents avec envol incorporés dans les LAE", (H) => H.twoDirections(true), { shared: true })],
    B3: [V("1 LAE dont 1 salto appel 2 pieds", (H) => H.series((s) => H.isLAE(s) && s.some((it) => it.salto))),
      S("1 LAE dont 1 élément P5", (H) => H.series((s) => H.isLAE(s) && s.some((it) => it.val && it.p >= 5))),
      S("1 FORCE ou 1 SAUT écart P4 (min.)", (H) => H.one((it) => (it.kind === "force" || (it.kind === "saut" && it.ecart)) && it.p >= 4)),
      V("1 salto en P5", (H) => H.one((it) => it.salto && it.p >= 5)),
      V("2 acros de sens différents avec envol incorporés dans les LAE", (H) => H.twoDirections(true), { shared: true })],
    C1: [S("1 salto position tendue appel 2 pieds", (H) => H.one((it) => it.salto && /tendu/i.test(it.name))),
      S("1 LAE de 3 éléments différents dont 1 P5 (min.)", (H) => H.series((s) => H.isLAE(s) && new Set(s.map((x) => x.id)).size >= 3 && s.some((it) => it.val && it.p >= 5))),
      V("1 FORCE ou 1 SAUT P4 (min.)", (H) => H.one((it) => (it.kind === "force" || it.kind === "saut") && it.p >= 4)),
      V("1 élément acro avec envol P5 (min.)", (H) => H.one((it) => it.kind === "acro" && it.envol && it.p >= 5)),
      V("2 acros de sens différents avec envol incorporés dans les LAE", (H) => H.twoDirections(true), { shared: true }),
      V("2 salti appel 2 pieds liés directement ou indirectement", (H) => H.twoSalti(0))],
    C2: [S("1 salto avec rotation longitudinale 360°", (H) => H.one((it) => it.salto && /360|1 tour|1\/1 tour/i.test(it.name))),
      S("1 LAE de 3 éléments différents dont 1 P5 (min.)", (H) => H.series((s) => H.isLAE(s) && new Set(s.map((x) => x.id)).size >= 3 && s.some((it) => it.val && it.p >= 5))),
      V("1 FORCE ou 1 SAUT P5 (min.)", (H) => H.one((it) => (it.kind === "force" || it.kind === "saut") && it.p >= 5)),
      V("1 élément acro P6 (min.)", (H) => H.one((it) => it.kind === "acro" && it.p >= 6)),
      V("2 acros de sens différents avec envol incorporés dans les LAE", (H) => H.twoDirections(true), { shared: true }),
      V("2 salti appel 2 pieds liés directement ou indirectement", (H) => H.twoSalti(0))],
    C3: [S("1 acro avec double rotation longitudinale ou transversale, avec envol", (H) => H.one((it) => it.envol && /double|2\/1|720|2 tours/i.test(it.name))),
      S("1 LAE de 3 éléments différents dont 1 P6 (min.)", (H) => H.series((s) => H.isLAE(s) && new Set(s.map((x) => x.id)).size >= 3 && s.some((it) => it.val && it.p >= 6))),
      V("1 FORCE ou 1 SAUT P6 (min.)", (H) => H.one((it) => (it.kind === "force" || it.kind === "saut") && it.p >= 6)),
      V("1 élément acro P7", (H) => H.one((it) => it.kind === "acro" && it.p >= 7)),
      V("2 acros de sens différents avec envol incorporés dans les LAE", (H) => H.twoDirections(true), { shared: true }),
      V("2 salti liés dont 1 P5 (min.)", (H) => H.twoSalti(5))],
  },
};
