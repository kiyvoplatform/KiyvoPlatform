'use strict';

const { BrowserWindow, desktopCapturer, ipcMain, session, screen } = require('electron');
const path = require('path');

let pickerWindow = null;
let pickerResolver = null;
let pickerSources = [];
let ipcInstalled = false;

function closePicker(result = null) {
  const resolve = pickerResolver;
  pickerResolver = null;
  pickerSources = [];
  if (pickerWindow && !pickerWindow.isDestroyed()) pickerWindow.close();
  pickerWindow = null;
  if (resolve) resolve(result);
}

function installPickerIpc() {
  if (ipcInstalled) return;
  ipcInstalled = true;
  ipcMain.handle('kiyvo:share-picker-select', (_event, id) => {
    const selected = pickerSources.find((source) => source.id === id) || null;
    closePicker(selected);
    return Boolean(selected);
  });
  ipcMain.handle('kiyvo:share-picker-cancel', () => {
    closePicker(null);
    return true;
  });
}

async function chooseDesktopSource(mainWindow, sources) {
  if (!sources.length) return null;
  if (pickerResolver) closePicker(null);
  installPickerIpc();

  pickerSources = sources;
  const display = mainWindow && !mainWindow.isDestroyed()
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getPrimaryDisplay();
  const work = display.workAreaSize;
  const width = Math.max(860, Math.min(work.width - 48, 1480));
  const height = Math.max(640, Math.min(work.height - 48, 940));

  pickerWindow = new BrowserWindow({
    width,
    height,
    minWidth: 760,
    minHeight: 560,
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
    modal: Boolean(mainWindow && !mainWindow.isDestroyed()),
    show: false,
    frame: false,
    backgroundColor: '#090a0f',
    title: 'Kiyvo Screen Share',
    icon: path.join(__dirname, '..', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'share-picker-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const result = new Promise((resolve) => { pickerResolver = resolve; });
  pickerWindow.on('closed', () => {
    if (pickerResolver) {
      const resolve = pickerResolver;
      pickerResolver = null;
      pickerSources = [];
      pickerWindow = null;
      resolve(null);
    }
  });
  pickerWindow.webContents.once('did-finish-load', () => {
    if (!pickerWindow || pickerWindow.isDestroyed()) return;
    pickerWindow.webContents.send('kiyvo:share-picker-sources', sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail?.toDataURL?.() || '',
      appIcon: source.appIcon?.toDataURL?.() || ''
    })));
    pickerWindow.show();
    pickerWindow.focus();
  });
  await pickerWindow.loadFile(path.join(__dirname, 'share-picker.html'));
  return result;
}

function canUseMediaPermission(permission) {
  return new Set(['media','display-capture','fullscreen','notifications','mediaKeySystem','pointerLock']).has(permission);
}

function installPermissions(getMainWindow, partition = 'persist:kiyvo') {
  const currentSession = session.fromPartition(partition);

  currentSession.setPermissionRequestHandler((_contents, permission, callback) => callback(canUseMediaPermission(permission)));
  currentSession.setPermissionCheckHandler((_contents, permission) => canUseMediaPermission(permission));

  if (typeof currentSession.setDevicePermissionHandler === 'function') {
    currentSession.setDevicePermissionHandler((details) => details.deviceType === 'media' || details.deviceType === 'hid');
  }

  if (typeof currentSession.setDisplayMediaRequestHandler === 'function') {
    currentSession.setDisplayMediaRequestHandler(async (request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 960, height: 540 },
          fetchWindowIcons: true
        });
        const selected = await chooseDesktopSource(getMainWindow(), sources);
        if (!selected) return callback({});
        const response = { video: selected };
        if (request.audioRequested) response.audio = 'loopback';
        callback(response);
      } catch (error) {
        console.error('[Kiyvo Desktop] display capture failed:', error);
        callback({});
      }
    }, { useSystemPicker: false });
  }
  return currentSession;
}

module.exports = { installPermissions };
