/* =========================================================================
   DATA
   ========================================================================= */
// Bump this with every change that ships -- patch (x.y.Z) for a small
// tweak/fix like a wording or layout change, minor (x.Y.0) for a new
// feature, major (X.0.0) for a breaking/full redesign. Shown in Settings
// so there's always a quick way to tell whether two builds differ.
const GAME_VERSION = '1.25.0';

function face(str){
  if(str==null) return {type:'blank'};
  const s = String(str).trim();
  if(!s || /^blank$/i.test(s)) return {type:'blank'};
  if(/^dodge$/i.test(s)) return {type:'dodge'};
  if(/^leap$/i.test(s)) return {type:'leap'};
  if(/^pivot$/i.test(s)) return {type:'pivot'};
  if(/^freeze$/i.test(s)) return {type:'freeze'};
  if(/^nullify$/i.test(s)) return {type:'nullify'};
  const m = s.match(/^([a-zA-Z.']+)\s*(\d+(\.\d+)?)?/);
  if(!m) return {type:'blank'};
  const nameMap = {hit:'hit',combo:'combo',boost:'boost',dot:'dot',leech:'leech',fumble:'fumble',heal:'heal',hot:'hot',block:'block'};
  const key = nameMap[m[1].toLowerCase()];
  if(!key) return {type:'blank'};
  const val = m[2]?parseFloat(m[2]):1;
  // Boost is a multiplier, and the source mechanics doc's dice never use a
  // literal x1 (that would be a no-op) -- "BoostN" is a tier label, not the
  // multiplier itself. Cross-referencing every Boost-face die in
  // DS_-_Mechanics_Document.xlsx against its actual "x" column: tier 1 -> x2
  // (Dwarven Doohickie, Mushroom Cap, Bonus Breakfast, Longbow, Crossbow,
  // Tarot Deck, Unlabelled Mixture all agree), tier 2 -> x3 (Blunderbuss,
  // Triage Turret), tier 3 -> x4 (Maximum Capacitor), tier 4 -> x8 (Warp
  // Crossbow, the one card that uses it). Applied uniformly here so the
  // displayed number on the die and the actual multiplier always match.
  if(key==='boost'){
    const BOOST_TIER_MULT = {1:2, 2:3, 3:4, 4:8};
    return {type:key, value: BOOST_TIER_MULT[val] || val};
  }
  return {type:key, value:val};
}
function faces(arr){ return arr.map(face); }


const LABEL = { hit:'Hit', combo:'Combo', boost:'Boost', dot:'D.O.T.', leech:'Leech', fumble:'Fumble',
  dodge:'Dodge', leap:'Leap', pivot:'Pivot', freeze:'Freeze', heal:'Heal', hot:'H.O.T.', block:'Block', nullify:'Nullify', blank:'—'};

// One-line, player-facing descriptions of what each face actually does when
// it resolves -- shown on long-press so new players can learn the icon
// language without needing a separate how-to-play primer.
const FACE_DESC = {
  hit: 'Deals damage equal to its value.',
  combo: 'Deals damage that grows with each Hit, Combo, Shield, H.O.T. or D.O.T. die next to it on the board.',
  boost: "Multiplies the value of the very next action in your path (even across several Boosts in a row).",
  dot: "Applies stacking damage-over-time to the enemy.",
  leech: "Damages the enemy and heals you the same amount, over time.",
  fumble: "Backfires: applies damage-over-time to you.",
  dodge: "A Maneuver action -- no direct effect, but some quests ask for these.",
  leap: "A Maneuver action that lets your path jump to a non-adjacent die -- clears a Minion die if it jumps clean over one.",
  pivot: "A Maneuver action that lets your path change direction.",
  freeze: "The enemy skips its next action.",
  heal: "Restores your health immediately.",
  hot: "Heals you over time.",
  block: "Gains Block, reducing the next hit you take.",
  nullify: "Cancels one active effect -- Minions, your D.O.T., or the enemy's H.O.T.",
  blank: "No effect this turn.",
};

// Descriptions for an ENCOUNTER's own actions (the boss "cycles through" row
// and a regular enemy's "Each turn:" badges) -- same idea as FACE_DESC but
// phrased from the enemy's side, since these are things it does to you, not
// dice you're playing.
const ENEMY_ACTION_DESC = {
  hit: "Deals damage to you.",
  minion: "Summons Minion dice that clog your Tray until you Hit them, or Leap clean over them, to clear.",
  block: "The enemy gains Shield, which absorbs damage before its health does.",
  heal: "The enemy restores its own health.",
  hot: "The enemy gains healing over time (H.O.T.).",
  dot: "Applies stacking damage-over-time (D.O.T.) to you.",
};

// Same descriptions as ENEMY_ACTION_DESC, but with this specific
// encounter's actual number worked in -- so the tooltip says what THIS
// enemy's Hit/Shield/D.O.T./etc. is actually worth, not just what the
// mechanic does in the abstract. Falls back to the plain description if an
// action type or value is missing.
function enemyActionTooltip(type, val){
  if(val==null) return ENEMY_ACTION_DESC[type]||'';
  switch(type){
    case 'hit': return `Deals ${val} damage to you.`;
    case 'minion': return `Summons ${val} Minion ${val===1?'die that clogs':'dice that clog'} your Tray until you Hit ${val===1?'it':'them'}, or Leap clean over ${val===1?'it':'them'}, to clear.`;
    case 'block': return `The enemy gains ${val} Shield, which absorbs damage before its health does.`;
    case 'heal': return `The enemy restores ${val} of its own health.`;
    case 'hot': return `The enemy gains ${val} healing over time (H.O.T.).`;
    case 'dot': return `Applies ${val} stacking damage-over-time (D.O.T.) to you.`;
    default: return ENEMY_ACTION_DESC[type]||'';
  }
}

// Descriptions for a CURRENTLY ACTIVE status effect, shown together in one
// mouseover/long-press tooltip on a health bar (player's or an encounter's)
// listing every status currently in effect on it -- Block/D.O.T./H.O.T. and
// anything else -- rather than requiring a separate hover per status chip.
const STATUS_DESC = {
  dot: "Deals its current value as damage each upkeep, then drops by 1 -- a 3 hits for 3, then 2, then 1, then it's gone.",
  hot: "Heals its current value each upkeep, then drops by 1 -- a 3 heals for 3, then 2, then 1, then it's gone.",
  block: "Absorbs the next hit(s) taken before health is touched.",
  shield: "Absorbs the next hit(s) the enemy takes before its health is touched.",
  minions: "Minion dice are clogging the tray until Hits -- or a Leap clean over one -- clear them.",
  boost: "Your next played action's value will be multiplied.",
};

// Plain-language descriptions for each kind of route-bar node, shown on
// mouseover/long-press so it's clear what's ahead before you get there.
// "enc" nodes cover monster/trap/shrine encounters -- which one it'll
// actually be isn't decided until you reach it, so the tooltip says so.
const ROUTE_STEP_DESC = {
  camp: "Camp -- rest, reroll your tray, and spend upgrades.",
  enc: "Encounter -- a monster, trap, or shrine (which one isn't revealed until you arrive).",
  boss: "Boss -- the floor's final, toughest fight.",
};

// A short, dismissible first-run walkthrough shown once (before the very
// first game screen a new player sees) covering the parts of the UI that
// aren't self-explanatory from tooltips alone -- the actual icon-by-icon
// glossary lives in the always-available "Key" reference card instead of
// being repeated here.
const TUTORIAL_STEPS = [
  {
    title: "Welcome, Adventurer",
    body: "Build a path across your dice tray each turn to fight, heal, and move. Clear all three floors -- and their Boss -- to win.",
  },
  {
    title: "Your Tray",
    body: "Tap a die to start a path, then tap an adjacent die to extend it (some dice let you jump or change direction). Longer paths combo for bigger effects. Long-press any die to see what its face does.",
  },
  {
    title: "The Route",
    body: "The bar at the top shows what's ahead this floor: Camps to rest and upgrade, Encounters (monster/trap/shrine), and a Boss at the end. Long-press a node to see what it means.",
  },
  {
    title: "One More Thing",
    body: "The Key button (next to your Bag and Log) is a full glossary of every icon in the game -- check it any time you forget what something does. Good luck!",
  },
];

// Icon set: the 14 action icons, Door, and Boss/skull are vector-traced
// directly from the user's own Action Key Sticker and board art (via
// contour detection on the source pixels, not hand-redrawn approximations).
// Bag, Log, Use, and Key have no equivalent in the source material (they're
// app-navigation concepts, not game actions), so those four are original
// icons designed to match the same flat, thick, single-color style. Every
// path uses currentColor so it always matches whatever text color its
// container already has.
const ICON_SVG = {
  hit: '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M 8.11,0.16 L 7.46,4.38 L 6.81,5.03 L 2.92,3.08 L 4.54,8.59 L 0.00,9.24 L 3.24,12.16 L 1.30,13.46 L 3.89,14.76 L 1.30,19.95 L 6.49,17.68 L 7.14,20.92 L 9.73,19.62 L 12.32,23.51 L 14.27,19.95 L 16.54,20.59 L 16.86,18.00 L 21.41,18.65 L 18.81,15.73 L 21.08,14.76 L 19.78,13.46 L 23.68,10.22 L 19.14,9.24 L 20.43,7.30 L 18.49,7.30 L 18.16,6.65 L 20.43,3.08 L 14.92,4.70 L 12.97,2.43 L 11.35,4.38 Z M 18.00,12.00 A 6.0,6.0 0 1,0 6.00,12.00 A 6.0,6.0 0 1,0 18.00,12.00 Z"/></svg>',
  combo: '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M 0.00,9.13 L 5.75,14.87 L 4.73,22.99 L 11.49,19.27 L 12.51,19.27 L 19.27,22.99 L 17.92,14.87 L 23.66,9.13 L 15.55,7.77 L 11.83,0.68 L 7.77,8.11 Z M 18.00,12.00 A 6.0,6.0 0 1,0 6.00,12.00 A 6.0,6.0 0 1,0 18.00,12.00 Z"/></svg>',
  boost: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M 0.00,9.22 L 0.00,14.20 L 2.34,16.24 L 9.66,16.24 L 11.71,14.49 L 13.46,16.24 L 20.78,16.54 L 22.24,15.95 L 23.71,13.90 L 23.71,9.80 L 21.66,7.46 L 13.46,7.46 L 11.71,8.93 L 9.66,7.17 L 2.05,7.17 Z M 13.76,10.68 L 15.22,9.22 L 19.90,9.22 L 21.37,10.39 L 21.66,12.73 L 20.20,14.49 L 15.22,14.49 L 13.76,13.32 Z M 2.05,10.39 L 3.22,9.22 L 8.78,9.22 L 9.95,10.98 L 9.66,13.32 L 8.78,14.20 L 3.22,14.20 L 2.05,13.02 Z"/></svg>',
  dot: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M 8.20,14.28 L 6.68,17.62 L 6.68,19.44 L 7.59,21.57 L 8.81,22.78 L 11.54,23.70 L 14.58,22.78 L 16.10,21.27 L 16.71,19.75 L 16.71,17.32 L 15.19,14.28 L 13.06,15.80 L 10.63,15.80 Z M 19.75,6.68 L 18.53,10.33 L 18.53,11.85 L 19.14,12.46 L 20.05,12.46 L 20.96,11.54 Z M 4.25,3.04 L 3.65,6.68 L 2.73,8.51 L 2.73,10.33 L 3.65,11.24 L 5.16,10.94 L 5.77,10.03 Z M 11.85,0.00 L 10.63,6.99 L 13.06,6.99 Z"/></svg>',
  leech: '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M 1.41,15.35 L 0.00,21.00 L 0.35,21.71 L 2.12,22.06 L 2.82,21.35 L 2.82,19.94 Z M 1.06,4.41 L 0.00,7.24 L 0.35,10.41 L 4.24,16.76 L 7.76,19.94 L 11.29,21.71 L 13.41,21.00 L 19.06,16.06 L 21.53,12.18 L 21.88,13.94 L 20.47,19.94 L 21.88,21.00 L 23.29,20.29 L 23.65,18.53 L 22.59,16.41 L 22.24,12.88 L 21.53,12.18 L 22.94,7.59 L 22.24,5.12 L 20.12,2.65 L 17.65,1.59 L 15.18,1.59 L 11.29,3.71 L 8.82,1.94 L 5.29,1.59 L 2.82,2.65 Z M 18.00,12.00 A 6.0,6.0 0 1,0 6.00,12.00 A 6.0,6.0 0 1,0 18.00,12.00 Z"/></svg>',
  fumble: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M 0.00,7.95 L 0.00,17.61 L 1.56,17.61 L 1.56,13.56 L 2.81,13.25 L 3.12,18.55 L 6.23,20.42 L 18.08,20.42 L 18.08,15.43 L 18.70,14.81 L 20.57,15.12 L 20.57,18.55 L 22.13,18.55 L 23.69,17.61 L 23.69,9.51 L 23.06,8.57 L 20.57,8.57 L 20.57,11.69 L 18.39,12.00 L 18.08,8.57 L 15.58,8.57 L 14.96,7.95 L 14.96,6.39 L 8.73,6.08 L 9.04,4.83 L 14.34,4.83 L 14.65,3.27 L 3.43,3.27 L 3.43,4.83 L 7.48,4.83 L 7.79,6.08 L 3.12,6.70 L 2.81,12.31 L 1.56,12.00 L 1.56,7.95 Z"/></svg>',
  dodge: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M 0.00,0.18 L 1.85,6.83 L 3.69,5.72 L 9.60,11.63 L 3.69,17.91 L 1.85,16.80 L 0.00,23.45 L 7.02,21.60 L 5.54,20.12 L 11.82,13.85 L 18.09,20.12 L 16.98,21.97 L 23.63,23.45 L 21.78,16.80 L 19.94,17.91 L 14.03,12.00 L 19.94,5.72 L 21.78,6.83 L 23.63,0.18 L 16.98,1.66 L 18.09,3.51 L 12.18,9.42 L 11.45,9.42 L 5.54,3.51 L 7.02,2.03 Z"/></svg>',
  leap: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M 6.17,1.37 L 3.09,4.11 L 1.37,7.89 L 1.37,21.26 L 5.49,21.26 L 5.49,9.94 L 6.51,6.51 L 9.60,4.11 L 13.03,4.11 L 16.11,6.51 L 17.14,8.91 L 17.14,17.49 L 15.77,17.83 L 19.20,23.66 L 22.29,18.17 L 21.26,17.49 L 21.26,7.54 L 19.89,4.46 L 17.14,1.71 L 14.06,0.34 L 10.29,0.00 Z"/></svg>',
  pivot: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M 0.16,0.32 L 1.76,7.04 L 3.36,5.76 L 8.16,10.56 L 4.64,10.88 L 4.00,9.28 L 0.16,11.84 L 4.32,14.40 L 4.64,12.80 L 8.80,13.12 L 3.68,18.24 L 1.76,16.96 L 0.16,23.68 L 6.88,22.08 L 5.60,20.48 L 10.40,15.68 L 10.72,18.88 L 9.44,19.20 L 9.44,19.84 L 11.68,23.68 L 14.24,19.52 L 12.64,18.88 L 12.96,15.36 L 18.08,20.48 L 16.80,22.08 L 23.52,23.68 L 21.60,16.96 L 20.00,18.24 L 14.88,13.12 L 18.72,12.80 L 19.04,14.08 L 19.68,14.08 L 23.52,11.84 L 19.36,9.28 L 18.72,10.88 L 15.52,10.56 L 20.00,6.08 L 21.60,7.36 L 23.52,0.32 L 16.48,2.24 L 18.08,3.84 L 13.28,8.64 L 12.64,8.32 L 12.64,4.48 L 14.24,4.16 L 12.00,0.00 L 9.44,3.84 L 10.72,4.48 L 10.40,8.64 L 5.60,3.84 L 6.88,2.24 Z"/></svg>',
  freeze: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M 3.81,0.00 L 3.81,4.57 L 5.71,5.33 L 9.52,11.81 L 5.33,19.43 L 3.81,19.43 L 3.81,23.62 L 19.81,23.62 L 19.81,19.43 L 17.90,19.05 L 14.10,12.57 L 17.90,5.33 L 19.81,4.57 L 19.81,0.00 Z"/></svg>',
  heal: '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M 4.43,1.85 L 2.95,2.58 L 0.37,5.91 L 0.37,10.34 L 2.95,15.14 L 7.02,19.57 L 11.45,22.15 L 12.92,22.15 L 17.72,18.83 L 20.31,15.88 L 23.63,9.97 L 23.63,6.28 L 21.05,2.58 L 18.46,1.48 L 14.40,1.85 L 12.18,3.69 L 8.49,1.48 Z M 18.00,12.00 A 6.0,6.0 0 1,0 6.00,12.00 A 6.0,6.0 0 1,0 18.00,12.00 Z"/></svg>',
  hot: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M 4.50,11.55 L 4.50,15.45 L 3.90,16.05 L 0.00,16.05 L 0.00,18.75 L 4.20,18.75 L 4.50,22.95 L 7.20,22.95 L 7.20,19.05 L 11.40,18.75 L 11.40,16.05 L 7.50,16.05 L 7.20,11.85 Z M 19.80,9.45 L 19.80,11.55 L 17.40,11.85 L 17.40,13.35 L 19.50,13.35 L 19.80,15.75 L 21.00,15.75 L 21.30,13.65 L 23.40,13.35 L 23.70,11.85 L 21.60,11.85 L 21.30,9.45 Z M 15.30,0.75 L 15.30,2.55 L 14.70,3.15 L 12.60,3.15 L 12.60,4.35 L 15.00,4.65 L 15.30,7.05 L 16.50,7.05 L 16.50,4.95 L 18.90,4.65 L 19.20,3.15 L 16.80,3.15 L 16.50,0.75 Z"/></svg>',
  block: '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M 0.63,0.84 L 1.05,16.42 L 9.05,23.16 L 13.68,23.58 L 22.53,16.42 L 22.95,0.84 L 22.11,0.00 L 1.47,0.00 Z M 18.00,12.00 A 6.0,6.0 0 1,0 6.00,12.00 A 6.0,6.0 0 1,0 18.00,12.00 Z"/></svg>',
  nullify: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M 11.63,0.00 L 6.09,1.48 L 2.03,5.17 L 0.18,9.60 L 0.18,14.40 L 1.66,18.09 L 4.25,21.05 L 8.31,23.26 L 13.48,23.63 L 18.28,21.78 L 20.86,19.57 L 23.45,14.40 L 23.45,9.60 L 21.60,5.17 L 18.65,2.22 L 14.58,0.37 Z M 20.12,7.75 L 20.86,9.60 L 20.86,14.03 L 19.75,16.62 L 17.54,19.20 L 13.85,21.05 L 9.78,21.05 L 6.46,19.20 L 19.02,7.38 Z M 17.54,4.80 L 4.25,16.98 L 2.77,14.03 L 2.77,9.60 L 3.88,7.02 L 6.83,4.06 L 9.05,2.95 L 12.74,2.58 Z"/></svg>',
  camp: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M 10.85,0.00 L 9.62,3.38 L 7.77,6.31 L 7.31,8.00 L 7.31,9.69 L 7.15,9.85 L 3.92,7.54 L 3.31,7.54 L 1.00,10.31 L 1.00,10.92 L 1.77,11.54 L 0.23,11.69 L 0.23,16.77 L 6.08,16.92 L 1.15,20.31 L 1.00,21.08 L 3.31,23.85 L 3.92,23.85 L 11.46,18.62 L 12.08,18.46 L 19.62,23.69 L 20.54,23.85 L 22.69,21.23 L 22.85,20.62 L 17.62,16.92 L 23.62,16.77 L 23.62,11.69 L 21.92,11.54 L 22.85,10.77 L 22.85,10.46 L 20.54,7.54 L 19.62,7.69 L 16.23,10.00 L 16.08,7.38 L 15.31,5.38 Z M 11.00,3.08 L 12.85,5.38 L 13.31,6.77 L 13.00,8.31 L 12.38,9.08 L 11.46,9.54 L 10.38,9.23 L 9.77,8.62 L 9.31,7.38 L 9.62,5.54 Z"/></svg>',
  door: '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M 5.28,2.26 L 3.32,4.08 L 1.81,6.34 L 0.91,8.91 L 0.60,11.62 L 0.00,11.77 L 0.00,16.75 L 0.60,16.91 L 0.60,21.58 L 1.06,22.79 L 2.26,23.70 L 21.58,23.70 L 22.34,23.25 L 23.25,21.58 L 23.25,16.91 L 23.85,16.75 L 23.85,11.77 L 23.25,11.62 L 22.64,7.70 L 20.68,4.23 L 17.66,1.66 L 16.15,0.91 L 13.13,0.15 L 10.72,0.15 L 8.60,0.60 Z M 17.96,12.38 L 19.32,12.38 L 20.38,13.43 L 20.38,14.79 L 19.17,15.85 L 17.81,15.70 L 16.91,14.64 L 16.91,13.58 Z"/></svg>',
  boss: '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M 9.13,0.30 L 6.87,1.21 L 5.06,2.42 L 3.25,4.38 L 2.34,5.89 L 1.43,8.75 L 1.43,11.62 L 0.68,11.77 L 0.68,16.75 L 3.55,16.75 L 5.06,18.26 L 7.32,19.77 L 7.32,23.09 L 7.92,23.85 L 9.13,23.85 L 9.28,21.89 L 10.34,22.04 L 10.34,23.85 L 15.92,23.85 L 16.53,23.09 L 16.53,19.77 L 18.94,18.11 L 20.15,16.75 L 23.17,16.75 L 23.17,11.77 L 22.42,11.62 L 22.42,9.06 L 22.11,7.55 L 21.06,5.13 L 19.85,3.47 L 16.98,1.21 L 15.17,0.45 L 13.06,0.00 Z M 15.62,10.26 L 17.13,11.47 L 17.43,12.98 L 16.98,14.04 L 16.23,14.79 L 14.42,15.09 L 12.91,13.89 L 12.60,12.68 L 15.02,10.26 Z M 7.62,10.26 L 8.38,10.26 L 10.64,12.53 L 10.34,14.04 L 9.58,14.79 L 8.83,15.09 L 7.77,15.09 L 6.57,14.34 L 5.96,13.28 L 6.11,11.62 Z"/></svg>',
  minion: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="10" r="1.6" fill="#fff"/><circle cx="15" cy="10" r="1.6" fill="#fff"/><circle cx="12" cy="15.5" r="1.6" fill="#fff"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 3.5C9 2.7 9.7 2 10.5 2h3c.8 0 1.5.7 1.5 1.5V6h2.2c1 0 1.8.8 1.9 1.8l.9 11c.1 1.3-.9 2.2-2.1 2.2H5.6c-1.2 0-2.2-1-2.1-2.2l.9-11C4.5 6.8 5.3 6 6.3 6H9V3.5zM11 4v2h2V4h-2zM7 10a1 1 0 102 0V8.3c0-.3-.2-.3-.3 0A3 3 0 007 10zm10 0a3 3 0 00-1.7-2.7c-.1-.1-.3 0-.3.2V10a1 1 0 002 0z"/></svg>',
  log: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4a2 2 0 012-2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4z M14 3v4h4"/></svg>',
  use: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
  key: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8.5 2a5.5 5.5 0 105.19 7.3L15 10.6V13h2v2h2v-2.6l1-.4V9h-6.31A5.5 5.5 0 008.5 2zm0 2.5A3 3 0 118 10.44 3 3 0 018.5 4.5z"/></svg>',
  blank: '',
};
// Icons whose source art bakes the action's numeric value into the shape
// itself (a hole in the traced glyph, per the sticker's own design) --
// these get the real per-die value overlaid there instead of a blank gap.
const ICON_VALUE_SLOT = new Set(['hit','combo','leech','block','heal','dot','hot']);
function iconSpan(type, value){
  if(!ICON_SVG[type]) return '';
  const overlay = (value!=null && ICON_VALUE_SLOT.has(type))
    ? `<span class="icon-value-overlay">${value}</span>` : '';
  return `<span class="icon-svg">${ICON_SVG[type]}${overlay}</span>`;
}

// ---- Basic dice ----
const BASIC_DICE = [
  {id:'atk1', name:'Attack Die I', cat:'attack', level:1, faces:faces(['Hit1','Hit1','Combo1','blank','blank','blank'])},
  {id:'atk2', name:'Attack Die II', cat:'attack', level:2, faces:faces(['Hit2','Hit2','Combo2','blank','blank','blank'])},
  {id:'atk3', name:'Attack Die III', cat:'attack', level:3, faces:faces(['Hit3','Hit3','Combo3','blank','blank','blank'])},
  {id:'man1', name:'Maneuver Die I', cat:'maneuver', level:1, faces:faces(['Dodge','Dodge','Leap','Leap','blank','blank'])},
  {id:'man2', name:'Maneuver Die II', cat:'maneuver', level:2, faces:faces(['Dodge','Dodge','Leap','Leap','Pivot','blank'])},
  {id:'man3', name:'Maneuver Die III', cat:'maneuver', level:3, faces:faces(['Dodge','Dodge','Leap','Leap','Pivot','Pivot'])},
];
function basic(cat, level){ return BASIC_DICE.find(d=>d.cat===cat && d.level===level); }


// ---- Relics: permanent, run-long passive perks (a second build axis next to
// dice). Found at Relic Shrines (choose 1 of 3) -- and each Origin has its
// own signature relic, which that Origin starts every run with once the
// player has won a run as it (see newGame()). `mono` is the 2-letter badge
// shown until real art exists. Effects are applied in logic.js (search for
// hasRelic / applyRelicsToSteps). Keep in sync with the manual's Relics
// section.
const RELICS = [
  // General pool (Relic Shrine offers)
  {id:'whetstone',  name:'Whetstone',          mono:'WS', desc:'Your first Hit each turn deals +2 damage.'},
  {id:'iron_rations',name:'Iron Rations',      mono:'IR', desc:'Heal 2 after every victory.'},
  {id:'gambeson',   name:'Padded Gambeson',    mono:'PG', desc:'Every enemy attack deals 1 less damage.'},
  {id:'lucky_coin', name:'Lucky Coin',         mono:'LC', desc:'Loot rewards offer +1 die to choose from.'},
  {id:'kettle',     name:'Campfire Kettle',    mono:'CK', desc:'Resting at Camp heals 3 extra.'},
  {id:'banner',     name:'Vanguard Banner',    mono:'VB', desc:'Start every fight with 3 Block.'},
  {id:'flask',      name:'Bottomless Flask',   mono:'BF', desc:'+8 maximum health, right now.'},
  {id:'echo_chime', name:'Echo Chime',         mono:'EC', desc:'A Path of 5 or more dice deals +3 damage.'},
  {id:'venom_vial', name:'Venom Vial',         mono:'VV', desc:'Every D.O.T. face you play adds +1 D.O.T.'},
  {id:'hungry_blade',name:'Hungry Blade',      mono:'HB', desc:'Overkill triggers at 6 extra damage instead of 10.'},
  {id:'tincture',   name:'Tincture Kit',       mono:'TK', desc:'Every Heal face you play heals +1.'},
  // Origin signature relics (never offered at shrines)
  {id:'forgeplate', name:'Forgeplate',         mono:'FP', origin:'dwarf',    desc:'Start every fight with 5 Block.'},
  {id:'spore_satchel',name:'Spore Satchel',    mono:'SS', origin:'gnome',    desc:'Leech faces also add +2 D.O.T. and heal +1 more.'},
  {id:'picnic_basket',name:'Picnic Basket',    mono:'PB', origin:'halfling', desc:'Heal faces heal +2 and H.O.T. faces add +1 H.O.T.'},
  {id:'glimmer_dust',name:'Glimmer Dust',      mono:'GD', origin:'pixie',    desc:'Each Dodge, Leap or Pivot in your Path adds +1 damage to its last damaging die.'},
];
function relicById(id){ return RELICS.find(r=>r.id===id); }
function originRelicFor(originId){ return RELICS.find(r=>r.origin===originId); }

// ---- Origin dice ----
const ORIGINS = [
  {id:'dwarf', name:'Dwarf', die:'Dwarven Doohickie', blurb:'Shield up, then pop it for a big Hit.', faces:faces(['Hit2','Boost1','Boost1','Pivot','Block2','Block2'])},
  {id:'gnome', name:'Gnome', die:'Gnomish Mushroom Cap', blurb:'Continuous damage and self-sustain over time.', faces:faces(['Combo1','Boost1','DOT1','DOT1','Leech1','Dodge'])},
  {id:'halfling', name:'Halfling', die:'Bonus Breakfast', blurb:'Second breakfast and good cheer -- healing and buffs to keep the party going.', faces:faces(['Combo1','Boost1','Heal2','Heal2','HOT1','Nullify'])},
  {id:'pixie', name:'Pixie', die:'Pixie Powder', blurb:'Blinks past trouble and leaves a little mischief behind.', faces:faces(['Combo1','Boost1','DOT1','Dodge','Leap','Freeze'])},
];

// ---- Classes ----
// Tray coordinates: r,c each run 0-3 (r=0 top row, c=0 left column).
// `color` matches each Class's highlighted-zone color from the original
// tabletop manual's Dice Tray diagram (Guard=cyan, Armsmaster=red,
// Dungeoneer=orange, Arcanist=magenta) -- carried over so the digital
// Class picker identifies each Class the same way the physical game does.
const CLASSES = [
  {id:'armsmaster', name:'Armsmaster', color:'#c0392f', ability:'Once per turn, turn any Action or Blank in your zone (right column) into a Hit (2).',
    zone:(r,c)=> c===3, convertTo:{type:'hit', value:2}},
  {id:'guard', name:'Guard', color:'#2fb8b8', ability:'Once per turn, turn any Action or Blank in your zone (middle-right block) into a Block (2).',
    zone:(r,c)=> (r===1||r===2) && (c===2||c===3), convertTo:{type:'block', value:2}},
  {id:'dungeoneer', name:'Dungeoneer', color:'#d4812e', ability:'Your zone (the two middle squares on the left and right edges) wraps left-to-right when building a Path.',
    zone:(r,c)=> (r===1||r===2) && (c===0||c===3), wrap:true},
  {id:'arcanist', name:'Arcanist', color:'#b4419a', ability:'Within your zone (the rising diagonal), you may move diagonally as if using Dodge.',
    zone:(r,c)=> r+c===3, diagonalZone:true},
  {id:'debug', name:'Debug', color:'#9aa3ab', ability:'No class ability. Starting tray is a random assortment of every die type in the game, for testing.',
    zone:(r,c)=> false, debug:true},
];

// ---- Loot dice ----
function lootSet(list, tier){ return list.map(([name,fs])=>({name, faces:faces(fs), cat:tier})); }

const ALLOY = lootSet([
  ['Greathammer', ['Hit2','Hit2','Combo2','blank','blank','blank']],
  ['Spiked Shield', ['Hit2','Block2','Block2','Nullify','blank','blank']],
  ['Buckler', ['Combo1','Combo1','Block1','Block1','Nullify','blank']],
  ['Whip', ['Combo1','Combo1','Combo1','Pivot','blank','blank']],
  ['Dagger', ['Hit1','Hit1','Combo1','Combo1','Dodge','blank']],
  ['Longbow', ['Hit2','Hit2','Boost1','Boost1','Block1','blank']],
  ['Unlabelled Mixture', ['Combo1','Boost1','Fumble1','HOT1','Nullify','blank']],
  ['Healing Draught', ['Heal2','Heal2','HOT1','Nullify','blank','blank']],
  ['Tarot Deck', ['Boost1','Dodge','Leap','Pivot','Block1','blank']],
  ['Lance', ['Hit1','Hit1','Combo1','Combo1','Leap','blank']],
  ['Greataxe', ['Hit2','Hit2','DOT2','blank','blank','blank']],
  ['Claymore', ['Hit2','Hit2','Combo2','Fumble1','blank','blank']],
  ['Rapier', ['Hit1','Hit1','Hit1','Hit1','Combo1','Dodge']],
  ['Longsword', ['Hit1','Hit1','Hit1','Combo2','blank','blank']],
  ['Crossbow', ['Hit2','Hit2','Boost1','Dodge','Block1','blank']],
  ['Blunderbuss', ['Hit2','Hit2','Boost2','Fumble1','Leap','blank']],
  ['Ironskin Draught', ['HOT1','HOT1','Block1','Block2','blank','blank']],
  ['Acid Potion', ['Hit1','Hit2','DOT1','DOT1','Fumble1','blank']],
  ['Grappling Set', ['Combo2','Dodge','Dodge','Leap','Leap','blank']],
  ['Medsack', ['Heal2','Heal2','Heal2','Heal2','blank','blank']],
], 'alloy');

const GILDED = lootSet([
  ['Hidden Estoc', ['Hit2','Hit2','Hit2','Hit2','Combo1','Leap']],
  ['Greaterhammer', ['Hit3','Hit3','Hit3','Combo2','blank','blank']],
  ['Hataxe', ['Hit2','DOT2','Block3','Block3','blank','blank']],
  ['Triage Turret', ['Hit2','Boost2','DOT2','Heal2','Heal2','blank']],
  ['Eye-Frame', ['Combo2','Combo2','Dodge','Dodge','Leap','Leap']],
  ["Drafter's Draught", ['Boost2','Boost2','Boost2','Freeze','Nullify','blank']],
  ['Thorned Bulwark', ['Hit1','Hit1','Block3','Block3','Block3','blank']],
  ['Cool Whip', ['Hit1','Combo2','Combo1','Combo1','Combo1','blank']],
  ['Humor-inverter', ['Fumble1','Fumble1','HOT2','HOT2','HOT2','blank']],
  ['Winged Boots', ['Combo3','Dodge','Leap','Pivot','Nullify','blank']],
  ['Drill Shield', ['Hit2','Hit2','Block3','Block3','Nullify','blank']],
  ['Maximum Capacitor', ['Fumble1','Leap','Boost2','Boost3','Boost3','blank']],
  ['Mining Mines', ['Pivot','Combo2','Combo2','Boost2','blank','blank']],
  ['Charge-Atlatl', ['Hit2','Hit2','Combo2','Combo1','Boost2','blank']],
  ['Portable RNGenerator', ['Combo1','Leech1','Freeze','HOT1','Nullify','blank']],
  ['Poison Sword', ['Hit2','Hit2','Combo2','DOT2','blank','blank']],
  ['Sporific Staff', ['DOT1','Leech1','Leech1','Pivot','HOT1','blank']],
  ['Genetic Drifter', ['Combo1','Leech1','Pivot','Pivot','Nullify','blank']],
  ['Leeching Lance', ['Hit1','Combo1','DOT2','Leech1','Pivot','blank']],
  ['Pleasant Parasite?', ['Combo1','Combo1','Fumble1','Heal2','Heal2','HOT2']],
], 'gilded');

const MAGIC = lootSet([
  ['Greatesthammer', ['Hit4','Hit4','Hit4','Combo2','Combo2','blank']],
  ['Dodecahedron of Future Pasts', ['Boost3','Boost3','Boost3','DOT3','Fumble1','Freeze']],
  ['Legendary Sheath', ['Hit3','Hit3','Combo3','Boost3','Boost3','blank']],
  ['Warp Crossbow', ['Hit3','Hit3','Boost4','Pivot','Pivot','blank']],
  ['N-th Dimensional Printer', ['DOT2','DOT2','Fumble1','HOT2','HOT2','HOT2']],
  ["Aloo'Minium Armor", ['Dodge','Leap','Block4','Block4','Block4','Block4']],
  ['Phlebotomizer', ['Hit3','Combo3','DOT1','DOT1','DOT1','DOT1']],
  ['Straw of the Last Lamia', ['Hit3','Hit3','Combo3','Leech1','Leech1','blank']],
  ["Hospitaler's Merciful Guillotine", ['Hit3','Hit3','Combo3','Heal3','Heal3','blank']],
  ['Glacial Gorget', ['Freeze','Freeze','Block5','Block5','Nullify','Nullify']],
  ['Pre-handy-sile Tail', ['Combo2','Combo2','Combo2','Leech1','Leech1','Pivot']],
  ['Measurably Lucky Test Tube', ['Combo2','Pivot','Freeze','HOT2','HOT2','Nullify']],
], 'magic');

// ---- Encounters (Cards 0.4 sheet -- the most complete/current tab) ----
// fields: name,type,health,questHealth,dmg,minion,shield,heal,dot,hot,quests[],flavor
function enc(name,type,health,extra){ return Object.assign({name,type,health,maxHealth:health,dmg:0,minion:0,shield:0,heal:0,dot:0,hot:0,quests:[],flavor:''}, extra); }

const FLOOR1_ENEMIES = [
  enc('Filement Bunny','Enemy',7,{dmg:2,flavor:'"Cute, until it gunks up your gears and gnaws off your toes!"'}),
  enc('Wooden Golem','Enemy',10,{questHealth:5,dmg:3,quests:['5 damage: 3 maneuvers'],flavor:'Shoddy construction is evident from the visible weak points.'}),
  enc('Feral Pet Rock','Enemy',12,{dmg:2,flavor:'Somedwarf took this companion for granite…'}),
  enc('Unbound Automa','Enemy',15,{questHealth:6,dmg:3,quests:['5 damage: 3 maneuvers'],flavor:'This replaced the Automaton, mostly to remove the weight.'}),
  enc('Beaker Breakers','Enemy',15,{questHealth:6,dmg:1,heal:1,quests:['5 damage: 2 dodge'],flavor:'"No longer into flasks"'}),
  enc('Viscous Orb','Enemy',10,{dmg:2,minion:1,flavor:'"Thankfully it isn\u2019t a gelatinous cube!"'}),
  enc('United Separatists','Enemy',12,{dmg:1,heal:1,flavor:'"Nothing like a shared schism to bring people apart".'}),
  enc('Amanitabomination','Enemy',14,{questHealth:6,dmg:2,shield:2,quests:['5 damage: 2 heals'],flavor:'"I was benevolent and good, misery made me a foe"'}),
  enc('Grafted Grifter','Enemy',15,{questHealth:6,dmg:2,shield:2,quests:['5 damage: 2 leap'],flavor:'Known to charge an arm and a leg.'}),
  enc('Leper Colonizers','Enemy',12,{dmg:2,shield:2,flavor:'"May our crustulant new Chempire outlast its crumbling citizens!"'}),
];
const FLOOR1_TRAPS = [
  enc('Displacer Lair','Trap',25,{questHealth:15,dmg:3,quests:['10 damage: any 6 actions','10 damage: any 8 actions','10 damage: any 10 actions'],flavor:'"Move either very fast or very slow. Don\u2019t touch the bellies"'}),
  enc('Rigged Sporks','Trap',25,{questHealth:15,dmg:1,shield:2,quests:['10 damage: 4 maneuvers','10 damage: 2 leap','10 damage: 2 dodge'],flavor:'Elegantly spiked-spores, set to blow upon detecting the slightest movement.'}),
  enc('Unauthorized Transfusion','Trap',25,{questHealth:15,dmg:1,hot:1,quests:['10 damage: 3 maneuvers','10 damage: 2 block','1 nullify: 8 damage/turn'],flavor:'"Everyone is a universal donor if you aren\u2019t picky"'}),
  enc('Leper Con-Trap','Trap',25,{questHealth:15,dmg:2,minion:1,quests:['10 damage: 3 maneuvers','20 damage: 10 blanks','1 nullify: 8 damage/turn'],flavor:'"Do not listen to anyone who claims to already know where the treasure is"'}),
];
const FLOOR1_SHRINES = [
  enc('Sacred Bellows','Shrine',0,{boon:'Upgrade Player Maximum Health by 5.', effect:{type:'maxHealthUp', amount:5}}),
  enc('Expediting Spores','Shrine',0,{boon:'Upgrade a lvl 1 Maneuver Die to a lvl 2 Maneuver Die.', effect:{type:'dieUpgrade', cat:'maneuver'}}),
  enc('Ecclectrical Outlet','Shrine',0,{boon:'Trade in loot for one of three Alloy dice options.', effect:{type:'tradeLoot', pool:'Alloy'}}),
  enc('Half-Empty Fountain','Shrine',0,{boon:'Heal 10 OR Upgrade Player Max Health by 5.', effect:{type:'choice', options:[
    {label:'Heal 10', effect:{type:'heal', amount:10}},
    {label:'+5 Max Health', effect:{type:'maxHealthUp', amount:5}},
  ]}}),
  enc('Scroll Dispenser: CLEAR','Shrine',0,{boon:'Gain a one-use Nullify token (x3).', effect:{type:'grantToken', token:'nullify', charges:3}}),
];
const FLOOR1_BOSSES = [
  enc('Rogue Golemancer','Boss',24,{dmg:2,minion:1,flavor:'"You cannot handle my golems, adventurer."'}),
  enc('Heating Elemental','Boss',40,{questHealth:25,dmg:3,hot:1,quests:['35 damage: survive to turn 5'],flavor:'"Anyone know the average melting point on the Plane of Immolation?"'}),
  enc('Grosteque Grafter','Boss',50,{questHealth:30,dmg:2,shield:2,quests:['8 dot: deal 10+ damage in a single round'],flavor:'Oft criticized for reusing parts of other bosses.'}),
];

const FLOOR2_ENEMIES = [
  enc('Displacer Kitty','Enemy',18,{dmg:3,flavor:'"I think that one had a collar. Where\u2019d it go?"'}),
  enc('Armored Gear-Pest','Enemy',23,{dmg:2,flavor:'A well-documented example of dungeon adaptation.'}),
  enc('Rusty Golem','Enemy',23,{questHealth:8,dmg:4,quests:['16 damage: survive turn 4'],flavor:'"Looks like it was falling apart on its own"'}),
  enc('Rogue Technician','Enemy',16,{dmg:4,flavor:'"I\u2019m not here to fix your lockpick, I have an ideology!"'}),
  enc('The Warcart','Enemy',25,{questHealth:9,dmg:2,shield:2,quests:['8 damage: 4 maneuvers'],flavor:'The top contributing reason as to why mining is the most dangerous profession.'}),
  enc('Blastogenesis Engine','Enemy',14,{dmg:3,minion:2,flavor:'A true perpetual devotion machine.'}),
  enc('Half-life Host','Enemy',26,{questHealth:8,dmg:3,shield:2,quests:['8 damage: 2 heal'],flavor:'"\u2018Release spores. Multiply.\u2019? - Now I\u2019m always saying that!"'}),
  enc('Lichen-Thrope','Enemy',24,{dmg:3,heal:1,flavor:'Under the luminance of the full bloom, this creature becomes a true hater.'}),
  enc('Fungal Flayer','Enemy',20,{questHealth:10,dmg:3,hot:2,quests:['16 damage: accumulate 5 block'],flavor:'It is, in fact, acceptable to hate the flayer.'}),
  enc('Illegal Operation','Enemy',19,{dmg:4,hot:1,flavor:'"Oh no, maybe we try multiplying by zero this time??"'}),
];
const FLOOR2_TRAPS = [
  enc('Adhesive Pest Traps','Trap',30,{questHealth:20,dmg:2,minion:2,quests:['15 damage: 3 maneuvers','15 damage: 4 maneuvers','15 damage: 5 maneuvers'],flavor:'"Environmentally friendly snares for unfriendly environments"'}),
  enc('Ditched Heist','Trap',30,{questHealth:20,dmg:2,shield:3,quests:['15 damage: any 8 actions','15 damage: any 3 or fewer actions','20 damage: 8 blanks'],flavor:'Looks like the previous party spent too long describing their plans to finish them.'}),
  enc('Unventilated Workshop','Trap',30,{questHealth:20,hot:2,quests:['15 damage: 2 block','15 damage: 4 maneuvers','nullify: 12+ damage'],flavor:'"Carol never wore her ventilator. Now she doesn\u2019t need it."'}),
  enc('The Strike-Breaker','Trap',30,{questHealth:20,dmg:6,quests:['5 damage: survive 2','10 damage: survive 4','15 damage: survive 6'],flavor:'Inevitably causes scabs.'}),
];
const FLOOR2_SHRINES = [
  enc('Enchanted Anvil','Shrine',0,{boon:'Upgrade a lvl 1 Attack Die to a lvl 2 Attack Die.', effect:{type:'dieUpgrade', cat:'attack'}}),
  enc('Alchemists Stone','Shrine',0,{boon:'Upgrade Player Maximum Health by 10.', effect:{type:'maxHealthUp', amount:10}}),
  enc('Department Spore','Shrine',0,{boon:'Choose one of three Relics.', effect:{type:'relicChoice'}}),
  enc('Half-Full Fountain','Shrine',0,{boon:'Heal 15 OR Upgrade Player Maximum Health by 10.', effect:{type:'choice', options:[
    {label:'Heal 15', effect:{type:'heal', amount:15}},
    {label:'+10 Max Health', effect:{type:'maxHealthUp', amount:10}},
  ]}}),
  enc('Scroll Dispenser: BIG','Shrine',0,{boon:'Gain a one-use x4 Boost token (x2).', effect:{type:'grantToken', token:'boost', value:4, charges:2}}),
];
const FLOOR2_BOSSES = [
  enc('The Necrorancher','Boss',35,{dmg:2,minion:2,quests:['nullify: deal 12 damage in a single turn'],flavor:'Herder of the haunted, granger of the ghoulish, planter of the parasitic.'}),
  enc('Bellicose Biomancer','Boss',50,{questHealth:25,dmg:4,hot:2,quests:['20 damage: 3 hot','20 damage: 5 dot'],flavor:'Not content with creating life, this relentless innovator seeks new ways to destroy it.'}),
  enc('Ceramic Golem','Boss',70,{questHealth:40,dmg:3,shield:3,quests:['8 dot: deal 15+ damage in a single round','30 damage: 5 maneuvers'],flavor:'The bespoke sommelier of the Co-Consul, now cracked and seeping with drink.'}),
];

const FLOOR3_ENEMIES = [
  enc('Morel Dilemma','Enemy',14,{minion:2,hot:2,flavor:'A fungal species that has stumped, and subsequently eaten, philosophers for generations.'}),
  enc('Chimeric Sludge','Enemy',25,{questHealth:12,dmg:3,hot:2,quests:['12 damage: 4 maneuvers'],flavor:'Biological slag, made up of countless individual chimeras.'}),
  enc('Gnome Chomper','Enemy',28,{questHealth:6,dmg:6,quests:['6 damage: 3 maneuvers'],flavor:'"The Gnomish Chempire is the leading zealot state!"'}),
  enc('Parasite Seer','Enemy',20,{dmg:3,shield:3,flavor:'Sees into multiple parallel futures, though limited only to popular travel destinations.'}),
  enc('Gestalt Network','Enemy',20,{dmg:3,dot:2,flavor:'"You will join us. Our population is mushrooming."'}),
  enc("Oilephant's Foot",'Enemy',30,{questHealth:15,dmg:2,hot:3,quests:['15 damage: 4 support actions'],flavor:'"An Oilephant never forgets" refers to the long-lasting effects of radiation.'}),
  enc('Extractnid Matriarch','Enemy',22,{dmg:3,minion:3,quests:['nullify: 10+ damage'],flavor:'Undisturbed for eons, this primordial weaver and its brood now stir and hunger for glass.'}),
  enc('The Punished','Enemy',36,{dmg:3,minion:1,flavor:'Those foolish enough to try and harness forms they are unable to comprehend.'}),
  enc('Profane Geometry','Enemy',35,{questHealth:10,dmg:3,hot:2,quests:['10 damage: adventurer H.O.T. = D.O.T.'],flavor:'A simulacrum of the divine, insatiable as the curiosity by which it was conjured.'}),
  enc('Sacred(?) Geometry','Enemy',38,{questHealth:10,dmg:3,dot:2,quests:['10 damage: encounter D.O.T. = H.O.T.'],flavor:'A mere reflection of the divine geometry. The impossible beauty pains your eyes.'}),
];
const FLOOR3_TRAPS = [
  enc('Anti-Euclidian Space','Trap',40,{questHealth:30,dmg:7,shield:2,quests:['10 damage: any 10 actions','15 damage: any 12 actions','20 damage: any 15 actions'],flavor:'Where forbidden postulates are illogically deduced from perfidious axioms.'}),
  enc('Ergot Eruption','Trap',40,{questHealth:30,dmg:3,hot:3,quests:['15 damage: 4 maneuvers','20 damage: 3 pivot','3 hot: 15+ damage'],flavor:'"Fortune favors the mold" — Plinthi the Eldar before death.'}),
  enc('Self-Replicating Forge','Trap',40,{questHealth:30,dmg:3,minion:6,quests:['15 damage: 4 maneuvers','20 damage: 3 boosts','1 freeze: 15+ damage'],flavor:'Hydra-aulic systems rebuild themselves stronger when damaged.'}),
  enc('Bio-Mutant Escape','Trap',40,{questHealth:30,dmg:4,minion:4,quests:['15 damage: 2 nullify','20 damage: 4 support actions','20 damage: survive 4'],flavor:'No weapon known to gnome can stop 30-50 feral mutants.'}),
];
const FLOOR3_SHRINES = [
  enc('Scrying Spheroid','Shrine',0,{boon:'Replace a loot die with a random Magic die.', effect:{type:'randomDieReplace', pool:'Magic'}}),
  enc("Heron's Fountain",'Shrine',0,{boon:'Upgrade Player Maximum Health by 15.', effect:{type:'maxHealthUp', amount:15}}),
  enc('Storied Emporium','Shrine',0,{boon:'Choose one of three Relics.', effect:{type:'relicChoice'}}),
  enc('Scroll Dispenser: STOP','Shrine',0,{boon:'Gain a one-use Freeze token.', effect:{type:'grantToken', token:'freeze', charges:1}}),
];
const BIG_BOSSES = [
  enc('Extruzeon, Co-consul of Waste','Big Boss',90,{questHealth:60,dmg:6,shield:2,hot:1,quests:['30 damage: 3 boosts','30 damage: 6 maneuvers in a single turn','freeze: 20+ damage'],flavor:'"And to think\u2026I hesitated."'}),
  enc('Myceleus, Co-consul of Rot','Big Boss',75,{questHealth:60,dmg:2,minion:2,dot:1,hot:2,quests:['30 damage: 3 combos','30 damage: 6 maneuvers in a single turn','nullify: 15+ damage'],flavor:'"Extinction is the rule. Your survival is the exception!"'}),
];

const FLOORS = [
  {enemies:FLOOR1_ENEMIES, traps:FLOOR1_TRAPS, shrines:FLOOR1_SHRINES, bosses:FLOOR1_BOSSES, lootPool:ALLOY, lootName:'Alloy'},
  {enemies:FLOOR2_ENEMIES, traps:FLOOR2_TRAPS, shrines:FLOOR2_SHRINES, bosses:FLOOR2_BOSSES, lootPool:GILDED, lootName:'Gilded'},
  {enemies:FLOOR3_ENEMIES, traps:FLOOR3_TRAPS, shrines:FLOOR3_SHRINES, bosses:[], lootPool:MAGIC, lootName:'Magic'},
];
