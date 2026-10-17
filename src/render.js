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

// Class-ability "armed" state: true for the window between tapping Skill
// and actually tapping a die in the zone to convert it. Same kind of
// transient UI state as clearConfirmArmed above (not on S), so the button
// can show it's mid-toggle instead of looking identical before and after
// the tap. Reset alongside every S.classAbilityUsed=false (logic.js) so it
// never survives into a turn/floor where nothing is actually armed.
let abilityArmed = false;

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
  if(step.dmg>0) return {pulse:'dmg', cls:'damage', text:`-${step.dmg%1?step.dmg.toFixed(1):step.dmg}`, size: Math.round(14 + Math.min(step.dmg,14)*1.4)}; // bigger hit, bigger number
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
function playStepTone(fx, pitchStep, step){
  if(!fx) return;
  // v1.39.0: one instrument per action family (see TONE_SEQUENCES).
  const t = step && step.type;
  if(step && step.dmg>0) return playTone('hit', pitchStep);
  const kind = {block:'woodKnock', heal:'bell', hot:'bell', dot:'pluck', leech:'pluck', freeze:'glass', nullify:'swell',
    boost:'whistle', fumble:'sour'}[t];
  if(kind) return playTone(kind, pitchStep);
  if(t==='dodge' || t==='leap' || t==='pivot' || t==='swap' || t==='reroll') return playWhoosh(pitchStep);
  if(fx.pulse==='move') return;
  const old = {heal:'heal', block:'block', status:'status'}[fx.pulse];
  if(old) playTone(old, 0);
}
// An airy whoosh for Maneuvers: a short band-passed noise sweep, a touch higher each step.
function playWhoosh(pitchStep){
  if(!PREFS.sound) return;
  const ctx = getAudioCtx(); if(!ctx) return;
  const now = ctx.currentTime, f = 900*Math.pow(2, Math.min(10, pitchStep||0)*0.12);
  playNoiseBurst(ctx, now, 0.14, 0.09, 'bandpass', f, 1.4);
  playNoiseBurst(ctx, now+0.04, 0.1, 0.05, 'bandpass', f*1.6, 1.8);
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
    const bow = Math.min(len*0.1, 9);
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
  hideFaceTooltip();
  if(typeof musicUpdate==='function') musicUpdate(); // start/stop the music for this screen
  if(typeof applyDiceFinish==='function') applyDiceFinish();
  document.body.classList.remove('cog-arch');
  // only screens without the room floor drop its class: removing and re-adding it on the game screen restyled the whole
  // page on every path tap (Oct 12)
  { const a = document.getElementById('app'); if(a && !(S && (S.screen==='game' || S.screen==='shrine'))) a.classList.remove('has-room-floor'); }
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
  if(S.screen==='camp'){ clearPathTrail(); renderCamp(); tuckCampCog(); maybeAutosave(); maybeScreenTransition('camp'); return; }
  if(S.screen==='shrine'){ clearPathTrail(); renderShrineEncounter(); decorateArch(); maybeAutosave(); maybeScreenTransition('shrine'); return; }
  renderGame();
  decorateArch();
  fitFoChips();
  maybeAutosave();
  maybeScreenTransition('game');
}

// ---- Doorway frame: a stone arch (with floor-by-floor creeping moss) drawn as SVG over the
// face-off card. Built after layout because it needs the card's real pixel size. Floor 1 is
// lightly mossy; floors 2 and 3 get progressively more overgrown. Growth keeps clear of the
// torches. ----
function archPath(w,h,i){ const rx=120, ry=90, r=12;
  return 'M'+i+','+(h-r)+' L'+i+','+ry+' A'+(rx-i)+','+(ry-i)+' 0 0 1 '+rx+','+i+' L'+(w-rx)+','+i+' A'+(rx-i)+','+(ry-i)+' 0 0 1 '+(w-i)+','+ry+' L'+(w-i)+','+(h-r); }
function archPoints(w,h,i,step){ const pts=[], rx=120, ry=90;
  for(let y=h-12;y>=ry;y-=step) pts.push([i,y]);
  for(let a=Math.PI;a<=1.5*Math.PI+0.001;a+=step/110) pts.push([rx+(rx-i)*Math.cos(a), ry+(ry-i)*Math.sin(a)]);
  for(let x=rx;x<=w-rx;x+=step) pts.push([x,i]);
  for(let a=1.5*Math.PI;a<=2*Math.PI+0.001;a+=step/110) pts.push([w-rx+(rx-i)*Math.cos(a), ry+(ry-i)*Math.sin(a)]);
  for(let y=ry;y<=h-12;y+=step) pts.push([w-i,y]);
  return pts; }
function archFrameSVG(w,h,lvl){
  archFrameSVG.vines = '';
  const AP = archPath(w,h,5);
  // Outlined bricks: one stone band over a black underlay, cut into bricks by thin black joints; a faint second pass on a
  // different period lightens a few bricks at irregular intervals so it reads as stonework, not stripes.
  const base = `<path d="${AP}" fill="none" stroke="#0c0705" stroke-width="14"/><path d="${AP}" fill="none" stroke="#8d7d68" stroke-width="10" stroke-dasharray="21 2.5"/><path d="${AP}" fill="none" stroke="#b3a48d" stroke-width="10" stroke-dasharray="21 47" stroke-dashoffset="-9" opacity=".32"/><path d="${AP}" fill="none" stroke="#6f6252" stroke-width="10" stroke-dasharray="21 61" stroke-dashoffset="-44" opacity=".35"/><path d="${archPath(w,h,2)}" fill="none" stroke="#a89880" stroke-width="1.5" opacity=".35"/>`;
  if(lvl<=1){
    return base + `<g fill="#4f7a34" opacity=".92">
  <circle cx="70" cy="14" r="6"/><circle cx="80" cy="9" r="4.5"/><circle cx="60" cy="20" r="4"/><circle cx="92" cy="7" r="3.5"/>
  <circle cx="${w-70}" cy="14" r="6"/><circle cx="${w-80}" cy="9" r="4.5"/><circle cx="${w-60}" cy="20" r="4"/><circle cx="${w-92}" cy="7" r="3.5"/>
  <circle cx="9" cy="${h-40}" r="5"/><circle cx="8" cy="${h-28}" r="6.5"/><circle cx="14" cy="${h-16}" r="5"/>
  <circle cx="${w-9}" cy="${h-40}" r="5"/><circle cx="${w-8}" cy="${h-28}" r="6.5"/><circle cx="${w-14}" cy="${h-16}" r="5"/>
  <circle cx="${w/2-10}" cy="4" r="4"/><circle cx="${w/2+8}" cy="3" r="3.5"/></g>
 <g stroke="#4f7a34" stroke-width="2" fill="none" stroke-linecap="round" opacity=".92">
  <path d="M66,20 q-3,14 1,26"/><path d="M84,13 q2,12 -1,20"/><path d="M${w-66},20 q3,14 -1,26"/><path d="M${w-84},13 q-2,12 1,20"/>
  <path d="M10,${h-44} q4,-10 1,-22"/><path d="M${w-10},${h-44} q-4,-10 -1,-22"/></g>`;
  }
  let s=11*lvl+3; const rnd=()=>{ s=(s*9301+49297)%233280; return s/233280; };
  const G=['#3f6a2c','#4f7a34','#5f8c3c','#6f9a46'];
  const torchZone=(x,y)=>(x<40||x>w-40)&&y>34&&y<96;   // keep the torches clear
  let out=base;
  const dens=[0,1,2.4,4.6][lvl];
  const pts=archPoints(w,h,5,6);
  let g='';
  pts.forEach(p=>{ if(torchZone(p[0],p[1])) return; if(rnd()<0.10*dens){ const n=1+Math.floor(rnd()*2*lvl); for(let k=0;k<n;k++){ g+=`<circle cx="${(p[0]+(rnd()-.5)*10).toFixed(1)}" cy="${(p[1]+(rnd()-.5)*10).toFixed(1)}" r="${(2+rnd()*(2+lvl*1.6)).toFixed(1)}" fill="${G[Math.floor(rnd()*4)]}"/>`; } } });
  out+=`<g opacity=".93">${g}</g>`;
  if(lvl>=3){
    out+=`<path d="${archPath(w,h,5)}" fill="none" stroke="#4a7430" stroke-width="9" stroke-dasharray="14 5 6 7 11 4" opacity=".8"/>`;
    out+=`<path d="${archPath(w,h,2)}" fill="none" stroke="#6f9a46" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round" opacity=".8"/>`;
  }
  const vineN=[0,4,8,13][lvl]; let v='';
  for(let k=0;k<vineN;k++){
    const t=(k+.5)/vineN, x=46+(w-92)*t+(rnd()-.5)*10, yTop=Math.max(3, 60*Math.pow(2*t-1,2)*0.9+4);
    const len=10+rnd()*(10+lvl*10); if(torchZone(x,yTop+len)) continue;
    const sway=(rnd()-.5)*10;
    v+=`<path d="M${x.toFixed(1)},${yTop.toFixed(1)} q${sway.toFixed(1)},${(len/2).toFixed(1)} ${(sway/2).toFixed(1)},${len.toFixed(1)}" stroke="${G[1]}" stroke-width="${(1.6+lvl*.4).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    if(lvl>=2){ const lx=(x+sway/2+3).toFixed(1), ly=(yTop+len*.6).toFixed(1), mx=(x+sway/2-3).toFixed(1), my=(yTop+len*.9).toFixed(1);
      v+=`<ellipse cx="${lx}" cy="${ly}" rx="3.6" ry="2" fill="${G[2]}" transform="rotate(-30 ${lx} ${ly})"/><ellipse cx="${mx}" cy="${my}" rx="3.6" ry="2" fill="${G[3]}" transform="rotate(30 ${mx} ${my})"/>`; }
  }
  archFrameSVG.vines = v; // hanging vines go on their own layer behind the quest paper (decorateArch, Oct 17)
  const n=[0,2,4,7][lvl]; let sv='';
  for(let k=0;k<n;k++){ const side=k%2?1:-1, x=side>0?w-9:9, y0=h-14-Math.floor(k/2)*10, len=22+rnd()*(14+lvl*8);
    sv+=`<path d="M${x},${y0} q${side*-4},${-len/2} ${side*-1},${-len}" stroke="${G[1]}" stroke-width="${(1.6+lvl*.4).toFixed(1)}" fill="none" stroke-linecap="round"/>`; }
  out+=sv;
  if(lvl>=2){ const fl=[0,0,5,9][lvl]; let f=''; for(let k=0;k<fl;k++){ const p=pts[Math.floor(rnd()*pts.length)]; if(torchZone(p[0],p[1])) continue; f+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.2" fill="${k%2?'#f2d35c':'#f4eee0'}"/>`; } out+=f; }
  if(lvl>=3){
    const mush=(x,y,c)=>`<g transform="translate(${x},${y})"><rect x="-1" y="0" width="2" height="5" fill="#d8d0b0"/><path d="M-5,0 a5,4 0 0 1 10,0z" fill="${c}"/><circle cx="0" cy="-1" r="9" fill="${c}" opacity=".18"/></g>`;
    out+=mush(14,h-9,'#6fe0d0')+mush(24,h-7,'#b78cf0')+mush(w-14,h-9,'#6fe0d0')+mush(w-25,h-7,'#b78cf0');
    out+=`<path d="M0,${h-8} q10,-10 8,-26" stroke="#4a3320" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M${w},${h-8} q-10,-10 -8,-26" stroke="#4a3320" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  return out;
}
// ---- Animation polish (v1.32.13) ----
// Ghost "recent damage" segment: when a bar drops, a pale chunk lingers where the lost health was
// and then slides away. State survives render() rebuilds via S._ghost so the chunk isn't cut short.
function hpFillHTML(side, cls, pct, asData){
  try{
    pct = Math.max(0, Math.min(100, pct||0));
    const noAnim = (typeof PREFS!=='undefined' && PREFS.reducedMotion);
    const g = (S._ghost = S._ghost || {});
    const st = g[side] || (g[side] = {last:pct, from:pct, t:0, hf:pct, ht:0});
    const now = performance.now();
    if(pct < st.last - 0.01){
      if(now - st.t >= 900) st.from = st.last;
      st.t = now; st.ht = 0;
    } else if(pct > st.last + 0.01){
      st.from = pct; st.t = 0;
      if(now - st.ht >= 650) st.hf = st.last;   // healing: the fill sweeps up from where it was
      st.ht = now;
    }
    st.last = pct;
    let fillStyle = `width:${pct}%`, healCls = '', dHeal = null, dGhost = null;
    const he = now - st.ht;
    if(!noAnim && st.ht && he < 650 && pct > st.hf + 0.01){
      healCls = ' hp-heal-fill';
      fillStyle += `; --from:${st.hf}%; animation-delay:-${Math.round(he)}ms`;
      dHeal = {from:st.hf, delay:Math.round(he)};
    }
    let ghost = '';
    const el = now - st.t;
    if(!noAnim && st.t && el < 900 && pct < st.from - 0.01){
      const big = Math.min(1,(st.from-pct)/35); const gc = `rgb(255,${Math.round(230-big*95)},${Math.round(196-big*110)})`;
      dGhost = {from:st.from, color:gc, delay:Math.round(el)};
      ghost = `<div class="bar-fill hp-ghost" style="left:${pct}%; width:${st.from-pct}%; background:${gc} !important; animation-delay:-${Math.round(el)}ms"></div>`;
    }
    if(asData) return {pct, heal:dHeal, ghost:dGhost};
    return `<div class="bar-fill ${cls}${healCls}" style="${fillStyle}"></div>${ghost}`;
  }catch(err){
    if(asData) return {pct, heal:null, ghost:null}; return `<div class="bar-fill ${cls}" style="width:${pct}%"></div>`; }
}
// Idle breathing: render() rebuilds the DOM, so a plain CSS loop would restart on every redraw.
// A negative delay tied to the clock keeps the loop continuous across rebuilds.
function syncIdleBreath(){
  try{
    const figs = document.querySelectorAll('#enc-panel .fo-player .fo-fig > *, #enc-panel .fo-enemy .fo-fig > *');
    figs.forEach((el,i)=>{
      const seedStr = ((S.encounter&&S.encounter.name)||'')+(S.routeStep||0)+(el.closest('.fo-enemy')?'e':'p'); let hsh=0; for(let c=0;c<seedStr.length;c++) hsh=(hsh*31+seedStr.charCodeAt(c))>>>0;
      const period = Math.round(11000 + (hsh%7000));
      el.classList.add('idle-breath', el.closest('.fo-enemy')?'idle-e':'idle-p');
      el.style.animationDuration = period+'ms';
      el.style.animationDelay = '-'+Math.round(performance.now() % period)+'ms';
    });
  }catch(err){}
  if(!glintTick._on){ glintTick._on = true; setInterval(glintTick, 200); }
}
// The art glint (Oct 13 perf pass): instead of a filter keyframe running all cycle long (which repaints every frame),
// a cheap timer flags each figure's frame for just the glint window of its idle cycle (same clock as idle-breath).
const GLINT_WIN = {p:[0.86, 0.95], e:[0.78, 0.90]};
function glintTick(){
  if(document.hidden || document.body.classList.contains('is-resolving') || (typeof PREFS!=='undefined' && (PREFS.reducedMotion || PREFS.lowIntensity))) return;
  document.querySelectorAll('#enc-panel .fo-fig > .idle-breath').forEach(el=>{
    const fig = el.parentNode, side = el.classList.contains('idle-e') ? 'e' : 'p', cls = 'glint-'+side;
    if(!fig || fig.classList.contains(cls) || fig.classList.contains('fo-dead')) return;
    const P = parseFloat(el.style.animationDuration) || 14000, ph = (performance.now() % P) / P, [a,b] = GLINT_WIN[side];
    if(ph < a || ph >= b) return;
    const ms = Math.round((b - ph) * P);
    fig.style.setProperty('--gd', ms+'ms'); fig.classList.add(cls);
    setTimeout(()=>{ fig.classList.remove(cls); }, ms + 30);
  });
}
// One-shot lunge toward the other side (Web Animations API: never fights the CSS transforms).
function lungeFigure(side, dmg){
  try{
    if(typeof PREFS!=='undefined' && (PREFS.reducedMotion || PREFS.lowIntensity)) return;
    const sel = (side==='player') ? 'player' : 'enemy';
    const el = document.querySelector(`#enc-panel .fo-${sel} .fo-fig > *`);
    if(!el || !el.animate) return;
    if(side==='player'){
      const d = Math.max(1, dmg||1);
      const dist = 8 + Math.min(d,8)*2;            // 10px .. 24px by damage
      const big = d>=4 ? 1.07 : 1;
      el.animate([{translate:'0 0', scale:'1 1'},{translate:`${dist}px -2px`, scale:`${big} ${big}`, offset:0.35},{translate:'0 0', scale:'1 1'}], {duration:200 + Math.min(d,8)*8, easing:'cubic-bezier(.2,.8,.3,1)'});
    } else if(side==='playerReady'){
      el.animate([{translate:'0 0', scale:'1 1'},{translate:'3px 0', scale:'1.015 .99', offset:.4},{translate:'0 0', scale:'1 1'}], {duration:260, easing:'ease-out'});
    } else if(side==='enemyWind'){
      el.animate([{translate:'0 0', scale:'1 1'},{translate:'9px 1px', scale:'1.05 .95'}], {duration:200, easing:'ease-out', fill:'forwards'});
      document.querySelectorAll('#enc-panel .fo-enemy .fo-chips .enemy-action-badge').forEach(c=>{
        if(c.animate) c.animate([{scale:'1'},{scale:'1.2', offset:0.5},{scale:'1'}], {duration:300, easing:'ease-out'});
      });
    } else if(side==='enemyStrike'){
      el.animate([{translate:'9px 1px', scale:'1.05 .95'},{translate:'-20px -2px', scale:'1 1', offset:0.35},{translate:'0 0'}], {duration:260, easing:'cubic-bezier(.2,.8,.3,1)'});
    }
  }catch(err){}
}
// Mascot hop: the route marker hops across to its new node instead of snapping.
function syncMascotHop(){
  try{
    const m = document.querySelector('.route-wrap .mascot-wrap'); if(!m) return;
    const left = parseFloat(m.style.left);
    // a new floor (or run) starts fresh: never hop in from where the last floor's marker ended up
    if(S._mascotFloor !== S.floorIdx){ S._mascotFloor = S.floorIdx; S._mascotLeft = null; }
    const prev = S._mascotLeft; S._mascotLeft = left;
    if(prev==null || prev>=left || !m.animate) return; // the marker only ever hops forward
    if(typeof PREFS!=='undefined' && PREFS.reducedMotion) return;
    const w = m.parentElement.getBoundingClientRect().width;
    const dx = (prev-left)/100*w;
    m.animate([{translate:`${dx}px 0`},{translate:'0 0'}], {duration:520, easing:'cubic-bezier(.35,.1,.3,1)'});
    const img = m.firstElementChild;
    if(img && img.animate) img.animate([{translate:'0 0', scale:'1 1'},{translate:'0 -14px', scale:'.94 1.08', offset:.4},{translate:'0 0', scale:'1.18 .82', offset:.88},{translate:'0 0', scale:'1 1'}], {duration:520, easing:'ease-in-out'});
  }catch(err){}
}
// Rolling HP numbers: the digits count toward the new value. State lives in S._roll so it
// survives the DOM being rebuilt mid-count.
function rollHpNumbers(){
  try{
    const noAnim = (typeof PREFS!=='undefined' && PREFS.reducedMotion);
    const sides = {player:'#enc-panel .fo-player .bar-num', enemy:'#enc-panel .fo-enemy .bar-num'};
    const r = (S._roll = S._roll || {});
    const now = performance.now();
    for(const side in sides){
      const el = document.querySelector(sides[side]); if(!el) continue;
      const m = /^(-?\d+)(?:\+(\d+))?\/(\d+)$/.exec(el.textContent.trim()); if(!m) continue;
      const to = +m[1], sh = m[2], max = m[3];
      const st = r[side] || (r[side] = {from:to, to, t:0, shown:to});
      if(st.t > now) st.t = 0; // timestamp from another page session
      if(st.to !== to){ st.from = st.shown; st.to = to; st.t = now; }
      if(noAnim){ st.shown = to; continue; }
      const tick = ()=>{
        const e = document.querySelector(sides[side]); if(!e) return;
        const k = Math.max(0, Math.min(1, (performance.now()-st.t)/450));
        const up = st.to>st.from; const c1=1.7, c3=c1+1; const ease = up ? 1 + c3*Math.pow(k-1,3) + c1*Math.pow(k-1,2) : 1-Math.pow(1-k,3);
        st.shown = Math.min(+max, Math.round(st.from + (st.to-st.from)*ease));
        e.innerHTML = `${st.shown}${shieldNumHTML(+sh||0)}/${max}`;
        if(k<1) requestAnimationFrame(tick);
      };
      if(now - st.t < 450) tick();
    }
  }catch(err){}
}
function shieldNumHTML(v){ return v>0 ? `<span class="bn-sh" title="Shield/Block ${v}: absorbs damage before health">+${v}</span>` : ''; }
function shieldBarHTML(val, max, hpPct, side){
  side = side || 'x';
  const g = (S._shieldFx = S._shieldFx || {});
  const st = g[side] || (g[side] = {last:0, dir:'', t:0});
  const now = performance.now();
  val = val || 0;
  if(val !== st.last){ st.dir = val>st.last ? 'up' : 'down'; st.t = now; }
  st.last = val;
  if(!val) return '';
  const noAnim = (typeof PREFS!=='undefined' && PREFS.reducedMotion);
  const el = now - st.t;
  const fx = (!noAnim && st.dir && el<600) ? ` sh-${st.dir}` : '';
  const dl = fx ? `animation-delay:-${Math.round(el)}ms` : '';
  const room = Math.max(0, 100 - (hpPct||0));
  const w = Math.min(room, val/Math.max(1,max)*100);
  return (w>0?`<div class="bar-fill shield-seg${fx}" style="left:${hpPct||0}%; width:${w}%; ${dl}" title="Shield ${val}"></div>`:'');
}

