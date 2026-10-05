/* =========================================================================
   RENDER
   ========================================================================= */
const app = document.getElementById('app');

// Clear-button confirm-arm state. Pure UI/interaction state (not game
// state), so it lives here rather than on S -- clearing a path you spent a
// few taps building shouldn't be a single accidental tap away.
let clearConfirmArmed = false;
let clearConfirmTimeout = null;
function disarmClearConfirm(){
  if(clearConfirmTimeout){ clearTimeout(clearConfirmTimeout); clearConfirmTimeout = null; }
  clearConfirmArmed = false;
}

// Colors for the per-die resolve pulse (see .die.resolving in styles.css),
// keyed by the same "what kind of thing just happened" bucket describeStepFx()
// sorts every path step into.
const RESOLVE_PULSE_COLORS = {
  dmg: 'rgba(192,57,43,0.75)', heal: 'rgba(63,174,84,0.75)',
  block: 'rgba(127,209,255,0.75)', status: 'rgba(212,175,82,0.75)',
  move: 'rgba(255,255,255,0.45)',
};

// Turns one computePathSteps() entry (logic.js) into what its beat should
// look/sound like: a pulse color/tone bucket, a CSS class for its floating
// number's color, and the number's own text. A pure Dodge/Leap/Pivot step
// has no numeric effect -- it still gets a pulse (movement, not impact) but
// no popped-off number.
function describeStepFx(step){
  if(step.dmg>0) return {pulse:'dmg', cls:'damage', text:`-${step.dmg%1?step.dmg.toFixed(1):step.dmg}`};
  if(step.healGain>0) return {pulse:'heal', cls:'heal', text:`+${step.healGain}`};
  if(step.blockGain>0) return {pulse:'block', cls:'block', text:`+${step.blockGain}`};
  if(step.hotToPlayer>0) return {pulse:'heal', cls:'heal', text:`+${step.hotToPlayer} HOT`};
  if(step.dotToEncounter>0) return {pulse:'status', cls:'status', text:`+${step.dotToEncounter} DOT`};
  if(step.selfDot>0) return {pulse:'status', cls:'status', text:`+${step.selfDot} DOT`};
  if(step.nullify) return {pulse:'status', cls:'status', text:'Nullify'};
  if(step.freeze) return {pulse:'status', cls:'status', text:'Freeze'};
  if(step.boostMultApplied) return {pulse:'status', cls:'status', text:`x${step.boostMultApplied}`};
  return {pulse:'move', cls:'', text:''};
}

// The sound half of describeStepFx()'s bucket -- silent for plain movement
// so a long Dodge/Leap/Pivot chain doesn't turn into a rattle of blips.
function playStepTone(fx, pitchStep){
  if(!fx || fx.pulse==='move') return;
  const kind = {dmg:'hit', heal:'heal', block:'block', status:'status'}[fx.pulse];
  if(kind) playTone(kind, kind==='hit' ? pitchStep : 0);
}

function updateHeaderMeta(){
  // The old top bar (logo + "Origin Class - Floor N" text + Settings gear)
  // has been removed from every screen -- it's pure chrome, and a
  // persistent floating Settings button (see _body.html / styles.css
  // .settings-btn-floating) now covers the one thing it did that mattered.
  // Nothing to update here anymore; kept as a no-op hook in case per-screen
  // header state is needed again later.
}

// Low-health danger cue: a fixed, full-viewport pulsing red vignette --
// entirely decorative, position:fixed and pointer-events:none, so it can
// never affect layout height or block a tap. Lives once in document.body
// (like the toast stack/modals) and its visibility is just toggled per
// render rather than being rebuilt into app.innerHTML each time.
const LOW_HEALTH_PCT = 0.25;
let lowHealthAlerted = false; // fires the heartbeat cue once per drop into danger, not every render
function updateLowHealthVignette(){
  let vig = document.getElementById('low-health-vignette');
  if(!vig){
    vig = el(`<div id="low-health-vignette"></div>`);
    document.body.appendChild(vig);
  }
  const danger = S && S.maxHealth>0 && (S.health/S.maxHealth) <= LOW_HEALTH_PCT && (S.health>0)
    && S.screen!=='victory' && S.screen!=='gameover';
  if(danger && !lowHealthAlerted){
    playTone('heartbeat');
    vibrate([80,60,80]);
    lowHealthAlerted = true;
  } else if(!danger){
    lowHealthAlerted = false;
  }
  vig.classList.toggle('active', !!danger);
}

// ---- Path trail: a connecting line drawn between the dice you've tapped,
// so building a Path actually reads as routing a line across the board --
// the game's core Boggle-style mechanic -- instead of just lighting up
// isolated tiles. Lives once in document.body as a position:fixed SVG (same
// pattern as the low-health vignette/toast stack) since app.innerHTML gets
// fully rebuilt on every render() and a DOM node can't animate a CSS
// transition across being torn down and recreated. Only the newest segment
// animates itself in (stroke-dashoffset draw-on); every other change
// (undo, clear, a fresh scrambled tray) redraws instantly with no
// animation, since those aren't "extending a path" moments. ----
let trailLastPath = [];
function clearPathTrail(){
  const svg = document.getElementById('path-trail-svg');
  if(svg) svg.innerHTML = '';
  trailLastPath = [];
}
function pathTrailCenterOf(trayEl, idx){
  const node = trayEl.querySelector(`.die[data-idx="${idx}"]`);
  if(!node) return null;
  const r = node.getBoundingClientRect();
  return {x: r.left+r.width/2, y: r.top+r.height/2};
}
function pathTrailAppendSegment(svg, a, b, animate, curved){
  // A Leap segment connects two tiles that are 2 apart in a straight line,
  // passing directly over the skipped tile's center -- drawn as a straight
  // line, that reads as crossing itself the moment a later segment of the
  // same path also passes through that middle tile. Bowing it slightly to
  // one side keeps the two visually distinct instead of overlapping.
  let el;
  if(curved){
    const dx = b.x-a.x, dy = b.y-a.y;
    const len = Math.hypot(dx,dy) || 1;
    const ux = dx/len, uy = dy/len;
    const px = -uy, py = ux; // perpendicular unit vector
    const bow = Math.min(len*0.22, 20);
    const mx = (a.x+b.x)/2 + px*bow, my = (a.y+b.y)/2 + py*bow;
    el = document.createElementNS('http://www.w3.org/2000/svg','path');
    el.setAttribute('d', `M ${a.x},${a.y} Q ${mx},${my} ${b.x},${b.y}`);
  } else {
    el = document.createElementNS('http://www.w3.org/2000/svg','line');
    el.setAttribute('x1', a.x); el.setAttribute('y1', a.y);
    el.setAttribute('x2', b.x); el.setAttribute('y2', b.y);
  }
  el.setAttribute('class', 'path-trail-line');
  svg.appendChild(el);
  if(animate && !PREFS.reducedMotion){
    const len = curved ? el.getTotalLength() : (Math.hypot(b.x-a.x, b.y-a.y) || 1);
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    // eslint-disable-next-line no-unused-expressions
    el.getBoundingClientRect(); // force layout so the transition below doesn't get coalesced with the dash-offset write above
    requestAnimationFrame(()=>{
      el.style.transition = 'stroke-dashoffset 0.22s ease-out';
      el.style.strokeDashoffset = '0';
    });
  }
}
function updatePathTrail(){
  const trayEl = document.getElementById('tray');
  if(!trayEl || !S || !S.path || S.path.length<2){
    clearPathTrail();
    return;
  }
  let svg = document.getElementById('path-trail-svg');
  if(!svg){
    svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.id = 'path-trail-svg';
    document.body.appendChild(svg);
  }
  const path = S.path;
  const isIncrementalAdd = path.length===trailLastPath.length+1
    && trailLastPath.every((v,i)=> v===path[i]);
  if(!isIncrementalAdd){
    svg.innerHTML = '';
    for(let i=1;i<path.length;i++){
      const a = pathTrailCenterOf(trayEl, path[i-1]);
      const b = pathTrailCenterOf(trayEl, path[i]);
      if(a && b) pathTrailAppendSegment(svg, a, b, false, adjLeap(trayRC(path[i-1]), trayRC(path[i])));
    }
  } else {
    const prevIdx = path[path.length-2], idx = path[path.length-1];
    const a = pathTrailCenterOf(trayEl, prevIdx);
    const b = pathTrailCenterOf(trayEl, idx);
    if(a && b) pathTrailAppendSegment(svg, a, b, true, adjLeap(trayRC(prevIdx), trayRC(idx)));
  }
  trailLastPath = path.slice();
}
// The trail SVG is position:fixed (viewport-anchored) so it draws above
// everything regardless of where #tray ends up in the document, but that
// means its already-drawn line/path coordinates -- captured once from
// getBoundingClientRect() at draw time -- go stale the instant the page
// scrolls (the dice tiles move within the viewport; the SVG's children
// don't follow). Re-running the non-animated full-redraw branch on every
// scroll/resize keeps the trail glued to the tray instead of drifting off
// into empty space above/below it.
window.addEventListener('scroll', ()=>{
  if(trailLastPath.length>1) updatePathTrail();
}, {passive:true});
window.addEventListener('resize', ()=>{
  if(trailLastPath.length>1) updatePathTrail();
});

// ---- Screen transition: a quick fade+rise on #app whenever the top-level
// screen actually changes (Setup -> Camp -> Encounter -> Loot/Swap ->
// Victory, etc.), so moving through the dungeon reads as going somewhere
// new rather than an instant snap. Deliberately keyed off S.screen (or
// 'setup' pre-game) rather than firing on every render() -- renderGame()
// alone is called every single turn, and re-fading the whole screen on
// every hit/heal/tray update would be noisy, not a "screen transition."
// #app itself survives the innerHTML rebuild each render does to its
// children, so toggling a class on #app works the same way the path-trail
// SVG and low-health vignette persist outside that rebuild. ----
let lastScreenKey = null;
function maybeScreenTransition(key){
  if(key===lastScreenKey) return;
  lastScreenKey = key;
  app.classList.remove('screen-fade-in');
  void app.offsetWidth; // force reflow so re-adding the class restarts the animation even on back-to-back changes
  app.classList.add('screen-fade-in');
}

// Pre-game screen the player sees before S exists: 'title' is the landing
// page (logo/tagline, Continue if a save exists, New Run, and quick links
// to Achievements/Run History/How to Play); 'setup' is the actual Origin/
// Class character-creation screen. Module-level rather than part of S since
// S doesn't exist yet -- resets to 'title' on every full page load (a fresh
// tab, or the location.reload() a run ends with), which is exactly the
// "always land on the title screen" behavior wanted.
let preGameScreen = 'title';

function render(){
  updateHeaderMeta();
  updateLowHealthVignette();
  if(!S){
    clearPathTrail();
    if(preGameScreen==='title'){ renderTitle(); maybeScreenTransition('title'); }
    else { renderSetup(); maybeScreenTransition('setup'); }
    return;
  }
  if(S.screen==='victory'){ clearPathTrail(); renderVictory(); maybeScreenTransition('victory'); return; }
  if(S.screen==='gameover'){ clearPathTrail(); renderGameOver(); maybeScreenTransition('gameover'); return; }
  if(S.screen==='camp'){ clearPathTrail(); renderCamp(); maybeAutosave(); maybeScreenTransition('camp'); return; }
  if(S.screen==='shrine'){ clearPathTrail(); renderShrineEncounter(); maybeAutosave(); maybeScreenTransition('shrine'); return; }
  renderGame();
  maybeAutosave();
  maybeScreenTransition('game');
}

function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }

// One padlock glyph, drawn (not emoji) so every "this is locked" spot in the
// UI -- the Origin icon badge, its showcase hint, Achievements, the Dice
// Compendium -- shares the same inked line-art mark instead of a colorful
// platform-rendered lock emoji that clashes with the parchment/ink palette.
function lockSVG(size){
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="5" y="11" width="14" height="9" rx="1.5"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>`;
}

// 3-small-dice-converge-into-1-bigger-die glyph (Camp's Upgrade Dice rows)
// -- reads as "combine" at a glance in place of the plain "I -> II" arrow it
// replaces. Three single-pip dice fan out on the left, an arrow, then one
// bigger five-pip die on the right stands in for the stronger result.
function mergeGlyphSVG(h){
  const w = h*2.45;
  return `<svg class="merge-glyph" viewBox="0 0 54 22" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="1.6">
      <rect x="1" y="2" width="9" height="9" rx="2" transform="rotate(-12 5.5 6.5)"></rect>
      <circle cx="5.5" cy="6.5" r="1" fill="currentColor" stroke="none" transform="rotate(-12 5.5 6.5)"></circle>
      <rect x="6" y="9.5" width="9" height="9" rx="2"></rect>
      <circle cx="10.5" cy="14" r="1" fill="currentColor" stroke="none"></circle>
      <rect x="1" y="14.5" width="9" height="9" rx="2" transform="rotate(10 5.5 19)"></rect>
      <circle cx="5.5" cy="19" r="1" fill="currentColor" stroke="none" transform="rotate(10 5.5 19)"></circle>
      <path d="M19 11 H29" stroke-width="2"></path>
      <path d="M25 7 L30 11 L25 15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
      <rect x="35" y="2" width="17" height="17" rx="3" stroke-width="2"></rect>
      <circle cx="39.6" cy="6.6" r="1.3" fill="currentColor" stroke="none"></circle>
      <circle cx="47.4" cy="6.6" r="1.3" fill="currentColor" stroke="none"></circle>
      <circle cx="43.5" cy="10.5" r="1.3" fill="currentColor" stroke="none"></circle>
      <circle cx="39.6" cy="14.4" r="1.3" fill="currentColor" stroke="none"></circle>
      <circle cx="47.4" cy="14.4" r="1.3" fill="currentColor" stroke="none"></circle>
    </svg>`;
}

// Plain chevron, used as the bouncing "tap here next" cue between Camp's
// Organize Dice lists (see groupedCampTilesHTML()/organizeSwapArrowHTML()
// below) -- points down when the next tap belongs in Back Pocket, up when
// it belongs in Tray, by rotating the same glyph via CSS rather than
// drawing two separate icons.
function chevronSVG(size){
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>`;
}

const CAMP_CAT_ORDER = ['origin','attack','maneuver','alloy','gilded','magic'];
// Collapses identical dice (same name -- interchangeable, since two
// "Attack Die I"s have identical faces) in a Tray/Back Pocket list into one
// card-stack entry, like a deck showing one card face with a count instead
// of spreading every copy out individually. `items` is [{die, idx}], idx
// being that die's real position in S.tray/S.backPocket; a stack keeps
// every index it represents (`indices`) so a tap can swap any one instance
// -- they're all equivalent -- while the OTHER instances stay put and the
// stack's count just drops by one on the next render.
function buildDieStacks(items){
  const byName = new Map();
  items.forEach(({die, idx})=>{
    if(!byName.has(die.name)) byName.set(die.name, {die, indices:[]});
    byName.get(die.name).indices.push(idx);
  });
  return [...byName.values()].sort((a,b)=>{
    const ai = CAMP_CAT_ORDER.indexOf(a.die.cat), bi = CAMP_CAT_ORDER.indexOf(b.die.cat);
    if(ai!==bi) return ai-bi;
    if(a.die.level!=null && b.die.level!=null && a.die.level!==b.die.level) return a.die.level-b.die.level;
    return a.die.name.localeCompare(b.die.name);
  });
}
// One square tile per stack -- art (LOOT_ART covers every Origin and Loot
// die) fills the square for anything that has it; the two generic Basic
// dice (Attack/Maneuver, no unique art) fall back to a short category +
// tier label instead of their full name, since there's no room to spell
// "Attack Die I" out in a square this size (the truncation problem Camp
// used to have). More than one copy gets a layered box-shadow "stack of
// cards" look plus a corner count badge.
function campStackTileHTML(stack, type){
  const { die, indices } = stack;
  const sel = S.organizeSelection;
  const isSelected = sel && sel.type===type && indices.includes(sel.idx);
  const repIdx = indices[0]; // any instance will do -- they're interchangeable
  const art = LOOT_ART[die.name];
  const isBasic = die.cat==='attack' || die.cat==='maneuver';
  const inner = isBasic
    ? `<span class="camp-die-basic-label">${die.cat==='attack'?'Atk':'Man'}<br>${ROMAN[die.level]}</span>`
    : (art ? `<img src="${art}" alt="${die.name}">` : `<span class="camp-die-basic-label">${die.name}</span>`);
  return `<div class="die dietype-${die.cat} camp-die-tile ${indices.length>1?'stacked':''} ${isSelected?'organize-selected':''}" data-camp-type="${type}" data-camp-idx="${repIdx}" title="${die.name}${indices.length>1?` ×${indices.length}`:''}">
      ${inner}
      ${indices.length>1?`<span class="camp-stack-badge">${indices.length}</span>`:''}
    </div>`;
}
function campDiceGridHTML(items, type){
  return buildDieStacks(items).map(stack=>campStackTileHTML(stack, type)).join('');
}

