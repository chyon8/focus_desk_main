import sys, os, json
from PIL import Image, ImageDraw
# usage: python3 sheet.py out.jpg dir1 [dir2 ...]
out, dirs = sys.argv[1], sys.argv[2:]
items = []
for d in dirs:
    for f in sorted(os.listdir(d)):
        if f.endswith('.jpg'):
            items.append((os.path.basename(d.rstrip('/')) + '/' + f.split('-')[0], os.path.join(d, f)))
W, H, cols = 300, 300, 8
rows = (len(items) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W, rows * (H + 20)), (24, 24, 24))
dr = ImageDraw.Draw(sheet)
for i, (label, p) in enumerate(items):
    im = Image.open(p).convert('RGB')
    im.thumbnail((W, H))
    c, r = i % cols, i // cols
    x = c * W + (W - im.width) // 2
    y = r * (H + 20) + 20 + (H - im.height) // 2
    sheet.paste(im, (x, y))
    dr.text((c * W + 6, r * (H + 20) + 4), label, fill=(235, 235, 235))
sheet.save(out, quality=82)
print(out, len(items))
