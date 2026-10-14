
/* =========================================================================
   STATE
   ========================================================================= */
let S = null;

const SAVE_KEY = 'dungeonScrambleSave_v1';

// Builds a plain, JSON-safe snapshot of S. klass/origin are stored as ids
// (they carry a live zone() function that can't survive JSON) and rebuilt
// on load; usedCards/usedLootNames (both Sets) are stored as arrays.
function serializeState(){
  // _roll/_ghost/_shieldFx hold performance.now() timestamps for animations; they mean nothing after a reload (the clock restarts), so never save them.
  const { klass, origin, _advance, _pendingTimeout, _roll, _ghost, _shieldFx, ...rest } = S;
  return { ...rest, classId: klass.id, originId: origin.id, usedCards: [...S.usedCards], usedLootNames: [...S.usedLootNames] };
}

function saveGame(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(serializeState())); }
  catch(e){ /* storage unavailable/full -- saving is a bonus, fail silently */ }
}

function hasSave(){
  try{ return !!localStorage.getItem(SAVE_KEY); } catch(e){ return false; }
}

function clearSave(){
  try{ localStorage.removeItem(SAVE_KEY); } catch(e){}
}

// ---- Carryover die -- on a true Game Over (see onPlayerDefeated()), the
// player picks one of their current highest-tier dice to start their next
// run with (see renderGameOver()'s choice screen). Stored separately from
// SAVE_KEY since it needs to survive past this run actually ending, and
// consumed (one-shot) the next time newGame() runs. ----
const CARRYOVER_KEY = 'dungeonScrambleCarryover_v1';
function saveCarryoverDie(die){
  try{ localStorage.setItem(CARRYOVER_KEY, JSON.stringify({name:die.name, faces:die.faces, cat:die.cat, level:die.level})); }
  catch(e){ /* storage unavailable/full -- fail silently, same as saveGame() */ }
}
function takeCarryoverDie(){
  try{
    const raw = localStorage.getItem(CARRYOVER_KEY);
    if(!raw) return null;
    localStorage.removeItem(CARRYOVER_KEY); // one-shot
    return JSON.parse(raw);
  } catch(e){ return null; }
}
// Basic < Origin < Alloy < Gilded < Magic, matching the floor loot
// progression (see FLOORS in data.js) -- used to find a player's single
// best-tier die at the moment they're defeated.
const DIE_TIER_RANK = {attack:0, maneuver:0, origin:1, alloy:2, gilded:3, magic:4};
function dieTierRank(die){ return DIE_TIER_RANK[die.cat] ?? 0; }
// Every die currently in the tray at the highest tier present, collapsed to
// one entry per distinct die name (same grouping idea as the swap screen) --
// what the Game Over carryover choice offers.
function highestTierTrayGroups(){
  let maxRank = -1;
  S.tray.forEach(c=>{ const r = dieTierRank(c.die); if(r>maxRank) maxRank=r; });
  const groups = [];
  const byName = new Map();
  S.tray.forEach(c=>{
    if(dieTierRank(c.die)!==maxRank) return;
    const key = c.die.name;
    if(!byName.has(key)){ const g = {die:c.die, count:0}; byName.set(key,g); groups.push(g); }
    byName.get(key).count++;
  });
  return groups;
}

// ---- Relics (definitions in data.js). S.relics is a list of relic ids. ----
function hasRelic(id){ return !!(S && S.relics && S.relics.includes(id)); }

function grantRelic(id, opts){
  const r = relicById(id);
  if(!r || hasRelic(id)) return false;
  if(!S.relics) S.relics = [];
  S.relics.push(id);
  if(id==='flask'){ S.maxHealth += 8; S.health = cap(S.health+8, S.maxHealth); }
  markRelicFound(id);
  teleLog('relic_gain', {relic:id, via:(opts&&opts.via)||'shrine'});
  if(!(opts&&opts.silent)) logMsg('sys', `Relic gained: ${r.name} -- ${r.desc}`, 'good');
  return true;
}

// Relics that change a Path's numbers. Mutates the per-die `steps` that
// computePathSteps() builds, so the live preview (computePathEffects), the
// step-by-step playback, and the final totals all agree.
function applyRelicsToSteps(steps, path){
  if(!S.relics || !S.relics.length) return steps;
  const lastDmgStep = ()=>{ for(let i=steps.length-1;i>=0;i--) if(steps[i].dmg>0) return steps[i]; return null; };
  // tag() records which relic changed a step, so playback can pulse that relic's badge.
  const tag = (s,id,text)=>{ (s.relicFx = s.relicFx||[]).push({id,text}); };
  if(hasRelic('whetstone')){
    const first = steps.find(s=>s.type==='hit');
    if(first){ first.dmg += 2; tag(first,'whetstone','+2'); }
  }
  steps.forEach(s=>{
    if(hasRelic('venom_vial') && s.dotToEncounter>0){ s.dotToEncounter += 1; tag(s,'venom_vial','+1 DOT'); }
    if(hasRelic('tincture') && s.type==='heal'){ s.healGain += 1; tag(s,'tincture','+1'); }
    if(hasRelic('picnic_basket')){
      const cb = relicById('picnic_basket');
      if(s.type==='heal' && cb.heal){ s.healGain += cb.heal; tag(s,'picnic_basket','+'+cb.heal); }
      if(s.type==='hot' && cb.hot){ s.hotToPlayer += cb.hot; tag(s,'picnic_basket','+'+cb.hot); }
    }
    if(hasRelic('spore_satchel') && s.type==='leech'){ s.dotToEncounter += 2; s.hotToPlayer += 1; tag(s,'spore_satchel','+2 DOT'); }
  });
  // v1.36.0 relics
  if(hasRelic('barbed_buckler') || hasRelic('dodger_cloak') || hasRelic('leaper_spurs')){
    let spur = 0;
    steps.forEach(s=>{
      if(s.type==='dodge' && hasRelic('dodger_cloak')){ s.blockGain += 1; tag(s,'dodger_cloak','+1 Block'); }
      if(s.blockGain>0 && hasRelic('barbed_buckler')){ s.dmg += s.blockGain; tag(s,'barbed_buckler','+'+s.blockGain); }
      if(s.type==='leap' && hasRelic('leaper_spurs')) spur++;
      else if(s.dmg>0 && spur){ s.dmg += spur; tag(s,'leaper_spurs','+'+spur); spur = 0; }
    });
  }
  if(hasRelic('echo_chime') && steps.length>=5){ const t = lastDmgStep(); if(t){ t.dmg += 3; tag(t,'echo_chime','+3'); } }
  if(hasRelic('glimmer_dust')){
    const m = Math.min(relicById('glimmer_dust').cap, steps.filter(s=>s.type==='dodge'||s.type==='leap'||s.type==='pivot').length);
    const t = lastDmgStep(); if(m>0 && t){ t.dmg += m; tag(t,'glimmer_dust','+'+m); }
  }
  return steps;
}

// Queue a badge pulse + floating text for a relic that just did something; the
// next render consumes it (consumeRelicPulses, render.js).
function fireRelic(id, text){
  if(!S._relicQ) S._relicQ = [];
  if(S._relicQ.length < 12) S._relicQ.push({id, text});
}

function applyRelicsOnRoomStart(){
  let block = 0;
  if(hasRelic('banner')){ block += 3; fireRelic('banner','+3 Block'); }
  if(hasRelic('forgeplate')){ const a = relicById('forgeplate').amt; block += a; fireRelic('forgeplate','+'+a+' Block'); }
  if(block>0){ S.playerBlock += block; logMsg('sys', `Relics grant ${block} Block.`, 'good'); }
}

// ---- Relic discovery (Relic Codex shows a relic's details only once the
// player has found it for themselves, same idea as the Dice Compendium) ----
function markRelicFound(id){
  try{
    if(!Array.isArray(META.relicsFound)) META.relicsFound = [];
    if(!META.relicsFound.includes(id)){ META.relicsFound.push(id); saveMeta(); }
  } catch(e){}
}

// ---- Play telemetry -- an anonymous, on-device log of how each run
// actually went (rooms, turns, loot offered vs. picked, what ended the run),
// so playtest sessions can be turned into balance data. NOTHING is sent
// anywhere: finished runs pile up in localStorage and the player can export
// them as a file from Settings -> Export Play Data (see render.js) and send
// that file along. Deliberately excludes the player's typed character name;
// the only identifier is a random per-device id so several files from one
// tester can be grouped. Best-effort throughout -- never allowed to throw
// into gameplay. ----
const TELE_KEY = 'dungeonScrambleTelemetry_v1';
const TELE_PLAYER_KEY = 'dungeonScrambleTelePlayer_v1';
const MAX_TELE_RUNS = 40;
const MAX_TELE_EVENTS = 2500;

function getTelePlayerId(){
  try{
    let id = localStorage.getItem(TELE_PLAYER_KEY);
    if(!id){
      id = 'p-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4);
      localStorage.setItem(TELE_PLAYER_KEY, id);
    }
    return id;
  } catch(e){ return 'p-unknown'; }
}

function getTelemetryRuns(){
  try{ return JSON.parse(localStorage.getItem(TELE_KEY)) || []; }
  catch(e){ return []; }
}

function newTelemetry(){
  return { runId: 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), startedAt: Date.now(), version: (typeof GAME_VERSION!=='undefined'?GAME_VERSION:''), events: [] };
}

// One event: {t: ms since run start, f: floor, s: route step, e: type, ...data}
// Active play time in ms: wall-clock gaps longer than IDLE_GAP_MS (tab hidden, phone asleep, walked away) are not counted,
// so per-fight durations mean "time actually playing" instead of "time the app sat open".
const IDLE_GAP_MS = 45000;
function teleActiveMs(){
  try{
    if(!S.tele) S.tele = newTelemetry();
    const now = Date.now(), tl = S.tele;
    if(tl._last==null) tl._last = now;
    const gap = now - tl._last;
    if(gap>0 && gap<=IDLE_GAP_MS && !(typeof document!=='undefined' && document.hidden)) tl.active = (tl.active||0) + gap;
    tl._last = now;
    return tl.active||0;
  }catch(e){ return 0; }
}
function teleLog(type, data){
  try{
    if(typeof S==='undefined' || !S) return;
    if(!S.tele) S.tele = newTelemetry(); // older saves that predate telemetry
    if(S.tele.events.length >= MAX_TELE_EVENTS) return;
    S.tele.events.push({ t: teleActiveMs(), f: S.floorIdx+1, s: S.routeStep, e: type, ...(data||{}) });
  } catch(err){ /* telemetry must never break the game */ }
}

function finalizeTelemetry(outcome){
  try{
    if(!S.tele) S.tele = newTelemetry();
    teleLog('run_end', {outcome});
    const rec = {
      runId: S.tele.runId, startedAt: S.tele.startedAt, endedAt: Date.now(), version: S.tele.version,
      origin: S.origin.name, klass: S.klass.name, outcome, floorReached: S.floorIdx+1,
      runNo: ((S.tele.events.find(e=>e.e==='run_start')||{}).runNo) || null, depth: (typeof currentDepth==='function') ? currentDepth() : 1,
      stats: {...S.stats, damageDealt: Math.round(S.stats.damageDealt)},
      relics: (S.relics||[]).slice(),
      events: S.tele.events,
    };
    const list = getTelemetryRuns();
    list.push(rec);
    while(list.length > MAX_TELE_RUNS) list.shift();
    localStorage.setItem(TELE_KEY, JSON.stringify(list));
  } catch(e){ /* storage full/unavailable */ }
}

// Everything a tester needs to hand over: finished runs, the in-progress
// run (if any), and lifetime totals.
function buildPlayDataExport(){
  const runs = getTelemetryRuns();
  let inProgress = null;
  try{
    if(S && S.tele && S.screen!=='victory' && S.screen!=='gameover' && S.origin){
      inProgress = { runId:S.tele.runId, startedAt:S.tele.startedAt, version:S.tele.version, origin:S.origin.name, klass:S.klass.name,
        outcome:'in_progress', floorReached:S.floorIdx+1, stats:{...S.stats, damageDealt:Math.round(S.stats.damageDealt)}, events:S.tele.events };
    }
  } catch(e){}
  return {
    game: 'Dungeon Scramble', exportFormat: 1, version: (typeof GAME_VERSION!=='undefined'?GAME_VERSION:''),
    exportedAt: new Date().toISOString(), playerId: getTelePlayerId(),
    device: { viewport: [window.innerWidth, window.innerHeight], touch: ('ontouchstart' in window) },
    lifetime: META.lifetime, achievementsUnlocked: Object.keys(META.achievements||{}),
    summary: summarizePlayData(runs), runs, inProgress,
  };
}
// Headline numbers for a tester's export (Oct 13, from the balance literature review): where runs end by floor, the
// win rate over the first 10 runs, how often each offered item is taken, and how deaths split between warned and
// unwarned turns. Computed from the stored runs; abandoned runs (Restart Run) are counted separately.
function summarizePlayData(runs){
  try{
    const done = runs.filter(r=>r.outcome==='victory' || r.outcome==='defeat');
    const byFloor = {1:{reached:0,died:0},2:{reached:0,died:0},3:{reached:0,died:0}};
    done.forEach(r=>{ for(let f=1; f<=Math.min(3, r.floorReached||1); f++) byFloor[f].reached++; if(r.outcome==='defeat') byFloor[Math.min(3, r.floorReached||1)].died++; });
    const first = done.slice().sort((a,b)=>(a.runNo||1e9)-(b.runNo||1e9) || a.startedAt-b.startedAt).slice(0,10);
    const take = {};
    const note = (kind, offered, picked)=>{ (offered||[]).forEach(n=>{ const k = kind+': '+n; const t = take[k] || (take[k] = {offered:0, taken:0}); t.offered++; if(n===picked) t.taken++; }); };
    // downs = times HP hit 0 (a Back Pocket roll can still save you). warningShownAtGo: the lethal warning was up when Go
    // was pressed; warningClearedByPath: it was up at turn start, the sent path cleared it, and you still went down
    // (a preview miss worth checking); neverWarned: no warning at all (the deaths that feel unfair).
    const deaths = {downs:0, warningShownAtGo:0, warningClearedByPath:0, neverWarned:0, fromDot:0};
    runs.forEach(r=>(r.events||[]).forEach(e=>{
      if(e.e==='loot_pick') note('loot', e.offered, e.picked);
      if(e.e==='relic_pick') note('relic', e.offered, e.picked);
      if(e.e==='shrine_choice') note('shrine option', e.offered, e.picked);
      if(e.e==='player_down'){ deaths.downs++; if(e.cause==='dot') deaths.fromDot++;
        if(e.lethalGo) deaths.warningShownAtGo++; else if(e.lethalStart) deaths.warningClearedByPath++; else deaths.neverWarned++; }
    }));
    return { runsFinished: done.length, runsAbandoned: runs.filter(r=>r.outcome==='abandoned').length,
      wins: done.filter(r=>r.outcome==='victory').length, floorFunnel: byFloor,
      firstTenRuns: { runs: first.length, wins: first.filter(r=>r.outcome==='victory').length },
      deaths, takeRates: take };
  }catch(e){ return null; }
}

// ---- Run history -- a small persisted log of finished runs (win or lose),
// separate from the save file (which only tracks the CURRENT in-progress
// run and is cleared the moment a run ends). Survives across runs so a
// player can see how past attempts went. ----
const RUN_HISTORY_KEY = 'dungeonScrambleRunHistory_v1';
const MAX_RUN_HISTORY = 20;

function getRunHistory(){
  try{ return JSON.parse(localStorage.getItem(RUN_HISTORY_KEY)) || []; }
  catch(e){ return []; }
}

// Called once when a run ends (victory or defeat), before the save file is
// cleared, so it can pull the run's final stats off S.
function recordRunHistory(outcome){
  recordDepthResult(outcome);
  finalizeTelemetry(outcome);
  try{
    const list = getRunHistory();
    list.unshift({
      date: Date.now(),
      charName: S.charName || '',
      origin: S.origin.name,
      klass: S.klass.name,
      outcome, // 'victory' | 'defeat'
      floorReached: S.floorIdx+1,
      turnsTaken: S.stats.turnsTaken,
      damageDealt: Math.round(S.stats.damageDealt),
      encountersDefeated: S.stats.encountersDefeated,
      shrinesVisited: S.stats.shrinesVisited,
      overkills: S.stats.overkills,
      lootCollected: S.stats.lootCollected,
      depth: currentDepth(),
      score: (S.depthResult && S.depthResult.score) || 0,
    });
    if(list.length > MAX_RUN_HISTORY) list.length = MAX_RUN_HISTORY;
    localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(list));
  } catch(e){ /* storage unavailable/full -- history is a bonus, fail silently */ }
}

function clearRunHistory(){
  try{ localStorage.removeItem(RUN_HISTORY_KEY); } catch(e){}
}

// ---- Lifetime meta-progression: cumulative stats + unlockable Achievements
// that persist across every run ever played (separate from RUN_HISTORY,
// which only keeps the most recent MAX_RUN_HISTORY runs' details). Nothing
// here is spendable/gameplay-affecting -- it's a record of what the player
// has done, surfaced in the Achievements modal (see openAchievementsModal
// in render.js).
const META_KEY = 'dungeonScrambleMeta_v1';
const DEFAULT_LIFETIME = {
  runsPlayed:0, victories:0, bestFloorReached:0, totalDamageDealt:0,
  totalEncountersDefeated:0, totalOverkills:0, totalShrinesVisited:0,
  victoriesByOrigin:{}, victoriesByClass:{},
  bestTurnDamage:0, bestOverkillBy:0, bestPathLen:0,
};
function loadMeta(){
  try{
    const raw = localStorage.getItem(META_KEY);
    if(!raw) return { lifetime: {...DEFAULT_LIFETIME}, achievements: {}, favoriteBoons: [], relicsFound: [] };
    const parsed = JSON.parse(raw) || {};
    return {
      lifetime: {...DEFAULT_LIFETIME, ...(parsed.lifetime||{})},
      achievements: parsed.achievements || {},
      favoriteBoons: Array.isArray(parsed.favoriteBoons) ? parsed.favoriteBoons : [],
      relicsFound: Array.isArray(parsed.relicsFound) ? parsed.relicsFound : [],
      bestiary: (parsed.bestiary && typeof parsed.bestiary==='object') ? parsed.bestiary : {},
      classRuns: (parsed.classRuns && typeof parsed.classRuns==='object') ? parsed.classRuns : {},
      coachSeen: (parsed.coachSeen && typeof parsed.coachSeen==='object') ? parsed.coachSeen : {},
    };
  } catch(e){ return { lifetime: {...DEFAULT_LIFETIME}, achievements: {}, favoriteBoons: [], relicsFound: [] }; }
}
let META = loadMeta();
function saveMeta(){
  try{ localStorage.setItem(META_KEY, JSON.stringify(META)); } catch(e){ /* best-effort, same as prefs/history */ }
}
// Bestiary (Oct 13): every monster/trap/boss you've met, beaten, or been beaten by (Codex -> Bestiary).
const ABILITY_COACH_RUNS = 3;
function bestiaryNote(name, field){
  if(!name) return;
  if(!META.bestiary) META.bestiary = {};
  const b = META.bestiary[name] || (META.bestiary[name] = {met:0, won:0, lost:0});
  b[field] = (b[field]||0) + 1; saveMeta();
}