// The bouncing arrow between Tray and Back Pocket in Organize Dice, shown
// only once a die is selected -- points at whichever list the player needs
// to tap next to complete the swap, so the two taps read as one connected
// gesture instead of two disconnected clicks into generically-labeled
// lists. Hidden entirely (returns '') with nothing selected.
function organizeSwapArrowHTML(){
  const sel = S.organizeSelection;
  if(!sel) return '';
  const dir = sel.type==='tray' ? 'down' : 'up';
  return `<div class="organize-swap-arrow ${dir}">${chevronSVG(16)}</div>`;
}

// The landing screen before any game exists: logo/tagline, a lifetime-stats
// teaser once the player has history, Continue (if a save is sitting there),
// New Run, and quick links to Achievements/Run History/How to Play. Setup
// (Origin/Class picking) is one tap away via New Run, and the Settings gear
// in the header works here too since it's always present in the title bar.
function renderTitle(){
  const saved = hasSave() ? peekSave() : null;
  const L = META.lifetime;
  const lifetimeLine = L.runsPlayed>0
    ? `<p class="hint" style="text-align:center; margin:0 0 12px;">${L.runsPlayed} run${L.runsPlayed===1?'':'s'} played &middot; ${L.victories} victor${L.victories===1?'y':'ies'}</p>`
    : '';
  const continueBtn = saved ? `
      <button class="primary" id="title-continue-btn">Continue Saved Game</button>
      <p class="hint" style="text-align:center; margin:-6px 0 2px;">${saved.originName} ${saved.className} &middot; Floor ${saved.floorIdx+1} &middot; ${saved.health}/${saved.maxHealth} HP</p>`
    : '';
  app.innerHTML = `
    <div class="title-screen-fill">
      <div class="panel title-panel">
        <div class="title-art-wrap">
          <img class="title-cover-art" src="${COVER_ART}" alt="Dungeon Scramble -- a dice-drafting, deck-builder">
          <div class="title-art-fade"></div>
        </div>
        <div class="title-content">
          ${lifetimeLine}
          <div class="title-btn-col">
            ${continueBtn}
            <button class="${saved?'':'primary'}" id="title-newrun-btn">${saved?'Start New Run':'New Run'}</button>
            <button id="title-achievements-btn">Achievements</button>
            <button id="title-history-btn">Run History</button>
            <button id="title-compendium-btn">Dice Compendium</button>
            <button id="title-howto-btn">How to Play</button>
          </div>
        </div>
      </div>
    </div>
  `;
  if(saved) document.getElementById('title-continue-btn').onclick = ()=>{ if(loadGame()) render(); };
  document.getElementById('title-newrun-btn').onclick = ()=>{
    if(!saved){ resetSetupPortraitPreviews(); preGameScreen='setup'; render(); return; }
    const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center;">
        <h2>Start a New Run?</h2>
        <p>Your saved run (${saved.originName} ${saved.className}, Floor ${saved.floorIdx+1}) will be lost.</p>
        <div class="small-btn-row" style="justify-content:center;">
          <button id="title-newrun-cancel">Keep Saved Run</button>
          <button class="danger" id="title-newrun-go">Start New Run</button>
        </div>
      </div></div>`);
    openModal(overlay);
    overlay.querySelector('#title-newrun-cancel').onclick = ()=> closeModal(overlay);
    overlay.querySelector('#title-newrun-go').onclick = ()=> closeModal(overlay, ()=>{ clearSave(); resetSetupPortraitPreviews(); preGameScreen='setup'; render(); });
    overlay.onclick = (ev)=>{ if(ev.target===overlay) closeModal(overlay); };
  };
  document.getElementById('title-achievements-btn').onclick = openAchievementsModal;
  document.getElementById('title-history-btn').onclick = openRunHistoryModal;
  document.getElementById('title-compendium-btn').onclick = openDiceCompendiumModal;
  document.getElementById('title-howto-btn').onclick = ()=> openTutorialModal(0);
}

// A generic "unknown" figure -- a dark hooded silhouette with two softly
// glowing eyes -- standing in anywhere a real portrait isn't drawn yet
// (Halfling/Pixie origins, and every un-illustrated monster). Pure CSS, no
// image asset, and reads as an intentional "mystery" design on its own, so
// it replaces the old placeholder art + loud red "PLACEHOLDER" banner
// combo entirely (same idea as the Camp campfire). `sizeStyle` is an inline
// width/aspect-ratio string sized to whatever box is hosting it.
function mysteryFigureHTML(sizeStyle){
  return `<div class="mystery-figure" style="${sizeStyle}"></div>`;
}

// Locked Origin card preview (Setup screen): the real portrait art for that
// Origin, run through a brightness(0) CSS filter (.silhouette-img) so only
// its shape shows through, in solid dark silhouette. Deliberately a
// character-specific silhouette -- a stocky Halfling reads as a Halfling, a
// winged Pixie as a Pixie -- rather than reusing the single generic
// mysteryFigureHTML() blob every un-illustrated monster shares: that blob
// is for art that doesn't exist yet, but Halfling/Pixie's art exists, it's
// just not revealed until the Origin is unlocked. Always picks the array's
// first portrait (arbitrary but deterministic) since which exact pose
// shows doesn't matter for a silhouette.
function lockedOriginPortraitHTML(originId){
  const arr = originPortraitArray(originId);
  if(!arr || !arr.length) return mysteryFigureHTML('width:75%; aspect-ratio:1/1;');
  return `<img class="portrait-img silhouette-img" src="${arr[0]}" alt="">`;
}

// Unlock-condition copy for a locked Origin card (Dwarf/Gnome are always
// unlocked -- see isOriginUnlocked(), logic.js -- so only these two need an
// entry here).
const ORIGIN_UNLOCK_HINT = {
  halfling: 'Win a run to unlock.',
  pixie: 'Win a run with 2 different Origins to unlock.',
};

// Module-level (not a renderSetup() local) because arming it triggers a
// full render() to pick up the real unlock everywhere else it matters --
// see the class-header handler below -- which tears down and rebuilds this
// whole screen, including every local closure renderSetup() would
// otherwise keep this in. A plain local would forget it was armed the
// moment that re-render happened.
let debugArmed = false;

// Compact "sides of this die" preview row -- reused for both the Origin
// showcase and the Starting Boon showcase below, since both are just a
// `faces` array rendered with the exact same icon language the in-run tray
// already uses (iconSpan/LABEL, data.js) at a smaller, non-interactive size.
// `toneCls` picks which die-type color the chips take (origin-tone/
// alloy-tone/gilded-tone/magic-tone, styles.css -- matching the real
// .die.dietype-* colors so a die previewed here looks like itself in-tray).
function dieFaceChipsHTML(faceArr, toneCls){
  return faceArr.map(f=>{
    if(f.type==='blank') return `<div class="die-face-chip ${toneCls} blank"></div>`;
    return `<div class="die-face-chip ${toneCls}">${iconSpan(f.type, f.value)}</div>`;
  }).join('');
}

// A Class's ability resolves to one concrete action on the tray -- shown as
// a small icon next to its ability text so the Class showcase reads at a
// glance the same way the Origin die's faces do. Dungeoneer's path-wrapping
// rule has no equivalent die-face icon, so it gets its own distinct glyph
// instead of being stretched onto an unrelated one.
const CLASS_ACTION_ICON = { guard:'block', armsmaster:'hit', arcanist:'dodge' };
const CLASS_WRAP_ICON_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path><path d="M3 21v-5h5"></path></svg>`;
function classActionIconHTML(k){
  if(k.id==='dungeoneer') return CLASS_WRAP_ICON_SVG;
  const t = CLASS_ACTION_ICON[k.id];
  return t ? iconSpan(t) : '';
}

// Origin showcase: the selected (or previewed-while-locked) Origin's
// portrait + name, then its own die -- item art, name plate, one-line
// blurb, and its 6 real faces -- all in one panel, filled in by the Origin
// icon row above it (WoW-style icon-picker -> detail-panel pattern).
function originShowcaseHTML(o, unlocked){
  const portrait = unlocked ? getSetupPreviewPortrait(o.id) : null;
  const portraitHTML = unlocked
    ? (portrait.placeholder ? mysteryFigureHTML('width:100%;height:100%;') : `<img class="portrait-img" src="${portrait.img}" alt="${o.name}">`)
    : lockedOriginPortraitHTML(o.id);
  const dieArt = LOOT_ART[o.die];
  return `
    <div class="origin-showcase-top">
      <div class="origin-showcase-portrait ${unlocked?'':'dim'}">${portraitHTML}</div>
      <div class="origin-showcase-name-col">
        <div class="origin-showcase-name">${o.name}</div>
        ${unlocked?'':`<div class="origin-lock-hint">${lockSVG(11)} ${ORIGIN_UNLOCK_HINT[o.id]||'Locked.'}</div>`}
      </div>
    </div>
    <div class="origin-die-block ${unlocked?'':'dim'}">
      <div class="origin-die-head">
        ${dieArt?`<div class="die-art-wrap origin-tone"><img class="die-art" src="${dieArt}" alt="${o.die}"></div>`:''}
        <div class="origin-die-name-col">
          <div class="die-plate origin-tone">${o.die}</div>
          <div class="die-blurb">${o.blurb}</div>
        </div>
      </div>
      <div class="die-face-row">${dieFaceChipsHTML(o.faces, 'origin-tone')}</div>
    </div>
  `;
}

// Class showcase: the selected Class's name, ability text, and its action
// icon (or Dungeoneer's own wrap glyph), in a fixed-height panel so nothing
// reflows as the player taps between the 4 tabs above it.
function classShowcaseHTML(k){
  return `
    <div class="class-action-icon" style="--class-color:${k.color}">${classActionIconHTML(k)}</div>
    <div class="class-showcase-text">
      <div class="class-showcase-name" style="--class-color:${k.color}">${k.name}</div>
      <div class="class-showcase-ability">${k.ability}</div>
    </div>
  `;
}

// Starting Boon showcase: the currently-picked die's own item art, name
// plate (colored by its real tier), and its 6 faces -- the same treatment
// as the Origin die above, shown under the runic carousel once something
// other than "None" is picked.
function boonShowcaseHTML(d){
  if(!d) return `<div class="boon-showcase-empty">No Starting Boon selected -- you'll begin with just the standard tray.</div>`;
  const dieArt = LOOT_ART[d.name];
  const tone = `${d.tier}-tone`;
  return `
    <div class="origin-die-head">
      ${dieArt?`<div class="die-art-wrap ${tone}"><img class="die-art" src="${dieArt}" alt="${d.name}"></div>`:''}
      <div class="die-plate ${tone}">${d.name}</div>
    </div>
    <div class="die-face-row">${dieFaceChipsHTML(d.faces, tone)}</div>
  `;
}

function renderSetup(){
  const boonTiers = unlockedBoonTiers();
  const boonDice = boonTiers.flatMap(t=>BOON_TIER_POOLS[t].filter(d=>DISCOVERED_DICE.has(d.name)).map(d=>({...d, tier:t})));
  app.innerHTML = `
    <div class="panel setup-panel">
      <button id="setup-back-btn" class="setup-back-btn" title="Back to title">&larr; Back</button>

      <div class="setup-name-row">
        <input id="char-name-input" class="char-name-input" type="text" maxlength="24" placeholder="New Character" autocomplete="off">
        <svg class="char-name-pencil" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
      </div>

      <div class="setup-section">
        <div class="setup-label">Origin</div>
        <div class="origin-icon-row" id="origin-icon-row"></div>
        <div class="origin-showcase" id="origin-showcase"></div>
      </div>

      <div class="setup-section">
        <div class="setup-label" id="class-header" title="Choose Your Class">Class</div>
        <div class="class-tab-row" id="class-tab-row"></div>
        <div class="class-showcase" id="class-showcase"></div>
      </div>

      ${boonTiers.length ? `
      <div class="setup-section">
        <div class="setup-label">Starting Boon <span class="setup-label-sub">(optional)</span></div>
        ${boonDice.length ? `
          <div class="boon-scroll" id="boon-scroll"></div>
          <div class="boon-showcase" id="boon-showcase"></div>
        ` : `<p class="hint">You've unlocked Starting Boon tier${boonTiers.length>1?'s':''} (${boonTiers.map(t=>BOON_TIER_LABELS[t]).join(', ')}), but haven't discovered a die from ${boonTiers.length>1?'them':'it'} yet -- find one as loot in a run to make it pickable here.</p>`}
      </div>` : ''}

      <button class="primary" id="start-btn" disabled>Enter the Dungeon</button>
    </div>
  `;
  document.getElementById('setup-back-btn').onclick = ()=>{ preGameScreen='title'; render(); };

  // chosenOrigin/chosenClass hold whatever is actually selected -- what
  // #start-btn ends up using. previewedOriginId/previewedClassId drive the
  // showcase panels and can point at something merely being looked at (a
  // still-locked Origin, previewed with its lock hint) without that
  // counting as a selection. Dwarf/the first Class are both shown AND
  // selected by default (rather than shown-but-unselected) so a new player
  // isn't looking at a fully-filled-in showcase with no visible selection
  // ring anywhere and wondering what, if anything, is actually chosen --
  // tapping a different Origin or Class still overrides this as normal.
  const defaultClassId = CLASSES.find(k=>!k.debug).id;
  let chosenOrigin='dwarf', chosenClass=defaultClassId, chosenBoonName=null, charName='';
  let previewedOriginId = 'dwarf', previewedClassId = defaultClassId;

  const nameInput = document.getElementById('char-name-input');
  nameInput.oninput = ()=>{ charName = nameInput.value; };

  const originIconRow = document.getElementById('origin-icon-row');
  const originShowcase = document.getElementById('origin-showcase');
  function renderOriginIcons(){
    originIconRow.innerHTML = '';
    ORIGINS.forEach(o=>{
      const unlocked = isOriginUnlocked(o.id);
      const portrait = unlocked ? getSetupPreviewPortrait(o.id) : null;
      const portraitHTML = unlocked
        ? (portrait.placeholder ? mysteryFigureHTML('width:100%;height:100%;') : `<img class="portrait-img" src="${portrait.img}" alt="${o.name}">`)
        : lockedOriginPortraitHTML(o.id);
      const c = el(`<button type="button" class="origin-icon-btn ${o.id===chosenOrigin?'selected':''} ${unlocked?'':'locked'}" aria-label="${o.name}" title="${o.name}">
          ${portraitHTML}
          ${unlocked?'':`<span class="origin-lock-badge">${lockSVG(13)}</span>`}
        </button>`);
      c.onclick = ()=>{
        previewedOriginId = o.id;
        if(unlocked){ chosenOrigin = o.id; } else if(typeof showToast==='function') showToast(ORIGIN_UNLOCK_HINT[o.id]||'Locked', null);
        renderOriginIcons();
        renderOriginShowcaseNow();
        checkReady();
      };
      originIconRow.appendChild(c);
    });
  }
  function renderOriginShowcaseNow(){
    const o = ORIGINS.find(x=>x.id===previewedOriginId);
    originShowcase.innerHTML = originShowcaseHTML(o, isOriginUnlocked(o.id));
  }
  renderOriginIcons();
  renderOriginShowcaseNow();

  const classTabRow = document.getElementById('class-tab-row');
  const classShowcase = document.getElementById('class-showcase');
  // Debug class has no tab of its own -- it's a testing tool, not a real
  // choice -- and is instead armed by rapid-clicking the section label
  // (see the class-header handler below).
  const realClasses = CLASSES.filter(k=>!k.debug);
  function renderClassTabs(){
    classTabRow.innerHTML = '';
    realClasses.forEach(k=>{
      const c = el(`<button type="button" class="class-tab-btn ${k.id===chosenClass?'selected':''}" style="--class-color:${k.color}">${k.name}</button>`);
      c.onclick = ()=>{
        previewedClassId = k.id; chosenClass = k.id;
        renderClassTabs();
        renderClassShowcaseNow();
        checkReady();
      };
      classTabRow.appendChild(c);
    });
  }
  function renderClassShowcaseNow(){
    classShowcase.innerHTML = classShowcaseHTML(realClasses.find(k=>k.id===previewedClassId));
  }
  renderClassTabs();
  renderClassShowcaseNow();
  checkReady();

  const boonScroll = document.getElementById('boon-scroll');
  const boonShowcase = document.getElementById('boon-showcase');
  if(boonScroll){
    function renderBoonScroll(){
      // Favorited dice float to the front -- re-sorted live as the player
      // taps a star, same carousel behavior the mockup demoed (sort is
      // stable, so otherwise-equal dice keep their tier order).
      const sorted = [...boonDice].sort((a,b)=>(isFavoriteBoon(b.name)?1:0)-(isFavoriteBoon(a.name)?1:0));
      boonScroll.innerHTML = '';
      const noneTile = el(`<button type="button" class="boon-tile ${chosenBoonName===null?'selected':''}">
          <div class="boon-tile-circle none-tone">—</div>
          <div class="boon-tile-label">None</div>
        </button>`);
      noneTile.onclick = ()=>{ chosenBoonName=null; renderBoonScroll(); renderBoonShowcaseNow(); };
      boonScroll.appendChild(noneTile);
      sorted.forEach(d=>{
        const art = LOOT_ART[d.name];
        const fav = isFavoriteBoon(d.name);
        const tile = el(`<button type="button" class="boon-tile ${d.name===chosenBoonName?'selected':''}">
            <div class="boon-tile-circle ${d.tier}-tone">${art?`<img src="${art}" alt="">`:''}</div>
            <div class="boon-tile-label">${d.name}</div>
            <span class="boon-fav-btn ${fav?'active':''}" title="Favorite">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="${fav?'currentColor':'none'}" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8-6.1-3.6-6.1 3.6 1.5-6.8-5.2-4.7 6.9-.7z"></path>
              </svg>
            </span>
          </button>`);
        tile.onclick = (e)=>{
          const favBtn = e.target.closest('.boon-fav-btn');
          if(favBtn){ e.stopPropagation(); toggleFavoriteBoon(d.name); renderBoonScroll(); return; }
          chosenBoonName = d.name; renderBoonScroll(); renderBoonShowcaseNow();
        };
        boonScroll.appendChild(tile);
      });
    }
    function renderBoonShowcaseNow(){
      boonShowcase.innerHTML = boonShowcaseHTML(chosenBoonName ? boonDice.find(d=>d.name===chosenBoonName) : null);
    }
    renderBoonScroll();
    renderBoonShowcaseNow();
  }

  function checkReady(){ document.getElementById('start-btn').disabled = !(chosenOrigin&&chosenClass); }
  document.getElementById('start-btn').onclick=()=>{ newGame(chosenOrigin, chosenClass, chosenBoonName, charName); };
  // Secret debug trigger: 5 clicks on "Choose Your Class" within a short
  // window. No visible button, so it can't be stumbled into by a normal
  // player, but stays quick to reach for testing. Two-step, since it does
  // two different jobs:
  //   1st time: unlocks every Origin, Achievement, and Dice Compendium
  //      entry for REAL (debugUnlockEverything(), logic.js) -- it drives
  //      the same META.lifetime thresholds normal play would, so every
  //      other unlock check (Starting Boon tiers, isOriginUnlocked()) just
  //      sees it as already-earned progress. That changes what this very
  //      screen should show (real portraits instead of locked silhouettes,
  //      a newly-unlocked Starting Boon section) -- patching individual
  //      DOM nodes in place can't pick all of that up, so this re-renders
  //      the whole Setup screen via render() instead, the same render path
  //      a genuinely-unlocked player would get. debugArmed is module-level
  //      (not a local here) so it survives that rebuild.
  //   2nd time (on the now-rebuilt screen): arms the hidden Debug class
  //      for this run (fills the tray with one of every die type, adds a
  //      one-tap Win button) -- a separate concern from the unlock above,
  //      kept as a quick in-place selection so it doesn't cost a 3rd
  //      re-render.
  let classHeaderClicks = [];
  document.getElementById('class-header').onclick = ()=>{
    const now = Date.now();
    classHeaderClicks = classHeaderClicks.filter(t=>now-t<1200);
    classHeaderClicks.push(now);
    if(classHeaderClicks.length>=5){
      classHeaderClicks = [];
      if(!debugArmed){
        debugArmed = true;
        if(typeof debugUnlockEverything==='function') debugUnlockEverything();
        if(typeof showToast==='function') showToast('Debug: Origins, Achievements & Dice Compendium all unlocked', 'good');
        render();
        return;
      }
      chosenClass = 'debug';
      [...classTabRow.children].forEach(x=>x.classList.remove('selected'));
      checkReady();
      if(typeof showToast==='function') showToast('Debug class armed', 'good');
    }
  };
}

function renderRoute(){
  const floorCls = `floor${S.floorIdx+1}`;
  const n = S.route.length;
  let html = `<div class="route-wrap">`;
  html += '<div class="route">';
  S.route.forEach((step,i)=>{
    const cls = i<S.routeStep?'done':(i===S.routeStep?'current':'');
    const icon = iconSpan(step==='camp'?'camp':(step==='boss'?'boss':'door'));
    const statusSuffix = cls==='done' ? ' (cleared)' : (cls==='current' ? ' (current)' : ' (ahead)');
    const tip = (ROUTE_STEP_DESC[step]||'') + statusSuffix;
    html += `<div class="node ${floorCls} ${cls} route-tooltip-target" title="${tip}">${icon}</div>`;
  });
  html += '</div>';
  const leftPct = ((Math.min(S.routeStep, n-1) + 0.5) / n * 100).toFixed(2);
  const portrait = S.portrait || { img: GNOME_PORTRAITS[0], placeholder:true };
  const mascotHTML = portrait.placeholder
    ? mysteryFigureHTML('width:26px; height:26px;')
    : `<img class="mascot-marker" src="${portrait.img}" alt="">`;
  html += `<span class="mascot-wrap" style="left:${leftPct}%;">${mascotHTML}</span>`;
  html += '</div>';
  return html;
}

// Which path index (if any) a currently-armed free Boost token will land
// on: it compounds through any leading Boost faces already in the path,
// then is spent (used or wasted) by the very next non-Boost action --
// mirrors the boostMult bookkeeping in computePathEffects().
function boostTargetIdx(){
  if(!(S.pendingFreeBoost>0)) return -1;
  for(const idx of S.path){
    const f = getFaceForIdx(idx);
    if(f.type==='boost') continue;
    return idx;
  }
  return -1;
}

// Renders a die's name as text arced along the top edge of the tile (like a
// coin legend), so longer names get more usable width than a single straight
// line would allow. The viewBox is sized to roughly match the name-tag's
// actual on-screen box (63x20 CSS px) instead of an arbitrary 100-wide unit
// space, so font-size units here map ~1:1 to real px without the extra
// horizontal squish a wider viewBox would otherwise bake into every glyph --
// that squish was making the text read as smaller than its font-size implied.
// Names long enough to still overflow the arc at their tier's size fall back
// to SVG textLength compression (squeezing glyph width/spacing, not
// font-size) so even the longest names stay at a readable height.
function nameTagSVG(name, idx){
  const len = name.length;
  let fs;
  if(len<=8) fs=9;
  else if(len<=14) fs=8.3;
  else fs=7.6; // floor -- close to the face-word text's own 9px, however long the name
  const budget = 52; // usable arc length in viewBox units
  const estWidth = len * fs * 0.52; // rough average glyph-width heuristic
  const compress = estWidth > budget;
  const pathId = `nametag-arc-${idx}`;
  return `<svg class="name-tag-svg" viewBox="0 0 63 20" preserveAspectRatio="none">
    <defs><path id="${pathId}" d="M 4,19 Q 31.5,3 59,19"/></defs>
    <text font-size="${fs}"${compress ? ` textLength="${budget}" lengthAdjust="spacingAndGlyphs"` : ''}>
      <textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${name}</textPath>
    </text>
  </svg>`;
}

function renderDie(cell, idx){
  const f = cell.forcedFace || currentFace(cell);
  const isBlank = f.type==='blank';
  const inPath = S.path.includes(idx);
  const isLastMove = S.path.length && S.path[S.path.length-1]===idx;
  const selectable = canSelect(idx);
  const clickable = selectable || isLastMove;
  const num = inPath ? S.path.indexOf(idx)+1 : null;
  const zoneCls = inZone(idx) ? 'zone-cell' : '';
  const shakeCls = S.justScrambled ? 'shaking' : '';
  const rippleEntry = S.lastComboRipple && S.lastComboRipple.find(r=>r.idx===idx);
  const rippleCls = rippleEntry ? 'combo-ripple' : '';
  const justConverted = S.justConvertedIdx===idx;
  const convertCls = justConverted ? 'ability-convert' : '';
  // A Leap that just jumped clean over this specific cell's Minion, clearing
  // it on the spot (see step.leapClearIdx, computePathSteps(), logic.js) --
  // a bright one-shot burst, distinct from the gold Combo ripple above,
  // since a Minion is being knocked out rather than a chain extending.
  const minionClearCls = S.lastMinionClearIdx===idx ? 'minion-cleared' : '';
  // Turn resolution: this die is the one currently playing back (see
  // runPlayerPathSteps() in logic.js) -- pulses once, colored by what it
  // did, with its own popped-off number rather than everything landing as
  // one instant total.
  const isResolving = S.resolvingIdx===idx;
  const resolveCls = isResolving ? 'resolving' : '';
  const resolveFx = isResolving ? S.resolvingFx : null;
  const styleParts = [];
  if(S.justScrambled) styleParts.push(`animation-delay:${idx*18}ms`);
  else if(rippleEntry) styleParts.push(`animation-delay:${rippleEntry.order*90}ms`);
  if(resolveFx) styleParts.push(`--resolve-color:${RESOLVE_PULSE_COLORS[resolveFx.pulse]||RESOLVE_PULSE_COLORS.move}`);
  const shakeDelay = styleParts.length ? `style="${styleParts.join(';')}"` : '';
  // The die's own color is fixed by what it physically IS (dietype-attack/
  // maneuver/origin/alloy/gilded/magic) -- it never changes with the face
  // showing. A blank face just shows that color with no symbol on it.
  const dieTypeCls = cell.minion ? 'minion' : `dietype-${cell.die.cat}`;
  const label = isBlank ? '' : `<div class="face-val">${iconSpan(f.type, f.value)}</div><div class="face-word">${LABEL[f.type]}${(f.value && !ICON_VALUE_SLOT.has(f.type))?(' '+f.value):''}</div>`;
  // Non-starter dice (Origin + Loot, i.e. anything that isn't a plain Basic
  // Attack/Maneuver die) show their own name, faded toward the die's own
  // color so it reads as a label rather than competing with the face symbol.
  const isNonStarter = !cell.minion && cell.die.cat!=='attack' && cell.die.cat!=='maneuver';
  const nameTag = isNonStarter ? `<div class="name-tag">${nameTagSVG(cell.die.name, idx)}</div>` : '';
  const forcedCls = cell.forcedFace ? 'forced-face' : '';
  const boostTargetCls = boostTargetIdx()===idx ? 'boost-target' : '';
  // A Combo face's damage scales with however many Hit/Combo/Shield/H.O.T./
  // D.O.T. dice currently sit next to it on the board (attackNeighborsCount
  // -- grid-adjacency, not path-adjacency, so this is true any time, path or
  // no path). Surface that
  // live, before the player ever commits a path through it: a glow around
  // the face icon that steps up through a few tiers as the neighbor count
  // (and so the eventual damage multiplier) grows, so a juiced-up Combo die
  // reads as "worth building toward" at a glance.
  const comboAdjCount = f.type==='combo' ? attackNeighborsCount(idx) : 0;
  const comboActiveCls = comboAdjCount>0 ? `combo-active combo-active-${Math.min(comboAdjCount,3)}` : '';
  return `<div class="die ${dieTypeCls} ${isBlank?'blank':''} ${inPath?'in-path':''} ${isLastMove?'undoable':''} ${clickable?'selectable':'used'} ${zoneCls} ${shakeCls} ${rippleCls} ${convertCls} ${forcedCls} ${boostTargetCls} ${resolveCls} ${minionClearCls} ${comboActiveCls}"
            data-idx="${idx}" title="${isLastMove?'Click to undo this move':(cell.minion?'Minion die':cell.die.name)}" ${shakeDelay}>
            ${num?`<div class="pathnum">${num}</div>`:''}
            ${(cell.forcedFace || boostTargetCls) ? `<div class="corner-badges">
              ${cell.forcedFace?`<span class="forced-badge ${justConverted?'badge-pop-in':''}" title="Converted by a class ability">✦</span>`:''}
              ${boostTargetCls?`<span class="boost-target-badge" title="Your armed Boost token will apply to this action">${iconSpan('boost')}</span>`:''}
            </div>` : ''}
            ${nameTag}
            ${label}
            ${resolveFx && resolveFx.text ? `<span class="delta-float ${resolveFx.cls}">${resolveFx.text}</span>` : ''}
          </div>`;
}

// Compares a health value against the last-displayed value and returns a
// flash class + a floating "+N"/"-N" for the bar, then the caller is
// responsible for updating the tracked "last" value to match.
function healthFX(current, last){
  const delta = current - (last===undefined ? current : last);
  if(!delta) return {cls:'', deltaHTML:''};
  const isHeal = delta > 0;
  const mag = Math.abs(delta);
  const shown = mag%1 ? mag.toFixed(1) : mag;
  // Bigger hits/heals get a visibly bigger, punchier number instead of a
  // uniform-size float, so a 1-damage tick and a 10-damage combo don't read
  // the same. Scales the font-size and adds a stronger "big" bounce past a
  // threshold, both purely cosmetic (position:absolute, no layout impact).
  const fontSize = Math.round(Math.min(34, 14 + mag*1.8));
  const bigCls = mag>=6 ? 'big' : '';
  return {
    cls: isHeal ? 'flash-heal' : 'flash-damage',
    deltaHTML: `<span class="delta-float ${isHeal?'heal':'damage'} ${bigCls}" style="font-size:${fontSize}px;">${isHeal?'+':'-'}${shown}</span>`
  };
}

function renderEncounterCard(e){
  const curHealthClamped = Math.max(0,e.curHealth);
  const hpPct = e.maxHealth? curHealthClamped/e.maxHealth*100 : 0;
  // Quest Health used to be spelled out as its own "X/Y remaining" line.
  // Now it's just a differently-colored slice of the health bar itself: the
  // outstanding amount a quest could still shave off, shown flush against
  // the current health level (since that's where the next point of damage,
  // quest or otherwise, would land).
  let questSegLeftPct = 0, questSegWidthPct = 0;
  if(e.maxHealth && e.questHealth!=null){
    const qhRemaining = Math.max(0, e.questHealth-(e.questDamageDealt||0));
    const questAmt = Math.min(qhRemaining, curHealthClamped);
    questSegWidthPct = questAmt/e.maxHealth*100;
    questSegLeftPct = hpPct - questSegWidthPct;
  }
  // Live preview of the currently-built (not-yet-committed) path's damage:
  // a hatched ghost slice at the leading edge of the health bar, so the
  // player can see the projected outcome before tapping Go.
  let dmgPreviewLeftPct = 0, dmgPreviewWidthPct = 0;
  if(e.maxHealth && S.path && S.path.length && S.encounter===e && !S.transitioning){
    const pathPreview = computePathEffects(S.path);
    const dmgAmt = Math.min(pathPreview.totalDamage, curHealthClamped);
    dmgPreviewWidthPct = dmgAmt/e.maxHealth*100;
    dmgPreviewLeftPct = hpPct - dmgPreviewWidthPct;
  }
  const fx = healthFX(curHealthClamped, e._lastHealth);
  e._lastHealth = curHealthClamped;
  let statuses = '';
  if(e.curDOT) statuses += `<span class="status-chip status-tooltip-target" title="D.O.T. ${e.curDOT}: ${STATUS_DESC.dot}">${iconSpan('dot', e.curDOT)} DOT</span>`;
  if(e.curHOT) statuses += `<span class="status-chip status-tooltip-target" title="H.O.T. ${e.curHOT}: ${STATUS_DESC.hot}">${iconSpan('hot', e.curHOT)} HOT</span>`;
  if(e.curShield) statuses += `<span class="status-chip status-tooltip-target" title="Shield ${e.curShield}: ${STATUS_DESC.shield}">${iconSpan('block', e.curShield)} Shield</span>`;
  if(e.minionsSpawned) statuses += `<span class="status-chip status-tooltip-target" title="Minions ${e.minionsSpawned}: ${STATUS_DESC.minions}">Minions ${e.minionsSpawned}</span>`;
  // One combined mouseover/long-press tooltip on the health bar itself,
  // listing every status currently affecting this encounter -- so a player
  // can see what Block/D.O.T./H.O.T./etc. actually do without needing a
  // separate hover per status chip.
  const statusTipLines = [];
  if(e.curDOT) statusTipLines.push(`D.O.T. ${e.curDOT}: ${STATUS_DESC.dot}`);
  if(e.curHOT) statusTipLines.push(`H.O.T. ${e.curHOT}: ${STATUS_DESC.hot}`);
  if(e.curShield) statusTipLines.push(`Shield ${e.curShield}: ${STATUS_DESC.shield}`);
  if(e.minionsSpawned) statusTipLines.push(`Minions ${e.minionsSpawned}: ${STATUS_DESC.minions}`);
  const statusTip = statusTipLines.join('\n');
  let quests = '';
  if(e.quests && e.quests.length){
    quests = '<div class="quest-list">' + e.quests.map((q,i)=>`
      <div class="quest ${e.questsDone[i]?'complete':''}">
        <span class="quest-mark">${e.questsDone[i]?'✔':'○'}</span>
        <span>${q}</span>
      </div>`).join('') + '</div>';
  }
  // A brand-new room gets a one-shot entrance flourish (see advanceRoute()
  // in logic.js) so stepping into it actually registers, instead of the
  // card just silently having different stats than a moment ago.
  const roomEnterCls = S.newRoomFx ? (S.newRoomFx.boss ? 'room-enter room-enter-boss' : 'room-enter') : '';
  const isBoss = e.type==='Boss' || e.type==='Big Boss';
  // Regular (non-boss) encounters don't cycle through one action at a time
  // like bosses do -- every listed effect fires every turn, all at once.
  // So rather than a plain gray stats line, give them the same icon-badge
  // treatment as the boss cycle row (all badges "active", since none of
  // them are held back for a future turn) -- easier to read at a glance,
  // and visually consistent between boss and regular encounter cards.
  const regularActionsRow = (!isBoss) ? (()=>{
    const items = [];
    if(e.dmg) items.push({type:'hit', label:'Hit', val:e.dmg});
    if(e.minion) items.push({type:'minion', label:'Minion', val:e.minion});
    if(e.shield) items.push({type:'block', label:'Shield', val:e.shield});
    if(e.heal) items.push({type:'heal', label:'Heal', val:e.heal});
    if(e.hot) items.push({type:'hot', label:'H.O.T.', val:e.hot});
    if(e.dot) items.push({type:'dot', label:'D.O.T.', val:e.dot});
    if(!items.length) return '';
    const chips = items.map(it=>`<span class="boss-cycle-item next enemy-action-badge" title="${enemyActionTooltip(it.type, it.val)}">${iconSpan(it.type, ICON_VALUE_SLOT.has(it.type)?it.val:null)} ${it.label}${!ICON_VALUE_SLOT.has(it.type)?' '+it.val:''}</span>`).join('');
    return `<div class="boss-cycle-row"><span class="hint" style="margin:0;">Each turn:</span>${chips}</div>`;
  })() : '';
  const art = MONSTER_ART[e.name];
  const bossCycle = (isBoss && e.actionCycle && e.actionCycle.length) ? (()=>{
    const labels = {dmg:'Hit', minion:'Minion', shield:'Shield', heal:'Heal', hot:'H.O.T.', dot:'D.O.T.'};
    const iconKey = {dmg:'hit', minion:'minion', shield:'block', heal:'heal', hot:'hot', dot:'dot'};
    const items = e.actionCycle.map((a,i)=>{
      const isNext = i === (e.cycleIndex % e.actionCycle.length);
      const showVal = ICON_VALUE_SLOT.has(iconKey[a.type]) ? null : a.value;
    return `<span class="boss-cycle-item ${isNext?'next':''} enemy-action-badge" title="${enemyActionTooltip(iconKey[a.type], a.value)}">${iconSpan(iconKey[a.type], ICON_VALUE_SLOT.has(iconKey[a.type])?a.value:null)} ${labels[a.type]}${showVal!=null?' '+showVal:''}</span>`;
    }).join('');
    return `<div class="boss-cycle-row"><span class="hint" style="margin:0;">Cycles through:</span>${items}</div>`;
  })() : '';
  return `
    <div class="enc-card ${roomEnterCls}">
      <div class="enc-header">
        <h3 class="enc-name-txt">${e.name}</h3>
        <span class="enc-type">${e.type}</span>
      </div>
      <div class="enc-card-body">
        <div class="enc-top-row">
          <div class="enc-portrait ${fx.cls==='flash-damage'?'dmg-flash':fx.cls==='flash-heal'?'heal-flash':''}">
            ${art?`<img class="enc-art" src="${art}" alt="${e.name}"/>`
              : (e.type!=='Shrine' ? `<div class="enc-art-wrap">${mysteryFigureHTML('width:70%; aspect-ratio:1/1;')}</div>` : '')}
          </div>
          <div class="enc-vitals">
            <div class="bar-row status-tooltip-target" ${statusTip?`title="${statusTip}"`:''} style="position:relative;"><span>${iconSpan('heal')}</span><div class="bar ${fx.cls}">
                <div class="bar-fill hp" style="width:${hpPct}%"></div>
                ${questSegWidthPct>0?`<div class="bar-fill quest-hp" style="left:${questSegLeftPct}%; width:${questSegWidthPct}%;" title="Quest Health remaining"></div>`:''}
                ${dmgPreviewWidthPct>0?`<div class="bar-fill dmg-preview" style="left:${dmgPreviewLeftPct}%; width:${dmgPreviewWidthPct}%;" title="Projected damage from your current path"></div>`:''}
              </div><span>${curHealthClamped.toFixed(0)}/${e.maxHealth}</span>${fx.deltaHTML}</div>
            ${isBoss ? bossCycle : regularActionsRow}
            <div class="statuses">${statuses}</div>
            ${quests}
          </div>
        </div>
        ${e.flavor?`<div class="enc-flavor">${e.flavor}</div>`:''}
      </div>
    </div>`;
}

function pathCounterHTML(){
  if(!S.path.length) return '';
  const preview = computePathEffects(S.path);
  const val = preview.totalDamage;
  // No upper cap anymore -- now that this badge lives outside .tray-wrap's
  // clipped box (see .tray-float-wrap, styles.css), it's free to keep
  // growing and spill out over the tray/card edge as the total climbs,
  // instead of maxing out small and getting visually capped at 44px.
  // Growth tapers (sqrt) past the early numbers so a 30-damage path still
  // reads big without the badge trying to outgrow the whole screen.
  const size = Math.round(22 + Math.sqrt(Math.max(val,0))*11);
  const big = val>=8;
  const extras = [];
  if(preview.healGain) extras.push(`+${preview.healGain}${iconSpan('heal')}`);
  if(preview.blockGain) extras.push(`+${preview.blockGain}${iconSpan('block')}`);
  if(preview.dotToEncounter) extras.push(`+${preview.dotToEncounter}${iconSpan('dot')}`);
  if(preview.hotToPlayer) extras.push(`+${preview.hotToPlayer}${iconSpan('hot')}`);
  if(preview.selfDot) extras.push(`+${preview.selfDot}${iconSpan('fumble')}`);
  if(preview.nullifyCount) extras.push(iconSpan('nullify'));
  if(preview.freeze) extras.push(iconSpan('freeze'));
  return `<div class="path-counter-float ${big?'pcf-big':''}">
      <span class="pcf-num" style="font-size:${size}px;">${val%1?val.toFixed(1):val}</span>
      ${extras.length?`<span class="pcf-extra">${extras.join(' ')}</span>`:''}
    </div>`;
}

function tokensRowHTML(){
  const btns = [];
  if(S.nullifyTokens>0) btns.push(`<button id="use-nullify-token">${iconSpan('nullify')} Use Nullify Token <span class="token-count">${S.nullifyTokens}</span></button>`);
  if(S.freezeTokens>0) btns.push(`<button id="use-freeze-token">${iconSpan('freeze')} Use Freeze Token <span class="token-count">${S.freezeTokens}</span></button>`);
  if(S.boostTokenCharges>0) btns.push(`<button id="use-boost-token" ${S.pendingFreeBoost?'disabled':''}>${iconSpan('boost')} Use x${S.boostTokenValue} Boost Token <span class="token-count">${S.boostTokenCharges}</span></button>`);
  if(!btns.length) return '';
  return `<div class="small-btn-row" style="margin-top:0; flex-direction:column;">${btns.join('')}</div>`;
}

function openTokensModal(){
  const overlay = openInfoModal('Use a Token', tokensRowHTML() || '<p class="hint">No tokens available.</p>');
  const nullifyBtn = overlay.querySelector('#use-nullify-token');
  if(nullifyBtn) nullifyBtn.onclick = ()=>{
    if(S.transitioning || !S.encounter || S.nullifyTokens<=0) return;
    S.nullifyTokens--;
    applyNullify();
    closeModal(overlay, render);
  };
  const freezeBtn = overlay.querySelector('#use-freeze-token');
  if(freezeBtn) freezeBtn.onclick = ()=>{
    if(S.transitioning || !S.encounter || S.freezeTokens<=0) return;
    S.freezeTokens--;
    S.freezeNext = true;
    logMsg('sys', 'Freeze token used — the encounter will skip its next action.');
    closeModal(overlay, render);
  };
  const boostBtn = overlay.querySelector('#use-boost-token');
  if(boostBtn) boostBtn.onclick = ()=>{
    if(S.transitioning || !S.encounter || S.boostTokenCharges<=0 || S.pendingFreeBoost) return;
    S.boostTokenCharges--;
    S.pendingFreeBoost = S.boostTokenValue;
    logMsg('sys', `Boost token armed — your next path action gets x${S.boostTokenValue}.`);
    closeModal(overlay, render);
  };
}

function renderGame(){
  const e = S.encounter;
  const hpPct = S.health/S.maxHealth*100;
  const canExtend = anyMoveAvailable();
  const resolveDisabled = S.path.length===0 && canExtend;
  const emphasizeResolve = !resolveDisabled && !canExtend;
  const playerFx = healthFX(S.health, S._lastPlayerHealth);
  if(playerFx.cls==='flash-damage') vibrate(40);
  S._lastPlayerHealth = S.health;
  const totalTokens = S.nullifyTokens + S.freezeTokens + S.boostTokenCharges;
  // One combined mouseover/long-press tooltip on the health bar, listing
  // every status currently affecting the player -- same idea as the
  // encounter card's health-bar tooltip.
  const playerStatusTipLines = [];
  if(S.playerDOT) playerStatusTipLines.push(`D.O.T. ${S.playerDOT}: ${STATUS_DESC.dot}`);
  if(S.playerHOT) playerStatusTipLines.push(`H.O.T. ${S.playerHOT}: ${STATUS_DESC.hot}`);
  if(S.playerBlock) playerStatusTipLines.push(`Block ${S.playerBlock}: ${STATUS_DESC.block}`);
  if(S.pendingFreeBoost) playerStatusTipLines.push(`Boost x${S.pendingFreeBoost} armed: ${STATUS_DESC.boost}`);
  const playerStatusTip = playerStatusTipLines.join('\n');
  app.innerHTML = `
    <div class="panel" style="margin-bottom:8px;">
      ${renderRoute()}
      <div class="bar-row status-tooltip-target" ${playerStatusTip?`title="${playerStatusTip}"`:''} style="position:relative;"><span style="width:70px;">Health</span><div class="bar ${playerFx.cls}"><div class="bar-fill hp player" style="width:${hpPct}%"></div></div><span>${S.health}/${S.maxHealth}</span>${playerFx.deltaHTML}</div>
      <div class="statuses">
        ${S.playerDOT?`<span class="status-chip status-tooltip-target" title="D.O.T. ${S.playerDOT}: ${STATUS_DESC.dot}">${iconSpan('dot', S.playerDOT)} DOT</span>`:''}
        ${S.playerHOT?`<span class="status-chip status-tooltip-target" title="H.O.T. ${S.playerHOT}: ${STATUS_DESC.hot}">${iconSpan('hot', S.playerHOT)} HOT</span>`:''}
        ${S.playerBlock?`<span class="status-chip status-tooltip-target" title="Block ${S.playerBlock}: ${STATUS_DESC.block}">${iconSpan('block', S.playerBlock)} Block</span>`:''}
        ${S.pendingFreeBoost?`<span class="status-chip status-tooltip-target" style="background:var(--gold);color:#241c10;" title="Boost x${S.pendingFreeBoost} armed: ${STATUS_DESC.boost}">${iconSpan('boost')} Boost x${S.pendingFreeBoost} armed</span>`:''}
      </div>
    </div>
    <div class="panel" id="enc-panel" style="margin-bottom:8px;">
      <div class="enc-rail-row">
        <div class="enc-card-col">${e?renderEncounterCard(e):'<p>No active encounter.</p>'}</div>
        <div class="util-rail">
          <div class="util-btn" id="open-key-btn">${iconSpan('key')}<span>Key</span></div>
          <div class="util-btn" id="open-backpocket-btn">${iconSpan('bag')}<span>Bag</span>${S.backPocket.length?`<span class="badge">${S.backPocket.length}</span>`:''}</div>
          <div class="util-btn" id="open-log-btn">${iconSpan('log')}<span>Log</span></div>
          <div class="util-btn ${totalTokens?'':'disabled'}" id="open-tokens-btn">${iconSpan('use')}<span>Use</span>${totalTokens?`<span class="badge">${totalTokens}</span>`:''}</div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="enc-rail-row">
        <div class="enc-card-col">
          <div class="tray-float-wrap">
            <div class="tray-wrap tray-wrap-full ${S.justScrambled?'tray-shake':''}">
              <span class="round-badge">Round ${S.turnNumber+1}</span>
              <div class="tray" id="tray"></div>
            </div>
            ${S.transitioning ? `<button class="skip-turn-btn" id="skip-transition-btn">Skip ▶</button>` : pathCounterHTML()}
          </div>
        </div>
        <div class="util-rail">
          <div class="util-btn primary-accent rail-go ${(resolveDisabled||S.transitioning)?'disabled':''} ${emphasizeResolve?'pulse':''}" id="resolve-btn">▶<span>Go</span></div>
          <div class="util-btn danger-accent rail-clear ${S.transitioning?'disabled':''} ${clearConfirmArmed?'pulse':''}" id="clear-path-btn">${iconSpan('fumble')}<span>${clearConfirmArmed?'Sure?':'Clear'}</span></div>
          ${S.klass.convertTo ? `<div class="util-btn rail-ability ${(S.classAbilityUsed||S.transitioning)?'disabled':''}" id="ability-btn">✦<span>${S.classAbilityUsed?'Used':'Skill'}</span></div>`
            : S.klass.debug ? `<div class="util-btn rail-ability ${(!S.encounter||S.transitioning)?'disabled':''}" id="debug-win-btn">✦<span>Win</span></div>` : ''}
          <div class="char-icon-wrap ${playerFx.cls==='flash-damage'?'dmg-flash':playerFx.cls==='flash-heal'?'heal-flash':''}" title="${S.origin.name} ${S.klass.name}">${(()=>{
            const portrait = S.portrait || { img: GNOME_PORTRAITS[0], placeholder:true };
            return portrait.placeholder
              ? mysteryFigureHTML('width:48px; height:48px;')
              : `<img class="char-icon-img" src="${portrait.img}" alt="${S.origin.name}">`;
          })()}</div>
        </div>
      </div>
      <div class="path-strip-col">
        <div class="path-strip" id="path-strip" style="margin-top:${S.path.length?6:0}px;"></div>
      </div>
    </div>
  `;
  document.getElementById('tray').innerHTML = S.tray.map((c,i)=>renderDie(c,i)).join('');
  if(S.newRoomFx){
    showRoomCallout(S.newRoomFx);
    playTone(S.newRoomFx.boss ? 'bossRoomEnter' : 'roomEnter');
    if(S.newRoomFx.boss) vibrate([30,40,30]);
    S.newRoomFx = null; // consumed -- plays once, on the render right after advanceRoute() set it
  }
  S.justScrambled = false;
  S.lastComboRipple = null; // consumed -- plays once, on the render right after runPlayerPathSteps() set it
  S.lastMinionClearIdx = null; // consumed -- plays once, on the render right after runPlayerPathSteps() set it
  S.justConvertedIdx = null; // consumed -- plays once, on the render right after useClassAbility() set it
  [...document.getElementById('tray').children].forEach(node=>{
    const idx = parseInt(node.dataset.idx);
    let pressTimer = null;
    let longPressed = false;
    const cancelPress = ()=>{
      if(pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
      hideFaceTooltip();
      // Leave `longPressed` as-is here: pointerup fires just before the
      // synthetic click, and the click handler is what needs to see it was
      // a long-press (to swallow the click) before it gets cleared.
    };
    node.addEventListener('pointerdown', (ev)=>{
      if(S.transitioning) return;
      longPressed = false;
      const rect = node.getBoundingClientRect();
      pressTimer = setTimeout(()=>{
        longPressed = true;
        const cell = S.tray[idx];
        if(cell.minion){
          showFaceTooltip(rect, `<strong>Minion die</strong> — clogs this space; land a Hit on it, or Leap clean over it, to clear.`);
          return;
        }
        const f = cell.forcedFace || currentFace(cell);
        showFaceTooltip(rect, `<strong>${LABEL[f.type]}${(f.value && !ICON_VALUE_SLOT.has(f.type))?' '+f.value:''}</strong> — ${FACE_DESC[f.type]||''}`);
      }, 420);
    });
    ['pointerup','pointerleave','pointercancel'].forEach(evt=> node.addEventListener(evt, cancelPress));
    node.onclick = ()=> {
      if(S.transitioning) return;
      if(longPressed){ longPressed = false; return; } // long-press consumed this interaction
      if(node.classList.contains('used') && !node.classList.contains('undoable')) return;
      toggleSelect(idx);
    };
  });
  document.getElementById('clear-path-btn').onclick = ()=>{
    if(S.transitioning) return;
    // A built-up path is a few taps of work -- require a confirming second
    // tap before discarding it, rather than wiping it on one accidental tap.
    // Nothing to lose (empty path) clears immediately, same as before.
    if(S.path.length>0 && !clearConfirmArmed){
      clearConfirmArmed = true;
      clearConfirmTimeout = setTimeout(()=>{ disarmClearConfirm(); render(); }, 2500);
      render();
      return;
    }
    disarmClearConfirm();
    S.path=[];
    S.tray.forEach(c=>delete c.forcedFace);
    S.classAbilityUsed = false;
    render();
  };
  document.getElementById('resolve-btn').onclick = ()=>{
    if(resolveDisabled||S.transitioning) return;
    getAudioCtx(); // warm up/unlock audio inside this user gesture; later queued tones (from setTimeout-driven transition steps) then play fine
    endTurnButton();
  };
  attachLongPressTooltips('.enemy-action-badge');
  attachLongPressTooltips('.status-tooltip-target');
  attachLongPressTooltips('.route-tooltip-target');
  document.getElementById('open-key-btn').onclick = ()=> openInfoModal('Action Key', keyCardHTML());
  document.getElementById('open-backpocket-btn').onclick = ()=> openInfoModal('Back Pocket', backPocketViewHTML());
  document.getElementById('open-log-btn').onclick = ()=> openInfoModal('Log', logViewHTML());
  document.getElementById('open-tokens-btn').onclick = ()=>{ if(totalTokens>0) openTokensModal(); };
  const abilityBtn = document.getElementById('ability-btn');
  if(abilityBtn) abilityBtn.onclick = ()=>{
    if(S.transitioning || S.classAbilityUsed) return;
    logMsg('sys', `Click a die in your zone to convert it.`);
    render();
    // re-attach one-shot ability click handling
    const trayEl = document.getElementById('tray');
    [...trayEl.children].forEach(node=>{
      const idx = parseInt(node.dataset.idx);
      if(inZone(idx)){
        node.style.cursor='crosshair';
        node.addEventListener('click', function handler(ev){
          ev.stopPropagation();
          useClassAbility(idx);
          node.removeEventListener('click',handler);
        }, {once:true, capture:true});
      }
    });
  };
  const debugWinBtn = document.getElementById('debug-win-btn');
  if(debugWinBtn) debugWinBtn.onclick = ()=>{
    if(!S.encounter || S.transitioning) return;
    debugWinEncounter();
  };
  document.getElementById('path-strip').innerHTML = S.path.length ?
    S.path.map((idx,n)=>{ const f=getFaceForIdx(idx); return `<span class="path-chip"><span class="chip-num">${n+1}</span>${iconSpan(f.type, f.value)} ${LABEL[f.type]}${(f.value && !ICON_VALUE_SLOT.has(f.type))?(' '+f.value):''}</span>`; }).join('')
    : '';
  if(S.transitioning){
    const skipBtn = document.getElementById('skip-transition-btn');
    if(skipBtn) skipBtn.onclick = skipTransition;
  }

  updatePathTrail();
  if(S.lootChoice) renderLootModal();
  if(S.shrineChoice) renderShrineChoiceModal();
  if(S.pendingLootDie) renderSwapModal();
}

function pickPreviewFace(dieFaces){
  const nonBlank = dieFaces.filter(f=>f.type!=='blank');
  if(!nonBlank.length) return {type:'blank'};
  return nonBlank.reduce((best,f)=> (f.value||0) > (best.value||0) ? f : best, nonBlank[0]);
}

// Long-press die-face tooltip. A fixed-position bubble anchored to the
// pressed die's on-screen position, so it never participates in layout
// (no height impact) and works on touch, unlike a native `title` attribute.
let faceTooltipEl = null;
function showFaceTooltip(anchorRect, text){
  hideFaceTooltip();
  const bubble = el(`<div class="face-tooltip">${text}</div>`);
  document.body.appendChild(bubble);
  const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
  let left = anchorRect.left + anchorRect.width/2 - bw/2;
  left = Math.max(6, Math.min(left, window.innerWidth - bw - 6));
  let top = anchorRect.top - bh - 8;
  if(top < 6) top = anchorRect.bottom + 8;
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
  requestAnimationFrame(()=> bubble.classList.add('show'));
  faceTooltipEl = bubble;
}
function hideFaceTooltip(){
  if(faceTooltipEl && faceTooltipEl.parentNode) faceTooltipEl.parentNode.removeChild(faceTooltipEl);
  faceTooltipEl = null;
}

// Long-press support for any small info badge that already carries a
// native `title` (desktop hover already works for free via the browser's
// own tooltip -- this just adds the touch equivalent, reusing the same
// fixed-position bubble as the die-face tooltip). Call after the elements
// matching `selector` exist in the DOM.
function attachLongPressTooltips(selector){
  document.querySelectorAll(selector).forEach(node=>{
    if(!node.title) return;
    let pressTimer = null;
    const start = ()=>{
      const rect = node.getBoundingClientRect();
      const text = node.title;
      pressTimer = setTimeout(()=> showFaceTooltip(rect, text), 420);
    };
    const cancel = ()=>{ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } hideFaceTooltip(); };
    node.addEventListener('pointerdown', start);
    ['pointerup','pointerleave','pointercancel'].forEach(evt=> node.addEventListener(evt, cancel));
  });
}

// Shared home for every transient overlay -- toast banners, kill callouts,
// and new-room callouts (see showToast/showKillCallout/showRoomCallout
// below) -- anchored just below the enemy's card/panel rather than each
// picking its own spot (toast used to float here already, but kill-callout
// was dead-center on the whole screen and room-callout was pasted directly
// over the dice tray -- three different places for what's really the same
// kind of "here's what just happened" moment). Recomputed on every call
// since the panel's own height changes (statuses, cycle rows, etc.), and
// this stack lives outside the templated app.innerHTML so it survives the
// re-renders that happen between toasts during per-die playback. Falls back
// to the shrine screen's bare .enc-card (no #enc-panel / dice tray there).
function ensureFxStack(){
  let stack = document.getElementById('fx-stack');
  if(!stack){
    stack = el(`<div id="fx-stack"></div>`);
    document.body.appendChild(stack);
  }
  // Pulled up to slightly overlap the bottom edge of the enemy panel
  // (rather than sitting clear below it) so it reads as closer to "right
  // there" in the gap instead of floating further down toward the tray.
  const anchor = document.getElementById('enc-panel') || document.querySelector('.enc-card');
  if(anchor) stack.style.top = `${anchor.getBoundingClientRect().bottom - 14}px`;
  return stack;
}

function showToast(text, kind){
  const stack = ensureFxStack();
  const toast = el(`<div class="toast${kind ? ' toast-'+kind : ''}">${text}</div>`);
  stack.appendChild(toast);
  // The sweep-in/hold/sweep-out is now all one CSS animation (toast-sweep,
  // styles.css) instead of a separate fade-in then fade-out pair of timers,
  // so this just needs to clean the node up once that animation has run.
  setTimeout(()=>{ if(toast.parentNode) toast.parentNode.removeChild(toast); }, 1150);
}

// ---- Kill callout: a brief banner for the two kill moments worth
// distinguishing from an ordinary win -- a Boss/Big Boss going down, and an
// Overkill -- so they register as they happen instead of only as a status
// chip on the loot screen afterward. `lines` is an array of {text, cls}
// (cls picks the visual treatment: 'boss' or 'overkill', plus optional
// 'sub' on a second line so it pops in slightly after the first). Lives in
// the shared #fx-stack (see ensureFxStack() above) rather than its own
// dead-center overlay, so it reads as part of the same "what just happened"
// strip as toasts and room callouts. Purely additive on top of whatever
// renders next (the loot modal, typically). ----
function showKillCallout(lines){
  const stack = ensureFxStack();
  const old = document.getElementById('kill-callout');
  if(old && old.parentNode) old.parentNode.removeChild(old);
  const node = el(`<div id="kill-callout">${lines.map(l=>
    `<div class="kill-callout-line ${l.cls}">${l.text}</div>`).join('')}</div>`);
  stack.appendChild(node);
  setTimeout(()=>{ if(node.parentNode) node.parentNode.removeChild(node); }, 1400);
}

// ---- Room callout: a banner naming whatever's just been stepped into (a
// regular encounter, a boss, or a shrine), now living in the same shared
// #fx-stack as toasts/kill-callouts (the gap between the enemy panel and
// the dice tray) instead of being pasted directly over the tray. It still
// needs to block the board until it's read -- a separate, fully
// transparent #room-callout-scrim covers the whole screen and catches a
// tap anywhere to dismiss it, so the "can't act yet" behavior is unchanged
// even though the banner no longer visually darkens the tray itself. Stays
// up until tapped (rather than timing itself out), so it can't slip by
// unread. Triggered once per room by renderGame()/renderShrineEncounter()
// off the one-shot S.newRoomFx flag set in advanceRoute() (logic.js). ----
function showRoomCallout(fx, onDismiss){
  const old = document.getElementById('room-callout');
  if(old && old.parentNode) old.parentNode.removeChild(old);
  const oldScrim = document.getElementById('room-callout-scrim');
  if(oldScrim && oldScrim.parentNode) oldScrim.parentNode.removeChild(oldScrim);
  const stack = ensureFxStack();
  const mainCls = fx.boss ? 'main boss' : 'main';
  const mainText = fx.boss ? 'Boss Encounter' : 'A new room...';
  const node = el(`<div id="room-callout">
      <div class="room-callout-box">
        <div class="room-callout-line ${mainCls}">${mainText}</div>
        <div class="room-callout-line sub">${fx.name} · ${fx.type}</div>
        <div class="room-callout-line hint">Tap to continue</div>
      </div>
    </div>`);
  const scrim = el(`<div id="room-callout-scrim"></div>`);
  document.body.appendChild(scrim);
  stack.appendChild(node);
  const dismiss = ()=>{
    if(scrim.parentNode) scrim.parentNode.removeChild(scrim);
    // When there's a follow-up (e.g. a Shrine revealing its boon), run it
    // right away -- it calls render() itself, but this node now lives
    // outside the templated app.innerHTML (in #fx-stack), so render()
    // rebuilding the panel no longer removes it along with it -- remove it
    // explicitly before handing off, and skip the fade-out in that case.
    if(onDismiss){ if(node.parentNode) node.parentNode.removeChild(node); onDismiss(); return; }
    node.classList.add('dismissing');
    setTimeout(()=>{ if(node.parentNode) node.parentNode.removeChild(node); }, 200);
  };
  node.addEventListener('click', dismiss);
  scrim.addEventListener('click', dismiss);
}

// ---- Sound effects: short generated tones via Web Audio, no external
// audio assets. The AudioContext is created lazily and only ever actually
// started from inside a real user-gesture handler (the resolve-btn click,
// or toggling the Sound checkbox itself) to satisfy browser autoplay
// policies; once created it stays alive for the rest of the session, so
// later tones queued from setTimeout-driven turn-transition steps still
// play fine. ----
let audioCtx = null;
function getAudioCtx(){
  if(!PREFS.sound) return null;
  if(!audioCtx){
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if(!Ctor) return null;
    try{ audioCtx = new Ctor(); }catch(e){ return null; }
  }
  if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{});
  return audioCtx;
}
const TONE_SEQUENCES = {
  // A sword-slash instead of a flat blip: a bright, fast downward sweep
  // (the "swish" of the blade) with sharp metallic ping layered right on
  // top of its tail (the "clang" of it landing) -- see playTone()'s
  // freqTo handling for the sweep.
  hit:       [{freq:1400, freqTo:140, start:0,    dur:0.1,  type:'sawtooth', gain:0.2},
              {freq:1800,             start:0.045,dur:0.05, type:'square',   gain:0.14}],
  heal:      [{freq:520, start:0,    dur:0.12, type:'sine',     gain:0.14},
              {freq:660, start:0.09, dur:0.16, type:'sine',     gain:0.14}],
  victory:   [{freq:392, start:0,    dur:0.14, type:'triangle', gain:0.2},
              {freq:494, start:0.13, dur:0.14, type:'triangle', gain:0.2},
              {freq:587, start:0.26, dur:0.14, type:'triangle', gain:0.2},
              {freq:784, start:0.39, dur:0.32, type:'triangle', gain:0.22}],
  defeat:    [{freq:220, start:0,    dur:0.2,  type:'sawtooth', gain:0.16},
              {freq:160, start:0.18, dur:0.34, type:'sawtooth', gain:0.16}],
  heartbeat: [{freq:80,  start:0,    dur:0.1,  type:'sine',     gain:0.24},
              {freq:70,  start:0.16, dur:0.12, type:'sine',     gain:0.2}],
  // A short rising fanfare for a Boss/Big Boss kill -- bigger than the flat
  // one-note 'hit' tone every regular kill would otherwise share, but
  // shorter than the full 4-note 'victory' sting reserved for winning the
  // whole run.
  bossKill:  [{freq:294, start:0,    dur:0.12, type:'triangle', gain:0.22},
              {freq:392, start:0.11, dur:0.12, type:'triangle', gain:0.22},
              {freq:523, start:0.22, dur:0.30, type:'triangle', gain:0.24}],
  // A light, bright two-note chime for winning a plain (non-Boss,
  // non-Overkill) encounter -- every kill now gets a distinct "you won"
  // cue of its own, instead of only the per-die 'hit' sound from whichever
  // die happened to land the final blow.
  encounterKill: [{freq:587, start:0,    dur:0.1,  type:'square',   gain:0.16},
                  {freq:880, start:0.08, dur:0.16, type:'triangle', gain:0.18}],
  // A sharp thump+ding "crunch" for an Overkill -- distinct from a normal
  // kill so the bonus-loot-option moment actually registers as it happens,
  // not just as a chip on the next screen.
  overkill:  [{freq:150, start:0,    dur:0.08, type:'sawtooth', gain:0.22},
              {freq:900, start:0.02, dur:0.06, type:'square',   gain:0.16},
              {freq:1300,start:0.09, dur:0.14, type:'square',   gain:0.16}],
  // A short "door creaks open" cue for stepping into a new room -- a soft
  // rising two-note knock, quieter and gentler than any combat tone so it
  // doesn't compete with the hit/heal sounds that start firing a moment
  // later once the fight actually begins.
  roomEnter: [{freq:246, start:0,    dur:0.1,  type:'sine',     gain:0.14},
              {freq:330, start:0.09, dur:0.16, type:'sine',     gain:0.16}],
  // A heavier, ominous version for a Boss room -- lower and a touch longer,
  // so it reads as a step up in stakes rather than just another door.
  bossRoomEnter: [{freq:110, start:0,    dur:0.16, type:'sawtooth', gain:0.18},
                  {freq:147, start:0.14, dur:0.28, type:'sawtooth', gain:0.2}],
  // Per-die turn-resolution tones (see describeStepFx()/playStepTone()) --
  // a short clink for Block, a light ping for a status effect (D.O.T.,
  // Nullify, Freeze, Boost) -- distinct from 'hit'/'heal' so each kind of
  // die reads as a different sound while a path plays back one at a time.
  block:  [{freq:200, start:0, dur:0.07, type:'square', gain:0.16}],
  status: [{freq:660, start:0, dur:0.08, type:'sine',   gain:0.14}],
  // A bright little "ka-ching" for equipping a new Loot die into the tray
  // (swapInLootDie(), logic.js) -- the moment a run's reward actually pays
  // off, distinct from the plain 'hit'/'heal' combat tones.
  equip:   [{freq:660, start:0,    dur:0.08, type:'square',   gain:0.16},
            {freq:880, start:0.07, dur:0.1,  type:'square',   gain:0.18},
            {freq:1175,start:0.16, dur:0.18, type:'triangle', gain:0.2}],
  // A short ascending sparkle for reaching a new Floor -- celebratory, not
  // combat-weighted, so it reads as "level up" rather than another kill.
  floorUp: [{freq:392, start:0,    dur:0.12, type:'triangle', gain:0.2},
            {freq:523, start:0.1,  dur:0.12, type:'triangle', gain:0.2},
            {freq:659, start:0.2,  dur:0.26, type:'triangle', gain:0.22}],
  // A soft magical chime for a Shrine actually granting its blessing --
  // gentle high sine notes, deliberately quieter/softer than any combat or
  // reward tone so a Shrine visit reads as a calm moment, not another hit.
  blessing: [{freq:784,  start:0,    dur:0.18, type:'sine', gain:0.12},
             {freq:988,  start:0.12, dur:0.18, type:'sine', gain:0.12},
             {freq:1319, start:0.26, dur:0.3,  type:'sine', gain:0.14}],
  // A bigger, grander flourish for clearing the whole dungeon, replacing
  // the plain 'victory' sting -- plays alongside the new confetti burst as
  // the Victory screen first appears.
  grandVictory: [{freq:523, start:0,    dur:0.16, type:'triangle', gain:0.22},
                 {freq:659, start:0.14, dur:0.16, type:'triangle', gain:0.22},
                 {freq:784, start:0.28, dur:0.16, type:'triangle', gain:0.22},
                 {freq:1047,start:0.42, dur:0.45, type:'triangle', gain:0.26}],
};
function playTone(kind, pitchStep){
  if(!PREFS.sound) return;
  const ctx = getAudioCtx();
  if(!ctx) return;
  const notes = TONE_SEQUENCES[kind];
  if(!notes) return;
  const now = ctx.currentTime;
  // Each step raises the pitch by 1.5 semitones, capped at 10 steps so a
  // long combo climbs noticeably without ever shrieking into ultrasonic
  // territory. Used for the per-die 'hit' sword tone (see playStepTone()
  // in logic.js) -- every other caller passes no step and plays at its
  // normal fixed pitch.
  const pitchMult = pitchStep ? Math.pow(2, Math.min(pitchStep,10)*1.5/12) : 1;
  notes.forEach(n=>{
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type;
    osc.frequency.setValueAtTime(n.freq*pitchMult, now+n.start);
    // Optional downward/upward sweep (e.g. the sword-slash "swish" in
    // 'hit') -- exponentialRamp can't target 0, so freqTo is assumed >0.
    if(n.freqTo) osc.frequency.exponentialRampToValueAtTime(n.freqTo*pitchMult, now+n.start+n.dur);
    gain.gain.setValueAtTime(0.0001, now+n.start);
    gain.gain.linearRampToValueAtTime(n.gain, now+n.start+0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now+n.start+n.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now+n.start);
    osc.stop(now+n.start+n.dur+0.02);
  });
}

// A tray scramble gets its own noise-based rattle rather than another
// TONE_SEQUENCES oscillator entry -- a handful of short bandpass-filtered
// noise bursts at randomized pitch/timing reads as actual dice tumbling and
// knocking together, which a clean sine/square blip never could. Trails off
// in both timing and volume like real dice settling after a throw.
// Builds and schedules a single short decaying-noise burst through a
// bandpass/lowpass/highpass filter -- the shared building block behind both
// the dice-rattle and the player-hit crash below, since neither reads
// convincingly from pure oscillator tones the way TONE_SEQUENCES handles
// everything else.
function playNoiseBurst(ctx, startTime, dur, gainPeak, filterType, filterFreq, filterQ){
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate*dur));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let j=0;j<bufferSize;j++) data[j] = (Math.random()*2-1) * Math.pow(1-j/bufferSize, 1.5);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  if(filterQ!=null) filter.Q.value = filterQ;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainPeak, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime+dur);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(startTime);
  src.stop(startTime+dur+0.01);
}

