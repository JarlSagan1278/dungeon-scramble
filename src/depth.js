/* ============================================================
   DEPTH -- optional difficulty menu + the cosmetics it unlocks.
   Depth 1 is the base game (already tuned: BASE_HP_MUL below). Every
   modifier rank you take adds its cost to the run's Depth. Winning at a
   given Depth records it per class (badge on Setup/Title) and across the
   account (dice finishes). Nothing here changes how dice/faces work.
   ============================================================ */

// Floor-by-floor enemy HP multiplier for the base game (Depth 1).
const BASE_HP_MUL = [1, 1.5, 1.75];

const DEPTH_MODS = [
  { id:'foes',  name:'Tougher Foes',   max:4, cost:1, desc:r=>`Enemies and bosses have +${r*15}% HP.` },
  { id:'rest',  name:'Hard Rations',   max:3, cost:1, desc:r=>`Camp rest heals ${r*25}% less.` },
  { id:'frail', name:'Frail',          max:3, cost:1, desc:r=>`Start with ${r*3} less max HP.` },
  { id:'swarm', name:'Swarm',          max:3, cost:1, desc:r=>`Minion spawns place ${r} extra die${r>1?'s':''}.` },
  { id:'slim',  name:'Slim Pickings',  max:2, cost:1, desc:r=> r===1 ? 'Overkills no longer add a loot option.' : 'Overkills add no loot option, and bosses offer one fewer.' },
  { id:'fury',  name:'Fury',           max:2, cost:2, desc:r=>`Every enemy hit deals +${r} damage.` },
  { id:'dread', name:'Dread',          max:3, cost:1, desc:r=>`Deadly encounters are ${r*12}% more likely to take an Elite room, and Floor 1 gains its own Deadly card.` },
  { id:'gauntlet', name:'Gauntlet',    max:2, cost:2, desc:r=> r===1 ? 'Easy rooms become Standard rooms.' : 'Easy and Standard rooms become Elite rooms.' },
];
const DEPTH_MOD_BY_ID = Object.fromEntries(DEPTH_MODS.map(m=>[m.id,m]));

function depthFromMods(mods){
  let d = 1;
  DEPTH_MODS.forEach(m=>{ d += ((mods&&mods[m.id])||0) * m.cost; });
  return d;
}
function depthRank(id){ return (S && S.depthMods && S.depthMods[id]) || 0; }
function currentDepth(){ return (S && S.depth) || 1; }
function depthScoreMul(depth){ return 1 + 0.25*((depth||1)-1); }

function floorHpMul(floorIdx){
  return (BASE_HP_MUL[floorIdx]||1) * (1 + 0.15*depthRank('foes'));
}

/* ---- Persistent bests ---- */
const DEPTH_BEST_KEY = 'dungeonScrambleDepthBest_v1';
function loadDepthBest(){
  try{
    const o = JSON.parse(localStorage.getItem(DEPTH_BEST_KEY));
    if(o && typeof o==='object') return { overall:o.overall||0, byClass:o.byClass||{} };
  } catch(e){}
  return { overall:0, byClass:{} };
}
let DEPTH_BEST = loadDepthBest();
function saveDepthBest(){ try{ localStorage.setItem(DEPTH_BEST_KEY, JSON.stringify(DEPTH_BEST)); } catch(e){} }

// How deep the Setup menu lets you go: two more than your deepest clear.
function maxSelectableDepth(){ return Math.max(DEPTH_BEST.overall, 1) + 2; }
function depthMenuUnlocked(){ return (META.lifetime.victories||0) >= 1 || (typeof debugArmed!=='undefined' && debugArmed); }

/* ---- Finish tiers (dice borders), account-wide ---- */
const FINISH_AT = [1, 4, 7, 11]; // best depth needed for tier 1..4
const FINISH_NAMES = ['', 'Bronze', 'Silver', 'Gold', 'Royal'];
function finishTierFor(best){ let t = 0; FINISH_AT.forEach((d,i)=>{ if(best>=d) t = i+1; }); return t; }
function currentFinishTier(){ return finishTierFor(DEPTH_BEST.overall); }
const DEPTH_TITLES = ['', 'Delver of the Deep', 'Dread Delver', 'Dungeon Breaker', 'Scourge of the Dungeon'];
function depthTitleFor(best){ return DEPTH_TITLES[finishTierFor(best)] || ''; }

