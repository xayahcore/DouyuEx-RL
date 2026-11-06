
import fs from "node:fs";
import path from "node:path";
const OUT = path.join(process.cwd(), "docs/ui-audit-2026-11-01/metrics");
const raw = fs.readFileSync("src/packages/ExPanel/ExPanel.css", "utf8");
const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
const nl=[];for(let i=0;i<src.length;i++)if(src.charCodeAt(i)===10)nl.push(i);
const lineOf=(idx)=>{let lo=0,hi=nl.length;while(lo<hi){const mid=(lo+hi)>>1;if(nl[mid]<idx)lo=mid+1;else hi=mid;}return lo+1;};
const nodes=[];const stack=[];let buf="",i=0;const atOf=[];
while(i<src.length){const ch=src[i];
 if(ch==="{"){const sel=buf.trim().replace(/\s+/g," ");const isAt=sel.startsWith("@");const pa=atOf.length?atOf[atOf.length-1]:null;stack.push({isAt,selector:sel,line:lineOf(i),bodyStart:i+1,parentAt:pa});atOf.push(isAt?sel:pa);buf="";i++;continue;}
 if(ch==="}"){const t=stack.pop();atOf.pop();if(t&&!t.isAt)nodes.push({selector:t.selector,line:t.line,bodyStart:t.bodyStart,bodyEnd:i,parentAt:t.parentAt});buf="";i++;continue;}
 if(ch===";"){buf="";i++;continue;}
 if(ch==="\n"||ch==="\r"){buf+=" ";i++;continue;}buf+=ch;i++;}
function splitDecls(body){const out=[];let d=0,str=null,cur="";for(let k=0;k<body.length;k++){const ch=body[k];if(str){if(ch===str&&body[k-1]!=="\\")str=null;cur+=ch;continue;}if(ch==='"'||ch==="'"){str=ch;cur+=ch;continue;}if(ch==="("){d++;cur+=ch;continue;}if(ch===")"){d--;cur+=ch;continue;}if(ch===";"&&d===0){out.push(cur);cur="";continue;}cur+=ch;}if(cur.trim())out.push(cur);return out;}
const decls=[];for(const n of nodes){for(const t of splitDecls(src.slice(n.bodyStart,n.bodyEnd))){const ci=t.indexOf(":");if(ci<0)continue;let p=t.slice(0,ci).trim(),v=t.slice(ci+1).trim();const imp=/!\s*important\s*$/i.test(v);v=v.replace(/!\s*important\s*$/i,"").trim();decls.push({sel:n.selector,line:n.line,prop:p.toLowerCase(),value:v,important:imp,parentAt:n.parentAt});}}

const imp = decls.filter(d=>d.important);
const normalDecls = decls.filter(d=>!d.important);

// Tranche classification
const STATE_OR_PSEUDO = /(::|:(hover|active|focus|focus-visible|focus-within|checked|disabled|is-active|not\())/;
const t1 = imp.filter(d=>STATE_OR_PSEUDO.test(d.sel));
const t2props = new Set(["flex","flex-direction","flex-wrap","flex-shrink","flex-grow","flex-basis","gap","row-gap","column-gap","order","align-items","align-self","align-content","justify-content","justify-self","box-sizing","overflow","overflow-x","overflow-y","min-width","min-height","max-width","max-height","white-space","text-overflow","word-break","letter-spacing","object-fit","vertical-align","list-style","resize","user-select","appearance","-webkit-appearance","-moz-appearance","pointer-events","visibility","cursor"]);
const rest = imp.filter(d=>!STATE_OR_PSEUDO.test(d.sel));
const t2 = rest.filter(d=>t2props.has(d.prop));
const t3 = rest.filter(d=>!t2props.has(d.prop));
const byProp3 = {}; for(const d of t3) byProp3[d.prop]=(byProp3[d.prop]||0)+1;

// rules by category
const rulesWithImp = new Set(imp.map(d=>d.line));
const keyframeDecls = decls.filter(d=>d.parentAt&&d.parentAt.startsWith("@keyframes"));

// how many !important sit on the boundary selectors (the 9-panel block + dock)
const boundaryImp = imp.filter(d=>/^\.(miuix-modal|sign-panel|fans-continue-panel|extool|livetool|bloop|exlottery|popup-player-panel|exupdate-panel)(,|$|\s*\{)/.test(d.sel+" ") || /^\.ex-panel[ ,{]/.test(d.sel+" "));

fs.writeFileSync(path.join(OUT,"css-important-tranches.json"), JSON.stringify({
 totalDecls: decls.length, important: imp.length, normal: normalDecls.length, importantRate: +(imp.length/decls.length*100).toFixed(2),
 keyframeDecls: keyframeDecls.length,
 tranche1_stateOrPseudo: { count: t1.length, props: Object.fromEntries(Object.entries(t1.reduce((a,d)=>(a[d.prop]=(a[d.prop]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]).slice(0,15)) },
 tranche2_internalLayout: { count: t2.length, props: Object.fromEntries(Object.entries(t2.reduce((a,d)=>(a[d.prop]=(a[d.prop]||0)+1,a),{})).sort((a,b)=>b[1]-a[1])) },
 tranche3_visual: { count: t3.length, props: byProp3 },
 rulesWithImportant: rulesWithImp.size,
 importantPerRule: +(imp.length/rulesWithImp.size).toFixed(2),
 boundaryImportant: boundaryImp.length
}, null, 2));
console.log(JSON.stringify({ totalDecls: decls.length, important: imp.length, rate: +(imp.length/decls.length*100).toFixed(2), t1: t1.length, t2: t2.length, t3: t3.length, perRule: +(imp.length/rulesWithImp.size).toFixed(2), rules: rulesWithImp.size }, null, 1));
