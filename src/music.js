/* ============================================================
   MUSIC (v1.39.5, Jeremy Oct 13) -- the game's own synth plays the
   music from note data (no audio files: a few KB, any arrangement free).
   Notes come from tools/music/make_sketches.py (docs/music/sketches.json);
   voices match docs/music/preview.html: an NES-style triangle bass and a
   toy-accordion melody (Jeremy's pick). A track is 8-bar blocks; `arrangement` lists which
   parts play in each block, cycling. Off with the Music switch in Settings.
   ============================================================ */
const MUSIC_TRACKS = {
  // Floor 1 downtime sketch (05): D harmonic minor, 140 bpm. Jeremy: bass alone twice, then bass + melody.
  downtime1: { bpm:140, beats:32, arrangement:[['bass'],['bass'],['bass','lead']],
    parts:{ bass:[[0,2.91,38,78],[3.0,0.97,33,78],[4,1.94,38,74],[6.0,0.97,41,74],[7.0,0.97,40,74],[8,2.91,34,76],[11.0,0.97,41,76],[12,1.94,33,74],[14.0,0.97,37,74],[15.0,0.97,40,74],[16,2.91,38,78],[19.0,0.97,33,78],[20,1.94,38,74],[22.0,0.97,41,74],[23.0,0.97,40,74],[24,2.91,34,76],[27.0,0.97,41,76],[28,1.94,33,74],[30.0,0.97,37,74],[31.0,0.97,40,74]],
             lead:[[0,0.108,70,57],[0,1.8,69,72],[2.0,0.9,65,72],[3.0,0.9,64,72],[4,2.7,62,68],[7.88,0.108,76,59],[8,1.35,74,74],[9.5,0.45,70,74],[10.0,1.8,69,74],[12,0.9,67,74],[13.0,0.9,65,74],[14.0,0.45,70,74],[14.38,0.108,74,59],[14.5,1.35,73,74],[15.88,0.108,76,61],[16,1.8,74,76],[18.0,0.45,73,76],[18.5,0.45,70,76],[19.0,0.9,69,76],[20,0.9,69,70],[21.0,0.45,70,70],[21.5,0.45,69,70],[22.0,0.9,67,70],[23.0,0.9,65,70],[24,0.9,65,68],[25.0,1.8,62,68],[27.0,0.9,65,68],[28,0.9,64,66],[29.0,0.45,65,66],[29.5,0.45,64,66],[30.0,1.8,61,66]] } },
};
const MUSIC_VOLUME = 0.55;
const Music = { id:null, timer:null, gain:null, block:0, blockStart:0, events:null, idx:0 };
function musicCtx(){ // music plays even with sound effects off, so it doesn't go through getAudioCtx()'s Sound check
  if(!audioCtx){ const C = window.AudioContext || window.webkitAudioContext; if(!C) return null; try{ audioCtx = new C(); }catch(e){ return null; } }
  if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{});
  return audioCtx;
}
function musicStart(id){
  if(Music.id===id && Music.timer) return;
  musicStop(true);
  const ctx = musicCtx(); if(!ctx || !MUSIC_TRACKS[id]) return;
  Music.id = id; Music.block = 0; Music.events = null; Music.idx = 0;
  Music.gain = ctx.createGain(); Music.gain.connect(ctx.destination);
  const t = ctx.currentTime + 0.1;
  Music.gain.gain.setValueAtTime(0.0001, t); Music.gain.gain.exponentialRampToValueAtTime(MUSIC_VOLUME, t + 2.5); // gentle fade-in
  Music.blockStart = t;
  musicTick(); Music.timer = setInterval(musicTick, 50);
}
function musicStop(fast){
  clearInterval(Music.timer); Music.timer = null;
  const g = Music.gain, ctx = audioCtx; Music.gain = null; Music.id = null;
  if(g && ctx){ const t = ctx.currentTime; try{ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t); g.gain.exponentialRampToValueAtTime(0.0001, t + (fast?0.15:0.8)); setTimeout(()=>{ try{ g.disconnect(); }catch(e){} }, 1200); }catch(e){} }
}
// Look-ahead scheduler: queues the notes due in the next 0.3 s, block by block.
function musicTick(){
  const ctx = audioCtx, T = MUSIC_TRACKS[Music.id]; if(!ctx || !T || !Music.gain) return;
  const spb = 60/T.bpm, blockLen = T.beats*spb, ahead = ctx.currentTime + 0.3;
  if(Music.blockStart + blockLen < ctx.currentTime - 1){ // fell far behind (tab was throttled): jump to now
    const skip = Math.floor((ctx.currentTime - Music.blockStart)/blockLen); Music.block += skip; Music.blockStart += skip*blockLen; Music.events = null; Music.idx = 0; }
  for(let guard=0; guard<500; guard++){
    if(!Music.events){
      const parts = T.arrangement[Music.block % T.arrangement.length];
      Music.events = parts.flatMap(p=>(T.parts[p]||[]).map(n=>({t:n[0], d:n[1], p:n[2], v:n[3], role:p}))).sort((a,b)=>a.t-b.t);
      Music.idx = 0;
    }
    if(Music.idx >= Music.events.length){ Music.block++; Music.blockStart += blockLen; Music.events = null; continue; }
    const e = Music.events[Music.idx], at = Music.blockStart + e.t*spb;
    if(at > ahead) break;
    if(at >= ctx.currentTime - 0.02) (e.role==='bass' ? musicBass : musicLead)(ctx, e.p, at, e.d*spb, e.v);
    Music.idx++;
  }
}
function musicBass(ctx, p, t, d, v){ // NES-style triangle: square-cornered envelope, no filter
  const o = ctx.createOscillator(), g = ctx.createGain(), k = v/127;
  o.type = 'triangle'; o.frequency.value = 440*Math.pow(2,(p-69)/12);
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.42*k,t+0.004); g.gain.setValueAtTime(0.42*k,t+Math.max(0.01,d-0.02)); g.gain.linearRampToValueAtTime(0.0001,t+d);
  o.connect(g).connect(Music.gain); o.start(t); o.stop(t+d+0.02);
}
function musicLead(ctx, p, t, d, v){ // toy accordion (preview's 'Toy accordion'): bright filtered saw with a quick vibrato on long notes
  const f = 440*Math.pow(2,(p-69)/12), k = v/127;
  const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = f*5; lp.Q.value = 1.2;
  vib.frequency.value = 6.5; vg.gain.setValueAtTime(0,t); vg.gain.linearRampToValueAtTime(d>0.5 ? f*0.012 : 0, t+Math.min(0.35,d)); vib.connect(vg).connect(o.frequency);
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.16*k,t+0.02); g.gain.setValueAtTime(0.16*k,t+Math.max(0.03,d-0.03)); g.gain.linearRampToValueAtTime(0.0001,t+d+0.04);
  o.connect(lp).connect(g).connect(Music.gain); o.start(t); vib.start(t); o.stop(t+d+0.08); vib.stop(t+d+0.08);
}
// Which music fits the current screen (called after every render): the downtime sketch through a run for now.
function musicUpdate(){
  try{
    const want = (PREFS.music!==false && typeof S!=='undefined' && S && S.screen && S.screen!=='gameover' && S.screen!=='victory' && !document.hidden) ? 'downtime1' : null;
    if(want){ if(Music.id!==want) musicStart(want); } else if(Music.id) musicStop();
  }catch(e){}
}
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) musicStop(true); else musicUpdate(); });