// Each entry's check() runs against META.lifetime (the cumulative totals
// below) every time recordMetaProgress() is called -- i.e. once per
// finished run. Order here is also display order in the Achievements modal.
const ACHIEVEMENTS = [
  {id:'first_blood', name:'First Blood', desc:'Defeat your first encounter.',
    check: L => L.totalEncountersDefeated>=1},
  {id:'first_victory', name:'Dungeon Conqueror', desc:'Win a run.',
    check: L => L.victories>=1},
  {id:'all_origins', name:'Jack of All Trades', desc:'Win a run with every Origin.',
    check: L => ['dwarf','gnome','halfling','pixie'].every(id=>(L.victoriesByOrigin[id]||0)>0)},
  {id:'all_classes', name:'Master Tactician', desc:'Win a run with every Class.',
    check: L => ['guard','armsmaster','dungeoneer','arcanist'].every(id=>(L.victoriesByClass[id]||0)>0)},
  {id:'floor_3', name:'Into the Deep', desc:'Reach Floor 3 in a single run.',
    check: L => L.bestFloorReached>=3},
  {id:'overkill_10', name:'Overkill Enthusiast', desc:'Land 10 Overkills, lifetime.',
    check: L => L.totalOverkills>=10},
  {id:'shrines_25', name:'Shrine Seeker', desc:'Visit 25 Shrines, lifetime.',
    check: L => L.totalShrinesVisited>=25},
  {id:'monster_hunter_100', name:'Monster Hunter', desc:'Defeat 100 encounters, lifetime.',
    check: L => L.totalEncountersDefeated>=100},
  {id:'veteran_10', name:'Veteran Adventurer', desc:'Play 10 runs.',
    check: L => L.runsPlayed>=10},
  {id:'damage_1000', name:'Heavy Hitter', desc:'Deal 1,000 damage, lifetime.',
    check: L => L.totalDamageDealt>=1000},
  // Deliberately requires 2 victories (with different Origins), not just
  // one -- floor_3 above is reached on the way to *any* win (and even by
  // dying on Floor 3 without winning), so it's actually easier than
  // first_victory, not harder. This is the one that's genuinely a step up
  // from "win a run," which is what lets it gate Pixie behind something
  // that unlocks strictly after Halfling (see isOriginUnlocked() below).
  {id:'origin_duo', name:'Two Roads', desc:'Win a run with 2 different Origins.',
    check: L => Object.values(L.victoriesByOrigin||{}).filter(n=>n>0).length>=2},
];

function checkAchievements(){
  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach(a=>{
    if(META.achievements[a.id]) return;
    if(a.check(META.lifetime)){
      META.achievements[a.id] = { date: Date.now() };
      newlyUnlocked.push(a);
    }
  });
  if(newlyUnlocked.length) saveMeta();
  return newlyUnlocked;
}

// ---- Origin unlocks + Starting Boon tiers -- both derived live from
// META.lifetime/META.achievements rather than their own stored flag, so
// there's nothing to migrate: a player who already has e.g. a recorded
// victory from before this existed is unlocked immediately, no reset.
// Dwarf/Gnome stay available from the very first run (a new player still
// gets 2 Origins x 4 Classes = 8 starting combos); Halfling and Pixie are
// the unlockable ones, in escalating order (see the origin_duo comment
// above for why Pixie isn't gated on floor_3). ----
function isOriginUnlocked(originId){
  if(originId==='dwarf' || originId==='gnome') return true;
  if(originId==='halfling') return META.lifetime.victories>=1;
  if(originId==='pixie') return !!META.achievements['origin_duo'];
  return true;
}
// Which Loot Dice tiers a player may pick a Starting Boon from (Setup
// screen) -- reuses the same milestones as 3 existing Achievements
// (first_victory, floor_3, all_origins) rather than inventing new ones, so
// the tiers unlock on a curve that's already been designed/tuned: Alloy
// after your first win, Gilded once you've seen Floor 3, Magic only once
// you've won with every Origin (hard -- intentionally the capstone).
function unlockedBoonTiers(){
  const L = META.lifetime;
  const tiers = [];
  if(L.victories>=1) tiers.push('alloy');
  if(L.bestFloorReached>=3) tiers.push('gilded');
  if(['dwarf','gnome','halfling','pixie'].every(id=>(L.victoriesByOrigin[id]||0)>0)) tiers.push('magic');
  return tiers;
}
const BOON_TIER_POOLS = {alloy:ALLOY, gilded:GILDED, magic:MAGIC};
const BOON_TIER_LABELS = {alloy:'Alloy', gilded:'Gilded', magic:'Magic'};
// ---- Starting Boon favorites (Setup screen's runic carousel) -- purely a
// browsing convenience (favorited dice float to the front so a returning
// player doesn't have to scroll past the rest of their discovered pool to
// find a go-to pick again), not a gameplay unlock -- so it lives as its own
// top-level META list rather than under META.lifetime, which only tracks
// earned progress feeding the real unlock checks above.
function isFavoriteBoon(name){ return META.favoriteBoons.includes(name); }
function toggleFavoriteBoon(name){
  const i = META.favoriteBoons.indexOf(name);
  if(i>=0) META.favoriteBoons.splice(i,1); else META.favoriteBoons.push(name);
  saveMeta();
}
function findLootDieByName(name){
  return ALLOY.find(d=>d.name===name) || GILDED.find(d=>d.name===name) || MAGIC.find(d=>d.name===name) || null;
}

// ---- Reset Progress (Settings) -- wipes every earned-over-time thing so a
// player can re-experience the unlock curve from scratch: lifetime stats +
// Achievements (META), the Dice Compendium's discovered set, Run History,
// favorited boons, and any in-progress run/carryover. Deliberately leaves
// PREFS (sound/reduced-motion) and the tutorial-seen flag alone -- those
// are player settings, not progress. Caller reloads the page afterward so
// every in-memory global (META, DISCOVERED_DICE, S, ...) re-derives from
// the now-empty storage rather than needing to be reset by hand here.
function resetAllProgress(){
  clearSave();
  clearRunHistory();
  try{ localStorage.removeItem(CARRYOVER_KEY); } catch(e){}
  try{ localStorage.removeItem(META_KEY); } catch(e){}
  try{ localStorage.removeItem(DISCOVERED_DICE_KEY); } catch(e){}
  try{ localStorage.removeItem(DIE_COPIES_KEY); } catch(e){}
  try{ if(typeof DEPTH_BEST_KEY!=='undefined') localStorage.removeItem(DEPTH_BEST_KEY); } catch(e){} // depth bests too: class badges, dice finishes, depth limit (Oct 14 fix)
  try{ localStorage.setItem('dungeonScrambleSymbolsSeen_v1','[]'); } catch(e){} // relearn symbols after a full reset
  DIE_COPIES = {};
}

// ---- Debug-mode unlock-everything: fires once when the Setup screen's
// secret debug-class trigger (5 clicks on "Choose Your Class") is armed --
// see render.js. Drives every Origin-unlock/Boon-tier gate through its own
// real META.lifetime thresholds (rather than only flipping achievement
// flags) so the unlocked state stays internally consistent with everything
// else that reads META.lifetime -- isOriginUnlocked() and
// unlockedBoonTiers() need no changes of their own to see it. Also marks
// every Loot die as discovered so the Dice Compendium shows it all. This
// DOES persist to the real save (localStorage, same as any other lifetime
// progress) -- debug mode is a developer/testing tool reached only by the
// secret click sequence, not something a normal player can stumble into.
function debugUnlockEverything(){
  const L = META.lifetime;
  L.runsPlayed = Math.max(L.runsPlayed, 10);
  L.victories = Math.max(L.victories, 10);
  L.bestFloorReached = 3;
  L.totalDamageDealt = Math.max(L.totalDamageDealt, 1000);
  L.totalEncountersDefeated = Math.max(L.totalEncountersDefeated, 100);
  L.totalOverkills = Math.max(L.totalOverkills, 10);
  L.totalShrinesVisited = Math.max(L.totalShrinesVisited, 25);
  ['dwarf','gnome','halfling','pixie'].forEach(id=>{ L.victoriesByOrigin[id] = Math.max(L.victoriesByOrigin[id]||0, 1); });
  ['guard','armsmaster','dungeoneer','arcanist'].forEach(id=>{ L.victoriesByClass[id] = Math.max(L.victoriesByClass[id]||0, 1); });
  checkAchievements();
  // Belt-and-suspenders: flag every achievement directly too, in case a
  // future achievement's check() doesn't line up with the thresholds above
  // (so "unlock everything" never silently misses one).
  ACHIEVEMENTS.forEach(a=>{ if(!META.achievements[a.id]) META.achievements[a.id] = { date: Date.now() }; });
  markDiceDiscovered([...ALLOY, ...GILDED, ...MAGIC]);
  [...ALLOY, ...GILDED, ...MAGIC].forEach(d=>{ DIE_COPIES[d.name] = Math.max(dieCopies(d.name), BOON_COPIES_NEEDED); });
  try{ localStorage.setItem(DIE_COPIES_KEY, JSON.stringify(DIE_COPIES)); }catch(e){}
  saveMeta();
}

// Called exactly once per finished run (from renderVictory/renderGameOver,
// each already guarded against re-firing on re-render) with S still intact
// (before clearSave() wipes the in-progress run). Returns any Achievements
// newly unlocked by this run, for the caller to announce.
function recordMetaProgress(outcome){
  const L = META.lifetime;
  L.runsPlayed++;
  if(outcome==='victory') L.victories++;
  L.bestFloorReached = Math.max(L.bestFloorReached, S.floorIdx+1);
  L.totalDamageDealt += Math.round(S.stats.damageDealt);
  L.totalEncountersDefeated += S.stats.encountersDefeated;
  L.totalOverkills += S.stats.overkills;
  L.totalShrinesVisited += S.stats.shrinesVisited;
  // Personal bests: flagged only when beating a real earlier mark (a first
  // run would otherwise "beat" zero in every category).
  S.personalBests = [];
  [['Biggest turn', 'bestTurnDamage', S.stats.bestTurn||0],
   ['Biggest overkill', 'bestOverkillBy', S.stats.bestOverBy||0],
   ['Longest path', 'bestPathLen', S.stats.longestPath||0]].forEach(([label, key, val])=>{
    if(val > (L[key]||0)){ if((L[key]||0) > 0) S.personalBests.push(label); L[key] = val; }
  });
  S.newOriginRelic = null;
  if(outcome==='victory' && !(L.victoriesByOrigin[S.origin.id]>0)){
    const orc = originRelicFor(S.origin.id);
    if(orc) S.newOriginRelic = orc.id;
  }
  if(outcome==='victory'){
    L.victoriesByOrigin[S.origin.id] = (L.victoriesByOrigin[S.origin.id]||0)+1;
    L.victoriesByClass[S.klass.id] = (L.victoriesByClass[S.klass.id]||0)+1;
  }
  saveMeta();
  return checkAchievements();
}

// ---- Discovered Loot dice -- which Alloy/Gilded/Magic dice (by name) the
// player has actually encountered as a loot option in some playthrough,
// persisted across runs. The Dice Compendium (openDiceCompendiumModal,
// render.js) uses this to keep a die's faces/art spoiler-free until the
// player has found it for themselves, rather than listing the whole game's
// dice up front. Basic Attack/Maneuver/Origin dice are always known (every
// run starts with them) and never gated this way. ----
const DISCOVERED_DICE_KEY = 'dungeonScrambleDiscoveredDice_v1';
function loadDiscoveredDice(){
  try{ return new Set(JSON.parse(localStorage.getItem(DISCOVERED_DICE_KEY)) || []); }
  catch(e){ return new Set(); }
}
let DISCOVERED_DICE = loadDiscoveredDice();
function markDiceDiscovered(dice){
  const list = Array.isArray(dice) ? dice : [dice];
  let changed = false;
  const fresh = [];
  list.forEach(d=>{
    if(d && d.name && !DISCOVERED_DICE.has(d.name)){ DISCOVERED_DICE.add(d.name); changed = true; fresh.push(d.name); }
  });
  if(changed){
    try{ localStorage.setItem(DISCOVERED_DICE_KEY, JSON.stringify([...DISCOVERED_DICE])); } catch(e){}
  }
  return fresh; // names found for the very first time (drives the NEW! tags)
}

// ---- Copies: a die joins the Compendium the first time you actually GET it (equip it), but only becomes a
// Starting Boon option after you've gotten it BOON_COPIES_NEEDED times (cumulative across runs; a run never offers the same die twice,
// so that's five separate runs). Offered-but-not-taken dice are not discovered. ----
const DIE_COPIES_KEY = 'dungeonScrambleDieCopies_v1';
const BOON_COPIES_NEEDED = 3;
function loadDieCopies(){
  try{ const o = JSON.parse(localStorage.getItem(DIE_COPIES_KEY)); return (o && typeof o==='object') ? o : {}; }
  catch(e){ return {}; }
}
let DIE_COPIES = loadDieCopies();
function dieCopies(name){ return DIE_COPIES[name]||0; }
function isBoonReady(name){ return dieCopies(name) >= BOON_COPIES_NEEDED; }
function recordDieAcquired(die){
  if(!die || !die.name) return;
  markDiceDiscovered(die);
  const was = dieCopies(die.name);
  DIE_COPIES[die.name] = was + 1;
  if(was < BOON_COPIES_NEEDED && was+1 >= BOON_COPIES_NEEDED && typeof S!=='undefined' && S){ (S.newBoonDice = S.newBoonDice||[]).push(die.name); } // announced on the end-of-run screen
  try{ localStorage.setItem(DIE_COPIES_KEY, JSON.stringify(DIE_COPIES)); }catch(e){}
}
// Dice not yet in the Compendium (drives the NEW! tag on a loot card) -- looks only, never marks.
function peekFreshDice(dice){
  return (dice||[]).filter(d=>d && d.name && !DISCOVERED_DICE.has(d.name)).map(d=>d.name);
}

// "NEW!" tags in the Compendium / Relic Codex: remember which entries the
// player has already looked at, so only things found since the last visit glow.
const SEEN_KEY = 'dungeonScrambleSeen_v1';
function loadSeen(){
  try{ const o = JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; return { dice:new Set(o.dice||[]), relics:new Set(o.relics||[]) }; }
  catch(e){ return { dice:new Set(), relics:new Set() }; }
}
function saveSeen(seen){
  try{ localStorage.setItem(SEEN_KEY, JSON.stringify({ dice:[...seen.dice], relics:[...seen.relics] })); }catch(e){}
}

// ---- Player prefs (sound / reduced-motion) -- small, separate from the
// save file since they're device/player settings, not run state, and
// should survive across runs (including after a run ends and the save is
// cleared). ----
const PREFS_KEY = 'dungeonScramblePrefs_v1';
const DEFAULT_PREFS = { sound: true, music: true, reducedMotion: false, lowIntensity: false, vibration: true, sfxVol: 1, musicVol: 1 }; // volumes 0-1 (Oct 13 sliders; 0 also turns sound/music off)
let PREFS = loadPrefs();
function loadPrefs(){
  try{
    const raw = localStorage.getItem(PREFS_KEY);
    if(!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  }catch(e){ return { ...DEFAULT_PREFS }; }
}
function savePrefs(){
  try{ localStorage.setItem(PREFS_KEY, JSON.stringify(PREFS)); } catch(e){}
}
function setPref(key, val){
  PREFS[key] = val;
  savePrefs();
  if(key==='reducedMotion' && typeof applyReducedMotionClass==='function') applyReducedMotionClass();
}

// ---- First-run tutorial: shown once, ever, the first time a new game
// starts. Marked seen the moment it's shown (not on dismiss), so it never
// reappears uninvited even if the player closes the tab mid-tutorial -- the
// Settings modal's "How to Play" button re-opens it on demand any time. ----
const TUTORIAL_SEEN_KEY = 'dungeonScrambleTutorialSeen_v1';
function hasSeenTutorial(){
  try{ return !!localStorage.getItem(TUTORIAL_SEEN_KEY); } catch(e){ return true; } // fail open: don't nag if storage is broken
}
function markTutorialSeen(){
  try{ localStorage.setItem(TUTORIAL_SEEN_KEY, '1'); } catch(e){}
  // new devices start learning symbols from zero (devices that predate symbol intros are seeded as all-seen instead)
  try{ if(!localStorage.getItem('dungeonScrambleSymbolsSeen_v1')) localStorage.setItem('dungeonScrambleSymbolsSeen_v1','[]'); } catch(e){}
}

// A lightweight look at the saved run for the setup screen's "Continue"
// button, without actually loading it into S -- so the player can see what
// they'd be resuming (who, where, how hurt) before committing to it.
function peekSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const data = JSON.parse(raw);
    const origin = ORIGINS.find(o=>o.id===data.originId);
    const klass = CLASSES.find(c=>c.id===data.classId);
    if(!origin || !klass) return null;
    return {
      originName: origin.name, className: klass.name,
      floorIdx: data.floorIdx||0, health: data.health, maxHealth: data.maxHealth,
      turnsTaken: (data.stats&&data.stats.turnsTaken)||0,
    };
  }catch(e){ return null; }
}

function loadGame(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    const data = JSON.parse(raw);
    data.klass = CLASSES.find(c=>c.id===data.classId);
    data.origin = ORIGINS.find(o=>o.id===data.originId);
    data.usedCards = new Set(data.usedCards||[]);
    // ||[] also covers loading a save written before this field existed.
    data.usedLootNames = new Set(data.usedLootNames||[]);
    delete data.classId; delete data.originId;
    // Heal saves corrupted by an old Organize/Upgrade bug (holes in the Bag,
    // Tray slots with no die) so a bad save can't brick the run.
    if(Array.isArray(data.backPocket)) data.backPocket = data.backPocket.filter(Boolean);
    if(Array.isArray(data.tray)) data.tray.forEach(c=>{ if(c && !c.die) c.die = clone(basic('attack',1)); });
    data.organizeSelection = null;
    delete data._roll; delete data._ghost; delete data._shieldFx; // old saves carried stale animation clocks -> absurd HP numbers
    S = data;
    return true;
  }catch(e){ return false; }
}

// Autosave fires from render() itself, but only at safe checkpoints -- never
// mid-transition or mid-modal, since a Shrine choice's callback can't
// survive being written to JSON (see serializeState).
function maybeAutosave(){
  if(!S || S.transitioning || S.lootChoice || S.shrineChoice || S.relicChoice || S.pendingLootDie) return;
  if(S.screen!=='game' && S.screen!=='camp' && S.screen!=='shrine') return;
  saveGame();
}

function rand(n){ return Math.floor(Math.random()*n); }
function pick(arr){ return arr[rand(arr.length)]; }
function pickN(arr,n){ const pool=arr.slice(); const out=[]; while(out.length<n && pool.length){ out.push(pool.splice(rand(pool.length),1)[0]); } return out; }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function cap(v,max){ return Math.max(0, Math.min(v,max)); }
function capUpper(v,max){ return Math.min(v,max); } // no floor -- lets encounter health go negative so Overkill can be measured

function originPortraitArray(originId){
  if(originId==='dwarf') return DWARF_PORTRAITS;
  if(originId==='gnome') return GNOME_PORTRAITS;
  if(originId==='halfling') return HALFLING_PORTRAITS;
  if(originId==='pixie') return PIXIE_PORTRAITS;
  return null;
}

// Picks a race-correct portrait for a given Origin. All four origins now
// have real art recovered from the character sheet.
function pickPortrait(originId){
  const arr = originPortraitArray(originId);
  if(!arr) return { img: GNOME_SILHOUETTE, placeholder:true };
  const idx = rand(arr.length);
  const portrait = { img: arr[idx], placeholder:false, tone:'original' };
  applyRandomSkinTone(portrait, originId, idx);
  return portrait;
}

