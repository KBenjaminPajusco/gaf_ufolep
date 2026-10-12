import pymupdf, sys, re
doc = pymupdf.open("source/gaf_pt.pdf")
for pn in range(23,46):
    p = doc[pn-1]; d = p.get_text("dict")
    labs=[]; titles=[]
    for b in d["blocks"]:
        for l in b.get("lines", []):
            t="".join(s["text"] for s in l["spans"]).strip()
            sz=l["spans"][0]["size"]
            if re.fullmatch(r"P[1-7]|PR",t): labs.append((t,round(l["bbox"][0]),round(l["bbox"][1]),round(sz,1)))
            elif sz>=15: titles.append(t)
    print(pn, titles); print("   ", sorted(labs,key=lambda x:(x[2],x[1])))
