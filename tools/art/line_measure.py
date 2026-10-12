# Measures each monster picture's outer outline thickness (source pixels) and reports how thick that line
# renders in the face-off at its current ENCOUNTER_SIZE, plus how much the phone upscales it (blur).
# usage: python3 tools/art/line_measure.py <export_dir> '<json {name: sz}>' [fh=104] [dpr=3]
import json, sys, statistics as st
import numpy as np
from PIL import Image
ex = sys.argv[1]; sizes = json.loads(sys.argv[2]); FH = float(sys.argv[3]) if len(sys.argv) > 3 else 104; DPR = float(sys.argv[4]) if len(sys.argv) > 4 else 3
man = json.load(open(ex+'/manifest.json'))
bosses = json.loads(sys.argv[5]) if len(sys.argv) > 5 else {}
def thick(path):
    a = np.asarray(Image.open(path).convert('RGBA'), dtype=np.int16)
    op = a[..., 3] > 128; dark = op & (a[..., :3].max(axis=2) < 70)
    runs = []
    for arr_op, arr_dk in ((op, dark), (op.T, dark.T)):
        for r in range(arr_op.shape[0]):
            row_o, row_d = arr_op[r], arr_dk[r]
            idx = np.flatnonzero(row_o)
            if len(idx) < 6: continue
            for start, step in ((idx[0], 1), (idx[-1], -1)):
                n = 0; i = start
                while 0 <= i < len(row_d) and row_d[i]: n += 1; i += step
                # count it only if the dark run ends in a lighter opaque fill (a real outline, not a black body)
                if 0 < n < 40 and 0 <= i < len(row_d) and row_o[i] and not row_d[i]: runs.append(n)
    h = a.shape[0]
    return (st.median(runs) if runs else 0), h
out = []
for e in man:
    if e.get('const') != 'MONSTER_ART': continue
    k = e['key']; sz = sizes.get(k, bosses.get(k, 1.0))
    t, h = thick(ex+'/'+e['file'])
    css_h = FH*sz
    out.append(dict(name=k, sz=sz, srcH=h, line=t, lineCss=round(t*css_h/h, 2), upscale=round(css_h*DPR/h, 2)))
print(json.dumps(out))
