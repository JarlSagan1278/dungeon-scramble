#!/usr/bin/env node
// Builds the game's website for Cloudflare Pages (Oct 22): dist/site/ = home page, /privacy, /press (+ press/media).
// Upload: Cloudflare dashboard -> Workers & Pages -> the "dungeonscramble" Pages project -> new deployment -> drop dist/site.
// Sources: docs/release/privacy.html, docs/release/presskit.html, docs/release/media/ (git-ignored; tools/media remakes it).
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), OUT = path.join(R, 'dist', 'site');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'privacy'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'press'), { recursive: true });
const press = fs.readFileSync(path.join(R, 'docs/release/presskit.html'), 'utf8');
fs.writeFileSync(path.join(OUT, 'privacy', 'index.html'), fs.readFileSync(path.join(R, 'docs/release/privacy.html'), 'utf8').replace(/ ?<span class="ph">[^<]*<\/span>/g, '').replace(/<!--[\s\S]*?-->\n?/g, ''));
// Public pages never show the drafts' [PLACEHOLDER] notes: drop them, and any table row or paragraph left empty.
const scrub = h => h.replace(/<!--[\s\S]*?-->\n?/g, '').replace(/ ?<span class="ph">[^<]*<\/span>/g, '').replace(/<p class="ph">[^<]*<\/p>\n?/g, '')
  .replace(/<tr><th>[^<]*<\/th><td>\s*<\/td><\/tr>\n?/g, '').replace(/<p[^>]*>(\s|&nbsp;)*<\/p>\n?/g, '');
fs.writeFileSync(path.join(OUT, 'press', 'index.html'), scrub(press));
const MEDIA = path.join(R, 'docs/release/media');
let n = 0;
if (fs.existsSync(MEDIA)) {
  fs.mkdirSync(path.join(OUT, 'press', 'media'));
  for (const f of fs.readdirSync(MEDIA)) { fs.copyFileSync(path.join(MEDIA, f), path.join(OUT, 'press', 'media', f)); n++; }
} else console.warn('docs/release/media is missing: run tools/media first, or the press kit has no pictures');
// Home page: the press kit's look (same <head>, Metamorphous included), a short pitch and the links.
const head = press.slice(0, press.indexOf('</head>')).replace(/<title>[^<]*<\/title>/, '<title>Dungeon Scramble</title>')
  + '<meta name="description" content="A roguelike dungeon crawler: roll a 4x4 tray of dice and trace one path through it to attack, block and heal. Coming to iPhone and Android.">'
  + '<style>.links{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:26px 0}.links a{background:var(--gold);color:var(--line);text-decoration:none;padding:10px 18px;border-radius:12px;font-weight:bold;box-shadow:0 4px 0 var(--line)}.lead{max-width:640px;margin:0 auto;text-align:center}</style></head>';
const home = `<!doctype html>\n${head.replace(/^<!doctype html>\s*/i, '')}<body><div class="wrap">
<h1>Dungeon Scramble</h1>
<p class="pitch">Roll a 4x4 tray of dice. Draw your path. Every step is an attack, a block or a skill.</p>
<div class="hero"><figure><img src="press/media/path_turn.gif" alt="A path drawn through six dice, then the turn resolving with damage numbers on a monster"></figure></div>
<p class="lead">Monsters always show their next move, so every turn is a puzzle you can plan for. Four origins, four classes, 56 loot dice, 27 relics and three floors of math-pun monsters.</p>
<p class="lead"><strong>Coming to iPhone and Android.</strong> Floor 1 is free; one purchase unlocks the full dungeon. No ads. A free Floor 1 demo is coming soon to itch.io.</p>
<div class="links"><a href="press/">Press kit</a><a href="privacy/">Privacy policy</a><a href="mailto:contact@dungeonscramble.com">Contact</a></div>
<p class="foot">Made by Jeremy and Katlynn Friedman &middot; contact@dungeonscramble.com</p>
</div></body></html>
`;
fs.writeFileSync(path.join(OUT, 'index.html'), home);
console.log(`Built ${OUT}: index.html, privacy/, press/ (${n} media files)`);
