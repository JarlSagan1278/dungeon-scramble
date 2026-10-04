
document.getElementById('settings-btn').onclick = openSettingsModal;
applyReducedMotionClass();

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