// ---- Random skin tone per run ----
// Each fresh portrait pick rolls one of five skin tones (Original keeps the
// art as drawn). The tint is done at runtime on a canvas, only on the skin
// pixels, so outlines, hair, clothes and props never change and the source
// PNGs stay untouched. Dwarf and Halfling art is fully supported; two Gnome
// portraits (a cream robe, a scroll) and every Pixie (their face colours are
// per-portrait palette choices) keep their original colours.
const SKIN_TONES = [
  { id:'original', name:'Original', rgb:null },
  { id:'green',    name:'Green',    rgb:[120,200,100] },
  { id:'blue',     name:'Blue',     rgb:[120,170,235] },
  { id:'purple',   name:'Purple',   rgb:[180,130,220] },
  { id:'gray',     name:'Gray',     rgb:[165,170,175] },
];
const SKIN_TINT_SKIP = { pixie:'all', gnome:[8,9] };
const SKIN_PEACH = [250,203,157];
const _skinTintCache = {};
function skinTintEligible(originId, idx){
  const skip = SKIN_TINT_SKIP[originId];
  if(skip==='all') return false;
  if(Array.isArray(skip) && skip.indexOf(idx)>=0) return false;
  return originId==='dwarf' || originId==='gnome' || originId==='halfling';
}
function tintSkinPixels(src, originId, rgb){
  return new Promise((resolve)=>{
    const im = new Image();
    im.onload = ()=>{
      try{
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const g = c.getContext('2d'); g.drawImage(im,0,0);
        const d = g.getImageData(0,0,c.width,c.height); const px = d.data;
        const peach = originId==='halfling';
        for(let i=0;i<px.length;i+=4){
          const a=px[i+3]; if(!a) continue;
          const r=px[i], gg=px[i+1], b=px[i+2];
          let w, lum;
          if(peach){
            const dr=r-SKIN_PEACH[0], dg=gg-SKIN_PEACH[1], db=b-SKIN_PEACH[2];
            const dist=Math.sqrt(dr*dr+dg*dg+db*db);
            w = Math.max(0,Math.min(1,(34-dist)/14)); lum = ((r+gg+b)/3)/203*1.15;
          } else {
            const mn=Math.min(r,gg,b);
            w = Math.max(0,Math.min(1,(mn-165)/35)) * Math.max(0,Math.min(1,((r-b)-3)/8)); lum = ((r+gg+b)/3)/236;
          }
          if(w<=0) continue;
          px[i]   = r*(1-w) + Math.min(255,rgb[0]*lum)*w;
          px[i+1] = gg*(1-w) + Math.min(255,rgb[1]*lum)*w;
          px[i+2] = b*(1-w) + Math.min(255,rgb[2]*lum)*w;
        }
        g.putImageData(d,0,0);
        resolve(c.toDataURL('image/png'));
      }catch(e){ resolve(null); }
    };
    im.onerror = ()=>resolve(null);
    im.src = src;
  });
}
function applyRandomSkinTone(portrait, originId, idx){
  if(!skinTintEligible(originId, idx)) return;
  const tone = SKIN_TONES[rand(SKIN_TONES.length)];
  portrait.tone = tone.id;
  if(!tone.rgb) return;
  const key = originId+':'+idx+':'+tone.id;
  if(_skinTintCache[key]){ portrait.img = _skinTintCache[key]; return; }
  const orig = portrait.img;
  tintSkinPixels(orig, originId, tone.rgb).then(url=>{
    if(!url) return;
    _skinTintCache[key] = url;
    portrait.img = url;
    if(typeof render==='function' && typeof S!=='undefined' && S) render();
  });
}

// The character-select screen shows a portrait per Origin card before a
// game exists, and re-renders on every click (choosing a class, etc) --
// without caching, each of those re-renders would call pickPortrait()
// again and swap in a different random portrait than what newGame() then
// actually uses. So the preview pick below is made once per Origin and
// reused by both the setup screen and newGame() (for S.portrait) for as
// long as the player stays on that one visit to the setup screen.
//
// Each fresh "New Run" (from the title screen) clears this cache via
// resetSetupPortraitPreviews(), so the portraits shown are re-randomized
// every time the player starts over from the title screen, rather than
// staying fixed for the whole session.
let setupPortraitCache = {};
function resetSetupPortraitPreviews(){ setupPortraitCache = {}; }
function getSetupPreviewPortrait(originId){
  if(!setupPortraitCache[originId]) setupPortraitCache[originId] = pickPortrait(originId);
  return setupPortraitCache[originId];
}

function newGame(originId, classId, boonDieName, charName, depthMods){
  depthMods = depthMods || {};
  const startHp = Math.max(8, 20 - 4*(depthMods.frail||0));
  // Defense in depth: the Setup screen is the only place that offers an
  // Origin choice, and it already refuses to let a locked one be selected,
  // but falling back here too means a stale/tampered call can't bypass the
  // unlock (e.g. a saved bookmark from before Halfling was unlocked).
  if(!isOriginUnlocked(originId)) originId = 'dwarf';
  const origin = ORIGINS.find(o=>o.id===originId);
  const klass = CLASSES.find(c=>c.id===classId);
  const originDie = {name: origin.die, faces: origin.faces};

  let shuffled;
  let carryDie = null; // set below (non-debug only) if a die carried over from a previous run's defeat
  let appliedBoonName = null; // set below (non-debug only) if a Starting Boon die was actually applied
  if(klass.debug){
    // Debug class: skip the normal starter loadout entirely and fill the
    // tray with a random sample across every die type in the game (Basic,
    // every Origin, and every Loot Dice tier) for quick testing/visual QA.
    const allTemplates = []
      .concat(BASIC_DICE.map(d=>({name:d.name, faces:d.faces, cat:d.cat, level:d.level})))
      .concat(ORIGINS.map(o=>({name:o.die, faces:o.faces, cat:'origin'})))
      .concat(ALLOY, GILDED, MAGIC);
    shuffled = pickN(allTemplates, 16);
  } else {
    // Build starting tray: 7 Attack I, 7 Maneuver I, 1 extra (attack), 1 origin die = 16
    const dice = [];
    for(let i=0;i<7;i++) dice.push({name:'Attack Die I', faces: basic('attack',1).faces, cat:'attack', level:1});
    for(let i=0;i<7;i++) dice.push({name:'Maneuver Die I', faces: basic('maneuver',1).faces, cat:'maneuver', level:1});
    dice.push({name:'Attack Die I', faces: basic('attack',1).faces, cat:'attack', level:1}); // the "1 extra" -- replaced below if a die carried over from a previous defeat
    dice.push({name: originDie.name, faces: originDie.faces, cat:'origin'});
    // A die chosen on a previous run's Game Over screen (see
    // onPlayerDefeated()/saveCarryoverDie()) replaces the "1 extra" Attack
    // die slot -- one-shot, consumed here regardless of whether this run
    // then also ends in defeat with a new choice of its own.
    carryDie = takeCarryoverDie();
    if(carryDie) dice[dice.length-2] = carryDie;
    // Starting Boon (Setup screen, unlocked via unlockedBoonTiers()): takes
    // the first Maneuver Die I slot (index 7) -- a different slot from the
    // carryover die above (index 14) so the two one-shot bonuses never
    // collide if a player somehow has both available in the same run.
    if(boonDieName){
      const boonDie = findLootDieByName(boonDieName);
      if(boonDie){ dice[7] = boonDie; appliedBoonName = boonDie.name; }
    }
    // shuffle into 4x4
    shuffled = pickN(dice, dice.length);
  }

  S = {
    screen:'game',
    // Purely cosmetic (shown in Run History) -- never read by any gameplay
    // logic, so an empty/whitespace-only entry is just as valid as a real
    // name and needs no fallback anywhere else.
    charName: (charName||'').trim().slice(0,24),
    origin, klass,
    portrait: getSetupPreviewPortrait(origin.id),
    depth: depthFromMods(depthMods), depthMods: {...depthMods},
    maxHealth:startHp, health:startHp,
    playerDOT:0, playerHOT:0, playerBlock:0,
    tray: shuffled.map(d=>({die:d, faceIdx:0, minion:false, coveredDie:null})),
    backPocket: [],
    floorIdx:0,
    routeStep:0, // index into route array
    route: buildRoute(),
    encounter:null, // active encounter object(s) -> single for solo
    turnNumber:0,
    path:[], // array of tray indices
    classAbilityUsed:false,
    log:[],
    lootChoice:null,
    campOpen:false,
    freezeNext:false,
    nullifyTokens:0,
    freezeTokens:0,
    swapTokens:0,
    rerollTokens:0,
    swapLog:[],
    trayAct:null,
    boostTokenCharges:0,
    boostTokenValue:0,
    pendingFreeBoost:0,
    shrineChoice:null,
    relicChoice:null,
    relics:[],
    usedCards: new Set(),
    // Same "no repeats until the whole pool's been seen" idea as usedCards
    // above, but for Loot dice actually acquired this run (floor drops,
    // Shrine trades/random-replaces, a Starting Boon, or a carried-over
    // die) -- see pickLootUnused()/pickLootNUnused() below. Seeded here
    // with whatever the player already starts the run holding, so a loot
    // drop can't immediately hand them a second copy of their own Boon or
    // carryover die.
    usedLootNames: new Set([carryDie && carryDie.name, appliedBoonName].filter(Boolean)),
    _lastPlayerHealth: startHp, // for the heal/damage flash effect on the health bar
    stats: { turnsTaken:0, damageDealt:0, encountersDefeated:0, shrinesVisited:0, overkills:0, lootCollected:0, bestTurn:0, bestTurnFoe:'', bestOverBy:0, bestOverFoe:'', longestPath:0, nearMisses:0, damageBlocked:0 },
    tele: newTelemetry(),
    campRested: false,
    shrineResult: null,
    segmentShrineUsed: false,
    segmentTrapUsed: false,
  };
  // Ability teaching (Oct 13): the Skill button pulses until used each turn for a class's first few runs.
  if(!META.classRuns) META.classRuns = {};
  META.classRuns[klass.id] = (META.classRuns[klass.id]||0) + 1; saveMeta();
  S.coachRun = META.classRuns[klass.id] <= ABILITY_COACH_RUNS;
  // An Origin that has won a run starts every later run holding its signature relic.
  { const oc = originRelicFor(origin.id); if(oc && (META.lifetime.victoriesByOrigin[origin.id]||0)>=1) grantRelic(oc.id, {silent:true, via:'origin'}); }
  teleLog('run_start', {runNo:(META.lifetime.runsPlayed||0)+1, classRunNo:(META.classRuns&&META.classRuns[klass.id])||1, depth:S.depth, depthMods:S.depthMods, skin:(S.portrait&&S.portrait.tone)||'original', relics:S.relics.slice(), origin:origin.name, klass:klass.name, carry:carryDie?carryDie.name:null, boon:boonDieName||null, tray:S.tray.map(c=>c.die.name)});
  logMsg('sys', `A ${origin.name} ${klass.name} descends into the dungeon...`);
  if(carryDie) logMsg('sys', `${carryDie.name} joins your tray, carried over from your last run.`, 'good');
  if(boonDieName && !klass.debug && findLootDieByName(boonDieName)) logMsg('sys', `${boonDieName} joins your tray as your Starting Boon.`, 'good');
  // No scrambleTray() here: a new run always opens on Camp, not combat, so
  // there's nothing to roll yet -- playing the dice-roll sound here just
  // fired it on the title->camp transition for no in-fiction reason. The
  // tray starts faceIdx:0 (set above) and gets its first real scramble
  // either from Rest or from advanceRoute()'s own scrambleTray() call when
  // the player actually leaves Camp into the first encounter.
  advanceRoute(); // triggers first encounter (or, since every route starts with Camp, just opens Camp)
  render();
  if(!hasSeenTutorial()){
    markTutorialSeen();
    if(typeof openTutorialModal==='function') openTutorialModal(0);
  }
}

function buildRoute(){
  // Camp(start), Encounter x3, Camp, Encounter x2, Boss  -- per floor
  return ['camp','enc','enc','enc','camp','enc','enc','boss'];
}

function logMsg(cls,text,toastKind){
  S.log.push({cls,text});
  if(S.log.length>200) S.log.shift();
  if(toastKind!==undefined && typeof showToast==='function'){
    showToast(text, toastKind===true ? null : toastKind);
  }
}

/* ---- Encounter drawing ---- */
function pickUnused(pool){
  const avail = pool.filter(c=>!S.usedCards.has(c.name));
  return avail.length ? pick(avail) : pick(pool); // fall back to a repeat only if a whole pool is exhausted
}

/* ---- Loot drawing: same "no repeats until the pool runs dry" idea as
   pickUnused() above, applied to S.usedLootNames (dice actually acquired
   this run -- see newGame()/swapInLootDie()) instead of S.usedCards, so a
   run never hands the player a second copy of a Loot die it already gave
   them, until every design in that tier has been seen at least once. ---- */
function pickLootUnused(pool){
  const avail = pool.filter(d=>!S.usedLootNames.has(d.name));
  return avail.length ? pick(avail) : pick(pool); // fall back to a repeat only if the whole tier is exhausted
}
function pickLootNUnused(pool, n){
  const avail = pool.filter(d=>!S.usedLootNames.has(d.name));
  if(avail.length>=n) return pickN(avail, n);
  // Not enough never-seen designs left to fill the request -- offer all of
  // them, then pad the rest with repeats (never a repeat OF each other
  // within this same draw, since that padding is itself drawn without
  // replacement from what's left).
  const repeats = pickN(pool.filter(d=>!avail.includes(d)), n-avail.length);
  return avail.concat(repeats);
}

// Which tier this room is (v1.35.0): the floor's slot pattern (ROOM_TIER_SLOTS,
// data.js), shifted up by the Night Shift (gauntlet) depth modifier.
function roomTierForStep(step){
  let t = ROOM_TIER_SLOTS[step] || 'standard';
  const up = depthRank('gauntlet');
  // Night Shift, as its text says (Oct 14 fix; it used to shift every room up by its rank, so rank 1 also made
  // Standard rooms Elite): rank 1 = Easy -> Standard; rank 2 = Easy and Standard -> Elite.
  if(up>=2) t = 'elite';
  else if(up===1 && t==='easy') t = 'standard';
  return t;
}

// v1.36.0: shrines get more common deeper in a run and at higher depth.
function shrineSlotChance(){
  return Math.min(SHRINE_CHANCE_MAX, (SHRINE_SLOT_CHANCE[S.floorIdx]||SHRINE_SLOT_CHANCE[0]) + SHRINE_CHANCE_PER_DEPTH*(currentDepth()-1));
}

// Draws the card for a regular room. Shrines may take an easy or standard
// room (at most one per segment, never the run's very first room); the
// first room of the run is always a plain Enemy; at most one Trap per
// segment. A deadly card occasionally takes an elite room on Floors 2-3.
// No repeats within a run until a tier's pool runs dry, then the nearest
// tier fills in.
function drawRoomCard(floor){
  const isVeryFirstEncounter = S.floorIdx===0 && S.routeStep===1;
  let tier = roomTierForStep(S.routeStep);
  const unused = c => !S.usedCards.has(c.name);
  // Shrine chances follow the room's normal tier, before Night Shift raises it (Jeremy, Oct 14: keep consistent access to shrines)
  const baseTier = ROOM_TIER_SLOTS[S.routeStep] || 'standard';
  if(!isVeryFirstEncounter && baseTier!=='elite' && !S.segmentShrineUsed && floor.shrines.length && Math.random() < shrineSlotChance()){
    const sh = floor.shrines.filter(unused);
    return pick(sh.length ? sh : floor.shrines);
  }
  const fights = floor.enemies.concat(isVeryFirstEncounter || S.segmentTrapUsed ? [] : floor.traps);
  if(tier==='elite'){
    const deadly = fights.filter(c=>encounterTier(c)==='deadly' && unused(c) && (!c.dreadOnly || depthRank('dread'))); // v1.39.0: dreadOnly cards appear only with the Dread modifier
    if(deadly.length && Math.random() < DEADLY_CHANCE + 0.12*depthRank('dread')) return pick(deadly);
  }
  const fallback = {easy:['easy','standard','elite'], standard:['standard','easy','elite'], elite:['elite','standard','easy']}[tier];
  for(const t of fallback){
    const pool = fights.filter(c=>encounterTier(c)===t && unused(c));
    if(pool.length) return pick(pool);
  }
  const any = fights.filter(c=>encounterTier(c)!=='deadly');
  return pick(any.length ? any : fights); // every eligible card already seen this run -- last resort repeat
}

function drawEncounter(kind){
  const floor = FLOORS[S.floorIdx];
  let e;
  if(kind==='boss'){
    e = clone(pickUnused(S.floorIdx===2 ? BIG_BOSSES : floor.bosses));
  } else {
    e = clone(drawRoomCard(floor));
    if(e.type==='Trap') S.segmentTrapUsed = true;
    if(e.type==='Shrine') S.segmentShrineUsed = true;
  }
  S.usedCards.add(e.name);
  if(e.type!=='Shrine') bestiaryNote(e.name, 'met');
  if(e.health>0){ e.health = Math.max(1, Math.round(e.health * floorHpMul(S.floorIdx) * (/^(elite|deadly)$/.test(encounterTier(e)) ? 1 + DREAD_HP*depthRank('dread') : 1))); if(e.maxHealth!==undefined) e.maxHealth = e.health; }
  e.curHealth = e.health;
  e.curDOT = 0; e.curHOT = 0; e.curShield = 0; e.turn = 0;
  // Your own D.O.T./H.O.T. don't carry from one encounter into the next
  // either -- a fresh room is a clean slate for both sides, same as the
  // enemy's own stacks just above. (Mid-fight, a Nullify is still the only
  // way to clear it early.)
  // Block (like every other status) is a clean slate in a new room too.
  S.playerDOT = 0; S.playerHOT = 0; S.playerBlock = 0;
  e.questsDone = (e.quests||[]).map(()=>false);
  e.questDamageDealt = 0;
  e.minionsSpawned = 0;
  clearAllMinions();
  e._lastHealth = e.curHealth; // baseline for the heal/damage flash effect
  if(e.type==='Boss' || e.type==='Big Boss'){
    // Bosses (v1.35.0): base attack every turn plus the next special from
    // their move kit, shown a turn ahead -- see BOSS_KITS (data.js).
    initEnemyTurnState(e);
  } else if(e.type!=='Shrine'){
    initEnemyTurnState(e);
  }
  return e;
}

