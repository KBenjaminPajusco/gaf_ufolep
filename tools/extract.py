import pymupdf, re, json, math
SOURCES = [("gaf", "source/gaf_pt.pdf", range(23, 46)), ("anneaux", "source/gam_anneaux.pdf", range(1, 5)),
           ("paralleles", "source/gam_parallele.pdf", range(1, 6)), ("fixe", "source/gam_fixe.pdf", range(1, 5))]
CX, CY, R1, STEP = 595.5, 634.0, 134.0, 67.5
ID = re.compile(r"^(\d+(?:/\d+)?\+?(?:\s*bis)?)\s*(new|26)?\s*(?:bis)?\s*-\s*(.*)$", re.I)
out = []
for src, path, pages in SOURCES:
  doc = pymupdf.open(path)
  for pn in pages:
    p = doc[pn-1]; d = p.get_text("rawdict")
    for b in d["blocks"]:
        for l in b.get("lines", []):
            for sp in l["spans"]: sp["text"] = "".join(c["c"] for c in sp["chars"])
    hdr = [ "".join(s["text"] for s in l["spans"]).strip() for b in d["blocks"] for l in b.get("lines",[]) if l["spans"][0]["size"]>=25]
    lines = []
    for b in d["blocks"]:
        for l in b.get("lines", []):
            t = "".join(s["text"] for s in l["spans"]).strip()
            sz = l["spans"][0]["size"]
            if not t or sz < 3.5 or sz > 8: continue
            if re.fullmatch(r"P[1-7]|PR", t) or t.startswith("Conception"): continue
            x0,y0,x1,y1 = l["bbox"]
            lines.append(dict(t=t, dir=tuple(round(v,2) for v in l["dir"]), cx=(x0+x1)/2, cy=(y0+y1)/2, bbox=l["bbox"], size=sz, pts=[c["origin"] for sp in l["spans"] for c in sp["chars"]]))
    starts = [l for l in lines if ID.match(l["t"])]
    others = [l for l in lines if not ID.match(l["t"])]
    groups = {id(s): [s] for s in starts}
    for o in others:  # attach continuation to nearest start with same dir
        cands = [s for s in starts if s["dir"] == o["dir"]] or starts
        best = min(cands, key=lambda s: math.hypot(s["cx"]-o["cx"], s["cy"]-o["cy"]))
        if math.hypot(best["cx"]-o["cx"], best["cy"]-o["cy"]) < 40:
            groups[id(best)].append(o)
        else:
            print("ORPHAN", pn, o["t"])
    for s in starts:
        g = groups[id(s)]
        dx, dy = s["dir"]
        # order lines by perpendicular offset (text "down" direction = (-dy, dx))
        g.sort(key=lambda l: l["cx"]*(-dy) + l["cy"]*dx)
        m = ID.match(g[0]["t"]) if ID.match(g[0]["t"]) else ID.match(s["t"])
        txt = " ".join([s["t"]] + [l["t"] for l in g if l is not s])
        txt = re.sub(r"\s+", " ", txt).strip()
        mx = sum(l["cx"] for l in g)/len(g); my = sum(l["cy"] for l in g)/len(g)
        r = math.hypot(mx-CX, my-CY); ang = math.degrees(math.atan2(CY-my, mx-CX))
        if my > 650:
            zone = "PR" if mx < CX else "NOMADE"
        elif r < R1: zone = "P1"
        else:
            k = 2 + int((r - R1)//STEP); zone = f"P{k}" if k <= 7 else "P?"
        mm = ID.match(txt)
        # étendue du libellé dans le repère du texte (u le long du texte, v vers le « haut » du texte)
        nx, ny = dy, -dx
        us, vs = [], []
        for l in g:
            for (px, py) in l["pts"]:
                us.append((px-mx)*dx + (py-my)*dy); vs.append((px-mx)*nx + (py-my)*ny)
            vs.append(max(vs) + l["size"] * 0.8); us.append(max(us) + l["size"] * 0.5)
        out.append(dict(src=src, page=pn, hdr=hdr, num=mm.group(1), tag=mm.group(2) or "", name=mm.group(3), zone=zone, r=round(r), ang=round(ang), x=round(mx), y=round(my),
                        fx=mx, fy=my, dx=dx, dy=dy, u0=min(us), u1=max(us), v0=min(vs), v1=max(vs)))
json.dump(out, open("tools/raw.json","w",encoding="utf-8"), ensure_ascii=False, indent=0)
for e in out: print(e["src"], e["page"], e["zone"], e["ang"], e["num"], e["tag"], e["name"][:90])
