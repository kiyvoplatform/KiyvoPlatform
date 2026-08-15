'use strict';

const CLIENT_ID = '1538039977424724098';
const DEFAULT_ACTIVITY = {
  details: 'Exploring Kiyvo',
  state: 'Create. Stream. Connect.',
  largeImageKey: 'kiyvo_logo',
  largeImageText: 'Kiyvo',
  instance: false
};

let client = null;
let connected = false;
let enabled = true;
let lastActivity = { ...DEFAULT_ACTIVITY };
let retryTimer = null;
let startedAt = Date.now();

function clean(value, max = 128) {
  return String(value || '').trim().slice(0, max);
}

function toActivity(input = {}) {
  const next = {
    ...DEFAULT_ACTIVITY,
    ...input,
    details: clean(input.details || DEFAULT_ACTIVITY.details),
    state: clean(input.state || DEFAULT_ACTIVITY.state),
    largeImageKey: clean(input.largeImageKey || DEFAULT_ACTIVITY.largeImageKey, 32),
    largeImageText: clean(input.largeImageText || DEFAULT_ACTIVITY.largeImageText),
    instance: false
  };
  if (input.startTimestamp === true) next.startTimestamp = startedAt;
  else if (Number.isFinite(Number(input.startTimestamp))) next.startTimestamp = Number(input.startTimestamp);
  if (Array.isArray(input.buttons)) next.buttons = input.buttons.slice(0, 2).map((button) => ({
    label: clean(button.label, 32),
    url: clean(button.url, 512)
  })).filter((button) => button.label && /^https?:\/\//i.test(button.url));
  return next;
}

async function applyActivity() {
  if (!enabled || !connected || !client) return false;
  try {
    await client.setActivity(lastActivity);
    return true;
  } catch (error) {
    console.warn('[Kiyvo Discord] Could not update Rich Presence:', error?.message || error);
    return false;
  }
}

function scheduleReconnect(settingsStore) {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => connect(settingsStore), 15000);
  retryTimer.unref?.();
}

async function connect(settingsStore) {
  enabled = settingsStore.read().discordRichPresence !== false;
  if (!enabled || connected) return;

  let DiscordRPC;
  try {
    DiscordRPC = require('discord-rpc');
  } catch (error) {
    console.error('[Kiyvo Discord] discord-rpc is not installed:', error?.message || error);
    return;
  }

  try {
    client = new DiscordRPC.Client({ transport: 'ipc' });
    client.on('ready', async () => {
      connected = true;
      console.log('[Kiyvo Discord] Rich Presence connected.');
      await applyActivity();
    });
    client.on('disconnected', () => {
      connected = false;
      client = null;
      scheduleReconnect(settingsStore);
    });
    await client.login({ clientId: CLIENT_ID });
  } catch (error) {
    connected = false;
    client = null;
    console.log('[Kiyvo Discord] Discord is not running or RPC is unavailable.');
    scheduleReconnect(settingsStore);
  }
}

async function setEnabled(value, settingsStore) {
  enabled = Boolean(value);
  if (!enabled) {
    clearTimeout(retryTimer);
    try { await client?.clearActivity?.(); } catch {}
    try { client?.destroy?.(); } catch {}
    connected = false;
    client = null;
    return;
  }
  await connect(settingsStore);
  await applyActivity();
}

async function setActivity(activity = {}) {
  lastActivity = toActivity(activity);
  return applyActivity();
}

async function shutdown() {
  clearTimeout(retryTimer);
  try { await client?.clearActivity?.(); } catch {}
  try { client?.destroy?.(); } catch {}
  connected = false;
  client = null;
}

module.exports = {
  CLIENT_ID,
  connect,
  setEnabled,
  setActivity,
  shutdown
};