// A handful of dice tumbling: a soft low rumble bed (several dice sliding/
// knocking together) under a cluster of short, irregularly-timed knocks at
// varied pitch -- irregular gaps and per-knock randomness read as several
// loose objects colliding, where evenly-spaced identical clicks read as a
// machine. Knocks taper off in both volume and spacing as they "settle".
function playDiceRollSound(){
  if(!PREFS.sound) return;
  const ctx = getAudioCtx();
  if(!ctx) return;
  const now = ctx.currentTime;
  playNoiseBurst(ctx, now, 0.3, 0.13, 'lowpass', 1200);
  const hits = 11;
  let t = 0;
  for(let i=0;i<hits;i++){
    const progress = i/hits;
    t += 0.018 + Math.random()*0.03*(1-progress*0.5); // gaps tighten slightly as the dice settle
    const dur = 0.022 + Math.random()*0.025;
    const g = 0.32 * (1-progress*0.65) * (0.75+Math.random()*0.5);
    playNoiseBurst(ctx, now+t, dur, g, 'bandpass', 900+Math.random()*1800, 1+Math.random()*0.8);
  }
}

// A sharp, broadband noise "crash" (the breaking/clattering sound of a real
// impact) layered over a low pitch-dropping thump for weight -- carries
// more visceral punch than an oscillator tone alone, and stays pitched well
// below the enemy-facing sword-slash 'hit' tone so the two don't blur.
function playPlayerHitSound(){
  if(!PREFS.sound) return;
  const ctx = getAudioCtx();
  if(!ctx) return;
  const now = ctx.currentTime;
  playNoiseBurst(ctx, now, 0.22, 0.38, 'highpass', 650);
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(55, now+0.16);
  oscGain.gain.setValueAtTime(0.0001, now);
  oscGain.gain.linearRampToValueAtTime(0.26, now+0.01);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now+0.18);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now+0.2);
}

