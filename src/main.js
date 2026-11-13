
// Any uncaught error lands in the play-data log (Settings -> Export Play
// Data) with its screen, so a tester's "it froze" report comes with a stack.
window.addEventListener('error', (ev)=>{
  try{ teleLog('error', {msg:String(ev.message||'').slice(0,200), at:String((ev.error&&ev.error.stack)||'').split('\n').slice(0,3).join(' | ').slice(0,300), screen:S&&S.screen}); }catch(e){}
});
window.addEventListener('unhandledrejection', (ev)=>{
  try{ teleLog('error', {msg:'unhandledrejection: '+String(ev.reason&&ev.reason.message||ev.reason).slice(0,200), screen:S&&S.screen}); }catch(e){}
});

document.getElementById('settings-btn').onclick = openSettingsModal;
// Wide screens (a computer): the cover scene, dimmed, fills the space around the game card instead of a black void (Oct 28).
try{ if(typeof COVER_ART!=='undefined' && COVER_ART) document.documentElement.style.setProperty('--backdrop', `url("${COVER_ART}")`); }catch(e){}
applyReducedMotionClass();
try{ applyPcMode(); }catch(e){} // PC layout (opt-in while it is built): before the first draw
// Existing players: everything already found counts as "seen", so NEW! tags
// only light up for discoveries made from this version on.
try{
  if(localStorage.getItem(SEEN_KEY)===null){
    saveSeen({ dice:new Set(DISCOVERED_DICE), relics:new Set((META && META.relicsFound)||[]) });
  }
}catch(e){}

// Keyboard shortcuts for desktop play: Enter = Go, Backspace/Delete = Clear,
// and a 4x4 key block (matching the tray's own 4-column grid, row by row)
// to tap a tray die directly -- 1234 / qwer / asdf / zxcv. All routed
// through the real buttons/die nodes' own click handlers (never duplicating
// their logic), so every existing guard (disabled state, S.transitioning,
// etc.) still applies automatically. Disabled whenever any modal/dialog is
// open, or outside the main game screen.
const TRAY_KEYS = ['1','2','3','4','q','w','e','r','a','s','d','f','z','x','c','v'];
document.addEventListener('keydown', (ev)=>{
  if(!S || S.screen!=='game') return;
  if(document.querySelector('.modal-overlay')) return;
  if(document.activeElement && document.activeElement.tagName==='INPUT') return;
  const key = ev.key.toLowerCase();
  if(key==='enter'){
    if(S.needRoll){ scrambleRoll(0, -1); ev.preventDefault(); return; } // keyboard: Enter rolls
    const btn = document.getElementById('resolve-btn');
    if(btn) btn.click();
    ev.preventDefault();
    return;
  }
  if(key==='backspace' || key==='delete'){
    const btn = document.getElementById('clear-path-btn');
    if(btn) btn.click();
    ev.preventDefault();
    return;
  }
  const idx = TRAY_KEYS.indexOf(key);
  if(idx>=0){
    const node = document.querySelector(`.die[data-idx="${idx}"]`);
    if(node) node.click();
    ev.preventDefault();
  }
});