function computeRunScore(){
  const st = S.stats;
  const base = 1000 + st.encountersDefeated*100 + Math.max(0, 600 - 6*st.turnsTaken) + Math.max(0, S.health)*20;
  return Math.round(base * depthScoreMul(currentDepth()) / 10) * 10;
}

// Called once from recordRunHistory(); stores the result on S for the end screens.
function recordDepthResult(outcome){
  const depth = currentDepth();
  const prevTier = currentFinishTier();
  const res = { depth, outcome, score:0, newClassBest:false, newTier:0, title:'' };
  if(outcome==='victory'){
    res.score = computeRunScore();
    const cid = S.klass.id;
    const prev = DEPTH_BEST.byClass[cid] || { depth:0, score:0 };
    if(depth > prev.depth){ res.newClassBest = true; }
    DEPTH_BEST.byClass[cid] = { depth: Math.max(prev.depth, depth), score: Math.max(prev.score, res.score) };
    if(depth > DEPTH_BEST.overall) DEPTH_BEST.overall = depth;
    saveDepthBest();
    const nowTier = currentFinishTier();
    if(nowTier > prevTier) res.newTier = nowTier;
    res.title = depthTitleFor(depth);
  }
  S.depthResult = res;
  return res;
}

/* ---- Class badge (rosette) ---- */
const BADGE_RIM = { 1:['#d79a5a','#7a4a22'], 2:['#e3e8ec','#8a949c'], 3:['#f6d56a','#b8872a'], 4:['#fff0a8','#c08a1e'] };
function depthBadgeSVG(classColor, depth, size){
  size = size || 64;
  const tier = finishTierFor(depth);
  const [r1, r2] = BADGE_RIM[tier] || BADGE_RIM[1];
  const gid = 'bg' + Math.random().toString(36).slice(2,7);
  return `<svg class="depth-badge" width="${size}" height="${Math.round(size*1.2)}" viewBox="0 0 104 124" aria-hidden="true">
<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${r1}"/><stop offset="1" stop-color="${r2}"/></linearGradient></defs>
<path d="M30 70L20 120L36 108L48 122L56 76Z" fill="${classColor}" stroke="#0c0705" stroke-width="4.5" stroke-linejoin="round"/><path d="M74 70L84 120L68 108L56 122L48 76Z" fill="${classColor}" stroke="#0c0705" stroke-width="4.5" stroke-linejoin="round"/><path d="M30 70L20 120L36 108L48 122L56 76Z" fill="#000" opacity=".25"/>
<path d="M52 4L60 9L70 7L75 16L85 20L84 31L92 39L88 49L93 59L85 66L84 77L74 80L68 89L58 87L52 94L46 87L36 89L30 80L20 77L19 66L11 59L16 49L12 39L20 31L19 20L29 16L34 7L44 9Z" fill="url(#${gid})" stroke="#0c0705" stroke-width="5" stroke-linejoin="round"/>
<circle cx="52" cy="48" r="30" fill="${classColor}" stroke="#0c0705" stroke-width="4.5"/>
<ellipse cx="44" cy="34" rx="17" ry="9" fill="#fff" opacity=".16" transform="rotate(-25 44 34)"/>
<text x="52" y="38" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="800" fill="#fff" fill-opacity=".9" letter-spacing="2">DEPTH</text>
<text x="52" y="66" text-anchor="middle" font-family="Georgia,serif" font-size="${depth>9?26:32}" font-weight="800" fill="#fff" stroke="#0c0705" stroke-opacity=".75" stroke-width="1.6" paint-order="stroke">${depth}</text></svg>`;
}
function depthBadgeEmptySVG(size){
  size = size || 64;
  return `<svg class="depth-badge empty" width="${size}" height="${Math.round(size*1.2)}" viewBox="0 4 104 124" aria-hidden="true"><circle cx="52" cy="50" r="34" fill="rgba(0,0,0,.25)" stroke="#e3caa3" stroke-opacity=".5" stroke-width="3" stroke-dasharray="6 6"/><text x="52" y="60" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="#e3caa3" fill-opacity=".6">?</text></svg>`;
}
function classBadgeHTML(klass, size, withScore){
  const b = DEPTH_BEST.byClass[klass.id];
  if(!b || !b.depth) return `<div class="depth-badge-wrap">${depthBadgeEmptySVG(size)}<div class="depth-badge-pill">Not cleared</div></div>`;
  return `<div class="depth-badge-wrap">${depthBadgeSVG(klass.color, b.depth, size)}${withScore?`<div class="depth-badge-pill">${b.score.toLocaleString()}</div>`:''}</div>`;
}

