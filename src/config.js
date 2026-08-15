'use strict';

const fs = require('fs');
const path = require('path');

const defaults = (url) => ({
  serverUrl: url,
  startupSound: true,
  hardwareAcceleration: true,
  openStudioOnLaunch: false,
  shareMicrophone: true,
  shareStreamAudio: false,
  monitorVolume: 25,
  desktopScale: 86,
  theme: 'dark'
});

function normalizeSettings(value, defaultUrl) {
  const input = value && typeof value === 'object' ? value : {};
  const normalized = { ...defaults(defaultUrl), ...input };

  // Migrate older Kiyvo Desktop preference names.
  if (typeof input.shareMicrophone !== 'boolean' && typeof input.defaultMicrophone === 'boolean') {
    normalized.shareMicrophone = input.defaultMicrophone;
  }
  if (typeof input.shareStreamAudio !== 'boolean' && typeof input.defaultSystemAudio === 'boolean') {
    normalized.shareStreamAudio = input.defaultSystemAudio;
  }

  normalized.desktopScale = Math.max(70, Math.min(100, Number(normalized.desktopScale || 86)));
  return normalized;
}

function createSettingsStore(app, defaultUrl) {
  const filePath = () => path.join(app.getPath('userData'), 'settings.json');
  return {
    path: filePath,
    read() {
      try {
        return normalizeSettings(JSON.parse(fs.readFileSync(filePath(), 'utf8')), defaultUrl);
      } catch {
        return defaults(defaultUrl);
      }
    },
    write(settings) {
      fs.mkdirSync(path.dirname(filePath()), { recursive: true });
      const normalized = normalizeSettings(settings, defaultUrl);
      fs.writeFileSync(filePath(), JSON.stringify(normalized, null, 2));
      return normalized;
    }
  };
}

function isSameServer(target, serverUrl) {
  try {
    return new URL(target).origin === new URL(serverUrl).origin;
  } catch {
    return false;
  }
}

module.exports = { createSettingsStore, isSameServer };