// Boss health bar: a U-shaped arc that starts and ends where the straight bar would, and dips below. Segments are
// SVG strokes on one path (pathLength=100, so a segment is just "start, length" in percent of the bar).
function bossArcBarHTML(o){
  const W=160, D=24, T=8, mid=T, P='M 10 '+mid+' Q '+(W/2)+' '+(mid+2*D)+' '+(W-10)+' '+mid;
  const H=T+D+T, seg=(a,len)=>`stroke-dasharray="0 ${Math.max(0,a).toFixed(2)} ${Math.max(0,len).toFixed(2)} 300"`;
  const fx = hpFillHTML('enemy','hp',o.hpPct,true);
  const hp = Math.max(0,Math.min(100,fx.pct));
  const head = `<path class="ba-out" d="${P}"/><path class="ba-track" d="${P}"/>`;
  let s = '';
  if(fx.ghost){ s += `<path class="ba-seg ba-ghost" pathLength="100" d="${P}" ${seg(hp,fx.ghost.from-hp)} style="stroke:${fx.ghost.color}; animation-delay:-${fx.ghost.delay}ms"/>`; }
  const healCls = fx.heal ? ' ba-heal' : '';
  const healStyle = fx.heal ? ` style="--from:${fx.heal.from}; --to:${hp}; animation-delay:-${fx.heal.delay}ms"` : '';
  s += `<path class="ba-seg ba-hp${healCls}" pathLength="100" d="${P}" stroke-dasharray="${hp.toFixed(2)} 300"${healStyle}/>`;
  if(o.shieldVal>0){ const sh = shieldBarHTML(o.shieldVal,o.shieldMax,hp,'enemy'); const m = /shield-seg( sh-\w+)?" style="left:([\d.]+)%; width:([\d.]+)%; ([^"]*)"/.exec(sh);
    if(m) s += `<path class="ba-seg ba-shield${m[1]||''}" pathLength="100" d="${P}" ${seg(+m[2],+m[3])} style="${m[4]}"/>`; }
  if(o.prevW>0){ s += `<path class="ba-seg ba-prev" pathLength="100" d="${P}" ${seg(o.prevLeft,o.prevW)}/><path class="ba-seg ba-prev-end" pathLength="100" d="${P}" ${seg(o.prevLeft+o.prevW-1.2,1.2)}/>`; }
  // round the fill's outer ends to the track's rounded caps
  { // butt-capped segments leave the bar's two ends square: add round end caps in the colour of whichever segment touches that end
    const ends = [{c:'#ff3b3b', a:0, b:hp}];
    const mS = o.shieldVal>0 ? /left:([\d.]+)%; width:([\d.]+)%/.exec(shieldBarHTML(o.shieldVal,o.shieldMax,hp,'enemy')||'') : null;
    if(mS) ends.push({c:'#5fa8d8', a:+mS[1], b:+mS[1]+ +mS[2]});
    const startC = ends.find(e=>e.a<0.5 && e.b>0.5), endC = ends.slice().reverse().find(e=>e.b>99.5);
    if(startC) s = `<circle cx="10" cy="${mid}" r="7" fill="${startC.c}"/>` + s;
    if(endC) s = `<circle cx="${W-10}" cy="${mid}" r="7" fill="${endC.c}"/>` + s;
  }
  s = `<mask id="ba-mask" maskUnits="userSpaceOnUse" x="-20" y="-20" width="${W+40}" height="${H+40}"><path d="${P}" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/></mask>` + head + `<g mask="url(#ba-mask)">` + s + '</g>';
  // top-light highlight twins (the straight bars are light on top, darker below)
  s = s.replace(/<path class="ba-seg (ba-hp|ba-shield)([^"]*)"([^>]*)\/>/g, (m,k,rest,attrs)=> m + `<path class="ba-seg ba-hl ba-hl-${k.slice(3)}${rest}"${attrs}/>`);
  return `<div class="bar bar-arc ${o.cls||''}"><svg viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true">${s}</svg>${o.numHTML}</div>`;
}
// ---- Stone-floor room: the doorway's back wall (brick, above a horizon ledge) and one flagstone floor that
// runs from the horizon down behind the chest, so the top of the screen reads as a wall and the chest as
// something you look down on. Textures are painted once at runtime (canvas) into CSS variables.
const ROOM_HORIZON = 0.38, ROOM_MIN_HORIZON = 118; // Oct 15 (Jeremy): floor line 16px higher (was 134); the tallest 3-quest sign still clears it
let ROOM_TEX_READY = false;
let ROOM_FLOOR_SRC = null, ROOM_TEX_VER = 0;
// Oct 16 (Jeremy's screen recording: parts of the fight screen blanked out for a moment on his phone): the floor used to be a
// tilted 3D plane (perspective + rotateX), which the phone kept as a ~22 MB graphics layer (bigger than everything else
// on screen) and ran short of graphics memory. Now the same view is drawn once into a flat canvas, row by row, with the
// same perspective math (880px, 70 degrees, 170px tiles), plus the top fade and bottom vignette. Cached per size.
function bakedFloorCanvas(W, H){
  try{
    if(!ROOM_FLOOR_SRC || W<2 || H<2) return null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const key = W+'x'+H+'x'+dpr+'x'+ROOM_TEX_VER;
    if(bakedFloorCanvas._c && bakedFloorCanvas._c.key === key) return bakedFloorCanvas._c.cv;
    const cv = (bakedFloorCanvas._c && bakedFloorCanvas._c.cv) || document.createElement('canvas');
    cv.className = 'rf-canvas'; cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    const g = cv.getContext('2d');
    const d = 880, a = 70*Math.PI/180, sn = Math.sin(a), co = Math.cos(a), cx = W/2, PW = 1.8*W, k = 170/ROOM_FLOOR_SRC.width;
    const pat = g.createPattern(ROOM_FLOOR_SRC, 'repeat');
    g.fillStyle = '#0a0604'; g.fillRect(0, 0, cv.width, cv.height);
    for(let py=0; py<cv.height; py++){
      const Y = (py+0.5)/dpr, y = Y*d/(co*d + Y*sn), sc = d/(d - y*sn);
      g.setTransform(sc*dpr, 0, 0, 1, (cx - 0.9*W*sc)*dpr, py);
      pat.setTransform(new DOMMatrix([k, 0, 0, k, 0, -y]));
      g.fillStyle = pat; g.fillRect(0, 0, PW, 1);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    let gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(10,6,4,.97)'); gr.addColorStop(.07, 'rgba(10,6,4,.6)'); gr.addColorStop(.26, 'rgba(10,6,4,.1)'); gr.addColorStop(.4, 'rgba(10,6,4,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    bakedFloorCanvas._c = { key, cv };
    return cv;
  }catch(e){ return null; }
}
// Heavy paper on the environment (Jeremy, Oct 15): the paper tile is blended (soft-light) into the generated wall and
// floor textures, the archway and the dice chest. PAPER_ENV is its strength (1 = heavy, Jeremy's pick).
const PAPER_ENV = 1;
let PAPER_IMG = null;
function paperTileImg(){
  if(typeof PAPER_TILE==='undefined') return null;
  if(!PAPER_IMG){
    PAPER_IMG = new Image();
    PAPER_IMG.onload = ()=>{ ROOM_TEX_READY = false; ensureRoomTextures(); decorateArch._c = null; try{ if(S && (S.screen==='game' || S.screen==='shrine')) decorateArch(); }catch(e){} };
    PAPER_IMG.src = PAPER_TILE;
    try{ document.documentElement.style.setProperty('--paper-tile', `url("${PAPER_TILE}")`); }catch(e){}
  }
  return (PAPER_IMG.complete && PAPER_IMG.naturalWidth) ? PAPER_IMG : null;
}
function paperOver(g, W, H, scale){
  const t = paperTileImg(); if(!t || !PAPER_ENV) return;
  g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = Math.min(1, PAPER_ENV);
  g.setTransform(scale,0,0,scale,0,0); g.fillStyle = g.createPattern(t,'repeat'); g.fillRect(0,0,W/scale,H/scale); g.restore();
}
function ensureRoomTextures(){
  if(ROOM_TEX_READY) return; ROOM_TEX_READY = true;
  try{
    let seed = 23; const rnd = ()=>{ seed = (seed*16807)%2147483647; return seed/2147483647; };
    const rr = (g,x,y,w,h,r)=>{ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); };
    const noise = (g,W,H,amt)=>{ const id=g.getImageData(0,0,W,H); for(let i=0;i<id.data.length;i+=4){ const n=(rnd()-.5)*amt; id.data[i]+=n; id.data[i+1]+=n; id.data[i+2]+=n; } g.putImageData(id,0,0); };
    // floor: crisp flagstones, thin mortar, a few cracks and moss patches
    { const W=1024,H=1024,c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
      g.fillStyle='#0c0705'; g.fillRect(0,0,W,H);
      let y=0; while(y<H){ const rh=128+rnd()*80; let x=-rnd()*130;
        while(x<W){ const sw=160+rnd()*160; const k=.78+rnd()*.4; const warm=rnd()>.8; const b=warm?[104,84,62]:[96,88,76];
          const x0=x+2.5,y0=y+2.5,w=sw-5,h=rh-5;
          const gr=g.createLinearGradient(x0,y0,x0,y0+h); gr.addColorStop(0,`rgb(${b[0]*k*1.06|0},${b[1]*k*1.06|0},${b[2]*k*1.06|0})`); gr.addColorStop(1,`rgb(${b[0]*k*.88|0},${b[1]*k*.88|0},${b[2]*k*.88|0})`);
          g.fillStyle=gr; rr(g,x0,y0,w,h,5); g.fill();
          g.fillStyle='rgba(255,236,200,.13)'; g.fillRect(x0+4,y0+1,w-8,2);
          if(rnd()>.72){ g.strokeStyle='rgba(10,6,4,.5)'; g.lineWidth=1.2; g.beginPath(); let cx=x0+w*rnd(),cy=y0; g.moveTo(cx,cy); for(let i=0;i<4;i++){ cx+=(rnd()-.5)*20; cy+=h/4; g.lineTo(cx,cy); } g.stroke(); }
          if(rnd()>.84){ const m=g.createRadialGradient(x0+w*.5,y0+h*.9,0,x0+w*.5,y0+h*.9,w*.45); m.addColorStop(0,'rgba(70,110,50,.3)'); m.addColorStop(1,'rgba(70,110,50,0)'); g.fillStyle=m; rr(g,x0,y0,w,h,5); g.fill(); }
          x+=sw; }
        y+=rh; }
      noise(g,W,H,14); paperOver(g,W,H,2.4); ROOM_FLOOR_SRC = c; ROOM_TEX_VER++;
      document.documentElement.style.setProperty('--tex-floor', `url("${c.toDataURL('image/jpeg',.85)}")`); }
    // wall: dark running-bond brick
    { const W=512,H=256,c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
      g.fillStyle='#0a0705'; g.fillRect(0,0,W,H);
      let y=0,row=0; while(y<H){ const rh=40; let x=-(row%2)*50; while(x<W){ const sw=100, k=.7+rnd()*.5; g.fillStyle=`rgb(${62*k|0},${44*k|0},${32*k|0})`; rr(g,x+2,y+2,sw-4,rh-4,3); g.fill(); g.fillStyle='rgba(255,230,190,.08)'; g.fillRect(x+5,y+3,sw-10,2); x+=sw; } y+=rh; row++; }
      noise(g,W,H,12); paperOver(g,W,H,1.6);
      document.documentElement.style.setProperty('--tex-wall', `url("${c.toDataURL('image/jpeg',.85)}")`); }
  }catch(err){}
}
function syncRoomFloor(card){
  try{
    const app = document.getElementById('app'); if(!app || !card) return;
    ensureRoomTextures();
    app.classList.add('has-room-floor');
    document.querySelectorAll('#room-floor, .rf-shadow').forEach(n=>n.remove());
    const off = el=>{ let t=0,l=0,n=el; while(n && n!==app){ t+=n.offsetTop; l+=n.offsetLeft; n=n.offsetParent; } return {t,l}; };
    const c = off(card), cw = card.offsetWidth, ch = card.offsetHeight;
    const appL = 0, vw = app.offsetWidth; // hard cutoff at the app's own width
    // Horizon: 38% down, but never above the bottom of the tallest possible quest note (about 122px) plus a margin.
    const hz = Math.round(Math.min(ch*0.6, Math.max(ch*ROOM_HORIZON, ROOM_MIN_HORIZON)));
    if(card.style.getPropertyValue('--hz') !== hz+'px') card.style.setProperty('--hz', hz+'px');
    syncRoomFloor._hz = hz; // renderGame pre-sets it on the next card, so this isn't a fresh style change every render
    // Where the doorway's stone pillars end (archPath stops 12px above the frame's bottom, which sits 5px above the card's top edge + 10px taller)
    const hy = Math.round(c.t + hz), yb = Math.round(ch - 7 - hz), edge = 3;
    const xl = Math.round(appL + c.l + edge), xr = Math.round(appL + c.l + cw - edge);
    // Oct 16 (Jeremy: the fight screen scrolled a little on his phone): the floor used to hang a fixed 30px below the
    // app, past the bottom of the screen; now it reaches exactly the screen's bottom edge and no further.
    const floorBelow = -Math.min(30, Math.max(0, Math.round(window.innerHeight - app.getBoundingClientRect().bottom)));
    const fl = document.createElement('div'); fl.id = 'room-floor';
    fl.style.cssText = `left:${-appL}px;width:${vw}px;top:${hy}px;bottom:${floorBelow}px;clip-path:polygon(${xl}px 0,${xr}px 0,${xr}px ${yb}px,100% ${yb}px,100% 100%,0 100%,0 ${yb}px,${xl}px ${yb}px);`;
    fl.style.setProperty('--ld', '-'+Math.round(performance.now()%3100)+'ms');
    const fcv = bakedFloorCanvas(vw, Math.max(1, Math.round(app.offsetHeight - hy - floorBelow)));
    if(fcv){ fl.innerHTML = '<div class="rf-light"></div>'; fl.insertBefore(fcv, fl.firstChild); }
    else fl.innerHTML = '<div class="rf-plane"></div><div class="rf-fade"></div><div class="rf-light"></div><div class="rf-vig"></div>';
    // Ground shadows: a feet shadow plus a tall soft pool running down through the health bar, name and chips.
    // All measuring happens before anything is inserted, so this costs one layout, not two (Oct 12).
    const hf = card.querySelector('.hall-fx');
    const shadows = [];
    if(hf){
      const cr = card.getBoundingClientRect(), sc = cr.width/cw || 1;
      ['.fo-enemy','.fo-player'].forEach(sel=>{
        const side = card.querySelector(sel); const fig = side && side.querySelector('.fo-fig'); if(!fig) return;
        const art = fig.querySelector('img,svg,.fo-img') || fig, r = art.getBoundingClientRect();
        let B = r.bottom + 30;
        side.querySelectorAll('.fo-name, .fo-chips, .fo-chips *, .fo-turnlabel').forEach(e=>{ B = Math.max(B, e.getBoundingClientRect().bottom); });
        shadows.push({cx:(r.left + r.width/2 - cr.left)/sc, fb:(r.bottom - cr.top)/sc, H:(B - r.bottom)/sc + 16});
      });
    }
    app.insertBefore(fl, app.firstChild);
    shadows.forEach(({cx, fb, H})=>{
      const pool = document.createElement('div'); pool.className = 'rf-shadow rf-pool'; pool.style.cssText = `left:${cx-96}px;top:${fb-18}px;height:${H}px;`;
      const feet = document.createElement('div'); feet.className = 'rf-shadow rf-feet'; feet.style.cssText = `left:${cx-78}px;top:${fb-20}px;`;
      hf.appendChild(pool); hf.appendChild(feet);
    });
  }catch(err){}
}
// Layout can shift after decorateArch ran (monster art finishing loading, chips/labels changing during a turn, new room swapping in),
// which left the floor's horizon out of step with the wall ledge. Re-sync whenever the card or the app is resized or an image inside lands.
let ROOM_RO = null, ROOM_RAF = 0, ROOM_WATCHED = null;
function watchRoomFloor(card){
  try{
    const resync = ()=>{ if(ROOM_RAF) return; ROOM_RAF = requestAnimationFrame(()=>{ ROOM_RAF = 0;
      const c = document.querySelector('#enc-panel .fo-arch'); if(c && document.getElementById('app')) syncRoomFloor(c); }); };
    if(typeof ResizeObserver!=='undefined'){
      if(!ROOM_RO) ROOM_RO = new ResizeObserver(resync);
      ROOM_RO.disconnect(); ROOM_RO.observe(card); const app = document.getElementById('app'); if(app) ROOM_RO.observe(app);
    }
    card.querySelectorAll('img').forEach(im=>{ if(!im.complete) im.addEventListener('load', resync, {once:true}); });
    ROOM_WATCHED = card;
  }catch(e){}
}
function decorateArch(){
  try{
    const card = document.querySelector('#enc-panel .fo-arch');
    if(!card) return;
    card.querySelectorAll('.fo-frame').forEach(n=>n.remove());
    // offset sizes, NOT getBoundingClientRect: the room-enter animation scales the card while this runs
    const r = card.getBoundingClientRect();
    const w = Math.round(card.offsetWidth), h = Math.round(card.offsetHeight+10);
    const lvl = Math.min(3,(S.floorIdx||0)+1);
    syncRoomFloor(card);
    watchRoomFloor(card);
    // The arch (thousands of brick/moss shapes) is drawn once per size+floor into a cached SVG image: one <img> to
    // lay out instead of rebuilding and laying out the whole SVG on every render, i.e. every path tap (Oct 12).
    // padding for moss that hangs past the frame (up to 8px), but never past the screen edge
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const PX = Math.max(0, Math.min(8, Math.floor(r.left) - 5, Math.floor(vw - r.right) - 5)), PY = 8;
    const key = w+'x'+h+'x'+lvl+'x'+PX;
    if(!decorateArch._c || decorateArch._c.key !== key){
      // paper on the stones (Oct 15): the tile, tiled and soft-light blended, clipped to the arch's own pixels
      const pt = PAPER_ENV && paperTileImg() ? PAPER_TILE : null;
      const pf = pt ? `<defs><filter id="pp" filterUnits="userSpaceOnUse" x="${-PX}" y="${-PY}" width="${w+2*PX}" height="${h+2*PY}" color-interpolation-filters="sRGB"><feImage href="${pt}" xlink:href="${pt}" x="${-PX}" y="${-PY}" width="110" height="110" preserveAspectRatio="none" result="t1"/><feTile in="t1" result="tile"/><feBlend in="tile" in2="SourceGraphic" mode="soft-light" result="b"/><feComposite in="b" in2="SourceGraphic" operator="in"/></filter></defs>` : '';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w+2*PX}" height="${h+2*PY}" viewBox="${-PX} ${-PY} ${w+2*PX} ${h+2*PY}">${pf}${pt?'<g filter="url(#pp)">':''}${archFrameSVG(w,h,lvl)}${pt?'</g>':''}</svg>`;
      // one <img> element, built once and moved into each new card: no re-parsing and it stays decoded
      // (a blob: URL was tried first and is refused on file:// pages)
      const img = document.createElement('img');
      img.className = 'fo-frame'; img.alt = ''; img.setAttribute('aria-hidden', 'true');
      img.width = w+2*PX; img.height = h+2*PY;
      img.style.cssText = `left:${-5-PX}px;top:${-10-PY}px;max-width:none`;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      let vimg = null;
      if(archFrameSVG.vines){
        const vsvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w+2*PX}" height="${h+2*PY}" viewBox="${-PX} ${-PY} ${w+2*PX} ${h+2*PY}">${pf}${pt?'<g filter="url(#pp)">':''}<g>${archFrameSVG.vines}</g>${pt?'</g>':''}</svg>`;
        vimg = img.cloneNode(false); vimg.className = 'fo-frame fo-vines';
        vimg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(vsvg);
      }
      decorateArch._c = { key, img, vimg };
    }
    card.appendChild(decorateArch._c.img);
    // the vines layer goes first in the card, so the quest paper and the monster (same layer, later) paint over it
    if(decorateArch._c.vimg) card.insertBefore(decorateArch._c.vimg, card.firstChild);
    try{ document.body.classList.toggle('is-resolving', !!S.transitioning); }catch(e){}
    syncIdleBreath(); syncMascotHop(); rollHpNumbers();
    // Headroom above the monster (offset sizes again), so big monsters grow upward only until the arch would hide them.
    const efig = card.querySelector('.fo-enemy .fo-fig');
    if(efig){ let top = 0, n = efig; while(n && n !== card){ top += n.offsetTop; n = n.offsetParent; }
      card.style.setProperty('--head', Math.max(0, Math.round(top - 16)) + 'px'); }
    // The settings cog tucks into the empty corner beside the arch's right shoulder.
    document.body.classList.add('cog-arch');
    document.body.style.setProperty('--cog-top', Math.max(2, Math.round(r.top + window.scrollY - 10))+'px');
  } catch(err){ /* decoration only -- never let it break the game */ }
}
// Camp: the cog sits in the empty space to the right of the "Camp" heading.
function tuckCampCog(){
  try{
    const h = document.querySelector('#app h2'); if(!h) return;
    const r = h.getBoundingClientRect();
    document.body.classList.add('cog-arch');
    document.body.style.setProperty('--cog-top', Math.round(r.top + window.scrollY + r.height/2 - 16)+'px');
  } catch(err){}
}
document.addEventListener('animationend', ev=>{ if(ev.target && ev.target.classList && ev.target.classList.contains('fo-arch')) decorateArch(); }, true);
window.addEventListener('resize', ()=>{ if(document.querySelector('#enc-panel .fo-arch')){ decorateArch(); fitFoChips(); } else if(S && S.screen==='camp') tuckCampCog(); });

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
// The bottom (third) small die sits lowest in the fan -- its box used to run
// to y=23.5 against a viewBox only 22 tall, so its bottom edge was silently
// clipped by the SVG viewport and that one die read as open-bottomed instead
// of a closed square. Shifted up so its box stays inside the viewBox.
function mergeGlyphSVG(h){
  const w = h*2.45;
  return `<svg class="merge-glyph" viewBox="0 0 54 22" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="1.6">
      <rect x="1" y="2" width="9" height="9" rx="2" transform="rotate(-12 5.5 6.5)"></rect>
      <circle cx="5.5" cy="6.5" r="1" fill="currentColor" stroke="none" transform="rotate(-12 5.5 6.5)"></circle>
      <rect x="6" y="9.5" width="9" height="9" rx="2"></rect>
      <circle cx="10.5" cy="14" r="1" fill="currentColor" stroke="none"></circle>
      <rect x="1" y="12" width="9" height="9" rx="2" transform="rotate(10 5.5 16.5)"></rect>
      <circle cx="5.5" cy="16.5" r="1" fill="currentColor" stroke="none" transform="rotate(10 5.5 16.5)"></circle>
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
    ? `<span class="camp-die-basic-label">${die.cat==='attack'?'Atk':'Mvr'}<br>${ROMAN[die.level]}</span>`
    : (art ? `<img src="${art}" alt="${die.name}">` : `<span class="camp-die-basic-label">${die.name}</span>`);
  const layers = Math.min(3, indices.length-1); // dice drawn behind the top one (Jeremy, Oct 13: read as a pile of dice)
  return `<div class="die dietype-${die.cat} camp-die-tile ${indices.length>1?'stacked stk-'+layers:''} ${isSelected?'organize-selected':''}" data-camp-type="${type}" data-camp-idx="${repIdx}" title="${die.name}${indices.length>1?` ×${indices.length}`:''}">
      ${inner}
      ${indices.length>1?`<span class="camp-stack-badge">${indices.length}</span>`:''}
    </div>`;
}
// Chest dressing for the dice tray: four riveted iron corner brackets and a front lock (CSS gives the box its planks/interior).
let chestLockFxAt = -1e9; // when Go was last pressed (render() rebuilds the lock, so the animation resumes from this)
const CHEST_TRIM_STATIC = (()=>{
  const g='<defs><linearGradient id="chMg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8d98a2"/><stop offset="1" stop-color="#4a5560"/></linearGradient><linearGradient id="chLg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0b14a"/><stop offset="1" stop-color="#9a6d1d"/></linearGradient></defs>';
  const corner='<svg viewBox="0 0 36 36" width="36" height="36">'+g+'<path d="M2 2H34V13H13V34H2Z" fill="url(#chMg)" stroke="#0c0705" stroke-width="2.2" stroke-linejoin="round"/><circle cx="7.5" cy="7.5" r="2.2" fill="#0c0705" opacity=".55"/><circle cx="24" cy="7.5" r="2.2" fill="#0c0705" opacity=".55"/><circle cx="7.5" cy="24" r="2.2" fill="#0c0705" opacity=".55"/><circle cx="7.1" cy="7.1" r="1.1" fill="#fff" opacity=".5"/></svg>';
  const lock='<svg viewBox="0 0 64 58" width="58" height="52">'+g+'<path class="ch-shackle" d="M14 6 Q32 -2 50 6 L50 18 L14 18Z" fill="url(#chMg)" stroke="#0c0705" stroke-width="2.4" stroke-linejoin="round"/><path d="M6 16 H58 Q60 16 60 19 V40 Q60 54 32 55 Q4 54 4 40 V19 Q4 16 6 16Z" fill="url(#chLg)" stroke="#0c0705" stroke-width="2.6" stroke-linejoin="round"/><path d="M9 21 H55 V30" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="28" r="5" fill="#0c0705"/><path d="M32 31 L29 43 H35Z" fill="#0c0705"/><clipPath id="chLockClip"><path d="M6 16 H58 Q60 16 60 19 V40 Q60 54 32 55 Q4 54 4 40 V19 Q4 16 6 16Z"/></clipPath><g clip-path="url(#chLockClip)"><g class="ch-shine"><rect x="-26" y="0" width="12" height="60" fill="#fff" opacity=".7" transform="skewX(-20)"/></g></g><path d="M6 16 H58 Q60 16 60 19 V40 Q60 54 32 55 Q4 54 4 40 V19 Q4 16 6 16Z" fill="none" stroke="#0c0705" stroke-width="2.6" stroke-linejoin="round"/></svg>';
  return {corners:'<div class="cc tl">'+corner+'</div><div class="cc tr">'+corner+'</div><div class="cc bl">'+corner+'</div><div class="cc br">'+corner+'</div>', lock};
})();
function chestTrimHTML(){
  const age = performance.now() - chestLockFxAt;
  const open = age < 900;
  let ready = false;
  try{ if(S.path && S.path.length && !S.transitioning){ ready = pcfTierFor(computePathEffects(S.path).totalDamage) >= 2; } }catch(e){}
  const st = open ? ` style="animation-delay:-${Math.round(age)}ms"` : '';
  // The shackle needs its own delay too, so it is set on the wrapper via a CSS variable
  return CHEST_TRIM_STATIC.corners + `<div class="chest-lock ${open?'unlock':''} ${ready?'ready':''}" style="--lk-delay:-${open?Math.round(age):0}ms">` + CHEST_TRIM_STATIC.lock + '</div>';
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
          <img class="title-cover-art" src="${COVER_ART}" alt="Dungeon Scramble: a dice-drafting deck-builder">
          <div class="title-art-fade"></div>
        </div>
        <div class="title-content">
          ${lifetimeLine}
          <div class="title-btn-col">
            ${continueBtn}
            <button class="${saved?'':'primary'}" id="title-newrun-btn">${saved?'Start New Run':'New Run'}</button>
            <button id="title-codex-btn" class="btn-codex">Codex</button>
            <button id="title-history-btn" class="btn-records">Records</button>
            <button id="title-howto-btn" class="btn-howto">How to Play</button>
          </div>
          ${(()=>{ const earned = CLASSES.filter(k=>!k.debug && DEPTH_BEST.byClass[k.id] && DEPTH_BEST.byClass[k.id].depth); return earned.length ? `<div class="title-badges">${earned.map(k=>`<div class="title-badge">${depthBadgeSVG(k.color, DEPTH_BEST.byClass[k.id].depth, 52)}</div>`).join('')}</div>` : ''; })()}
          <p class="hint" style="text-align:center; margin:10px 0 0; font-size:12px;">Playtesting? After a few runs, tap the gear &rarr; Export Play Data and send the file.</p>
          <p class="hint" style="text-align:center; margin:6px 0 0; font-size:13px; font-weight:700; opacity:.8;">v${GAME_VERSION}</p>
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
    overlay.querySelector('#title-newrun-go').onclick = ()=> closeModal(overlay, ()=>{ abandonSavedRunTelemetry(); clearSave(); resetSetupPortraitPreviews(); preGameScreen='setup'; render(); });
    overlay.onclick = (ev)=>{ if(ev.target===overlay) closeModal(overlay); };
  };
  document.getElementById('title-codex-btn').onclick = ()=> openCodexModal();
  document.getElementById('title-history-btn').onclick = ()=> openRecordsModal();
  document.getElementById('title-howto-btn').onclick = ()=> openTutorialModal(0);
}

// Starting a new run from the title over a saved one: record the saved run as abandoned in play data (Oct 14 TODO),
// same as Restart in the gear menu. Loads the save only long enough to log it, then puts S back.
function abandonSavedRunTelemetry(){
  const prev = S;
  try{ if(loadGame() && S && S.origin){ teleLog('run_abandon', {hp:S.health, maxHp:S.maxHealth, from:'title'}); finalizeTelemetry('abandoned'); } }catch(e){}
  S = prev;
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
    const label = `${LABEL[f.type]}${(f.value && !ICON_VALUE_SLOT.has(f.type))?' '+f.value:''}`;
    const tip = `${label} — ${FACE_DESC[f.type]||''}`;
    if(f.type==='blank') return `<div class="die-face-chip ${toneCls} blank" title="${tip}"></div>`;
    return `<div class="die-face-chip ${toneCls}" title="${tip}">${iconSpan(f.type, f.value)}</div>`;
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
      <div class="osp-wrap"><div class="origin-showcase-portrait ${unlocked?'':'dim'}">${portraitHTML}</div>${unlocked && !portrait.placeholder ? `<button class="portrait-reroll" id="portrait-reroll" title="Randomize your look" aria-label="Randomize your look"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M20.5 4.5v6.5H14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}</div>
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
    ${originRelicLineHTML(o)}
  `;
}

// Setup screen: the Origin's signature relic -- shown in full once earned,
// otherwise as a locked silhouette with the goal ("win a run as X"), so
// there's always a visible thing to chase.
function originRelicLineHTML(o){
  const r = originRelicFor(o.id);
  if(!r) return '';
  const earned = (META.lifetime.victoriesByOrigin[o.id]||0) >= 1;
  return earned
    ? `<div class="origin-relic-line">${relicBadgeHTML(r)}<div><div class="relic-name">${r.name} <span class="relic-origin-tag">starts every run</span></div><div class="relic-desc">${r.desc}</div></div></div>`
    : `<div class="origin-relic-line locked"><span class="relic-badge relic-locked">?</span><div><div class="relic-name">Signature Relic</div><div class="relic-desc">Win a run as a ${o.name} to earn it.</div></div></div>`;
}

// Class showcase: the selected Class's name, ability text, and its action
// icon (or Dungeoneer's own wrap glyph), in a fixed-height panel so nothing
// reflows as the player taps between the 4 tabs above it.
function classShowcaseHTML(k){
  // A little 4x4 tray with this class's zone lit up in the class color.
  const cells = [];
  for(let r=0;r<4;r++) for(let c=0;c<4;c++) cells.push(`<i class="${k.zone(r,c)?'zone':''}"></i>`);
  return `
    <div class="class-mini-tray" style="--class-color:${k.color}" title="Your zone is highlighted">${cells.join('')}</div>
    <div class="class-showcase-text">
      <div class="class-showcase-head">
        <div class="class-action-icon" style="--class-color:${k.color}">${classActionIconHTML(k)}</div>
        <div class="class-showcase-name" style="--class-color:${k.color}">${k.name}</div>
      </div>
      <div class="class-showcase-ability">${k.ability}</div>
    </div>
    <div class="class-showcase-badge">${classBadgeHTML(k, 48, true)}</div>
  `;
}

// Starting Boon showcase: the currently-picked die's own item art, name
// plate (colored by its real tier), and its 6 faces -- the same treatment
// as the Origin die above, shown under the runic carousel once something
// other than "None" is picked.
function boonShowcaseHTML(d){
  if(!d) return `<div class="boon-showcase-empty">No Starting Boon selected: you'll begin with just the standard tray.</div>`;
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
  const boonDice = boonTiers.flatMap(t=>BOON_TIER_POOLS[t].filter(d=>isBoonReady(d.name)).map(d=>({...d, tier:t})));
  app.innerHTML = `
    <div class="panel setup-panel">
      <button id="setup-back-btn" class="setup-back-btn" title="Back to title"><svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M7.5 1.5 3 6l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Back</button>

      <div class="setup-name-row">
        <input id="char-name-input" class="char-name-input" type="text" maxlength="24" placeholder="New Character" autocomplete="off">
        <svg class="char-name-pencil" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
      </div>

      <div class="setup-section">
        <div class="setup-label">Origin</div>
        <div class="origin-layout">
          <div class="class-tab-row" id="origin-tab-row" style="--class-color:var(--green)"></div>
          <div class="origin-showcase" id="origin-showcase"></div>
        </div>
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
        ` : `<p class="hint boon-none-hint">No die ready yet. Take the same loot die in ${BOON_COPIES_NEEDED} runs to start with it.</p>`}
      </div>` : ''}

      ${depthMenuUnlocked() ? depthMenuHTML() : ''}

      <button class="primary" id="start-btn" disabled>Enter the Dungeon</button>
    </div>
  `;
  const depthState = { mods:{} };
  wireDepthMenu(depthState);
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

  const originTabRow = document.getElementById('origin-tab-row');
  const originShowcase = document.getElementById('origin-showcase');
  // Text tabs, same component as the Class row right below -- uniform
  // picker language across both sections instead of Origin getting its own
  // circular face-icon treatment. A locked Origin still gets a small lock
  // glyph inline (rather than a fully separate locked style) so the row
  // stays visually consistent whether or not every slot is unlocked yet.
  function renderOriginTabs(){
    originTabRow.innerHTML = '';
    ORIGINS.forEach(o=>{
      const unlocked = isOriginUnlocked(o.id);
      const previewing = (o.id===previewedOriginId && o.id!==chosenOrigin);
      const c = el(`<button type="button" class="class-tab-btn origin-tab-${o.id} ${o.id===chosenOrigin?'selected':''} ${previewing?'previewing':''} ${unlocked?'':'locked'}">${unlocked?'':lockSVG(10)+' '}${o.name}</button>`);
      c.onclick = ()=>{
        previewedOriginId = o.id;
        if(unlocked){ chosenOrigin = o.id; } else if(typeof showToast==='function') showToast(ORIGIN_UNLOCK_HINT[o.id]||'Locked', null);
        renderOriginTabs();
        renderOriginShowcaseNow();
        checkReady();
      };
      originTabRow.appendChild(c);
    });
  }
  function renderOriginShowcaseNow(){
    const o = ORIGINS.find(x=>x.id===previewedOriginId);
    originShowcase.innerHTML = originShowcaseHTML(o, isOriginUnlocked(o.id));
    attachLongPressTooltips('#origin-showcase .die-face-chip');
  }
  renderOriginTabs();
  renderOriginShowcaseNow();
  // Oct 16 (Jeremy): the little refresh button on the portrait re-rolls the character's look (portrait + skin tone).
  originShowcase.addEventListener('click', ev=>{
    const b = ev.target.closest && ev.target.closest('#portrait-reroll'); if(!b) return;
    const oid = previewedOriginId, np = rerollSetupPortrait(oid);
    np._onTint = url=>{ const im = document.querySelector('#origin-showcase .portrait-img'); if(im && previewedOriginId===oid && setupPortraitCache[oid]===np) im.src = url; };
    if(typeof playTone==='function') playTone('uiTick');
    renderOriginShowcaseNow();
    const nb = document.getElementById('portrait-reroll'); if(nb){ nb.classList.remove('spin'); void nb.offsetWidth; nb.classList.add('spin'); }
  });

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
      attachLongPressTooltips('#boon-showcase .die-face-chip');
    }
    renderBoonScroll();
    renderBoonShowcaseNow();
  }

  function checkReady(){ document.getElementById('start-btn').disabled = !(chosenOrigin&&chosenClass); }
  document.getElementById('start-btn').onclick=()=>{ newGame(chosenOrigin, chosenClass, chosenBoonName, charName, depthState.mods); };
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
  const fitOpts = {
    origin: ORIGINS.map(o=> originShowcaseHTML(o, isOriginUnlocked(o.id))),
    klass: realClasses.map(k=> classShowcaseHTML(k)),
    boon: boonScroll ? [boonShowcaseHTML(null), ...boonDice.map(d=> boonShowcaseHTML(d))] : null,
  };
  const refit = ()=>{ if(document.contains(originShowcase)) fitSetup(fitOpts); };
  refit();
  try{ if(document.fonts && document.fonts.ready) document.fonts.ready.then(refit); }catch(e){}
  setTimeout(refit, 400); // again once the title font and the art have settled
}
// The setup card must never grow past the screen (Oct 17): veterans get a Starting Boon row and the Depth bar, so
// tighten step by step (fit1..fit3, styles.css) only while the page is still taller than the window.
// Setup layout is decided once per visit, against the TALLEST content each showcase can hold: picking an Origin,
// Class or Boon must never move anything else on the screen (Jeremy, Oct 17). Each showcase gets a min-height
// equal to its tallest option, then fit1..fit4 tighten spacing only while that worst case would scroll.
// opts: {origin:[html...], klass:[html...], boon:[html...]} -- every option each showcase can show.
function fitSetup(opts){
  const p = document.querySelector('.setup-panel'); if(!p) return;
  const se = document.scrollingElement || document.documentElement;
  const boxes = [['#origin-showcase', opts && opts.origin], ['#class-showcase', opts && opts.klass], ['#boon-showcase', opts && opts.boon]];
  const lockHeights = ()=>{
    boxes.forEach(([sel, list])=>{
      const box = document.querySelector(sel); if(!box || !list || !list.length) return;
      const keep = box.innerHTML; box.style.removeProperty('min-height');
      let max = 0;
      list.forEach(h=>{ box.innerHTML = h; max = Math.max(max, box.offsetHeight); });
      box.innerHTML = keep; box.style.setProperty('min-height', max + 'px', 'important');
    });
  };
  p.classList.remove('fit1','fit2','fit3','fit4');
  lockHeights();
  for(const c of ['fit1','fit2','fit3','fit4']){ if(se.scrollHeight <= window.innerHeight + 1) break; p.classList.add(c); lockHeights(); }
}

