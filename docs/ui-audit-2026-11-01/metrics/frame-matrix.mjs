
import fs from "node:fs"; import path from "node:path";
const OUT = path.join(process.cwd(), "docs/ui-audit-2026-11-01/metrics");
const lin=(c)=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const lum=([r,g,b])=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);const hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+0.05)/(lo+0.05);};
const hex=(h)=>{h=h.replace("#","");return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
const over=(fg,a,bg)=>[0,1,2].map(i=>fg[i]*a+bg[i]*(1-a));
const hx=(rgb)=>"#"+rgb.map(v=>Math.round(v).toString(16).padStart(2,"0")).join("");
const r2=x=>Math.round(x*100)/100;
const W=[255,255,255];
const out=[];
const fr=(name,video)=>{ for (const a of [0.65,0.72,0.90]) { const bg=over(W,a,video); out.push({frame:name,alpha:a,bg:hx(bg),"#0f172a":r2(ratio(hex("#0f172a"),bg)),"#334155":r2(ratio(hex("#334155"),bg)),"#64748b":r2(ratio(hex("#64748b"),bg)),"#94a3b8":r2(ratio(hex("#94a3b8"),bg))}); } };
fr("#101418",hex("#101418")); fr("#000000",hex("#000000")); fr("#05080b",hex("#05080b"));
fs.writeFileSync(path.join(OUT,"css-frame-matrix.json"), JSON.stringify({ rows: out }, null, 2));
console.log(JSON.stringify(out,null,1));
