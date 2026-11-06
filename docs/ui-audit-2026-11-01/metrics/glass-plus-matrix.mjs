
const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const L=h=>{h=h.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)};
const R=(a,b)=>{const x=L(a),y=L(b);const hi=Math.max(x,y),lo=Math.min(x,y);return Math.round(((hi+0.05)/(lo+0.05))*100)/100};
const hx=n=>'#'+n.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const frames={'黑场':[0,0,0],'暗帧':[16,20,24],'亮帧':[216,222,230],'纯白':[255,255,255]};
const white=(a,f)=>hx(f.map(v=>255*a+v*(1-a)));
const inks=['#0f172a','#1e293b','#334155','#475569','#64748b'];
const alphas=[0.20,0.35,0.46,0.55,0.62,0.70,0.78,0.87];
console.log('alpha | 黑场底 | ' + inks.join('  '));
for(const a of alphas){
  const row=[];
  for(const f in frames){const bg=white(a,frames[f]);row.push(f+' '+bg+': '+inks.map(i=>R(i,bg)).join('/'));}
  console.log(a.toFixed(2)+' | '+row.join('   '));
}
console.log('\n=== 开关/图形在三档卡片上的表现（描边 vs 卡片底） ===');
for(const a of [0.20,0.62,0.87]){
  const bg=white(a,[0,0,0]);
  console.log('card '+a+': 底 '+bg+
    ' | off填#828d9f vs底 '+R('#828d9f',bg)+
    ' | 描边#334155 '+R('#334155',bg)+
    ' | 描边#475569 '+R('#475569',bg)+
    ' | 旋钮白 vs off填 '+R('#ffffff','#828d9f')+
    ' | 蓝#0066ff '+R('#0066ff',bg)+
    ' | 蓝#0052d9 '+R('#0052d9',bg));
}
console.log('\n=== 文字托 0.90 上的表现（托浮在任意底之上都不变？） ===');
const bed=hx([0,0,0].map(v=>255*0.90+v*0.10));
console.log('托合成底(黑场)=',bed, inks.map(i=>i+' '+R(i,bed)).join(' / '));
const bed2=hx([255,255,255].map(v=>255*0.90+v*0.10));
console.log('托合成底(白场)=',bed2, inks.map(i=>i+' '+R(i,bed2)).join(' / '));
console.log('\n=== 深玻璃 rgba(16,20,26,a) + 白字，白场最坏 ===');
for(const a of [0.55,0.62,0.70,0.78]){
  const bg=hx([16,20,26].map((v,i)=>v*a+255*(1-a)));
  console.log('a='+a+' 白场底 '+bg+' 白字 '+R('#ffffff',bg)+' | #e2e8f0 '+R('#e2e8f0',bg)+' | #cbd5e1 '+R('#cbd5e1',bg));
}
