// itch cover backdrop (Nov 27): the left of the 630x500 cover (drawn at 2x, 1260x1000): the title cover art (its logo included) and
// a one-line pitch in the game's own fonts; the right is left dark for the phone clip (itch_cover_mk.py overlays it).
// node build.js --release && node tools/media/itch_cover_bg.js  -> cast/itch/bg.png (run from the same dir as itch_cover.js)
const L = require('./lib'); const fs = require('fs');
(async () => {
  const b = await L.chromium.launch(); const p = await b.newPage({ viewport: { width: 1260, height: 1000 } });
  await p.goto('file:///home/user/dungeon-scramble/dist/release/dungeon_scramble.html'); await L.sleep(1500);
  await p.evaluate(() => {
    const COVER_ART = document.querySelector('.title-cover-art').src; // the title screen's art (the logo is part of it)
    document.body.innerHTML = `<div id="cv">
      <div class="art" style="background-image:url('${COVER_ART}')"></div>
      <div class="shade"></div>
      <div class="pitch">Draw a path across your dice.<br>Every die on it acts.</div>
      <div class="tags"><span>Roguelike</span><span>Dice</span><span>Puzzle</span></div>
    </div>`;
    const s = document.createElement('style'); s.textContent = `
      html, body{ margin:0; background:#1c1109 !important; overflow:hidden; } body::before, body::after{ display:none !important; }
      #cv{ position:fixed; inset:0; background:#1c1109; }
      #cv .art{ position:absolute; left:0; top:0; width:720px; height:855px; background-size:100% auto; background-position:50% 0; background-repeat:no-repeat; filter:saturate(1.05); }
      #cv .shade{ position:absolute; left:0; top:0; width:720px; height:1000px; background:linear-gradient(180deg, transparent 0%, transparent 55%, rgba(28,17,9,.85) 74%, #1c1109 86%), linear-gradient(90deg, transparent 80%, #1c1109 100%); }
      #cv .pitch{ position:absolute; left:36px; top:772px; width:680px; white-space:nowrap; font:400 38px/1.2 var(--font-display); color:#fff1d6; -webkit-text-stroke:8px #0c0705; paint-order:stroke fill; }
      #cv .tags{ position:absolute; left:38px; top:900px; display:flex; gap:14px; }
      #cv .tags span{ font:800 26px var(--font-ui); color:#241c10; background:#ffc83a; border:4px solid #0c0705; border-radius:14px; padding:4px 18px; box-shadow:0 5px 0 #0c0705; }`;
    document.head.appendChild(s);
  });
  await L.sleep(800); fs.mkdirSync('cast/itch', { recursive: true });
  await p.screenshot({ path: 'cast/itch/bg.png' }); console.log('cast/itch/bg.png'); await b.close();
})();
