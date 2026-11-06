
function srgbToLin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function lum(rgb){const[r,g,b]=rgb.map(srgbToLin);return 0.2126*r+0.7152*g+0.0722*b;}
function ratio(a,b){const L1=lum(a),L2=lum(b);const hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05);}
function hex2rgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function over(fg,a,bg){return fg.map((v,i)=>Math.round(v*a+bg[i]*(1-a)));}
const white=[255,255,255];
const bgs={'dark #101418':[16,20,24],'mid #2b3138':[43,49,56],'bright #d8dee6':[216,222,230],'white #f2f5f8':[242,245,248]};
const fgs={'title #0f172a':'#0f172a','body #334155':'#334155','sub #64748b':'#64748b','muted #94a3b8':'#94a3b8','blue #0066ff':'#0066ff','switchoff #cbd5e1':'#cbd5e1'};
const out={};
for(const ga of [0.42,0.65,0.72,0.95]){
  out['alpha'+ga]={};
  for(const [bn,bv] of Object.entries(bgs)){
    const comp=over(white,ga,bv);
    out['alpha'+ga][bn]={};
    for(const [fn,fv] of Object.entries(fgs)) out['alpha'+ga][bn][fn]=Math.round(ratio(hex2rgb(fv),comp)*100)/100;
  }
}
console.log(JSON.stringify(out,null,1));
const cand={'sub #475569':'#475569','sub #5b6b80':'#5b6b80','title #1e293b':'#1e293b'};
console.log('\n== 候选色 @ glass 0.65 ==');
for(const [cn,cv] of Object.entries(cand)){
  const line={};
  for(const [bn,bv] of Object.entries(bgs)) line[bn]=Math.round(ratio(hex2rgb(cv),over(white,0.65,bv))*100)/100;
  console.log(cn, JSON.stringify(line));
}