// Oct 15 (Jeremy): texture filters for small diegetic pieces -- paper grain (Quests sign, route doorways) and worn,
// scratched metal (the chest's iron corners and lock). Referenced from styles.css as url(#fx-paper) / url(#fx-worn).
(function addTextureFilters(){
  const d = document.createElement('div'); d.setAttribute('aria-hidden','true');
  d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML = `<svg width="0" height="0" focusable="false"><defs>
    <filter id="fx-paper" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="4" result="n"/>
      <feDiffuseLighting in="n" surfaceScale="1.4" lighting-color="#c9c9c9" result="l"><feDistantLight azimuth="225" elevation="50"/></feDiffuseLighting>
      <feBlend in="l" in2="SourceGraphic" mode="soft-light" result="b"/>
      <feComposite in="b" in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="fx-paper-soft" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="n"/>
      <feDiffuseLighting in="n" surfaceScale="0.55" lighting-color="#d6d6d6" result="l"><feDistantLight azimuth="225" elevation="60"/></feDiffuseLighting>
      <feBlend in="l" in2="SourceGraphic" mode="soft-light" result="b"/>
      <feComposite in="b" in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="fx-worn" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9 0.05" numOctaves="2" seed="7" result="s"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="2" result="f"/>
      <feBlend in="s" in2="f" mode="multiply" result="sf"/>
      <feColorMatrix in="sf" type="matrix" values="0.3 0.3 0.3 0 0.05  0.3 0.3 0.3 0 0.05  0.3 0.3 0.3 0 0.05  0 0 0 0 1" result="g"/>
      <feBlend in="g" in2="SourceGraphic" mode="soft-light" result="b"/>
      <feComposite in="b" in2="SourceGraphic" operator="in"/>
    </filter></defs></svg>`;
  document.body.appendChild(d);
  try{ paperTileImg(); }catch(e){} // load the paper tile now, so hero select and the first camp already have their textures
})();
render();
setTimeout(()=>{ try{ resendUnconfirmedRuns(); flushRunUploads(); }catch(e){} }, 4000); // send any runs left over from an offline session

// Splash (Jeremy, Oct 13): one tap before the title screen. Browsers keep audio locked until the player touches the
// page, so this tap unlocks it and the title theme starts with the title. Automated test browsers skip it.
(function showSplash(){
  if(navigator.webdriver) return;
  const sp = document.createElement('div');
  sp.id = 'splash'; sp.setAttribute('role','button'); sp.setAttribute('aria-label','Tap to begin');
  sp.innerHTML = `<div class="splash-inner">
      <div class="splash-die" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
      <div class="splash-title">Dungeon Scramble</div>
      <div class="splash-tap">Tap to begin</div>
    </div>
    <div class="splash-legal">&copy; 2026 Jeremy and Katlynn Friedman. All rights reserved.</div>`;
  document.body.appendChild(sp);
  let gone = false;
  const go = ()=>{
    if(gone) return; gone = true;
    try{ if(typeof musicCtx==='function') musicCtx(); if(audioCtx && audioCtx.state==='suspended') audioCtx.resume(); }catch(e){}
    try{ if(typeof musicUpdate==='function') musicUpdate(); }catch(e){}
    sp.classList.add('splash-out'); setTimeout(()=> sp.remove(), 450);
    // The tap that dismisses the splash must not also press whatever sits under it (Jeremy, Oct 17): swallow
    // clicks until that finger lifts (plus a beat), even if it is held past the fade.
    let until = Infinity;
    const swallow = ev=>{ if(performance.now() < until){ ev.stopPropagation(); ev.preventDefault(); } else window.removeEventListener('click', swallow, true); };
    window.addEventListener('click', swallow, true);
    const lift = ()=>{ until = performance.now() + 350; window.removeEventListener('pointerup', lift, true); window.removeEventListener('pointercancel', lift, true); };
    window.addEventListener('pointerup', lift, true); window.addEventListener('pointercancel', lift, true);
    setTimeout(()=>{ if(until===Infinity) until = 0; }, 4000); // never leave the game deaf if a pointerup goes missing
  };
  sp.addEventListener('pointerdown', go); sp.addEventListener('keydown', ev=>{ ev.preventDefault(); go(); }); sp.tabIndex = 0;
})();