function renderRoute(){
  const floorCls = `floor${S.floorIdx+1}`;
  const n = S.route.length;
  let html = `<div class="route-wrap">`;
  html += '<div class="route">';
  S.route.forEach((step,i)=>{
    const cls = i<S.routeStep?'done':(i===S.routeStep?'current':'');
    const icon = step==='camp'?iconSpan('camp'):(step==='boss'?iconSpan('boss'):(i<S.routeStep?'<span class="rt-tick">\u2713</span>':'<span class="rt-q">?</span>'));
    const statusSuffix = cls==='done' ? ' (cleared)' : (cls==='current' ? ' (current)' : ' (ahead)');
    const tip = (ROUTE_STEP_DESC[step]||'') + statusSuffix;
    html += `<div class="node rt-door rt-${step==='camp'?'camp':(step==='boss'?'boss':'room')} ${floorCls} ${cls} route-tooltip-target" title="${tip}"><i class="rt-arch">${icon}</i></div>`;
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

// Each minion gets its own eye placement/skew, stable for the turn but different per die and per turn.
function minionEyeStyle(idx){
  const h = n => { const x = Math.sin((idx+1)*12.9898 + (S.turnNumber||0)*78.233 + n*37.719) * 43758.5453; return x - Math.floor(x); };
  const x = Math.round((h(1)-.5)*34), y = Math.round((h(2)-.5)*30), rot = Math.round((h(3)-.5)*44), sk = Math.round((h(4)-.5)*20);
  return `transform:translate(${x}%,${y}%) rotate(${rot}deg) skewX(${sk}deg)`;
}

function renderDie(cell, idx){
  const f = classFace(cell.forcedFace || currentFace(cell));
  const isBlank = f.type==='blank';
  const inPath = S.path.includes(idx);
  const isLastMove = S.path.length && S.path[S.path.length-1]===idx;
  const selectable = canSelect(idx);
  // v1.38.0 Swap/Reroll: while one is armed, only its targets (and the armed die, to back out) take taps.
  const ta = S.trayAct;
  const taSrc = !!ta && (idx===ta.src || idx===ta.first);
  const taTarget = !!ta && !taSrc && trayActTargetOk(idx);
  const taReady = !ta && !!trayActFaceAt(idx);
  const clickable = ta ? (taSrc || taTarget) : (selectable || isLastMove);
  const trayActCls = `${taSrc?'trayact-src':''} ${taTarget?'trayact-target':''} ${taReady?'trayact-ready':''} ${cell.spent?'spent':''} ${S.justRerolledIdx===idx?'just-rerolled':''} ${(S.justSwappedIdx||[]).includes(idx)?'just-swapped':''}`;
  const num = inPath ? S.path.indexOf(idx)+1 : null;
  const zoneCls = inZone(idx) ? 'zone-cell' : '';
  const shakeCls = S.justScrambled ? 'shaking' : '';
  const strongGlint = S.justScrambled && !cell.minion && !isBlank && f.value>=3 && (f.type==='hit'||f.type==='combo'||f.type==='heal'||f.type==='block'||f.type==='shield');
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
  if(strongGlint) styleParts.push(`--glint-delay:${idx*18+400}ms`);
  else if(rippleEntry) styleParts.push(`animation-delay:${rippleEntry.order*90}ms`);
  if(resolveFx) styleParts.push(`--resolve-color:${RESOLVE_PULSE_COLORS[resolveFx.pulse]||RESOLVE_PULSE_COLORS.move}`);
  if(cell.minion) styleParts.push(`--md:${((idx*37)%50)/10}`);
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
  // Star-shaped outline with a clear gap: a thin stroke around the star polygon, masked so nothing is drawn within `gap` of the star.
  const comboRingHTML = (()=>{
    if(!comboAdjCount) return '';
    const lvl = Math.min(comboAdjCount,3);
    const P='M0 9.13L5.75 14.87L4.73 22.99L11.49 19.27L12.51 19.27L19.27 22.99L17.92 14.87L23.66 9.13L15.55 7.77L11.83 .68L7.77 8.11Z';
    const col = lvl>=3 ? '#ff8c28' : '#e8c35a';
    const ring=(id,gap,line)=>`<mask id="${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="44" height="44"><rect x="-10" y="-10" width="44" height="44" fill="#fff"/><path d="${P}" fill="#000" stroke="#000" stroke-width="${gap*2}" stroke-linejoin="round"/></mask><path d="${P}" fill="none" stroke="${col}" stroke-width="${(gap+line)*2}" stroke-linejoin="round" mask="url(#${id})"/>`;
    const rings = ring('cr'+lvl+'a',1.3,1.0) + (lvl>=2 ? ring('cr'+lvl+'b',2.8,1.0) : '');
    return `<svg class="combo-ring combo-ring-${lvl}" viewBox="-8 -8 40 40" aria-hidden="true">${rings}</svg>`;
  })();
  return `<div class="die ${dieTypeCls} ${isBlank?'blank':''} ${inPath?'in-path':''} ${isLastMove?'undoable':''} ${clickable?'selectable':'used'} ${zoneCls} ${shakeCls} ${strongGlint?'glint-strong':''} ${rippleCls} ${convertCls} ${forcedCls} ${boostTargetCls} ${resolveCls} ${minionClearCls} ${comboActiveCls} ${trayActCls}"
            data-idx="${idx}" title="${isLastMove?'Click to undo this move':(cell.minion?'Minion die':(taReady?`Tap to ${LABEL[trayActFaceAt(idx)]}`:cell.die.name))}" ${shakeDelay}>
            ${num?`<div class="pathnum">${num}</div>`:''}
            ${cell.minion?`<div class="minion-eyes" aria-hidden="true" style="${minionEyeStyle(idx)}"><i class="minion-eye"></i><i class="minion-eye"></i></div>`:''}
            ${(cell.forcedFace || boostTargetCls) ? `<div class="corner-badges">
              ${cell.forcedFace?`<span class="forced-badge ${justConverted?'badge-pop-in':''}" title="Converted by a class ability">✦</span>`:''}
              ${boostTargetCls?`<span class="boost-target-badge" title="Your armed Boost token will apply to this action">${iconSpan('boost')}</span>`:''}
            </div>` : ''}
            ${(!cell.minion && !cell.blank && ['gilded','alloy','magic'].includes(cell.die.cat)) ? `<span class="die-sheen sheen-${cell.die.cat}" style="--sd:${(idx*0.37).toFixed(2)}s"></span>` : ''}
            ${nameTag}
            ${comboRingHTML ? label.replace('<span class="icon-svg">','<span class="icon-svg">'+comboRingHTML) : label}
            ${resolveFx && resolveFx.text ? `<span class="delta-float ${resolveFx.cls}" ${resolveFx.size?`style="font-size:${resolveFx.size}px;"`:''}>${resolveFx.text}</span>` : ''}
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
  const fontSize = Math.round(Math.min(68, 28 + mag*3.4));
  const bigCls = mag>=4 ? 'big' : '';
  return {
    cls: isHeal ? 'flash-heal' : 'flash-damage',
    deltaHTML: `<span class="delta-float ${isHeal?'heal':'damage'} ${bigCls}" style="font-size:${fontSize}px; translate:${((Math.round(shown)*13)%5-2)*7}px 0;">${isHeal?'+':'-'}${shown}</span>`
  };
}

// Encounter art is mirrored to face the hero by default; list any whose original art already faces left here.
// Encounters whose current art is known to be the wrong picture: show the placeholder until the right art is supplied.
const ART_WRONG = new Set([]);
// Shrines face the way they were drawn unless listed here (Monster Footing page, Oct 16)
const SHRINE_FLIP = new Set([]);
const ENCOUNTER_NO_FLIP = new Set(['Grafted Grifter','Whence Wolf','Roudy Rinotter','Viscous Orb','Unbound Automa','Rogue Golemancer','Heating Elemental','Displacer Kitty','Armored Gear-Pest','Blastogenesis Engine','Half-life Host','Adhesive Pest Traps','The Necrorancher','Bellicose Biomancer','Ceramic Golem','Chimeric Sludge','Toadtaur Warrior','Rabbid Rabbats','Oilephant\'s Foot','Gestalt Network']); // Oct 15 (Jeremy): Toadtaur Warrior and Rabbid Rabbats face the other way
// Quest paper nudges (Oct 17 design fixes): [px left, px up] for the monsters whose art would otherwise hide the
// reward badges. Monsters always stand in front of the paper, so the paper moves instead (measured at 395x769).
const QUEST_PAPER_NUDGE = {'The Strike/Break-er':[-36,-14],'Self-Replicating Forge':[-25,-18],'Bio-Mutant Escape':[-25,-17],'Extractnid Matriarch':[-23,-6],
  'Anti-Euclidian Space':[-16,-12],'Extruzeon, Co-consul of Waste':[-12,-6],'Myceleus, Co-consul of Rot':[-10,-4],'Ergot Eruption':[-7,0],
  'Unventilated Workshop':[-6,0],'Leper Con-Trap':[-5,0],'Ditched Heist':[-5,0]};
function questPaperStyle(e){ const n = QUEST_PAPER_NUDGE[e && e.name]; return n ? ` style="--qdx:${n[0]}px;--qdy:${n[1]}px"` : ''; }
let foPlayer = null; // the hero's half of the face-off band, set each renderGame()
function renderEncounterCard(e, mode){
  const curHealthClamped = Math.max(0,e.curHealth);
  const hpPct = e.maxHealth? curHealthClamped/e.maxHealth*100 : 0;
  // Live preview of the currently-built (not-yet-committed) path's damage:
  // a hatched ghost slice at the leading edge of the health bar, so the
  // player can see the projected outcome before tapping Go.
  let dmgPreviewLeftPct = 0, dmgPreviewWidthPct = 0, killHint = null;
  if(e.maxHealth && S.path && S.path.length && S.encounter===e && !S.transitioning){
    const pathPreview = computePathEffects(S.path);
    const effDmg = Math.max(0, pathPreview.totalDamage - (e.curShield||0));
    const dmgAmt = Math.min(effDmg, curHealthClamped);
    dmgPreviewWidthPct = dmgAmt/e.maxHealth*100;
    dmgPreviewLeftPct = hpPct - dmgPreviewWidthPct;
    // Anticipation tied to real numbers: how this path stacks up against a
    // kill and against the Overkill line (10 past dead, 6 with Bloodthirst).
    const thr = (typeof hasRelic==='function' && hasRelic('hungry_blade')) ? 5 : 9;
    const d = effDmg;
    const hp = e.curHealth;
    if(d > hp + thr)      killHint = {state:'overkill', text:'OVERKILL!'};
    else if(d >= hp && hp > 0) {
      const more = Math.floor(hp + thr) + 1 - d;
      killHint = {state:'kill', text:`Lethal${more<=3?` \u00b7 +${more} for Overkill`:''}`};
    }
    else if(d > 0 && hp - d > 0 && hp - d <= 3) killHint = {state:'close', text:`So close \u2014 ${Math.ceil(hp-d)} short`};
  }
  const fx = healthFX(curHealthClamped, e._lastHealth);
  e._lastHealth = curHealthClamped;
  let statuses = '';
  if(e.curDOT) statuses += `<span class="status-chip status-tooltip-target" title="D.O.T. ${e.curDOT}: ${STATUS_DESC.dot}">${iconSpan('dot', e.curDOT)} DOT</span>`;
  if(e.curHOT) statuses += `<span class="status-chip status-tooltip-target" title="H.O.T. ${e.curHOT}: ${STATUS_DESC.hot}">${iconSpan('hot', e.curHOT)} HOT</span>`;
  if(e.curShield) statuses += `<span class="status-chip status-tooltip-target" title="Shield ${e.curShield}: ${STATUS_DESC.shield}">${iconSpan('block', e.curShield)} Shield</span>`;
  // One combined mouseover/long-press tooltip on the health bar itself,
  // listing every status currently affecting this encounter -- so a player
  // can see what Block/D.O.T./H.O.T./etc. actually do without needing a
  // separate hover per status chip.
  const statusTipLines = [];
  if(e.curDOT) statusTipLines.push(`D.O.T. ${e.curDOT}: ${STATUS_DESC.dot}`);
  if(e.curHOT) statusTipLines.push(`H.O.T. ${e.curHOT}: ${STATUS_DESC.hot}`);
  if(e.curShield) statusTipLines.push(`Shield ${e.curShield}: ${STATUS_DESC.shield}`);
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
  const roomEnterCls = S.newRoomFx ? (S.newRoomFx.boss ? 'room-enter room-enter-boss door-kick' : 'room-enter door-kick') : '';
  const doorDustHTML = S.newRoomFx ? '<div class="door-dust">'+[0,1,2,3,4,5,6].map(i=>`<i style="--dx:${(i-3)*17}px;--dy:${-10-((i*7)%5)*5}px;--d:${i*28}ms"></i>`).join('')+'</div>' : '';
  const isBoss = e.type==='Boss' || e.type==='Big Boss';
  // Regular (non-boss) encounters don't cycle through one action at a time
  // like bosses do -- every listed effect fires every turn, all at once.
  // So rather than a plain gray stats line, give them the same icon-badge
  // treatment as the boss cycle row (all badges "active", since none of
  // them are held back for a future turn) -- easier to read at a glance,
  // and visually consistent between boss and regular encounter cards.
  const nextTurn = enemyNextTurnPreview(e);
  const regularActionsRow = (!isBoss) ? (()=>{
    // v1.35.0: elite/deadly enemies telegraph a heavy turn (one stat doubled).
    const hs = nextTurn.heavy ? nextTurn.heavyStat : null;
    const items = [];
    if(e.dmg) items.push({type:'hit', stat:'dmg', label:'Hit', val:e.dmg});
    if(e.minion) items.push({type:'minion', stat:'minion', label:'Minion', val:e.minion});
    if(e.shield) items.push({type:'block', stat:'shield', label:'Shield', val:e.shield});
    if(e.heal) items.push({type:'heal', stat:'heal', label:'Heal', val:e.heal});
    if(e.hot) items.push({type:'hot', stat:'hot', label:'H.O.T.', val:e.hot});
    if(e.dot) items.push({type:'dot', stat:'dot', label:'D.O.T.', val:e.dot});
    if(!items.length) return '';
    // Oct 14 (Jeremy): icon + a readable number, no word (the number squeezed inside the icon was illegible); names are for boss specials only.
    const chips = items.map(it=>{ const v = (it.stat===hs ? it.val*2 : it.val) + (it.stat==='dmg' ? zealBonus(!!hs) : 0); return `<span class="boss-cycle-item next enemy-action-badge${it.stat===hs?' heavy':''}" title="${it.label} ${v}${it.stat===hs?' (heavy turn: doubled)':''}: ${enemyActionTooltip(it.type, v)}">${iconSpanSolid(it.type)}<b class="enc-n">${v}</b></span>`; }).join('');
    return `<div class="boss-cycle-row"><span class="hint" style="margin:0;">Each turn:</span>${chips}</div>`;
  })() : '';
  const art = ART_WRONG.has(e.name) ? null : MONSTER_ART[e.name];
  // v1.35.0: a boss's base attack (every turn) plus its next special, named.
  const bossCycle = (isBoss && e.kit) ? (()=>{
    const iconKey = {dmg:'hit', dmgPerMinion:'hit', minion:'minion', shield:'block', heal:'heal', hot:'hot', dot:'dot'};
    // Damage-per-Minion moves show the total for the Minions on your Tray now (literature review, Oct 14): the tiny
    // minion mark says it scales; the tooltip has the per-Minion number. Zeal adds once, as in enemyNextTurnPreview.
    const minsNow = S.tray ? S.tray.filter(c=>c.minion).length : 0;
    const perMinTotal = (a, hv) => { const t = a.value*minsNow; return t>0 ? t + zealBonus(hv) : 0; };
    const perMinNum = (a, hv) => `<b class="enc-n">${perMinTotal(a, hv)}</b><small class="enc-per">${iconSpan('minion')}</small>`;
    const actText = a => a.type==='dmgPerMinion' ? `${a.value} per Minion on your Tray (${minsNow} now: ${perMinTotal(a, !!a._hv)} damage)` : a.type==='dropShield' ? 'drops its Shield' : enemyActionTooltip(iconKey[a.type], a.value);
    const chip = (a0, extraCls, label) => {
      const a = a0.type==='dmg' ? {...a0, value:a0.value + (a0.grow ? (e.layers||0) : 0) + zealBonus(false)} : a0; // Zeal (and Extruzeon's layers) show in the warning
      const ik = iconKey[a.type]; if(!ik) return '';
      const num = a.type==='dmgPerMinion' ? perMinNum(a, false) : `<b class="enc-n">${a.value}</b>`;
      return `<span class="boss-cycle-item next enemy-action-badge ${extraCls}${a.grow?' grows':''}" title="${label?label+': ':''}${actText(a)}${a.grow?` (Layer by Layer: grows by ${a.grow} every turn)`:''}">${iconSpanSolid(ik)}${num}${label?' '+label:''}</span>`;
    };
    const kit = bossKitNow(e), sp = nextTurn.special;
    const base = kit.each.map(a=>chip(a,'','')).join('');
    const frozen = !!S.freezeNext;
    const spMain0 = sp.acts.find(a=>iconKey[a.type]) || sp.acts[0];
    const spMain = spMain0.type==='dmg' ? {...spMain0, value:spMain0.value + zealBonus(true)} : spMain0;
    const spTip = `${sp.name}: ${sp.herald?`(brought ${sp.herald.value} Minions with its warning) `:''}${sp.acts.map(a=>actText({...a,_hv:true})).join(', ')}${frozen?' (cancelled by Freeze)':''}`;
    const spNum = !spMain.value ? '' : spMain.type==='dmgPerMinion' ? perMinNum(spMain, true) : `<b class="enc-n">${spMain.value}</b>`;
    const special = `<span class="boss-cycle-item next enemy-action-badge boss-special${sp.windup&&!frozen?' heavy':''}${frozen?' frozen':''}" title="${spTip}">${iconKey[spMain.type]?iconSpanSolid(iconKey[spMain.type]):''}${spNum} ${sp.name}</span>`;
    return `<div class="boss-cycle-row${kit.each.length>1?' crowded':''}"><span class="hint" style="margin:0;">Next turn:</span>${base}${special}</div>`;
  })() : '';
  if(mode==='faceoff'){
    // The doorway face-off: your hero on the left, the monster (mirrored to face you) on the
    // right, each with their own health bar underneath. See decorateArch() for the stone frame.
    const chipsOnly = (isBoss ? bossCycle : regularActionsRow).replace(/<span class="hint"[^>]*>[^<]*<\/span>/,'');
    const tierWord = (e.tier==='elite'||e.tier==='deadly') ? (e.tier==='elite'?'Elite':'Deadly') : '';
    const typeWord = isBoss ? (e.type + '') : [tierWord, e.type!=='Enemy'?e.type:''].filter(Boolean).join(' ');
    const typeTag = typeWord ? `<small class="fo-type${isBoss?' fo-type-inline':''}${e.tier==='deadly'?' fo-type-deadly':''}">${typeWord}</small>` : '';
    const questLine = (e.quests && e.quests.length)
      ? `<div class="fo-quests-float"${questPaperStyle(e)} title="Complete these during the fight for bonus rewards"><i class="fq-body"></i><i class="fq-light" style="animation-delay:-${Math.round(performance.now()%3100)}ms"></i><div class="fo-quests-label">Quests</div>${e.quests.some(q=>!QUEST_ALL_FIGHT.test(parseQuestSpec(q).cond)) ? '<div class="fo-quests-sub">in one turn</div>' : ''}<div class="fo-quests">${e.quests.map((q,i)=>{ const qs=questStampAttrs(e.name,i); return `<span class="fo-quest ${e.questsDone[i]?'complete':''} ${qs.cls} q-row"${qs.style} title="${q.replace(/"/g,'&quot;')}">${questRowHTML(q, e.questsDone[i])}</span>`; }).join('')}</div></div>` : '';
    const flipCls = ENCOUNTER_NO_FLIP.has(e.name) ? '' : 'fo-flip';
    const sz = encounterSize(e);
    const monsterFig = art ? `<img class="fo-img ${flipCls} enc-art" src="${art}" alt="${e.name}" style="--sz:${sz};--drop:${encounterDrop(e)}%"/>`
      : `<div class="fo-img ${flipCls} fo-mystery">${mysteryFigureHTML('width:70%; aspect-ratio:1/1;')}</div>`;
    const p = foPlayer || {};
    return `
    <div class="enc-card fo-arch fo-lvl${Math.min(3,(S.floorIdx||0)+1)} ${roomEnterCls}">
      ${hallFxHTML()}
      <svg class="fo-sconce fo-sconce-l" viewBox="0 0 14 32" width="14" height="32" aria-hidden="true"><path d="M5 9.2 Q4.3 18 5.1 30 Q7.2 31.6 9.2 30 Q9.7 19 9 9.2Z" fill="#7a4a22" stroke="#0c0705" stroke-width="1.6" stroke-linejoin="round"/><path d="M1.6 15.4 Q7 13.9 12.4 15.2 Q13 17.6 12.2 19 Q7 20.3 1.8 19 Q1.1 17 1.6 15.4Z" fill="#55555e" stroke="#0c0705" stroke-width="1.5" stroke-linejoin="round"/><path d="M1.2 1.9 Q7 -0.7 12.8 1.7 Q12.2 6.6 9.7 9.7 Q7 10.7 4.4 9.5 Q2 6.6 1.2 1.9Z" fill="#55555e" stroke="#0c0705" stroke-width="1.6" stroke-linejoin="round"/></svg><div class="fo-torch fo-torch-l"></div><svg class="fo-sconce fo-sconce-r" viewBox="0 0 14 32" width="14" height="32" aria-hidden="true"><path d="M5 9.2 Q4.3 18 5.1 30 Q7.2 31.6 9.2 30 Q9.7 19 9 9.2Z" fill="#7a4a22" stroke="#0c0705" stroke-width="1.6" stroke-linejoin="round"/><path d="M1.6 15.4 Q7 13.9 12.4 15.2 Q13 17.6 12.2 19 Q7 20.3 1.8 19 Q1.1 17 1.6 15.4Z" fill="#55555e" stroke="#0c0705" stroke-width="1.5" stroke-linejoin="round"/><path d="M1.2 1.9 Q7 -0.7 12.8 1.7 Q12.2 6.6 9.7 9.7 Q7 10.7 4.4 9.5 Q2 6.6 1.2 1.9Z" fill="#55555e" stroke="#0c0705" stroke-width="1.6" stroke-linejoin="round"/></svg><div class="fo-torch fo-torch-r"></div>
      <div class="fo-hud"></div>
      ${questLine}
      <div class="fo-band">
        <div class="fo-side fo-player">
          ${relicStripHTML()}<div class="fo-fig ${p.figCls||''}" title="${S.origin.name} ${S.klass.name}">${p.figHTML||''}</div><div class="fo-floor"></div>
          <div class="fo-hpwrap status-tooltip-target" ${p.tip?`title="${p.tip}"`:''} style="position:relative;"><div class="bar ${p.fxCls||''}">${hpFillHTML('player','hp player',p.hpPct)}${shieldBarHTML(S.playerBlock, S.maxHealth, p.hpPct, 'player')}<span class="bar-num">${S.health}${shieldNumHTML(S.playerBlock)}/${S.maxHealth}</span></div>${p.deltaHTML||''}${tickFloatersHTML('player')}</div>
          <div class="fo-name">${S.charName&&S.charName.trim()?S.charName.trim().replace(/</g,'&lt;')+', '+S.origin.name+' '+S.klass.name:S.origin.name+' '+S.klass.name}</div>
          <div class="fo-chips fo-buffs">${hudChips(p.statusHTML)}</div>
        </div>
        <div class="fo-vs"><span class="fo-vs-txt${(performance.now()-UIFX.vsAt)<3400?' vs-intro':''}" style="animation-delay:-${Math.max(0,Math.round(performance.now()-UIFX.vsAt))}ms">vs</span></div>
        <div class="fo-side fo-enemy${isBoss?' fo-boss-side':''}">
          ${doorDustHTML}<div class="fo-fig enc-portrait ${sz>1.05?'fo-big ':''}${(sz>1.05&&/Boss/.test(e.type))?'fo-bossbig ':''}${(e.curHealth<=0 && S.resolvingIdx==null)?"fo-dead ":""}${fx.cls==='flash-damage'?'dmg-flash':fx.cls==='flash-heal'?'heal-flash':''}" style="--sz:${sz}">${monsterFig}</div><div class="fo-floor"></div>
          <div class="fo-hpwrap status-tooltip-target" ${statusTip?`title="${statusTip}"`:''} style="position:relative;">${isBoss ? bossArcBarHTML({hpPct, prevLeft:dmgPreviewLeftPct, prevW:dmgPreviewWidthPct, shieldVal:e.curShield, shieldMax:e.maxHealth, cls:`${fx.cls} ${killHint?'bar-'+killHint.state:''}`, numHTML:`<span class="bar-num">${curHealthClamped.toFixed(0)}${shieldNumHTML(e.curShield)}/${e.maxHealth}</span>`}) : `<div class="bar ${fx.cls} ${killHint?'bar-'+killHint.state:''}">
              ${hpFillHTML('enemy','hp',hpPct)}
              ${dmgPreviewWidthPct>0?`<div class="bar-fill dmg-preview" style="left:${dmgPreviewLeftPct}%; width:${dmgPreviewWidthPct}%;" title="Projected damage from your current path"></div>`:''}
              ${shieldBarHTML(e.curShield, e.maxHealth, hpPct, 'enemy')}<span class="bar-num">${curHealthClamped.toFixed(0)}${shieldNumHTML(e.curShield)}/${e.maxHealth}</span>
            </div>`}${fx.deltaHTML}${tickFloatersHTML('enemy')}<div class="kill-hint fo-hint ${killHint?'kill-hint-'+killHint.state:''}" ${killHint?`data-hint="${killHint.state}"`:''}>${killHint?killHint.text:'&nbsp;'}</div></div>
          <div class="fo-name" ${e.flavor?`title="${e.flavor.replace(/"/g,'&quot;')}"`:''}>${typeTag}${e.name}</div>
          <div class="fo-chips fo-buffs">${hudChips(statuses)}</div>
          ${chipsOnly?`<div class="fo-turnlabel${nextTurn.heavy?' heavy':''}" title="${isBoss?'Every turn the boss makes its base attack plus the special shown (Freeze cancels the special).':(HEAVY_EVERY[e.tier]?'The enemy does all of these every turn. Every '+HEAVY_EVERY[e.tier]+(HEAVY_EVERY[e.tier]===2?'nd':'rd')+' turn is a heavy turn that doubles one of them (Freeze cancels it).':'The enemy does all of these every turn.')}">${isBoss?(e.phase===2?(nextTurn.heavy?'Phase 2 &middot; Wind-up!':'Phase 2 &middot; Next turn'):(nextTurn.heavy?'Wind-up next!':'Next turn')):(nextTurn.heavy?'Heavy turn next!':(HEAVY_EVERY[e.tier]?'Heavy in '+(HEAVY_EVERY[e.tier]-((e.turnsActed||0)%HEAVY_EVERY[e.tier])):'Every turn'))}</div>`:''}
          <div class="fo-chips">${chipsOnly}</div>
        </div>
      </div>
      ${e.flavor?`<div class="fo-flavor">${e.flavor}</div>`:''}
    </div>`;
  }
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
            <div class="bar-row status-tooltip-target" ${statusTip?`title="${statusTip}"`:''} style="position:relative;"><span>${iconSpan('heal')}</span><div class="bar ${fx.cls} ${killHint?'bar-'+killHint.state:''}">
                <div class="bar-fill hp" style="width:${hpPct}%"></div>
                ${dmgPreviewWidthPct>0?`<div class="bar-fill dmg-preview" style="left:${dmgPreviewLeftPct}%; width:${dmgPreviewWidthPct}%;" title="Projected damage from your current path"></div>`:''}
              </div><span>${curHealthClamped.toFixed(0)}/${e.maxHealth}</span>${fx.deltaHTML}</div>
            ${killHint?`<div class="kill-hint kill-hint-${killHint.state}" data-hint="${killHint.state}">${killHint.text}</div>`:''}
            ${isBoss ? bossCycle : regularActionsRow}
            <div class="statuses">${statuses}</div>
            ${quests}
            ${e.flavor?`<div class="enc-flavor">${e.flavor}</div>`:''}
          </div>
        </div>
      </div>
    </div>`;
}

// Tier of the live path total: 0 plain, 1 (8+) glowing, 2 (15+) orange, 3 (25+) red-hot.
// Crossing up a tier plays a sparkle once; the digits roll up to each new total.
let pcfLastTier = 0, pcfLastVal = 0;
function pcfTierFor(v){ return v>=25 ? 3 : v>=15 ? 2 : v>=8 ? 1 : 0; }
function resetPathCounterFx(){ pcfLastTier = 0; pcfLastVal = 0; khLast = ''; }
// Plays a cue only when the kill-hint state changes (render() runs a lot).
let khLast = '';
function killHintFx(){
  const n = document.querySelector('.kill-hint[data-hint]');
  const st = n ? n.dataset.hint : '';
  if(st === khLast) return;
  const prev = khLast; khLast = st;
  if(!st || S.transitioning) return;
  if(st==='close') playTone('closeCall');
  else if(st==='kill' && prev!=='overkill') playTone('tierUp', 1);
  else if(st==='overkill'){ playTone('tierUp', 4); vibrate(20); }
}
function rollPathCounter(){
  const n = document.querySelector('.pcf-num[data-to]');
  if(!n) return;
  const from = parseFloat(n.dataset.from), to = parseFloat(n.dataset.to);
  if(PREFS.reducedMotion || !(from<to)) return;
  const t0 = performance.now(), dur = 180;
  const fmt = v => (to%1 ? v.toFixed(1) : String(Math.round(v)));
  const tick = (now)=>{
    const k = Math.min(1,(now-t0)/dur);
    n.textContent = fmt(from + (to-from)*(1-Math.pow(1-k,3)));
    if(k<1 && n.isConnected) requestAnimationFrame(tick); else if(n.isConnected) n.textContent = fmt(to);
  };
  requestAnimationFrame(tick);
}

function pathCounterHTML(){
  if(!S.path.length){ resetPathCounterFx(); return ''; }
  const preview = computePathEffects(S.path);
  const val = preview.totalDamage;
  const tier = pcfTierFor(val);
  const fromVal = pcfLastVal;
  if(tier>pcfLastTier && typeof playTone==='function') playTone('tierUp');
  pcfLastTier = tier; pcfLastVal = val;
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
  return `<div class="path-counter-float ${big?'pcf-big':''} ${tier>=2?'pcf-t'+tier:''}">
      <span class="pcf-num" data-from="${fromVal}" data-to="${val}" style="font-size:${size}px;">${val%1?val.toFixed(1):val}</span>
      ${extras.length?`<span class="pcf-extra">${extras.join(' ')}</span>`:''}
    </div>`;
}

function tokensRowHTML(){
  const btns = [];
  if(S.nullifyTokens>0) btns.push(`<button id="use-nullify-token">${iconSpan('nullify')} Use Nullify Token <span class="token-count">${S.nullifyTokens}</span></button>`);
  if(S.freezeTokens>0) btns.push(`<button id="use-freeze-token">${iconSpan('freeze')} Use Freeze Token <span class="token-count">${S.freezeTokens}</span></button>`);
  if((S.swapTokens||0)>0) btns.push(`<button id="use-swap-token">${iconSpan('swap')} Use Swap Token <span class="token-count">${S.swapTokens}</span></button>`);
  if((S.rerollTokens||0)>0) btns.push(`<button id="use-reroll-token">${iconSpan('reroll')} Use Reroll Token <span class="token-count">${S.rerollTokens}</span></button>`);
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
  const swapBtn = overlay.querySelector('#use-swap-token');
  if(swapBtn) swapBtn.onclick = ()=>{
    if(S.transitioning || !S.encounter || !(S.swapTokens>0)) return;
    armTrayAct('swap', null, true);
    closeModal(overlay, render);
  };
  const rerollBtn = overlay.querySelector('#use-reroll-token');
  if(rerollBtn) rerollBtn.onclick = ()=>{
    if(S.transitioning || !S.encounter || !(S.rerollTokens>0)) return;
    armTrayAct('reroll', null, true);
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
  const totalTokens = S.nullifyTokens + S.freezeTokens + S.boostTokenCharges + (S.swapTokens||0) + (S.rerollTokens||0);
  // One combined mouseover/long-press tooltip on the health bar, listing
  // every status currently affecting the player -- same idea as the
  // encounter card's health-bar tooltip.
  const playerStatusTipLines = [];
  if(S.playerDOT) playerStatusTipLines.push(`D.O.T. ${S.playerDOT}: ${STATUS_DESC.dot}`);
  if(S.playerHOT) playerStatusTipLines.push(`H.O.T. ${S.playerHOT}: ${STATUS_DESC.hot}`);
  if(S.playerBlock) playerStatusTipLines.push(`Block ${S.playerBlock}: ${STATUS_DESC.block}`);
  const minionCount = (S.tray||[]).filter(c=>c.minion).length; // the minions are on YOUR tray, so the debuff lives under you
  if(minionCount) playerStatusTipLines.push(`Minions ${minionCount}: ${STATUS_DESC.minions}`);
  if(S.pendingFreeBoost) playerStatusTipLines.push(`Boost x${S.pendingFreeBoost} armed: ${STATUS_DESC.boost}`);
  const playerStatusTip = playerStatusTipLines.join('\n');
  { const portrait = S.portrait || { img: GNOME_PORTRAITS[0], placeholder:true };
    foPlayer = { statusHTML:`${S.playerDOT?`<span class="status-chip status-tooltip-target" title="D.O.T. ${S.playerDOT}: ${STATUS_DESC.dot}">${iconSpan('dot', S.playerDOT)} DOT</span>`:''}        ${S.playerHOT?`<span class="status-chip status-tooltip-target" title="H.O.T. ${S.playerHOT}: ${STATUS_DESC.hot}">${iconSpan('hot', S.playerHOT)} HOT</span>`:''}        ${S.playerBlock?`<span class="status-chip status-tooltip-target" title="Block ${S.playerBlock}: ${STATUS_DESC.block}">${iconSpan('block', S.playerBlock)} Block</span>`:''}        ${minionCount?`<span class="status-chip status-tooltip-target" title="Minions ${minionCount}: ${STATUS_DESC.minions}">Minions ${minionCount}</span>`:''}${S.pendingFreeBoost?`<span class="status-chip status-tooltip-target" style="background:var(--gold);color:#241c10;" title="Boost x${S.pendingFreeBoost} armed: ${STATUS_DESC.boost}">${iconSpan('boost')} Boost x${S.pendingFreeBoost} armed</span>`:''}`, fxCls:playerFx.cls, deltaHTML:playerFx.deltaHTML, hpPct, tip:playerStatusTip,
      figCls: playerFx.cls==='flash-damage'?'dmg-flash':playerFx.cls==='flash-heal'?'heal-flash':'',
      figHTML: portrait.placeholder ? mysteryFigureHTML('width:60px; height:60px;') : `<img class="fo-img" src="${portrait.img}" alt="${S.origin.name}">` }; }
  app.innerHTML = `
    <div class="panel route-float" style="margin-bottom:8px;">
      ${renderRoute()}
    </div>
    <div class="panel enc-panel-arch" id="enc-panel" style="margin-bottom:8px;">
      <div class="enc-rail-row">
        <div class="enc-card-col">${e?renderEncounterCard(e,'faceoff'):'<p>No active encounter.</p>'}</div>
      </div>
    </div>
    <div class="panel tray-panel">
      <div class="enc-rail-row">
        <div class="enc-card-col">
          <div class="tray-float-wrap">
            <div class="tray-head"><span class="round-badge" title="Floor ${S.floorIdx+1}, round ${S.turnNumber+1}"><b class="rb-floor">F${S.floorIdx+1}</b>&middot; Rd ${S.turnNumber+1}</span><div class="path-strip" id="path-strip"></div></div>
            <div class="tray-wrap tray-wrap-full ${S.justScrambled?'tray-shake':''}">
              <div class="tray ${S.newRoomFx?'tray-room-in':''} ${abilityArmed?'ability-armed':''} ${S.trayAct?'trayact-armed':''}" id="tray" style="--class-color:${S.klass.color||'#ffffff'}; --gd:-${Math.round(performance.now()%4600)}ms"></div>
              ${chestTrimHTML()}
            </div>
            ${S.transitioning ? `<button class="skip-turn-btn" id="skip-transition-btn">Skip</button>` : pathCounterHTML()}
          </div>
        </div>
        <div class="util-rail">
          <div class="util-btn primary-accent rail-go ${(resolveDisabled||S.transitioning)?'disabled':''} ${emphasizeResolve?'pulse':''}" id="resolve-btn"><span>Go</span></div>
          <div class="util-btn rail-pocket" id="open-backpocket-btn" title="${S.backPocket.length?'Safety net ready: if you fall to 0 Health, your Back Pocket can save you once (it spends every die in it).':'Back Pocket empty: no safety net until a die lands here.'}">${iconSpan('bag')}<span>Pocket</span>${S.backPocket.length?'<span class="badge pocket-heart"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.2 C 5.5 15.6 2 12.4 2 8.2 C 2 5.1 4.4 2.8 7.3 2.8 C 9.2 2.8 10.9 3.8 12 5.4 C 13.1 3.8 14.8 2.8 16.7 2.8 C 19.6 2.8 22 5.1 22 8.2 C 22 12.4 18.5 15.6 12 21.2 Z" fill="currentColor"/></svg></span>':''}</div>
          <div class="util-btn rail-item ${totalTokens?'':'disabled'}" id="open-tokens-btn">${iconSpan('use')}<span>Item</span>${totalTokens?`<span class="badge">${totalTokens}</span>`:''}</div>
          <div class="util-btn danger-accent rail-clear ${S.transitioning?'disabled':''} ${clearConfirmArmed?'pulse':''}" id="clear-path-btn">${iconSpan('fumble')}<span>${clearConfirmArmed?'Sure?':'Clear'}</span></div>
          ${S.klass.convertTo ? `<div class="util-btn rail-ability ${(S.classAbilityUsed||S.transitioning)?'disabled':''} ${abilityArmed?'armed':''} ${(S.coachRun && !S.classAbilityUsed && !S.transitioning && !abilityArmed)?'pulse coach-pulse':''}" id="ability-btn" style="--class-color:${S.klass.color||'#d4af52'}"><span>${S.classAbilityUsed?'Used':(abilityArmed?'Pick a Die':'Skill')}</span></div>`
            : S.klass.debug ? `<div class="util-btn rail-ability ${(!S.encounter||S.transitioning)?'disabled':''}" id="debug-win-btn"><span>Win</span></div>` : ''}
        </div>
      </div>
    </div>
  `;
  document.getElementById('tray').innerHTML = S.tray.map((c,i)=>renderDie(c,i)).join('');
  renderGame._minions = S.tray.filter(c=>c.minion).length; renderGame._tok = `${S.swapTokens||0}|${S.rerollTokens||0}`;
  { const c = document.querySelector('#enc-panel .fo-arch'); if(c && syncRoomFloor._hz) c.style.setProperty('--hz', syncRoomFloor._hz+'px'); }
  // placeVs() runs after the path strip is written (below): reading layout here and writing the strip after it
  // forced a second full layout on every path tap (Oct 12)
  if(S.newRoomFx){
    showRoomCallout(S.newRoomFx);
    playTone(S.newRoomFx.boss ? 'bossRoomEnter' : 'roomEnter');
    if(S.newRoomFx.boss) vibrate([30,40,30]);
    if(S.newRoomFx.boss && typeof screenShake==='function') screenShake('big'); // ordinary rooms: the banner and door burst are enough
    // Quest cue: a bright chime plus a one-time glow on the quest paper, so a
    // room with bonus objectives announces them instead of leaving them as small print.
    if(S.encounter && S.encounter.quests && S.encounter.quests.length){
      const qEl = document.querySelector('.fo-quests-float');
      if(qEl && !PREFS.reducedMotion) setTimeout(()=>{ qEl.classList.add('quest-flash'); setTimeout(()=>qEl.classList.remove('quest-flash'), 1550); }, 350);
      setTimeout(()=> playTone('questStart'), 420);
    }
    maybeShowSymbolIntro();
    S.newRoomFx = null; // consumed -- plays once, on the render right after advanceRoute() set it
  } else maybeShowSymbolIntro();
  if(S.justScrambled){
    const strong = document.querySelectorAll('#tray .glint-strong').length;
    if(strong && !PREFS.reducedMotion) setTimeout(()=> playTone('glint', Math.min(4, strong-1)), 520);
    // each loot-die metal that landed on the tray gets its own soft shimmer cue (once per scramble)
    ['gilded','alloy','magic'].forEach((cat,k)=>{ if(document.querySelector('#tray .sheen-'+cat) && !PREFS.reducedMotion) setTimeout(()=> playTone(cat+'Shine'), 700 + k*140); });
  }
  S.justScrambled = false;
  S.lastComboRipple = null; // consumed -- plays once, on the render right after runPlayerPathSteps() set it
  S.lastMinionClearIdx = null; // consumed -- plays once, on the render right after runPlayerPathSteps() set it
  S.justConvertedIdx = null; // consumed -- plays once, on the render right after useClassAbility() set it
  S.justRerolledIdx = null; S.justSwappedIdx = null; // consumed (Swap/Reroll flourishes, v1.38.0)
  bindTrayDice();
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
    clearPathAll();
    render();
  };
  document.getElementById('resolve-btn').onclick = ()=>{
    // read the live path: path taps redraw with renderPathOnly(), which doesn't rebuild this handler (Oct 12 fix)
    if(S.transitioning || (S.path.length===0 && anyMoveAvailable())) return;
    getAudioCtx(); // warm up/unlock audio inside this user gesture; later queued tones (from setTimeout-driven transition steps) then play fine
    chestLockFxAt = performance.now();
    { const lk=document.querySelector('.chest-lock'); if(lk) lk.classList.add('unlock'); }
    endTurnButton();
  };
  attachLongPressTooltips('.enemy-action-badge');
  attachLongPressTooltips('.status-tooltip-target');
  attachLongPressTooltips('.route-tooltip-target');
  { const kb=document.getElementById('open-key-btn'); if(kb) kb.onclick = ()=> openInfoModal('Action Key', keyCardHTML()); }
  document.getElementById('open-backpocket-btn').onclick = ()=> openInfoModal('Back Pocket', backPocketViewHTML());
  document.getElementById('open-tokens-btn').onclick = ()=>{ if(totalTokens>0) openTokensModal(); };
  const abilityBtn = document.getElementById('ability-btn');
  if(abilityBtn) abilityBtn.onclick = ()=>{
    if(S.transitioning || S.classAbilityUsed) return;
    abilityArmed = !abilityArmed; // tap again to back out before picking a die
    playTone(abilityArmed ? 'skillArm' : 'skillDisarm');
    if(abilityArmed) logMsg('sys', `Click a die in your zone to convert it.`);
    renderTrayFast(); // the zone die tap itself is handled in bindTrayDice (Oct 14: no full redraw per tap)
  };
  const debugWinBtn = document.getElementById('debug-win-btn');
  if(debugWinBtn) debugWinBtn.onclick = ()=>{
    if(!S.encounter || S.transitioning) return;
    debugWinEncounter();
  };
  renderPathStrip();
  if(S.transitioning){
    const skipBtn = document.getElementById('skip-transition-btn');
    if(skipBtn) skipBtn.onclick = skipTransition;
  }

  placeVs();
  syncLethalWarning();
  maybeAbilityCoach();
  updatePathTrail();
  rollPathCounter();
  killHintFx();
  attachRelicStrip();
  if(S.lootChoice) renderLootModal();
  if(S.shrineChoice) renderShrineChoiceModal();
  if(S.relicChoice) renderRelicChoiceModal();
  if(S.pendingLootDie) renderSwapModal();
}

// Tray dice: long-press shows the face, a tap builds the path. Shared by renderGame() and renderPathOnly().
function bindTrayDice(){
  [...document.getElementById('tray').children].forEach(node=>{
    const idx = parseInt(node.dataset.idx);
    let pressTimer = null;
    let longPressed = false;
    let pressTimerWasActive = false;
    const cancelPress = ()=>{
      if(pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
      // only dismiss a bubble this die itself raised -- a plain pointerleave must not kill other tooltips (e.g. the enemy flavor bubble)
      if(longPressed || pressTimerWasActive) hideFaceTooltip();
      pressTimerWasActive = false;
      // Leave `longPressed` as-is here: pointerup fires just before the
      // synthetic click, and the click handler is what needs to see it was
      // a long-press (to swallow the click) before it gets cleared.
    };
    node.addEventListener('pointerdown', (ev)=>{
      if(S.transitioning) return;
      longPressed = false; pressTimerWasActive = true;
      const rect = node.getBoundingClientRect();
      pressTimer = setTimeout(()=>{
        longPressed = true;
        const cell = S.tray[idx];
        if(cell.minion){
          showFaceTooltip(rect, `<strong>Minion die</strong> — clogs this space; each damage you deal clears one, or Leap clean over it.`);
          return;
        }
        const f = classFace(cell.forcedFace || currentFace(cell));
        showFaceTooltip(rect, `<strong>${LABEL[f.type]}${(f.value && !ICON_VALUE_SLOT.has(f.type))?' '+f.value:''}</strong> — ${FACE_DESC[f.type]||''}`);
      }, 420);
    });
    ['pointerup','pointerleave','pointercancel'].forEach(evt=> node.addEventListener(evt, cancelPress));
    node.onclick = ()=> {
      if(S.transitioning) return;
      if(longPressed){ longPressed = false; return; } // long-press consumed this interaction
      if(abilityArmed){ // Skill armed: a zone die converts (and is not added to the path); any other die backs out and taps normally
        abilityArmed = false;
        if(inZone(idx) && !S.classAbilityUsed){ playTone('skillUse'); useClassAbility(idx); return; }
        playTone('skillDisarm');
      }
      if(node.classList.contains('used') && !node.classList.contains('undoable')) return;
      toggleSelect(idx);
    };
  });
}
function renderPathStrip(){
  { // Path as a rightward-growing stack of overlapping coins, one per move (latest on top).
    const n = S.path.length;
    const step = n>1 ? Math.min(16, 180/(n-1)) : 16;
    const ta = S.trayAct;
    if(ta){ document.getElementById('path-strip').innerHTML = `<span class="trayact-hint">${iconSpan(ta.kind)} ${ta.kind==='swap' ? (ta.token ? (ta.first==null ? 'Tap the first die to swap' : 'Tap the second die') : 'Tap a die to trade places') : 'Tap a die to reroll'}</span>`; }
    else document.getElementById('path-strip').innerHTML = S.path.map((idx,k)=>{
      const f = classFace(getFaceForIdx(idx));
      const tip = `${k+1}. ${LABEL[f.type]}${(f.value && !ICON_VALUE_SLOT.has(f.type))?(' '+f.value):''}`;
      return `<span class="path-coin" style="${k?`margin-left:${(step-30).toFixed(1)}px;`:''}z-index:${k+1}" title="${tip}">${iconSpan(f.type, f.value)}</span>`;
    }).join('');
  }
}
// Fast update for a plain path tap (Oct 12, performance): only what a path step changes is redrawn -- the dice,
// the path coins, the damage counter, Go, the chest lock and the enemy health bar's preview -- instead of the
// whole screen. Anything unusual falls back to the full render().
// Class-ability coach (Oct 13, Jeremy): the first fight with each class explains its Skill once, in plain words,
// placed high so the tray and its zone stay visible below it. Remembered per class in META.coachSeen.
const ABILITY_COACH = {
  armsmaster:'Once every turn, tap <b>Skill</b>, then any die in your dashed zone (the right column) to turn it into a Hit (2). Use it every turn: it is free damage.',
  guard:'Once every turn, tap <b>Skill</b>, then any die in your dashed zone (the L of three squares, middle right) to turn it into a Block (1). Use it every turn: Block stops damage before it lands.',
  dungeoneer:'Always on: your dashed zone is the left and right edges, and your path can wrap from one edge straight to the other on any row. Each wrap adds +1 damage to your next attacking die. Look for long paths that cross the sides.',
  arcanist:'Always on: your dashed zone is both diagonals. Once your path is on the X, it may step diagonally to another square of the X. And every Boost you play is 1 stronger (x2 becomes x3). Look for paths that run along the X.',
};
function maybeAbilityCoach(){
  if(!S || S.screen!=='game' || !S.encounter || S.encounter.type==='Shrine' || S.transitioning) return;
  if(typeof navigator!=='undefined' && navigator.webdriver) return; // automated tests and the balance bot
  const id = S.klass && S.klass.id; if(!ABILITY_COACH[id]) return;
  if(!META.coachSeen) META.coachSeen = {};
  if(META.coachSeen[id] || document.querySelector('.coach-overlay') || S.lootChoice || S.shrineChoice || S.relicChoice) return;
  // wait for the room banner ("You scramble into...") to be tapped away first
  if(document.getElementById('room-callout') || document.querySelector('.modal-overlay')){ clearTimeout(maybeAbilityCoach._t); maybeAbilityCoach._t = setTimeout(maybeAbilityCoach, 400); return; }
  META.coachSeen[id] = Date.now(); saveMeta();
  const overlay = el(`<div class="modal-overlay coach-overlay"><div class="modal coach-card" style="text-align:center; max-width:320px; --class-color:${S.klass.color||'#d4af52'}">
      <h2 style="margin-top:0;">${S.klass.name} Skill</h2>
      <p style="text-align:left;">${ABILITY_COACH[id]}</p>
      <button class="primary" id="coach-ok">Got it</button>
    </div></div>`);
  openModal(overlay);
  const done = ()=> closeModal(overlay);
  overlay.querySelector('#coach-ok').onclick = done;
  overlay.onclick = (ev)=>{ if(ev.target===overlay) done(); };
}

// Lethal warning on your HP bar (Oct 13): a red pulse and a skull tag when the enemy's next turn plus your
// D.O.T. would finish you (playerLethalRisk, logic.js). Absolutely placed, so the card never grows.
function syncLethalWarning(){
  const pw = document.querySelector('#enc-panel .fo-player .fo-hpwrap'); if(!pw) return;
  const L = (!S.transitioning && S.resolvingIdx==null) ? playerLethalRisk() : null;
  pw.classList.toggle('lethal', !!L);
  const old = pw.querySelector('.lethal-tag'); if(old) old.remove();
  if(L){
    const tip = `Lethal: hit ${L.hit}${L.block?` - Block ${L.block}`:''}${L.dot?` + D.O.T. ${L.dot}`:''}${L.hot?` - H.O.T. ${L.hot}`:''} vs your ${L.hp} HP. Block, heal, Freeze, Nullify, or kill it this turn.`;
    pw.insertAdjacentHTML('beforeend', `<span class="lethal-tag" title="${tip}">&#9760; Lethal next turn</span>`);
  }
}
// Fast update for Swap/Reroll and class-Skill taps (Oct 14): same idea as renderPathOnly, plus the tray's armed
// classes, the Skill button and the one-shot flip/convert flourishes. Token use, a changed Minion count or anything
// unusual falls back to render().
function renderTrayFast(){
  const tray = document.getElementById('tray');
  if(!S || S.screen!=='game' || !S.encounter || S.transitioning || S.newRoomFx || !tray
     || S.lootChoice || S.shrineChoice || S.relicChoice || S.pendingLootDie
     || (S.trayAct && S.trayAct.token)
     || S.tray.filter(c=>c.minion).length !== renderGame._minions
     || `${S.swapTokens||0}|${S.rerollTokens||0}` !== renderGame._tok) return render();
  hideFaceTooltip();
  tray.classList.toggle('ability-armed', abilityArmed);
  tray.classList.toggle('trayact-armed', !!S.trayAct);
  tray.innerHTML = S.tray.map((c,i)=>renderDie(c,i)).join('');
  bindTrayDice();
  renderPathStrip();
  const ab = document.getElementById('ability-btn');
  if(ab){
    ab.classList.toggle('disabled', !!(S.classAbilityUsed||S.transitioning));
    ab.classList.toggle('armed', abilityArmed);
    const coach = !!(S.coachRun && !S.classAbilityUsed && !S.transitioning && !abilityArmed);
    ab.classList.toggle('pulse', coach); ab.classList.toggle('coach-pulse', coach);
    const sp = ab.querySelector('span'); if(sp) sp.textContent = S.classAbilityUsed ? 'Used' : (abilityArmed ? 'Pick a Die' : 'Skill');
  }
  S.justConvertedIdx = null; S.justRerolledIdx = null; S.justSwappedIdx = null; // one-shot flourishes, as in renderGame
  refreshPathBits();
}

function renderPathOnly(){
  const tray = document.getElementById('tray');
  if(!S || S.screen!=='game' || !S.encounter || S.transitioning || S.trayAct || abilityArmed || S.newRoomFx || !tray
     || S.lootChoice || S.shrineChoice || S.relicChoice || S.pendingLootDie) return render();
  const minions = S.tray.filter(c=>c.minion).length;
  if(minions !== renderGame._minions) return render(); // a step uncovered a Minion: the scene's Minion chip changes too
  hideFaceTooltip();
  tray.innerHTML = S.tray.map((c,i)=>renderDie(c,i)).join('');
  bindTrayDice();
  renderPathStrip();
  refreshPathBits();
}
// What a path change redraws besides the dice and coins: counter, Go, chest lock, enemy hp-bar preview, lethal tag.
function refreshPathBits(){
  const wrap = document.querySelector('.tray-float-wrap');
  if(wrap){ wrap.querySelectorAll('.path-counter-float').forEach(n=>n.remove()); wrap.insertAdjacentHTML('beforeend', pathCounterHTML()); }
  const go = document.getElementById('resolve-btn');
  if(go){ const canExtend = anyMoveAvailable(), disabled = S.path.length===0 && canExtend;
    go.classList.toggle('disabled', disabled); go.classList.toggle('pulse', !disabled && !canExtend); }
  const lock = document.querySelector('.chest-lock');
  if(lock){ let ready = false; try{ if(S.path.length) ready = pcfTierFor(computePathEffects(S.path).totalDamage) >= 2; }catch(e){} lock.classList.toggle('ready', ready); }
  // enemy health bar (damage preview + Lethal/Overkill hint): rebuilt from the card markup, only that node swapped
  const old = document.querySelector('#enc-panel .fo-enemy .fo-hpwrap');
  if(old){ const t = document.createElement('div'); t.innerHTML = renderEncounterCard(S.encounter,'faceoff');
    const nw = t.querySelector('.fo-enemy .fo-hpwrap'); if(nw) old.replaceWith(nw); }
  syncLethalWarning();
  updatePathTrail();
  rollPathCounter();
  killHintFx();
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
document.addEventListener('click', ev=>{
  const d = ev.target && ev.target.closest ? ev.target.closest('.info-dot') : null;
  if(!d) return;
  ev.stopImmediatePropagation();
  showFaceTooltip(d.getBoundingClientRect(), d.getAttribute('title'));
  setTimeout(hideFaceTooltip, 4500);
}, true);
// Tap a status chip or enemy action badge -> a small popup about it (same idea as the relic strip's list).
document.addEventListener('click', ev=>{
  const chip = ev.target && ev.target.closest ? ev.target.closest('.status-chip[title], .enemy-action-badge[title], .boss-cycle-item[title]') : null;
  if(!chip) return;
  const t = chip.getAttribute('title') || '';
  const i = t.indexOf(': ');
  const head = i>0 ? t.slice(0,i) : chip.textContent.trim();
  const body = i>0 ? t.slice(i+2) : t;
  const m = openInfoModal(head, `<p style="text-align:left;">${body}</p>`);
}, false);
// Poke animations run through the Web Animations API on the individual translate/rotate properties, so they never
// replace the element's own CSS animation (which would replay its entrance when the class came off).
function pokeAnim(el, kind){
  if(!el || !el.animate || (typeof PREFS!=='undefined' && PREFS.reducedMotion)) return;
  const shake = [ {translate:'0 0',rotate:'0deg'}, {translate:'-5px 0',rotate:'-3deg',offset:.15}, {translate:'4px 0',rotate:'2deg',offset:.3}, {translate:'-3px 0',rotate:'-2deg',offset:.45}, {translate:'3px 0',rotate:'1deg',offset:.6}, {translate:'-1px 0',rotate:'0deg',offset:.8}, {translate:'0 0',rotate:'0deg'} ];
  const jerk = [ {translate:'0 0',rotate:'0deg'}, {translate:'5px -2px',rotate:'4deg',offset:.12}, {translate:'-6px 1px',rotate:'-5deg',offset:.26}, {translate:'4px -1px',rotate:'3deg',offset:.42}, {translate:'-3px 0',rotate:'-2deg',offset:.58}, {translate:'2px 0',rotate:'1deg',offset:.75}, {translate:'0 0',rotate:'0deg'} ];
  try{ el.animate(kind==='jerk'?jerk:shake, kind==='jerk' ? {duration:420, easing:'steps(7,end)'} : {duration:450, easing:'ease'}); }catch(e){}
}
// Poke the portraits: the hero gives a little shake; the enemy shows its flavor text for a few seconds.
document.addEventListener('click', ev=>{
  const hero = ev.target && ev.target.closest ? ev.target.closest('.camp-hero') : null;
  if(hero){ pokeAnim(hero,'shake'); return; }
  const fig = ev.target && ev.target.closest ? ev.target.closest('.fo-arch .fo-fig') : null;
  if(!fig || !S || (S.screen!=='game' && S.screen!=='shrine')) return; // shrines too (Jeremy, Oct 16)
  if(fig.closest('.fo-player')){
    pokeAnim(fig,'shake');
  } else if(fig.closest('.fo-enemy')){
    pokeAnim(fig,'jerk');
    if(!(S.encounter && S.encounter.flavor)) return;
    const imgEl = fig.querySelector('.fo-img') || fig;
    const r = imgEl.getBoundingClientRect();
    showFaceTooltip(r, `<em>${S.encounter.flavor}</em>`);
    // sit the bubble directly over the portrait, centered on it
    if(faceTooltipEl){
      faceTooltipEl.classList.add('flavor-bubble');
      const bw = faceTooltipEl.offsetWidth, bh = faceTooltipEl.offsetHeight;
      const card = fig.closest('.fo-arch'); const cr = card ? card.getBoundingClientRect() : {left:0,width:window.innerWidth};
      faceTooltipEl.style.left = Math.max(6, Math.min(window.innerWidth-bw-6, cr.left + cr.width/2 - bw/2))+'px';
      faceTooltipEl.style.top = Math.max(6, r.top + r.height/2 - bh/2 - 55)+'px';
    }
    clearTimeout(window._flavorT); window._flavorT = setTimeout(hideFaceTooltip, 4500);
  }
}, false);
function attachLongPressTooltips(){ /* superseded by the delegated handler below */ }

// Delegated touch tooltips: press-and-hold ANY element carrying a `title`
// (relics, status chips, action badges, face chips, route nodes, path coins,
// key legend...) and the same bubble used on desktop-hover appears. Lives on
// document so it needs no re-attaching after render(). Dice tiles keep their
// own richer handler (data-idx); buttons are skipped. The bubble stays up
// briefly after release so a thumb isn't covering it, and the click that
// follows a long-press is swallowed.
(function(){
  let timer=null, startX=0, startY=0, hideT=null, swallowUntil=0;
  const target = ev=>{
    const n = ev.target && ev.target.closest ? ev.target.closest('[title]') : null;
    if(!n || n.tagName==='BUTTON' || n.closest('[data-idx]') || !n.getAttribute('title')) return null;
    return n;
  };
  document.addEventListener('pointerdown', ev=>{
    clearTimeout(hideT); clearTimeout(timer);
    hideFaceTooltip(); // any new touch dismisses a lingering bubble
    if(ev.pointerType==='mouse') return;
    const n = target(ev); if(!n) return;
    startX=ev.clientX; startY=ev.clientY;
    timer=setTimeout(()=>{
      timer=null;
      const text = n.getAttribute('title'); if(!text) return;
      swallowUntil = Date.now()+700;
      showFaceTooltip(n.getBoundingClientRect(), text);
    }, 420);
  }, true);
  document.addEventListener('pointermove', ev=>{
    if(timer && Math.hypot(ev.clientX-startX, ev.clientY-startY)>10){ clearTimeout(timer); timer=null; }
  }, true);
  ['pointerup','pointercancel'].forEach(t=> document.addEventListener(t, ()=>{
    if(timer){ clearTimeout(timer); timer=null; return; }
    if(faceTooltipEl && Date.now()<swallowUntil){ clearTimeout(hideT); hideT=setTimeout(hideFaceTooltip, 2200); }
  }, true));
  document.addEventListener('click', ev=>{
    if(Date.now()<swallowUntil){ ev.stopPropagation(); ev.preventDefault(); swallowUntil=0; return; }
    hideFaceTooltip();
  }, true);
  // No native copy/paste/image menu on long-press (inputs/textareas keep theirs).
  document.addEventListener('contextmenu', ev=>{
    const t=ev.target; if(t && t.closest && t.closest('input,textarea')) return;
    ev.preventDefault();
  });
})();

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

// ---- Ribbons: the diagonal banners that replaced plain toasts. Combat messages (damage dealt/taken,
// heals, blocks...) slash across the doorway scene, tilted toward whoever they happened to; everything
// else (equips, relics, upgrades) gets its own smaller gold ribbon higher up, so the two never share a slot.
// Both overlay the scene, so they can't change the screen height. ----
const RB_NOTICE_RE = /^(Equipped|Relic|Upgraded|Swapped|Rested|— Floor|Mandated Lunch Break|Not enough|Locked|Debug|Origin|Unlock|Debug)|joins your tray/i;
function showToast(text, kind){
  // Plain damage/heal numbers are already shown by the floating numbers + health bars; skip the redundant ribbon.
  if(/^Path dealt|hits you for|takes \d+ D\.O\.T\. damage|You take \d+ D\.O\.T\. damage|You recover \d+ from H\.O\.T\.|heals \d+\./i.test(text)) return;
  const notice = RB_NOTICE_RE.test(text) || (!kind && !/hit|damage|dealt|heal|block|nullify|leap|minion|quest|dot|hot|shield|freeze/i.test(text));
  const toPlayer = !notice && (kind==='bad' || /hits you|you for|your D\.O\.T|desperate/i.test(text)) && !/dealt/i.test(text);
  const arch = document.querySelector('#enc-panel .fo-arch');
  const campCard = !arch && document.querySelector('.camp-status-card'); // Oct 17: camp ribbons sit under the Camp title, not on it
  const base = arch || campCard || document.getElementById('app') || document.body;
  const r = base.getBoundingClientRect();
  const layerId = notice ? 'rb-layer-notice' : 'rb-layer-combat';
  let layer = document.getElementById(layerId);
  if(layer) layer.remove();
  layer = document.createElement('div');
  layer.id = layerId; layer.className = 'rb-layer';
  const h = (arch || campCard) ? r.height : Math.min(r.height, 280);
  layer.style.cssText = `left:${r.left}px;top:${Math.max(0,r.top)}px;width:${r.width}px;height:${h}px;`;
  const tone = notice ? 'gold' : (kind==='bad'||toPlayer ? 'bad' : kind==='good' ? 'good' : 'neutral');
  const dir = notice ? 'n' : (toPlayer ? 'l' : 'r');
  const iconKey = notice ? null : (/block/i.test(text)?'block':/heal/i.test(text)?'heal':/hit|damage|dealt/i.test(text)?'hit':null);
  const ic = (iconKey && typeof iconSpan==='function') ? `<span class="rb-ic">${iconSpan(iconKey)}</span>` : '';
  const label = (!notice && /hits you/i.test(text)) ? '<small>Enemy turn</small>' : '';
  const len = text.length;
  const rb = el(`<div class="rb rb-${tone} rb-${dir} ${len>34?'rb-long':''}"><div class="rb-in">${label}${ic}${text}</div></div>`);
  layer.appendChild(rb);
  document.body.appendChild(layer);
  setTimeout(()=>{ if(layer.parentNode) layer.parentNode.removeChild(layer); }, notice ? 1500 : 1300);
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
const FLOOR_TITLES = ['The Upper Halls','The Gilded Vaults','The Magic Deep'];
function showFloorCard(num, _name){
  const old = document.getElementById('floor-card');
  if(old) old.remove();
  const node = el(`<div id="floor-card"><div class="floor-card-box"><div class="floor-card-num">Floor ${num}</div><div class="floor-card-name">${FLOOR_TITLES[num-1]||''}</div></div></div>`);
  document.body.appendChild(node);
  setTimeout(()=>{ if(node.parentNode) node.parentNode.removeChild(node); }, PREFS.reducedMotion ? 1100 : 1700);
}

// Soft tick on every button press (not Go / loot cards, which have their own sounds).
document.addEventListener('pointerdown', ev=>{
  const b = ev.target && ev.target.closest && ev.target.closest('button');
  if(!b || b.disabled || b.id==='resolve-btn' || b.classList.contains('loot-chest-btn')) return;
  playTone('uiTick');
}, true);

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

/* ---- First-time symbol intros: the first time a new face (or the enemy's Minion summon) turns
   up in play, a small card names it once. Seen-state persists per device; players who already
   had the tutorial before this existed start with everything marked seen. ---- */
const SYMBOLS_SEEN_KEY = 'dungeonScrambleSymbolsSeen_v1';
const SYMBOLS_PRELEARNED = ['hit','blank','dodge','pivot','block','heal']; // obvious or covered by the tutorial
function loadSymbolsSeen(){
  try{
    const raw = localStorage.getItem(SYMBOLS_SEEN_KEY);
    if(raw) return new Set(JSON.parse(raw));
    if(hasSeenTutorial() && localStorage.getItem(TUTORIAL_SEEN_KEY)){
      const all = Object.keys(LABEL).concat(['minion']);
      localStorage.setItem(SYMBOLS_SEEN_KEY, JSON.stringify(all));
      return new Set(all);
    }
  }catch(e){}
  return new Set();
}
let SYMBOLS_SEEN = loadSymbolsSeen();
function markSymbolSeen(k){
  SYMBOLS_SEEN.add(k);
  try{ localStorage.setItem(SYMBOLS_SEEN_KEY, JSON.stringify([...SYMBOLS_SEEN])); }catch(e){}
}
// Park the 'vs' mark at the vertical midpoint between the two health bars.
// v1.39.0: a long boss move name (e.g. "Be Fruitful and Multiply!") can make the
// enemy's chip row wider than its half of the face-off. Instead of clipping,
// shift that row left so it ends at the column edge, spilling into the empty space under the hero.
function fitFoChips(){
  try{
    document.querySelectorAll('.fo-chips').forEach(c=>{
      c.style.transform = '';
      const p = c.parentElement; if(!p || !c.children.length) return;
      const dx = c.getBoundingClientRect().right - p.getBoundingClientRect().right;
      if(dx > 1) c.style.transform = `translateX(${-Math.ceil(dx)}px)`;
    });
  }catch(e){}
}
function placeVs(){
  try{
    const vs = document.querySelector('.fo-arch .fo-vs');
    const pb = document.querySelector('.fo-arch .fo-player .fo-hpwrap');
    const eb = document.querySelector('.fo-arch .fo-enemy .fo-hpwrap');
    if(!vs || !pb || !eb) return;
    const t = vs.querySelector('.fo-vs-txt'); if(!t) return;
    const a = pb.getBoundingClientRect(), b = eb.getBoundingClientRect(), v = vs.getBoundingClientRect();
    const mid = ((a.top + a.height/2) + (b.top + b.height/2)) / 2;
    t.style.top = (mid - v.top - t.offsetHeight/2) + 'px';
  }catch(e){}
}
window.addEventListener('resize', ()=> placeVs());
function maybeShowSymbolIntro(){
  try{
    if(document.getElementById('symbol-intro')) return;
    if(document.querySelector('.modal-overlay')) return;
    if(S.screen!=='game' || !S.encounter) return;
    let key = null;
    for(const c of S.tray){
      if(c.minion || c.blank) continue;
      const t = c.die.faces[c.faceIdx] && c.die.faces[c.faceIdx].type;
      if(t && !SYMBOLS_PRELEARNED.includes(t) && !SYMBOLS_SEEN.has(t)){ key = t; break; }
    }
    const e = S.encounter;
    if(!key && !SYMBOLS_SEEN.has('minion') && (e.minion>0 || (e.kit && [e.kit, e.kit.phase2].some(k=>k && k.each.concat(...k.specials.map(x=>x.acts)).some(x=>x.type==='minion'))))) key = 'minion';
    if(!key) return;
    markSymbolSeen(key);
    const isMinion = key==='minion';
    const name = isMinion ? 'Minions' : LABEL[key];
    const desc = isMinion ? ENEMY_ACTION_DESC.minion : FACE_DESC[key];
    const icon = isMinion ? '<span class="symbol-intro-minion"></span>' : iconSpan(key);
    const delay = S.newRoomFx ? 1700 : 350;
    let tries = 0;
    const showCard = ()=>{
      if(document.getElementById('symbol-intro') || S.screen!=='game') return;
      // wait out the "A new room..." banner (it holds until tapped) and any open modal
      if((document.getElementById('room-callout-scrim') || document.getElementById('room-callout') || document.querySelector('.modal-overlay')) && tries++ < 60){ setTimeout(showCard, 500); return; }
      const card = el(`<div id="symbol-intro" class="symbol-intro" role="status"><div class="symbol-intro-icon">${icon}</div><div class="symbol-intro-text"><div class="symbol-intro-kicker">New Action</div><strong>${name}</strong><span>${desc}</span></div></div>`);
      document.body.appendChild(card);
      requestAnimationFrame(()=> card.classList.add('show'));
      const kill = ()=>{ card.classList.remove('show'); setTimeout(()=>card.remove(), 250); };
      card.onclick = kill;
      setTimeout(kill, 7000);
    };
    setTimeout(showCard, delay);
  }catch(err){}
}

function showRoomCallout(fx, onDismiss){
  const old = document.getElementById('room-callout');
  if(old && old.parentNode) old.parentNode.removeChild(old);
  const oldScrim = document.getElementById('room-callout-scrim');
  if(oldScrim && oldScrim.parentNode) oldScrim.parentNode.removeChild(oldScrim);
  const isShrine = fx.type==='Shrine';
  const introCls = fx.boss ? 'intro boss' : (isShrine ? 'intro shrine' : 'intro');
  const introText = fx.boss ? 'You scramble into a hostile room...' : (isShrine ? 'You scramble into a welcoming room...' : 'You scramble into a mysterious room...');
  const nameCls = fx.boss ? 'name boss' : 'name';
  const node = el(`<div id="room-callout">
      <div class="room-callout-box">
        <div class="room-callout-line ${introCls}">${introText}</div>
        <div class="room-callout-line ${nameCls}">${fx.name}</div>
        <div class="room-callout-line sub">${fx.type}</div>
        <div class="room-callout-line hint">Tap to continue</div>
      </div>
    </div>`);
  const scrim = el(`<div id="room-callout-scrim"></div>`);
  document.body.appendChild(scrim);
  // Own slot (not the shared #fx-stack toasts/equip notices use): fixed at the vertical middle of the game UI.
  document.body.appendChild(node);
  { const a = document.getElementById('app'); const r = a ? a.getBoundingClientRect() : {top:0,height:window.innerHeight};
    const mid = Math.max(110, Math.min(window.innerHeight-110, r.top + r.height/2));
    node.style.top = mid+'px'; }
  const dismiss = ()=>{
    if(scrim.parentNode) scrim.parentNode.removeChild(scrim);
    // the 'vs' mark plays its short intro once the room banner is out of the way
    UIFX.vsAt = performance.now();
    document.querySelectorAll('.fo-vs-txt').forEach(n=>{ n.classList.remove('vs-intro'); void n.offsetWidth; n.style.animationDelay='0ms'; n.classList.add('vs-intro'); });
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
// Sound effects bus (Oct 13): every effect plays through one gain node so the Settings slider sets their volume.
let sfxBus = null;
function sfxOut(ctx){
  if(!sfxBus || sfxBus.context!==ctx){ sfxBus = ctx.createGain(); sfxBus.connect(ctx.destination); }
  sfxBus.gain.value = Math.max(0, Math.min(1, PREFS.sfxVol!=null ? PREFS.sfxVol : 1));
  return sfxBus;
}
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
// Treasure arpeggio (Oct 14): A D F A, then the Bb C# D "sob" motif, landing on a D major chord (D F# A).
// oct = 1 starts at A3, 2 an octave up. Notes 55 ms apart; the chord rings ~0.6 s.
function lootArp(oct, type, gain, extra){
  const m = oct===2 ? 2 : 1, base = [220, 293.66, 349.23, 440, 466.16, 554.37, 587.33];
  const seq = base.map((f,i)=>({freq:f*m, start:i*0.055, dur:0.14, type, gain:gain*(0.8 + i*0.04)}));
  const t = base.length*0.055;
  [587.33, 739.99, 880].forEach((f,i)=> seq.push({freq:f*m, start:t + i*0.01, dur:0.6, type, gain:gain*0.9}));
  return seq.concat(extra||[]);
}
const TONE_SEQUENCES = {
  // A sword-slash instead of a flat blip: a bright, fast downward sweep
  // (the "swish" of the blade) with sharp metallic ping layered right on
  // top of its tail (the "clang" of it landing) -- see playTone()'s
  // freqTo handling for the sweep.
  hit:       [{freq:880, freqTo:110, start:0,    dur:0.1,  type:'sawtooth', gain:0.2},
              {freq:1109,             start:0.045,dur:0.05, type:'square',   gain:0.14}],
  // Soft tick as each die joins the path (pitch climbs with path length via
  // playTone's pentatonic ladder); a brighter 3-note sparkle when the path's
  // damage badge crosses a tier; and the turn's closing 'tally' chord.
  relicProc: [{freq:1175,start:0,    dur:0.09, type:'sine',     gain:0.12},
              {freq:1568,start:0.06, dur:0.12, type:'sine',     gain:0.10}],
  fuse:      [{freq:587, start:0,    dur:0.1,  type:'triangle', gain:0.16},
              {freq:698, start:0.09, dur:0.1,  type:'triangle', gain:0.16},
              {freq:880, start:0.18, dur:0.1,  type:'triangle', gain:0.16},
              {freq:1175,start:0.27, dur:0.3,  type:'sine',     gain:0.18}],
  uiTick:    [{freq:1500,start:0,    dur:0.03, type:'sine',     gain:0.05}],
  // Class Skill (Jeremy, Oct 16): arm = a quick rising pair, disarm = the same pair falling, use = a bright upward sweep with a sparkle.
  skillArm:    [{freq:660, start:0,    dur:0.06, type:'triangle', gain:0.12},
                {freq:990, start:0.05, dur:0.09, type:'triangle', gain:0.12}],
  skillDisarm: [{freq:990, start:0,    dur:0.06, type:'triangle', gain:0.1},
                {freq:660, start:0.05, dur:0.09, type:'triangle', gain:0.1}],
  skillUse:    [{freq:520, freqTo:1560, start:0, dur:0.13, type:'sine', gain:0.14},
                {freq:2093,start:0.09, dur:0.14, type:'sine',     gain:0.07},
                {freq:1568,start:0.09, dur:0.12, type:'triangle', gain:0.05}],
  glint:     [{freq:1760,start:0,    dur:0.07, type:'sine',     gain:0.07},
              {freq:2637,start:0.05, dur:0.1,  type:'sine',     gain:0.06}],
  closeCall: [{freq:330, start:0,    dur:0.09, type:'sine',     gain:0.1},
              {freq:330, start:0.14, dur:0.12, type:'sine',     gain:0.1}],
  pathTick:  [{freq:440, start:0,    dur:0.07, type:'sine',     gain:0.11},
              {freq:880, start:0.01, dur:0.05, type:'triangle', gain:0.05}],
  tierUp:    [{freq:880, start:0,    dur:0.08, type:'triangle', gain:0.14},
              {freq:1109,start:0.07, dur:0.08, type:'triangle', gain:0.14},
              {freq:1319,start:0.14, dur:0.16, type:'triangle', gain:0.14}],
  tally:     [{freq:440, start:0,    dur:0.16, type:'triangle', gain:0.18},
              {freq:554, start:0,    dur:0.16, type:'triangle', gain:0.14},
              {freq:659, start:0,    dur:0.16, type:'triangle', gain:0.14},
              {freq:880, start:0.05, dur:0.26, type:'sine',     gain:0.16}],
  heal:      [{freq:659, start:0,    dur:0.12, type:'sine',     gain:0.14},
              {freq:880, start:0.09, dur:0.16, type:'sine',     gain:0.14}],
  defeat:    [{freq:220, start:0,    dur:0.2,  type:'sawtooth', gain:0.16},
              {freq:175, start:0.18, dur:0.34, type:'sawtooth', gain:0.16}],
  heartbeat: [{freq:80,  start:0,    dur:0.1,  type:'sine',     gain:0.24},
              {freq:70,  start:0.16, dur:0.12, type:'sine',     gain:0.2}],
  // A short rising fanfare for a Boss/Big Boss kill -- bigger than the flat
  // one-note 'hit' tone every regular kill would otherwise share, but
  // shorter than the full 4-note 'victory' sting reserved for winning the
  // whole run.
  bossKill:  [{freq:294, start:0,    dur:0.12, type:'triangle', gain:0.22},
              {freq:440, start:0.11, dur:0.12, type:'triangle', gain:0.22},
              {freq:587, start:0.22, dur:0.30, type:'triangle', gain:0.24}],
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
  roomEnter: [{freq:220, start:0,    dur:0.1,  type:'sine',     gain:0.14},
              {freq:294, start:0.09, dur:0.16, type:'sine',     gain:0.16}],
  // Loot-die shimmer cues (one per metal, played softly when the dice land): gold = bell, alloy = dry metallic tick, magic = rising shimmer
  gildedShine: [{freq:1318, start:0,    dur:0.22, type:'sine',     gain:0.07},
                {freq:1760, start:0.05, dur:0.3,  type:'sine',     gain:0.05}],
  alloyShine:  [{freq:2200, start:0,    dur:0.05, type:'square',   gain:0.03},
                {freq:1480, start:0.04, dur:0.07, type:'triangle', gain:0.05}],
  magicShine:  [{freq:392,  freqTo:880, start:0,    dur:0.4,  type:'sine', gain:0.06},
                {freq:1175, start:0.18, dur:0.3,  type:'sine', gain:0.04}],
  // Quest cue: a bright three-note flourish (rising triad plus a sparkle) so
  // bonus objectives are heard, distinct from the soft door knock.
  questStart: [{freq:440, start:0,    dur:0.12, type:'triangle', gain:0.16},
               {freq:554, start:0.09, dur:0.12, type:'triangle', gain:0.16},
               {freq:659, start:0.18, dur:0.14, type:'triangle', gain:0.17},
               {freq:1760,start:0.3,  dur:0.3,  type:'sine',     gain:0.09}],
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
  floorUp: [{freq:440, start:0,    dur:0.12, type:'triangle', gain:0.2},
            {freq:554, start:0.1,  dur:0.12, type:'triangle', gain:0.2},
            {freq:659, start:0.2,  dur:0.26, type:'triangle', gain:0.22}],
  // A soft magical chime for a Shrine actually granting its blessing --
  // gentle high sine notes, deliberately quieter/softer than any combat or
  // reward tone so a Shrine visit reads as a calm moment, not another hit.
  // v1.36.0 shrine ritual: a soft, airy entrance chime and a bright release
  // when the hold completes (the hold itself climbs the pathTick ladder).
  shrineEnter: [{freq:440, start:0,    dur:0.35, type:'sine', gain:0.08},
                {freq:659, start:0.18, dur:0.4,  type:'sine', gain:0.08},
                {freq:932, start:0.38, dur:0.6,  type:'sine', gain:0.07}],
  shrineBurst: [{freq:880, start:0,    dur:0.12, type:'triangle', gain:0.12},
                {freq:1109,start:0.06, dur:0.14, type:'sine', gain:0.12},
                {freq:1319,start:0.12, dur:0.35, type:'sine', gain:0.13}],
  blessing: [{freq:659,  start:0,    dur:0.18, type:'sine', gain:0.12},
             {freq:880,  start:0.12, dur:0.18, type:'sine', gain:0.12},
             {freq:1109, start:0.26, dur:0.3,  type:'sine', gain:0.14}],
  // A bigger, grander flourish for clearing the whole dungeon, replacing
  // the plain 'victory' sting -- plays alongside the new confetti burst as
  // the Victory screen first appears.
  grandVictory: [{freq:294, start:0,    dur:0.16, type:'triangle', gain:0.22},
                 {freq:370, start:0.14, dur:0.16, type:'triangle', gain:0.22},
                 {freq:440, start:0.28, dur:0.16, type:'triangle', gain:0.22},
                 {freq:587, start:0.42, dur:0.45, type:'triangle', gain:0.26}],
  // ---- v1.39.0 sound palette (docs/studies/2026-10-12_todo_studies.md s.4):
  // wood, metal and bells, one instrument per action family. Path steps all
  // ride the pentatonic ladder (pitchStep) so a long path keeps climbing.
  woodKnock: [{freq:220, freqTo:175, start:0, dur:0.07, type:'triangle', gain:0.2},
              {freq:420, start:0, dur:0.03, type:'square', gain:0.05}],
  bell:      [{freq:880, start:0, dur:0.5, type:'sine', gain:0.11},
              {freq:1760, start:0, dur:0.3, type:'sine', gain:0.04},
              {freq:2640, start:0.005, dur:0.18, type:'sine', gain:0.02}],
  pluck:     [{freq:220, freqTo:196, start:0, dur:0.16, type:'triangle', gain:0.16},
              {freq:440, start:0, dur:0.06, type:'sine', gain:0.05}],
  glass:     [{freq:1760, start:0, dur:0.45, type:'sine', gain:0.07},
              {freq:1780, rel:1.0115, start:0.01, dur:0.4, type:'sine', gain:0.05},
              {freq:2637, start:0.03, dur:0.3, type:'sine', gain:0.04}],
  swell:     [{freq:300, freqTo:900, start:0, dur:0.22, type:'sine', gain:0.1}],
  whistle:   [{freq:620, freqTo:1500, start:0, dur:0.14, type:'sine', gain:0.1}],
  sour:      [{freq:150, freqTo:110, start:0, dur:0.14, type:'sawtooth', gain:0.08}],
  swapFlip:  [{freq:330, start:0, dur:0.05, type:'triangle', gain:0.14},
              {freq:440, start:0.07, dur:0.06, type:'triangle', gain:0.14}],
  // Enemy turn: a low drum as it acts, then what it did.
  enemyDrum: [{freq:95, freqTo:60, start:0, dur:0.16, type:'sine', gain:0.24},
              {freq:180, freqTo:90, start:0, dur:0.05, type:'triangle', gain:0.08}],
  clank:     [{freq:620, start:0, dur:0.12, type:'square', gain:0.07},
              {freq:931, start:0.005, dur:0.1, type:'square', gain:0.05},
              {freq:1480, start:0.01, dur:0.06, type:'triangle', gain:0.05}],
  enemyBell: [{freq:440, start:0, dur:0.35, type:'sine', gain:0.09},
              {freq:660, start:0.02, dur:0.25, type:'sine', gain:0.04}],
  squeak:    [{freq:900, freqTo:1500, start:0, dur:0.06, type:'triangle', gain:0.08},
              {freq:1100, freqTo:1700, start:0.08, dur:0.06, type:'triangle', gain:0.07},
              {freq:1000, freqTo:1600, start:0.16, dur:0.06, type:'triangle', gain:0.06}],
  windup:    [{freq:65, freqTo:130, start:0, dur:0.55, type:'sawtooth', gain:0.07},
              {freq:130, freqTo:260, start:0.1, dur:0.45, type:'sine', gain:0.06}],
  restChord: [{freq:294, start:0, dur:0.6, type:'sine', gain:0.09},
              {freq:349, start:0.08, dur:0.55, type:'sine', gain:0.08},
              {freq:440, start:0.16, dur:0.5, type:'sine', gain:0.08}],
  // A bright ascending "item get" twinkle for the instant a Loot die is
  // actually picked on the loot-reveal screen (renderLootModal/
  // pickLootOption) -- a Zelda-ish sparkle, distinct from the later 'equip'
  // ka-ching that plays once the die is actually slotted into the tray.
  // Loot chest burst (music spec "Treasure": a rising arpeggio that quotes the Bb-C#-D motif, ends on a bright D major chord).
  // Each tier keeps its Oct 13 character (Jeremy): Alloy low triangle + metal clink, Gilded an octave up with a bell,
  // Magic glassy sines with a high shimmer. Built by lootArp() below.
  lootBurstAlloy:  lootArp(1, 'triangle', 0.10, [{freq:1760, start:0, dur:0.08, type:'square', gain:0.04}]),
  lootBurstGilded: lootArp(2, 'triangle', 0.09, [{freq:3520, start:0.48, dur:0.5, type:'sine', gain:0.03}, {freq:1760, start:0.48, dur:0.8, type:'sine', gain:0.05}]),
  lootBurstMagic:  lootArp(2, 'sine', 0.08, [{freq:4699, start:0.5, dur:0.6, type:'sine', gain:0.02}, {freq:3520, start:0.56, dur:0.5, type:'sine', gain:0.02}]),
  lootPick: [{freq:659,  start:0,    dur:0.1,  type:'sine',     gain:0.18},
             {freq:880,  start:0.08, dur:0.12, type:'sine',     gain:0.18},
             {freq:1109, start:0.16, dur:0.24, type:'triangle', gain:0.2}],
};
// Sound-effect key (v1.39.5): pitch classes of D harmonic minor (D E F G A Bb C#), the notes of A freygish.
const SFX_KEY_PCS = [2,4,5,7,9,10,1];
// Tones that keep their own pitch: percussion, metal, deliberate dissonance, and the victory's D-major (Picardy) ending.
const SFX_FREE_PITCH = new Set(['clank','squeak','heartbeat','enemyDrum','windup','sour','overkill','alloyShine','grandVictory']);
// The music moves up a key on Floors 2 and 3 (MUSIC_FLOORS in music.js); the sound effects follow it.
function sfxShift(){ return (typeof MUSIC_FLOORS!=='undefined' && typeof S!=='undefined' && S) ? (MUSIC_FLOORS[Math.max(0,Math.min(2,S.floorIdx||0))].shift||0) : 0; }
function sfxInScale(m){ return SFX_KEY_PCS.includes((((m - sfxShift())%12)+12)%12); }
function sfxInKey(freq, step){
  const m0 = 69 + 12*Math.log2(freq/440) + sfxShift(); // transposed into the floor's key first, then snapped
  let m = Math.round(m0);
  if(!sfxInScale(m)){ const up = m+1, dn = m-1; m = sfxInScale(up) && (!sfxInScale(dn) || up-m0 <= m0-dn) ? up : (sfxInScale(dn) ? dn : m+2); }
  for(let k=0;k<step;k++){ do{ m++; } while(!sfxInScale(m)); }
  return 440*Math.pow(2,(m-69)/12);
}
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
  // Pitch ladder on a major-pentatonic scale (semitone offsets below), so a
  // run of rising notes always sounds in tune/pleasant instead of drifting
  // chromatically. Index 0 is the base note; capped at the top of the table.
  // v1.39.5 (Jeremy): every pitched sound sits in the music's key, D harmonic minor (= A freygish, the
  // "harmonic minor phrygian" of docs/music/MUSIC_SPEC.md). Each note snaps to the scale, and a ladder step
  // climbs one scale tone, so a growing path plays the freygish scale up from A. Noisy/metal tones keep their pitch.
  const step = pitchStep ? Math.min(Math.max(0, Math.floor(pitchStep)), 14) : 0;
  const keep = SFX_FREE_PITCH.has(kind);
  let first = null;
  notes.forEach(n=>{
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type;
    let f = keep ? n.freq * Math.pow(2, (step*1.7 + (kind==='grandVictory' ? sfxShift() : 0))/12) : sfxInKey(n.freq, step);
    if(n.rel && first) f = first * n.rel; // a deliberate detune (chorus shimmer) rides on the note before it
    if(first==null) first = f;
    osc.frequency.setValueAtTime(f, now+n.start);
    // Optional downward/upward sweep (e.g. the sword-slash "swish" in
    // 'hit') -- exponentialRamp can't target 0, so freqTo is assumed >0. The sweep keeps its shape.
    if(n.freqTo) osc.frequency.exponentialRampToValueAtTime(n.freqTo*(f/n.freq), now+n.start+n.dur);
    gain.gain.setValueAtTime(0.0001, now+n.start);
    gain.gain.linearRampToValueAtTime(n.gain, now+n.start+0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now+n.start+n.dur);
    osc.connect(gain).connect(sfxOut(ctx));
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
  src.connect(filter).connect(gain).connect(sfxOut(ctx));
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
  // Landing click-clacks, timed to the tray's staggered settle (dice land
  // left-to-right), each a touch higher and crisper than the rattle.
  // v1.39.3: each landing clack takes the material of a die in the tray (wood, Alloy metal,
  // Gilded bright metal, Magic glass), so a tray full of loot sounds richer than the starting set.
  const mats = diceMaterials();
  const clacks = juiceLow() ? 3 : 6;
  for(let i=0;i<clacks;i++){
    const at = 0.26 + i*(0.34/clacks) + Math.random()*0.02;
    playMaterialClack(ctx, now+at, mats[i % mats.length], i);
  }
}
// Loot tier of each die in the tray, best first, so the most special dice are heard first.
function diceMaterials(){
  const order = {magic:0, gilded:1, alloy:2};
  const m = ((typeof S!=='undefined' && S && S.tray) ? S.tray : []).map(c=>c && c.die && order[c.die.cat]!=null ? c.die.cat : 'wood');
  const special = m.filter(x=>x!=='wood').sort((a,b)=>order[a]-order[b]);
  return special.length ? [...special.slice(0,3), 'wood', 'wood', 'wood'] : ['wood'];
}
// One die landing: wood = a short knock, alloy = a dull metal tick, gilded = a bright ring, magic = a glass chime.
function playMaterialClack(ctx, t, mat, i){
  const ping = (freq, dur, gain, type)=>{
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type||'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t+0.004); g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g).connect(sfxOut(ctx)); o.start(t); o.stop(t+dur+0.02);
  };
  const j = 1 + (Math.random()-0.5)*0.08;
  if(mat==='alloy'){ playNoiseBurst(ctx, t, 0.02, 0.12, 'highpass', 3000, 0.7); ping(1700*j, 0.12, 0.05, 'triangle'); ping(2550*j, 0.08, 0.025); }
  else if(mat==='gilded'){ playNoiseBurst(ctx, t, 0.015, 0.1, 'highpass', 4000, 0.7); ping(2350*j, 0.3, 0.05); ping(3520*j, 0.22, 0.03); ping(5900*j, 0.12, 0.015); }
  else if(mat==='magic'){ ping(1568*j, 0.4, 0.045); ping(2349*j, 0.35, 0.03); ping(3136*j, 0.3, 0.02); }
  else playNoiseBurst(ctx, t, 0.03, 0.2, 'highpass', 2400+i*350, 0.7);
}
// v1.39.3: a single Reroll is one die, not the whole tray: two quick tumbles and a landing in that die's material.
function playRerollSound(die){
  if(!PREFS.sound) return;
  const ctx = getAudioCtx();
  if(!ctx) return;
  const now = ctx.currentTime;
  playNoiseBurst(ctx, now, 0.035, 0.18, 'bandpass', 1300, 1.2);
  playNoiseBurst(ctx, now+0.07, 0.03, 0.15, 'bandpass', 1900, 1.2);
  const cat = die && die.cat;
  playMaterialClack(ctx, now+0.14, (cat==='alloy'||cat==='gilded'||cat==='magic') ? cat : 'wood', 2);
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
  osc.connect(oscGain).connect(sfxOut(ctx));
  osc.start(now);
  osc.stop(now+0.2);
}

// ---- Haptics: a short vibrate on mobile when taking damage or crossing
// into the low-health danger zone. Silently no-ops where unsupported. ----
function vibrate(pattern){
  if(PREFS.vibration===false || PREFS.reducedMotion) return;
  try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
}
// Low intensity: smaller shakes, fewer particles, no hit-stop. (Reduce Motion
// still turns movement off entirely.)
function juiceLow(){ return !!PREFS.lowIntensity; }

function applyReducedMotionClass(){
  document.body.classList.toggle('reduced-motion', !!PREFS.reducedMotion);
}

// ---- Screen shake: a brief full-viewport shake for the two biggest combat
// moments (Boss kill, Overkill), layered on top of the existing kill-callout
// banner/sound so the impact registers physically, not just visually.
// Re-triggerable back-to-back (forced reflow) since a Boss kill that's also
// an Overkill fires this once at 'big' only -- see onEncounterDefeated.
// A quick punch on the enemy card when a die lands: scale/tilt/brighten, sized by
// how hard the hit was (tier 1-3). Restarts cleanly on back-to-back hits.
function impactPulse(tier){
  if(PREFS.reducedMotion) return;
  const n = document.querySelector('#enc-panel .enc-card-col');
  if(!n) return;
  n.style.setProperty('--impact-scale', [1,1.03,1.05,1.08][tier]);
  n.style.setProperty('--impact-rot', (Math.random()<0.5?-1:1)*[0,0.6,1,1.6][tier]+'deg');
  n.style.setProperty('--impact-dur', [0.18,0.2,0.24,0.3][tier]+'s');
  n.classList.remove('enc-impact'); void n.offsetWidth; n.classList.add('enc-impact');
}

function screenShake(intensity){
  if(PREFS.reducedMotion) return;
  const wrap = document.querySelector('.wrap');
  if(!wrap) return;
  wrap.classList.remove('screen-shake-big','screen-shake-small');
  void wrap.offsetWidth; // force reflow so re-adding the class restarts the animation
  wrap.classList.add(intensity==='big' && !juiceLow() ? 'screen-shake-big' : 'screen-shake-small');
}

// ---- Transient FX registry (cosmetic only -- never saved; timestamps are performance.now()) ----
const UIFX = {ticks:[], quests:[], flareAt:-1e9, vsAt:-1e9};
function fxTick(side,type,amt){ if(amt>0) UIFX.ticks.push({side,type,amt,t:performance.now()}); }
function tickFloatersHTML(side){
  const now=performance.now(); UIFX.ticks=UIFX.ticks.filter(x=>now-x.t<1300);
  return UIFX.ticks.filter(x=>x.side===side).map((x,k)=>`<span class="tick-float tf-${x.type}" style="animation-delay:-${Math.round(now-x.t)}ms; --k:${k%3}">${iconSpan(x.type)}${x.type==='block'?`<b>${x.amt}</b>&nbsp;blocked`:`<b>${x.type==='dot'?'-':'+'}${x.amt}</b>`}</span>`).join('');
}
function fxQuest(name,i){
  UIFX.quests.push({name,i,t:performance.now()});
  setTimeout(()=>{ try{ if(!PREFS.reducedMotion) spawnParticleBurstAtEl('.fo-quests-float', ['#ffd76a','#fff5d6','#e0603a']); }catch(e){} }, 160);
}
function questStampAttrs(name,i){
  const now=performance.now(); UIFX.quests=UIFX.quests.filter(x=>now-x.t<1200);
  const q=UIFX.quests.find(x=>x.name===name&&x.i===i);
  return q ? {cls:'q-stamp', style:` style="--qd:-${Math.round(now-q.t)}ms"`} : {cls:'', style:''};
}
// Hit-stop: a brief freeze of every running animation plus a white-hot flash on the target.
function hitStop(ms){
  if(PREFS.reducedMotion || juiceLow()) return;
  document.body.classList.add('hit-stop');
  clearTimeout(hitStop._t);
  hitStop._t = setTimeout(()=>document.body.classList.remove('hit-stop'), ms);
}
// Camp upgrade: clones of the dice being combined fly into the new die's tile.
function flyDiceToFuse(cat, level, run){
  let clones=[];
  try{
    if(!PREFS.reducedMotion){
      const name = basic(cat,level).name;
      const tiles=[...document.querySelectorAll('.camp-die-tile')].filter(t=>(t.title||'').startsWith(name));
      for(let k=0;k<3&&tiles.length;k++){
        const t=tiles[k%tiles.length], r=t.getBoundingClientRect(), c=t.cloneNode(true);
        c.removeAttribute('id'); c.className+=' fuse-fly';
        c.style.cssText=`position:fixed;left:${r.left+(tiles.length<3?(k-1)*10:0)}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;z-index:9999;pointer-events:none;`;
        document.body.appendChild(c); clones.push(c);
      }
    }
  }catch(e){}
  run();
  try{
    const target=document.querySelector('.camp-die-tile.fuse-flash');
    const tr=target?target.getBoundingClientRect():{left:innerWidth/2-20,top:innerHeight/2-20,width:40,height:40};
    clones.forEach((c,k)=>{
      const r=c.getBoundingClientRect();
      const dx=(tr.left+tr.width/2)-(r.left+r.width/2), dy=(tr.top+tr.height/2)-(r.top+r.height/2);
      c.style.transition=`transform .34s cubic-bezier(.5,0,.8,.4) ${k*40}ms, opacity .34s ease-in ${k*40}ms`;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ c.style.transform=`translate(${dx}px,${dy}px) scale(.35) rotate(${(k-1)*40}deg)`; c.style.opacity='.15'; }));
      setTimeout(()=>c.remove(), 520+k*40);
    });
  }catch(e){ clones.forEach(c=>c.remove()); }
}

// Passive doorway atmosphere: warm light breathing around the two torches plus a few dust motes drifting through it.
// Delays are tied to the clock so render() rebuilding the DOM doesn't restart the loops.
function hallFxHTML(){
  const t=performance.now();
  const motes=[0,1,2,3,4,5,6,7,8,9].map(i=>{
    const dur=9000+(i*1370)%7000;
    return `<i style="left:${(i*37+11)%84+8}%;top:${(i*53)%55+30}%;--sz:${(2+(i%3)*0.8).toFixed(1)}px;--dx:${((i%2)?1:-1)*(8+(i*5)%14)}px;animation-duration:${dur}ms;animation-delay:-${Math.round(t%dur)}ms"></i>`;
  }).join('');
  const f1=3100, f2=2300;
  return `<div class="hall-fx" aria-hidden="true"><b class="hf-wall"></b><b class="hf-ledge"></b><b class="hf-glow hf-l" style="animation-delay:-${Math.round(t%f1)}ms"></b><b class="hf-glow hf-r" style="animation-delay:-${Math.round(t%f2)}ms"></b>${motes}</div>`;
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
  const n = juiceLow() ? 8 : 16;
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
  const n = juiceLow() ? 24 : 50;
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

function settingsSliderRowHTML(id, label, vol){
  const v = Math.round(vol*100);
  return `<label class="settings-toggle-row settings-slider-row" for="${id}">
      <span>${label} <b class="settings-vol" id="${id}-val">${v ? v+'%' : 'Off'}</b></span>
      <input type="range" id="${id}" min="0" max="100" step="5" value="${v}">
    </label>`;
}
function settingsSliderLabel(sl){ const b = document.getElementById(sl.id+'-val'); if(b) b.textContent = +sl.value ? sl.value+'%' : 'Off'; }
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
        ${settingsSliderRowHTML('pref-sound', 'Sound effects', PREFS.sound ? (PREFS.sfxVol!=null?PREFS.sfxVol:1) : 0)}
        ${settingsSliderRowHTML('pref-music', 'Music', PREFS.music!==false ? (PREFS.musicVol!=null?PREFS.musicVol:1) : 0)}
        ${settingsToggleRowHTML('pref-reduced-motion', 'Reduce motion', PREFS.reducedMotion)}
        ${settingsToggleRowHTML('pref-low-intensity', 'Gentler effects (smaller shakes, fewer sparks)', PREFS.lowIntensity)}
        ${settingsToggleRowHTML('pref-vibration', 'Vibration (phones)', PREFS.vibration!==false)}
        ${PLAYDATA_URL ? settingsToggleRowHTML('pref-share-data', 'Share play data automatically', shareDataPref()==='yes') : ''}
      </div>
      <p class="hint" style="text-align:left;">Keyboard shortcuts ${infoDot('Enter = Go · Backspace = Clear · 1234/qwer/asdf/zxcv tap a tray die (matches its grid position)')}</p>
      <div class="settings-btn-grid">
        ${inRun ? '<button id="settings-log-btn" class="btn-log">Log</button>' : ''}
        <button id="settings-how-to-play-btn" class="btn-howto">How to Play</button>
        <button id="settings-codex-btn" class="btn-codex" title="Bestiary, Dice, Relics, Key">Codex</button>
        <button id="settings-records-btn" class="btn-records" title="Run History, Achievements">Records</button>
        <button id="settings-export-data-btn" class="btn-export">Export Play Data</button>
        <button id="settings-close-btn">Close</button>
        ${inRun ? '<button id="settings-restart-btn" class="danger">Abandon Run</button>' : ''}
        <button id="settings-reset-progress-btn" class="danger-outline">Reset Progress</button>
      </div>
      <p class="hint" style="margin:10px 0 0;">v${GAME_VERSION}</p>
    </div></div>`);
  openModal(overlay);
  const close = ()=> closeModal(overlay);
  overlay.querySelector('#settings-x-btn').onclick = close;
  overlay.querySelector('#settings-close-btn').onclick = close;
  const logBtn = overlay.querySelector('#settings-log-btn');
  if(logBtn) logBtn.onclick = ()=>{ close(); openInfoModal('Log', logViewHTML()); };
  overlay.querySelector('#settings-how-to-play-btn').onclick = ()=>{ close(); openTutorialModal(0); };
  overlay.querySelector('#settings-codex-btn').onclick = ()=>{ close(); openCodexModal(); };
  overlay.querySelector('#settings-records-btn').onclick = ()=>{ close(); openRecordsModal(); };
  overlay.querySelector('#settings-export-data-btn').onclick = ()=>{ close(); openExportDataModal(); };
  { const sh = overlay.querySelector('#pref-share-data'); if(sh) sh.onchange = ()=> setShareData(sh.checked); }
  overlay.onclick = (ev)=>{ if(ev.target===overlay) close(); };
  // Volume sliders (Oct 13): 0 turns that channel off; the effects slider plays a test tone when you let go.
  const sfxSl = overlay.querySelector('#pref-sound'), musSl = overlay.querySelector('#pref-music');
  sfxSl.oninput = ()=>{ const v = sfxSl.value/100; setPref('sfxVol', v); setPref('sound', v>0); settingsSliderLabel(sfxSl); };
  sfxSl.onchange = ()=>{ if(PREFS.sound) playTone('hit'); };
  musSl.oninput = ()=>{ const v = musSl.value/100; const was = PREFS.music!==false; setPref('musicVol', v); setPref('music', v>0); settingsSliderLabel(musSl); if(was!==(v>0)) musicUpdate(); else musicSetVolume(); };
  overlay.querySelector('#pref-reduced-motion').onchange = (ev)=> setPref('reducedMotion', ev.target.checked);
  overlay.querySelector('#pref-low-intensity').onchange = (ev)=> setPref('lowIntensity', ev.target.checked);
  overlay.querySelector('#pref-vibration').onchange = (ev)=>{ setPref('vibration', ev.target.checked); if(ev.target.checked) vibrate(30); };
  const restartBtn = overlay.querySelector('#settings-restart-btn');
  if(restartBtn) restartBtn.onclick = ()=>{
    close();
    const confirmOverlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center;">
        <h2>Abandon Run?</h2>
        <p>Your current run (Floor ${S.floorIdx+1}, ${S.health}/${S.maxHealth} HP) will be lost.</p>
        <div class="small-btn-row" style="justify-content:center;">
          <button id="confirm-restart-cancel">Keep Playing</button>
          <button class="danger" id="confirm-restart-go">Abandon Run</button>
        </div>
      </div></div>`);
    openModal(confirmOverlay);
    confirmOverlay.querySelector('#confirm-restart-cancel').onclick = ()=> closeModal(confirmOverlay);
    confirmOverlay.querySelector('#confirm-restart-go').onclick = ()=>{ try{ teleLog('run_abandon', {hp:S.health, maxHp:S.maxHealth}); finalizeTelemetry('abandoned'); }catch(e){} clearSave(); location.reload(); }; // play data: a quit point
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
        <p>This permanently erases your lifetime stats, Achievements, Dice Compendium discoveries, and Run History. Locked Origins and Starting Boon tiers go back to locked. Sound and motion settings are kept.${inRun ? ' Your current run will also be lost.' : ''}</p>
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
function runHistoryHTML(){
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
  }).join('') : `<p class="hint">No runs recorded yet. Finish a run to see it here.</p>`;
  return `${summary}<div class="run-history-list">${rows}</div>
    ${history.length ? '<div class="small-btn-row" style="justify-content:center;"><button id="run-history-clear-btn" class="danger">Clear History</button></div>' : ''}`;
}

// Lifetime Achievements (ACHIEVEMENTS, logic.js) -- locked entries show
// greyed-out with just name+desc; unlocked entries show the date earned.
// Reachable from Settings at any time (not just post-run), same as Run
// History and the Dice Compendium.
function achievementsHTML(){
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
  return `<div class="statuses" style="justify-content:center; margin-bottom:10px;"><span class="status-chip">${unlockedCount}/${ACHIEVEMENTS.length} unlocked</span></div>
    <div class="run-history-list">${rows}</div>`;
}
// Records (Oct 13): Run History + Achievements in one tabbed window (shorter settings menu).
function openRecordsModal(tab){
  const overlay = el(`<div class="modal-overlay"><div class="modal codex-modal" style="text-align:center; max-width:400px;">
      <button class="modal-x-btn" id="records-x-btn" title="Close">✕</button>
      <h2 style="margin-top:0;">Records</h2>
      <div class="codex-tabs"><button class="codex-tab" data-tab="history">Run History</button><button class="codex-tab" data-tab="achievements">Achievements</button></div>
      <div class="codex-body" id="records-body"></div>
    </div></div>`);
  openModal(overlay);
  const body = overlay.querySelector('#records-body');
  const show = t=>{
    overlay.querySelectorAll('.codex-tab').forEach(b=>b.classList.toggle('on', b.dataset.tab===t));
    body.innerHTML = t==='achievements' ? achievementsHTML() : runHistoryHTML();
    const clr = body.querySelector('#run-history-clear-btn');
    if(clr) clr.onclick = ()=>{ clearRunHistory(); show('history'); };
  };
  overlay.querySelectorAll('.codex-tab').forEach(b=> b.onclick = ()=> show(b.dataset.tab));
  show(tab || 'history');
  const close = ()=> closeModal(overlay);
  overlay.querySelector('#records-x-btn').onclick = close;
  overlay.onclick = (ev)=>{ if(ev.target===overlay) close(); };
}

// A browsable library of every Loot Die in the game (Alloy/Gilded/Magic),
// reachable from Settings. Illustrated dice (LOOT_ART, assets.js) show
// their art; the rest just show their faces -- art coverage is being
// filled in gradually, so no placeholder-watermark spam for the ones that
// don't have it yet (unlike the encounter portraits, which are shown one
// at a time and can afford a loud PLACEHOLDER banner).
function diceCompendiumHTML(){
  const tiers = [
    {label:'Alloy', pool:ALLOY},
    {label:'Gilded', pool:GILDED},
    {label:'Magic', pool:MAGIC},
  ];
  const seen = loadSeen();
  const newDice = new Set();
  tiers.forEach(t=>t.pool.forEach(d=>{ if(DISCOVERED_DICE.has(d.name) && !seen.dice.has(d.name)) newDice.add(d.name); }));
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
              <div class="compendium-faces hint">Take this die in a run to reveal it.</div>
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
            <div class="run-history-who">${d.name}${newDice.has(d.name)?' <span class="new-tag">NEW!</span>':''}</div>
            <div class="compendium-faces">${facesHTML}</div>
            <div class="hint" style="font-size:11px; margin-top:2px;">${isBoonReady(d.name)?'Starting Boon ready':`Collected ${dieCopies(d.name)}/${BOON_COPIES_NEEDED} for a Starting Boon`}</div>
          </div>
        </div>`;
    }).join('');
    return `<div class="compendium-tier">
        <div class="camp-section-title" style="font-weight:800;">${t.label} Dice</div>
        <div class="compendium-list">${rows}</div>
      </div>`;
  }).join('');
  // Origin starting dice: always shown (every origin is visible on character select),
  // not counted in the found total (tester feedback Oct 14: couldn't find the Gnomish Mushroom Cap).
  const originRows = ORIGINS.map(o=>{
    const art = LOOT_ART[o.die];
    const thumb = art ? `<img class="compendium-thumb" src="${art}" alt="${o.die}"/>` : `<div class="compendium-thumb compendium-thumb-placeholder"></div>`;
    return `<div class="compendium-row">
        ${thumb}
        <div class="compendium-main">
          <div class="run-history-who">${o.die}</div>
          <div class="compendium-faces">${o.faces.map(f=>`<span>${iconSpan(f.type, f.value)}</span>`).join('')}</div>
          <div class="hint" style="font-size:11px; margin-top:2px;">${o.name} starting die. ${o.blurb}</div>
        </div>
      </div>`;
  }).join('');
  const originSection = `<div class="compendium-tier">
      <div class="camp-section-title" style="font-weight:800;">Origin Dice</div>
      <div class="compendium-list">${originRows}</div>
    </div>`;
  return `${originSection}<p class="hint">Loot dice: ${discoveredCount}/${totalDice} found</p>${sections}`;
}
function markDiceSeen(){ const seen = loadSeen(); DISCOVERED_DICE.forEach(n=> seen.dice.add(n)); saveSeen(seen); } // viewed -- tags clear next visit

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

// One source of truth: every cell shows FACE_DESC (the same text as the die long-press), and a tap shows it
// below the grid -- tooltips never fire on a phone.
const KEY_CELLS = [
  ['dodge','maneuver',1,1],['leap','maneuver',1,2],['pivot','maneuver',1,3],
  ['hit','attack',2,1],['combo','attack',3,1],['dot','attack',2,2],['leech','attack',3,2],
  ['boost','support',4,1],['block','support',4,2],['nullify','support',2,3],['hot','support',3,3],['heal','support',4,3],
  ['freeze','support',2,4],['fumble','support',3,4],['swap','support',4,4],['reroll','support',1,4],
];
function keyCardHTML(){
  return `
    <div class="key-card" style="margin-top:0;">
      <div class="key-grid">
        ${KEY_CELLS.map(([t,blk,c,r])=>`<div class="key-item blk-${blk}" style="grid-column:${c};grid-row:${r};" data-key="${t}" onclick="keyShow(this)"><span class="key-icon">${iconSpan(t)}</span><span class="key-label">${LABEL[t]||t}</span></div>`).join('')}
      </div>
      <div class="key-desc" id="key-desc">Tap an action to see what it does.</div>
    </div>
    ${S && S.klass ? `<p class="hint" style="margin-top:8px;">${S.klass.name} zone highlighted with dashed outline on the Tray. ${S.klass.ability}</p>` : ''}
  `;
}
function keyShow(cell){
  const t = cell.dataset.key, box = document.getElementById('key-desc'); if(!box) return;
  document.querySelectorAll('.key-item.on').forEach(n=>n.classList.remove('on')); cell.classList.add('on');
  box.innerHTML = `<b>${LABEL[t]||t}:</b> ${FACE_DESC[t]||''}`;
}

function backPocketViewHTML(){
  if(!S.backPocket.length){
    return `<p class="hint">Empty ${infoDot('Dice land here when a Loot Die replaces them in your Tray, or a Shrine upgrades one. Visit Camp to swap them into your Tray.')}</p>
      <p class="hint">No safety net right now: your next die here arms it again.</p>`;
  }
  return `<div class="camp-dice-grid">${S.backPocket.map(d=>`<div class="die dietype-${d.cat} camp-die-tile" style="cursor:default;" title="${d.name}"><span class="camp-die-label">${d.name.replace(/^Maneuver\b/,'Mvr').replace(/^Attack\b/,'Atk')}</span></div>`).join('')}</div>
    <p class="hint" style="margin-top:8px;"><b style="color:#e8746b">&#9829; Safety net ready.</b> If you fall to 0 Health, these dice are rolled until one isn't blank: it saves you at 5 Health, and <b>every</b> die here is spent. ${infoDot('Visit Camp to swap these into your Tray.')}</p>`;
}

function logViewHTML(){
  return `<div class="log" style="height:min(60vh,400px);">${S.log.slice(-150).map(l=>`<div class="${l.cls}">${l.text}</div>`).join('')}</div>`;
}

// A static (non-clickable) preview tile that looks like a real tray die --
// same dietype background, the same arced name-tag, and a representative
// face -- instead of the old plain icon-in-a-box preview, so a loot option
// actually shows what the die will look like once it's in your tray.
function lootPreviewTileHTML(opt, uniqueId, artSrc){
  const pf = pickPreviewFace(opt.faces);
  const label = artSrc ? `<img class="loot-tile-art" src="${artSrc}" alt="${opt.name}"/>` : `<div class="face-val">${iconSpan(pf.type, pf.value)}</div><div class="face-word">${LABEL[pf.type]}${(pf.value && !ICON_VALUE_SLOT.has(pf.type))?(' '+pf.value):''}</div>`;
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
  // Oct 17 design fixes (item 16): every pop-up a backdrop tap dismisses gets the same ✕ in the same corner. Added a
  // microtask later, once the caller has set overlay.onclick; the ✕ acts exactly like that backdrop tap.
  Promise.resolve().then(()=>{
    const m = overlay.querySelector('.modal');
    if(!m || m.querySelector('.modal-x-btn') || typeof overlay.onclick!=='function') return;
    const x = el('<button class="modal-x-btn" title="Close" aria-label="Close">✕</button>');
    x.onclick = ev=>{ ev.stopPropagation(); overlay.onclick({target:overlay}); };
    m.insertBefore(x, m.firstChild);
  });
  return overlay;
}
function closeModal(overlay, after){
  hideFaceTooltip();
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

// Tier accent colors for the loot-reveal screen (silver/gold/purple, keyed
// by the die's own `cat`, same id the ALLOY/GILDED/MAGIC pools are tagged
// with in data.js) -- drives the sunray burst, each card's ambient glow,
// and the Zelda-style pick fanfare below. -color is the solid accent,
// -glow its translucent form for box-shadow/background use (avoids relying
// on CSS color-mix() for browser-safety, matching how --class-color etc.
// are already passed in as plain hex/rgba strings elsewhere).
const LOOT_TIER_ACCENT = {
  alloy:  { color:'#9aa3ab', glow:'rgba(154,163,171,0.5)' },
  gilded: { color:'#d4af52', glow:'rgba(212,175,82,0.55)' },
  magic:  { color:'#8a5fb0', glow:'rgba(138,95,176,0.55)' },
};

// 8 thin comet-style streak lines whooshing outward from a point, each in
// its own static-rotation wrapper around an animated (scaleX) inner div --
// ported from the loot-reveal-animation mockup, which found this read much
// better than round sparkle dots. `delayBase` staggers one card's streaks
// a touch behind the previous card's so a multi-option reveal doesn't pop
// all 16-24 streak lines in the same instant.
function lootStreaksHTML(delayBase){
  let html = '';
  for(let i=0;i<6;i++){
    const rot = Math.round((360/6)*i);
    const delay = (delayBase + i*0.02).toFixed(3)+'s';
    html += `<div class="loot-streak-wrap" style="transform:rotate(${rot}deg);"><div class="loot-streak" style="animation-delay:${delay};"></div></div>`;
  }
  return html;
}

// 8 radiating "ray flare" lines + a beam + a chime ring -- the Zelda
// "item get" fanfare that plays over whichever card was just picked (see
// pickLootOption below), ported from the same mockup.
function lootFanfareHTML(){
  let rays = '';
  for(let i=0;i<6;i++){
    const rot = Math.round((360/6)*i);
    rays += `<div class="loot-fanfare-ray-wrap" style="transform:rotate(${rot}deg);"><div class="loot-fanfare-ray"></div></div>`;
  }
  return `<div class="loot-fanfare">
      <div class="loot-fanfare-beam"></div>
      ${rays}
      <div class="loot-fanfare-ring"></div>
    </div>`;
}

// Hand-built treasure chest for the closed-chest loot phase (renderLootModal):
// wooden body, bands + lock in the loot tier's metal color, soft tier glow.
const LOOT_CHEST_METAL = {
  alloy:  {metal:'#c9ced6', dark:'#8d94a0'},
  gilded: {metal:'#f0c64a', dark:'#b8902a'},
  magic:  {metal:'#b583f0', dark:'#7a4bc0'},
};
function lootChestSVG(tier){
  const c = LOOT_CHEST_METAL[tier] || LOOT_CHEST_METAL.alloy;
  const m=c.metal, d=c.dark, wood='#9a5b26', woodDk='#74421b', woodLt='#b97636';
  return `<svg class="loot-chest-svg" viewBox="0 0 140 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs><radialGradient id="lootChestGlow" cx="50%" cy="60%" r="55%"><stop offset="0" stop-color="${m}" stop-opacity=".55"/><stop offset="1" stop-color="${m}" stop-opacity="0"/></radialGradient><clipPath id="lootChestShape"><path d="M20 64 H120 V108 a5 5 0 0 1-5 5 H25 a5 5 0 0 1-5-5 Z"/><path d="M18 64 V50 C18 28 40 18 70 18 C100 18 122 28 122 50 V64 Z"/></clipPath></defs>
<ellipse cx="70" cy="68" rx="68" ry="58" fill="url(#lootChestGlow)"/>
<ellipse cx="70" cy="118" rx="52" ry="6" fill="#000" opacity=".35"/>
<g filter="url(#fx-paper)"><!-- Oct 16 (Jeremy): paper grain on the chest's wood and metal (not the glow) -->
<g stroke="none" clip-path="url(#lootChestShape)">
 <path d="M20 64 H120 V108 a5 5 0 0 1-5 5 H25 a5 5 0 0 1-5-5 Z" fill="${wood}"/>
 <path d="M18 64 V50 C18 28 40 18 70 18 C100 18 122 28 122 50 V64 Z" fill="${woodLt}"/>
 <path d="M38 21 V64 H54 V18 C48 18 42 19 38 21Z" fill="${m}"/>
 <path d="M102 21 V64 H86 V18 C92 18 98 19 102 21Z" fill="${m}"/>
 <path d="M38 64 V113 H54 V64Z" fill="${m}"/>
 <path d="M102 64 V113 H86 V64Z" fill="${m}"/>
 <rect x="58" y="54" width="24" height="26" rx="5" fill="${m}"/>
</g>
<g fill="none" stroke="${woodDk}" stroke-width="2.4" stroke-linecap="round" opacity=".8">
 <path d="M24 82 H34 M106 82 H116 M24 98 H34 M106 98 H116"/>
 <path d="M26 36 Q32 28 38 25 M114 36 Q108 28 102 25"/>
</g>
<g fill="#fff" opacity=".45"><rect x="42" y="26" width="3" height="30" rx="1.5"/><rect x="90" y="26" width="3" height="30" rx="1.5" opacity=".5"/><rect x="62" y="57" width="3" height="10" rx="1.5"/></g>
</g>
<!-- Oct 17 (Jeremy: "the fill is over the outline"): every outline is drawn last, outside the paper filter, at full width -->
<g fill="none" stroke="#0c0705" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
 <path d="M20 64 H120 V108 a5 5 0 0 1-5 5 H25 a5 5 0 0 1-5-5 Z"/>
 <path d="M18 64 V50 C18 28 40 18 70 18 C100 18 122 28 122 50 V64 Z"/>
 <path d="M18 64 H58 M82 64 H122"/>
 <path d="M38 25 V113 M54 21 V113 M86 21 V113 M102 25 V113"/>
 <rect x="58" y="54" width="24" height="26" rx="5"/>
 <path d="M70 66 V74" stroke-width="3.5"/>
</g>
<circle cx="70" cy="64" r="4" fill="#0c0705"/>
<g fill="${d}" stroke="#0c0705" stroke-width="1.5"><circle cx="46" cy="72" r="2.4"/><circle cx="46" cy="104" r="2.4"/><circle cx="94" cy="72" r="2.4"/><circle cx="94" cy="104" r="2.4"/></g>
</svg>`;
}

function renderLootModal(){
  const {options, lootName, overkill, fromShrine} = S.lootChoice;
  const tier = (options[0] && options[0].cat) || 'alloy';
  const accent = LOOT_TIER_ACCENT[tier] || LOOT_TIER_ACCENT.alloy;
  // Overkill's 3rd option (or a Boss's 3-option draw) gets the bigger,
  // denser burst below -- reads as "bigger haul", not just a recolor.
  const big = options.length >= 3;
  const overlay = el(`<div class="modal-overlay loot-overlay">
      <div class="modal loot-modal ${S.lootChoice.opened?'':'loot-modal-chest'} ${options.length<=2?'loot-modal-n2':''}">
      <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:4px;">
        <h2 style="margin:0; width:100%; text-align:center; padding-right:0;">${fromShrine ? (S.lootChoice.title || 'Shrine Boon') : 'Victory!'}</h2>
        ${overkill?'<span class="status-chip" style="background:var(--gold);color:#241c10;">Overkill! +1 option</span>':''}
        ${(!overkill && S.lootChoice.nearMiss)?`<span class="status-chip near-miss-chip">So close! ${S.lootChoice.nearMiss} short of Overkill</span>`:''}
      </div>
      <div id="loot-body"></div>
    </div></div>`);
  openUniqueOverlay('loot', overlay);
  const body = overlay.querySelector('#loot-body');

  // Phase 2: the dice themselves. `burst` is false when this is a re-render
  // of an already-opened chest (render() can run again while the modal is
  // up), so the shake + sunray only play on the actual opening.
  function reveal(burst){
    S.lootChoice.opened = true;
    overlay.querySelector('.modal').classList.remove('loot-modal-chest');
    if(burst){
      overlay.insertAdjacentHTML('afterbegin', `<div class="loot-sunray-burst" style="--sunray-color:${accent.color};">
          <div class="loot-sunray-wheel ${big?'loot-sunray-wheel-big':''}"></div>
        </div>`);
      // (Oct 13, Jeremy: the page shake here made the chest opening lag on phones -- the flip and burst carry it)
      if(typeof playTone==='function') playTone({alloy:'lootBurstAlloy', gilded:'lootBurstGilded', magic:'lootBurstMagic'}[tier] || 'lootBurstAlloy');
    }
    body.innerHTML = `<p class="modal-lead">Choose one ${lootName} Loot Die to add to your tray:</p><div class="loot-options" id="loot-options"></div>`;
    const container = body.querySelector('#loot-options');
    let locked = false; // guards against picking a second option once one's chosen
    options.forEach((opt,i)=>{
      const art = LOOT_ART[opt.name];
      const isNew = (S.lootChoice.fresh||[]).includes(opt.name);
      const card = el(`<div class="loot-opt loot-opt-reveal" style="--loot-tier-color:${accent.color}; --loot-tier-glow:${accent.glow}; animation-delay:${(i*0.1).toFixed(2)}s;">
          ${isNew?'<span class="new-tag new-tag-card">NEW!</span>':''}
          <div class="loot-opt-streaks">${lootStreaksHTML(0.5+i*0.12)}</div>
          ${lootPreviewTileHTML(opt, `loot-${i}`, art)}
          <div class="faces-tiles">${opt.faces.map(f=>f.type==='blank'
            ? '<div class="mini-face mf-blank"></div>'
            : `<div class="mini-face mf-${opt.cat}" title="${LABEL[f.type]}${f.value?' '+f.value:''}">${iconSpan(f.type, f.value)}<small>${LABEL[f.type]}${(f.value && !ICON_VALUE_SLOT.has(f.type))?' '+f.value:''}</small></div>`).join('')}</div>
        </div>`);
      card.onclick = ()=>{
        if(locked) return;
        locked = true;
        pickLootOption(overlay, container, card, opt);
      };
      container.appendChild(card);
    });
  }

  if(S.lootChoice.opened){ reveal(false); return; }

  // Phase 1: a closed chest to tap. Its glow is the loot's tier color, so the
  // rarity is hinted before it opens. Tapping flips it, then bursts + reveals.
  // One pip per die inside: an Overkill/Boss chest visibly holds more, and
  // the pips light one by one (rising tick) as it opens -- the build-up
  // before the reveal.
  body.innerHTML = `<button type="button" class="loot-chest-btn" aria-label="Open your loot" style="--loot-tier-color:${accent.color}; --loot-tier-glow:${accent.glow};">
      <div class="loot-chest">${lootChestSVG(tier)}</div>
      <div class="loot-tap-hint">Tap to open</div>
    </button>`;
  const chestBtn = body.querySelector('.loot-chest-btn');
  chestBtn.onclick = ()=>{
    if(chestBtn.dataset.opening) return;
    chestBtn.dataset.opening = '1';
    chestBtn.classList.add('opening');
    const reduced = typeof PREFS!=='undefined' && PREFS.reducedMotion;
    if(reduced){ reveal(true); return; }
    const n = options.length;
    for(let i=0;i<n;i++) setTimeout(()=>{ if(typeof playTone==='function') playTone('pathTick', i+1); }, 140 + i*170);
    const total = 480 + n*170;
    setTimeout(()=> reveal(true), total);
  };
}

// Fires the Zelda-style "item get" fanfare over the chosen card, fades the
// others out, then hands off to chooseLoot() (which opens the swap picker)
// once the beat's had a moment to land -- rather than closing the loot
// modal the instant a card is tapped. Ported from the loot-reveal-animation
// mockup; the brief delay here is that mockup's 'chosen' phase.
function pickLootOption(overlay, container, chosenCard, opt){
  { const m = overlay.querySelector('.modal'); if(m) m.classList.add('loot-picking'); }
  Array.from(container.children).forEach(card=>{
    if(card === chosenCard) card.classList.add('loot-chosen');
    else card.classList.add('loot-faded');
  });
  chosenCard.insertAdjacentHTML('beforeend', lootFanfareHTML());
  if(typeof playTone==='function') playTone('lootPick');
  // The 550ms beat lets the fanfare actually land before the modal closes;
  // under Reduce Motion (which skips the fanfare's animations entirely via
  // the CSS above) there's nothing to wait for, so cut it down to just
  // enough to register the pick happened.
  const delay = (typeof PREFS!=='undefined' && PREFS.reducedMotion) ? 120 : 550;
  setTimeout(()=> closeModal(overlay, ()=> chooseLoot(opt)), delay);
}

// ---- Relics UI ----
// ---- Relic gems (Jeremy, Oct 12): each relic is a cut gem. The cut and color say its family, the glyph
// etched on the table says which relic. Glyphs are 24x24 stroke drawings. No art files needed.
const RELIC_FAM = {
  offense:{c:'#c94a3a', d:'#7a241b', l:'#f28b74', pts:[[50,6],[94,86],[6,86]], cy:60, gs:1.15},
  defense:{c:'#4a7a9e', d:'#22405a', l:'#9cc6e6', pts:[[14,8],[86,8],[94,16],[94,84],[86,92],[14,92],[6,84],[6,16]]},
  path:   {c:'#4a8a5c', d:'#1f4a2b', l:'#9fd8a8', pts:[[50,4],[92,27],[92,73],[50,96],[8,73],[8,27]]},
  loot:   {c:'#d4a017', d:'#7a5a08', l:'#ffe08a', pts:null},
  origin: {c:'#8a5fb0', d:'#47296a', l:'#d4b3f2', pts:[[50,4],[80,26],[92,52],[50,96],[8,52],[20,26]]},
};
function relicFamily(r){ if(r.origin) return 'origin'; const t=(r.tags||[])[0]; return t==='tempo'?'loot':(RELIC_FAM[t]?t:'loot'); }
const RELIC_GLYPH = {
  whetstone:'<path d="M12 2.5 L15 13 L12 18 L9 13 Z"/><path d="M7 15.5 H17"/><path d="M12 18 V21.5"/>',
  iron_rations:'<circle cx="12" cy="12" r="8.5"/><path d="M12 12 V6.5"/><path d="M12 12 L15.5 14"/>',
  gambeson:'<path d="M12 3 L19.5 6 V12 C19.5 16.5 16 19.5 12 21 C8 19.5 4.5 16.5 4.5 12 V6 Z"/><path d="M8.5 12 H15.5"/>',
  lucky_coin:'<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5 L17 15.5 H7 Z"/><path d="M12 6.5 V15.5"/>',
  kettle:'<path d="M12 3 C9 7 8 9 8 11 A4 4 0 0 0 16 11 C16 9 15 7 12 3 Z"/><path d="M6 17 C6 19 7.5 20.5 9 20.5"/><path d="M18 17 C18 19 16.5 20.5 15 20.5"/>',
  banner:'<path d="M4 16.5 C4 10 7.5 6 12 6 C16.5 6 20 10 20 16.5"/><path d="M2.5 16.5 H21.5"/><path d="M12 6 V11"/>',
  flask:'<path d="M9 21 C3 21 3 11 9 11 C11 11 11.5 9 11.5 7 V4"/><path d="M14.5 4 V7 C14.5 9.5 15 11 17 11.5 C21 12.5 21 21 15 21 H9"/>',
  echo_chime:'<path d="M8 17 V5 L18 3.5 V15"/><circle cx="6" cy="17.5" r="2.4"/><circle cx="16" cy="15.5" r="2.4"/>',
  venom_vial:'<path d="M4 4 C6 15 11 19 20 19.5"/><path d="M4 20 H20"/><circle cx="4" cy="4" r="1.3"/>',
  hungry_blade:'<path d="M12 3 C8.5 8.5 6.5 11.5 6.5 14.5 A5.5 5.5 0 0 0 17.5 14.5 C17.5 11.5 15.5 8.5 12 3 Z"/><path d="M9.5 15 A2.5 2.5 0 0 0 12 17.5"/>',
  tincture:'<path d="M9 4 H15 V9 H20 V15 H15 V20 H9 V15 H4 V9 H9 Z"/>',
  barbed_buckler:'<path d="M5 19 C9 13 13 9 19 5"/><path d="M9 13.5 L7 11"/><path d="M12 10.5 L13 7.5"/><path d="M15 8 L17.5 9.5"/><path d="M7 16 L9.5 17.5"/>',
  overflow_chalice:'<rect x="6" y="10.5" width="12" height="9" rx="2"/><path d="M8.5 10.5 V8 A3.5 3.5 0 0 1 15.5 8 V10.5"/><path d="M12 14 V16"/>',
  bloodletter:'<path d="M2.5 12 C6 6.5 18 6.5 21.5 12 C18 17.5 6 17.5 2.5 12 Z"/><circle cx="12" cy="12" r="3"/>',
  spite_thorns:'<path d="M3 9 H17"/><path d="M14 6 L17 9 L14 12"/><path d="M21 15 H7"/><path d="M10 12 L7 15 L10 18"/>',
  grave_tally:'<path d="M6 5 V19"/><path d="M10 5 V19"/><path d="M14 5 V19"/><path d="M18 5 V19"/><path d="M3.5 16 L20.5 8"/>',
  dodger_cloak:'<path d="M3 8 H14 A3 3 0 1 0 11 5"/><path d="M3 12.5 H18 A3 3 0 1 1 15 15.5"/><path d="M3 17 H9"/>',
  leaper_spurs:'<path d="M12 3 V19"/><path d="M7 14 L12 19.5 L17 14"/><path d="M6.5 4 V9"/><path d="M17.5 4 V9"/>',
  pivot_compass:'<path d="M4 18 Q12 1 20 18"/><path d="M16.5 16.5 L20 18 L20.8 14.2"/><circle cx="4" cy="18.5" r="1.6"/>',
  frost_charm:'<path d="M12 3 V21"/><path d="M4.2 7.5 L19.8 16.5"/><path d="M4.2 16.5 L19.8 7.5"/><path d="M9.5 4.5 L12 7 L14.5 4.5"/><path d="M9.5 19.5 L12 17 L14.5 19.5"/>',
  warding_bell:'<circle cx="12" cy="12" r="8.5"/><path d="M5 19 L19 5"/>',
  shrine_bell:'<path d="M3 20 H9 V14 H15 V8 H21"/><path d="M15 4 L19 4 M17 2 V6"/>',
  combo_gauntlet:'<circle cx="5" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/><circle cx="12" cy="12" r="2.4"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.6"/><path d="M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5"/>',
  forgeplate:'<path d="M12 3 L19 7 V15 L12 19 L5 15 V7 Z"/><path d="M12 3 V19"/><path d="M5 7 L19 15"/><path d="M19 7 L5 15"/>',
  spore_satchel:'<path d="M3.5 12 C3.5 6.5 7.5 3.5 12 3.5 C16.5 3.5 20.5 6.5 20.5 12 Z"/><path d="M10 12 V18 C10 20 14 20 14 18 V12"/><path d="M8 20.5 C6 21 4 20 3 18.5 M16 20.5 C18 21 20 20 21 18.5"/>',
  picnic_basket:'<path d="M5 10 H16 V15 C16 18 14 20 10.5 20 C7 20 5 18 5 15 Z"/><path d="M16 11.5 C20 11.5 20 16 16 16"/><path d="M8.5 3.5 C7.5 5 9.5 6 8.5 7.5"/><path d="M12.5 3.5 C11.5 5 13.5 6 12.5 7.5"/>',
  glimmer_dust:'<path d="M12 2.5 L13.8 10.2 L21.5 12 L13.8 13.8 L12 21.5 L10.2 13.8 L2.5 12 L10.2 10.2 Z"/>',
};
function relicGemSVG(r){
  const fam = relicFamily(r), F = RELIC_FAM[fam], cx = 50, cy = F.cy||50, gs = F.gs||1.45;
  let outer, table, facets = '';
  if(F.pts){
    outer = `<polygon points="${F.pts.map(p=>p.join(',')).join(' ')}" fill="url(#rg-${fam})" stroke="#0c0705" stroke-width="9" stroke-linejoin="round"/>`;
    const tb = F.pts.map(([x,y])=>[cx+(x-cx)*0.52, cy+(y-cy)*0.52]);
    table = `<polygon points="${tb.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="${F.c}" stroke="${F.d}" stroke-width="2"/>`;
    facets = F.pts.map((p,i)=>`<line x1="${p[0]}" y1="${p[1]}" x2="${tb[i][0].toFixed(1)}" y2="${tb[i][1].toFixed(1)}" stroke="${F.d}" stroke-width="2"/>`).join('');
  } else {
    outer = `<circle cx="50" cy="50" r="45" fill="url(#rg-${fam})" stroke="#0c0705" stroke-width="9"/>`;
    const tb = []; for(let i=0;i<8;i++){ const a=i/8*Math.PI*2+Math.PI/8; tb.push([50+24*Math.cos(a),50+24*Math.sin(a)]); facets+=`<line x1="${tb[i][0].toFixed(1)}" y1="${tb[i][1].toFixed(1)}" x2="${(50+42*Math.cos(a)).toFixed(1)}" y2="${(50+42*Math.sin(a)).toFixed(1)}" stroke="${F.d}" stroke-width="2"/>`; }
    table = `<polygon points="${tb.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="${F.c}" stroke="${F.d}" stroke-width="2"/>`;
  }
  return `<svg viewBox="-6 -6 112 112" aria-hidden="true"><defs><radialGradient id="rg-${fam}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${F.l}"/><stop offset=".55" stop-color="${F.c}"/><stop offset="1" stop-color="${F.d}"/></radialGradient></defs>${outer}${facets}${table}<g transform="translate(${cx-12*gs} ${cy-12*gs}) scale(${gs})" fill="none" stroke="#fff1d6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${RELIC_GLYPH[r.id]||''}</g>${relicShine(F)}</svg>`;
}
// Oct 16 (Jeremy: on the triangle relics the shine floated off to the left): the shine follows each gem's own upper-left edge
function relicShine(F){
  let a = [24,26], b = [36,18];
  if(F.pts){
    const P = F.pts, n = P.length, cx = P.reduce((t,p)=>t+p[0],0)/n, cy = P.reduce((t,p)=>t+p[1],0)/n;
    let best = 0, bv = Infinity;
    for(let i=0;i<n;i++){ const p = P[i], q = P[(i+1)%n], v = (p[0]+q[0])/2 + (p[1]+q[1])/2; if(v < bv){ bv = v; best = i; } }
    const p = P[best], q = P[(best+1)%n], at = t=>[p[0]+(q[0]-p[0])*t, p[1]+(q[1]-p[1])*t];
    const inset = pt=>{ const dx = cx-pt[0], dy = cy-pt[1], L = Math.hypot(dx,dy)||1; return [pt[0]+dx/L*11, pt[1]+dy/L*11]; };
    a = inset(at(.3)); b = inset(at(.55));
  }
  return `<path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>`;
}
function relicBadgeHTML(r, extraCls){
  return `<span data-relic="${r.id}" class="relic-badge relic-gem gem-${relicFamily(r)} ${extraCls||''}" title="${r.name}: ${r.desc}">${relicGemSVG(r)}</span>`;
}

// A compact row of the relics held this run (game board + Camp); tap for details.
// Status chips shown over the doorway are icon + number only (full wording lives in the tooltip).
function hudChips(h){
  // icon + the amount as plain text (the in-icon overlay number is too small to read at chip size); Oct 14: the icon
  // turns solid (no hole) since the number now sits beside it
  return (h||'')
    .replace(/<span class="icon-svg">(<svg[\s\S]*?<\/svg>)<span class="icon-value-overlay">[^<]*<\/span><\/span>/g, (m, svg)=>{ const t = Object.keys(ICON_SVG).find(k=>ICON_SVG[k]===svg); return t ? iconSpanSolid(t) : m; })
    .replace(/(<span class="status-chip[^>]*title="[^"]*? (\d+(?:\.\d+)?):[^"]*"[^>]*>)([\s\S]*?) (?:DOT|HOT|Block|Shield)<\/span>/g, '$1$3<b class="chip-n">$2</b></span>')
    .replace(/ Boost x(\d+) armed<\/span>/g, '<b class="chip-n">x$1</b></span>')
    .replace(/Minions (\d+)<\/span>/g, 'Min <b class="chip-n">$1</b></span>');
}
function relicStripHTML(){
  if(!S.relics || !S.relics.length) return '';
  return `<div class="relic-strip" title="Tap to see your relics">${S.relics.map(id=>relicBadgeHTML(relicById(id))).join('')}</div>`;
}
function attachRelicStrip(){
  document.querySelectorAll('.relic-strip').forEach(n=>{ n.onclick = openRunRelicsModal; });
  // The fight's gem column stops above the HP bar; extra gems wrap into a second column.
  const col = document.querySelector('.fo-player > .relic-strip'), hp = col && col.parentNode.querySelector('.fo-hpwrap');
  if(col && hp){ const h = hp.getBoundingClientRect().top - col.getBoundingClientRect().top - 4; if(h > 40) col.style.setProperty('--relic-col-h', h+'px'); }
  consumeRelicPulses();
}

// A relic just did something: its badge pops and a short label floats up (queued by
// fireRelic(), logic.js). Skipped quietly if the badge isn't on screen.
function consumeRelicPulses(){
  const q = S && S._relicQ;
  if(!q || !q.length) return;
  S._relicQ = [];
  if(PREFS.reducedMotion) return;
  let played = false;
  q.forEach((r,i)=>{
    if(r.die!=null){ // a class passive (Dungeoneer's wrap bonus): the label floats up off the die it boosted
      setTimeout(()=>{
        const d = document.querySelector(`#tray [data-idx="${r.die}"], [data-idx="${r.die}"]`); if(!d) return;
        const rc = d.getBoundingClientRect(), fx = document.createElement('div');
        fx.className = 'relic-fx class-fx'; fx.style.left = (rc.left+rc.width/2)+'px'; fx.style.top = (rc.top+rc.height*0.55)+'px'; /* below the die's corner badge */
        fx.innerHTML = `<span class="relic-float">${r.text}</span>`;
        document.body.appendChild(fx); setTimeout(()=>fx.remove(), 950);
      }, i*120);
      return;
    }
    if(!document.querySelector(`.relic-strip [data-relic="${r.id}"]`)) return;
    setTimeout(()=>{
      // Effects live in a body-level fixed layer, not inside the badge: the board
      // re-renders every beat of a turn and would wipe anything attached to it.
      const b = document.querySelector(`.relic-strip [data-relic="${r.id}"]`);
      if(!b) return;
      const rc = b.getBoundingClientRect();
      const fx = document.createElement('div');
      fx.className = 'relic-fx';
      fx.style.left = (rc.left+rc.width/2)+'px'; fx.style.top = (rc.top+rc.height/2)+'px';
      fx.innerHTML = `<span class="relic-ring"></span><span class="relic-float">${r.text}</span>`;
      // The gem itself joins in (Jeremy, Oct 16): a copy pops out over the real one -- swells, wobbles,
      // brightens -- and settles back onto it, so you can see which relic took part.
      const gem = b.cloneNode(true);
      gem.removeAttribute('data-relic'); gem.removeAttribute('title');
      gem.classList.add('relic-gem-pop');
      gem.style.width = rc.width+'px'; gem.style.height = rc.height+'px';
      gem.style.left = (-rc.width/2)+'px'; gem.style.top = (-rc.height/2)+'px';
      fx.insertBefore(gem, fx.firstChild.nextSibling);
      document.body.appendChild(fx);
      setTimeout(()=>fx.remove(), 950);
    }, i*120);
    if(!played){ played = true; if(typeof playTone==='function') playTone('relicProc'); }
  });
}

function relicRowHTML(r, locked, isNew){
  if(locked) return `<div class="relic-row relic-row-locked"><span class="relic-badge relic-locked">?</span><div><div class="relic-name">???</div><div class="hint" style="margin:0;">${r.origin?`Win a run as a ${ORIGINS.find(o=>o.id===r.origin).name} to earn this.`:'Not found yet. Look for Relic Shrines.'}</div></div></div>`;
  return `<div class="relic-row">${relicBadgeHTML(r)}<div><div class="relic-name">${r.name}${isNew?' <span class="new-tag">NEW!</span>':''}${r.origin?` <span class="relic-origin-tag">${ORIGINS.find(o=>o.id===r.origin).name} relic</span>`:''}</div><div class="relic-desc">${r.desc}</div></div></div>`;
}

function openRunRelicsModal(){
  const rows = (S.relics||[]).map(id=>relicRowHTML(relicById(id), false)).join('');
  openInfoModal('Your Relics', rows || '<p class="hint">No relics yet. Relic Shrines offer a choice of three.</p>');
}

function relicCodexHTML(){
  const found = new Set(META.relicsFound||[]);
  const owned = (typeof S!=='undefined' && S && S.relics) ? S.relics : [];
  const isFound = r => found.has(r.id) || owned.includes(r.id) || (r.origin && (META.lifetime.victoriesByOrigin[r.origin]||0)>=1);
  const seenR = loadSeen();
  const section = (title, list)=>`<h3 class="camp-section-title" style="margin:10px 0 4px;">${title}</h3>${list.map(r=>relicRowHTML(r, !isFound(r), isFound(r) && !seenR.relics.has(r.id))).join('')}`;
  return `<p class="hint" style="text-align:left;">Relics ${infoDot('Permanent perks for a single run. Find them at Relic Shrines. Win a run with an Origin and it will start every later run with its own signature relic.')}</p>`
    + section('Origin Relics', RELICS.filter(r=>r.origin))
    + section('Shrine Relics', RELICS.filter(r=>!r.origin));
}
function markRelicsSeen(){
  const found = new Set(META.relicsFound||[]);
  const owned = (typeof S!=='undefined' && S && S.relics) ? S.relics : [];
  const seenR = loadSeen();
  RELICS.forEach(r=>{ if(found.has(r.id) || owned.includes(r.id) || (r.origin && (META.lifetime.victoriesByOrigin[r.origin]||0)>=1)) seenR.relics.add(r.id); }); saveSeen(seenR);
}

// ---- Codex (Oct 13): one book with tabs, so the settings menu stays short. Bestiary is new: every
// monster, trap and boss you've met (META.bestiary, logic.js); unmet ones show as a silhouette.
const CODEX_TABS = [['bestiary','Bestiary'],['dice','Dice'],['relics','Relics'],['key','Key']];
function bestiaryEntries(){
  const out = [];
  FLOORS.forEach((f,fi)=>{
    [...f.enemies, ...f.traps].filter(e=>!e.dreadOnly || (META.bestiary||{})[e.name]).forEach(e=>out.push({e, floor:fi+1}));
    (fi===2 ? BIG_BOSSES : f.bosses).forEach(e=>out.push({e, floor:fi+1}));
  });
  return out;
}
const TIER_ORDER = {easy:0, standard:1, elite:2, deadly:3};
// A monster's quests in the Bestiary (Oct 17), in the same words and reward icons as its quest paper in the fight.
function bestiaryQuestsHTML(e){
  if(!e.quests || !e.quests.length) return '';
  const oneTurn = e.quests.some(q=>!QUEST_ALL_FIGHT.test(parseQuestSpec(q).cond));
  return `<div class="bst-quests"><div class="bst-quests-head">Quests${oneTurn ? ' <span>in one turn</span>' : ''}</div>${e.quests.map(q=>`<div class="bst-quest q-row" title="${q.replace(/"/g,'&quot;')}">${questRowHTML(q, false)}</div>`).join('')}</div>`;
}
function bestiaryHTML(){
  const B = META.bestiary || {};
  const all = bestiaryEntries();
  const metN = all.filter(x=>B[x.e.name]).length;
  const row = ({e, floor})=>{
    const b = B[e.name]; const art = ART_WRONG.has(e.name) ? null : MONSTER_ART[e.name];
    const boss = /Boss/.test(e.type);
    const tier = boss ? e.type : ({easy:'Easy',standard:'Standard',elite:'Elite',deadly:'Deadly'})[encounterTier(e)] + (e.type==='Trap'?' Trap':'');
    const img = art ? `<img class="bst-art${b?'':' bst-unknown'}" src="${art}" alt="" loading="lazy"/>` : `<div class="bst-art bst-noart">?</div>`;
    if(!b) return `<div class="bst-row locked">${img}<div class="bst-main"><div class="run-history-who">???</div><div class="hint bst-sub">${tier}</div></div></div>`;
    const hp = Math.round((e.health||0) * (BASE_HP_MUL[floor-1]||1));
    let moves = '';
    if(boss && BOSS_KITS[e.name]){
      const k = BOSS_KITS[e.name];
      moves = `<div class="bst-moves">${k.specials.map(x=>x.name).join(' &middot; ')}${k.phase2?` <span class="hint">| ${k.phase2.name}: ${k.phase2.specials.map(x=>x.name).join(' &middot; ')}</span>`:''}</div>`;
    } else {
      const acts = [['dmg','hit'],['minion','minion'],['shield','block'],['heal','heal'],['hot','hot'],['dot','dot']].filter(([k])=>e[k]>0).map(([k,ic])=>`<span>${iconSpan(ic, e[k])}</span>`).join('');
      moves = `<div class="bst-moves compendium-faces">${acts}</div>`;
    }
    return `<div class="bst-row">${img}<div class="bst-main">
        <div class="run-history-who">${e.name}</div>
        <div class="hint bst-sub">${tier} &middot; ${hp} HP</div>
        ${moves}
        ${bestiaryQuestsHTML(e)}
        ${e.flavor ? `<div class="bst-flavor">${e.flavor}</div>` : ''}
        <div class="bst-tally">Beaten ${b.won||0}${b.lost ? ` &middot; <span class="bst-lost">Beat you ${b.lost}</span>` : ''}</div>
      </div></div>`;
  };
  const sections = [1,2,3].map(fl=>{
    const list = all.filter(x=>x.floor===fl).sort((a,b)=>(/Boss/.test(a.e.type)-/Boss/.test(b.e.type)) || ((TIER_ORDER[encounterTier(a.e)]||0)-(TIER_ORDER[encounterTier(b.e)]||0)));
    return `<div class="camp-section-title" style="font-weight:800; margin:10px 0 4px;">Floor ${fl}</div>${list.map(row).join('')}`;
  }).join('');
  return `<p class="hint">${metN}/${all.length} met</p>${sections}`;
}
function openCodexModal(tab){
  tab = tab || 'bestiary';
  const overlay = el(`<div class="modal-overlay"><div class="modal codex-modal" style="text-align:center; max-width:420px;">
      <button class="modal-x-btn" id="codex-x-btn" title="Close">✕</button>
      <h2 style="margin-top:0;">Codex</h2>
      <div class="codex-tabs">${CODEX_TABS.map(([id,l])=>`<button class="codex-tab" data-tab="${id}">${l}</button>`).join('')}</div>
      <div class="codex-body" id="codex-body"></div>
    </div></div>`);
  openModal(overlay);
  const body = overlay.querySelector('#codex-body');
  const show = t=>{
    overlay.querySelectorAll('.codex-tab').forEach(b=>b.classList.toggle('on', b.dataset.tab===t));
    body.innerHTML = t==='dice' ? diceCompendiumHTML() : t==='relics' ? relicCodexHTML() : t==='key' ? keyCardHTML() : bestiaryHTML();
    body.scrollTop = 0;
    if(t==='dice') markDiceSeen(); if(t==='relics') markRelicsSeen();
  };
  overlay.querySelectorAll('.codex-tab').forEach(b=> b.onclick = ()=> show(b.dataset.tab));
  show(tab);
  const close = ()=> closeModal(overlay);
  overlay.querySelector('#codex-x-btn').onclick = close;
  overlay.onclick = (ev)=>{ if(ev.target===overlay) close(); };
}

// Relic Shrine: pick 1 of 3 (S.relicChoice, see runShrineEffect 'relicChoice').
function renderRelicChoiceModal(){
  const {name, options} = S.relicChoice;
  const overlay = el(`<div class="modal-overlay"><div class="modal" style="max-width:360px;">
      <h2 style="text-align:center;">${name}</h2>
      <p style="text-align:center;">${(S.relicChoice.left||1)>1?`Choose ${S.relicChoice.left} Relics, one at a time.`:'Choose a Relic.'} It lasts for the rest of your run.</p>
      <div class="relic-choice-list" id="relic-choice-list"></div>
    </div></div>`);
  openUniqueOverlay('relic-choice', overlay);
  const list = overlay.querySelector('#relic-choice-list');
  options.forEach(id=>{
    const r = relicById(id);
    const card = el(`<div class="relic-choice-card">${relicBadgeHTML(r, 'relic-badge-lg')}<div><div class="relic-name">${r.name}</div><div class="relic-desc">${r.desc}</div></div></div>`);
    card.onclick = ()=>{
      if(overlay.dataset.picked) return;
      overlay.dataset.picked = '1';
      if(typeof playTone==='function') playTone('lootPick');
      closeModal(overlay, ()=> chooseRelic(id));
    };
    list.appendChild(card);
  });
}

// Each shrine option its own colour, matching what it gives (Oct 17 design fixes, item 10).
function shrineOptClass(label){
  const l = String(label||'');
  if(/^Heal/i.test(l)) return 'so-heal';
  if(/Max Health/i.test(l) && !/^Pay/i.test(l)) return 'so-maxhp';
  if(/Relic/i.test(l)) return 'so-relic';
  if(/Attack/i.test(l)) return 'so-attack';
  if(/Maneuver/i.test(l)) return 'so-maneuver';
  if(/Forge|die/i.test(l)) return 'so-forge';
  if(/Walk away/i.test(l)) return 'so-leave';
  return '';
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
    const card = el(`<div class="loot-opt shrine-opt ${shrineOptClass(opt.label)}"><h4>${opt.label}</h4></div>`);
    card.onclick = ()=> closeModal(overlay, ()=> chooseShrineOption(opt));
    container.appendChild(card);
  });
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
function diceFacesRowHTML(die, other){
  const incoming = other; // the die being compared against
  const cat = die.cat || 'loot';
  // When `incoming` is given, each face whose type also exists on the incoming die gets a corner arrow:
  // green up = the swap would raise that value, red down = it would lower it.
  const best = {};
  if(incoming) incoming.faces.forEach(f=>{ if(f.type!=='blank') best[f.type] = Math.max(best[f.type]||0, f.value||0); });
  const arrow = f=>{
    if(!incoming || f.type==='blank' || !(f.type in best) || !f.value) return '';
    if(best[f.type] < f.value) return '<span class="face-delta up" title="This face is stronger than your current die\'s">\u25B2</span>';
    if(best[f.type] > f.value) return '<span class="face-delta down" title="This face is weaker than your current die\'s">\u25BC</span>';
    return '';
  };
  return `<div class="faces-tiles">${die.faces.map(f=>f.type==='blank'
    ? '<div class="mini-face mf-blank"></div>'
    : `<div class="mini-face mf-${cat}" title="${LABEL[f.type]}${f.value?' '+f.value:''}">${iconSpan(f.type, f.value, true)}<small>${LABEL[f.type]}${(f.value && !ICON_VALUE_SLOT.has(f.type))?' '+f.value:''}</small>${arrow(f)}</div>`).join('')}</div>`;
}
// Loot "replace which die?" suggestion (Oct 13, Jeremy picked mockup A): the tray die with the lowest face worth
// (same weights as the balance bot's loot scoring) gets a Suggested ribbon and is pre-compared -- but only if the
// player hasn't tapped any die after SWAP_SUGGEST_DELAY_MS (Jeremy: show it only to someone who's stuck).
// Replace still needs a tap, and any other die can be picked.
const SWAP_SUGGEST_DELAY_MS = 10000; // Oct 16 (Jeremy): was 6 s
const DIE_FACE_WORTH = {hit:1, combo:1.5, dot:1.25, leech:2.1, heal:1.0, hot:1.1, block:1.0, shield:1.0, dodge:0.5, leap:0.6, pivot:0.6, fumble:-1.2, blank:0, freeze:3.2, nullify:1.6, swap:1.4, reroll:1.4};
function dieWorth(d){
  return d.faces.reduce((a,f)=>{ const w = DIE_FACE_WORTH[f.type]; if(f.type==='boost') return a + Math.max(0,(f.value||2)-1)*1.7;
    if(f.type==='freeze'||f.type==='nullify'||f.type==='swap'||f.type==='reroll') return a + w; return a + (w!=null?w:0.3)*(f.value||1); }, 0) / (d.faces.length||1);
}
function renderSwapModal(){
  const incoming = S.pendingLootDie;
  const overlay = el(`<div class="modal-overlay modal-bottom"><div class="modal">
      <h2>Equip ${incoming.name} ${infoDot('Tap the die you want to replace. It goes to your Back Pocket. Or keep the new die in your Back Pocket and leave your Tray as it is.')}</h2>
      <div class="swap-compare" id="swap-compare">
        <div class="swap-compare-row swap-compare-in"><div class="swap-compare-label"><span>New</span> <b>${incoming.name}</b></div>${diceFacesRowHTML(incoming)}</div>
        <div class="swap-compare-row swap-compare-out" id="swap-compare-out"><div class="swap-compare-hint">Select a die below to compare its faces.</div></div>
      </div>
      <div class="swap-list" id="swap-list"></div>
      <div class="small-btn-row" style="justify-content:center;"><button class="pocket-btn" id="swap-pocket" title="Keep the new die in your Back Pocket; your Tray stays as it is">Keep in Pocket</button><button class="primary" id="swap-go" disabled>Replace</button></div>
    </div></div>`);
  overlay.querySelector('.modal').classList.add('swap-modal');
  openUniqueOverlay('swap', overlay);
  const list = overlay.querySelector('#swap-list');
  // Group tray slots by die name -- identical dice show as one entry with a
  // count; which specific slot gets replaced doesn't matter when they're the same die.
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
  let chosen = null;
  const goBtn = overlay.querySelector('#swap-go');
  let suggestIdx = 0;
  groups.forEach((g,i)=>{ const a = S.tray[g.indices[0]].die, b = S.tray[groups[suggestIdx].indices[0]].die;
    if(dieWorth(a) < dieWorth(b) - 1e-9 || (Math.abs(dieWorth(a)-dieWorth(b))<1e-9 && (a.level||1) < (b.level||1))) suggestIdx = i; });
  let suggestItem = null;
  groups.forEach((g,gi)=>{
    const die = S.tray[g.indices[0]].die;
    const countBadge = g.indices.length>1 ? `<span class="swap-count-badge">${g.indices.length}</span>` : '';
    const item = el(`<div class="swap-item">${lootPreviewTileHTML(die, 'swap-'+g.indices[0])}${countBadge}<div class="swap-item-label">${die.name}</div></div>`);
    if(gi===suggestIdx) suggestItem = item;
    item.onclick = () => {
      chosen = g;
      list.querySelectorAll('.swap-item').forEach(n=>n.classList.remove('selected'));
      item.classList.add('selected');
      overlay.querySelector('#swap-compare-out').innerHTML = `<div class="swap-compare-label"><span>Replacing</span> <b>${die.name}</b></div>${diceFacesRowHTML(die)}`;
      overlay.querySelector('.swap-compare-in').innerHTML = `<div class="swap-compare-label"><span>New</span> <b>${incoming.name}</b></div>${diceFacesRowHTML(incoming, die)}`;
      goBtn.disabled = false;
    };
    list.appendChild(item);
  });
  if(suggestItem) setTimeout(()=>{
    if(chosen || !overlay.isConnected) return; // the player already picked something, or the picker closed
    suggestItem.classList.add('swap-suggest'); suggestItem.title = 'Suggested: your weakest die by face value';
    suggestItem.insertAdjacentHTML('afterbegin', '<span class="swap-suggest-ribbon">Suggested</span>');
    suggestItem.onclick(); // pre-compare it
  }, SWAP_SUGGEST_DELAY_MS);
  overlay.querySelector('#swap-pocket').onclick = () => closeModal(overlay, ()=> pocketLootDie());
  goBtn.onclick = () => {
    if(!chosen) return;
    const die = S.tray[chosen.indices[0]].die;
    const isBasic = die.cat==='attack' || die.cat==='maneuver';
    // The comparison above already shows exactly what is being traded, so the Replace button is the confirmation.
    closeModal(overlay, ()=> swapInLootDie(chosen.indices[0]));
  };
}

// ---- Shrine ritual (v1.36.0) ----
// Press and hold the shrine (its figure or the button) for SHRINE_HOLD_MS: the
// art lifts and glows, the pathTick ladder climbs, and on completion the
// shrine bursts and grants its boon. Letting go early cancels.
const SHRINE_HOLD_MS = 700; // the ring around the round Hold button fills over this long (styles.css .shrine-orb)
// The shrine's hold / Continue button floats over the bottom of the shrine scene, just above the tray, like the
// room callout: it no longer takes a row of its own, so the dice stay where they are (Jeremy, Oct 12).
function placeShrineFloat(){
  // Oct 16 (Jeremy): the shrine's round Hold / Continue button sits in the dead centre of the screen
  const f = document.getElementById('shrine-float');
  if(!f) return;
  const vw = document.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight;
  f.style.left = (vw/2) + 'px';
  f.style.top = Math.max(8, vh/2 - f.offsetHeight/2) + 'px';
}
window.addEventListener('resize', ()=>{ if(typeof placeShrineFloat==='function') placeShrineFloat(); });
function attachShrineHold(){
  const btn = document.getElementById('shrine-hold-btn');
  if(!btn) return;
  const fig = document.querySelector('.fo-shrine .fo-enemy .fo-fig');
  let timers = [], done = false;
  const cancel = ()=>{ if(done) return; timers.forEach(clearTimeout); timers = []; btn.classList.remove('charging'); if(fig) fig.classList.remove('shrine-charging'); };
  const start = (ev)=>{
    if(done || timers.length) return;
    if(ev && ev.cancelable) ev.preventDefault();
    btn.classList.add('charging'); if(fig) fig.classList.add('shrine-charging');
    [0,1,2].forEach(k=> timers.push(setTimeout(()=>{ if(typeof playTone==='function') playTone('pathTick', k*2); if(typeof vibrate==='function') vibrate(8+k*8); }, k*SHRINE_HOLD_MS/3)));
    timers.push(setTimeout(()=>{
      done = true;
      if(fig){ fig.classList.remove('shrine-charging'); fig.classList.add('shrine-burst'); }
      if(typeof playTone==='function') playTone('shrineBurst');
      if(typeof vibrate==='function') vibrate([20,30,40]);
      spawnParticleBurstAtEl('.fo-shrine .fo-enemy .fo-fig', ['#ffe9a8','#8fd0ff','#fff5d6','#d4af64']);
      setTimeout(()=> applyShrineBoon(S.encounter), PREFS.reducedMotion ? 0 : 280);
    }, SHRINE_HOLD_MS));
  };
  [btn, fig].forEach(n=>{
    if(!n) return;
    n.addEventListener('pointerdown', start);
    ['pointerup','pointerleave','pointercancel'].forEach(t=> n.addEventListener(t, cancel));
  });
  btn.addEventListener('keydown', ev=>{ if(ev.key==='Enter' || ev.key===' ') start(ev); });
  btn.addEventListener('keyup', cancel);
  btn.addEventListener('contextmenu', ev=> ev.preventDefault());
}

// The reward lands where it lives: a relic flies into the relic strip, health
// stretches the HP bar with a big number, an upgraded die flips on the tray,
// tokens drop onto the Item button. One-shot per grant (S.shrineFx).
function playShrineFx(){
  const fx = S.shrineFx;
  if(!fx || fx._played) return;
  fx._played = true;
  const floatAt = (node, text, cls)=>{
    if(!node) return;
    const r = node.getBoundingClientRect();
    const f = el(`<div class="shrine-float ${cls||''}">${text}</div>`);
    f.style.left = (r.left + r.width/2) + 'px'; f.style.top = (r.top - 6) + 'px';
    document.body.appendChild(f); setTimeout(()=> f.remove(), 1500);
  };
  if(fx.kind==='relic'){
    const target = document.querySelector(`.fo-shrine .relic-strip [data-relic="${fx.id}"]`);
    const src = document.querySelector('.fo-shrine .fo-enemy .fo-fig');
    const r = relicById(fx.id);
    if(target && src && r && !PREFS.reducedMotion){
      const a = src.getBoundingClientRect(), b = target.getBoundingClientRect();
      const ghost = el(`<div class="relic-flyer">${relicBadgeHTML(r,'relic-badge-lg')}</div>`);
      ghost.style.left = (a.left + a.width/2) + 'px'; ghost.style.top = (a.top + a.height/2) + 'px';
      document.body.appendChild(ghost);
      target.style.visibility = 'hidden';
      requestAnimationFrame(()=> requestAnimationFrame(()=>{ ghost.style.transform = `translate(${b.left + b.width/2 - (a.left + a.width/2)}px, ${b.top + b.height/2 - (a.top + a.height/2)}px) translate(-50%,-50%) scale(.55)`; }));
      setTimeout(()=>{ ghost.remove(); target.style.visibility = ''; target.classList.add('relic-arrive'); if(typeof playTone==='function') playTone('lootPick'); }, 720);
    } else if(target){ target.classList.add('relic-arrive'); }
  } else if(fx.kind==='hp' || fx.kind==='heal'){
    const bar = document.querySelector('.fo-shrine .fo-player .bar');
    if(bar){ bar.classList.add('flash-heal'); if(fx.kind==='hp') bar.classList.add('hp-stretch'); }
    floatAt(bar, fx.text, 'heal');
  } else if(fx.kind==='die'){
    const cell = document.querySelectorAll('#tray .die')[fx.idx];
    if(cell){ cell.classList.add('shaking','glint-strong','shrine-die-up'); floatAt(cell, 'Lv 2', 'gold'); }
  } else if(fx.kind==='token'){
    const item = document.querySelector('.fo-shrine') ? document.querySelector('.rail-item') : null;
    if(item){ item.classList.add('shrine-token-pulse'); floatAt(item, fx.text, 'gold'); }
  }
}

function renderShrineEncounter(){
  const e = S.encounter;
  const roomEnterCls = S.newRoomFx ? 'room-enter' : '';
  const art = MONSTER_ART[e.name] || MONSTER_ART[SHRINE_ART_STANDIN[e.name]];
  const portrait = S.portrait || { img: GNOME_PORTRAITS[0], placeholder:true };
  const heroFig = portrait.placeholder ? mysteryFigureHTML('width:60px; height:60px;') : `<img class="fo-img" src="${portrait.img}" alt="${S.origin.name}">`;
  const hpPct = Math.max(0, Math.min(100, S.health/S.maxHealth*100));
  const ssz = encounterSize(e), sflip = SHRINE_FLIP.has(e.name) ? 'fo-flip' : '';
  const shrineFig = art ? `<img class="fo-img ${sflip} enc-art" src="${art}" alt="${e.name}" style="--sz:${ssz};--drop:${encounterDrop(e)}%"/>` : `<div class="fo-img fo-mystery">${mysteryFigureHTML('width:70%; aspect-ratio:1/1;')}</div>`;
  const waiting = !S.shrineResult && !S.shrineChoice && !S.relicChoice && !S.lootChoice && !S.pendingLootDie;
  app.innerHTML = `
    <div class="panel route-float" style="margin-bottom:8px;">
      ${renderRoute()}
    </div>
    <div class="panel enc-panel-arch" id="enc-panel" style="margin-bottom:8px;">
      <div class="enc-rail-row"><div class="enc-card-col">
        <div class="enc-card fo-arch fo-shrine fo-lvl${Math.min(3,(S.floorIdx||0)+1)} ${roomEnterCls} ${S.newRoomFx?'shrine-awaken':''}">
          ${hallFxHTML()}
          <div class="shrine-motes" aria-hidden="true">${[0,1,2,3,4,5,6,7,8].map(i=>`<i style="--x:${8+i*10.5}%;--d:${(i*0.37)%2.4}s;--t:${3.2+(i%3)*0.7}s"></i>`).join('')}</div>
          <svg class="fo-sconce fo-sconce-l" viewBox="0 0 14 32" width="14" height="32" aria-hidden="true"><path d="M5 9.2 Q4.3 18 5.1 30 Q7.2 31.6 9.2 30 Q9.7 19 9 9.2Z" fill="#7a4a22" stroke="#0c0705" stroke-width="1.6" stroke-linejoin="round"/><path d="M1.6 15.4 Q7 13.9 12.4 15.2 Q13 17.6 12.2 19 Q7 20.3 1.8 19 Q1.1 17 1.6 15.4Z" fill="#55555e" stroke="#0c0705" stroke-width="1.5" stroke-linejoin="round"/><path d="M1.2 1.9 Q7 -0.7 12.8 1.7 Q12.2 6.6 9.7 9.7 Q7 10.7 4.4 9.5 Q2 6.6 1.2 1.9Z" fill="#55555e" stroke="#0c0705" stroke-width="1.6" stroke-linejoin="round"/></svg><div class="fo-torch fo-torch-l"></div><svg class="fo-sconce fo-sconce-r" viewBox="0 0 14 32" width="14" height="32" aria-hidden="true"><path d="M5 9.2 Q4.3 18 5.1 30 Q7.2 31.6 9.2 30 Q9.7 19 9 9.2Z" fill="#7a4a22" stroke="#0c0705" stroke-width="1.6" stroke-linejoin="round"/><path d="M1.6 15.4 Q7 13.9 12.4 15.2 Q13 17.6 12.2 19 Q7 20.3 1.8 19 Q1.1 17 1.6 15.4Z" fill="#55555e" stroke="#0c0705" stroke-width="1.5" stroke-linejoin="round"/><path d="M1.2 1.9 Q7 -0.7 12.8 1.7 Q12.2 6.6 9.7 9.7 Q7 10.7 4.4 9.5 Q2 6.6 1.2 1.9Z" fill="#55555e" stroke="#0c0705" stroke-width="1.6" stroke-linejoin="round"/></svg><div class="fo-torch fo-torch-r"></div>
          <div class="fo-hud"></div>
          <div class="fo-band">
            <div class="fo-side fo-player">
              <div class="fo-fig" title="${S.origin.name} ${S.klass.name}">${heroFig}</div>
              <div class="fo-hpwrap" style="position:relative;"><div class="bar"><div class="bar-fill hp player" style="width:${hpPct}%"></div></div><span class="bar-num">${S.health}/${S.maxHealth}</span></div>
              <div class="fo-name">${S.charName&&S.charName.trim()?S.charName.trim().replace(/</g,'&lt;')+', '+S.origin.name+' '+S.klass.name:S.origin.name+' '+S.klass.name}</div>
              <div class="fo-chips fo-buffs">${relicStripHTML()}</div>
            </div>
            <div class="fo-vs">&nbsp;</div>
            <div class="fo-side fo-enemy">
              <div class="fo-fig ${art?'enc-portrait ':''}${ssz>1.05?'fo-big':''}" style="--sz:${ssz}">${shrineFig}</div>
              <div class="fo-name">${e.name}</div>
              <small class="fo-type">Shrine</small>
              <div class="fo-quests" style="text-align:center;">${e.boon}</div>
            </div>
          </div>
          ${S.shrineResult ? `<div class="shrine-result-banner"><div class="srb-title">${S.shrineResult.title}</div><div class="srb-text">${S.shrineResult.text}</div></div>` : ''}
        </div>
      </div></div>
    </div>
    ${waiting ? `<div class="shrine-act" id="shrine-float">${S.newRoomFx ? '<p class="hint shrine-float-hint">The shrine stirs…</p>' : '<button class="shrine-orb" id="shrine-hold-btn" aria-label="Hold to receive the boon"><svg class="so-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="so-track" cx="50" cy="50" r="44"/><circle class="so-fill" cx="50" cy="50" r="44" pathLength="100"/></svg><span class="so-label"><b>Hold</b><small>to receive the boon</small></span></button>'}</div>` : ''}
    ${S.shrineResult ? '<div class="shrine-act" id="shrine-float"><button class="shrine-orb so-continue" id="shrine-result-continue"><span class="so-label"><b>Continue</b><small>&#10140;</small></span></button></div>' : ''}
    <div class="panel tray-panel tray-idle">
      <div class="enc-rail-row">
        <div class="enc-card-col">
          <div class="tray-float-wrap">
            <div class="tray-head"><span class="round-badge"><b class="rb-floor">F${S.floorIdx+1}</b>&middot; Shrine</span><div class="path-strip"></div></div>
            <div class="tray-wrap tray-wrap-full">
              <div class="tray" id="tray" style="--class-color:${S.klass.color||'#ffffff'}"></div>
              ${chestTrimHTML()}
            </div>
          </div>
        </div>
        <div class="util-rail rail-shrine" aria-hidden="true">
          <div class="util-btn primary-accent rail-go disabled"><span>Go</span></div>
          <div class="util-btn rail-pocket">${iconSpan('bag')}<span>Pocket</span>${S.backPocket.length?`<span class="badge">${S.backPocket.length}</span>`:''}</div>
          <div class="util-btn rail-item disabled">${iconSpan('use')}<span>Item</span></div>
          <div class="util-btn danger-accent rail-clear disabled">${iconSpan('fumble')}<span>Clear</span></div>
          ${S.klass.convertTo ? `<div class="util-btn rail-ability disabled" style="--class-color:${S.klass.color||'#d4af52'}"><span>Skill</span></div>` : ''}
        </div>
      </div>
    </div>
  `;
  { const tr = document.getElementById('tray'); if(tr) tr.innerHTML = (S.tray||[]).map((c,i)=>renderDie(c,i)).join(''); }
  attachRelicStrip();
  if(S.lootChoice) renderLootModal();
  if(S.shrineChoice) renderShrineChoiceModal();
  if(S.relicChoice) renderRelicChoiceModal();
  if(S.shrineResult){
    if(!S.shrineResult._logged){ S.shrineResult._logged = true; teleLog('shrine_result', {shrine:S.shrineResult.title, text:String(S.shrineResult.text).replace(/<[^>]+>/g,'').slice(0,160), hp:S.health, maxHp:S.maxHealth}); }
    const cb = document.getElementById('shrine-result-continue');
    if(cb) cb.onclick = ()=>{ S.shrineFx = null; continueFromShrine(); };
    // Oct 16 (Jeremy: the shrine chain felt disjointed): a shrine that also gives a loot pick moves straight on to it
    // once its boon has landed, instead of asking for an extra Continue first.
    if(S.encounter && S.encounter.loot && !S.encounter._shrineLoot && !S.pendingLootDie){
      const enc = S.encounter;
      clearTimeout(renderShrineEncounter._auto);
      renderShrineEncounter._auto = setTimeout(()=>{ if(S && S.encounter===enc && S.shrineResult && !enc._shrineLoot){ S.shrineFx = null; continueFromShrine(); } }, PREFS.reducedMotion ? 400 : 1500);
    }
  }
  if(S.pendingLootDie) renderSwapModal();
  // The ritual (v1.36.0): hold the shrine (or the button) to receive its boon.
  // Also the way forward for a resumed save that lands here with nothing pending.
  attachShrineHold();
  placeShrineFloat();
  playShrineFx();
  attachLongPressTooltips('.route-tooltip-target');
  if(S.newRoomFx){
    // Defer the boon reveal until the player taps past "A new room... Shrine"
    // -- see the comment in advanceRoute()'s Shrine branch (logic.js).
    showRoomCallout(S.newRoomFx, ()=> render()); // the boon now waits for the hold ritual
    if(typeof playTone==='function') playTone('shrineEnter');
    S.newRoomFx = null; // consumed -- plays once, on the render right after advanceRoute() set it
  }
}

// Camp rest: the health bar and number fill gradually instead of snapping. The animation record lives
// in the transient UIFX (never saved) and the loop re-queries the DOM, so a mid-fill re-render is harmless.
function syncCampHeal(){
  try{
    const h = UIFX.campHeal; if(!h) return;
    const dur = h.dur, noAnim = (typeof PREFS!=='undefined' && PREFS.reducedMotion);
    if(noAnim || performance.now()-h.at >= dur){ UIFX.campHeal = null; return; }
    if(h.running) return; h.running = true;
    if(!h.shook){ h.shook = true; setTimeout(()=>{ try{ pokeAnim(document.querySelector('.camp-hero'),'shake'); }catch(e){} }, 120); } // the hero gives a little shake as the rest heal fills in (Jeremy, Oct 13)
    const step = ()=>{
      const fill = document.querySelector('.camp-hp-fill'), num = document.querySelector('.camp-hp-num');
      const k = Math.max(0, Math.min(1, (performance.now()-h.at)/dur));
      if(!fill || !num || S.screen!=='camp' || !UIFX.campHeal){ h.running=false; return; }
      const e = 1-Math.pow(1-k,2);
      const v = h.from + (h.to-h.from)*e;
      fill.style.width = (v/S.maxHealth*100)+'%';
      num.textContent = Math.round(v)+'/'+S.maxHealth;
      if(k<1) requestAnimationFrame(step); else { h.running=false; UIFX.campHeal=null; }
    };
    step();
  }catch(err){ UIFX.campHeal=null; }
}

// ---- Quest paper rows: "do this  ->  get that". The data string is "REWARD: CONDITION"
// (e.g. "5 damage: 3 maneuvers"); the paper shows the condition first, an arrow, then the reward as a badge. ----
// Quest paper wording (Oct 17 audit, approved by Jeremy): counts of dice in one path ("3 Maneuvers", "2 Heal dice"),
// thresholds noun-first ("Damage 10+", "Path 6+", "Block 5+", "Blanks 10+"), rounds as the tray bubble shows them ("Reach Rd 5").
function questCondShort(cond){
  const c = cond.toLowerCase().trim(); let m;
  const cap = t=> t.charAt(0).toUpperCase()+t.slice(1);
  const pl = (n, one, many)=> n==='1' ? one : many;
  if((m=c.match(/(\d+)\s*maneuvers?(?: in a single (?:turn|round))?/))) return `${m[1]} ${pl(m[1],'Maneuver','Maneuvers')}`;
  if((m=c.match(/any (\d+) or fewer actions/))) return `Path 1-${m[1]}`;
  if((m=c.match(/any (\d+) actions/))) return `Path ${m[1]}+`;
  if((m=c.match(/(\d+)\s*support actions/))) return `${m[1]} Support`;
  if((m=c.match(/accumulate (\d+) block/))) return `Block ${m[1]}+`;
  if((m=c.match(/survive (?:to )?turn (\d+)/))) return `Reach Rd ${m[1]}`;
  if((m=c.match(/survive (\d+)/))) return `Reach Rd ${parseInt(m[1])+1}`;
  if((m=c.match(/gain (\d+)\s*hot\b/))) return `Gain ${m[1]}+ H.O.T.`;
  if((m=c.match(/deal (\d+)\s*dot\b/))) return `Deal ${m[1]}+ D.O.T.`;
  if((m=c.match(/(?:deal )?(\d+)\+?\s*damage/))) return `Damage ${m[1]}+`;
  if(/adventurer h\.?o\.?t\.? = d\.?o\.?t/.test(c)) return 'Your H.O.T.';
  if(/encounter d\.?o\.?t\.? = h\.?o\.?t/.test(c)) return 'Its D.O.T.';
  if((m=c.match(/(\d+)\s*blanks?/))) return `Blanks ${m[1]}+`;
  if((m=c.match(/(\d+)\s*heals?\b/))) return `${m[1]} Heal ${pl(m[1],'die','dice')}`;
  if((m=c.match(/(\d+)\s*block\b/))) return `${m[1]} Block ${pl(m[1],'die','dice')}`;
  if((m=c.match(/(\d+)\s*(dodge|leap|pivot|boost|combo)s?\b/))) return `${m[1]} ${cap(m[2])}${m[1]==='1'?'':'s'}`;
  if((m=c.match(/(\d+)\s*nullify/))) return `${m[1]} Nullify`;
  return cap(c);
}
const QUEST_ALL_FIGHT = /survive|accumulate|h\.?o\.?t\.? = d\.?o\.?t|d\.?o\.?t\.? = h\.?o\.?t/; // not checked within one turn
function questRewardHTML(rewardText){
  if(!rewardText) return '';
  const t = rewardText.toLowerCase(); const m = t.match(/(\d+(?:\.\d+)?)/); const n = m? m[1] : '';
  let type = 'hit';
  if(t.includes('dot')) type='dot'; else if(t.includes('hot')) type='hot'; else if(t.includes('nullify')) type='nullify'; else if(t.includes('freeze')) type='freeze';
  const num = (type==='nullify' || type==='freeze') ? '' : n; // a Freeze is always one skipped turn
  return `<span class="q-reward q-reward-${type}" title="Reward: ${rewardText}">${iconSpan(type)}${num?`<b>${num}</b>`:''}</span>`;
}
function questRowHTML(q, done){
  const {rewardText, cond} = parseQuestSpec(q);
  // Geometry mirrors pay D.O.T. on it (Profane) or H.O.T. for you (Sacred), not damage (Oct 17 audit).
  const rt = /adventurer h\.?o\.?t\.? = d\.?o\.?t/.test(cond) ? (rewardText||'').replace(/damage/i,'dot') : /encounter d\.?o\.?t\.? = h\.?o\.?t/.test(cond) ? (rewardText||'').replace(/damage/i,'hot') : rewardText;
  return `<span class="q-cond">${questCondShort(cond)}</span><span class="q-arrow">→</span>${questRewardHTML(rt)}`;
}
function infoDot(text){ return `<span class="info-dot" title="${String(text).replace(/"/g,'&quot;')}" tabindex="0">i</span>`; }
// If the Camp screen would scroll, fold the Back Pocket down to its first two rows;
// tapping the fold grows the full pocket UP over the Tray rows above it.
function campOverflows(from){
  for(let el=from; el && el!==document.documentElement; el=el.parentElement){
    const oy = getComputedStyle(el).overflowY;
    if((oy==='auto'||oy==='scroll') && el.scrollHeight>el.clientHeight+2) return true;
  }
  const se = document.scrollingElement; return !!se && se.scrollHeight>window.innerHeight+2;
}
function applyPocketCollapse(){
  const body = document.querySelector('.organize-body'), wrap = document.querySelector('.organize-wrap');
  if(!body || !wrap) return;
  const sec = wrap.closest('.camp-section'); sec.style.position='relative';
  const tiles = [...body.querySelectorAll('.camp-die-tile')];
  const bTop = body.getBoundingClientRect().top;
  // cluster tile tops into rows (stacked tiles are tilted, so their tops differ by a few px)
  const raw = tiles.map(x=>x.getBoundingClientRect().top - bTop).sort((a,b)=>a-b);
  const tops = []; raw.forEach(v=>{ if(!tops.length || v - tops[tops.length-1] > 16) tops.push(v); });
  const rowOf = x => { const v = x.getBoundingClientRect().top - bTop; let k=0; tops.forEach((tp,i)=>{ if(v >= tp-16) k=i; }); return k; };
  if(tops.length<3) return;
  if(!S._pocketOpen && !campOverflows(wrap)) return;
  const row2Tiles = tiles.filter(x=>rowOf(x)<=1);
  const h = Math.max(...row2Tiles.map(x=>x.getBoundingClientRect().bottom - bTop)) + 8;
  const hidden = tiles.filter(x=>rowOf(x)>1).length;
  const more = document.createElement('button');
  more.className='pocket-more'; more.type='button';
  const secCS = getComputedStyle(sec), secBg = secCS.backgroundColor;
  const setOpen = open => {
    S._pocketOpen = open;
    wrap.classList.toggle('organize-open', open);
    more.innerHTML = open ? `${chevronSVG(14)} Fold` : `${chevronSVG(14)} +${hidden} more`;
    more.classList.toggle('up', !open);
    const old = sec.querySelector('.pocket-spacer'); if(old) old.remove();
    const oldT = wrap.querySelector('.organize-title-clone'); if(oldT) oldT.remove();
    if(open){
      const ttl = sec.querySelector('.camp-section-title'); if(ttl){ const c = ttl.cloneNode(true); c.classList.add('organize-title-clone'); c.style.margin='0 0 4px'; wrap.prepend(c); }
      body.style.maxHeight='62vh'; body.style.overflowY='auto'; body.style.webkitMaskImage=body.style.maskImage='none';
      const sp = document.createElement('div'); sp.className='pocket-spacer'; sp.style.height = wrap.dataset.collH+'px'; wrap.before(sp);
      const bw = parseFloat(secCS.borderTopWidth)||0;
      wrap.style.cssText = `position:absolute;left:${-bw}px;right:${-bw}px;bottom:${-bw}px;z-index:6;background:${secBg};padding:${secCS.paddingTop} ${secCS.paddingRight} 4px ${secCS.paddingLeft};border:${secCS.borderTopWidth} ${secCS.borderTopStyle} ${secCS.borderTopColor};border-radius:${secCS.borderTopLeftRadius};box-sizing:border-box;box-shadow:0 -8px 22px rgba(0,0,0,.55);`;
    } else {
      wrap.style.cssText='';
      body.style.maxHeight = h+'px'; body.style.overflow='hidden';
      body.style.webkitMaskImage = body.style.maskImage = 'linear-gradient(#000 82%, transparent)';
    }
  };
  body.style.maxHeight = h+'px'; body.style.overflow='hidden';
  wrap.appendChild(more);
  wrap.dataset.collH = h + more.offsetHeight + 12;
  more.onclick = e=>{ e.stopPropagation(); setOpen(!wrap.classList.contains('organize-open')); };
  setOpen(!!S._pocketOpen);
}

// Campfire choice panel (Oct 14, Jeremy: make the choice clear on the camp screen): Rest OR Train, side by side.
// Train = combining dice in the Upgrade section below (Jeremy: "the upgrading should be the fusing").
function campFusionsReady(){ let n = 0; ['attack','maneuver'].forEach(cat=>{ if(!S.campUpgrades[cat]) [1,2].forEach(lv=>{ if(canUpgrade(cat,lv)) n++; }); }); return n; }
// Oct 17: when nothing can be combined, say the real reason. A combine needs 3 matching dice AND a spare Back Pocket die
// for every Tray slot it empties beyond the first (canUpgrade, logic.js), so 3 matching Tray dice need 2 spare Pocket dice.
function trainBlockedText(){
  let need = 0;
  ['attack','maneuver'].forEach(cat=>{ if(S.campUpgrades[cat]) return; [1,2].forEach(lv=>{
    const bp = S.backPocket.filter(d=>d.cat===cat && d.level===lv).length, tr = S.tray.filter(c=>c.die.cat===cat && c.die.level===lv).length;
    if(bp + tr < UPGRADE_COST) return;
    const fillers = Math.max(0, UPGRADE_COST - Math.min(bp, UPGRADE_COST) - 1);
    if(fillers && (!need || fillers < need)) need = fillers;
  }); });
  return need ? `Needs ${need} spare ${need===1?'die':'dice'} in your Pocket` : 'No sets of 3 yet';
}
function campfireChoiceHTML(){
  if(S.campFireOut) return `<div class="campfire-choice out"><div class="cf-label">The campfire is out ${infoDot('Goldberg&#39;s Rube Machine took all night: no Rest or upgrades at this Camp.')}</div></div>`;
  const ch = S.campChoice, n = campFusionsReady(), est = restHealEstimate();
  const restSub = ch==='rest' ? `Healed +${S.campHealed||0}` : (S.health>=S.maxHealth ? 'Already at full health' : (est>0 ? '' : 'Heals nothing here'));
  const trainSub = ch==='train' ? ((S.campUpgrades.attack||S.campUpgrades.maneuver) ? 'Dice combined' : 'Combine dice below') : (n ? 'Unlocks combining below' : trainBlockedText());
  const cls = k => ch ? (ch===k ? ' chosen' : ' skipped') : '';
  return `<div class="campfire-choice${ch?' done':''}">
      <div class="cf-label">${ch ? 'Campfire used' : 'Campfire: choose one'} ${infoDot('Each Camp\'s fire gives you ONE of these. Rest: scramble your Tray and heal half the faces that aren\'t blank. Train: combine 3 matching dice into 1 of the next level (up to one Attack and one Maneuver). Organizing is always free.')}</div>
      <div class="cf-row">
        <button id="rest-btn" class="cf-btn cf-rest${cls('rest')}" ${ch?'disabled':''} title="Scramble your Tray's faces, then heal for half the non-blank faces showing">${ch==='rest'?'&#10003; ':''}Rest${restSub?`<small>${restSub}</small>`:''}</button>
        <span class="cf-or">or</span>
        <button id="train-btn" class="cf-btn cf-train${cls('train')}" ${(ch||!n)?'disabled':''} title="Combine 3 matching dice in the Upgrade section below">${ch==='train'?'&#10003; ':''}Train<small>${trainSub}</small></button>
      </div>
    </div>`;
}

// Oct 16 (Jeremy): the first Rest or combine at a Camp asks once, briefly, since it uses up the fire's other option.
// Not asked at the base camp (combining is free there) or once the choice is made.
function confirmCampfire(kind, go){
  if(S.campChoice || S.campFireOut || isBaseCamp()) return go();
  const rest = kind==='rest';
  const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center;">
      <h2>${rest ? 'Rest here?' : 'Train here?'}</h2>
      <p>${rest ? "The campfire gives one: if you Rest, you can't combine dice at this Camp." : "The campfire gives one: if you Train (combine dice), you can't Rest at this Camp."}</p>
      <div class="small-btn-row" style="justify-content:center;">
        <button id="cf-confirm-cancel">Not yet</button>
        <button class="${rest ? 'cf-go-rest' : 'cf-go-train'}" id="cf-confirm-go">${rest ? 'Rest' : 'Train'}</button>
      </div>
    </div></div>`);
  openModal(overlay);
  overlay.querySelector('#cf-confirm-cancel').onclick = ()=> closeModal(overlay);
  overlay.querySelector('#cf-confirm-go').onclick = ()=> closeModal(overlay, go);
  overlay.onclick = (ev)=>{ if(ev.target===overlay) closeModal(overlay); };
}

// Combining can use up the last Back Pocket dice, which disarms the safety net (Oct 14 revive rule): warn first.
function pocketLeftAfterUpgrade(cat, level){
  const bpMatches = S.backPocket.filter(d=>d.cat===cat && d.level===level).length;
  const bpUsed = Math.min(bpMatches, 3), trayUsed = 3 - bpUsed;
  return S.backPocket.length - bpUsed - Math.max(0, trayUsed - 1) + (trayUsed===0 ? 1 : 0); // a Pocket-only combine puts the new die in the Pocket
}
function confirmEmptyPocket(go){
  const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center;">
      <h2>Empty your Back Pocket?</h2>
      <p>This combine uses your last spare dice, so you'll have <b>no safety net</b> if you fall to 0 Health, until a new die lands in your Pocket.</p>
      <div class="small-btn-row" style="justify-content:center;"><button id="ep-cancel">Keep my safety net</button><button class="danger" id="ep-go">Combine anyway</button></div>
    </div></div>`);
  openModal(overlay);
  overlay.querySelector('#ep-cancel').onclick = ()=> closeModal(overlay);
  overlay.querySelector('#ep-go').onclick = ()=> closeModal(overlay, go);
  overlay.onclick = (ev)=>{ if(ev.target===overlay) closeModal(overlay); };
}

function renderCamp(){
  try{ ensureRoomTextures(); }catch(e){} // the camp scene reuses the dungeon's (paper) wall and floor (Oct 15)
  const baseCamp = S.floorIdx===0 && S.routeStep===0;
  const campFx = healthFX(S.health, S._lastPlayerHealth);
  S._lastPlayerHealth = S.health;
  const organizeSel = S.organizeSelection;
  const upgradeRows = [];
  // Oct 16 (Jeremy): combining is locked (striped cover + lock) until Train is picked at the campfire; Base Camp is free.
  const trainLocked = !baseCamp && !S.campChoice && !S.campFireOut;
  ['attack','maneuver'].forEach(cat=>{
    [1,2].forEach(level=>{
      const count = upgradeAvailability(cat, level);
      if(count<3 && S.campUpgrades[cat]) return; // hide impossible/irrelevant rows once used, keep list short
      if(count===0) return; // nothing of this tier exists yet -- would-be-empty row, pure clutter
      const label = cat.charAt(0).toUpperCase()+cat.slice(1);
      const fireOk = baseCamp || (!S.campFireOut && S.campChoice!=='rest'); // Train and Rest share the campfire
      const eligible = canUpgrade(cat, level) && !S.campUpgrades[cat] && fireOk;
      const locked = eligible && trainLocked; // Oct 16 (Jeremy): pick Train at the top first
      const disabled = !eligible; // a locked one keeps its glow and normal look; its tap is refused in the handler (Oct 16, Jeremy)
      const needsBackfill = count>=3 && !canUpgrade(cat,level);
      const upgradeTitle = needsBackfill ? 'Needs more spare dice to backfill' : `Combine 3 ${label} ${ROMAN[level]} into 1 ${label} ${ROMAN[level+1]}`;
      upgradeRows.push(`<div class="upgrade-row upg-${cat}">
          <button class="upgrade-btn${(eligible && !baseCamp)?' upgrade-ready':''}${locked?' upgrade-locked':''}" id="upgrade-${cat}-${level}" ${disabled?'disabled':''}${locked?' aria-disabled="true"':''} title="${locked?'Choose Train at the campfire first':upgradeTitle}"><span class="upg-lbl">${label} ${ROMAN[level]} ${mergeGlyphSVG(16)} ${ROMAN[level+1]} <span class="token-count">${count}</span></span></button>
          <button id="preview-${cat}-${level}" class="upgrade-preview-btn" title="Preview the resulting die's faces">?</button>
        </div>`);
    });
  });
  app.innerHTML = `
    <div class="panel">
      ${renderRoute()}
      <h2 style="margin-bottom:6px;">${baseCamp?'Base Camp':'Camp'} ${infoDot(baseCamp?'Your adventure begins here. Tinker with your dice if you like, then set out — nothing here is required.':'Prepare before pressing onward. The campfire gives you one choice: Rest or Train.')}</h2>
      ${baseCamp?'<p class="hint" style="margin:0 0 6px;">Nothing here is required — set out whenever you like.</p>':''}

      <div class="camp-section camp-status-card">
        <div class="bar-row camp-hp-row" style="position:relative;"><span style="flex:0 0 auto;">Health</span><div class="fo-hpwrap camp-hpwrap" style="position:relative;"><div class="bar ${campFx.cls}"><div class="bar-fill hp player camp-hp-fill" style="width:${S.health/S.maxHealth*100}%"></div></div><span class="bar-num camp-hp-num">${S.health}/${S.maxHealth}</span></div>${campFx.deltaHTML}</div>
        ${relicStripHTML()}
        <div class="camp-fire-wrap ${(performance.now()-UIFX.flareAt)<900?'flare':''}" style="--fl:-${Math.max(0,Math.round(performance.now()-UIFX.flareAt))}ms">
          <div class="camp-hero" title="${S.origin.name} ${S.klass.name}">${(S.portrait&&!S.portrait.placeholder)?`<img src="${S.portrait.img}" alt="${S.origin.name}">`:mysteryFigureHTML('width:56px; height:56px;')}</div>
          <div class="campfire-glow"></div>
          <div class="campfire-logs"></div>
          <div class="campfire-flame flame-back"></div>
          <div class="campfire-flame flame-front"></div>
        </div>
        ${baseCamp?'':campfireChoiceHTML()}
        <div class="small-btn-row">
          <button id="leave-btn" class="primary">${baseCamp?'Start Your Adventure':'Break Camp &amp; Continue'}</button>
        </div>
      </div>

      <div class="camp-section">
        <h3 class="camp-section-title" id="camp-upgrade-title">${baseCamp?'Upgrade Dice':'Train: Upgrade Dice'} ${infoDot(baseCamp?'Combine 3 matching Basic dice into 1 of the next tier. You can upgrade 1 Attack and 1 Maneuver die per Camp.':'Combine 3 matching Basic dice into 1 of the next tier (1 Attack and 1 Maneuver per Camp). Training uses the campfire, so you can\'t also Rest here.')}</h3>
        ${(trainLocked && upgradeRows.length) ? '<p class="hint upgrade-locked-hint" style="margin:0 0 4px;">Choose <b>Train</b> at the campfire above to combine dice.</p>' : ''}
        ${(!baseCamp && S.campChoice==='rest') ? '<p class="hint" style="margin:0 0 4px;">You rested at this fire, so no training here.</p>' : (!baseCamp && S.campFireOut) ? '<p class="hint" style="margin:0 0 4px;">The campfire is out.</p>' : ''}
        <div class="upgrade-rows-col">${upgradeRows.length? upgradeRows.join('') : '<span class="hint">No matching sets of 3 Basic dice to combine right now.</span>'}</div>
      </div>

      <div class="camp-section">
        <h3 class="camp-section-title">Organize Dice ${infoDot('Tap a die in your Tray, then one in your Back Pocket, to swap them.')}</h3>
        <div class="organize-wrap"><div class="organize-body">
        <div class="camp-dice-grid ${organizeSel && organizeSel.type==='bp' ? 'organize-target':''} ${organizeSel && organizeSel.type==='tray' ? 'organize-source':''}" id="organize-tray"></div>
        ${organizeSwapArrowHTML()}
        <div class="camp-pocket ${organizeSel && organizeSel.type==='tray' ? 'organize-target':''} ${organizeSel && organizeSel.type==='bp' ? 'organize-source':''}">
          ${S.backPocket.length ? `<span class="camp-pocket-count" title="Back Pocket">${S.backPocket.length}</span><div class="camp-dice-grid" id="organize-bp"></div>` : `<p class="hint camp-empty-hint" style="margin:0;">Back Pocket empty ${infoDot('Dice land here when a Loot Die replaces them in your Tray, or a Shrine upgrades one.')}</p>`}
        </div>
        </div></div>
      </div>
    </div>`;
  const restBtn = document.getElementById('rest-btn');
  if(restBtn) restBtn.onclick = ()=>{ if(!S.campRested) confirmCampfire('rest', campRest); };
  const trainBtn = document.getElementById('train-btn');
  if(trainBtn) trainBtn.onclick = ()=> confirmCampfire('train', ()=>{ // Oct 16: Train is the choice itself; it unlocks combining below
    if(!campFireUsedBy('train')) return;
    render();
    const t = document.getElementById('camp-upgrade-title'); if(!t) return;
    t.scrollIntoView({behavior: PREFS.reducedMotion ? 'auto' : 'smooth', block:'center'});
    const sec = t.closest('.camp-section'); if(sec){ sec.classList.remove('cf-point'); void sec.offsetWidth; sec.classList.add('cf-point'); }
  });
  syncCampHeal();
  document.getElementById('leave-btn').onclick = ()=>{
    if(baseCamp || S.campChoice || S.campFireOut){ campLeave(); return; } // Oct 16 (Jeremy): only ask when the fire is still unused
    const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center;">
        <h2>Break Camp?</h2>
        <p>${S.campRested ? "You can't come back to upgrade dice until the next Camp." : "You haven't used the campfire (Rest or Train). Leave without it?"}</p>
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
      if(btn) btn.onclick = ()=>{
        if(btn.classList.contains('upgrade-locked')){ // not until Train is chosen: nudge the Train button instead
          const tb = document.getElementById('train-btn'); if(tb){ tb.classList.remove('cf-nudge'); void tb.offsetWidth; tb.classList.add('cf-nudge'); }
          return;
        }
        const go = ()=> flyDiceToFuse(cat, level, ()=> campUpgrade(cat, level));
        confirmCampfire('train', ()=>{
          if(!pocketLeftAfterUpgrade(cat, level) && S.backPocket.length) return confirmEmptyPocket(go);
          go();
        });
      };
      if(btn){
        // Hovering (or focusing / touching) an upgrade lights up the dice stacks it would consume.
        const nm = basic(cat,level).name;
        const lit = on => document.querySelectorAll('.camp-die-tile').forEach(t=>{ if((t.title||'').startsWith(nm)) t.classList.toggle('fuse-hint', on); });
        ['mouseenter','focus','touchstart'].forEach(ev=> btn.addEventListener(ev, ()=>lit(true), {passive:true}));
        ['mouseleave','blur','touchend','touchcancel'].forEach(ev=> btn.addEventListener(ev, ()=>lit(false), {passive:true}));
      }
      const previewBtn = document.getElementById(`preview-${cat}-${level}`);
      if(previewBtn) previewBtn.onclick = ()=>{
        const resultDie = basic(cat, level+1);
        const label = cat.charAt(0).toUpperCase()+cat.slice(1);
        // Same presentation as a loot option: the die tile plus its faces as mini-face tiles.
        const accent = LOOT_TIER_ACCENT[resultDie.cat] || LOOT_TIER_ACCENT.alloy;
        const facesHTML = resultDie.faces.map(f=>f.type==='blank'
          ? '<div class="mini-face mf-blank"></div>'
          : `<div class="mini-face mf-${resultDie.cat}" title="${LABEL[f.type]}${f.value?' '+f.value:''}">${iconSpan(f.type, f.value)}<small>${LABEL[f.type]}${(f.value && !ICON_VALUE_SLOT.has(f.type))?' '+f.value:''}</small></div>`).join('');
        const pv = openInfoModal(`${label} ${ROMAN[level+1]}`, `<div class="loot-options"><div class="loot-opt" style="--loot-tier-color:${accent.color}; --loot-tier-glow:${accent.glow}; cursor:default;">
            ${lootPreviewTileHTML(resultDie, `upg-${cat}-${level}`, LOOT_ART[resultDie.name])}
            <div class="faces-tiles">${facesHTML}</div>
          </div></div>`);
        pv.querySelector('.modal').classList.add('loot-modal','loot-modal-n2');
      };
    });
  });
  document.getElementById('organize-tray').innerHTML = campDiceGridHTML(S.tray.map((c,i)=>({die:c.die, idx:i})), 'tray');
  if(S.backPocket.length) document.getElementById('organize-bp').innerHTML = campDiceGridHTML(S.backPocket.map((d,i)=>({die:d, idx:i})), 'bp');
  applyPocketCollapse();
  [...document.querySelectorAll('.camp-die-tile')].forEach(tile=>{
    tile.onclick = ()=> selectOrganize(tile.dataset.campType, parseInt(tile.dataset.campIdx));
  });
  attachLongPressTooltips('.route-tooltip-target');
  attachRelicStrip();
  if(S._fuseFx){
    const fx = S._fuseFx; S._fuseFx = null;
    const tiles = [...document.querySelectorAll('.camp-die-tile')];
    // Tiles are stacks of identical dice keyed by their first index, so the new die's
    // tile is the same-type tile with the largest first-index at or below its slot.
    const tile = tiles.filter(t=>t.dataset.campType===fx.type && parseInt(t.dataset.campIdx)<=fx.idx)
                      .sort((a,b)=>parseInt(b.dataset.campIdx)-parseInt(a.dataset.campIdx))[0];
    if(tile && !PREFS.reducedMotion){
      tile.classList.add('fuse-flash');
      tile.id = tile.id || 'fuse-target';
      spawnParticleBurstAtEl('#'+tile.id, ['#ffd76a','#8fd0ff','#fff5d6']);
    }
    if(typeof playTone==='function') playTone('fuse');
  }
}

