// Text audit (Nov 25, Jeremy: "a kerning and padding audit for all strings and characters"). Visits every screen of
// the picture check (plus a few pop-ups) at both phones and the PC layout, measures every piece of visible text and
// reports: CLIP (text cut off by its box or a scroll edge), TIGHT (text closer than 3 px to the edge of the chip, button
// or panel it sits in; 1 px vertically), COVER (a badge or pseudo-element on top of the text), SPACING (negative
// letter-spacing or kerning turned off) and STROKE (an outline thicker than 9% of the font size, which crowds letters).
// usage: node build.js && node tools/audit_text.js [out.json]   (prints a summary; crops land in tools/audit_out/)
process.env.DS_STYLEDUMP = '1';
const path = require('path'), fs = require('fs');
const { SCREENS, INIT, HELP, URL_ } = require('./tests/test_screens.js');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const OUT = path.join(__dirname, 'audit_out'); fs.mkdirSync(OUT, { recursive: true });
const EXTRA = [
  ['setup-locked', () => { META.lifetime.victories = 1; preGameScreen = 'setup'; S = null; render(); const t = document.querySelectorAll('#class-tab-row .class-tab-btn.locked'); if (t[2]) t[2].click(); }],
  ['quest-poster', () => { __fight(); render(); __clean(); openQuestPoster(); }],
  ['achievements', () => { preGameScreen = 'title'; S = null; render(); openRecordsModal('achievements'); }],
  ['inverse', () => { __fight(); S.floorIdx = 1; S.inverseFloor = 1; S.inverseMet = false; S.encounter = makeInverseEncounter(); S.encounter = (()=>{ const o = window.drawRoomCard; window.drawRoomCard = () => FLOOR2_ENEMIES[0]; const e = drawEncounter('enc'); window.drawRoomCard = o; return e; })(); render(); }],
  ['loot-inverse', () => { __fight(); S.floorIdx = 1; S.inverseFloor = 1; S.inverseMet = false; const o = window.drawRoomCard; window.drawRoomCard = () => FLOOR2_ENEMIES[0]; S.encounter = drawEncounter('enc'); window.drawRoomCard = o; S.encounter.curHealth = 0; onEncounterDefeated(); render(); }],
];
const SIZES = [[395, 769, false], [360, 722, false], [1375, 947, true]];

