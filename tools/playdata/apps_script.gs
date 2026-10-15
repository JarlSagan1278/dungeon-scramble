// Dungeon Scramble play data receiver (Oct 15, 2026).
// Lives in the "Dungeon Scramble Play Data" Google Sheet: Extensions > Apps Script, paste this, Deploy > New deployment >
// Web app (Execute as: Me, Who has access: Anyone). Put the /exec URL in PLAYDATA_URL (src/logic.js).
// IMPORTANT (Oct 16): run testPost once from the editor first and accept the permissions (Sheets + Drive), or every
// web-app call fails before writing anything. After editing this code, Deploy > Manage deployments > edit > New version.
// Each finished run (sent only with the player's consent) becomes one row in "Runs"; the full record is saved as a
// JSON file in the Drive folder "Dungeon Scramble Play Data (runs)" and linked from the row.
const FOLDER_NAME = 'Dungeon Scramble Play Data (runs)';
const HEADERS = ['Received','Player','Run','Version','Origin','Class','Outcome','Floor reached','Depth','Run #','Active minutes','Rooms','Turns','Ended by','Relics','Screen','Full record'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (!d || d.kind !== 'run' || !d.rec || !d.rec.runId) return ContentService.createTextOutput('ignored');
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
