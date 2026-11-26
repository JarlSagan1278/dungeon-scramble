// "App-like" audit (Nov 27, Jeremy: the end screen's Details button and play-data question looked app-like; "do the
// audit"). Opens every pop-up, menu, confirm and small notice, photographs it on the phone (395x769) and the menus on PC
// (1375x947), and lays them out on contact sheets for review. Not a pass/fail check: the judging is by eye.
// usage: node build.js && node tools/audit_look.js [names]  -> tools/audit_out/look/<name>.png + sheet_*.png
process.env.DS_STYLEDUMP = '1';
const path = require('path'), fs = require('fs');
const { INIT, HELP, URL_ } = require('./tests/test_screens.js');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const OUT = path.join(__dirname, 'audit_out', 'look'); fs.mkdirSync(OUT, { recursive: true });
const FIGHT = `__fight('dwarf','armsmaster'); S.backPocket=[clone(ALLOY[0]), basic('attack',1)]; S.swapTokens=1; S.rerollTokens=1; ['whetstone','banner'].forEach(id=>grantRelic(id,{silent:true})); META.relicHintSeen=Date.now(); render(); __clean();`;
const TITLE = `preGameScreen='title'; S=null; render();`;
const CAMP = `__fight('dwarf','guard'); S.backPocket=[clone(ALLOY[0]), basic('attack',1), basic('attack',1), basic('attack',1)]; S.floorIdx=0; S.routeStep=4; S.route=buildRoute(); advanceRoute(); render(); __clean();`;
// [name, setup (page JS), then: optional click selector or extra JS]
const ITEMS = [
  ['settings', TITLE + 'openSettingsModal();'],
  ['settings_abandon', FIGHT + 'openSettingsModal();', { click: '#settings-restart-btn' }],
  ['settings_reset', TITLE + 'openSettingsModal();', { click: '#settings-reset-progress-btn' }],
  ['new_run_confirm', FIGHT + 'saveGame(); ' + TITLE, { click: '#title-newrun-btn' }],
  ['how_to_play', TITLE + 'openTutorialModal(0);'],
  ['records_history', TITLE + "openRecordsModal('history');"],
  ['records_achievements', TITLE + "openRecordsModal('achievements');"],
  ['records_rank', TITLE + "openRecordsModal('rank');"],
  ['codex', TITLE + 'openCodexModal();'],
  ['credits', TITLE + 'openCreditsModal();'],
  ['export_data', TITLE + 'openExportDataModal();'],
  ['back_pocket', FIGHT, { click: '#open-backpocket-btn' }],
  ['items_tokens', FIGHT, { click: '#open-tokens-btn' }],
  ['relic_case', FIGHT + 'openRunRelicsModal();'],
  ['action_key', FIGHT + "openInfoModal('Action Key', keyCardHTML());"],
  ['log', FIGHT + "openInfoModal('Log', '');"],
  ['quest_poster', FIGHT + "S.encounter.quests=['5 damage: 3 maneuvers','3 damage: route square root']; S.encounter.questsDone=[false,false]; render(); openQuestPoster();"],
  ['action_note', FIGHT, { click: '.fo-enemy .fo-chips .status-chip, .fo-enemy .enemy-action-badge' }],
  ['face_tooltip', FIGHT + "showFaceTooltip(document.querySelector('#tray > .die').getBoundingClientRect(), '<strong>Hit 1</strong>'+FACE_DESC.hit);"],
  ['toast', FIGHT + "showToast('Copied: paste it anywhere');", { wait: 400 }],
  ['toast_good', FIGHT + "showToast('Nicely done! Long-press any die to see what its face does.', 'good');", { wait: 400 }],
  ['lock_hint', TITLE + "preGameScreen='setup'; render(); showLockHint('Field Medic', 'Play 10 runs to unlock.');", { wait: 500 }],
  ['relic_choice', FIGHT + "S.relicChoice={ name:'Relic Shrine', options:RELICS.filter(r=>!r.origin).slice(0,3).map(r=>r.id), left:1 }; render();"],
  ['shrine_choice', FIGHT + "S.shrineChoice={ name:'Half-Full Fountain', options:[{label:'Drink: heal 6'},{label:'Toss a coin: a Reroll token'},{label:'Gaze into your reflection'}].map(o=>({label:o.label, action:()=>{}})) }; render();"],
  ['equip_swap', FIGHT + "S.pendingLootDie=clone(ALLOY[2]); render();"],
  ['share_ask_midrun', "localStorage.setItem('dungeonScrambleShareAskTest','1'); try{localStorage.removeItem(SHARE_KEY);}catch(e){} " + FIGHT + " S.tele.shareAsked=false; maybeShareAskMidRun();", { wait: 800 }],
  ['camp_break_confirm', CAMP, { click: '#leave-btn' }],
  ['camp_rest_confirm', CAMP + "confirmCampfire('rest', ()=>{});"],
  ['camp_empty_pocket', CAMP + "confirmEmptyPocket(()=>{});"],
];
const PC = ['settings', 'records_achievements', 'codex', 'back_pocket', 'relic_choice', 'toast'];
const want = process.argv[2] ? process.argv[2].split(',') : null;
(async () => {
  const b = await chromium.launch(); const done = [];
  const runs = [...ITEMS.map(x => [x[0], x[1], x[2] || {}, false]), ...ITEMS.filter(x => PC.includes(x[0])).map(x => [x[0], x[1], x[2] || {}, true])];
  for (const [name, setup, then = {}, pc] of runs) {
    if (want && !want.includes(name)) continue;
    const p = await b.newPage({ viewport: pc ? { width: 1375, height: 947 } : { width: 395, height: 769 }, deviceScaleFactor: 1 });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(INIT); await p.addInitScript(pc => { try { localStorage.setItem('dungeonScramblePC', pc ? '1' : '0'); } catch (e) {} }, pc);
    await p.goto(URL_ + (pc ? '?pc=1' : '')); await p.waitForTimeout(400); await p.evaluate(HELP);
    await p.evaluate(() => { META.lifetime.runsPlayed = Math.max(META.lifetime.runsPlayed || 0, 3); saveMeta(); }); // past the first-run gates (the Daily button)
    try { await p.evaluate(setup); } catch (e) { errs.push('setup: ' + e.message); }
    await p.waitForTimeout(700);
    await p.evaluate(() => { showRoomCallout._runStart = S && S.tele && S.tele.runId; document.querySelectorAll('#floor-card').forEach(n => n.remove()); }); // each page is a fresh run: no run-start card
    if (then.click) { try { await p.click(then.click, { force: true, timeout: 3000 }); } catch (e) { errs.push('click ' + then.click + ': ' + e.message.split('\n')[0]); } await p.waitForTimeout(600); }
    await p.waitForTimeout(then.wait || 300);
    const f = (pc ? 'pc_' : '') + name + '.png'; await p.screenshot({ path: path.join(OUT, f) });
    done.push(f); console.log((errs.length ? 'WARN ' : 'ok   ') + f + (errs.length ? '  ' + errs.join(' | ').slice(0, 200) : ''));
    await p.close();
  }
  await b.close();
  // contact sheets: phone shots 6 across at half size, PC shots 3 across at a third
  const { execSync } = require('child_process');
  execSync(`python3 - <<'PY'
from PIL import Image, ImageDraw
import glob, os
D = ${JSON.stringify(OUT)}
for kind, pat, scale, cols in (('phone', '[!p]*.png', .5, 6), ('pc', 'pc_*.png', .3, 3)):
    fs = sorted(f for f in glob.glob(os.path.join(D, pat)) if not os.path.basename(f).startswith('sheet'))
    if not fs: continue
    ims = [Image.open(f).convert('RGB') for f in fs]
    w, h = int(ims[0].width * scale), int(ims[0].height * scale)
    rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * (w + 8), rows * (h + 26)), (255, 255, 255)); d = ImageDraw.Draw(S)
    for k, (f, im) in enumerate(zip(fs, ims)):
        x, y = (k % cols) * (w + 8), (k // cols) * (h + 26)
        d.text((x + 4, y + 6), os.path.basename(f)[:-4], fill=(0, 0, 0)); S.paste(im.resize((w, h)), (x, y + 22))
    S.save(os.path.join(D, 'sheet_' + kind + '.png'))
PY`);
  console.log('sheets in', OUT);
})();
