
import fs from "node:fs";
import path from "node:path";
const OUT = path.join(process.cwd(), "docs/ui-audit-2026-11-01/metrics");
const raw = fs.readFileSync("src/packages/ExPanel/ExPanel.css", "utf8");
const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
const nl = []; for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) nl.push(i);
const lineOf = (idx) => { let lo = 0, hi = nl.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (nl[mid] < idx) lo = mid + 1; else hi = mid; } return lo + 1; };
const nodes = []; const stack = []; let buf = "", i = 0; const atOf = [];
while (i < src.length) { const ch = src[i];
  if (ch === "{") { const sel = buf.trim().replace(/\s+/g," "); const isAt = sel.startsWith("@"); const pa = atOf.length?atOf[atOf.length-1]:null; stack.push({isAt,selector:sel,line:lineOf(i),bodyStart:i+1,parentAt:pa}); atOf.push(isAt?sel:pa); buf=""; i++; continue; }
  if (ch === "}") { const t = stack.pop(); atOf.pop(); if (t && !t.isAt) nodes.push({selector:t.selector,line:t.line,bodyStart:t.bodyStart,bodyEnd:i,parentAt:t.parentAt}); buf=""; i++; continue; }
  if (ch === ";") { buf=""; i++; continue; }
  if (ch==="\n"||ch==="\r") { buf+=" "; i++; continue; } buf+=ch; i++; }
function splitDecls(body){const out=[];let d=0,str=null,cur="";for(let k=0;k<body.length;k++){const ch=body[k];if(str){if(ch===str&&body[k-1]!=="\\\\")str=null;cur+=ch;continue;}if(ch==='"'||ch==="'"){str=ch;cur+=ch;continue;}if(ch==="("){d++;cur+=ch;continue;}if(ch===")"){d--;cur+=ch;continue;}if(ch===";"&&d===0){out.push(cur);cur="";continue;}cur+=ch;}if(cur.trim())out.push(cur);return out;}
const declsOf=(n)=>splitDecls(src.slice(n.bodyStart,n.bodyEnd)).map(t=>{const ci=t.indexOf(":");if(ci<0)return null;let p=t.slice(0,ci).trim(),v=t.slice(ci+1).trim();v=v.replace(/!\s*important\s*$/i,"").trim();return {prop:p.toLowerCase(),value:v};}).filter(Boolean);
const splitSel=(s)=>{const out=[];let d=0,cur="";for(const ch of s){if(ch==="(")d++;if(ch===")")d--;if(ch===","&&d===0){out.push(cur.trim());cur="";continue;}cur+=ch;}if(cur.trim())out.push(cur.trim());return out;};

// per individual selector: map prop -> [ruleLine...]
const bySel = new Map();
for (const n of nodes) { if (n.parentAt) continue;
  for (const one of splitSel(n.selector)) {
    if (!bySel.has(one)) bySel.set(one, []);
    bySel.get(one).push({ line: n.line, decls: declsOf(n) });
  }
}
const conflicts = [];
for (const [sel, entries] of bySel) {
  if (entries.length < 2) continue;
  const propMap = new Map();
  for (const e of entries) for (const d of e.decls) { if (!propMap.has(d.prop)) propMap.set(d.prop, []); propMap.get(d.prop).push({ line: e.line, value: d.value }); }
  const dup = [...propMap.entries()].filter(([, ls]) => ls.length > 1).map(([prop, ls]) => ({ prop, count: ls.length, docs: ls }));
  if (dup.length) conflicts.push({ selector: sel, rules: entries.map(e=>e.line), duplicateProps: dup });
}
conflicts.sort((a, b) => b.duplicateProps.length - a.duplicateProps.length);
fs.writeFileSync(path.join(OUT, "css-tokenv2-tmp.json"), "{}");
fs.writeFileSync(path.join(OUT, "css-conflicts.json"), JSON.stringify({ individualSelectorCount: bySel.size, conflictingSelectors: conflicts.length, conflicts }, null, 2));
console.log("individual selectors:", bySel.size, "with duplicate props:", conflicts.length);
console.log(conflicts.slice(0, 18).map(c => c.selector + "  rules=" + c.rules.join(",") + "  dupProps=" + c.duplicateProps.map(d => d.prop + "×" + d.count).join(" ")).join("\n"));
