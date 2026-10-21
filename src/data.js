/* =========================================================================
   DATA
   ========================================================================= */
// Bump this with every change that ships -- patch (x.y.Z) for a small
// tweak/fix like a wording or layout change, minor (x.Y.0) for a new
// feature, major (X.0.0) for a breaking/full redesign. Shown in Settings
// so there's always a quick way to tell whether two builds differ.
const GAME_VERSION = '1.41.71';

function face(str){
  if(str==null) return {type:'blank'};
  const s = String(str).trim();
  if(!s || /^blank$/i.test(s)) return {type:'blank'};
  if(/^dodge$/i.test(s)) return {type:'dodge'};
  if(/^leap$/i.test(s)) return {type:'leap'};
  if(/^pivot$/i.test(s)) return {type:'pivot'};
  if(/^freeze$/i.test(s)) return {type:'freeze'};
  if(/^nullify$/i.test(s)) return {type:'nullify'};
  if(/^swap$/i.test(s)) return {type:'swap'};
  if(/^reroll$/i.test(s)) return {type:'reroll'};
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
  dodge:'Dodge', leap:'Leap', pivot:'Pivot', freeze:'Freeze', swap:'Swap', reroll:'Reroll', heal:'Heal', hot:'H.O.T.', block:'Block', nullify:'Nullify', blank:'—'};

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
  dodge: "Continues the path in an adjacent diagonal direction.",
  leap: "Continues your path to a non-adjacent die -- clears a Minion die if it jumps clean over one.",
  pivot: "Continues your path in any adjacent direction.",
  freeze: "The enemy skips its next action.",
  swap: "Tap it, then tap any die: they trade places (works mid-path too, on dice outside the path). This die then becomes a Pivot for the rest of the turn. Clear undoes it.",
  reroll: "Tap it, then tap any die to reroll it to a different non-blank face (works mid-path too, on dice outside the path). This die then becomes a Pivot for the rest of the turn.",
  heal: "Restores your health immediately.",
  hot: "Heals you over time. Your H.O.T. can stack up to 6.",
  block: "Gain Block, which reduces the next hit you take.",
  nullify: "Clears every harmful effect it can -- Minions, your D.O.T. and the enemy's H.O.T.",
  blank: "No effect this turn.",
};

// Descriptions for an ENCOUNTER's own actions (the boss "cycles through" row
// and a regular enemy's "Each turn:" badges) -- same idea as FACE_DESC but
// phrased from the enemy's side, since these are things it does to you, not
// dice you're playing.
const ENEMY_ACTION_DESC = {
  hit: "Deals damage to you.",
  minion: "Summons Minion dice that clog your Tray.",
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
    case 'minion': return `Summons ${val} Minion ${val===1?'die that clogs':'dice that clog'} your Tray. Each damage you deal clears one, or Leap clean over ${val===1?'it':'them'}.`;
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
  dot: "Deals damage each turn, then drops by 1.",
  hot: "Heals each turn, then drops by 1.",
  block: "Absorbs the next hit(s) taken before health is lost.",
  shield: "Absorbs the next hit(s) the enemy takes before its health is lost.",
  minions: "Minion dice clog your tray. Each point of damage you deal clears one; a Leap clean over one clears it too.",
  boost: "Your very next played action's value will be multiplied.",
};

// Plain-language descriptions for each kind of route-bar node, shown on
// mouseover/long-press so it's clear what's ahead before you get there.
// "enc" nodes cover monster/trap/shrine encounters -- which one it'll
// actually be isn't decided until you reach it, so the tooltip says so.
const ROUTE_STEP_DESC = {
  camp: "Camp -- organize your tray, then use the campfire: Rest or Train (upgrade dice).",
  enc: "Encounter -- Reveal a monster, trap, or shrine.",
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
    body: "Build a path across your dice tray each turn to fight, heal, and move. Clear all three floors to win.",
  },
  {
    title: "Your Tray",
    body: "Tap a die to start a path, then tap an adjacent die to extend it (some dice let you jump or change direction!). Longer paths combo for bigger effects. Long-press any die to see what its face does.",
  },
  {
    title: "The Route",
    body: "The bar at the top shows this floor. There are campsites where you either rest or train (upgrade dice), both Boons and Banes to encounter, and a Boss at the end. Long-press a node to see more.",
  },
  {
    title: "One More Thing",
    body: "The Codex in Settings (the gear) holds the Action Key, a full glossary of every icon in the game, plus a Bestiary of every monster you meet. Check it any time you forget what something does. Good luck!",
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
  swap: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M 2,4.5 L 15,4.5 L 15,1 L 22.5,6.25 L 15,11.5 L 15,8 L 2,8 Z M 22,16 L 9,16 L 9,12.5 L 1.5,17.75 L 9,23 L 9,19.5 L 22,19.5 Z"/></svg>',
  reroll: '<svg viewBox="0 0 24 24"><path d="M 19.5,12 A 7.5,7.5 0 1 1 16.6,6.1" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path fill="currentColor" d="M 21.5,1.5 L 21.5,10.5 L 12.5,10.5 Z"/></svg>',
  blank: '',
};
// Icons whose source art bakes the action's numeric value into the shape
// itself (a hole in the traced glyph, per the sticker's own design) --
// these get the real per-die value overlaid there instead of a blank gap.
const ICON_VALUE_SLOT = new Set(['hit','combo','leech','block','heal','dot','hot']);
// Small-tile versions of icons whose detail disappears below ~20px (Jeremy, Oct 13: the mini Dodge read as a plain X).
const ICON_SVG_SMALL = {
  dodge: '<svg viewBox="0 0 24 24"><path d="M7.2 7.2 L16.8 16.8 M16.8 7.2 L7.2 16.8" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path fill="currentColor" d="M1 1 L11 2.6 L2.6 11 Z M23 1 L21.4 11 L13 2.6 Z M1 23 L2.6 13 L11 21.4 Z M23 23 L13 21.4 L21.4 13 Z"/></svg>',
};
// Solid versions of the icons that have a hole for the number (Oct 14, Jeremy): used where the number sits beside the
// icon instead of inside it (enemy chips). Drops every sub-shape whose bounding box lies inside another one's.
const ICON_SVG_SOLID = {};
function solidIcon(type){
  if(ICON_SVG_SOLID[type]) return ICON_SVG_SOLID[type];
  const svg = ICON_SVG[type] || '';
  const out = svg.replace(/ d="([^"]+)"/, (m, d)=>{
    const subs = d.split(/(?=M)/).map(x=>x.trim()).filter(Boolean);
    if(subs.length < 2) return m;
    const box = sp=>{ const n = sp.match(/-?\d+(\.\d+)?/g).map(Number); const xs = n.filter((_,i)=>i%2===0), ys = n.filter((_,i)=>i%2===1);
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
    const bs = subs.map(box);
    const inside = (a,b)=> a!==b && a[0]>=b[0] && a[1]>=b[1] && a[2]<=b[2] && a[3]<=b[3];
    const keep = subs.filter((_,i)=> !bs.some((b,j)=> j!==i && inside(bs[i], b)));
    return ` d="${keep.join(' ')}"`;
  }).replace(' fill-rule="evenodd"', '');
  return (ICON_SVG_SOLID[type] = out);
}
function iconSpanSolid(type){ return ICON_SVG[type] ? `<span class="icon-svg">${ICON_VALUE_SLOT.has(type) ? solidIcon(type) : ICON_SVG[type]}</span>` : ''; }
function iconSpan(type, value, small){
  if(!ICON_SVG[type]) return '';
  if(small && ICON_SVG_SMALL[type]) return `<span class="icon-svg">${ICON_SVG_SMALL[type]}</span>`;
  const overlay = (value!=null && ICON_VALUE_SLOT.has(type))
    ? `<span class="icon-value-overlay">${value}</span>` : '';
  return `<span class="icon-svg">${ICON_SVG[type]}${overlay}</span>`;
}

