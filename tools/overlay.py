import pymupdf, json, sys
doc = pymupdf.open("source/gaf_pt.pdf"); raw = json.load(open("tools/raw.json",encoding="utf-8"))
for pn in map(int, sys.argv[1:]):
    p = doc[pn-1]
    for e in raw:
        if e["page"]==pn:
            p.insert_text((e["x"]-8, e["y"]+3), e["zone"], fontsize=11, color=(1,0,0))
    p.get_pixmap(dpi=120).save(f"tools/ov-{pn}.png")
