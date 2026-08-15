'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kiyvoDesktop', {
  getEnvironment: () => ipcRenderer.invoke('kiyvo:get-environment'),
  reload: () => ipcRenderer.invoke('kiyvo:reload'),
  back: () => ipcRenderer.invoke('kiyvo:back'),
  forward: () => ipcRenderer.invoke('kiyvo:forward'),
  minimize: () => ipcRenderer.invoke('kiyvo:minimize'),
  maximize: () => ipcRenderer.invoke('kiyvo:maximize'),
  close: () => ipcRenderer.invoke('kiyvo:close'),
  getNavigationState: () => ipcRenderer.invoke('kiyvo:navigation-state'),
  checkUpdates: () => ipcRenderer.invoke('kiyvo:check-updates'),
  openHelp: () => ipcRenderer.invoke('kiyvo:open-help'),
  openExternal: (url) => ipcRenderer.invoke('kiyvo:open-external', url),
  readSettings: () => ipcRenderer.invoke('kiyvo:settings-read'),
  saveSettings: (value) => ipcRenderer.invoke('kiyvo:settings-save', value),
  resetSettings: () => ipcRenderer.invoke('kiyvo:settings-reset'),
  onUiEvent: (handler) => {
    const wrapped = (_event, payload) => handler(payload);
    ipcRenderer.on('kiyvo:ui-event', wrapped);
    return () => ipcRenderer.removeListener('kiyvo:ui-event', wrapped);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/assets/css/desktop-titlebar.css?v=387';
  document.head.appendChild(css);

  const script = document.createElement('script');
  script.src = '/assets/js/desktop-titlebar.js?v=387';
  document.body.appendChild(script);
});
