"""Découpe le pictogramme de chaque élément dans les arches de la brochure → app/img/<id>.webp

Chaque petit dessin vectoriel (silhouette) est rattaché au libellé le plus proche, distance mesurée
dans le repère du texte. La vignette est redressée pour que le texte soit horizontal.
"""
import json, math, io, sys
import pymupdf
from PIL import Image
sys.path.insert(0, "tools")

raw = json.load(open("tools/raw.json", encoding="utf-8"))
els = json.load(open("app/elements.json", encoding="utf-8"))
doc = pymupdf.open("source/gaf_pt.pdf")
# raw et elements sont dans le même ordre (build_data ajoute seulement le PR3 synthétique à la fin)
pairs = list(zip(raw, els))
Z = 4  # 288 dpi
MAXD = 60

def local(e, x, y):
    dx, dy = e["dx"], e["dy"]; nx, ny = dy, -dx
    return (x - e["fx"]) * dx + (y - e["fy"]) * dy, (x - e["fx"]) * nx + (y - e["fy"]) * ny

def rect_dist(u, v, e):
    du = max(e["u0"] - u, 0, u - e["u1"]); dv = max(e["v0"] - v, 0, v - e["v1"])
    return math.hypot(du, dv)

import os; os.makedirs("app/img", exist_ok=True)
stats = {"ok": 0, "none": 0}
for pn in sorted({r["page"] for r in raw}):
    page = doc[pn - 1]
    labels = [(r, el) for r, el in pairs if r["page"] == pn]
    groups = {el["id"]: [] for _, el in labels}
    for dr in page.get_drawings():
        R = dr["rect"]
        if R.width > 70 or R.height > 70 or R.width * R.height < 0.5: continue
        stroke_only = dr.get("fill") is None
        if stroke_only and max(R.width, R.height) > 25: continue        # traits de séparation
        if dr.get("fill") and min(dr["fill"]) > 0.93 and not stroke_only and R.width * R.height > 400: continue  # fonds blancs
        cx, cy = (R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2
        best, bd = None, MAXD
        for r, el in labels:
            u, v = local(r, cx, cy)
            if v < r["v0"] - 1: continue                      # le pictogramme est au-dessus du libellé
            dd = rect_dist(u, v, r)
            if dd < bd: best, bd = (r, el), dd
        if best: groups[best[1]["id"]].append(R)
    for r, el in labels:
        rects = groups[el["id"]]
        if len(rects) < 2:
            stats["none"] += 1; el.pop("img", None); continue
        # boîte dans le repère du texte
        us, vs = [], []
        for R in rects:
            for (x, y) in ((R.x0, R.y0), (R.x1, R.y0), (R.x0, R.y1), (R.x1, R.y1)):
                u, v = local(r, x, y); us.append(u); vs.append(v)
        u0, u1, v0, v1 = min(us) - 3, max(us) + 3, min(vs) - 3, max(vs) + 3
        dx, dy = r["dx"], r["dy"]; nx, ny = dy, -dx
        corners = [(r["fx"] + u * dx + v * nx, r["fy"] + u * dy + v * ny) for u in (u0, u1) for v in (v0, v1)]
        clip = pymupdf.Rect(min(c[0] for c in corners), min(c[1] for c in corners), max(c[0] for c in corners), max(c[1] for c in corners))
        deg = -math.degrees(math.atan2(dy, dx))
        mat = pymupdf.Matrix(Z, Z).prerotate(deg)
        pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
        im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        # position de la boîte locale dans l'image tournée
        tc = [pymupdf.Point(c) * mat for c in corners]
        tclip = [pymupdf.Point(p) * mat for p in (clip.tl, clip.tr, clip.bl, clip.br)]
        ox, oy = min(p.x for p in tclip), min(p.y for p in tclip)
        box = (min(p.x for p in tc) - ox, min(p.y for p in tc) - oy, max(p.x for p in tc) - ox, max(p.y for p in tc) - oy)
        im = im.crop(tuple(int(round(b)) for b in box))
        im.thumbnail((320, 200))
        im.save(f"app/img/{el['id']}.webp", "WEBP", quality=80)
        el["img"] = True; stats["ok"] += 1
        # zone cliquable sur la page entière : pictogramme + libellé, rectangle tourné [page_pdf, cx, cy, w, h, angle°]
        hu0, hu1 = min(u0, r["u0"] - 2), max(u1, r["u1"] + 2)
        hv0, hv1 = min(v0, r["v0"] - 2), max(v1, r["v1"] + 2)
        uc, vc = (hu0 + hu1) / 2, (hv0 + hv1) / 2
        el["hs"] = [pn, round(r["fx"] + uc * dx + vc * nx, 1), round(r["fy"] + uc * dy + vc * ny, 1),
                    round(hu1 - hu0, 1), round(hv1 - hv0, 1), round(math.degrees(math.atan2(dy, dx)), 1)]
    # fond de l'arche (page entière)
    os.makedirs("app/arches", exist_ok=True)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
    Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB").save(f"app/arches/p{pn}.webp", "WEBP", quality=82)
json.dump(els, open("app/elements.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
json.dump({"w": round(doc[24].rect.width, 2), "h": round(doc[24].rect.height, 2)}, open("app/arches/size.json", "w"))
print(stats)
