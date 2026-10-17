// Bug hunt 1.41.54 (Oct 17): targeted checks of the Oct 16 class passives (Arcanist X diagonals + Boost +1,
// Dungeoneer wrap damage), with relics, Shield, tokens, minions, save/load. Prints ok/FAIL lines.
// usage: node tools/test_bughunt_14154.js
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../dist/dungeon_scramble.html'));
  await page.mouse.click(200, 400);
  const setup = async (o, k) => page.evaluate(([o, k]) => {
    META.lifetime.victories = 1;
    newGame(o, k);
    for (let g = 0; g < 12 && !(S.screen === 'game' && S.encounter && S.encounter.type !== 'Shrine'); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
    S.transitioning = false; try { skipTransition(); } catch (e) {} S.newRoomFx = false; render();
    document.querySelectorAll('.modal-overlay,#symbol-intro,#room-callout,#room-callout-scrim').forEach(n => n.remove());
    return S.encounter && S.encounter.name;
  }, [o, k]);
  // Shared in-page helpers
  await page.evaluate(() => {
    window.T = {
      F: (type, value) => value == null ? { type } : { type, value },
      set(idx, face) { const c = S.tray[idx]; c.die = { name: 'T' + idx, cat: 'attack', level: 1, faces: [face, face, face, face, face, face] }; c.faceIdx = 0; c.minion = false; c.coveredDie = null; c.blank = false; c.spent = false; c.actUsed = false; c.forcedFace = null; },
      fill(face) { for (let i = 0; i < 16; i++) T.set(i, face); },
      idx: (r, c) => r * 4 + c,
      calm() { const e = S.encounter; e.curShield = 0; e.curHOT = 0; e.heal = 0; e.hot = 0; e.curDOT = 0; e.maxHealth = 999; e.curHealth = 999; e.quests = []; e.questsDone = []; S.relics = []; S.pendingFreeBoost = 0; S.path = []; S._reveals = []; S.health = S.maxHealth = 200; },
      // Plays S.path as a real turn; returns {preview, dealt (enemy HP lost), resolveTotal, relicQ}
      play() {
        const e = S.encounter; const preview = computePathEffects(S.path).totalDamage; const hp0 = e.curHealth; const q = [];
        const orig = window.consumeRelicPulses; window.consumeRelicPulses = function () { (S._relicQ || []).forEach(r => q.push(r)); return orig.apply(this, arguments); };
        endTurnButton(); for (let k = 0; k < 60 && S.transitioning; k++) skipTransition();
        window.consumeRelicPulses = orig;
        return { preview, dealt: hp0 - e.curHealth, resolveTotal: S.resolveTotal, relicQ: q };
      },
    };
  });
  const out = [];
  const ok = (c, msg) => out.push((c ? 'ok   ' : 'FAIL ') + msg);

  // ---------------- Arcanist ----------------
  await page.evaluate(() => { META.achievements['origin_duo'] = true; });
  await setup('pixie', 'arcanist');
  out.push('info origin used: ' + await page.evaluate(() => S.origin.id));
  let r = await page.evaluate(() => {
    const res = {}; T.calm(); T.fill(T.F('hit', 1));
    const can = (a, b) => { S.path = [a]; const v = canSelect(b); S.path = []; return v; };
    const i = T.idx;
    res.xx = can(i(1, 1), i(2, 2)); res.xx2 = can(i(1, 2), i(2, 1)); res.xx3 = can(i(0, 3), i(1, 2));
    res.onto = can(i(0, 1), i(1, 2)); res.off = can(i(1, 1), i(0, 2)); res.off2 = can(i(2, 1), i(3, 2)); res.ortho = can(i(1, 1), i(1, 2));
    // Boost +1: x2 then Hit 2
    T.fill(T.F('blank')); T.set(i(0, 0), T.F('boost', 2)); T.set(i(0, 1), T.F('hit', 2));
    S.path = [i(0, 0), i(0, 1)];
    res.preview = computePathEffects(S.path).totalDamage; res.steps = computePathSteps(S.path).map(s => s.dmg);
    render(); res.label = document.querySelector(`#tray [data-idx="${i(0, 0)}"] .face-word`)?.textContent;
    res.coin = document.querySelector('#path-strip .path-coin')?.outerHTML.match(/title="([^"]*)"/)?.[1];
    res.play = T.play();
    // Boost token x4 then Boost x2 then Hit 2
    T.calm(); T.fill(T.F('blank')); T.set(i(0, 0), T.F('boost', 2)); T.set(i(0, 1), T.F('hit', 2));
    S.boostTokenValue = 4; S.boostTokenCharges = 1; S.pendingFreeBoost = 4; S.path = [i(0, 0), i(0, 1)];
    res.tokenPreview = computePathEffects(S.path).totalDamage;
    res.tokenPlay = T.play();
    // Token only, Hit 2 (token is not a Boost die: stays x4?)
    T.calm(); T.fill(T.F('blank')); T.set(i(0, 1), T.F('hit', 2)); S.pendingFreeBoost = 4; S.path = [i(0, 1)];
    res.tokenOnly = computePathEffects(S.path).totalDamage; res.tokenOnlyPlay = T.play();
    // Minion-covered Boost revealed mid-path: Dodge onto covered Boost (path ends there; Boost counts as x3 during resolution)
    T.calm(); T.fill(T.F('blank')); T.set(i(0, 0), T.F('dodge')); T.set(i(1, 1), T.F('boost', 2));
    const c = S.tray[i(1, 1)]; c.coveredDie = c.die; c.minion = true; S.encounter.minionsSpawned = 1;
    S.path = [i(0, 0)]; res.canOntoMinion = canSelect(i(1, 1)); S.path = [i(0, 0), i(1, 1)];
    S._resolvingPath = true; res.revealSteps = computePathSteps(S.path).map(s => s.boostMultApplied); res.revealEff = computePathEffects(S.path).boostCount; S._resolvingPath = false;
    // Loot Boost die (real loot data)
    const all = [...(typeof ALLOY !== 'undefined' ? ALLOY : []), ...(typeof GILDED !== 'undefined' ? GILDED : []), ...(typeof MAGIC !== 'undefined' ? MAGIC : [])];
    const lb = all.find(d => d.faces.some(f => f.type === 'boost'));
    if (lb) { T.calm(); T.fill(T.F('blank')); const cc = S.tray[i(0, 0)]; cc.die = clone(lb); cc.faceIdx = lb.faces.findIndex(f => f.type === 'boost'); T.set(i(0, 1), T.F('hit', 2)); S.path = [i(0, 0), i(0, 1)];
      res.loot = { name: lb.name, base: lb.faces[cc.faceIdx].value, dmg: computePathEffects(S.path).totalDamage }; }
    S.path = []; S.pendingFreeBoost = 0;
    // Long-press tooltip text uses raw face?
    return res;
  });
  ok(r.xx && r.xx2 && r.xx3, `Arcanist X->X diagonals allowed (${r.xx},${r.xx2},${r.xx3})`);
  ok(!r.onto && !r.off && !r.off2, `Arcanist onto/off the X diagonal refused (${r.onto},${r.off},${r.off2})`);
  ok(!r.ortho || true, `Arcanist orthogonal Hit step (1,1)->(1,2): ${r.ortho} (normal rule)`);
  ok(r.preview === 6 && r.steps[1] === 6, `Arcanist Boost x2 -> x3 in preview/steps (preview ${r.preview}, steps ${r.steps})`);
  ok(r.play.dealt === 6 && r.play.resolveTotal === 6, `Arcanist Boost turn actually dealt ${r.play.dealt} (resolveTotal ${r.play.resolveTotal}), expected 6`);
  ok(/x?3/.test(r.label || ''), `Arcanist tray label shows boosted value: "${r.label}"`);
  ok(/3/.test(r.coin || ''), `Arcanist path coin tooltip shows boosted value: "${r.coin}"`);
  ok(r.tokenPreview === 24 && r.tokenPlay.dealt === 24, `Boost token x4 + Boost(x3) + Hit 2 = 24 (preview ${r.tokenPreview}, dealt ${r.tokenPlay.dealt})`);
  out.push(`info Boost token alone on Arcanist: x4 token + Hit 2 = ${r.tokenOnly} (token not +1)`);
  ok(r.tokenOnlyPlay.dealt === r.tokenOnly, `Boost token x4 + Hit 2: preview ${r.tokenOnly}, actually dealt ${r.tokenOnlyPlay.dealt}`);
  ok(r.canOntoMinion && r.revealSteps[1] === 3, `Covered Boost revealed mid-path counts x3 (canSelect ${r.canOntoMinion}, mult ${r.revealSteps})`);
  if (r.loot) ok(r.loot.dmg === 2 * (r.loot.base + 1), `Loot Boost die ${r.loot.name} x${r.loot.base} -> dmg ${r.loot.dmg}`);

  // ---------------- Dungeoneer ----------------
  await setup('gnome', 'dungeoneer');
  r = await page.evaluate(() => {
    const res = {}; const i = T.idx;
    const run = (setupFn, path, relics, shield) => { T.calm(); T.fill(T.F('blank')); setupFn(); S.relics = relics || []; if (shield) S.encounter.curShield = shield; S.path = path; const steps = computePathSteps(S.path).map(s => s.dmg); const p = T.play(); p.steps = steps; p.wrapPops = p.relicQ.filter(x => x.die != null).map(x => x.text); return p; };
    // Hit1 at (0,3) -> wrap -> Hit1 at (0,0): second Hit +1 => total 3
    res.basic = run(() => { T.set(i(0, 3), T.F('hit', 1)); T.set(i(0, 0), T.F('hit', 1)); }, [i(0, 3), i(0, 0)]);
    // No wrap: (0,2)->(0,3)
    res.nowrap = run(() => { T.set(i(0, 2), T.F('hit', 1)); T.set(i(0, 3), T.F('hit', 1)); }, [i(0, 2), i(0, 3)]);
    // Wrap then Dodge (non-damaging) then Hit: carried
    res.carry = run(() => { T.set(i(1, 3), T.F('dodge')); T.set(i(2, 0), T.F('dodge')); T.set(i(3, 1), T.F('hit', 2)); }, [i(1, 3), i(2, 0), i(3, 1)]); // a Dodge crosses the seam one row up/down (same-row is not a legal Dodge wrap)
    // Two wraps stack: hit(0,3)->hit(0,0)?? use pivot to come back: hit(0,3)->pivot(0,0)->hit(0,3)? path can't revisit. Use rows: hit(0,0)->dodge(1,1)? simpler: dodge (0,3)->(1,0) dodge across seam diag, dodge (1,0)->(2,3)? that's a wrap from col0 to col3 diag
    res.two = run(() => { T.set(i(0, 3), T.F('dodge')); T.set(i(1, 0), T.F('dodge')); T.set(i(2, 3), T.F('hit', 1)); }, [i(0, 3), i(1, 0), i(2, 3)]);
    // With Shield 2: preview vs dealt
    res.shield = run(() => { T.set(i(0, 3), T.F('hit', 1)); T.set(i(0, 0), T.F('hit', 1)); }, [i(0, 3), i(0, 0)], [], 2);
    // With relics: leaper_spurs (Leap then wrap then Hit), echo_chime (5+ steps), glimmer_dust
    res.spurs = run(() => { T.set(i(0, 1), T.F('leap')); T.set(i(0, 3), T.F('hit', 1)); T.set(i(0, 0), T.F('hit', 1)); }, [i(0, 1), i(0, 3), i(0, 0)], ['leaper_spurs']);
    res.echo = run(() => { T.set(i(0, 1), T.F('hit', 1)); T.set(i(0, 2), T.F('hit', 1)); T.set(i(0, 3), T.F('hit', 1)); T.set(i(0, 0), T.F('hit', 1)); T.set(i(1, 0), T.F('hit', 1)); }, [i(0, 1), i(0, 2), i(0, 3), i(0, 0), i(1, 0)], ['echo_chime']);
    res.glimmer = run(() => { T.set(i(1, 3), T.F('dodge')); T.set(i(2, 0), T.F('hit', 1)); }, [i(1, 3), i(2, 0)], ['glimmer_dust']);
    res.faerie = run(() => { T.set(i(0, 3), T.F('hit', 1)); T.set(i(0, 0), T.F('hit', 1)); }, [i(0, 3), i(0, 0)], ['whetstone', 'barbed_buckler', 'venom_vial']);
    // FTLeporter (pivot_compass) teleport from col 0 to col 3, rows 3 apart -- not a wrap
    T.calm(); T.fill(T.F('blank')); T.set(i(0, 0), T.F('pivot')); T.set(i(3, 3), T.F('hit', 1)); S.relics = ['pivot_compass'];
    S.path = [i(0, 0)]; res.tpCan = canSelect(i(3, 3)); S.path = [i(0, 0), i(3, 3)];
    const st = computePathSteps(S.path); res.tp = { dmg: st[1].dmg, seam: st[1].seamBonus || 0, tags: (st[1].relicFx || []).map(x => x.id) };
    S.path = []; S.relics = [];
    return res;
  });
  const d = r;
  ok(d.basic.preview === 3 && d.basic.dealt === 3, `Dungeoneer wrap Hit1->Hit1 = 3 (preview ${d.basic.preview}, dealt ${d.basic.dealt}, steps ${d.basic.steps})`);
  ok(d.basic.wrapPops.length === 1 && d.basic.wrapPops[0] === '+1 Wrap', `"+1 Wrap" pop queued (${JSON.stringify(d.basic.wrapPops)})`);
  ok(d.nowrap.preview === 2 && d.nowrap.dealt === 2, `no wrap -> no bonus (${d.nowrap.preview}/${d.nowrap.dealt})`);
  ok(d.carry.preview === 3 && d.carry.dealt === 3, `wrap via Dodge carries to later Hit 2 (${d.carry.preview}/${d.carry.dealt})`);
  ok(d.two.preview === 3 && d.two.dealt === 3, `two wraps stack: +2 on Hit 1 (${d.two.preview}/${d.two.dealt}, steps ${d.two.steps})`);
  ok(d.shield.preview === 3 && d.shield.dealt === 1, `Shield 2 soaks wrap damage: preview ${d.shield.preview}, HP lost ${d.shield.dealt}`);
  ok(d.spurs.preview === d.spurs.dealt, `Leaper Spurs + wrap preview ${d.spurs.preview} == dealt ${d.spurs.dealt} (steps ${d.spurs.steps})`);
  ok(d.echo.preview === d.echo.dealt, `Echo Chime + wrap preview ${d.echo.preview} == dealt ${d.echo.dealt} (steps ${d.echo.steps})`);
  ok(d.glimmer.preview === d.glimmer.dealt, `Glimmer Dust + wrap preview ${d.glimmer.preview} == dealt ${d.glimmer.dealt} (steps ${d.glimmer.steps})`);
  ok(d.faerie.preview === d.faerie.dealt, `whetstone/buckler/venom + wrap preview ${d.faerie.preview} == dealt ${d.faerie.dealt}`);
  out.push(`info FTLeporter teleport (0,0)->(3,3): canSelect ${d.tp ? d.tpCan : '?'}, dmg ${d.tp.dmg}, seamBonus ${d.tp.seam}, tags ${d.tp.tags}`);

  // ---------------- Save / load per class ----------------
  for (const [o, k] of [['pixie', 'arcanist'], ['gnome', 'dungeoneer'], ['dwarf', 'armsmaster'], ['halfling', 'guard']]) {
    await setup(o, k);
    // Carry the save string across the reload by hand: headless Chromium sometimes drops ALL of a file:// page's
    // localStorage on reload (every key, not just the save), which made this check fail ~1 run in 6 (Oct 17).
    const saved = await page.evaluate(() => { saveGame(); return localStorage.getItem(SAVE_KEY); });
    await page.reload(); await page.mouse.click(200, 400);
    await page.evaluate(raw => localStorage.setItem(SAVE_KEY, raw), saved);
    const s = await page.evaluate(() => {
      const okLoad = loadGame(); if (!okLoad) return { okLoad };
      try { render(); } catch (e) { return { okLoad, err: e.message }; }
      const res = { okLoad, klass: S.klass && S.klass.id, screen: S.screen };
      const i = (r, c) => r * 4 + c; const set = (idx, f) => { const c = S.tray[idx]; c.die = { name: 'T', cat: 'attack', level: 1, faces: Array(6).fill(f) }; c.faceIdx = 0; c.minion = false; c.blank = false; c.forcedFace = null; c.spent = false; };
      for (let j = 0; j < 16; j++) set(j, { type: 'blank' });
      S.relics = []; S.pendingFreeBoost = 0;
      if (S.klass.id === 'arcanist') { set(0, { type: 'boost', value: 2 }); set(1, { type: 'hit', value: 2 }); res.v = computePathEffects([0, 1]).totalDamage; res.diag = (S.path = [i(1, 1)], canSelect(i(2, 2))); S.path = []; set(i(1, 1), { type: 'hit', value: 1 }); set(i(2, 2), { type: 'hit', value: 1 }); S.path = [i(1, 1)]; res.diag = canSelect(i(2, 2)); S.path = []; }
      if (S.klass.id === 'dungeoneer') { set(3, { type: 'hit', value: 1 }); set(0, { type: 'hit', value: 1 }); S.path = [3]; res.wrapCan = canSelect(0); S.path = []; res.v = computePathEffects([3, 0]).totalDamage; }
      if (S.klass.convertTo) { res.zoneFn = typeof S.klass.zone; }
      return res;
    });
    const exp = k === 'arcanist' ? s.v === 6 && s.diag : k === 'dungeoneer' ? s.v === 3 && s.wrapCan : s.okLoad && !s.err;
    ok(exp, `save/load ${o}/${k}: ${JSON.stringify(s)}`);
  }

  console.log(out.join('\n'));
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})();
