// Compares two styledump.js outputs; prints each differing property (skipping values that change with time: the opacity
// and transforms of running animations are frozen by styledump, so anything left is a real difference).
// usage: node tools/css/stylediff.js before.json after.json
const fs = require('fs'); const [a, b] = process.argv.slice(2).map(f => Object.fromEntries(fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))));
const CLOCK = new Set(['--gd', '--qd', '--fl']); // animation offsets taken from the page clock
let n = 0; const byProp = {};
for (const scr of new Set([...Object.keys(a), ...Object.keys(b)])) {
  const A0 = a[scr], B0 = b[scr];
  if (typeof A0 === 'string' || typeof B0 === 'string' || !A0 || !B0) { if (JSON.stringify(A0) !== JSON.stringify(B0)) { console.log(scr, 'setup', String(A0).slice(0, 60), '->', String(B0).slice(0, 60)); n++; } continue; }
  const exp = d => { const t = d.table.map(str => Object.fromEntries(str.split('\n').map(l => { const i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 1)]; }))); const r = {}; for (const [k, id] of Object.entries(d.rec)) r[k] = t[id]; return r; };
  const A = exp(A0), B = exp(B0);
  for (const el of new Set([...Object.keys(A), ...Object.keys(B)])) {
    if (!A[el] || !B[el]) { console.log(scr, el, A[el] ? 'gone' : 'new'); n++; continue; }
    for (const k of new Set([...Object.keys(A[el]), ...Object.keys(B[el])])) if (A[el][k] !== B[el][k] && !CLOCK.has(k)) {
      n++; byProp[k] = (byProp[k] || 0) + 1; if (n <= 60) console.log(scr, el.slice(0, 90), k, JSON.stringify(A[el][k]).slice(0, 70), '->', JSON.stringify(B[el][k]).slice(0, 70));
    }
  }
}
console.log('differences:', n, JSON.stringify(byProp));
process.exit(n ? 1 : 0);
