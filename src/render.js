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

function updateHeaderMeta(){
  const el = document.getElementById('header-meta');
  if(!el) return;
  el.textContent = (S && S.origin && S.klass) ? `${S.origin.name} ${S.klass.name} · Floor ${S.floorIdx+1}` : 'digital prototype';
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
function pathTrailAppendSegment(svg, a, b, animate){
  const line = document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
  line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
  line.setAttribute('class', 'path-trail-line');
  svg.appendChild(line);
  if(animate && !PREFS.reducedMotion){
    const len = Math.hypot(b.x-a.x, b.y-a.y) || 1;
    line.style.strokeDasharray = String(len);
    line.style.strokeDashoffset = String(len);
    // eslint-disable-next-line no-unused-expressions
    line.getBoundingClientRect(); // force layout so the transition below doesn't get coalesced with the dash-offset write above
    requestAnimationFrame(()=>{
      line.style.transition = 'stroke-dashoffset 0.22s ease-out';
      line.style.strokeDashoffset = '0';
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
      if(a && b) pathTrailAppendSegment(svg, a, b, false);
    }
  } else {
    const a = pathTrailCenterOf(trayEl, path[path.length-2]);
    const b = pathTrailCenterOf(trayEl, path[path.length-1]);
    if(a && b) pathTrailAppendSegment(svg, a, b, true);
  }
  trailLastPath = path.slice();
}

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

function render(){
  updateHeaderMeta();
  updateLowHealthVignette();
  if(!S){ clearPathTrail(); renderSetup(); maybeScreenTransition('setup'); return; }
  if(S.screen==='victory'){ clearPathTrail(); renderVictory(); maybeScreenTransition('victory'); return; }
  if(S.screen==='gameover'){ clearPathTrail(); renderGameOver(); maybeScreenTransition('gameover'); return; }
  if(S.screen==='camp'){ clearPathTrail(); renderCamp(); maybeAutosave(); maybeScreenTransition('camp'); return; }
  if(S.screen==='swap'){ clearPathTrail(); renderSwap(); maybeAutosave(); maybeScreenTransition('swap'); return; }
  if(S.screen==='shrine'){ clearPathTrail(); renderShrineEncounter(); maybeAutosave(); maybeScreenTransition('shrine'); return; }
  renderGame();
  maybeAutosave();
  maybeScreenTransition('game');
}

function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }

function renderSetup(){
  const saved = hasSave() ? peekSave() : null;
  const continueRow = saved ? `
      <div class="panel" style="margin-bottom:12px; text-align:center;">
        <p style="margin:0 0 8px;">A saved run was found: <strong>${saved.originName} ${saved.className}</strong>, Floor ${saved.floorIdx+1}, ${saved.health}/${saved.maxHealth} HP.</p>
        <div class="small-btn-row" style="justify-content:center;">
          <button class="primary" id="continue-btn">Continue Saved Game</button>
          <button class="danger" id="discard-save-btn">Discard &amp; Start Fresh</button>
        </div>
      </div>` : '';
  app.innerHTML = `
    ${continueRow}
    <div class="panel">
      <h2>Create Your Adventurer</h2>
      <h3 style="font-size:14px;color:var(--cream);">Choose Your Origin</h3>
      <div class="choice-grid" id="origin-grid"></div>
      <h3 style="font-size:14px;color:var(--cream);">Choose Your Class</h3>
      <div class="choice-grid" id="class-grid"></div>
      <button class="primary" id="start-btn" disabled>Enter the Dungeon</button>
    </div>
  `;
  if(hasSave()){
    document.getElementById('continue-btn').onclick = ()=>{ if(loadGame()) render(); };
    document.getElementById('discard-save-btn').onclick = ()=>{ clearSave(); render(); };
  }
  let chosenOrigin=null, chosenClass=null;
  const og = document.getElementById('origin-grid');
  ORIGINS.forEach(o=>{
    const portrait = pickPortrait(o.id);
    const wm = portrait.placeholder ? `<span class="portrait-watermark">PLACEHOLDER</span>` : '';
    const c = el(`<div class="choice-card">
        <div class="portrait-wrap">${wm}<img class="portrait-img" src="${portrait.img}" alt="${o.name}"></div>
        <h4>${o.name}</h4><p><b>${o.die}</b><br>${o.blurb}</p></div>`);
    c.onclick=()=>{ chosenOrigin=o.id; [...og.children].forEach(x=>x.classList.remove('selected')); c.classList.add('selected'); checkReady(); };
    og.appendChild(c);
  });
  const cg = document.getElementById('class-grid');
  CLASSES.forEach(k=>{
    const c = el(`<div class="choice-card"><h4>${k.name}</h4><p>${k.ability}</p></div>`);
    c.onclick=()=>{ chosenClass=k.id; [...cg.children].forEach(x=>x.classList.remove('selected')); c.classList.add('selected'); checkReady(); };
    cg.appendChild(c);
  });
  function checkReady(){ document.getElementById('start-btn').disabled = !(chosenOrigin&&chosenClass); }
  document.getElementById('start-btn').onclick=()=>{ newGame(chosenOrigin, chosenClass); };
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
  const wm = portrait.placeholder ? `<span class="mascot-watermark">PLACEHOLDER</span>` : '';
  html += `<span class="mascot-wrap" style="left:${leftPct}%;">${wm}<img class="mascot-marker" src="${portrait.img}" alt=""></span>`;
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
  const shakeDelay = S.justScrambled ? `style="animation-delay:${idx*18}ms"` : '';
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
  return `<div class="die ${dieTypeCls} ${isBlank?'blank':''} ${inPath?'in-path':''} ${isLastMove?'undoable':''} ${clickable?'selectable':'used'} ${zoneCls} ${shakeCls} ${forcedCls} ${boostTargetCls}"
            data-idx="${idx}" title="${isLastMove?'Click to undo this move':cell.die.name}" ${shakeDelay}>
            ${num?`<div class="pathnum">${num}</div>`:''}
            ${(cell.forcedFace || boostTargetCls) ? `<div class="corner-badges">
              ${cell.forcedFace?`<span class="forced-badge" title="Converted by a class ability">✦</span>`:''}
              ${boostTargetCls?`<span class="boost-target-badge" title="Your armed Boost token will apply to this action">${iconSpan('boost')}</span>`:''}
            </div>` : ''}
            ${nameTag}
            ${label}
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
  if(e.curDOT) statuses += `<span class="status-chip">${iconSpan('dot', e.curDOT)} DOT</span>`;
  if(e.curHOT) statuses += `<span class="status-chip">${iconSpan('hot', e.curHOT)} HOT</span>`;
  if(e.curShield) statuses += `<span class="status-chip">${iconSpan('block', e.curShield)} Shield</span>`;
  if(e.minionsSpawned) statuses += `<span class="status-chip">👹 Minions ${e.minionsSpawned}</span>`;
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
    const chips = items.map(it=>`<span class="boss-cycle-item next enemy-action-badge" title="${ENEMY_ACTION_DESC[it.type]||''}">${iconSpan(it.type, ICON_VALUE_SLOT.has(it.type)?it.val:null)} ${it.label}${!ICON_VALUE_SLOT.has(it.type)?' '+it.val:''}</span>`).join('');
    return `<div class="boss-cycle-row"><span class="hint" style="margin:0;">Each turn:</span>${chips}</div>`;
  })() : '';
  const art = MONSTER_ART[e.name];
  const bossCycle = (isBoss && e.actionCycle && e.actionCycle.length) ? (()=>{
    const labels = {dmg:'Hit', minion:'Minion', shield:'Shield', heal:'Heal', hot:'H.O.T.', dot:'D.O.T.'};
    const iconKey = {dmg:'hit', minion:'minion', shield:'block', heal:'heal', hot:'hot', dot:'dot'};
    const items = e.actionCycle.map((a,i)=>{
      const isNext = i === (e.cycleIndex % e.actionCycle.length);
      const showVal = ICON_VALUE_SLOT.has(iconKey[a.type]) ? null : a.value;
    return `<span class="boss-cycle-item ${isNext?'next':''} enemy-action-badge" title="${ENEMY_ACTION_DESC[iconKey[a.type]]||''}">${iconSpan(iconKey[a.type], ICON_VALUE_SLOT.has(iconKey[a.type])?a.value:null)} ${labels[a.type]}${showVal!=null?' '+showVal:''}</span>`;
    }).join('');
    return `<div class="boss-cycle-row"><span class="hint" style="margin:0;">Cycles through:</span>${items}</div>`;
  })() : '';
  return `
    <div class="enc-card">
      <div class="enc-header">
        <h3 class="enc-name-txt">${e.name}</h3>
        <span class="enc-type">${e.type}</span>
      </div>
      <div class="enc-card-body">
        <div class="enc-top-row">
          <div class="enc-portrait ${fx.cls==='flash-damage'?'dmg-flash':fx.cls==='flash-heal'?'heal-flash':''}">
            ${art?`<img class="enc-art" src="${art}" alt="${e.name}"/>`
              : (e.type!=='Shrine' ? `<div class="enc-art-wrap"><span class="portrait-watermark">PLACEHOLDER</span><img class="enc-art" src="${CAT_SILHOUETTE}" alt=""/></div>` : '')}
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
  const size = Math.min(20 + val*3, 44).toFixed(0);
  const extras = [];
  if(preview.healGain) extras.push(`+${preview.healGain}${iconSpan('heal')}`);
  if(preview.blockGain) extras.push(`+${preview.blockGain}${iconSpan('block')}`);
  if(preview.dotToEncounter) extras.push(`+${preview.dotToEncounter}${iconSpan('dot')}`);
  if(preview.hotToPlayer) extras.push(`+${preview.hotToPlayer}${iconSpan('hot')}`);
  if(preview.selfDot) extras.push(`+${preview.selfDot}${iconSpan('fumble')}`);
  if(preview.nullifyCount) extras.push(iconSpan('nullify'));
  if(preview.freeze) extras.push(iconSpan('freeze'));
  return `<div class="path-counter-float">
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
    document.body.removeChild(overlay);
    render();
  };
  const freezeBtn = overlay.querySelector('#use-freeze-token');
  if(freezeBtn) freezeBtn.onclick = ()=>{
    if(S.transitioning || !S.encounter || S.freezeTokens<=0) return;
    S.freezeTokens--;
    S.freezeNext = true;
    logMsg('sys', 'Freeze token used — the encounter will skip its next action.');
    document.body.removeChild(overlay);
    render();
  };
  const boostBtn = overlay.querySelector('#use-boost-token');
  if(boostBtn) boostBtn.onclick = ()=>{
    if(S.transitioning || !S.encounter || S.boostTokenCharges<=0 || S.pendingFreeBoost) return;
    S.boostTokenCharges--;
    S.pendingFreeBoost = S.boostTokenValue;
    logMsg('sys', `Boost token armed — your next path action gets x${S.boostTokenValue}.`);
    document.body.removeChild(overlay);
    render();
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
        ${S.playerDOT?`<span class="status-chip">${iconSpan('dot', S.playerDOT)} DOT</span>`:''}
        ${S.playerHOT?`<span class="status-chip">${iconSpan('hot', S.playerHOT)} HOT</span>`:''}
        ${S.playerBlock?`<span class="status-chip">${iconSpan('block', S.playerBlock)} Block</span>`:''}
        ${S.pendingFreeBoost?`<span class="status-chip" style="background:var(--gold);color:#241c10;">${iconSpan('boost')} Boost x${S.pendingFreeBoost} armed</span>`:''}
      </div>
    </div>
    <div class="panel" style="margin-bottom:8px;">
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
          <div class="tray-wrap tray-wrap-full">
            <span class="round-badge">Round ${S.turnNumber+1}</span>
            ${pathCounterHTML()}
            <div class="tray" id="tray"></div>
          </div>
        </div>
        <div class="util-rail">
          <div class="util-btn primary-accent rail-go ${(resolveDisabled||S.transitioning)?'disabled':''} ${emphasizeResolve?'pulse':''}" id="resolve-btn">▶<span>Go</span></div>
          <div class="util-btn danger-accent rail-clear ${S.transitioning?'disabled':''} ${clearConfirmArmed?'pulse':''}" id="clear-path-btn">${iconSpan('fumble')}<span>${clearConfirmArmed?'Sure?':'Clear'}</span></div>
          ${S.klass.convertTo ? `<div class="util-btn rail-ability ${(S.classAbilityUsed||S.transitioning)?'disabled':''}" id="ability-btn">✦<span>${S.classAbilityUsed?'Used':'Skill'}</span></div>` : ''}
          <div class="char-icon-wrap ${playerFx.cls==='flash-damage'?'dmg-flash':playerFx.cls==='flash-heal'?'heal-flash':''}" title="${S.origin.name} ${S.klass.name}">${(()=>{
            const portrait = S.portrait || { img: GNOME_PORTRAITS[0], placeholder:true };
            const wm = portrait.placeholder ? `<span class="char-icon-watermark">PLACEHOLDER</span>` : '';
            return `${wm}<img class="char-icon-img" src="${portrait.img}" alt="${S.origin.name}">`;
          })()}</div>
        </div>
      </div>
      <div class="path-strip-col">
        <div class="path-strip" id="path-strip" style="margin-top:${S.path.length?6:0}px;"></div>
      </div>
    </div>
    ${S.transitioning && S.transitionLog && S.transitionLog.length ? `
    <div class="modal-overlay transition-overlay">
      <div class="transition-banner">
        <div class="transition-log" id="transition-log">
          ${S.transitionLog.map(step => `<div class="transition-entry"><h4>${step.title}</h4><p>${step.text}</p></div>`).join('')}
        </div>
        <button id="skip-transition-btn">Skip ▶</button>
      </div>
    </div>` : ''}
  `;
  document.getElementById('tray').innerHTML = S.tray.map((c,i)=>renderDie(c,i)).join('');
  S.justScrambled = false;
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
  document.getElementById('path-strip').innerHTML = S.path.length ?
    S.path.map((idx,n)=>{ const f=getFaceForIdx(idx); return `<span class="path-chip">${n+1}. ${iconSpan(f.type, f.value)} ${LABEL[f.type]}${(f.value && !ICON_VALUE_SLOT.has(f.type))?(' '+f.value):''}</span>`; }).join('')
    : '';
  if(S.transitioning){
    const skipBtn = document.getElementById('skip-transition-btn');
    if(skipBtn) skipBtn.onclick = skipTransition;
    const log = document.getElementById('transition-log');
    if(log) log.scrollTop = log.scrollHeight;
  }

  updatePathTrail();
  if(S.lootChoice) renderLootModal();
  if(S.shrineChoice) renderShrineChoiceModal();
}

function pickPreviewFace(faces){
  const nonBlank = faces.filter(f=>f.type!=='blank');
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

function ensureToastStack(){
  let stack = document.getElementById('toast-stack');
  if(!stack){
    stack = el(`<div id="toast-stack"></div>`);
    document.body.appendChild(stack);
  }
  return stack;
}

function showToast(text, kind){
  const stack = ensureToastStack();
  const toast = el(`<div class="toast${kind ? ' toast-'+kind : ''}">${text}</div>`);
  stack.appendChild(toast);
  requestAnimationFrame(()=> toast.classList.add('show'));
  setTimeout(()=>{
    toast.classList.remove('show');
    setTimeout(()=>{ if(toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, 2600);
}

// ---- Kill callout: a brief big banner for the two kill moments worth
// distinguishing from an ordinary win -- a Boss/Big Boss going down, and an
// Overkill -- so they register as they happen instead of only as a status
// chip on the loot screen afterward. `lines` is an array of {text, cls}
// (cls picks the visual treatment: 'boss' or 'overkill', plus optional
// 'sub' on a second line so it pops in slightly after the first). Purely
// additive on top of whatever renders next (the loot modal, typically). ----
function showKillCallout(lines){
  const old = document.getElementById('kill-callout');
  if(old && old.parentNode) old.parentNode.removeChild(old);
  const node = el(`<div id="kill-callout">${lines.map(l=>
    `<div class="kill-callout-line ${l.cls}">${l.text}</div>`).join('')}</div>`);
  document.body.appendChild(node);
  setTimeout(()=>{ if(node.parentNode) node.parentNode.removeChild(node); }, 1400);
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
  hit:       [{freq:180, start:0,    dur:0.09, type:'square',   gain:0.18}],
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
  // A sharp thump+ding "crunch" for an Overkill -- distinct from a normal
  // kill so the bonus-loot-option moment actually registers as it happens,
  // not just as a chip on the next screen.
  overkill:  [{freq:150, start:0,    dur:0.08, type:'sawtooth', gain:0.22},
              {freq:900, start:0.02, dur:0.06, type:'square',   gain:0.16},
              {freq:1300,start:0.09, dur:0.14, type:'square',   gain:0.16}],
};
function playTone(kind){
  if(!PREFS.sound) return;
  const ctx = getAudioCtx();
  if(!ctx) return;
  const notes = TONE_SEQUENCES[kind];
  if(!notes) return;
  const now = ctx.currentTime;
  notes.forEach(n=>{
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type;
    osc.frequency.setValueAtTime(n.freq, now+n.start);
    gain.gain.setValueAtTime(0.0001, now+n.start);
    gain.gain.linearRampToValueAtTime(n.gain, now+n.start+0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now+n.start+n.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now+n.start);
    osc.stop(now+n.start+n.dur+0.02);
  });
}

// ---- Haptics: a short vibrate on mobile when taking damage or crossing
// into the low-health danger zone. Silently no-ops where unsupported. ----
function vibrate(pattern){
  try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
}

function applyReducedMotionClass(){
  document.body.classList.toggle('reduced-motion', !!PREFS.reducedMotion);
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
        <button id="settings-dice-compendium-btn">Dice Compendium</button>
        ${inRun ? '<button id="settings-restart-btn" class="danger">Restart Run</button>' : ''}
        <button id="settings-close-btn">Close</button>
      </div>
    </div></div>`);
  document.body.appendChild(overlay);
  const close = ()=>{ if(overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#settings-close-btn').onclick = close;
  overlay.querySelector('#settings-how-to-play-btn').onclick = ()=>{ close(); openTutorialModal(0); };
  overlay.querySelector('#settings-run-history-btn').onclick = ()=>{ close(); openRunHistoryModal(); };
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
    document.body.appendChild(confirmOverlay);
    confirmOverlay.querySelector('#confirm-restart-cancel').onclick = ()=> document.body.removeChild(confirmOverlay);
    confirmOverlay.querySelector('#confirm-restart-go').onclick = ()=>{ clearSave(); location.reload(); };
    confirmOverlay.onclick = (ev)=>{ if(ev.target===confirmOverlay) document.body.removeChild(confirmOverlay); };
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
    document.body.removeChild(overlay);
    if(next!=null) openTutorialModal(next);
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
        <span class="run-history-outcome">${r.outcome==='victory' ? '🏆' : '💀'}</span>
        <div class="run-history-main">
          <div class="run-history-who">${r.origin} ${r.klass}</div>
          <div class="run-history-detail">Floor ${r.floorReached}/3 &middot; ${r.turnsTaken} turns &middot; ${r.damageDealt} dmg &middot; ${r.overkills} overkill${r.overkills===1?'':'s'}</div>
        </div>
        <span class="run-history-date">${dateStr}</span>
      </div>`;
  }).join('') : `<p class="hint">No runs recorded yet -- finish a run to see it here.</p>`;
  const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center; max-width:400px;">
      <h2 style="margin-top:0;">Run History</h2>
      ${summary}
      <div class="run-history-list">${rows}</div>
      <div class="small-btn-row" style="justify-content:center;">
        ${history.length ? '<button id="run-history-clear-btn" class="danger">Clear History</button>' : ''}
        <button class="primary" id="run-history-close-btn">Close</button>
      </div>
    </div></div>`);
  document.body.appendChild(overlay);
  const close = ()=>{ if(overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#run-history-close-btn').onclick = close;
  overlay.onclick = (ev)=>{ if(ev.target===overlay) close(); };
  const clearBtn = overlay.querySelector('#run-history-clear-btn');
  if(clearBtn) clearBtn.onclick = ()=>{ clearRunHistory(); close(); openRunHistoryModal(); };
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
  const sections = tiers.map(t=>{
    const rows = t.pool.map((d,i)=>{
      const art = LOOT_ART[d.name];
      const thumb = art
        ? `<img class="compendium-thumb" src="${art}" alt="${d.name}"/>`
        : `<div class="compendium-thumb compendium-thumb-placeholder"></div>`;
      const faces = d.faces.map(f=>`<span>${iconSpan(f.type, f.value)}</span>`).join('');
      return `<div class="compendium-row">
          ${thumb}
          <div class="compendium-main">
            <div class="run-history-who">${d.name}</div>
            <div class="compendium-faces">${faces}</div>
          </div>
        </div>`;
    }).join('');
    return `<div class="compendium-tier">
        <div class="camp-section-title" style="font-weight:800;">${t.label} Dice</div>
        <div class="compendium-list">${rows}</div>
      </div>`;
  }).join('');
  const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center; max-width:420px;">
      <h2 style="margin-top:0;">Dice Compendium</h2>
      <p class="hint">${totalArt}/${totalDice} illustrated so far -- more art is on the way.</p>
      ${sections}
      <div class="small-btn-row" style="justify-content:center;">
        <button class="primary" id="compendium-close-btn">Close</button>
      </div>
    </div></div>`);
  document.body.appendChild(overlay);
  const close = ()=>{ if(overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#compendium-close-btn').onclick = close;
  overlay.onclick = (ev)=>{ if(ev.target===overlay) close(); };
}

function openInfoModal(title, bodyHTML){
  const overlay = el(`<div class="modal-overlay"><div class="modal">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <h2 style="margin:0;">${title}</h2>
        <button class="danger" id="close-info-modal">✕</button>
      </div>
      <div id="info-modal-body">${bodyHTML}</div>
    </div></div>`);
  document.body.appendChild(overlay);
  overlay.querySelector('#close-info-modal').onclick = ()=> document.body.removeChild(overlay);
  overlay.onclick = (ev)=>{ if(ev.target===overlay) document.body.removeChild(overlay); };
  return overlay;
}

function keyCardHTML(){
  return `
    <div class="key-card" style="margin-top:0;">
      <div class="key-grid">
        <div class="key-item blk-maneuver" style="grid-column:1;grid-row:1;" title="Next move: diagonal only"><span class="key-icon">${iconSpan('dodge')}</span><span class="key-label">Dodge</span></div>
        <div class="key-item blk-maneuver" style="grid-column:1;grid-row:2;" title="Next move: skip one, same direction"><span class="key-icon">${iconSpan('leap')}</span><span class="key-label">Leap</span></div>
        <div class="key-item blk-maneuver" style="grid-column:1;grid-row:3;" title="Next move: adjacent or diagonal"><span class="key-icon">${iconSpan('pivot')}</span><span class="key-label">Pivot</span></div>

        <div class="key-item blk-attack" style="grid-column:2;grid-row:1;" title="Deal damage equal to the Action Value"><span class="key-icon">${iconSpan('hit')}</span><span class="key-label">Hit</span></div>
        <div class="key-item blk-attack" style="grid-column:3;grid-row:1;" title="Damage + 1x per adjacent Attack Action"><span class="key-icon">${iconSpan('combo')}</span><span class="key-label">Combo</span></div>
        <div class="key-item blk-attack" style="grid-column:2;grid-row:2;" title="Damage over time, ticks each Encounter Upkeep"><span class="key-icon">${iconSpan('dot')}</span><span class="key-label">D.O.T.</span></div>
        <div class="key-item blk-attack" style="grid-column:3;grid-row:2;" title="D.O.T. to the encounter + H.O.T. to you"><span class="key-icon">${iconSpan('leech')}</span><span class="key-label">Leech</span></div>

        <div class="key-item" style="grid-column:4;grid-row:1;" title="Multiplies the next Attack/Support action"><span class="key-icon">${iconSpan('boost')}</span><span class="key-label">Boost</span></div>
        <div class="key-item" style="grid-column:4;grid-row:2;" title="Reduce the next incoming damage"><span class="key-icon">${iconSpan('block')}</span><span class="key-label">Block</span></div>
        <div class="key-item" style="grid-column:2;grid-row:3;" title="Clear a status effect"><span class="key-icon">${iconSpan('nullify')}</span><span class="key-label">Nullify</span></div>
        <div class="key-item" style="grid-column:3;grid-row:3;" title="Heal over time, ticks each Adventurer Upkeep"><span class="key-icon">${iconSpan('hot')}</span><span class="key-label">H.O.T.</span></div>
        <div class="key-item" style="grid-column:4;grid-row:3;" title="Restore health"><span class="key-icon">${iconSpan('heal')}</span><span class="key-label">Heal</span></div>
        <div class="key-item" style="grid-column:2;grid-row:4;" title="Encounter skips its next action"><span class="key-icon">${iconSpan('freeze')}</span><span class="key-label">Freeze</span></div>
        <div class="key-item" style="grid-column:3;grid-row:4;" title="Take D.O.T. yourself; path continues"><span class="key-icon">${iconSpan('fumble')}</span><span class="key-label">Fumble</span></div>
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
function openUniqueOverlay(role, overlay){
  document.querySelectorAll(`[data-overlay-role="${role}"]`).forEach(n=>{ if(n.parentNode) n.parentNode.removeChild(n); });
  overlay.dataset.overlayRole = role;
  document.body.appendChild(overlay);
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
    card.onclick = ()=>{ document.body.removeChild(overlay); chooseLoot(opt); };
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
    card.onclick = ()=>{ document.body.removeChild(overlay); chooseShrineOption(opt); };
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
  overlay.querySelector('#shrine-result-continue').onclick = ()=>{
    document.body.removeChild(overlay);
    continueFromShrine();
  };
}

function renderSwap(){
  app.innerHTML = `
    <div class="panel">
      <h2>Equip ${S.pendingLootDie.name}</h2>
      <p>Choose which die in your tray to replace. The replaced die goes to your Back Pocket.</p>
      <div class="swap-list" id="swap-list"></div>
    </div>`;
  const list = document.getElementById('swap-list');
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
    const countBadge = g.indices.length>1 ? `<span class="token-count">x${g.indices.length}</span>` : '';
    const item = el(`<div class="swap-item"><span>${g.name}</span>${countBadge}</div>`);
    item.onclick = ()=> swapInLootDie(g.indices[0]);
    list.appendChild(item);
  });
}

function renderShrineEncounter(){
  const e = S.encounter;
  app.innerHTML = `
    <div class="panel" style="margin-bottom:8px;">
      ${renderRoute()}
    </div>
    <div class="panel">
      <div class="enc-card">
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
  attachLongPressTooltips('.route-tooltip-target');
}

function renderCamp(){
  const campFx = healthFX(S.health, S._lastPlayerHealth);
  S._lastPlayerHealth = S.health;
  const upgradeRows = [];
  ['attack','maneuver'].forEach(cat=>{
    [1,2].forEach(level=>{
      const count = upgradeAvailability(cat, level);
      if(count<3 && S.campUpgrades[cat]) return; // hide impossible/irrelevant rows once used, keep list short
      if(count===0) return; // nothing of this tier exists yet -- would-be-empty row, pure clutter
      const label = cat.charAt(0).toUpperCase()+cat.slice(1);
      const eligible = canUpgrade(cat, level) && !S.campUpgrades[cat];
      const disabled = !eligible;
      const note = (count>=3 && !canUpgrade(cat,level)) ? ' <span class="token-count">needs more spare dice to backfill</span>' : '';
      upgradeRows.push(`<div class="upgrade-row">
          <button id="upgrade-${cat}-${level}" ${disabled?'disabled':''}>Combine 3 ${label} ${ROMAN[level]} → 1 ${label} ${ROMAN[level+1]} <span class="token-count">${count} available</span></button>
          <button id="preview-${cat}-${level}" class="upgrade-preview-btn" title="Preview the resulting die's faces">?</button>
        </div>${note}`);
    });
  });
  app.innerHTML = `
    <div class="panel">
      ${renderRoute()}
      <h2>Camp</h2>
      <p>Rest and prepare before pressing onward.</p>
      <div class="bar-row" style="position:relative;"><span style="width:70px;">Health</span><div class="bar ${campFx.cls}"><div class="bar-fill hp player" style="width:${S.health/S.maxHealth*100}%"></div></div><span>${S.health}/${S.maxHealth}</span>${campFx.deltaHTML}</div>
      <div class="small-btn-row">
        <button id="rest-btn" ${S.campRested?'disabled':''}>${S.campRested?'Already Rested This Camp':'Rest (scramble tray, heal half actions shown)'}</button>
        <button id="leave-btn" class="primary">Break Camp &amp; Continue</button>
        <button id="camp-log-btn">${iconSpan('log')} Log</button>
      </div>

      <div class="camp-fire-wrap">
        <span class="portrait-watermark">PLACEHOLDER</span>
        <img class="camp-fire-img" src="${CAT_SILHOUETTE}" alt="Campfire (placeholder)">
      </div>

      <h3 class="camp-section-title">Upgrade Dice <span style="color:var(--parchment-dim); font-weight:normal; font-size:11px;">(1 Attack + 1 Maneuver per Camp)</span></h3>
      <div class="small-btn-row">${upgradeRows.length? upgradeRows.join('') : '<span class="hint">No matching sets of 3 Basic dice to combine right now.</span>'}</div>

      <h3 class="camp-section-title">Organize Dice <span style="color:var(--parchment-dim); font-weight:normal; font-size:11px;">(click one in each list to swap)</span></h3>
      <div class="hint" style="margin-top:0;">Tray</div>
      <div class="camp-dice-grid" id="organize-tray"></div>
      <div class="hint">Back Pocket <span style="color:var(--parchment-dim);">(${S.backPocket.length} dice)</span></div>
      ${S.backPocket.length ? '' : '<p class="hint camp-empty-hint">Empty — dice land here when a Loot Die replaces them in your Tray, or a Shrine upgrades one.</p>'}
      <div class="camp-dice-grid" id="organize-bp"></div>
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
    document.body.appendChild(overlay);
    overlay.querySelector('#confirm-leave-cancel').onclick = ()=> document.body.removeChild(overlay);
    overlay.querySelector('#confirm-leave-go').onclick = ()=>{ document.body.removeChild(overlay); campLeave(); };
    overlay.onclick = (ev)=>{ if(ev.target===overlay) document.body.removeChild(overlay); };
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
  document.getElementById('organize-tray').innerHTML = S.tray.map((c,i)=>campDieTileHTML(c.die,'tray',i)).join('');
  if(S.backPocket.length) document.getElementById('organize-bp').innerHTML = S.backPocket.map((d,i)=>campDieTileHTML(d,'bp',i)).join('');
  [...document.querySelectorAll('.camp-die-tile')].forEach(el=>{
    el.onclick = ()=> selectOrganize(el.dataset.campType, parseInt(el.dataset.campIdx));
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
  recordRunHistory('victory');
  clearSave();
  playTone('victory');
  app.innerHTML = `<div class="panel"><h2>🏆 Dungeon Conquered!</h2><p>You defeated the Big Boss and cleared all three floors. Well fought, Adventurer.</p>
    ${summaryStatsHTML()}
    <button class="primary" style="margin-top:12px;" onclick="location.reload()">Play Again</button></div>`;
}
function renderGameOver(){
  recordRunHistory('defeat');
  clearSave();
  playTone('defeat');
  app.innerHTML = `<div class="panel"><h2>💀 Defeated</h2><p>Your Adventurer retreats to town in temporary defeat...</p>
    ${summaryStatsHTML()}
    <button class="primary" style="margin-top:12px;" onclick="location.reload()">Try Again</button></div>`;
}
