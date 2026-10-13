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
const DIST_DIR = path.join(__dirname, 'dist');
const OUT = path.join(DIST_DIR, 'dungeon_scramble.html');

function read(name) {
  return fs.readFileSync(path.join(SRC, name), 'utf8');
}

const head = read('_head.html');
const styles = read('styles.css');
const body = read('_body.html');
const data = read('data.js');
const assets = read('assets.js');
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
try { const pj = path.join(__dirname, 'package.json'); const j = JSON.parse(fs.readFileSync(pj, 'utf8')); if (j.version !== VERSION && VERSION !== 'dev') { j.version = VERSION; fs.writeFileSync(pj, JSON.stringify(j, null, 2) + '\n'); } } catch (e) {}
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
// Web build only: pull the embedded base64 art out into real files (dist/web/art/<hash>.png|jpg) and point the
// game at them. ~25% smaller than base64-in-HTML, loads faster, and the service worker pre-caches them for offline.
const crypto = require('crypto');
const ART_DIR = path.join(WEB, 'art'); fs.mkdirSync(ART_DIR, { recursive: true });
const ART_FILES = new Set();
const webAssets = assets.replace(/(["'])data:image\/(png|jpeg);base64,([A-Za-z0-9+\/=]+)\1/g, (m, q, type, b64) => {
  const buf = Buffer.from(b64, 'base64');
  const name = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12) + (type === 'png' ? '.png' : '.jpg');
  if (!ART_FILES.has(name)) { fs.writeFileSync(path.join(ART_DIR, name), buf); ART_FILES.add(name); }
  return '"art/' + name + '"';
});
const webScriptParts = [data, webAssets, logic, depth, render, main].join('\n');
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
const CACHE = 'ds-${VERSION}';
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
  if (url.origin === location.origin && /[/]art[/][0-9a-f]{12}[.](png|jpg)$/.test(url.pathname)) {
    // Art files are content-hashed (never change under the same name): cache first, instant on every launch.
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })));
  } else if (url.origin === location.origin) {
    // Game files: network first (so testers get new builds), cache when offline.
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req).then(m => m || caches.match('index.html'))));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // Title font: cache after first load.
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })));
  }
});
`;
fs.writeFileSync(path.join(WEB, 'sw.js'), SW, 'utf8');
console.log(`Built ${WEB}/ (installable web app, cache ds-${VERSION})`);
