'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { createSettingsStore, isSameServer } = require('./config');
const { installPermissions } = require('./permissions');
const { installMenu } = require('./menu');
const updater = require('./updater');
const discord = require('./discord-rpc');

const APP_NAME = 'Kiyvo';
const APP_ID = 'world.royakgames.kiyvo';
const DEFAULT_URL = process.env.KIYVO_URL || 'http://localhost/';

// Make every Electron-facing application label Kiyvo before any windows are created.
app.setName(APP_NAME);
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

const settingsStore = createSettingsStore(app, DEFAULT_URL);
let mainWindow = null;
let splashWindow = null;

function asset(name) {
  return path.join(__dirname, '..', 'assets', name);
}

function currentIcon() {
  return asset(process.platform === 'win32' ? 'icon.ico' : 'icon.png');
}

function getServerUrl() {
  return settingsStore.read().serverUrl;
}

function fitDesktopViewport() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.setZoomFactor(1);
}

function loadPath(route) {
  mainWindow?.loadURL(new URL(route, getServerUrl()).href);
}

function sendUiEvent(type, payload = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('kiyvo:ui-event', { type, ...payload });
}

function createSplash() {
  const settings = settingsStore.read();
  splashWindow = new BrowserWindow({
    width: 520,
    height: 360,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    show: false,
    skipTaskbar: true,
    icon: currentIcon(),
    title: APP_NAME,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'), {
    query: {
      version: app.getVersion(),
      sound: settings.startupSound ? '1' : '0'
    }
  });
  splashWindow.once('ready-to-show', () => splashWindow?.show());
}

function createMainWindow() {
  const settings = settingsStore.read();
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 960,
    minWidth: 1040,
    minHeight: 700,
    show: false,
    backgroundColor: '#08090d',
    icon: currentIcon(),
    title: APP_NAME,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
      partition: 'persist:kiyvo',
      backgroundThrottling: false
    }
  });

  // Do not let a webpage title replace the Kiyvo application identity.
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow?.setTitle(APP_NAME);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSameServer(url, settingsStore.read().serverUrl)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isSameServer(url, settingsStore.read().serverUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    sendUiEvent('error', {
      title: 'Could not open Kiyvo',
      message: errorDescription || 'The Kiyvo server could not be reached.',
      detail: validatedURL,
      action: 'retry'
    });
  });

  mainWindow.webContents.on('did-finish-load', () => {
    fitDesktopViewport();
    sendUiEvent('window-state', { maximized: mainWindow?.isMaximized() || false });
  });
  mainWindow.on('resize', fitDesktopViewport);

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    sendUiEvent('error', {
      title: 'Kiyvo needs to reload',
      message: 'The app page stopped responding.',
      detail: details.reason || 'Renderer process ended.',
      action: 'retry'
    });
  });

  mainWindow.on('maximize', () => sendUiEvent('window-state', { maximized: true }));
  mainWindow.on('unmaximize', () => sendUiEvent('window-state', { maximized: false }));

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      splashWindow?.close();
      splashWindow = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.maximize();
        mainWindow.show();
        mainWindow.focus();
      }
    }, 900);
  });

  const startUrl = settings.openStudioOnLaunch
    ? new URL('/studio', settings.serverUrl).href
    : settings.serverUrl;

  mainWindow.loadURL(startUrl).catch(() => {
    mainWindow.loadFile(path.join(__dirname, 'offline.html'), {
      query: { server: settings.serverUrl }
    });
  });

  if (process.env.KIYVO_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

ipcMain.handle('kiyvo:get-environment', () => ({
  desktop: true,
  appName: APP_NAME,
  platform: process.platform,
  serverUrl: getServerUrl(),
  version: app.getVersion(),
  settings: settingsStore.read(),
  maximized: Boolean(mainWindow?.isMaximized())
}));
ipcMain.handle('kiyvo:reload', () => mainWindow?.reload());
ipcMain.handle('kiyvo:back', () => {
  if (mainWindow?.webContents.canGoBack()) mainWindow.webContents.goBack();
});
ipcMain.handle('kiyvo:forward', () => {
  if (mainWindow?.webContents.canGoForward()) mainWindow.webContents.goForward();
});
ipcMain.handle('kiyvo:minimize', () => mainWindow?.minimize());
ipcMain.handle('kiyvo:maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle('kiyvo:close', () => mainWindow?.close());
ipcMain.handle('kiyvo:navigation-state', () => ({
  canGoBack: Boolean(mainWindow?.webContents.canGoBack()),
  canGoForward: Boolean(mainWindow?.webContents.canGoForward()),
  maximized: Boolean(mainWindow?.isMaximized())
}));

ipcMain.handle('kiyvo:check-updates', () => updater.checkForUpdates(app));
ipcMain.handle('kiyvo:download-update', () => updater.downloadUpdate());
ipcMain.handle('kiyvo:install-update', () => updater.installUpdate());

ipcMain.handle('kiyvo:open-help', async () => ({
  title: 'Kiyvo Desktop help',
  message: 'Navigate, create, watch, and broadcast without leaving Kiyvo.',
  items: [
    'Use Back, Forward, and Reload in the Kiyvo header.',
    'Open Settings from the gear icon.',
    'Open Creator Studio to upload or start a broadcast.',
    'Press Ctrl + K to search Kiyvo.'
  ]
}));
ipcMain.handle('kiyvo:open-settings', () => {
  sendUiEvent('open-settings');
  return true;
});
ipcMain.handle('kiyvo:open-external', (_event, url) => shell.openExternal(String(url)));

ipcMain.handle('kiyvo:settings-read', () => settingsStore.read());
ipcMain.handle('kiyvo:settings-save', async (_event, value) => {
  const before = settingsStore.read();
  const saved = settingsStore.write(value || {});
  if (before.discordRichPresence !== saved.discordRichPresence) {
    await discord.setEnabled(saved.discordRichPresence, settingsStore);
  }
  return { ok: true, settings: saved, restartRequired: before.hardwareAcceleration !== saved.hardwareAcceleration };
});
ipcMain.handle('kiyvo:settings-reset', async () => {
  const saved = settingsStore.write({
    serverUrl: DEFAULT_URL,
    startupSound: true,
    openStudioOnLaunch: false,
    hardwareAcceleration: true,
    shareMicrophone: true,
    shareStreamAudio: false,
    monitorVolume: 25,
    desktopScale: 100,
    theme: 'dark',
    discordRichPresence: true
  });
  await discord.setEnabled(true, settingsStore);
  return { ok: true, settings: saved };
});

ipcMain.handle('kiyvo:discord-activity', (_event, activity) => discord.setActivity(activity || {}));
ipcMain.handle('kiyvo:discord-enabled', (_event, value) => discord.setEnabled(Boolean(value), settingsStore));

app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
if (settingsStore.read().hardwareAcceleration === false) app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  if (process.platform === 'win32') app.setAppUserModelId(APP_ID);
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: `© ${new Date().getFullYear()} Kiyvo`
  });

  installPermissions(() => mainWindow, 'persist:kiyvo');
  installMenu({
    loadPath,
    changeServer: () => sendUiEvent('open-settings'),
    getServerUrl,
    openSettings: () => sendUiEvent('open-settings')
  });
  createSplash();
  createMainWindow();

  updater.initializeUpdater({ app, getMainWindow: () => mainWindow, emitUiEvent: sendUiEvent });
  await discord.connect(settingsStore);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('before-quit', () => discord.shutdown());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
