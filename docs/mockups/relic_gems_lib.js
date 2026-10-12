
const FAM = {
  offense:{c:'#c94a3a', d:'#7a241b', l:'#f28b74', name:'Offense'},
  defense:{c:'#4a7a9e', d:'#22405a', l:'#9cc6e6', name:'Defense'},
  path:   {c:'#4a8a5c', d:'#1f4a2b', l:'#9fd8a8', name:'Path'},
  loot:   {c:'#d4a017', d:'#7a5a08', l:'#ffe08a', name:'Loot & tempo'},
  origin: {c:'#8a5fb0', d:'#47296a', l:'#d4b3f2', name:'Origin'},
};
// Glyphs on a 24x24 grid: strokes in the "ink" color. Each also has a constellation (star points + links).
const R = {
  prime:  {n:'Prime Edge', f:'offense', d:'Your first Hit each turn deals +2 damage.', num:'II',
    g:'<path d="M12 2.5 L15 13 L12 18 L9 13 Z"/><path d="M7 15.5 H17"/><path d="M12 18 V21.5"/>',
    st:[[12,3],[14.5,11],[12,16.5],[9.5,11],[6.5,16],[17.5,16],[12,21]], ln:[[0,1],[1,2],[2,3],[3,0],[4,2],[2,5],[2,6]]},
  mantle: {n:'Minus-One Mantle', f:'defense', d:'Every enemy attack deals 1 less damage.', num:'IV',
    g:'<path d="M12 3 L19.5 6 V12 C19.5 16.5 16 19.5 12 21 C8 19.5 4.5 16.5 4.5 12 V6 Z"/><path d="M8.5 12 H15.5"/>',
    st:[[12,3],[19,6],[19,12.5],[12,20.5],[5,12.5],[5,6],[9,12],[15,12]], ln:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[6,7]]},
  ftl:    {n:'FTLeporter', f:'path', d:'Your Pivots can teleport: the next step may go to any die.', num:'XIX',
    g:'<path d="M4 18 Q12 1 20 18"/><path d="M16.5 16.5 L20 18 L20.8 14.2"/><circle cx="4" cy="18.5" r="1.6"/>',
    st:[[4,18],[7,10.5],[12,7],[17,10.5],[20,18]], ln:[[0,1],[2,3],[3,4]], dash:[[1,2]]},
  greed:  {n:'Need Before Greed', f:'loot', d:'Loot rewards offer +1 die to choose from.', num:'IV',
    g:'<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5 L17 15.5 H7 Z"/><path d="M12 6.5 V15.5"/>',
    st:[[12,4],[19.5,9],[17.5,18],[6.5,18],[4.5,9],[12,12]], ln:[[0,1],[1,2],[2,3],[3,4],[4,0],[0,5],[2,5],[3,5]]},
  giant:  {n:'Giant Killer', f:'loot', d:'Start each boss fight with a Freeze token.', num:'XX',
    g:'<path d="M12 3 V21"/><path d="M4.2 7.5 L19.8 16.5"/><path d="M4.2 16.5 L19.8 7.5"/><path d="M9.5 4.5 L12 7 L14.5 4.5"/><path d="M9.5 19.5 L12 17 L14.5 19.5"/>',
    st:[[12,3],[12,21],[4.5,7.5],[19.5,16.5],[4.5,16.5],[19.5,7.5],[12,12]], ln:[[0,6],[6,1],[2,6],[6,3],[4,6],[6,5]]},
  coffee: {n:'Fine Coffee', f:'origin', d:'Heal faces heal +2 and H.O.T. faces add +1 H.O.T.', num:'Halfling',
    g:'<path d="M5 10 H16 V15 C16 18 14 20 10.5 20 C7 20 5 18 5 15 Z"/><path d="M16 11.5 C20 11.5 20 16 16 16"/><path d="M8.5 3.5 C7.5 5 9.5 6 8.5 7.5"/><path d="M12.5 3.5 C11.5 5 13.5 6 12.5 7.5"/>',
    st:[[5,10],[16,10],[15.5,16.5],[10.5,20],[5.5,16.5],[19,13.5],[9,5],[13,4]], ln:[[0,1],[1,2],[2,3],[3,4],[4,0],[1,5],[5,2],[6,0],[7,1]]},
  klein:  {n:'Klein Bottle', f:'defense', d:'+8 maximum health, right now.', num:'VIII',
    g:'<path d="M9 21 C3 21 3 11 9 11 C11 11 11.5 9 11.5 7 V4"/><path d="M14.5 4 V7 C14.5 9.5 15 11 17 11.5 C21 12.5 21 21 15 21 H9"/><path d="M11.5 7 C13 9 18 6 19 3"/>',
    st:[[11.5,4],[14.5,4],[17,11.5],[15,21],[9,21],[5,15.5],[9,11],[19,3]], ln:[[0,6],[6,5],[5,4],[4,3],[3,2],[2,1],[0,7]]},
  combo:  {n:'Combonatorics', f:'offense', d:'Combo dice also count diagonal neighbors.', num:'IX',
    g:'<circle cx="5" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="2.4"/><circle cx="19" cy="12" r="1.6"/><circle cx="5" cy="19" r="1.6"/><circle cx="12" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.6"/><path d="M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5"/>',
    st:[[5,5],[12,5],[19,5],[5,12],[12,12],[19,12],[5,19],[12,19],[19,19]], ln:[[0,4],[4,8],[2,4],[4,6],[1,4],[3,4],[4,5],[4,7]]},
};
const svgWrap = (w,h,vb,inner)=>`<svg width="${w}" height="${h}" viewBox="${vb}" style="display:block;flex:0 0 auto;overflow:visible">${inner}</svg>`;
const glyph = (r, color, sw, tf='')=>`<g transform="${tf}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${r.g}</g>`;

