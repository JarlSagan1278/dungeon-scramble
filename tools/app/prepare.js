// Copies the release web build into app/www for the Capacitor app (Oct 26).
// The app serves its files itself, so the service worker (offline cache for the web version) is switched off here.
// usage: node build.js --app && node tools/app/prepare.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..'), SRC = path.join(ROOT, 'dist/app/web'), OUT = path.join(ROOT, 'app/www');
if (!fs.existsSync(path.join(SRC, 'index.html'))) { console.error('No app build: run `node build.js --app` first.'); process.exit(1); }
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });
const idx = path.join(OUT, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
const before = html.length;
html = html.replace(/if\('serviceWorker' in navigator && \/\^https\?:\$\/\.test\(location\.protocol\)\)\{/, "if(false){ /* app build: no service worker */");
if (html.length === before && !/app build: no service worker/.test(html)) { console.error('Service worker line not found; update tools/app/prepare.js'); process.exit(1); }
fs.writeFileSync(idx, html);
['sw.js'].forEach(f => fs.rmSync(path.join(OUT, f), { force: true }));
// The app's version follows the game's (package.json, synced by build.js): 1.42.80 -> versionName 1.42.80, versionCode 1042080.
// Nov 11: was a*10000+b*100+c, which collides once the last part passes 99 (1.42.100 = 1.43.0 = 14300); Play needs every
// upload's versionCode to be higher than the last. Nothing had been uploaded to Play yet, so the switch was free.
const ver = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const [a, b, c] = ver.split('.').map(Number);
const gradle = path.join(ROOT, 'app/android/app/build.gradle');
if (fs.existsSync(gradle)) {
  let g = fs.readFileSync(gradle, 'utf8');
  g = g.replace(/versionCode \d+/, `versionCode ${a * 1000000 + b * 1000 + c}`).replace(/versionName "[^"]*"/, `versionName "${ver}"`);
  fs.writeFileSync(gradle, g);
}
console.log('app/www ready:', fs.readdirSync(OUT).length, 'entries; version', ver);
