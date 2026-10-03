
/* =========================================================================
   STATE
   ========================================================================= */
let S = null;

const SAVE_KEY = 'dungeonScrambleSave_v1';

// Builds a plain, JSON-safe snapshot of S. klass/origin are stored as ids
// (they carry a live zone() function that can't survive JSON) and rebuilt
// on load; usedCards (a Set) is stored as an array.
function serializeState(){
  const { klass, origin, _advance, _pendingTimeout, ...rest } = S;
  return { ...rest, classId: klass.id, originId: origin.id, usedCards: [...S.usedCards] };
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
  try{
    const list = getRunHistory();
    list.unshift({
      date: Date.now(),
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
};
function loadMeta(){
  try{
    const raw = localStorage.getItem(META_KEY);
    if(!raw) return { lifetime: {...DEFAULT_LIFETIME}, achievements: {} };
    const parsed = JSON.parse(raw) || {};
    return {
      lifetime: {...DEFAULT_LIFETIME, ...(parsed.lifetime||{})},
      achievements: parsed.achievements || {},
    };
  } catch(e){ return { lifetime: {...DEFAULT_LIFETIME}, achievements: {} }; }
}
let META = loadMeta();
function saveMeta(){
  try{ localStorage.setItem(META_KEY, JSON.stringify(META)); } catch(e){ /* best-effort, same as prefs/history */ }
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
  if(outcome==='victory'){
    L.victoriesByOrigin[S.origin.id] = (L.victoriesByOrigin[S.origin.id]||0)+1;
    L.victoriesByClass[S.klass.id] = (L.victoriesByClass[S.klass.id]||0)+1;
  }
  saveMeta();
  return checkAchievements();
}

// ---- Player prefs (sound / reduced-motion) -- small, separate from the
// save file since they're device/player settings, not run state, and
// should survive across runs (including after a run ends and the save is
// cleared). ----
const PREFS_KEY = 'dungeonScramblePrefs_v1';
const DEFAULT_PREFS = { sound: true, reducedMotion: false };
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
    delete data.classId; delete data.originId;
    S = data;
    return true;
  }catch(e){ return false; }
}

// Autosave fires from render() itself, but only at safe checkpoints -- never
// mid-transition or mid-modal, since a Shrine choice's callback can't
// survive being written to JSON (see serializeState).
function maybeAutosave(){
  if(!S || S.transitioning || S.lootChoice || S.shrineChoice) return;
  if(S.screen!=='game' && S.screen!=='camp' && S.screen!=='swap' && S.screen!=='shrine') return;
  saveGame();
}

function rand(n){ return Math.floor(Math.random()*n); }
function pick(arr){ return arr[rand(arr.length)]; }
function pickN(arr,n){ const pool=arr.slice(); const out=[]; while(out.length<n && pool.length){ out.push(pool.splice(rand(pool.length),1)[0]); } return out; }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function cap(v,max){ return Math.max(0, Math.min(v,max)); }
function capUpper(v,max){ return Math.min(v,max); } // no floor -- lets encounter health go negative so Overkill can be measured

// Picks a race-correct portrait for a given Origin. Dwarf and Gnome have
// real art recovered from the character sheet; Halfling and Pixie don't yet,
// so they fall back to a random Gnome portrait flagged as a placeholder.
function pickPortrait(originId){
  if(originId==='dwarf') return { img: DWARF_PORTRAITS[rand(DWARF_PORTRAITS.length)], placeholder:false };
  if(originId==='gnome') return { img: GNOME_PORTRAITS[rand(GNOME_PORTRAITS.length)], placeholder:false };
  return { img: GNOME_SILHOUETTE, placeholder:true };
}

// The character-select screen shows a portrait per Origin card before a
// game exists, and re-renders on every click (choosing a class, etc).
// Without caching, each re-render would call pickPortrait() again and
// swap in a different random portrait than what newGame() then actually
// uses -- so the preview cache below is drawn once per Origin per page
// load, and newGame() reuses that same cached pick for S.portrait.
const setupPortraitCache = {};
function getSetupPreviewPortrait(originId){
  if(!setupPortraitCache[originId]) setupPortraitCache[originId] = pickPortrait(originId);
  return setupPortraitCache[originId];
}

function newGame(originId, classId){
  const origin = ORIGINS.find(o=>o.id===originId);
  const klass = CLASSES.find(c=>c.id===classId);
  const originDie = {name: origin.die, faces: origin.faces};

  let shuffled;
  let carryDie = null; // set below (non-debug only) if a die carried over from a previous run's defeat
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
    // shuffle into 4x4
    shuffled = pickN(dice, dice.length);
  }

  S = {
    screen:'game',
    origin, klass,
    portrait: getSetupPreviewPortrait(origin.id),
    maxHealth:20, health:20,
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
    boostTokenCharges:0,
    boostTokenValue:0,
    pendingFreeBoost:0,
    shrineChoice:null,
    usedCards: new Set(),
    _lastPlayerHealth: 20, // for the heal/damage flash effect on the health bar
    stats: { turnsTaken:0, damageDealt:0, encountersDefeated:0, shrinesVisited:0, overkills:0, lootCollected:0 },
    campRested: false,
    shrineResult: null,
    segmentShrineUsed: false,
    segmentTrapUsed: false,
  };
  logMsg('sys', `A ${origin.name} ${klass.name} descends into the dungeon...`);
  if(carryDie) logMsg('sys', `${carryDie.name} joins your tray, carried over from your last run.`, 'good');
  scrambleTray();
  advanceRoute(); // triggers first encounter
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

function drawEncounter(kind){
  const floor = FLOORS[S.floorIdx];
  let e;
  if(kind==='boss'){
    e = clone(pickUnused(S.floorIdx===2 ? BIG_BOSSES : floor.bosses));
  } else {
    // Category odds match this floor's actual card counts (as if all its
    // Enemy/Trap/Shrine cards were shuffled into one deck), capped at one
    // Shrine and one Trap per segment (the stretch of rooms between two
    // Camps, or between a Camp and the Boss) -- once a segment has drawn
    // one, further rooms in that same segment only draw Enemies (or the
    // other still-available type).
    // The very first encounter of the whole run (Floor 1, right out of the
    // starting Camp) is always a plain Enemy -- a Shrine or Trap as the
    // player's first-ever room is a bad first impression (an anticlimax, or
    // a punish before they've seen a single real fight), so Trap/Shrine are
    // excluded here regardless of the segment's usual one-each allowance.
    const isVeryFirstEncounter = S.floorIdx===0 && S.routeStep===1;
    const candidates = [{pool:floor.enemies}];
    if(!isVeryFirstEncounter){
      if(!S.segmentTrapUsed) candidates.push({pool:floor.traps});
      if(!S.segmentShrineUsed) candidates.push({pool:floor.shrines});
    }
    const totalCards = candidates.reduce((sum,c)=>sum+c.pool.length, 0);
    let roll = rand(totalCards);
    let categoryPool = candidates[0].pool;
    for(const c of candidates){
      if(roll < c.pool.length){ categoryPool = c.pool; break; }
      roll -= c.pool.length;
    }
    // if this category is used up, fall back to this segment's other still-
    // allowed pools before ever allowing an outright repeat
    let avail = categoryPool.filter(c=>!S.usedCards.has(c.name));
    if(avail.length===0){
      const segmentAllowed = candidates.reduce((arr,c)=>arr.concat(c.pool), []);
      avail = segmentAllowed.filter(c=>!S.usedCards.has(c.name));
      if(avail.length===0) avail = segmentAllowed; // segment's allowed pool exhausted -- last resort
    }
    e = clone(pick(avail));
    if(e.type==='Trap') S.segmentTrapUsed = true;
    if(e.type==='Shrine') S.segmentShrineUsed = true;
  }
  S.usedCards.add(e.name);
  e.curHealth = e.health;
  e.curDOT = 0; e.curHOT = 0; e.curShield = 0; e.turn = 0;
  e.questsDone = (e.quests||[]).map(()=>false);
  e.questDamageDealt = 0;
  e.minionsSpawned = 0;
  e._lastHealth = e.curHealth; // baseline for the heal/damage flash effect
  if(e.type==='Boss' || e.type==='Big Boss'){
    // Bosses cycle one action at a time through whichever of their stats are
    // non-zero, rather than applying all of them simultaneously every turn.
    e.actionCycle = ['dmg','minion','shield','hot','heal','dot']
      .filter(stat => e[stat]>0)
      .map(stat => ({type:stat, value:e[stat]}));
    e.cycleIndex = 0;
  }
  return e;
}

function advanceRoute(){
  S.path = []; S.classAbilityUsed=false; S.turnNumber=0;
  // A class-ability conversion (forcedFace) is only ever meant to last the
  // one turn it was used on -- normally cleared by endTurn() -- but when an
  // encounter dies mid-turn (the kill happens during the path-resolution
  // beats, before the turn ever reaches endTurn()), that cleanup is skipped
  // entirely and the converted die's forced face would otherwise ride along
  // into the next room, or even the next fight if that next step is a Camp.
  // Clearing it here, on every room transition, closes that gap regardless
  // of which path led here.
  S.tray.forEach(c=>delete c.forcedFace);
  if(S.routeStep >= S.route.length){
    // move to next floor
    if(S.floorIdx < FLOORS.length-1){
      S.floorIdx++;
      S.routeStep = 0;
      S.route = buildRoute();
      logMsg('sys', `— Floor ${S.floorIdx+1} —`, true);
      if(typeof playTone==='function') playTone('floorUp');
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
    S.campRested = false;
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
      S.stats.shrinesVisited++;
      applyShrineBoon(drawn);
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
    logMsg('sys', `A door creaks open: ${drawn.name} (${drawn.type})`);
    // One-shot "new room" flourish -- read by renderGame()/renderEncounterCard()
    // on the very next render (a card entrance animation + a banner callout +
    // a distinct tone), then cleared, so it plays exactly once per room.
    S.newRoomFx = {name: drawn.name, type: drawn.type, boss:false};
  } else if(step==='boss'){
    S.encounter = drawEncounter('boss');
    scrambleTray();
    S.screen='game';
    logMsg('sys', `⚠ Boss Encounter: ${S.encounter.name}`);
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
  if(cell.minion) return {type:'blank'};
  return cell.die.faces[cell.faceIdx];
}

function scrambleTray(){
  S.tray.forEach(cell=>{ cell.faceIdx = rand(6); });
  S.path = [];
  S.classAbilityUsed = false;
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

function canSelect(idx){
  if(S.path.includes(idx)) return false;
  const f = getFaceForIdx(idx);
  if(f.type==='blank') return false;
  if(S.path.length===0) return true;
  const lastIdx = S.path[S.path.length-1];
  const lastFace = getFaceForIdx(lastIdx);
  const a = trayRC(lastIdx), b = trayRC(idx);

  let allowed = false;
  if(lastFace.type==='dodge') allowed = adjDiag(a,b);
  else if(lastFace.type==='leap') allowed = adjLeap(a,b);
  else if(lastFace.type==='pivot') allowed = adjPivot(a,b);
  else allowed = adjNormal(a,b);

  // class zone bonuses
  if(!allowed && S.klass.wrap && inZone(lastIdx) && inZone(idx)){
    allowed = adjWrap(a,b) || adjNormal(a,b);
  }
  if(!allowed && S.klass.diagonalZone && inZone(lastIdx) && inZone(idx)){
    allowed = adjDiag(a,b);
  }
  return allowed;
}

function anyMoveAvailable(){
  for(let i=0;i<16;i++){ if(canSelect(i)) return true; }
  return false;
}

function toggleSelect(idx){
  if(S.path.length && S.path[S.path.length-1]===idx){
    // clicking the most-recently-chosen die again steps back one move
    S.path.pop();
    render();
    return;
  }
  if(S.path.includes(idx)) return; // only the last move can be undone this way
  if(!canSelect(idx)) return;
  S.path.push(idx);
  render();
}

function useClassAbility(idx){
  if(S.classAbilityUsed) return;
  if(!inZone(idx)) return;
  const cell = S.tray[idx];
  cell.forcedFace = clone(S.klass.convertTo);
  S.classAbilityUsed = true;
  S.justConvertedIdx = idx; // one-shot: a conversion flourish on this tile for the very next render only, see renderDie()/renderGame()
  logMsg('sys', `${S.klass.name} ability used: converted a die in the zone to ${LABEL[S.klass.convertTo.type]} ${S.klass.convertTo.value}.`);
  render();
}

/* =========================================================================
   MATHING (resolve a path)
   ========================================================================= */
function attackNeighborIndices(idx){
  const {r,c} = trayRC(idx);
  const out = [];
  [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([rr,cc])=>{
    if(inBounds(rr,cc)){
      const j = trayIdx(rr,cc);
      const f = getFaceForIdx(j);
      if(f.type==='hit'||f.type==='combo') out.push(j);
    }
  });
  return out;
}
function attackNeighborsCount(idx){ return attackNeighborIndices(idx).length; }

// Builds the tile-by-tile "ripple" order for the Combo-chain visual: each
// Combo die in the path, immediately followed by the neighboring Hit/Combo
// tiles that scaled its damage (the same set attackNeighborsCount() counts)
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
    attackNeighborIndices(idx).forEach(nIdx=>{ ripple.push({idx:nIdx, order}); });
    order++;
  });
  return ripple.length ? ripple : null;
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
      dodgeCount=0, leapCount=0, pivotCount=0, maneuverCount=0, supportCount=0;

  path.forEach(idx=>{
    const f = getFaceForIdx(idx);
    const val = f.value||0;
    switch(f.type){
      case 'hit': hitCount++; totalDamage += val*boostMult; break;
      case 'combo': { comboCount++; const nAdj=attackNeighborsCount(idx); totalDamage += val*(1+nAdj)*boostMult; break; }
      case 'dot': dotToEncounter += val*boostMult; break;
      case 'leech': dotToEncounter += val*boostMult; hotToPlayer += val*boostMult; break;
      case 'heal': supportCount++; healCount++; healGain += val*boostMult; break;
      case 'hot': supportCount++; hotToPlayer += val*boostMult; break;
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

  const blankCount = S.tray.filter((c,i)=>!path.includes(i) && getFaceForIdx(i).type==='blank').length;

  return { totalDamage, dotToEncounter, hotToPlayer, blockGain, healGain, selfDot, freeze, nullifyCount,
    hitCount, comboCount, healCount, blockCount, boostCount, dodgeCount, leapCount, pivotCount,
    maneuverCount, supportCount, totalActions: path.length, blankCount };
}

// Mirrors computePathEffects()'s own loop (same math, same Boost-carry
// rule) but keeps each die's individual contribution instead of only the
// running totals -- so a path can be played back one die at a time
// (see runPlayerPathSteps() below) instead of landing as one instant
// lump sum. Pure -- no side effects, same as computePathEffects().
function computePathSteps(path){
  let boostMult = S.pendingFreeBoost>0 ? S.pendingFreeBoost : 1;
  return path.map(idx=>{
    const f = getFaceForIdx(idx);
    const val = f.value||0;
    const step = {idx, type:f.type, dmg:0, dotToEncounter:0, hotToPlayer:0, blockGain:0, healGain:0, selfDot:0, freeze:false, nullify:false, boostMultApplied:0};
    switch(f.type){
      case 'hit': step.dmg = val*boostMult; break;
      case 'combo': step.dmg = val*(1+attackNeighborsCount(idx))*boostMult; break;
      case 'dot': step.dotToEncounter = val*boostMult; break;
      case 'leech': step.dotToEncounter = val*boostMult; step.hotToPlayer = val*boostMult; break;
      case 'heal': step.healGain = val*boostMult; break;
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
}

// Un-minions the first minion-covered tray cell found (tray order), same
// selection order the old all-at-once clearing used. Called once per Hit
// die as it resolves (see applyPathStep()) rather than all at once, so a
// path with 2 Hits still clears exactly 2 minions, just spread across the
// moment each Hit actually lands instead of after the fact.
function clearOneMinion(){
  const cell = S.tray.find(c=>c.minion);
  if(cell){ cell.minion=false; cell.die=cell.coveredDie; cell.coveredDie=null; }
}

// Applies exactly one die's contribution (see computePathSteps()) to live
// game state. Called once per die as runPlayerPathSteps() plays the path
// back, so the encounter's/player's health bars drain and fill one die at
// a time instead of jumping straight to the final total.
function applyPathStep(step){
  const e = S.encounter;
  if(step.dmg>0){
    e.curHealth = capUpper(e.curHealth-step.dmg, e.maxHealth);
    S.stats.damageDealt += step.dmg;
  }
  if(step.dotToEncounter) e.curDOT += step.dotToEncounter;
  if(step.hotToPlayer) S.playerHOT += step.hotToPlayer;
  if(step.blockGain) S.playerBlock += step.blockGain;
  if(step.healGain) S.health = cap(S.health+step.healGain, S.maxHealth);
  if(step.selfDot) S.playerDOT += step.selfDot;
  if(step.freeze) S.freezeNext = true;
  if(step.nullify) applyNullify();
  if(step.type==='hit') clearOneMinion();
}

function applyNullify(){
  const e = S.encounter;
  if(e.minionsSpawned>0){
    e.minionsSpawned = 0;
    S.tray.forEach(cell=>{ if(cell.minion){ cell.minion=false; cell.die=cell.coveredDie; cell.coveredDie=null; } });
    logMsg('sys','Nullify: minions cleared.', 'good');
  } else if(S.playerDOT>0){
    S.playerDOT = 0;
    logMsg('sys','Nullify: your D.O.T. cleared.', 'good');
  } else if(e.curHOT>0){
    e.curHOT = 0;
    logMsg('sys','Nullify: encounter H.O.T. cleared.', 'good');
  } else {
    logMsg('sys','Nullify: nothing to clear.', true);
  }
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
    if((m=cond.match(/survive (?:to turn |)(\d+)/))) done = ctx.turnNumber >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\+?\s*damage in a single (round|turn)/))) done = ctx.totalDamageThisRound >= parseInt(m[1]);
    else if((m=cond.match(/any (\d+)(?:\s*or fewer)? actions/))) done = cond.includes('or fewer') ? (ctx.totalActions>0 && ctx.totalActions<=parseInt(m[1])) : ctx.totalActions>=parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*blanks/))) done = ctx.blankCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*maneuvers/))) done = ctx.maneuverCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*dodge/))) done = ctx.dodgeCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*leap/))) done = ctx.leapCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*pivot/))) done = ctx.pivotCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*heal/))) done = ctx.healCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*block/))) done = ctx.blockCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*boost/))) done = ctx.boostCount >= parseInt(m[1]);
    else if((m=cond.match(/(\d+)\s*support/))) done = ctx.supportCount >= parseInt(m[1]);
    else if(cond.includes('nullify')) done = ctx.nullifyCount>=1;
    if(done){
      e.questsDone[i] = true;
      applyQuestReward(e, rewardText);
      logMsg('sys', `Quest complete: "${q}"`, 'good');
    }
  });
}

