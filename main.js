const { app, BrowserWindow, ipcMain, desktopCapturer, screen, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
let overlayWin = null;
let controlWin = null;
let tray = null;
let clickThrough = false;
let isQuitting = false;

function getDefaultBounds() {
  const primary = screen.getPrimaryDisplay();
  return {
    x: Math.round(primary.bounds.x + primary.bounds.width / 2 - 300),
    y: Math.round(primary.bounds.y + primary.bounds.height - 160),
    width: 600,
    height: 90
  };
}

// A saved position is only trusted if it actually falls within the visible
// area of one of the CURRENTLY connected displays. This prevents the overlay
// from opening off-screen (e.g. after unplugging a second monitor, or after
// a corrupted save) with no way for the user to find it again.
function boundsAreOnScreen(bounds) {
  if (!bounds || typeof bounds.x !== 'number' || typeof bounds.y !== 'number') return false;
  const displays = screen.getAllDisplays();
  const margin = 20; // require a visible sliver, not just a 1px corner
  return displays.some((d) => {
    const b = d.bounds;
    return (
      bounds.x + margin < b.x + b.width &&
      bounds.x + (bounds.width || 0) - margin > b.x &&
      bounds.y + margin < b.y + b.height &&
      bounds.y + (bounds.height || 0) - margin > b.y
    );
  });
}

function createOverlay() {
  const saved = store.get('winBounds');
  const defaultBounds = getDefaultBounds();
  const safeBounds = boundsAreOnScreen(saved) ? saved : defaultBounds;

  overlayWin = new BrowserWindow({
    ...safeBounds,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    skipTaskbar: true,
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

function createControlWindow() {
  if (controlWin) { controlWin.show(); controlWin.focus(); return; }

  controlWin = new BrowserWindow({
    width: 460,
    height: 320,
    resizable: true,
    icon: path.join(__dirname, 'icon.ico'),
    title: 'Tarjiman Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  controlWin.setMenuBarVisibility(false);
  controlWin.loadFile('control.html');

  controlWin.on('close', (evt) => {
    if (!isQuitting) {
      evt.preventDefault();
      controlWin.hide();
    }
  });

  controlWin.on('closed', () => { controlWin = null; });
}

function saveBounds() {
  if (overlayWin) store.set('winBounds', overlayWin.getBounds());
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon.isEmpty() ? path.join(__dirname, 'icon.ico') : icon);
  const menu = Menu.buildFromTemplate([
    { label: 'فتح لوحة التحكم', click: createControlWindow },
    { label: 'إظهار/إخفاء الترجمة (Ctrl+Alt+T)', click: toggleShow },
    { label: 'تجاوز النقر (Ctrl+Alt+C)', click: toggleClickThrough },
    { type: 'separator' },
    { label: 'خروج', click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip('Tarjiman Desktop');
  tray.setContextMenu(menu);
  tray.on('click', createControlWindow);
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
  if (controlWin) controlWin.webContents.send('click-through-changed', clickThrough);
}

app.whenReady().then(() => {
  createOverlay();
  createControlWindow();
  createTray();

  globalShortcut.register('Control+Alt+T', toggleShow);
  globalShortcut.register('Control+Alt+C', toggleClickThrough);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createOverlay();
    createControlWindow();
  });
});

app.on('window-all-closed', () => {
  // Keep running via tray even if windows closed, unless explicitly quitting
  if (process.platform !== 'darwin') {
    // do nothing, stay alive in tray
  }
});

app.on('before-quit', () => { isQuitting = true; });

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

// Control window sends commands (start/stop/set-lang/toggle-click-through)
ipcMain.on('control-action', (evt, msg) => {
  if (!msg) return;
  if (msg.action === 'toggle-click-through') {
    toggleClickThrough();
    return;
  }
  if (overlayWin) overlayWin.webContents.send('overlay-command', msg);
});

// Overlay window reports listening status back to the control window
ipcMain.on('overlay-status', (evt, status) => {
  if (controlWin) controlWin.webContents.send('control-status-update', status);
});
