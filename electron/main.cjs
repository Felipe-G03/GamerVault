const { app, BrowserWindow, ipcMain, shell, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Permite reprodução imediata de áudio/vídeo embutido sem bloqueios de gesto
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow;

// ==========================================
// FUNÇÕES AUXILIARES DE SCANNING DO GAME HUB
// ==========================================

function cleanGameTitle(rawName) {
  if (!rawName) return '';
  return rawName
    .replace(/\[.*?\]|\(.*?\)|v\d+(\.\d+)*|build\s*\d+|repack|portable|multi\d+|fitgirl|dodi|elamigos|gog/gi, '')
    .replace(/[._-]/g, ' ')
    .trim();
}

function findPrimaryExe(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return null;
    const blacklist = /unins\w*\.exe|uninstall\.exe|unitycrashhandler.*\.exe|crashreporter.*\.exe|dxwebsetup\.exe|vcredist.*\.exe|setup\.exe|redist.*\.exe|easyanticheat.*\.exe|launcher_helper.*\.exe/i;

    let files = fs.readdirSync(dirPath, { withFileTypes: true });
    let exes = [];

    for (const file of files) {
      if (file.isFile() && file.name.toLowerCase().endsWith('.exe') && !blacklist.test(file.name)) {
        const fullPath = path.join(dirPath, file.name);
        try {
          const stats = fs.statSync(fullPath);
          exes.push({ path: fullPath, name: file.name, size: stats.size });
        } catch (_) {}
      }
    }

    // Se não achou na raiz, busca 1 nível abaixo (ex: bin/, x64/, game/)
    if (exes.length === 0) {
      for (const dir of files) {
        if (dir.isDirectory() && !dir.name.startsWith('.')) {
          const subDirPath = path.join(dirPath, dir.name);
          try {
            const subFiles = fs.readdirSync(subDirPath, { withFileTypes: true });
            for (const subFile of subFiles) {
              if (subFile.isFile() && subFile.name.toLowerCase().endsWith('.exe') && !blacklist.test(subFile.name)) {
                const fullPath = path.join(subDirPath, subFile.name);
                const stats = fs.statSync(fullPath);
                exes.push({ path: fullPath, name: subFile.name, size: stats.size });
              }
            }
          } catch (_) {}
        }
      }
    }

    if (exes.length === 0) return null;
    // O maior executável normalmente é o binário principal do jogo
    exes.sort((a, b) => b.size - a.size);
    return exes[0].path;
  } catch (e) {
    return null;
  }
}

function scanSteamLibrary(steamRoot) {
  const games = [];
  try {
    if (!fs.existsSync(steamRoot)) return games;

    const libraryFolders = new Set();
    libraryFolders.add(steamRoot);

    // Tenta ler libraryfolders.vdf
    const vdfPath = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
    if (fs.existsSync(vdfPath)) {
      const vdfContent = fs.readFileSync(vdfPath, 'utf8');
      const pathRegex = /"path"\s*"([^"]+)"/g;
      let match;
      while ((match = pathRegex.exec(vdfContent)) !== null) {
        let libPath = match[1].replace(/\\\\/g, '\\');
        if (fs.existsSync(libPath)) {
          libraryFolders.add(libPath);
        }
      }
    }

    // Para cada biblioteca Steam, lê os arquivos appmanifest_*.acf
    for (const lib of libraryFolders) {
      const steamappsDir = path.join(lib, 'steamapps');
      if (!fs.existsSync(steamappsDir)) continue;

      const manifestFiles = fs.readdirSync(steamappsDir).filter(f => f.startsWith('appmanifest_') && f.endsWith('.acf'));
      for (const mf of manifestFiles) {
        try {
          const content = fs.readFileSync(path.join(steamappsDir, mf), 'utf8');
          const appIdMatch = /"appid"\s*"(\d+)"/.exec(content);
          const nameMatch = /"name"\s*"([^"]+)"/.exec(content);
          const installDirMatch = /"installdir"\s*"([^"]+)"/.exec(content);

          if (appIdMatch && nameMatch) {
            const appId = appIdMatch[1];
            const name = nameMatch[1];
            // Ignora ferramentas e runtimes da Valve
            if (/Steamworks|Proton|Steam Linux Runtime|SteamVR/i.test(name)) continue;

            games.push({
              id: `steam_${appId}`,
              title: name,
              appId,
              platform: 'steam',
              launchType: 'steam_protocol',
              launchTarget: `steam://run/${appId}`,
              headerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
              installLocation: installDirMatch ? path.join(steamappsDir, 'common', installDirMatch[1]) : ''
            });
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.error('Erro ao escanear Steam:', err);
  }
  return games;
}

