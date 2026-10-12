# Dungeon Scramble: music spec (draft, Oct 12 2026)

## Direction
- **Overall:** toy-like, over a lonely, driving bass in the spirit of the Zelda II Palace theme: a relentless ostinato that never rests. Ours are original lines in that spirit, not a copy of it.
- **Melody:** klezmer, in harmonic minor.
  - **Downtime:** sad and hopeless.
  - **Action:** frantic and stressful.
- **Workflow:** composed in GarageBand with MIDI.

## Pieces
| Piece | When it plays | Length | Character |
|---|---|---|---|
| Floor 1 downtime | Map, between rooms | 8–16 bar loop | Lonely bass, sparse sad melody, music-box colours |
| Floor 1 action | During fights | Same loop length as downtime | Driving bass, frantic melody, toy percussion |
| Floor 2 downtime / action | Same | Same | Same material, fuller band (see orchestration) |
| Floor 3 downtime / action | Same | Same | Heaviest and fastest |
| Treasure | Loot reveal | 2–3 s sting | Rising arpeggio, ends on a bright major chord |
| Victory | Run won | 4–6 s sting, then an optional loop | Freylekhs that lands on D *major* (see the Picardy third) |
| Camp | Camp screen | 8–16 bar loop | The one gentle piece: slow 3/4, a lullaby over a drone |
| Shrine | Shrine rooms | 8 bar loop | Mysterious: freygish on A over a held drone, glassy sounds |

Optional later: a boss layer (an extra track added on top of that floor's action loop), and a short defeat sting.

## Keys and tempos (a proposal)
| Floor | Key | Tempo | Orchestration (each floor adds to the last) |
|---|---|---|---|
| 1 | D harmonic minor | 140 | Triangle-wave or marimba bass, music box, toy clarinet |
| 2 | E harmonic minor | 150 | + pizzicato strings, toy accordion, more percussion |
| 3 | F harmonic minor | 160 | + violin doubling the clarinet, full toy kit, octave bass |
| Camp | D harmonic minor | 84 (3/4) | Music box + soft bass drone |
| Shrine | A freygish | 96 | Celesta or glass, held drone, no driving bass |

- **Rising keys:** each floor sits a step higher than the last, so tension climbs.
- **Easy reuse:** a melody written in D moves to E or F with a single transpose in GarageBand.

## The layer rule (the important one)
- **Each floor's downtime and action loops must share tempo, key and loop length.**
- The game then plays both at once and crossfades over about 1 second when a fight starts or ends.
- The bass stays steady: the lonely version thickens into the driving version.
- `preview.html` has a working demo of this ("Fight!" button).

## A shared motif
**Bb – C# – D** (the 6th, 7th and 1st of D harmonic minor): the augmented-second "sob" rising into the tonic. Quote it everywhere so the set sounds like one score:
- the sad melody's cadence
- the top of the treasure sting
- the bass turnaround
- the camp lullaby's last phrase

## Klezmer vocabulary
- **Harmonic minor (D):** D E F G A Bb C#.
  - The augmented second Bb → C# is the "crying" interval. Lean on it at phrase ends.
- **Freygish (A):** A Bb C# D E F G. The same notes as D harmonic minor, but centred on A, so the sob sits right next to the root.
  - It's the classic klezmer sound.
  - It's ideal for the shrine and for action passages that hover on the V chord.
- **Doina (downtime):** a slow, rubato lament. Long notes, sighs, a melody that seems to improvise over a held bass.
- **Freylekhs / bulgar (action):**
  - fast 2/4 or 4/4
  - the bulgar puts accents on eighth notes 1, 4 and 7 (3+3+2): ONE-two-three-FOUR-five-six-SEV-en
  - `03_bass_bulgar` uses it
- **Krekhts ("sob"):** a quick grace note from the step above, falling onto the main note. In MIDI, a very short note just before the beat.
- **Dreydlekh:** a fast trill or turn on a long note.
- **Slides:** pitch bend into a note, a little at a time.
- **Picardy third:** end a minor-key victory on D *major* (F# instead of F). Triumph without leaving the klezmer world.
- **Harmony that works:**
  - i – V – i: Dm – A – Dm
  - i – i – VI – V: Dm – Dm – Bb – A. Used by the sketches. The three D minor bass lines (01, 02, 04) fit under either melody; the bulgar (03) is in A freygish with its own harmony (A – A – Gm – A).
  - The V is always A *major* (with C#). That's what makes it harmonic minor.

## What's in this folder
| File | What it is |
|---|---|
| `midi/01_bass_palace_pump_Dm_140.mid` | Driving octave-eighths bass (4 bars) |
| `midi/02_bass_stairs_Dm_140.mid` | Broken-chord bass, lighter (4 bars) |
| `midi/03_bass_bulgar_Afreygish_140.mid` | Bulgar 3+3+2 bass in A freygish (4 bars) |
| `midi/04_bass_lonely_Dm_140.mid` | Downtime bass: held notes, gaps (4 bars, same harmony as 01) |
| `midi/05_downtime_sketch_Dm_140.mid` | Lonely bass + sad melody (8 bars) |
| `midi/06_action_sketch_Dm_140.mid` | Pump bass + frantic melody + toy drums (8 bars, layers with 05) |
| `preview.html` | Hear them on your phone, swap sounds, try the downtime ⇄ action crossfade |

Import into GarageBand:
1. Open the `.mid` file, or drag it into a project.
2. Each part arrives as its own track.
3. GarageBand ignores the MIDI instrument choice, so pick each track's instrument yourself. Notes, timing and velocity come through.

The tempo is in the file. Each file ends on a whole bar, so it loops cleanly.

## Delivering finished pieces
- **Export:** WAV from GarageBand (Share → Export Song to Disk, uncompressed). Claude trims, loudness-matches and converts to `.m4a` (AAC), which loops cleanly on every phone. MP3 adds a small gap.
- **Loops:** exact whole bars. Don't let a reverb tail or a fade-out cross the loop point. If a tail must carry over, tell Claude and it can be folded back into the start.
- **Layers:** export downtime and action as two files of exactly the same length.
- **Size budget:** about 0.5 MB per loop minute at 64 kbps mono AAC, or about 1 MB in stereo. A full set of about 10 loops of 30–45 s each is roughly 4–8 MB.
  - It's downloaded once and cached offline.
  - That matters for Netlify bandwidth.
- **Volume:** music sits under the sound effects (ducked during big hits). Separate Music and Sound sliders.

## Sound effects will be retuned to match
- **The problem:** today the path-step ladder climbs a *major* pentatonic scale, and several chimes are major chords. Over harmonic-minor music they'd clash.
- **The fix:** once the keys are set, Claude retunes the step ladder and the chimes to each floor's scale, so building a path plays notes from the music.
