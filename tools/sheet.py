import json, sys
from PIL import Image, ImageDraw
els = [e for e in json.load(open("app/elements.json", encoding="utf-8")) if e.get("img")]
sel = [e for e in els if e["app"] == sys.argv[1]][: int(sys.argv[2])]
W, H, C = 260, 190, 6
sheet = Image.new("RGB", (W * C, H * ((len(sel) + C - 1) // C)), "white")
d = ImageDraw.Draw(sheet)
for k, e in enumerate(sel):
    im = Image.open(f"app/img/{e['id']}.webp"); im.thumbnail((W - 10, H - 30))
    x, y = (k % C) * W, (k // C) * H
    sheet.paste(im, (x + 5, y + 5)); d.text((x + 5, y + H - 22), f"{e['num']} {e['palier']} {e['name'][:34]}", fill="red")
sheet.save(sys.argv[3])