// ---- Haptics: a short vibrate on mobile when taking damage or crossing
// into the low-health danger zone. Silently no-ops where unsupported. ----
function vibrate(pattern){
  try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
}

function applyReducedMotionClass(){
  document.body.classList.toggle('reduced-motion', !!PREFS.reducedMotion);
}

// ---- Screen shake: a brief full-viewport shake for the two biggest combat
// moments (Boss kill, Overkill), layered on top of the existing kill-callout
// banner/sound so the impact registers physically, not just visually.
// Re-triggerable back-to-back (forced reflow) since a Boss kill that's also
// an Overkill fires this once at 'big' only -- see onEncounterDefeated.
function screenShake(intensity){
  if(PREFS.reducedMotion) return;
  const wrap = document.querySelector('.wrap');
  if(!wrap) return;
  wrap.classList.remove('screen-shake-big','screen-shake-small');
  void wrap.offsetWidth; // force reflow so re-adding the class restarts the animation
  wrap.classList.add(intensity==='big' ? 'screen-shake-big' : 'screen-shake-small');
}

// ---- Particle burst: a quick radial confetti-style burst of small colored
// chips from a screen point. Pure CSS-transition driven -- each chip is a
// positioned div given a random fly-out vector via custom properties, then
// removed from the DOM once its animation ends.
function spawnParticleBurst(x, y, palette){
  if(PREFS.reducedMotion) return;
  let layer = document.getElementById('particle-layer');
  if(!layer){
    layer = document.createElement('div');
    layer.id = 'particle-layer';
    document.body.appendChild(layer);
  }
  const n = 16;
  for(let i=0;i<n;i++){
    const chip = document.createElement('div');
    chip.className = 'particle-chip';
    const angle = (Math.PI*2*i/n) + Math.random()*0.4;
    const dist = 40 + Math.random()*55;
    const dx = Math.cos(angle)*dist, dy = Math.sin(angle)*dist;
    chip.style.left = x+'px'; chip.style.top = y+'px';
    chip.style.background = palette[i % palette.length];
    chip.style.setProperty('--dx', dx+'px');
    chip.style.setProperty('--dy', dy+'px');
    chip.style.setProperty('--rot', (Math.random()*360-180)+'deg');
    layer.appendChild(chip);
    chip.addEventListener('animationend', ()=> chip.remove());
  }
}

