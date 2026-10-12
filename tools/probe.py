import pymupdf, sys, json
doc = pymupdf.open(sys.argv[1])
p = doc[int(sys.argv[2])-1]
d = p.get_text("dict")
for b in d["blocks"]:
    for l in b.get("lines", []):
        t = "".join(s["text"] for s in l["spans"])
        if t.strip():
            print(round(l["bbox"][0]),round(l["bbox"][1]), [round(x,2) for x in l["dir"]], repr(t), l["spans"][0]["size"])
print(p.rect)
