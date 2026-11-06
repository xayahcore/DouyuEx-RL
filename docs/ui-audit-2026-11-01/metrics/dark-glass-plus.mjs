
const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const L=h=>{h=h.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)};
const R=(a,b)=>{const x=L(a),y=L(b);const hi=Math.max(x,y),lo=Math.min(x,y);return Math.round(((hi+0.05)/(lo+0.05))*100)/100};
const hx=n=>'#'+n.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
const base=[16,20,26];
const frames={'黑场':[0,0,0],'暗帧':[16,20,24],'亮帧':[216,222,230],'纯白':[255,255,255]};
const inks={'#ffffff':'#ffffff','#e2e8f0':'#e2e8f0','#cbd5e1':'#cbd5e1','#7db0ff':'#7db0ff'};
console.log('模型：backdrop-filter brightness(b) 先把背后画面乘 b，再让 rgba(16,20,26,a) 叠上去');
for (const b of [0.45,0.55,0.65]) {
  for (const a of [0.25,0.30,0.35,0.42]) {
    let worst={r:99};
    const rows=[];
    for (const f in frames) {
      const bg=hx(base.map((c,i)=>c*a + frames[f][i]*b*(1-a)));
      const rs=Object.entries(inks).map(([k,v])=>{const r=R(v,bg); if(r<worst.r) worst={r,f,k}; return k+' '+r;});
      rows.push(f+' '+bg+': '+rs.join('/'));
    }
    console.log('b='+b+' a='+a+' | 透光≈'+Math.round((1-a)*100)+'% | 最差 '+worst.k+' '+worst.r+' ('+worst.f+')');
    rows.forEach(r=>console.log('    '+r));
  }
}