// Anchors a particle burst to wherever the encounter's portrait currently
// sits on screen -- called from onEncounterDefeated (logic.js) before
// render() swaps that portrait out for the loot screen, so the element is
// still there to measure.
function spawnParticleBurstAtPortrait(palette){
  const portrait = document.querySelector('.enc-portrait');
  if(!portrait) return;
  const r = portrait.getBoundingClientRect();
  spawnParticleBurst(r.left+r.width/2, r.top+r.height/2, palette);
}

// Same idea, anchored to an arbitrary element's center -- for juice moments
// that aren't tied to the encounter portrait (equipping a Loot die, a Floor
// transition). Falls back to the viewport center if the element isn't
// found, so a selector miss never throws.
function spawnParticleBurstAtEl(selector, palette){
  const node = document.querySelector(selector);
  const r = node ? node.getBoundingClientRect() : {left:window.innerWidth/2, top:window.innerHeight/2, width:0, height:0};
  spawnParticleBurst(r.left+r.width/2, r.top+r.height/2, palette);
}

// ---- Confetti rain: a bigger, longer, whole-screen celebration reserved
// for the one moment in the game that deserves it -- clearing the whole
// dungeon. Pieces fall from above the viewport with random horizontal
// drift/rotation/timing, over ~2-3s, vs. the quick radial burst used for
// every other juice moment (equip, floor-up, Boss kill, Overkill).
function spawnConfettiRain(){
  if(PREFS.reducedMotion) return;
  let layer = document.getElementById('particle-layer');
  if(!layer){
    layer = document.createElement('div');
    layer.id = 'particle-layer';
    document.body.appendChild(layer);
  }
  const palette = ['#ffd76a','#ff8a3d','#8fd0ff','#9affa0','#ff6ad5','#fff5d6'];
  const n = 50;
  for(let i=0;i<n;i++){
    const chip = document.createElement('div');
    chip.className = 'confetti-chip';
    chip.style.left = (Math.random()*window.innerWidth)+'px';
    chip.style.background = palette[i % palette.length];
    chip.style.animationDelay = (Math.random()*0.6)+'s';
    chip.style.animationDuration = (1.8 + Math.random()*1.2)+'s';
    chip.style.setProperty('--drift', (Math.random()*160-80)+'px');
    chip.style.setProperty('--rot', (Math.random()*720-360)+'deg');
    layer.appendChild(chip);
    chip.addEventListener('animationend', ()=> chip.remove());
  }
}