function applyQuestReward(e, rewardText){
  if(!rewardText) return;
  const m = rewardText.match(/(\d+(\.\d+)?)/);
  const amt = m? parseFloat(m[1]) : 0;
  const low = rewardText.toLowerCase();
  if(low.includes('dot')) { e.curDOT += amt; }
  else if(low.includes('hot')) { S.playerHOT += amt; }
  else if(low.includes('nullify')) { applyNullify(); }
  else if(amt>0){
    // questHealth is the total health this encounter can lose from quest
    // bonuses specifically, across the whole fight -- it caps the sum of
    // every quest's flat-damage reward, not any single quest's damage alone.
    const questCap = e.questHealth!=null ? e.questHealth : Infinity;
    const already = e.questDamageDealt||0;
    const applied = Math.max(0, Math.min(amt, questCap-already));
    if(applied>0){
      e.curHealth = capUpper(e.curHealth-applied, e.maxHealth);
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
  S._hitStreak = 0; // climbing pitch for consecutive damage-dealing dice this turn -- see playStepTone()
  S.stats.turnsTaken++;
  S.pendingFreeBoost = 0; // a free Boost token is spent by end of turn whether or not it landed on anything
  const path = S.path.slice();
  const steps = computePathSteps(path);
  const effects = computePathEffects(path); // aggregate counts, for the quest check once the path finishes
  runPlayerPathSteps(steps, 0, path, effects);
}

// One beat per die in the path: apply that die's own contribution, flash it
// on the tray (pulse + floating number, and -- for a Combo -- the same
// neighbor ripple it always had, now timed to its own beat instead of
// firing for the whole path at once), then move on.
function runPlayerPathSteps(steps, i, path, effects){
  if(i>=steps.length){
    S.resolvingIdx = null; S.resolvingFx = null; S.lastComboRipple = null;
    finishPlayerPath(path, effects);
    return;
  }
  const step = steps[i];
  applyPathStep(step);
  S.resolvingIdx = step.idx;
  S.resolvingFx = typeof describeStepFx==='function' ? describeStepFx(step) : null;
  S.lastComboRipple = step.type==='combo' ? buildComboRipple([step.idx]) : null;
  // Each die that actually deals damage plays a little higher than the
  // last one this turn (first hit at base pitch, climbing from there),
  // so a multi-hit path builds like a rising combo instead of every hit
  // sounding identical.
  const pitchStep = step.dmg>0 ? S._hitStreak++ : 0;
  if(typeof playStepTone==='function') playStepTone(S.resolvingFx, pitchStep);
  render();
  const advance = () => { S._pendingTimeout=null; runPlayerPathSteps(steps, i+1, path, effects); };
  S._advance = advance;
  if(S._skipAll) advance();
  else S._pendingTimeout = setTimeout(advance, 180);
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
    pivotCount:effects.pivotCount, nullifyCount:effects.nullifyCount, supportCount:effects.supportCount
  });
  if(e.curHealth<=0){ S.transitioning=false; onEncounterDefeated(); return; }
  runEnemyBeat(0);
}

