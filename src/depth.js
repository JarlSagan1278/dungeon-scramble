/* ============================================================
   DEPTH -- optional difficulty menu + the cosmetics it unlocks.
   Depth 1 (shown to players as Depth 0) is the base game (already tuned: BASE_HP_MUL below). Every
   modifier rank you take adds its cost to the run's Depth. Winning at a
   given Depth records it per class (badge on Setup/Title) and across the
   account (dice finishes). Nothing here changes how dice/faces work.
   ============================================================ */

// Floor-by-floor enemy HP multiplier for the base game (Depth 1).
const BASE_HP_MUL = [1, 1.5, 1.75];

// v1.39.3 (Oct 12 depth study): ranks reshaped/recosted so each point of depth is worth about the same
// (~6 win points for a skilled player). costs[] = depth added by each rank, in order.
// Oct 13 (Jeremy): Swarming capped at 2 ranks (rank 3 was the cheap stack: +6 depth for little difficulty); rank 2 costs
// 2 depth, not 3 (1.41.0 depth study: it was -4.3 win points per depth point vs about -6.5 elsewhere).
// Oct 15 (per-modifier study, docs/studies/2026-10-15_depth_modifiers.md): Rounding Error 1 -> 2 depth (it cost ~17 win points),
// Rationing rank 2 2 -> 1 depth (~9 points for 2 depth). The rest stay: modest unevenness is part of the fun (Jeremy).
const DEPTH_MODS = [
  { id:'foes',  name:'Tougher Scuffs', max:4, costs:[1,1,1,1], desc:r=>`Enemies and bosses have +${r*15}% HP.` },
  { id:'rest',  name:'Rationing Rations', max:2, costs:[1,1], desc:r=> r===2 ? 'Camp rest heals nothing.' : 'Camp rest heals half as much.' },
  { id:'frail', name:'Clumsy',         max:3, costs:[1,1,2], desc:r=>`Start with ${r*4} less max HP.` },
  { id:'swarm', name:'Swarming',       max:2, costs:[1,2], desc:r=>`Minion spawns place ${r} extra die${r>1?'s':''}.` },
  { id:'slim',  name:'Burden of Choice', max:1, costs:[1], desc:r=> 'Overkills add no loot option, and every loot reward offers one fewer die.' },
  { id:'fury',  name:'Zeal',           max:2, costs:[3,1], desc:r=> r===1 ? 'Every enemy hit deals +1 damage.' : 'Every enemy hit deals +1 damage, and heavy turns and boss specials +1 more.' },
  { id:'dread', name:'Dread',          max:3, costs:[1,1,1], desc:r=>`Deadly encounters are ${r*12}% more likely to take an Elite room, Elite and Deadly foes have +${Math.round(r*DREAD_HP*100)}% HP, and Floor 1 gains its own Deadly card.` },
  // Oct 12 (Jeremy: "test out these two"): cheap one-point levers, being measured.
  { id:'dues',  name:'Union Dues',     max:1, costs:[1], desc:r=>'Receiving a shrine\'s boon costs 2 HP.' },
  { id:'round', name:'Rounding Error', max:1, costs:[2], desc:r=>'Your Heal faces heal 1 less (never below 1).' },
  { id:'gauntlet', name:'Night Shift', max:2, costs:[1,2], desc:r=> r===1 ? 'Easy rooms become Standard rooms. Shrines appear as usual.' : 'Easy and Standard rooms become Elite rooms. Shrines appear as usual.' },
];
const DEPTH_MOD_BY_ID = Object.fromEntries(DEPTH_MODS.map(m=>[m.id,m]));

// Depth presets (Jeremy, Oct 24): the -/+ beside the Depth number picks a ready-made set of modifiers for that depth;
// the modifier list still adjusts them one by one. Ranks are added in this order (gentlest first), skipping any that
// would overshoot, so preset N always comes to exactly depth N (a 2- or 3-point rank can swap out a 1-point one).
const DEPTH_PRESET_ORDER = ['foes','rest','frail','swarm','dread','foes','dues','gauntlet','rest','frail','dread','foes','slim','round','swarm','fury','dread','foes','frail','gauntlet','fury'];
function depthPreset(n){
  const mods = {}; let d = 0; const stop = new Set();
  for(const id of DEPTH_PRESET_ORDER){
    if(stop.has(id)) continue;
    const m = DEPTH_MOD_BY_ID[id], r = mods[id]||0;
    if(r>=m.max){ stop.add(id); continue; }
    const c = m.costs[r];
    if(d + c <= n){ mods[id] = r+1; d += c; } else stop.add(id);
  }
  return mods;
}
function sameMods(a, b){ const ka = Object.keys(a).filter(k=>a[k]), kb = Object.keys(b).filter(k=>b[k]); return ka.length===kb.length && ka.every(k=>a[k]===b[k]); }