// Android Back button in the store app (Oct 26): close what's on top first, pause a run with the Settings menu (it has
// Abandon Run), step back from character setup to the title, and only from the title send the app to the background.
(function(){
  const cap = typeof window!=='undefined' && window.Capacitor;
  if(!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;
  const AppPlugin = cap.registerPlugin ? cap.registerPlugin('App') : (cap.Plugins && cap.Plugins.App);
  if(!AppPlugin || !AppPlugin.addListener) return;
  AppPlugin.addListener('backButton', ()=>{
    const overlays = document.querySelectorAll('.modal-overlay');
    if(overlays.length){ const top = overlays[overlays.length-1], x = top.querySelector('.modal-x-btn'); if(x) x.click(); else top.remove(); return; }
    const pop = document.querySelector('#symbol-intro, #tip-bubble, .coach-overlay');
    if(pop){ if(pop.id==='tip-bubble' && typeof hideTip==='function') hideTip(); else pop.click(); return; }
    if(typeof S!=='undefined' && S && ['game','camp','shrine','unlock'].includes(S.screen)){ openSettingsModal(); return; }
    if((typeof S==='undefined' || !S) && preGameScreen==='setup'){ preGameScreen='title'; render(); return; }
    if(AppPlugin.minimizeApp) AppPlugin.minimizeApp();
  });
})();

// ---- Cursor: keyboard and controller play (PC layout, mockup H; Nov 13) ----
// One mechanism for the whole game instead of per-screen key maps: a gold cursor sits on something clickable, the
// arrow keys / D-pad / left stick move it to the nearest clickable thing in that direction, and A (Space) presses it
// exactly as a finger would (pointerdown, pointerup, click), so every guard in the real handlers still applies and
// holding A works for the shrine's Hold button and for long-press. B (Esc) goes back: closes the top window, or in a
// fight disarms the Skill / steps the Path back one die. X is Skill, Y (or Start) is Go, Select opens Settings.
// What counts as clickable: buttons, the tray's dice, and anything with an onclick, in the top layer only (the top
// pop-up window, else the fork doors or the room door, else the screen). PC mode only; a mouse move hides the cursor.
let pcCur = null, pcCurPt = null, pcCurOn = false, pcPress = null, pcPadSeen = false;
const PC_CLICKABLE = 'button, [role="button"], input, select, a[href], #tray > .die, .util-btn, #chest-lid, #shrine-lid';
function pcLayer(){
  const ov = [...document.querySelectorAll('.modal-overlay:not(.modal-closing)')];
  if(ov.length) return ov[ov.length-1];
  return document.getElementById('fork-callout') || document.getElementById('room-callout') || null;
}
function pcTargets(){
  const layer = pcLayer(), root = layer || document.body, W = window.innerWidth, H = window.innerHeight, out = [];
  const cand = [...root.querySelectorAll('*')].filter(n=> n.onclick || n.matches(PC_CLICKABLE));
  if(layer && (layer.onclick || layer.id==='room-callout') && !layer.classList.contains('modal-overlay')) cand.push(layer);
  for(const n of cand){
    if(n.disabled || n.classList.contains('disabled') || n.closest('#pc-hover') || n.id==='pc-cursor') continue;
    if(!layer && n.closest('.modal-overlay')) continue;
    const r = n.getBoundingClientRect();
    if(r.width<8 || r.height<8) continue;
    // off the screen: only reachable inside a pop-up window, whose content scrolls (the cursor scrolls it into view)
    if((r.bottom<2 || r.top>H-2 || r.right<2 || r.left>W-2) && !(layer && layer.classList.contains('modal-overlay'))) continue;
    if(r.width>W*0.7 && r.height>H*0.7) continue; // a scrim or a whole-screen catcher, not a thing to point at
    const cs = getComputedStyle(n);
    if(cs.visibility==='hidden' || cs.display==='none' || cs.pointerEvents==='none' || +cs.opacity===0) continue;
    out.push(n);
  }
  return out.filter(n=> !out.some(m=> m!==n && n.contains(m))); // innermost wins
}
function pcCentre(n){ const r = n.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2, r}; }
function pcCursorRing(){
  let ring = document.getElementById('pc-cursor');
  if(!ring){ ring = document.createElement('div'); ring.id = 'pc-cursor'; ring.hidden = true; document.body.appendChild(ring); }
  return ring;
}
function pcCursorSet(n){
  pcCur = n; pcCurOn = !!n; pcCurWhere = pcWhere();
  if(n){ pcCurPt = pcCentre(n); try{ n.scrollIntoView({block:'nearest', inline:'nearest'}); }catch(e){} }
  // the hover panel explains what the cursor is on, as it does for the mouse
  try{
    const die = n && n.matches('#tray > .die') ? parseInt(n.dataset.idx) : null;
    const t = n && die==null ? (n.closest('[title], [data-pc-tip]')) : null;
    pcHoverIdx = die; pcHoverTip = t ? (t.getAttribute('data-pc-tip') || t.getAttribute('title')) : null; pcHoverRender();
  }catch(e){}
  pcCursorDraw();
}
function pcCursorDraw(){
  const ring = pcCursorRing();
  if(!pcCurOn || !pcMode()){ ring.hidden = true; return; }
  const where = pcWhere();
  if(!pcCur || !pcCur.isConnected || !pcTargetOk(pcCur) || where!==pcCurWhere){
    const ts = pcTargets(); if(!ts.length){ ring.hidden = true; pcCur = null; return; }
    if(where!==pcCurWhere){ pcCur = pcStartTarget(ts); } // a new screen or window: start on its main thing
    else { // the same screen was redrawn: find what is now where the cursor was
      const p = pcCurPt || {x:window.innerWidth/2, y:window.innerHeight/2};
      let best = null, bd = 1e9; ts.forEach(n=>{ const c = pcCentre(n), d = Math.hypot(c.x-p.x, c.y-p.y); if(d<bd){ bd = d; best = n; } });
      pcCur = (pcCurPt && bd < 60) ? best : pcStartTarget(ts);
    }
    pcCurWhere = where; pcCurPt = pcCentre(pcCur);
    try{ const die = pcCur.matches('#tray > .die') ? parseInt(pcCur.dataset.idx) : null; pcHoverIdx = die; pcHoverTip = null; pcHoverRender(); }catch(e){}
  }
  const r = pcCur.getBoundingClientRect();
  ring.hidden = false;
  ring.style.left = (r.left-5)+'px'; ring.style.top = (r.top-5)+'px'; ring.style.width = (r.width+10)+'px'; ring.style.height = (r.height+10)+'px';
  ring.style.borderRadius = (parseFloat(getComputedStyle(pcCur).borderTopLeftRadius)||10)*(pcCur.currentCSSZoom||1) + 6 + 'px';
}
// Which screen or window the cursor is on (a change sends it to that screen's starting point).
let pcCurWhere = null;
function pcWhere(){ const l = pcLayer(); return (S ? S.screen : 'pre:'+preGameScreen) + '|' + (l ? (l.id || l.className) : '') + '|' + (S && S.screen==='game' ? (S.routeStep+':'+S.floorIdx) : ''); }
function pcTargetOk(n){ const l = pcLayer(); return l ? (l===n || l.contains(n)) : !n.closest('.modal-overlay'); }
// Where the cursor starts on a screen: a legal die in a fight, else the gold main button, else the first thing.
function pcStartTarget(ts){
  return ts.find(n=> n.matches('#tray > .die.selectable')) || ts.find(n=> n.matches('#tray > .die:not(.blank)'))
      || ts.find(n=> n.classList.contains('primary')) || ts.slice().sort((a,b)=>{ const A = pcCentre(a), B = pcCentre(b); return (A.y-B.y) || (A.x-B.x); })[0];
}
function pcMove(dx, dy){
  if(!pcMode()) return;
  const ts = pcTargets(); if(!ts.length) return;
  if(!pcCurOn || !pcCur || !pcCur.isConnected || !ts.includes(pcCur)){ pcCurOn = true; pcCursorSet(ts.includes(pcCur) ? pcCur : pcStartTarget(ts)); return; }
  if(pcCur.matches('input[type="range"]') && dx){ // a slider: left/right change it
    const st = parseFloat(pcCur.step)||1; pcCur.value = Math.max(+pcCur.min||0, Math.min(+pcCur.max||100, (+pcCur.value) + dx*st*5));
    pcCur.dispatchEvent(new Event('input', {bubbles:true})); pcCur.dispatchEvent(new Event('change', {bubbles:true})); return; }
  const c = pcCentre(pcCur); let best = null, bs = 1e9;
  for(const n of ts){ if(n===pcCur) continue;
    const r = n.getBoundingClientRect(), o = c.r;
    // distance between the two boxes along the move (edge to edge) and how far off to the side the box lies
    const along = dx ? (dx>0 ? r.left - o.right : o.left - r.right) : (dy>0 ? r.top - o.bottom : o.top - r.bottom);
    const cx = r.left+r.width/2, cy = r.top+r.height/2;
    const fwd = dx ? (cx - c.x)*dx : (cy - c.y)*dy; if(fwd < 6) continue;
    const side = dx ? Math.max(0, Math.max(r.top - o.bottom, o.top - r.bottom)) : Math.max(0, Math.max(r.left - o.right, o.left - r.right));
    const offc = dx ? Math.abs(cy - c.y) : Math.abs(cx - c.x);
    if(offc > fwd*3 + 70) continue; // far off the line of travel (e.g. the gear from the button rail): not "that way"
    const score = Math.max(0, along) + side*3 + offc*0.35 + fwd*0.05;
    if(score < bs){ bs = score; best = n; }
  }
  if(best) pcCursorSet(best);
}
function pcDown(){
  if(!pcMode()) return;
  if(S && S.screen==='game' && S.needRoll && !pcLayer()){ try{ scrambleRoll(0, -1); }catch(e){} return; } // the chest lid: A opens it
  if(!pcCurOn || !pcCur || !pcCur.isConnected){ pcMove(0, 0); return; }
  const c = pcCentre(pcCur); pcPress = pcCur;
  try{ pcCur.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, cancelable:true, clientX:c.x, clientY:c.y, pointerType:'mouse', isPrimary:true, button:0, buttons:1})); }catch(e){}
  pcCursorRing().classList.add('down');
}
function pcUp(){
  const n = pcPress; pcPress = null; pcCursorRing().classList.remove('down');
  if(!n || !n.isConnected) return;
  const c = pcCentre(n);
  try{ n.dispatchEvent(new PointerEvent('pointerup', {bubbles:true, cancelable:true, clientX:c.x, clientY:c.y, pointerType:'mouse', isPrimary:true, button:0})); }catch(e){}
  if(n.id==='chest-lid' || n.id==='shrine-lid'){ try{ scrambleRoll(0, -1); }catch(e){} return; }
  if(n.matches('input[type="text"], input:not([type])')){ n.focus(); return; }
  n.click();
  requestAnimationFrame(pcCursorDraw);
}
function pcBack(){
  if(!pcMode()) return;
  const layer = pcLayer();
  if(layer && layer.classList.contains('modal-overlay')){
    const x = layer.querySelector('.modal-x-btn'); if(x){ x.click(); return; }
    if(typeof layer.onclick==='function'){ try{ layer.onclick({target:layer}); }catch(e){} }
    return;
  }
  if(layer) return; // a door: there is nothing to go back to
  if(!S || S.screen!=='game') return;
  if(typeof abilityArmed!=='undefined' && abilityArmed){ const b = document.getElementById('ability-btn'); if(b) b.click(); return; }
  if(S.trayAct || !S.path.length){ const b = document.getElementById('clear-path-btn'); if(b && (S.trayAct)) b.click(); return; }
  const last = document.querySelector(`#tray > .die[data-idx="${S.path[S.path.length-1]}"]`); if(last) last.click(); // step back one
}
function pcQuick(id){ if(!pcMode() || pcLayer()) return; const b = document.getElementById(id); if(b && !b.classList.contains('disabled')) b.click(); }
function pcGo(){ if(!pcMode() || pcLayer() || !S || S.screen!=='game') return; if(S.needRoll){ try{ scrambleRoll(0, -1); }catch(e){} return; } pcQuick('resolve-btn'); }