// The encounter's reply, as up to 3 short beats -- its D.O.T. tick, its own
// action, then your upkeep tick -- each landing as a toast + whatever
// portrait/health-bar flash that beat's own state change naturally
// triggers, instead of all three crammed into one text card.
function runEnemyBeat(i){
  const e = S.encounter;
  const beats = [
    () => {
      if(!(e.curDOT>0)) return null;
      e.curHealth = capUpper(e.curHealth-e.curDOT, e.maxHealth);
      const t = `${e.name} takes ${e.curDOT} D.O.T. damage.`;
      logMsg('dmg', t, 'bad');
      S.stats.damageDealt += e.curDOT;
      if(e.curHealth<=0) return {stop:'encounterDefeated'};
      return null;
    },
    () => {
      if(e.curHOT>0) e.curHealth = cap(e.curHealth+e.curHOT, e.maxHealth);
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
  const result = beats[i]() || {};
  render();
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
  scrambleTray();
  render();
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
  }
  if(S.playerHOT>0){
    S.health = cap(S.health+S.playerHOT, S.maxHealth);
    const t = `You recover ${S.playerHOT} from H.O.T.`;
    logMsg('heal', t); parts.push(t);
  }
  return parts.join(' ');
}

function dealEncounterDamage(e, amount){
  const blocked = Math.min(S.playerBlock, amount);
  S.playerBlock -= blocked;
  const dealt = amount-blocked;
  S.health = cap(S.health-dealt, S.maxHealth);
  if(dealt>0 && typeof playPlayerHitSound==='function') playPlayerHitSound();
  // A big hit landing gets the same small screen-shake as an Overkill, on
  // top of the existing portrait shake/flash -- a meaningful chunk of your
  // own health bar deserves to register physically too, not just the
  // damage you deal out.
  if(dealt>=8 && typeof screenShake==='function') screenShake('small');
  const t = `${e.name} hits you for ${dealt}${blocked?` (${blocked} blocked)`:''}.`;
  logMsg('dmg', t);
  return t;
}

function spawnMinions(e, n){
  let placed=0;
  const free = S.tray.map((c,i)=>i).filter(i=>!S.tray[i].minion);
  pickN(free, Math.min(Math.round(n), free.length)).forEach(i=>{
    const cell = S.tray[i];
    cell.coveredDie = cell.die; cell.minion = true;
    placed++;
  });
  e.minionsSpawned = (e.minionsSpawned||0)+placed;
  if(placed>0){ const t = `${placed} Minion die${placed>1?'s':''} clog your tray!`; logMsg('sys', t); return t; }
  return null;
}

// Bosses cycle one action at a time through their action list (built in
// drawEncounter from whichever stats are non-zero) instead of applying every
// stat simultaneously every turn, per the manual's Boss Encounter Cards.
function applyBossCycleAction(e){
  const action = e.actionCycle[e.cycleIndex % e.actionCycle.length];
  e.cycleIndex++;
  switch(action.type){
    case 'dmg': return dealEncounterDamage(e, action.value);
    case 'minion': return spawnMinions(e, action.value) || `${e.name} tries to summon minions, but your Tray has no room.`;
    case 'shield': e.curShield += action.value; return `${e.name} gains ${action.value} shield.`;
    case 'heal': e.curHealth = cap(e.curHealth+action.value, e.maxHealth); return `${e.name} heals ${action.value}.`;
    case 'hot': e.curHOT += action.value; return `${e.name} channels ${action.value} H.O.T.`;
    case 'dot': S.playerDOT += action.value; return `You gain ${action.value} D.O.T.`;
  }
  return `${e.name} takes no action.`;
}

function runEncounterAction(){
  const e = S.encounter;
  if(S.freezeNext){
    S.freezeNext = false;
    const text = `${e.name} is frozen and skips its action.`;
    logMsg('sys', text);
    return text;
  }
  if((e.type==='Boss'||e.type==='Big Boss') && e.actionCycle && e.actionCycle.length){
    return applyBossCycleAction(e);
  }
  const parts = [];
  if(e.dmg>0) parts.push(dealEncounterDamage(e, e.dmg));
  if(e.shield>0){ e.curShield += e.shield; parts.push(`${e.name} gains ${e.shield} shield.`); }
  if(e.heal>0){ e.curHealth = cap(e.curHealth+e.heal, e.maxHealth); parts.push(`${e.name} heals ${e.heal}.`); }
  if(e.hot>0){ e.curHOT += e.hot; parts.push(`${e.name} channels ${e.hot} H.O.T.`); }
  if(e.dot>0){ S.playerDOT += e.dot; parts.push(`You gain ${e.dot} D.O.T.`); }
  if(e.minion>0){
    const t = spawnMinions(e, e.minion);
    if(t) parts.push(t);
  }
  return parts.length ? parts.join(' ') : `${e.name} takes no action.`;
}

function upgradeOneBasicDie(cat){
  // Look in the tray first, then the Back Pocket, for a level-1 basic die of
  // the given category to upgrade to level 2. Returns true if one was found.
  for(const cell of S.tray){
    if(cell.die.cat===cat && cell.die.level===1){
      cell.die = clone(basic(cat,2));
      cell.faceIdx = 0;
      return true;
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
  if(effect.type!=='choice'){
    if(typeof playTone==='function') playTone('blessing');
    if(typeof spawnParticleBurstAtEl==='function') spawnParticleBurstAtEl('.panel', ['#8fd0ff','#ffd76a','#fff5d6']);
  }
  switch(effect.type){
    case 'maxHealthUp': {
      S.maxHealth += effect.amount;
      S.health = cap(S.health+effect.amount, S.maxHealth);
      const t = `Max health +${effect.amount}.`;
      logMsg('sys', `${e.name}: ${t}`);
      S.shrineResult = { title: e.name, text: t };
      render(); return;
    }
    case 'heal': {
      S.health = cap(S.health+effect.amount, S.maxHealth);
      const t = `Healed ${effect.amount}.`;
      logMsg('heal', `${e.name}: ${t}`);
      S.shrineResult = { title: e.name, text: t };
      render(); return;
    }
    case 'dieUpgrade': {
      const ok = upgradeOneBasicDie(effect.cat);
      const label = effect.cat.charAt(0).toUpperCase()+effect.cat.slice(1);
      const t = ok ? `Upgraded a level 1 ${label} Die to level 2.` : `No level 1 ${label} Die left to upgrade.`;
      logMsg('sys', `${e.name}: ${t}`);
      S.shrineResult = { title: e.name, text: t };
      render(); return;
    }
    case 'tradeLoot': {
      S.lootChoice = { options: pickN(lootPoolByName(effect.pool), 3), lootName: effect.pool, overkill:false, fromShrine:true };
      render(); return;
    }
    case 'randomDieReplace': {
      S.pendingLootDie = pick(lootPoolByName(effect.pool));
      S.screen = 'swap';
      logMsg('sys', `${e.name}: choose a die to replace with a random ${effect.pool} die (${S.pendingLootDie.name}).`);
      render(); return;
    }
    case 'grantToken': {
      if(effect.token==='nullify') S.nullifyTokens += effect.charges;
      else if(effect.token==='freeze') S.freezeTokens += effect.charges;
      else if(effect.token==='boost'){ S.boostTokenValue = effect.value; S.boostTokenCharges += effect.charges; }
      const t = `Gained ${effect.charges} use(s) of a ${effect.token==='boost'?'x'+effect.value+' Boost':effect.token} token.`;
      logMsg('sys', `${e.name}: ${t}`);
      S.shrineResult = { title: e.name, text: t };
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
  if(!e.effect){
    const t = `${e.name} has no coded effect yet (boon: "${e.boon}") -- log-only for now.`;
    logMsg('sys', t);
    S.shrineResult = { title: e.name, text: t };
    render();
    return;
  }
  runShrineEffect(e, e.effect);
}

function chooseShrineOption(option){
  S.shrineChoice = null;
  option.action();
}

function onEncounterDefeated(){
  const e = S.encounter;
  logMsg('sys', `${e.name} defeated!`);
  S.stats.encountersDefeated++;
  // loot: draw dice from the floor pool, pick 1. Overkill (10+ damage beyond
  // what was needed) adds one extra option to choose from, per the manual's
  // "+1 to the Encounter Loot Reward value."
  const floor = FLOORS[S.floorIdx];
  const overkill = e.curHealth < -9; // curHealth is allowed to go negative (see capUpper) so this is measurable
  if(overkill) S.stats.overkills++;
  const isBoss = e.type==='Boss' || e.type==='Big Boss';
  let drawCount = isBoss ? 3 : 2;
  if(overkill) drawCount += 1;
  const options = pickN(floor.lootPool, Math.min(drawCount, floor.lootPool.length));
  S.lootChoice = { options, lootName: floor.lootName, overkill };
  // A Boss/Big Boss kill or an Overkill each get a distinct sound + a big
  // callout banner, so the moment registers as it happens instead of only
  // as a status chip on the loot screen that follows.
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
  }
  render();
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
  S.pendingLootDie = dieOption;
  S.lootChoice = null;
  S.screen = 'swap';
  render();
}

function swapInLootDie(trayIndex){
  const cell = S.tray[trayIndex];
  S.backPocket.push(cell.die);
  cell.die = { name: S.pendingLootDie.name, faces: S.pendingLootDie.faces, cat: S.pendingLootDie.cat || 'loot' };
  cell.faceIdx = 0;
  S.pendingLootDie = null;
  S.screen = 'game';
  logMsg('sys', `Equipped ${cell.die.name}.`, 'good');
  S.stats.lootCollected++;
  if(typeof playTone==='function') playTone('equip');
  if(typeof spawnParticleBurstAtEl==='function') spawnParticleBurstAtEl('.panel', ['#ffd76a','#8fd0ff','#fff5d6']);
  finishStep();
  render();
}

function onPlayerDefeated(){
  if(S.backPocket.length>0){
    const idx = rand(S.backPocket.length);
    const d = S.backPocket.splice(idx,1)[0];
    const f = d.faces[rand(6)];
    if(f.type!=='blank'){
      S.health = 5;
      logMsg('heal', `Desperate roll from the Back Pocket saves you! (+5 health)`, 'good');
      render();
    } else {
      logMsg('sys', `A die from the Back Pocket comes up blank and is lost.`, 'bad');
      onPlayerDefeated();
    }
  } else {
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
  const label = cat.charAt(0).toUpperCase()+cat.slice(1);
  logMsg('sys', `Upgraded 3 ${label} Die ${ROMAN[level]} into one ${newDie.name}.`, 'good');
  render();
}

// Organize Dice: click one die in the Tray and one in the Back Pocket (in
// either order) to swap them. Clicking two of the same list just changes
// which one is selected.
function selectOrganize(type, idx){
  if(!S.organizeSelection){ S.organizeSelection = {type, idx}; render(); return; }
  const sel = S.organizeSelection;
  if(sel.type===type){ S.organizeSelection = {type, idx}; render(); return; }
  const trayIndex = type==='tray' ? idx : sel.idx;
  const bpIdx = type==='bp' ? idx : sel.idx;
  const trayCell = S.tray[trayIndex];
  const bpDie = S.backPocket[bpIdx];
  S.backPocket[bpIdx] = trayCell.die;
  trayCell.die = bpDie;
  trayCell.faceIdx = 0;
  logMsg('sys', `Swapped ${bpDie.name} into your Tray for ${S.backPocket[bpIdx].name}.`, true);
  S.organizeSelection = null;
  render();
}

function campDieTileHTML(die, type, idx){
  const sel = S.organizeSelection;
  const isSelected = sel && sel.type===type && sel.idx===idx;
  return `<div class="die dietype-${die.cat} camp-die-tile ${isSelected?'organize-selected':''}" data-camp-type="${type}" data-camp-idx="${idx}" title="${die.name}">
      <span class="camp-die-label">${die.name}</span>
    </div>`;
}

function campRest(){
  if(S.campRested) return;
  scrambleTray();
  let count=0;
  S.tray.forEach(c=>{ if(currentFace(c).type!=='blank') count++; });
  const heal = Math.ceil(count/2);
  S.health = cap(S.health+heal, S.maxHealth);
  S.campRested = true;
  logMsg('heal', `Rested: scrambled ${count} actions, healed ${heal}.`, 'good');
  render();
}
function campLeave(){
  finishStep();
  render();
}

