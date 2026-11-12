// Art files -> the game's image constants (Nov 12, polish roadmap A5). src/assets.js keeps the structure (LOGO_IMG,
// DWARF_PORTRAITS, MONSTER_ART, ...) with "art:<path>" references; the pictures themselves are files in src/art/.
// inlineArt(text) turns every "art:<path>" back into the data: URL the game has always used, so build output is unchanged.
// Used by build.js and tools/gen.js. To change a picture, replace its file in src/art/ (keep the name and format).
const fs = require('fs'), path = require('path');
const ART = path.resolve(__dirname, '../../src/art');
const TYPES = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', webp: 'image/webp' };
function inlineArt(text) {
  return text.replace(/(["'])art:([^"']+)\1/g, (m, q, rel) => {
    const f = path.join(ART, rel), ext = path.extname(rel).slice(1).toLowerCase();
    if (!TYPES[ext]) throw new Error('art: unknown image type ' + rel);
    if (!fs.existsSync(f)) throw new Error('art: missing file src/art/' + rel);
    return `${q}data:${TYPES[ext]};base64,${fs.readFileSync(f).toString('base64')}${q}`; // same quotes as the reference
  });
}
function readAssets() { return inlineArt(fs.readFileSync(path.resolve(__dirname, '../../src/assets.js'), 'utf8')); }
module.exports = { inlineArt, readAssets, ART };
