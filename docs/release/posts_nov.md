# Posts and pitch, Oct 28 - Nov 9 (drafted Oct 28; tighter schedule, Jeremy Oct 28)

Page version: https://claude.ai/artifact/EXsbT3N29MADimSzs15gaN (copy buttons, checkmarks synced across devices; source docs/release/posting_plan.html).

| Day | Post |
|---|---|
| Wed Oct 28 | itch devlog "Faster start" + Release Announcements forum post; check itch page settings; start commenting |
| Thu Oct 29 | r/WebGames link post |
| Fri Oct 30 | Indie Games Plus pitch email |
| Sat Oct 31 | r/RoguelikeDev Sharing Saturday comment |
| Sun Nov 1 | Log numbers (Reddit views, itch views/plays) in outreach.md |
| Mon Nov 2 | r/indiegames video post |
| Tue Nov 3 | nothing (US Election Day) |
| Wed Nov 4 | r/playmygame redo (a week after the Oct 27 post) |
| Thu Nov 5 | r/tabletopgamedesign design story |
| Fri Nov 6 | emails to 3-5 small YouTubers |
| Mon Nov 9 | r/IndieGaming video post |
| Sun Nov 8 or 15 | devlog #2: what we changed because of your comments |

Follows the two-week plan in `first_players/report.md`. Media: `docs/release/media/clip_turn.mp4` (11.6 s, portrait,
one Floor 1 turn: flick the lid, draw a path, 18 damage, Overkill, Victory chest) and `clip_turn.gif` (same, for
places that take GIFs). Remake with `node build.js --release && node tools/media/clip.js && python3 tools/media/mk.py turn 0 11.6 1 clip_turn`.

Link everywhere: https://dungeonscramble.itch.io/dungeon-scramble

**AI art:** some art in the game (and so in the clip) is still AI-derived (see PROJECT_CONTEXT, Oct 21/25). r/IndieGaming
requires disclosure, and several game subs ban AI art outright. Read each sub's AI rule; where disclosure is required,
add a line like "Most art is hand-drawn by me; a few placeholder pieces are AI-assisted and being redrawn."

Before each post: read that sub's sidebar rules and look at this week's top posts (rules here come from search
summaries, not the live pages). Answer every comment the first day. Log the numbers in `outreach.md` the next day.

---

## Thu Oct 29 · r/WebGames (link post)

**Type:** link post to the itch page.

**Title:**
> Dungeon Scramble: roll a 4x4 tray of dice, draw one path through it, and every die you step on fires. Free, plays on phones.

**First comment (from you, right after posting):**
> My wife and I designed this as a board game, and I've been turning it into a phone game. It's a turn-based roguelike: each turn you get a tray of 16 dice and trace one path through them. Hits, blocks, heals and combos fire in the order you step on them, and the monsters always show what they'll do next turn, so every roll is a little puzzle.
>
> The demo is the whole first floor (about 15 minutes) and runs in the browser, best on a phone held upright. I'd love to hear where you got stuck or what felt unfair.

---

## Wed Oct 28 · itch.io Release Announcements board (forum post)

**Title:**
> Dungeon Scramble — a dice-path roguelike from our kitchen-table board game (free Floor 1, mobile-friendly)

**Body:** (attach the GIF at the top)
> Hi all! Dungeon Scramble is a turn-based roguelike my wife Katlynn and I started as a board game. Each turn you roll 16 dice into a 4x4 tray and draw one path through them. Every die you step on fires its face: Hit, Block, Heal, Combo, Boost, Freeze. Maneuver faces like Leap, Dodge and Pivot bend the path. Monsters always show their next move, so you can plan around it.
>
> The free demo is the whole first floor: pick up loot dice and relics, visit a shrine and a camp, and fight the Floor 1 boss. It runs in the browser and was built for phones (portrait), but works on a computer too.
>
> What changed recently: your first run now drops you straight into a short guided fight instead of menus, and you flick open the dice chest (or shake your phone) to roll each turn.
>
> Play: https://dungeonscramble.itch.io/dungeon-scramble
>
> We read every comment. Tell us where you died and whether it felt fair.

(Same day: a devlog on the game page, "Faster start: three taps to your first die", 3-4 lines on the quick start plus the GIF.)

---

## Wed Nov 4 · r/playmygame (video post, redo)

