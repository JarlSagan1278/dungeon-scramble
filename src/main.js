
// Any uncaught error lands in the play-data log (Settings -> Export Play
// Data) with its screen, so a tester's "it froze" report comes with a stack.
window.addEventListener('error', (ev)=>{
  try{ teleLog('error', {msg:String(ev.message||'').slice(0,200), at:String((ev.error&&ev.error.stack)||'').split('\n').slice(0,3).join(' | ').slice(0,300), screen:S&&S.screen}); }catch(e){}
});
window.addEventListener('unhandledrejection', (ev)=>{
  try{ teleLog('error', {msg:'unhandledrejection: '+String(ev.reason&&ev.reason.message||ev.reason).slice(0,200), screen:S&&S.screen}); }catch(e){}
});

document.getElementById('settings-btn').onclick = openSettingsModal;
applyReducedMotionClass();
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
    if(S.needRoll){ scrambleRoll(); ev.preventDefault(); return; } // keyboard: Enter rolls
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

