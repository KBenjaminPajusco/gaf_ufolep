"""Construit app/elements.json à partir de tools/raw.json (extraction géométrique des arches)."""
import json, re
raw = json.load(open("tools/raw.json", encoding="utf-8"))

# (source, page) -> (agrès, arche, secteurs) ; secteurs = [(angle_min, nom), ...] du plus grand angle au plus petit
def two(thr, above, below): return [(thr, above), (-999, below)]
PAGES = {
 ("gaf", 23): ("saut", "Renversement avant et latéral", two(90, "Saut par renversement avant", "Saut par renversement latéral")),
 ("gaf", 24): ("saut", "Rondade et saut de mains", two(90, "Saut par rondade", "Saut par saut de mains")),
 ("gaf", 25): ("barres", "Balancés avant", two(63.6, "Éléments", "Sorties")),
 ("gaf", 26): ("barres", "Balancés arrière", None),
 ("gaf", 27): ("barres", "Venir à l'appui", None),
 ("gaf", 28): ("barres", "Élans", None),
 ("gaf", 29): ("barres", "Rotations", two(27.9, "Éléments", "Sorties")),
 ("gaf", 30): ("poutre", "ATR et maintien", two(54.3, "ATR", "Maintien")),
 ("gaf", 31): ("poutre", "Pivots", None),
 ("gaf", 32): ("poutre", "Acro 1", two(90, "Vers l'avant", "Vers l'arrière")),
 ("gaf", 33): ("poutre", "Acro 2", two(41.8, "Vers l'avant", "Vers l'arrière")),
 ("gaf", 34): ("poutre", "Acro poutre mousse", None),
 ("gaf", 35): ("poutre", "Sauts appel 1 pied", None),
 ("gaf", 36): ("poutre", "Sauts appel 2 pieds", None),
 ("gaf", 37): ("poutre", "Entrées", None),
 ("gaf", 38): ("sol", "Acros 1", two(90, "En avant", "En arrière")),
 ("gaf", 39): ("sol", "Acros 2", two(35.1, "En avant", "En arrière")),
 ("gaf", 40): ("sol", "ATR et force", two(90, "Force", "ATR")),
 ("gaf", 41): ("sol", "Cercles", None),
 ("gaf", 42): ("sol", "Maintien et souplesse", two(55, "Maintien", "Souplesse")),
 ("gaf", 43): ("sol", "Pivots", None),
 ("gaf", 44): ("sol", "Sauts appel 2 pieds", None),
 ("gaf", 45): ("sol", "Sauts appel 1 pied", None),
 # GAM (documents « en cours de validation », juil.-août 2026)
 ("anneaux", 1): ("anneaux", "Suspension", None),
 ("anneaux", 2): ("anneaux", "Force et maintien", [(135.5, "Force"), (90.1, "Croix"), (44.5, "ATR"), (-999, "Appuis")]),
 ("anneaux", 3): ("anneaux", "Élans vers l'avant", None),
 ("anneaux", 4): ("anneaux", "Élans vers l'arrière", None),
 ("paralleles", 1): ("paralleles", "Brachial", None),
 ("paralleles", 2): ("paralleles", "Élan suspension", None),
 ("paralleles", 3): ("paralleles", "Élan vers l'avant", two(44.6, "Éléments", "Sorties")),
 ("paralleles", 4): ("paralleles", "Élan vers l'arrière", two(44.6, "Éléments", "Sorties")),
 ("paralleles", 5): ("paralleles", "Appuis et maintien", None),
 ("fixe", 1): ("fixe", "Balancés avant", None),
 ("fixe", 2): ("fixe", "Balancés arrière", None),
 ("fixe", 3): ("fixe", "Appui élan", None),
 ("fixe", 4): ("fixe", "Rotation", None),
}
def printed_page(e):
    if e["src"] == "gaf": return e["page"] + 27
    for h in e.get("hdr", []):
        m = re.match(r"(\d+)\s*I\s", h)
        if m: return int(m.group(1))
    return None

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
    if app in ("anneaux", "paralleles", "fixe"): return "agres"
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
    app, arche, split = PAGES[(e["src"], e["page"])]
    name = clean(e["name"])
    zone = e["zone"]
    side = None
    if split and zone.startswith("P") and zone not in ("PR",) and zone != "P1":
        side = next(lbl for thr, lbl in split if e["ang"] > thr)
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
      "sortiekind": side == "Sorties" or R(r"^sortie|sortie ", n) or (app == "anneaux" and R(r"salto|salti", n)),
      "tenu": R(r"tenue? 2|tenu", n),
      "disloc": R(r"disloc", n),
      "etab": R(r"tablissement", n),
      "descente": R(r"descente|lune|soleil", n) and app == "anneaux",
    }
    key = (f"{app}-{e['page']}-" if e["src"] == "gaf" else f"{app}-g{e['page']}-") + re.sub(r"[^0-9A-Za-z]+", "_", e['num'].replace('+', 'p')).strip('_')
    if key in seen:  # numéros dupliqués sur une même page (ex. 164 / 164+ ont des numéros distincts déjà)
        seen[key] += 1; key += f"-{seen[key]}"
    else: seen[key] = 0
    out.append(dict(id=key, num=e["num"], new=e["tag"] == "new", maj=e["tag"] == "26", name=name, app=app, arche=arche,
                    side=side, palier=zone, kind=k, page=printed_page(e), src=e["src"], **{f: True for f, v in flags.items() if v}))
# PR3 saut sans numéro (texte de la brochure p.50)
out.append(dict(id="saut-23-PR3", num="—", new=False, maj=False, name="Rondade arrivée debout sur tapis de 80 cm",
                app="saut", arche="Renversement avant et latéral", side=None, palier="PR3", kind="saut_agres", page=50, envol=True, appuimanuel=True))
json.dump(out, open("app/elements.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
from collections import Counter
print(len(out), Counter((e["app"]) for e in out))
print(Counter((e["app"], e["side"]) for e in out if e["side"]))