// ---- Basic dice ----
const BASIC_DICE = [
  // Oct 14 (Jeremy, "ship moderate"): level II/III basics are stronger so a Train (combine) at camp pays off;
  // upgraded basics now hold their Tray slots against loot (docs/studies/2026-10-14_system_knockout.md).
  {id:'atk1', name:'Attack Die I', cat:'attack', level:1, faces:faces(['Hit1','Hit1','Combo1','blank','blank','blank'])},
  {id:'atk2', name:'Attack Die II', cat:'attack', level:2, faces:faces(['Hit2','Hit2','Combo2','Hit1','blank','blank'])},
  {id:'atk3', name:'Attack Die III', cat:'attack', level:3, faces:faces(['Hit3','Hit3','Combo3','Hit2','Hit1','blank'])},
  {id:'man1', name:'Maneuver Die I', cat:'maneuver', level:1, faces:faces(['Dodge','Dodge','Leap','Leap','blank','blank'])},
  // Oct 13 (Jeremy): high Maneuver dice scale with a small Block ladder, so an upgraded Maneuver is worth as much as an
  // upgraded Attack (regular bot: II 92% vs Attack II 89%, III 95% vs Attack III 95%; docs/studies/2026-10-13_floor3_extruzeon.md).
  {id:'man2', name:'Maneuver Die II', cat:'maneuver', level:2, faces:faces(['Dodge','Dodge','Leap','Pivot','Block2','Block2'])},
  {id:'man3', name:'Maneuver Die III', cat:'maneuver', level:3, faces:faces(['Dodge','Leap','Pivot','Block2','Block2','Boost1'])},
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
  {id:'whetstone',  name:'Prime Edge',          mono:'PE', desc:'Your first Hit each turn deals +2 damage.', tags:['offense']},
  {id:'iron_rations',name:'Mandated Lunch Break',      mono:'LB', desc:'Heal 2 after every victory.', tags:['loot','defense']},
  {id:'gambeson',   name:'Minus-One Mantra',    mono:'MM', desc:'Every enemy attack deals 1 less damage.', tags:['defense']},
  {id:'lucky_coin', name:'Need Before Greed',         mono:'NG', desc:'Loot rewards offer +1 die to choose from.', tags:['loot']},
  {id:'kettle',     name:'Percolation Theory',    mono:'PT', desc:'Resting at Camp heals 3 extra.', tags:['loot','defense']},
  {id:'banner',     name:'Hard Hat Act',    mono:'HH', desc:'Start every fight with 3 Block.', tags:['defense']},
  {id:'flask',      name:'Klein Bottle',   mono:'KB', desc:'+8 maximum health, right now.', tags:['defense']},
  {id:'echo_chime', name:'Perfect Fifth',         mono:'PF', desc:'A Path of 5 or more dice deals +3 damage.', tags:['path','offense']},
  {id:'venom_vial', name:'Exponential Decay',         mono:'ED', desc:'Every D.O.T. face you play adds +1 D.O.T.', tags:['offense']},
  {id:'hungry_blade',name:'Bloodthirst',      mono:'BT', desc:'Overkill triggers at 6 extra damage instead of 10.', tags:['offense','loot']},
  {id:'tincture',   name:'Union Health Plan',       mono:'UH', desc:'Every Heal face you play heals +1.', tags:['defense']},
  // v1.36.0 additions. Conversion family:
  {id:'barbed_buckler', name:"Nature's Thorns",  mono:'NT', desc:'Each Block you gain from your path also deals 1 damage.', tags:['offense','defense']},
  {id:'overflow_chalice',name:'Power Word: Safe',mono:'PW', desc:'Healing past your maximum health becomes Block.', tags:['defense']},
  {id:'bloodletter',  name:"Scavenger's Acumen",mono:'SA', desc:'Every 6 damage you deal in one turn heals 1.', tags:['offense','defense']},
  {id:'spite_thorns', name:'Equal and Opposite',      mono:'EO', reflect:'blocked', desc:'Whenever your Block absorbs an enemy hit, the enemy takes that much damage.', tags:['offense','defense']},
  {id:'grave_tally',  name:'Strength in Mooks',       mono:'SM', desc:'Each Minion you clear gives 1 Block.', tags:['defense']},
  // Movement family (lets players try Maneuver payoffs without changing the base dice):
  {id:'dodger_cloak', name:'Evasion Tank',    mono:'ET', desc:'Each Dodge in your path gives 1 Block.', tags:['path','defense']},
  {id:'leaper_spurs', name:'Terminal Velocity',    mono:'TV', desc:'Each Leap adds +1 damage to the next damaging die in your path.', tags:['path','offense']},
  {id:'pivot_compass',name:'FTLeporter',     mono:'FT', desc:'Your Pivots can teleport: the next step may go to any die.', tags:['path']},
  // Boss and tempo:
  {id:'frost_charm',  name:'Giant Killer',       mono:'GK', desc:'Start each boss fight with a Freeze token.', tags:['loot','tempo']},
  {id:'warding_bell', name:'Bisection Method',      mono:'BM', desc:'The first heavy turn or boss wind-up each fight deals half damage.', tags:['tempo','defense']},
  {id:'shrine_bell',  name:'Inductive Step',       mono:'IS', desc:'Relic and loot shrines offer one extra choice.', tags:['loot']},
  {id:'combo_gauntlet',name:'Combonatorics',   mono:'CO', desc:'Combo dice also count diagonal neighbors.', tags:['path','offense']},
  // Origin signature relics (never offered at shrines)
  {id:'forgeplate', name:'Stronger Infill',         mono:'SI', origin:'dwarf',    amt:1, desc:'Start every fight with 1 Block.'}, // was 5 (Oct 12 relic study: +37; 2 Block +21, 1 Block +9 -- Jeremy picked 1)
  {id:'spore_satchel',name:'Mycorrhizal Bond',    mono:'MB', origin:'gnome',    desc:'Leech faces also add +2 D.O.T. and heal +1 more.'},
  {id:'picnic_basket',name:'Coffee Break',    mono:'CB', origin:'halfling', heal:0, hot:1, desc:'H.O.T. faces add +1 H.O.T.'}, // was also Heal +2 (Oct 12 relic study: +46 -> +13)
  {id:'glimmer_dust',name:'Faerie Fire',      mono:'FF', origin:'pixie',    cap:2, desc:'Each Dodge, Leap or Pivot in your Path adds +1 damage to its last damaging die (at most +2 per path).'}, // cap added (Oct 12 relic study: +29 -> +12)
];
function relicById(id){ return RELICS.find(r=>r.id===id); }
// Relic gating (Jeremy, Oct 12; tiers from the Oct 12 relic study): the strongest shrine relics are quietly held
// back so power arrives over many runs. A locked relic never appears in a shrine offer, and the Codex keeps it
// as "???" (it is only marked found when offered). Tier A: after the first victory. Tier S: after clearing depth 2 (shown as Depth 1).
// Everything else (and every origin relic) is available from the first run.
// Re-tiered Oct 12 from the depth-7 relic study (win-rate gain, player-like bot): S >= +30, A +20..30.
const RELIC_TIER = { bloodletter:'S', dodger_cloak:'S', gambeson:'S',
  banner:'A', echo_chime:'A', whetstone:'A' };
