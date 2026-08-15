'use strict';

(() => {
  if (!window.kiyvoDesktop || document.getElementById('kiyvo-desktop-titlebar')) return;

  const style = document.createElement('style');
  style.textContent = `
    #kd-update-panel{position:fixed;top:42px;right:14px;z-index:2147483647;width:min(360px,calc(100vw - 28px));padding:14px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(16,18,25,.98);box-shadow:0 18px 55px rgba(0,0,0,.48);font:13px/1.45 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#f8f8fb;display:none;-webkit-app-region:no-drag}
    #kd-update-panel.show{display:block}#kd-update-panel h4{margin:0 0 5px;font-size:14px}#kd-update-panel p{margin:0;color:#9da3b4}#kd-update-panel .kd-progress{height:7px;border-radius:999px;background:#242733;overflow:hidden;margin:12px 0 0}#kd-update-panel .kd-progress>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7257ff,#b54dff);transition:width .2s ease}#kd-update-panel .kd-update-actions{display:flex;gap:8px;margin-top:12px;justify-content:flex-end}#kd-update-panel button{border:1px solid #303443;background:#1a1d27;color:#fff;border-radius:8px;padding:8px 11px;font-weight:700;cursor:pointer}#kd-update-panel button.primary{background:#7457ff;border-color:#7457ff}#kd-update-panel button:disabled{opacity:.5;cursor:default}`;
  document.head.appendChild(style);

  const bar = document.createElement('header');
  bar.id = 'kiyvo-desktop-titlebar';
  bar.innerHTML = `
    <div class="kd-nav-controls">
      <button type="button" data-kd="back" title="Back"><span>←</span></button>
      <button type="button" data-kd="forward" title="Forward"><span>→</span></button>
      <button type="button" data-kd="reload" title="Reload"><span>↻</span></button>
    </div>
    <div class="kd-drag-region">
      <img src="/assets/img/kiyvo-mark.png" alt="">
      <strong>Kiyvo</strong>
      <span id="kd-page-title"></span>
    </div>
    <div class="kd-app-controls">
      <button type="button" data-kd="updates" title="Check for updates"><span>⇩</span><i id="kd-update-dot"></i></button>
      <button type="button" data-kd="help" title="Help"><span>?</span></button>
      <button type="button" data-kd="settings" title="Desktop settings"><span>⚙</span></button>
      <button type="button" data-kd="minimize" title="Minimize"><span>—</span></button>
      <button type="button" data-kd="maximize" title="Maximize"><span>□</span></button>
      <button type="button" data-kd="close" class="kd-close" title="Close"><span>×</span></button>
    </div>`;

  const panel = document.createElement('aside');
  panel.id = 'kd-update-panel';
  panel.innerHTML = `<h4 id="kd-update-title">Kiyvo updates</h4><p id="kd-update-message">Checking for updates…</p><div class="kd-progress" hidden><i id="kd-update-progress"></i></div><div class="kd-update-actions"><button id="kd-update-dismiss">Close</button><button class="primary" id="kd-update-action" hidden>Download</button></div>`;

  document.documentElement.classList.add('kiyvo-desktop');
  document.body.prepend(bar);
  document.body.appendChild(panel);

  const pageLogo = document.querySelector('.brand-logo,.brand img,.studio-v3-brand img,.admin-brand img');
  if (pageLogo?.src) bar.querySelector('.kd-drag-region img').src = pageLogo.src;

  const titleNode = document.getElementById('kd-page-title');
  const updateTitle = document.getElementById('kd-update-title');
  const updateMessage = document.getElementById('kd-update-message');
  const updateAction = document.getElementById('kd-update-action');
  const progressWrap = panel.querySelector('.kd-progress');
  const progressBar = document.getElementById('kd-update-progress');
  let currentUpdateState = 'idle';

  function syncPageTitle() {
    const clean = (document.title || '').replace(/\s*[—|-]\s*Kiyvo.*$/i, '').trim();
    titleNode.textContent = clean && clean.toLowerCase() !== 'kiyvo' ? `— ${clean}` : '';
  }
  syncPageTitle();

  function showUpdate(payload = {}) {
    currentUpdateState = payload.status || currentUpdateState;
    updateTitle.textContent = payload.title || 'Kiyvo updates';
    updateMessage.textContent = payload.message || '';
    panel.classList.add('show');
    const percent = Number(payload.percent || 0);
    progressWrap.hidden = currentUpdateState !== 'downloading';
    progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    updateAction.hidden = !['available', 'ready'].includes(currentUpdateState);
    updateAction.disabled = false;
    updateAction.textContent = currentUpdateState === 'ready' ? 'Restart & update' : 'Download update';
    document.getElementById('kd-update-dot')?.classList.toggle('active', ['available','ready'].includes(currentUpdateState));
  }

  function inferActivity() {
    const path = location.pathname.toLowerCase();
    const text = `${document.title} ${document.body?.innerText?.slice(0, 3000) || ''}`.toLowerCase();
    let details = 'Browsing Kiyvo';
    let state = 'Create. Stream. Connect.';
    let largeImageKey = 'kiyvo_logo';
    let startTimestamp = false;

    if (path.includes('/studio') || text.includes('creator studio')) {
      details = text.includes('live control room') ? 'Preparing a livestream' : 'In Creator Studio';
      state = 'Creating on Kiyvo';
      largeImageKey = text.includes('live') ? 'kiyvo_live' : 'kiyvo_logo';
    } else if (path.includes('/live') || path.includes('/watch') || text.includes('watching live')) {
      details = 'Watching a livestream';
      state = 'Live on Kiyvo';
      largeImageKey = 'kiyvo_live';
      startTimestamp = true;
    } else if (path.includes('/videos') || path.includes('/video')) {
      details = 'Browsing videos';
      state = 'Watching Kiyvo';
      largeImageKey = 'kiyvo_video';
    } else if (path.includes('/communities') || path.includes('/community')) {
      details = 'Exploring communities';
      state = 'Connecting on Kiyvo';
      largeImageKey = 'kiyvo_community';
    } else if (path.includes('/messages')) {
      details = 'Viewing messages';
      state = 'Chatting on Kiyvo';
    } else if (path.includes('/settings')) {
      details = 'Adjusting settings';
      state = 'Kiyvo Desktop';
    } else if (path === '/' || path.includes('/home')) {
      details = 'Browsing Home';
      state = 'Discovering Kiyvo';
    }

    window.kiyvoDesktop.setDiscordActivity?.({
      details,
      state,
      largeImageKey,
      largeImageText: 'Kiyvo',
      startTimestamp,
      buttons: [{ label: 'Open Kiyvo', url: location.origin }]
    }).catch?.(() => {});
  }

  const invoke = (name) => window.kiyvoDesktop[name]?.();
  bar.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-kd]');
    if (!button) return;
    const action = button.dataset.kd;
    if (action === 'back') invoke('back');
    else if (action === 'forward') invoke('forward');
    else if (action === 'reload') invoke('reload');
    else if (action === 'updates') {
      showUpdate({ status: 'checking', title: 'Checking for updates…', message: 'Contacting Kiyvo releases.' });
      try {
        const result = await window.kiyvoDesktop.checkUpdates();
        if (result?.status === 'development') showUpdate(result);
      } catch (error) {
        showUpdate({ status: 'error', title: 'Update check failed', message: error?.message || 'Could not check for updates.' });
      }
    }
    else if (action === 'help') invoke('openHelp');
    else if (action === 'settings') invoke('openSettings');
    else if (action === 'minimize') invoke('minimize');
    else if (action === 'maximize') invoke('maximize');
    else if (action === 'close') invoke('close');
  });

  document.getElementById('kd-update-dismiss').onclick = () => panel.classList.remove('show');
  updateAction.onclick = async () => {
    updateAction.disabled = true;
    try {
      if (currentUpdateState === 'ready') await window.kiyvoDesktop.installUpdate();
      else await window.kiyvoDesktop.downloadUpdate();
    } catch (error) {
      showUpdate({ status: 'error', title: 'Update failed', message: error?.message || 'Kiyvo could not complete the update.' });
    }
  };

  window.kiyvoDesktop.onUiEvent?.((payload) => {
    if (!payload) return;
    if (payload.type === 'update-state') showUpdate(payload);
    if (payload.type === 'window-state') {
      const max = bar.querySelector('[data-kd="maximize"] span');
      if (max) max.textContent = payload.maximized ? '❐' : '□';
    }
  });

  window.kiyvoDesktop.getNavigationState?.().then((state) => {
    bar.querySelector('[data-kd="back"]').disabled = !state.canGoBack;
    bar.querySelector('[data-kd="forward"]').disabled = !state.canGoForward;
  });

  let lastLocation = location.href;
  let rpcTimer = null;
  const resync = () => {
    clearTimeout(rpcTimer);
    rpcTimer = setTimeout(() => { syncPageTitle(); inferActivity(); }, 350);
  };
  inferActivity();
  const observer = new MutationObserver(() => {
    if (location.href !== lastLocation) {
      lastLocation = location.href;
      resync();
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });
  setInterval(() => {
    if (location.href !== lastLocation) {
      lastLocation = location.href;
      resync();
    }
  }, 1500);
})();