**Type:** video post with `clip_turn.mp4`. Flair: **[Web]** (or [Mobile] if the sub's flairs fit better). The
sub wants a written description in the post itself; if the video post has no text box, put the description below
as the first comment immediately.

**Title:**
> [Web/Mobile] Dungeon Scramble — draw a path through a tray of dice, every die fires. Free Floor 1 demo, looking for first-time players

**Description (body or first comment):**
> **What it is:** a turn-based dice roguelike. Roll 16 dice into a 4x4 tray, trace one path, and each die you step on fires its face in order. Monsters show their next move, so you plan around it.
> **Play (free, browser, best on a phone held upright, ~15 min):** https://dungeonscramble.itch.io/dungeon-scramble
> **Made by:** my wife and me; it started as our board game.
> **Feedback I'm after:** was your first turn clear? Where did your run end? Did any death feel unfair?

---

## Sat Oct 31 · r/RoguelikeDev Sharing Saturday (comment in the weekly thread)

> **Dungeon Scramble** — a dice-path roguelike (more roguelite: runs, loot dice, relics, three floors)
>
> [GIF]
>
> This week I cut the first-run path from 8 taps and 4 popups to 3 taps: a brand-new player now lands straight in a guided first fight. Watching people on itch made it obvious the welcome pages were losing them before they ever touched a die.
>
> Also ran a first-run difficulty check with a bot at four skill levels: nobody dies in the first fight, and the Floor 1 boss accounts for ~70% of Floor 1 deaths, which is where I want the wall to be.
>
> Free Floor 1 demo (browser, phone-first): https://dungeonscramble.itch.io/dungeon-scramble

---

## Mon Nov 2 · r/indiegames (video post, no link in the post)

**Type:** video post with `clip_turn.mp4`. No store/itch link in the post or title. Add the link in a comment only
if the live rules allow it.

**Title:**
> My wife and I turned our dice board game into a phone roguelike: draw one path through the tray and every die fires

**Comment (only if links are allowed in comments):**
> It's called Dungeon Scramble. The first floor is free in the browser: https://dungeonscramble.itch.io/dungeon-scramble — happy to answer questions about turning the board game into the digital version.

---

## Thu Nov 5 · r/tabletopgamedesign (design story, no link)

**Type:** text or image post with photos of the physical prototype (tray, dice, cards). Set the required flair.
No link unless someone asks; then reply with it.

**Title:**
> What changed when we turned our dice-path board game into a phone game

**Body:**
(Jeremy: the four bullets are my guesses at what changed. Replace them with what really changed from your prototype;
keep the shape: what was true at the table, what the screen let you do instead.)

> My wife and I designed a dungeon crawler where you roll dice into a 4x4 grid and trace one path through them; each die you step on fires its face (hit, block, heal, combo). At the table it worked, but turning it into a digital game forced a few changes I didn't expect:
>
> - **Minions became "fog."** On the table, minion tokens covered dice and you knew what was under them. Digitally we hide the face until your path reaches it, so you can't plan around what you can't see.
> - **Upkeep disappeared, so the rules could get fiddlier.** Boost tokens, combos that scale with path length, enemies that act every N turns: all of these were bookkeeping-heavy on paper and are free on a screen.
> - **The roll needed a ritual.** Rolling 16 dice by hand is fun; tapping "roll" isn't. We added a chest lid you flick open (or shake your phone) to get some of the physical feel back.
> - **Telegraphing got stronger.** Every monster shows its next move, which made the "do I block or race?" decision the heart of each turn.
>
> Has anyone else moved a dice game between table and screen? What did you have to drop or add?
>
> (Photos: the prototype tray and dice.)

---

## Mon Nov 9 · r/IndieGaming (video post, different wording)

**Type:** video post with `clip_turn.mp4`. One self-promo post per two weeks there; disclose AI use if any of the art
in the clip is AI-assisted (see PROJECT_CONTEXT on the remaining original art).

**Title:**
> Dungeon Scramble: every turn is a 4x4 tray of dice and one path through it. Free first floor in the browser.

**First comment:**
> Hand-drawn, turn-based, built for phones in portrait. Monsters always show their next move, so each roll is a small puzzle. Demo: https://dungeonscramble.itch.io/dungeon-scramble

---

## Fri Oct 30 · Pitch email to Indie Games Plus

**To:** editors@indiegamesplus.com
**Subject:** Dungeon Scramble — a dice-path roguelike from our board game (free browser demo)

> Hi,
>
> I'm Jeremy Friedman. My wife Katlynn and I make Dungeon Scramble, a turn-based roguelike that started as a board game we designed together.
>
> Each turn you roll 16 dice into a 4x4 tray and draw one path through them. Every die you step on fires its face, in order: hits, blocks, heals, combos that grow with the path, and maneuvers like Leap and Pivot that bend it. Monsters always show their next move, so every roll is a small puzzle about whether to block or race. The art is hand-drawn.
>
> The first floor is a free demo in the browser, about 15 minutes, made for phones held upright but playable on a computer:
> https://dungeonscramble.itch.io/dungeon-scramble
>
> A short clip of one turn: [attach clip_turn.gif or link the mp4]
>
> The full game (three floors, 50+ loot dice, 20+ relics) is planned for Android and iPhone in 2027. A press kit is at https://dungeonscramble.com/presskit if useful.
>
> Thanks for reading, and for covering small games.
>
> Jeremy Friedman
> contact@dungeonscramble.com

(Check that the press kit URL is live before sending; the report suggests the same short note to Jupiter Hadley once
a current contact is found, and to 3-5 small dice/roguelike YouTubers on Fri Nov 6.)

### Short version for YouTubers/streamers (Fri Nov 6)

**Subject:** Free dice roguelike demo for your itch videos? (Dungeon Scramble)

> Hi [name], I enjoyed your video on [specific game/video]. My wife and I made Dungeon Scramble, a turn-based dice roguelike that started as our board game: roll 16 dice into a 4x4 tray, draw one path, every die fires. The first floor is free in the browser (~15 min, works on PC): https://dungeonscramble.itch.io/dungeon-scramble — clip attached. No strings; if it's not your thing, no reply needed. Thanks! — Jeremy
