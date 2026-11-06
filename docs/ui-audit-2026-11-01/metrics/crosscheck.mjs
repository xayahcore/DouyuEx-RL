
import fs from "node:fs"; import path from "node:path";
const OUT = path.join(process.cwd(), "docs/ui-audit-2026-11-01/metrics");
const lin=(c)=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const lum=([r,g,b])=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);const hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+0.05)/(lo+0.05);};
const hex=(h)=>{h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
const over=(fg,a,bg)=>[0,1,2].map(i=>fg[i]*a+bg[i]*(1-a));
const hx=(rgb)=>"#"+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
const r2=x=>Math.round(x*100)/100;
const W=[255,255,255],K=[0,0,0];
const glassF=(video,a)=>over(W,a,video);
const PANEL_DARK_F = glassF(hex("#101418"),0.65);
const PANEL_LIGHT_D8 = glassF(hex("#d8dee6"),0.65);
const rows=[];
const push=(id,fg,bg,note)=>rows.push({id,fg:hx(fg),bg:hx(bg),note,ratio:r2(ratio(fg,bg))});
push("X01",hex("#0f172a"),PANEL_DARK_F,"float composite 0.65/#101418");
push("X02",hex("#334155"),PANEL_DARK_F,"");
push("X03",hex("#64748b"),PANEL_DARK_F,"");
push("X04",hex("#94a3b8"),PANEL_DARK_F,"");
push("X05",hex("#0066ff"),PANEL_DARK_F,"");
push("X06",hex("#64748b"),PANEL_LIGHT_D8,"亮场 #d8dee6 (核对 lead 的 4.28)");
push("X07",hex("#334155"),PANEL_LIGHT_D8,"");
push("X08",hex("#0066ff"),PANEL_LIGHT_D8,"");
// switch off/on track
const trackOff = over(K,0.14,PANEL_DARK_F);
const trackOffLight = over(K,0.14,PANEL_LIGHT_D8);
push("X09",trackOff,PANEL_DARK_F,"开关 OFF 轨 rgba(0,0,0,0.14) 与玻璃对比(组件边界需 3:1)");
push("X10",trackOffLight,PANEL_LIGHT_D8,"同上(亮场)");
push("X11",hex("#0066ff"),PANEL_DARK_F,"开关 ON 轨 与玻璃对比(边界 3:1)");
push("X12",hex("#ffffff"),hex("#0066ff"),"开关 thumb 白 vs 蓝轨");
push("X13",hex("#0066ff"),hex("#ffffff"),"段控选中 蓝字 vs 纯白 thumb 底");
// seg track
const segTrack = over(K,0.06,PANEL_DARK_F);
push("X14",hex("#64748b"),segTrack,"段控未选中 label");
push("X15",hex("#0f172a"),segTrack,"段控未选中(若要达 AA)");
// alpha-slate text
const alphaSlate=(a,bg)=>over(hex("#0f172a"),a,bg);
const ITEM = over(W,0.35,PANEL_DARK_F);
const as55 = alphaSlate(0.55,ITEM); push("X16",as55,ITEM,"rgba(15,23,42,0.55) 落在 item 底后的实际对比");
const as5 = alphaSlate(0.50,ITEM); push("X17",as5,ITEM,"rgba(15,23,42,0.5)");
const as6 = alphaSlate(0.60,PANEL_DARK_F); push("X18",as6,PANEL_DARK_F,"rgba(15,23,42,0.6) on 面板");
// icons
push("X19",hex("#334155"),over(W,0.45,over(W,0.72,hex("#101418"))),"Dock 磁贴图标 0.45 over Dock 0.72");
push("X20",hex("#ff6600"),hex("#ffffff"),"ExIcon hover 光晕橙(仅记录)");
fs.writeFileSync(path.join(OUT,"css-crosscheck.json"), JSON.stringify({ panelDarkFloat: hx(PANEL_DARK_F), panelLightD8Float: hx(PANEL_LIGHT_D8), rows }, null, 2));
console.log(JSON.stringify({ panelDarkFloat: hx(PANEL_DARK_F), panelDarkRounded: "#abadae", panelLightD8: hx(PANEL_LIGHT_D8), rows }, null, 1));
