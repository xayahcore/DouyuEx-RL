
const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const L=h=>{h=h.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)};
const R=(a,b)=>{const x=L(a),y=L(b);const hi=Math.max(x,y),lo=Math.min(x,y);return Math.round(((hi+0.05)/(lo+0.05))*100)/100};
const hx=n=>'#'+n.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const mix=(c,alpha,frame)=>frame.map(v=>c*alpha+v*(1-alpha));
const frames={'黑场':[0,0,0],'暗帧':[16,20,24],'亮帧':[216,222,230],'纯白':[255,255,255]};
const inks=['#0f172a','#334155','#475569','#64748b'];
console.log('=== 白玻璃路线：文字墨色 vs 合成底（行=alpha，列=帧） ===');
for(const a of [0.30,0.42,0.55,0.65,0.78,0.84,0.88,0.92]){
  const row=[];
  for(const f in frames){const bg=hx(mix(255,a,frames[f]));row.push(f+' '+bg+' | '+inks.map(i=>i+' '+R(i,bg)).join(' / '));}
  console.log('alpha '+a.toFixed(2)); row.forEach(r=>console.log('   '+r));
}
console.log('\n=== 深玻璃路线：白字 vs 深色合成底（底色 rgba(16,20,26,a)） ===');
const darks=['#ffffff','#e2e8f0','#cbd5e1','#94a3b8','#7db0ff'];
for(const a of [0.50,0.62,0.70,0.78]){
  const row=[];
  for(const f in frames){const c=[16,20,26].map((v,i)=>v*a+frames[f][i]*(1-a));const bg=hx(c);row.push(f+' '+bg+' | '+darks.map(i=>i+' '+R(i,bg)).join(' / '));}
  console.log('alpha '+a.toFixed(2)); row.forEach(r=>console.log('   '+r));
}
console.log('\n=== 图标（非文字，门槛 3:1）在白玻璃磁贴上的表现 ===');
for(const a of [0.35,0.42,0.55,0.62,0.70]){
  console.log('tile alpha '+a.toFixed(2)+' → '+'黑场 icon#334155 '+R('#334155',hx(mix(255,a,[0,0,0])))+' | 暗帧 '+R('#334155',hx(mix(255,a,[16,20,24])))+' | 亮帧 '+R('#334155',hx(mix(255,a,[216,222,230])))+' | 白 icon#0f172a 黑场 '+R('#0f172a',hx(mix(255,a,[0,0,0]))));
}
