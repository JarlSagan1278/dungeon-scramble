// Bridge between the game page and the desktop window (the game reads window.DSDesktop, render.js desktopApp()).
const { contextBridge, ipcRenderer } = require('electron');
let full = ipcRenderer.sendSync('ds:isFullscreen');
ipcRenderer.on('ds:fullscreen', (_e, v) => { full = v; });
contextBridge.exposeInMainWorld('DSDesktop', {
  isFullscreen: () => full,
  toggleFullscreen: () => ipcRenderer.send('ds:toggleFullscreen'),
  quit: () => ipcRenderer.send('ds:quit'),
  achievement: name => ipcRenderer.send('ds:achievement', name),       // Steam achievements (Nov 25)
  achievements: names => ipcRenderer.send('ds:achievements', names),
  platform: process.platform
});
