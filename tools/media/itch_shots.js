// itch page screenshots (Nov 27, Jeremy: "do 1 and 2" -- new screenshots, each showing one thing only this game has).
// Floors 1-2 only (the demo's floors). node build.js --release && node tools/media/itch_shots.js [names]
// -> docs/release/media/itch/<n>_<name>.png: phone shots 790x1538 (2x), the PC shot 1920x1080.
const L = require('./lib'); const fs = require('fs');
const OUT = L.OUT + 'itch/'; fs.mkdirSync(OUT, { recursive: true });
const which = process.argv[2] || 'all'; const want = k => which === 'all' || which.split(',').includes(k);
// a fight against a named foe (or the floor's boss), mid-run loadout
async function fight(p, foe, o = {}) {
  await L.midRun(p, { floorIdx: o.floorIdx ?? 1, routeStep: 2, loot: o.loot || [2, 3, 1], relics: o.relics ?? 3, hp: o.hp || [21, 28], upg: 4 });
  await p.evaluate(({ foe, floorIdx }) => {
    const pool = [...FLOOR1_ENEMIES, ...FLOOR2_ENEMIES, ...(typeof FLOOR1_TRAPS !== 'undefined' ? FLOOR1_TRAPS : []), ...(typeof FLOOR2_TRAPS !== 'undefined' ? FLOOR2_TRAPS : []), ...FLOORS.flatMap(f => f.bosses || [])];
    const c = pool.find(x => x.name === foe); if (!c) throw new Error('no foe ' + foe);
    S.floorIdx = floorIdx; S.screen = 'game'; S.shrineChoice = null; S.lootChoice = null;
    const o = window.drawRoomCard; window.drawRoomCard = () => c; S.encounter = drawEncounter(/Boss/.test(c.type) ? 'boss' : 'enc'); window.drawRoomCard = o;
    S.needRoll = false; S.transitioning = false; render();
  }, { foe, floorIdx: o.floorIdx ?? 1 });
  await L.sleep(1200);
  for (let k = 0; k < 3; k++) if (await p.locator('#room-callout').count()) { await p.click('#room-callout', { force: true }); await L.sleep(1200); }
  await p.evaluate(() => { S.needRoll = false; render(); document.querySelectorAll('.coach-overlay, #tip-bubble, .src-chip, #symbol-intro').forEach(n => n.remove()); });
  await L.sleep(600);
}
const clean = p => p.evaluate(() => document.querySelectorAll('.coach-overlay, #tip-bubble, .tip-bubble, .src-chip, #symbol-intro, .delta-float, .relic-hint-chip').forEach(n => n.remove()));
async function drawBest(p, len = 6) { const r = await L.findPath(p, len); for (const [i] of r.path) { await L.tapDie(p, i); await L.sleep(320); } await L.sleep(900); return r; }
async function phone(b, origin, klass) {
  const { ctx, p } = await L.openPage(b, { dpr: 2 });
  await p.evaluate(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await L.seedMeta(p); await p.evaluate(() => { META.renown = 600; META.lifetime.runsPlayed = Math.max(META.lifetime.runsPlayed || 0, 10); saveMeta(); render(); }); // the Ranger (Rational rank) and Field Medic (10 runs) unlocked
  await L.startRun(p, origin, klass); return { ctx, p };
}
(async () => {
  const b = await L.chromium.launch();
  // 1. the core: a long path through the dice, the damage counter, Pointer's +1s
  if (want('path')) { const { ctx, p } = await phone(b, 'Dwarf', 'Ranger');
    let best = null; for (let k = 0; k < 12; k++) { await fight(p, 'The Warcart'); const r = await L.findPath(p, 7); if (!best || r.dmg > best.dmg) best = r; if (r.path.length >= 6 && r.dmg >= 20) break; }
    await drawBest(p, 7); await clean(p); await p.screenshot({ path: OUT + '1_path.png' }); console.log('path ok'); await ctx.close(); }
  // 2. the foe always shows its next move: a Floor 1 boss winding up its big hit
  if (want('boss')) { const { ctx, p } = await phone(b, 'Gnome', 'Guard');
    await fight(p, 'Rogue Golemancer', { floorIdx: 0, hp: [19, 24], loot: [0, 3, 0] });
    await p.evaluate(() => { const e = S.encounter; for (let k = 0; k < 8 && !((enemyNextTurnPreview(e) || {}).special || {}).windup; k++) { e.specialIdx = (e.specialIdx || 0) + 1; } /* the next move is Golem Lemma, its 7-damage wind-up */ render(); });
    await L.sleep(800); await clean(p); await p.screenshot({ path: OUT + '2_boss_next_move.png' }); console.log('boss', await p.evaluate(() => JSON.stringify(enemyNextTurnPreview(S.encounter)).slice(0, 120))); await ctx.close(); }
  // 3. a foe that bends the rules
  if (want('rule')) { const { ctx, p } = await phone(b, 'Pixie', 'Arcanist');
    for (let k = 0; k < 10; k++) { await fight(p, 'Transposer Kitty'); const r = await L.findPath(p, 6); if (r.dmg >= 12) break; }
    await drawBest(p, 6); await clean(p); await p.screenshot({ path: OUT + '3_foe_rule.png' }); await ctx.close(); }
  // 4. loot: the chest opens on two new dice
  if (want('loot')) { const { ctx, p } = await phone(b, 'Halfling', 'Field Medic');
    await fight(p, 'Rusty Golem');
    await p.evaluate(() => { S.encounter.curHealth = 0; S.lootChoice = { options: pickLootNUnused(GILDED, 3), lootName: FLOORS[1].lootName, overkill: true, nearMiss: 0 }; S.lootChoice.fresh = S.lootChoice.options.map(o => o.name); render(); }); // an Overkill: three to choose from
    await L.sleep(1500); if (await p.locator('.loot-chest-btn').count()) { await p.click('.loot-chest-btn', { force: true }); await L.sleep(2200); }
    await clean(p); await p.screenshot({ path: OUT + '4_loot.png' }); await ctx.close(); }
  // 5. camp: rest or train, the Back Pocket
  if (want('camp')) { const { ctx, p } = await phone(b, 'Halfling', 'Dungeoneer');
    await p.evaluate(() => { const slots = pickN(S.tray.map((c, i) => i).filter(i => S.tray[i].die.cat !== 'origin'), 6); [...pickN(GILDED, 2), ...pickN(ALLOY, 2)].forEach((d, k) => { S.tray[slots[k]].die = d; });
      S.backPocket = [clone(ALLOY[1]), basic('attack', 1), basic('attack', 1)];
      pickN(RELICS.filter(r => !r.origin && r.id !== 'flask'), 3).forEach(r => grantRelic(r.id, { silent: true })); S.health = 14; S.maxHealth = 24; S.floorIdx = 1; S.routeStep = 4; S.route = buildRoute(); advanceRoute(); render(); });
    await L.sleep(2500); await clean(p); await p.screenshot({ path: OUT + '5_camp.png' }); await ctx.close(); }
  // 6. the PC layout (mouse, keyboard or controller), a path drawn
  if (want('pc')) { const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } }); const p = await ctx.newPage();
    await p.addInitScript(() => { try { localStorage.setItem('dungeonScramblePC', '1'); localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
    await p.goto('file:///home/user/dungeon-scramble/dist/release/dungeon_scramble.html?pc=1'); await L.sleep(1500);
    await L.seedMeta(p); await p.evaluate(() => { META.renown = 600; saveMeta(); render(); }); await L.startRun(p, 'Dwarf', 'Ranger');
    for (let k = 0; k < 8; k++) { await fight(p, 'Blastogenesis Engine', { relics: 5 }); const r = await L.findPath(p, 6); if (r.dmg >= 18) break; }
    await drawBest(p, 6); const last = await p.evaluate(() => S.path[S.path.length - 1]); await p.hover(`#tray > .die[data-idx="${last}"]`, { force: true }); await L.sleep(600); // the caption reads the last die
    await clean(p); await p.screenshot({ path: OUT + '6_pc.png' }); await ctx.close(); }
  await b.close();
})();