function relicUnlocked(r){
  const t = RELIC_TIER[r.id];
  if(!t || r.origin) return true;
  if(t==='A') return ((typeof META!=='undefined' && META.lifetime && META.lifetime.victories)||0) >= 1;
  if(t==='S') return ((typeof DEPTH_BEST!=='undefined' && DEPTH_BEST.overall)||0) >= 2;
  return true;
}
function originRelicFor(originId){ return RELICS.find(r=>r.origin===originId); }

// ---- Origin dice ----
const ORIGINS = [
  {id:'dwarf', name:'Dwarf', die:'Dwarven Doohickie', blurb:'Shield up, then pop it for a big Hit.', faces:faces(['Hit2','Boost1','Boost1','Pivot','Block2','Block2'])},
  {id:'gnome', name:'Gnome', die:'Gnomish Mushroom Cap', blurb:'Continuous damage and self-sustain over time.', faces:faces(['Combo1','Boost1','DOT2','DOT2','Leech1','Dodge'])},
  {id:'halfling', name:'Halfling', die:'Bonus Breakfast', blurb:'Second breakfast and good cheer -- healing and buffs to keep the party going.', faces:faces(['Combo1','Boost1','Heal2','Heal2','HOT1','Nullify'])},
  {id:'pixie', name:'Pixie', die:'Pixie Powder', blurb:'Blinks past trouble and leaves a little mischief behind.', faces:faces(['Combo2','Boost1','DOT2','Swap','Leap','Freeze'])},
];

// ---- Classes ----
// Tray coordinates: r,c each run 0-3 (r=0 top row, c=0 left column).
// `color` matches each Class's highlighted-zone color from the original
// tabletop manual's Dice Tray diagram (Guard=cyan, Armsmaster=red,
// Dungeoneer=orange, Arcanist=magenta) -- carried over so the digital
// Class picker identifies each Class the same way the physical game does.
const CLASSES = [
  {id:'armsmaster', name:'Armsmaster', color:'#7a45d6', ability:'Once per turn, turn any Action or Blank in your zone (right column) into a Hit (2).',
    zone:(r,c)=> c===3, convertTo:{type:'hit', value:2}},
  {id:'guard', name:'Guard', color:'#2fb8b8', ability:'Once per turn, turn any Action or Blank in your zone (an L of three squares, middle right) into a Block (1).',
    zone:(r,c)=> (r===1 && (c===2||c===3)) || (r===2 && c===3), convertTo:{type:'block', value:1}}, // 3-square L (Jeremy, Oct 12: 2x2 -> L, 63% -> 58% at depth 7) // Block 2 -> 1 (Jeremy, Oct 12 class study: Guard won 89% vs 40-67%)
  {id:'dungeoneer', name:'Dungeoneer', color:'#d4812e', ability:'Your zone (the left and right edges) wraps left-to-right when building a Path, on every row. Each wrap adds +1 damage to your next attacking die.',
    zone:(r,c)=> c===0 || c===3, wrap:true, seamDamage:1}, // seamDamage: Oct 16 study (experts at depth 7: 36% -> 55%) // every row wraps (Jeremy, Oct 12; was the two middle rows)
  {id:'arcanist', name:'Arcanist', color:'#b4419a', ability:'Your zone is both diagonals. Once on the X, you may step diagonally along it, as if using Dodge. Your Boosts are 1 stronger (x2 becomes x3).',
    zone:(r,c)=> r===c || r+c===3, diagonalZone:'both', boostPlus:1}, // both diagonals; diagonal steps only from an X square to an X square (Jeremy, Oct 16; was 'either' from Oct 12, 53% vs 29% at depth 7)
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
  ['Tarot Deck', ['Boost1','Dodge','Leap','Pivot','Block1','Reroll']],
  ['Lance', ['Hit1','Hit1','Combo1','Combo1','Leap','blank']],
  ['Greataxe', ['Hit2','Hit2','DOT2','blank','blank','blank']],
  ['Claymore', ['Hit2','Hit2','Hit2','Combo2','Fumble1','blank']],
  ['Rapier', ['Hit1','Hit1','Hit1','Hit1','Combo1','Dodge']],
  ['Longsword', ['Hit1','Hit1','Hit1','Combo2','blank','blank']],
  ['Crossbow', ['Hit2','Hit2','Boost1','Dodge','Block1','blank']],
  ['Blunderbuss', ['Hit2','Hit2','Boost2','Fumble1','Leap','blank']],
  ['Ironskin Draught', ['HOT1','HOT1','Block1','Block2','blank','blank']],
  ['Acid Potion', ['Hit1','Hit2','DOT2','DOT2','Fumble1','blank']],
  ['Grappling Set', ['Combo2','Dodge','Dodge','Leap','Leap','blank']],
  ['Medsack', ['Heal1','Heal2','Heal2','Heal2','blank','blank']],
], 'alloy');

const GILDED = lootSet([
  ['Hidden Estoc', ['Hit2','Hit2','Hit2','Hit2','Combo1','Leap']],
  ['Greaterhammer', ['Hit3','Hit3','Hit3','Combo2','blank','blank']],
  ['Hataxe', ['Hit2','DOT2','Block3','Block3','blank','blank']],
  ['Triage Turret', ['Hit2','Boost2','DOT2','Heal2','Heal2','blank']],
  ['Eye-Frame', ['Combo2','Combo2','Dodge','Reroll','Leap','Leap']],
  ["Drafter's Draught", ['Boost2','Boost2','Boost2','Freeze','Nullify','blank']],
  ['Thorned Bulwark', ['Hit1','Hit1','Block3','Block3','Block3','blank']],
  ['Cool Whip', ['Hit1','Combo2','Combo1','Combo1','Swap','blank']],
  ['Humor-inverter', ['Fumble1','Fumble1','HOT2','HOT2','HOT2','blank']],
  ['Winged Boots', ['Combo3','Dodge','Leap','Pivot','Nullify','Boost1']],
  ['Drill Shield', ['Hit2','Hit2','Block3','Block3','Nullify','blank']],
  ['Maximum Capacitor', ['Fumble1','Leap','Boost2','Boost3','Boost3','blank']],
  ['Mining Mines', ['Pivot','Combo2','Combo2','Boost2','Reroll','blank']],
  ['Charge-Atlatl', ['Hit2','Hit2','Combo2','Combo1','Boost2','blank']],
  ['Portable RNGenerator', ['Combo1','Leech1','Freeze','HOT1','Nullify','Reroll']],
  ['Poison Sword', ['Hit2','Hit2','Combo2','DOT2','blank','blank']],
  ['Sporific Staff', ['DOT1','Leech1','Leech1','Pivot','HOT1','blank']],
  ['Genetic Drifter', ['Combo1','Leech1','Leech1','Pivot','Swap','Nullify']],
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
  // v1.39.0: fill the action holes (Freeze, Swap, Reroll); faction-themed names.
  ['Axiom of Choice', ['Reroll','Reroll','Hit3','Boost3','Block3','blank']],
  ['Domesticated Displacer', ['Swap','Swap','Combo3','Combo2','Pivot','Combo2']],
  ['273.15 Kelvin Box', ['Freeze','Freeze','Hit3','Hit3','Combo2','blank']],
  ['Exile Elixir', ['Swap','Block4','Block4','Freeze','Heal3','blank']],
], 'magic');