function advanceRoute(){
  S.path = []; S.classAbilityUsed=false; S.turnNumber=0; abilityArmed = false;
  // A class-ability conversion (forcedFace) is only ever meant to last the
  // one turn it was used on -- normally cleared by endTurn() -- but when an
  // encounter dies mid-turn (the kill happens during the path-resolution
  // beats, before the turn ever reaches endTurn()), that cleanup is skipped
  // entirely and the converted die's forced face would otherwise ride along
  // into the next room, or even the next fight if that next step is a Camp.
  // Clearing it here, on every room transition, closes that gap regardless
  // of which path led here.
  S.tray.forEach(c=>{ delete c.forcedFace; delete c.spent; delete c.actUsed; });
  S.swapLog = []; S.trayAct = null;
  if(S.routeStep >= S.route.length){
    // move to next floor
    if(S.floorIdx < FLOORS.length-1){
      S.floorIdx++;
      S.routeStep = 0;
      S.route = buildRoute();
      logMsg('sys', `— Floor ${S.floorIdx+1} —`, true);
      if(typeof playTone==='function') playTone('floorUp');
      if(typeof showFloorCard==='function') showFloorCard(S.floorIdx+1, FLOORS[S.floorIdx].name || '');
      if(typeof spawnParticleBurstAtEl==='function') spawnParticleBurstAtEl('#app', ['#ffd76a','#8fd0ff','#9affa0','#fff5d6']);
    } else {
      S.screen='victory';
      return;
    }
  }
  const step = S.route[S.routeStep];
  if(step==='camp'){
    S.screen='camp';
    S.encounter = null;
    S.organizeSelection = null;
    S.campUpgrades = {attack:false, maneuver:false};
    S.campRested = false; // true once the campfire is used (Rest or Train)
    S.campChoice = null;  // Oct 14 (Jeremy): the campfire is a choice, 'rest' or 'train' (= combining dice)
    S.campFireOut = false;
    if(S.skipNextRest && !(S.floorIdx===0 && S.routeStep===0)){ S.campFireOut = true; S.skipNextRest = false; S.campRested = true; logMsg('sys', 'The Time-Intensive Shrine took this campfire: no Rest or upgrades here.', 'bad'); }
    teleLog('room_start', {type:'Camp', hp:S.health, maxHp:S.maxHealth});
    // a new segment (the stretch of rooms up to the next Camp or the Boss)
    // starts fresh -- one Shrine and one Trap are allowed per segment
    S.segmentShrineUsed = false;
    S.segmentTrapUsed = false;
  } else if(step==='enc'){
    const drawn = drawEncounter('enc');
    S.encounter = drawn;
    if(drawn.type==='Shrine'){
      // Shrines aren't combat: no health, no attacks, no dice tray. Resolve
      // them immediately instead of dropping the player into the normal
      // Scramble/Path/Math loop for a "fight" that could never happen.
      S.screen = 'shrine';
      S.shrineResult = null;
      logMsg('sys', `A door creaks open: ${drawn.name} (${drawn.type})`);
      teleLog('room_start', {type:'Shrine', name:drawn.name, hp:S.health, maxHp:S.maxHealth});
      S.stats.shrinesVisited++;
      // Shrines skipped the same "A new room..." callout regular encounters
      // get, so stepping into one gave no sense of having entered anything --
      // one-shot flag consumed by renderShrineEncounter() (render.js), same
      // as S.newRoomFx is for renderGame().
      S.newRoomFx = {name: drawn.name, type: drawn.type, boss:false};
      // Deliberately NOT calling applyShrineBoon() here: that used to fire
      // immediately, so the boon/loot result modal popped up in the very
      // same render as the "A new room..." callout -- the modal's full-
      // screen overlay sits on top of the callout, so the player saw their
      // reward before they ever found out they were at a Shrine. It now
      // runs once the player dismisses that callout instead (wired up in
      // renderShrineEncounter()/showRoomCallout(), render.js), same beat as
      // a regular encounter: see the room, then see what's in it.
      return;
    }
    // A fresh room gets a fresh roll -- without this the tray would still
    // be showing whatever was left over from the moment the last encounter
    // died (the turn-transition sequence stops early on a kill, before it
    // ever reaches its normal end-of-turn scrambleTray() call), so you'd
    // open a brand new fight with dice you'd already half-used against the
    // last one. campRest() already does this after a Camp; this covers
    // every enc-to-enc and enc-to-boss transition within a segment.
    scrambleTray();
    S.screen='game';
    S._roomStartedAt = teleActiveMs();
    applyRelicsOnRoomStart();
    teleLog('room_start', {type:drawn.type, name:drawn.name, enemyHp:drawn.maxHealth, hp:S.health, maxHp:S.maxHealth});
    logMsg('sys', `A door creaks open: ${drawn.name} (${drawn.type})`);
    // One-shot "new room" flourish -- read by renderGame()/renderEncounterCard()
    // on the very next render (a card entrance animation + a banner callout +
    // a distinct tone), then cleared, so it plays exactly once per room.
    S.newRoomFx = {name: drawn.name, type: drawn.type, boss:false};
  } else if(step==='boss'){
    S.encounter = drawEncounter('boss');
    if(hasRelic('frost_charm')){ S.freezeTokens = (S.freezeTokens||0) + 1; fireRelic('frost_charm','+1 Freeze'); }
    scrambleTray();
    S.screen='game';
    S._roomStartedAt = teleActiveMs();
    applyRelicsOnRoomStart();
    teleLog('room_start', {type:S.encounter.type, name:S.encounter.name, enemyHp:S.encounter.maxHealth, hp:S.health, maxHp:S.maxHealth});
    logMsg('sys', `Boss Encounter: ${S.encounter.name}`);
    S.newRoomFx = {name: S.encounter.name, type: S.encounter.type, boss:true};
  }
}

function finishStep(){
  S.routeStep++;
  advanceRoute();
}

/* =========================================================================
   TRAY / DICE HELPERS
   ========================================================================= */
function trayRC(i){ return {r: Math.floor(i/4), c: i%4}; }
function trayIdx(r,c){ return r*4+c; }
function inBounds(r,c){ return r>=0&&r<4&&c>=0&&c<4; }

function currentFace(cell){
  if(cell.minion || cell.blank || cell.spent) return {type:'blank'};
  return cell.die.faces[cell.faceIdx];
}

function scrambleTray(){
  S._abilityReveal = null;
  S._reveals = [];
  S._pendingMinions = 0;
  S.tray.forEach(cell=>{ cell.faceIdx = rand(6); cell.blank = false; delete cell.spent; delete cell.actUsed; });
  S.path = [];
  S.swapLog = []; S.trayAct = null;
  S.classAbilityUsed = false;
  abilityArmed = false;
  S.justScrambled = true;
  if(typeof playDiceRollSound==='function') playDiceRollSound();
}

function inZone(idx){
  const {r,c} = trayRC(idx);
  return S.klass.zone(r,c);
}

function adjNormal(a,b){ return Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1; }
function adjDiag(a,b){ return Math.abs(a.r-b.r)===1 && Math.abs(a.c-b.c)===1; }
function adjLeap(a,b){ return (a.r===b.r && Math.abs(a.c-b.c)===2) || (a.c===b.c && Math.abs(a.r-b.r)===2); }
function adjPivot(a,b){ return adjNormal(a,b)||adjDiag(a,b); }
function adjWrap(a,b){
  // Dungeoneer: the left-edge and right-edge zone squares on the same row
  // are treated as adjacent (the Path "loops around" the tray).
  return a.r===b.r && Math.abs(a.c-b.c)===3;
}
function adjWrapCols(a,b){ return Math.abs(a.c-b.c)===3; } // left edge to right edge, any row

// Leap / Dodge / Pivot may land ON a Minion-covered space: the landing die (and, for a Leap, any Minion
// on the space jumped over) is uncovered for the rest of this round.
function leapOntoMinion(idx){
  if(!S.path.length) return false;
  const cell = S.tray[idx];
  if(!cell || !cell.minion) return false;
  const last = S.path[S.path.length-1];
  const t = getFaceForIdx(last).type, a = trayRC(last), b = trayRC(idx);
  if(t==='leap') return adjLeap(a,b);
  if(t==='dodge') return adjDiag(a,b);
  if(t==='pivot') return adjPivot(a,b);
  return false;
}
function revealMinionAt(idx, rec){
  const cell = S.tray[idx];
  if(!cell || !cell.minion) return;
  cell.minion=false; cell.die=cell.coveredDie||cell.die; cell.coveredDie=null; cell.blank=false;
  if(S.encounter && S.encounter.minionsSpawned>0) S.encounter.minionsSpawned--;
  if(rec) rec.push(idx);
}
// Uncovered minions are only uncovered while the path that uncovered them
// stands: undoing that step (or Clear) puts them back, so a path can't be
// used to scout the board.
function blankReveal(idx){ const c=S.tray[idx]; if(c) c.blank=false; }
function restoreAbilityReveal(){
  const i = S._abilityReveal; S._abilityReveal = null;
  if(i==null) return;
  const c = S.tray[i]; if(!c || c.minion) return;
  c.coveredDie=c.die; c.minion=true; c.blank=false; if(S.encounter) S.encounter.minionsSpawned=(S.encounter.minionsSpawned||0)+1;
}
function restoreReveals(keepLen){
  if(!S._reveals) { S._reveals=[]; return; }
  while(S._reveals.length && S._reveals[S._reveals.length-1].pathLen > keepLen){
    const r = S._reveals.pop();
    r.idxs.forEach(i=>{ const c=S.tray[i]; if(!c||c.minion) return; c.coveredDie=c.die; c.minion=true; c.blank=false; if(S.encounter) S.encounter.minionsSpawned=(S.encounter.minionsSpawned||0)+1; });
  }
}

function canSelect(idx){
  if(S.path.includes(idx)) return false;
  const f = getFaceForIdx(idx);
  if(f.type==='blank' && !leapOntoMinion(idx)) return false;
  if(S.path.length===0) return true;
  const lastIdx = S.path[S.path.length-1];
  const lastFace = getFaceForIdx(lastIdx);
  if(lastFace.type==='blank') return false; // ended on an uncovered blank: the path goes no further
  const a = trayRC(lastIdx), b = trayRC(idx);

  let allowed = false;
  if(lastFace.type==='dodge') allowed = adjDiag(a,b);
  else if(lastFace.type==='leap') allowed = adjLeap(a,b);
  else if(lastFace.type==='pivot') allowed = adjPivot(a,b);
  else allowed = adjNormal(a,b);
  if(!allowed && lastFace.type==='pivot' && hasRelic('pivot_compass')) allowed = true; // v1.36.0

  // class zone bonuses
  // Dungeoneer wrap: the far edge counts as the column just past this edge, and the
  // face's own move rule applies across that seam (a Dodge still moves diagonally).
  // Before 1.41.8 this also allowed a plain up/down step inside the zone for any face.
  if(!allowed && S.klass.wrap && inZone(lastIdx) && inZone(idx) && adjWrapCols(a,b)){
    const vb = {r:b.r, c: b.c > a.c ? a.c - 1 : a.c + 1};
    if(lastFace.type==='dodge') allowed = adjDiag(a,vb);
    else if(lastFace.type==='leap') allowed = adjLeap(a,vb);
    else if(lastFace.type==='pivot') allowed = adjPivot(a,vb);
    else allowed = adjNormal(a,vb);
  }
  if(!allowed && S.klass.wrapV && inZone(lastIdx) && inZone(idx) && a.c===b.c && Math.abs(a.r-b.r)===3) allowed = true; // test switch (Oct 13 study): top-bottom wrap; no class uses it
  if(!allowed && S.klass.diagonalZone && (S.klass.diagonalZone==='either' ? (inZone(lastIdx) || inZone(idx)) : (inZone(lastIdx) && inZone(idx)))){
    allowed = adjDiag(a,b);
  }
  return allowed;
}

function anyMoveAvailable(){
  for(let i=0;i<16;i++){ if(canSelect(i)) return true; }
  return false;
}

function toggleSelect(idx){
  if(S.trayAct){ if(trayActTap(idx)) fastTrayRender(); return; } // v1.38.0: an armed Swap/Reroll takes the tap
  if(!S.path.includes(idx)){ const k = trayActFaceAt(idx); if(k){ armTrayAct(k, idx, false); fastTrayRender(); return; } } // Swap/Reroll also work mid-path (Oct 12)
  if(S.path.length && S.path[S.path.length-1]===idx){
    // clicking the most-recently-chosen die again steps back one move
    S.path.pop();
    restoreReveals(S.path.length);
    if(typeof renderPathOnly==='function') renderPathOnly(); else render();
    return;
  }
  if(S.path.includes(idx)) return; // only the last move can be undone this way
  if(!canSelect(idx)) return;
  S.path.push(idx);
  if(S.path.length===1 && typeof lungeFigure==='function') lungeFigure('playerReady');
  if(typeof playTone==='function') playTone('pathTick', S.path.length-1); // rises up the pentatonic ladder as the path grows
  if(typeof renderPathOnly==='function') renderPathOnly(); else render();
}

// ---- Swap / Reroll (v1.38.0) ----
// Swap and Reroll work any time, even mid-path (Jeremy, Oct 12), but never on a die already in the path. A Swap or Reroll face is tapped
// (or a token from the Item menu is used), then a target die is tapped. The
// face's own die is then used up for the turn (it becomes a Pivot: see TRAYACT_AFTER). Swaps go in
// S.swapLog so Clear can undo them (they reveal nothing); rerolls are final.
// A die can't target Minion-covered cells (no scouting).
// What a Swap/Reroll die becomes once used (Oct 12 switch): 'blank' (spent, ends a path; the old rule),
// 'step' (stays a plain step you can walk across), 'pivot' (becomes a Pivot for the rest of the turn).
let TRAYACT_AFTER = 'pivot'; // Jeremy, Oct 12: a used Swap/Reroll die works as a Pivot for the rest of the turn
function markTrayActUsed(c){
  if(!c) return;
  if(TRAYACT_AFTER==='blank'){ c.spent = true; return; }
  c.actUsed = true;
  if(TRAYACT_AFTER==='pivot') c.forcedFace = {type:'pivot', fromAct:true};
}
function trayActFaceAt(idx){
  if(S.transitioning || S.path.includes(idx)) return null;
  const c = S.tray[idx]; if(!c || c.minion || c.spent || c.actUsed || c.forcedFace) return null;
  const t = currentFace(c).type;
  return (t==='swap' || t==='reroll') ? t : null;
}
function armTrayAct(kind, src, token){
  S.trayAct = {kind, src: src==null ? null : src, token: !!token, first: null};
  logMsg('sys', kind==='swap' ? (token ? 'Swap token: tap two dice to trade their places.' : 'Swap: tap a die to trade places with it.') : 'Reroll: tap a die to reroll it.');
}
function cancelTrayAct(){ S.trayAct = null; }
function fastTrayRender(){ if(typeof renderTrayFast==='function') renderTrayFast(); else render(); } // Oct 14: Swap/Reroll/Skill taps
function trayActTargetOk(idx){
  const a = S.trayAct; if(!a) return false;
  const c = S.tray[idx]; if(!c || c.minion || c.spent) return false;
  if(idx===a.src || idx===a.first) return false;
  if(S.path.includes(idx)) return false; // never move or change a step already in the path
  if(a.kind==='reroll' && c.forcedFace) return false; // a class-ability conversion holds
  return true;
}
function trayActTap(idx){
  const a = S.trayAct; if(!a) return false;
  if(idx===a.src || idx===a.first){ cancelTrayAct(); return true; } // tap the armed die again to back out
  if(!trayActTargetOk(idx)) return false;
  if(a.kind==='swap'){
    if(a.token && a.first==null){ a.first = idx; return true; }
    doTraySwap(a.token ? a.first : a.src, idx, a.token);
  } else doTrayReroll(idx, a.src, a.token);
  S.trayAct = null;
  return true;
}
function doTraySwap(i, j, token){
  const A = S.tray[i], B = S.tray[j];
  if(!token) markTrayActUsed(A); // the Swap die moves to j and is used up there
  S.tray[i] = B; S.tray[j] = A;
  if(token) S.swapTokens = Math.max(0,(S.swapTokens||0)-1);
  (S.swapLog = S.swapLog||[]).push({i, j, token:!!token});
  S.justSwappedIdx = [i, j];
  if(typeof playTone==='function') playTone('swapFlip');
  logMsg('sys', `Swapped ${A.die.name} and ${B.die.name}.`);
  teleLog('tray_swap', {token:!!token, a:A.die.name, b:B.die.name});
}
function undoTraySwaps(){
  const L = S.swapLog||[];
  while(L.length){
    const r = L.pop();
    const A = S.tray[r.j], B = S.tray[r.i];
    S.tray[r.i] = A; S.tray[r.j] = B;
    if(r.token) S.swapTokens = (S.swapTokens||0)+1; else { delete A.spent; delete A.actUsed; if(A.forcedFace && A.forcedFace.fromAct) delete A.forcedFace; }
  }
}
function doTrayReroll(idx, src, token){
  const c = S.tray[idx];
  const cur = c.die.faces[c.faceIdx];
  const same = f => f.type===cur.type && (f.value||0)===(cur.value||0);
  // Always a non-blank face (Jeremy, Oct 12), and a different one whenever the die has one.
  const all = c.die.faces.map((f,k)=>k), nb = all.filter(k=>c.die.faces[k].type!=='blank');
  let opts = nb.filter(k=>k!==c.faceIdx && !same(c.die.faces[k]));
  if(!opts.length) opts = nb.filter(k=>k!==c.faceIdx);
  if(!opts.length) opts = nb.length ? nb : all.filter(k=>k!==c.faceIdx);
  c.faceIdx = opts[rand(opts.length)];
  if(token) S.rerollTokens = Math.max(0,(S.rerollTokens||0)-1);
  else if(src!=null && S.tray[src]) markTrayActUsed(S.tray[src]);
  S.justRerolledIdx = idx;
  if(typeof playRerollSound==='function') playRerollSound(c.die);
  const nf = c.die.faces[c.faceIdx];
  logMsg('sys', `Rerolled ${c.die.name}: ${LABEL[nf.type]}${nf.value?' '+nf.value:''}.`);
  teleLog('tray_reroll', {token:!!token, die:c.die.name, face:nf.type+(nf.value||'')});
}

// Clear: drops the path, the class-ability conversion and any Swaps made
// this turn (rerolls stay). Shared by the Clear button and the test bots.
function clearPathAll(){
  S.path=[];
  restoreReveals(0);
  restoreAbilityReveal();
  S.tray.forEach(c=>{ if(!(c.forcedFace && c.forcedFace.fromAct)) delete c.forcedFace; }); // a used Reroll die keeps its after-use face (rerolls stay)
  S.classAbilityUsed = false;
  abilityArmed = false;
  undoTraySwaps();
  S.trayAct = null;
}

function useClassAbility(idx){
  if(S.classAbilityUsed) return;
  if(!inZone(idx)) return;
  const cell = S.tray[idx];
  if(cell.minion){ revealMinionAt(idx); blankReveal(idx); S._abilityReveal = idx; } // the converted die shakes off its Minion
  cell.forcedFace = clone(S.klass.convertTo);
  S.classAbilityUsed = true;
  teleLog('class_ability', {klass:S.klass.id, turn:S.turnNumber, floor:S.floorIdx+1}); // Oct 12: is the ability used every turn in real play?
  S.justConvertedIdx = idx; // one-shot: a conversion flourish on this tile for the very next render only, see renderDie()/renderGame()
  logMsg('sys', `${S.klass.name} ability used: converted a die in the zone to ${LABEL[S.klass.convertTo.type]} ${S.klass.convertTo.value}.`);
  fastTrayRender();
}

/* =========================================================================
   MATHING (resolve a path)
   ========================================================================= */
// What counts as a neighbor that feeds a Combo die's growing bonus. Started
// as Hit/Combo only ("an Attack die next to it"); now Block, H.O.T. and
// D.O.T. count too, since those are just as much "something is happening on
// this board" as a Hit is -- a Combo surrounded by support/status dice grows
// the same as one surrounded by other Attack dice.
const COMBO_NEIGHBOR_TYPES = new Set(['hit','combo','block','hot','dot']);
function attackNeighborIndices(idx){
  const {r,c} = trayRC(idx);
  const out = [];
  const dirs = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
  if(hasRelic('combo_gauntlet')) dirs.push([r-1,c-1],[r-1,c+1],[r+1,c-1],[r+1,c+1]); // v1.36.0
  dirs.forEach(([rr,cc])=>{
    if(inBounds(rr,cc)){
      const j = trayIdx(rr,cc);
      const f = getFaceForIdx(j);
      if(COMBO_NEIGHBOR_TYPES.has(f.type)) out.push(j);
    }
  });
  return out;
}
function attackNeighborsCount(idx){ return attackNeighborIndices(idx).length; }

