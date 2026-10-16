// Arcanist + passive Boost study (Oct 16, build 1.41.47). Runs study_maneuver.js unchanged, plus one knob:
//   arcBoost: 'none' (default) | 'all' | 'zone'
//     'all'  -- while the class is the Arcanist, every Boost face counts as one higher (x2 -> x3, x3 -> x4, ...).
//     'zone' -- the same, but only for Boost faces on dice sitting in the Arcanist's zone (the X).
//   Patched by wrapping pathFaceForIdx() inside the headless page; computePathEffects / computePathSteps (the game's
//   own damage math, also used by the bot to score paths) both read faces through it. Boost tokens are not changed.
// Usage: DS_HTML=<snapshot.html relative to this folder> node study_arcboost.js '{"runs":200,"origin":"dwarf","klass":"arcanist","arcBoost":"all","label":"x"}'
// All other config keys are study_maneuver.js's (classPatch, depthMods, skill, abilityRate, ...).
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'study_maneuver.js'), 'utf8');
const anchor = "  Object.entries(cfg.classPatch||{}).forEach(";
if (!src.includes(anchor)) throw new Error('study_maneuver.js anchor not found');
const patch = `  if(cfg.arcBoost && cfg.arcBoost!=='none'){
    const origPF = pathFaceForIdx;
    window.pathFaceForIdx = function(idx){
      const f = origPF(idx);
      if(f && f.type==='boost' && S.klass && S.klass.id==='arcanist' && (cfg.arcBoost==='all' || inZone(idx))){ window.__arcB=(window.__arcB||0)+1; return Object.assign({}, f, {value:(f.value||1)+1}); }
      return f;
    };
  }
`;
const out = path.join(__dirname, '_arcboost_run_' + process.pid + '.js');
fs.writeFileSync(out, src.replace(anchor, patch + anchor));
process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) {} });
require(out);
