'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const desktopApi = {
  getEnvironment: () => ipcRenderer.invoke('kiyvo:get-environment'),
  reload: () => ipcRenderer.invoke('kiyvo:reload'),
  back: () => ipcRenderer.invoke('kiyvo:back'),
  forward: () => ipcRenderer.invoke('kiyvo:forward'),
  minimize: () => ipcRenderer.invoke('kiyvo:minimize'),
  maximize: () => ipcRenderer.invoke('kiyvo:maximize'),
  close: () => ipcRenderer.invoke('kiyvo:close'),
  getNavigationState: () => ipcRenderer.invoke('kiyvo:navigation-state'),
  checkUpdates: () => ipcRenderer.invoke('kiyvo:check-updates'),
  downloadUpdate: () => ipcRenderer.invoke('kiyvo:download-update'),
  installUpdate: () => ipcRenderer.invoke('kiyvo:install-update'),
  openHelp: () => ipcRenderer.invoke('kiyvo:open-help'),
  openSettings: () => ipcRenderer.invoke('kiyvo:open-settings'),
  openExternal: (url) => ipcRenderer.invoke('kiyvo:open-external', url),
  readSettings: () => ipcRenderer.invoke('kiyvo:settings-read'),
  saveSettings: (value) => ipcRenderer.invoke('kiyvo:settings-save', value),
  resetSettings: () => ipcRenderer.invoke('kiyvo:settings-reset'),
  setDiscordActivity: (activity) => ipcRenderer.invoke('kiyvo:discord-activity', activity),
  setDiscordRichPresenceEnabled: (enabled) => ipcRenderer.invoke('kiyvo:discord-enabled', Boolean(enabled)),
  onUiEvent: (handler) => {
    const wrapped = (_event, payload) => handler(payload);
    ipcRenderer.on('kiyvo:ui-event', wrapped);
    return () => ipcRenderer.removeListener('kiyvo:ui-event', wrapped);
  }
};

contextBridge.exposeInMainWorld('kiyvoDesktop', desktopApi);

function inferDiscordActivity() {
  const pathname = location.pathname.toLowerCase();
  const text = `${document.title} ${document.body?.innerText?.slice(0, 3000) || ''}`.toLowerCase();
  let details = 'Browsing Kiyvo';
  let state = 'Create. Stream. Connect.';
  let largeImageKey = 'kiyvo_logo';
  let startTimestamp = false;

  if (pathname.includes('/studio') || text.includes('creator studio')) {
    details = text.includes('live control room') ? 'Preparing a livestream' : 'In Creator Studio';
    state = 'Creating on Kiyvo';
    largeImageKey = text.includes('live') ? 'kiyvo_live' : 'kiyvo_logo';
  } else if (pathname.includes('/live') || pathname.includes('/watch')) {
    details = 'Watching a livestream';
    state = 'Live on Kiyvo';
    largeImageKey = 'kiyvo_live';
    startTimestamp = true;
  } else if (pathname.includes('/videos') || pathname.includes('/video')) {
    details = 'Browsing videos';
    state = 'Watching Kiyvo';
    largeImageKey = 'kiyvo_video';
  } else if (pathname.includes('/communities') || pathname.includes('/community')) {
    details = 'Exploring communities';
    state = 'Connecting on Kiyvo';
    largeImageKey = 'kiyvo_community';
  } else if (pathname.includes('/messages')) {
    details = 'Viewing messages';
    state = 'Chatting on Kiyvo';
  } else if (pathname.includes('/settings')) {
    details = 'Adjusting settings';
    state = 'Kiyvo Desktop';
  } else if (pathname === '/' || pathname.includes('/home')) {
    details = 'Browsing Home';
    state = 'Discovering Kiyvo';
  }

  ipcRenderer.invoke('kiyvo:discord-activity', {
    details,
    state,
    largeImageKey,
    largeImageText: 'Kiyvo',
    startTimestamp,
    buttons: [{ label: 'Open Kiyvo', url: location.origin }]
  }).catch(() => {});
}

