// PC layout (Nov 13; opt-in with ?pc=1 / localStorage dungeonScramblePC): the split fight screen, the hover panel and
// the key letters. Checks at 1920x1080 and 1280x800 (Steam Deck): the mode turns on only when asked for and only on a wide
// window; nothing scrolls; room left of tray, both inside the window; the path line's points sit on their dice;
// hovering a die explains it (a Minion's die stays secret); keys pick dice; a turn plays; the phone is untouched.
// usage: node tools/tests/test_pc.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const URL_ = 'file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html');
const FIGHT = () => { META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 }; newGame('dwarf', 'guard'); S.guide = null;
  for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
  S.transitioning = false; S.newRoomFx = false; S.needRoll = false; S.tray.forEach(c => { c.minion = false; c.blank = false; c.coveredDie = null; });
  S.encounter.maxHealth = S.encounter.curHealth = 80; render(); document.querySelectorAll('#room-callout,#room-callout-scrim,.modal-overlay').forEach(n => n.remove()); };
(async () => {
  const browser = await chromium.launch(); const out = [], errors = [];
  const open = async (w, h, pc) => { const p = await browser.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errors.push(`${w}x${h}: ` + e.message));
    await p.addInitScript((pc) => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); if (pc) localStorage.setItem('dungeonScramblePC', '1'); } catch (e) {} }, pc);
    await p.goto(URL_); await p.waitForTimeout(400); return p; };
  // off unless asked for; off on a phone even when asked for
  let p = await open(1920, 1080, false); const offWide = await p.evaluate(() => document.body.classList.contains('pc')); await p.close();
  p = await open(395, 769, true); const offPhone = await p.evaluate(() => document.body.classList.contains('pc')); await p.close();
  out.push((!offWide && !offPhone ? 'ok   ' : 'FAIL ') + `PC mode is off without the flag (${offWide}) and on a phone-sized window (${offPhone})`);
  for (const [w, h] of [[1920, 1080], [1280, 800]]) {
    p = await open(w, h, true); await p.evaluate(FIGHT); await p.waitForTimeout(500);
    const g = await p.evaluate(() => { const b = s => { const n = document.querySelector(s); const r = n.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
      return { pc: document.body.classList.contains('pc'), room: b('#app > #enc-panel'), tray: b('#app > .tray-panel'), route: b('#app > .route-float'), hover: b('#pc-hover'), sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, W: innerWidth, H: innerHeight }; });
    const inside = r => r.l >= -1 && r.t >= -1 && r.r <= g.W + 1 && r.b <= g.H + 1;
    out.push((g.pc && g.sh <= g.H && g.sw <= g.W && inside(g.room) && inside(g.tray) && inside(g.route) && inside(g.hover) && g.room.r <= g.tray.l && g.hover.t >= g.room.b ? 'ok   ' : 'FAIL ')
      + `${w}x${h}: room left of the tray, hover panel under the room, everything inside the window, no scrolling (${JSON.stringify({ sh: g.sh, sw: g.sw, room: [Math.round(g.room.l), Math.round(g.room.r)], tray: [Math.round(g.tray.l), Math.round(g.tray.r)] })})`);
    // path line: two taps, the line's ends sit on the two dice (screen px)
    const tr = await p.evaluate(() => { const a = [...Array(16).keys()].find(i => canSelect(i)); toggleSelect(a); const b = [...Array(16).keys()].find(i => canSelect(i) && !S.path.includes(i)); if (b == null) return null; toggleSelect(b);
      const svg = document.getElementById('path-trail-svg'), seg = svg && svg.querySelector('path, line, polyline'); if (!seg) return { none: true };
      const sr = seg.getBoundingClientRect(), c = i => { const r = document.querySelector(`#tray > .die[data-idx="${i}"]`).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
      const [ax, ay] = c(a), [bx, by] = c(b), tol = 14 + 0.25 * Math.hypot(bx - ax, by - ay); // a Leap is drawn as an arc, so it bows away from the straight line
      return { ok: sr.left >= Math.min(ax, bx) - tol && sr.right <= Math.max(ax, bx) + tol && sr.top >= Math.min(ay, by) - tol && sr.bottom <= Math.max(ay, by) + tol, sr: [sr.left, sr.top, sr.right, sr.bottom].map(Math.round), a: [ax, ay].map(Math.round), b: [bx, by].map(Math.round) }; });
    out.push((tr && tr.ok ? 'ok   ' : 'FAIL ') + `${w}x${h}: the path line runs between the two dice it joins (${JSON.stringify(tr)})`);
    // hover: a die is explained; a Minion's die is not
    await p.evaluate(() => { clearPathAll(); render(); });
    const idx = await p.evaluate(() => [...Array(16).keys()].find(i => currentFace(S.tray[i]).type !== 'blank'));
    await p.hover(`#tray > .die[data-idx="${idx}"]`, { force: true }); await p.waitForTimeout(150);
    const hv = await p.evaluate((i) => ({ txt: document.querySelector('#pc-hover .pch-in').textContent, name: S.tray[i].die.name, faces: document.querySelectorAll('#pc-hover .mini-face').length, cur: document.querySelectorAll('#pc-hover .pch-cur').length }), idx);
    await p.mouse.move(2, 2); await p.evaluate((i) => { S.tray[i].minion = true; render(); }, idx); await p.hover(`#tray > .die[data-idx="${idx}"]`, { force: true }); await p.waitForTimeout(150);
    const mv = await p.evaluate((i) => ({ txt: document.querySelector('#pc-hover .pch-in').textContent, name: S.tray[i].die.name }), idx);
    out.push((hv.txt.includes(hv.name) && hv.faces === 6 && hv.cur === 1 && /Minion/.test(mv.txt) && !mv.txt.includes(mv.name) ? 'ok   ' : 'FAIL ') + `${w}x${h}: hovering a die shows its name, six faces and the one showing; a Minion's die stays secret`);
    // keys pick dice, Enter plays the turn
    await p.evaluate((i) => { S.tray[i].minion = false; render(); }, idx); await p.mouse.move(2, 2);
    const key = await p.evaluate(() => { const i = [...Array(16).keys()].find(k => canSelect(k)); return { i, key: ['1', '2', '3', '4', 'q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'z', 'x', 'c', 'v'][i], shown: getComputedStyle(document.querySelector(`#tray > .die[data-idx="${i}"]`), '::before').content }; });
    await p.keyboard.press(key.key); await p.waitForTimeout(150);
    const picked = await p.evaluate(() => S.path.slice());
    await p.keyboard.press('Enter'); await p.waitForTimeout(200); await p.evaluate(() => skipTransition()); await p.waitForTimeout(300);
    const turn = await p.evaluate(() => S.turnNumber);
    out.push((picked.length === 1 && picked[0] === key.i && key.shown.replace(/"/g, '').toLowerCase() === key.key && turn >= 1 ? 'ok   ' : 'FAIL ') + `${w}x${h}: the die's key cap (${key.shown}) picks it and Enter plays the turn`);
    await p.close();
  }
  out.forEach(l => console.log(l));
  if (errors.length) console.log('FAIL page errors: ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
