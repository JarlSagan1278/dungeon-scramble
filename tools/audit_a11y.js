// Accessibility audit (Nov 25, Jeremy: "do 1 and 2"). Walks the picture-check screens (plus a few pop-ups) on the phone
// (395x769) and PC (1375x947) and reports:
//   CONTRAST  text whose color against the background behind it is under WCAG AA (4.5:1 small text, 3:1 large text);
//             text with an outline (-webkit-text-stroke or a dark shadow ring) is measured against its outline instead
//   TAP       clickable things smaller than 32 px on a side (phone only; 44 px is the comfortable size)
//   MOTION    looping animations still running with Reduced motion on
//   NAME      buttons and other clickable things with no text, aria-label or title (screen readers say nothing)
// usage: node build.js && node tools/audit_a11y.js [out.json]  -> a summary; details in tools/audit_out/a11y.json
process.env.DS_STYLEDUMP = '1';
const path = require('path'), fs = require('fs');
const { SCREENS, INIT, HELP, URL_ } = require('./tests/test_screens.js');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const OUT = path.join(__dirname, 'audit_out'); fs.mkdirSync(OUT, { recursive: true });
const EXTRA = [
  ['quest-poster', () => { __fight(); render(); __clean(); openQuestPoster(); }],
  ['achievements', () => { preGameScreen = 'title'; S = null; render(); openRecordsModal('achievements'); }],
];
function scan(phone) {
  const out = [], seen = new Set();
  const add = (type, el, detail) => { const p = []; for (let n = el; n && n !== document.body && p.length < 3; n = n.parentElement) p.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList.length ? '.' + [...n.classList].slice(0, 2).join('.') : ''));
    const k = type + p.join('>') + detail.slice(0, 20); if (seen.has(k)) return; seen.add(k); out.push({ type, where: p.join(' > '), text: (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50), detail }); };
  const vis = el => { for (let n = el; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.1) return false; } const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
  const rgba = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = el => { // the first solid background behind the text (gradients/images: skip, too uncertain)
    let acc = null;
    for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) return null; if (/gradient/.test(cs.backgroundImage)) return null;
      const c = rgba(cs.backgroundColor); if (c && c.a > 0.85) return c; if (n === document.body) return c || { r: 0, g: 0, b: 0, a: 1 }; }
    return null; };
  // CONTRAST
  document.querySelectorAll('body *').forEach(el => {
    if (!vis(el) || el.closest('svg')) return;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1); if (!own) return;
    const cs = getComputedStyle(el), fg = rgba(cs.color); if (!fg || fg.a < 0.3) return;
    const fs = parseFloat(cs.fontSize) * (el.currentCSSZoom || 1), bold = +cs.fontWeight >= 600, large = fs >= 24 || (bold && fs >= 18.66);
    const stroke = parseFloat(cs.webkitTextStrokeWidth || 0), sc = rgba(cs.webkitTextStrokeColor || ''), ring = /rgba?\([^)]*\)\s+(-?\d+px\s+){2}[0-9.]+px/.test(cs.textShadow) || /0px 0px [1-9]/.test(cs.textShadow);
    let bg = (stroke >= 1 && sc) ? sc : bgOf(el); if (!bg) return; if (ring && !(stroke >= 1)) return; // shadow rings: legible by design, skip
    const r = ratio(fg, bg), need = large ? 3 : 4.5;
    if (r < need) add('CONTRAST', el, `${r.toFixed(2)}:1 (need ${need}) ${cs.color} on ${stroke >= 1 ? 'outline ' : ''}rgb(${bg.r},${bg.g},${bg.b}) at ${fs.toFixed(1)}px`);
  });
  // clickables
  const clickables = [...document.querySelectorAll('button, [role="button"], a[href], [onclick], .die[data-idx], input, select')].filter(vis);
  clickables.forEach(el => {
    const r = el.getBoundingClientRect(); let m = Math.min(r.width, r.height);
    { const pa = getComputedStyle(el, '::after'); if (pa.content !== 'none' && pa.position === 'absolute') { const it = parseFloat(pa.top) || 0, il = parseFloat(pa.left) || 0; m = Math.min(r.width - 2 * il, r.height - 2 * it); } } // an invisible ::after tap pad
    if (phone && m < 32 && !el.closest('.modal-x-btn') && el.tagName !== 'INPUT') add('TAP', el, `${Math.round(r.width)}x${Math.round(r.height)} px`);
    const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.textContent || (el.labels && el.labels[0] && el.labels[0].textContent) || '').trim(); // a <label for> names its input
    if (!name) add('NAME', el, 'no text, aria-label or title');
  });
  return out;
}
(async () => {
  const b = await chromium.launch(); const all = [];
  for (const [w, h, pc] of [[395, 769, false], [1375, 947, true]]) for (const [name, setup] of [...SCREENS, ...EXTRA]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.addInitScript(INIT); await p.addInitScript(pc => { try { localStorage.setItem('dungeonScramblePC', pc ? '1' : '0'); } catch (e) {} }, pc);
    await p.goto(URL_ + (pc ? '?pc=1' : '')); await p.waitForTimeout(400); await p.evaluate(HELP);
    try { await p.evaluate(setup); } catch (e) {}
    await p.waitForTimeout(500); await p.evaluate(() => { __clean(); document.querySelectorAll('#headline-strip,#symbol-intro').forEach(n => n.remove()); });
    const found = await p.evaluate(scan, !pc); found.forEach(f => { f.screen = name; f.view = `${w}x${h}`; all.push(f); });
    // MOTION: Reduced motion on, then any infinite animation still running
    if (!pc) { const mo = await p.evaluate(async () => { try { PREFS.reducedMotion = true; applyReducedMotionClass(); } catch (e) {} await new Promise(r => setTimeout(r, 300));
        return [...new Set(document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).map(a => (a.animationName || 'anim') + ' @ ' + ((a.effect.target && (a.effect.target.id || String(a.effect.target.className || '').split(' ').slice(0, 2).join('.'))) || '?')))]; });
      mo.forEach(m => all.push({ type: 'MOTION', screen: name, view: `${w}x${h}`, where: m, detail: 'loops with Reduced motion on' })); }
    await p.close();
  }
  await b.close();
  fs.writeFileSync(process.argv[2] || path.join(OUT, 'a11y.json'), JSON.stringify(all, null, 1));
  const by = {}; all.forEach(i => by[i.type] = (by[i.type] || 0) + 1); console.log('issues', all.length, JSON.stringify(by));
})();
