#!/usr/bin/env python3
"""Merge one component's scattered CSS rules into a single block (Nov 12, polish roadmap A3).

Picks every top-level rule in src/styles.css (rules inside @media/@supports stay put) whose selectors ALL match the
pattern, merges rules with the same selector (later wins, an earlier !important beats a later plain value, exactly
as the cascade did), and writes the merged rules, in the order of each selector's last appearance, where the last
picked rule was. Comments inside picked rules are dropped (they live in git history); trailing comments after a
picked rule are left in place. A comment directly above a picked rule (not a ----/==== section header) moves with it.

Prove it changed nothing before committing:
  node tools/css/styledump.js before.json '<selector>'   (on the old build)
  python3 tools/css/merge.py '<regex>' 'Title' [--keep 'exact selector' ...]
  node build.js && node tools/css/styledump.js after.json '<selector>' && node tools/css/stylediff.js before.json after.json
If stylediff reports differences, re-run from the old styles.css with --keep for the selectors involved (their order
against other components mattered), until it reports 0. Then the screen pictures (check.js) must still pass.

usage: python3 tools/css/merge.py REGEX TITLE [--keep SELECTOR]... [--keep-re REGEX]... [--dry] [--who PROP,PROP]
"""
import re, sys

args = sys.argv[1:]
if len(args) < 2: sys.exit(__doc__)
pattern, title = re.compile(args[0]), args[1]
keep, keep_re, dry = set(), [], '--dry' in args
for i, a in enumerate(args):
    if a == '--keep': keep.add(args[i + 1].strip())
    if a == '--keep-re': keep_re.append(re.compile(args[i + 1]))  # leave rules whose selector matches (e.g. another block's)

PATH = 'src/styles.css'
src = open(PATH).read()

def skip_comment(i): return src.index('*/', i + 2) + 2

stmts = []  # (start, end, selector or None, body or None)
i, n = 0, len(src)
while i < n:
    if src.startswith('/*', i): i = skip_comment(i); continue
    if src[i].isspace(): i += 1; continue
    start, depth, sel_end = i, 0, None
    while i < n:
        if src.startswith('/*', i): i = skip_comment(i); continue
        c = src[i]
        if c in '"\'':
            q = c; i += 1
            while src[i] != q: i += 2 if src[i] == '\\' else 1
            i += 1; continue
        if c == '{':
            if depth == 0: sel_end = i
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: i += 1; break
        elif c == ';' and depth == 0: i += 1; break
        i += 1
    stmts.append((start, i, src[start:sel_end] if sel_end else None, src[sel_end + 1:i - 1] if sel_end else None))

def strip_comments(t): return re.sub(r'/\*.*?\*/', '', t, flags=re.S)

def split_top(t, sep):
    out, cur, d, q = [], '', 0, None
    for c in t:
        if q:
            cur += c
            if c == q: q = None
            continue
        if c in '"\'': q = c
        elif c in '([': d += 1
        elif c in ')]': d -= 1
        if c == sep and d == 0: out.append(cur); cur = ''; continue
        cur += c
    if cur.strip(): out.append(cur)
    return out

def decls(body):
    res = []
    for x in split_top(strip_comments(body), ';'):
        x = x.strip()
        if not x: continue
        k, v = x.split(':', 1); k, v = k.strip(), v.strip()
        imp = bool(re.search(r'!\s*important\s*$', v)); v = re.sub(r'\s*!\s*important\s*$', '', v)
        res.append((k, v, imp))
    return res

picked = []
for idx, (s, e, sel, body) in enumerate(stmts):
    if sel is None or sel.strip().startswith('@'): continue
    sels = [x.strip() for x in split_top(strip_comments(sel), ',')]
    key = ', '.join(sels)
    if key in keep or any(r.search(key) for r in keep_re): continue
    if all(pattern.search(x) for x in sels): picked.append(idx)
if not picked: sys.exit('nothing matched')
if '--who' in args:  # --who PROP[,PROP]: list the picked rules that set these properties (to choose --keep)
    want = set(args[args.index('--who') + 1].split(','))
    for idx in picked:
        s0, e0, sel, body = stmts[idx]
        hit = [f'{k}:{v}' for k, v, imp in decls(body) if k in want]
        if hit: print(f'line {src.count(chr(10), 0, s0) + 1}: {" ".join(sel.split())}  ->  {"; ".join(hit)}')
    sys.exit(0)

# A comment directly above a picked rule (no blank line between, not a ----/==== section header) moves with it.
notes, cut = {}, {}
for idx in picked:
    s = stmts[idx][0]
    m = re.search(r'(/\*(?:(?!\*/).)*\*/)[ \t]*\n?[ \t]*$', src[max(0, s - 600):s], re.S)
    if m and '\n\n' not in m.group(0) and not re.search(r'----|====', m.group(1)):
        start = s - (len(src[max(0, s - 600):s]) - m.start())
        if src[:start].rstrip(' \t').endswith('\n') or start == 0:  # the comment starts its own line
            notes[idx] = ' '.join(m.group(1)[2:-2].split()); cut[idx] = start
groups, order, gnotes = {}, [], {}
for idx in picked:
    s, e, sel, body = stmts[idx]
    key = ', '.join(x.strip() for x in split_top(strip_comments(sel), ','))
    g = groups.setdefault(key, {})
    if idx in notes and notes[idx] not in gnotes.setdefault(key, []): gnotes[key].append(notes[idx])
    if key in order: order.remove(key)
    order.append(key)
    for k, v, imp in decls(body):
        if k in g and g[k][1] and not imp: continue  # an earlier !important beats a later plain value
        g.pop(k, None); g[k] = (v, imp)

lines = [f'/* ==== {title}: every top-level rule for it, merged {"Nov 12" if True else ""} by tools/css/merge.py (polish roadmap A3).',
         f'   Was {len(picked)} rules spread through this file; each value\'s history is in git. Edit here, not further up. ==== */']
for key in order:
    g = groups[key]
    if g and gnotes.get(key): lines.append('/* ' + ' / '.join(gnotes[key]) + ' */')
    if g: lines.append(f'{key}{{ ' + '; '.join(f'{k}:{v}{" !important" if imp else ""}' for k, (v, imp) in g.items()) + '; }')
block = '\n'.join(lines) + '\n'

out, pos, last = [], 0, max(picked)
for idx in picked:
    s, e, _, _ = stmts[idx]
    out.append(src[pos:cut.get(idx, s)])
    if idx == last: out.append(block)
    pos = e
out.append(src[pos:])
new = re.sub(r'\n{3,}', '\n\n', re.sub(r'(?m)^[ \t]+$', '', ''.join(out)))  # moved indented rules leave blank lines
before_imp, after_imp = src.count('!important'), new.count('!important')
print(f'{len(picked)} rules -> {sum(1 for k in order if groups[k])} merged rules; !important {before_imp} -> {after_imp}; lines {src.count(chr(10))} -> {new.count(chr(10))}', file=sys.stderr)
if not dry: open(PATH, 'w').write(new)
