
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

render();

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
  };
  sp.addEventListener('pointerdown', go); sp.addEventListener('keydown', go); sp.tabIndex = 0;
})();