// runs in the page: returns the issues on the current screen
function scan() {
  const issues = [], seen = new Set();
  const vis = el => { for (let n = el; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return true; };
  const path = el => { const p = []; for (let n = el; n && n !== document.body && p.length < 4; n = n.parentElement) p.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList.length ? '.' + [...n.classList].slice(0, 2).join('.') : '')); return p.join(' > '); };
  const isBox = (el) => { const cs = getComputedStyle(el); const bg = cs.backgroundColor, hasBg = bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg);
    const bw = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderTopWidth); return hasBg || cs.backgroundImage !== 'none' || bw > 0; };
  const zoomOf = el => (el.currentCSSZoom || 1);
  const leaves = [...document.querySelectorAll('body *')].filter(el => !['SCRIPT', 'STYLE', 'svg', 'SVG', 'TITLE'].includes(el.tagName) && !(el.closest('svg') && el.tagName !== 'text')
    && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  for (const el of leaves) {
    if (!vis(el)) continue;
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim().replace(/\s+/g, ' ');
    // the union of the text's line boxes
    const range = document.createRange(); let R = null;
    for (const n of el.childNodes) { if (n.nodeType !== 3 || !n.textContent.trim()) continue; range.selectNodeContents(n);
      for (const r of range.getClientRects()) { if (!r.width) continue; R = R ? { l: Math.min(R.l, r.left), t: Math.min(R.t, r.top), r: Math.max(R.r, r.right), b: Math.max(R.b, r.bottom) } : { l: r.left, t: r.top, r: r.right, b: r.bottom }; } }
    if (!R || R.r - R.l < 2) continue;
    if (R.b < 0 || R.t > innerHeight || R.r < 0 || R.l > innerWidth) continue; // off screen (scrolled lists)
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) * zoomOf(el);
    const key = (t, extra) => { const k = t + '|' + path(el) + '|' + txt.slice(0, 30) + (extra || ''); if (seen.has(k)) return false; seen.add(k); return true; };
    const add = (type, detail, box) => { if (key(type)) issues.push({ type, text: txt.slice(0, 60), font: cs.fontFamily.split(',')[0].replace(/"/g, ''), size: Math.round(fs * 10) / 10, where: path(el), detail, rect: box || { l: R.l, t: R.t, r: R.r, b: R.b } }); };
    // CLIP: an ancestor that clips (overflow other than visible) and doesn't contain the text, or an ellipsis
    for (let n = el, d = 0; n && n !== document.body && d < 6; n = n.parentElement, d++) {
      const ns = getComputedStyle(n); if (ns.overflowX === 'visible' && ns.overflowY === 'visible' && ns.clipPath === 'none') continue;
      if (ns.clipPath !== 'none' && ns.overflowX === 'visible') continue;
      const b = n.getBoundingClientRect();
      const cx = ns.overflowX !== 'visible', cy = ns.overflowY !== 'visible'; // overflow-x:clip doesn't clip vertically
      const out = Math.max(cx ? Math.max(b.left - R.l, R.r - b.right) : 0, cy ? Math.max(b.top - R.t, R.b - b.bottom) : 0);
      const scroller = /auto|scroll/.test(ns.overflowY + ns.overflowX) && (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1);
      if (out > 1.5 && !scroller) { add('CLIP', `cut by ${path(n).split(' > ').pop()} by ${out.toFixed(1)}px`); break; }
      if (ns.textOverflow === 'ellipsis' && n.scrollWidth > n.clientWidth + 1) { add('CLIP', 'ellipsis: ' + (n.scrollWidth - n.clientWidth) + 'px hidden'); break; }
    }
    // TIGHT: nearest box (self or ancestor within 3 levels) that is a chip/button/panel
    for (let n = el, d = 0; n && n !== document.body && d < 4; n = n.parentElement, d++) {
      if (!isBox(n)) continue;
      const b = n.getBoundingClientRect(), ns = getComputedStyle(n), z = zoomOf(n);
      if (b.width > innerWidth * 0.92 || b.height > 260) break; // big panels: text sits in its own padded blocks
      const bl = parseFloat(ns.borderLeftWidth) * z, br = parseFloat(ns.borderRightWidth) * z, bt = parseFloat(ns.borderTopWidth) * z, bb = parseFloat(ns.borderBottomWidth) * z;
      const gl = R.l - (b.left + bl), gr = (b.right - br) - R.r, gt = R.t - (b.top + bt), gb = (b.bottom - bb) - R.b;
      const rad = parseFloat(ns.borderTopLeftRadius) * z, minH = Math.max(3, Math.min(rad * 0.35, 8)); // round ends need more room
      if (gl < minH - 0.5 || gr < minH - 0.5) add('TIGHT', `side gap ${gl.toFixed(1)} / ${gr.toFixed(1)}px (want ${minH.toFixed(1)}) in ${path(n).split(' > ').pop()}`, { l: b.left, t: b.top, r: b.right, b: b.bottom });
      else if (gt < 0.5 || gb < 0.5) add('TIGHT', `top/bottom gap ${gt.toFixed(1)} / ${gb.toFixed(1)}px in ${path(n).split(' > ').pop()}`, { l: b.left, t: b.top, r: b.right, b: b.bottom });
      break;
    }
    // COVER: an absolutely placed ::before/::after (badges, locks) of this element or an ancestor box that lands on the text,
    // or another element painted on top at the text's middle line
    for (let n = el, d = 0; n && n !== document.body && d < 3; n = n.parentElement, d++) {
      for (const ps of ['::before', '::after']) { const pc = getComputedStyle(n, ps); if (pc.content === 'none' || pc.position !== 'absolute' || pc.display === 'none') continue;
        const w = parseFloat(pc.width), h = parseFloat(pc.height); if (!(w > 4 && h > 4) || w > 120) continue;
        const b = n.getBoundingClientRect(), z = zoomOf(n); const L = pc.left !== 'auto' ? b.left + parseFloat(pc.left) * z : b.right - parseFloat(pc.right) * z - w * z; const T = pc.top !== 'auto' ? b.top + parseFloat(pc.top) * z : b.bottom - parseFloat(pc.bottom) * z - h * z;
        const ox = Math.min(R.r, L + w * z) - Math.max(R.l, L), oy = Math.min(R.b, T + h * z) - Math.max(R.t, T);
        if (ox > 1.5 && oy > 2) add('COVER', `${ps} of ${path(n).split(' > ').pop()} covers ${ox.toFixed(1)}px`); }
    }
    { const my = (R.t + R.b) / 2; for (const fx of [0.08, 0.5, 0.92]) { const x = R.l + (R.r - R.l) * fx; const hit = document.elementFromPoint(x, my);
        if (!hit || el.contains(hit) || hit.contains(el)) continue; const hs = getComputedStyle(hit); if (+hs.opacity < 0.3) continue;
        if (hit.closest('.modal-overlay') && !el.closest('.modal-overlay')) continue; // the page under a pop-up
        if (hit.id === 'headline-strip' || hit.closest('#headline-strip')) continue;
        add('COVER', `${path(hit).split(' > ').slice(-2).join(' > ')} on top at ${Math.round(fx * 100)}%`); break; } }
    // SPACING / STROKE
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    if (ls < -0.25 * (fs / 12)) add('SPACING', `letter-spacing ${cs.letterSpacing}`);
    if (cs.fontKerning === 'none') add('SPACING', 'kerning off');
    const sw = parseFloat(cs.webkitTextStrokeWidth || 0); if (sw > 0 && sw / parseFloat(cs.fontSize) > 0.09) add('STROKE', `outline ${cs.webkitTextStrokeWidth} on ${cs.fontSize}`);
  }
  return issues;
}

(async () => {
  const browser = await chromium.launch(); const all = [];
  // does each bundled font kern? (the canvas width of "AV To Wa Ty" with kerning on vs off)
  { const p = await browser.newPage(); await p.goto(URL_); await p.waitForTimeout(800);
    console.log('KERNING TABLES', JSON.stringify(await p.evaluate(async () => { await document.fonts.ready; const c = document.createElement('canvas').getContext('2d'); const out = {};
      for (const f of ['Metamorphous', 'Alegreya']) { c.font = `40px "${f}"`; c.fontKerning = 'normal'; const a = c.measureText('AV To Wa Ty Yo LT').width; c.fontKerning = 'none'; const b = c.measureText('AV To Wa Ty Yo LT').width; out[f] = Math.round((b - a) * 10) / 10 + 'px tighter with kerning'; } return out; })));
    await p.close(); }
  for (const [w, h, pc] of SIZES) for (const [name, setup] of [...SCREENS, ...EXTRA]) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.addInitScript(INIT); await p.addInitScript(pc => { try { localStorage.setItem('dungeonScramblePC', pc ? '1' : '0'); } catch (e) {} }, pc);
    await p.goto(URL_ + (pc ? '?pc=1' : '')); await p.waitForTimeout(400);
    await p.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important}' });
    await p.evaluate(HELP);
    try { await p.evaluate(setup); } catch (e) { console.log('setup error', name, e.message.slice(0, 80)); }
    await p.waitForTimeout(350); await p.evaluate(() => { __clean(); document.querySelectorAll('#headline-strip').forEach(n => n.remove()); return document.fonts.ready; }); await p.waitForTimeout(150);
    let found = []; try { found = await p.evaluate(scan); } catch (e) { console.log('scan error', name, e.message.slice(0, 120)); }
    for (const it of found) { it.screen = name; it.view = `${w}x${h}`;
      const pad = 10, x = Math.max(0, it.rect.l - pad), y = Math.max(0, it.rect.t - pad), cw = Math.min(w - x, it.rect.r - it.rect.l + pad * 2), ch = Math.min(h - y, it.rect.b - it.rect.t + pad * 2);
      if (cw > 4 && ch > 4) { it.crop = `${all.length}_${name}_${w}.png`; try { await p.screenshot({ path: path.join(OUT, it.crop), clip: { x, y, width: cw, height: ch } }); } catch (e) { it.crop = null; } }
      all.push(it); }
    await p.close();
  }
  await browser.close();
  fs.writeFileSync(process.argv[2] || path.join(OUT, 'audit.json'), JSON.stringify(all, null, 1));
  const by = {}; all.forEach(i => { by[i.type] = (by[i.type] || 0) + 1; });
  console.log('issues', all.length, JSON.stringify(by));
})();