// Builds the tile-by-tile "ripple" order for the Combo-chain visual: each
// Combo die in the path, immediately followed by the neighboring tiles that
// scaled its damage (the same COMBO_NEIGHBOR_TYPES set attackNeighborsCount()
// counts -- Hit, Combo, Shield, H.O.T. and D.O.T.)
// -- so the one mechanic that's actually a spatial/board-state bonus gets a
// visible chain-reaction pulse instead of resolving as a single silent
// number, same as every other path action. Consumed (read once, then
// cleared) by the very next render -- see renderDie()/renderGame(). Not
// folded into computePathEffects() since that's a pure, side-effect-free
// calculator reused for the live path preview too, where nothing should
// animate yet.
function buildComboRipple(path){
  const ripple = [];
  let order = 0;
  path.forEach(idx=>{
    if(getFaceForIdx(idx).type!=='combo') return;
    ripple.push({idx, order});
    order++;
    attackNeighborIndices(idx).forEach((nIdx,k)=>{ ripple.push({idx:nIdx, order:order+0.5+k*0.35}); });
    order++;
  });
  return ripple.length ? ripple : null;
}
// During resolution only: a covered (Minion) die that a maneuver landed on shows
// its real face. Previews never use this, so a path can't scout covered dice.
function pathFaceForIdx(idx){
  const cell = S.tray[idx];
  if(S._resolvingPath && cell.minion && !cell.forcedFace) return cell.die.faces[cell.faceIdx];
  return getFaceForIdx(idx);
}
function getFaceForIdx(idx){
  const cell = S.tray[idx];
  if(cell.forcedFace) return cell.forcedFace;
  return currentFace(cell);
}

// Pure calculator -- no side effects. Used both for the actual turn
// resolution and for the live running-total preview while building a path.
function computePathEffects(path){
  let totalDamage=0, boostMult = S.pendingFreeBoost>0 ? S.pendingFreeBoost : 1;
  let dotToEncounter=0, hotToPlayer=0, blockGain=0, healGain=0, selfDot=0, freeze=false, nullifyCount=0;
  let hitCount=0, comboCount=0, healCount=0, blockCount=0, boostCount=0,
      dodgeCount=0, leapCount=0, pivotCount=0, maneuverCount=0, supportCount=0, hotCount=0, dotCount=0;

  path.forEach(idx=>{
    const f = pathFaceForIdx(idx);
    const val = f.value||0;
    switch(f.type){
      case 'hit': hitCount++; totalDamage += val*boostMult; break;
      case 'combo': { comboCount++; const nAdj=attackNeighborsCount(idx); totalDamage += val*(1+nAdj)*boostMult; break; }
      case 'dot': dotCount++; dotToEncounter += val*boostMult; break;
      case 'leech': dotToEncounter += val*boostMult; hotToPlayer += val*boostMult; break;
      case 'heal': supportCount++; healCount++; healGain += Math.max(1, val - depthRank('round'))*boostMult; break;
      case 'hot': supportCount++; hotCount++; hotToPlayer += val*boostMult; break;
      case 'block': supportCount++; blockCount++; blockGain += val*boostMult; break;
      case 'boost': boostCount++; boostMult *= val; break;
      case 'fumble': selfDot += val; break;
      case 'nullify': nullifyCount++; break;
      case 'freeze': freeze=true; break;
      case 'dodge': dodgeCount++; maneuverCount++; break;
      case 'leap': leapCount++; maneuverCount++; break;
      case 'pivot': pivotCount++; maneuverCount++; break;
    }
    // A pending Boost carries only to the very next path action: it compounds
    // through consecutive Boosts, is spent by the Attack/Support action it
    // multiplies, and otherwise dissipates unused (Dodge/Leap/Pivot/Fumble/
    // Freeze/Nullify don't carry it forward), per the manual's "dissipates
    // across non-Attack Actions... unless the Path continues through another
    // BOOST" rule.
    if(f.type!=='boost') boostMult = 1;
  });

  // Relics adjust the per-die steps (see applyRelicsToSteps); take the totals
  // from them so the live preview includes every relic bonus.
  if(S.relics && S.relics.length){
    const st = computePathSteps(path);
    totalDamage = st.reduce((a,x)=>a+x.dmg,0);
    dotToEncounter = st.reduce((a,x)=>a+x.dotToEncounter,0);
    healGain = st.reduce((a,x)=>a+x.healGain,0);
    hotToPlayer = st.reduce((a,x)=>a+x.hotToPlayer,0);
    blockGain = st.reduce((a,x)=>a+x.blockGain,0);
  }
  const blankCount = S.tray.filter((c,i)=>!path.includes(i) && getFaceForIdx(i).type==='blank').length;

  return { totalDamage, dotToEncounter, hotToPlayer, blockGain, healGain, selfDot, freeze, nullifyCount,
    hitCount, comboCount, healCount, blockCount, boostCount, dodgeCount, leapCount, pivotCount,
    maneuverCount, supportCount, hotCount, dotCount, totalActions: path.length, blankCount };
}

// Mirrors computePathEffects()'s own loop (same math, same Boost-carry
// rule) but keeps each die's individual contribution instead of only the
// running totals -- so a path can be played back one die at a time
// (see runPlayerPathSteps() below) instead of landing as one instant
// lump sum. Pure -- no side effects, same as computePathEffects().
function computePathSteps(path){
  let boostMult = S.pendingFreeBoost>0 ? S.pendingFreeBoost : 1;
  const steps = path.map((idx,i)=>{
    const f = pathFaceForIdx(idx);
    const val = f.value||0;
    const step = {idx, type:f.type, dmg:0, dotToEncounter:0, hotToPlayer:0, blockGain:0, healGain:0, selfDot:0, freeze:false, nullify:false, boostMultApplied:0, leapClearIdx:null};
    // A Leap jumps clean over the cell between its start and end (the
    // move's actual midpoint, see adjLeap()) rather than landing on it --
    // if a Minion happens to be sitting in that gap, leaping over it
    // knocks it out on the spot, a second, more deliberate way to clear
    // Minions alongside just racking up Hits (see clearMinionAt() below).
    // The move's TYPE is decided by the die you're leaving, i.e. the
    // previous step in the path (same rule canSelect() uses), so this only
    // applies from the 2nd die on.
    if(i>0 && getFaceForIdx(path[i-1]).type==='leap'){
      const a = trayRC(path[i-1]), b = trayRC(idx);
      const overIdx = trayIdx((a.r+b.r)/2, (a.c+b.c)/2);
      if(S.tray[overIdx] && S.tray[overIdx].minion) step.leapClearIdx = overIdx;
    }
    if(S.tray[idx].minion && S._resolvingPath) step.revealIdx = idx; // a maneuver landed on a covered die: uncovered as this step resolves
    switch(f.type){
      case 'hit': step.dmg = val*boostMult; break;
      case 'combo': step.dmg = val*(1+attackNeighborsCount(idx))*boostMult; break;
      case 'dot': step.dotToEncounter = val*boostMult; break;
      case 'leech': step.dotToEncounter = val*boostMult; step.hotToPlayer = val*boostMult; break;
      case 'heal': step.healGain = Math.max(1, val - depthRank('round'))*boostMult; break; // Rounding Error: Heal faces heal 1 less (never below 1)
      case 'hot': step.hotToPlayer = val*boostMult; break;
      case 'block': step.blockGain = val*boostMult; break;
      case 'boost': step.boostMultApplied = val; boostMult *= val; break;
      case 'fumble': step.selfDot = val; break;
      case 'nullify': step.nullify = true; break;
      case 'freeze': step.freeze = true; break;
    }
    if(f.type!=='boost') boostMult = 1;
    return step;
  });
  return applyRelicsToSteps(steps, path);
}

// Un-minions the first minion-covered tray cell found (tray order), same
// selection order the old all-at-once clearing used. Called once per Hit
// die as it resolves (see applyPathStep()) rather than all at once, so a
// path with 2 Hits still clears exactly 2 minions, just spread across the
// moment each Hit actually lands instead of after the fact.
// Heals the player; with Power Word: Safe (overflow_chalice) (v1.36.0) healing past max becomes Block.
function healPlayer(n){
  const over = S.health + n - S.maxHealth;
  S.health = cap(S.health+n, S.maxHealth);
  if(over>0 && hasRelic('overflow_chalice')){ S.playerBlock += over; fireRelic('overflow_chalice','+'+over+' Block'); }
}
// Strength in Mooks (grave_tally, v1.36.0): each Minion the player clears gives 1 Block.
function graveTally(n){ if(n>0 && hasRelic('grave_tally')){ S.playerBlock += n; fireRelic('grave_tally','+'+n+' Block'); } }
function clearOneMinion(){
  const cell = S.tray.find(c=>c.minion);
  if(cell){ graveTally(1); cell.minion=false; cell.die=cell.coveredDie||cell.die; cell.coveredDie=null; cell.blank=true; if(S.encounter && S.encounter.minionsSpawned>0) S.encounter.minionsSpawned--; }
}

// Clears one SPECIFIC Minion-covered cell -- as opposed to clearOneMinion()'s
// "first minion found in tray order" -- used when a Leap jumps clean over
// it (see computePathSteps()'s step.leapClearIdx, above).
function clearMinionAt(idx){
  const cell = S.tray[idx];
  if(cell && cell.minion){ graveTally(1); cell.minion=false; cell.die=cell.coveredDie||cell.die; cell.coveredDie=null; cell.blank=true; if(S.encounter && S.encounter.minionsSpawned>0) S.encounter.minionsSpawned--; }
}

// Applies exactly one die's contribution (see computePathSteps()) to live
// game state. Called once per die as runPlayerPathSteps() plays the path
// back, so the encounter's/player's health bars drain and fill one die at
// a time instead of jumping straight to the final total.
// Enemy Shield soaks player-dealt damage (Hits, Combos, quest bonuses) before
// Health is touched. Returns the damage that gets through to Health.
function absorbWithShield(e, dmg){
  if(!(e.curShield>0) || !(dmg>0)) return dmg;
  const soaked = Math.min(e.curShield, dmg);
  e.curShield -= soaked;
  logMsg('sys', `${e.name}'s Shield absorbs ${soaked} damage.`);
  return dmg - soaked;
}

function applyPathStep(step){
  const e = S.encounter;
  if(step.revealIdx!=null) revealMinionAt(step.revealIdx);
  if(step.relicFx) step.relicFx.forEach(r=>fireRelic(r.id, r.text));
  if(step.dmg>0){
    e.curHealth = capUpper(e.curHealth-absorbWithShield(e, step.dmg), e.maxHealth);
    S.stats.damageDealt += step.dmg;
    S.resolveTotal = (S.resolveTotal||0) + step.dmg;
  }
  if(step.dotToEncounter){ e.curDOT += step.dotToEncounter; geometryMirror(e, 'dot', step.dotToEncounter); }
  if(step.hotToPlayer){ addPlayerHOT(step.hotToPlayer); geometryMirror(e, 'hot', step.hotToPlayer); }
  if(step.blockGain) S.playerBlock += step.blockGain;
  if(step.healGain) healPlayer(step.healGain);
  if(step.selfDot) S.playerDOT += step.selfDot;
  if(step.freeze) S.freezeNext = true;
  if(step.nullify) applyNullify();
  // One minion cleared per point of damage dealt (any damaging die: Hits, Combos, bonuses).
  { const m0 = S.tray.filter(c=>c.minion).length;
    for(let k=0; k<(step.dmg||0); k++){ if(!S.tray.some(c=>c.minion)) break; clearOneMinion(); }
    const cl = m0 - S.tray.filter(c=>c.minion).length; if(cl>0) teleLog('minions_cleared', {n:cl, left:m0-cl}); }
  if(step.leapClearIdx!=null){
    clearMinionAt(step.leapClearIdx);
    logMsg('sys', 'Leaped clean over a Minion -- cleared it!', 'good');
  }
}

// Balance (v1.32.25): your own H.O.T. can't stack past this -- it used to snowball into near-permanent healing.
const PLAYER_HOT_CAP = 6;
function addPlayerHOT(n){ S.playerHOT = Math.min(PLAYER_HOT_CAP, (S.playerHOT||0) + n); }

// Nullify now clears EVERYTHING it can reach in one go (it used to clear just one of: Minions, your D.O.T., enemy H.O.T.).
// Minions never outlive the fight that spawned them.
function clearAllMinions(){
  if(!S.tray) return;
  S.tray.forEach(cell=>{ if(cell.minion){ cell.minion=false; cell.die=cell.coveredDie||cell.die; cell.coveredDie=null; cell.blank=true; } });
}
function applyNullify(){
  const e = S.encounter;
  const cleared = [];
  if(e.minionsSpawned>0){
    e.minionsSpawned = 0;
    graveTally(S.tray.filter(c=>c.minion).length);
    S.tray.forEach(cell=>{ if(cell.minion){ cell.minion=false; cell.die=cell.coveredDie; cell.coveredDie=null; cell.blank=true; } });
    cleared.push('minions');
  }
  if(S.playerDOT>0){ S.playerDOT = 0; cleared.push('your D.O.T.'); }
  if(e.curHOT>0){ e.curHOT = 0; cleared.push('encounter H.O.T.'); }
  if(cleared.length) logMsg('sys','Nullify: cleared '+cleared.join(', ')+'.', 'good');
  else logMsg('sys','Nullify: nothing to clear.', true);
}

function parseQuestSpec(q){
  const parts = q.split(':');
  let rewardText = parts.length>1?parts[0].trim():null;
  let cond = parts.length>1?parts.slice(1).join(':').trim():q.trim();
  return {rewardText, cond: cond.toLowerCase()};
}

function checkQuests(e, ctx){
  (e.quests||[]).forEach((q,i)=>{
    if(e.questsDone[i]) return;
    const {rewardText, cond} = parseQuestSpec(q);
    let done = false;
    let m;
    // v1.39.0 quest audit: every phrasing the quest card shows now has a check
    // ("20+ damage", "8 damage/turn", "survive turn 4", combos, hot, dot,
    // "accumulate N block", "2 nullify"). See docs/studies/2026-10-12_quest_audit.md.
    if((m=cond.match(/survive (?:to )?(?:turn )?(\d+)/))) done = ctx.turnNumber >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\+?\s*damage/))) done = ctx.totalDamageThisRound >= parseInt(m[1]);
    else if((m=cond.match(/any (\d+)(?:\s*or fewer)? actions/))) done = cond.includes('or fewer') ? (ctx.totalActions>0 && ctx.totalActions<=parseInt(m[1])) : ctx.totalActions>=parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*blanks/))) done = ctx.blankCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*maneuvers/))) done = ctx.maneuverCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*dodge/))) done = ctx.dodgeCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*leap/))) done = ctx.leapCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*pivot/))) done = ctx.pivotCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*heal/))) done = ctx.healCount >= parseInt(m[1]);
    else if((m=cond.match(/accumulate (\d+) block/))) done = (S.playerBlock||0) >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*block/))) done = ctx.blockCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*combos?/))) done = ctx.comboCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*hot\b/))) done = (ctx.hotCount||0) >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*dot\b/))) done = (ctx.dotCount||0) >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*boost/))) done = ctx.boostCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*support/))) done = ctx.supportCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*nullify/))) done = ctx.nullifyCount >= parseInt(m[1]);
    else if(cond.includes('nullify')) done = ctx.nullifyCount>=1;
    if(done){
      e.questsDone[i] = true;
      applyQuestReward(e, rewardText);
      logMsg('sys', `Quest complete: "${q}"`, 'good');
      if(typeof fxQuest==='function') fxQuest(e.name, i);
    }
  });
}

// The Geometry quests are passive mirror rules (Jeremy, Oct 12), not
// one-shot checks: Profane Geometry's "adventurer H.O.T. = D.O.T." -- every
// H.O.T. you gain also lands as that much D.O.T. on it; Sacred(?) Geometry's
// "encounter D.O.T. = H.O.T." -- every D.O.T. it takes also gives you that
// much H.O.T. The quest's reward number caps the total mirrored; the quest
// shows complete once the cap is reached.
function geometryMirror(e, kind, n){
  if(!e || !(n>0) || !e.quests) return;
  e.quests.forEach((q,i)=>{
    if(e.questsDone[i]) return;
    const {rewardText, cond} = parseQuestSpec(q);
    const isProfane = /adventurer h\.?o\.?t\.? = d\.?o\.?t/.test(cond), isSacred = /encounter d\.?o\.?t\.? = h\.?o\.?t/.test(cond);
    if(!(kind==='hot' && isProfane) && !(kind==='dot' && isSacred)) return;
    const capM = (rewardText||'').match(/(\d+)/); const cap = capM ? parseInt(capM[1]) : Infinity;
    e.questMirror = e.questMirror || {};
    const used = e.questMirror[i]||0, amt = Math.min(n, cap-used);
    if(amt<=0) return;
    e.questMirror[i] = used+amt;
    if(isProfane){ e.curDOT += amt; logMsg('sys', `${e.name}: your H.O.T. mirrors as ${amt} D.O.T. on it.`, 'good'); }
    else { addPlayerHOT(amt); logMsg('sys', `${e.name}: its D.O.T. mirrors as ${amt} H.O.T. for you.`, 'good'); }
    if(e.questMirror[i] >= cap){ e.questsDone[i] = true; logMsg('sys', `Quest complete: "${q}"`, 'good'); if(typeof fxQuest==='function') fxQuest(e.name, i); }
  });
}

function applyQuestReward(e, rewardText){
  if(!rewardText) return;
  const m = rewardText.match(/(\d+(\.\d+)?)/);
  const amt = m? parseFloat(m[1]) : 0;
  const low = rewardText.toLowerCase();
  if(low.includes('dot')) { e.curDOT += amt; geometryMirror(e, 'dot', amt); }
  else if(low.includes('hot')) { addPlayerHOT(amt); }
  else if(low.includes('nullify')) { applyNullify(); }
  else if(low.includes('freeze')) { S.freezeNext = true; logMsg('sys', `Quest reward: ${e.name} will skip its next action.`); }
  else if(amt>0){
    // questHealth is the total health this encounter can lose from quest
    // bonuses specifically, across the whole fight -- it caps the sum of
    // every quest's flat-damage reward, not any single quest's damage alone.
    const questCap = e.questHealth!=null ? e.questHealth : Infinity;
    const already = e.questDamageDealt||0;
    const applied = Math.max(0, Math.min(amt, questCap-already));
    if(applied>0){
      e.curHealth = capUpper(e.curHealth-absorbWithShield(e, applied), e.maxHealth);
      e.questDamageDealt = already+applied;
      logMsg('dmg', `Bonus ${applied} damage from quest!`);
    } else {
      logMsg('sys', `Quest completed, but ${e.name} has already lost its full Quest Health -- no further quest damage.`);
    }
  }
}

/* =========================================================================
   ROUND FLOW
   ========================================================================= */
function endTurnButton(){
  if(!S.encounter || S.transitioning) return;
  // Play data (Oct 13, literature review): was the lethal warning up at the start of this turn (empty path), and was it
  // still up for the path the player sent? Lets a death be read as warned-and-unavoidable, warned-and-missed, or unwarned.
  try{ const p = S.path; S.path = []; const a = playerLethalRisk(); S.path = p; const b = playerLethalRisk();
    S._lw = {start: a ? 1 : 0, go: b ? 1 : 0}; }catch(err){ S._lw = null; }
  S.trayAct = null; S.swapLog = []; // swaps lock in once the turn resolves
  startTurnTransition();
}

