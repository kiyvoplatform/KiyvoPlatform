'use strict';

(() => {
  if (!window.kiyvoDesktop || document.getElementById('kiyvo-desktop-titlebar')) return;

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
  document.documentElement.classList.add('kiyvo-desktop');
  document.body.prepend(bar);
  const pageLogo=document.querySelector('.brand-logo,.brand img,.studio-v3-brand img,.admin-brand img');
  if(pageLogo?.src) bar.querySelector('.kd-drag-region img').src=pageLogo.src;
  document.getElementById('kd-page-title').textContent = document.title ? `— ${document.title.replace(/\s*[—|-]\s*Kiyvo$/i, '')}` : '';

  const invoke = (name) => window.kiyvoDesktop[name]?.();
  bar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-kd]');
    if (!button) return;
    const action = button.dataset.kd;
    if (action === 'back') invoke('back');
    else if (action === 'forward') invoke('forward');
    else if (action === 'reload') invoke('reload');
    else if (action === 'updates') invoke('checkUpdates');
    else if (action === 'help') invoke('openHelp');
    else if (action === 'settings') invoke('openSettings');
    else if (action === 'minimize') invoke('minimize');
    else if (action === 'maximize') invoke('maximize');
    else if (action === 'close') invoke('close');
  });

  window.kiyvoDesktop.getNavigationState?.().then((state) => {
    bar.querySelector('[data-kd="back"]').disabled = !state.canGoBack;
    bar.querySelector('[data-kd="forward"]').disabled = !state.canGoForward;
  });
})();