document.addEventListener('keydown', ev=>{
  if(!pcMode()) return;
  const inText = document.activeElement && document.activeElement.matches && document.activeElement.matches('input[type="text"], input:not([type]), textarea');
  const k = ev.key;
  if(inText){ if(k==='Escape' || k==='Enter') document.activeElement.blur(); return; }
  const dir = {ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1]}[k];
  if(dir){ pcMove(dir[0], dir[1]); ev.preventDefault(); return; }
  if(k===' ' || k==='Spacebar'){ if(!ev.repeat) pcDown(); ev.preventDefault(); return; }
  if(k==='Escape'){ pcBack(); ev.preventDefault(); return; }
  // Enter stays Go in a fight (the older handler above); on every other screen it presses what the cursor is on
  if(k==='Enter' && pcCurOn && (pcLayer() || !S || S.screen!=='game')){ if(!ev.repeat){ pcDown(); pcUp(); } ev.preventDefault(); ev.stopImmediatePropagation(); }
}, true);
document.addEventListener('keyup', ev=>{ if(pcMode() && (ev.key===' ' || ev.key==='Spacebar')){ pcUp(); ev.preventDefault(); } }, true);
document.addEventListener('mousemove', ev=>{ if(pcCurOn && (Math.abs(ev.movementX)+Math.abs(ev.movementY) > 2)){ pcCurOn = false; pcCursorDraw(); } }, {passive:true});
window.addEventListener('scroll', ()=>{ if(pcCurOn) pcCursorDraw(); }, true);