const DREAD_HP = 0.2; // Dread: extra HP per rank on Elite/Deadly foes
// Depth added by the first r ranks of modifier m.
function depthModCost(m, r){ let d = 0; for(let i=0;i<r;i++) d += m.costs[Math.min(i, m.costs.length-1)]; return d; }
function depthFromMods(mods){
  let d = 1;
  DEPTH_MODS.forEach(m=>{ d += depthModCost(m, (mods&&mods[m.id])||0); });
  return d;
}
function depthRank(id){ return (S && S.depthMods && S.depthMods[id]) || 0; }
function currentDepth(){ return (S && S.depth) || 1; }
// Shown depth (Jeremy, Oct 12): the base dungeon reads as Depth 0. Internally the base stays 1, so saves, badges and unlocks are unchanged.
function depthLabel(d){ return (d||1) - 1; }
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
const FINISH_AT = [4, 6, 8, 10]; // best depth needed for tier 1..4 (internal; shown as 3, 5, 7, 9 -- Jeremy, Oct 14; was 0/3/6/10)
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
// Oct 21 (Jeremy, "try it"): each class has its own badge shape -- Guard a shield, Armsmaster crossed swords
// behind the medal, Arcanist an eight-point star with its X, Dungeoneer a stone archway. The rim keeps the
// bronze/silver/gold tier colours; unknown classes keep the old rosette.
const BADGE_ROSETTE = 'M52 4L60 9L70 7L75 16L85 20L84 31L92 39L88 49L93 59L85 66L84 77L74 80L68 89L58 87L52 94L46 87L36 89L30 80L20 77L19 66L11 59L16 49L12 39L20 31L19 20L29 16L34 7L44 9Z';
function badgeStar(){ let d=''; for(let i=0;i<16;i++){ const r=i%2?33:45, t=(i*22.5-90)*Math.PI/180; d+=(i?'L':'M')+(52+r*Math.cos(t)).toFixed(1)+' '+(48+r*Math.sin(t)).toFixed(1); } return d+'Z'; }
function badgeSword(rot){
  return `<g transform="rotate(${rot} 52 48)"><path d="M48.5 -6L52 -14L55.5 -6L55.5 80L48.5 80Z" fill="#dfe6ea" stroke="#0c0705" stroke-width="3.5" stroke-linejoin="round"/><path d="M52 -9L52 78" stroke="#9aa6ad" stroke-width="1.6"/>`
    + `<rect x="38" y="80" width="28" height="7" rx="3" fill="#c99a3a" stroke="#0c0705" stroke-width="3.2"/><rect x="48.5" y="87" width="7" height="11" fill="#6b3f1e" stroke="#0c0705" stroke-width="3"/><circle cx="52" cy="101" r="4.5" fill="#c99a3a" stroke="#0c0705" stroke-width="3"/></g>`;
}
function depthBadgeSVG(classColor, depth, size, classId){
  size = size || 64;
  const tier = finishTierFor(depth);
  const [r1, r2] = BADGE_RIM[tier] || BADGE_RIM[1];
  const gid = 'bg' + Math.random().toString(36).slice(2,7);
  const rim = (d)=>`<path d="${d}" fill="url(#${gid})" stroke="#0c0705" stroke-width="5" stroke-linejoin="round"/>`;
  const field = (d)=>`<path d="${d}" fill="${classColor}" stroke="#0c0705" stroke-width="4.5" stroke-linejoin="round"/>`;
  let body, ty = 38, ny = 66;
  if(classId==='guard'){
    body = rim('M52 4L92 15L92 46C92 73 74 88 52 99C30 88 12 73 12 46L12 15Z') + field('M52 15L82 23L82 46C82 66 68 79 52 88C36 79 22 66 22 46L22 23Z');
    ty = 41; ny = 69;
  } else if(classId==='armsmaster'){
    body = badgeSword(-45) + badgeSword(45) + `<circle cx="52" cy="48" r="33" fill="url(#${gid})" stroke="#0c0705" stroke-width="5"/><circle cx="52" cy="48" r="26" fill="${classColor}" stroke="#0c0705" stroke-width="4.5"/>`;
  } else if(classId==='arcanist'){
    body = rim(badgeStar()) + `<circle cx="52" cy="48" r="29" fill="${classColor}" stroke="#0c0705" stroke-width="4.5"/>`
      + `<path d="M33 29L71 67M71 29L33 67" stroke="#fff" stroke-opacity=".15" stroke-width="5" stroke-linecap="round"/>`;
  } else if(classId==='dungeoneer'){
    const bricks = [[-60,36],[-25,36],[25,36],[60,36],[-90,14],[90,14]].map(([a])=>{ const t=(a-90)*Math.PI/180; return `M${(52+29*Math.cos(t)).toFixed(1)} ${(52+29*Math.sin(t)).toFixed(1)}L${(52+39*Math.cos(t)).toFixed(1)} ${(52+39*Math.sin(t)).toFixed(1)}`; }).join('');
    body = rim('M12 98L12 52A40 40 0 0 1 92 52L92 98Z') + `<path d="${bricks}M12 76L22 76M82 76L92 76" stroke="#0c0705" stroke-width="3" stroke-opacity=".55"/>`
      + field('M22 98L22 54A30 30 0 0 1 82 54L82 98Z') + `<path d="M45 8L59 8L57 22L47 22Z" fill="url(#${gid})" stroke="#0c0705" stroke-width="3.5" stroke-linejoin="round"/>`;
    ty = 50; ny = 78;
  } else {
    body = rim(BADGE_ROSETTE) + `<circle cx="52" cy="48" r="30" fill="${classColor}" stroke="#0c0705" stroke-width="4.5"/>`;
  }
  return `<svg class="depth-badge" width="${size}" height="${Math.round(size*1.2)}" viewBox="0 0 104 124" aria-hidden="true">
<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${r1}"/><stop offset="1" stop-color="${r2}"/></linearGradient></defs>
<path d="M30 70L20 120L36 108L48 122L56 76Z" fill="${classColor}" stroke="#0c0705" stroke-width="4.5" stroke-linejoin="round"/><path d="M74 70L84 120L68 108L56 122L48 76Z" fill="${classColor}" stroke="#0c0705" stroke-width="4.5" stroke-linejoin="round"/><path d="M30 70L20 120L36 108L48 122L56 76Z" fill="#000" opacity=".25"/>
${body}
<ellipse cx="44" cy="${ty-4}" rx="17" ry="9" fill="#fff" opacity=".16" transform="rotate(-25 44 ${ty-4})"/>
<text x="52" y="${ty}" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="800" fill="#fff" fill-opacity=".9" letter-spacing="2">DEPTH</text>
<text x="52" y="${ny}" text-anchor="middle" font-family="Georgia,serif" font-size="${depthLabel(depth)>9?26:32}" font-weight="800" fill="#fff" stroke="#0c0705" stroke-opacity=".75" stroke-width="1.6" paint-order="stroke">${depthLabel(depth)}</text></svg>`;
}
function depthBadgeEmptySVG(size){
  size = size || 64;
  return `<svg class="depth-badge empty" width="${size}" height="${Math.round(size*1.2)}" viewBox="0 4 104 124" aria-hidden="true"><circle cx="52" cy="50" r="34" fill="rgba(0,0,0,.25)" stroke="#e3caa3" stroke-opacity=".5" stroke-width="3" stroke-dasharray="6 6"/><text x="52" y="60" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="#e3caa3" fill-opacity=".6">?</text></svg>`;
}
function classBadgeHTML(klass, size, withScore){
  const b = DEPTH_BEST.byClass[klass.id];
  if(!b || !b.depth) return `<div class="depth-badge-wrap">${depthBadgeEmptySVG(size)}<div class="depth-badge-pill">Not cleared</div></div>`;
  return `<div class="depth-badge-wrap">${depthBadgeSVG(klass.color, b.depth, size, klass.id)}${withScore?`<div class="depth-badge-pill">${b.score.toLocaleString()}</div>`:''}</div>`;
}

