// Trailer soundtrack (Nov 25, Jeremy: music timed to the big moments): the game's own synth music and sound effects,
// rendered offline (OfflineAudioContext, sample-accurate) in the game page. The sound calls trailer.js logged while
// recording each scene are replayed at their exact times in the cut; the music follows the story:
//   title: the theme, quiet | first fight: dungeon downtime | foe rule: the tense 'mid' version | boss: full action with
//   drums (fill into it on the cut) | loot: back to downtime, under the kill chime | victory: the win fanfare | end card:
//   the theme again, fading out.
// usage (from tools/media, after trailer.js): node trailer_audio.js -> cast/trailer/soundtrack.wav; trailer_mk.py muxes it.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const D = process.env.VERT ? 'cast/trailer_v' : 'cast/trailer';
const RATE = fs.existsSync(path.join(D, 'meta.json')) ? (JSON.parse(fs.readFileSync(path.join(D, 'meta.json'))).rate || 1) : 1; // slow-motion capture
const SCENES = ['1_title', '2_turn', '3_rule', '4_boss', '5_loot', '6_victory'];
const END_CARD = 3;
// scene start times in the cut (same durations trailer_mk.py uses)
let at = 0; const starts = {}, events = [];
for(const s of SCENES){
  const t = JSON.parse(fs.readFileSync(path.join(D, s, 'times.json'))); if(!t.length) continue;
  const dur = t.length < 3 ? 2.5 : (t[t.length-1] - t[0])*RATE; starts[s] = at;
  const snd = fs.existsSync(path.join(D, s, 'sounds.json')) ? JSON.parse(fs.readFileSync(path.join(D, s, 'sounds.json'))) : [];
  // musicSting/musicChime come from the cue sheet below (the music needs to know about them); the rest replay as they were
  snd.forEach(e=>{ const rel = (e.t - t[0])*RATE; if(rel >= 0 && rel <= dur) events.push({ t: at + rel, fn: e.fn, args: e.args }); });
  at += dur;
}
const total = at + END_CARD;
fs.writeFileSync(path.join(D, 'cuts.json'), JSON.stringify({ starts, total }));
(async()=>{
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///home/user/dungeon-scramble/dist/release/dungeon_scramble.html'); await p.waitForTimeout(800);
  const wav = await p.evaluate(async ({ events, starts, total })=>{
    const SR = 44100, off = new OfflineAudioContext(2, Math.ceil(total*SR), SR);
    audioCtx = off; sfxBus = null; PREFS.sound = true; PREFS.music = true; PREFS.sfxVol = 0.8; PREFS.musicVol = 1;
    newGame('dwarf','arcanist'); // the sound functions read a few run fields
    const cues = [];
    const q = t => Math.max(0, Math.round(t*SR/128)*128/SR); // suspend points must sit on 128-sample boundaries
    const add = (t, run)=> cues.push({ t:q(t), run });
    const S0 = starts;
    // music story
    // the theme straight into its melody block (no 2.5 s fade-in, no bass-only intro): a trailer opens with a hook
    const themeNow = block => { musicStart('theme','theme'); clearInterval(Music.timer); const t = off.currentTime, bl = Music.blockBeats*musicSpb();
      Music.origin = t - block*bl; Music.gain.gain.cancelScheduledValues(0); Music.gain.gain.setValueAtTime(musicVolume(), t); };
    // Nov 25 (Jeremy: change the music less often, a build-up then a crescendo): one dungeon piece that only builds --
    // the lonely bass fades in under the title, the melody joins on the first fight (the arrangement's 'loud' round is
    // lined up to start there), the pumping tension version arrives for the rule fight, the full boss music with drums
    // is the crescendo and carries through the loot into the win fanfare; the bass alone returns under the end card.
    add(0.02, ()=>{ musicStart('dungeon','down'); clearInterval(Music.timer); const bl = Music.blockBeats*musicSpb(); Music.origin = S0['2_turn'] - 2*bl;
      // the swell: soft under the title, louder at each stage, full at the boss (the arrangement adds parts on top)
      const v = musicVolume(), G = Music.gain.gain; G.cancelScheduledValues(0); G.setValueAtTime(0.0001, 0); G.linearRampToValueAtTime(0.35*v, 0.8);
      G.linearRampToValueAtTime(0.5*v, S0['2_turn']); G.linearRampToValueAtTime(0.7*v, S0['3_rule']); G.linearRampToValueAtTime(0.85*v, S0['4_boss'] - 0.3);
      G.linearRampToValueAtTime(1.0*v, S0['4_boss'] + 2); });
    add(S0['3_rule'] - 0.4, ()=> musicSwitch('mid'));
    add(S0['4_boss'] - 1.2, ()=>{ musicSwitch('act'); musicSetDrums(true); }); // the fill leads into the boss on the next bar
    add(S0['6_victory'] + 0.05, ()=> musicSting('win'));
    add(total - 3.0, ()=>{ musicStart('dungeon','down'); clearInterval(Music.timer); });
    // the music's look-ahead scheduler, driven by the offline clock
    for(let t = 0.1; t < total; t += 0.2) add(t, ()=>{ if(Music.on) musicTick(); });
    // the game's own sound effects, as recorded
    events.forEach(e=> add(e.t, ()=>{ if(e.fn==='musicSting' || e.fn==='musicChime'){ if(e.fn==='musicChime') musicChime(...e.args); return; } const f = window[e.fn]; if(typeof f==='function') f(...e.args); }));
    const byT = new Map(); cues.forEach(c=>{ if(!byT.has(c.t)) byT.set(c.t, []); byT.get(c.t).push(c.run); });
    [...byT.keys()].sort((a,b)=>a-b).forEach(t=>{ if(t >= total) return;
      off.suspend(t).then(()=>{ byT.get(t).forEach(run=>{ try{ run(); }catch(err){} }); off.resume(); }); });
    const buf = await off.startRendering();
    // 16-bit stereo WAV
    const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1), out = new DataView(new ArrayBuffer(44 + n*4));
    const w = (o, s)=>{ for(let i=0;i<s.length;i++) out.setUint8(o+i, s.charCodeAt(i)); };
    w(0,'RIFF'); out.setUint32(4, 36+n*4, true); w(8,'WAVE'); w(12,'fmt '); out.setUint32(16,16,true); out.setUint16(20,1,true); out.setUint16(22,2,true);
    out.setUint32(24,SR,true); out.setUint32(28,SR*4,true); out.setUint16(32,4,true); out.setUint16(34,16,true); w(36,'data'); out.setUint32(40,n*4,true);
    for(let i=0;i<n;i++){ out.setInt16(44+i*4, Math.max(-1,Math.min(1,L[i]))*32767, true); out.setInt16(46+i*4, Math.max(-1,Math.min(1,R[i]))*32767, true); }
    const bytes = new Uint8Array(out.buffer); let s = ''; for(let i=0;i<bytes.length;i+=0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i+0x8000));
    return btoa(s);
  }, { events, starts, total });
  fs.writeFileSync(path.join(D, 'soundtrack.wav'), Buffer.from(wav, 'base64'));
  console.log('soundtrack.wav', total.toFixed(1)+'s', events.length, 'game sounds', JSON.stringify(starts));
  await b.close();
})();
