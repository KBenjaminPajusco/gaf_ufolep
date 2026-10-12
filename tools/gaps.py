import pymupdf, math
from PIL import Image
doc = pymupdf.open("source/gaf_pt.pdf")
CX, CY = 595.5, 634.0
S=2
for pn in [23,24,25,29,30,32,33,38,39,40,42]:
    pix = doc[pn-1].get_pixmap(matrix=pymupdf.Matrix(S,S))
    im = Image.frombytes("RGB",(pix.width,pix.height),pix.samples)
    res=[]
    for r in (235, 302, 370, 437):
        whites=[]
        for i in range(0, 1801):
            a=math.radians(i/10)
            x=(CX+r*math.cos(a))*S; y=(CY-r*math.sin(a))*S
            px=im.getpixel((int(x),int(y)))
            whites.append(min(px)>248)
        runs=[];st=None
        for i,w in enumerate(whites):
            if w and st is None: st=i
            if not w and st is not None: runs.append((st/10,i/10)); st=None
        runs=[ru for ru in runs if 5<ru[0]<175 and ru[1]-ru[0]>0.3]
        res.append((r,[(round((a+b)/2,1)) for a,b in runs]))
    # side labels
    d=doc[pn-1].get_text("dict"); labs=[]
    for b in d["blocks"]:
        for l in b.get("lines",[]):
            t="".join(s["text"] for s in l["spans"]).strip(); sz=l["spans"][0]["size"]
            if 15<=sz<25 and t not in("PRÉ-REQUIS","NOMADE"):
                x=(l["bbox"][0]+l["bbox"][2])/2; y=(l["bbox"][1]+l["bbox"][3])/2
                labs.append((t,round(math.degrees(math.atan2(CY-y,x-CX)))))
    print(pn,res,labs)
