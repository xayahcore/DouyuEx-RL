
from PIL import Image, ImageStat
src = r"D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/round02-baseline.png"
out = r"D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/assets/"
im = Image.open(src).convert("RGB")
jobs = [
    ("frame-dark.png", (0, 330, 560, 660)),
    ("frame-light.png", (165, 55, 725, 385)),
]
import os
os.makedirs(out, exist_ok=True)
for name, box in jobs:
    crop = im.crop(box)
    crop.save(out + name)
    stat = ImageStat.Stat(crop.convert("L"))
    print("%s  box=%s  mean=%.1f  std=%.1f" % (name, box, stat.mean[0], stat.stddev[0]))