// ---- Encounters (Cards 0.4 sheet -- the most complete/current tab) ----
// fields: name,type,health,dmg,minion,shield,heal,dot,hot,quests[],flavor  (Quest Health removed Oct 17: every quest pays what it says)
function enc(name,type,health,extra){ return Object.assign({name,type,health,maxHealth:health,dmg:0,minion:0,shield:0,heal:0,dot:0,hot:0,quests:[],flavor:''}, extra); }

const FLOOR1_ENEMIES = [
  enc('Filement Bunny','Enemy',7,{dmg:2,flavor:'"Cute, until it gunks up your gears and gnaws off your toes!"'}),
  enc('Wooden Golem','Enemy',10,{dmg:3,quests:['5 damage: 3 maneuvers'],flavor:'Shoddy construction is evident from the visible weak points.'}),
  enc('Feral Pet Rock','Enemy',12,{dmg:2,flavor:'Somedwarf took this companion for granite…'}),
  enc('Unbound Automa','Enemy',15,{dmg:3,quests:['5 damage: 3 maneuvers'],flavor:'This replaced the Automaton, mostly to remove the weight.'}),
  enc('Beaker Breakers','Enemy',15,{dmg:1,heal:1,quests:['5 damage: 2 dodge'],flavor:'"No longer into flasks"'}),
  enc('Viscous Orb','Enemy',10,{dmg:2,minion:1,flavor:'"Thankfully it isn\u2019t a gelatinous cube!"'}),
  enc('United Separatists','Enemy',12,{dmg:1,heal:1,flavor:'"Nothing like a shared schism to bring people apart".'}),
  enc('Amanitabomination','Enemy',14,{dmg:2,shield:2,quests:['5 damage: 2 heals'],flavor:'"I was benevolent and good, misery made me a foe"'}),
  enc('Grafted Grifter','Enemy',15,{dmg:2,shield:2,quests:['5 damage: 2 leap'],flavor:'Known to charge an arm and a leg.'}),
  enc('Leper Colonizers','Enemy',12,{dmg:2,shield:2,flavor:'"May our crustulant new Chempire outlast its crumbling citizens!"'}),
  // v1.39.0: Jeremy's spare monsters from the Mechanics Document; stats from the evened tiers (docs/studies/2026-10-11_new_content_plan.md).
  enc('Untamed Unicrows','Enemy',14,{dmg:2,dot:1,quests:['5 damage: 2 dodge'],flavor:'"A murderous parliament, or a parliamentary murder?"'}),
  enc('Prickly Porcupanther','Enemy',18,{dmg:2,shield:1,dreadOnly:true,quests:['5 damage: 2 block'],flavor:'"Prickly of both texture and temperament."'}),
];
const FLOOR1_TRAPS = [
  enc('Displacer Lair','Trap',25,{dmg:3,quests:['5 damage: any 6 actions','5 damage: any 8 actions','5 damage: any 10 actions'],flavor:'"Move either very fast or very slow. Don\u2019t touch the bellies"'}),
  enc('Rigged Sporks','Trap',25,{dmg:1,shield:2,quests:['10 damage: 4 maneuvers','10 damage: 2 leap','10 damage: 2 dodge'],flavor:'Elegantly spiked-spores, set to blow upon detecting the slightest movement.'}),
  enc('Unauthorized Transfusion','Trap',25,{dmg:1,hot:1,quests:['10 damage: 3 maneuvers','10 damage: 2 block','1 nullify: 8 damage/turn'],flavor:'"Everyone is a universal donor if you aren\u2019t picky"'}),
  enc('Leper Con-Trap','Trap',25,{dmg:2,minion:1,quests:['10 damage: 3 maneuvers','20 damage: 10 blanks','1 nullify: 8 damage/turn'],flavor:'"Do not listen to anyone who claims to already know where the treasure is"'}),
];
const FLOOR1_SHRINES = [
  enc('Sacred Bellows','Shrine',0,{boon:'Upgrade Player Maximum Health by 10.', effect:{type:'maxHealthUp', amount:10}}),
  enc('Expediting Spores','Shrine',0,{boon:'Upgrade a lvl 1 Maneuver Die to a lvl 2 Maneuver Die.', effect:{type:'dieUpgrade', cat:'maneuver'}}),
  enc('Ecclectrical Outlet','Shrine',0,{boon:'Trade in loot for one of three Alloy dice options.', effect:{type:'tradeLoot', pool:'Alloy'}}),
  enc('Half-Empty Fountain','Shrine',0,{boon:'Heal 20 OR Upgrade Player Max Health by 10.', effect:{type:'choice', options:[
    {label:'Heal 20', effect:{type:'heal', amount:20}},
    {label:'+10 Max Health', effect:{type:'maxHealthUp', amount:10}},
  ]}}),
  enc('Scroll Dispenser: CRELA','Shrine',0,{boon:'Gain a one-use Nullify token (x5). It also dispenses a die: choose one of two loot dice.', loot:true, effect:{type:'grantToken', token:'nullify', charges:5}}),
  enc('Scroll Dispenser: AWSP','Shrine',0,{boon:'Gain a one-use Swap token (x3): swap any two dice, even mid-path. It also dispenses a die: choose one of two loot dice.', loot:true, effect:{type:'grantToken', token:'swap', charges:3}}),
  // v1.36.0 relic shrines
  enc('Surgery Community Theatre','Shrine',0,{boon:'Choose one of three offense Relics.', effect:{type:'relicChoice', theme:'offense'}}),
  enc('Healthy Hearth','Shrine',0,{boon:'Choose one of three defense Relics.', effect:{type:'relicChoice', theme:'defense'}}),
  enc('Ark of the Flood','Shrine',0,{boon:'Choose one of three path and movement Relics.', effect:{type:'relicChoice', theme:'path'}}),
  enc('Loot-Diagonalizer','Shrine',0,{boon:'Choose one of three loot and tempo Relics.', effect:{type:'relicChoice', theme:'loot'}}),
  enc('Blood-Drive Treats','Shrine',0,{boon:'Pay 3 maximum health to choose one of four Relics.', effect:{type:'choice', options:[
    {label:'Pay 3 max health: choose from four Relics', effect:{type:'bargain', price:{maxHp:3}, then:{type:'relicChoice', count:4}}},
    {label:'Walk away', effect:{type:'leave'}},
  ]}}),
];
const FLOOR1_BOSSES = [
  enc('Rogue Golemancer','Boss',30,{dmg:2,minion:1,flavor:'"You cannot handle my golems, adventurer."'}),
  enc('Heating Elemental','Boss',40,{dmg:3,hot:1,quests:['35 damage: survive to turn 5'],flavor:'"Anyone know the average melting point on the Plane of Immolation?"'}),
  enc('Grosteque Grafter','Boss',40,{dmg:2,shield:2,quests:['8 dot: deal 10+ damage in a single round'],flavor:'Oft criticized for reusing parts of other bosses.'}),
];

