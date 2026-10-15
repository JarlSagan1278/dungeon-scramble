// Every shrine, every option (Oct 15, after the shrine boosts): runs each shrine's effect the way a player would --
// picking each choice, taking every relic offered, taking the loot pick -- and checks it finishes cleanly.
// usage: node tools/test_shrines.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../dist/dungeon_scramble.html'));
  const out = await page.evaluate(() => {
    const res = [];
    const shrines = FLOORS.flatMap((f, fi) => f.shrines.map(s => ({ s, fi })));
    for (const { s, fi } of shrines) {
      const nOpt = (s.effect && s.effect.type === 'choice') ? s.effect.options.length : 1;
      for (let oi = 0; oi < nOpt; oi++) {
        let note = '';
        try {
          META.lifetime.victories = 3; newGame('dwarf', 'guard'); S.floorIdx = fi;
          const o = window.drawRoomCard; window.drawRoomCard = () => s; S.encounter = drawEncounter('enc'); window.drawRoomCard = o;
          S.screen = 'shrine'; S.shrineResult = null; render();
          const hp0 = S.maxHealth, relics0 = S.relics.length, tray0 = JSON.stringify(S.tray.map(c => c.die.name));
          applyShrineBoon(S.encounter);
          let guard = 0;
          while (guard++ < 12) {
            if (S.shrineChoice) { const opt = S.shrineChoice.options[Math.min(oi, S.shrineChoice.options.length - 1)]; note += '[' + opt.label + '] '; chooseShrineOption(opt); continue; }
            if (S.relicChoice) { chooseRelic(S.relicChoice.options[0]); continue; }
            if (S.pendingLootDie) { const d = S.pendingLootDie; S.pendingLootDie = null; S.tray[0].die = d; continue; }
            if (S.lootChoice) { const d = S.lootChoice.options[0]; S.lootChoice = null; S.tray[1].die = d; note += 'loot '; continue; }
            if (S.shrineResult) { note += '"' + S.shrineResult.text.slice(0, 60) + '" '; continueFromShrine(); continue; }
            break;
          }
          const ok = guard < 12 && !S.shrineChoice && !S.relicChoice && !S.lootChoice;
          note += `| maxHP ${hp0}->${S.maxHealth}, relics +${S.relics.length - relics0}, tray ${JSON.stringify(S.tray.map(c => c.die.name)) === tray0 ? 'same' : 'changed'}, screen ${S.screen}`;
          res.push((ok ? 'ok   ' : 'FAIL ') + `F${fi + 1} ${s.name}: ${note}`);
        } catch (e) { res.push(`FAIL F${fi + 1} ${s.name} option ${oi}: ${e.message}`); }
      }
    }
    return res;
  });
  console.log(out.join('\n'));
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})();