/* ---- Dice finish (filigree border + corner plates), drawn as an overlay ---- */
function finishSVG(tier){
  const scroll = `<path d="M13 31C13 19 19 13 31 13C40 13 42 22 36 24C31 26 27 20 33 19"/>`;
  const corner = `<g transform="scale(.66)">${scroll}<g transform="matrix(0 1 1 0 0 0)">${scroll}</g></g>`;
  const four = (g)=>`<g>${g}</g><g transform="translate(100,0) scale(-1,1)">${g}</g><g transform="translate(0,100) scale(1,-1)">${g}</g><g transform="translate(100,100) scale(-1,-1)">${g}</g>`;
  const dia = (x,y,r)=>`<path d="M${x} ${y-r}L${x+r} ${y}L${x} ${y+r}L${x-r} ${y}Z"/>`;
  const mids = dia(50,5,3)+dia(50,95,3)+dia(5,50,3)+dia(95,50,3);
  const plate = `<path d="M5 5H20L5 20Z"/>`;
  const frame = `<rect x="3.5" y="3.5" width="93" height="93" rx="10" fill="none"/>`;
  const frame2 = `<rect x="8" y="8" width="84" height="84" rx="6" fill="none"/>`;
  let body = '';
  if(tier===1){
    const c = '#e0a566';
    body = `<g stroke="#1c140c" stroke-width="5" fill="none">${frame}${four(corner)}</g><g stroke="${c}" stroke-width="2.2" fill="none">${frame}</g><g stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round">${four(corner)}</g><g stroke="${c}" stroke-width=".9" opacity=".6" fill="none">${frame2}</g>`;
  } else if(tier===2){
    const c = '#e3e8ec', f = '#c4ccd3';
    body = `<g stroke="#1c140c" stroke-width="5" fill="none">${frame}${four(corner)}</g><g stroke="${c}" stroke-width="2.2" fill="none">${frame}</g><g stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round">${four(corner)}</g><g stroke="${c}" stroke-width=".9" opacity=".7" fill="none">${frame2}</g><g fill="${f}" stroke="#1c140c" stroke-width="1.5">${mids}</g>`;
  } else {
    const c = tier===4 ? '#fff0a8' : '#f6d56a', f = tier===4 ? '#f0c64a' : '#e8b83a', sc = tier===4 ? '#f0c64a' : c;
    body = `<g stroke="#1c140c" stroke-width="${tier===4?6:5.5}" fill="none" stroke-linecap="round">${frame}${four(corner)}</g><g fill="#1c140c" stroke="#1c140c" stroke-width="3">${four(plate)}${mids}</g>`
      + `<g stroke="${c}" stroke-width="${tier===4?2.6:2.4}" fill="none">${frame}</g><g stroke="${sc}" stroke-width="2" fill="none" stroke-linecap="round">${four(corner)}</g><g stroke="${sc}" stroke-width="1" opacity=".78" fill="none">${frame2}</g>`
      + `<g fill="${f}" stroke="#1c140c" stroke-width="1">${four(plate)}</g><g fill="${c}" stroke="#1c140c" stroke-width="1.2">${mids}</g>`;
    if(tier===4){
      const gem = (col)=>`<circle cx="11" cy="11" r="3.8" fill="${col}" stroke="#1c140c" stroke-width="1.4"/><circle cx="10" cy="10" r="1.1" fill="#fff" opacity=".85"/>`;
      body += gem('#d6264a') + `<g transform="translate(100,0) scale(-1,1)">${gem('#7a4cff')}</g><g transform="translate(0,100) scale(1,-1)">${gem('#7a4cff')}</g><g transform="translate(100,100) scale(-1,-1)">${gem('#d6264a')}</g>`;
    }
  }
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>${body}</svg>`;
}
let _finishStyleTier = -1;
function applyDiceFinish(){
  const tier = currentFinishTier();
  if(tier === _finishStyleTier) return;
  _finishStyleTier = tier;
  let st = document.getElementById('finish-style');
  if(!st){ st = document.createElement('style'); st.id = 'finish-style'; document.head.appendChild(st); }
  st.textContent = tier ? `#tray .die::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:3;background:url("data:image/svg+xml;utf8,${encodeURIComponent(finishSVG(tier))}") center/100% 100% no-repeat}` : '';
}

