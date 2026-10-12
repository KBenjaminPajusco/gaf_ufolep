"""Construit app/elements.json à partir de tools/raw.json (extraction géométrique des arches)."""
import json, re
raw = json.load(open("tools/raw.json", encoding="utf-8"))

# page -> (agrès, arche, [(angle_seuil, secteur_au-dessus, secteur_en-dessous)] , kind par défaut)
PAGES = {
 23: ("saut", "Renversement avant et latéral", (90, "Saut par renversement avant", "Saut par renversement latéral")),
 24: ("saut", "Rondade et saut de mains", (90, "Saut par rondade", "Saut par saut de mains")),
 25: ("barres", "Balancés avant", (63.6, None, "Sorties")),
 26: ("barres", "Balancés arrière", None),
 27: ("barres", "Venir à l'appui", None),
 28: ("barres", "Élans", None),
 29: ("barres", "Rotations", (27.9, None, "Sorties")),
 30: ("poutre", "ATR et maintien", (54.3, "ATR", "Maintien")),
 31: ("poutre", "Pivots", None),
 32: ("poutre", "Acro 1", (90, "Vers l'avant", "Vers l'arrière")),
 33: ("poutre", "Acro 2", (41.8, "Vers l'avant", "Vers l'arrière")),
 34: ("poutre", "Acro poutre mousse", None),
 35: ("poutre", "Sauts appel 1 pied", None),
 36: ("poutre", "Sauts appel 2 pieds", None),
 37: ("poutre", "Entrées", None),
 38: ("sol", "Acros 1", (90, "En avant", "En arrière")),
 39: ("sol", "Acros 2", (35.1, "En avant", "En arrière")),
 40: ("sol", "ATR et force", (90, "Force", "ATR")),
 41: ("sol", "Cercles", None),
 42: ("sol", "Maintien et souplesse", (55, "Maintien", "Souplesse")),
 43: ("sol", "Pivots", None),
 44: ("sol", "Sauts appel 2 pieds", None),
 45: ("sol", "Sauts appel 1 pied", None),
}
BROCHURE_PAGE = {p: p + 27 for p in PAGES}  # numéro imprimé (50..72)

def clean(t):
    t = t.replace("’", "’").replace("’", "'")
    t = re.sub(r"(\w)- (\w)", r"\1\2", t)        # césures "Renverse- ment"
    t = re.sub(r"\s+", " ", t).strip(" .")
    t = t.replace("1 jambre", "1 jambe").replace("jambre", "jambe").replace("branchiale", "brachiale").replace(". enversement", ". Renversement")
    return t[0].upper() + t[1:] if t else t

def kind_of(app, arche, side, name):
    n = name.lower()
    if app == "saut": return "saut_agres"
    if app == "barres": return "barre"
    if arche in ("Pivots",): return "pivot"
    if arche.startswith("Sauts"): return "saut"
    if arche == "Entrées": return "entree"
    if arche == "Cercles": return "cercle"
    if side == "Maintien": return "maintien"
    if side == "Souplesse": return "souplesse"
    if side == "Force": return "force"
    return "acro"

R = lambda p, s: re.search(p, s, re.I) is not None
out, seen = [], {}
for e in raw:
    app, arche, split = PAGES[e["page"]]
    name = clean(e["name"])
    zone = e["zone"]
    side = None
    if split and zone.startswith("P") and zone not in ("PR",) and zone != "P1":
        thr, above, below = split
        side = above if e["ang"] > thr else below
        if side is None: side = "Éléments"
    if app == "saut" and zone == "PR":
        zone = {"2": "PR1", "5": "PR2", "4": "PR2"}.get(e["num"], "PR3")
    k = kind_of(app, arche, side, name)
    n = name.lower()
    flags = {
      "envol": (R(r"salto|salti|flic|flip|saut de mains?|rondade|tempo|twist|avec envol|japonais|auerbach|poisson|onodi|yurchenko|tsukahara|lune|healy", n) and not R(r"sans envol", n)) or k in ("saut",),
      "salto": R(r"salto|salti|tempo|twist|japonais|auerbach|gienger|jaeger|onodi", n),
      "rotlong": R(r"(\d/\d|1/2|demi|1|2|3/2)[ -]?tours?\b|vrill|twist|360|540|720|1 080|1/4 de tour|tour \(", n) and not R(r"grand tour|tour d.appui|tour avant libre", n),
      "atr": R(r"\bATR\b|placement d[eu] dos|soleil|grand tour arrière 1/2|handstand", name),
      "lacher": app == "barres" and R(r"shoushounova|retrait|contre mouvement|shaposhnikova|salto pak|gienger|jaeger|voronin|poisson", n),
      "grandtour": R(r"grand tour|soleil", n),
      "bascule": R(r"bascule", n),
      "ecart": R(r"écart|enjamb|antéro|grand jeté|biche|changement de jambes|sissonne|popa|ciseau", n),
      "appuimanuel": R(r"rondade|flic|flip|saut de mains?|roue|renversement|souplesse|\bATR\b|roulade|tic-tac|onodi|valse", name) and not R(r"^salto", n),
      "sortiekind": side == "Sorties" or R(r"^sortie|sortie ", n),
    }
    key = f"{app}-{e['page']}-" + re.sub(r"[^0-9A-Za-z]+", "_", e['num'].replace('+', 'p')).strip('_')
    if key in seen:  # numéros dupliqués sur une même page (ex. 164 / 164+ ont des numéros distincts déjà)
        seen[key] += 1; key += f"-{seen[key]}"
    else: seen[key] = 0
    out.append(dict(id=key, num=e["num"], new=e["tag"] == "new", maj=e["tag"] == "26", name=name, app=app, arche=arche,
                    side=side, palier=zone, kind=k, page=BROCHURE_PAGE[e["page"]], **{f: True for f, v in flags.items() if v}))
# PR3 saut sans numéro (texte de la brochure p.50)
out.append(dict(id="saut-23-PR3", num="—", new=False, maj=False, name="Rondade arrivée debout sur tapis de 80 cm",
                app="saut", arche="Renversement avant et latéral", side=None, palier="PR3", kind="saut_agres", page=50, envol=True, appuimanuel=True))
json.dump(out, open("app/elements.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
from collections import Counter
print(len(out), Counter((e["app"]) for e in out))
print(Counter((e["app"], e["side"]) for e in out if e["side"]))