function scanEpicManifests(manifestsDir) {
  const games = [];
  try {
    if (!fs.existsSync(manifestsDir)) return games;
    const files = fs.readdirSync(manifestsDir).filter(f => f.endsWith('.item'));
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(manifestsDir, f), 'utf8');
        const data = JSON.parse(raw);
        if (data.DisplayName && data.AppName && !data.AppName.startsWith('UE_')) {
          games.push({
            id: `epic_${data.AppName}`,
            title: data.DisplayName,
            appName: data.AppName,
            platform: 'epic',
            launchType: 'epic_protocol',
            launchTarget: `com.epicgames.launcher://apps/${encodeURIComponent(data.AppName)}?action=launch&silent=true`,
            installLocation: data.InstallLocation || ''
          });
        }
      } catch (_) {}
    }
  } catch (err) {
    console.error('Erro ao escanear Epic:', err);
  }
  return games;
}

function scanGenericFolder(folderPath, platformName) {
  const games = [];
  try {
    if (!folderPath || !fs.existsSync(folderPath)) return games;
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const fullSubDir = path.join(folderPath, entry.name);
        const primaryExe = findPrimaryExe(fullSubDir);
        const cleanName = cleanGameTitle(entry.name);

        games.push({
          id: `${platformName}_${Buffer.from(entry.name).toString('hex').slice(0, 16)}`,
          title: cleanName || entry.name,
          rawTitle: entry.name,
          platform: platformName,
          launchType: primaryExe ? 'exe' : 'folder',
          launchTarget: primaryExe || fullSubDir,
          installLocation: fullSubDir
        });
      }
    }
  } catch (err) {
    console.error(`Erro ao escanear pasta ${platformName}:`, err);
  }
  return games;
}

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

  // ==========================================
  // GAME HUB: FUNÇÕES E IPC HANDLERS
  // ==========================================

  // Diálogo nativo para selecionar pasta de coleção
  ipcMain.handle('hub:select-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Selecione a pasta de jogos da coleção'
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Diálogo nativo para selecionar arquivo (.exe ou imagens)
  ipcMain.handle('hub:select-file', async (_event, options = {}) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: options.filters || [{ name: 'Executáveis (*.exe)', extensions: ['exe'] }],
      title: options.title || 'Selecione o arquivo'
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Converte imagem local do Windows para Data URL Base64
  ipcMain.handle('hub:read-image-data', async (_event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) return null;
      const ext = path.extname(filePath).replace('.', '').toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
      const base64 = fs.readFileSync(filePath).toString('base64');
      return `data:${mime};base64,${base64}`;
    } catch (e) {
      console.error('Erro ao ler arquivo de imagem local:', e);
      return null;
    }
  });

  // Escaneamento de jogos por plataforma
  ipcMain.handle('hub:scan-platform', async (_event, { platformId, folderPath }) => {
    try {
      if (platformId === 'steam') {
        const steamDir = folderPath || 'C:\\Program Files (x86)\\Steam';
        return scanSteamLibrary(steamDir);
      }
      if (platformId === 'epic') {
        const epicDir = folderPath || 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
        return scanEpicManifests(epicDir);
      }
      // 'gamepass', 'ea_ubisoft', 'suspeitos' ou personalizadas
      return scanGenericFolder(folderPath, platformId);
    } catch (scanErr) {
      console.error(`Erro ao escanear plataforma ${platformId}:`, scanErr);
      return [];
    }
  });

  // Disparo / Inicialização do jogo
  ipcMain.handle('hub:launch-game', async (_event, { launchType, launchTarget }) => {
    try {
      if (!launchTarget) throw new Error('Caminho ou alvo do jogo não informado.');

      if (launchType === 'steam_protocol' || launchType === 'epic_protocol') {
        await shell.openExternal(launchTarget);
        return { success: true };
      }

      if (launchType === 'exe') {
        if (!fs.existsSync(launchTarget)) {
          throw new Error(`Executável não encontrado em: ${launchTarget}`);
        }
        const cwd = path.dirname(launchTarget);
        const child = spawn(launchTarget, [], {
          cwd,
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        return { success: true };
      }

      // Se for diretório ou atalho genérico, abre pelo shell do sistema
      await shell.openPath(launchTarget);
      return { success: true };
    } catch (err) {
      console.error('Erro ao iniciar jogo pelo Hub:', err);
      return { success: false, error: err.message };
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
