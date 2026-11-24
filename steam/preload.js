// Bridge between the game page and the desktop window (the game reads window.DSDesktop, render.js desktopApp()).
const { contextBridge, ipcRenderer } = require('electron');
let full = ipcRenderer.sendSync('ds:isFullscreen');
ipcRenderer.on('ds:fullscreen', (_e, v) => { full = v; });
contextBridge.exposeInMainWorld('DSDesktop', {
  isFullscreen: () => full,
  toggleFullscreen: () => ipcRenderer.send('ds:toggleFullscreen'),
  quit: () => ipcRenderer.send('ds:quit'),
  platform: process.platform
});
