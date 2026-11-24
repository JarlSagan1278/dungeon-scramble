// Steam store and library images (Nov 25): every size Steam asks for, composed from the game's own art.
// usage: node tools/media/steam_capsules.js   -> docs/release/media/steam/*.png (git-ignored)
// The cover is 860 px wide and the logo 640 px, so the big ones (library hero 3840 px, library logo 1280 px) are drafts
// that come out soft; when Jeremy exports the full-size title art (DungeonScramble_TitleArt_canvas.psd) and logo, drop them
// in as src/art/COVER_ART.jpeg / LOGO_IMG.png (or point COVER/LOGO below at them) and rerun for the final set.
// Steam's rules for capsules: the game's art and logo only (no review quotes, awards or "out now" text).
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..'), ART = path.join(ROOT, 'src/art'), OUT = path.join(ROOT, 'docs/release/media/steam');
fs.mkdirSync(OUT, { recursive: true });
const u = f => 'file://' + path.join(ART, f);
const COVER = u('COVER_ART.jpeg'), LOGO = u('LOGO_IMG.png'), PAPER = u('PAPER_TILE.jpeg');
const BOSSES = ['Rogue_Golemancer', 'Heating_Elemental', 'Grosteque_Grafter', 'The_Necrorancher', 'Bellicose_Biomancer', 'Ceramic_Golem',
  'Myceleus_Co_consul_of_Rot', 'Extruzeon_Co_consul_of_Waste', 'Toadtaur_Wizard_Assistant_to_the_Co_consul'].map(n => u('MONSTER_ART/' + n + '.webp'));
const HEROES = ['DWARF_PORTRAITS/0.webp', 'GNOME_PORTRAITS/0.webp', 'HALFLING_PORTRAITS/0.webp', 'PIXIE_PORTRAITS/0.webp'].map(u);
const base = `*{box-sizing:border-box;margin:0;padding:0} html,body{width:100%;height:100%;overflow:hidden;background:#130d09}
 .stage{position:relative;width:100%;height:100%;overflow:hidden}
 .cover{position:absolute;inset:0;background:url(${COVER}) center/cover no-repeat}
 .shade{position:absolute;inset:0}
 .logo{position:absolute;left:50%;transform:translateX(-50%);filter:drop-shadow(0 6px 0 #0c0705) drop-shadow(0 0 18px rgba(0,0,0,.65))}
 .mon{position:absolute;bottom:0;filter:drop-shadow(0 8px 0 rgba(0,0,0,.35))}`;
// each image: [file, width, height, transparent?, body html]
const coverAt = (y, extra='') => `<div class="cover" style="background-position:50% ${y}%;${extra}"></div>`;
const IMAGES = [
  // Header capsule (store page top, search, recommendations)
  ['header_capsule_920x430', 920, 430, false, coverAt(74) + `<div class="shade" style="background:linear-gradient(180deg,rgba(19,13,9,.82) 0,rgba(19,13,9,.25) 46%,rgba(19,13,9,0) 62%)"></div>
    <img class="logo" src="${LOGO}" style="top:14px;width:470px">`],
  // Small capsule (lists): the logo must read at this size
  ['small_capsule_462x174', 462, 174, false, coverAt(70, 'filter:brightness(.55) saturate(1.1)') + `<img class="logo" src="${LOGO}" style="top:18px;width:390px">`],
  // Main capsule (front page carousel)
  ['main_capsule_1232x706', 1232, 706, false, coverAt(76) + `<div class="shade" style="background:linear-gradient(180deg,rgba(19,13,9,.85) 0,rgba(19,13,9,.3) 40%,rgba(19,13,9,0) 58%)"></div>
    <img class="logo" src="${LOGO}" style="top:22px;width:620px">`],
  // Vertical capsule (seasonal sales): the cover as drawn, title lettering included
  ['vertical_capsule_748x896', 748, 896, false, `<div class="cover" style="background-size:748px auto;background-position:50% 0"></div>
    <div class="shade" style="top:auto;height:60px;background:linear-gradient(180deg,rgba(19,13,9,0),#130d09)"></div>`],
  // Library capsule (the player's game library grid)
  ['library_capsule_600x900', 600, 900, false, `<div class="cover" style="background-size:auto 900px;background-position:46% 0"></div>`],
  // Library header
  ['library_header_920x430', 920, 430, false, coverAt(74) + `<div class="shade" style="background:linear-gradient(180deg,rgba(19,13,9,.82) 0,rgba(19,13,9,.25) 46%,rgba(19,13,9,0) 62%)"></div>
    <img class="logo" src="${LOGO}" style="top:14px;width:470px">`],
  // Library hero (behind the game's library page; no logo: Steam lays the library logo over it)
  ['library_hero_3840x1240', 3840, 1240, false, `<div class="cover" style="background-position:50% 100%;filter:blur(22px) brightness(.4);transform:scale(1.1)"></div>
    <div class="shade" style="background:radial-gradient(ellipse at 50% 100%,rgba(255,150,60,.32),rgba(19,13,9,0) 62%),linear-gradient(180deg,rgba(19,13,9,.55),rgba(19,13,9,0) 40%)"></div>
    ${HEROES.map((h, i) => `<img class="mon" src="${h}" style="left:${560 + i * 250}px;height:${430 - (i % 2) * 30}px;bottom:${70 + (i % 2) * 40}px;z-index:2">`).join('')}
    ${BOSSES.slice(0, 6).map((b, i) => `<img class="mon" src="${b}" style="left:${1660 + i * 330}px;height:${520 + (i % 2) * 70}px;bottom:${60 + (i % 2) * 50}px;z-index:${i % 2 ? 1 : 2}">`).join('')}`],
  // Library logo (transparent; Steam places it over the hero)
  ['library_logo_1280x720', 1280, 720, true, `<img class="logo" src="${LOGO}" style="top:50%;transform:translate(-50%,-50%);width:1240px;filter:drop-shadow(0 10px 0 #0c0705)">`],
  // Community icon and client icon
  ['community_icon_184x184', 184, 184, false, `<div class="cover" style="background-size:430px auto;background-position:50% 62%"></div>`],
];
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h, clear, body] of IMAGES) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const tmp = path.join(OUT, '_' + name + '.html'); // a file page, so the file:// art loads
    fs.writeFileSync(tmp, `<!doctype html><style>${base}${clear ? ' html,body{background:transparent}' : ''}</style><div class="stage">${body}</div>`);
    await p.goto('file://' + tmp);
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(OUT, name + '.png'), omitBackground: clear });
    await p.close(); fs.unlinkSync(tmp); console.log('wrote', name);
  }
  await b.close();
})();