const FLOOR2_ENEMIES = [
  enc('Displacer Kitty','Enemy',18,{dmg:3,flavor:'"I think that one had a collar. Where\u2019d it go?"'}),
  enc('Armored Gear-Pest','Enemy',17,{dmg:2,flavor:'A well-documented example of dungeon adaptation.'}),
  enc('Rusty Golem','Enemy',20,{dmg:4,quests:['16 damage: survive turn 4'],flavor:'"Looks like it was falling apart on its own"'}),
  enc('Rogue Technician','Enemy',16,{dmg:4,flavor:'"I\u2019m not here to fix your lockpick, I have an ideology!"'}),
  enc('The Warcart','Enemy',18,{dmg:2,shield:2,quests:['8 damage: 4 maneuvers'],flavor:'The top contributing reason as to why mining is the most dangerous profession.'}),
  enc('Blastogenesis Engine','Enemy',14,{dmg:3,minion:2,flavor:'A true perpetual devotion machine.'}),
  enc('Half-life Host','Enemy',22,{dmg:3,shield:2,quests:['8 damage: 2 heal'],flavor:'"\u2018Release spores. Multiply.\u2019? - Now I\u2019m always saying that!"'}),
  enc('Lichen-Thrope','Enemy',24,{dmg:3,heal:1,flavor:'Under the luminance of the full bloom, this creature becomes a true hater.'}),
  enc('Fungal Flayer','Enemy',24,{dmg:3,hot:2,quests:['16 damage: accumulate 5 block'],flavor:'It is, in fact, acceptable to hate the flayer.'}),
  enc('Illegal Operation','Enemy',19,{dmg:4,hot:1,flavor:'"Oh no, maybe we try multiplying by zero this time??"'}),
  enc('Rabbid Rabbats','Enemy',18,{dmg:2,minion:1,quests:['5 damage: 2 leap'],flavor:'"They multiply like rabbits and, as a group, have inverse operations."'}),
  enc('Roudy Rinotter','Enemy',15,{dmg:2,heal:1,quests:['5 damage: 2 heal'],flavor:'"Is that some cornbread on its tummy?"'}),
  enc('Whence Wolf','Enemy',32,{dmg:3,dot:1,quests:['10 damage: 3 maneuvers'],flavor:'"Why, Grandma, what uncertain provenance you have."'}),
];
const FLOOR2_TRAPS = [
  enc('Adhesive Pest Traps','Trap',22,{dmg:2,minion:2,quests:['15 damage: 3 maneuvers','15 damage: 4 maneuvers','15 damage: 5 maneuvers'],flavor:'"Environmentally friendly snares for unfriendly environments"'}),
  enc('Ditched Heist','Trap',30,{dmg:3,shield:3,quests:['15 damage: any 8 actions','15 damage: any 3 or fewer actions','20 damage: 8 blanks'],flavor:'Looks like the previous party spent too long describing their plans to finish them.'}),
  enc('Unventilated Workshop','Trap',22,{dmg:2,hot:1,quests:['15 damage: 2 block','15 damage: 4 maneuvers','nullify: 12+ damage'],flavor:'"Carol never wore her ventilator. Now she doesn\u2019t need it."'}),
  enc('The Strike/Break-er','Trap',30,{dmg:3,quests:['5 damage: survive 2','10 damage: survive 4','15 damage: survive 6'],flavor:'Inevitably causes scabs.'}),
];
const FLOOR2_SHRINES = [
  enc('Enchanted Anvil','Shrine',0,{boon:'Forge a new die (choose one of three Gilded dice) OR upgrade two Attack or two Maneuver Dice one level.', effect:{type:'choice', options:[
    {label:'Forge a new die', effect:{type:'tradeLoot', pool:'Gilded'}},
    {label:'Upgrade 2 Attack Dice', effect:{type:'dieUpgrade', cat:'attack', count:2}},
    {label:'Upgrade 2 Maneuver Dice', effect:{type:'dieUpgrade', cat:'maneuver', count:2}},
  ]}}),
  enc('Alchemists Stone','Shrine',0,{boon:'Upgrade Player Maximum Health by 10.', effect:{type:'maxHealthUp', amount:10}}),
  enc('Department Spore','Shrine',0,{boon:'Choose one of three Relics.', effect:{type:'relicChoice'}}),
  enc('Half-Full Fountain','Shrine',0,{boon:'Heal 15 OR Upgrade Player Maximum Health by 10.', effect:{type:'choice', options:[
    {label:'Heal 15', effect:{type:'heal', amount:15}},
    {label:'+10 Max Health', effect:{type:'maxHealthUp', amount:10}},
  ]}}),
  enc('Scroll Dispenser: GIB','Shrine',0,{boon:'Gain a one-use x4 Boost token (x3). It also dispenses a die: choose one of two loot dice.', loot:true, effect:{type:'grantToken', token:'boost', value:4, charges:3}}),
  enc('Scroll Dispenser: DOER','Shrine',0,{boon:'Gain a one-use Reroll token (x3): reroll any one die, even mid-path. It also dispenses a die: choose one of two loot dice.', loot:true, effect:{type:'grantToken', token:'reroll', charges:3}}),
  // v1.36.0
  enc('Blood of Spanneroth','Shrine',0,{boon:'Choose one of three offense Relics.', effect:{type:'relicChoice', theme:'offense'}}),
  enc('Ferrous Maiden','Shrine',0,{boon:'Choose one of three defense Relics.', effect:{type:'relicChoice', theme:'defense'}}),
  enc("Thom's Guide",'Shrine',0,{boon:'Choose one of three path and movement Relics.', effect:{type:'relicChoice', theme:'path'}}),
  enc("Goldberg's Rube Machine",'Shrine',0,{boon:'It takes all night to run: give up your next campfire (no Rest or Train) to choose two of four Relics.', effect:{type:'choice', options:[
    {label:'Skip your next campfire: choose 2 Relics', effect:{type:'bargain', price:{skipRest:true}, then:{type:'relicChoice', count:4, take:2}}},
    {label:'Walk away', effect:{type:'leave'}},
  ]}}),
  enc('Cryotherapist','Shrine',0,{boon:'Heal 15 AND gain two one-use Freeze tokens.', effect:{type:'multi', effects:[{type:'heal', amount:15},{type:'grantToken', token:'freeze', charges:2}]}}),
];
const FLOOR2_BOSSES = [
  enc('The Necrorancher','Boss',48,{dmg:2,minion:2,quests:['nullify: deal 12 damage in a single turn'],flavor:'Herder of the haunted, granger of the ghoulish, planter of the parasitic.'}),
  enc('Bellicose Biomancer','Boss',50,{dmg:4,hot:2,quests:['20 damage: gain 3 hot','20 damage: deal 5 dot'],flavor:'Not content with creating life, this relentless innovator seeks new ways to destroy it.'}),
  enc('Ceramic Golem','Boss',70,{dmg:3,shield:3,quests:['8 dot: deal 15+ damage in a single round','30 damage: 5 maneuvers'],flavor:'The bespoke sommelier of the Co-Consul, now cracked and seeping with drink.'}),
];

