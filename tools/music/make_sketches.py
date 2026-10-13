# Music sketches for Jeremy (Oct 12): original bass ostinatos and melody sketches as MIDI for GarageBand,
# plus the same notes as JSON for the preview page (docs/music/preview.html).
# Direction: toy-like; a lonely, driving bass in the spirit of the Zelda II Palace theme (original lines, not
# a copy); klezmer melody in harmonic minor (sad in downtime, frantic in action).
# usage: python3 tools/music/make_sketches.py   (no dependencies; writes docs/music/midi/*.mid + docs/music/sketches.json)
import json, os, struct
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'music')
PPQ = 480

# ---- note names -> MIDI numbers (C4 = 60) ----
NAMES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def n(s):
    p, o = (s[:2], s[2:]) if len(s) > 2 and s[1] in '#b' else (s[:1], s[1:])
    return 12 * (int(o) + 1) + NAMES[p]

# ---- tiny pattern language ----
# seq("D2 D3 D2 D3", step=0.5) -> notes every `step` beats; '.' = rest, '-' = tie (extend previous note)
# a leading '!' accents the note (higher velocity); a leading '~' adds a krekhts grace note from a step above.
def seq(text, step, start=0.0, vel=84, acc=110, gate=0.9, scale=None):
    out = []; t = start
    for tok in text.split():
        if tok == '.': t += step; continue
        if tok == '-':
            if out: out[-1]['d'] += step
            t += step; continue
        v = vel; grace = False
        while tok[0] in '!~':
            if tok[0] == '!': v = acc
            if tok[0] == '~': grace = True
            tok = tok[1:]
        p = n(tok)
        if grace and scale:
            above = min(x for x in scale_notes(scale) if x > p)
            if t >= 0.12:
                if out and out[-1]['t'] + out[-1]['d'] * gate > t - 0.12:  # let the previous note end before the grace starts
                    out[-1]['d'] = max(0.05, (t - 0.12 - out[-1]['t']) / gate)
                out.append({'t': t - 0.12, 'd': 0.12, 'p': above, 'v': v - 15})
            else:  # no room before the note (start of a loop): play the grace first, then the note, so they never overlap
                out.append({'t': t, 'd': 0.12, 'p': above, 'v': v - 15}); out.append({'t': t + 0.12, 'd': step - 0.12, 'p': p, 'v': v}); t += step; continue
        out.append({'t': t, 'd': step, 'p': p, 'v': v}); t += step
    for x in out: x['g'] = gate
    return out

SCALES = {  # pitch classes
    'D harmonic minor': [2, 4, 5, 7, 9, 10, 1],          # D E F G A Bb C#
    'A freygish': [9, 10, 1, 2, 4, 5, 7],                 # A Bb C# D E F G (5th mode of D harmonic minor)
}
def scale_notes(name): return [p for p in range(0, 128) if p % 12 in SCALES[name]]

def bars(*parts):  # join per-bar sequences: each part is (text, step); bar length 4 beats
    out = []
    for i, (text, step, kw) in enumerate(parts):
        out += seq(text, step, start=4 * i, **kw)
    return out
def B(text, step=0.5, **kw): return (text, step, kw)

def loop(notes, times, length):
    return [dict(x, t=x['t'] + k * length) for k in range(times) for x in notes]

# ---- the sketches ----
HM = 'D harmonic minor'
# Shared harmony for the D minor sketches (4 bars): Dm | Dm | Bb | A  -- so any bass layers with any melody.
pump = bars(B('!D2 D3 D2 D3 !C#3 D3 A2 F2'), B('!D2 D3 D2 D3 !E3 F3 E3 C#3'),
            B('!Bb1 Bb2 Bb1 Bb2 !A2 Bb2 F2 D2'), B('!A1 A2 A1 A2 !C#3 E3 C#3 A2'))
stairs = bars(B('!D3 A2 F2 A2 D3 A2 F2 A2'), B('!F3 D3 A2 D3 F3 D3 A2 C#3'),
              B('!D3 Bb2 F2 Bb2 D3 Bb2 F2 Bb2'), B('!C#3 A2 E2 A2 !E3 C#3 A2 E2'))
lonely = bars(B('D2 - - - - - A1 -', vel=78, gate=0.97), B('D2 - - - F2 - E2 -', vel=74, gate=0.97),
              B('Bb1 - - - - - F2 -', vel=76, gate=0.97), B('A1 - - - C#2 - E2 -', vel=74, gate=0.97))
