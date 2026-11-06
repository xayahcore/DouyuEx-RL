
from PIL import Image, ImageDraw, ImageFont

SHOTS = r"D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/shots/"
font_b = None
font_s = None
try:
    font_b = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 20)
    font_s = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 16)
except Exception:
    font_b = ImageFont.load_default()
    font_s = font_b

# ---------- 54：dark vs dark2（同一张卡片行） ----------
CROP_PANEL = (803, 70, 1263, 526)
pairs = [("cmp-dark.png", "D   旧版 · 只靠 alpha 0.70 压暗 · 透光 30%"),
         ("cmp-dark2.png", "D2  新版 · brightness 归一化 · 透光 70%")]
tiles = [Image.open(SHOTS + n).crop(CROP_PANEL) for n, _ in pairs]
w, h = tiles[0].size
canvas = Image.new("RGB", (24 * 2 + w * 2 + 20, 56 + h + 48), (11, 14, 20))
draw = ImageDraw.Draw(canvas)
for i, (tile, (_, label)) in enumerate(zip(tiles, pairs)):
    x = 24 + i * (w + 20)
    y = 24 + 56
    canvas.paste(tile, (x, y))
    draw.rectangle([x - 1, y - 1, x + w, y + h], outline=(30, 42, 56))
    draw.text((x + 2, 34), label, fill=[(148, 163, 184), (125, 176, 255)][i], font=font_b)
canvas.save(SHOTS + "54-dark2-vs-dark.png")
print("saved 54", canvas.size)

# ---------- 55：三态 × Dock 胶囊 ----------
CAP = (661, 333, 1311, 477)
rows = [("state-light.png", "白天 · G2 · 太阳"),
        ("state-dark.png", "黑夜 · D2 · 月亮"),
        ("state-auto.png", "跟随网页 · 角标")]
tiles = [Image.open(SHOTS + n).crop(CAP) for n, _ in rows]
w, h = tiles[0].size
canvas = Image.new("RGB", (220 + w + 48, 24 * 2 + (h + 12) * 3), (11, 14, 20))
draw = ImageDraw.Draw(canvas)
for i, (tile, (_, label)) in enumerate(zip(tiles, rows)):
    y = 24 + i * (h + 12)
    draw.text((24, y + h // 2 - 10), label, fill=(226, 232, 240), font=font_s)
    canvas.paste(tile, (220, y))
    draw.rectangle([219, y - 1, 220 + w, y + h], outline=(30, 42, 56))
canvas.save(SHOTS + "55-dock-theme-3states.png")
print("saved 55", canvas.size)