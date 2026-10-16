// Dungeoneer simple-passive study (Oct 16, build 1.41.53). Runs study_maneuver.js unchanged, plus two knobs:
//   dngPassive: 'none' (default) | 'block' | 'seam' | 'edgehit' | 'manblock'   (only while the class is the Dungeoneer)
//     'block'    -- every Block face counts dngAmt higher (Block 2 -> Block 3).
//     'seam'     -- each wrap crossing in the path (a step between the left and right edge columns) adds dngAmt damage to
//                   the next damaging die, the die landed on included (Leaper Spurs pattern; crossings stack until spent).
//     'edgehit'  -- Hit and Combo faces on dice in the zone (left/right edge columns) count dngAmt higher.
//     'manblock' -- every Dodge, Leap or Pivot face in the path also gives dngAmt Block (Dodger Cloak pattern, all three).
//     'manblockzone' -- tuned D: only Dodge, Leap or Pivot faces on dice in the zone (edge columns) give dngAmt Block.
//   dngAmt: number, default 1.
//   Face-value passives wrap pathFaceForIdx (the game's damage math and the bot's path scoring both read faces through it).
//   Step passives wrap applyRelicsToSteps, and computePathEffects is wrapped to take its totals from the steps (it only
//   does that by itself when the player holds a relic), so the bot scores what the game plays.
// Usage: DS_HTML=<snapshot.html relative to this folder> node study_dngpassive.js '{"runs":200,"origin":"dwarf","klass":"dungeoneer","dngPassive":"seam","label":"x"}'
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'study_maneuver.js'), 'utf8');
const anchor = "  Object.entries(cfg.classPatch||{}).forEach(";
if (!src.includes(anchor)) throw new Error('study_maneuver.js anchor not found');
const patch = `  if(cfg.dngPassive && cfg.dngPassive!=='none'){
    const DP = cfg.dngPassive, AMT = (cfg.dngAmt==null ? 1 : cfg.dngAmt);
    const isD = ()=> S.klass && S.klass.id==='dungeoneer';
    if(DP==='block' || DP==='edgehit'){
      const origPF = pathFaceForIdx;
      window.pathFaceForIdx = function(idx){
        const f = origPF(idx);
        if(!f || !isD()) return f;
        if(DP==='block' && f.type==='block') return Object.assign({}, f, {value:(f.value||0)+AMT});
        if(DP==='edgehit' && (f.type==='hit'||f.type==='combo') && inZone(idx)) return Object.assign({}, f, {value:(f.value||0)+AMT});
        return f;
      };
    } else {
      const origRel = applyRelicsToSteps;
      window.applyRelicsToSteps = function(steps, p){
        steps = origRel(steps, p);
        if(!isD()) return steps;
        if(DP==='manblock' || DP==='manblockzone') steps.forEach(s=>{ if((s.type==='dodge'||s.type==='leap'||s.type==='pivot') && (DP==='manblock' || inZone(s.idx))){ s.blockGain += AMT; window.__dngFx=(window.__dngFx||0)+1; } });
        if(DP==='seam'){
          let carry = 0;
          steps.forEach((s,i)=>{
            if(i>0 && Math.abs(trayRC(steps[i-1].idx).c - trayRC(s.idx).c)===3) carry += AMT;
            if(s.dmg>0 && carry){ s.dmg += carry; carry = 0; window.__dngFx=(window.__dngFx||0)+1; }
          });
        }
        return steps;
      };
      const origEff = computePathEffects;
      window.computePathEffects = function(p){
        const ef = origEff(p);
        if(!isD()) return ef;
        const st = computePathSteps(p);
        ef.totalDamage = st.reduce((a,x)=>a+x.dmg,0);
        ef.blockGain = st.reduce((a,x)=>a+x.blockGain,0);
        return ef;
      };
    }
  }
`;
const out = path.join(__dirname, '_dngpassive_run_' + process.pid + '.js');
fs.writeFileSync(out, src.replace(anchor, patch + anchor));
process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) {} });
require(out);
