
const lum=(c)=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])};
const h2r=h=>{h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]};
const r=(a,b)=>{const l1=lum(h2r(a)),l2=lum(h2r(b));return +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)).toFixed(2))};
const pairs=[
 ['卡片副标题 #64748b / 卡片底 #f4f4f5','#64748b','#f4f4f5','text'],
 ['卡片副标题 像素采样 p05 #8591a3 / #f4f4f5','#8591a3','#f4f4f5','text'],
 ['卡片标题 #0f172a / #efeff0','#0f172a','#efeff0','text'],
 ['面板标题 #0f172a / 头部底 #f9fbfa','#0f172a','#f9fbfa','text'],
 ['蓝色徽标 #0066ff / 面板头底 #efeeef','#0066ff','#efeeef','text'],
 ['switch OFF 轨道 #d6d6d6 / 条目底 #f8f9f9','#d6d6d6','#f8f9f9','nontext'],
 ['switch OFF 轨道 #d6d6d6 / 卡片底 #efeff0','#d6d6d6','#efeff0','nontext'],
 ['switch OFF 旋钮 #ffffff / 轨道 #d6d6d6','#ffffff','#d6d6d6','nontext'],
 ['switch ON 轨道 #0066ff / 条目底 #f8f9f9','#0066ff','#f8f9f9','nontext'],
 ['switch ON 旋钮 #ffffff / 轨道 #0066ff','#ffffff','#0066ff','nontext'],
 ['面板关闭 × #475569 / 按钮底 #e6e7e7','#475569','#e6e7e7','text'],
 ['Dock 图标 #334155 / 磁贴底 #eaf0ee','#334155','#eaf0ee','nontext'],
 ['Dock 图标(选中) #0066ff / 白底 #ffffff','#0066ff','#ffffff','nontext'],
 ['主按钮白字 #ffffff / 蓝底 #0066ff','#ffffff','#0066ff','text'],
 ['主按钮 disabled 白字 #ffffff / #94a3b8','#ffffff','#94a3b8','text'],
 ['条目底 #f8f9f9 / 卡片底 #efeff0（层级）','#f8f9f9','#efeff0','surface'],
 ['卡片底 #f4f4f5 / 面板正文底 #f9fbfa（层级）','#f4f4f5','#f9fbfa','surface'],
 ['建议：switch OFF 边界 rgba(15,23,42,0.55)→#787d87 / #f8f9f9','#787d87','#f8f9f9','nontext'],
 ['建议：副标题 #475569 / #f4f4f5','#475569','#f4f4f5','text'],
 ['建议：徽标 #0052cc / #efeeef','#0052cc','#efeeef','text'],
];
const rows = pairs.map(([name,fg,bg,kind])=>{
  const ratio=r(fg,bg);
  return { name, fg, bg, kind, ratio,
    pass_text_AA: kind==='text' ? ratio>=4.5 : null,
    pass_nontext_3_1: kind==='nontext' ? ratio>=3 : null };
});
console.log(JSON.stringify({ method: 'WCAG 2.x 相对亮度；前景取 CSS 声明色或实测像素众数，背景取实测像素众数（玻璃拟态下随视频画面浮动 ±0.3）', rows }, null, 2));
