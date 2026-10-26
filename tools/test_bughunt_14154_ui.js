// Bug hunt 1.41.54 (Oct 17), part 2: UI checks of the Oct 16 changes -- camp Train lock / confirms, relic gem pop and
// Combonatorics / FTLeporter tags, play-data upload queue (fetch mocked), music after reload, portrait re-roll,
// Abandon Run, quest paper, shrine screen, floor badge. Prints ok/FAIL lines; screenshots only when SHOTS=<dir> is set.
// usage: node tools/test_bughunt_14154_ui.js
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const SHOTS = process.env.SHOTS || ''; // set SHOTS=<dir> to save screenshots
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {}
    window.__posts = []; window.__reply = 'ok';
    window.fetch = (url, opt) => { window.__posts.push({ url, body: opt && opt.body }); const t = window.__reply; return t === 'FAIL' ? Promise.reject(new Error('offline')) : Promise.resolve({ text: () => Promise.resolve(t) }); };
  });
  const file = 'file://' + path.resolve(__dirname, '../dist/dungeon_scramble.html');
  await page.goto(file);
  const out = []; process.on('unhandledRejection', e => { console.log(out.join('\n')); console.log('CRASH ' + e.message.split('\n')[0]); console.log(errors.join('\n')); process.exit(1); });
  const ok = (c, msg) => out.push((c ? 'ok   ' : 'FAIL ') + msg);
  const shot = n => SHOTS ? page.screenshot({ path: `${SHOTS}/bh_${n}.png` }) : null;
  const clean = () => page.evaluate(() => { document.querySelectorAll('.modal-overlay,#symbol-intro,#room-callout,#room-callout-scrim').forEach(n => n.remove()); });

  // ---- splash + music before/after first tap
  const m0 = await page.evaluate(() => ({ g: musicGestured, on: Music.on }));
  await page.mouse.click(200, 400); await page.waitForTimeout(400);
  const m1 = await page.evaluate(() => ({ g: musicGestured, on: Music.on, kind: Music.kind, st: audioCtx && audioCtx.state }));
  ok(!m0.g && m1.g && m1.on, `music waits for first tap, then starts (${JSON.stringify(m0)} -> ${JSON.stringify(m1)})`);

  // ---- setup screen: portrait re-roll, then start
  await page.evaluate(() => { META.lifetime.victories = 1; META.achievements['origin_duo'] = true; preGameScreen = 'setup'; S = null; render(); });
  await page.waitForTimeout(300);
  const hasBtn = await page.$('#portrait-reroll');
  ok(!!hasBtn, 'setup: portrait re-roll button present');
  if (hasBtn) {
    await page.evaluate(() => { window.__curO = () => { const src = (document.querySelector('#origin-showcase .portrait-img') || {}).src; const k = Object.keys(setupPortraitCache).find(k => setupPortraitCache[k].img === src); return k || Object.keys(setupPortraitCache).pop(); }; });
    const before = await page.evaluate(() => { const o = __curO(); const p = setupPortraitCache[o]; return { o, idx: p.idx, tone: p.tone, layout: document.querySelector('#origin-showcase').getBoundingClientRect().height }; });
    const seen = [];
    for (let k = 0; k < 8; k++) { await page.click('#portrait-reroll'); await page.waitForTimeout(80); seen.push(await page.evaluate(() => { const p = setupPortraitCache[__curO()]; return p.idx + ':' + p.tone; })); }
    let same = 0; for (let k = 1; k < seen.length; k++) if (seen[k] === seen[k - 1]) same++;
    ok(same === 0 && seen[0] !== before.idx + ':' + before.tone, `re-roll gives a different look every time (${before.idx}:${before.tone} -> ${seen.join(', ')})`);
    const after = await page.evaluate(() => document.querySelector('#origin-showcase').getBoundingClientRect().height);
    ok(Math.abs(after - before.layout) < 1, `re-roll moves nothing (showcase height ${before.layout} -> ${after})`);
    await page.waitForTimeout(500);
    const pick = await page.evaluate(() => { const p = setupPortraitCache[__curO()]; return { idx: p.idx, tone: p.tone, img: (document.querySelector('#origin-showcase .portrait-img') || {}).src === p.img }; });
    await shot('setup_reroll');
    // start the run through the real button if it can be pressed
    const started = await page.evaluate(() => { const b = document.getElementById('start-btn'); if (!b || b.disabled) return 'start disabled'; b.click(); return 'clicked'; });
    await page.waitForTimeout(800);
    const sp = await page.evaluate(() => S && S.portrait ? { idx: S.portrait.idx, tone: S.portrait.tone, origin: S.origin.id } : null);
    ok(sp && sp.idx === pick.idx && sp.tone === pick.tone, `run starts with the rolled look (${started}; rolled ${pick.idx}:${pick.tone}, run ${sp && sp.idx + ':' + sp.tone}; img shown ${pick.img})`);
    // other origins after re-roll: rerollSetupPortrait never repeats in 300 tries per origin?
    const rep = await page.evaluate(() => { const r = {}; ORIGINS.forEach(o => { let n = 0; setupPortraitCache[o.id] = pickPortrait(o.id); for (let k = 0; k < 300; k++) { const a = setupPortraitCache[o.id]; const b = rerollSetupPortrait(o.id); if (a.idx === b.idx && a.tone === b.tone) n++; } r[o.id] = n; }); return r; });
    ok(Object.values(rep).every(v => v === 0), `rerollSetupPortrait repeats per 300 (by origin): ${JSON.stringify(rep)}`);
  }

  // ---- floor badge in a fight; quest paper for 0/1/3 quests
  await page.evaluate(() => { newGame('dwarf', 'guard'); for (let g = 0; g < 12 && !(S.screen === 'game' && S.encounter && S.encounter.type !== 'Shrine'); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); } S.transitioning = false; try { skipTransition(); } catch (e) {} S.newRoomFx = false; render(); });
  await clean();
  const badge = await page.evaluate(() => (document.querySelector('.round-badge') || {}).textContent);
  ok(/^F1\s*·\s*Rd 1$/.test((badge || '').trim()), `fight floor badge text: "${badge}"`);
  for (const nq of [0, 1, 3]) {
    const q = await page.evaluate((nq) => {
      const e = S.encounter; e.quests = ['10 damage: 3 maneuvers', '2 dot: 2 heal', 'nullify: 5 block'].slice(0, nq); e.questsDone = e.quests.map(() => false); render();
      document.querySelectorAll('.modal-overlay,#room-callout,#room-callout-scrim').forEach(n => n.remove());
      const b = document.querySelector('.fq-body'), f = document.querySelector('.fo-quests-float');
      const card = document.querySelector('.game-card, #app');
      return { body: !!b, rows: document.querySelectorAll('.fo-quests-float .fo-quest').length, fh: f ? Math.round(f.getBoundingClientRect().height) : 0, bh: b ? Math.round(b.getBoundingClientRect().height) : 0, docH: document.documentElement.scrollHeight, cp: b ? getComputedStyle(b).clipPath : '' };
    }, nq);
    await shot('quests_' + nq);
    ok(nq === 0 ? !q.body : (q.body && q.rows === nq && q.bh > 0), `quest paper with ${nq} quests: ${JSON.stringify(q)}`);
  }

  // ---- relic gem pop + Combonatorics / FTLeporter tags
  const rp = await page.evaluate(async () => {
    const res = {};
    const set = (idx, f) => { const c = S.tray[idx]; c.die = { name: 'T', cat: 'attack', level: 1, faces: Array(6).fill(f) }; c.faceIdx = 0; c.minion = false; c.blank = false; c.forcedFace = null; c.spent = false; };
    for (let j = 0; j < 16; j++) set(j, { type: 'blank' });
    S.relics = ['combo_gauntlet', 'pivot_compass']; render();
    set(5, { type: 'combo', value: 1 }); set(0, { type: 'hit', value: 1 }); set(10, { type: 'hit', value: 1 }); set(4, { type: 'pivot' }); set(15, { type: 'hit', value: 2 });
    const st = computePathSteps([4, 5]); res.combo = st[1].relicFx; res.comboDmg = st[1].dmg;
    const st2 = computePathSteps([4, 15]); res.ftl = st2[1].relicFx;
    // gem pop DOM
    fireRelic('combo_gauntlet', '+2'); render();
    await new Promise(r => setTimeout(r, 60));
    res.gem = !!document.querySelector('.relic-fx .relic-gem-pop');
    res.gemFilter = (() => { const g = document.querySelector('.relic-fx .relic-gem-pop'); return g ? getComputedStyle(g).animationName : null; })();
    return res;
  });
  await shot('relic_pop');
  ok(rp.combo && rp.combo.some(x => x.id === 'combo_gauntlet'), `Combonatorics tag on Combo with diagonal neighbors: ${JSON.stringify(rp.combo)} (dmg ${rp.comboDmg})`);
  ok(rp.ftl && rp.ftl.some(x => x.id === 'pivot_compass'), `FTLeporter tag on teleport step: ${JSON.stringify(rp.ftl)}`);
  ok(rp.gem, `relic gem pop element rendered (anim ${rp.gemFilter})`);

  // ---- camp: Train lock, nudge, confirms, Break Camp confirm
  const camp = await page.evaluate(() => {
    const res = {};
    S.screen = 'camp'; S.floorIdx = 0; S.routeStep = 2; S.campChoice = null; S.campRested = false; S.campFireOut = false; S.campUpgrades = {}; S.health = Math.max(1, S.maxHealth - 5);
    // give 3 Attack I in the pocket so a combine is possible
    S.backPocket = [clone(basic('attack', 1)), clone(basic('attack', 1)), clone(basic('attack', 1)), clone(basic('maneuver', 1))];
    render();
    const b = document.getElementById('upgrade-attack-1');
    res.btn = b ? { cls: b.className, disabled: b.disabled, aria: b.getAttribute('aria-disabled') } : null;
    res.hint = !!document.querySelector('.upgrade-locked-hint');
    res.trainDisabled = document.getElementById('train-btn').disabled;
    return res;
  });
  await shot('camp_locked');
  ok(camp.btn && /upgrade-locked/.test(camp.btn.cls) && /upgrade-ready/.test(camp.btn.cls) && !camp.btn.disabled && camp.hint, `camp: combine locked but glowing before Train (${JSON.stringify(camp)})`);
  await page.click('#upgrade-attack-1', { force: true });
  const nudge = await page.evaluate(() => ({ nudge: document.getElementById('train-btn').classList.contains('cf-nudge'), modal: !!document.querySelector('.modal-overlay'), up: S.campUpgrades.attack || false, choice: S.campChoice }));
  ok(nudge.nudge && !nudge.modal && !nudge.up && !nudge.choice, `camp: tapping a locked combine nudges Train only (${JSON.stringify(nudge)})`);
  const lockStyle = await page.evaluate(() => { const b = document.getElementById('upgrade-attack-1'); const cs = getComputedStyle(b); const bf = getComputedStyle(b, '::before'), af = getComputedStyle(b, '::after'); return { filter: cs.filter, anim: cs.animationName, before: bf.content + ' ' + bf.backgroundImage.slice(0, 40), after: af.content }; });
  out.push('info locked combine style: ' + JSON.stringify(lockStyle));
  // Break Camp with unused fire -> confirm
  await page.click('#leave-btn'); await page.waitForTimeout(150);
  const leave1 = await page.evaluate(() => { const m = document.querySelector('.modal-overlay h2'); return m && m.textContent; });
  ok(leave1 === 'Break Camp?', `Break Camp asks when fire unused (${leave1})`);
  await page.evaluate(() => { const c = document.getElementById('confirm-leave-cancel'); c && c.click(); }); await page.waitForTimeout(400);
  // Train -> confirm -> choose
  await page.click('#train-btn'); await page.waitForTimeout(200);
  const tconf = await page.evaluate(() => { const m = document.querySelector('.modal-overlay h2'); return m && m.textContent; });
  ok(tconf === 'Train here?', `Train asks once (${tconf})`);
  await page.evaluate(() => document.getElementById('cf-confirm-go').click()); await page.waitForTimeout(500);
  const t2 = await page.evaluate(() => { const b = document.getElementById('upgrade-attack-1'); return { choice: S.campChoice, locked: b && b.classList.contains('upgrade-locked'), rest: document.getElementById('rest-btn').disabled, modal: !!document.querySelector('.modal-overlay') }; });
  ok(t2.choice === 'train' && !t2.locked && t2.rest && !t2.modal, `after Train: combine unlocked, Rest disabled (${JSON.stringify(t2)})`);
  await page.click('#upgrade-attack-1', { force: true }); await page.waitForTimeout(150);
  const t3 = await page.evaluate(() => { const m = document.querySelector('.modal-overlay h2'); return m ? m.textContent : null; });
  out.push('info combine after Train: modal = ' + t3 + ' (expected none or the empty-Pocket warning)');
  await page.evaluate(() => { const g = document.getElementById('ep-go'); if (g) g.click(); }); await page.waitForTimeout(1800);
  const t4 = await page.evaluate(() => ({ up: S.campUpgrades.attack, bp: S.backPocket.map(d => d.name) }));
  ok(t4.up, `combine went through after Train (${JSON.stringify(t4)})`);
  await page.click('#leave-btn'); await page.waitForTimeout(200);
  const leave2 = await page.evaluate(() => ({ modal: !!document.querySelector('.modal-overlay'), screen: S.screen }));
  ok(!leave2.modal && leave2.screen !== 'camp', `Break Camp after using fire leaves without confirm (${JSON.stringify(leave2)})`);
  // Rest confirm
  await page.evaluate(() => { S.screen = 'camp'; S.floorIdx = 0; S.routeStep = 2; S.campChoice = null; S.campRested = false; S.campFireOut = false; S.campUpgrades = {}; S.health = Math.max(1, S.maxHealth - 5); render(); });
  await clean(); await page.click('#rest-btn'); await page.waitForTimeout(150);
  const r1 = await page.evaluate(() => { const m = document.querySelector('.modal-overlay h2'); return m && m.textContent; });
  await page.evaluate(() => document.getElementById('cf-confirm-go').click()); await page.waitForTimeout(500);
  const r2 = await page.evaluate(() => ({ choice: S.campChoice, train: document.getElementById('train-btn').disabled, hp: S.health, max: S.maxHealth, combineDisabled: (document.getElementById('upgrade-attack-1') || {}).disabled }));
  ok(r1 === 'Rest here?' && r2.choice === 'rest' && r2.train, `Rest confirm then Rest (${r1}; ${JSON.stringify(r2)})`);
  // Base camp: free combining, no fire
  const bc = await page.evaluate(() => { S.screen = 'camp'; S.floorIdx = 0; S.routeStep = 0; S.campChoice = null; S.campRested = false; S.campFireOut = false; S.campUpgrades = {}; S.backPocket = [clone(basic('attack', 1)), clone(basic('attack', 1)), clone(basic('attack', 1)), clone(basic('maneuver', 1))]; render(); const b = document.getElementById('upgrade-attack-1'); return { cls: b && b.className, dis: b && b.disabled, cf: !!document.querySelector('.campfire-choice') }; });
  await clean(); await page.click('#upgrade-attack-1', { force: true }); await page.waitForTimeout(200);
  const bc2 = await page.evaluate(() => ({ modal: document.querySelector('.modal-overlay h2') && document.querySelector('.modal-overlay h2').textContent }));
  await page.evaluate(() => { const g = document.getElementById('ep-go'); if (g) g.click(); }); await page.waitForTimeout(1800);
  const bc3 = await page.evaluate(() => ({ up: S.campUpgrades.attack, choice: S.campChoice }));
  ok(!/locked/.test(bc.cls) && !bc.dis && !bc.cf && bc2.modal !== 'Train here?' && bc3.up, `base camp combining is free (${JSON.stringify(bc)} ${JSON.stringify(bc2)} ${JSON.stringify(bc3)})`);
  // Goldman's Rube Machine (was Time-Intensive Shrine): campfire out
  const ti = await page.evaluate(() => { S.screen = 'camp'; S.floorIdx = 1; S.routeStep = 2; S.campChoice = null; S.campRested = true; S.campFireOut = true; S.campUpgrades = {}; S.backPocket = [clone(basic('attack', 1)), clone(basic('attack', 1)), clone(basic('attack', 1))]; render(); const b = document.getElementById('upgrade-attack-1'); return { out: !!document.querySelector('.campfire-choice.out'), cls: b && b.className, dis: b && b.disabled, lockedHint: !!document.querySelector('.upgrade-locked-hint') }; });
  await clean(); await shot('camp_fireout');
  await page.click('#leave-btn'); await page.waitForTimeout(150);
  const ti2 = await page.evaluate(() => ({ modal: !!document.querySelector('.modal-overlay'), screen: S.screen }));
  ok(ti.out && (!ti.cls || ti.dis) && !ti.lockedHint && !ti2.modal, `fire out: no Rest/Train, combine disabled, leave without confirm (${JSON.stringify(ti)} ${JSON.stringify(ti2)})`);

  // ---- shrine screen: orb centred, Continue green, wiggle, badge
  await page.evaluate(() => { newGame('dwarf', 'guard'); S.floorIdx = 1; const s = FLOORS[1].shrines.find(x => /Fountain/.test(x.name)) || FLOORS[1].shrines[0]; const o = window.drawRoomCard; window.drawRoomCard = () => s; S.encounter = drawEncounter('enc'); window.drawRoomCard = o; S.screen = 'shrine'; S.shrineResult = null; S.newRoomFx = false; render(); try { placeShrineFloat(); } catch (e) {} });
  await clean(); await page.waitForTimeout(1500); // let the entrance animation settle
  const sh = await page.evaluate(() => { const b = document.getElementById('shrine-hold-btn'); if (!b) return null; const r = b.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, vw: document.documentElement.clientWidth, vh: innerHeight, badge: (document.querySelector('.round-badge') || {}).textContent }; });
  await shot('shrine_hold');
  ok(sh && Math.abs(sh.cx - sh.vw / 2) < 2 && Math.abs(sh.cy - sh.vh / 2) < 4, `shrine Hold orb centred (${JSON.stringify(sh)})`);
  ok(sh && /^F2\s*·\s*Shrine$/.test(sh.badge.trim()), `shrine floor badge: "${sh && sh.badge}"`);
  const fb = await page.evaluate(() => { const f = document.querySelector('.fo-shrine .fo-enemy .fo-fig'); const r = f.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.click(fb.x, fb.y); await page.waitForTimeout(60);
  const wig = await page.evaluate(() => { const f = document.querySelector('.fo-shrine .fo-enemy .fo-fig'); return f.getAnimations().map(a => a.effect && a.effect.getKeyframes().length).join(',') + ' charging:' + document.getElementById('shrine-hold-btn').classList.contains('charging'); });
  ok(/(^|,)7(,|\s)/.test(wig) && /charging:false/.test(wig), `tapping the shrine wiggles it (${wig})`);
  // hold to receive
  const box = await page.evaluate(() => { const r = document.getElementById('shrine-hold-btn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.waitForTimeout(2600); await page.mouse.up(); await page.waitForTimeout(800);
  for (let g = 0; g < 4; g++) { await page.evaluate(() => { if (S.shrineChoice) chooseShrineOption(S.shrineChoice.options[0]); if (S.relicChoice) chooseRelic(S.relicChoice.options[0]); }); await page.waitForTimeout(300); }
  const cont = await page.evaluate(() => { const b = document.getElementById('shrine-result-continue'); if (!b) return { none: true, result: !!S.shrineResult, screen: S.screen }; const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, vw: document.documentElement.clientWidth, vh: innerHeight, bg: cs.backgroundColor + ' ' + cs.backgroundImage.slice(0, 60) }; });
  await shot('shrine_continue');
  ok(cont && !cont.none && Math.abs(cont.cx - cont.vw / 2) < 2 && Math.abs(cont.cy - cont.vh / 2) < 4, `shrine Continue centred (${JSON.stringify(cont)})`);
  out.push('info Continue background: ' + (cont && cont.bg));

  // ---- play-data upload queue (fetch mocked)
  const up = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const res = {};
    localStorage.removeItem(UPLOAD_QUEUE_KEY); localStorage.removeItem(UPLOADED_KEY); localStorage.removeItem('dungeonScrambleUploadConfirm_v2');
    localStorage.setItem(SHARE_KEY, 'yes');
    const runs = getTelemetryRuns(); res.runsOnDevice = runs.length;
    const fake = id => ({ runId: id, outcome: 'gameover', events: [] });
    window.__posts = []; window.__reply = 'error: boom';
    queueRunUpload(fake('A')); queueRunUpload(fake('B')); queueRunUpload(fake('A'));
    res.q0 = JSON.parse(localStorage.getItem(UPLOAD_QUEUE_KEY) || '[]').map(r => r.runId);
    flushRunUploads(); await wait(50);
    res.badReplyKeeps = JSON.parse(localStorage.getItem(UPLOAD_QUEUE_KEY) || '[]').map(r => r.runId); res.posts1 = __posts.length;
    window.__reply = 'FAIL'; flushRunUploads(); await wait(50);
    res.offlineKeeps = JSON.parse(localStorage.getItem(UPLOAD_QUEUE_KEY) || '[]').map(r => r.runId);
    window.__reply = 'ok'; __posts = []; flushRunUploads(); await wait(100);
    res.okDrains = JSON.parse(localStorage.getItem(UPLOAD_QUEUE_KEY) || '[]').map(r => r.runId); res.posts2 = __posts.length;
    res.done = JSON.parse(localStorage.getItem(UPLOADED_KEY) || '[]');
    queueRunUpload(fake('A')); res.requeueSent = JSON.parse(localStorage.getItem(UPLOAD_QUEUE_KEY) || '[]').map(r => r.runId);
    // resendUnconfirmedRuns: forgets sent marks once, re-queues device runs
    resendUnconfirmedRuns(); res.flag = localStorage.getItem('dungeonScrambleUploadConfirm_v2'); res.doneAfter = localStorage.getItem(UPLOADED_KEY);
    res.qAfterResend = JSON.parse(localStorage.getItem(UPLOAD_QUEUE_KEY) || '[]').length;
    localStorage.setItem(UPLOADED_KEY, '["x"]'); resendUnconfirmedRuns(); res.secondCallKeeps = localStorage.getItem(UPLOADED_KEY);
    // body sanity
    window.__reply = 'duplicate'; __posts = []; localStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify([fake('C')])); flushRunUploads(); await wait(80);
    try { const b = JSON.parse(__posts[0].body); res.body = { kind: b.kind, hasPlayer: !!b.player, screen: b.screen, rec: b.rec.runId }; } catch (e) { res.body = 'bad ' + e.message; }
    res.dupDrains = JSON.parse(localStorage.getItem(UPLOAD_QUEUE_KEY) || '[]').length;
    localStorage.setItem(SHARE_KEY, 'no'); localStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify([fake('D')])); __posts = []; flushRunUploads(); await wait(30); res.optOutNoPost = __posts.length;
    return res;
  });
  ok(JSON.stringify(up.q0) === '["A","B"]', `queue dedupes (${JSON.stringify(up.q0)})`);
  ok(up.badReplyKeeps.length === 2 && up.offlineKeeps.length === 2, `bad reply / offline keep queue (${JSON.stringify(up.badReplyKeeps)}, ${JSON.stringify(up.offlineKeeps)})`);
  ok(up.okDrains.length === 0 && up.posts2 === 2 && up.done.includes('A') && up.done.includes('B'), `ok replies drain the queue (${JSON.stringify(up)})`);
  ok(up.requeueSent.length === 0, `a sent run is not re-queued (${JSON.stringify(up.requeueSent)})`);
  ok(up.flag === '1' && up.doneAfter === null && up.secondCallKeeps === '["x"]', `resendUnconfirmedRuns runs once (flag ${up.flag}, done ${up.doneAfter}, queue ${up.qAfterResend}, 2nd ${up.secondCallKeeps})`);
  ok(up.body && up.body.kind === 'run' && up.dupDrains === 0, `post body + duplicate reply drains (${JSON.stringify(up.body)}, ${up.dupDrains})`);
  ok(up.optOutNoPost === 0, `opted out: nothing posted (${up.optOutNoPost})`);

  // ---- Abandon Run
  await page.evaluate(() => { newGame('dwarf', 'guard'); for (let g = 0; g < 12 && !(S.screen === 'game' && S.encounter && S.encounter.type !== 'Shrine'); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); } S.transitioning = false; try { skipTransition(); } catch (e) {} S.newRoomFx = false; render(); saveGame(); });
  await clean();
  const gear = await page.evaluate(() => { const g = document.querySelector('#settings-btn, .cog-btn, [id*="settings"], [title*="Settings"]'); if (g) { g.click(); return g.id || g.className; } return null; });
  await page.waitForTimeout(300);
  const ab = await page.evaluate(() => { const b = document.getElementById('settings-restart-btn'); return b ? b.textContent : null; });
  ok(ab === 'Abandon Run', `gear menu shows "Abandon Run" (gear ${gear}, got ${ab})`);
  if (ab) {
    await page.click('#settings-restart-btn'); await page.waitForTimeout(300);
    const t = await page.evaluate(() => ({ h: (document.querySelector('.modal-overlay h2') || {}).textContent, b: (document.getElementById('confirm-restart-go') || {}).textContent }));
    ok(t.h === 'Abandon Run?' && t.b === 'Abandon Run', `Abandon confirm (${JSON.stringify(t)})`);
    await Promise.all([page.waitForNavigation({ timeout: 5000 }).catch(() => {}), page.click('#confirm-restart-go')]);
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({ save: hasSave(), lastRun: (getTelemetryRuns().slice(-1)[0] || {}).outcome }));
    ok(!after.save && after.lastRun === 'abandoned', `after Abandon: save cleared, run logged abandoned (${JSON.stringify(after)})`);
  }

  // ---- music after reload with a saved run (mid-fight)
  await page.mouse.click(200, 400); await page.waitForTimeout(300);
  await page.evaluate(() => { newGame('dwarf', 'guard'); for (let g = 0; g < 12 && !(S.screen === 'game' && S.encounter && S.encounter.type !== 'Shrine'); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); } S.transitioning = false; try { skipTransition(); } catch (e) {} render(); saveGame(); });
  await page.reload(); await page.waitForTimeout(500);
  const mr0 = await page.evaluate(() => ({ g: musicGestured, on: Music.on }));
  await page.mouse.click(200, 400); await page.waitForTimeout(500);
  const mr1 = await page.evaluate(() => ({ g: musicGestured, on: Music.on, kind: Music.kind, st: audioCtx && audioCtx.state, screen: S && S.screen }));
  ok(!mr0.on && mr1.on, `music after reload starts on first tap (${JSON.stringify(mr0)} -> ${JSON.stringify(mr1)})`);

  console.log(out.join('\n'));
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})();
