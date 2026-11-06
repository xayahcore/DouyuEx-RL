
const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const L=h=>{h=h.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)};
const R=(a,b)=>{const x=L(a),y=L(b);const hi=Math.max(x,y),lo=Math.min(x,y);return Math.round(((hi+0.05)/(lo+0.05))*100)/100};
const hx=n=>'#'+n.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const over=(a,frame)=>frame.map(v=>255*a+v*(1-a));
const frames={'纯黑 #000000':[0,0,0],'暗帧 #101418':[16,20,24],'亮帧 #d8dee6':[216,222,230],'纯白 #ffffff':[255,255,255]};
const inks=['#0f172a','#334155','#475569','#64748b','#0066ff','#cbd5e1'];
for(const alpha of [0.65,0.78,0.84,0.90]){
  const base=hx(over(alpha,frames['纯黑 #000000']));
  const line={};
  for(const k in frames){const b=hx(over(alpha,frames[k]));line[k]=inks.map(i=>i+' '+R(i,b));}
  console.log('alpha',alpha,'| 纯黑帧底色',base);
  for(const k in line) console.log('   ',k, line[k].join('  '));
}
