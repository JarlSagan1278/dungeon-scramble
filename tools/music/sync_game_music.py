# Copies the downtime sketch's notes from docs/music/sketches.json into src/music.js (MUSIC_TRACKS.downtime1).
# Run after changing tools/music/make_sketches.py:  python3 tools/music/make_sketches.py && python3 tools/music/sync_game_music.py
import json, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sk = {s['id']: s for s in json.load(open(os.path.join(ROOT, 'docs/music/sketches.json')))}
parts = {p['role']: p['notes'] for p in sk['05_downtime_sketch_Dm_140']['parts']}
bass = [n for n in parts['bass'] if n[0] < 32]
p = os.path.join(ROOT, 'src/music.js'); s = open(p).read()
s = re.sub(r"parts:\{ bass:\[.*?\],\n", "parts:{ bass:" + json.dumps(bass, separators=(',', ':')) + ",\n", s, count=1, flags=re.S)
s = re.sub(r"lead:\[.*?\] \} \},", "lead:" + json.dumps(parts['lead'], separators=(',', ':')) + " } },", s, count=1, flags=re.S)
open(p, 'w').write(s); print('synced')