// ---- Turn transition: plays the path back one die at a time -- each die
// pulses on the tray with its own popped-off number as it lands -- instead
// of computing the whole path as one instant lump and describing it in a
// text card. Once the path is spent, the encounter answers back in its own
// few beats (DOT tick, its action, your upkeep), each with a toast instead
// of a modal, so every step of a turn is something you actually watch
// happen on the board rather than read about after the fact. Driven by the
// same advance()/S._pendingTimeout/S._skipAll pattern throughout so Skip
// (see skipTransition below) can fast-forward any point in the sequence. ----
function startTurnTransition(){
  // An empty path is a legal turn (e.g. the board is fully stuck and Go is
  // the only way to pass) -- computePathSteps/computePathEffects on []
  // just produce zero steps/all-zero effects, so this still flows straight
  // through to the encounter's own beat instead of silently doing nothing.
  S.transitioning = true;
  S._skipAll = false;
  S.resolveTotal = 0; // running damage tally shown while the path plays out
  if(typeof resetPathCounterFx==='function') resetPathCounterFx();
  S._hitStreak = 0; // climbing pitch for consecutive damage-dealing dice this turn -- see playStepTone()
  S.stats.turnsTaken++;
  S.stats.longestPath = Math.max(S.stats.longestPath||0, S.path.length);
  // Compact tray snapshot so rolls/paths can be replayed offline: one token per cell, "<die code><face>",
  // e.g. "A:h2" (Attack die, hit 2); "M" = covered by a Minion; "_" = blank. Die codes: A attack, M maneuver
  // (lowercase letters = the die's category initial), O origin, L alloy, G gilded, X magic.
  let trayTele = null;
  try{
    const dc = {attack:'A', maneuver:'V', origin:'O', alloy:'L', gilded:'G', magic:'X'};
    const fc = {hit:'h', combo:'c', heal:'+', block:'b', shield:'s', boost:'B', leap:'l', dodge:'d', pivot:'p', nullify:'n', freeze:'z', swap:'w', reroll:'r', dot:'t', hot:'o', leech:'e', fumble:'f', blank:'_'};
    trayTele = S.tray.map(c=>{ if(c.minion) return 'M'; const f = c.forcedFace || currentFace(c); return (dc[c.die.cat]||'?') + ':' + (fc[f.type]||f.type) + (f.value||''); }).join(' ');
  }catch(e){}
  teleLog('turn', {n:S.turnNumber, len:S.path.length, hp:S.health, enemy:S.encounter?S.encounter.name:null, enemyHp:S.encounter?Math.round(S.encounter.curHealth):null, tray:trayTele, path:S.path.slice(), block:S.playerBlock||0, lethalStart:S._lw?S._lw.start:null, lethalGo:S._lw?S._lw.go:null});
  S.pendingFreeBoost = 0; // a free Boost token is spent by end of turn whether or not it landed on anything
  const path = S.path.slice();
  S._resolvingPath = true;
  const steps = computePathSteps(path);
  const effects = computePathEffects(path); // aggregate counts, for the quest check once the path finishes
  S._resolvingPath = false;
  runPlayerPathSteps(steps, 0, path, effects);
}

// One beat per die in the path: apply that die's own contribution, flash it
// on the tray (pulse + floating number, and -- for a Combo -- the same
// neighbor ripple it always had, now timed to its own beat instead of
// firing for the whole path at once), then move on.
function runPlayerPathSteps(steps, i, path, effects){
  if(i>=steps.length){
    S.resolvingIdx = null; S.resolvingFx = null; S.lastComboRipple = null; S.lastMinionClearIdx = null;
    finishPlayerPath(path, effects);
    return;
  }
  const step = steps[i];
  applyPathStep(step);
  S.resolvingIdx = step.idx;
  S.resolvingFx = typeof describeStepFx==='function' ? describeStepFx(step) : null;
  S.lastComboRipple = step.type==='combo' ? buildComboRipple([step.idx]) : null;
  // One-shot flag so renderGame()/renderDie() can flash the specific cell a
  // Leap just cleared (a different tile than the one resolving above --
  // see step.leapClearIdx, computePathSteps()).
  S.lastMinionClearIdx = step.leapClearIdx!=null ? step.leapClearIdx : (step.revealIdx!=null ? step.revealIdx : null);
  // Each die that actually deals damage plays a little higher than the
  // last one this turn (first hit at base pitch, climbing from there),
  // so a multi-hit path builds like a rising combo instead of every hit
  // sounding identical.
  const pitchStep = S._hitStreak++; // v1.39.0: every step climbs the ladder, not just hits
  if(typeof playStepTone==='function') playStepTone(S.resolvingFx, pitchStep, step);
  render();
  if(step.dmg>0 && typeof lungeFigure==='function') lungeFigure('player', step.dmg);
  // Impact tier from the die's own damage; bigger hits also linger a beat
  // (a brief 'hit-stop' -- only this sequence's own timer, never the UI or
  // audio) so they land with weight. Skip fast-forwards past all of it.
  const hitTier = step.dmg>=8 ? 3 : step.dmg>=4 ? 2 : step.dmg>=2 ? 1 : 0;
  if(hitTier>0 && typeof impactPulse==='function') impactPulse(hitTier);
  const hitStop = (typeof PREFS!=='undefined' && (PREFS.reducedMotion||PREFS.lowIntensity)) ? 0 : [0,0,70,130][hitTier];
  const advance = () => { S._pendingTimeout=null; runPlayerPathSteps(steps, i+1, path, effects); };
  S._advance = advance;
  if(S._skipAll) advance();
  else S._pendingTimeout = setTimeout(advance, 320 + hitStop);
}

// Once every die in the path has landed: the path's own damage already
// took effect die-by-die (applyPathStep, above), so this is just the
// bookkeeping that only makes sense in aggregate -- the damage log line,
// quest checks (which can themselves land bonus damage), then either the
// encounter's own reply or, if it's dead, straight to victory.
function finishPlayerPath(path, effects){
  const e = S.encounter;
  if(effects.totalDamage>0) logMsg('dmg', `Path dealt ${effects.totalDamage.toFixed(1)} damage.`);
  checkQuests(e, {
    maneuverCount: effects.maneuverCount, totalActions: effects.totalActions, blankCount: effects.blankCount,
    turnNumber:S.turnNumber, totalDamageThisRound: effects.totalDamage, hitCount:effects.hitCount,
    comboCount:effects.comboCount, healCount:effects.healCount, blockCount:effects.blockCount,
    boostCount:effects.boostCount, dodgeCount:effects.dodgeCount, leapCount:effects.leapCount,
    pivotCount:effects.pivotCount, nullifyCount:effects.nullifyCount, supportCount:effects.supportCount,
    hotCount:effects.hotCount, dotCount:effects.dotCount
  });
  { const tt = Math.round(S.resolveTotal||0);
    if(tt > (S.stats.bestTurn||0)){ S.stats.bestTurn = tt; S.stats.bestTurnFoe = e.name; } }
  if(hasRelic('bloodletter')){ const n = Math.floor((S.resolveTotal||0)/6); if(n>0){ healPlayer(n); fireRelic('bloodletter','+'+n+' HP'); } }
  if(e.curHealth<=0){ S.transitioning=false; onEncounterDefeated(); return; }
  // Near-miss: the swing left the foe barely standing. Name the exact number
  // (it motivates "one more turn") and give it its own cue.
  if((S.resolveTotal||0) > 0 && e.curHealth > 0 && e.curHealth <= 3 && e.maxHealth >= 8){
    S.stats.nearMisses = (S.stats.nearMisses||0) + 1;
    teleLog('close_call', {enemy:e.name, left:Math.ceil(e.curHealth)});
    showToastIfAvailable(`Just ${Math.ceil(e.curHealth)} HP left!`, null);
    if(typeof playTone==='function') playTone('closeCall');
  }
  // Closing 'tally' beat for a strong turn (the kill case has its own, bigger
  // callouts in onEncounterDefeated): chord + shake scaled to the total.
  { const tot = S.resolveTotal||0, tier = tot>=25 ? 3 : tot>=15 ? 2 : tot>=8 ? 1 : 0;
    // A killing blow skips this beat entirely -- onEncounterDefeated() plays its own (bigger) sound, shake and burst.
    if(tier>0 && !(S.encounter && S.encounter.curHealth<=0)){
      if(typeof playTone==='function') playTone('tally', tier*2);
      if(tier>=2 && typeof screenShake==='function') screenShake(tier>=3 ? 'big' : 'small');
      if(tier>=3 && typeof spawnParticleBurstAtPortrait==='function') spawnParticleBurstAtPortrait(['#ff8a3d','#ffd76a','#fff5d6']);
    } }
  runEnemyBeat(0);
}

// The encounter's reply, as up to 3 short beats -- its D.O.T. tick, its own
// action, then your upkeep tick -- each landing as a toast + whatever
// portrait/health-bar flash that beat's own state change naturally
// triggers, instead of all three crammed into one text card.
function runEnemyBeat(i, noWind){
  const e = S.encounter;
  // The enemy's action (beat 1) gets a short wind-up so the hit lands at the END of the lunge,
  // not while the monster is still pulling back.
  if(i===1 && !noWind && !S._skipAll && typeof lungeFigure==='function' && !(typeof PREFS!=='undefined' && (PREFS.reducedMotion||PREFS.lowIntensity))){
    lungeFigure('enemyWind');
    const go = () => { if(S._pendingTimeout){ clearTimeout(S._pendingTimeout); S._pendingTimeout=null; } runEnemyBeat(1, true); };
    S._advance = go;
    S._pendingTimeout = setTimeout(go, 210);
    return;
  }
  const beats = [
    () => {
      if(!(e.curDOT>0)) return null;
      e.curHealth = capUpper(e.curHealth-e.curDOT, e.maxHealth);
      const t = `${e.name} takes ${e.curDOT} D.O.T. damage.`;
      logMsg('dmg', t, 'bad');
      S.stats.damageDealt += e.curDOT;
      // D.O.T./H.O.T. are a depleting stack, not a flat standing effect --
      // each tick burns off 1 stack after applying, so a 3-stack ticks for
      // 3, then 2, then 1, then nothing, rather than hitting for 3 forever
      // until something else clears it.
      if(typeof fxTick==='function') fxTick('enemy','dot',e.curDOT);
      e.curDOT = Math.max(0, e.curDOT-1);
      if(e.curHealth<=0) return {stop:'encounterDefeated'};
      return null;
    },
    () => {
      if(e.curHOT>0){
        if(typeof fxTick==='function') fxTick('enemy','hot',e.curHOT);
        e.curHealth = cap(e.curHealth+e.curHOT, e.maxHealth);
        e.curHOT = Math.max(0, e.curHOT-1);
      }
      if(typeof playTone==='function') playTone('enemyDrum');
      const t = runEncounterAction();
      if(t) showToastIfAvailable(t, 'bad');
      if(e.curHealth<=0) return {stop:'encounterDefeated'};
      if(S.health<=0) return {stop:'playerDefeated'};
      return null;
    },
    () => {
      const t = runPlayerUpkeep();
      if(t) showToastIfAvailable(t, S.health>=S.maxHealth?'good':null);
      if(S.health<=0) return {stop:'playerDefeated'};
      return null;
    },
  ];
  if(i>=beats.length){ endTurn(); return; }
  const hpBefore = S.health;
  S._downBeat = i; // which beat a death happened in (1 = the enemy's action, 2 = your D.O.T. upkeep), for play data
  const result = beats[i]() || {};
  render();
  if(i===1 && typeof lungeFigure==='function' && S.health < hpBefore) lungeFigure('enemyStrike');
  const advance = () => {
    S._pendingTimeout = null;
    if(result.stop==='encounterDefeated'){ S.transitioning=false; onEncounterDefeated(); return; }
    if(result.stop==='playerDefeated'){ S.transitioning=false; onPlayerDefeated(); return; }
    runEnemyBeat(i+1);
  };
  S._advance = advance;
  if(S._skipAll) advance();
  else S._pendingTimeout = setTimeout(advance, 550);
}

function showToastIfAvailable(text, kind){ if(typeof showToast==='function') showToast(text, kind); }

function endTurn(){
  S.transitioning = false;
  S.turnNumber++;
  S.path = [];
  S.classAbilityUsed = false;
  S.tray.forEach(c=>delete c.forcedFace);
  const pm = S._pendingMinions||0;
  scrambleTray();
  placePendingMinions(pm);
  render();
  // v1.39.0: a rising rumble when a wind-up / heavy turn is now telegraphed.
  if(S.encounter && typeof playTone==='function' && enemyNextTurnPreview(S.encounter).heavy) setTimeout(()=>playTone('windup'), 650);
}

// One tap resolves the ENTIRE remaining sequence, not just the current
// beat -- flips a flag that makes every subsequent step advance immediately
// instead of scheduling its usual delay.
function skipTransition(){
  S._skipAll = true;
  if(S._pendingTimeout){ clearTimeout(S._pendingTimeout); S._pendingTimeout=null; }
  if(S._advance) S._advance();
}

function runPlayerUpkeep(){
  const parts = [];
  if(S.playerDOT>0){
    S.health = cap(S.health-S.playerDOT, S.maxHealth);
    if(typeof playPlayerHitSound==='function') playPlayerHitSound();
    const t = `You take ${S.playerDOT} D.O.T. damage.`;
    logMsg('dmg', t); parts.push(t);
    // Depleting stack, same as the encounter's own D.O.T./H.O.T. (see
    // runEnemyBeat()) -- burns off 1 after each tick rather than hitting
    // for the same amount indefinitely.
    if(typeof fxTick==='function') fxTick('player','dot',S.playerDOT);
    S.playerDOT = Math.max(0, S.playerDOT-1);
  }
  if(S.playerHOT>0){
    healPlayer(S.playerHOT);
    const t = `You recover ${S.playerHOT} from H.O.T.`;
    logMsg('heal', t); parts.push(t);
    if(typeof fxTick==='function') fxTick('player','hot',S.playerHOT);
    if(typeof playTone==='function') playTone('bell');
    S.playerHOT = Math.max(0, S.playerHOT-1);
  }
  return parts.join(' ');
}

function dealEncounterDamage(e, amount){
  if(amount>0) amount += zealBonus(S._heavyHit);
  if(amount>0 && S._wardHalf){ amount = Math.ceil(amount/2); fireRelic('warding_bell','Half'); }
  if(amount>0 && hasRelic('gambeson')){ amount = Math.max(0, amount-1); fireRelic('gambeson','-1'); }
  const blocked = Math.min(S.playerBlock, amount);
  S.playerBlock -= blocked;
  const dealt = amount-blocked;
  const eo = relicById('spite_thorns'); // Equal and Opposite: reflect 'blocked' = the amount Blocked back (live since 1.39.5, Jeremy); 'full' = 2 back on a fully Blocked hit (old), 'any' = 2 back on any Blocked hit
  const eoBack = eo.reflect==='blocked' ? blocked : 2;
  if(amount>0 && blocked>0 && (eo.reflect==='full' ? dealt===0 : true) && hasRelic('spite_thorns') && e.curHealth>0){ e.curHealth = capUpper(e.curHealth-absorbWithShield(e, eoBack), e.maxHealth); fireRelic('spite_thorns',eoBack+' back'); }
  S.health = cap(S.health-dealt, S.maxHealth);
  if(blocked>0){ // Oct 12 (Jeremy): make prevented damage visible -- a Block floater on your HP bar + a run total
    S.stats.damageBlocked = (S.stats.damageBlocked||0) + blocked;
    if(typeof fxTick==='function') fxTick('player','block',blocked);
  }
  if(dealt>0 && typeof playPlayerHitSound==='function') playPlayerHitSound();
  else if(amount>0 && blocked>0 && typeof playTone==='function') playTone('clank'); // v1.39.0: a fully Blocked hit clanks
  // A big hit landing gets the same small screen-shake as an Overkill, on
  // top of the existing portrait shake/flash -- a meaningful chunk of your
  // own health bar deserves to register physically too, not just the
  // damage you deal out.
  if(dealt>=8 && typeof screenShake==='function') screenShake('small');
  if(amount>0) teleLog('hit_taken', {enemy:e.name, dealt, blocked, hp:S.health});
  const t = `${e.name} hits you for ${dealt}${blocked?` (${blocked} blocked)`:''}.`;
  logMsg('dmg', t);
  return t;
}

// Minions are QUEUED when the enemy acts and actually placed by endTurn()
// right after the new roll, so the player never sees what was rolled under them.
function spawnMinions(e, n){
  n = Math.round(n) + depthRank('swarm');
  const free = S.tray.filter(c=>!c.minion).length - (S._pendingMinions||0);
  const placed = Math.max(0, Math.min(Math.round(n), free));
  S._pendingMinions = (S._pendingMinions||0) + placed;
  if(placed>0){ const t = `${placed} Minion die${placed>1?'s':''} clog your tray!`; logMsg('sys', t); return t; }
  return null;
}
function placePendingMinions(n){
  const e = S.encounter; if(!e || !(n>0)) return;
  const free = S.tray.map((c,i)=>i).filter(i=>!S.tray[i].minion);
  let placed=0;
  pickN(free, Math.min(n, free.length)).forEach(i=>{
    const cell = S.tray[i];
    cell.coveredDie = cell.die; cell.minion = true; placed++;
  });
  e.minionsSpawned = (e.minionsSpawned||0)+placed;
  if(placed>0) teleLog('minions', {enemy:e.name, placed, onTray:S.tray.filter(c=>c.minion).length});
}

// Bosses cycle one action at a time through their action list (built in
// drawEncounter from whichever stats are non-zero) instead of applying every
// stat simultaneously every turn, per the manual's Boss Encounter Cards.
// ---- Enemy turns (v1.35.0) ----
// Sets up a boss's move kit or a regular enemy's tier. Also upgrades an
// encounter restored from a pre-1.35 save (no kit/tier yet) the first time
// it is shown or acts.
function initEnemyTurnState(e){
  if(!e || e.type==='Shrine') return;
  if(e.type==='Boss' || e.type==='Big Boss'){
    if(e.kit) return;
    e.kit = clone(BOSS_KITS[e.name] || {each:[{type:'dmg',value:e.dmg||1}], specials:[{name:'Strike', windup:true, acts:[{type:'dmg',value:(e.dmg||1)*2}]}]});
    e.phase = 1; e.specialIdx = 0;
    delete e.actionCycle; delete e.cycleIndex;
  } else if(e.tier===undefined){
    e.tier = encounterTier(e); e.turnsActed = e.turnsActed||0;
  }
}
// v1.39.0: enemy action sounds, staggered so several acts don't land at once.
function enemySound(kind){
  if(typeof playTone!=='function') return;
  const n = (S._enemySoundN = (S._enemySoundN||0)+1);
  setTimeout(()=>playTone(kind), 120 + (n-1)*110);
  clearTimeout(S._enemySoundReset); S._enemySoundReset = setTimeout(()=>{ S._enemySoundN = 0; }, 600);
}
// One enemy "act" (see BOSS_KITS, data.js). Returns the log/toast line.
function applyEnemyAct(e, act){
  const v = act.value||0;
  switch(act.type){
    case 'dmg': {
      if(!act.grow) return dealEncounterDamage(e, v);
      // Layer by Layer (Oct 13, Extruzeon): this attack grows by act.grow after every hit, through both phases.
      const t = dealEncounterDamage(e, v + (e.layers||0));
      e.layers = (e.layers||0) + act.grow;
      return `${t} ${e.name} adds a layer: its attack grows to ${v + e.layers}.`;
    }
    case 'minion': enemySound('squeak'); return spawnMinions(e, v) || `${e.name} tries to summon minions, but your Tray has no room.`;
    case 'shield': enemySound('clank'); e.curShield += v; return `${e.name} gains ${v} shield.`;
    case 'heal': enemySound('enemyBell'); e.curHealth = cap(e.curHealth+v, e.maxHealth); return `${e.name} heals ${v}.`;
    case 'hot': enemySound('enemyBell'); e.curHOT += v; return `${e.name} channels ${v} H.O.T.`;
    case 'dot': enemySound('pluck'); S.playerDOT += v; return `You gain ${v} D.O.T.`;
    case 'dmgPerMinion': {
      const n = S.tray.filter(c=>c.minion).length;
      return n>0 ? dealEncounterDamage(e, v*n) : `${e.name} finds no Minions on your Tray.`;
    }
    case 'dropShield': e.curShield = 0; return `${e.name} drops its Shield.`;
  }
  return '';
}

