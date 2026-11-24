// Art sheets (Nov 25, Jeremy): every picture in the game, labelled, in three PDFs at full resolution.
// Each image is embedded from its source file in src/art at its own pixel size (PDF keeps the pixels; the page only
// sets how big it prints). usage: node build.js && node tools/art/art_sheets.js [outDir]  (default docs/art_sheets/)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..'), ART = path.join(ROOT, 'src/art');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs/art_sheets'));
fs.mkdirSync(OUT, { recursive: true });
const asset = fs.readFileSync(path.join(ROOT, 'src/assets.js'), 'utf8');
// "name": "art:PATH" pairs inside one const block
function block(name){ const i = asset.indexOf(`const ${name} = `); if(i<0) return []; const j = asset.indexOf('\n];', i) > 0 && asset[asset.indexOf('=', i)+2]==='[' ? asset.indexOf('\n];', i) : asset.indexOf('\n};', i);
  const t = asset.slice(i, j), out = [];
  for(const m of t.matchAll(/(?:(['"])((?:\\.|(?!\1).)*)\1\s*:\s*)?"art:([^"]+)"/g)) out.push({ name: m[2] ? m[2].replace(/\\'/g,"'") : null, file: m[3] });
  return out; }
const { imageSize } = (()=>{ // PNG/JPEG/WebP size without dependencies
  function imageSize(f){ const b = fs.readFileSync(f);
    if(b.slice(1,4).toString()==='PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
    if(b.slice(0,4).toString()==='RIFF'){ const c = b.slice(12,16).toString();
      if(c==='VP8X') return [1 + b.readUIntLE(24,3), 1 + b.readUIntLE(27,3)];
      if(c==='VP8L'){ const n = b.readUInt32LE(21); return [(n & 0x3FFF)+1, ((n>>14) & 0x3FFF)+1]; }
      if(c==='VP8 ') return [b.readUInt16LE(26) & 0x3FFF, b.readUInt16LE(28) & 0x3FFF]; }
    let o = 2; while(o < b.length){ const m = b[o+1], L = b.readUInt16BE(o+2); if(m>=0xC0 && m<=0xCF && m!==0xC4 && m!==0xC8 && m!==0xCC) return [b.readUInt16BE(o+7), b.readUInt16BE(o+5)]; o += 2 + L; }
    return [0,0]; }
  return { imageSize }; })();
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const css = `@page{ size:Letter landscape; margin:0.4in; } *{ box-sizing:border-box; } body{ font-family:Georgia, serif; color:#241c10; margin:0; }
 h1{ font-size:26px; margin:0 0 4px; } .sub{ color:#6b5a42; font-size:12px; margin:0 0 14px; } h2{ font-size:17px; margin:18px 0 8px; padding-bottom:3px; border-bottom:2px solid #241c10; break-after:avoid; }
 .grid{ display:flex; flex-wrap:wrap; gap:12px; } .card{ break-inside:avoid; border:1.5px solid #241c10; border-radius:8px; padding:6px; width:var(--w); background:#fbf6ea; }
 .card .pic{ height:var(--h); display:flex; align-items:center; justify-content:center; background:#e9dfc9; border-radius:5px; } .card img{ max-width:100%; max-height:100%; image-rendering:auto; }
 .card b{ display:block; font-size:12px; margin-top:5px; line-height:1.15; } .card small{ display:block; font-size:9.5px; color:#6b5a42; line-height:1.25; } .big{ --w:100%; } .big .pic{ height:auto; } .big img{ max-height:6.4in; }`;
const card = (src, title, lines, w, h)=> `<div class="card" style="--w:${w};--h:${h}"><div class="pic"><img src="file://${src}"></div><b>${esc(title)}</b>${lines.map(l=>`<small>${esc(l)}</small>`).join('')}</div>`;
const meta = f => { const [w,h] = imageSize(path.join(ART, f)); return `${w} x ${h} px, ${path.basename(f)}`; };
(async()=>{
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(ROOT, 'dist/dungeon_scramble.html')); await p.waitForTimeout(400);
  const info = await p.evaluate(()=>{ const m = {};
    const add = (list, floor, kind)=> (list||[]).forEach(e=>{ m[e.name] = { floor, type:e.type, tier:(typeof encounterTier==='function'?encounterTier(e):''), hp:e.health, kind }; });
    [[FLOOR1_ENEMIES,1],[FLOOR2_ENEMIES,2],[FLOOR3_ENEMIES,3]].forEach(([l,f])=>add(l,f,'Enemy'));
    [[typeof FLOOR1_TRAPS!=='undefined'?FLOOR1_TRAPS:[],1],[typeof FLOOR2_TRAPS!=='undefined'?FLOOR2_TRAPS:[],2],[typeof FLOOR3_TRAPS!=='undefined'?FLOOR3_TRAPS:[],3]].forEach(([l,f])=>add(l,f,'Trap'));
    FLOORS.forEach((fl,i)=>{ add(fl.bosses,i+1,'Boss'); add(fl.shrines,i+1,'Shrine'); }); add(BIG_BOSSES,3,'Big Boss');
    const loot = {}; [['Alloy',ALLOY],['Gilded',GILDED],['Magic',MAGIC]].forEach(([t,l])=>l.forEach(d=>{ loot[d.name] = { tier:t, faces:d.faces.map(f=>f.type==='blank'?'blank':(LABEL[f.type]||f.type)+(f.value?' '+f.value:'')).join(', ') }; }));
    const origins = ORIGINS.map(o=>({id:o.id, name:o.name})); return { m, loot, origins }; });
  await b.close();
  const pdf = async (file, title, body)=>{ const html = `<!doctype html><meta charset="utf-8"><style>${css}</style><h1>${esc(title)}</h1><p class="sub">Dungeon Scramble art, ${new Date().toISOString().slice(0,10)}. Every image is embedded at its full source resolution; the caption gives its pixel size and file.</p>${body}`;
    const hp = path.join(OUT, file.replace('.pdf','.html')); fs.writeFileSync(hp, html);
    const b2 = await chromium.launch(); const p2 = await b2.newPage(); await p2.goto('file://' + hp); await p2.waitForTimeout(800);
    await p2.pdf({ path: path.join(OUT, file), format:'Letter', landscape:true, printBackground:true, preferCSSPageSize:true }); await b2.close(); fs.unlinkSync(hp); };
  // 1. Monsters, traps, bosses, shrines: by floor, then kind
  const mons = block('MONSTER_ART');
  const order = { 'Enemy':0, 'Trap':1, 'Shrine':2, 'Boss':3, 'Big Boss':4 };
  let body = '';
  for(const f of [1,2,3,0]){ const list = mons.filter(x=> ((info.m[x.name]||{}).floor||0)===f).sort((a,c)=> (order[(info.m[a.name]||{}).kind]??9)-(order[(info.m[c.name]||{}).kind]??9) || a.name.localeCompare(c.name));
    if(!list.length) continue; body += `<h2>${f ? 'Floor '+f : 'Other'} (${list.length})</h2><div class="grid">` + list.map(x=>{ const i = info.m[x.name]||{};
      return card(path.join(ART,x.file), x.name, [[i.kind, i.tier && i.kind!=='Shrine' ? i.tier[0].toUpperCase()+i.tier.slice(1) : '', i.hp ? i.hp+' HP' : ''].filter(Boolean).join(' · '), meta(x.file)], 'calc((100% - 48px)/5)', '1.45in'); }).join('') + '</div>'; }
  await pdf('1_Monsters_and_Bosses.pdf', 'Monsters, Traps, Shrines and Bosses', body);
  // 2. Adventurers + cover/logo
  body = '<h2>Cover and logo</h2><div class="grid">' + card(path.join(ART,'COVER_ART.jpeg'), 'Cover art', ['Title screen and store cover', meta('COVER_ART.jpeg')], '4.2in', '5in') + card(path.join(ART,'LOGO_IMG.png'), 'Logo', [meta('LOGO_IMG.png')], '4.2in', '2in') + card(path.join(ART,'GNOME_SILHOUETTE.png'), 'Mystery figure', ['Locked or unknown adventurer', meta('GNOME_SILHOUETTE.png')], '2in', '1.6in') + '</div>';
  for(const o of info.origins){ const list = block(o.id.toUpperCase()+'_PORTRAITS'); if(!list.length) continue;
    body += `<h2>${o.name} portraits (${list.length})</h2><div class="grid">` + list.map((x,k)=> card(path.join(ART,x.file), `${o.name} ${k+1}`, [meta(x.file)], 'calc((100% - 60px)/6)', '1.45in')).join('') + '</div>'; }
  await pdf('2_Adventurers_Cover_and_Logo.pdf', 'Adventurers, Cover and Logo', body);
  // 3. Loot by tier
  const loot = block('LOOT_ART'); body = '';
  for(const t of ['Alloy','Gilded','Magic', null]){ const list = loot.filter(x=> ((info.loot[x.name]||{}).tier||null)===t).sort((a,c)=>a.name.localeCompare(c.name));
    if(!list.length) continue; body += `<h2>${t ? t+' loot' : 'Other'} (${list.length})</h2><div class="grid">` + list.map(x=> card(path.join(ART,x.file), x.name, [(info.loot[x.name]||{}).faces||'', meta(x.file)], 'calc((100% - 60px)/6)', '1.35in')).join('') + '</div>'; }
  await pdf('3_Loot.pdf', 'Loot Dice Art', body);
  console.log('wrote', OUT, mons.length, 'monsters,', loot.length, 'loot');
})();
