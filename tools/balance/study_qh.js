// Quest Health study (Oct 17, build 1.41.54). Runs study_maneuver.js with:
//   qhMode: 'cap' (today) | 'none' (no Quest Health cap: every flat quest reward pays in full)
//           | 'mul' (cap x qhMul) | 'only' (cap removed only on cards listed in qhOpen) | 'except' (cap kept only on qhKeep)
//   Bot quest valuation: study_maneuver's questBonus only knew some phrasings ("N damage in a single turn" etc.).
//     Here it is replaced by a mirror of the game's checkQuests() regexes (all phrasings, "accumulate N block" uses
//     the Block total after the path). Flat damage rewards count toward the kill check; D.O.T./H.O.T./Nullify/Freeze
//     rewards add their damage-equivalent value to the path score but not to the kill check.
//   qSeek: extra score per quest a path would complete (a human-like "go for the quest" nudge, default 0),
//     qSeekMul: multiplies the quest reward value (default 1). questAware:false = the bot ignores quests entirely.
//   Logging: every quest completion (card, quest index, reward kind, printed amount, paid, lost to cap, turn) and per
//     fight path damage go on the fight record (rec.fights[].q, .pathDmg, .qhOrig).
// Usage: DS_HTML=<snapshot> node study_qh.js '{"runs":20,"origin":"dwarf","klass":"guard","qhMode":"none","label":"x"}'
const fs = require('fs'), path = require('path');
let src = fs.readFileSync(path.join(__dirname, 'study_maneuver.js'), 'utf8');
const rep = (a, b) => { if (!src.includes(a)) throw new Error('anchor not found: ' + a); src = src.replace(a, b); };
const anchor = "  Object.entries(cfg.classPatch||{}).forEach(";
const patch = `
  const QH_MODE = cfg.qhMode||'cap', QH_OPEN = new Set(cfg.qhOpen||[]);
  { const d0 = drawEncounter; window.drawEncounter = function(kind){ const e = d0(kind);
      if(e && e.quests){ e.qhOrig = e.questHealth;
        if(e.questHealth!=null){
          if(QH_MODE==='none' || (QH_MODE==='only' && QH_OPEN.has(e.name)) || (QH_MODE==='except' && !(cfg.qhKeep||[]).includes(e.name))) e.questHealth = null;
          else if(QH_MODE==='mul') e.questHealth = Math.round(e.questHealth*(cfg.qhMul||1.5));
        }
        if(window.__curFightNext) {}
      }
      return e; }; }
  { const ar0 = applyQuestReward; window.applyQuestReward = function(e, rewardText){
      const q0 = e.questDamageDealt||0, hp0 = e.curHealth, dot0 = e.curDOT||0;
      let qi = -1; e.__qLogged = e.__qLogged || {};
      for(let i=0;i<(e.questsDone||[]).length;i++) if(e.questsDone[i] && !e.__qLogged[i]){ qi=i; break; }
      if(qi>=0) e.__qLogged[qi] = 1;
      const r = ar0(e, rewardText);
      const m = (rewardText||'').match(/(\\d+(\\.\\d+)?)/), amt = m ? parseFloat(m[1]) : 0, low=(rewardText||'').toLowerCase();
      const kind = low.includes('dot')?'dot':low.includes('hot')?'hot':low.includes('nullify')?'nullify':low.includes('freeze')?'freeze':'dmg';
      const paid = (e.questDamageDealt||0)-q0;
      // what today's cap would have paid (for runs with the cap removed): cumulative flat paid vs original Quest Health
      e.__qFlatSum = (e.__qFlatSum||0);
      const wouldPay = kind==='dmg' ? Math.max(0, Math.min(amt, (e.qhOrig!=null?e.qhOrig:1e9) - e.__qFlatSum)) : 0;
      if(kind==='dmg') e.__qFlatSum += amt;
      const cf = window.__curFight;
      if(cf && cf.name===e.name){ (cf.q=cf.q||[]).push({i:qi, kind, amt, paid, lost: kind==='dmg'?amt-paid:0, wouldPay, hpLoss: Math.max(0,hp0-e.curHealth), turn:S.turnNumber}); }
      return r; }; }
  { const fp0 = finishPlayerPath; window.finishPlayerPath = function(p, ef){ const cf = window.__curFight;
      if(cf && S.encounter && cf.name===S.encounter.name){ cf.pathDmg = (cf.pathDmg||0) + (ef.totalDamage||0); cf.qhOrig = S.encounter.qhOrig; cf.qh = S.encounter.questHealth; cf.ehp = S.encounter.maxHealth; }
      return fp0(p, ef); }; }
  { const gm0 = geometryMirror; window.geometryMirror = function(e, kind, n){ const before = JSON.stringify(e.questMirror||{}); const r = gm0(e, kind, n);
      const cf = window.__curFight; if(cf && e && cf.name===e.name){ const a = e.questMirror||{}, b = JSON.parse(before); let d=0; for(const k in a) d += a[k]-(b[k]||0); if(d>0) cf.geoMirror=(cf.geoMirror||0)+d; }
      return r; }; }
  function questVal(ef){
    const e=S.encounter; if(!e||!e.quests) return {flat:0, other:0};
    let room = (e.questHealth!=null?e.questHealth:1e9) - (e.questDamageDealt||0), flat=0, other=0;
    e.quests.forEach((q,i)=>{
      if(e.questsDone[i]) return;
      const {rewardText, cond} = parseQuestSpec(q); if(!rewardText) return;
      const low=rewardText.toLowerCase(); let m, done=false;
      if(/= ?d\\.?o\\.?t|= ?h\\.?o\\.?t/.test(cond)) return; // Geometry: passive
      if((m=cond.match(/survive (?:to )?(?:turn )?(\\d+)/))) return; // not a path choice
      else if((m=cond.match(/gain (\\d+)\\s*hot\\b/))) done = (ef.hotToPlayer||0) >= +m[1]; // 1.41.56: amounts
      else if((m=cond.match(/deal (\\d+)\\s*dot\\b/))) done = (ef.dotToEncounter||0) >= +m[1];
      else if((m=cond.match(/(\\d+)\\+?\\s*damage/))) done = ef.totalDamage >= +m[1];
      else if((m=cond.match(/any (\\d+)(?:\\s*or fewer)? actions/))) done = cond.includes('or fewer') ? (ef.totalActions>0 && ef.totalActions<=+m[1]) : ef.totalActions>=+m[1];
      else if((m=cond.match(/(\\d+)\\s*blanks/))) done = ef.blankCount >= +m[1];
      else if((m=cond.match(/(\\d+)\\s*maneuvers/))) done = ef.maneuverCount >= +m[1];
      else if((m=cond.match(/(\\d+)\\s*dodge/))) done = ef.dodgeCount >= +m[1];
      else if((m=cond.match(/(\\d+)\\s*leap/))) done = ef.leapCount >= +m[1];
      else if((m=cond.match(/(\\d+)\\s*pivot/))) done = ef.pivotCount >= +m[1];
      else if((m=cond.match(/(\\d+)\\s*heal/))) done = ef.healCount >= +m[1];
      else if((m=cond.match(/accumulate (\\d+) block/))) done = (S.playerBlock||0)+(ef.blockGain||0) >= +m[1];
      else if((m=cond.match(/(\\d+)\\s*block/))) done = ef.blockCount >= +m[1];
      else if((m=cond.match(/(\\d+)\\s*combos?/))) done = ef.comboCount >= +m[1];
      else if((m=cond.match(/(\\d+)\\s*hot\\b/))) done = (ef.hotCount||0) >= +m[1];
      else if((m=cond.match(/(\\d+)\\s*dot\\b/))) done = (ef.dotCount||0) >= +m[1];
      else if((m=cond.match(/(\\d+)\\s*boost/))) done = ef.boostCount >= +m[1];
      else if((m=cond.match(/(\\d+)\\s*support/))) done = ef.supportCount >= +m[1];
      else if((m=cond.match(/(\\d+)\\s*nullify/))) done = ef.nullifyCount >= +m[1];
      else if(cond.includes('nullify')) done = ef.nullifyCount>=1;
      if(!done) return;
      const amt0=parseFloat((rewardText.match(/(\\d+(\\.\\d+)?)/)||[0,0])[1]);
      const sk = cfg.qSeekMul||1;
      if(/dot/.test(low)) other += amt0*1.2*sk;
      else if(/hot/.test(low)) other += amt0*0.8*((S.maxHealth-S.health)>4?1:0.4)*sk;
      else if(/nullify/.test(low)) other += 2.5*(amt0||1)*sk;
      else if(/freeze/.test(low)) other += 4*(amt0||1)*sk;
      else { const a=Math.min(amt0,Math.max(0,room)); flat += a; room -= a; if(sk!==1) other += a*(sk-1); }
      other += (cfg.qSeek||0);
    });
    return {flat, other};
  }
`;
rep(anchor, patch + anchor);
rep("let dmg = ef.totalDamage + (cfg.questAware ? questBonus(ef) : 0);", "const __qv = cfg.questAware ? questVal(ef) : {flat:0,other:0}; let dmg = ef.totalDamage + __qv.flat;");
rep("if(dmg>=need) v += 6;", "if(dmg>=need) v += 6; v += __qv.other;");
const out = path.join(__dirname, '_qh_run_' + process.pid + '.js');
fs.writeFileSync(out, src);
process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) {} });
require(out);
