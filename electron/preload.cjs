const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  startUpdateDownload: (url) => ipcRenderer.send('start-download-update', url),
  onUpdateProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },
  onUpdateError: (callback) => {
    const handler = (_event, err) => callback(err);
    ipcRenderer.on('update-download-error', handler);
    return () => ipcRenderer.removeListener('update-download-error', handler);
  },
  onUpdateReady: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-download-ready', handler);
    return () => ipcRenderer.removeListener('update-download-ready', handler);
  },
  isElectron: true
});
