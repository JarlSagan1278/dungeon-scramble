#!/usr/bin/env python3
"""Read Dungeon Scramble play-data exports (gear menu > Export Play Data) and print a tester summary.

usage: python3 tools/playdata/analyze.py export1.json [export2.json ...]
Runs are de-duplicated by runId, so overlapping exports from the same tester are fine.
Depth is printed as the game shows it (internal depth - 1).
Known double logs are counted once: class_ability per (room, turn); a repeated turn number after a Back Pocket save.
Wrap-rule check: Dungeoneer paths are re-checked against the 1.41.8 rule (each face keeps its move rule across the
left/right seam); moves only the old buggy rule allowed are counted.
"""
import json, sys, collections, statistics as st

def load(paths):
    runs, players = {}, set()
    for p in paths:
        d = json.load(open(p))
        players.add(d.get('playerId'))
        for r in d.get('runs', []):
            runs[r['runId']] = (d.get('playerId'), d.get('version'), r)
    return list(runs.values()), players

def face_type(tok):
    return tok.split(':')[1][:1] if ':' in tok else 'M'

def legal_step(t, a, b, wrap):
    ra, ca, rb, cb = a // 4, a % 4, b // 4, b % 4
    def ok(dr, dc):
        if t == 'd': return abs(dr) == 1 and abs(dc) == 1
        if t == 'l': return (dr == 0 and abs(dc) == 2) or (dc == 0 and abs(dr) == 2)
        if t == 'p': return abs(dr) + abs(dc) == 1 or (abs(dr) == 1 and abs(dc) == 1)
        return abs(dr) + abs(dc) == 1
    if ok(rb - ra, cb - ca): return True
    if wrap and ca in (0, 3) and cb in (0, 3) and abs(ca - cb) == 3:
        vc = ca - 1 if cb > ca else ca + 1
        return ok(rb - ra, vc - ca)
    return None  # not explained by the basic rules (class zones, relics, etc.)

def med(v): return round(st.median(v), 1) if v else '-'

def main(paths):
    runs, players = load(paths)
    print('Players: %d   Runs: %d' % (len(players), len(runs)))
    take = collections.defaultdict(lambda: [0, 0]); pocketed = 0
    for pid, ver, r in sorted(runs, key=lambda x: x[2].get('startedAt', 0)):
        ev = r['events']; rs = ev[0] if ev and ev[0]['e'] == 'run_start' else {}
        mins = (r.get('endedAt', 0) - r.get('startedAt', 0)) / 60000
        print('\n== %s %s %s | depth %s %s | %s, floor %s | %.0f min, %s turns | %s' % (
            ver, r['origin'], r['klass'], (r.get('depth') or 1) - 1, rs.get('depthMods') or '', r['outcome'],
            r['floorReached'], mins, r['stats'].get('turnsTaken'), 'class run #%s' % rs.get('classRunNo', '?')))
        # per floor
        dmg = collections.Counter(); think = collections.defaultdict(list); plen = collections.defaultdict(list)
        seen_turns = set(); ability = set(); turns = []
        last_t = None
        for i, e in enumerate(ev):
            k = e['e']
            if k == 'hit_taken': dmg[e['f']] += e['dealt']
            if k == 'class_ability': ability.add((e['f'], e['s'], e['turn']))
            if k == 'turn':
                key = (e['f'], e['s'], e['n'])
                if key in seen_turns: continue
                seen_turns.add(key); turns.append(e); plen[e['f']].append(e['len'])
                j = i - 1
                while j >= 0 and ev[j]['e'] not in ('turn', 'room_start', 'hit_taken', 'minions', 'boss_move', 'heavy_turn'): j -= 1
                if j >= 0: think[e['f']].append((e['t'] - ev[j]['t']) / 1000)
        print('  damage taken F1/F2/F3: %s' % ' / '.join(str(dmg.get(f, 0)) for f in (1, 2, 3)))
        print('  median path length F1/F2/F3: %s' % ' / '.join(str(med(plen.get(f))) for f in (1, 2, 3)))
        print('  median seconds per turn F1/F2/F3: %s' % ' / '.join(str(med(think.get(f))) for f in (1, 2, 3)))
        if ability: print('  class ability used on %d of %d turns' % (len(ability), len(turns)))
        # fights
        fights = [e for e in ev if e['e'] == 'room_win']
        long_f = [(e['name'], e['turns']) for e in fights if e['turns'] >= 8]
        print('  fights: %d, median %s turns%s' % (len(fights), med([e['turns'] for e in fights]),
              ('; long: ' + ', '.join('%s %d' % x for x in long_f)) if long_f else ''))
        big = [(e['enemy'], e['dealt'], e['hp']) for e in ev if e['e'] == 'hit_taken' and e['dealt'] >= 8]
        if big: print('  hits of 8+: ' + ', '.join('%s %d (left %d HP)' % b for b in big))
        for e in ev:
            if e['e'] == 'player_down':
                print('  DOWN vs %s (enemy at %s HP), warned at start %s / at Go %s, cause %s, back pocket %s' % (
                    e['enemy'], e['enemyHp'], e.get('lethalStart'), e.get('lethalGo'), e.get('cause'), e.get('backPocket')))
        # equips
        rep = collections.Counter(e.get('replaced') or '(kept in pocket)' for e in ev if e['e'] == 'loot_equip')
        pocketed += rep.get('(kept in pocket)', 0)
        print('  loot replaced: ' + ', '.join('%s %d' % kv for kv in rep.most_common(4)))
        acts = collections.Counter(e['e'] for e in ev if e['e'] in ('tray_swap', 'tray_reroll'))
        frozen = sum(1 for e in ev if e['e'] == 'boss_move' and e.get('frozen'))
        print('  swaps %d, rerolls %d, boss moves frozen %d' % (acts['tray_swap'], acts['tray_reroll'], frozen))
        # wrap check (Dungeoneer only)
        if r['klass'].lower() == 'dungeoneer':
            bad = 0
            for e in turns:
                fs = e['tray'].split(' '); p = e['path']
                for a, b in zip(p, p[1:]):
                    t = face_type(fs[a])
                    if t in ('d', 'l') and a % 4 in (0, 3) and b % 4 in (0, 3) and not legal_step(t, a, b, True):
                        bad += 1
            if bad: print('  wrap check: %d steps only the pre-1.41.8 rule allowed' % bad)
        for e in ev:
            if e['e'] == 'loot_pick' and e.get('offered'):
                for n in e['offered']: take['loot: ' + n][0] += 1
                take['loot: ' + e['picked']][1] += 1
            if e['e'] == 'relic_pick':
                for n in e['offered']: take['relic: ' + n][0] += 1
                take['relic: ' + e['picked']][1] += 1
    wins = sum(1 for _, _, r in runs if r['outcome'] == 'victory')
    print('\nWins: %d / %d' % (wins, len(runs)))
    if pocketed: print('Loot kept in pocket: %d' % pocketed)
    never = sorted([(k, v[0]) for k, v in take.items() if v[1] == 0 and v[0] >= 2], key=lambda x: -x[1])
    always = sorted([(k, v[0]) for k, v in take.items() if v[1] == v[0] and v[0] >= 2], key=lambda x: -x[1])
    if never: print('Never taken (offered 2+): ' + ', '.join('%s 0/%d' % x for x in never))
    if always: print('Always taken (offered 2+): ' + ', '.join('%s %d/%d' % (k, n, n) for k, n in always))

if __name__ == '__main__':
    if len(sys.argv) < 2: print(__doc__); sys.exit(1)
    main(sys.argv[1:])