// Oct 13 (Jeremy: Floor 3 should be harder than Floor 2): attack +2 on Easy/Standard/Deadly cards, +1 on Elites
// (heavy turns double it), +1 on the Big Bosses' base attacks.
const FLOOR3_ENEMIES = [
  enc('Morel Dilemma','Enemy',18,{dmg:6,minion:2,hot:1,flavor:'A fungal species that has stumped, and subsequently eaten, philosophers for generations.'}),
  enc('Chimeric Sludge','Enemy',25,{dmg:7,hot:2,quests:['12 damage: 4 maneuvers'],flavor:'Biological slag, made up of countless individual chimeras.'}),
  enc('Gnome Chomper','Enemy',28,{dmg:8,quests:['6 damage: 3 maneuvers'],flavor:'"The Gnomish Chempire is the leading zealot state!"'}),
  // v1.39.0: replaces Parasite Seer (its art was a cropped copy of another gnome); Jeremy's idea, same slot and stats.
  enc('Gnomeowners Association','Enemy',20,{dmg:5,shield:3,flavor:'"Only good and gracious hosts are allowed in this neighborhood."'}),
  enc('Gestalt Network','Enemy',20,{dmg:5,dot:2,flavor:'"You will join us. Our population is mushrooming."'}),
  enc("Oilephant's Foot",'Enemy',30,{dmg:4,hot:3,quests:['15 damage: 4 support actions'],flavor:'"An Oilephant never forgets" refers to the long-lasting effects of radiation.'}),
  enc('Extractnid Matriarch','Enemy',22,{dmg:6,minion:3,quests:['nullify: 10+ damage'],flavor:'Undisturbed for eons, this primordial weaver and its brood now stir and hunger for glass.'}),
  enc('The Punished','Enemy',36,{dmg:6,minion:1,flavor:'Those foolish enough to try and harness forms they are unable to comprehend.'}),
  enc('Profane Geometry','Enemy',35,{dmg:6,hot:2,quests:['10 damage: adventurer H.O.T. = D.O.T.'],flavor:'A simulacrum of the divine, insatiable as the curiosity by which it was conjured.'}),
  enc('Sacred(?) Geometry','Enemy',38,{dmg:6,dot:2,quests:['10 damage: encounter D.O.T. = H.O.T.'],flavor:'A mere reflection of the divine geometry. The impossible beauty pains your eyes.'}),
  enc('Eelagator Escapee','Enemy',44,{dmg:5,shield:2,quests:['10 damage: 2 nullify'],flavor:'"Such a successful grafting that it escaped of its own measure!"'}),
  enc('Toadtaur Warrior','Enemy',30,{dmg:7,quests:['8 damage: 3 maneuvers'],flavor:'"Definitely a \'can we\' vs. a \'should we\' decision, looking back."'}),
];
const FLOOR3_TRAPS = [
  enc('Anti-Euclidian Space','Trap',40,{dmg:9,shield:2,quests:['10 damage: any 10 actions','15 damage: any 12 actions','20 damage: any 15 actions'],flavor:'Where forbidden postulates are illogically deduced from perfidious axioms.'}),
  enc('Ergot Eruption','Trap',40,{dmg:7,hot:3,quests:['15 damage: 4 maneuvers','20 damage: 3 pivot','3 hot: 15+ damage'],flavor:'"Fortune favors the mold" — Plinthi the Eldar before death.'}),
  enc('Self-Replicating Forge','Trap',40,{dmg:5,minion:4,quests:['15 damage: 4 maneuvers','20 damage: 3 boosts','1 freeze: 15+ damage'],flavor:'Hydra-aulic systems rebuild themselves stronger when damaged.'}),
  enc('Bio-Mutant Escape','Trap',40,{dmg:5,minion:4,quests:['15 damage: 2 nullify','20 damage: 4 support actions','20 damage: survive 4'],flavor:'No weapon known to gnome can stop 30-50 feral mutants.'}),
];
const FLOOR3_SHRINES = [
  enc('Scrying Spheroid','Shrine',0,{boon:'Replace a loot die with a random Magic die.', effect:{type:'randomDieReplace', pool:'Magic'}}),
  enc("Heron's Fountain",'Shrine',0,{boon:'Upgrade Player Maximum Health by 15.', effect:{type:'maxHealthUp', amount:15}}),
  enc('Storied Emporium','Shrine',0,{boon:'Choose one of three Relics, then browse the shelves: choose one of two loot dice.', loot:true, effect:{type:'relicChoice'}}),
  enc('Scroll Dispenser: TSOP','Shrine',0,{boon:'Gain a one-use Freeze token (x2). It also dispenses a die: choose one of two loot dice.', loot:true, effect:{type:'grantToken', token:'freeze', charges:2}}),
  // v1.36.0
  enc('Ruinous Rune Room','Shrine',0,{boon:'Choose one of three offense Relics.', effect:{type:'relicChoice', theme:'offense'}}),
  enc('Indoctrination Inoculation','Shrine',0,{boon:'Choose one of three defense Relics, and gain 5 Maximum Health.', effect:{type:'relicChoice', theme:'defense', maxHp:5}}),
  enc('Charged Fae-Lines','Shrine',0,{boon:'Choose two of four path and movement Relics.', effect:{type:'relicChoice', theme:'path', count:4, take:2}}),
  enc('Madpie Nest','Shrine',0,{boon:'Choose one of three loot and tempo Relics, then pick through the hoard: choose one of two loot dice.', loot:true, effect:{type:'relicChoice', theme:'loot'}}),
  enc('Faustian Spreadsheet','Shrine',0,{boon:'Pay 3 maximum health to choose two of four Relics.', effect:{type:'choice', options:[
    {label:'Pay 3 max health: choose 2 of 4 Relics', effect:{type:'bargain', price:{maxHp:3}, then:{type:'relicChoice', count:4, take:2}}},
    {label:'Walk away', effect:{type:'leave'}},
  ]}}),
  enc('Correctly-Designed Fountain','Shrine',0,{boon:'Heal 20 OR Upgrade Player Maximum Health by 10.', effect:{type:'choice', options:[
    {label:'Heal 20', effect:{type:'heal', amount:20}},
    {label:'+10 Max Health', effect:{type:'maxHealthUp', amount:10}},
  ]}}),
];
const BIG_BOSSES = [
  enc('Extruzeon, Co-consul of Waste','Big Boss',99,{dmg:6,shield:2,hot:1,quests:['30 damage: 3 boosts','30 damage: 6 maneuvers in a single turn','freeze: 20+ damage'],flavor:'"And to think\u2026I hesitated."'}),
  enc('Toadtaur Wizard, Assistant to the Co-consul','Big Boss',78,{dmg:4,quests:['30 damage: 3 leaps','30 damage: 6 maneuvers in a single turn','freeze: 15+ damage'],flavor:'"The wizdom of the toads flows through my three-chambered heart!"'}),
  enc('Myceleus, Co-consul of Rot','Big Boss',93,{dmg:2,minion:2,dot:1,hot:2,quests:['30 damage: 3 combos','30 damage: 6 maneuvers in a single turn','nullify: 15+ damage'],flavor:'"All must rot away to naught!"'}),
];

const FLOORS = [
  {enemies:FLOOR1_ENEMIES, traps:FLOOR1_TRAPS, shrines:FLOOR1_SHRINES, bosses:FLOOR1_BOSSES, lootPool:ALLOY, lootName:'Alloy'},
  {enemies:FLOOR2_ENEMIES, traps:FLOOR2_TRAPS, shrines:FLOOR2_SHRINES, bosses:FLOOR2_BOSSES, lootPool:GILDED, lootName:'Gilded'},
  {enemies:FLOOR3_ENEMIES, traps:FLOOR3_TRAPS, shrines:FLOOR3_SHRINES, bosses:[], lootPool:MAGIC, lootName:'Magic'},
];