function bossKitNow(e){ return (e.phase===2 && e.kit.phase2) ? e.kit.phase2 : e.kit; }
function bossNextSpecial(e){ const k = bossKitNow(e); return k.specials[(e.specialIdx||0) % k.specials.length]; }

// A boss turn: its base attack (kit.each) always lands; the telegraphed
// special lands too unless Freeze cancelled it. A boss with a phase 2 enters
// it after the first turn that ends at or below half HP, so the special the
// player saw coming is always the one that happens.
function bossTakeTurn(e, frozen){
  const kit = bossKitNow(e);
  const parts = kit.each.map(a=>applyEnemyAct(e, a));
  const sp = bossNextSpecial(e);
  e.specialIdx = (e.specialIdx||0) + 1;
  if(frozen){ parts.push(`${e.name} is frozen: ${sp.name} is cancelled.`); logMsg('sys', `${e.name} is frozen: ${sp.name} is cancelled.`); }
  else {
    parts.push(`${sp.name}!`);
    S._wardHalf = !!(sp.windup && hasRelic('warding_bell') && !e._wardUsed); if(S._wardHalf) e._wardUsed = true;
    S._heavyHit = true;
    sp.acts.forEach(a=>{ const t = applyEnemyAct(e, a); if(t) parts.push(t); });
    S._wardHalf = false; S._heavyHit = false;
  }
  teleLog('boss_move', {name:sp.name, frozen:!!frozen, phase:e.phase||1});
  if(kit===e.kit && e.kit.phase2 && e.curHealth>0 && e.curHealth <= e.maxHealth/2){
    e.phase = 2; e.specialIdx = 0;
    const t = `${e.name} enters ${e.kit.phase2.name}!`;
    logMsg('sys', t); parts.push(t);
    if(typeof screenShake==='function') screenShake('small');
    if(typeof playTone==='function') playTone('closeCall');
    teleLog('boss_phase', {name:e.name, phase:2});
  }
  { const t = bossHerald(e); if(t) parts.push(t); }
  return parts.join(' ');
}
// v1.37.0: a special with a "herald" brings its Minions along with its
// warning (they land right after the roll the player sees the telegraph on),
// so the player has exactly one turn to clear them before e.g. Stampede.
function bossHerald(e){
  const sp = bossNextSpecial(e); if(!sp || !sp.herald) return null;
  return applyEnemyAct(e, sp.herald);
}

// Elite/deadly enemies telegraph a heavy turn every HEAVY_EVERY[tier] turns.
function enemyHeavyNext(e){ const n = HEAVY_EVERY[e.tier]; return !!n && ((e.turnsActed||0)+1) % n === 0; }
// What a heavy turn doubles: the attack, or (no attack) the biggest of Minions/D.O.T./Shield.
function enemyHeavyStat(e){
  if(e.dmg>0) return 'dmg';
  let best = null;
  ['minion','dot','shield'].forEach(k=>{ if(e[k]>0 && (!best || e[k]>e[best])) best = k; });
  return best;
}

function runEncounterAction(){
  const e = S.encounter;
  initEnemyTurnState(e);
  const frozen = !!S.freezeNext;
  S.freezeNext = false;
  if(e.kit) return bossTakeTurn(e, frozen);
  const heavy = enemyHeavyNext(e);
  e.turnsActed = (e.turnsActed||0) + 1;
  if(frozen && !heavy){
    const text = `${e.name} is frozen and skips its action.`;
    logMsg('sys', text);
    return text;
  }
  const hs = (heavy && !frozen) ? enemyHeavyStat(e) : null;
  S._wardHalf = !!(hs && hasRelic('warding_bell') && !e._wardUsed); if(S._wardHalf) e._wardUsed = true;
  const x = k => (k===hs ? 2 : 1);
  const parts = [];
  if(heavy) parts.push(frozen ? `${e.name} is frozen: its heavy turn is cancelled.` : 'Heavy turn!');
  S._heavyHit = !!hs;
  if(e.dmg>0) parts.push(dealEncounterDamage(e, e.dmg*x('dmg')));
  S._heavyHit = false;
  if(e.shield>0){ enemySound('clank'); e.curShield += e.shield*x('shield'); parts.push(`${e.name} gains ${e.shield*x('shield')} shield.`); }
  if(e.heal>0){ enemySound('enemyBell'); e.curHealth = cap(e.curHealth+e.heal, e.maxHealth); parts.push(`${e.name} heals ${e.heal}.`); }
  if(e.hot>0){ enemySound('enemyBell'); e.curHOT += e.hot; parts.push(`${e.name} channels ${e.hot} H.O.T.`); }
  if(e.dot>0){ enemySound('pluck'); S.playerDOT += e.dot*x('dot'); parts.push(`You gain ${e.dot*x('dot')} D.O.T.`); }
  if(e.minion>0){
    enemySound('squeak');
    const t = spawnMinions(e, e.minion*x('minion'));
    if(t) parts.push(t);
  }
  S._wardHalf = false;
  if(heavy) teleLog('heavy_turn', {name:e.name, frozen});
  return parts.length ? parts.join(' ') : `${e.name} takes no action.`;
}

// Zeal (depth modifier): rank 1 = every enemy hit +1, rank 2 = heavy turns and boss specials +1 more.
// Used by the damage itself and by the next-turn preview/chips, so the warning shows the real number.
function zealBonus(heavy){ const r = depthRank('fury'); return r ? 1 + ((r>=2 && heavy) ? 1 : 0) : 0; }
// Preview of the enemy's coming turn, for the face-off chips and the bot:
// {heavy, special, dmg} where dmg is the total direct damage it will deal
// (before your Block), counting Minions currently on your tray.
function enemyNextTurnPreview(e){
  if(!e) return {dmg:0};
  initEnemyTurnState(e);
  const mins = S.tray ? S.tray.filter(c=>c.minion).length : 0;
  const hitOf = (v, hv) => v>0 ? v + zealBonus(hv) : 0;
  const dmgOf = (acts, hv) => acts.reduce((a,x)=>a + (x.type==='dmg' ? hitOf(x.value + (x.grow ? (e.layers||0) : 0), hv) : x.type==='dmgPerMinion' ? hitOf(x.value*mins, hv) : 0), 0);
  if(e.kit){
    const sp = bossNextSpecial(e), kit = bossKitNow(e);
    return {special:sp, heavy:!!sp.windup, dmg: dmgOf(kit.each, false) + (S.freezeNext ? 0 : dmgOf(sp.acts, true))};
  }
  const heavy = enemyHeavyNext(e) && !S.freezeNext;
  if(S.freezeNext && !enemyHeavyNext(e)) return {heavy:false, dmg:0};
  return {heavy, heavyStat: heavy ? enemyHeavyStat(e) : null, dmg: hitOf((e.dmg||0) * (heavy && enemyHeavyStat(e)==='dmg' ? 2 : 1), heavy)};
}

// Lethal warning (Oct 13, Jeremy): would the enemy's coming turn, then your own D.O.T. tick, finish you? Follows the
// real beat order (your path, the enemy's D.O.T. tick, its action against your Block, then your D.O.T. and H.O.T.)
// and counts the path you're building (its Block, a kill, Freeze, Nullify). Returns null or the numbers for the tip.
function playerLethalRisk(){
  const e = S && S.encounter;
  if(!e || e.type==='Shrine' || !(e.curHealth>0) || S.screen!=='game') return null;
  let block = S.playerBlock||0, dot = S.playerDOT||0, hot = S.playerHOT||0, frozen = !!S.freezeNext, ef = null;
  if(S.path && S.path.length){ try{ ef = computePathEffects(S.path); }catch(err){ ef = null; } }
  if(ef){
    if(ef.totalDamage >= e.curHealth + (e.curShield||0)) return null; // this path kills it first
    block += ef.blockGain||0; dot += ef.selfDot||0; hot += ef.hotToPlayer||0;
    if(ef.nullifyCount) dot = 0;
    if(ef.freeze) frozen = true;
  }
  const hpAfterPath = S.health + (ef ? (ef.healGain||0) : 0);
  if((e.curDOT||0) > 0 && e.curDOT >= e.curHealth - (ef ? ef.totalDamage : 0)) return null; // its own D.O.T. tick kills it
  const was = S.freezeNext; S.freezeNext = frozen;
  let pv; try{ pv = enemyNextTurnPreview(e); } finally { S.freezeNext = was; }
  const hit = Math.max(0, (pv.dmg||0) - (hasRelic('gambeson') && pv.dmg>0 ? 1 : 0));
  const taken = Math.max(0, hit - block);
  if(hpAfterPath - taken <= 0) return {hit, block, dot:0, hot:0, hp:hpAfterPath};
  if(hpAfterPath - taken - dot + hot <= 0) return {hit, block, dot, hot, hp:hpAfterPath};
  return null;
}

function upgradeOneBasicDie(cat){
  // Look in the tray first, then the Back Pocket, for a level-1 basic die of
  // the given category to upgrade to level 2. Returns true if one was found.
  for(let i=0;i<S.tray.length;i++){
    const cell = S.tray[i];
    if(cell.die.cat===cat && cell.die.level===1){
      cell.die = clone(basic(cat,2));
      cell.faceIdx = 0;
      return {idx:i}; // truthy; the shrine flips this die on the tray (v1.36.0)
    }
  }
  for(let i=0;i<S.backPocket.length;i++){
    const d = S.backPocket[i];
    if(d.cat===cat && d.level===1){
      S.backPocket[i] = clone(basic(cat,2));
      return true;
    }
  }
  return false;
}

function lootPoolByName(name){
  return name==='Alloy' ? ALLOY : (name==='Gilded' ? GILDED : MAGIC);
}

// Applies a Shrine's *structured* effect (e.effect), not its prose. Each
// shrine's effect is authored explicitly in its data entry above -- no text
// guessing at runtime. Every branch either shows a result message (waiting
// for the player to click Continue) or opens a follow-up choice/trade
// screen -- none of them advance the route on their own anymore, since
// Shrines have no combat turn to hang that on.
function runShrineEffect(e, effect){
  // 'choice' just presents the menu (the real grant happens recursively
  // when an option is picked, via chooseShrineOption -> option.action() ->
  // this same function with that option's effect) -- so the blessing cue
  // plays for every other, actually-granting effect type only.
  if(effect.type!=='choice' && effect.type!=='bargain' && effect.type!=='leave'){
    if(typeof playTone==='function') playTone('blessing');
    if(typeof spawnParticleBurstAtEl==='function') spawnParticleBurstAtEl('.panel', ['#8fd0ff','#ffd76a','#fff5d6']);
  }
  switch(effect.type){
    case 'maxHealthUp': {
      S.maxHealth += effect.amount;
      S.health = cap(S.health+effect.amount, S.maxHealth);
      const t = `Max health +${effect.amount}.`;
      S.shrineFx = {kind:'hp', text:`+${effect.amount} Max HP`};
      logMsg('sys', `${e.name}: ${t}`);
      S.shrineResult = { title: e.name, text: t };
      render(); return;
    }
    case 'heal': {
      S.health = cap(S.health+effect.amount, S.maxHealth);
      const t = `Healed ${effect.amount}.`;
      S.shrineFx = {kind:'heal', text:`+${effect.amount}`};
      logMsg('heal', `${e.name}: ${t}`);
      S.shrineResult = { title: e.name, text: t };
      render(); return;
    }
    case 'dieUpgrade': {
      const ok = upgradeOneBasicDie(effect.cat);
      const label = effect.cat.charAt(0).toUpperCase()+effect.cat.slice(1);
      const t = ok ? `Upgraded a level 1 ${label} Die to level 2.` : `No level 1 ${label} Die left to upgrade.`;
      if(ok && ok.idx!=null) S.shrineFx = {kind:'die', idx:ok.idx};
      logMsg('sys', `${e.name}: ${t}`);
      S.shrineResult = { title: e.name, text: t };
      render(); return;
    }
    case 'relicChoice': {
      const pool = RELICS.filter(r=>!r.origin && !hasRelic(r.id) && relicUnlocked(r)); // gated tiers stay out until unlocked
      const want = (effect.count||3) + (hasRelic('shrine_bell') ? 1 : 0);
      if(hasRelic('shrine_bell') && pool.length) fireRelic('shrine_bell','+1 choice');
      if(!pool.length){
        S.health = cap(S.health+10, S.maxHealth);
        const t = 'You already hold every relic -- the altar heals 10 instead.';
        logMsg('heal', `${e.name}: ${t}`);
        S.shrineResult = { title: e.name, text: t };
        render(); return;
      }
      // Themed shrines draw from their theme first, topped up from the general pool.
      const themed = effect.theme ? pool.filter(r=>(r.tags||[]).includes(effect.theme) || (effect.theme==='loot' && (r.tags||[]).includes('tempo'))) : pool;
      let picks = pickN(themed, Math.min(want, themed.length));
      if(picks.length < want) picks = picks.concat(pickN(pool.filter(r=>!picks.includes(r)), Math.min(want-picks.length, pool.length-picks.length)));
      S.relicChoice = { name:e.name, options: picks.map(r=>r.id) };
      S.relicChoice.options.forEach(markRelicFound);
      render(); return;
    }
    case 'tradeLoot': {
      S.lootChoice = { options: pickLootNUnused(lootPoolByName(effect.pool), 3 + (hasRelic('shrine_bell') ? 1 : 0)), lootName: effect.pool, overkill:false, fromShrine:true };
      if(typeof markDiceDiscovered==='function') S.lootChoice.fresh = peekFreshDice(S.lootChoice.options);
      render(); return;
    }
    case 'randomDieReplace': {
      // Setting S.pendingLootDie is what draws the swap picker now (a
      // pop-up over whichever screen -- here, the Shrine card -- is
      // already showing, see renderSwapModal()/render() in render.js), not
      // a dedicated S.screen value, so the Shrine screen stays visible
      // underneath it.
      S.pendingLootDie = pickLootUnused(lootPoolByName(effect.pool));
      logMsg('sys', `${e.name}: choose a die to replace with a random ${effect.pool} die (${S.pendingLootDie.name}).`);
      render(); return;
    }
    case 'grantToken': {
      if(effect.token==='nullify') S.nullifyTokens += effect.charges;
      else if(effect.token==='freeze') S.freezeTokens += effect.charges;
      else if(effect.token==='swap') S.swapTokens = (S.swapTokens||0) + effect.charges;
      else if(effect.token==='reroll') S.rerollTokens = (S.rerollTokens||0) + effect.charges;
      else if(effect.token==='boost'){ S.boostTokenValue = effect.value; S.boostTokenCharges += effect.charges; }
      const t = `Gained ${effect.charges} use(s) of a ${effect.token==='boost'?'x'+effect.value+' Boost':effect.token} token.`;
      S.shrineFx = {kind:'token', text:`+${effect.charges} ${effect.token==='boost'?'x'+effect.value+' Boost':effect.token.charAt(0).toUpperCase()+effect.token.slice(1)}`};
      logMsg('sys', `${e.name}: ${t}`);
      S.shrineResult = { title: e.name, text: t };
      render(); return;
    }
    case 'bargain': {
      const p = effect.price||{};
      if(p.maxHp){ S.maxHealth = Math.max(1, S.maxHealth-p.maxHp); S.health = Math.min(S.health, S.maxHealth); logMsg('sys', `${e.name}: paid ${p.maxHp} maximum health.`); }
      if(p.skipRest){ S.skipNextRest = true; logMsg('sys', `${e.name}: your next campfire is forfeit.`); }
      teleLog('shrine_bargain', {shrine:e.name, price:p});
      runShrineEffect(e, effect.then); return;
    }
    case 'leave': {
      S.shrineResult = { title: e.name, text: 'You leave the offering untouched.' };
      render(); return;
    }
    case 'choice': {
      S.shrineChoice = {
        name: e.name,
        options: effect.options.map(opt=>({ label: opt.label, action: ()=>runShrineEffect(e, opt.effect) }))
      };
      render(); return;
    }
    default: {
      const t = `Shrine effect type "${effect.type}" isn't implemented yet.`;
      logMsg('sys', t);
      S.shrineResult = { title: e.name, text: t };
      render(); return;
    }
  }
}

function continueFromShrine(){
  S.shrineResult = null;
  finishStep();
  render();
}

function applyShrineBoon(e){
  if(depthRank('dues') && e.effect){ const was = S.health; S.health = Math.max(1, S.health-2); if(S.health<was) logMsg('dmg', `Union Dues: the shrine takes ${was-S.health} HP.`, 'bad'); }
  if(!e.effect){
    const t = `${e.name} has no coded effect yet (boon: "${e.boon}") -- log-only for now.`;
    logMsg('sys', t);
    S.shrineResult = { title: e.name, text: t };
    render();
    return;
  }
  runShrineEffect(e, e.effect);
}

function chooseRelic(id){
  const e = S.encounter, name = (S.relicChoice && S.relicChoice.name) || (e&&e.name) || 'Relic';
  teleLog('relic_pick', {shrine:name, picked:id, offered:(S.relicChoice&&S.relicChoice.options)||null});
  S.relicChoice = null;
  grantRelic(id, {silent:true, via:'shrine'});
  const r = relicById(id);
  S.shrineFx = {kind:'relic', id};
  S.shrineResult = { title: name, text: `Gained relic: ${r.name}. ${r.desc}` };
  render();
}

function chooseShrineOption(option){
  teleLog('shrine_choice', {shrine:(S.shrineChoice&&S.shrineChoice.name)||null, picked:option.label, offered:S.shrineChoice?S.shrineChoice.options.map(o=>o.label):null});
  S.shrineChoice = null;
  option.action();
}

