// Dungeon Scramble play data receiver (Oct 15, 2026).
// Lives in the "Dungeon Scramble Play Data" Google Sheet: Extensions > Apps Script, paste this, Deploy > New deployment >
// Web app (Execute as: Me, Who has access: Anyone). Put the /exec URL in PLAYDATA_URL (src/logic.js).
// IMPORTANT (Oct 16): run testPost once from the editor first and accept the permissions (Sheets + Drive), or every
// web-app call fails before writing anything. After editing this code, Deploy > Manage deployments > edit > New version.
// Each finished run (sent only with the player's consent) becomes one row in "Runs"; the full record is saved as a
// JSON file in the Drive folder "Dungeon Scramble Play Data (runs)" and linked from the row.
// Oct 22 (release prep): posts are checked before anything is written (size, id formats, field types, a per-device
// hourly cap), old data is deleted after 2 years (the privacy policy promise: run installDailyPurge once), and
// deletePlayer('p-...') removes one player's runs for a deletion request. After pasting, deploy a New version.
const FOLDER_NAME = 'Dungeon Scramble Play Data (runs)';
const MAX_BODY = 800000;          // bytes; a full 2,500-event run is ~300-500 KB
const MAX_RUNS_PER_HOUR = 20;     // per device id; real players finish far fewer
const RETENTION_DAYS = 730;       // 2 years (privacy policy)
const OUTCOMES = ['victory', 'defeat', 'abandoned', 'demo'];
const HEADERS = ['Received','Player','Run','Version','Origin','Class','Outcome','Floor reached','Depth','Run #','Active minutes','Rooms','Turns','Ended by','Relics','Screen','Full record'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = (e && e.postData && e.postData.contents) || '';
    if (body.length > MAX_BODY) return ContentService.createTextOutput('ignored');
    let d; try { d = JSON.parse(body); } catch (err) { return ContentService.createTextOutput('ignored'); }
    if (!valid_(d)) return ContentService.createTextOutput('ignored');
    if (!underCap_(d.player)) return ContentService.createTextOutput('ignored');
    const r = d.rec;
    const sh = sheet_();
    const last = sh.getLastRow();
    if (last > 1) {
      const ids = sh.getRange(2, 3, last - 1, 1).getValues().map(x => x[0]);
      if (ids.indexOf(r.runId) >= 0) return ContentService.createTextOutput('duplicate');
    }
    const file = folder_().createFile(r.runId + '.json', JSON.stringify(d), 'application/json');
    const ev = r.events || [];
    const endT = ev.length ? (ev[ev.length - 1].t || 0) : 0;
    const rooms = ev.filter(x => x.e === 'room_start');
    const lastRoom = rooms.length ? rooms[rooms.length - 1] : null;
    const endedBy = r.outcome === 'victory' ? '' : (lastRoom ? (lastRoom.name || lastRoom.type || '') : '');
    sh.appendRow([new Date(), String(d.player || ''), r.runId, r.version || '', r.origin || '', r.klass || '', r.outcome || '',
      r.floorReached || '', (r.depth || 1) - 1, r.runNo || '', Math.round(endT / 6000) / 10, rooms.length,
      ev.filter(x => x.e === 'turn').length, endedBy, (r.relics || []).join(', '), d.screen || '', file.getUrl()]);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

// Shape check: anything that doesn't look like a run the game itself would send is dropped unwritten.
function valid_(d) {
  if (!d || d.kind !== 'run' || typeof d.rec !== 'object' || !d.rec) return false;
  const r = d.rec, str = (v, n) => v == null || (typeof v === 'string' && v.length <= n);
  if (!/^p-[a-z0-9-]{4,24}$/.test(String(d.player || ''))) return false;
  if (!/^r-[a-z0-9]{4,24}$/.test(String(r.runId || ''))) return false;
  if (!str(d.screen, 12) || (d.screen && !/^\d{2,5}x\d{2,5}$/.test(d.screen))) return false;
  if (!str(r.version, 16) || !str(r.origin, 24) || !str(r.klass, 24)) return false;
  if (OUTCOMES.indexOf(r.outcome) < 0) return false;
  if (!Array.isArray(r.events) || r.events.length > 2600) return false;
  if (r.relics != null && (!Array.isArray(r.relics) || r.relics.length > 60 || r.relics.some(x => typeof x !== 'string' || x.length > 40))) return false;
  if (r.floorReached != null && !(r.floorReached >= 1 && r.floorReached <= 3)) return false;
  return true;
}
// At most MAX_RUNS_PER_HOUR posts per device id per hour, so one script can't flood the sheet.
function underCap_(player) {
  const c = CacheService.getScriptCache(), k = 'n:' + player, n = Number(c.get(k) || 0);
  if (n >= MAX_RUNS_PER_HOUR) return false;
  c.put(k, String(n + 1), 3600);
  return true;
}

// Retention (privacy policy: 2 years). Deletes every row received more than RETENTION_DAYS ago and trashes its file.
function purgeOld() {
  const cutoff = Date.now() - RETENTION_DAYS * 864e5;
  removeRows_(row => row[0] instanceof Date && row[0].getTime() < cutoff);
}
// Deletion request: removes every run sent by one device id (the "Play data id" shown in Records -> Backup).
function deletePlayer(playerId) {
  const n = removeRows_(row => String(row[1]) === String(playerId));
  Logger.log('Deleted ' + n + ' runs for ' + playerId);
  return n;
}
function removeRows_(match) {
  const sh = sheet_(), last = sh.getLastRow();
  if (last < 2) return 0;
  const rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  let n = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (!match(rows[i])) continue;
    const m = String(rows[i][HEADERS.length - 1] || '').match(/[-\w]{25,}/);
    if (m) { try { DriveApp.getFileById(m[0]).setTrashed(true); } catch (err) {} }
    sh.deleteRow(i + 2); n++;
  }
  return n;
}
// Run ONCE from the editor: purgeOld then runs every day by itself.
function installDailyPurge() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'purgeOld').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('purgeOld').timeBased().everyDays(1).atHour(3).create();
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Runs') || ss.insertSheet('Runs');
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}
function folder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}
// Run once from the editor ("Run" > testPost) to check the setup before deploying.
function testPost() {
  doPost({ postData: { contents: JSON.stringify({ kind: 'run', player: 'p-test', screen: '395x769',
    rec: { runId: 'r-test-' + Date.now(), version: 'test', origin: 'Dwarf', klass: 'Guard', outcome: 'defeat', floorReached: 1, depth: 1,
      events: [{ t: 60000, e: 'room_start', name: 'Feral Pet Rock' }, { t: 90000, e: 'turn' }, { t: 120000, e: 'run_end' }] } }) } });
}
