
from PIL import Image
im = Image.open(r"D:/DouyuEx-RL/docs/ui-audit-2026-11-01/live/round02-baseline.png").convert("RGB")
im.resize((im.width//2, im.height//2)).save(r"D:/DouyuEx-RL/docs/ui-audit-2026-11-01/preview/ego/baseline-half.png")
print("ok")
