#!/usr/bin/env node
/**
 * Regression test harness for Dungeon Scramble.
 *
 * Loads the built dist/dungeon_scramble.html in a headless browser and
 * drives real games via the game's own in-page functions (newGame,
 * toggleSelect, skipTransition, etc.) with a simple random-but-legal bot,
 * once for each of the 5 Origin/Class combos listed in main() (one per
 * origin, plus the Debug class; not full coverage). Reports
 * VICTORY / GAMEOVER / TIMEOUT / ERROR for each run.
 *
 * Usage: node tools/sim.js [--turns=2000] [--file=dist/dungeon_scramble.html]
 */
const path = require('path');
const { chromium } = require('playwright');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const MAX_TURNS = parseInt(args.turns || '2000', 10);
const FILE = path.resolve(args.file || path.join(__dirname, '..', 'dist', 'dungeon_scramble.html'));

// One bot "tick": inspects live game state and takes one legal action.
// Runs entirely inside the page via page.evaluate so it always sees the
// real, current S object rather than a stale copy.
const TICK_FN = () => {
  // `S` is a top-level `let` in the page's own <script>, not a property of
  // `window` -- but top-level let/const share one global lexical scope
  // across all scripts in a document, so plain `S` (no window. prefix) is
  // visible here too.
  if (typeof S === 'undefined' || !S) return { done: false, note: 'no-state' };

  if (S.screen === 'victory') return { done: true, result: 'VICTORY' };
  if (S.screen === 'gameover') return { done: true, result: 'GAMEOVER' };

  if (S.transitioning) {
    skipTransition();
    return { done: false, note: 'skip-transition' };
  }
  if (S.lootChoice) {
    const opts = S.lootChoice.options;
    chooseLoot(opts[Math.floor(Math.random() * opts.length)]);
    return { done: false, note: 'loot' };
  }
  if (S.shrineChoice) {
    const opts = S.shrineChoice.options;
    chooseShrineOption(opts[Math.floor(Math.random() * opts.length)]);
    return { done: false, note: 'shrine-choice' };
  }
  if (S.relicChoice) {
    const opts = S.relicChoice.options;
    chooseRelic(opts[Math.floor(Math.random() * opts.length)]);
    return { done: false, note: 'relic' };
  }
  if (S.shrineResult) {
    continueFromShrine();
    return { done: false, note: 'shrine-continue' };
  }
  if (S.pendingLootDie) {
    // The swap picker is now a pop-up over whatever screen is showing
    // (see renderSwapModal(), render.js) rather than its own S.screen
    // value, so this checks the die itself instead of S.screen === 'swap'.
    // swapInLootDie replaces a random tray slot with the pending loot die.
    swapInLootDie(Math.floor(Math.random() * 16));
    return { done: false, note: 'swap' };
  }
  if (S.screen === 'camp') {
    // Randomly rest (once), randomly attempt an upgrade, then always leave
    // eventually so the run doesn't stall forever in camp.
    if (!S.campRested && Math.random() < 0.7) {
      campRest();
      return { done: false, note: 'camp-rest' };
    }
    if (Math.random() < 0.3) {
      const cat = Math.random() < 0.5 ? 'attack' : 'maneuver';
      const level = S.campUpgrades[cat] ? null : 1;
      if (level && typeof canUpgrade === 'function' && canUpgrade(cat, level)) {
        campUpgrade(cat, level);
        return { done: false, note: 'camp-upgrade' };
      }
    }
    campLeave();
    return { done: false, note: 'camp-leave' };
  }
  if (S.screen === 'shrine') {
    // No pending shrine UI: a player would hold the shrine to activate it
    // (v1.36.0 ritual), so trigger the boon directly.
    if (!S.relicChoice && !S.lootChoice && !S.pendingLootDie) { applyShrineBoon(S.encounter); return { done: false, note: 'shrine-activate' }; }
    return { done: false, note: 'shrine-wait' };
  }
  if (S.screen === 'game') {
    // Build a path: pick a random legal next die each step, for a random
    // path length, then resolve. If no first move is legal, end turn with
    // an empty path (some tray states / class zones can be very
    // restrictive, but resolvePath on an empty path is a no-op turn).
    // v1.38.0: sometimes spend Swap/Reroll tokens, and sometimes Clear (undoes swaps).
    if ((S.swapTokens||0) > 0 && Math.random() < 0.4) { armTrayAct('swap', null, true); }
    else if ((S.rerollTokens||0) > 0 && Math.random() < 0.4) { armTrayAct('reroll', null, true); }
    for (let k = 0; k < 6 && S.trayAct; k++) toggleSelect(Math.floor(Math.random() * 16));
    if (S.trayAct) cancelTrayAct();
    if ((S.swapLog||[]).length && Math.random() < 0.3) clearPathAll();
    const maxLen = 1 + Math.floor(Math.random() * 4);
    let steps = 0;
    while (S.path.length < maxLen && steps < 20) {
      steps++;
      const legal = [];
      for (let i = 0; i < 16; i++) if (canSelect(i)) legal.push(i);
      if (!legal.length) break;
      toggleSelect(legal[Math.floor(Math.random() * legal.length)]);
      // an armed Swap/Reroll face (tapped as the first die) takes the next tap(s)
      for (let k = 0; k < 6 && S.trayAct; k++) toggleSelect(Math.floor(Math.random() * 16));
      if (S.trayAct) cancelTrayAct();
    }
    endTurnButton();
    return { done: false, note: 'turn' };
  }
  return { done: false, note: 'unknown-screen:' + S.screen };
};

