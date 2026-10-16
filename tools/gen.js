const fs=require('fs'),vm=require('vm');
const R=require('path').resolve(__dirname,'../src')+'/';
const ctx={};vm.createContext(ctx);
const depthSrc=fs.readFileSync(R+'depth.js','utf8'); const dpart=(a,b)=>depthSrc.slice(depthSrc.indexOf(a), depthSrc.indexOf(b));
vm.runInContext(fs.readFileSync(R+'data.js','utf8')+fs.readFileSync(R+'assets.js','utf8')+
dpart('const BASE_HP_MUL','const DEPTH_MOD_BY_ID')+'const DREAD_HP=0.2;'+
';globalThis.O={GAME_VERSION,BOSS_KITS,HEAVY_EVERY,BASE_HP_MUL,DEPTH_MODS,ICON_SVG,ORIGINS,CLASSES,FLOORS,BIG_BOSSES,RELICS,BASIC_DICE,LOGO_IMG,COVER_ART,MONSTER_ART,LOOT_ART,DWARF_PORTRAITS,GNOME_PORTRAITS,HALFLING_PORTRAITS,PIXIE_PORTRAITS};',ctx);
const O=ctx.O;
// ---------- icons
const SLOT=new Set(['hit','combo','leech','block','heal','dot','hot']);
let symbols='';
for(const [k,v] of Object.entries(O.ICON_SVG)){ if(!v)continue; const inner=v.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,''); symbols+=`<symbol id="i-${k}" viewBox="0 0 24 24">${inner}</symbol>`; }
const ic=(t,cls='')=>`<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${t}"/></svg>`;
const NAMES={swap:'Swap',reroll:'Reroll',hit:'Hit',combo:'Combo',boost:'Boost',dot:'D.O.T.',leech:'Leech',fumble:'Fumble',dodge:'Dodge',leap:'Leap',pivot:'Pivot',freeze:'Freeze',heal:'Heal',hot:'H.O.T.',block:'Block',nullify:'Nullify'};
function face(f,tier='basic'){
  if(!f||f.type==='blank') return `<span class="face blank t-${tier}" title="Blank"></span>`;
  let ov='';
  if(f.type==='boost') ov=`<b class="fv bx">×${f.value}</b>`;
  else if(SLOT.has(f.type)&&f.value!=null) ov=`<b class="fv">${f.value}</b>`;
  return `<span class="face t-${tier}" title="${NAMES[f.type]}${f.value!=null&&!['dodge','leap','pivot','freeze','nullify','swap','reroll'].includes(f.type)?' '+f.value:''}">${ic(f.type)}${ov}</span>`;
}
const F=(s,tier)=>{const m=s.match(/^([a-z]+)(\d*)$/i);if(!m)return face(null);const t=m[1].toLowerCase();if(t==='blank')return face(null,tier);return face({type:t,value:m[2]?+m[2]:null},tier);};
const faces=(arr,tier)=>`<span class="faces">${arr.map(f=>face(f,tier)).join('')}</span>`;
// ---------- data
const tierOf=['alloy','gilded','magic'];
const img=(s,c='',alt='')=>`<img class="${c}" src="${s}" alt="${alt}">`;
const MA=O.MONSTER_ART, LA=O.LOOT_ART;
const bossArt=n=>MA[n]||'';
// ---------- helpers
const ch=(n,title,body,id)=>`<section class="page" id="${id}"><div class="rib-wrap"><div class="rib"><small>Chapter ${n}</small>${title}</div></div>${body}</section>`;
const call=(k,t,b)=>`<aside class="call c-${k}"><div class="call-h">${k==='tip'?ic('boost'):k==='warn'?ic('boss'):ic('key')}<span>${t}</span></div><p>${b}</p></aside>`;
const tbl=(head,rows,cls='')=>`<div class="tw"><table class="${cls}"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const btn=t=>`<kbd>${t}</kbd>`;
// tray diagram
function tray(cells,opts={}){
  const path=opts.path||[];const zone=opts.zone;const col=opts.color||'#fff';
  let h=`<div class="tray ${opts.small?'small':''}" ${opts.small?'':''}>`;
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){
    const idx=path.findIndex(p=>p[0]===r&&p[1]===c);
    const inZ=zone&&zone(r,c);
    const cell=cells?cells[r*4+c]:null;
    h+=`<div class="tc ${idx>=0?'onpath':''} ${inZ?'inzone':''}" ${inZ?`style="--zc:${col}"`:''}>${cell?F(cell):''}${idx>=0?`<i class="step">${idx+1}</i>`:''}</div>`;
  }
  return h+'</div>';
}
const demo=['blank','blank','hit1','leap',  'pivot','blank','combo1','hot1',  'hit2','dodge','block1','blank',  'boost2','heal2','blank','dodge'];
const demoPath=[[3,0],[2,0],[2,1],[1,2],[0,2]];
const route=()=>{const n=['camp','door','door','door','camp','door','door','boss'];return `<div class="route">${n.map((t,i)=>`<span class="rn rn-${t}">${ic(t)}</span>${i<n.length-1?'<s></s>':''}`).join('')}</div>`;};
// ---------- chapters
let C='';
// 1
C+=ch(1,'Goal &amp; Run at a Glance',`
<p class="lead">You are one Adventurer. Fight through <b>three dungeon floors</b> and defeat the <b>Big Boss</b> at the bottom.</p>
<p>Each turn your 16 dice are scrambled into a 4×4 <b>Tray</b>. Tap out a <b>Path</b> through the faces to attack, defend and heal. Every fight is a small puzzle; every victory is a new die or relic to build with.</p>
<h3>The Route</h3>
<p>Every floor is the same eight stops, shown on the Route bar at the top of the screen. Long-press any stop to see what it is.</p>
${route()}
<div class="route-lab"><span>Camp</span><span>Room ×3</span><span>Camp</span><span>Room ×2</span><span>Boss</span></div>
<p>A room is an <b>Enemy</b>, a <b>Trap</b> or a <b>Shrine</b>, and you only learn which when you open the door. Rooms get tougher along a floor: <b>Easy, Standard, Elite</b>, then after the second Camp <b>Standard, Elite</b>, then the Boss. On Floors 2 and 3 an Elite room is sometimes a <b>Deadly</b> foe instead. The first room of a run is always an Easy Enemy. Shrines only appear in rooms that are normally Easy or Standard (Night Shift doesn't change that; they get more common deeper in the dungeon), and between two Camps (or a Camp and the Boss) you meet at most one Trap and one Shrine.</p>
${tbl(['Floor','Loot','Enemy Health','Trap Health','Boss'],[
 ['1','<span class="tag t-alloy">Alloy</span>','7 – 15','25','Rogue Golemancer, Heating Elemental or Grosteque Grafter'],
 ['2','<span class="tag t-gilded">Gilded</span>','21 – 39','45','The Necrorancher, Bellicose Biomancer or Ceramic Golem'],
 ['3','<span class="tag t-magic">Magic</span>','25 – 67','70','<b>Big Boss:</b> Extruzeon, Myceleus or the Toadtaur Wizard']])}
<p class="small">Health is shown at Depth 0. Deadly foes have more (up to 48 on Floor 2 and 77 on Floor 3), and some depth modifiers raise it further.</p>
${call('note','How you win','Defeat the Big Boss. The run ends in defeat when your Health hits 0 and your Back Pocket cannot save you; a save spends the whole Pocket. See Chapter 10.')}
`,'c1');
// 2
const portr={dwarf:O.DWARF_PORTRAITS,gnome:O.GNOME_PORTRAITS,halfling:O.HALFLING_PORTRAITS,pixie:O.PIXIE_PORTRAITS};
const style={dwarf:'Shield up, then pop it for a big Hit.',gnome:'Damage over time and self-sustain.',halfling:'Healing and buffs.',pixie:'Blink past trouble, leave mischief behind.'};
const unl={dwarf:'Open from the start',gnome:'Open from the start',halfling:'Unlocks after you win a full run with any Origin',pixie:'Unlocks after you win with two different Origins'};
const origCards=O.ORIGINS.map(o=>`<div class="card origin"><div class="portrait">${img(portr[o.id][0],'',o.name)}</div><div class="oc"><h4>${o.name}</h4><div class="sub">${o.die}</div>${faces(o.faces,'basic')}<p>${style[o.id]}</p><p class="unl">${unl[o.id]}</p></div></div>`).join('');
const classText={armsmaster:['The right column','Once per turn, turn any die in the zone into a <b>Hit 2</b>.'],guard:['An L of three squares on the middle right','Once per turn, turn any die in the zone into a <b>Block 1</b>.'],dungeoneer:['The whole left and right edges','The edges <b>wrap</b>: a Path can cross from one edge to the other on any row. Each face keeps its own move: a plain step crosses on the same row, a <b>Dodge</b> crosses one row up or down, a <b>Pivot</b> either, and a <b>Leap</b> cannot cross.'],arcanist:['Both diagonals','Once on the X, a step from one X square to another may go <b>diagonally</b>, as if from a Dodge. Steps onto or off the X follow the normal rules. Your <b>Boosts</b> are also 1 stronger (×2 becomes ×3).']};
const classCards=O.CLASSES.filter(c=>!c.debug).map(c=>`<div class="card cls" style="--cc:${c.color}"><h4>${c.name}</h4>${tray(null,{small:true,zone:c.zone,color:c.color})}<div class="sub">${classText[c.id][0]}</div><p>${classText[c.id][1]}</p></div>`).join('');
C+=ch(2,'Starting a Run',`
<p>On the character screen pick an <b>Origin</b> and a <b>Class</b>, optionally name your Adventurer (the name is cosmetic) and press ${btn('Enter the Dungeon')}. You start with <b>20 Health</b>, an empty Back Pocket, and a Tray of 16 dice: <b>8 Attack Die I</b>, <b>7 Maneuver Die I</b> and your <b>Origin die</b>.</p>
<h3>Choose your Origin</h3><p>Your Origin sets your signature die.</p><div class="grid2">${origCards}</div>
<h3>Choose your Class</h3><p>Your Class gives you a <b>zone</b> on the Tray, highlighted in the Class color, and one ability that works inside it.</p><div class="grid2">${classCards}</div>
${call('tip','Using a Class skill','For Armsmaster and Guard, press '+btn('Skill')+', then tap a die in your zone (even one under a Minion: the Minion comes off). The conversion lasts for that turn only, and '+btn('Clear')+' undoes it so you can use it again. Dungeoneer and Arcanist skills are always on. Your first fight with each class explains its skill once.')}
<h3>Starting Boon</h3><p>Once unlocked, you can swap one of your Maneuver Die I for a Loot die you have collected <b>3 times</b> (in 3 different runs). A die carried over from a defeat replaces your extra Attack Die I. See Chapter 11.</p>
`,'c2');
// 3
C+=ch(3,'The Dice',`
<p>Your power lives in your dice. Sixteen sit in the Tray and are scrambled every turn; any others wait in the <b>Back Pocket</b>. Each die has six faces, each either blank or an Action with a value. <b>Long-press any die</b> to read what its face does.</p>
${tbl(['Die','What it is','Faces'],[
 ...[['attack',1,'Basic damage die'],['attack',2,'Basic damage die'],['attack',3,'Basic damage die'],['maneuver',1,'Basic movement die'],['maneuver',2,'Movement, plus a Pivot and two Block 2'],['maneuver',3,'Movement, two Block 2 and a Boost']].map(([cat,lv,what])=>{const d=O.BASIC_DICE.find(x=>x.cat===cat&&x.level===lv);return ['<b>'+d.name+'</b>',what,faces(d.faces,'basic')];}),
 ['<b>Origin die</b>','One per Adventurer','See Chapter 2'],
 ['<span class="tag t-alloy">Alloy</span> Loot dice','Common loot, Floor 1',O.FLOORS[0].lootPool.length+' dice'],
 ['<span class="tag t-gilded">Gilded</span> Loot dice','Rare loot, Floor 2',O.FLOORS[1].lootPool.length+' dice'],
 ['<span class="tag t-magic">Magic</span> Loot dice','The strongest, Floor 3',O.FLOORS[2].lootPool.length+' dice']])}
<p>Basic dice show their level (I, II, III). Loot dice show the name of the item. Every Loot die is in the <a href="#dice">Dice Reference</a> at the back.</p>
<h3>The Back Pocket</h3>
<p>The Back Pocket holds every die that is not in your Tray. Dice land there when a new Loot die replaces them (or when you keep a new Loot die in the Pocket), and you can swap them back at Camp. They are also your <b>safety net</b>: when your Health hits 0, your Back Pocket can save you once, but the save spends <b>every</b> die in it (Chapter 10). A red ♥ on ${btn('Pocket')} means the safety net is ready.</p>
`,'c3');
// 4
C+=ch(4,'Taking a Turn',`
<p>A fight is a series of <b>rounds</b> (the Round counter sits above the Tray). Combat ends the instant either side reaches 0 Health, even mid-round.</p>
<ol class="steps">
<li><b>Scramble.</b> Every die takes a random face. This happens when a room opens and at the end of every round.</li>
<li><b>Build a Path.</b> Tap a die to start, then tap neighbors to extend. Tap the last die again to step back one. ${btn('Clear')} removes the whole Path (tap it twice once you've built one). A running damage total and any <i>Lethal</i>, <i>Overkill</i> or <i>So close</i> hint update as you build. The chips over the enemy show what it will do <b>next turn</b>, and if that would knock you out, your Health bar turns red with a <b>☠ Lethal next turn</b> tag (it counts the Block, healing, Freeze or kill in the Path you're building).</li>
<li><b>Go.</b> Your Path resolves one die at a time, in the order you tapped. ${btn('Skip')} fast-forwards the animation without changing the result.</li>
<li><b>The reply.</b> Enemy takes its D.O.T.; enemy heals from its H.O.T., then acts (unless frozen); then you take your own D.O.T. and receive your H.O.T.</li>
<li><b>New round.</b> Fresh Scramble. Back to step 2.</li></ol>
<h3>Example Path</h3>
<div class="figure">${tray(demo,{path:demoPath})}<div class="figcap"><b>Fig. 1</b> A five-die Path. <b>1</b> Boost ×2 → <b>2</b> Hit 2 (4 damage) → <b>3</b> Dodge → <b>4</b> Combo 1, reached on a diagonal, with 3 neighbors showing Hit, Block and H.O.T. (1×(1+3) = 4 damage) → <b>5</b> Hit 1. <b>Total: 9 damage.</b></div></div>
<h3>Path Rules</h3>
<ul class="rules">
<li>A Path may start on any die showing an <b>Action</b>. <b>Blanks</b> can never be part of a Path.</li>
<li>A die can be used only <b>once</b> per Path.</li>
<li>After most dice the next die must be directly <b>up, down, left or right</b>. Maneuvers change this:
<div class="mini"><span>${ic('dodge')} <b>Dodge</b> → next die is <b>diagonal</b></span><span>${ic('leap')} <b>Leap</b> → exactly <b>two squares</b> away in a straight line (jumps the square between)</span><span>${ic('pivot')} <b>Pivot</b> → any of the <b>eight</b> neighbors</span></div></li>
<li>Your Class zone can add moves (Chapter 2).</li>
<li>You may press ${btn('Go')} with a Path of just one die. If every die is blank, Go lets you pass the turn.</li>
<li>Dice covered by a <b>Minion</b> count as blanks, but a Dodge, Leap or Pivot may <b>land on</b> one (using its own move). The Path ends there, and when it resolves the die underneath is uncovered and used.</li></ul>
<h3>Swap and Reroll</h3>
<p>Some dice have <b>Swap</b> or <b>Reroll</b> faces. Tap one to arm it (any time, even mid-Path), then tap a target die that isn't in your Path and isn't under a Minion. <b>Swap</b>: the two dice trade places. <b>Reroll</b>: the target lands on a different face that isn't blank. Once used, the Swap or Reroll die becomes a <b>Pivot</b> for the rest of the turn. ${btn('Clear')} undoes Swaps; Rerolls stay.</p>
<h3>Tokens</h3>
<p>Shrines (and the Giant Killer relic) hand out one-use tokens, used from the ${btn('Item')} button during a fight (not while a turn is resolving):</p>
<div class="grid3"><div class="card tok">${ic('nullify')}<b>Nullify</b><span>Same as the Nullify face.</span></div><div class="card tok">${ic('freeze')}<b>Freeze</b><span>Same as the Freeze face.</span></div><div class="card tok">${ic('boost')}<b>Boost ×4</b><span>Multiplies the first die of your next Path. Spent at turn end either way.</span></div><div class="card tok">${ic('swap')}<b>Swap</b><span>Tap any two dice to swap them. Clear refunds it.</span></div><div class="card tok">${ic('reroll')}<b>Reroll</b><span>Reroll any one die to a different face that isn't blank.</span></div></div>
`,'c4');
// 5
const fr=[['hit','Hit N','Deal N damage.'],
['combo','Combo N','Deal N × (1 + neighbors) damage. A neighbor is a die directly up, down, left or right of the Combo (in your Path or not) currently showing a Hit, Combo, Block, H.O.T. or D.O.T.'],
['dot','D.O.T. N','Add N to the enemy\'s D.O.T.'],['leech','Leech N','Add N to the enemy\'s D.O.T. <i>and</i> N to your own H.O.T.'],
['heal','Heal N','Heal N Health right now, up to your maximum.'],['hot','H.O.T. N','Add N to your H.O.T.'],['block','Block N','Add N to your Block.'],
['boost','Boost ×N','Multiply the next Hit, Combo, D.O.T., Leech, Heal, H.O.T. or Block in your Path by N. Consecutive Boosts multiply (×2 then ×3 is ×6). Any other face in between wastes it.'],
['dodge','Dodge','Path may continue to a diagonal die. No other effect.'],['leap','Leap','Path may continue exactly two squares away in a straight line. Clears a Minion in the square it jumps over, and may land on one.'],
['pivot','Pivot','Path may continue to any of the eight neighbors. No other effect.'],['fumble','Fumble N','Add N to your <i>own</i> D.O.T. (never multiplied by Boost). The Path continues normally.'],
['freeze','Freeze','Cancels the enemy\'s next move: a regular enemy skips its turn (on a heavy turn, only the heavy part is cancelled); a boss still makes its every-turn attack but its special is cancelled. It still takes D.O.T. and heals from H.O.T.'],['nullify','Nullify','Clears everything it can reach at once: every Minion, your D.O.T. and the enemy\'s H.O.T.'],
['swap','Swap','Tap it, then another die: the two trade places. Afterwards it is a Pivot for the turn.'],['reroll','Reroll','Tap it, then another die: that die rolls a different face that isn\'t blank. Afterwards it is a Pivot for the turn.']];
C+=ch(5,'Actions &amp; Statuses',`
<h3>Action Faces</h3>
<div class="faceTbl">${fr.map(([t,n,d])=>`<div class="fr">${face({type:t,value:['hit','combo','dot','leech','heal','hot','block'].includes(t)?'N':(t==='fumble'?null:(t==='boost'?'N':null))},'basic').replace('×N','×N')}<div><b>${n}</b><span>${d}</span></div></div>`).join('')}</div>
<p class="small">Dodge, Leap and Pivot are <b>Maneuvers</b>. They do nothing alone but count toward many quests.</p>
<h3>Statuses</h3>
${tbl(['Status','How it works'],[
['<b>Block</b>','Absorbs incoming damage point for point and is used up as it does. It lasts for the current fight only.'],
['<b>D.O.T.</b>','At round end the holder takes damage equal to its D.O.T., then it drops by 1 (3 deals 3, then 2, then 1). Your own D.O.T. ignores Block.'],
['<b>H.O.T.</b>','At round end the holder heals equal to its H.O.T., then it drops by 1. Never above maximum Health. Your own H.O.T. is capped at 6.'],
['<b>Shield</b> (enemy)','Some enemies gain Shield, which soaks up the damage you deal (Hits, Combos and quest bonuses) before their Health is touched. D.O.T. ignores Shield.'],
['<b>Minion</b>','Covers a random die in your Tray so it counts as a blank (new Minions land after the roll, so you never see what\'s under them). <b>Each point of damage you deal clears one</b>, and so do a Leap over it, a Maneuver landing on it, your Skill, or Nullify (all of them). Minions never carry over to the next fight.']])}
${call('note','Resets','<b>Every status resets when a new room opens</b>: your Block, D.O.T. and H.O.T., and all of the enemy\'s statuses. Only relics that grant Block at the start of a fight (Hard Hat Act, Stronger Infill) give you any. An armed Boost shows as a gold chip on your status row; long-press any status chip to read it.')}
`,'c5');
// 6 encounters
const shr=[];O.FLOORS.forEach((f,i)=>f.shrines.forEach(s=>shr.push([i+1,s.name,s.boon])));
const bossList=[];
O.FLOORS.forEach((f,i)=>f.bosses.forEach(b=>bossList.push({...b,floor:i+1})));
O.BIG_BOSSES.forEach(b=>bossList.push({...b,floor:3,big:true}));
const actTxt=a=>a.type==='dmg'?`${ic('hit')} Hit ${a.value}${a.grow?` (+${a.grow} each hit)`:''}`:a.type==='dmgPerMinion'?`${ic('hit')} ${a.value} per Minion`:a.type==='minion'?`${ic('minion')} Minion ${a.value}`:a.type==='shield'?`${ic('block')} Shield ${a.value}`:a.type==='hot'?`${ic('hot')} H.O.T. ${a.value}`:a.type==='heal'?`${ic('heal')} Heal ${a.value}`:a.type==='dot'?`${ic('dot')} D.O.T. ${a.value}`:a.type==='dropShield'?'drops its Shield':'';
const kitHTML=k=>`<div class="acts"><span class="act"><b>Every turn:</b> ${k.each.map(actTxt).join(' + ')}</span></div>${k.specials.map(sp=>`<div class="acts"><span class="act">${sp.windup?'<b style="color:#c0392b">Wind-up</b> ':''}<b>${sp.name}:</b> ${sp.herald?`brings ${ic('minion')} ${sp.herald.value} with its warning, then `:''}${sp.acts.map(actTxt).join(', ')}</span></div>`).join('')}`;
const acts=b=>{const k=O.BOSS_KITS[b.name]; if(!k) return ''; return kitHTML(k)+(k.phase2?`<div class="acts"><span class="act"><b>Phase 2 · ${k.phase2.name}</b></span></div>`+kitHTML(k.phase2):'');};
const bossCards=bossList.map(b=>`<div class="card boss ${b.big?'big':''}"><div class="bimg">${img(bossArt(b.name),'',b.name)}</div><div class="bt"><small>${b.big?'Big Boss · Floor 3':'Floor '+b.floor+' Boss'}</small><h4>${b.name}</h4><div class="hp">${ic('heal')} <b>${Math.round(b.health*O.BASE_HP_MUL[b.floor-1])}</b> Health</div><div class="acts">${acts(b)}</div></div></div>`).join('');
C+=ch(6,'Encounters',`
<p>Every door opens onto one Encounter. The doorway shows its name, Health bar, what it will do next turn, and any quests. The <b>Codex</b> Bestiary keeps a page for every foe you have met.</p>
<h3>Enemies &amp; Traps</h3>
<p><b>Enemies</b> are the dungeon's ordinary defenders. <b>Traps</b> have more Health (25, 45 and 70 by floor) and are meant to be beaten with quests rather than raw damage. Each turn an Enemy or Trap performs <i>every</i> action on its card in one go: it hits you, gains Shield, heals, channels H.O.T., adds to your D.O.T., or summons Minions. The chips over the doorway show each one as an icon and a number.</p>
<p><b>Elite</b> and <b>Deadly</b> foes (tagged in the doorway) have <b>heavy turns</b>: an Elite every 3rd turn, a Deadly every 2nd. A heavy turn doubles its attack (or, with no attack, its biggest Minion, D.O.T. or Shield action; healing is never doubled). The chips count down ("Heavy in 2") and turn red the turn before.</p>
<h3>Quests</h3>
<p>Most Enemies and every Trap list <b>quests</b>. Completing one deals its bonus damage at once (or grants its listed effect). Quests are checked once your Path finishes, so "3 maneuvers" means three Maneuver faces in one Path. Each quest counts once per fight. An Encounter's <b>Quest Health</b> caps the total bonus damage its quests can deal.</p>
<p>Quests ask for: a number of Maneuvers, Dodges, Leaps, Pivots, Combos, Boosts, Heals, Blocks, D.O.T.s, H.O.T.s or Nullifies in one Path; blank dice left unused; a Path of a certain length (or a short one); a damage total in one turn; Block banked up; or surviving until a certain turn. Most rewards are damage, but some put D.O.T. on the foe, give you H.O.T., or trigger a Nullify or Freeze.</p>
<h3>Shrines</h3><p>A Shrine is a room without a fight: press and hold it to receive its boon. Some offer a choice, and <b>bargain</b> shrines ask a price (maximum Health, or your next Camp rest) or let you walk away. Some shrines also hand you a loot pick (a Scroll Dispenser drops a die along with its scrolls; Madpie Nest and Storied Emporium add one to their relic), and a few let you take two Relics. Themed relic shrines offer relics from one family first.</p>
${tbl(['Floor','Shrine','Boon'],shr.map(s=>[s[0],`<b>${s[1]}</b>`,s[2]]))}
<p class="small">If you already own every Relic, a Relic Shrine heals 10 instead.</p>
<h3>Bosses</h3>
<p>Bosses guard the end of each floor. Every turn a Boss makes its <b>every-turn</b> attack <b>plus</b> the next <b>special</b> from its own list, which loops in order. The chips show the coming special a turn ahead; a <b>wind-up</b> (red) is a big telegraphed blow. Some specials bring their Minions with the warning, giving you one turn to clear them. Big Bosses switch to <b>Phase 2</b> after a turn that ends with them at half Health or less, with a new attack and list. Freeze cancels the special, not the every-turn attack. A Boss fight offers <b>three</b> Loot choices.</p>
<div class="bosses">${bossCards}</div>
`,'c6');
// 7
C+=ch(7,'After a Fight',`
<p>When an Encounter reaches 0 Health it falls and a <b>loot chest</b> appears. The chest holds one pip for each die inside; tap it to open, then pick one die.</p>
${tbl(['Source','Dice to choose from'],[['Enemy or Trap','2'],['Boss or Big Boss','3'],['Overkill','+1'],['Need Before Greed relic','+1'],['Burden of Choice (depth)','−1, and no Overkill bonus (always at least 1)']])}
<p>Dice come from your floor's tier (Alloy, Gilded, Magic). You will not be offered a die you already own this run until the whole tier has been seen. Dice you've never collected carry a <span class="tag new">NEW</span> tag.</p>
${call('tip','Overkill!','If the killing blow carries <b>10 or more</b> damage past what was needed (6 with the Bloodthirst relic), you score an Overkill: a callout banner, a bigger chest, and one extra die to choose from. While building a Path the game warns you in advance with a Lethal or Overkill hint.')}
<p><b>Taking the die.</b> After choosing, pick one Tray die to replace and press ${btn('Replace')}: the old die goes to your Back Pocket, not the bin, so you can swap it back at Camp. Or press ${btn('Keep in Pocket')} to put the new die straight into the Back Pocket and leave your Tray as it is. If you hesitate, the game marks your weakest die as <i>Suggested</i> (you still choose). Unchosen dice return to the pool.</p>
${call('warn','No free healing','After loot, your Health is <b>not</b> restored. The route moves on to the next room or Camp.')}
`,'c7');
// 8
C+=ch(8,'Camp',`
<div class="campbanner">${ic('camp')}<span>Camp is your only chance to reorganize. Every floor has two: one at the start and one after the third room. The very first Camp of a run (Base Camp) has no rest: its button reads Start Your Adventure.</span></div>
<ol class="steps">
<li><b>Organize.</b> Swap any Tray die with any Back Pocket die, as often as you like: tap one die in the Tray and one in the Pocket.</li>
<li><b>The campfire: Rest or Train.</b> Each Camp's fire gives you <b>one</b> of these, so choose:
<ul class="rules"><li><b>Rest.</b> The Tray is scrambled and you heal <b>half the non-blank faces</b> it shows, rounded up (Percolation Theory adds 3; the Rationing Rations depth modifier halves or removes it). The button shows about how much you'd heal. Resting also gives you a fresh scramble for the next room.</li>
<li><b>Train.</b> Combine <b>3 matching Basic dice</b> (same type and level, Tray or Pocket) into one a level higher, up to III: one Attack and one Maneuver per Camp. If dice leave the Tray you need enough spare Pocket dice to refill. Loot dice can't be combined.</li></ul>
Base Camp has no fire: combining there is free. The Time-Intensive Shrine can put out your next campfire.</li></ol>
<p>Press ${btn('Break Camp &amp; Continue')} when you are done.</p>
`,'c8');
// 9 relics
const relCard=r=>`<div class="relic ${r.origin?'orel':''}"><div class="mono">${r.mono}</div><div><b>${r.name}</b>${r.origin?` <small>${r.origin[0].toUpperCase()+r.origin.slice(1)}</small>`:''}<span>${r.desc.replace(/^\+8 maximum health, right now\./,'+8 maximum Health, immediately.')}</span></div></div>`;
C+=ch(9,'Relics',`
<p>Relics are <b>permanent passive perks</b> for the rest of a run. They take no Tray space and can't be lost or swapped. You can hold any number, never the same one twice. They show as badges above the doorway; tap to read, and watch them pulse when they fire.</p>
<h3>Shrine Relics</h3><p>Found at Relic Shrines. General ones (Department Spore, Storied Emporium) draw from every relic; themed ones draw from one family (offense, defense, path and movement, or loot and tempo); bargain ones (Blood-Drive Treats, Time-Intensive Shrine, Faustian Spreadsheet) charge a price. You are shown 3 you don't hold (4 at the Faustian Spreadsheet, +1 with Inductive Step) and keep 1. Each family has its own gem: offense a red triangle, defense a blue emerald, path a green hexagon, loot and tempo a gold round, Origin a purple kite.</p>
<p class="small">Some relics join the shrines later: Hard Hat Act, Perfect Fifth and Prime Edge after your first win; Scavenger's Acumen, Evasion Tank and Minus-One Mantra after you clear Depth 1. Until then the Codex shows them as locked.</p>
<div class="relics">${O.RELICS.filter(r=>!r.origin).map(relCard).join('')}</div>
<h3>Origin Relics</h3><p>Never offered at Shrines. <b>Winning a full run with an Origin earns that Origin's relic</b>, and every later run as that Origin begins with it.</p>
<div class="relics">${O.RELICS.filter(r=>r.origin).map(relCard).join('')}</div>
<p class="small">The Codex (Settings or title screen) has a Relics tab listing every relic; ones you haven't been offered appear as locked mystery slots.</p>
`,'c9');
// 10
C+=ch(10,'Defeat',`
<p>When your Health reaches 0 the game checks your Back Pocket before ending the run.</p>
<ol class="steps">
<li>If the Pocket has dice, they are <b>rolled</b> one at a time in random order.</li>
<li>The first one that lands on any <b>Action</b> saves you: you are restored to <b>5 Health</b> and the fight goes on.</li>
<li>Saved or not, <b>every die in the Back Pocket is spent</b>. Any Pocket is a full safety net, but it can't keep saving you: it arms again when a new die lands in your Pocket (usually your next loot).</li>
<li>If every die lands blank, or the Pocket is empty, the run ends.</li></ol>
<p class="small">Combining dice at Camp warns you if it would use your last spare dice.</p>
${call('note','Carry a die forward','On the Defeated screen you choose one die from the highest tier of Loot dice in your Tray to carry into your next run, where it takes the place of your extra Attack Die I.')}
<p>Win or lose, the end screen shows a <b>Run Card</b>: your Adventurer, depth, how the run ended, damage, best turn, Block, foes beaten, final Tray and relics. ${btn('Save Card')} saves or shares it as a picture.</p>
`,'c10');
// 11
C+=ch(11,'Progression &amp; Records',`
<p>The game remembers every run on your device. None of this changes how a turn is played; it decides what a new Adventurer can start with, and celebrates what happened on the way.</p>
<h3>Unlocks</h3>
<ul class="rules">
<li><b>Origins.</b> Dwarf and Gnome from the start. <b>Halfling</b> unlocks after you win with any Origin. <b>Pixie</b> unlocks once you've won with two different Origins.</li>
<li><b>Origin Relics.</b> Your first win with an Origin earns its relic. The victory screen announces it; the character screen shows it as a locked slot until then.</li>
<li><b>Starting Boons.</b> Swap your first Maneuver Die I for a Loot die you've collected <b>3 times</b> (a run never offers the same die twice, so that means 3 runs; Keep in Pocket counts). Tiers open as you progress: <span class="tag t-alloy">Alloy</span> after your first win, <span class="tag t-gilded">Gilded</span> after reaching Floor 3, <span class="tag t-magic">Magic</span> after winning with every Origin. The Codex shows "Collected n/3" for each die. Tap the star on a die to favorite it.</li>
<li><b>Carried die.</b> The die you carry after a defeat is used in your next run only.</li></ul>
<h3>Depth</h3>
<p>After your first win, the character screen lets you go <b>deeper</b>. The base dungeon is <b>Depth 0</b>; each rank of a modifier adds depth, and you may choose up to 2 deeper than your best clear. Deeper runs score more (×1 + ¼ per depth).</p>
${tbl(['Modifier','Ranks','Depth per rank','Effect'],O.DEPTH_MODS.map(m=>['<b>'+m.name+'</b>',m.max,m.costs.join(', '),Array.from({length:m.max},(_,i)=>(m.max>1?'<i>'+(i+1)+':</i> ':'')+m.desc(i+1)).join('<br>')]))}
<p>Each Class shows a rosette <b>badge</b> with the deepest depth you've cleared with it. Clearing deeper also earns account-wide <b>dice finishes</b>, a metal border on your Tray dice, and a title: <b>Bronze</b> at Depth 3 (Delver of the Deep), <b>Silver</b> at 5 (Dread Delver), <b>Gold</b> at 7 (Dungeon Breaker) and <b>Royal</b> at 9 (Scourge of the Dungeon).</p>
<h3>Records</h3>
<ul class="rules">
<li><b>Achievements</b> are lifetime milestones: First Blood, Dungeon Conqueror, Two Roads, Jack of All Trades (every Origin), Master Tactician (every Class), Into the Deep, Overkill Enthusiast, Shrine Seeker, Monster Hunter, Veteran Adventurer and Heavy Hitter. They never change gameplay.</li>
<li><b>Run Highlights.</b> The end-of-run screen shows your biggest single turn, biggest Overkill, longest Path and Close Calls. A gold <span class="tag new">NEW BEST</span> appears when one of the first three beats an earlier run.</li>
<li><b>Close Calls.</b> A turn that leaves a foe with 3 Health or less, or a kill 1 to 3 damage short of an Overkill, is called out on screen ("Just 2 HP left!"). Information only.</li>
<li><b>Records</b> (Settings or title screen) holds your Run History (last 20 runs) and Achievements.</li>
<li>The <b>Codex</b> has four tabs: <b>Bestiary</b> (every foe you've met, with its moves, flavor and your wins and losses), <b>Dice</b> (Origin dice and every Loot die you've collected), <b>Relics</b> and <b>Key</b> (every action icon, tap for its rule).</li></ul>
<h3>Settings &amp; Play Data</h3>
<p>The gear menu holds <b>Sound effects</b> and <b>Music</b> volume sliders, Reduce motion, Gentler effects and Vibration, plus How to Play, Codex, Records, Abandon Run and <b>Reset Progress</b>, which erases all unlocks, records and depth bests. <b>Export Play Data</b> packages your recent runs as a file for playtest feedback. The game asks once whether to share play data; if you say yes, each finished run is sent anonymously (no names, only a random device id).</p>
`,'c11');
// 12 quick ref
C+=ch(12,'Quick Reference',`
<div class="qr">
<div><b>Start</b>20 Health · 16 dice · empty Pocket</div>
<div><b>Floor</b>Camp · 3 rooms · Camp · 2 rooms · Boss</div>
<div><b>Loot</b>2 dice (3 for Bosses) · +1 Overkill · +1 Need Before Greed · Replace or Keep in Pocket</div>
<div><b>Overkill</b>10+ past lethal (6 with Bloodthirst)</div>
<div><b>Campfire</b>Rest (heal ½ of non-blank faces) OR Train (combine dice) · Base Camp: combine free</div>
<div><b>Train</b>3 matching Basics → 1 a level higher</div>
<div><b>Revive</b>Pocket dice rolled · first Action → 5 Health · the whole Pocket is spent</div>
<div><b>Statuses</b>All reset when a new room opens</div>
<div><b>D.O.T. / H.O.T.</b>Trigger at round end, then drop by 1</div>
<div><b>Boost</b>Multiplies the <i>next</i> value face only</div>
<div><b>Minions</b>1 cleared per damage dealt · Leap over or land on clears one · Nullify clears all</div>
<div><b>Heavy turns</b>Elite every 3rd turn · Deadly every 2nd</div>
<div><b>Bosses</b>Every-turn attack + a telegraphed special · Phase 2 at half Health</div>
<div><b>Swap / Reroll</b>The used die becomes a Pivot for the turn</div></div>
<h3>From the Tabletop</h3>
<p>Dungeon Scramble began as a physical dice game. The video game keeps the rules but takes over the chores: it scrambles the dice, tracks every counter and cube, and shuffles the encounters. The tabletop's multi-Adventurer co-op (extra Health and summed Encounter Health per player) is not part of the video game yet; for now this is a <b>solo</b> experience.</p>
`,'c12');
// dice reference
const diceRef=O.FLOORS.map((f,i)=>{const t=tierOf[i];return `<h3${i===2?' style="break-before:page"':''}><span class="tag t-${t}">${f.lootName}</span> Floor ${i+1} Loot Dice <small>(${f.lootPool.length})</small></h3><div class="dgrid">${f.lootPool.map(d=>`<div class="dcard t-${t}-b"><div class="dart">${LA[d.name]?img(LA[d.name],'',d.name):''}</div><b>${d.name}</b>${faces(d.faces,t)}</div>`).join('')}</div>`;}).join('');
C+=`<section class="page" id="dice"><div class="rib-wrap"><div class="rib"><small>Appendix</small>Dice Reference</div></div><p>Every Loot die in the game, with all six faces. Faces are tinted by tier.</p>${diceRef}</section>`;
// ---------- toc
const toc=[['c1','Goal & Run at a Glance'],['c2','Starting a Run'],['c3','The Dice'],['c4','Taking a Turn'],['c5','Actions & Statuses'],['c6','Encounters'],['c7','After a Fight'],['c8','Camp'],['c9','Relics'],['c10','Defeat'],['c11','Progression & Records'],['c12','Quick Reference'],['dice','Dice Reference']];
const tocHTML=`<section class="page toc"><div class="rib-wrap"><div class="rib"><small>Table of</small>Contents</div></div><ol>${toc.map((t,i)=>`<li><a href="#${t[0]}"><span>${t[1].replace('&','&amp;')}</span><i></i><em>${i<12?i+1:'A'}</em></a></li>`).join('')}</ol></section>`;
const cover=`<header class="cover"><div class="cover-art" style="background-image:url(${O.COVER_ART})"></div><div class="cover-shade"></div><div class="cover-in"><div class="booklet">Instruction Booklet</div><div class="press">▶ PRESS START</div><div class="ver">Video Game Edition · Build ${O.GAME_VERSION} · 1 Player</div></div></header>`;
const css=fs.readFileSync(__dirname+'/style.css','utf8');
const html=`<meta charset="utf-8"><title>Dungeon Scramble Rulebook</title><link href="https://fonts.googleapis.com/css2?family=Metamorphous&display=swap" rel="stylesheet"><style>${css}
.boss .acts{display:block}.boss .act{white-space:normal;display:block;line-height:1.35}</style>
<svg width="0" height="0" style="position:absolute"><defs>${symbols}</defs></svg>
<main class="book">${cover}${tocHTML}${C}<footer class="colophon">© Dungeon Scramble · Keep this booklet in a safe place. Dice not included.</footer></main>`;
fs.writeFileSync(__dirname+'/rulebook.html',html);console.log((html.length/1e6).toFixed(2)+'MB');
