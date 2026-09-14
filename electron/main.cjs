const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');

// Permite reprodução imediata de áudio/vídeo embutido sem bloqueios de gesto
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#07080c',
    frame: false, // Barra customizada de alta fidelidade estilo Gamer/Steam
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Facilita carregar embeds e imagens de capas sem bloqueios CORS estritos no app
    },
    icon: path.join(__dirname, '../public/gamepad.svg')
  });

  // Em modo de desenvolvimento, carrega a URL do Vite
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Janela maximizada / restaurada IPC
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  // Qualquer link externo clicado abre diretamente no navegador do sistema operacional (Chrome, Edge, etc.)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Corrige o Erro 150/153 do YouTube no Electron ao rodar empacotado (file://)
  // Injeta headers de Referer e Origin válidos exigidos pelo YouTube para embeds
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*', '*://*.googlevideo.com/*'] },
    (details, callback) => {
      details.requestHeaders['Origin'] = 'https://www.youtube-nocookie.com';
      details.requestHeaders['Referer'] = 'https://www.youtube-nocookie.com/';
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
