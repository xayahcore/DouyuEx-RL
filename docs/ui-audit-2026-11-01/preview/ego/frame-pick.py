
from PIL import Image, ImageStat, ImageFilter
im = Image.open(r"D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/round02-baseline.png").convert("RGB")
W, H = im.size
cw, ch = 760, 440
step_x, step_y = 120, 100
cands = []
for y in range(0, H - ch + 1, step_y):
    for x in range(0, W - cw + 1, step_x):
        box = (x, y, x + cw, y + ch)
        crop = im.crop(box).convert("L")
        stat = ImageStat.Stat(crop)
        mean = stat.mean[0]
        std = stat.stddev[0]
        # 纹理分：拉普拉斯边缘能量，避免选到纯色 LOGO 区
        edges = ImageStat.Stat(crop.filter(ImageFilter.FIND_EDGES)).mean[0]
        cands.append((mean, std, edges, x, y))

cands.sort(key=lambda c: c[0])
print("=== 最暗 6 块 ===")
for c in cands[:6]:
    print("mean=%.1f std=%.1f edge=%.1f x=%d y=%d" % c)
print("=== 最亮 6 块 ===")
for c in cands[-6:]:
    print("mean=%.1f std=%.1f edge=%.1f x=%d y=%d" % c)