// ---- Encounter tiers (v1.35.0) ----
// Every Enemy/Trap has a difficulty tier. Each floor's rooms follow a slot
// pattern (see ROOM_TIER_SLOTS) instead of a pure random draw, so a floor
// always builds: easy -> standard -> elite, Camp, standard -> elite, Boss.
// 'deadly' cards are the rare spawns: one occasionally takes an elite slot
// on Floors 2-3 (DEADLY_CHANCE, raised by the Dread depth modifier).
// Starting assignment from the Oct 11 2026 bot study
// (docs/studies/2026-10-11_encounters_and_bosses.md).
const ENCOUNTER_TIER = {
  // Floor 1
  'Filement Bunny':'easy','Wooden Golem':'easy','Beaker Breakers':'easy','United Separatists':'easy',
  'Rigged Sporks':'easy','Unauthorized Transfusion':'easy',
  'Untamed Unicrows':'standard','Prickly Porcupanther':'deadly',
  'Feral Pet Rock':'standard','Viscous Orb':'standard','Grafted Grifter':'standard','Displacer Lair':'standard',
  'Amanitabomination':'elite','Leper Colonizers':'elite','Unbound Automa':'elite','Leper Con-Trap':'elite',
  // Floor 2
  'Unventilated Workshop':'easy','Adhesive Pest Traps':'easy','The Warcart':'easy','Armored Gear-Pest':'easy',
  'Rabbid Rabbats':'easy','Roudy Rinotter':'easy','Whence Wolf':'deadly',
  'Rogue Technician':'standard','Displacer Kitty':'standard','Blastogenesis Engine':'standard','Ditched Heist':'standard',
  'Half-life Host':'elite','Rusty Golem':'elite','Illegal Operation':'elite','Lichen-Thrope':'elite','Fungal Flayer':'elite',
  'The Strike/Break-er':'deadly',
  // Floor 3
  'Morel Dilemma':'easy','Gnomeowners Association':'easy','Gestalt Network':'easy',"Oilephant's Foot":'easy',
  'Chimeric Sludge':'standard','Ergot Eruption':'standard','Profane Geometry':'standard','Extractnid Matriarch':'standard',
  'Anti-Euclidian Space':'elite','Bio-Mutant Escape':'elite','Gnome Chomper':'elite','The Punished':'elite','Sacred(?) Geometry':'elite',
  'Self-Replicating Forge':'deadly','Eelagator Escapee':'deadly','Toadtaur Warrior':'elite',
};
function encounterTier(e){ return (e && ENCOUNTER_TIER[e.name]) || 'standard'; }
// Room tier by route step (buildRoute(): camp, enc, enc, enc, camp, enc, enc, boss).
const ROOM_TIER_SLOTS = {1:'easy', 2:'standard', 3:'elite', 5:'standard', 6:'elite'};
const DEADLY_CHANCE = 0.12;      // per elite slot; Floor 1's only deadly card (Prickly Porcupanther) is dreadOnly
// Chance a Shrine takes an easy/standard slot (max one per segment): rises by
// floor and with depth (v1.36.0). See shrineSlotChance() in logic.js.
const SHRINE_SLOT_CHANCE = [0.40, 0.45, 0.50];
const SHRINE_CHANCE_PER_DEPTH = 0.03, SHRINE_CHANCE_MAX = 0.7;
// Elite and deadly enemies telegraph a heavy turn every Nth turn (double attack,
// or double their biggest effect if they don't attack).
const HEAVY_EVERY = {elite:3, deadly:2};

// ---- Boss move kits (v1.35.0) ----
// Every turn a boss does everything in `each` (its base attack) PLUS the next
// special in `specials`, shown a turn ahead. Specials loop in order. Bold
// "wind-up" specials (windup:true) are the big telegraphed turns. Freeze
// cancels that turn's special but not the base attack. A boss with `phase2`
// switches to it after the first enemy turn that ends at or below half HP.
// Act types: dmg, minion, shield, heal, hot, dot (to you), dmgPerMinion
// (value x Minions on your tray), dropShield (loses all its Shield).
const BOSS_KITS = {
  'Rogue Golemancer':{ each:[{type:'dmg',value:1}], specials:[
    {name:'Summon Golems', acts:[{type:'minion',value:2}]},
    {name:'Golem Lemma', windup:true, acts:[{type:'dmg',value:7}]},
    {name:'Brace', acts:[{type:'shield',value:4}]} ]},
  'Heating Elemental':{ each:[{type:'dmg',value:1}], specials:[
    {name:'Pre-heat', acts:[{type:'hot',value:2}]},
    {name:'Melting Point', windup:true, acts:[{type:'dmg',value:4}]},
    {name:'Scorch', acts:[{type:'dot',value:2}]} ]},
  'Grosteque Grafter':{ each:[{type:'dmg',value:1}], specials:[
    {name:'Grafted Plate', acts:[{type:'shield',value:5}]},
    {name:'Pruning', windup:true, acts:[{type:'dmg',value:5}]},
    {name:'Harvest', acts:[{type:'heal',value:4}]} ]},
  // herald: Minions that land with the warning (v1.37.0), one turn to clear them.
  'The Necrorancher':{ each:[{type:'dmg',value:2}], specials:[
    {name:'Grazing', acts:[{type:'dot',value:2}]},
    {name:'Stampede', windup:true, herald:{type:'minion',value:3}, acts:[{type:'dmgPerMinion',value:2}]},
    {name:'Cull', acts:[{type:'dmg',value:7}]} ]},
  'Bellicose Biomancer':{ each:[{type:'dmg',value:2}], specials:[
    {name:'Mutagen', acts:[{type:'hot',value:2}]},
    {name:'Slammerhand', windup:true, acts:[{type:'dmg',value:8}]},
    {name:'Spore Cloud', acts:[{type:'dot',value:2}]} ]},
  'Ceramic Golem':{ each:[{type:'dmg',value:2}], specials:[
    {name:'Glaze', acts:[{type:'shield',value:5}]},
    {name:'Shatterpour', windup:true, acts:[{type:'dmg',value:7},{type:'dropShield'}]},
    {name:'Seep', acts:[{type:'dot',value:2}]} ]},
  // Oct 13 (Jeremy: as dangerous as the other bosses, easier or harder by playstyle): Layer by Layer, its base
  // attack grows by 1 after every hit (by 2 in Meltdown), and the layers carry into phase 2. Fast, bursty builds (and the 20+ damage Freeze quest)
  // beat it before it builds up; slow Block/heal builds face an ever bigger hit.
  'Extruzeon, Co-consul of Waste':{ each:[{type:'dmg',value:2,grow:1}], specials:[
    {name:'Compactor', acts:[{type:'shield',value:4}]},
    {name:'Extrue-damage', windup:true, acts:[{type:'dmg',value:8}]},
    {name:'Recycle', acts:[{type:'hot',value:2}]} ],
    phase2:{ name:'Meltdown', each:[{type:'dmg',value:2,grow:2}], specials:[
      {name:'Atomic Pull', windup:true, acts:[{type:'dmg',value:9}]},
      {name:'Excessive Extrusion', acts:[{type:'minion',value:2},{type:'dot',value:2}]} ]}},
  'Myceleus, Co-consul of Rot':{ each:[{type:'dmg',value:6}], specials:[
    {name:'R.O.T.', acts:[{type:'dot',value:3}]},
    {name:'Spore-Up', acts:[{type:'shield',value:4}]},
    {name:'Be Fruitful and Multiply!', windup:true, herald:{type:'minion',value:3}, acts:[{type:'dmgPerMinion',value:3}]} ],
    phase2:{ name:'Fruiting Body', each:[{type:'dmg',value:5},{type:'minion',value:1}], specials:[
      {name:'R.O.T.', acts:[{type:'dot',value:3}]},
      {name:'Be Fruitful and Multiply!', windup:true, herald:{type:'minion',value:3}, acts:[{type:'dmgPerMinion',value:3}]} ]}},
  // v1.39.0: the third Big Boss. Phase 2 (Leap Year): the Toadtaur Warrior joins.
  'Toadtaur Wizard, Assistant to the Co-consul':{ each:[{type:'dmg',value:5}], specials:[
    {name:'Toxic Trample', acts:[{type:'dot',value:2}]},
    {name:'Lily Padding', acts:[{type:'shield',value:5}]},
    {name:'Chimeronslaught', windup:true, acts:[{type:'dmg',value:9}]} ],
    phase2:{ name:'Leap Year', each:[{type:'dmg',value:5},{type:'minion',value:1}], specials:[
      {name:'Lily Pod', windup:true, herald:{type:'minion',value:3}, acts:[{type:'dmgPerMinion',value:3}]},
      {name:'Chimeronslaught', windup:true, acts:[{type:'dmg',value:9}]} ]}},
};

