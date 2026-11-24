// Copies the Steam build of the game (node build.js --steam -> dist/steam/web) into steam/web and stamps the app
// version with GAME_VERSION. Run from anywhere: node steam/prepare.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), SRC = path.join(ROOT, 'dist/steam/web'), OUT = path.join(__dirname, 'web');
if (!fs.existsSync(path.join(SRC, 'index.html'))) { console.error('Run `node build.js --steam` first (no dist/steam/web).'); process.exit(1); }
fs.rmSync(OUT, { recursive: true, force: true }); fs.cpSync(SRC, OUT, { recursive: true });
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
if (!/steam:true/.test(html)) { console.error('dist/steam/web is not a --steam build.'); process.exit(1); }
const ver = (fs.readFileSync(path.join(ROOT, 'src/data.js'), 'utf8').match(/GAME_VERSION\s*=\s*'([^']+)'/) || [])[1];
const pj = path.join(__dirname, 'package.json'), j = JSON.parse(fs.readFileSync(pj, 'utf8'));
if (ver && j.version !== ver) { j.version = ver; fs.writeFileSync(pj, JSON.stringify(j, null, 2) + '\n'); }
for (const f of ['manifest.webmanifest', 'sw.js', 'apple-touch-icon.png', 'favicon-48.png', 'icon-192.png', 'icon-maskable-512.png']) fs.rmSync(path.join(OUT, f), { force: true }); // web-only files
fs.copyFileSync(path.join(ROOT, 'src/pwa/icon-512.png'), path.join(__dirname, 'icon.png'));
console.log('steam/web ready, version', ver);