// Controllers (Steam Deck, any standard-mapping pad). Polled once a frame while one is connected.
// buttons: 0 A, 1 B, 2 X, 3 Y, 8 Select/View, 9 Start/Menu, 12-15 D-pad; axes 0/1 = left stick.
const pcPad = {prev:{}, dir:null, at:0, rep:0};
function pcPadPoll(){
  let pads = []; try{ pads = window.__pcPads || (navigator.getGamepads ? [...navigator.getGamepads()] : []); }catch(e){}
  const gp = pads.find(p=> p && p.connected!==false && p.buttons && p.buttons.length);
  if(gp && pcMode()){
    if(!pcPadSeen){ pcPadSeen = true; document.body.classList.add('pad'); try{ pcHoverRender(); }catch(e){} }
    const b = i=> !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
    const edge = (i, down, up)=>{ const now = b(i), was = !!pcPad.prev[i]; if(now && !was && down) down(); if(!now && was && up) up(); pcPad.prev[i] = now; };
    edge(0, pcDown, pcUp); edge(1, pcBack); edge(2, ()=>pcQuick('ability-btn')); edge(3, pcGo); edge(9, pcGo);
    edge(8, ()=>{ const s = document.getElementById('settings-btn'); if(s && !pcLayer()) s.click(); });
    const ax = gp.axes || [], x = (b(15)?1:0) - (b(14)?1:0) || (Math.abs(ax[0]||0) > 0.55 ? Math.sign(ax[0]) : 0), y = (b(13)?1:0) - (b(12)?1:0) || (Math.abs(ax[1]||0) > 0.55 ? Math.sign(ax[1]) : 0);
    const dir = x ? (x>0?'R':'L') : y ? (y>0?'D':'U') : null, now = performance.now();
    if(dir !== pcPad.dir){ pcPad.dir = dir; pcPad.at = now; pcPad.rep = 0; if(dir) pcMove(x, x?0:y); }
    else if(dir && now - pcPad.at > (pcPad.rep ? 130 : 300)){ pcPad.at = now; pcPad.rep++; pcMove(x, x?0:y); } // held: repeat
  }
  if(pcCurOn) pcCursorDraw(); // keeps the ring on its target through redraws and animations
  requestAnimationFrame(pcPadPoll);
}
requestAnimationFrame(pcPadPoll);