function settingsToggleRowHTML(id, label, checked){
  return `<label class="settings-toggle-row" for="${id}">
      <span>${label}</span>
      <input type="checkbox" id="${id}" ${checked?'checked':''}>
    </label>`;
}

function openSettingsModal(){
  const inRun = !!S;
  const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center; max-width:340px;">
      <button class="modal-x-btn" id="settings-x-btn" title="Close">✕</button>
      <h2 style="margin-top:0;">Settings</h2>
      ${inRun ? `<p class="hint">${S.origin.name} ${S.klass.name} · Floor ${S.floorIdx+1}</p>` : ''}
      <div class="settings-toggles">
        ${settingsToggleRowHTML('pref-sound', 'Sound effects', PREFS.sound)}
        ${settingsToggleRowHTML('pref-reduced-motion', 'Reduce motion', PREFS.reducedMotion)}
      </div>
      <p class="hint" style="text-align:left;">Keyboard: <strong>Enter</strong> Go &middot; <strong>Backspace</strong> Clear &middot; <strong>1234/qwer/asdf/zxcv</strong> tap a tray die (matches its grid position)</p>
      <div class="small-btn-row" style="justify-content:center; flex-direction:column;">
        <button id="settings-how-to-play-btn">How to Play</button>
        <button id="settings-run-history-btn">Run History</button>
        <button id="settings-achievements-btn">Achievements</button>
        <button id="settings-dice-compendium-btn">Dice Compendium</button>
        ${inRun ? '<button id="settings-restart-btn" class="danger">Restart Run</button>' : ''}
        <button id="settings-reset-progress-btn" class="danger">Reset Progress</button>
        <button id="settings-close-btn">Close</button>
      </div>
      <p class="hint" style="margin:10px 0 0;">v${GAME_VERSION}</p>
    </div></div>`);
  openModal(overlay);
  const close = ()=> closeModal(overlay);
  overlay.querySelector('#settings-x-btn').onclick = close;
  overlay.querySelector('#settings-close-btn').onclick = close;
  overlay.querySelector('#settings-how-to-play-btn').onclick = ()=>{ close(); openTutorialModal(0); };
  overlay.querySelector('#settings-run-history-btn').onclick = ()=>{ close(); openRunHistoryModal(); };
  overlay.querySelector('#settings-achievements-btn').onclick = ()=>{ close(); openAchievementsModal(); };
  overlay.querySelector('#settings-dice-compendium-btn').onclick = ()=>{ close(); openDiceCompendiumModal(); };
  overlay.onclick = (ev)=>{ if(ev.target===overlay) close(); };
  overlay.querySelector('#pref-sound').onchange = (ev)=>{ setPref('sound', ev.target.checked); if(ev.target.checked) playTone('hit'); };
  overlay.querySelector('#pref-reduced-motion').onchange = (ev)=> setPref('reducedMotion', ev.target.checked);
  const restartBtn = overlay.querySelector('#settings-restart-btn');
  if(restartBtn) restartBtn.onclick = ()=>{
    close();
    const confirmOverlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center;">
        <h2>Restart Run?</h2>
        <p>Your current run (Floor ${S.floorIdx+1}, ${S.health}/${S.maxHealth} HP) will be lost.</p>
        <div class="small-btn-row" style="justify-content:center;">
          <button id="confirm-restart-cancel">Keep Playing</button>
          <button class="danger" id="confirm-restart-go">Restart Run</button>
        </div>
      </div></div>`);
    openModal(confirmOverlay);
    confirmOverlay.querySelector('#confirm-restart-cancel').onclick = ()=> closeModal(confirmOverlay);
    confirmOverlay.querySelector('#confirm-restart-go').onclick = ()=>{ clearSave(); location.reload(); };
    confirmOverlay.onclick = (ev)=>{ if(ev.target===confirmOverlay) closeModal(confirmOverlay); };
  };
  // Reset Progress: wipes lifetime stats, Achievements, the Dice
  // Compendium's discovered set, and Run History (resetAllProgress(),
  // logic.js) so a player can play back through the whole unlock curve --
  // locked Origins, Starting Boon tiers, everything -- from scratch. Only
  // sound/reduced-motion prefs and the tutorial-seen flag survive it.
  overlay.querySelector('#settings-reset-progress-btn').onclick = ()=>{
    close();
    const confirmOverlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center;">
        <h2>Reset Progress?</h2>
        <p>This permanently erases your lifetime stats, Achievements, Dice Compendium discoveries, and Run History -- locked Origins and Starting Boon tiers go back to locked. Sound and motion settings are kept.${inRun ? ' Your current run will also be lost.' : ''}</p>
        <div class="small-btn-row" style="justify-content:center;">
          <button id="confirm-reset-cancel">Cancel</button>
          <button class="danger" id="confirm-reset-go">Reset Progress</button>
        </div>
      </div></div>`);
    openModal(confirmOverlay);
    confirmOverlay.querySelector('#confirm-reset-cancel').onclick = ()=> closeModal(confirmOverlay);
    confirmOverlay.querySelector('#confirm-reset-go').onclick = ()=>{ resetAllProgress(); location.reload(); };
    confirmOverlay.onclick = (ev)=>{ if(ev.target===confirmOverlay) closeModal(confirmOverlay); };
  };
  return overlay;
}

// The first-run walkthrough (TUTORIAL_STEPS, data.js). Re-entrant: called
// with a step index so "How to Play" in Settings can replay it any time,
// not just on a new player's very first game. Re-renders in place (rather
// than closing/reopening a new overlay) so Prev/Next feels like one modal
// paging through, not a stack of separate popups.
function openTutorialModal(stepIdx){
  const n = TUTORIAL_STEPS.length;
  const step = TUTORIAL_STEPS[stepIdx];
  const dots = TUTORIAL_STEPS.map((_,i)=>`<span class="tutorial-dot ${i===stepIdx?'active':''}"></span>`).join('');
  const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center; max-width:360px;">
      <h2 style="margin-top:0;">${step.title}</h2>
      <p>${step.body}</p>
      <div class="tutorial-dots">${dots}</div>
      <div class="small-btn-row" style="justify-content:center;">
        ${stepIdx>0 ? '<button id="tutorial-prev-btn">Back</button>' : ''}
        <button class="primary" id="tutorial-next-btn">${stepIdx<n-1?'Next':'Got it'}</button>
      </div>
    </div></div>`);
  openUniqueOverlay('tutorial', overlay);
  const closeAndAdvance = (next)=>{
    closeModal(overlay, ()=>{ if(next!=null) openTutorialModal(next); });
  };
  const prevBtn = overlay.querySelector('#tutorial-prev-btn');
  if(prevBtn) prevBtn.onclick = ()=> closeAndAdvance(stepIdx-1);
  overlay.querySelector('#tutorial-next-btn').onclick = ()=> closeAndAdvance(stepIdx<n-1 ? stepIdx+1 : null);
  overlay.onclick = (ev)=>{ if(ev.target===overlay) closeAndAdvance(null); };
}