/* ---- Dice finish (filigree border + corner plates), drawn as an overlay ----
   Oct 14 (Jeremy): kept to the die's outer rim so it never covers the name, face icon or label:
   a thin rim, small corner scrolls (inside ~15% of each corner), no inner frame line. */
function finishSVG(tier){
  const scroll = `<path d="M13 31C13 19 19 13 31 13C40 13 42 22 36 24C31 26 27 20 33 19"/>`;
  const corner = `<g transform="translate(-1.8,-1.8) scale(.42)">${scroll}<g transform="matrix(0 1 1 0 0 0)">${scroll}</g></g>`;
  const four = (g)=>`<g>${g}</g><g transform="translate(100,0) scale(-1,1)">${g}</g><g transform="translate(0,100) scale(1,-1)">${g}</g><g transform="translate(100,100) scale(-1,-1)">${g}</g>`;
  const dia = (x,y,r)=>`<path d="M${x} ${y-r}L${x+r} ${y}L${x} ${y+r}L${x-r} ${y}Z"/>`;
  const mids = dia(50,3.2,2.8)+dia(50,96.8,2.8)+dia(3.2,50,2.8)+dia(96.8,50,2.8);
  const plate = `<path d="M2.5 2.5H12.5L2.5 12.5Z"/>`;
  const frame = `<rect x="2.6" y="2.6" width="94.8" height="94.8" rx="10" fill="none"/>`;
  let body = '';
  if(tier===1){
    const c = '#e0a566';
    body = `<g stroke="#1c140c" stroke-width="4.2" fill="none">${frame}${four(corner)}</g><g stroke="${c}" stroke-width="2" fill="none">${frame}</g><g stroke="${c}" stroke-width="1.7" fill="none" stroke-linecap="round">${four(corner)}</g>`;
  } else if(tier===2){
    const c = '#e3e8ec', f = '#c4ccd3';
    body = `<g stroke="#1c140c" stroke-width="4.2" fill="none">${frame}${four(corner)}</g><g stroke="${c}" stroke-width="2" fill="none">${frame}</g><g stroke="${c}" stroke-width="1.7" fill="none" stroke-linecap="round">${four(corner)}</g><g fill="${f}" stroke="#1c140c" stroke-width="1">${mids}</g>`;
  } else {
    const c = tier===4 ? '#fff0a8' : '#f6d56a', f = tier===4 ? '#f0c64a' : '#e8b83a', sc = tier===4 ? '#f0c64a' : c;
    body = `<g stroke="#1c140c" stroke-width="${tier===4?4.8:4.4}" fill="none" stroke-linecap="round">${frame}${four(corner)}</g><g fill="#1c140c" stroke="#1c140c" stroke-width="2">${four(plate)}${mids}</g>`
      + `<g stroke="${c}" stroke-width="${tier===4?2.3:2.1}" fill="none">${frame}</g><g stroke="${sc}" stroke-width="1.8" fill="none" stroke-linecap="round">${four(corner)}</g>`
      + `<g fill="${f}" stroke="#1c140c" stroke-width=".8">${four(plate)}</g><g fill="${c}" stroke="#1c140c" stroke-width="1">${mids}</g>`;
    if(tier===4){
      const gem = (col)=>`<circle cx="7.4" cy="7.4" r="3.2" fill="${col}" stroke="#1c140c" stroke-width="1"/><circle cx="6.6" cy="6.6" r="1" fill="#fff" opacity=".85"/>`;
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
    ${depthBadgeSVG(c, r.depth, 92, S.klass.id)}
    <div class="depth-seal-text">
      <div class="depth-seal-kicker">${r.newClassBest ? 'New best depth' : 'Depth '+depthLabel(r.depth)+' cleared'}</div>
      <div class="depth-seal-title">${depthTitleFor(r.depth)}</div>
      <div class="depth-seal-who"><b>${S.charName||S.origin.name}</b> &middot; ${S.origin.name} ${S.klass.name}</div>
      <div class="depth-seal-score">Score <b>${r.score.toLocaleString()}</b> &middot; ${S.stats.turnsTaken} turns</div>
      ${newTier}
    </div></div>`;
}

function depthMenuHTML(){
  return `<div class="setup-section depth-section" id="depth-section">
    <div class="depth-toggle" id="depth-bar">
      <button type="button" class="depth-pm" id="depth-minus" aria-label="Shallower preset">&minus;</button>
      <span class="depth-num" id="depth-num">0</span>
      <button type="button" class="depth-pm" id="depth-plus" aria-label="Deeper preset">+</button>
      <button type="button" class="depth-open" id="depth-toggle" aria-expanded="false">
        <span class="depth-toggle-text"><span class="depth-toggle-title">Depth</span><span class="depth-toggle-sub" id="depth-sub"></span></span>
        <span class="depth-chevron" aria-hidden="true"><svg viewBox="0 0 12 12" width="14" height="14"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      </button>
    </div>
    <div class="depth-body" id="depth-body" hidden>
      <div class="depth-limit" id="depth-limit"></div>
      <div id="depth-rows"></div>
    </div></div>`;
}
function wireDepthMenu(state){
  const rows = document.getElementById('depth-rows');
  if(!rows) return;
  const tg = document.getElementById('depth-toggle'), body = document.getElementById('depth-body');
  const bar = document.getElementById('depth-bar');
  const setOpen = (open)=>{ body.hidden = !open; tg.setAttribute('aria-expanded', open?'true':'false'); bar.classList.toggle('open', open); };
  tg.onclick = (ev)=>{ ev.stopPropagation(); setOpen(body.hidden); };
  const sec = document.getElementById('depth-section');
  sec.addEventListener('click', ev=>ev.stopPropagation());
  if(window._depthOutside) document.removeEventListener('click', window._depthOutside);
  window._depthOutside = ()=>{ if(document.getElementById('depth-body') && !document.getElementById('depth-body').hidden) setOpen(false); };
  document.addEventListener('click', window._depthOutside);
  function draw(){
    const d = depthFromMods(state.mods);
    document.getElementById('depth-num').textContent = depthLabel(d);
    const n = Object.keys(state.mods).length;
    const preset = d>1 && sameMods(state.mods, depthPreset(d-1));
    document.getElementById('depth-sub').innerHTML = d===1 ? 'Standard dungeon' : `${preset?'Preset':'Custom'} &middot; ${n} modifier${n>1?'s':''} &middot; score &times;${depthScoreMul(d).toFixed(2)}`;
    document.getElementById('depth-minus').disabled = d<=1;
    document.getElementById('depth-plus').disabled = d>=maxSelectableDepth();
    document.getElementById('depth-limit').textContent = d>=maxSelectableDepth() ? `Clear depth ${depthLabel(maxSelectableDepth())} to unlock deeper.` : `Up to depth ${depthLabel(maxSelectableDepth())} unlocked.`;
    rows.innerHTML = DEPTH_MODS.map(m=>{
      const r = state.mods[m.id]||0;
      const next = r<m.max ? m.costs[r] : m.costs[m.max-1];
      const canUp = r<m.max && (d + next) <= maxSelectableDepth();
      return `<div class="depth-row ${r?'on':''}"><div class="depth-row-text"><div class="depth-row-name">${m.name} <span class="depth-cost">${r<m.max ? '+'+next : '+'+depthModCost(m, r)+' total'}</span></div><div class="depth-row-desc">${r?m.desc(r):m.desc(1)}</div></div>
        <div class="depth-step"><button type="button" data-id="${m.id}" data-dir="-1" ${r?'':'disabled'}>&minus;</button><span>${r}/${m.max}</span><button type="button" data-id="${m.id}" data-dir="1" ${canUp?'':'disabled'}>+</button></div></div>`;
    }).join('');
    rows.querySelectorAll('button').forEach(b=>{
      b.onclick = ()=>{ const id=b.dataset.id; const v=(state.mods[id]||0)+Number(b.dataset.dir); state.mods[id]=Math.max(0,v); if(!state.mods[id]) delete state.mods[id]; draw(); };
    });
  }
  // Preset stepper: one depth shallower/deeper, as that depth's ready-made set (replaces any custom picks).
  const step = (dir)=>{ const shown = depthLabel(depthFromMods(state.mods)); const n = Math.max(0, Math.min(depthLabel(maxSelectableDepth()), shown+dir));
    Object.keys(state.mods).forEach(k=>delete state.mods[k]); Object.assign(state.mods, depthPreset(n)); draw(); };
  document.getElementById('depth-minus').onclick = (ev)=>{ ev.stopPropagation(); step(-1); };
  document.getElementById('depth-plus').onclick = (ev)=>{ ev.stopPropagation(); step(1); };
  draw();
}
