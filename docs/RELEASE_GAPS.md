# Where Dungeon Scramble doesn't look releasable yet (review, Oct 28, 2026, build 1.41.95)

Method: every screen photographed at 395x769 (Jeremy's phone card) and 1280x800 (a desktop visitor), release and
demo builds, plus a read of the styles, copy and settings. Not judged: audio (needs ears), game feel and fun (needs
hands). Ranked by how soon a stranger notices.

## A. Noticed in the first minute

1. **Tutorial cards cover the game.** The "NEW ACTION" cards sit over the bottom row of dice and the Item/Clear
   buttons, and stay up over Settings and the loot chest. A new player's first fight is partly hidden behind help text.
   Fix: dock them above the tray (or over the face-off), auto-dismiss on the next tap, never over a modal.
2. **The type reads like a web page.** Everything but titles is Georgia (falls back to Times or Noto Serif on Android,
   so phones differ), and over 100 rules set text at 5–11 px. Chips, die labels, tooltips and the shrine's italic
   description are hard to read on a phone. Fix: bundle one book serif (keeps "plain serif" but looks the same on
   every device), raise the floor to ~12 px for words (numbers on dice can stay smaller), drop italics on dark walls.
3. **Art treatment, not drawing style** (corrected Oct 28 after Jeremy's reply: all the art except the untouched
   pixie portraits is his own drawing, and side by side the cover and the in-game art share one style). What differs
   is our processing: the paper texture and grain filter speckle the flat fills, many pictures are shown above their
   pixel size (softer outlines), and the paper blend mutes the colours. Options for Jeremy: lighter or no grain on the
   art (texture kept on walls, floor, chest), the same paper on the cover, or leave it. **Done 1.41.98:** Jeremy kept
   the grain; the cover now has the same paper.
4. **The defeat screen is the plainest screen in the game.** Brown, text-only, mostly empty, with "...retreats to town
   in temporary defeat..." The moment a player decides whether to try again needs the run card (like victory), what
   killed them, and one big "Try again".

## B. Polish a reviewer would list

5. **Copy.** Double hyphens in tooltips ("non-adjacent die -- clears"); ellipses; jargon shown before it's taught
   ("Alloy/Gilded Loot Die", "Boost 3", "R.O.T.", "D.O.T./H.O.T." with periods); "Nothing here is required — set out
   whenever you like."; the Big Boss name breaks as "Co-/consul".
6. **Developer features in player builds.** Settings shows Export Play Data and Keyboard shortcuts on phones; the title
   shows the version number. Move Export to Records > Backup (or hide it in release), show shortcuts only with a
   keyboard, put the version in Settings.
7. **Button rainbow.** "Each button its own colour" makes Settings eight colours and the title four; with flat
   rectangles and drop shadows it reads busy rather than toy-like. Worth a second look: colour by role (go / info /
   danger) plus the chunky outline.
8. **Equip window** (fixed 1.41.99: empty slots and "Pick a die first"). A large empty "compare" box until a die is tapped, and the disabled Replace button looks broken.
   Pre-select the Suggested die so the box is never empty.
9. **No credits screen.** Nowhere names Jeremy and Katlynn, the font licence or the music. Stores and players expect it
   (a "Credits" tab in Records is enough).
10. **Desktop.** On a computer (tester site, dungeonscramble.com links) the game is a phone strip in a black void.
    The itch embed is fine. A framed backdrop (cover scene, dimmed) would fix it.

## C. Release mechanics

11. **Speed on cheap phones:** ~1.5 s of script per turn at CPU x4 (full render of the fight screen) and a 5 MB first
    load. Players feel both.
12. **Store build:** real Google Play billing behind `STORE`, a signed release build, store art and the app icon from
    full-size art (the icon is upscaled from 860 px), store screenshots from the current build.
13. **Audio:** all procedural synth; whether it sounds finished needs Jeremy's ear (the sound pass is waiting on him).

## What already looks finished

The fight screen (face-off, chest tray, lid, telegraph chips), the cover art, the Codex silhouettes, the loot chest
and loot cards, the run card on victory, the route bar, and the settings coverage (volume, motion, text size, flick).