// A persisted log of past runs (see recordRunHistory/getRunHistory in
// logic.js), reachable any time from Settings -- including from the
// Victory/Game Over screens, since the settings gear lives outside #app.
function openRunHistoryModal(){
  const history = getRunHistory();
  const victories = history.filter(r=>r.outcome==='victory');
  const fastest = victories.length ? Math.min(...victories.map(r=>r.turnsTaken)) : null;
  const summary = history.length
    ? `<div class="statuses" style="justify-content:center; margin-bottom:10px;">
        <span class="status-chip">Runs: ${history.length}</span>
        <span class="status-chip">Victories: ${victories.length}</span>
        ${fastest!=null ? `<span class="status-chip">Fastest clear: ${fastest} turns</span>` : ''}
      </div>`
    : '';
  const rows = history.length ? history.map(r=>{
    const dateStr = new Date(r.date).toLocaleDateString(undefined, {month:'short', day:'numeric'});
    return `<div class="run-history-row ${r.outcome}">
        <span class="run-history-outcome">${r.outcome==='victory' ? '✔' : '✕'}</span>
        <div class="run-history-main">
          <div class="run-history-who">${r.charName?`${r.charName} the `:''}${r.origin} ${r.klass}</div>
          <div class="run-history-detail">Floor ${r.floorReached}/3 &middot; ${r.turnsTaken} turns &middot; ${r.damageDealt} dmg &middot; ${r.overkills} overkill${r.overkills===1?'':'s'}</div>
        </div>
        <span class="run-history-date">${dateStr}</span>
      </div>`;
  }).join('') : `<p class="hint">No runs recorded yet -- finish a run to see it here.</p>`;
  const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center; max-width:400px;">
      <button class="modal-x-btn" id="run-history-x-btn" title="Close">✕</button>
      <h2 style="margin-top:0;">Run History</h2>
      ${summary}
      <div class="run-history-list">${rows}</div>
      <div class="small-btn-row" style="justify-content:center;">
        ${history.length ? '<button id="run-history-clear-btn" class="danger">Clear History</button>' : ''}
        <button class="primary" id="run-history-close-btn">Close</button>
      </div>
    </div></div>`);
  openModal(overlay);
  const close = ()=> closeModal(overlay);
  overlay.querySelector('#run-history-x-btn').onclick = close;
  overlay.querySelector('#run-history-close-btn').onclick = close;
  overlay.onclick = (ev)=>{ if(ev.target===overlay) close(); };
  const clearBtn = overlay.querySelector('#run-history-clear-btn');
  if(clearBtn) clearBtn.onclick = ()=>{ clearRunHistory(); closeModal(overlay, openRunHistoryModal); };
}

// Lifetime Achievements (ACHIEVEMENTS, logic.js) -- locked entries show
// greyed-out with just name+desc; unlocked entries show the date earned.
// Reachable from Settings at any time (not just post-run), same as Run
// History and the Dice Compendium.
function openAchievementsModal(){
  const unlockedCount = ACHIEVEMENTS.filter(a=>META.achievements[a.id]).length;
  const rows = ACHIEVEMENTS.map(a=>{
    const unlocked = META.achievements[a.id];
    const dateStr = unlocked ? new Date(unlocked.date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '';
    return `<div class="achv-row ${unlocked?'unlocked':'locked'}">
        <span class="achv-row-icon">${unlocked?'✦':lockSVG(16)}</span>
        <div class="achv-row-main">
          <div class="run-history-who">${a.name}</div>
          <div class="run-history-detail">${a.desc}</div>
        </div>
        ${unlocked ? `<span class="run-history-date">${dateStr}</span>` : ''}
      </div>`;
  }).join('');
  const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center; max-width:400px;">
      <button class="modal-x-btn" id="achv-x-btn" title="Close">✕</button>
      <h2 style="margin-top:0;">Achievements</h2>
      <div class="statuses" style="justify-content:center; margin-bottom:10px;">
        <span class="status-chip">${unlockedCount}/${ACHIEVEMENTS.length} unlocked</span>
      </div>
      <div class="run-history-list">${rows}</div>
      <div class="small-btn-row" style="justify-content:center;">
        <button class="primary" id="achv-close-btn">Close</button>
      </div>
    </div></div>`);
  openModal(overlay);
  const close = ()=> closeModal(overlay);
  overlay.querySelector('#achv-x-btn').onclick = close;
  overlay.querySelector('#achv-close-btn').onclick = close;
  overlay.onclick = (ev)=>{ if(ev.target===overlay) close(); };
}

// A browsable library of every Loot Die in the game (Alloy/Gilded/Magic),
// reachable from Settings. Illustrated dice (LOOT_ART, assets.js) show
// their art; the rest just show their faces -- art coverage is being
// filled in gradually, so no placeholder-watermark spam for the ones that
// don't have it yet (unlike the encounter portraits, which are shown one
// at a time and can afford a loud PLACEHOLDER banner).
function openDiceCompendiumModal(){
  const tiers = [
    {label:'Alloy', pool:ALLOY},
    {label:'Gilded', pool:GILDED},
    {label:'Magic', pool:MAGIC},
  ];
  const totalArt = tiers.reduce((n,t)=>n + t.pool.filter(d=>LOOT_ART[d.name]).length, 0);
  const totalDice = tiers.reduce((n,t)=>n + t.pool.length, 0);
  const discoveredCount = tiers.reduce((n,t)=>n + t.pool.filter(d=>DISCOVERED_DICE.has(d.name)).length, 0);
  const sections = tiers.map(t=>{
    const rows = t.pool.map((d,i)=>{
      const discovered = DISCOVERED_DICE.has(d.name);
      if(!discovered){
        // Spoiler-free until the player has actually found this die in a
        // playthrough -- show that an entry exists without giving away its
        // name, art or faces.
        return `<div class="compendium-row compendium-row-locked">
            <div class="compendium-thumb compendium-thumb-placeholder">${lockSVG(16)}</div>
            <div class="compendium-main">
              <div class="run-history-who">???</div>
              <div class="compendium-faces hint">Find this die in a run to reveal it.</div>
            </div>
          </div>`;
      }
      const art = LOOT_ART[d.name];
      const thumb = art
        ? `<img class="compendium-thumb" src="${art}" alt="${d.name}"/>`
        : `<div class="compendium-thumb compendium-thumb-placeholder"></div>`;
      const facesHTML = d.faces.map(f=>`<span>${iconSpan(f.type, f.value)}</span>`).join('');
      return `<div class="compendium-row">
          ${thumb}
          <div class="compendium-main">
            <div class="run-history-who">${d.name}</div>
            <div class="compendium-faces">${facesHTML}</div>
          </div>
        </div>`;
    }).join('');
    return `<div class="compendium-tier">
        <div class="camp-section-title" style="font-weight:800;">${t.label} Dice</div>
        <div class="compendium-list">${rows}</div>
      </div>`;
  }).join('');
  const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center; max-width:420px;">
      <button class="modal-x-btn" id="compendium-x-btn" title="Close">✕</button>
      <h2 style="margin-top:0;">Dice Compendium</h2>
      <p class="hint">${discoveredCount}/${totalDice} found &middot; ${totalArt}/${totalDice} illustrated.</p>
      ${sections}
      <div class="small-btn-row" style="justify-content:center;">
        <button class="primary" id="compendium-close-btn">Close</button>
      </div>
    </div></div>`);
  openModal(overlay);
  const close = ()=> closeModal(overlay);
  overlay.querySelector('#compendium-x-btn').onclick = close;
  overlay.querySelector('#compendium-close-btn').onclick = close;
  overlay.onclick = (ev)=>{ if(ev.target===overlay) close(); };
}

function openInfoModal(title, bodyHTML){
  const overlay = el(`<div class="modal-overlay"><div class="modal">
      <button class="modal-x-btn" id="close-info-modal" title="Close">✕</button>
      <h2>${title}</h2>
      <div id="info-modal-body">${bodyHTML}</div>
    </div></div>`);
  openModal(overlay);
  overlay.querySelector('#close-info-modal').onclick = ()=> closeModal(overlay);
  overlay.onclick = (ev)=>{ if(ev.target===overlay) closeModal(overlay); };
  return overlay;
}

function keyCardHTML(){
  return `
    <div class="key-card" style="margin-top:0;">
      <div class="key-grid">
        <div class="key-item blk-maneuver" style="grid-column:1;grid-row:1;" title="Next move: diagonal only"><span class="key-icon">${iconSpan('dodge')}</span><span class="key-label">Dodge</span></div>
        <div class="key-item blk-maneuver" style="grid-column:1;grid-row:2;" title="Next move: skip one, same direction -- clears a Minion jumped clean over"><span class="key-icon">${iconSpan('leap')}</span><span class="key-label">Leap</span></div>
        <div class="key-item blk-maneuver" style="grid-column:1;grid-row:3;" title="Next move: adjacent or diagonal"><span class="key-icon">${iconSpan('pivot')}</span><span class="key-label">Pivot</span></div>

        <div class="key-item blk-attack" style="grid-column:2;grid-row:1;" title="Deal damage equal to the Action Value"><span class="key-icon">${iconSpan('hit')}</span><span class="key-label">Hit</span></div>
        <div class="key-item blk-attack" style="grid-column:3;grid-row:1;" title="Damage + 1x per adjacent Hit, Combo, Shield, H.O.T. or D.O.T. die"><span class="key-icon">${iconSpan('combo')}</span><span class="key-label">Combo</span></div>
        <div class="key-item blk-attack" style="grid-column:2;grid-row:2;" title="Damage over time, ticks each Encounter Upkeep"><span class="key-icon">${iconSpan('dot')}</span><span class="key-label">D.O.T.</span></div>
        <div class="key-item blk-attack" style="grid-column:3;grid-row:2;" title="D.O.T. to the encounter + H.O.T. to you"><span class="key-icon">${iconSpan('leech')}</span><span class="key-label">Leech</span></div>

        <div class="key-item blk-support" style="grid-column:4;grid-row:1;" title="Multiplies the next Attack/Support action"><span class="key-icon">${iconSpan('boost')}</span><span class="key-label">Boost</span></div>
        <div class="key-item blk-support" style="grid-column:4;grid-row:2;" title="Reduce the next incoming damage"><span class="key-icon">${iconSpan('block')}</span><span class="key-label">Block</span></div>
        <div class="key-item blk-support" style="grid-column:2;grid-row:3;" title="Clear a status effect"><span class="key-icon">${iconSpan('nullify')}</span><span class="key-label">Nullify</span></div>
        <div class="key-item blk-support" style="grid-column:3;grid-row:3;" title="Heal over time, ticks each Adventurer Upkeep"><span class="key-icon">${iconSpan('hot')}</span><span class="key-label">H.O.T.</span></div>
        <div class="key-item blk-support" style="grid-column:4;grid-row:3;" title="Restore health"><span class="key-icon">${iconSpan('heal')}</span><span class="key-label">Heal</span></div>
        <div class="key-item blk-support" style="grid-column:2;grid-row:4;" title="Encounter skips its next action"><span class="key-icon">${iconSpan('freeze')}</span><span class="key-label">Freeze</span></div>
        <div class="key-item blk-support" style="grid-column:3;grid-row:4;" title="Take D.O.T. yourself; path continues"><span class="key-icon">${iconSpan('fumble')}</span><span class="key-label">Fumble</span></div>
        <div style="grid-column:1;grid-row:4; display:flex; align-items:flex-end; justify-content:center;">
          <span class="key-title">Action Key</span>
        </div>
      </div>
    </div>
    ${S && S.klass ? `<p class="hint" style="margin-top:8px;">${S.klass.name} zone highlighted with dashed outline on the Tray. ${S.klass.ability}</p>` : ''}
  `;
}

function backPocketViewHTML(){
  if(!S.backPocket.length){
    return `<p class="hint">Empty — dice land here when a Loot Die replaces them in your Tray, or a Shrine upgrades one. Visit Camp to swap them into your Tray.</p>`;
  }
  return `<div class="camp-dice-grid">${S.backPocket.map(d=>`<div class="die dietype-${d.cat} camp-die-tile" style="cursor:default;" title="${d.name}"><span class="camp-die-label">${d.name}</span></div>`).join('')}</div>
    <p class="hint" style="margin-top:8px;">Visit Camp to swap these into your Tray.</p>`;
}

function logViewHTML(){
  return `<div class="log" style="height:min(60vh,400px);">${S.log.slice(-150).map(l=>`<div class="${l.cls}">${l.text}</div>`).join('')}</div>`;
}

// A static (non-clickable) preview tile that looks like a real tray die --
// same dietype background, the same arced name-tag, and a representative
// face -- instead of the old plain icon-in-a-box preview, so a loot option
// actually shows what the die will look like once it's in your tray.
function lootPreviewTileHTML(opt, uniqueId){
  const pf = pickPreviewFace(opt.faces);
  const label = `<div class="face-val">${iconSpan(pf.type, pf.value)}</div><div class="face-word">${LABEL[pf.type]}${(pf.value && !ICON_VALUE_SLOT.has(pf.type))?(' '+pf.value):''}</div>`;
  return `<div class="die loot-preview-tile dietype-${opt.cat}">
      <div class="name-tag">${nameTagSVG(opt.name, uniqueId)}</div>
      ${label}
    </div>`;
}

// A state-driven modal (one whose content comes from S.lootChoice/
// S.shrineChoice/S.shrineResult, rendered fresh inside a render() pass
// rather than opened once by a direct user action) can end up rendered
// twice in a row -- e.g. entering a Shrine auto-resolves and renders once
// via applyShrineBoon, then the code path that led there (campLeave,
// continueFromShrine) renders again right after -- and since these
// overlays are appended to document.body rather than being cleared by the
// normal app.innerHTML re-render, a second call would stack a duplicate
// popup on top of the first instead of replacing it. Tagging each with a
// role and removing any existing one with that role first makes them
// idempotent: rendering the same state twice just replaces the popup.
// Every modal mounts/unmounts through these two instead of a bare
// appendChild/removeChild, so it fades+scales in and mirrors that on the way
// out instead of popping into existence and getting yanked out instantly
// (the actual animating is CSS -- modal-overlay/card-in/out, styles.css).
// closeModal() races the CSS animationend against a timeout fallback so a
// stuck or skipped animation (e.g. Reduce Motion, which disables animations
// globally) never leaves the overlay stuck in the DOM.
function openModal(overlay){
  document.body.appendChild(overlay);
  return overlay;
}
function closeModal(overlay, after){
  if(!overlay || !overlay.parentNode){ if(after) after(); return; }
  if(overlay.classList.contains('modal-closing')){ return; } // already closing
  overlay.classList.add('modal-closing');
  let done = false;
  const finish = ()=>{
    if(done) return;
    done = true;
    if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if(after) after();
  };
  overlay.addEventListener('animationend', finish, { once:true });
  setTimeout(finish, 200);
}

function openUniqueOverlay(role, overlay){
  document.querySelectorAll(`[data-overlay-role="${role}"]`).forEach(n=>{ if(n.parentNode) n.parentNode.removeChild(n); });
  overlay.dataset.overlayRole = role;
  openModal(overlay);
  return overlay;
}

function renderLootModal(){
  const {options, lootName, overkill, fromShrine} = S.lootChoice;
  const overlay = el(`<div class="modal-overlay"><div class="modal">
      <div style="display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">
        <h2 style="margin:0;">${fromShrine ? 'Shrine Boon' : 'Victory!'}</h2>
        ${overkill?'<span class="status-chip" style="background:var(--gold);color:#241c10;">Overkill! +1 option</span>':''}
      </div>
      <p>Choose one ${lootName} Loot Die to add to your tray:</p>
      <div class="loot-options" id="loot-options"></div>
    </div></div>`);
  openUniqueOverlay('loot', overlay);
  const container = overlay.querySelector('#loot-options');
  options.forEach((opt,i)=>{
    const art = LOOT_ART[opt.name];
    const card = el(`<div class="loot-opt">
        ${art?`<img class="loot-art-thumb" src="${art}" alt="${opt.name}"/>`:''}
        ${lootPreviewTileHTML(opt, `loot-${i}`)}
        <div class="faces">${opt.faces.map(f=>`<span>${iconSpan(f.type, f.value)}${LABEL[f.type]}${(f.value && !ICON_VALUE_SLOT.has(f.type))?f.value:''}</span>`).join('')}</div>
      </div>`);
    card.onclick = ()=> closeModal(overlay, ()=> chooseLoot(opt));
    container.appendChild(card);
  });
}

function renderShrineChoiceModal(){
  const {name, options} = S.shrineChoice;
  const overlay = el(`<div class="modal-overlay"><div class="modal">
      <h2>${name}</h2>
      <p>Choose one boon:</p>
      <div class="loot-options" id="shrine-options"></div>
    </div></div>`);
  openUniqueOverlay('shrine-choice', overlay);
  const container = overlay.querySelector('#shrine-options');
  options.forEach(opt=>{
    const card = el(`<div class="loot-opt"><h4>${opt.label}</h4></div>`);
    card.onclick = ()=> closeModal(overlay, ()=> chooseShrineOption(opt));
    container.appendChild(card);
  });
}

// Always shown once a Shrine's outcome is known -- a real confirmation box,
// even when there was no choice to make, so a boon is never applied silently.
function renderShrineResultModal(){
  const {title, text} = S.shrineResult;
  const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center;">
      <h2>${title}</h2>
      <p>${text}</p>
      <button class="primary" id="shrine-result-continue">Continue</button>
    </div></div>`);
  openUniqueOverlay('shrine-result', overlay);
  overlay.querySelector('#shrine-result-continue').onclick = ()=> closeModal(overlay, continueFromShrine);
}

