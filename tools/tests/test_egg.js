// Nov 25 batch (Dylan's playtest notes + the Easter egg). Checks: the fountain's "Gaze into your reflection" puts Your Additive
// Inverse in the next floor's first fight (only once), its Mirror Image echo (half your damage, capped, on its next
// attack; Freeze still loads it), its loot offers the Additive Inverse die, the egg survives save/resume; the
// Armsmaster-style Skill can't convert a die already in the path; tapping the Wanted sign opens the quest poster;
// the one-path feat counters for the new achievements.
// usage: node tools/tests/test_egg.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html'));
  const out = await page.evaluate(() => {
    const res = []; const ok = (c, m) => res.push((c ? 'ok   ' : 'FAIL ') + m);
    META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 };
    const toFight = () => { for (let g = 0; g < 20 && !(S.screen === 'game' && S.encounter && S.encounter.type !== 'Shrine'); g++) { if (S.screen === 'camp') campLeave(); else if (S.forkChoice) pickForkDoor(0); else advanceRoute(); } };
    // 1. the shrine choice
    newGame('dwarf', 'guard'); S.guide = null;
    const f = FLOOR1_SHRINES.find(x => x.name === 'Half-Empty Fountain'), opt = f.effect.options.find(o => o.effect.type === 'inverseGaze');
    ok(!!opt, 'Half-Empty Fountain offers Gaze into your reflection');
    ok(!!FLOOR2_SHRINES.find(x => x.name === 'Half-Full Fountain').effect.options.find(o => o.effect.type === 'inverseGaze'), 'Half-Full Fountain (Floor 2) too');
    runShrineEffect(f, opt.effect); S.shrineResult = null;
    ok(S.inverseFloor === 1 && S.inverseMet === false, 'gazing marks the next floor');
    toFight(); ok(S.encounter.name !== INVERSE_NAME, 'Floor 1 fights stay ordinary');
    // 2. next floor: the first fight is the Inverse
    S.floorIdx = 1; S.encounter = null; S.screen = 'game'; S.encounter = drawEncounter('enc');
    for (let k = 0; k < 12 && S.encounter.type !== 'Enemy'; k++) { ok(S.encounter.name !== INVERSE_NAME && !S.inverseMet, 'a shrine or trap first: the reflection waits for a fight'); S.encounter = drawEncounter('enc'); }
    const e = S.encounter;
    ok(e.name === INVERSE_NAME && e.inverse && e.rule === 'mirror', 'next floor: Your Additive Inverse');
    ok(drawEncounter('enc').name !== INVERSE_NAME, 'only once');
    S.encounter = e;
    // 3. save/resume
    const snap = JSON.parse(JSON.stringify(RUN_FIELDS.reduce((o, k) => (o[k] = S[k], o), {})));
    ok(snap.inverseFloor === 1 && snap.inverseMet === true && snap.encounter.rule === 'mirror', 'the egg is in the save');
    // 4. echo
    const base = e.baseDmg; S.freezeNext = false;
    S.resolveTotal = 9; finishPlayerPath([], { totalDamage: 9, blockGain: 0 });
    let hp = S.health, blk = S.playerBlock = 0; runEncounterAction();
    ok(hp - S.health === base, 'this turn it hits for its base (' + base + ')');
    ok(e.dmg === base + 4 && foeRuleState(e).echo === 4, 'next attack carries the echo (+4 of 9)');
    ok(enemyNextTurnPreview(e).dmg === base + 4, 'the preview shows the echo');
    S.resolveTotal = 40; finishPlayerPath([], { totalDamage: 40, blockGain: 0 }); S.health = 99; S.maxHealth = 99; hp = S.health; runEncounterAction();
    ok(hp - S.health === base + 4, 'the echoed attack lands');
    ok(e.dmg === base + INVERSE_ECHO_CAP, 'the echo is capped at ' + INVERSE_ECHO_CAP);
    S.resolveTotal = 2; finishPlayerPath([], { totalDamage: 2, blockGain: 0 }); S.freezeNext = true; hp = S.health; runEncounterAction();
    ok(hp === S.health && e.dmg === base + 1, 'Freeze skips the echoed hit and loads the next echo');
    // 5. loot
    e.curHealth = 0; S.transitioning = false; onEncounterDefeated();
    ok(S.lootChoice && S.lootChoice.options[0].name === 'Additive Inverse' && S.lootChoice.options[0].inverse, 'its loot offers the Additive Inverse die');
    ok(!ALLOY.concat(GILDED, MAGIC).some(d => d.name === 'Additive Inverse'), 'the die is in no loot pool');
    // 6. a die in the path can't be converted by the Skill
    newGame('dwarf', 'armsmaster'); S.guide = null; toFight(); S.needRoll = false; S.transitioning = false;
    const zi = [...Array(16).keys()].filter(i => inZone(i) && !S.tray[i].minion);
    S.path = [zi[0]]; const before = JSON.stringify(S.tray[zi[0]].forcedFace || null); S.classAbilityUsed = false; useClassAbility(zi[0]);
    ok(!S.classAbilityUsed && JSON.stringify(S.tray[zi[0]].forcedFace || null) === before, 'Skill on a die already in the path does nothing');
    S.path = []; useClassAbility(zi[0]); ok(S.classAbilityUsed, 'Skill on a free zone die still converts');
    // 7. quest poster
    render(); document.querySelectorAll('#room-callout,#room-callout-scrim').forEach(n => n.remove());
    if (S.encounter.quests && S.encounter.quests.length) { openQuestPoster(); const m = document.querySelector('.quest-poster-overlay .fo-quests-float');
      ok(!!m && m.querySelectorAll('.fo-quest').length === S.encounter.quests.length && !m.getAttribute('onclick'), 'tapping the sign opens the quest poster (the sign itself, enlarged)');
      document.querySelectorAll('.modal-overlay').forEach(n => n.remove()); }
    // 8. one-path feats
    S.path = []; const cand = [...Array(16).keys()].filter(i => !S.tray[i].minion && currentFace(S.tray[i]).type === 'hit');
    S.stats.pathHit = 0; S.path = cand.slice(0, 1); startTurnTransition(); ok((S.stats.pathHit || 0) >= Math.min(1, cand.length), 'path feats count Hit dice in a path');
    ok(achievementsShown().every(a => !a.only || a.only()) && !achievementsShown().some(a => a.id === 'patron'), 'the purchase medal is hidden outside the store app');
    // 9. class unlocks (Nov 25)
    const L0 = JSON.parse(JSON.stringify(META.lifetime)), A0 = JSON.parse(JSON.stringify(META.achievements)), R0 = META.renown, D0 = JSON.parse(JSON.stringify(META.daily || {})), B0 = DEPTH_BEST.overall;
    META.lifetime.runsPlayed = 0; META.renown = 0; META.daily = {}; delete META.achievements.rule_breaker; DEPTH_BEST.overall = 1;
    ok(['guard','armsmaster','dungeoneer','arcanist'].every(isClassUnlocked), 'the starting four are always open');
    ok(['medic','trickster','ranger','alchemist','engineer'].every(id => !isClassUnlocked(id)), 'the five new classes start locked');
    META.lifetime.runsPlayed = 9; newGame('dwarf', 'guard'); S.guide = null; S.stats.damageDealt = 0; recordMetaProgress('defeat');
    ok(isClassUnlocked('medic') && (S.newClasses || []).includes('medic'), 'the 10th run unlocks the Field Medic and the end screen says so');
    META.daily = { a: {}, b: {}, c: {}, d: {}, e: {} }; ok(isClassUnlocked('trickster'), '5 Daily Dungeons unlock the Trickster');
    META.renown = RANKS.find(r => r.name === 'Rational').at; ok(isClassUnlocked('ranger'), 'the Rational rank unlocks the Ranger');
    META.achievements.rule_breaker = { date: 1 }; ok(isClassUnlocked('alchemist'), 'Rule Breaker unlocks the Alchemist');
    DEPTH_BEST.overall = 4; ok(isClassUnlocked('engineer'), 'a Depth 3 win unlocks the Engineer');
    META.lifetime = L0; META.achievements = A0; META.renown = R0; META.daily = D0; DEPTH_BEST.overall = B0; saveMeta();
    return res;
  });
  out.forEach(l => console.log(l));
  if (errors.length) console.log('FAIL page errors: ' + errors.slice(0, 3).join(' | '));
  await browser.close();
  process.exit(out.some(l => l.startsWith('FAIL')) || errors.length ? 1 : 0);
})();