function onEncounterDefeated(){
  const e = S.encounter;
  clearAllMinions();
  logMsg('sys', `${e.name} defeated!`);
  S.stats.encountersDefeated++;
  bestiaryNote(e.name, 'won');
  // loot: draw dice from the floor pool, pick 1. Overkill (10+ damage beyond
  // what was needed) adds one extra option to choose from, per the manual's
  // "+1 to the Encounter Loot Reward value."
  const floor = FLOORS[S.floorIdx];
  const overkill = e.curHealth < (hasRelic('hungry_blade') ? -5 : -9);
  if(overkill && hasRelic('hungry_blade') && e.curHealth >= -9) fireRelic('hungry_blade','Overkill!'); // curHealth is allowed to go negative (see capUpper) so this is measurable
  if(overkill) S.stats.overkills++;
  // Overkill near-miss: a kill that fell 1-3 short of the Overkill line gets
  // told exactly how close it was, on the loot screen.
  const okThr = hasRelic('hungry_blade') ? 5 : 9;
  const overBy = Math.max(0, -e.curHealth);
  if(overBy > (S.stats.bestOverBy||0)){ S.stats.bestOverBy = Math.round(overBy); S.stats.bestOverFoe = e.name; }
  const okMiss = (!overkill && e.curHealth <= 0) ? Math.floor(okThr - overBy) + 1 : 0;
  const nearMiss = (okMiss>=1 && okMiss<=3) ? okMiss : 0;
  if(nearMiss) S.stats.nearMisses = (S.stats.nearMisses||0) + 1;
  const isBoss = e.type==='Boss' || e.type==='Big Boss';
  let drawCount = isBoss ? 3 : 2;
  if(overkill && !depthRank('slim')) drawCount += 1;
  if(depthRank('slim')) drawCount = Math.max(1, drawCount - depthRank('slim')); // Burden of Choice
  if(hasRelic('lucky_coin')){ drawCount += 1; fireRelic('lucky_coin','+1 option'); }
  if(hasRelic('iron_rations')){ S.health = cap(S.health+2, S.maxHealth); logMsg('heal', relicById('iron_rations').name+': healed 2.', 'good'); fireRelic('iron_rations','+2 HP'); }
  const options = pickLootNUnused(floor.lootPool, Math.min(drawCount, floor.lootPool.length));
  S.lootChoice = { options, lootName: floor.lootName, overkill, nearMiss };
  teleLog('room_win', {name:e.name, type:e.type, turns:S.turnNumber+1, ms:(S._roomStartedAt!=null)?Math.max(0,teleActiveMs()-S._roomStartedAt):null, overkill, overBy:Math.max(0,Math.round(-e.curHealth)), nearMiss, offered:options.length, hp:S.health});
  teleLog('loot_offer', {tier:(options[0]&&options[0].cat)||null, overkill, offered:options.map(o=>o.name)});
  if(typeof markDiceDiscovered==='function') S.lootChoice.fresh = peekFreshDice(options);
  // A Boss/Big Boss kill or an Overkill each get a distinct sound + a big
  // callout banner, so the moment registers as it happens instead of only
  // as a status chip on the loot screen that follows.
  if(typeof hitStop==='function') hitStop(isBoss ? 180 : 120);
  if(isBoss){
    if(typeof playTone==='function') playTone('bossKill');
    if(typeof vibrate==='function') vibrate([50,40,90]);
    const lines = [{text:`${e.name} Defeated`, cls:'boss'}];
    if(overkill) lines.push({text:'Overkill!', cls:'overkill sub'});
    if(typeof showKillCallout==='function') showKillCallout(lines);
    if(typeof screenShake==='function') screenShake('big');
    if(typeof spawnParticleBurstAtPortrait==='function') spawnParticleBurstAtPortrait(['#ffd76a','#ff8a3d','#fff5d6','#d4af64']);
  } else if(overkill){
    if(typeof playTone==='function') playTone('overkill');
    if(typeof vibrate==='function') vibrate([30,30,50]);
    if(typeof showKillCallout==='function') showKillCallout([{text:'Overkill!', cls:'overkill'}]);
    if(typeof screenShake==='function') screenShake('small');
    if(typeof spawnParticleBurstAtPortrait==='function') spawnParticleBurstAtPortrait(['#ff8a3d','#ffd76a']);
  } else {
    // A plain, non-Boss, non-Overkill win previously played no sound at
    // all -- every other kill/combat moment has one, so this closes the
    // gap with a light, satisfying chime of its own (quieter/shorter than
    // Boss/Overkill, which stay the bigger moments).
    if(typeof spawnParticleBurstAtPortrait==='function') spawnParticleBurstAtPortrait(['#ffd76a','#fff5d6']);
  }
  // Victory chime (Jeremy, Oct 13; replaces the old 'encounterKill' ding): in key and on the next bar line of the music.
  { const t = encounterTier(e); if(typeof musicChime==='function') musicChime(isBoss ? 'boss' : (t==='elite'||t==='deadly') ? 'elite' : 'regular'); }
  // Let the enemy visibly die (flash, shake, fade) before the chest takes over the
  // screen -- the beat between the killing blow and the reward is the anticipation.
  // State (S.lootChoice etc.) is already set, so this only delays the redraw.
  const deathCard = (typeof document!=='undefined') ? document.querySelector('#enc-panel .enc-card-col') : null;
  if(deathCard && !(typeof PREFS!=='undefined' && PREFS.reducedMotion) && S.screen==='game'){
    const bossDeath = (e.type==='Boss' || e.type==='Big Boss');
    deathCard.classList.add('enc-death'); if(bossDeath) deathCard.classList.add('enc-death-boss');
    setTimeout(()=>{ if(S && S.lootChoice) render(); }, bossDeath ? 1000 : 700);
  } else {
    render();
  }
}

// Debug-only: instantly clears the current encounter without playing it
// out, for quickly testing later floors/rooms/loot without grinding
// through fights. Only ever wired to a button when S.klass.debug (see
// renderGame() in render.js). Deliberately doesn't set curHealth low
// enough to count as an Overkill -- this is a skip, not a combat result.
function debugWinEncounter(){
  if(!S.klass.debug || !S.encounter || S.transitioning) return;
  S.encounter.curHealth = 0;
  logMsg('sys', `[Debug] ${S.encounter.name} auto-defeated.`);
  onEncounterDefeated();
}

function chooseLoot(dieOption){
  // Setting S.pendingLootDie is what draws the swap picker (a pop-up over
  // the current screen, see renderSwapModal()/render() in render.js) --
  // there's no dedicated S.screen value for it, so whatever screen was
  // showing (normally 'game') just stays put underneath.
  teleLog('loot_pick', {picked:dieOption.name, tier:dieOption.cat||null, offered:S.lootChoice?S.lootChoice.options.map(o=>o.name):null, shrine:!!(S.lootChoice&&S.lootChoice.fromShrine)});
  S.pendingLootDie = dieOption;
  S.lootChoice = null;
  render();
}

function swapInLootDie(trayIndex){
  const cell = S.tray[trayIndex];
  teleLog('loot_equip', {equipped:S.pendingLootDie.name, replaced:cell.die.name});
  S.backPocket.push(cell.die);
  cell.die = { name: S.pendingLootDie.name, faces: S.pendingLootDie.faces, cat: S.pendingLootDie.cat || 'loot' };
  cell.faceIdx = 0;
  // Single chokepoint for every way a Loot die actually gets equipped
  // (a floor drop, a Shrine trade, or a Shrine's random-replace all set
  // S.pendingLootDie and funnel through here) -- recording it here, rather
  // than at each call site, is what lets pickLootUnused()/pickLootNUnused()
  // keep a future draw from handing the player a second copy.
  S.usedLootNames.add(cell.die.name);
  recordDieAcquired(cell.die);
  S.pendingLootDie = null;
  logMsg('sys', `Equipped ${cell.die.name}.`, 'good');
  S.stats.lootCollected++;
  if(typeof playTone==='function') playTone('equip');
  if(typeof spawnParticleBurstAtEl==='function') spawnParticleBurstAtEl('.panel', ['#ffd76a','#8fd0ff','#fff5d6']);
  finishStep();
  render();
}

// "Keep in Pocket" (tester idea, Jeremy approved Oct 14): take the loot die without replacing a tray die;
// it goes straight to the Back Pocket. Same as equipping and swapping it back at camp, minus the trip.
function pocketLootDie(){
  if(!S.pendingLootDie) return;
  const d = { name: S.pendingLootDie.name, faces: S.pendingLootDie.faces, cat: S.pendingLootDie.cat || 'loot' };
  teleLog('loot_equip', {equipped:d.name, replaced:null, pocket:true});
  S.backPocket.push(d);
  S.usedLootNames.add(d.name);
  recordDieAcquired(d);
  S.pendingLootDie = null;
  logMsg('sys', `Kept ${d.name} in your Back Pocket.`, 'good');
  S.stats.lootCollected++;
  if(typeof playTone==='function') playTone('equip');
  finishStep();
  render();
}

// Revive rule switch (Oct 14 test, off until Jeremy decides). spend: 'one' = today (each roll spends one die; a
// blank rolls again), 'all' = a save spends the whole Pocket, 'half' = a save spends half the Pocket (rounded up).
// hp: Health after a save, a number or 'half' (half your max).
let REVIVE_RULE = {spend:'all', hp:5}; // Jeremy, Oct 14: a save spends the whole Back Pocket ("brings the win rate in line with other roguelikes")
function onPlayerDefeated(){
  teleLog('player_down', {enemy:S.encounter?S.encounter.name:null, enemyHp:S.encounter?Math.round(S.encounter.curHealth):null, backPocket:S.backPocket.length,
    cause: S._downBeat===2 ? 'dot' : 'hit', lethalStart: S._lw?S._lw.start:null, lethalGo: S._lw?S._lw.go:null, maxHp:S.maxHealth});
  const reviveHp = ()=> REVIVE_RULE.hp==='half' ? Math.max(5, Math.ceil(S.maxHealth/2)) : (REVIVE_RULE.hp||5);
  if(S.backPocket.length>0 && REVIVE_RULE.spend!=='one'){
    // Test rule (Oct 14, Jeremy's idea): Pocket dice are rolled in random order; the first non-blank face saves you;
    // then the whole Pocket ('all') or half of it, rounded up, at least the dice rolled ('half') is spent.
    const n = S.backPocket.length;
    const order = S.backPocket.map((d,i)=>i).sort(()=>Math.random()-0.5);
    let rolled = 0, saved = false;
    for(const i of order){ rolled++; const d = S.backPocket[i]; if(d.faces[rand(d.faces.length)].type!=='blank'){ saved = true; break; } }
    const spendN = !saved ? n : REVIVE_RULE.spend==='all' ? n : Math.max(rolled, Math.ceil(n/2));
    const gone = new Set(order.slice(0, spendN));
    S.backPocket = S.backPocket.filter((d,i)=>!gone.has(i));
    teleLog('pocket_revive', {saved, spent:spendN, left:S.backPocket.length});
    if(saved){
      S.health = Math.min(S.maxHealth, reviveHp());
      logMsg('heal', `Your Back Pocket saves you! (+${S.health} health) ${spendN} spare ${spendN===1?'die is':'dice are'} spent.`, 'good');
      render();
    } else {
      logMsg('sys', `Every die in your Back Pocket came up blank.`, 'bad');
      onPlayerDefeated();
    }
  } else if(S.backPocket.length>0){
    const idx = rand(S.backPocket.length);
    const d = S.backPocket.splice(idx,1)[0];
    const f = d.faces[rand(6)];
    if(f.type!=='blank'){
      S.health = Math.min(S.maxHealth, reviveHp());
      logMsg('heal', `Desperate roll from the Back Pocket saves you! (+${S.health} health)`, 'good');
      render();
    } else {
      logMsg('sys', `A die from the Back Pocket comes up blank and is lost.`, 'bad');
      onPlayerDefeated();
    }
  } else {
    if(S.encounter && S.encounter.type!=='Shrine'){ bestiaryNote(S.encounter.name, 'lost'); S.stats.killedBy = S.encounter.name; }
    S.carryoverOptions = highestTierTrayGroups();
    S.carryoverChosenName = null;
    S.screen='gameover';
    render();
  }
}

/* =========================================================================
   CAMP
   ========================================================================= */
const ROMAN = {1:'I', 2:'II', 3:'III'};

function upgradeAvailability(cat, level){
  const trayCount = S.tray.filter(c=>c.die.cat===cat && c.die.level===level).length;
  const bpCount = S.backPocket.filter(d=>d.cat===cat && d.level===level).length;
  return trayCount + bpCount;
}

// True only if there are 3 matching dice AND enough OTHER spare Back Pocket
// dice to backfill every Tray slot the upgrade would empty (every consumed
// Tray slot beyond the first, which the new upgraded die itself fills).
function canUpgrade(cat, level){
  const bpMatches = S.backPocket.filter(d=>d.cat===cat && d.level===level).length;
  const trayMatches = S.tray.filter(c=>c.die.cat===cat && c.die.level===level).length;
  if(bpMatches + trayMatches < 3) return false;
  const bpUsedInRecipe = Math.min(bpMatches, 3);
  const trayUsed = 3 - bpUsedInRecipe;
  const fillersNeeded = Math.max(0, trayUsed - 1);
  const availableFillers = S.backPocket.length - bpUsedInRecipe;
  return availableFillers >= fillersNeeded;
}

// Combines 3 matching Basic dice (Back Pocket first, then Tray) into 1 die
// of the next level up, per the manual's "1 Attack Die and 1 Maneuver Die"
// per-Camp upgrade limit (tracked in S.campUpgrades). Refuses outright if
// there aren't enough spare Back Pocket dice to fully backfill the Tray
// slots it would empty, rather than padding the gap with fresh dice.
function campUpgrade(cat, level){
  if(S.campUpgrades[cat]) return;
  if(!isBaseCamp() && (S.campFireOut || S.campChoice==='rest')) return; // the fire went to Rest (or is out)
  if(!canUpgrade(cat, level)){
    logMsg('sys', `Not enough spare dice to fully back that upgrade — nothing changed.`, 'bad');
    render();
    return;
  }

  const bpMatches = [];
  S.backPocket.forEach((d,i)=>{ if(d.cat===cat && d.level===level) bpMatches.push(i); });
  const trayMatches = [];
  S.tray.forEach((c,i)=>{ if(c.die.cat===cat && c.die.level===level) trayMatches.push(i); });

  let need = 3;
  const consumedBP = [];
  for(const i of bpMatches){ if(need<=0) break; consumedBP.push(i); need--; }
  const consumedTray = [];
  for(const i of trayMatches){ if(need<=0) break; consumedTray.push(i); need--; }

  consumedBP.sort((a,b)=>b-a).forEach(i=> S.backPocket.splice(i,1));

  const newDie = clone(basic(cat, level+1));
  if(consumedTray.length===0){
    S.backPocket.push(newDie);
  } else {
    S.tray[consumedTray[0]].die = newDie;
    S.tray[consumedTray[0]].faceIdx = 0;
    for(let k=1;k<consumedTray.length;k++){
      const slot = consumedTray[k];
      S.tray[slot].die = S.backPocket.pop(); // canUpgrade() already guaranteed enough spares exist
      S.tray[slot].faceIdx = 0;
    }
  }
  S.campUpgrades[cat] = true;
  campFireUsedBy('train');
  S.organizeSelection = null; // the Bag/Tray just changed shape; any held selection is now stale
  S._fuseFx = { name:newDie.name, type: consumedTray.length ? 'tray' : 'bp', idx: consumedTray.length ? consumedTray[0] : S.backPocket.length-1 };
  const label = cat.charAt(0).toUpperCase()+cat.slice(1);
  logMsg('sys', `Upgraded 3 ${label} Die ${ROMAN[level]} into one ${newDie.name}.`, 'good');
  render();
}

// Organize Dice: click one die in the Tray and one in the Back Pocket (in
// either order) to swap them. Clicking two of the same list just changes
// which one is selected.
function selectOrganize(type, idx){
  // A selection can outlive the list it pointed into (e.g. an upgrade
  // consumed Bag dice after one was selected, so its index now runs past
  // the end). Drop stale selections and ignore taps on nothing, rather
  // than swapping a die with `undefined` and corrupting the Tray/Bag.
  const listFor = t => t==='tray' ? S.tray : S.backPocket;
  if(S.organizeSelection && !listFor(S.organizeSelection.type)[S.organizeSelection.idx]) S.organizeSelection = null;
  if(!listFor(type)[idx]){ render(); return; }
  if(!S.organizeSelection){ S.organizeSelection = {type, idx}; render(); return; }
  const sel = S.organizeSelection;
  if(sel.type===type){
    // Tapping the already-selected die (any copy in its stack) backs out of organizing.
    const dieOf = i => { const it = listFor(type)[i]; return it && (type==='tray' ? it.die : it); };
    const a = dieOf(idx), c = dieOf(sel.idx);
    const same = idx===sel.idx || !!(a && c && a.name===c.name);
    S.organizeSelection = same ? null : {type, idx}; render(); return;
  }
  const trayIndex = type==='tray' ? idx : sel.idx;
  const bpIdx = type==='bp' ? idx : sel.idx;
  const trayCell = S.tray[trayIndex];
  const bpDie = S.backPocket[bpIdx];
  if(!trayCell || !trayCell.die || !bpDie){ S.organizeSelection = null; render(); return; }
  // Swapping two identical dice changes nothing -- say so and keep the selection instead of looking like it cancelled.
  if(trayCell.die.name===bpDie.name){ if(typeof showToast==='function') showToast('Those two dice are identical -- pick a different one.', null); render(); return; }
  S.backPocket[bpIdx] = trayCell.die;
  trayCell.die = bpDie;
  trayCell.faceIdx = 0;
  logMsg('sys', `Swapped ${bpDie.name} into your Tray for ${S.backPocket[bpIdx].name}.`, true);
  S.organizeSelection = null;
  render();
}


function isBaseCamp(){ return S.floorIdx===0 && S.routeStep===0; }
// Campfire choice (Oct 14, Jeremy: camp had the least agency; "the upgrading should be the fusing"): each Camp
// after Base Camp offers ONE of Rest (heal) or Train (combine 3 matching Basic dice into 1 of the next level, up to
// one Attack and one Maneuver as before). The first combine uses the fire, so no Rest after it, and no combining
// after a Rest. Organize stays free. Base Camp has no fire: combining there is free.
function campFireUsedBy(kind){ // marks the fire used; returns false if the other choice already took it
  if(isBaseCamp()) return true;
  if(S.campFireOut) return false;
  if(S.campChoice && S.campChoice!==kind) return false;
  if(!S.campChoice) teleLog('camp_choice', {choice:kind, hp:S.health, maxHp:S.maxHealth});
  S.campChoice = kind; S.campRested = true;
  return true;
}
// Expected Rest heal (shown on the Rest button so the choice is informed): half the non-blank faces, on average.
function restHealEstimate(){
  let nb = 0; S.tray.forEach(c=>{ const f = c.die.faces; nb += f.filter(x=>x.type!=='blank').length / f.length; });
  let heal = Math.ceil(nb/2) + (hasRelic('kettle') ? 3 : 0);
  if(depthRank('rest')) heal = depthRank('rest')>=2 ? 0 : Math.round(heal/2);
  return Math.min(heal, S.maxHealth - S.health);
}
function campRest(){
  if(S.campRested || isBaseCamp() || S.campFireOut) return;
  if(typeof UIFX!=='undefined') UIFX.flareAt = performance.now();
  scrambleTray();
  let count=0;
  S.tray.forEach(c=>{ if(currentFace(c).type!=='blank') count++; });
  let heal = Math.ceil(count/2) + (hasRelic('kettle') ? 3 : 0);
  if(depthRank('rest')) heal = depthRank('rest')>=2 ? 0 : Math.round(heal/2); // Rationing Rations: half, then nothing
  if(hasRelic('kettle')) fireRelic('kettle','+3 HP');
  const hpFrom = S.health;
  S.health = cap(S.health+heal, S.maxHealth);
  if(typeof UIFX!=='undefined' && S.health>hpFrom) UIFX.campHeal = {from:hpFrom, to:S.health, at:performance.now(), dur:900+Math.min(heal,10)*120};
  campFireUsedBy('rest'); S.campHealed = S.health - hpFrom;
  logMsg('heal', `Rested: scrambled ${count} actions, healed ${heal}.`, 'good');
  if(heal>0 && typeof playTone==='function') playTone('restChord');
  render();
}
function campLeave(){
  finishStep();
  render();
}