// A pop-up over whatever screen is already showing (the game board, or the
// Shrine card) rather than a full screen of its own -- picking a die to
// replace is a quick, single decision, so swapping away the entire board to
// ask it read as a bigger interruption than it is, and lost the context of
// what tray you were looking at. modal-bottom (styles.css) anchors it near
// the bottom of the viewport instead of the usual vertical-center, since
// this is the one modal a player reaches for mid-run, often one-handed --
// closer to the thumb than requiring a reach up the screen. Triggered
// whenever S.pendingLootDie is set, same pattern as the lootChoice/
// shrineChoice/shrineResult modals (see renderGame()/renderShrineEncounter()).
function renderSwapModal(){
  const overlay = el(`<div class="modal-overlay modal-bottom"><div class="modal">
      <h2>Equip ${S.pendingLootDie.name}</h2>
      <p>Choose which die in your tray to replace. The replaced die goes to your Back Pocket.</p>
      <div class="swap-list" id="swap-list"></div>
    </div></div>`);
  openUniqueOverlay('swap', overlay);
  const list = overlay.querySelector('#swap-list');
  // Group tray slots by die name -- identical dice show as one entry with a
  // count instead of listing every individual slot; which specific slot
  // gets replaced doesn't matter when they're the same die.
  const groups = [];
  const byName = new Map();
  S.tray.forEach((cell,i)=>{
    const key = cell.die.name;
    if(!byName.has(key)){
      const g = { name: key, indices: [] };
      byName.set(key, g);
      groups.push(g);
    }
    byName.get(key).indices.push(i);
  });
  groups.forEach(g=>{
    const die = S.tray[g.indices[0]].die;
    const countBadge = g.indices.length>1 ? `<span class="token-count swap-count-badge">x${g.indices.length}</span>` : '';
    const item = el(`<div class="swap-item">${lootPreviewTileHTML(die, 'swap-'+g.indices[0])}${countBadge}<div class="swap-item-label">${die.name}</div></div>`);
    const isBasic = die.cat==='attack' || die.cat==='maneuver';
    item.onclick = () => {
      if(isBasic) closeModal(overlay, ()=> swapInLootDie(g.indices[0]));
      else confirmDieReplace(g.indices[0], die.name, S.pendingLootDie.name, overlay);
    };
    list.appendChild(item);
  });
}

// A basic Attack/Maneuver die is easily replaced (there are plenty of
// copies), but an Origin or Loot die in the tray is comparatively precious --
// losing one to an absent-minded tap stings. Confirm before sending anything
// other than a basic die to the Back Pocket.
function confirmDieReplace(trayIndex, oldName, newName, swapOverlay){
  const overlay = openUniqueOverlay('confirm-swap', el(`<div class="modal-overlay modal-bottom"><div class="modal">
      <h2 style="margin-top:0;">Replace ${oldName}?</h2>
      <p>${oldName} will go to your Back Pocket, replaced in your Tray by ${newName}.</p>
      <div class="small-btn-row">
        <button class="danger" id="confirm-swap-yes">Replace it</button>
        <button id="confirm-swap-no">Cancel</button>
      </div>
    </div></div>`));
  const close = ()=> closeModal(overlay);
  // Confirming closes both this confirmation and the swap picker underneath
  // it (swapOverlay) before actually swapping -- otherwise the swap picker,
  // which lives outside the templated app.innerHTML like every modal, would
  // be left stranded in the DOM once S.pendingLootDie is cleared and no
  // longer tells render() to draw it. Canceling only closes this
  // confirmation, leaving the swap picker up so another die can be picked.
  overlay.querySelector('#confirm-swap-yes').onclick = ()=> closeModal(overlay, ()=> closeModal(swapOverlay, ()=> swapInLootDie(trayIndex)));
  overlay.querySelector('#confirm-swap-no').onclick = close;
  overlay.onclick = (ev)=>{ if(ev.target===overlay) close(); };
}

function renderShrineEncounter(){
  const e = S.encounter;
  const roomEnterCls = S.newRoomFx ? 'room-enter' : '';
  app.innerHTML = `
    <div class="panel" style="margin-bottom:8px;">
      ${renderRoute()}
    </div>
    <div class="panel">
      <div class="enc-card ${roomEnterCls}">
        <div class="enc-header">
          <h3 class="enc-name-txt">${e.name}</h3>
          <span class="enc-type">Shrine</span>
        </div>
        <div class="enc-card-body">
          <div class="enc-flavor" style="border-top:none; padding-top:0;">${e.boon}</div>
          ${!S.shrineResult && !S.shrineChoice ? '<p class="hint">Revealing the shrine\'s boon...</p>' : ''}
        </div>
      </div>
    </div>
  `;
  if(S.lootChoice) renderLootModal();
  if(S.shrineChoice) renderShrineChoiceModal();
  if(S.shrineResult) renderShrineResultModal();
  if(S.pendingLootDie) renderSwapModal();
  attachLongPressTooltips('.route-tooltip-target');
  if(S.newRoomFx){
    // Defer the boon reveal until the player taps past "A new room... Shrine"
    // -- see the comment in advanceRoute()'s Shrine branch (logic.js).
    showRoomCallout(S.newRoomFx, ()=> applyShrineBoon(S.encounter));
    if(typeof playTone==='function') playTone('roomEnter');
    S.newRoomFx = null; // consumed -- plays once, on the render right after advanceRoute() set it
  }
}

function renderCamp(){
  const campFx = healthFX(S.health, S._lastPlayerHealth);
  S._lastPlayerHealth = S.health;
  const organizeSel = S.organizeSelection;
  const upgradeRows = [];
  ['attack','maneuver'].forEach(cat=>{
    [1,2].forEach(level=>{
      const count = upgradeAvailability(cat, level);
      if(count<3 && S.campUpgrades[cat]) return; // hide impossible/irrelevant rows once used, keep list short
      if(count===0) return; // nothing of this tier exists yet -- would-be-empty row, pure clutter
      const label = cat.charAt(0).toUpperCase()+cat.slice(1);
      const eligible = canUpgrade(cat, level) && !S.campUpgrades[cat];
      const disabled = !eligible;
      const needsBackfill = count>=3 && !canUpgrade(cat,level);
      const upgradeTitle = needsBackfill ? 'Needs more spare dice to backfill' : `Combine 3 ${label} ${ROMAN[level]} into 1 ${label} ${ROMAN[level+1]}`;
      upgradeRows.push(`<div class="upgrade-row">
          <button class="upgrade-btn" id="upgrade-${cat}-${level}" ${disabled?'disabled':''} title="${upgradeTitle}">${label} ${ROMAN[level]} ${mergeGlyphSVG(16)} ${ROMAN[level+1]} <span class="token-count">${count}</span></button>
          <button id="preview-${cat}-${level}" class="upgrade-preview-btn" title="Preview the resulting die's faces">?</button>
        </div>`);
    });
  });
  app.innerHTML = `
    <div class="panel">
      ${renderRoute()}
      <h2 style="margin-bottom:4px;">Camp</h2>
      <p class="hint" style="margin:0 0 6px;">Rest and prepare before pressing onward.</p>

      <div class="camp-section camp-status-card">
        <div class="bar-row" style="position:relative;"><span style="width:70px;">Health</span><div class="bar ${campFx.cls}"><div class="bar-fill hp player" style="width:${S.health/S.maxHealth*100}%"></div></div><span>${S.health}/${S.maxHealth}</span>${campFx.deltaHTML}</div>
        <div class="camp-fire-wrap">
          <div class="campfire-glow"></div>
          <div class="campfire-logs"></div>
          <div class="campfire-flame flame-back"></div>
          <div class="campfire-flame flame-front"></div>
        </div>
        <div class="small-btn-row">
          <button id="rest-btn" ${S.campRested?'disabled':''}>${S.campRested?'Already Rested This Camp':'Rest (scramble tray, heal half actions shown)'}</button>
        </div>
        <div class="small-btn-row">
          <button id="leave-btn" class="primary">Break Camp &amp; Continue</button>
          <button id="camp-log-btn">${iconSpan('log')} Log</button>
        </div>
      </div>

      <div class="camp-section">
        <h3 class="camp-section-title">Upgrade Dice <span style="color:var(--parchment-dim); font-weight:normal; font-size:11px;">(1 Attack + 1 Maneuver per Camp)</span></h3>
        <div class="upgrade-rows-col">${upgradeRows.length? upgradeRows.join('') : '<span class="hint">No matching sets of 3 Basic dice to combine right now.</span>'}</div>
      </div>

      <div class="camp-section">
        <h3 class="camp-section-title">Organize Dice <span style="color:var(--parchment-dim); font-weight:normal; font-size:11px;">(tap one in each area to swap)</span></h3>
        <div class="camp-dice-grid ${organizeSel && organizeSel.type==='bp' ? 'organize-target':''} ${organizeSel && organizeSel.type==='tray' ? 'organize-source':''}" id="organize-tray"></div>
        ${organizeSwapArrowHTML()}
        <div class="camp-pocket ${organizeSel && organizeSel.type==='tray' ? 'organize-target':''} ${organizeSel && organizeSel.type==='bp' ? 'organize-source':''}">
          ${S.backPocket.length ? `<span class="camp-pocket-count" title="Back Pocket">${S.backPocket.length}</span><div class="camp-dice-grid" id="organize-bp"></div>` : '<p class="hint camp-empty-hint" style="margin:0;">Empty — dice land here when a Loot Die replaces them in your Tray, or a Shrine upgrades one.</p>'}
        </div>
      </div>
    </div>`;
  document.getElementById('rest-btn').onclick = campRest;
  document.getElementById('camp-log-btn').onclick = ()=> openInfoModal('Log', logViewHTML());
  document.getElementById('leave-btn').onclick = ()=>{
    const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center;">
        <h2>Break Camp?</h2>
        <p>You can't come back to rest or upgrade dice until the next Camp.</p>
        <div class="small-btn-row" style="justify-content:center;">
          <button id="confirm-leave-cancel">Stay a Moment</button>
          <button class="primary" id="confirm-leave-go">Break Camp</button>
        </div>
      </div></div>`);
    openModal(overlay);
    overlay.querySelector('#confirm-leave-cancel').onclick = ()=> closeModal(overlay);
    overlay.querySelector('#confirm-leave-go').onclick = ()=> closeModal(overlay, campLeave);
    overlay.onclick = (ev)=>{ if(ev.target===overlay) closeModal(overlay); };
  };
  ['attack','maneuver'].forEach(cat=>{
    [1,2].forEach(level=>{
      const btn = document.getElementById(`upgrade-${cat}-${level}`);
      if(btn) btn.onclick = ()=> campUpgrade(cat, level);
      const previewBtn = document.getElementById(`preview-${cat}-${level}`);
      if(previewBtn) previewBtn.onclick = ()=>{
        const resultDie = basic(cat, level+1);
        const label = cat.charAt(0).toUpperCase()+cat.slice(1);
        const facesHTML = resultDie.faces.map(f=>`<span>${iconSpan(f.type, f.value)}${LABEL[f.type]}${(f.value && !ICON_VALUE_SLOT.has(f.type))?f.value:''}</span>`).join('');
        openInfoModal(`${label} ${ROMAN[level+1]}: ${resultDie.name}`, `<div class="faces">${facesHTML}</div>`);
      };
    });
  });
  document.getElementById('organize-tray').innerHTML = campDiceGridHTML(S.tray.map((c,i)=>({die:c.die, idx:i})), 'tray');
  if(S.backPocket.length) document.getElementById('organize-bp').innerHTML = campDiceGridHTML(S.backPocket.map((d,i)=>({die:d, idx:i})), 'bp');
  [...document.querySelectorAll('.camp-die-tile')].forEach(tile=>{
    tile.onclick = ()=> selectOrganize(tile.dataset.campType, parseInt(tile.dataset.campIdx));
  });
  attachLongPressTooltips('.route-tooltip-target');
}

function summaryStatsHTML(){
  const st = S.stats;
  return `
    <div class="key-card" style="text-align:left;">
      <div class="camp-section-title" style="font-weight:800; text-align:center; margin-bottom:8px;">Run Summary</div>
      <div class="statuses" style="justify-content:center;">
        <span class="status-chip">Floor reached: ${S.floorIdx+1}/3</span>
        <span class="status-chip">Turns taken: ${st.turnsTaken}</span>
        <span class="status-chip">Damage dealt: ${Math.round(st.damageDealt)}</span>
        <span class="status-chip">Encounters defeated: ${st.encountersDefeated}</span>
        <span class="status-chip">Shrines visited: ${st.shrinesVisited}</span>
        <span class="status-chip">Overkills: ${st.overkills}</span>
        <span class="status-chip">Loot Dice collected: ${st.lootCollected}</span>
      </div>
    </div>`;
}

function renderVictory(){
  if(!S.gameOverRecorded){
    S.gameOverRecorded = true;
    recordRunHistory('victory');
    S.newAchievements = recordMetaProgress('victory');
    clearSave();
    playTone('grandVictory');
    if(typeof spawnConfettiRain==='function') spawnConfettiRain();
  }
  app.innerHTML = `<div class="panel"><h2>Dungeon Conquered!</h2><p>You defeated the Big Boss and cleared all three floors. Well fought, Adventurer.</p>
    ${newAchievementsHTML(S.newAchievements)}
    ${summaryStatsHTML()}
    <button class="primary" style="margin-top:12px;" onclick="location.reload()">Play Again</button></div>`;
}
function renderGameOver(){
  if(!S.gameOverRecorded){
    S.gameOverRecorded = true;
    recordRunHistory('defeat');
    S.newAchievements = recordMetaProgress('defeat');
    clearSave();
    playTone('defeat');
  }
  // Before the usual defeat screen, let the player pick one of their
  // current highest-tier dice (see highestTierTrayGroups() in logic.js) to
  // carry into their next run -- a small consolation for a dead run, and a
  // way for repeat attempts to compound a little rather than starting from
  // zero every single time.
  if(S.carryoverOptions && S.carryoverOptions.length && !S.carryoverChosenName){
    app.innerHTML = `<div class="panel"><h2>Defeated</h2>
      <p>Your Adventurer retreats to town in temporary defeat... but gets to keep one die for next time. Choose a die to carry into your next run:</p>
      <div class="swap-list" id="carryover-list"></div>
      </div>`;
    const list = document.getElementById('carryover-list');
    S.carryoverOptions.forEach(g=>{
      const countBadge = g.count>1 ? `<span class="token-count swap-count-badge">x${g.count}</span>` : '';
      const item = el(`<div class="swap-item">${lootPreviewTileHTML(g.die, 'carryover-'+g.die.name)}${countBadge}<div class="swap-item-label">${g.die.name}</div></div>`);
      item.onclick = ()=>{
        S.carryoverChosenName = g.die.name;
        saveCarryoverDie(g.die);
        logMsg('sys', `${g.die.name} will carry over to your next run.`);
        render();
      };
      list.appendChild(item);
    });
    return;
  }
  const carryNote = S.carryoverChosenName ? `<p class="hint">${S.carryoverChosenName} will join your tray at the start of your next run.</p>` : '';
  app.innerHTML = `<div class="panel"><h2>Defeated</h2><p>Your Adventurer retreats to town in temporary defeat...</p>
    ${carryNote}
    ${newAchievementsHTML(S.newAchievements)}
    ${summaryStatsHTML()}
    <button class="primary" style="margin-top:12px;" onclick="location.reload()">Try Again</button></div>`;
}

// A short "New Achievement" callout block for the post-run screens (shown
// once, right after recordMetaProgress() returns any newly-unlocked
// entries). Plain inline HTML rather than a modal/toast -- the player is
// already looking at a dedicated end-of-run screen, so this just adds to
// it rather than interrupting with another popup.
function newAchievementsHTML(newAchievements){
  if(!newAchievements || !newAchievements.length) return '';
  const rows = newAchievements.map(a=>
    `<div class="achv-unlock-row"><span class="achv-unlock-icon">✦</span><div>
       <div class="achv-unlock-name">${a.name}</div>
       <div class="achv-unlock-desc">${a.desc}</div>
     </div></div>`).join('');
  return `<div class="achv-unlock-box">
      <div class="achv-unlock-title">New Achievement${newAchievements.length>1?'s':''}!</div>
      ${rows}
    </div>`;
}