# Bulgar: 3+3+2 accents (eighth-note slots 1, 4, 7), A freygish; harmony A | A | Gm | A
bulgar = bars(B('!A1 A2 A2 !A1 A2 A2 !C#2 E2'), B('!A1 A2 A2 !A1 A2 A2 !Bb1 A1'),
              B('!G1 G2 G2 !G1 G2 G2 !Bb1 D2'), B('!A1 A2 A2 !Bb1 Bb2 Bb2 !A1 .'))

# Sad (downtime) melody over the D minor harmony, 8 bars: long notes, krekhts sobs (~), the Bb -> C# augmented second.
sad = bars(B('~A4 - - - F4 - E4 -', vel=72, scale=HM), B('D4 - - - - - . .', vel=68),
           B('~D5 - - Bb4 A4 - - -', vel=74, scale=HM), B('G4 - F4 - Bb4 ~C#5 - -', vel=74, scale=HM),
           B('~D5 - - - C#5 Bb4 A4 -', vel=76, scale=HM), B('A4 - Bb4 A4 G4 - F4 -', vel=70),
           B('F4 - D4 - - - F4 -', vel=68), B('E4 - F4 E4 C#4 - - -', vel=66))
# Frantic (action) melody over the same 8 bars: running eighths and sixteenths, same scale.
frantic = (seq('!D5 A4 D5 E5 F5 E5 D5 C#5', 0.5, 0) +
           seq('!D5 E5 F5 G5 A5 G5 F5 E5 F5 E5 D5 C#5', 0.25, 4) + seq('D5 A4', 0.5, 7) +
           seq('!Bb4 D5 F5 D5 Bb4 D5 F5 A5', 0.5, 8) +
           seq('!G5 F5 E5 F5 E5 D5 C#5 D5', 0.25, 12) + seq('C#5 Bb4', 0.5, 14) + seq('!A4', 1, 15) +
           seq('!D5 D5 A4 D5 F5 F5 E5 D5', 0.5, 16) +
           seq('!E5 F5 G5 A5 !Bb5 A5 G5 F5', 0.5, 20) +
           seq('!F5 D5 Bb4 D5 G5 F5 E5 D5', 0.5, 24) +
           seq('!C#5 E5 A5 E5', 0.5, 28) + seq('G5 F5 E5 D5', 0.25, 30) + seq('!C#5', 1, 31))
for x in frantic: x['v'] = min(120, x['v'] + 6)
# Toy percussion for the action sketch (GM drum notes): kick 36, snare 38 (soft), woodblock 76/77, tambourine 54.
def perc_bar(b):
    t0 = 4 * b; d = []
    for k in (0, 2): d.append({'t': t0 + k, 'd': 0.25, 'p': 36, 'v': 100})
    for k in (1, 3): d.append({'t': t0 + k, 'd': 0.25, 'p': 38, 'v': 62})
    for k in range(8): d.append({'t': t0 + k * 0.5, 'd': 0.2, 'p': 76 if k % 2 == 0 else 77, 'v': 70 if k % 2 == 0 else 52})
    for k in (0.5, 1.5, 2.5, 3.5): d.append({'t': t0 + k, 'd': 0.2, 'p': 54, 'v': 48})
    return d
perc = [x for b in range(8) for x in perc_bar(b)]
for x in perc: x['g'] = 1.0