async function runOne(browser, originId, classId, label) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('file://' + FILE);
  await page.evaluate(({ originId, classId, relicsAll }) => {
    // Pre-unlock every Origin (Halfling/Pixie are achievement-gated in the
    // real game, see isOriginUnlocked()/newGame() in logic.js) so the sim
    // actually exercises the requested origin instead of silently falling
    // back to Dwarf -- each page starts with fresh/empty META, so without
    // this, newGame()'s own lock-enforcement fallback would quietly swap
    // the combo under test.
    META.lifetime.victories = 1;
    META.lifetime.bestFloorReached = 3;
    META.achievements['origin_duo'] = { date: Date.now() };
    newGame(originId, classId);
    // --relics=all stress-tests every relic hook at once (default: none, so the
    // baseline sim matches a fresh player's run).
    if(relicsAll) RELICS.forEach(r=>grantRelic(r.id, {silent:true}));
  }, { originId, classId, relicsAll: args.relics==='all' });

  const actualOriginId = await page.evaluate(() => S.origin.id);
  if (actualOriginId !== originId) {
    pageErrors.push(`newGame('${originId}', ...) actually started as origin '${actualOriginId}' -- an unlock-gate regression, not a real game error, but it means this combo wasn't tested.`);
  }

  let result = 'TIMEOUT';
  const notes = {};
  for (let t = 0; t < MAX_TURNS; t++) {
    if (pageErrors.length) { result = 'ERROR'; break; }
    let tick;
    try {
      tick = await page.evaluate(TICK_FN);
    } catch (e) {
      pageErrors.push(e.message);
      result = 'ERROR';
      break;
    }
    notes[tick.note] = (notes[tick.note] || 0) + 1;
    if (tick.done) { result = tick.result; break; }
  }
  await page.close();
  return { label, result, errors: pageErrors, notes };
}

async function main() {
  console.log(`Dungeon Scramble regression sim`);
  console.log(`File: ${FILE}`);
  console.log(`Max turns per run: ${MAX_TURNS}\n`);

  const browser = await chromium.launch();
  const combos = [
    ['dwarf', 'guard'],
    ['gnome', 'armsmaster'],
    ['halfling', 'dungeoneer'],
    ['pixie', 'arcanist'],
    ['dwarf', 'debug'],
  ];

  // A run only FAILs the suite if the page threw a JS error/exception --
  // VICTORY/GAMEOVER/TIMEOUT are all legitimate outcomes for a random bot
  // (TIMEOUT just means this combo's bot didn't win or die within the turn
  // cap, which can be normal for a defensive class/origin pairing).
  let failures = 0;
  for (const [originId, classId] of combos) {
    const label = `${originId}/${classId}`;
    const r = await runOne(browser, originId, classId, label);
    const ok = r.errors.length === 0;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(20)} -> ${r.result}`);
    if (r.errors.length) {
      r.errors.forEach(e => console.log(`    error: ${e}`));
    }
  }
  await browser.close();

  console.log('');
  if (failures) {
    console.log(`${failures} run(s) threw errors.`);
    process.exit(1);
  } else {
    console.log('All runs completed with no errors (VICTORY/GAMEOVER/TIMEOUT are all OK).');
    process.exit(0);
  }
}

main();
