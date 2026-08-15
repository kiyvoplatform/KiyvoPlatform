'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kiyvoSharePicker', {
  onSources(handler) {
    const wrapped = (_event, sources) => handler(Array.isArray(sources) ? sources : []);
    ipcRenderer.on('kiyvo:share-picker-sources', wrapped);
    return () => ipcRenderer.removeListener('kiyvo:share-picker-sources', wrapped);
  },
  select(id) {
    return ipcRenderer.invoke('kiyvo:share-picker-select', String(id || ''));
  },
  cancel() {
    return ipcRenderer.invoke('kiyvo:share-picker-cancel');
  }
});
