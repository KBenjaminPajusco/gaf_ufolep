import pymupdf, math
from PIL import Image
CX, CY, S = 595.5, 634.0, 2
for f, pages in [("gam_anneaux", range(1, 5)), ("gam_parallele", range(1, 6)), ("gam_fixe", range(1, 5))]:
    doc = pymupdf.open(f"source/{f}.pdf")
    for pn in pages:
        p = doc[pn - 1]
        pix = p.get_pixmap(matrix=pymupdf.Matrix(S, S)); im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        res = []
        for r in (302, 437):
            w = []
            for i in range(0, 1801):
                a = math.radians(i / 10); x = (CX + r * math.cos(a)) * S; y = (CY - r * math.sin(a)) * S
                w.append(min(im.getpixel((int(x), int(y)))) > 248)
            runs, st = [], None
            for i, v in enumerate(w):
                if v and st is None: st = i
                if not v and st is not None: runs.append((st / 10 + i / 10) / 2); st = None
            res.append((r, [round(x, 1) for x in runs if 5 < x < 175]))
        d = p.get_text("dict"); labs = []
        for b in d["blocks"]:
            for l in b.get("lines", []):
                t = "".join(s["text"] for s in l["spans"]).strip(); sz = l["spans"][0]["size"]
                if 15 <= sz < 25 and t not in ("PRÉ-REQUIS", "NOMADE"):
                    x = (l["bbox"][0] + l["bbox"][2]) / 2; y = (l["bbox"][1] + l["bbox"][3]) / 2
                    labs.append((t, round(math.degrees(math.atan2(CY - y, x - CX)))))
                elif sz >= 25 and sz < 40: labs.append(("TITRE:" + t, 0))
        print(f, pn, res, labs)
