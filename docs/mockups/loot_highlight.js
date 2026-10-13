// Loot "replace which die?" highlight mockup (Oct 13). Not in the game: run in the page to patch renderSwapModal.
// variant 'A' = one Suggested die (weakest by face value) with a ribbon, pre-compared; 'B' = every die shows the net
// face-value change if replaced, best one highlighted.
function lhDieValue(d){ return d.faces.reduce((a,f)=> a + (f.type==='blank' ? 0 : (f.value||1)), 0); }
function lhPatch(variant){
  const orig = renderSwapModal;
  window.renderSwapModal = function(){
    orig();
    const inc = S.pendingLootDie, items = [...document.querySelectorAll('#swap-list .swap-item')];
    const names = [...new Set(S.tray.map(c=>c.die.name))];
    const vals = names.map(n=>lhDieValue(S.tray.find(c=>c.die.name===n).die));
    const inV = lhDieValue(inc), worst = vals.indexOf(Math.min(...vals));
    items.forEach((it,i)=>{
      if(variant==='A' && i===worst){ it.classList.add('lh-suggest'); it.insertAdjacentHTML('afterbegin','<span class="lh-ribbon">Suggested</span>'); }
      if(variant==='B'){ const d = inV - vals[i]; it.insertAdjacentHTML('afterbegin', `<span class="lh-delta ${d>0?'up':d<0?'down':''}">${d>0?'+':''}${d}</span>`); if(i===worst) it.classList.add('lh-suggest'); }
    });
    if(variant==='A' && items[worst]) items[worst].click();
    const st = document.createElement('style'); st.textContent = `
      .swap-item.lh-suggest{ outline:3px dashed #ffd76a; outline-offset:2px; border-radius:12px; }
      .lh-ribbon{ position:absolute; top:-9px; left:50%; transform:translateX(-50%); z-index:3; background:#ffd76a; color:#241c10; font-size:10px; font-weight:800; padding:0 6px; border-radius:6px; border:2px solid #0c0705; white-space:nowrap; }
      .lh-delta{ position:absolute; top:-8px; right:-6px; z-index:3; min-width:22px; text-align:center; font-size:11px; font-weight:800; padding:0 4px; border-radius:9px; border:2px solid #0c0705; background:#6b5a44; color:#fff; }
      .lh-delta.up{ background:#2f8a4a; } .lh-delta.down{ background:#a3241b; }
      .swap-item{ position:relative; }`;
    document.head.appendChild(st);
  };
}
