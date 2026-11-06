import fs from "node:fs";
const p = "src/packages/Sign/Sign.js";
const lines = fs.readFileSync(p, "utf8").split("\n");
let start = -1, end = -1;
for (let i = 0; i < lines.length; i++) if (lines[i].includes("var LEGACY_SIGN_PANEL_HTML")) { start = i; break; }
for (let j = start + 1; j < lines.length; j++) if (lines[j].trim() === "`;") { end = j; break; }
console.log("start", start, "end", end);
if (start >= 0 && end > start) lines.splice(start, end - start + 1);
let out = lines.join("\n");
out = out.replace(`  } else {
    p.innerHTML = LEGACY_SIGN_PANEL_HTML;
  }`, `  } else if (typeof ExGuard_warn === "function") {
    ExGuard_warn("签到", "ExUI 组件层未加载，面板未渲染（应随主包一同注入）");
  }`);
fs.writeFileSync(p, out);
console.log("done");