// Stand-in art for the v1.36.0 shrines until Jeremy's own art exists: each
// borrows a related existing shrine's picture. Delete an entry once its real
// art is in MONSTER_ART.
// Every shrine has its own art since Oct 21 (Jeremy's batches L-N); a new shrine without a picture can borrow one here.
const SHRINE_ART_STANDIN = {};

// ---- Monster presence: how large each monster is drawn in the face-off (1 = standard ~89px tall).
// Under 1 = small/scuttling things; over 1 = hulking things that loom behind their own health bar.
// Anything unlisted is 1 (Bosses default to 1.3).
const ENCOUNTER_SIZE = {
  'Thom\'s Guide':0.75,
  'Surgery Community Theatre':1.55,
  'Ruinous Rune Room':1.4,
  'Madpie Nest':1.25,
  'Loot-Diagonalizer':1.25,
  'Healthy Hearth':1.35,
  'Goldberg\'s Rube Machine':1.4,
  'Ferrous Maiden':1.65,
  'Faustian Spreadsheet':1.2,
  'Cryotherapist':1.25,
  'Charged Fae-Lines':1.25,
  'Blood-Drive Treats':1.3,
  'Ark of the Flood':1.2,
  'Scrying Spheroid':1,
  'Sacred Bellows':1.15,
  'Myceleus, Co-consul of Rot':1.1,
  'Heron\'s Fountain':1.2,
  'Half-Full Fountain':1.2,
  'Half-Empty Fountain':1.2,
  'Extruzeon, Co-consul of Waste':1.25,
  'Expediting Spores':0.65,
  'Enchanted Anvil':1.05,
  'Ecclectrical Outlet':1.3,
  'Department Spore':1.05,
  'Alchemists Stone':0.85,
  'Viscous Orb':0.55,'Filement Bunny':0.9,'Feral Pet Rock':0.6,'Beaker Breakers':0.6,'Leper Colonizers':0.95,
  'Wooden Golem':1.1,'Amanitabomination':1.3,
  'Displacer Lair':1.1,'Rigged Sporks':0.75,'Leper Con-Trap':1.05,
  'Rogue Golemancer':1.6,'Heating Elemental':1.2,'Grosteque Grafter':1.45,
  'Displacer Kitty':0.65,'Armored Gear-Pest':0.75,'Rusty Golem':1,'Rogue Technician':0.95,'The Warcart':1.45,
  'Blastogenesis Engine':1.05,'Half-life Host':1,'Lichen-Thrope':1.3,'Fungal Flayer':1.15,
  'The Necrorancher':1.05,'Bellicose Biomancer':1.35,'Ceramic Golem':1.25,
  'Morel Dilemma':1,'Chimeric Sludge':1.15,'Gnome Chomper':1.1,'Gnomeowners Association':1,'Gestalt Network':1.15,
  "Oilephant's Foot":1.3,
  'Untamed Unicrows':0.9,'Prickly Porcupanther':0.9,'Rabbid Rabbats':1.15,'Roudy Rinotter':0.9,'Whence Wolf':1.1,'Eelagator Escapee':0.6,'Toadtaur Warrior':1.05,'Toadtaur Wizard, Assistant to the Co-consul':1.15,'Extractnid Matriarch':1.1,'The Punished':0.95,'Profane Geometry':1.15,'Sacred(?) Geometry':1.3,
  // line-thickness pass (Oct 12): bosses that used the 1.35 default
  "Extruzeon, Co-consul of Waste":1.1,"Myceleus, Co-consul of Rot":1.1,
  'United Separatists':0.9,
  'Grafted Grifter':1.4
  // Oct 15: sizes above were set by Jeremy on the Monster Footing page
};
// Oct 15 (Jeremy, Monster Footing page): how far each monster sits lower (+) or higher (-) in the face-off, in % of its
// picture's height, so it scales with the screen. Set by dragging each one on the page; missing = 0.
const ENCOUNTER_DROP = {"Thom's Guide":-21.4,"Surgery Community Theatre":-16.0,"Ruinous Rune Room":-2.5,"Madpie Nest":11.4,"Loot-Diagonalizer":-3.6,"Healthy Hearth":-5.5,"Goldberg's Rube Machine":3.8,"Ferrous Maiden":-17.3,"Faustian Spreadsheet":4.4,"Cryotherapist":4.2,"Charged Fae-Lines":20.6,"Blood-Drive Treats":4.0,"Ark of the Flood":-1.5,"Untamed Unicrows":-16.8,"Scrying Spheroid":-28.5,"Sacred Bellows":-2.4,"Rabbid Rabbats":-10.9,"Prickly Porcupanther":2.0,"Heron's Fountain":4.4,"Half-Full Fountain":4.4,"Half-Empty Fountain":4.4,"Extruzeon, Co-consul of Waste":3.2,"Expediting Spores":0.0,"Enchanted Anvil":0.0,"Ecclectrical Outlet":-0.1,"Department Spore":-5.1,"Alchemists Stone":-15.7,"Gnomeowners Association":4.7,"Grosteque Grafter":3.1,"Amanitabomination":-5.3,"Beaker Breakers":1.0,"Bellicose Biomancer":8.3,"Ceramic Golem":2.1,"Chimeric Sludge":5.5,"Displacer Kitty":-2.9,"Eelagator Escapee":5.5,"Extractnid Matriarch":-7.8,"Feral Pet Rock":6.4,"Filement Bunny":-1.2,"Fungal Flayer":3.9,"Gestalt Network":4.2,"Gnome Chomper":15.3,"Grafted Grifter":-3.3,"Half-life Host":3.6,"Leper Colonizers":1.9,"Lichen-Thrope":-3.4,"Morel Dilemma":1.6,"Myceleus, Co-consul of Rot":2.4,"Profane Geometry":3.9,"Rogue Golemancer":21.7,"Roudy Rinotter":5.2,"Sacred(?) Geometry":-5.3,"The Necrorancher":6.2,"The Punished":-12.4,"The Warcart":-10.4,"Toadtaur Warrior":2.6,"Toadtaur Wizard, Assistant to the Co-consul":7.8,"United Separatists":-2.0,"Whence Wolf":8.1,"Wooden Golem":4.9};
function encounterDrop(e){ return (e && ENCOUNTER_DROP[e.name]) || 0; }
function encounterSize(e){ if(!e) return 1; const v = ENCOUNTER_SIZE[e.name]; return v || (/Boss/.test(e.type) ? 1.35 : 1); }
