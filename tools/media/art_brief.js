// Art brief sheet (Nov 25, Jeremy: a transparent PNG with the images to make, placeholders and boundary boxes).
// Every box is the exact pixel size the file should be (1:1), with the current placeholder drawn inside and the file name,
// size and notes above it. usage: node build.js && node tools/media/art_brief.js -> docs/release/media/art_brief.png
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..'), OUT = path.join(ROOT, 'docs/release/media'); fs.mkdirSync(OUT, { recursive: true });
const ITEMS = [
  { key: 'ranger', file: 'CLASS_PROP__ranger.png', w: 240, h: 240, title: 'Pointer, sitting (Ranger)', note: 'Grey schnauzer: bushy brows, long beard, red collar + gold tag. Faces the viewer, sits by the hero\'s left foot.' },
  { key: 'token', file: 'PET_TOKEN__pointer.png', w: 128, h: 128, title: 'Pointer\'s head (die token)', note: 'Same dog, head only. Shown ~31 px in a die\'s corner: keep it bold and simple.' },
  { key: 'engineer', file: 'CLASS_PROP__engineer.png', w: 240, h: 240, title: '3D printer (Engineer)', note: 'Small desktop printer, a die being printed (blueprint blue).' },
  { key: 'alchemist', file: 'CLASS_PROP__alchemist.png', w: 240, h: 240, title: 'Cauldron (Alchemist)', note: 'Bubbling green brew, a few bubbles rising.' },
  { key: 'medic', file: 'CLASS_PROP__medic.png', w: 240, h: 240, title: 'Field kit (Field Medic)', note: 'Satchel or case with the Heal heart. No red cross (protected emblem).' },
  { key: 'trickster', file: 'CLASS_PROP__trickster.png', w: 240, h: 240, title: 'Deck of cards (Trickster)', note: 'Two or three fanned cards; any suits but no real-brand designs.' },
  { key: 'inverse', file: 'LOOT_ART__Additive_Inverse.png', w: 220, h: 220, title: 'Additive Inverse (secret die)', note: 'Item art for the dark violet die from the Easter egg fight: something "times minus one".' },
  { key: 'fetch', file: 'CLASS_PROP__ranger_fetch.png', w: 240, h: 240, title: 'Pointer running (optional)', note: 'For a Fetch! animation later. Side view, ears flying.' },
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 1200 } });
  await p.goto('file://' + path.join(ROOT, 'dist/release/dungeon_scramble.html')); await p.waitForTimeout(1200);
  const box = await p.evaluate(ITEMS => {
    const tok = (document.createElement('div')); tok.innerHTML = (typeof renderDie === 'function') ? '' : '';
    const svg = k => k === 'token' ? `<svg viewBox="0 0 40 40" width="100%" height="100%">${(document.querySelector('.pet-token') || {}).innerHTML || ''}</svg>` : (CLASS_PROP_SVG[k] || '');
    // Pointer's token markup lives in renderDie; pull it from a Ranger tray
    try { newGame('dwarf', 'ranger'); S.guide = null; S.petIdx = 0; } catch (e) {}
    const tray = S && S.tray ? renderDie(S.tray[0], 0, null) : ''; const m = tray.match(/<svg class="pet-token"[\s\S]*?<\/svg>/);
    const pieces = ITEMS.map(it => {
      let art = it.key === 'token' ? (m ? m[0].replace('class="pet-token"', 'width="100%" height="100%"') : '') : it.key === 'inverse' ? `<div class="ph-die"><span>-1</span></div>` : it.key === 'fetch' ? '<div class="ph-text">(not drawn yet)</div>' : CLASS_PROP_SVG[it.key].replace('<svg ', '<svg width="100%" height="100%" ');
      return `<div class="it"><div class="lbl"><b>${it.title}</b><br><code>${it.file}</code> &middot; ${it.w}&times;${it.h} px, transparent<br><span>${it.note}</span></div>
        <div class="bx" style="width:${it.w}px;height:${it.h}px"><div class="art">${art}</div><i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i><em>${it.w}&times;${it.h}</em></div></div>`; }).join('');
    document.documentElement.style.background = 'transparent';
    document.body.innerHTML = `<div id="sheet"><h1>Dungeon Scramble: art to make</h1><p class="sub">Each dashed box is the file's exact size (1:1). The drawing inside is the placeholder in the game now. Black outlines about 6 px at this size (the game's chunky look), transparent backgrounds, paper texture added later by tools/art/paper.py.</p><div class="grid">${pieces}</div></div>`;
    const st = document.createElement('style'); st.textContent = `
      html, body{ background:transparent !important; margin:0; } body::before, body::after{ display:none !important; }
      #sheet{ position:absolute; left:0; top:0; padding:28px; width:1040px; font-family:'Alegreya', Georgia, serif; color:#2b1d14; }
      #sheet h1{ font:400 34px 'Metamorphous', Georgia, serif; margin:0 0 6px; color:#2b1d14; -webkit-text-stroke:5px #fff; paint-order:stroke fill; }
      .sub{ margin:0 0 22px; font-size:15px; max-width:900px; -webkit-text-stroke:3px #fff; paint-order:stroke fill; }
      .grid{ display:flex; flex-wrap:wrap; gap:30px 34px; align-items:flex-end; }
      .it{ width:300px; display:flex; flex-direction:column; gap:8px; }
      .lbl{ font-size:13.5px; line-height:1.3; -webkit-text-stroke:3px #fff; paint-order:stroke fill; } .lbl b{ font-size:16px; } .lbl code{ font:700 12.5px ui-monospace, Menlo, monospace; color:#7a1f14; } .lbl span{ color:#4a3527; }
      .bx{ position:relative; border:2px dashed #d0565a; box-sizing:content-box; }
      .bx .art{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; opacity:.9; }
      .bx em{ position:absolute; right:4px; bottom:2px; font:700 11px ui-monospace, Menlo, monospace; color:#d0565a; font-style:normal; -webkit-text-stroke:3px #fff; paint-order:stroke fill; }
      .bx .c{ position:absolute; width:12px; height:12px; border:3px solid #d0565a; } .tl{ left:-3px; top:-3px; border-right:0 !important; border-bottom:0 !important; } .tr{ right:-3px; top:-3px; border-left:0 !important; border-bottom:0 !important; } .bl{ left:-3px; bottom:-3px; border-right:0 !important; border-top:0 !important; } .br{ right:-3px; bottom:-3px; border-left:0 !important; border-top:0 !important; }
      .ph-die{ width:62%; aspect-ratio:1; border-radius:18%; background:linear-gradient(160deg,#3a2a52,#150f1f); border:6px solid #0c0705; display:flex; align-items:center; justify-content:center; outline:3px solid #9b7bd6; outline-offset:-14px; }
      .ph-die span{ font:400 54px 'Metamorphous', serif; color:#efe3ff; }
      .ph-text{ font-size:14px; color:#8a6a4a; font-style:italic; -webkit-text-stroke:3px #fff; paint-order:stroke fill; }`;
    document.head.appendChild(st);
    const r = document.getElementById('sheet').getBoundingClientRect(); return { w: Math.ceil(r.width), h: Math.ceil(r.height) };
  }, ITEMS);
  await p.setViewportSize({ width: box.w, height: box.h }); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'art_brief.png'), omitBackground: true, clip: { x: 0, y: 0, width: box.w, height: box.h } });
  await b.close(); console.log('art_brief.png', box);
})();
