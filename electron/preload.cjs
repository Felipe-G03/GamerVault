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
  // Game Hub API
  selectDirectory: () => ipcRenderer.invoke('hub:select-directory'),
  selectFile: (options) => ipcRenderer.invoke('hub:select-file', options),
  readImageData: (filePath) => ipcRenderer.invoke('hub:read-image-data', filePath),
  scanPlatform: (params) => ipcRenderer.invoke('hub:scan-platform', params),
  launchGame: (params) => ipcRenderer.invoke('hub:launch-game', params),
  // Settings & System Lifecycle API
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  onAppStandby: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:standby', handler);
    return () => ipcRenderer.removeListener('app:standby', handler);
  },
  onAppResume: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:resume', handler);
    return () => ipcRenderer.removeListener('app:resume', handler);
  },
  onOpenSettingsModal: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('open-settings-modal', handler);
    return () => ipcRenderer.removeListener('open-settings-modal', handler);
  },
  onShortcutOpen: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:shortcut-open', handler);
    return () => ipcRenderer.removeListener('app:shortcut-open', handler);
  },
  // VaultCast API & Deep Linking
  getVaultCastSources: () => ipcRenderer.invoke('vaultcast:get-sources'),
  startProcessAudio: (params) => ipcRenderer.invoke('vaultcast:start-process-audio', typeof params === 'object' ? params : { pid: params }),
  stopProcessAudio: () => ipcRenderer.invoke('vaultcast:stop-process-audio'),
  onProcessAudioChunk: (callback) => {
    const handler = (_event, chunk) => callback(chunk);
    ipcRenderer.on('vaultcast:process-audio-chunk', handler);
    return () => ipcRenderer.removeListener('vaultcast:process-audio-chunk', handler);
  },
  onDeepLinkReceived: (callback) => {
    const handler = (_event, url) => callback(url);
    ipcRenderer.on('deep-link:received', handler);
    return () => ipcRenderer.removeListener('deep-link:received', handler);
  },
  generateLiveKitToken: (params) => ipcRenderer.invoke('livekit:generate-token', params),
  deleteLiveKitRoom: (params) => ipcRenderer.invoke('livekit:delete-room', params),
  sendBroadcastState: (state) => ipcRenderer.send('vaultcast:broadcast-state', state),
  onBroadcastState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('vaultcast:broadcast-state', handler);
    return () => ipcRenderer.removeListener('vaultcast:broadcast-state', handler);
  },
  onForceStopBroadcast: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('vaultcast:force-stop', handler);
    return () => ipcRenderer.removeListener('vaultcast:force-stop', handler);
  },
  onTriggerStartLive: (callback) => {
    const handler = (_event, game) => callback(game);
    ipcRenderer.on('vaultcast:trigger-start-live', handler);
    return () => ipcRenderer.removeListener('vaultcast:trigger-start-live', handler);
  },
  // In-Game Overlay IPC
  requestStartLive: (game) => ipcRenderer.send('overlay:request-start-live', game),
  requestStopLive: () => ipcRenderer.send('overlay:request-stop-live'),
  getActiveGame: () => ipcRenderer.invoke('overlay:get-active-game'),
  onActiveGameChanged: (callback) => {
    const handler = (_event, game) => callback(game);
    ipcRenderer.on('overlay:active-game-changed', handler);
    return () => ipcRenderer.removeListener('overlay:active-game-changed', handler);
  },
  getGameNotes: (gameKey) => ipcRenderer.invoke('overlay:get-game-notes', gameKey),
  saveGameNotes: (params) => ipcRenderer.invoke('overlay:save-game-notes', params),
  setOverlayExpanded: (isExpanded) => ipcRenderer.send('overlay:set-expanded', isExpanded),
  hideOverlay: () => ipcRenderer.send('overlay:hide'),
  // Controle de janelas filhas popout
  setWindowSize: (width, height) => ipcRenderer.send('window-set-size', { width, height }),
  setAlwaysOnTop: (flag) => ipcRenderer.send('window-set-always-on-top', flag),
  focusMainWindow: () => ipcRenderer.send('window-focus-main'),
  closeCurrentWindow: () => ipcRenderer.send('window-close-current'),
  isElectron: true
});
