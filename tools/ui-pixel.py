#!/usr/bin/env python
# ui-pixel.py —— 截图像素比对（Pillow）
#   python tools/ui-pixel.py <baselineDir> <afterDir> [--vp 1625] [--panel sign]
# 判定：单通道极差 <=1 且 超阈值像素占比 <0.5% → PASS；否则 FAIL（退出码 1）
import sys, os, glob, json

try:
    from PIL import Image, ImageChops
except Exception as e:
    print("[ui-pixel] Pillow 不可用:", e)
    sys.exit(2)

MAX_DELTA = 1
MAX_RATIO = 0.005

args = sys.argv[1:]
vp = "1625"
panel = ""
pos = []
i = 0
while i < len(args):
    if args[i] == "--vp":
        vp = args[i + 1]; i += 2
    elif args[i] == "--panel":
        panel = args[i + 1]; i += 2
    else:
        pos.append(args[i]); i += 1

if len(pos) < 2:
    print("usage: python tools/ui-pixel.py <baselineDir> <afterDir> [--vp 1625] [--panel sign]")
    sys.exit(2)

base, after = pos[0], pos[1]
failed = 0
checked = 0

targets = sorted(glob.glob(os.path.join(base, "*", "panel-%s.png" % vp)))
for bp in targets:
    name = os.path.basename(os.path.dirname(bp))
    if panel and name != panel:
        continue
    ap = os.path.join(after, name, os.path.basename(bp))
    if not os.path.exists(ap):
        print("[%s] MISSING after png: %s" % (name, ap))
        failed += 1
        continue
    a = Image.open(bp).convert("RGB")
    b = Image.open(ap).convert("RGB")
    # 只比面板区域：rect 取两份快照的并集（面板位置可能微移）
    box = None
    try:
        sa = json.load(open(os.path.join(base, name, "snapshot-%s.json" % vp), encoding="utf-8"))
        sb = json.load(open(os.path.join(after, name, "snapshot-%s.json" % vp), encoding="utf-8"))
        ra, rb = sa["snap"]["root"]["rect"], sb["snap"]["root"]["rect"]
        x0 = max(0, min(ra[0], rb[0]) - 2); y0 = max(0, min(ra[1], rb[1]) - 2)
        x1 = max(ra[0] + ra[2], rb[0] + rb[2]) + 2; y1 = max(ra[1] + ra[3], rb[1] + rb[3]) + 2
        box = (int(x0), int(y0), int(min(x1, a.size[0])), int(min(y1, a.size[1])))
        a = a.crop(box); b = b.crop(box)
    except Exception as e:
        print("[%s] WARN 无法读取 rect，退回整页比对: %s" % (name, e))
    if a.size != b.size:
        print("[%s] SIZE MISMATCH %s vs %s" % (name, a.size, b.size))
        failed += 1
        continue
    diff = ImageChops.difference(a, b)
    # 每像素三通道最大差
    extrema = diff.getextrema()
    max_delta = max(e[1] for e in extrema)
    gray = diff.convert("L")
    hist = gray.histogram()
    total = a.size[0] * a.size[1]
    over = sum(hist[MAX_DELTA + 1:])
    ratio = over / float(total)
    ok = (max_delta <= MAX_DELTA) and (ratio < MAX_RATIO)
    checked += 1
    if not ok:
        failed += 1
        heat = os.path.join(after, name, "diff-%s.png" % vp)
        try:
            gray.point(lambda v: 255 if v > MAX_DELTA else 0).save(heat)
        except Exception:
            pass
    print("[%s] max_delta=%d over=%d ratio=%.4f%% -> %s" % (name, max_delta, over, ratio * 100, "PASS" if ok else "FAIL"))

print("[ui-pixel] vp=%s checked=%d failed=%d" % (vp, checked, failed))
sys.exit(1 if failed else 0)