// Run-end tally: the summary chips pop in one by one, each number counting up from
// 0 with a rising tick, then a closing chord. (Final values are already in the DOM,
// so Reduce Motion / a failed script just shows the finished numbers.)
function animateSummary(){
  if(PREFS.reducedMotion) return;
  const chips = [...document.querySelectorAll('.sum-chip')];
  if(!chips.length) return;
  chips.forEach(c=>c.classList.add('sum-pre'));
  chips.forEach((c,i)=>{
    setTimeout(()=>{
      if(!c.isConnected) return;
      c.classList.remove('sum-pre'); c.classList.add('sum-pop');
      if(typeof playTone==='function') playTone('pathTick', i);
      const n = c.querySelector('.sum-count'); if(!n) return;
      const to = parseFloat(n.dataset.to)||0, t0 = performance.now(), dur = 420;
      const tick = (now)=>{ const k=Math.min(1,(now-t0)/dur); n.textContent = Math.round(to*(1-Math.pow(1-k,3))); if(k<1 && n.isConnected) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, 350 + i*260);
  });
  setTimeout(()=>{ if(typeof playTone==='function') playTone('tally', 4); }, 350 + chips.length*260 + 200);
}

// Highlight reel for the run-end screen: the best moments of the run, with a
// gold "New best!" tag where it beat the player's lifetime record.
function runHighlightsHTML(){
  const st = S.stats, pbs = S.personalBests||[];
  const tag = label => pbs.includes(label) ? ' <span class="new-tag">NEW BEST!</span>' : '';
  const rows = [];
  if(st.bestTurn>0) rows.push(['Biggest turn', `${st.bestTurn} damage`, st.bestTurnFoe ? `vs ${st.bestTurnFoe}` : '', 'Biggest turn']);
  if(st.bestOverBy>0) rows.push(['Biggest overkill', `${st.bestOverBy} past dead`, st.bestOverFoe ? `on ${st.bestOverFoe}` : '', 'Biggest overkill']);
  if(st.longestPath>0) rows.push(['Longest path', `${st.longestPath} dice`, '', 'Longest path']);
  if(st.nearMisses>0) rows.push(['Close calls', `${st.nearMisses}`, 'nearly-lethal swings & near-overkills', '']);
  if(!rows.length) return '';
  return `<div class="key-card run-highlights" style="text-align:left;">
    <div class="camp-section-title" style="font-weight:800; text-align:center; margin-bottom:6px;">Highlights</div>
    ${rows.map(r=>`<div class="hl-row"><span class="hl-k">${r[0]}${r[3]?tag(r[3]):''}</span><span class="hl-v"><b>${r[1]}</b>${r[2]?` <small>${r[2]}</small>`:''}</span></div>`).join('')}
  </div>`;
}

// ---- Run card (Oct 13, Jeremy): a compact, shareable summary of the run on the end screens -- who, how it
// ended, four headline numbers, the final tray and the relics. "Save Card" draws the same card on a canvas
// and shares it (phone share sheet) or downloads it as a PNG.
const RC_DIE_COLORS = { attack:['#b33b3b','#fff3e6'], maneuver:['#e4d7ad','#241c10'], origin:['#4a8a5c','#eafbea'], alloy:['#9aa3ab','#1a1410'], gilded:['#d4af52','#241c10'], magic:['#8a5fb0','#f5eaff'] };
function runCardData(outcome){
  const st = S.stats;
  const name = S.charName && S.charName.trim() ? S.charName.trim() : '';
  const killer = st.killedBy || (S.encounter && S.encounter.curHealth>0 ? S.encounter.name : '');
  return {
    name, who: `${S.origin.name} ${S.klass.name}`, depth: depthLabel(currentDepth()), color: S.klass.color || '#d4af52',
    outcome: outcome==='victory' ? `Conquered the dungeon in ${st.turnsTaken} turns` : `Fell on Floor ${S.floorIdx+1}${killer?` to ${killer}`:''}`,
    stats: [['Damage', Math.round(st.damageDealt)], ['Best turn', st.bestTurn||0], ['Blocked', st.damageBlocked||0], ['Foes beaten', st.encountersDefeated]],
    dice: S.tray.map(c=>{ const f = pickPreviewFace(c.die.faces); return {cat:c.die.cat, type:f.type, value:f.value, name:c.die.name}; }),
    relics: (S.relics||[]).map(relicById).filter(Boolean),
    portrait: S.portrait && !S.portrait.placeholder ? S.portrait.img : null,
    win: outcome==='victory',
  };
}
function runCardHTML(outcome){
  const d = runCardData(outcome);
  return `<div class="run-card ${d.win?'rc-win':'rc-loss'}" style="--rc-class:${d.color}">
    <div class="rc-top">
      ${d.portrait ? `<img class="rc-portrait" src="${d.portrait}" alt=""/>` : ''}
      <div class="rc-id">
        <div class="rc-name">${d.name ? d.name.replace(/</g,'&lt;') : d.who}</div>
        <div class="rc-sub">${d.name ? d.who+' &middot; ' : ''}Depth ${d.depth}</div>
        <div class="rc-outcome">${d.outcome}</div>
      </div>
    </div>
    <div class="rc-stats">${d.stats.map(([k,v])=>`<div class="rc-stat"><b>${v}</b><small>${k}</small></div>`).join('')}</div>
    <div class="rc-dice">${d.dice.map(x=>{ const c = RC_DIE_COLORS[x.cat]||RC_DIE_COLORS.alloy; return `<span class="rc-die" title="${x.name}" style="background:${c[0]};color:${c[1]}">${x.type==='blank'?'':iconSpan(x.type, x.value, true)}</span>`; }).join('')}</div>
    ${d.relics.length ? `<div class="rc-relics">${d.relics.map(r=>relicBadgeHTML(r,'rc-gem')).join('')}</div>` : ''}
    <div class="rc-foot">Dungeon Scramble v${GAME_VERSION}</div>
  </div>`;
}
function rcLoadImg(src){ return new Promise(res=>{ if(!src) return res(null); const im = new Image(); im.onload = ()=>res(im); im.onerror = ()=>res(null); im.src = src; }); }
function rcSvgImg(svg, color){
  if(!svg) return Promise.resolve(null);
  let t = svg.replace(/currentColor/g, color);
  if(!/xmlns=/.test(t)) t = t.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"');
  return rcLoadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t));
}
async function saveRunCard(outcome){
  const d = runCardData(outcome);
  const W = 540, pad = 28, dieS = 52, gap = 10, cols = 4;
  const H = 300 + 4*(dieS+gap) + (d.relics.length ? 70 : 0);
  const cv = document.createElement('canvas'); cv.width = W*2; cv.height = H*2;
  const g = cv.getContext('2d'); g.scale(2,2);
  const rr = (x,y,w,h,r)=>{ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); };
  g.fillStyle = '#1c130c'; g.fillRect(0,0,W,H);
  rr(8,8,W-16,H-16,22); g.fillStyle = '#3a2716'; g.fill(); g.lineWidth = 6; g.strokeStyle = d.color; g.stroke();
  const por = await rcLoadImg(d.portrait);
  let tx = pad+8;
  if(por){ const ph = 120, pw = ph*por.width/por.height; g.drawImage(por, pad+4, 26, pw, ph); tx = pad + 4 + pw + 16; }
  g.fillStyle = '#ffd76a'; g.font = 'bold 30px Georgia, serif'; g.fillText(d.name || d.who, tx, 62, W-tx-pad);
  g.fillStyle = '#fff1d6'; g.font = '18px Georgia, serif'; g.fillText((d.name ? d.who+' · ' : '')+'Depth '+d.depth, tx, 90, W-tx-pad);
  g.fillStyle = d.win ? '#9affa0' : '#ff9a8a'; g.font = 'italic 18px Georgia, serif'; g.fillText(d.outcome, tx, 118, W-tx-pad);
  const sw = (W-2*pad-16)/4;
  d.stats.forEach(([k,v],i)=>{ const x = pad+8+i*sw; rr(x+3,166,sw-6,64,12); g.fillStyle = '#2a1c10'; g.fill();
    g.textAlign = 'center'; g.fillStyle = '#ffd76a'; g.font = 'bold 26px Georgia, serif'; g.fillText(String(v), x+sw/2, 200);
    g.fillStyle = '#e9dcc4'; g.font = '13px Georgia, serif'; g.fillText(k, x+sw/2, 220); g.textAlign = 'left'; });
  const gx = (W - (cols*dieS + (cols-1)*gap))/2, gy = 252;
  const icons = await Promise.all(d.dice.map(x=>{ const c = RC_DIE_COLORS[x.cat]||RC_DIE_COLORS.alloy; return rcSvgImg(x.type==='blank'?'':(ICON_SVG[x.type]||''), c[1]); }));
  d.dice.forEach((x,i)=>{ const c = RC_DIE_COLORS[x.cat]||RC_DIE_COLORS.alloy, X = gx+(i%cols)*(dieS+gap), Y = gy+Math.floor(i/cols)*(dieS+gap);
    rr(X,Y,dieS,dieS,10); g.fillStyle = c[0]; g.fill(); g.lineWidth = 3; g.strokeStyle = '#0c0705'; g.stroke();
    if(icons[i]) g.drawImage(icons[i], X+10, Y+8, dieS-20, dieS-20);
    if(x.value && x.type!=='blank'){ g.fillStyle = c[1]; g.font = 'bold 13px Georgia, serif'; g.textAlign = 'right'; g.fillText(String(x.value), X+dieS-5, Y+dieS-5); g.textAlign = 'left'; } });
  if(d.relics.length){
    const gems = await Promise.all(d.relics.map(r=>rcSvgImg(relicGemSVG(r), '#fff')));
    const gs = 40, ry = gy + 4*(dieS+gap) + 12, rx0 = (W - (d.relics.length*(gs+6)-6))/2;
    gems.forEach((im,i)=>{ if(im) g.drawImage(im, rx0+i*(gs+6), ry, gs, gs); });
  }
  g.fillStyle = 'rgba(255,241,214,.6)'; g.font = '13px Georgia, serif'; g.textAlign = 'center'; g.fillText('Dungeon Scramble v'+GAME_VERSION, W/2, H-20); g.textAlign = 'left';
  const blob = await new Promise(res=>cv.toBlob(res, 'image/png'));
  const fname = `dungeon-scramble-${outcome}-${Date.now()}.png`;
  try{
    const file = new File([blob], fname, {type:'image/png'});
    if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:'Dungeon Scramble run'}); return; }
  }catch(err){ if(err && err.name==='AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function wireRunCard(outcome){ const b = document.getElementById('save-run-card-btn'); if(b) b.onclick = ()=>{ b.disabled = true; saveRunCard(outcome).finally(()=>{ b.disabled = false; }); }; wireEndDetails(outcome==='victory'); }

// End screens (Oct 17 design fixes, items 6-7): the run card and [Save Card][Try Again] fit one 769px screen; the
// depth seal, relic, achievements, boons and Run Summary sit behind a Details toggle that swaps places with the card.
function endScreenHTML(o){
  const news = [];
  if(o.seal) news.push(S.depthResult && S.depthResult.newClassBest ? 'New best depth' : 'Depth seal');
  if(o.relic) news.push('Origin relic');
  const na = (S.newAchievements||[]).length; if(na) news.push(`${na} achievement${na>1?'s':''}`);
  const nb = (S.newBoonDice||[]).filter((n,i,a)=>a.indexOf(n)===i).length; if(nb) news.push(`${nb} Starting Boon${nb>1?'s':''}`);
  news.push('Run Summary');
  return `<div class="panel end-screen"><h2>${o.title}</h2><p class="end-lede">${o.lede}</p>
    <div class="end-swap">
      <div class="end-main">${runCardHTML(o.outcome)}${o.note||''}</div>
      <div class="end-details" hidden>${o.seal}${o.relic}${newAchievementsHTML(S.newAchievements)}${newBoonsHTML()}${summaryStatsHTML()}
        <button class="btn-export end-send-btn" onclick="openExportDataModal()">Send Play Data</button></div>
    </div>
    <div class="end-actions"><button id="save-run-card-btn">Save Card</button><button class="primary" onclick="location.reload()">${o.again}</button></div>
    <button id="end-details-btn" class="end-details-btn"><span class="end-details-word">Details</span><small>${news.join(' &middot; ')}</small></button>
    ${shareDataAskHTML()}
  </div>`;
}
function wireEndDetails(countUp){ // countUp: the Run Summary numbers count up (victory only, as before)
  const b = document.getElementById('end-details-btn'); if(!b) return;
  const main = document.querySelector('.end-main'), det = document.querySelector('.end-details');
  let animated = false;
  b.onclick = ()=>{
    const open = det.hidden;
    // the details take the card's place and may use whatever room is left on screen, never growing the page
    if(open){ const kids = [...b.parentNode.children], bottom = Math.max(...kids.map(k=>k.getBoundingClientRect().bottom));
      det.style.maxHeight = Math.max(main.offsetHeight, Math.floor(window.innerHeight - bottom - 22 + main.offsetHeight)) + 'px'; }
    det.hidden = !open; main.hidden = open;
    b.classList.toggle('open', open);
    b.querySelector('.end-details-word').textContent = open ? 'Back to run card' : 'Details';
    if(open){ det.scrollTop = 0; if(countUp && !animated){ animated = true; animateSummary(); } }
  };
}

// Victory-only reveal: the first win with an Origin earns its signature relic.
function originRelicEarnedHTML(){
  if(!S.newOriginRelic) return '';
  const r = relicById(S.newOriginRelic), o = ORIGINS.find(x=>x.id===r.origin);
  return `<div class="key-card origin-relic-earned">
    <div class="ore-kicker">Origin Relic Earned!</div>
    <div class="ore-body">${relicBadgeHTML(r, 'relic-badge-lg')}<div style="text-align:left;"><div class="relic-name">${r.name}</div><div class="relic-desc">${r.desc}</div></div></div>
    <div class="hint" style="margin:6px 0 0;">Every future ${o.name} run now starts with it.</div>
  </div>`;
}

function summaryStatsHTML(){
  const st = S.stats;
  return `
    ${runHighlightsHTML()}
    <div class="key-card" style="text-align:left;">
      <div class="camp-section-title" style="font-weight:800; text-align:center; margin-bottom:8px;">Run Summary</div>
      <div class="statuses" style="justify-content:center;">
        <span class="status-chip sum-chip">Floor reached: <b class="sum-count" data-to="${S.floorIdx+1}">${S.floorIdx+1}</b>/3</span>
        <span class="status-chip sum-chip">Turns taken: <b class="sum-count" data-to="${st.turnsTaken}">${st.turnsTaken}</b></span>
        <span class="status-chip sum-chip">Damage dealt: <b class="sum-count" data-to="${Math.round(st.damageDealt)}">${Math.round(st.damageDealt)}</b></span>
        <span class="status-chip sum-chip">Encounters defeated: <b class="sum-count" data-to="${st.encountersDefeated}">${st.encountersDefeated}</b></span>
        <span class="status-chip sum-chip">Shrines visited: <b class="sum-count" data-to="${st.shrinesVisited}">${st.shrinesVisited}</b></span>
        <span class="status-chip sum-chip">Damage blocked: <b class="sum-count" data-to="${st.damageBlocked||0}">${st.damageBlocked||0}</b></span>
        <span class="status-chip sum-chip">Overkills: <b class="sum-count" data-to="${st.overkills}">${st.overkills}</b></span>
        <span class="status-chip sum-chip">Loot Dice collected: <b class="sum-count" data-to="${st.lootCollected}">${st.lootCollected}</b></span>
        ${(S.relics||[]).map(id=>`<span class="status-chip">Relic: ${relicById(id).name}</span>`).join('')}
      </div>
    </div>`;
}

// Run-end consent card for automatic play data (Oct 15). Shown until the player answers; only when uploads are set up.
function shareDataAskHTML(){
  if(!PLAYDATA_URL || shareDataPref()) return '';
  return `<div class="share-ask" id="share-ask">
      <p><strong>Help balance the game?</strong> Send how each run went (rooms, dice, what beat you) automatically. No names or personal info. You can turn it off in Settings.</p>
      <div class="small-btn-row" style="justify-content:center;"><button class="primary" onclick="shareDataAnswer(true)">Yes, share</button><button onclick="shareDataAnswer(false)">No thanks</button></div>
    </div>`;
}
function shareDataAnswer(on){
  setShareData(on);
  const box = document.getElementById('share-ask');
  if(box) box.innerHTML = `<p class="hint" style="margin:0;">${on ? 'Thanks! Your runs will be sent automatically.' : 'No problem. Nothing will be sent.'}</p>`;
}

// Settings -> Export Play Data: nothing is uploaded; this just packages the
// on-device telemetry (see buildPlayDataExport(), logic.js) as a file to
// download, or as text to copy when downloads are blocked (e.g. inside an
// embedded page).
function openExportDataModal(){
  const data = buildPlayDataExport();
  let json = JSON.stringify(data, null, 1);
  const runCount = data.runs.length + (data.inProgress ? 1 : 0);
  const overlay = el(`<div class="modal-overlay"><div class="modal" style="text-align:center; max-width:340px;">
      <button class="modal-x-btn" id="export-x-btn" title="Close">✕</button>
      <h2 style="margin-top:0;">Export Play Data</h2>
      <p class="hint" style="text-align:left;">Helps balance the game. This makes a small file of how your runs went (rooms, loot picks, what beat you). It has no personal info, and <strong>nothing is sent anywhere</strong> unless you choose to share the file.</p>
      <p class="hint">${runCount} run${runCount===1?'':'s'} recorded &middot; ${(json.length/1024).toFixed(0)} KB</p>
      <textarea id="export-note" class="paper-input" maxlength="1500" placeholder="Anything to tell the developer? (too hard, confusing, bug, favorite moment...)" style="width:100%; height:64px; font-size:13px; box-sizing:border-box; margin-bottom:8px;"></textarea>
      <div class="small-btn-row" style="justify-content:center; flex-direction:column;">
        <button class="primary" id="export-download-btn">Download File</button>
        <button id="export-copy-btn" class="btn-export">Copy to Clipboard</button>
        <button id="export-close-btn">Close</button>
      </div>
      <p class="hint" id="export-status" style="min-height:1.2em;"></p>
      <textarea id="export-text" class="paper-input" readonly style="display:none; width:100%; height:110px; font-size:10px;"></textarea>
    </div></div>`);
  openModal(overlay);
  const close = ()=> closeModal(overlay);
  overlay.querySelector('#export-x-btn').onclick = close;
  overlay.querySelector('#export-close-btn').onclick = close;
  overlay.onclick = (ev)=>{ if(ev.target===overlay) close(); };
  const status = overlay.querySelector('#export-status');
  const ta = overlay.querySelector('#export-text');
  const noteEl = overlay.querySelector('#export-note');
  const refreshJson = ()=>{ data.testerNote = noteEl.value.trim(); json = JSON.stringify(data, null, 1); };
  const showText = (msg)=>{ refreshJson(); ta.style.display='block'; ta.value = json; ta.focus(); ta.select(); status.textContent = msg; };
  overlay.querySelector('#export-download-btn').onclick = ()=>{
    try{
      refreshJson();
      const blob = new Blob([json], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `dungeon-scramble-playdata-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 4000);
      // Embedded viewers (e.g. a hosted preview page) silently swallow downloads, so
      // never claim success -- always offer the text for copying alongside.
      showText('If a file didn\'t appear, copy the text below instead.');
    } catch(e){ showText('Downloads are blocked here. Copy the text below instead.'); }
  };
  overlay.querySelector('#export-copy-btn').onclick = ()=>{
    const fallback = ()=> showText('Copy the text below (Select All, then Copy).');
    refreshJson();
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(json).then(()=>{ status.textContent = 'Copied! Paste it into a message to the developer.'; }, fallback);
      } else fallback();
    } catch(e){ fallback(); }
  };
}

function renderVictory(){
  if(!S.gameOverRecorded){
    S.gameOverRecorded = true;
    recordRunHistory('victory');
    S.newAchievements = recordMetaProgress('victory');
    clearSave();
    if(typeof musicSting==='function') musicSting('win'); else playTone('grandVictory'); // Oct 13: the run-win sting
    if(typeof spawnConfettiRain==='function') spawnConfettiRain();
    if(S.newOriginRelic) setTimeout(()=>{ if(typeof playTone==='function') playTone('relicProc'); }, 700);
  }
  app.innerHTML = endScreenHTML({ outcome:'victory', title:'Dungeon Conquered!', lede:'You defeated the Big Boss and cleared all three floors. Well fought, Adventurer.',
    seal:depthSealHTML(), relic:originRelicEarnedHTML(), again:'Play Again' });
  wireRunCard('victory');
}
function renderGameOver(){
  if(!S.gameOverRecorded){
    S.gameOverRecorded = true;
    recordRunHistory('defeat');
    S.newAchievements = recordMetaProgress('defeat');
    clearSave();
    if(typeof musicSting==='function') musicSting('lose'); else playTone('defeat'); // Oct 13: the defeat sting
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
      const countBadge = g.count>1 ? `<span class="swap-count-badge">${g.count}</span>` : '';
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
  app.innerHTML = endScreenHTML({ outcome:'defeat', title:'Defeated', lede:'Your Adventurer retreats to town in temporary defeat...',
    note:carryNote, seal:'', relic:'', again:'Try Again' });
  wireRunCard('defeat');
}

// A short "New Achievement" callout block for the post-run screens (shown
// once, right after recordMetaProgress() returns any newly-unlocked
// entries). Plain inline HTML rather than a modal/toast -- the player is
// already looking at a dedicated end-of-run screen, so this just adds to
// it rather than interrupting with another popup.
// Dice that reached BOON_COPIES_NEEDED copies during this run and so can now be chosen as a Starting Boon.
function newBoonsHTML(){
  const names = (S.newBoonDice||[]).filter((n,i,a)=>a.indexOf(n)===i);
  if(!names.length) return '';
  const tiersOpen = unlockedBoonTiers();
  const rows = names.map(n=>{
    const tier = Object.keys(BOON_TIER_POOLS).find(t=>BOON_TIER_POOLS[t].some(d=>d.name===n));
    const open = !tier || tiersOpen.includes(tier);
    return `<div class="achv-unlock-row"><span class="achv-unlock-icon">✦</span><div>
       <div class="achv-unlock-name">${n}</div>
       <div class="achv-unlock-desc">${open ? 'Now available as a Starting Boon on the setup screen.' : `Collected ${BOON_COPIES_NEEDED} times. It becomes a Starting Boon once the ${BOON_TIER_LABELS[tier]} tier unlocks.`}</div>
     </div></div>`; }).join('');
  return `<div class="achv-unlock-box">
      <div class="achv-unlock-title">Starting Boon${names.length>1?'s':''} unlocked!</div>
      ${rows}
    </div>`;
}
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