function installDesktopChrome() {
  if (document.getElementById('kiyvo-desktop-titlebar')) return;

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/assets/css/desktop-titlebar.css?v=402';
  document.head.appendChild(css);

  const fallback = document.createElement('style');
  fallback.textContent = `
    #kiyvo-desktop-titlebar{position:fixed;z-index:2147483646;top:0;left:0;right:0;height:32px;display:flex;align-items:center;background:#181a20;border-bottom:1px solid #292c34;color:#d8dbe4;font:12px Inter,system-ui,-apple-system,"Segoe UI",sans-serif}#kiyvo-desktop-titlebar button{height:32px;min-width:38px;border:0;background:transparent;color:#a8adba;cursor:pointer;-webkit-app-region:no-drag}#kiyvo-desktop-titlebar button:hover{background:#252831;color:#fff}#kiyvo-desktop-titlebar .kd-close:hover{background:#c42b3a}.kd-nav-controls,.kd-app-controls{display:flex;height:32px}.kd-drag-region{flex:1;height:32px;display:flex;align-items:center;justify-content:center;gap:7px;-webkit-app-region:drag;white-space:nowrap;overflow:hidden}.kd-drag-region img{width:16px;height:16px;object-fit:contain}.kd-drag-region strong{font-size:11px;color:#fff}.kd-drag-region span{color:#8e94a3;overflow:hidden;text-overflow:ellipsis}.kiyvo-desktop body{padding-top:32px!important}#kd-update-panel{position:fixed;top:42px;right:14px;z-index:2147483647;width:min(360px,calc(100vw - 28px));padding:14px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(16,18,25,.98);box-shadow:0 18px 55px rgba(0,0,0,.48);font:13px/1.45 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#f8f8fb;display:none;-webkit-app-region:no-drag}#kd-update-panel.show{display:block}#kd-update-panel h4{margin:0 0 5px;font-size:14px}#kd-update-panel p{margin:0;color:#9da3b4}#kd-update-panel .kd-progress{height:7px;border-radius:999px;background:#242733;overflow:hidden;margin:12px 0 0}#kd-update-panel .kd-progress>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7257ff,#b54dff);transition:width .2s ease}#kd-update-panel .kd-update-actions{display:flex;gap:8px;margin-top:12px;justify-content:flex-end}#kd-update-panel .kd-update-actions button{border:1px solid #303443;background:#1a1d27;color:#fff;border-radius:8px;padding:8px 11px;font-weight:700;cursor:pointer}#kd-update-panel .kd-update-actions button.primary{background:#7457ff;border-color:#7457ff}`;
  document.head.appendChild(fallback);

  const bar = document.createElement('header');
  bar.id = 'kiyvo-desktop-titlebar';
  bar.innerHTML = `<div class="kd-nav-controls"><button data-kd="back" title="Back">←</button><button data-kd="forward" title="Forward">→</button><button data-kd="reload" title="Reload">↻</button></div><div class="kd-drag-region"><img src="/assets/img/kiyvo-mark.png" alt=""><strong>Kiyvo</strong><span id="kd-page-title"></span></div><div class="kd-app-controls"><button data-kd="updates" title="Check for updates">⇩<i id="kd-update-dot"></i></button><button data-kd="help" title="Help">?</button><button data-kd="settings" title="Desktop settings">⚙</button><button data-kd="minimize" title="Minimize">—</button><button data-kd="maximize" title="Maximize">□</button><button data-kd="close" class="kd-close" title="Close">×</button></div>`;
  document.documentElement.classList.add('kiyvo-desktop');
  document.body.prepend(bar);

  const panel = document.createElement('aside');
  panel.id = 'kd-update-panel';
  panel.innerHTML = `<h4 id="kd-update-title">Kiyvo updates</h4><p id="kd-update-message">Ready.</p><div class="kd-progress" hidden><i id="kd-update-progress"></i></div><div class="kd-update-actions"><button id="kd-update-dismiss">Close</button><button class="primary" id="kd-update-action" hidden>Download update</button></div>`;
  document.body.appendChild(panel);

  const logo = document.querySelector('.brand-logo,.brand img,.studio-v3-brand img,.admin-brand img');
  if (logo?.src) bar.querySelector('.kd-drag-region img').src = logo.src;

  const pageTitle = document.getElementById('kd-page-title');
  const updateTitle = document.getElementById('kd-update-title');
  const updateMessage = document.getElementById('kd-update-message');
  const updateAction = document.getElementById('kd-update-action');
  const progressWrap = panel.querySelector('.kd-progress');
  const progressBar = document.getElementById('kd-update-progress');
  let updateState = 'idle';

  function syncTitle() {
    const clean = (document.title || '').replace(/\s*[—|-]\s*Kiyvo.*$/i, '').trim();
    pageTitle.textContent = clean && clean.toLowerCase() !== 'kiyvo' ? `— ${clean}` : '';
  }

  function showUpdate(payload = {}) {
    updateState = payload.status || updateState;
    updateTitle.textContent = payload.title || 'Kiyvo updates';
    updateMessage.textContent = payload.message || '';
    panel.classList.add('show');
    progressWrap.hidden = updateState !== 'downloading';
    progressBar.style.width = `${Math.max(0, Math.min(100, Number(payload.percent || 0)))}%`;
    updateAction.hidden = !['available', 'ready'].includes(updateState);
    updateAction.disabled = false;
    updateAction.textContent = updateState === 'ready' ? 'Restart & update' : 'Download update';
  }

  bar.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-kd]');
    if (!button) return;
    const action = button.dataset.kd;
    if (action === 'updates') {
      showUpdate({ status: 'checking', title: 'Checking for updates…', message: 'Contacting Kiyvo releases.' });
      try {
        const result = await ipcRenderer.invoke('kiyvo:check-updates');
        if (result?.status === 'development') showUpdate(result);
      } catch (error) {
        showUpdate({ status: 'error', title: 'Update check failed', message: error?.message || 'Could not check for updates.' });
      }
      return;
    }
    const channel = {
      back: 'kiyvo:back', forward: 'kiyvo:forward', reload: 'kiyvo:reload', help: 'kiyvo:open-help',
      settings: 'kiyvo:open-settings', minimize: 'kiyvo:minimize', maximize: 'kiyvo:maximize', close: 'kiyvo:close'
    }[action];
    if (channel) ipcRenderer.invoke(channel).catch(() => {});
  });

  document.getElementById('kd-update-dismiss').onclick = () => panel.classList.remove('show');
  updateAction.onclick = async () => {
    updateAction.disabled = true;
    try {
      if (updateState === 'ready') await ipcRenderer.invoke('kiyvo:install-update');
      else await ipcRenderer.invoke('kiyvo:download-update');
    } catch (error) {
      showUpdate({ status: 'error', title: 'Update failed', message: error?.message || 'Kiyvo could not complete the update.' });
    }
  };

  ipcRenderer.on('kiyvo:ui-event', (_event, payload) => {
    if (payload?.type === 'update-state') showUpdate(payload);
    if (payload?.type === 'window-state') {
      const max = bar.querySelector('[data-kd="maximize"]');
      if (max) max.textContent = payload.maximized ? '❐' : '□';
    }
  });

  ipcRenderer.invoke('kiyvo:navigation-state').then((state) => {
    bar.querySelector('[data-kd="back"]').disabled = !state.canGoBack;
    bar.querySelector('[data-kd="forward"]').disabled = !state.canGoForward;
  }).catch(() => {});

  syncTitle();
  inferDiscordActivity();
  let lastHref = location.href;
  let timer = null;
  const resync = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { syncTitle(); inferDiscordActivity(); }, 350);
  };
  new MutationObserver(() => {
    if (location.href !== lastHref) { lastHref = location.href; resync(); }
  }).observe(document.documentElement, { subtree: true, childList: true });
  setInterval(() => {
    if (location.href !== lastHref) { lastHref = location.href; resync(); }
  }, 1500);
}

window.addEventListener('DOMContentLoaded', installDesktopChrome);
