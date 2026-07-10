const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tarjiman', {
  getDesktopSource: () => ipcRenderer.invoke('get-desktop-source'),
  setIgnoreMouseEvents: (ignore, opts) => ipcRenderer.send('set-ignore-mouse-events', ignore, opts),
  onClickThroughChanged: (cb) => ipcRenderer.on('click-through-changed', (e, v) => cb(v)),

  // Control window -> overlay window commands (relayed through main process)
  sendControl: (action, payload) => ipcRenderer.send('control-action', { action, payload }),
  onControlCommand: (cb) => ipcRenderer.on('overlay-command', (e, msg) => cb(msg)),

  // Overlay window -> control window status updates
  sendStatus: (status) => ipcRenderer.send('overlay-status', status),
  onStatus: (cb) => ipcRenderer.on('control-status-update', (e, status) => cb(status)),

  // Safety net: reset the overlay window back to its default on-screen position/size.
  resetOverlayPosition: () => ipcRenderer.send('reset-overlay-position')
});
