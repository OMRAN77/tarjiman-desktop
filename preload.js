const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tarjiman', {
  getDesktopSource: () => ipcRenderer.invoke('get-desktop-source'),
  setIgnoreMouseEvents: (ignore, opts) => ipcRenderer.send('set-ignore-mouse-events', ignore, opts),
  onClickThroughChanged: (cb) => ipcRenderer.on('click-through-changed', (e, v) => cb(v))
});
