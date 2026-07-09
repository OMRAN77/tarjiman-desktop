const { app, BrowserWindow, ipcMain, desktopCapturer, screen, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
let overlayWin = null;
let tray = null;
let clickThrough = false;

function createOverlay() {
  const saved = store.get('winBounds');
  const primary = screen.getPrimaryDisplay();
  const defaultBounds = {
    x: Math.round(primary.bounds.x + primary.bounds.width / 2 - 300),
    y: Math.round(primary.bounds.y + primary.bounds.height - 160),
    width: 600,
    height: 90
  };

  overlayWin = new BrowserWindow({
    ...(saved || defaultBounds),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Try the strongest always-on-top level available on Windows so it floats
  // above fullscreen apps/games/video players as much as the OS allows.
  overlayWin.setAlwaysOnTop(true, 'screen-saver');
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  overlayWin.loadFile('overlay.html');

  overlayWin.on('move', saveBounds);
  overlayWin.on('resize', saveBounds);

  overlayWin.on('closed', () => { overlayWin = null; });
}

function saveBounds() {
  if (overlayWin) store.set('winBounds', overlayWin.getBounds());
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon.isEmpty() ? path.join(__dirname, 'icon.ico') : icon);
  const menu = Menu.buildFromTemplate([
    { label: 'إظهار/إخفاء (Ctrl+Alt+T)', click: toggleShow },
    { label: 'تجاوز النقر (Ctrl+Alt+C)', click: toggleClickThrough },
    { type: 'separator' },
    { label: 'خروج', click: () => app.quit() }
  ]);
  tray.setToolTip('Tarjiman Desktop');
  tray.setContextMenu(menu);
}

function toggleShow() {
  if (!overlayWin) return;
  if (overlayWin.isVisible()) overlayWin.hide(); else overlayWin.show();
}

function toggleClickThrough() {
  if (!overlayWin) return;
  clickThrough = !clickThrough;
  overlayWin.setIgnoreMouseEvents(clickThrough, { forward: true });
  overlayWin.webContents.send('click-through-changed', clickThrough);
}

app.whenReady().then(() => {
  createOverlay();
  createTray();

  globalShortcut.register('Control+Alt+T', toggleShow);
  globalShortcut.register('Control+Alt+C', toggleClickThrough);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createOverlay();
  });
});

app.on('window-all-closed', () => {
  // Keep running via tray even if window closed, unless explicitly quit
  if (process.platform !== 'darwin') {
    // do nothing, stay alive in tray
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Renderer asks main for a screen source id so it can capture system audio
// via getUserMedia({ audio: { mandatory: { chromeMediaSource: 'desktop' } } })
ipcMain.handle('get-desktop-source', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  return sources && sources.length ? sources[0].id : null;
});

ipcMain.on('set-ignore-mouse-events', (evt, ignore, opts) => {
  if (overlayWin) overlayWin.setIgnoreMouseEvents(ignore, opts || {});
});
