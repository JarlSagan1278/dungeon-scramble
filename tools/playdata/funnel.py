#!/usr/bin/env python3
"""New-player funnel from shared play data (Oct 25): where demo and early runs end, and why.

usage: python3 tools/playdata/funnel.py <dir-or-files...> [--out report.md] [--max-run-no 5]
Inputs: run records as the Apps Script stores them in Drive ("Dungeon Scramble Play Data (runs)": {kind, player, screen, rec})
and/or tester exports from the gear menu ({playerId, runs:[...]}). Runs are de-duplicated by runId.
"Early runs" are a player's runs with runNo <= --max-run-no (default 5). Shared play data only starts with the run
after the player says yes (they're asked at the end of their first run), so a player's very first run is never here.
Depth is printed as the game shows it (internal depth - 1).
"""
import json, sys, os, glob, collections, statistics as st, argparse

def load(paths):
    runs = {}
    files = []
    for p in paths:
        files += sorted(glob.glob(os.path.join(p, '*.json'))) if os.path.isdir(p) else [p]
    for f in files:
        try: d = json.load(open(f))
        except Exception: continue
        if isinstance(d, dict) and d.get('kind') == 'run' and isinstance(d.get('rec'), dict):
            r = d['rec']; runs[r.get('runId')] = (d.get('player'), d.get('screen'), r)
        elif isinstance(d, dict) and isinstance(d.get('runs'), list):
            for r in d['runs']: runs[r.get('runId')] = (d.get('playerId'), None, r)
    return [v for k, v in runs.items() if k]

def pct(a, b): return f"{(100 * a / b):.0f}%" if b else '-'
def med(xs): return f"{st.median(xs):.1f}" if xs else '-'

