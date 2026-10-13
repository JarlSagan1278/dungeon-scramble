# Builds docs/music/game_music.html: every piece of the game's music on one page, played by the game's own
# music engine (src/music.js, copied in verbatim) so the preview sounds exactly like the game.
# usage: python3 tools/music/build_game_preview.py   (run after any change to src/music.js)
import os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
engine = open(os.path.join(ROOT, 'src/music.js')).read()
render = open(os.path.join(ROOT, 'src/render.js')).read()
# the three loot-burst chords, straight from the game's sound table
bursts = '\n'.join(re.findall(r"  lootBurst\w+:\s*\[.*?\],\n(?=  [a-zA-Z/])", render, re.S))
html = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dungeon Scramble Music</title>
<style>
:root{ --bg:#2a1d14; --panel:#e8d3ac; --ink:#2a1d14; --line:#120b06; --muted:#6b5238; --go:#5c8a3a; --stop:#b8432f; --alt:#7a4fa0; --gold:#e8b23a; --chip:#f6e8c8; }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ --bg:#1a120c; --panel:#d9c39a; } }
:root[data-theme="dark"]{ --bg:#1a120c; --panel:#d9c39a; }
*{ box-sizing:border-box; }
body{ margin:0; background:var(--bg); color:var(--ink); font:16px/1.45 Georgia,"Times New Roman",serif; }
main{ max-width:560px; margin:0 auto; padding:16px; }
h1{ color:var(--panel); font-size:24px; margin:4px 0 2px; }
.sub{ color:#cdb48a; font-size:14px; margin:0 0 14px; }
.card{ background:var(--panel); border:3px solid var(--line); border-radius:14px; padding:12px 14px; margin:0 0 14px; box-shadow:0 4px 0 var(--line); }
.card h2{ font-size:18px; margin:0 0 4px; }
.note{ font-size:14px; margin:4px 0 10px; color:#3a2a1c; }
.row{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
button{ font:inherit; font-weight:700; font-size:15px; border:3px solid var(--line); border-radius:10px; padding:7px 12px; cursor:pointer; color:#fff8ea; background:var(--go); box-shadow:0 3px 0 var(--line); }
button.alt{ background:var(--alt); } button.gold{ background:var(--gold); color:var(--ink); } button.on{ background:var(--stop); }
button:active{ transform:translateY(2px); box-shadow:0 1px 0 var(--line); }
.seg button{ background:var(--chip); color:var(--ink); } .seg button.sel{ background:var(--gold); }
.state{ font-weight:700; font-size:14px; }
#stopall{ position:sticky; top:8px; z-index:5; width:100%; margin-bottom:12px; background:var(--stop); }
</style></head><body><main>
<h1>Dungeon Scramble: game music</h1>
<p class="sub">Played by the game's own music code, so this is exactly what the game plays. Tap anything to start; sound must be on.</p>
<button id="stopall">Stop all music</button>
<div class="card">
  <h2>Floor</h2>
  <p class="note">The dungeon music, shrine and sound-effect key follow the floor: D minor 140 bpm, E minor 150, F minor 160.</p>
  <div class="row seg" id="floors"><button data-f="0" class="sel">Floor 1</button><button data-f="1">Floor 2</button><button data-f="2">Floor 3</button></div>
</div>
<div class="card">
  <h2>Dungeon: downtime and action</h2>
  <p class="note">Downtime: two rounds of lonely bass, then two with the sad melody. Action (Boss, Elite, Deadly fights) comes in after a 2-beat fill (snare roll, bass walk-up, crash) on the next bar. Boss phase 2 adds drums. "Win the fight" plays the chime and drops back to bass-only downtime.</p>
  <div class="row"><button id="dPlay">Play downtime</button><button class="alt" id="dAct">Fight starts</button><button class="alt" id="dDrums">Boss phase 2</button><button class="gold" id="dWin">Win the fight</button></div>
  <p class="state" id="dState">Stopped</p>
</div>
<div class="card">
  <h2>Victory chimes</h2>
  <p class="note">They land on the next bar line when the dungeon music is playing, otherwise right away.</p>
  <div class="row"><button class="gold" data-chime="regular">Regular</button><button class="gold" data-chime="elite">Elite / Deadly</button><button class="gold" data-chime="boss">Boss</button></div>
</div>
<div class="card">
  <h2>Loot chest burst</h2>
  <p class="note">One chord per loot tier when the chest bursts open.</p>
  <div class="row"><button class="gold" data-burst="lootBurstAlloy">Alloy</button><button class="gold" data-burst="lootBurstGilded">Gilded</button><button class="gold" data-burst="lootBurstMagic">Magic</button></div>
</div>
<div class="card"><h2>Camp lullaby</h2><p class="note">3/4 at 84 bpm: triangle bass, music box, quiet accordion answers.</p><div class="row"><button data-kind="camp">Play camp</button></div></div>
<div class="card"><h2>Shrine</h2><p class="note">A freygish at 96 bpm: a held drone under a glassy melody.</p><div class="row"><button data-kind="shrine">Play shrine</button></div></div>
<div class="card"><h2>Title and end theme</h2><p class="note">80 bars, looping: downtime bass x2, downtime full x2 (ending in the transition fill), action without drums, action + countermelody without drums, action full x2, action bass x2.</p><div class="row"><button data-kind="theme">Play theme</button></div></div>
</main>
<script>
// --- the few game globals the music engine reads ---
var S = { floorIdx:0, screen:'game' };
var PREFS = { music:true, sound:true };
var audioCtx = null;
function encounterTier(){ return 'standard'; }
</script>
<script>
''' + engine + r'''
</script>
<script>
const BURSTS = {
''' + bursts + r'''
};
function playBurst(name){ const ctx = musicCtx(), now = ctx.currentTime, shift = MUSIC_FLOORS[S.floorIdx].shift;
  (BURSTS[name]||[]).forEach(n=>{ const o = ctx.createOscillator(), g = ctx.createGain(), f = n.freq*Math.pow(2,shift/12);
    o.type = n.type; o.frequency.setValueAtTime(f, now+n.start); if(n.freqTo) o.frequency.exponentialRampToValueAtTime(n.freqTo*Math.pow(2,shift/12), now+n.start+n.dur);
    g.gain.setValueAtTime(0.0001, now+n.start); g.gain.linearRampToValueAtTime(n.gain, now+n.start+0.01); g.gain.exponentialRampToValueAtTime(0.0001, now+n.start+n.dur);
    o.connect(g).connect(ctx.destination); o.start(now+n.start); o.stop(now+n.start+n.dur+0.05); }); }
const $ = id => document.getElementById(id), st = $('dState');
function label(){ st.textContent = (Music.on && Music.kind==='dungeon') ? (Music.mode==='act' ? (Music.drums ? 'Action + drums (boss phase 2)' : 'Action') : 'Downtime') + ' · Floor ' + (S.floorIdx+1) + ' · ' + Music.bpm + ' bpm' : (Music.on ? 'Playing: ' + Music.kind : 'Stopped'); }
function dungeon(mode){ musicCtx(); if(!(Music.on && Music.kind==='dungeon')) musicStart('dungeon', mode); else musicSwitch(mode); label(); }
$('dPlay').onclick = ()=>{ dungeon('down'); };
$('dAct').onclick = ()=>{ dungeon('act'); };
$('dDrums').onclick = ()=>{ dungeon('act'); musicSetDrums(true); label(); };
$('dWin').onclick = ()=>{ if(!(Music.on && Music.kind==='dungeon')) dungeon('act'); musicChime(Music.drums ? 'boss' : 'regular'); musicSwitch('down'); musicSetDrums(false); label(); };
document.querySelectorAll('[data-chime]').forEach(b=> b.onclick = ()=>{ musicCtx(); musicChime(b.dataset.chime); });
document.querySelectorAll('[data-burst]').forEach(b=> b.onclick = ()=> playBurst(b.dataset.burst));
document.querySelectorAll('[data-kind]').forEach(b=> b.onclick = ()=>{ musicCtx(); musicStart(b.dataset.kind, b.dataset.kind); label(); });
document.querySelectorAll('#floors button').forEach(b=> b.onclick = ()=>{
  document.querySelectorAll('#floors button').forEach(x=>x.classList.toggle('sel', x===b)); S.floorIdx = +b.dataset.f;
  if(Music.on && (Music.kind==='dungeon' || Music.kind==='shrine')) musicStart(Music.kind, Music.mode); label(); });
$('stopall').onclick = ()=>{ musicStop(); label(); };
// the engine's own screen logic stays out of the way here: the page drives it directly
musicUpdate = function(){};
</script></body></html>
'''
open(os.path.join(ROOT, 'docs/music/game_music.html'), 'w').write(html)
print('ok')
