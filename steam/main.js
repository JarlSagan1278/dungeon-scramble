// Dungeon Scramble desktop app for Steam (Nov 24). Loads the --steam build from disk (steam/web), opens fullscreen
// (remembered), keeps saves in the app's own storage (userData), opens outside links in the player's browser.
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path'), fs = require('fs');
const PREFS = () => path.join(app.getPath('userData'), 'window.json');
function readPrefs(){ try{ return JSON.parse(fs.readFileSync(PREFS(), 'utf8')); }catch(e){ return { fullscreen: true }; } }
function writePrefs(p){ try{ fs.writeFileSync(PREFS(), JSON.stringify(p)); }catch(e){} }
let win, prefs;
function create(){
  prefs = readPrefs();
  win = new BrowserWindow({
    width: prefs.width || 1440, height: prefs.height || 900, minWidth: 800, minHeight: 560,
    fullscreen: prefs.fullscreen !== false, backgroundColor: '#130d09', title: 'Dungeon Scramble', show: false,
    icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  const tell = () => { if(!win.isDestroyed()) win.webContents.send('ds:fullscreen', win.isFullScreen()); prefs.fullscreen = win.isFullScreen(); writePrefs(prefs); };
  win.on('enter-full-screen', tell); win.on('leave-full-screen', tell);
  win.on('resize', () => { if(!win.isFullScreen() && !win.isMaximized()){ const [w, h] = win.getSize(); prefs.width = w; prefs.height = h; } });
  win.on('close', () => writePrefs(prefs));
  // outside links (share card, itch page) open in the player's browser; the game itself never navigates away
  win.webContents.setWindowOpenHandler(({ url }) => { if(/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if(!url.startsWith('file:')){ e.preventDefault(); if(/^https?:/.test(url)) shell.openExternal(url); } });
  win.loadFile(path.join(__dirname, 'web', 'index.html'));
}
ipcMain.on('ds:isFullscreen', e => { e.returnValue = win ? win.isFullScreen() : true; });
ipcMain.on('ds:toggleFullscreen', () => { if(win) win.setFullScreen(!win.isFullScreen()); });
ipcMain.on('ds:quit', () => app.quit());
// Steam achievements (Nov 25): steamworks.js talks to the Steam client. The app ID comes from steam_appid.txt next to the
// app (or DS_STEAM_APPID); with no ID, no Steam client or no library, achievements quietly do nothing. The game sends the
// achievement's API name (its id in upper case, the list in docs/release/steam_achievements.md) when it unlocks, and the
// full list of unlocked ones at start, so medals earned while Steam was offline still reach it.
let steam = null;
try{
  let id = Number(process.env.DS_STEAM_APPID || process.env.SteamAppId || 0); // Steam sets SteamAppId when it launches the game
  if(!id){ try{ id = Number(fs.readFileSync(path.join(path.dirname(app.getPath('exe')), 'steam_appid.txt'), 'utf8').trim()); }catch(e){} } // for testing outside Steam
  if(id > 0){ steam = require('steamworks.js').init(id); }
}catch(e){ steam = null; }
const unlock = name => { try{ if(steam && name && !steam.achievement.isActivated(name)) steam.achievement.activate(name); }catch(e){} };
ipcMain.on('ds:achievement', (_e, name) => unlock(String(name)));
ipcMain.on('ds:achievements', (_e, names) => { (Array.isArray(names) ? names : []).forEach(n => unlock(String(n))); });
if(!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if(win){ if(win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(create);
  app.on('window-all-closed', () => app.quit());
}
