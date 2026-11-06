
from PIL import Image, ImageDraw, ImageFont

SHOTS = r"D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/"
CROP = (803, 70, 1263, 526)
LABELS = [
    ("pair-glass2.png", "G2  浅色玻璃 · 卡片 0.62"),
    ("pair-dark.png",   "D   深色玻璃 · 卡片 0.70"),
]
GAP = 20
MARGIN = 24
STRIP = 56

try:
    font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 20)
except Exception:
    font = ImageFont.load_default()

tiles = [Image.open(SHOTS + name).crop(CROP) for name, _ in LABELS]
w, h = tiles[0].size
canvas = Image.new("RGB", (MARGIN * 2 + w * 2 + GAP, STRIP + h + MARGIN * 2), (11, 14, 20))
draw = ImageDraw.Draw(canvas)
for index, (tile, (_, label)) in enumerate(zip(tiles, LABELS)):
    x = MARGIN + index * (w + GAP)
    y = MARGIN + STRIP
    canvas.paste(tile, (x, y))
    draw.rectangle([x - 1, y - 1, x + w, y + h], outline=(30, 42, 56))
    draw.text((x + 2, MARGIN + 10), label, fill=[(96, 165, 250), (148, 163, 184)][index], font=font)
canvas.save(SHOTS + "44-dark-vs-g2.png")
print("saved 44-dark-vs-g2.png", canvas.size)
