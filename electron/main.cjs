const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

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
    icon: fs.existsSync(path.join(__dirname, '../public/icon.ico'))
      ? path.join(__dirname, '../public/icon.ico')
      : fs.existsSync(path.join(__dirname, '../public/icon.png'))
      ? path.join(__dirname, '../public/icon.png')
      : path.join(__dirname, '../public/gamepad.svg')
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

  // Handler para download e execução do instalador da nova versão
  ipcMain.on('start-download-update', async (_event, downloadUrl) => {
    if (!downloadUrl) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-error', 'URL de download não informada.');
      }
      return;
    }

    try {
      const tempDir = app.getPath('temp');
      const updateFilePath = path.join(tempDir, 'GamerVault-Update-Setup.exe');

      const res = await fetch(downloadUrl);
      if (!res.ok) {
        throw new Error(`Servidor retornou HTTP ${res.status}: ${res.statusText}`);
      }

      const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
      let downloadedBytes = 0;

      const fileStream = fs.createWriteStream(updateFilePath);
      const reader = res.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fileStream.write(Buffer.from(value));
        downloadedBytes += value.length;

        const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-download-progress', {
            percent,
            downloadedBytes,
            totalBytes
          });
        }
      }

      fileStream.end();

      fileStream.on('finish', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-download-ready', { filePath: updateFilePath });
        }

        // Aguarda 1.5s para o usuário visualizar o feedback de sucesso antes de iniciar o instalador
        setTimeout(() => {
          try {
            const installer = spawn(updateFilePath, [], {
              detached: true,
              stdio: 'ignore'
            });
            installer.unref();

            // Encerra o GamerVault para liberar arquivos e permitir a instalação limpa
            app.quit();
          } catch (execErr) {
            console.error('Erro ao executar instalador:', execErr);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('update-download-error', 'Falha ao iniciar o instalador: ' + execErr.message);
            }
          }
        }, 1500);
      });

      fileStream.on('error', (fsErr) => {
        console.error('Erro ao gravar arquivo temporário:', fsErr);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-download-error', fsErr.message);
        }
      });

    } catch (err) {
      console.error('Erro no fluxo de download da atualização:', err);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-error', err.message);
      }
    }
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
