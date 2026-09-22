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

function render(){
  updateHeaderMeta();
  if(!S){ renderSetup(); return; }
  if(S.screen==='victory'){ renderVictory(); return; }
  if(S.screen==='gameover'){ renderGameOver(); return; }
  if(S.screen==='camp'){ renderCamp(); maybeAutosave(); return; }
  if(S.screen==='swap'){ renderSwap(); maybeAutosave(); return; }
  if(S.screen==='shrine'){ renderShrineEncounter(); maybeAutosave(); return; }
  renderGame();
  maybeAutosave();
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
    html += `<div class="node ${floorCls} ${cls}">${icon}</div>`;
  });
  html += '</div>';
  const leftPct = ((Math.min(S.routeStep, n-1) + 0.5) / n * 100).toFixed(2);
  const portrait = S.portrait || { img: GNOME_PORTRAITS[0], placeholder:true };
  const wm = portrait.placeholder ? `<span class="mascot-watermark">PLACEHOLDER</span>` : '';
  html += `<span class="mascot-wrap" style="left:${leftPct}%;">${wm}<img class="mascot-marker" src="${portrait.img}" alt=""></span>`;
  html += '</div>';
  return html;
}

function renderDie(cell, idx){
  const f = cell.forcedFace || currentFace(cell);
  const isBlank = f.type==='blank';
  const inPath = S.path.includes(idx);
  const isLastMove = S.path.length && S.path[S.path.length-1]===idx;
  const selectable = !S.gameOverText && canSelect(idx);
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
  const nameTag = isNonStarter ? `<div class="name-tag">${cell.die.name}</div>` : '';
  return `<div class="die ${dieTypeCls} ${isBlank?'blank':''} ${inPath?'in-path':''} ${isLastMove?'undoable':''} ${clickable?'selectable':'used'} ${zoneCls} ${shakeCls}"
            data-idx="${idx}" title="${isLastMove?'Click to undo this move':cell.die.name}" ${shakeDelay}>
            ${num?`<div class="pathnum">${num}</div>`:''}
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
  const shown = Math.abs(delta)%1 ? Math.abs(delta).toFixed(1) : Math.abs(delta);
  return {
    cls: isHeal ? 'flash-heal' : 'flash-damage',
    deltaHTML: `<span class="delta-float ${isHeal?'heal':'damage'}">${isHeal?'+':'-'}${shown}</span>`
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
  const fx = healthFX(curHealthClamped, e._lastHealth);
  e._lastHealth = curHealthClamped;
  let statuses = '';
  if(e.curDOT) statuses += `<span class="status-chip">${iconSpan('dot', e.curDOT)} DOT</span>`;
  if(e.curHOT) statuses += `<span class="status-chip">${iconSpan('hot', e.curHOT)} HOT</span>`;
  if(e.curShield) statuses += `<span class="status-chip">${iconSpan('block', e.curShield)} Shield</span>`;
  if(e.minionsSpawned) statuses += `<span class="status-chip">👹 Minions ${e.minionsSpawned}</span>`;
  let quests = '';
  if(e.quests && e.quests.length){
    quests = '<div class="quest-list">' + e.quests.map((q,i)=>`
      <div class="quest ${e.questsDone[i]?'complete':''}">
        <span class="quest-mark">${e.questsDone[i]?'✔':'○'}</span>
        <span>${q}</span>
      </div>`).join('') + '</div>';
  }
  const isBoss = e.type==='Boss' || e.type==='Big Boss';
  const extraStats = [];
  if(!isBoss){
    if(e.minion) extraStats.push(`summons ${e.minion}/turn`);
    if(e.shield) extraStats.push(`+${e.shield} shield/turn`);
    if(e.heal) extraStats.push(`heals ${e.heal}/turn`);
    if(e.hot) extraStats.push(`+${e.hot} HOT/turn`);
    if(e.dot) extraStats.push(`+${e.dot} DOT/turn`);
  }
  const art = MONSTER_ART[e.name];
  const bossCycle = (isBoss && e.actionCycle && e.actionCycle.length) ? (()=>{
    const labels = {dmg:'Hit', minion:'Minion', shield:'Shield', heal:'Heal', hot:'H.O.T.', dot:'D.O.T.'};
    const iconKey = {dmg:'hit', minion:'minion', shield:'block', heal:'heal', hot:'hot', dot:'dot'};
    const items = e.actionCycle.map((a,i)=>{
      const isNext = i === (e.cycleIndex % e.actionCycle.length);
      const showVal = ICON_VALUE_SLOT.has(iconKey[a.type]) ? null : a.value;
    return `<span class="boss-cycle-item ${isNext?'next':''}">${iconSpan(iconKey[a.type], ICON_VALUE_SLOT.has(iconKey[a.type])?a.value:null)} ${labels[a.type]}${showVal!=null?' '+showVal:''}</span>`;
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
          <div class="enc-portrait">
            ${art?`<img class="enc-art" src="${art}" alt="${e.name}"/>`
              : (e.type!=='Shrine' ? `<div class="enc-art-wrap"><span class="portrait-watermark">PLACEHOLDER</span><img class="enc-art" src="${CAT_SILHOUETTE}" alt=""/></div>` : '')}
          </div>
          <div class="enc-vitals">
            <div class="bar-row" style="position:relative;"><span>${iconSpan('heal')}</span><div class="bar ${fx.cls}">
                <div class="bar-fill hp" style="width:${hpPct}%"></div>
                ${questSegWidthPct>0?`<div class="bar-fill quest-hp" style="left:${questSegLeftPct}%; width:${questSegWidthPct}%;" title="Quest Health remaining"></div>`:''}
              </div><span>${curHealthClamped.toFixed(0)}/${e.maxHealth}</span>${fx.deltaHTML}</div>
            ${isBoss ? bossCycle : `
            <div class="bar-row">
              ${e.dmg?`<span class="dmg-burst">${e.dmg}/turn</span>`:''}
              <span style="font-size:11px; color:var(--parchment-dim);">${extraStats.join(' · ')}</span>
            </div>`}
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
  S._lastPlayerHealth = S.health;
  const totalTokens = S.nullifyTokens + S.freezeTokens + S.boostTokenCharges;
  app.innerHTML = `
    <div class="panel" style="margin-bottom:8px;">
      ${renderRoute()}
      <div class="bar-row" style="position:relative;"><span style="width:70px;">Health</span><div class="bar ${playerFx.cls}"><div class="bar-fill hp player" style="width:${hpPct}%"></div></div><span>${S.health}/${S.maxHealth}</span>${playerFx.deltaHTML}</div>
      <div class="statuses">
        ${S.playerDOT?`<span class="status-chip">${iconSpan('dot', S.playerDOT)} DOT</span>`:''}
        ${S.playerHOT?`<span class="status-chip">${iconSpan('hot', S.playerHOT)} HOT</span>`:''}
        ${S.playerBlock?`<span class="status-chip">${iconSpan('block', S.playerBlock)} Block</span>`:''}
        ${S.pendingFreeBoost?`<span class="status-chip" style="background:var(--gold);color:#241c10;">${iconSpan('boost')} Boost x${S.pendingFreeBoost} armed</span>`:''}
        <span class="status-chip" style="opacity:${S.segmentShrineUsed?0.4:1};" title="At most one Shrine per segment">Shrine ${S.segmentShrineUsed?'used':'available'}</span>
        <span class="status-chip" style="opacity:${S.segmentTrapUsed?0.4:1};" title="At most one Trap per segment">Trap ${S.segmentTrapUsed?'used':'available'}</span>
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
            ${!S.firstDiePicked ? '<div class="first-tip">Tap a die to start your path</div>' : ''}
            <div class="tray" id="tray"></div>
          </div>
          <div class="path-strip" id="path-strip" style="margin-top:6px;"></div>
        </div>
        <div class="util-rail">
          <div class="util-btn primary-accent rail-go ${(resolveDisabled||S.transitioning)?'disabled':''} ${emphasizeResolve?'pulse':''}" id="resolve-btn">▶<span>Go</span></div>
          <div class="util-btn danger-accent rail-clear ${S.transitioning?'disabled':''} ${clearConfirmArmed?'pulse':''}" id="clear-path-btn">${iconSpan('fumble')}<span>${clearConfirmArmed?'Sure?':'Clear'}</span></div>
          ${S.klass.convertTo ? `<div class="util-btn rail-ability ${(S.classAbilityUsed||S.transitioning)?'disabled':''}" id="ability-btn">✦<span>${S.classAbilityUsed?'Used':'Skill'}</span></div>` : ''}
        </div>
      </div>
    </div>
    ${S.transitioning && S.transitionMsg ? `
    <div class="modal-overlay transition-overlay">
      <div class="transition-banner">
        <h3>${S.transitionMsg.title}</h3>
        <p>${S.transitionMsg.text}</p>
        <button id="skip-transition-btn">Skip ▶</button>
      </div>
    </div>` : ''}
  `;
  document.getElementById('tray').innerHTML = S.tray.map((c,i)=>renderDie(c,i)).join('');
  S.justScrambled = false;
  [...document.getElementById('tray').children].forEach(node=>{
    node.onclick = ()=> {
      if(S.transitioning) return;
      if(node.classList.contains('used') && !node.classList.contains('undoable')) return;
      toggleSelect(parseInt(node.dataset.idx));
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
  document.getElementById('resolve-btn').onclick = ()=>{ if(resolveDisabled||S.transitioning) return; endTurnButton(); };
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
  }

  if(S.lootChoice) renderLootModal();
  if(S.shrineChoice) renderShrineChoiceModal();
}

function pickPreviewFace(faces){
  const nonBlank = faces.filter(f=>f.type!=='blank');
  if(!nonBlank.length) return {type:'blank'};
  return nonBlank.reduce((best,f)=> (f.value||0) > (best.value||0) ? f : best, nonBlank[0]);
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

function renderLootModal(){
  const {options, lootName, overkill, fromShrine} = S.lootChoice;
  const overlay = el(`<div class="modal-overlay"><div class="modal">
      <h2>${fromShrine ? 'Shrine Boon' : 'Victory!'}</h2>
      <p>Choose one ${lootName} Loot Die to add to your tray${overkill?' (Overkill! One extra option to choose from.)':''}:</p>
      <div class="loot-options" id="loot-options"></div>
    </div></div>`);
  document.body.appendChild(overlay);
  const container = overlay.querySelector('#loot-options');
  options.forEach(opt=>{
    const pf = pickPreviewFace(opt.faces);
    const card = el(`<div class="loot-opt">
        <div class="die loot-preview dietype-${opt.cat}" style="width:50px;height:50px;font-size:20px;margin:0 auto 8px;">
          <div style="font-size:20px;">${iconSpan(pf.type, pf.value)}</div>
        </div>
        <h4>${opt.name}</h4>
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
  document.body.appendChild(overlay);
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
  document.body.appendChild(overlay);
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
          <div class="mini-log-line">${S.log.length ? S.log[S.log.length-1].text : ''}</div>
        </div>
      </div>
    </div>
  `;
  if(S.lootChoice) renderLootModal();
  if(S.shrineChoice) renderShrineChoiceModal();
  if(S.shrineResult) renderShrineResultModal();
}

function renderCamp(){
  const campFx = healthFX(S.health, S._lastPlayerHealth);
  S._lastPlayerHealth = S.health;
  const upgradeRows = [];
  ['attack','maneuver'].forEach(cat=>{
    [1,2].forEach(level=>{
      const count = upgradeAvailability(cat, level);
      if(count<3 && S.campUpgrades[cat]) return; // hide impossible/irrelevant rows once used, keep list short
      const label = cat.charAt(0).toUpperCase()+cat.slice(1);
      const eligible = canUpgrade(cat, level) && !S.campUpgrades[cat];
      const disabled = !eligible;
      const note = (count>=3 && !canUpgrade(cat,level)) ? ' <span class="token-count">needs more spare dice to backfill</span>' : '';
      upgradeRows.push(`<button id="upgrade-${cat}-${level}" ${disabled?'disabled':''}>Combine 3 ${label} ${ROMAN[level]} → 1 ${label} ${ROMAN[level+1]} <span class="token-count">${count} available</span></button>${note}`);
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
      </div>

      <h3 class="camp-section-title">Upgrade Dice <span style="color:var(--parchment-dim); font-weight:normal; font-size:11px;">(1 Attack + 1 Maneuver per Camp)</span></h3>
      <div class="small-btn-row">${upgradeRows.length? upgradeRows.join('') : '<span class="hint">No matching sets of 3 Basic dice to combine right now.</span>'}</div>

      <h3 class="camp-section-title">Organize Dice <span style="color:var(--parchment-dim); font-weight:normal; font-size:11px;">(click one in each list to swap)</span></h3>
      <div class="hint" style="margin-top:0;">Tray</div>
      <div class="camp-dice-grid" id="organize-tray"></div>
      <div class="hint">Back Pocket <span style="color:var(--parchment-dim);">(${S.backPocket.length} dice)</span></div>
      <div class="camp-dice-grid" id="organize-bp">${S.backPocket.length? '' : '<span class="hint">Empty — dice land here when a Loot Die replaces them in your Tray, or a Shrine upgrades one.</span>'}</div>

      <h3 style="font-size:13px; margin-top:16px;">Log</h3>
      <div class="log" id="log"></div>
    </div>`;
  document.getElementById('rest-btn').onclick = campRest;
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
    });
  });
  document.getElementById('organize-tray').innerHTML = S.tray.map((c,i)=>campDieTileHTML(c.die,'tray',i)).join('');
  if(S.backPocket.length) document.getElementById('organize-bp').innerHTML = S.backPocket.map((d,i)=>campDieTileHTML(d,'bp',i)).join('');
  [...document.querySelectorAll('.camp-die-tile')].forEach(el=>{
    el.onclick = ()=> selectOrganize(el.dataset.campType, parseInt(el.dataset.campIdx));
  });
  const logEl = document.getElementById('log');
  logEl.innerHTML = S.log.slice(-60).map(l=>`<div class="${l.cls}">${l.text}</div>`).join('');
  logEl.scrollTop = logEl.scrollHeight;
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
  clearSave();
  app.innerHTML = `<div class="panel"><h2>🏆 Dungeon Conquered!</h2><p>You defeated the Big Boss and cleared all three floors. Well fought, Adventurer.</p>
    ${summaryStatsHTML()}
    <button class="primary" style="margin-top:12px;" onclick="location.reload()">Play Again</button></div>`;
}
function renderGameOver(){
  clearSave();
  app.innerHTML = `<div class="panel"><h2>💀 Defeated</h2><p>Your Adventurer retreats to town in temporary defeat...</p>
    ${summaryStatsHTML()}
    <button class="primary" style="margin-top:12px;" onclick="location.reload()">Try Again</button></div>`;
}
