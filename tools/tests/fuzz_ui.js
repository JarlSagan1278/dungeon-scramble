// UI fuzzer (Nov 27, Jeremy: "hunt for more interactions that could cause bugs or incorrect states"): plays real runs on a
// phone by tapping what's on screen in random order (dice, Go, Clear, Skill, tokens, Pocket, menus, the lid, doors, loot,
// camp, shrines), plus awkward moves: taps during playback, double taps, a reload mid-turn, a resize to PC and back.
// After every action it checks invariants and logs any break with the last actions that led to it.
// usage: node build.js && node tools/tests/fuzz_ui.js [games=4] [steps=400] [seed]   (WEBKIT=1 forces the iPhone redraw path)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const GAMES = +(process.argv[2] || 4), STEPS = +(process.argv[3] || 400); let seed = +(process.argv[4] || Date.now() % 100000);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = a => a[Math.floor(rnd() * a.length)];
const DIST = path.resolve(__dirname, '../../dist/web');
const srv = http.createServer((q, r) => { const f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); r.end(d); }); });
// invariants, read in the page after each action
const CHECK = () => {
  const out = [];
  if (typeof S === 'undefined' || !S) return out;
  const txt = document.body.innerText || '';
  if (/\bNaN\b|\bundefined\b|\[object Object\]/.test(txt)) out.push('bad text on screen: ' + (txt.match(/.{0,30}(NaN|undefined|\[object Object\]).{0,30}/) || [''])[0].replace(/\s+/g, ' '));
  if (!(S.health <= S.maxHealth + 0.001) || !(S.health >= 0) || !isFinite(S.health)) out.push(`health ${S.health}/${S.maxHealth}`);
  if (S.encounter && S.encounter.maxHealth && (!(S.encounter.curHealth <= S.encounter.maxHealth + 0.001) || !isFinite(S.encounter.curHealth))) out.push(`foe health ${S.encounter.curHealth}/${S.encounter.maxHealth}`);
  if (S.tray && S.tray.length !== 16) out.push('tray has ' + S.tray.length + ' dice');
  if (document.querySelectorAll('.modal-overlay:not(.modal-closing)').length > 1) out.push('two pop-ups open: ' + [...document.querySelectorAll('.modal-overlay:not(.modal-closing) h2')].map(h => h.textContent).join(' + '));
  if (S.screen === 'game' && S.encounter && !S.transitioning && !S.needRoll && !document.querySelector('.modal-overlay, #room-callout') && document.getElementById('tray')) {
    // the path is legal step by step
    const p = S.path.slice(); const keep = S.path; S.path = [];
    try { for (const i of p) { if (!canSelect(i)) { out.push(`illegal path step ${i} in [${p}]`); break; } S.path.push(i); } } finally { S.path = keep; }
    // the dice drawn tappable match the rules (skip while a Skill/token is armed: those draw targets differently)
    if (!S.trayAct && !(typeof abilityArmed !== 'undefined' && abilityArmed)) {
      const bad = [];
      for (let i = 0; i < 16; i++) { const d = document.querySelector(`#tray > .die[data-idx="${i}"]`); if (!d) { bad.push(i + ':missing'); continue; }
        const lit = d.classList.contains('selectable'), ok = !!(canSelect(i) || (S.path.length && S.path[S.path.length - 1] === i));
        if (lit !== ok) bad.push(`${i}:${lit ? 'lit' : 'dark'}`); }
      if (bad.length) out.push('tray drawing != rules: ' + bad.join(' '));
      // the next-move rings sit on exactly the dice the path can step to
      const rings = document.querySelectorAll('.reach-layer .reach-ring').length, want = S.path.length ? [...Array(16).keys()].filter(i => !S.path.includes(i) && canSelect(i) && !S.tray[i].minion).length : 0;
      if (window.__reachChecked && rings !== want) out.push(`rings ${rings}, reachable ${want}`);
    }
  }
  return out;
};
(async () => {
  await new Promise(r => srv.listen(8771, r));
  const b = await chromium.launch(); const problems = [];
  for (let g = 0; g < GAMES; g++) {
    const ctx = await b.newContext({ viewport: { width: 395, height: 769 }, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript((wk) => { try { if (!sessionStorage.getItem('fz')) { localStorage.clear(); sessionStorage.setItem('fz', '1'); }
      localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); localStorage.setItem('dungeonScrambleDoorTest', '1'); if (wk) localStorage.setItem('dungeonScrambleWebkitTest', '1'); } catch (e) {} }, !!process.env.WEBKIT);
    await p.goto('http://127.0.0.1:8771/index.html'); await p.waitForTimeout(1500);
    await p.evaluate(() => { META.renown = 600; META.lifetime.runsPlayed = 12; saveMeta(); render(); });
    const hist = []; let lastScreen = '';
    for (let s = 0; s < STEPS; s++) {
      const act = await p.evaluate((r) => {
        const vis = el => { const q = el.getBoundingClientRect(); return q.width > 0 && q.height > 0 && q.bottom > 0 && q.top < innerHeight && getComputedStyle(el).visibility !== 'hidden'; };
        const top = document.querySelector('.modal-overlay:not(.modal-closing)') || document.querySelector('.moment-overlay') || document.querySelector('#room-callout') || document.querySelector('.loot-overlay') || document;
        let c = [...top.querySelectorAll('button, [onclick], #tray > .die, .loot-opt, .loot-chest-btn, #chest-lid, .rc-door, .camp-die-tile, .die')].filter(vis);
        c = c.filter(e => !/reset-progress|confirm-reset-go|settings-quit|export|backup|title-history|copy/i.test((e.id || '') + ' ' + e.className)); // never wipe progress or leave
        if (!c.length) return null;
        const e = c[Math.floor(r * c.length)];
        const id = e.id || (e.dataset && e.dataset.idx != null ? 'die' + e.dataset.idx : '') || String(e.className).split(' ')[0];
        e.setAttribute('data-fzr', '1'); return id + ':' + (e.innerText || '').trim().slice(0, 18).replace(/\s+/g, ' ');
      }, rnd());
      const roll = rnd();
      try {
        if (roll < 0.45) { // play on: legal path taps then Go, or whatever moves the run forward
          const mv = await p.evaluate((r) => {
            const q = s => { const e = document.querySelector(s); return e && e.getBoundingClientRect().width ? e : null; };
            if (!S) { const b = q('#title-newrun-btn') || q('#title-continue-btn') || q('#start-btn'); if (b) { b.setAttribute('data-fz', '1'); return 'play: ' + b.id; } return null; }
            const ov = document.querySelector('.modal-overlay:not(.modal-closing), .moment-overlay, #room-callout');
            if (ov) { const b = ov.querySelector('.loot-chest-btn, .loot-opt, #swap-pocket, .shrine-pick, .relic-choice-card, button.primary, button') || ov; b.setAttribute('data-fz', '1'); return 'play: overlay ' + (b.id || String(b.className).split(' ')[0]); }
            if (S.screen === 'camp') { const b = q('#leave-btn') || q('#confirm-leave-go'); if (b) { b.setAttribute('data-fz', '1'); return 'play: leave camp'; } }
            if (S.screen === 'shrine') { const b = q('.shrine-hold-btn, .shrine-pick, #shrine-btn, button.primary'); if (b) { b.setAttribute('data-fz', '1'); return 'play: shrine'; } }
            if (S.screen === 'game' && S.needRoll) return 'flick';
            if (S.screen === 'game' && !S.transitioning) {
              const opts = [...Array(16).keys()].filter(i => canSelect(i));
              if (opts.length && (S.path.length < 2 + Math.floor(r * 5))) { const i = opts[Math.floor(r * 997) % opts.length]; const d = document.querySelector(`#tray > .die[data-idx="${i}"]`); if (d) { d.setAttribute('data-fz', '1'); return 'play: die' + i; } }
              const go = q('#resolve-btn'); if (go) { go.setAttribute('data-fz', '1'); return 'play: Go'; }
            }
            const any = q('button.primary'); if (any) { any.setAttribute('data-fz', '1'); return 'play: ' + (any.id || 'primary'); }
            return null; }, rnd());
          if (mv === 'flick') { hist.push('flick lid'); await p.evaluate(() => scrambleRoll(0, -1)); }
          else if (mv) { hist.push(mv); await p.click('[data-fz="1"]', { force: true, timeout: 1500 }).catch(() => {}); await p.evaluate(() => document.querySelectorAll('[data-fz],[data-fzr]').forEach(n => { n.removeAttribute('data-fz'); n.removeAttribute('data-fzr'); })).catch(() => {}); }
          else hist.push('wait');
        }
        else if (roll < 0.48) { hist.push('RELOAD'); await p.reload(); await p.waitForTimeout(1200); }
        else if (roll < 0.50) { hist.push('PC/phone resize'); await p.setViewportSize({ width: 1375, height: 947 }); await p.waitForTimeout(400); await p.setViewportSize({ width: 395, height: 769 }); await p.waitForTimeout(300); }
        else if (roll < 0.53 && await p.evaluate(() => !!(S && S.needRoll))) { hist.push('flick lid'); await p.evaluate(() => scrambleRoll(0, -1)); }
        else if (act) {
          const dbl = roll < 0.60; hist.push((dbl ? 'DOUBLE ' : '') + act);
          await p.click('[data-fzr="1"]', { force: true, timeout: 1500 }).catch(() => {});
          if (dbl) await p.click('[data-fzr="1"]', { force: true, timeout: 800 }).catch(() => {});
          await p.evaluate(() => document.querySelectorAll('[data-fz],[data-fzr]').forEach(n => { n.removeAttribute('data-fz'); n.removeAttribute('data-fzr'); })).catch(() => {});
        } else { hist.push('wait'); }
      } catch (e) { hist.push('ERR ' + e.message.split('\n')[0]); }
      await p.waitForTimeout(rnd() < 0.7 ? 120 : 700); // sometimes during playback, sometimes after it settles
      if (hist.length > 14) hist.shift();
      await p.evaluate(() => { window.__reachChecked = true; }).catch(() => {});
      await p.waitForTimeout(40); // rings are drawn on the next frame
      let found = []; try { found = await p.evaluate(CHECK); } catch (e) { found = []; }
      if (errs.length) { found.push('JS error: ' + errs.splice(0).join(' | ').slice(0, 200)); }
      const scr = await p.evaluate(() => S ? `${S.screen} F${S.floorIdx + 1} R${S.routeStep}` : 'title').catch(() => '?');
      if (scr !== lastScreen) lastScreen = scr;
      if (process.env.TRACE && (s % 10 === 0 || /Go/.test(hist[hist.length-1]||''))) console.log(s, scr, hist.slice(-4).join(' -> '), await p.evaluate(() => S ? JSON.stringify({ p: S.path, tr: S.transitioning, nr: S.needRoll, hp: S.encounter && S.encounter.curHealth, ta: S.trayAct && S.trayAct.kind, armed: typeof abilityArmed!=='undefined' && abilityArmed, guide: S.guide && S.guide.stage, go: (document.getElementById('resolve-btn')||{}).className, enc: S.encounter && S.encounter.name, turn: S.turnNumber, ov: [...document.querySelectorAll('.modal-overlay,.moment-overlay,#room-callout,.loot-overlay')].map(n => n.className || n.id) }) : '').catch(() => ''));
      for (const f of found) { const key = f.replace(/\d+/g, '#'); if (!problems.some(x => x.key === key)) { problems.push({ key, f, game: g, step: s, where: scr, seed, last: hist.slice(-8) }); console.log(`PROBLEM g${g} s${s} [${scr}]: ${f}\n   after: ${hist.slice(-6).join(' -> ')}`); } }
      // a stuck turn: still transitioning after a long wait
      if (s % 50 === 49) { const stuck = await p.evaluate(async () => { if (!S || !S.transitioning) return false; await new Promise(r => setTimeout(r, 6000)); return !!S.transitioning; }).catch(() => false);
        if (stuck) { const f = 'turn playback stuck for 6 s'; if (!problems.some(x => x.f === f)) { problems.push({ f, game: g, step: s, where: scr, last: hist.slice(-8) }); console.log(`PROBLEM g${g} s${s} [${scr}]: ${f}\n   after: ${hist.slice(-6).join(' -> ')}`); } } }
    }
    console.log(`game ${g}: ${STEPS} actions, reached ${lastScreen}`);
    await ctx.close();
  }
  await b.close(); srv.close();
  fs.mkdirSync(path.join(__dirname, '../audit_out'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../audit_out/fuzz.json'), JSON.stringify(problems, null, 1));
  console.log(problems.length ? `${problems.length} distinct problem(s); details in tools/audit_out/fuzz.json` : 'no problems found');
})();