/* ---- Setup-screen menu + end-screen seal ---- */
function depthSealHTML(){
  const r = S && S.depthResult;
  if(!r || r.outcome!=='victory') return '';
  const c = S.klass.color;
  const tier = finishTierFor(r.depth);
  const newTier = r.newTier ? `<div class="seal-unlock">New dice finish unlocked: <b>${FINISH_NAMES[r.newTier]}</b></div>` : '';
  return `<div class="depth-seal">
    ${depthBadgeSVG(c, r.depth, 92)}
    <div class="depth-seal-text">
      <div class="depth-seal-kicker">${r.newClassBest ? 'New best depth' : 'Depth '+r.depth+' cleared'}</div>
      <div class="depth-seal-title">${depthTitleFor(r.depth)}</div>
      <div class="depth-seal-who"><b>${S.charName||S.origin.name}</b> &middot; ${S.origin.name} ${S.klass.name}</div>
      <div class="depth-seal-score">Score <b>${r.score.toLocaleString()}</b> &middot; ${S.stats.turnsTaken} turns</div>
      ${newTier}
    </div></div>`;
}

function depthMenuHTML(){
  return `<div class="setup-section depth-section" id="depth-section">
    <button type="button" class="depth-toggle" id="depth-toggle" aria-expanded="false">
      <span class="depth-num" id="depth-num">1</span>
      <span class="depth-toggle-text"><span class="depth-toggle-title">Depth</span><span class="depth-toggle-sub" id="depth-sub"></span></span>
      <span class="depth-chevron" aria-hidden="true"><svg viewBox="0 0 12 12" width="14" height="14"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    </button>
    <div class="depth-body" id="depth-body" hidden>
      <div class="depth-limit" id="depth-limit"></div>
      <div id="depth-rows"></div>
    </div></div>`;
}
function wireDepthMenu(state){
  const rows = document.getElementById('depth-rows');
  if(!rows) return;
  const tg = document.getElementById('depth-toggle'), body = document.getElementById('depth-body');
  const setOpen = (open)=>{ body.hidden = !open; tg.setAttribute('aria-expanded', open?'true':'false'); tg.classList.toggle('open', open); };
  tg.onclick = (ev)=>{ ev.stopPropagation(); setOpen(body.hidden); };
  const sec = document.getElementById('depth-section');
  sec.addEventListener('click', ev=>ev.stopPropagation());
  if(window._depthOutside) document.removeEventListener('click', window._depthOutside);
  window._depthOutside = ()=>{ if(document.getElementById('depth-body') && !document.getElementById('depth-body').hidden) setOpen(false); };
  document.addEventListener('click', window._depthOutside);
  function draw(){
    const d = depthFromMods(state.mods);
    document.getElementById('depth-num').textContent = d;
    const n = Object.keys(state.mods).length;
    document.getElementById('depth-sub').innerHTML = d===1 ? 'Standard dungeon' : `${n} modifier${n>1?'s':''} &middot; score &times;${depthScoreMul(d).toFixed(2)}`;
    document.getElementById('depth-limit').textContent = d>=maxSelectableDepth() ? `Clear depth ${maxSelectableDepth()} to unlock deeper.` : `Up to depth ${maxSelectableDepth()} unlocked.`;
    rows.innerHTML = DEPTH_MODS.map(m=>{
      const r = state.mods[m.id]||0;
      const canUp = r<m.max && (d + m.cost) <= maxSelectableDepth();
      return `<div class="depth-row ${r?'on':''}"><div class="depth-row-text"><div class="depth-row-name">${m.name} <span class="depth-cost">+${m.cost}/rank</span></div><div class="depth-row-desc">${r?m.desc(r):m.desc(1)}</div></div>
        <div class="depth-step"><button type="button" data-id="${m.id}" data-dir="-1" ${r?'':'disabled'}>&minus;</button><span>${r}/${m.max}</span><button type="button" data-id="${m.id}" data-dir="1" ${canUp?'':'disabled'}>+</button></div></div>`;
    }).join('');
    rows.querySelectorAll('button').forEach(b=>{
      b.onclick = ()=>{ const id=b.dataset.id; const v=(state.mods[id]||0)+Number(b.dataset.dir); state.mods[id]=Math.max(0,v); if(!state.mods[id]) delete state.mods[id]; draw(); };
    });
  }
  draw();
}
