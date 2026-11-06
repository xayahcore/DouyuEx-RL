
from PIL import Image, ImageDraw, ImageFont

SHOTS = r"D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/"
CROP = (803, 70, 1263, 526)   # 三档 stage 矩形完全相同：x=823 y=90 w=420 h=416，四周各留 20px
LABELS = [
    ("tier-glass.png",  "G   卡片 0.87   透光 13%"),
    ("tier-glass2.png", "G2  卡片 0.62   透光 38%"),
    ("tier-glass3.png", "G3  卡片 0.16   透光 ≈80%"),
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
canvas_w = MARGIN * 2 + w * 3 + GAP * 2
canvas_h = STRIP + h + MARGIN * 2
canvas = Image.new("RGB", (canvas_w, canvas_h), (11, 14, 20))
draw = ImageDraw.Draw(canvas)

for index, (tile, (_, label)) in enumerate(zip(tiles, LABELS)):
    x = MARGIN + index * (w + GAP)
    y = MARGIN + STRIP
    canvas.paste(tile, (x, y))
    draw.rectangle([x - 1, y - 1, x + w, y + h], outline=(30, 42, 56))
    color = [(248, 113, 113), (96, 165, 250), (147, 197, 253)][index]
    draw.text((x + 2, MARGIN + 10), label, fill=color, font=font)

out = SHOTS + "34-tiers.png"
canvas.save(out)
print("saved", out, canvas.size)
