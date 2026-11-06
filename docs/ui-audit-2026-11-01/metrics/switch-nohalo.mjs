
const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const L=h=>{h=h.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)};
const R=(a,b)=>{const x=L(a),y=L(b);const hi=Math.max(x,y),lo=Math.min(x,y);return Math.round(((hi+0.05)/(lo+0.05))*100)/100};
const hx=n=>'#'+n.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const over=(fg,a,bg)=>fg.map((v,i)=>Math.round(v*a+bg[i]*(1-a)));
const hex2=h=>{h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]};
const card=hx(over([255,255,255],0.62,[0,0,0]));           // 0.62 卡片，黑场
const cardD=hx(over([255,255,255],0.62,[16,20,24]));
const off='#828d9f', on='#0066ff';
for (const a of [0.60,0.70,0.80]){
  const ringOff=hx(over(hex2('#0f172a'),a,hex2(off)));
  const ringOn=hx(over(hex2('#0f172a'),a,hex2(on)));
  console.log('ring α='+a+' | 黑场卡片 '+card+' → 关态环 '+ringOff+' vs卡 '+R(ringOff,card)+' | 开态环 '+ringOn+' vs卡 '+R(ringOn,card)+' | 暗帧卡 '+cardD+' 关环 '+R(ringOff,cardD)+' 开环 '+R(ringOn,cardD));
}
console.log('旋钮白 vs 关态填充', R('#ffffff',off), '| vs 开态填充', R('#ffffff',on));
console.log('关/开填充彼此', R(off,on), '（状态区分靠旋钮位置）');
console.log('关态填充 vs 0.62 卡片', R(off,card), '| 开态填充 vs 卡片', R(on,card));