// 4. Gem: shape by family, glyph engraved on the table
const GEMSHAPE = {
  offense: [[50,6],[94,86],[6,86]],                       // trillion (triangle)
  defense: [[14,8],[86,8],[94,16],[94,84],[86,92],[14,92],[6,84],[6,16]], // emerald cut
  path:    [[50,4],[92,27],[92,73],[50,96],[8,73],[8,27]], // hexagon
  loot:    null,                                           // round brilliant
  origin:  [[50,4],[80,26],[92,52],[50,96],[8,52],[20,26]], // kite / shield
};
function gem(k, size, socket){
  const r=R[k], F=FAM[r.f], sh=GEMSHAPE[r.f];
  let outer, table, facets='';
  const cx=50, cy = r.f==='offense'?60:50;
  if(sh){
    outer = `<polygon points="${sh.map(p=>p.join(',')).join(' ')}" fill="url(#g_${k})" stroke="#0c0705" stroke-width="5" stroke-linejoin="round"/>`;
    const tb = sh.map(([x,y])=>[cx+(x-cx)*0.52, cy+(y-cy)*0.52]);
    table = `<polygon points="${tb.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="${F.c}" stroke="${F.d}" stroke-width="2"/>`;
    facets = sh.map((p,i)=>`<line x1="${p[0]}" y1="${p[1]}" x2="${tb[i][0]}" y2="${tb[i][1]}" stroke="${F.d}" stroke-width="2"/>`).join('');
  } else {
    outer = `<circle cx="50" cy="50" r="45" fill="url(#g_${k})" stroke="#0c0705" stroke-width="5"/>`;
    const n=8, tb=[]; for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+Math.PI/8; tb.push([50+24*Math.cos(a),50+24*Math.sin(a)]); }
    table = `<polygon points="${tb.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="${F.c}" stroke="${F.d}" stroke-width="2"/>`;
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+Math.PI/8; facets+=`<line x1="${tb[i][0]}" y1="${tb[i][1]}" x2="${50+42*Math.cos(a)}" y2="${50+42*Math.sin(a)}" stroke="${F.d}" stroke-width="2"/>`; }
  }
  const sc = r.f==='offense'?1.15:1.45;
  const inner = `<defs><radialGradient id="g_${k}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${F.l}"/><stop offset=".55" stop-color="${F.c}"/><stop offset="1" stop-color="${F.d}"/></radialGradient></defs>
    ${socket?`<circle cx="50" cy="${cy}" r="52" fill="#b8844a" stroke="#0c0705" stroke-width="5"/><circle cx="50" cy="${cy}" r="44" fill="#4c3119" stroke="#0c0705" stroke-width="2"/>`:''}
    ${outer}${facets}${table}
    ${glyph(r, '#fff1d6', 2.4, `translate(${cx-12*sc} ${cy-12*sc}) scale(${sc})`)}
    <path d="M24 26 L36 18" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>`;
  return svgWrap(size,size,'-6 -6 112 112',inner);
}
