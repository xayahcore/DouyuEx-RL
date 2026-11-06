
const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const L=h=>{h=h.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)};
const R=(a,b)=>{const x=L(a),y=L(b);const hi=Math.max(x,y),lo=Math.min(x,y);return Math.round(((hi+0.05)/(lo+0.05))*100)/100};
const hx=n=>'#'+n.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const base=[16,20,26];
const frames={'黑场':[0,0,0],'暗帧':[16,20,24],'亮帧':[216,222,230],'纯白':[255,255,255]};
const inks={'白 #ffffff':'#ffffff','#f8fafc':'#f8fafc','#e2e8f0':'#e2e8f0','#cbd5e1':'#cbd5e1','#94a3b8':'#94a3b8','蓝 #7db0ff':'#7db0ff','蓝 #4d94ff':'#4d94ff'};
for (const a of [0.55,0.62,0.70]) {
  console.log('=== 深玻璃 alpha '+a+' ===');
  for (const f in frames) {
    const bg=hx(base.map((v,i)=>v*a+frames[f][i]*(1-a)));
    console.log('  '+f+' 底 '+bg+' | '+Object.entries(inks).map(([k,v])=>k+' '+R(v,bg)).join(' / '));
  }
}
console.log('\n=== 开关（无白晕）在深玻璃上 ===');
for (const a of [0.70]) {
  const card=hx(base.map((v,i)=>v*a+255*(1-a)));  // 最坏：纯白帧
  const cardD=hx(base.map((v,i)=>v*a+[16,20,24][i]*(1-a)));
  const track='#4a5158', track2='#5b636b';
  console.log('card on白帧 '+card+' / 暗帧 '+cardD);
  for (const t of [track,track2]) {
    console.log('  轨道 '+t+' vs 白帧卡 '+R(t,card)+' | vs 暗帧卡 '+R(t,cardD)+' | 白旋钮 vs 轨道 '+R('#ffffff',t));
  }
  console.log('  开态 #0066ff vs 白帧卡 '+R('#0066ff',card)+' | 白旋钮 vs 开态 '+R('#ffffff','#0066ff'));
  console.log('  开态 #2f7bff vs 白帧卡 '+R('#2f7bff',card)+' | 白旋钮 vs 它 '+R('#ffffff','#2f7bff'));
}
console.log('\n=== 蓝药丸在深色面板上 ===');
for (const b of ['#0066ff','#1a6dff','#0f62fe']) {
  console.log(b+': 白字 '+R('#ffffff',b)+' | 对白帧卡 '+R(b,hx(base.map((v,i)=>v*0.70+255*(1-0.70)))));
}
