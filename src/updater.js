'use strict';

let autoUpdater = null;
let mainWindowGetter = () => null;
let sendUiEvent = () => {};
let initialized = false;

function safeVersion(info) {
  return info?.version || info?.updateInfo?.version || '';
}

function emit(type, payload = {}) {
  sendUiEvent(type, payload);
}

function initializeUpdater({ app, getMainWindow, emitUiEvent }) {
  mainWindowGetter = getMainWindow || mainWindowGetter;
  sendUiEvent = emitUiEvent || sendUiEvent;

  if (!app.isPackaged) {
    emit('update-state', {
      status: 'development',
      version: app.getVersion(),
      title: 'Updater available in installed builds',
      message: 'Kiyvo auto-update activates after you build and install the NSIS release.'
    });
    return false;
  }

  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (error) {
    console.error('[Kiyvo Updater] electron-updater is not installed:', error);
    emit('update-state', {
      status: 'error',
      title: 'Updater unavailable',
      message: 'The updater component could not be loaded.'
    });
    return false;
  }

  if (initialized) return true;
  initialized = true;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => emit('update-state', {
    status: 'checking',
    title: 'Checking for updates…',
    message: 'Kiyvo is checking GitHub Releases for a newer version.'
  }));

  autoUpdater.on('update-available', (info) => emit('update-state', {
    status: 'available',
    version: safeVersion(info),
    title: `Kiyvo ${safeVersion(info)} is available`,
    message: 'A new Kiyvo Desktop update is ready to download.'
  }));

  autoUpdater.on('update-not-available', (info) => emit('update-state', {
    status: 'current',
    version: safeVersion(info),
    title: 'Kiyvo is up to date',
    message: `You are running the latest Kiyvo Desktop release (${app.getVersion()}).`
  }));

  autoUpdater.on('download-progress', (progress) => emit('update-state', {
    status: 'downloading',
    percent: Math.max(0, Math.min(100, Math.round(progress.percent || 0))),
    transferred: progress.transferred || 0,
    total: progress.total || 0,
    bytesPerSecond: progress.bytesPerSecond || 0,
    title: 'Downloading Kiyvo update…',
    message: `${Math.round(progress.percent || 0)}% complete`
  }));

  autoUpdater.on('update-downloaded', (info) => emit('update-state', {
    status: 'ready',
    version: safeVersion(info),
    title: 'Update ready',
    message: `Kiyvo ${safeVersion(info)} has downloaded. Restart Kiyvo to install it.`
  }));

  autoUpdater.on('error', (error) => {
    console.error('[Kiyvo Updater]', error);
    emit('update-state', {
      status: 'error',
      title: 'Update check failed',
      message: error?.message || 'Kiyvo could not reach the update service.'
    });
  });

  return true;
}

async function checkForUpdates(app) {
  if (!app.isPackaged) {
    return {
      status: 'development',
      version: app.getVersion(),
      title: 'Updater available in installed builds',
      message: 'Build and install Kiyvo first. npm start runs Electron in development mode and cannot install production updates.'
    };
  }
  if (!autoUpdater) throw new Error('Updater has not been initialized.');
  const result = await autoUpdater.checkForUpdates();
  return {
    status: result?.updateInfo?.version && result.updateInfo.version !== app.getVersion() ? 'available' : 'current',
    version: result?.updateInfo?.version || app.getVersion()
  };
}

async function downloadUpdate() {
  if (!autoUpdater) throw new Error('Updater has not been initialized.');
  await autoUpdater.downloadUpdate();
  return { ok: true };
}

function installUpdate() {
  if (!autoUpdater) return false;
  const win = mainWindowGetter();
  if (win && !win.isDestroyed()) win.hide();
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return true;
}

module.exports = { initializeUpdater, checkForUpdates, downloadUpdate, installUpdate };
