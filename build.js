#!/usr/bin/env node
/**
 * Build script: reassembles the modular src/ files into a single
 * self-contained, distributable HTML file (dist/dungeon_scramble.html)
 * that the user can download and double-click to open — no server,
 * no build step needed on their end.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
// Build flavours (Oct 21, release prep): default = tester build in dist/ (as before);
// --release = public/store build in dist/release/ (no Debug unlock); --demo = free Floor-1-only build in dist/demo/.
const DEMO = process.argv.includes('--demo');
const RELEASE = DEMO || process.argv.includes('--release');
const DIST_DIR = path.join(__dirname, 'dist', DEMO ? 'demo' : RELEASE ? 'release' : '');
const OUT = path.join(DIST_DIR, DEMO ? 'dungeon_scramble_demo.html' : 'dungeon_scramble.html');

function read(name) {
  return fs.readFileSync(path.join(SRC, name), 'utf8');
}

const head = read('_head.html').replace('<title>Dungeon Scramble</title>', DEMO ? '<title>Dungeon Scramble (Free Demo)</title>' : '<title>Dungeon Scramble</title>');
// Comments are for us, not the player: strip them from the shipped CSS (no string in styles.css contains "/*").
const styles = read('styles.css').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n[ \t]*(?=\n)/g, '').replace(/\n{2,}/g, '\n');
const body = read('_body.html');
const data = read('data.js').replace('var BUILD = { demo:false, release:false };', `var BUILD = { demo:${DEMO}, release:${RELEASE} };`);
if (RELEASE && !/var BUILD = \{ demo:(true|false), release:true \}/.test(data)) throw new Error('build flags line not found in data.js');
// LOGO_IMG is only used by the rulebook (tools/gen.js reads src/assets.js itself), so the game builds leave it out.
const assets = read('assets.js').replace(/^const LOGO_IMG = "[^"]*";\n/m, '');
const logic = read('logic.js');
const depth = read('depth.js');
const render = read('render.js');
const music = read('music.js');
const main = read('main.js');

const scriptParts = [data, assets, logic, depth, render, music, main].join('\n');

const html = [
  head,
  '<style>',
  styles,
  '</style>',
  '</head>',
  body,
  '<script>',
  scriptParts,
  '</script>',
  '</body>',
  '</html>',
  ''
].join('\n');

fs.mkdirSync(DIST_DIR, { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log(`Built ${OUT} (${(html.length / 1024).toFixed(1)} KB)`);

// ---- Installable web-app build: dist/web/ (upload this whole folder to a host) ----
// Same game, plus manifest + icons + a small offline cache. The single-file build
// above is untouched (no manifest/service worker there).
const VERSION = (data.match(/GAME_VERSION\s*=\s*'([^']+)'/) || [])[1] || 'dev';
// Keep package.json's version in step with GAME_VERSION (single source of truth: src/data.js).
if (!RELEASE) try { const pj = path.join(__dirname, 'package.json'); const j = JSON.parse(fs.readFileSync(pj, 'utf8')); if (j.version !== VERSION && VERSION !== 'dev') { j.version = VERSION; fs.writeFileSync(pj, JSON.stringify(j, null, 2) + '\n'); } } catch (e) {}
const WEB = path.join(DIST_DIR, 'web');
fs.rmSync(WEB, { recursive: true, force: true });
fs.mkdirSync(WEB, { recursive: true });
const PWA_HEAD = [
  '<link rel="manifest" href="manifest.webmanifest" crossorigin="use-credentials">',
  '<meta name="theme-color" content="#130d09">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Dungeon Scramble">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black">',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
  '<link rel="icon" type="image/png" sizes="48x48" href="favicon-48.png">',
  '</head>'
].join('\n');
const PWA_REG = `<script>
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}
</script>
</body>`;
// Web build only: pull the embedded base64 art out into real files (dist/web/art/<hash>.png|jpg|webp) and point the
// game at them. ~25% smaller than base64-in-HTML, loads faster, and the service worker pre-caches them for offline.
const crypto = require('crypto');
const ART_DIR = path.join(WEB, 'art'); fs.mkdirSync(ART_DIR, { recursive: true });
const ART_FILES = new Set();
const webAssets = assets.replace(/(["'])data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+\/=]+)\1/g, (m, q, type, b64) => {
  const buf = Buffer.from(b64, 'base64');
  const name = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12) + (type === 'png' ? '.png' : type === 'webp' ? '.webp' : '.jpg');
  if (!ART_FILES.has(name)) { fs.writeFileSync(path.join(ART_DIR, name), buf); ART_FILES.add(name); }
  return '"art/' + name + '"';
});
const webScriptParts = [data, webAssets, logic, depth, render, music, main].join('\n'); // music added Oct 17 (was missing from the web build since 1.39.5)
const webBase = html.replace(scriptParts, () => webScriptParts);
const webHtml = webBase.replace('</head>', PWA_HEAD).replace('</body>', PWA_REG);
fs.writeFileSync(path.join(WEB, 'index.html'), webHtml, 'utf8');
const ICONS = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-48.png'];
ICONS.forEach(f => fs.copyFileSync(path.join(SRC, 'pwa', f), path.join(WEB, f)));
fs.writeFileSync(path.join(WEB, 'manifest.webmanifest'), JSON.stringify({
  name: 'Dungeon Scramble', short_name: 'Dungeon Scramble',
  description: 'A dice-drafting dungeon crawler.',
  start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
  background_color: '#130d09', theme_color: '#130d09',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2), 'utf8');
const SW = `// Dungeon Scramble service worker -- cache name is stamped with the game version.
const CACHE = 'ds-${DEMO ? 'demo-' : ''}${VERSION}';
const FILES = ['./', 'index.html', 'manifest.webmanifest'].concat(${JSON.stringify(ICONS)}).concat(${JSON.stringify([...ART_FILES].map(f => 'art/' + f))});
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && /[/]art[/][0-9a-f]{12}[.](png|jpg|webp)$/.test(url.pathname)) {
    // Art files are content-hashed (never change under the same name): cache first, instant on every launch.
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })));
  } else if (url.origin === location.origin) {
    // Game files: network first (so testers get new builds), cache when offline.
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req).then(m => m || caches.match('index.html'))));
  }
});
`;
fs.writeFileSync(path.join(WEB, 'sw.js'), SW, 'utf8');
console.log(`Built ${WEB}/ (installable web app, cache ds-${VERSION})`);