SKETCHES = [
    # (file, title, key/mode, bpm, beats, [(track name, GM program, channel, role, notes)], notes for Jeremy)
    ('01_bass_palace_pump_Dm_140', 'Bass 1: Palace pump', 'D harmonic minor', 140, 16,
     [('Bass', 38, 0, 'bass', pump)],
     'Driving octave eighths that never rest; the C# leading tone and a turn at the end of each bar keep it uneasy. Harmony Dm | Dm | Bb | A.'),
    ('02_bass_stairs_Dm_140', 'Bass 2: Stairs', 'D harmonic minor', 140, 16,
     [('Bass', 38, 0, 'bass', stairs)],
     'Broken chords stepping down and back (Dm | Dm | Bb | A, same as Bass 1); lighter and more toy-like, good under a busy melody.'),
    ('03_bass_bulgar_Afreygish_140', 'Bass 3: Bulgar', 'A freygish', 140, 16,
     [('Bass', 38, 0, 'bass', bulgar)],
     'Klezmer bulgar rhythm, accents on eighths 1, 4 and 7 (3+3+2). Freygish = D harmonic minor centered on A, so it shares notes with the others.'),
    ('04_bass_lonely_Dm_140', 'Bass 4: Lonely (downtime)', 'D harmonic minor', 140, 16,
     [('Bass', 38, 0, 'bass', lonely)],
     'The downtime version: same tempo and harmony as Bass 1, mostly held notes with gaps, so it reads as half-time and alone.'),
    ('05_downtime_sketch_Dm_140', 'Downtime sketch (sad)', 'D harmonic minor', 140, 32,
     [('Bass', 38, 0, 'bass', loop(lonely, 2, 16)), ('Melody', 71, 1, 'lead', sad)],
     'Lonely bass + a sad doina-like line with krekhts sobs (the short grace notes from above) and the Bb -> C# augmented second.'),
    ('06_action_sketch_Dm_140', 'Action sketch (frantic)', 'D harmonic minor', 140, 32,
     [('Bass', 38, 0, 'bass', loop(pump, 2, 16)), ('Melody', 71, 1, 'lead', frantic), ('Toy drums', 0, 9, 'drums', perc)],
     'Palace-pump bass + a frantic freylekhs-style line + toy percussion. Same tempo, key and length as the downtime sketch, so the two can crossfade in-game.'),
]

# ---- MIDI writer (format 1) ----
def vlq(x):
    b = [x & 0x7f]; x >>= 7
    while x: b.append((x & 0x7f) | 0x80); x >>= 7
    return bytes(reversed(b))
def track(events):  # events: (tick, bytes)
    events.sort(key=lambda e: (e[0], e[2] if len(e) > 2 else 0)); out = b''; last = 0
    for e in events: out += vlq(e[0] - last) + e[1]; last = e[0]
    out += vlq(0) + b'\xff\x2f\x00'
    return b'MTrk' + struct.pack('>I', len(out)) + out
def meta_name(s): s = s.encode(); return b'\xff\x03' + vlq(len(s)) + s
def write_mid(path, bpm, beats, parts, title):
    t0 = [(0, meta_name(title)), (0, b'\xff\x51\x03' + (60000000 // bpm).to_bytes(3, 'big')), (0, b'\xff\x58\x04\x04\x02\x18\x08'),
          (int(beats * PPQ), b'\xff\x06' + vlq(4) + b'loop')]
    chunks = [track(t0)]
    for name, prog, ch, role, notes in parts:
        ev = [(0, meta_name(name))]
        if ch != 9: ev.append((0, bytes([0xC0 | ch, prog])))
        for x in notes:
            on = int(round(x['t'] * PPQ)); off = on + max(1, int(round(x['d'] * x.get('g', 0.9) * PPQ)))
            ev.append((on, bytes([0x90 | ch, x['p'], x['v']]), 1)); ev.append((off, bytes([0x80 | ch, x['p'], 0]), 0))
        chunks.append(track(ev))
    with open(path, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 1, len(chunks), PPQ) + b''.join(chunks))

os.makedirs(os.path.join(ROOT, 'midi'), exist_ok=True)
js = []
for fn, title, key, bpm, beats, parts, note in SKETCHES:
    write_mid(os.path.join(ROOT, 'midi', fn + '.mid'), bpm, beats, parts, title)
    js.append(dict(id=fn, title=title, key=key, bpm=bpm, beats=beats, note=note,
                   parts=[dict(name=p[0], role=p[3], notes=[[round(x['t'], 3), round(x['d'] * x.get('g', 0.9), 3), x['p'], x['v']] for x in p[4]]) for p in parts]))
json.dump(js, open(os.path.join(ROOT, 'sketches.json'), 'w'))
print('\n'.join(s[0] for s in SKETCHES))
# preview page: the template with the sketch notes embedded
tpl = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'preview_template.html')).read()
open(os.path.join(ROOT, 'preview.html'), 'w').write(tpl.replace('__SKETCHES__', json.dumps(js)))
# One part per file for the multi-part sketches (GarageBand on iPad may put every part of a multi-track file on one track).
os.makedirs(os.path.join(ROOT, 'midi', 'parts'), exist_ok=True)
for fn, title, key, bpm, beats, parts, note in SKETCHES:
    if len(parts) < 2: continue
    for part in parts:
        write_mid(os.path.join(ROOT, 'midi', 'parts', '%s__%s.mid' % (fn, part[0].lower().replace(' ', '_'))), bpm, beats, [part], '%s: %s' % (title, part[0]))
