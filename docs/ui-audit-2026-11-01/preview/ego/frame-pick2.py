
from PIL import Image, ImageStat, ImageFilter
im = Image.open(r"D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/round02-baseline.png").convert("RGB")
panel = (735, 205, 1075, 500)   # 面板大致包围盒，裁图不能碰它
chat_left = 1140                 # 右侧聊天栏起点

def overlaps(box):
    x0, y0, x1, y1 = box
    px0, py0, px1, py1 = panel
    return not (x1 <= px0 or x0 >= px1 or y1 <= py0 or y0 >= py1)

cw, ch = 560, 330
cands = []
for y in range(0, 470, 55):
    for x in range(0, chat_left - cw + 1, 55):
        box = (x, y, x + cw, y + ch)
        if overlaps(box):
            continue
        crop = im.crop(box).convert("L")
        mean = ImageStat.Stat(crop).mean[0]
        std = ImageStat.Stat(crop).stddev[0]
        edge = ImageStat.Stat(crop.filter(ImageFilter.FIND_EDGES)).mean[0]
        cands.append((mean, std, edge, x, y))
cands.sort(key=lambda c: c[0])
print("count", len(cands))
print("--- darkest 5 ---")
for c in cands[:5]:
    print("mean=%.1f std=%.1f edge=%.1f x=%d y=%d" % c)
print("--- brightest 5 ---")
for c in cands[-5:]:
    print("mean=%.1f std=%.1f edge=%.1f x=%d y=%d" % c)