def summarize(r):
    ev = r.get('events') or []
    rooms = [e for e in ev if e.get('e') == 'room_start']
    fights = [e for e in rooms if e.get('type') not in ('Camp', 'Shrine')]
    last = rooms[-1] if rooms else {}
    turns_in_last = sum(1 for e in ev if e.get('e') == 'turn' and e.get('f') == last.get('f') and e.get('s') == last.get('s'))
    down = [e for e in ev if e.get('e') == 'player_down']
    guide = [e for e in ev if e.get('e') in ('guide_start', 'guide_end')]
    out = r.get('outcome')
    f1_rooms = [e for e in rooms if e.get('f') == 1]
    f1_clear = out in ('victory', 'demo') or (r.get('floorReached') or 1) > 1
    return dict(out=out, depth=(r.get('depth') or 1) - 1, runNo=r.get('runNo'), version=r.get('version'), origin=r.get('origin'),
                klass=r.get('klass'), floor=r.get('floorReached') or 1, mins=(ev[-1].get('t', 0) / 60000 if ev else 0),
                last=last, turns_in_last=turns_in_last, down=down, guide=guide, f1_clear=f1_clear,
                f1_slots={e.get('s') for e in f1_rooms}, fights=len(fights),
                camps=[e.get('choice') for e in ev if e.get('e') == 'camp_choice'],
                revives=sum(1 for e in ev if e.get('e') == 'pocket_revive' and e.get('saved')))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('paths', nargs='+'); ap.add_argument('--out'); ap.add_argument('--max-run-no', type=int, default=5)
    a = ap.parse_args()
    runs = load(a.paths)
    L = []; p = L.append
    if not runs:
        print('No runs found.'); return
    S = [(pl, sc, summarize(r)) for pl, sc, r in runs]
    players = collections.defaultdict(list)
    for pl, sc, s in S: players[pl].append(s)
    early = [s for pl, sc, s in S if (s['runNo'] or 99) <= a.max_run_no]
    p(f"# New-player funnel\n\n{len(S)} runs from {len(players)} players; versions {', '.join(sorted({s['version'] or '?' for _,_,s in S}))}.")
    p(f"Early runs (run #{a.max_run_no} or lower): {len(early)}. A player's first run is never shared (they opt in at its end).\n")
    # outcomes
    p("## Outcomes\n\n| | Runs | Cleared Floor 1 | Won (full game) | Died | Quit |\n|---|---|---|---|---|---|")
    for name, grp in (('All runs', [s for _,_,s in S]), ('Early runs', early), ('Depth 0 only', [s for _,_,s in S if s['depth'] == 0])):
        n = len(grp)
        p(f"| {name} | {n} | {pct(sum(s['f1_clear'] for s in grp), n)} | {pct(sum(s['out']=='victory' for s in grp), n)} | {pct(sum(s['out']=='defeat' for s in grp), n)} | {pct(sum(s['out']=='abandoned' for s in grp), n)} |")
    # Floor 1 funnel by slot
    p("\n## Floor 1, room by room (early runs)\n\nShare of early runs that reached each Floor 1 room (slot 0 is the starting camp, 7 is the boss).\n")
    p("| Slot | " + " | ".join(str(i) for i in range(8)) + " | Cleared |\n|---" * 1 + "|---" * 9 + "|")
    n = len(early)
    p("| Reached | " + " | ".join(pct(sum(i in s['f1_slots'] for s in early), n) for i in range(8)) + f" | {pct(sum(s['f1_clear'] for s in early), n)} |")
    # where runs end
    for title, filt in (('Deaths', 'defeat'), ('Quits', 'abandoned')):
        grp = [s for _,_,s in S if s['out'] == filt]
        p(f"\n## {title} ({len(grp)})\n")
        if not grp: p('None yet.'); continue
        c = collections.Counter((s['last'].get('f'), s['last'].get('name') or s['last'].get('type')) for s in grp)
        p("| Floor | Room | Runs | Median turns in that room | Median minutes into the run |\n|---|---|---|---|---|")
        for (fl, nm), k in c.most_common():
            g = [s for s in grp if (s['last'].get('f'), s['last'].get('name') or s['last'].get('type')) == (fl, nm)]
            p(f"| {fl} | {nm} | {k} | {med([s['turns_in_last'] for s in g])} | {med([s['mins'] for s in g])} |")
        if filt == 'defeat':
            tele = sum(1 for s in grp if s['down'] and s['down'][-1].get('lethalStart'))
            p(f"\nThe killing blow was already showing as lethal at the start of that turn in {tele} of {len(grp)} deaths (the game's lethal warning).")
    # guide
    gs = [s for _,_,s in S if s['guide']]
    p(f"\n## Guided first fight\n\nRuns with guide events: {len(gs)} (usually none: the guide runs in a player's first run, which isn't shared).")
    for s in gs: p(f"- {', '.join(e.get('e') + ('(' + e.get('how') + ')' if e.get('how') else '') for e in s['guide'])}")
    # pacing and choices
    allS = [s for _,_,s in S]
    p("\n## Pacing and choices\n")
    p(f"- Median active minutes per run: {med([s['mins'] for s in allS])} (wins: {med([s['mins'] for s in allS if s['out']=='victory'])}).")
    camps = collections.Counter(c for s in allS for c in s['camps'])
    p(f"- Camp fires: {camps.get('rest',0)} rested, {camps.get('train',0)} trained.")
    p(f"- Back Pocket saves: {sum(s['revives'] for s in allS)} in {sum(1 for s in allS if s['revives'])} runs.")
    cl = collections.Counter(s['klass'] for s in allS); og = collections.Counter(s['origin'] for s in allS)
    p(f"- Classes: {', '.join(f'{k} {v}' for k, v in cl.most_common())}. Origins: {', '.join(f'{k} {v}' for k, v in og.most_common())}.")
    p("\n## Players\n\n| Player | Runs shared | First shared run # | Best | Floor 1 cleared |\n|---|---|---|---|---|")
    for pl, g in sorted(players.items(), key=lambda x: -len(x[1])):
        best = 'won' if any(s['out']=='victory' for s in g) else ('demo cleared' if any(s['out']=='demo' for s in g) else f"floor {max(s['floor'] for s in g)}")
        first = min((s['runNo'] for s in g if s['runNo']), default='?')
        p(f"| {pl} | {len(g)} | {first} | {best} | {sum(s['f1_clear'] for s in g)}/{len(g)} |")
    text = '\n'.join(L) + '\n'
    if a.out: open(a.out, 'w').write(text); print('wrote', a.out)
    else: print(text)

if __name__ == '__main__': main()
